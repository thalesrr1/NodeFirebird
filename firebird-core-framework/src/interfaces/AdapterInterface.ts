/**
 * Interface base que todos os adapters devem implementar.
 *
 * Seguir estritamente a estrutura definida no `implementation_plan.md` e no `technical_spec.md`.
 */
export interface AdapterInterface {
  /**
   * Aplica o adapter a uma instância do framework web (por ex. Express).
   * @param app Instância do framework web.
   */
  applyTo(app: any): void;

  /**
   * Adiciona middlewares de segurança ao app.
   * @param app Instância do framework web.
   */
  addSecurityMiddlewares(app: any): void;

  /**
   * Configura as rotas específicas do framework (health, query, etc.).
   * @param app Instância do framework web.
   */
  setupFrameworkRoutes(app: any): void;
}