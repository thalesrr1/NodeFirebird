import { PluginInterface } from '../interfaces/PluginInterface';

/**
 * Classe responsável por gerenciar o ciclo de vida dos plugins,
 * permitindo extensibilidade e interceptação de eventos do framework.
 */
export class PluginManager {
  private plugins: PluginInterface[] = [];

  /**
   * Construtor da classe PluginManager
   */
  constructor() {}

  /**
   * Registra um novo plugin no gerenciador
   * @param plugin - Instância de um plugin que implementa PluginInterface
   * @throws Erro se o plugin não implementar o método init
   */
  register(plugin: PluginInterface): void {
    if (typeof plugin.init !== 'function') {
      throw new Error('Plugin deve implementar o método init');
    }
    
    this.plugins.push(plugin);
  }

  /**
   * Inicializa todos os plugins registrados com referência ao core
   * @param core - Referência ao core do framework
   */
  async init(core: any): Promise<void> {
    for (const plugin of this.plugins) {
      await plugin.init(core);
    }
  }

  /**
   * Executa o hook beforeConnect em todos os plugins registrados
   * @param config - Configuração de conexão
   */
  async beforeConnect(config: any): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.beforeConnect) {
        await plugin.beforeConnect(config);
      }
    }
  }

  /**
   * Executa o hook afterConnect em todos os plugins registrados
   * @param connection - Objeto de conexão
   */
  async afterConnect(connection: any): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.afterConnect) {
        await plugin.afterConnect(connection);
      }
    }
  }

  /**
   * Executa o hook beforeQuery em todos os plugins registrados
   * @param query - Objeto de query contendo sql, bindings, etc.
   */
  async beforeQuery(query: any): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.beforeQuery) {
        await plugin.beforeQuery(query);
      }
    }
  }

  /**
   * Executa o hook afterQuery em todos os plugins registrados
   * @param result - Resultado da query
   */
  async afterQuery(result: any): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.afterQuery) {
        await plugin.afterQuery(result);
      }
    }
  }

  /**
   * Executa o hook beforeDisconnect em todos os plugins registrados
   */
  async beforeDisconnect(): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.beforeDisconnect) {
        await plugin.beforeDisconnect();
      }
    }
  }

  /**
   * Executa o hook onError em todos os plugins registrados
   * @param error - Objeto de erro
   */
  async onError(error: any): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onError) {
        await plugin.onError(error);
      }
    }
  }

  /**
   * Executa o hook destroy em todos os plugins registrados
   */
  async destroy(): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.destroy) {
        await plugin.destroy();
      }
    }
  }
}