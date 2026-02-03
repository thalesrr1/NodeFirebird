import { ConnectionManager, ConnectionResult, ValidationResult } from '../../src/core/ConnectionManager';
import { ConfigManager, FirebirdConfig } from '../../src/core/ConfigManager';
import { PluginManager } from '../../src/core/PluginManager';
import { PluginInterface } from '../../src/interfaces/PluginInterface';
import knex from 'knex';

// Mock do Knex
jest.mock('knex', () => {
  const mockKnex = jest.fn(() => ({
    raw: jest.fn().mockResolvedValue([{ test: 1 }]),
    on: jest.fn(),
    destroy: jest.fn().mockResolvedValue(undefined),
    client: {
      pool: {
        on: jest.fn(),
        numFree: jest.fn().mockReturnValue(5),
        numUsed: jest.fn().mockReturnValue(3),
        numPendingCreates: jest.fn().mockReturnValue(0)
      }
    }
  }));
  
  return mockKnex;
});

// Mock do PluginManager
class MockPluginManager extends PluginManager {
  beforeConnectCalled = false;
  afterConnectCalled = false;
  beforeQueryCalled = false;
  afterQueryCalled = false;
  beforeDisconnectCalled = false;
  onErrorCalled = false;
  
  beforeConnectParams: any = null;
  afterConnectParams: any = null;
  beforeQueryParams: any = null;
  afterQueryParams: any = null;
  errorParams: any = null;

  async beforeConnect(config: any): Promise<void> {
    this.beforeConnectCalled = true;
    this.beforeConnectParams = config;
  }

  async afterConnect(connection: any): Promise<void> {
    this.afterConnectCalled = true;
    this.afterConnectParams = connection;
  }

  async beforeQuery(query: any): Promise<void> {
    this.beforeQueryCalled = true;
    this.beforeQueryParams = query;
  }

  async afterQuery(result: any): Promise<void> {
    this.afterQueryCalled = true;
    this.afterQueryParams = result;
  }

  async beforeDisconnect(): Promise<void> {
    this.beforeDisconnectCalled = true;
  }

  async onError(error: any): Promise<void> {
    this.onErrorCalled = true;
    this.errorParams = error;
  }
}

