import { QueryService } from '../../src/services/QueryService';
import { ConnectionManager } from '../../src/core/ConnectionManager';
import { PluginManager } from '../../src/core/PluginManager';

// Mock do ConnectionManager
jest.mock('../../src/core/ConnectionManager');

// Mock do PluginManager
jest.mock('../../src/core/PluginManager');

describe('QueryService', () => {
  let queryService: QueryService;
  let mockConnectionManager: jest.Mocked<ConnectionManager>;
  let mockPluginManager: jest.Mocked<PluginManager>;
  let mockConnection: any;

  beforeEach(() => {
    // Configurar mocks
    mockConnection = {
      raw: jest.fn(),
      transaction: jest.fn(),
      select: jest.fn(),
      where: jest.fn(),
      limit: jest.fn(),
      offset: jest.fn(),
      orderBy: jest.fn(),
    };

    mockConnectionManager = new ConnectionManager({} as any) as jest.Mocked<ConnectionManager>;
    mockConnectionManager.isConnected.mockReturnValue(true);
    mockConnectionManager.getConnection.mockReturnValue(mockConnection);

    mockPluginManager = new PluginManager() as jest.Mocked<PluginManager>;
    mockPluginManager.beforeQuery.mockResolvedValue();
    mockPluginManager.afterQuery.mockResolvedValue();
    mockPluginManager.onError.mockResolvedValue();

    queryService = new QueryService(mockConnectionManager);
    queryService.setPluginManager(mockPluginManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeQuery', () => {
    it('deve executar uma consulta SELECT válida com sucesso', async () => {
      const sql = 'SELECT * FROM users';
      const mockResult = [{ id: 1, name: 'Test User' }];

      mockConnection.raw.mockResolvedValue(mockResult);

      const result = await queryService.executeQuery(sql);

      expect(mockConnectionManager.isConnected).toHaveBeenCalled();
      expect(mockPluginManager.beforeQuery).toHaveBeenCalledWith({ sql, bindings: undefined, options: undefined });
      expect(mockConnection.raw).toHaveBeenCalledWith(sql, []);
      expect(mockPluginManager.afterQuery).toHaveBeenCalledWith(mockResult);
      expect(result).toBe(mockResult);
    });

    it('deve rejeitar consulta com DROP TABLE', async () => {
      const sql = 'DROP TABLE users';

      await expect(queryService.executeQuery(sql)).rejects.toThrow('Consulta inválida: Keyword não permitido: DROP');
      expect(mockConnection.raw).not.toHaveBeenCalled();
    });

    it('deve lançar erro se conexão não estiver ativa', async () => {
      mockConnectionManager.isConnected.mockReturnValue(false);

      await expect(queryService.executeQuery('SELECT 1')).rejects.toThrow('Conexão com o banco de dados não está ativa');
    });

    it('deve chamar onError quando ocorre erro na execução', async () => {
      const sql = 'SELECT * FROM invalid_table';
      const error = new Error('Table not found');

      mockConnection.raw.mockRejectedValue(error);

      await expect(queryService.executeQuery(sql)).rejects.toThrow(error);
      expect(mockPluginManager.onError).toHaveBeenCalledWith(error);
    });
  });

  describe('executeTransaction', () => {
    it('deve executar múltiplas consultas em transação com sucesso', async () => {
      const queries = [
        { sql: 'SELECT * FROM users', bindings: [] },
        { sql: 'SELECT * FROM orders', bindings: [] }
      ];
      const mockResults = ['result1', 'result2'];

      const mockTrx = {
        raw: jest.fn()
          .mockResolvedValueOnce(mockResults[0])
          .mockResolvedValueOnce(mockResults[1])
      };

      mockConnection.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTrx);
      });

      const result = await queryService.executeTransaction(queries);

      expect(mockConnectionManager.isConnected).toHaveBeenCalled();
      expect(mockConnection.transaction).toHaveBeenCalled();
      expect(mockTrx.raw).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockResults);
    });

    it('deve rejeitar transação com consulta inválida', async () => {
      const queries = [
        { sql: 'DROP TABLE users' }
      ];

      await expect(queryService.executeTransaction(queries)).rejects.toThrow('Consulta inválida: Keyword não permitido: DROP');
    });
  });

  describe('executeSelect', () => {
    it('deve executar consulta SELECT usando query builder', async () => {
      const tableName = 'users';
      const conditions = { active: true };
      const options = { limit: 10, offset: 5, orderBy: { field: 'name', direction: 'asc' as const } };
      const mockResult = [{ id: 1, name: 'User 1' }];

      // Configurar chain de métodos
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue(mockResult)
      };

      // Corrigir o mock para simular o comportamento do Knex corretamente
      mockConnection.mockReturnValueOnce(mockQueryBuilder);

      const result = await queryService.executeSelect(tableName, conditions, options);

      expect(mockConnectionManager.isConnected).toHaveBeenCalled();
      expect(mockPluginManager.beforeQuery).toHaveBeenCalledWith({ tableName, conditions, options });
      expect(mockConnection).toHaveBeenCalledWith(tableName);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('active', true);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(5);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('name', 'asc');
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockPluginManager.afterQuery).toHaveBeenCalledWith(mockResult);
      expect(result).toBe(mockResult);
    });
  });

  describe('validateSql', () => {
    it('deve validar consulta SELECT como válida', () => {
      const result = queryService['validateSql']('SELECT * FROM users');
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Consulta válida');
    });

    it('deve rejeitar consulta com DROP', () => {
      const result = queryService['validateSql']('DROP TABLE users');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Keyword não permitido: DROP');
    });

    it('deve rejeitar consulta com DELETE', () => {
      const result = queryService['validateSql']('DELETE FROM users');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Keyword não permitido: DELETE');
    });

    it('deve rejeitar consulta com padrão de injeção SQL', () => {
      const result = queryService['validateSql']("SELECT * FROM users WHERE id = 1 OR 1=1");
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Padrão de injeção SQL detectado');
    });
  });
});