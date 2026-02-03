# Firebird Core Framework

![License](https://img.shields.io/npm/l/@thalesrr1/firebird-core-framework) ![NPM Version](https://img.shields.io/npm/v/@thalesrr1/firebird-core-framework) ![TypeScript](https://img.shields.io/badge/TypeScript-4.5+-blue.svg)

Framework robusto para Firebird v3+ com TypeScript 🚀

## Descrição

Framework para integração com banco de dados Firebird, oferecendo uma interface simplificada para operações de banco de dados com segurança e eficiência. Projetado para aplicações modernas que exigem alta performance e controle granular sobre o pool de conexões.

## 🚀 Instalação

```bash
npm install @thalesrr1/firebird-core-framework
```

## 📋 Quick Start

A seguir, um exemplo básico de como utilizar o FirebirdCore para se conectar a um banco de dados Firebird e executar uma consulta:

```typescript
import { FirebirdCore } from "@thalesrr1/firebird-core-framework";

// Configuração da conexão
const config = {
  host: "localhost",
  port: 3050,
  database: "/path/to/database.fdb",
  user: "SYSDBA",
  password: "masterkey",
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
  },
};

// Instanciação do FirebirdCore
const db = new FirebirdCore(config);

// Inicialização do framework
await db.initialize();

// Conectar ao banco de dados
await db.connect();

// Executar uma consulta parametrizada
const result = await db.executeQuery(
  "SELECT * FROM usuarios WHERE idade > ?",
  [18],
);

console.log(result);

// Desconectar do banco de dados
await db.disconnect();
```

## 🔧 Funcionalidades Avançadas

### 🛡️ Proteção de Pool
O framework gerencia automaticamente as opções do `tarn.js` (`min`, `max`, `idleTimeoutMillis`), garantindo otimização e segurança em ambientes de alta carga:

```typescript
const config = {
  // ... outras configurações
  pool: {
    min: 10,                    // Manter 10 conexões ativas no mínimo
    max: 50,                    // Permitir até 50 conexões simultâneas
    acquireTimeoutMillis: 60000,      // Aguardar até 60 segundos por uma conexão
    idleTimeoutMillis: 300000,        // Conexões ociosas duram até 5 minutos
    // ... outras opções de pool
  }
};
```

### 📁 Custom Client Library
Especifique um caminho customizado para a biblioteca do Firebird para evitar conflitos e garantir compatibilidade em diferentes ambientes:

```typescript
import { FirebirdCore } from '@thalesrr1/firebird-core-framework';
import path from 'path';

const db = new FirebirdCore({
    host: 'localhost',
    database: '/dados/banco.fdb',
    // Apontando para uma DLL específica para evitar conflitos
    clientLibPath: path.join(__dirname, 'bin', 'fbclient.dll'),
    // ...
});
```

Essa abordagem é especialmente útil quando você precisa garantir que sua aplicação utilize uma versão específica da biblioteca cliente do Firebird, como quando está empacotando sua aplicação com uma versão específica da biblioteca ou quando há conflitos com versões instaladas no sistema.

### 🧩 Plugins
Sistema de plugins flexível para extender as funcionalidades do framework conforme sua necessidade.

## 📚 Documentação

Para documentação completa, visite nossa pasta de guias de usuário:

- [Guia de Configuração](https://github.com/thalesrr1/NodeFirebird/blob/main/firebird-core-framework/docs/user_guide/01_configuration.md)
- [Consultas e Transações](https://github.com/thalesrr1/NodeFirebird/blob/main/firebird-core-framework/docs/user_guide/02_queries_and_transactions.md)
- [Sistema de Plugins](https://github.com/thalesrr1/NodeFirebird/blob/main/firebird-core-framework/docs/user_guide/03_plugins.md)
- [Integração Web](https://github.com/thalesrr1/NodeFirebird/blob/main/firebird-core-framework/docs/user_guide/04_web_integration.md)

## ⚙️ Compatibilidade

Este framework é compatível com:
- Node.js 14+
- TypeScript 4.5+
- Firebird v3+

## 🤝 Contribuição

Sinta-se à vontade para contribuir com este projeto. Abra issues para relatar problemas ou pull requests para adicionar novas funcionalidades.

## 📄 License

MIT License. Veja o arquivo [LICENSE](./LICENSE) para mais informações.