/**
 * Interface base que todos os plugins devem implementar
 */
export interface PluginInterface {
  /**
   * Nome do plugin
   */
  name: string;

  /**
   * Versão do plugin
   */
  version: string;

  /**
   * Inicializa o plugin com referência ao core
   * @param core - Referência ao core do framework
   * @returns Promise<void>
   */
  init(core: any): Promise<void>;

  /**
   * Executado antes de estabelecer uma conexão
   * @param config - Configuração de conexão
   * @returns Promise<void>
   */
  beforeConnect(config: any): Promise<void>;

  /**
   * Executado após estabelecer uma conexão
   * @param connection - Objeto de conexão
   * @returns Promise<void>
   */
  afterConnect(connection: any): Promise<void>;

  /**
   * Executado antes de executar uma query
   * @param query - Objeto de query contendo sql, bindings, etc.
   * @returns Promise<void>
   */
  beforeQuery(query: any): Promise<void>;

  /**
   * Executado após executar uma query
   * @param result - Resultado da query
   * @returns Promise<void>
   */
  afterQuery(result: any): Promise<void>;

  /**
   * Executado antes de desconectar
   * @returns Promise<void>
   */
  beforeDisconnect(): Promise<void>;

  /**
   * Executado quando ocorre um erro
   * @param error - Objeto de erro
   * @returns Promise<void>
   */
  onError(error: any): Promise<void>;

  /**
   * Executado durante a destruição do plugin
   * @returns Promise<void>
   */
  destroy(): Promise<void>;
}