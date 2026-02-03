/**
 * Declaração de tipos para o knex-firebird-dialect
 */
declare module 'knex-firebird-dialect' {
  import { Knex } from 'knex';

  class FirebirdDialect extends Knex.Client {
    constructor(config: any);
  }

  export default FirebirdDialect;
}
