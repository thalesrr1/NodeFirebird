import { PluginManager } from '../../src/core/PluginManager';
import { PluginInterface } from '../../src/interfaces/PluginInterface';

// Mock de um plugin para testes
class MockPlugin implements PluginInterface {
  name = 'MockPlugin';
  version = '1.0.0';
  
  initCalled = false;
  beforeConnectCalled = false;
  afterConnectCalled = false;
  beforeQueryCalled = false;
  afterQueryCalled = false;
  beforeDisconnectCalled = false;
  onErrorCalled = false;
  destroyCalled = false;
  
  initParams: any = null;
  beforeConnectParams: any = null;
  afterConnectParams: any = null;
  beforeQueryParams: any = null;
  afterQueryParams: any = null;
  errorParams: any = null;

  async init(core: any): Promise<void> {
    this.initCalled = true;
    this.initParams = core;
  }

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

  async destroy(): Promise<void> {
    this.destroyCalled = true;
  }
}

describe('PluginManager', () => {
  let pluginManager: PluginManager;

  beforeEach(() => {
    pluginManager = new PluginManager();
  });

  describe('register', () => {
    it('deve registrar um plugin com sucesso', () => {
      const mockPlugin = new MockPlugin();
      
      expect(() => {
        pluginManager.register(mockPlugin);
      }).not.toThrow();
      
      // Verifica se o plugin foi registrado
      // (Não temos um getter público, então testamos indiretamente)
    });

    it('deve lançar erro se o plugin não implementar o método init', () => {
      const invalidPlugin = {
        name: 'InvalidPlugin',
        version: '1.0.0',
        // faltando o método init
      } as unknown as PluginInterface;
      
      expect(() => {
        pluginManager.register(invalidPlugin);
      }).toThrow('Plugin deve implementar o método init');
    });
  });

  describe('init', () => {
    it('deve chamar o método init de todos os plugins registrados', async () => {
      const mockPlugin1 = new MockPlugin();
      const mockPlugin2 = new MockPlugin();
      
      pluginManager.register(mockPlugin1);
      pluginManager.register(mockPlugin2);
      
      const coreMock = { some: 'core object' };
      
      await pluginManager.init(coreMock);
      
      expect(mockPlugin1.initCalled).toBe(true);
      expect(mockPlugin1.initParams).toEqual(coreMock);
      
      expect(mockPlugin2.initCalled).toBe(true);
      expect(mockPlugin2.initParams).toEqual(coreMock);
    });
  });

  describe('beforeConnect', () => {
    it('deve chamar o método beforeConnect de todos os plugins registrados', async () => {
      const mockPlugin1 = new MockPlugin();
      const mockPlugin2 = new MockPlugin();
      
      pluginManager.register(mockPlugin1);
      pluginManager.register(mockPlugin2);
      
      const configMock = { host: 'localhost', port: 3050 };
      
      await pluginManager.beforeConnect(configMock);
      
      expect(mockPlugin1.beforeConnectCalled).toBe(true);
      expect(mockPlugin1.beforeConnectParams).toEqual(configMock);
      
      expect(mockPlugin2.beforeConnectCalled).toBe(true);
      expect(mockPlugin2.beforeConnectParams).toEqual(configMock);
    });

    it('deve lidar com plugins que não implementam beforeConnect', async () => {
      const pluginWithoutBeforeConnect = {
        name: 'TestPlugin',
        version: '1.0.0',
        async init() {},
        // não implementa beforeConnect
      } as unknown as PluginInterface;
      
      pluginManager.register(pluginWithoutBeforeConnect);
      
      const configMock = { host: 'localhost', port: 3050 };
      
      await expect(pluginManager.beforeConnect(configMock)).resolves.not.toThrow();
    });
  });

  describe('afterConnect', () => {
    it('deve chamar o método afterConnect de todos os plugins registrados', async () => {
      const mockPlugin1 = new MockPlugin();
      const mockPlugin2 = new MockPlugin();
      
      pluginManager.register(mockPlugin1);
      pluginManager.register(mockPlugin2);
      
      const connectionMock = { id: 'connection123' };
      
      await pluginManager.afterConnect(connectionMock);
      
      expect(mockPlugin1.afterConnectCalled).toBe(true);
      expect(mockPlugin1.afterConnectParams).toEqual(connectionMock);
      
      expect(mockPlugin2.afterConnectCalled).toBe(true);
      expect(mockPlugin2.afterConnectParams).toEqual(connectionMock);
    });
  });

  describe('beforeQuery', () => {
    it('deve chamar o método beforeQuery de todos os plugins registrados', async () => {
      const mockPlugin1 = new MockPlugin();
      const mockPlugin2 = new MockPlugin();
      
      pluginManager.register(mockPlugin1);
      pluginManager.register(mockPlugin2);
      
      const queryMock = { sql: 'SELECT * FROM users', bindings: [] };
      
      await pluginManager.beforeQuery(queryMock);
      
      expect(mockPlugin1.beforeQueryCalled).toBe(true);
      expect(mockPlugin1.beforeQueryParams).toEqual(queryMock);
      
      expect(mockPlugin2.beforeQueryCalled).toBe(true);
      expect(mockPlugin2.beforeQueryParams).toEqual(queryMock);
    });
  });

  describe('afterQuery', () => {
    it('deve chamar o método afterQuery de todos os plugins registrados', async () => {
      const mockPlugin1 = new MockPlugin();
      const mockPlugin2 = new MockPlugin();
      
      pluginManager.register(mockPlugin1);
      pluginManager.register(mockPlugin2);
      
      const resultMock = { rows: [{ id: 1, name: 'John' }] };
      
      await pluginManager.afterQuery(resultMock);
      
      expect(mockPlugin1.afterQueryCalled).toBe(true);
      expect(mockPlugin1.afterQueryParams).toEqual(resultMock);
      
      expect(mockPlugin2.afterQueryCalled).toBe(true);
      expect(mockPlugin2.afterQueryParams).toEqual(resultMock);
    });
  });

  describe('beforeDisconnect', () => {
    it('deve chamar o método beforeDisconnect de todos os plugins registrados', async () => {
      const mockPlugin1 = new MockPlugin();
      const mockPlugin2 = new MockPlugin();
      
      pluginManager.register(mockPlugin1);
      pluginManager.register(mockPlugin2);
      
      await pluginManager.beforeDisconnect();
      
      expect(mockPlugin1.beforeDisconnectCalled).toBe(true);
      expect(mockPlugin2.beforeDisconnectCalled).toBe(true);
    });
  });

  describe('onError', () => {
    it('deve chamar o método onError de todos os plugins registrados', async () => {
      const mockPlugin1 = new MockPlugin();
      const mockPlugin2 = new MockPlugin();
      
      pluginManager.register(mockPlugin1);
      pluginManager.register(mockPlugin2);
      
      const errorMock = new Error('Test error');
      
      await pluginManager.onError(errorMock);
      
      expect(mockPlugin1.onErrorCalled).toBe(true);
      expect(mockPlugin1.errorParams).toEqual(errorMock);
      
      expect(mockPlugin2.onErrorCalled).toBe(true);
      expect(mockPlugin2.errorParams).toEqual(errorMock);
    });
  });

  describe('destroy', () => {
    it('deve chamar o método destroy de todos os plugins registrados', async () => {
      const mockPlugin1 = new MockPlugin();
      const mockPlugin2 = new MockPlugin();
      
      pluginManager.register(mockPlugin1);
      pluginManager.register(mockPlugin2);
      
      await pluginManager.destroy();
      
      expect(mockPlugin1.destroyCalled).toBe(true);
      expect(mockPlugin2.destroyCalled).toBe(true);
    });
  });

  describe('ordem de execução', () => {
    it('deve executar os hooks na ordem em que os plugins foram registrados', async () => {
      const callOrder: string[] = [];
      
      const plugin1 = {
        name: 'Plugin1',
        version: '1.0.0',
        async init() { callOrder.push('plugin1_init'); },
        async beforeConnect() { callOrder.push('plugin1_beforeConnect'); },
        async afterConnect() { },
        async beforeQuery() { },
        async afterQuery() { },
        async beforeDisconnect() { },
        async onError() { },
        async destroy() { callOrder.push('plugin1_destroy'); }
      } as unknown as PluginInterface;
      
      const plugin2 = {
        name: 'Plugin2',
        version: '1.0.0',
        async init() { callOrder.push('plugin2_init'); },
        async beforeConnect() { callOrder.push('plugin2_beforeConnect'); },
        async afterConnect() { },
        async beforeQuery() { },
        async afterQuery() { },
        async beforeDisconnect() { },
        async onError() { },
        async destroy() { callOrder.push('plugin2_destroy'); }
      } as unknown as PluginInterface;
      
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      
      await pluginManager.init(null);
      await pluginManager.beforeConnect({});
      await pluginManager.destroy();
      
      expect(callOrder).toEqual([
        'plugin1_init', 
        'plugin2_init', 
        'plugin1_beforeConnect', 
        'plugin2_beforeConnect', 
        'plugin1_destroy', 
        'plugin2_destroy'
      ]);
    });
  });
});