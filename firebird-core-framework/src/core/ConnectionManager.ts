import knex, { Knex } from 'knex';
import FirebirdClient from 'knex-firebird-dialect';
import { ConfigManager, FirebirdConfig } from './ConfigManager';
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
 * Interface que define a configuração do pool de conexões
 * OBS: Não inclui acquireTimeout pois o Tarn usa acquireTimeoutMillis
 * A propriedade acquireTimeout é tratada separadamente e convertida para acquireTimeoutMillis
 * durante a criação da configuração do Knex para garantir compatibilidade
 */
export interface PoolConfig {
  min?: number;
  max?: number;
  createTimeout?: number;
  destroyTimeout?: number;
  idleTimeout?: number;
  reapInterval?: number;
  createRetryInterval?: number;
  propagateCreateError?: boolean;
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
      acquireTimeout: config.acquireTimeout || 30000, // Valor padrão de 30 segundos
      pool: {
        min: config.pool?.min || 2,
        max: config.pool?.max || 10,
        createTimeout: config.pool?.createTimeout || 30000,
        destroyTimeout: config.pool?.destroyTimeout || 5000,
        idleTimeout: config.pool?.idleTimeout || 600000,
        reapInterval: config.pool?.reapInterval || 1000,
        createRetryInterval: config.pool?.createRetryInterval || 100,
        propagateCreateError: config.pool?.propagateCreateError || false,
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

      // Cria uma cópia do pool de configuração excluindo qualquer propriedade não suportada pelo Tarn
      // Corrige o erro "Tarn: unsupported option opt.acquireTimeout" renomeando a propriedade
      const poolConfig = {
        min: this.config.pool?.min || 2,
        max: this.config.pool?.max || 10,
        createTimeout: this.config.pool?.createTimeout || 30000,
        destroyTimeout: this.config.pool?.destroyTimeout || 5000,
        idleTimeout: this.config.pool?.idleTimeout || 600000,
        reapInterval: this.config.pool?.reapInterval || 1000,
        createRetryInterval: this.config.pool?.createRetryInterval || 100,
        propagateCreateError: this.config.pool?.propagateCreateError || false,
        acquireTimeoutMillis: this.config.acquireTimeout, // Renomeia acquireTimeout para acquireTimeoutMillis para compatibilidade com Tarn
      };

      const knexConfig: Knex.Config = {
        client: FirebirdClient,
        connection: {
          host: this.config.host,
          port: this.config.port,
          user: this.config.username,
          password: this.config.password,
          database: this.config.database,
          ...this.config.options
        },
        pool: poolConfig,
        acquireConnectionTimeout: this.config.acquireTimeout // Define acquireTimeout na raiz da configuração do Knex para compatibilidade
      };

      this.connection = knex(knexConfig);
      
      // Configurar monitoramento
      this.setupMonitoring();
      
      // Testar conexão
      await this.connection.raw('SELECT 1 AS test');
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
      
      await tempKnex.raw('SELECT 1 AS test');
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
