import { ConfigManager, FirebirdConfig } from '../../src/core/ConfigManager';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const testConfig: FirebirdConfig = {
    host: 'localhost',
    port: 3050,
    username: 'SYSDBA',
    password: 'masterkey',
    database: 'test.fdb'
  };

  beforeEach(() => {
    configManager = new ConfigManager();
  });

  describe('constructor', () => {
    it('deve instanciar com objeto de configuração', () => {
      const customConfig: FirebirdConfig = {
        host: '192.168.1.100',
        port: 3051,
        username: 'testuser',
        password: 'testpass',
        database: '/path/to/test.fdb'
      };

      const manager = new ConfigManager(customConfig);

      expect(manager.get('host')).toBe('192.168.1.100');
      expect(manager.get('port')).toBe(3051);
      expect(manager.get('username')).toBe('testuser');
      expect(manager.get('password')).toBe('testpass');
      expect(manager.get('database')).toBe('/path/to/test.fdb');
    });

    it('deve usar valores padrão quando nenhuma configuração for fornecida', () => {
      const manager = new ConfigManager();

      expect(manager.get('host')).toBe('localhost');
      expect(manager.get('port')).toBe(3050);
      expect(manager.get('username')).toBe('SYSDBA');
      expect(manager.get('password')).toBe('');
      expect(manager.get('database')).toBe('');
    });
  });

  describe('validateConfig', () => {
    it('deve validar configuração válida', () => {
      const result = configManager.validateConfig(testConfig);

      expect(result.valid).toBe(true);
    });

    it('deve retornar erro para configuração vazia', () => {
      const emptyConfig = {} as FirebirdConfig;
      const result = configManager.validateConfig(emptyConfig);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Campos obrigatórios ausentes:');
    });

    it('deve validar campos obrigatórios faltantes', () => {
      const partialConfig = {
        host: 'localhost',
        port: 3050,
        // faltando username, password e database
      } as unknown as FirebirdConfig;

      const result = configManager.validateConfig(partialConfig);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Campos obrigatórios ausentes:');
    });

    it('deve validar tipo de porta', () => {
      const invalidPortConfig = {
        ...testConfig,
        port: -1
      };

      const result = configManager.validateConfig(invalidPortConfig);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Porta deve ser um número positivo');
    });

    it('deve validar host vazio', () => {
      const invalidHostConfig = {
        host: '',
        port: 3050,
        username: 'SYSDBA',
        password: 'masterkey',
        database: 'test.fdb'
      };

      const result = configManager.validateConfig(invalidHostConfig);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Campos obrigatórios ausentes: host');
    });

    it('deve validar username vazio', () => {
      const invalidUsernameConfig = {
        host: 'localhost',
        port: 3050,
        username: '',
        password: 'masterkey',
        database: 'test.fdb'
      };

      const result = configManager.validateConfig(invalidUsernameConfig);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Campos obrigatórios ausentes: username');
    });

    it('deve validar password vazio', () => {
      const invalidPasswordConfig = {
        host: 'localhost',
        port: 3050,
        username: 'SYSDBA',
        password: '',
        database: 'test.fdb'
      };

      const result = configManager.validateConfig(invalidPasswordConfig);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Campos obrigatórios ausentes: password');
    });

    it('deve validar database vazio', () => {
      const invalidDatabaseConfig = {
        host: 'localhost',
        port: 3050,
        username: 'SYSDBA',
        password: 'masterkey',
        database: ''
      };

      const result = configManager.validateConfig(invalidDatabaseConfig);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Campos obrigatórios ausentes: database');
    });
  });

  describe('get e set', () => {
    it('deve definir e obter valor corretamente', () => {
      configManager.set('host', '192.168.1.100');
      configManager.set('port', 3051);

      expect(configManager.get('host')).toBe('192.168.1.100');
      expect(configManager.get('port')).toBe(3051);
    });

    it('deve manter valores independentes entre instâncias', () => {
      const manager1 = new ConfigManager();
      const manager2 = new ConfigManager();

      manager1.set('host', 'host1');
      manager2.set('host', 'host2');

      expect(manager1.get('host')).toBe('host1');
      expect(manager2.get('host')).toBe('host2');
    });
    
    it('deve retornar valor padrão quando o valor for undefined', () => {
      // Criar uma nova instância vazia e definir manualmente um campo vazio para testar o defaultValue
      const manager = new ConfigManager();
      // Remover um valor existente para testar o defaultValue
      (manager as any).config.password = undefined;
      const defaultValue = 'default_value';
      const result = manager.get('password', defaultValue);
      
      expect(result).toBe(defaultValue);
    });
  });

  describe('getAll', () => {
    it('deve retornar uma cópia da configuração completa', () => {
      const manager = new ConfigManager(testConfig);
      const allConfig = manager.getAll();

      expect(allConfig).toEqual(testConfig);
      // Verifica que é uma cópia e não a referência original
      expect(allConfig).not.toBe(testConfig);
    });
  });
});