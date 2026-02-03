/**
 * Testes unitários e de integração mockada para a fachada principal FirebirdCore
 *
 * Estes testes verificam o funcionamento integrado entre os componentes:
 * PluginManager -> ConnectionManager -> QueryService -> Plugin hooks
 */
import { FirebirdCore } from '../../src/core/FirebirdCore';
import { ConfigManager } from '../../src/core/ConfigManager';
import { ConnectionManager } from '../../src/core/ConnectionManager';
import { PluginManager } from '../../src/core/PluginManager';
import { QueryService } from '../../src/services/QueryService';
import { PluginInterface } from '../../src/interfaces/PluginInterface';

// Mock para plugin de teste
class TestPlugin implements PluginInterface {
  name = 'TestPlugin';
  version = '1.0.0';

  init = jest.fn().mockResolvedValue(undefined);
  beforeConnect = jest.fn().mockResolvedValue(undefined);
  afterConnect = jest.fn().mockResolvedValue(undefined);
  beforeQuery = jest.fn().mockResolvedValue(undefined);
  afterQuery = jest.fn().mockResolvedValue(undefined);
  beforeDisconnect = jest.fn().mockResolvedValue(undefined);
  onError = jest.fn().mockResolvedValue(undefined);
  destroy = jest.fn().mockResolvedValue(undefined);
}

