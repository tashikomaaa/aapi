# 🧠 AAPI — Automatic API Builder

> **AAPI (Automatic API)** is an open-source Node.js CLI that generates complete Apollo GraphQL + Express + MongoDB APIs automatically.  
> Designed for speed, simplicity, and flexibility — build an API from scratch in seconds.

[![Node Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](#-contributing)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-green.svg)](https://github.com/tashikomaaa/aapi/pulls)

---

## 🚀 What is AAPI?

AAPI is an **automatic API builder** for Node.js that creates a full-featured backend using:

- **GraphQL Yoga** or **Apollo Server** (GraphQL)
- **Mongoose** (MongoDB)
- **EJS templates** for customizable scaffolding
- **CLI commands** for project generation and model management

You can create, manage, and scale APIs **without boilerplate**.
AAPI handles your project structure, schemas, resolvers, and model files — so you can focus on logic, not setup.

### Why GraphQL Yoga?

By default, AAPI uses **GraphQL Yoga** (the recommended modern GraphQL server):

- ✅ **Faster** and more lightweight than Apollo Server
- ✅ **Better DX** with built-in features (GraphiQL, CORS, health checks)
- ✅ **TypeScript-first** design
- ✅ **Active maintenance** and modern architecture
- ✅ **No dependencies** on Express (uses native Node.js HTTP server)
- ✅ **Full Envelop plugin ecosystem**

You can still use Apollo Server with `--apollo` flag if needed.

---

## ✨ Features

✅ One-command project setup (`aapi create <project>`)
✅ Automatic MongoDB + Apollo Server/GraphQL Yoga integration
✅ Model generator (`aapi generate model <Name>`)
✅ JSON schema import (`aapi import data.json`) - Auto-detect fields!
✅ **Secure mode** (`--secure`) - JWT auth, RBAC, rate limiting, audit logging
✅ Auto-discovery of resolvers (no manual imports needed)
✅ Dynamic EJS-based templates
✅ Clean modular file structure
✅ 100% ES Modules
✅ Open-source & developer-friendly design

### 🔒 Security Features

With the `--secure` flag, AAPI generates production-ready security features:

- **JWT Authentication** - Access & refresh token system with bcrypt password hashing
- **Role-Based Access Control (RBAC)** - User, moderator, admin roles with middleware
- **Rate Limiting** - DDoS protection with configurable limits (5/15min for auth, 100/15min for API)
- **Input Sanitization** - XSS and NoSQL injection prevention with validator.js
- **Security Headers** - OWASP recommended headers (CSP, HSTS, X-Frame-Options, etc.)
- **Audit Logging** - Track all operations with MongoDB TTL (90-day retention)
- **Account Locking** - Automatic lockout after 5 failed login attempts
- **CORS Protection** - Configurable origin whitelist

See [SECURITY.md](SECURITY.md) for comprehensive security documentation.

---

## 📦 Installation

To install globally (recommended during development):

```bash
npm install -g aapi
Or clone locally for development:

git clone https://github.com/tashikomaaa/aapi.git
cd aapi
npm install
npm link   # exposes the `aapi` CLI globally
```

⚙️ Usage
🏗 Create a new API project

**Using GraphQL Yoga (recommended):**

```bash
aapi create my-api
# or explicitly: aapi create my-api --yoga
cd my-api
npm install
cp .env.example .env
npm run dev
```

**With security features (recommended for production):**

```bash
aapi create my-api --secure
cd my-api
npm install
cp .env.example .env

# Generate JWT secrets (IMPORTANT!)
npm run security:generate-secret

# Update .env with generated secrets
# Then start the server
npm run dev
```

See [SECURITY.md](SECURITY.md) for complete security guide.

**Using Apollo Server (legacy):**

```bash
aapi create my-api --apollo
cd my-api
npm install
cp .env.example .env
npm run dev
```

Your API is live 🎉

```bash
📦 MongoDB connected successfully
🚀 Server ready!
   GraphQL endpoint: http://localhost:4000/graphql
   Health check:     http://localhost:4000/health
```

🧩 Generate a new model

**Manually:**

```bash
aapi generate model User
```

**From JSON schema (automatically detect fields!):**

```bash
# Export your database collection to JSON
mongoexport --collection=users --db=mydb --out=users.json

# Import into AAPI
aapi import users.json

# Or with custom name
aapi import data.json --name Product

# Preview what will be generated
aapi import users.json --preview
```

This creates three files:

```
src/
  models/
    User.js          # Mongoose model with detected fields
  graphql/
    typeDefs/User.graphql    # GraphQL schema
    resolvers/UserResolver.js # CRUD resolvers
```

**Example JSON to import:**

```json
[
  {
    "username": "john_doe",
    "email": "john@example.com",
    "age": 28,
    "isActive": true,
    "tags": ["developer", "nodejs"]
  }
]
```

AAPI will automatically:

- ✅ Detect field types (String, Number, Boolean, Date, Array, etc.)
- ✅ Determine which fields are required
- ✅ Generate Mongoose schemas
- ✅ Create GraphQL types and inputs
- ✅ Generate complete CRUD resolvers

Each file includes:

Mongoose model with default schema

GraphQL typeDef with CRUD queries/mutations

Resolver implementing CRUD operations

Resolvers are automatically loaded into Apollo at runtime.
No imports or registration needed.

🧱 Project Structure (generated by aapi create)

```pgsql
my-api/
├── .env.example
├── package.json
├── src/
│   ├── db/
│   │   └── connection.js
│   ├── graphql/
│   │   ├── typeDefs/
│   │   │   ├── base.graphql
│   │   │   └── index.js
│   │   └── resolvers/
│   │       └── index.js
│   ├── models/
│   │   └── index.js
│   └── server.js
└── README.md
```

🧠 How It Works

AAPI relies on EJS templates and fs-extra to generate a complete boilerplate based on user commands.

Command Description
aapi create <name> Generates a new ready-to-run Apollo + MongoDB project
aapi generate model <Model> Adds a model, schema, and resolver automatically
npm run dev Runs the API in development (via nodemon)

Under the hood:

Each GraphQL file (\*.graphql) is merged via @graphql-tools/merge.

Each resolver (\*Resolver.js) is dynamically imported.

Mongoose handles model registration and schema validation.

ApolloServer automatically binds all resolvers and typeDefs.

🧩 Example GraphQL Schema (auto-generated)
type User {
\_id: ID!
name: String!
createdAt: Date
updatedAt: Date
}

type Query {
users: [User!]!
user(id: ID!): User
}

type Mutation {
createUser(name: String!): User
updateUser(id: ID!, name: String!): User
deleteUser(id: ID!): Boolean!
}

⚡ Example Resolver (auto-generated)
import User from '../../models/User.js';

export default {
Query: {
users: async () => User.find().lean(),
user: async (_, { id }) => User.findById(id).lean(),
},
Mutation: {
createUser: async (_, { name }) => User.create({ name }),
updateUser: async (_, { id, name }) =>
User.findByIdAndUpdate(id, { name }, { new: true, lean: true }),
deleteUser: async (_, { id }) => !!(await User.findByIdAndDelete(id)),
},
};

## 🛠 CLI Commands

### Project Creation

```bash
# Create new project with GraphQL Yoga (default)
aapi create <name>

# Create with security features
aapi create <name> --secure

# Create with Apollo Server
aapi create <name> --apollo

# Combine flags
aapi create <name> --secure --yoga --force --skip-install

# Available flags:
#   --yoga          Use GraphQL Yoga (default)
#   --apollo        Use Apollo Server
#   --secure        Add authentication, authorization, security
#   --force         Overwrite existing directory
#   --skip-install  Skip npm install after creation
```

### Add to Existing Project

```bash
# Add AAPI to existing Node.js project
aapi init

# With security features
aapi init --secure

# With specific GraphQL server
aapi init --yoga
aapi init --apollo
```

### Model Generation

```bash
# Generate model manually
aapi generate model <Name>

# Generate model from JSON schema
aapi import data.json
aapi import users.json --name User

# Preview what will be generated
aapi import data.json --preview

# Available flags:
#   --force    Overwrite existing model files
#   --name     Custom model name (for import)
#   --preview  Show what will be generated without creating files
```

### List Models

```bash
# List all models in the project
aapi list
```

### Help

```bash
aapi --help
aapi --version
```

## 🧰 Tech Stack

| Layer          | Library                                    |
| -------------- | ------------------------------------------ |
| GraphQL Server | GraphQL Yoga / Apollo Server               |
| Web Framework  | GraphQL Yoga (native Node.js) / Express.js |
| Database       | MongoDB + Mongoose                         |
| Authentication | JWT (jsonwebtoken) + bcryptjs              |
| Validation     | validator.js                               |
| CLI            | Commander.js                               |
| Templates      | EJS                                        |
| Utils          | fs-extra, ora, chalk                       |
| Module system  | ES Modules (Node >=18)                     |

💡 Roadmap

Interactive model generation (field types, required flags, etc.)

REST endpoints generator (optional alongside GraphQL)

Auth directive + context utilities

Plugin system for custom templates

Project configuration file (aapi.config.json)

Auto documentation generator (GraphQL → Markdown/OpenAPI)

Testing templates (Jest + Supertest)

🤝 Contributing

AAPI is open-source and community-driven!
We welcome issues, pull requests, and suggestions.

🧑‍💻 How to contribute

Fork the repository

Create a feature branch:

git checkout -b feature/my-new-feature

Commit your changes:

git commit -m "feat: add my feature"

Push and open a Pull Request 🚀

Please follow the existing code style and include concise commit messages.

🧪 Development

If you want to hack on AAPI locally:

git clone https://github.com/tashikomaaa/aapi.git
cd aapi
npm install
npm link # expose CLI globally
aapi create test-api

⚖️ License

AAPI is licensed under the MIT License.
You are free to use, modify, and distribute it for personal or commercial purposes.

🌍 Community & Support

🧩 GitHub: [github.com/tashikomaaa/aapi](https://github.com/tashikomaaa/aapi)

💬 Discussions: [GitHub Discussions](https://github.com/tashikomaaa/aapi/discussions)

🐛 Issues: [Report a bug](https://github.com/tashikomaaa/aapi/issues)

“Build APIs faster. Ship smarter.” — The AAPI Project
