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

/**
 * Adapter para integração com o Express.js
 * 
 * Esta classe serve como um ponto de integração entre o Firebird Core Framework
 * e o framework Express.js, permitindo que endpoints sejam facilmente conectados
 * às funcionalidades do Firebird Core.
 */
export class ExpressAdapter {
  /**
   * Instância do framework Firebird Core
   */
  private firebirdCore: any;

  /**
   * Construtor do adapter
   * @param firebirdCore - Instância do FirebirdCore para integração
   */
  constructor(firebirdCore: any) {
    this.firebirdCore = firebirdCore;
  }

  /**
   * Método placeholder para integrar rotas do Express com o Firebird Core
   * @param app - Instância do aplicativo Express
   * @param options - Opções de configuração para o adapter
   */
  integrateWithExpress(app: any, options?: any): void {
    // Placeholder - implementação futura
    console.log('Integração com Express ainda não implementada');
  }

  /**
   * Middleware para autenticação de requisições
   * @returns Função middleware do Express
   */
  authMiddleware(): (req: any, res: any, next: any) => void {
    // Placeholder - implementação futura
    return (req: any, res: any, next: any) => {
      // Lógica de autenticação será implementada futuramente
      next();
    };
  }
}