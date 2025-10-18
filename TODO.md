# AAPI - TODO & Roadmap

## Immediate Next Steps

### 1. Install Development Dependencies
```bash
npm install
```

This will install:
- ESLint for linting
- Prettier for code formatting
- Jest for testing
- Husky for git hooks
- lint-staged for pre-commit checks

### 2. Run Tests
```bash
npm test
```

Currently, only validation utilities have tests. You should see all tests passing.

### 3. Make Git Executable Scripts Executable
```bash
chmod +x .husky/pre-commit .husky/commit-msg
```

### 4. Test the CLI Locally
```bash
npm link
aapi --help
aapi --version
```

### 5. Create a Test Project
```bash
cd /tmp
aapi create test-api
cd test-api
npm install
# Configure .env file
npm run dev
```

Test the generated API:
- Visit http://localhost:4000/graphql
- Visit http://localhost:4000/health
- Try creating a model: `aapi generate model User`
- List models: `aapi list`

---

## Short-term Improvements (High Priority)

### Testing
- [ ] Add tests for `pascalCase()` function
- [ ] Add integration tests for `create` command
- [ ] Add integration tests for `generate` command
- [ ] Add tests for `list` command
- [ ] Set up CI/CD pipeline (GitHub Actions)

### Documentation
- [ ] Add example GIF/video to README showing CLI in action
- [ ] Create troubleshooting guide
- [ ] Add API documentation examples
- [ ] Create a contributing guide for templates

### Error Handling
- [ ] Add retry logic for MongoDB connection
- [ ] Better error messages for missing dependencies
- [ ] Validate Node.js version at runtime
- [ ] Check if MongoDB is accessible before creating project

### CLI UX
- [ ] Add `--force` flag to overwrite existing files
- [ ] Add `--skip-install` flag to skip npm install
- [ ] Add colored output for `list` command
- [ ] Add progress bars for file operations
- [ ] Add `aapi init` for adding AAPI to existing project

---

## Medium-term Features (Roadmap Items)

### Interactive Model Generation
- [ ] Prompt user for field names and types
- [ ] Support common field types (String, Number, Boolean, Date, ObjectId)
- [ ] Support field validation (required, unique, min, max, etc.)
- [ ] Support relationships (ref, populate)
- [ ] Generate sample data/fixtures

### REST Endpoints Generator
- [ ] Add `aapi generate rest <Name>` command
- [ ] Generate Express routes
- [ ] Generate controllers
- [ ] Generate middleware
- [ ] Support both REST and GraphQL simultaneously

### Authentication & Authorization
- [ ] Generate authentication boilerplate
- [ ] Support JWT authentication
- [ ] Generate @auth directive for GraphQL
- [ ] Generate auth middleware for Express
- [ ] Support different auth strategies (local, OAuth, etc.)

### Configuration System
- [ ] Support `aapi.config.json` in project root
- [ ] Allow customization of:
  - Port number
  - Database connection
  - Template locations
  - Code style preferences
- [ ] Support environment-specific configs

### Plugin System
- [ ] Design plugin architecture
- [ ] Support custom templates
- [ ] Support custom commands
- [ ] Create plugin registry
- [ ] Document plugin creation guide

### Documentation Generator
- [ ] Generate Markdown docs from GraphQL schemas
- [ ] Generate OpenAPI/Swagger specs from REST routes
- [ ] Generate Postman collections
- [ ] Auto-generate API reference

---

## Long-term Goals

### Testing Support
- [ ] Generate Jest test templates
- [ ] Generate Supertest integration tests
- [ ] Support test fixtures
- [ ] Add `aapi test` command to run tests

### Database Migrations
- [ ] Add migration system
- [ ] Generate migration files
- [ ] Support rollback
- [ ] Seed data support

### Deployment Support
- [ ] Generate Dockerfile
- [ ] Generate docker-compose.yml
- [ ] Support deployment to common platforms (Heroku, Vercel, Railway)
- [ ] Generate CI/CD configurations

### Multi-database Support
- [ ] Support PostgreSQL with Sequelize
- [ ] Support PostgreSQL with Prisma
- [ ] Allow user to choose database at project creation
- [ ] Generate appropriate models/schemas for each DB

### GraphQL Advanced Features
- [ ] Support subscriptions
- [ ] Generate dataloaders for N+1 prevention
- [ ] Support custom scalars
- [ ] Support unions and interfaces
- [ ] Generate field-level resolvers

### Developer Experience
- [ ] Interactive CLI with beautiful prompts
- [ ] Real-time file watching and regeneration
- [ ] VSCode extension for AAPI
- [ ] Web UI for project management
- [ ] Template marketplace

### Monitoring & Observability
- [ ] Generate logging infrastructure (Winston/Pino)
- [ ] Add OpenTelemetry instrumentation
- [ ] Generate health check endpoints
- [ ] Support metrics export (Prometheus)
- [ ] Add request tracing

---

## Community & Ecosystem

### Documentation Site
- [ ] Create dedicated documentation website
- [ ] Add tutorial section
- [ ] Add example projects
- [ ] Create video tutorials
- [ ] Multilingual support

### Community Building
- [ ] Set up Discord/Slack community
- [ ] Create GitHub Discussions
- [ ] Establish contribution guidelines
- [ ] Create issue templates
- [ ] Set up automated releases

### Publishing
- [ ] Publish to npm registry
- [ ] Set up semantic versioning
- [ ] Automated changelog generation
- [ ] Create release process
- [ ] Add badges to README

---

## Known Issues to Address

### Low Priority
- [ ] Support for Windows paths in templates (currently Unix-centric)
- [ ] Better handling of special characters in project names
- [ ] Improve generated resolver error handling (null checks)
- [ ] Add validation for generated code (ESLint check after generation)
- [ ] Support custom templates per project

### Technical Debt
- [ ] Migrate to ESLint v9 flat config
- [ ] Consider switching from EJS to a more type-safe template system
- [ ] Add TypeScript support for generated projects
- [ ] Refactor command structure for better modularity

---

## Metrics to Track

- [ ] Number of projects created
- [ ] Number of models generated
- [ ] User satisfaction surveys
- [ ] GitHub stars/forks
- [ ] npm download statistics
- [ ] Documentation page views
- [ ] Community engagement (issues, PRs, discussions)

---

## Notes

This TODO list is a living document and should be updated regularly as priorities change and new features are requested by the community.

For immediate contributions, start with the "Short-term Improvements" section.
For feature requests, refer to the "Roadmap Items" in the README.md.
