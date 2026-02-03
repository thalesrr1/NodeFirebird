/**
 * Fachada principal do Firebird Core Framework
 *
 * Baseado na documentação do Knex.js v3.1.0:
 * - knex.raw() permite executar consultas SQL brutas com segurança através de bindings
 * - Suporte a parâmetros posicionais (?) e nomeados para evitar injeção SQL
 * - Integração com pool de conexões para gerenciamento eficiente
 */
import { ConfigManager, FirebirdConfig } from './ConfigManager';
import { ConnectionManager } from './ConnectionManager';
import { PluginManager } from './PluginManager';
import { QueryService } from '../services/QueryService';
import { PluginInterface } from '../interfaces/PluginInterface';

/**
 * Fachada principal do framework Firebird Core Framework.
 * Esta classe fornece uma interface única e simplificada para todas as funcionalidades do framework.
 * Ela coordena os componentes internos e oculta sua complexidade, expondo apenas uma API limpa.
 */
export class FirebirdCore {
  private configManager: ConfigManager;
  private connectionManager: ConnectionManager;
  private pluginManager: PluginManager;
  private queryService: QueryService;

  /**
   * Construtor da fachada principal
   * @param config - Configuração inicial do framework (opcional)
   * @param deps - Dependências injetáveis para fins de teste (opcional)
   */
  constructor(
    config: Partial<FirebirdConfig> = {},
    deps?: {
      configManager?: ConfigManager;
      connectionManager?: ConnectionManager;
      pluginManager?: PluginManager;
      queryService?: QueryService;
    }
  ) {
    // Inicializar os componentes principais
    this.configManager = deps?.configManager || new ConfigManager(config);
    this.pluginManager = deps?.pluginManager || new PluginManager();
    
    // Criar ConnectionManager com a configuração atual
    const currentConfig = this.configManager.getAll();
    this.connectionManager = deps?.connectionManager || new ConnectionManager(currentConfig, this.configManager);
    
    // Criar QueryService com o ConnectionManager
    this.queryService = deps?.queryService || new QueryService(this.connectionManager);
    
    // Associar PluginManager aos componentes que precisam dele
    this.connectionManager.setPluginManager(this.pluginManager);
    this.queryService.setPluginManager(this.pluginManager);
  }

  /**
   * Inicializa o framework e seus componentes
   * @throws Erro se a configuração for inválida
   */
  async initialize(): Promise<void> {
    // Validar configuração
    const validation = this.configManager.validateConfig();
    if (!validation.valid) {
      throw new Error(`Configuração inválida: ${validation.error}`);
    }

    // Inicializar plugins
    await this.pluginManager.init(this);
  }

  /**
   * Estabelece conexão com o banco de dados Firebird
   * @returns Promise com o resultado da operação de conexão
   */
  async connect(): Promise<any> {
    return await this.connectionManager.connect();
  }

  /**
   * Desconecta do banco de dados Firebird
   * @returns Promise que resolve quando a desconexão é concluída
   */
  async disconnect(): Promise<any> {
    return await this.connectionManager.disconnect();
  }

  /**
   * Executa uma consulta SQL no banco de dados
   * @param sql - Consulta SQL a ser executada
   * @param bindings - Parâmetros de binding para a consulta (opcional)
   * @param options - Opções adicionais para a execução (opcional)
   * @returns Promise com o resultado da consulta
   */
  async executeQuery(sql: string, bindings?: any[] | object, options?: any): Promise<any> {
    return await this.queryService.executeQuery(sql, bindings, options);
  }

  /**
   * Executa múltiplas consultas SQL em uma transação
   * @param queries - Array de objetos contendo sql e bindings para cada consulta
   * @returns Promise com o resultado das consultas executadas
   */
  async executeTransaction(queries: Array<{ sql: string; bindings?: any }>): Promise<any> {
    return await this.queryService.executeTransaction(queries);
  }

  /**
   * Registra um plugin no framework
   * @param plugin - Instância do plugin a ser registrado
   */
  use(plugin: PluginInterface): void {
    this.pluginManager.register(plugin);
  }

  /**
   * Obtém a instância da conexão atual
   * @returns Instância da conexão ou null se não estiver conectado
   */
  getConnection(): any {
    return this.connectionManager.getConnection();
  }

  /**
   * Verifica se o framework está conectado ao banco de dados
   * @returns true se estiver conectado, false caso contrário
   */
  isConnected(): boolean {
    return this.connectionManager.isConnected();
  }

  /**
   * Obtém o valor de uma chave específica da configuração
   * @param key - Chave a ser obtida
   * @param defaultValue - Valor padrão caso a chave não exista
   * @returns Valor da chave ou valor padrão
   */
  getConfig<T = any>(key: keyof FirebirdConfig, defaultValue?: T): T | undefined {
    return this.configManager.get(key, defaultValue);
  }

  /**
   * Define o valor de uma chave específica na configuração
   * @param key - Chave a ser definida
   * @param value - Valor a ser atribuído
   */
  setConfig<K extends keyof FirebirdConfig>(key: K, value: FirebirdConfig[K]): void {
    this.configManager.set(key, value);
  }
}