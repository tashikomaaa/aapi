# Changelog

All notable changes to AAPI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Generated code was invalid JavaScript when using `--relations`**: relation
  fragments were interpolated with EJS `<%= %>`, which HTML-escapes quotes and
  produced `ref: &#39;User&#39;`. Models and resolvers now use `<%- %>`.
- **`--with-subscriptions` / `--with-cache` emitted imports to files that were
  never created**: `src/utils/pubsub.js` and `src/utils/cache.js` are now
  generated alongside the resolver that imports them.
- **`--no-tests` had no effect**: commander maps it to `options.tests`, not
  `options.withTests`.
- **Generated tests could not run**: they imported models from the wrong depth
  (`../../models` instead of `../models`), `jest.config.js` / `jest.setup.js`
  were never copied into the project, and no `test` script or Jest dependency
  was declared. Generated projects now test out of the box against an in-memory
  MongoDB.
- **Generated servers only started from the project root**: the typeDefs and
  resolvers loaders resolved paths from `process.cwd()` instead of their own
  module location, breaking Docker, PM2 and monorepo setups.
- **`/health` crashed the GraphQL Yoga server**: the handler was registered as a
  second `request` listener, so it raced Yoga and threw
  `ERR_HTTP_HEADERS_SENT`. It now returns 503 when MongoDB is disconnected.
- **PubSub used a non-existent API**: `graphql-yoga` v5 exports `createPubSub`,
  not a `PubSub` class.
- **Cache utilities were broken in ESM**: `require()` was called from ES modules,
  `cacheResolver` assumed a context always exists, and the cleanup interval was
  not `unref()`ed so it kept the process alive.
- `aapi list` reported the schema's existence on the "Model" line.
- `aapi --version` was hardcoded and drifted from `package.json`.
- `generate` resolved template paths with `new URL().pathname`, which is broken
  on Windows.
- `.gitignore` and `.editorconfig` templates were silently absent from the npm
  package, so projects scaffolded from a published install got neither.

### Changed

- **`aapi create` now actually installs dependencies**; `--skip-install` opts out
  (previously nothing was ever installed and the flag only changed the output).
- **Security: the generated `--secure` server refuses to start in production**
  when a JWT secret is missing, still the scaffolded placeholder, shorter than
  32 characters, or identical between access and refresh tokens. Previously it
  silently fell back to a public, hardcoded secret.
- **Apollo path migrated from `apollo-server-express` v3 (EOL) to
  `@apollo/server` v4** with `@as-integrations/express4`.
- `--secure --apollo` now warns instead of silently dropping security features.
- `--with-subscriptions` fails with an actionable message on non-Yoga projects
  instead of generating unrunnable code.

### Added

- Integration tests asserting that generated code parses, plus
  `npm run verify:generated` / `verify:generated:apollo`, which scaffold a
  project, install it, run its test suite, boot the server from outside its
  directory and exercise it over HTTP. Both run in CI.
- `LICENSE` file (MIT), matching the badge that was already in the README.

### Removed

- Stray `Product` model/resolver/schema artifacts accidentally committed into
  the CLI's own `src/` and shipped to npm.
- Empty `src/utils/fs.js` placeholder.

## [0.1.0] - 2025-10-18

### Added

- **Input Validation**: Added comprehensive validation for project and model names
  - Validates against npm naming rules
  - Prevents JavaScript reserved keywords
  - Sanitizes paths to prevent directory traversal attacks
  - Validates minimum/maximum lengths

- **File Existence Checks**: Prevents accidental overwrites
  - Checks if project directory exists before creation
  - Checks if model files exist before generation
  - Provides clear error messages with suggestions

- **New `list` Command**: List all generated models in a project
  - Shows model, schema, and resolver files
  - Indicates incomplete models (missing files)
  - Works only in AAPI-generated projects

- **Better Error Handling**: Improved error messages throughout
  - MongoDB connection with retry events
  - GraphQL error formatting
  - Graceful server shutdown (SIGTERM/SIGINT)
  - Health check endpoint (`/health`)

- **Generated Project Features**:
  - `.gitignore` file with sensible defaults
  - `.editorconfig` for consistent code formatting
  - `README.md` with project documentation
  - Health check endpoint for monitoring
  - Graceful shutdown handling
  - Better MongoDB connection configuration (pooling, timeouts)

- **JSDoc Documentation**: Added comprehensive JSDoc comments to all public functions

- **Language Standardization**: All CLI output and errors now in English

### Changed

- **CLI Commands**: Updated descriptions from French to English
- **CLI Version**: Updated from 0.0.1 to 0.1.0
- **README.md**: Updated placeholder URLs to actual repository (tashikomaaa/aapi)

### Fixed

- **CRITICAL**: Fixed severe indentation issues in EJS templates
  - `src/templates/model/resolver.js.ejs` - now properly formatted with 2-space indentation
  - `src/templates/model/schema.graphql.ejs` - now properly formatted GraphQL schema

- **Security**: Added path sanitization to prevent directory traversal attacks
- **Code Quality**: Removed unused utility functions from `src/utils/fs.js`

### Removed

- Unused `resolveFromRoot()` and `renderEJSToFile()` functions from utils/fs.js

## [0.0.1] - Initial Release

### Added

- Initial CLI implementation
- `create` command for project generation
- `generate model` command for model scaffolding
- Apollo Server + Express + Mongoose integration
- EJS-based templating system
