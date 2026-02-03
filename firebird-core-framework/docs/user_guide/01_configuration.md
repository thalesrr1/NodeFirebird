# Configuração do Firebird Core Framework

Este documento descreve a interface `FirebirdConfig` e suas opções de configuração, com foco especial nas configurações do pool de conexões que são fundamentais para aplicações em alta carga.

## Interface FirebirdConfig

A interface `FirebirdConfig` define todas as opções de configuração para conexão com o banco de dados Firebird:

```typescript
interface FirebirdConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  pool?: PoolConfig;
  options?: Record<string, any>;
}
```

### Propriedades principais

- `host`: Endereço do servidor Firebird (padrão: 'localhost')
- `port`: Porta do servidor Firebird (padrão: 3050)
- `username`: Nome de usuário para autenticação
- `password`: Senha para autenticação
- `database`: Caminho completo ou nome do banco de dados
- `pool`: Configurações do pool de conexões (opcional)
- `options`: Opções adicionais específicas do driver (opcional)

## Configuração do Pool de Conexões

As opções de pool são críticas para o desempenho e estabilidade da aplicação, especialmente em ambientes de alta carga. O pool gerencia a reutilização de conexões com o banco de dados, evitando a sobrecarga de criar e destruir conexões constantemente.

### Interface PoolConfig

```typescript
interface PoolConfig {
  min?: number;                // Número mínimo de conexões no pool
  max?: number;                // Número máximo de conexões no pool
  acquireTimeout?: number;     // Tempo limite para obter uma conexão do pool
  createTimeout?: number;      // Tempo limite para criar uma nova conexão
  destroyTimeout?: number;     // Tempo limite para destruir uma conexão
  idleTimeout?: number;        // Tempo máximo que uma conexão pode ficar ociosa
  reapInterval?: number;       // Intervalo para verificar conexões ociosas
  createRetryInterval?: number; // Intervalo entre tentativas de criação de conexão
  propagateCreateError?: boolean; // Se erros de criação devem ser propagados
}
```

### Parâmetros do Pool e seu Impacto em Alta Carga

#### `min` (padrão: 2)
- Define o número mínimo de conexões mantidas ativas no pool
- Em alta carga, um valor maior pode reduzir o tempo de espera para obter conexões
- Equilibra a latência inicial com o consumo de recursos

#### `max` (padrão: 10)
- Limite superior de conexões simultâneas com o banco de dados
- Prevenir sobrecarga do servidor Firebird com conexões excessivas
- Em alta carga, este valor deve considerar o limite do servidor e os recursos disponíveis

#### `acquireTimeout` (padrão: 30000ms)
- Tempo máximo que uma operação aguardará por uma conexão disponível no pool
- Em alta carga, um timeout adequado evita que requisições fiquem bloqueadas indefinidamente
- Pode ajudar a prevenir cascata de falhas em situações de pico

### Benefícios em Alta Carga

1. **Eficiência Recursiva**: O pool reutiliza conexões existentes, reduzindo a sobrecarga de criar novas conexões sob demanda.

2. **Controle de Concorrência**: Limita o número máximo de conexões simultâneas, protegendo o servidor contra sobrecarga.

3. **Disponibilidade**: Mantém um número mínimo de conexões prontas para uso, reduzindo latência em picos de demanda.

4. **Recuperação de Falhas**: Com timeouts configuráveis, permite recuperação rápida de situações temporárias de indisponibilidade.

## Exemplo de Configuração para Alta Carga

Para aplicações que esperam alta concorrência, recomenda-se ajustar os parâmetros do pool:

```typescript
const highLoadConfig: FirebirdConfig = {
  host: 'localhost',
  port: 3050,
  username: 'SYSDBA',
  password: process.env.FIREBIRD_PASSWORD || '',
  database: '/path/to/database.fdb',
  pool: {
    min: 10,                    // Manter 10 conexões ativas no mínimo
    max: 50,                    // Permitir até 50 conexões simultâneas
    acquireTimeout: 60000,      // Aguardar até 60 segundos por uma conexão
    createTimeout: 30000,       // Timeout de 30 segundos para criar conexão
    destroyTimeout: 5000,       // Timeout de 5 segundos para destruir conexão
    idleTimeout: 300000,        // Conexões ociosas duram até 5 minutos
    reapInterval: 1000,         // Verificar conexões a cada segundo
    createRetryInterval: 200,   // Tentar novamente a cada 200ms
    propagateCreateError: false // Não propagar erros de criação
  }
};
```

## Exemplo de Arquivo .env Recomendado

```env
# Configurações básicas do Firebird
FIREBIRD_HOST=localhost
FIREBIRD_PORT=3050
FIREBIRD_USERNAME=SYSDBA
FIREBIRD_PASSWORD=SuaSenhaSegura
FIREBIRD_DATABASE=/caminho/para/seu/banco.fdb

# Configurações do pool (valores padrão podem ser substituídos)
FIREBIRD_POOL_MIN=5
FIREBIRD_POOL_MAX=20
FIREBIRD_POOL_ACQUIRE_TIMEOUT=30000
FIREBIRD_POOL_CREATE_TIMEOUT=30000
FIREBIRD_POOL_DESTROY_TIMEOUT=5000
FIREBIRD_POOL_IDLE_TIMEOUT=600000
```

## Considerações Finais

- Monitore constantemente o uso do pool em produção para ajustar os valores ideais
- Considere o hardware disponível tanto no cliente quanto no servidor
- Teste diferentes configurações em ambiente semelhante ao de produção
- Ajuste gradualmente os valores com base no comportamento real da aplicação