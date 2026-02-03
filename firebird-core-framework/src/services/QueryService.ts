import { Knex } from 'knex';
import { ConnectionManager } from '../core/ConnectionManager';
import { PluginManager } from '../core/PluginManager';

/**
 * Interface que define as opções para execução de queries
 */
export interface QueryOptions {
  [key: string]: any;
}

/**
 * Interface que define as opções para execução de select
 */
export interface SelectOptions {
  limit?: number;
  offset?: number;
  orderBy?: {
    field: string;
    direction?: 'asc' | 'desc';
  };
}

/**
 * Interface que define o resultado da validação de SQL
 */
export interface ValidationResult {
  valid: boolean;
  message?: string;
  error?: string;
}

/**
 * Classe responsável por executar consultas SQL no banco de dados Firebird,
 * com proteção contra injeção SQL e validação de consultas.
 */
export class QueryService {
  private connectionManager: ConnectionManager;
  private pluginManager: PluginManager | null = null;

  /**
   * Construtor da classe QueryService
   * @param connectionManager - Instância do ConnectionManager para obter conexões
   */
  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
  }

  /**
   * Define o PluginManager para integração com hooks de eventos
   * @param pluginManager - Instância do PluginManager
   */
  setPluginManager(pluginManager: PluginManager): void {
    this.pluginManager = pluginManager;
  }

  /**
   * Executa uma consulta SQL no banco de dados
   * @param sql - Consulta SQL a ser executada
   * @param bindings - Parâmetros de binding para a consulta (opcional)
   * @param options - Opções adicionais para a execução (opcional)
   * @returns Promise com o resultado da consulta
   * @throws Erro se a conexão não estiver ativa ou se a consulta for inválida
   */
  async executeQuery(sql: string, bindings?: any[] | object, options?: QueryOptions): Promise<any> {
    if (!this.connectionManager.isConnected()) {
      throw new Error('Conexão com o banco de dados não está ativa');
    }

    // Emitir evento beforeQuery para plugins
    if (this.pluginManager) {
      await this.pluginManager.beforeQuery({ sql, bindings, options });
    }

    const connection = this.connectionManager.getConnection();

    try {
      // Validar SQL antes de executar
      const validation = this.validateSql(sql);
      if (!validation.valid) {
        throw new Error(`Consulta inválida: ${validation.error}`);
      }

      const result = await connection!.raw(sql, bindings || []);

      // Emitir evento afterQuery para plugins
      if (this.pluginManager) {
        await this.pluginManager.afterQuery(result);
      }

      return result;
    } catch (error) {
      // Emitir evento onError para plugins
      if (this.pluginManager) {
        await this.pluginManager.onError(error);
      }
      throw error;
    }
  }

  /**
   * Executa múltiplas consultas SQL em uma transação
   * @param queries - Array de objetos contendo sql e bindings para cada consulta
   * @returns Promise com o resultado das consultas executadas
   * @throws Erro se a conexão não estiver ativa ou se alguma consulta for inválida
   */
  async executeTransaction(queries: Array<{ sql: string; bindings?: any[] | object }>): Promise<any> {
    if (!this.connectionManager.isConnected()) {
      throw new Error('Conexão com o banco de dados não está ativa');
    }

    const connection = this.connectionManager.getConnection();

    return await connection!.transaction(async (trx) => {
      const results = [];

      for (const query of queries) {
        // Emitir evento beforeQuery para plugins
        if (this.pluginManager) {
          await this.pluginManager.beforeQuery(query);
        }

        // Validar SQL antes de executar - para transações, vamos permitir operações de escrita
        const validation = this.validateSqlForTransaction(query.sql);
        if (!validation.valid) {
          throw new Error(`Consulta inválida: ${validation.error}`);
        }

        const result = await trx.raw(query.sql, query.bindings || []);
        results.push(result);

        // Emitir evento afterQuery para plugins
        if (this.pluginManager) {
          await this.pluginManager.afterQuery(result);
        }
      }

      return results;
    });
  }

  /**
   * Executa uma consulta SELECT usando o query builder do Knex
   * @param tableName - Nome da tabela para consulta
   * @param conditions - Condições WHERE como objeto chave-valor (opcional)
   * @param options - Opções de paginação e ordenação (opcional)
   * @returns Promise com o resultado da consulta
   * @throws Erro se a conexão não estiver ativa
   */
  async executeSelect(tableName: string, conditions?: Record<string, any>, options?: SelectOptions): Promise<any> {
    if (!this.connectionManager.isConnected()) {
      throw new Error('Conexão com o banco de dados não está ativa');
    }

    const connection = this.connectionManager.getConnection();

    // Emitir evento beforeQuery para plugins
    if (this.pluginManager) {
      await this.pluginManager.beforeQuery({ tableName, conditions, options });
    }

    try {
      let queryBuilder = connection!(tableName);

      // Adicionar condições WHERE
      if (conditions) {
        for (const [key, value] of Object.entries(conditions)) {
          queryBuilder = queryBuilder.where(key, value);
        }
      }

      // Adicionar opções de paginação
      if (options?.limit) {
        queryBuilder = queryBuilder.limit(options.limit);
      }

      if (options?.offset) {
        queryBuilder = queryBuilder.offset(options.offset);
      }

      // Adicionar ordenação
      if (options?.orderBy) {
        queryBuilder = queryBuilder.orderBy(options.orderBy.field, options.orderBy.direction || 'asc');
      }

      const result = await queryBuilder.select();

      // Emitir evento afterQuery para plugins
      if (this.pluginManager) {
        await this.pluginManager.afterQuery(result);
      }

      return result;
    } catch (error) {
      // Emitir evento onError para plugins
      if (this.pluginManager) {
        await this.pluginManager.onError(error);
      }
      throw error;
    }
  }

  /**
   * Valida uma consulta SQL para prevenir injeção SQL
   * @param sql - Consulta SQL a ser validada
   * @returns Objeto com resultado da validação
   */
  validateSql(sql: string): ValidationResult {
    // Remover espaços em branco extras e converter para maiúsculas para análise
    const normalizedSql = sql.trim().toUpperCase();

    // Verificar palavras-chave perigosas que não devem estar presentes em consultas SELECT
    const dangerousKeywords = ['DROP', 'TRUNCATE', 'ALTER', 'CREATE'];

    for (const keyword of dangerousKeywords) {
      if (normalizedSql.includes(keyword)) {
        return { valid: false, error: `Keyword não permitido: ${keyword}` };
      }
    }

    // Para executeQuery, não permitimos operações de escrita (DELETE, UPDATE, INSERT)
    // Mesmo que a consulta comece com SELECT, se contiver operações de escrita, deve ser rejeitada
    const writeOperations = ['DELETE', 'UPDATE', 'INSERT'];
    for (const keyword of writeOperations) {
      if (normalizedSql.includes(keyword)) {
        return { valid: false, error: `Keyword não permitido: ${keyword}` };
      }
    }
    
    // Verificar se a consulta parece ser maliciosa (depois de verificar keywords perigosas)
    if (this.containsSqlInjectionPatterns(sql)) {
      return { valid: false, error: 'Padrão de injeção SQL detectado' };
    }

    // Verificar se a consulta parece ser maliciosa
    if (this.containsSqlInjectionPatterns(sql)) {
      return { valid: false, error: 'Padrão de injeção SQL detectado' };
    }
    
    // Verificar se é uma condição OR/AND falsa (como OR 1=1, AND 1=1)
    const falseConditionPattern = /\b(OR|AND)\s+1\s*=1\b/i;
    if (falseConditionPattern.test(normalizedSql)) {
      return { valid: false, error: 'Padrão de injeção SQL detectado' };
    }

    return { valid: true, message: 'Consulta válida' };
  }

  /**
   * Valida uma consulta SQL especificamente para transações, permitindo operações de escrita
   * @param sql - Consulta SQL a ser validada
   * @returns Objeto com resultado da validação
   */
  private validateSqlForTransaction(sql: string): ValidationResult {
    // Remover espaços em branco extras e converter para maiúsculas para análise
    const normalizedSql = sql.trim().toUpperCase();

    // Verificar palavras-chave perigosas que nunca devem ser permitidas
    const dangerousKeywords = ['DROP', 'TRUNCATE', 'ALTER', 'CREATE'];

    for (const keyword of dangerousKeywords) {
      if (normalizedSql.includes(keyword)) {
        return { valid: false, error: `Keyword não permitido: ${keyword}` };
      }
    }

    // Verificar se a consulta parece ser maliciosa
    if (this.containsSqlInjectionPatterns(sql)) {
      return { valid: false, error: 'Padrão de injeção SQL detectado' };
    }

    return { valid: true, message: 'Consulta válida' };
  }

  /**
   * Verifica se a consulta contém padrões comuns de injeção SQL
   * @param sql - Consulta SQL a ser verificada
   * @returns true se contiver padrões suspeitos, false caso contrário
   */
  private containsSqlInjectionPatterns(sql: string): boolean {
    // Verificar padrões comuns de injeção SQL
    const injectionPatterns = [
      /(;|\-\-|\#|\/\*|\*\/)/gi,  // Comentários e terminadores
      /('|")\s*(OR|AND)\s*('|").*('|")\s*=\s*('|")/gi,  // Condições OR/AND falsas
      /EXEC\s*\(|SP_|XP_/gi,  // Funções de execução
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(sql)) {
        return true;
      }
    }

    return false;
  }
}