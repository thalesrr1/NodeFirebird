import knex, { Knex } from 'knex';
import FirebirdClient from 'knex-firebird-dialect';
import * as fs from 'fs';
import { ConfigManager, FirebirdConfig, PoolConfig } from './ConfigManager';
import { PluginManager } from './PluginManager';

/**
 * Interface que define o resultado de uma operação de conexão
 */
export interface ConnectionResult {
  success: boolean;
  message: string;
}

/**
 * Interface que define o resultado de uma validação de conexão
 */
export interface ValidationResult {
  valid: boolean;
  message?: string;
  error?: string;
}

/**
 * Classe responsável por gerenciar a conexão com o banco de dados Firebird,
 * incluindo criação, validação, atualização e destruição de conexões.
 */
export class ConnectionManager {
  private config: FirebirdConfig;
  private connection: Knex | null = null;
  private isConnectedFlag: boolean = false;
  private pluginManager: PluginManager | null = null;
  private configManager: ConfigManager | null = null;

  /**
   * Construtor da classe ConnectionManager
   * @param config - Configuração de conexão do Firebird
   * @param configManager - Instância opcional do ConfigManager para integração
   */
  constructor(config: FirebirdConfig, configManager?: ConfigManager) {
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 3050,
      username: config.username || 'SYSDBA',
      password: config.password,
      database: config.database,
      acquireTimeout: config.acquireTimeout || 30000, // Valor padrão de 30 segundos para retrocompatibilidade
      clientLibPath: config.clientLibPath, // Adicionando a propriedade clientLibPath
      pool: {
        min: config.pool?.min || 2,
        max: config.pool?.max || 10,
        // Incluir todas as propriedades do pool original
        ...config.pool,
      },
      options: config.options || {}
    };
    this.configManager = configManager || null;
  }

  /**
   * Estabelece a conexão com o banco de dados Firebird
   * @returns Promise com o resultado da operação de conexão
   * @throws Erro caso a conexão falhe
   */
  async connect(): Promise<ConnectionResult> {
    try {
      // Emitir evento beforeConnect para plugins
      if (this.pluginManager) {
        await this.pluginManager.beforeConnect(this.config);
      }

      // Função para sanitizar o objeto pool removendo opções inválidas e convertendo propriedades antigas
      const sanitizePoolConfig = (poolOptions: any) => {
        // Lista branca (whitelist) com as opções válidas do pool do tarn.js
        const validPoolOptions = [
          'min',
          'max',
          'acquireTimeoutMillis',
          'createTimeoutMillis',
          'destroyTimeoutMillis',
          'idleTimeoutMillis',
          'reapIntervalMillis',
          'createRetryIntervalMillis',
          'validate',
          'afterCreate',
          'maxConnectionLifetimeMillis',
          'maxConnectionLifetimeJitterMillis',
          // Incluindo propriedades antigas para que possamos convertê-las
          'acquireTimeout',
          'createTimeout',
          'destroyTimeout',
          'idleTimeout',
          'reapInterval',
          'createRetryInterval',
          'propagateCreateError'
        ];
        
        // Mapeamento de propriedades antigas para novos nomes
        const propertyMapping: { [key: string]: string } = {
          'acquireTimeout': 'acquireTimeoutMillis',
          'createTimeout': 'createTimeoutMillis',
          'destroyTimeout': 'destroyTimeoutMillis',
          'idleTimeout': 'idleTimeoutMillis',
          'reapInterval': 'reapIntervalMillis',
          'createRetryInterval': 'createRetryIntervalMillis',
          // propagateCreateError não muda de nome, mas pode ser incluído para consistência
        };
        
        const sanitizedPool: any = {};
        
        // Processa todas as propriedades do pool original
        for (const [key, value] of Object.entries(poolOptions)) {
          // Verifica se é uma propriedade antiga que precisa ser convertida
          if (propertyMapping[key]) {
            const newKey = propertyMapping[key];
            // Apenas adiciona à configuração sanitizada se a nova chave estiver na whitelist
            if (validPoolOptions.includes(newKey)) {
              sanitizedPool[newKey] = value;
            }
          } else if (validPoolOptions.includes(key)) {
            // Adiciona propriedades que já estão com o nome correto
            sanitizedPool[key] = value;
          }
        }
        
        // Garante que os valores padrão estejam definidos
        if (sanitizedPool.min === undefined) sanitizedPool.min = 2;
        if (sanitizedPool.max === undefined) sanitizedPool.max = 10;
        
        return sanitizedPool;
      };
      
      // Aplica a sanitização no objeto pool para remover opções inválidas e converter propriedades antigas
      const poolConfig = sanitizePoolConfig({
        ...this.config.pool,
        acquireTimeout: this.config.acquireTimeout, // Inclui a propriedade acquireTimeout para ser convertida
      });

      // Validação de segurança para clientLibPath
      if (this.config.clientLibPath) {
        if (!fs.existsSync(this.config.clientLibPath)) {
          throw new Error(`Client library file not found at: ${this.config.clientLibPath}`);
        }
      }

      const knexConfig: Knex.Config = {
        client: FirebirdClient,
        connection: {
          host: this.config.host,
          port: this.config.port,
          user: this.config.username,
          password: this.config.password,
          database: this.config.database,
          // Injeta apenas se estiver definido na config
          ...(this.config.clientLibPath && { clientLibPath: this.config.clientLibPath }),
          ...this.config.options
        },
        pool: poolConfig,
        acquireConnectionTimeout: this.config.acquireTimeout // Define acquireTimeout na raiz da configuração do Knex para compatibilidade
      };

      this.connection = knex(knexConfig);
      
      // Configurar monitoramento
      this.setupMonitoring();
      
      // Testar conexão - usando RDB$DATABASE para compatibilidade com Firebird
      // RDB$DATABASE é uma tabela virtual do Firebird que sempre existe
      await this.connection.raw('SELECT 1 AS test FROM RDB$DATABASE;');
      this.isConnectedFlag = true;
      
      // Emitir evento afterConnect para plugins
      if (this.pluginManager) {
        await this.pluginManager.afterConnect(this.connection);
      }
      
      return { success: true, message: 'Conexão estabelecida com sucesso' };
    } catch (error) {
      this.isConnectedFlag = false;
      this.connection = null;
      
      // Emitir evento onError para plugins
      if (this.pluginManager) {
        await this.pluginManager.onError(error);
      }
      throw new Error(`Falha na conexão: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Configura o monitoramento de eventos do Knex
   * Monitora queries, respostas e eventos do pool de conexões
   */
  private setupMonitoring(): void {
    if (!this.connection) {
      return;
    }

    // Monitorar eventos de query
    this.connection.on('query', (query) => {
      console.log('Firebird Core Query:', query.sql, query.bindings);
      
      // Emitir evento beforeQuery para plugins
      if (this.pluginManager) {
        this.pluginManager.beforeQuery(query);
      }
    });

    this.connection.on('query-response', (response, query) => {
      // Emitir evento afterQuery para plugins
      if (this.pluginManager) {
        this.pluginManager.afterQuery(response);
      }
    });

    this.connection.on('query-error', (error, query) => {
      console.error('Firebird Core Query Error:', error.message);
      
      // Emitir evento onError para plugins
      if (this.pluginManager) {
        this.pluginManager.onError(error);
      }
    });

    // Monitorar eventos do pool de conexões
    if (this.connection.client && this.connection.client.pool) {
      this.connection.client.pool.on('acquire', (connection: any) => {
        console.log('Firebird Core Pool: Connection acquired');
      });

      this.connection.client.pool.on('release', (connection: any) => {
        console.log('Firebird Core Pool: Connection released');
      });

      this.connection.client.pool.on('destroy', (connection: any) => {
        console.log('Firebird Core Pool: Connection destroyed');
      });

      this.connection.client.pool.on('createSuccess', (connection: any) => {
        console.log('Firebird Core Pool: Connection created successfully');
      });

      this.connection.client.pool.on('createFail', (err: any) => {
        console.error('Firebird Core Pool: Failed to create connection', err);
      });
    }
  }

  /**
   * Desconecta do banco de dados Firebird
   * @throws Erro caso a desconexão falhe
   */
  async disconnect(): Promise<void> {
    try {
      // Emitir evento beforeDisconnect para plugins
      if (this.pluginManager) {
        await this.pluginManager.beforeDisconnect();
      }

      if (this.connection) {
        await this.connection.destroy();
        this.connection = null;
        this.isConnectedFlag = false;
      }
    } catch (error) {
      if (this.pluginManager) {
        await this.pluginManager.onError(error);
      }
      throw error;
    }
  }

  /**
   * Obtém a instância da conexão Knex
   * @returns Instância da conexão ou null se não estiver conectado
   */
  getConnection(): Knex | null {
    return this.isConnectedFlag ? this.connection : null;
  }

  /**
   * Verifica se a conexão está ativa
   * @returns true se estiver conectado, false caso contrário
   */
  isConnected(): boolean {
    return this.isConnectedFlag;
  }

  /**
   * Valida uma configuração de conexão
   * @param config - Configuração a ser validada (opcional, usa a atual se não fornecida)
   * @returns Promise com o resultado da validação
   */
  async validateConnection(config: FirebirdConfig | null = null): Promise<ValidationResult> {
    const testConfig = config || this.config;
    
    try {
      const tempKnex = knex({
        client: FirebirdClient,
        connection: {
          host: testConfig.host,
          port: testConfig.port,
          user: testConfig.username,
          password: testConfig.password,
          database: testConfig.database,
        },
      });
      
      // Testar conexão - usando RDB$DATABASE para compatibilidade com Firebird
      // RDB$DATABASE é uma tabela virtual do Firebird que sempre existe
      await tempKnex.raw('SELECT 1 AS test FROM RDB$DATABASE;');
      await tempKnex.destroy();
      return { valid: true, message: 'Conexão válida' };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Atualiza a configuração de conexão e reconecta se necessário
   * @param config - Nova configuração de conexão
   * @returns Promise com o resultado da operação de conexão
   * @throws Erro caso a atualização falhe
   */
  async updateConnection(config: Partial<FirebirdConfig>): Promise<ConnectionResult> {
    if (this.isConnectedFlag) {
      await this.disconnect();
    }
    
    // Atualizar configuração mantendo valores padrão
    this.config = {
      ...this.config,
      ...config,
      pool: {
        ...this.config.pool,
        ...config.pool
      }
    };
    
    // Atualizar ConfigManager se estiver integrado
    if (this.configManager) {
      for (const [key, value] of Object.entries(config)) {
        if (key !== 'pool') {
          this.configManager.set(key as keyof FirebirdConfig, value as any);
        }
      }
    }
    
    return await this.connect();
  }

  /**
   * Define o PluginManager para integração com hooks de eventos
   * @param pluginManager - Instância do PluginManager
   */
  setPluginManager(pluginManager: PluginManager): void {
    this.pluginManager = pluginManager;
  }

  /**
   * Obtém a configuração atual de conexão
   * @returns Cópia da configuração atual
   */
  getConfig(): FirebirdConfig {
    return { ...this.config };
  }

  /**
   * Obtém informações sobre o pool de conexões
   * @returns Informações do pool ou null se não estiver conectado
   */
  getPoolInfo(): { numFree: number; numUsed: number; numPendingCreates: number } | null {
    if (!this.connection || !this.connection.client || !this.connection.client.pool) {
      return null;
    }

    const pool = this.connection.client.pool;
    return {
      numFree: pool.numFree(),
      numUsed: pool.numUsed(),
      numPendingCreates: pool.numPendingCreates()
    };
  }
}
