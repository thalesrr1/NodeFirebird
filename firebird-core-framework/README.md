# Firebird Core Framework

Framework para integração com banco de dados Firebird, oferecendo uma interface simplificada para operações de banco de dados com segurança e eficiência.

## Instalação

Para instalar o Firebird Core Framework e suas dependências necessárias, execute:

```bash
npm install firebird-core-framework knex firebird-driver
```

## Exemplo de Uso Rápido (TypeScript)

A seguir, um exemplo básico de como utilizar o FirebirdCore para se conectar a um banco de dados Firebird e executar uma consulta:

```typescript
import { FirebirdCore } from "firebird-core-framework";

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

## Exemplo com Express

Veja como integrar o FirebirdCore com uma aplicação Express usando o ExpressAdapter:

```typescript
import express from "express";
import { FirebirdCore, ExpressAdapter } from "firebird-core-framework";

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do FirebirdCore
const config = {
  host: "localhost",
  port: 3050,
  database: "/path/to/database.fdb",
  user: "SYSDBA",
  password: "masterkey",
  pool: {
    min: 2,
    max: 10,
  },
};

// Instanciação e inicialização
const db = new FirebirdCore(config);
const adapter = new ExpressAdapter(db);

// Aplicar o adapter ao app Express
adapter.applyTo(app);

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);

  // Conectar ao banco de dados após iniciar o servidor
  await db.connect();
});
```

Este exemplo configura automaticamente rotas como `/health` para verificação de status e `/query` para execução de consultas SQL.

## Dependências e Compatibilidade

Este framework requer as seguintes dependências:

- `knex`: Query builder para Node.js
- `firebird-driver`: Driver específico para conexão com Firebird

Compatível com Node.js 14+ e TypeScript 4.5+.

## Contribuição

Sinta-se à vontade para contribuir com este projeto. Abra issues para relatar problemas ou pull requests para adicionar novas funcionalidades.

## Licença

MIT License. Veja o arquivo LICENSE para mais informações.
