# Changelog

All notable changes to AAPI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
