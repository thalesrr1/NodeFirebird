/**
 * Ponto de entrada principal do Firebird Core Framework
 * 
 * Este arquivo exporta todas as classes, interfaces e tipos principais
 * que compõem a API pública do framework, facilitando a importação
 * por parte dos desenvolvedores que utilizarem o framework.
 */

// Exportar a classe principal do framework
export { FirebirdCore } from './core/FirebirdCore';

// Exportar interfaces importantes
export { PluginInterface } from './interfaces/PluginInterface';
export { AdapterInterface } from './interfaces/AdapterInterface';

// Exportar adapters
export { ExpressAdapter } from './adapters/ExpressAdapter';

// Tipos e interfaces auxiliares
/**
 * Opções para execução de consultas
 */
export interface QueryOptions {
  /** Timeout para a consulta em milissegundos */
  timeout?: number;
  /** Indica se a consulta deve ser executada em uma transação */
  transaction?: boolean;
  /** Outras opções específicas do driver */
  [key: string]: any;
}

/**
 * Tipos de hooks disponíveis para plugins
 */
export enum PluginHookTypes {
  /** Antes de conectar */
  BEFORE_CONNECT = 'beforeConnect',
  /** Após conectar */
  AFTER_CONNECT = 'afterConnect',
  /** Antes de executar uma query */
  BEFORE_QUERY = 'beforeQuery',
  /** Após executar uma query */
  AFTER_QUERY = 'afterQuery',
  /** Antes de desconectar */
  BEFORE_DISCONNECT = 'beforeDisconnect',
  /** Quando ocorre um erro */
  ON_ERROR = 'onError',
  /** Na destruição do plugin */
  DESTROY = 'destroy'
}