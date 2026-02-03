/**
 * ExpressAdapter para o FirebirdCore.
 * Implementa apenas os métodos especificados no AdapterInterface.
 */
import { AdapterInterface } from '../interfaces/AdapterInterface';

export class ExpressAdapter implements AdapterInterface {
  core: any;

  /**
   * Construtor recebe instância do FirebirdCore.
   * @param core Instância do FirebirdCore.
   */
  constructor(core: any) {
    this.core = core;
  }

  /** Adiciona middlewares de segurança. */
  addSecurityMiddlewares(app: any): void {
    // parser JSON com limite
    app.use(require('express').json({ limit: '10mb' }));

    // proteção simples de headers
    app.use((req: any, res: any, next: any) => {
      if (req.headers['x-forwarded-for'] && Array.isArray(req.headers['x-forwarded-for'])) {
        req.headers['x-forwarded-for'] = req.headers['x-forwarded-for'][0];
      }
      next();
    });
  }

  /** Registra rotas de framework: /health e /query */
  setupFrameworkRoutes(app: any): void {
    app.get('/health', async (req: any, res: any) => {
      try {
        const connected = this.core && typeof this.core.isConnected === 'function' ? this.core.isConnected() : false;
        res.status(200).json({ status: 'ok', connected, timestamp: new Date().toISOString() });
      } catch (error: any) {
        res.status(500).json({ status: 'error', message: error.message, timestamp: new Date().toISOString() });
      }
    });

    app.post('/query', async (req: any, res: any) => {
      try {
        const { sql, bindings } = req.body || {};
        const result = await this.core.executeQuery(sql, bindings || {});
        res.status(200).json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  /** Placeholder para rotas do core (extensibilidade). */
  setupCoreRoutes(app: any): void {
    // Intencionalmente vazio — ponto de extensão futuro
  }

  /** Orquestra a aplicação do adapter no app. */
  applyTo(app: any): void {
    this.addSecurityMiddlewares(app);
    this.setupFrameworkRoutes(app);
    this.setupCoreRoutes(app);
  }
}