describe('ConnectionManager', () => {
  let connectionManager: ConnectionManager;
  let configManager: ConfigManager;
  let mockPluginManager: MockPluginManager;
  const testConfig: FirebirdConfig = {
    host: 'localhost',
    port: 3050,
    username: 'SYSDBA',
    password: 'masterkey',
    database: 'test.fdb'
  };

  beforeEach(() => {
    configManager = new ConfigManager(testConfig);
    connectionManager = new ConnectionManager(testConfig, configManager);
    mockPluginManager = new MockPluginManager();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (connectionManager.isConnected()) {
      await connectionManager.disconnect();
    }
  });

  describe('constructor', () => {
    it('deve instanciar com configuração válida', () => {
      const manager = new ConnectionManager(testConfig);

      expect(manager.isConnected()).toBe(false);
      expect(manager.getConnection()).toBeNull();
    });

    it('deve usar valores padrão quando não fornecidos', () => {
      const partialConfig = {
        password: 'testpass',
        database: 'test.fdb'
      } as FirebirdConfig;

      const manager = new ConnectionManager(partialConfig);
      const config = manager.getConfig();

      expect(config.host).toBe('localhost');
      expect(config.port).toBe(3050);
      expect(config.username).toBe('SYSDBA');
      expect(config.password).toBe('testpass');
      expect(config.database).toBe('test.fdb');
    });

    it('deve usar configuração padrão do pool quando não fornecida', () => {
      const configWithoutPool = {
        host: 'localhost',
        port: 3050,
        username: 'SYSDBA',
        password: 'masterkey',
        database: 'test.fdb'
      } as FirebirdConfig;

      const manager = new ConnectionManager(configWithoutPool);
      const config = manager.getConfig();

      expect(config.pool?.min).toBe(2);
      expect(config.pool?.max).toBe(10);
      expect(config.pool?.acquireTimeout).toBe(30000);
    });

    it('deve integrar com ConfigManager quando fornecido', () => {
      const manager = new ConnectionManager(testConfig, configManager);
      const config = manager.getConfig();

      expect(config.host).toBe(testConfig.host);
      expect(config.port).toBe(testConfig.port);
      expect(config.username).toBe(testConfig.username);
      expect(config.password).toBe(testConfig.password);
      expect(config.database).toBe(testConfig.database);
    });
  });

  describe('connect', () => {
    it('deve estabelecer conexão com sucesso', async () => {
      const result = await connectionManager.connect();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Conexão estabelecida com sucesso');
      expect(connectionManager.isConnected()).toBe(true);
      expect(connectionManager.getConnection()).not.toBeNull();
    });

    it('deve chamar hooks do PluginManager antes e depois da conexão', async () => {
      connectionManager.setPluginManager(mockPluginManager);

      await connectionManager.connect();

      expect(mockPluginManager.beforeConnectCalled).toBe(true);
      expect(mockPluginManager.beforeConnectParams.host).toBe(testConfig.host);
      expect(mockPluginManager.beforeConnectParams.port).toBe(testConfig.port);
      expect(mockPluginManager.beforeConnectParams.username).toBe(testConfig.username);
      expect(mockPluginManager.beforeConnectParams.password).toBe(testConfig.password);
      expect(mockPluginManager.beforeConnectParams.database).toBe(testConfig.database);
      expect(mockPluginManager.afterConnectCalled).toBe(true);
      expect(mockPluginManager.afterConnectParams).not.toBeNull();
    });

    it('deve configurar monitoramento de eventos', async () => {
      await connectionManager.connect();
      const connection = connectionManager.getConnection();

      expect(connection?.on).toHaveBeenCalledWith('query', expect.any(Function));
      expect(connection?.on).toHaveBeenCalledWith('query-response', expect.any(Function));
      expect(connection?.on).toHaveBeenCalledWith('query-error', expect.any(Function));
    });

    it('deve lançar erro quando a conexão falhar', async () => {
      const mockKnex = require('knex');
      mockKnex.mockImplementationOnce(() => ({
        raw: jest.fn().mockRejectedValue(new Error('Connection failed')),
        on: jest.fn(),
        destroy: jest.fn().mockResolvedValue(undefined),
        client: {
          pool: {
            on: jest.fn()
          }
        }
      }));

      const manager = new ConnectionManager(testConfig);
      manager.setPluginManager(mockPluginManager);

      await expect(manager.connect()).rejects.toThrow('Falha na conexão: Connection failed');
      expect(manager.isConnected()).toBe(false);
      expect(mockPluginManager.onErrorCalled).toBe(true);
    });

    it('deve chamar hook onError quando a conexão falhar', async () => {
      const mockKnex = require('knex');
      mockKnex.mockImplementationOnce(() => ({
        raw: jest.fn().mockRejectedValue(new Error('Connection failed')),
        on: jest.fn(),
        destroy: jest.fn().mockResolvedValue(undefined),
        client: {
          pool: {
            on: jest.fn()
          }
        }
      }));

      const manager = new ConnectionManager(testConfig);
      manager.setPluginManager(mockPluginManager);

      try {
        await manager.connect();
      } catch (error) {
        // Ignorar erro esperado
      }

      expect(mockPluginManager.onErrorCalled).toBe(true);
      expect(mockPluginManager.errorParams).toBeInstanceOf(Error);
    });
  });

  describe('disconnect', () => {
    it('deve desconectar com sucesso', async () => {
      await connectionManager.connect();
      expect(connectionManager.isConnected()).toBe(true);

      await connectionManager.disconnect();

      expect(connectionManager.isConnected()).toBe(false);
      expect(connectionManager.getConnection()).toBeNull();
    });

    it('deve chamar hook beforeDisconnect antes de desconectar', async () => {
      connectionManager.setPluginManager(mockPluginManager);
      await connectionManager.connect();

      await connectionManager.disconnect();

      expect(mockPluginManager.beforeDisconnectCalled).toBe(true);
    });

    it('deve chamar hook onError quando a desconexão falhar', async () => {
      const mockKnex = require('knex');
      mockKnex.mockImplementationOnce(() => ({
        raw: jest.fn().mockResolvedValue([{ test: 1 }]),
        on: jest.fn(),
        destroy: jest.fn().mockRejectedValue(new Error('Disconnect failed')),
        client: {
          pool: {
            on: jest.fn()
          }
        }
      }));

      const manager = new ConnectionManager(testConfig);
      manager.setPluginManager(mockPluginManager);
      await manager.connect();

      try {
        await manager.disconnect();
      } catch (error) {
        // Ignorar erro esperado
      }

      expect(mockPluginManager.onErrorCalled).toBe(true);
    });

    it('não deve lançar erro quando não estiver conectado', async () => {
      await expect(connectionManager.disconnect()).resolves.not.toThrow();
    });
  });

  describe('getConnection', () => {
    it('deve retornar null quando não estiver conectado', () => {
      expect(connectionManager.getConnection()).toBeNull();
    });

    it('deve retornar a conexão quando estiver conectado', async () => {
      await connectionManager.connect();
      const connection = connectionManager.getConnection();

      expect(connection).not.toBeNull();
      expect(connection).toHaveProperty('raw');
    });
  });

  describe('isConnected', () => {
    it('deve retornar false quando não estiver conectado', () => {
      expect(connectionManager.isConnected()).toBe(false);
    });

    it('deve retornar true quando estiver conectado', async () => {
      await connectionManager.connect();
      expect(connectionManager.isConnected()).toBe(true);
    });

    it('deve retornar false após desconectar', async () => {
      await connectionManager.connect();
      await connectionManager.disconnect();
      expect(connectionManager.isConnected()).toBe(false);
    });
  });

  describe('validateConnection', () => {
    it('deve validar configuração válida', async () => {
      const mockKnex = require('knex');
      mockKnex.mockImplementationOnce(() => ({
        raw: jest.fn().mockResolvedValue([{ test: 1 }]),
        destroy: jest.fn().mockResolvedValue(undefined)
      }));

      const result = await connectionManager.validateConnection(testConfig);

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Conexão válida');
    });

    it('deve usar configuração atual quando não fornecida', async () => {
      const mockKnex = require('knex');
      mockKnex.mockImplementationOnce(() => ({
        raw: jest.fn().mockResolvedValue([{ test: 1 }]),
        destroy: jest.fn().mockResolvedValue(undefined)
      }));

      const result = await connectionManager.validateConnection();

      expect(result.valid).toBe(true);
    });

    it('deve retornar erro quando a validação falhar', async () => {
      const mockKnex = require('knex');
      mockKnex.mockImplementationOnce(() => ({
        raw: jest.fn().mockRejectedValue(new Error('Invalid credentials')),
        destroy: jest.fn().mockResolvedValue(undefined)
      }));

      const result = await connectionManager.validateConnection(testConfig);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('updateConnection', () => {
    it('deve atualizar configuração e reconectar', async () => {
      await connectionManager.connect();
      expect(connectionManager.isConnected()).toBe(true);

      const newConfig = {
        host: '192.168.1.100',
        port: 3051
      };

      const result = await connectionManager.updateConnection(newConfig);

      expect(result.success).toBe(true);
      expect(connectionManager.getConfig().host).toBe('192.168.1.100');
      expect(connectionManager.getConfig().port).toBe(3051);
    });

    it('deve desconectar antes de atualizar se estiver conectado', async () => {
      await connectionManager.connect();
      const disconnectSpy = jest.spyOn(connectionManager, 'disconnect');

      await connectionManager.updateConnection({ host: 'newhost' });

      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('deve atualizar ConfigManager quando integrado', async () => {
      const manager = new ConnectionManager(testConfig, configManager);
      await manager.connect();

      await manager.updateConnection({ host: 'newhost' });

      expect(configManager.get('host')).toBe('newhost');
    });

    it('deve manter configuração do pool ao atualizar', async () => {
      const configWithPool = {
        ...testConfig,
        pool: {
          min: 5,
          max: 20,
          acquireTimeout: 60000
        }
      };

      const manager = new ConnectionManager(configWithPool);
      await manager.connect();

      await manager.updateConnection({ host: 'newhost' });

      expect(manager.getConfig().pool?.min).toBe(5);
      expect(manager.getConfig().pool?.max).toBe(20);
    });
  });

  describe('setPluginManager', () => {
    it('deve definir o PluginManager', () => {
      connectionManager.setPluginManager(mockPluginManager);

      // Verifica se o PluginManager foi definido (testado indiretamente)
      expect(() => connectionManager.setPluginManager(mockPluginManager)).not.toThrow();
    });
  });

  describe('getConfig', () => {
    it('deve retornar uma cópia da configuração', () => {
      const config1 = connectionManager.getConfig();
      const config2 = connectionManager.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });

    it('deve retornar configuração completa', () => {
      const config = connectionManager.getConfig();

      expect(config).toHaveProperty('host');
      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('username');
      expect(config).toHaveProperty('password');
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('pool');
    });
  });

  describe('getPoolInfo', () => {
    it('deve retornar null quando não estiver conectado', () => {
      const poolInfo = connectionManager.getPoolInfo();

      expect(poolInfo).toBeNull();
    });

    it('deve retornar informações do pool quando conectado', async () => {
      await connectionManager.connect();
      const poolInfo = connectionManager.getPoolInfo();

      expect(poolInfo).not.toBeNull();
      expect(poolInfo).toHaveProperty('numFree');
      expect(poolInfo).toHaveProperty('numUsed');
      expect(poolInfo).toHaveProperty('numPendingCreates');
    });

    it('deve retornar valores corretos do pool', async () => {
      await connectionManager.connect();
      const poolInfo = connectionManager.getPoolInfo();

      expect(poolInfo?.numFree).toBe(5);
      expect(poolInfo?.numUsed).toBe(3);
      expect(poolInfo?.numPendingCreates).toBe(0);
    });
  });

  describe('integração com PluginManager', () => {
    it('deve chamar hooks de query durante monitoramento', async () => {
      connectionManager.setPluginManager(mockPluginManager);
      await connectionManager.connect();
      const connection = connectionManager.getConnection();

      // Simular evento de query
      const queryHandler = (connection?.on as jest.Mock).mock.calls.find(
        (call: any[]) => call[0] === 'query'
      )?.[1];

      if (queryHandler) {
        queryHandler({ sql: 'SELECT * FROM users', bindings: [] });
      }

      expect(mockPluginManager.beforeQueryCalled).toBe(true);
      expect(mockPluginManager.beforeQueryParams).toEqual({
        sql: 'SELECT * FROM users',
        bindings: []
      });
    });

    it('deve chamar hooks de query-response durante monitoramento', async () => {
      connectionManager.setPluginManager(mockPluginManager);
      await connectionManager.connect();
      const connection = connectionManager.getConnection();

      // Simular evento de query-response
      const responseHandler = (connection?.on as jest.Mock).mock.calls.find(
        (call: any[]) => call[0] === 'query-response'
      )?.[1];

      if (responseHandler) {
        responseHandler([{ id: 1, name: 'John' }], { sql: 'SELECT * FROM users' });
      }

      expect(mockPluginManager.afterQueryCalled).toBe(true);
      expect(mockPluginManager.afterQueryParams).toEqual([{ id: 1, name: 'John' }]);
    });

    it('deve chamar hook onError durante query-error', async () => {
      connectionManager.setPluginManager(mockPluginManager);
      await connectionManager.connect();
      const connection = connectionManager.getConnection();

      // Simular evento de query-error
      const errorHandler = (connection?.on as jest.Mock).mock.calls.find(
        (call: any[]) => call[0] === 'query-error'
      )?.[1];

      if (errorHandler) {
        errorHandler(new Error('Query failed'), { sql: 'SELECT * FROM users' });
      }

      expect(mockPluginManager.onErrorCalled).toBe(true);
      expect(mockPluginManager.errorParams).toBeInstanceOf(Error);
    });
  });
});
