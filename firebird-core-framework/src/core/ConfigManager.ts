import * as fs from 'fs';
import * as dotenv from 'dotenv';

/**
 * Interface que define a configuração do Firebird
 */
export interface FirebirdConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  pool?: {
    // Propriedades antigas (para retrocompatibilidade)
    min?: number;
    max?: number;
    createTimeout?: number;
    destroyTimeout?: number;
    idleTimeout?: number;
    reapInterval?: number;
    createRetryInterval?: number;
    propagateCreateError?: boolean;
    
    // Propriedades novas (nomes corretos do Tarn.js)
    acquireTimeoutMillis?: number;
    createTimeoutMillis?: number;
    destroyTimeoutMillis?: number;
    idleTimeoutMillis?: number;
    reapIntervalMillis?: number;
    createRetryIntervalMillis?: number;
    validate?: (resource: any) => boolean;
    afterCreate?: (conn: any) => any;
    maxConnectionLifetimeMillis?: number;
    maxConnectionLifetimeJitterMillis?: number;
  };
  acquireTimeout?: number;
  options?: Record<string, any>;
}

/**
 * Interface que define a configuração do pool de conexões
 */
export interface PoolConfig {
  // Propriedades antigas (para retrocompatibilidade)
  min?: number;
  max?: number;
  createTimeout?: number;
  destroyTimeout?: number;
  idleTimeout?: number;
  reapInterval?: number;
  createRetryInterval?: number;
  propagateCreateError?: boolean;
  
  // Propriedades novas (nomes corretos do Tarn.js)
  acquireTimeout?: number;  // Adicionando acquireTimeout à interface PoolConfig para retrocompatibilidade
  acquireTimeoutMillis?: number;
  createTimeoutMillis?: number;
  destroyTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  reapIntervalMillis?: number;
  createRetryIntervalMillis?: number;
  validate?: (resource: any) => boolean;
  afterCreate?: (conn: any) => any;
  maxConnectionLifetimeMillis?: number;
  maxConnectionLifetimeJitterMillis?: number;
}

/**
 * Classe responsável por gerenciar as configurações do framework
 */
export class ConfigManager {
  private config: FirebirdConfig;
  private sources: Array<string | object | (() => Promise<any>)>;

  /**
   * Construtor da classe ConfigManager
   * @param initialConfig - Configuração inicial
   */
  constructor(initialConfig: Partial<FirebirdConfig> = {}) {
    this.config = {
      host: 'localhost',
      port: 3050,
      username: 'SYSDBA',
      password: '',
      database: '',
      ...initialConfig
    } as FirebirdConfig;
    this.sources = [];
  }

  /**
   * Carrega configurações de uma fonte específica
   * @param source - Fonte de configuração (caminho de arquivo, objeto ou função assíncrona)
   * @returns Promise com a configuração carregada
   */
  async loadConfig(source: string | object | (() => Promise<any>)): Promise<FirebirdConfig> {
    let loadedConfig: Partial<FirebirdConfig> = {};

    if (typeof source === 'string') {
      // Fonte é um caminho de arquivo
      if (source.endsWith('.json')) {
        loadedConfig = JSON.parse(fs.readFileSync(source, 'utf8'));
      } else if (source.endsWith('.env')) {
        const parsedEnv = dotenv.parse(fs.readFileSync(source));
        loadedConfig = this.convertEnvToObject(parsedEnv);
      }
    } else if (typeof source === 'object') {
      // Fonte é um objeto de configuração
      loadedConfig = source;
    } else if (typeof source === 'function') {
      // Fonte é uma função assíncrona
      loadedConfig = await source();
    }

    this.config = { ...this.config, ...loadedConfig } as FirebirdConfig;
    this.sources.push(source);
    return this.config;
  }

  /**
   * Converte configurações do formato .env para objeto
   * @param envConfig - Configuração no formato .env
   * @returns Configuração convertida para objeto
   */
  private convertEnvToObject(envConfig: { [key: string]: string }): Partial<FirebirdConfig> {
    const converted: Partial<FirebirdConfig> = {};
    
    for (const [key, value] of Object.entries(envConfig)) {
      // Converter chaves para caixa baixa e mapear para as propriedades correspondentes
      const lowerKey = key.toLowerCase();
      
      if (lowerKey === 'host') {
        converted.host = value;
      } else if (lowerKey === 'port') {
        converted.port = parseInt(value, 10);
      } else if (lowerKey === 'username') {
        converted.username = value;
      } else if (lowerKey === 'password') {
        converted.password = value;
      } else if (lowerKey === 'database') {
        converted.database = value;
      }
    }
    
    return converted;
  }

  /**
   * Valida a configuração atual
   * @param config - Configuração a ser validada (padrão: configuração atual)
   * @returns Objeto indicando se a configuração é válida e mensagem de erro caso não seja
   */
  validateConfig(config: FirebirdConfig | null = null): { valid: boolean; error?: string } {
    const testConfig = config || this.config;

    const requiredFields = ['host', 'port', 'username', 'password', 'database'];
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!testConfig[field as keyof FirebirdConfig]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return {
        valid: false,
        error: `Campos obrigatórios ausentes: ${missingFields.join(', ')}`
      };
    }

    // Validar tipo dos campos
    if (typeof testConfig.port !== 'number' || testConfig.port <= 0) {
      return { valid: false, error: 'Porta deve ser um número positivo' };
    }

    if (typeof testConfig.host !== 'string' || !testConfig.host.trim()) {
      return { valid: false, error: 'Host deve ser uma string válida' };
    }

    if (typeof testConfig.username !== 'string' || !testConfig.username.trim()) {
      return { valid: false, error: 'Username deve ser uma string válida' };
    }

    if (typeof testConfig.password !== 'string' || !testConfig.password.trim()) {
      return { valid: false, error: 'Password deve ser uma string válida' };
    }

    if (typeof testConfig.database !== 'string' || !testConfig.database.trim()) {
      return { valid: false, error: 'Database deve ser uma string válida' };
    }

    return { valid: true };
  }

  /**
   * Salva a configuração em um destino específico
   * @param config - Configuração a ser salva
   * @param destination - Destino para salvar (caminho do arquivo)
   */
  saveConfig(config: FirebirdConfig, destination: string): void {
    if (destination.endsWith('.json')) {
      fs.writeFileSync(destination, JSON.stringify(config, null, 2));
    }
    // Adicionar outros formatos conforme necessário
  }

  /**
   * Obtém o valor de uma chave específica da configuração
   * @param key - Chave a ser obtida
   * @param defaultValue - Valor padrão caso a chave não exista
   * @returns Valor da chave ou valor padrão
   */
  get<T = any>(key: keyof FirebirdConfig, defaultValue?: T): T | undefined {
    const value = this.config[key];
    return value !== undefined ? value as unknown as T : defaultValue;
  }

  /**
   * Define o valor de uma chave específica na configuração
   * @param key - Chave a ser definida
   * @param value - Valor a ser atribuído
   */
  set<K extends keyof FirebirdConfig>(key: K, value: FirebirdConfig[K]): void {
    this.config[key] = value;
  }

  /**
   * Obtém todas as configurações
   * @returns Cópia da configuração atual
   */
  getAll(): FirebirdConfig {
    return { ...this.config };
  }
}