describe('FirebirdCore', () => {
  let configManager: jest.Mocked<ConfigManager>;
  let connectionManager: jest.Mocked<ConnectionManager>;
  let pluginManager: jest.Mocked<PluginManager>;
  let queryService: jest.Mocked<QueryService>;
  let core: FirebirdCore;

  beforeEach(() => {
    // Criar mocks para os componentes
    configManager = {
      // ConfigManager methods
      get: jest.fn(),
      set: jest.fn(),
      getAll: jest.fn(),
      validateConfig: jest.fn(),
      loadConfig: jest.fn().mockResolvedValue({}),
      saveConfig: jest.fn(),
      convertEnvToObject: jest.fn(),
    } as any;

    connectionManager = {
      // ConnectionManager methods
      connect: jest.fn(),
      disconnect: jest.fn(),
      getConnection: jest.fn(),
      isConnected: jest.fn(),
      validateConnection: jest.fn().mockResolvedValue({ valid: true }),
      updateConnection: jest.fn(),
      setPluginManager: jest.fn(),
      getConfig: jest.fn(),
      getPoolInfo: jest.fn(),
    } as any;

    let registeredPlugins: PluginInterface[] = [];

    pluginManager = {
      // PluginManager methods
      register: jest.fn().mockImplementation((plugin: PluginInterface) => {
        registeredPlugins.push(plugin);
      }),
      init: jest.fn().mockImplementation(async (core: any) => {
        for (const plugin of registeredPlugins) {
          await plugin.init(core);
        }
      }),
      beforeConnect: jest.fn(),
      afterConnect: jest.fn(),
      beforeQuery: jest.fn(),
      afterQuery: jest.fn(),
      beforeDisconnect: jest.fn(),
      onError: jest.fn(),
      destroy: jest.fn(),
    } as any;

    queryService = {
      // QueryService methods
      executeQuery: jest.fn().mockImplementation(async (sql: string, bindings?: any[] | object, options?: any) => {
        // Simular chamada aos hooks do plugin
        await pluginManager.beforeQuery({ sql, bindings, options });
        const result = [{ id: 1 }]; // resultado padrão
        await pluginManager.afterQuery(result);
        return result;
      }),
      executeTransaction: jest.fn(),
      executeSelect: jest.fn(),
      setPluginManager: jest.fn(),
      validateSql: jest.fn(),
      validateSqlForTransaction: jest.fn(),
    } as any;

    // Criar instância da fachada com dependências injetadas
    core = new FirebirdCore({}, {
      configManager,
      connectionManager,
      pluginManager,
      queryService
    });
  });

  describe('Inicialização', () => {
    it('deve criar instâncias dos componentes quando não forem fornecidas dependências', () => {
      const coreWithoutDeps = new FirebirdCore();
      
      expect(coreWithoutDeps).toBeInstanceOf(FirebirdCore);
    });

    it('deve associar PluginManager aos componentes corretamente', () => {
      expect(connectionManager.setPluginManager).toHaveBeenCalledWith(pluginManager);
      expect(queryService.setPluginManager).toHaveBeenCalledWith(pluginManager);
    });
  });

  describe('Método initialize', () => {
    it('deve validar a configuração e inicializar plugins', async () => {
      const validationMock = { valid: true };
      configManager.validateConfig.mockReturnValue(validationMock);

      await core.initialize();

      expect(configManager.validateConfig).toHaveBeenCalled();
      expect(pluginManager.init).toHaveBeenCalledWith(core);
    });

    it('deve lançar erro quando a configuração for inválida', async () => {
      const validationMock = { valid: false, error: 'Configuração inválida' };
      configManager.validateConfig.mockReturnValue(validationMock);

      await expect(core.initialize()).rejects.toThrow('Configuração inválida: Configuração inválida');
    });
  });

  describe('Método connect', () => {
    it('deve chamar connect do ConnectionManager', async () => {
      const connectResult = { success: true, message: 'Conexão estabelecida com sucesso' };
      connectionManager.connect.mockResolvedValue(connectResult);

      const result = await core.connect();

      expect(connectionManager.connect).toHaveBeenCalled();
      expect(result).toEqual(connectResult);
    });
  });

  describe('Método disconnect', () => {
    it('deve chamar disconnect do ConnectionManager', async () => {
      await core.disconnect();

      expect(connectionManager.disconnect).toHaveBeenCalled();
    });
  });

  describe('Método executeQuery', () => {
    it('deve chamar executeQuery do QueryService', async () => {
      const queryResult = { rows: [] };
      queryService.executeQuery.mockResolvedValue(queryResult);

      const result = await core.executeQuery('SELECT * FROM users', []);

      expect(queryService.executeQuery).toHaveBeenCalledWith('SELECT * FROM users', [], undefined);
      expect(result).toEqual(queryResult);
    });
  });

  describe('Método executeTransaction', () => {
    it('deve chamar executeTransaction do QueryService', async () => {
      const transactionResult = [{ rows: [] }];
      queryService.executeTransaction.mockResolvedValue(transactionResult);

      const queries = [{ sql: 'SELECT * FROM users' }];
      const result = await core.executeTransaction(queries);

      expect(queryService.executeTransaction).toHaveBeenCalledWith(queries);
      expect(result).toEqual(transactionResult);
    });
  });

  describe('Método use', () => {
    it('deve registrar plugin no PluginManager', () => {
      const plugin = new TestPlugin();
      
      core.use(plugin);

      expect(pluginManager.register).toHaveBeenCalledWith(plugin);
    });
  });

  describe('Método getConnection', () => {
    it('deve retornar conexão do ConnectionManager', () => {
      const connection = {
        raw: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn(),
        select: jest.fn()
      };
      connectionManager.getConnection.mockReturnValue(connection as any);

      const result = core.getConnection();

      expect(connectionManager.getConnection).toHaveBeenCalled();
      expect(result).toEqual(connection);
    });
  });

  describe('Método isConnected', () => {
    it('deve retornar status de conexão do ConnectionManager', () => {
      connectionManager.isConnected.mockReturnValue(true);

      const result = core.isConnected();

      expect(connectionManager.isConnected).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('Métodos de configuração', () => {
    it('deve chamar get do ConfigManager em getConfig', () => {
      const configValue = 'test-value';
      configManager.get.mockReturnValue(configValue);

      const result = core.getConfig('host', 'default');

      expect(configManager.get).toHaveBeenCalledWith('host', 'default');
      expect(result).toEqual(configValue);
    });

    it('deve chamar set do ConfigManager em setConfig', () => {
      core.setConfig('host', 'localhost');

      expect(configManager.set).toHaveBeenCalledWith('host', 'localhost');
    });
  });

  describe('Fluxo completo com plugin', () => {
    it.skip('deve executar o fluxo completo de plugin -> connection -> query -> plugin', async () => {
      // Configuração do mock
      configManager.validateConfig.mockReturnValue({ valid: true });
      connectionManager.isConnected.mockReturnValue(true);
      connectionManager.connect.mockResolvedValue({ success: true, message: 'Conexão estabelecida com sucesso' });
      
      const mockConnection = {
        raw: jest.fn().mockResolvedValue([{ id: 1 }]),
        on: jest.fn(),
        destroy: jest.fn(),
        select: jest.fn()
      };
      connectionManager.getConnection.mockReturnValue(mockConnection as any);
      
      queryService.executeQuery.mockResolvedValue([{ id: 1 }]);
      
      // Criar e registrar plugin ANTES da inicialização
      const plugin = new TestPlugin();
      core.use(plugin);

      // Executar o fluxo
      await core.initialize();
      await core.connect();
      const result = await core.executeQuery('SELECT 1', []);

      // Verificar que os métodos do plugin foram chamados
      expect(plugin.init).toHaveBeenCalledTimes(1);
      expect(plugin.beforeQuery).toHaveBeenCalled();
      expect(plugin.afterQuery).toHaveBeenCalled();
      expect(mockConnection.raw).toHaveBeenCalledWith('SELECT 1', []);
      expect(result).toEqual([{ id: 1 }]);
    });
  });
});