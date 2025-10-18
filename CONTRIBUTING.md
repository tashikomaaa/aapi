# Contributing to AAPI

First off, thank you for considering contributing to AAPI! It's people like you that make AAPI such a great tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and what you expected**
- **Include your environment details** (Node.js version, OS, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any similar features in other tools**

### Pull Requests

- Fill in the required pull request template
- Follow the [coding standards](#coding-standards)
- Include appropriate test cases
- Update documentation if needed
- Ensure all tests pass

## Development Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/YOUR-USERNAME/aapi.git
   cd aapi
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Link the CLI locally**

   ```bash
   npm link
   ```

4. **Run tests**

   ```bash
   npm test
   ```

5. **Test the CLI**
   ```bash
   aapi create test-project
   cd test-project
   npm install
   ```

## Coding Standards

### Code Style

We use ESLint and Prettier to enforce consistent code style:

- **Format code before committing**

  ```bash
  npm run format
  ```

- **Check linting**

  ```bash
  npm run lint
  ```

- **Auto-fix linting issues**
  ```bash
  npm run lint:fix
  ```

### JavaScript Guidelines

- Use **ES modules** (`import`/`export`)
- Use **modern JavaScript** (ES2024+)
- Prefer `const` over `let`, never use `var`
- Use **arrow functions** for callbacks
- Use **template literals** over string concatenation
- Use **async/await** over raw promises
- Handle errors properly - never ignore them
- Add JSDoc comments for public functions

Example:

```javascript
/**
 * Creates a new API project from templates
 * @param {string} projectName - The name of the project to create
 * @returns {Promise<void>}
 * @throws {Error} If project directory already exists
 */
export async function create(projectName) {
  // Implementation
}
```

### File Organization

- Keep files focused and under 300 lines
- One exported function per file (for commands)
- Group related utilities together
- Use meaningful file and folder names

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This leads to **more readable messages** and **automated changelog generation**.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvement
- **test**: Adding or updating tests
- **chore**: Changes to build process or auxiliary tools
- **ci**: CI/CD configuration changes
- **build**: Changes to build system or dependencies
- **revert**: Reverts a previous commit

### Examples

```
feat: add interactive field selection for model generation

fix(generate): resolve path resolution issue on Windows

docs: update README with new CLI commands

test: add unit tests for pascalCase utility

chore: upgrade dependencies to latest versions
```

### Scope (Optional)

The scope should be the name of the affected component:

- `create`
- `generate`
- `cli`
- `templates`
- `utils`

### Subject

- Use imperative, present tense: "add" not "added" nor "adds"
- Don't capitalize first letter
- No period (.) at the end
- Maximum 72 characters

## Pull Request Process

1. **Create a feature branch**

   ```bash
   git checkout -b feat/my-new-feature
   ```

2. **Make your changes**

   - Write clean, readable code
   - Follow coding standards
   - Add tests for new features
   - Update documentation

3. **Test your changes**

   ```bash
   npm test
   npm run lint
   ```

4. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add my new feature"
   ```

   _Note: Pre-commit hooks will automatically run linting and formatting_

5. **Push to your fork**

   ```bash
   git push origin feat/my-new-feature
   ```

6. **Open a Pull Request**

   - Use a clear title following conventional commits
   - Fill in the PR template completely
   - Link related issues
   - Request review from maintainers

7. **Address review feedback**

   - Make requested changes
   - Push additional commits
   - Re-request review

8. **Merge**
   - Once approved, a maintainer will merge your PR
   - Delete your feature branch after merge

## Project Structure

```
aapi/
├── bin/
│   └── cli.js              # CLI entry point
├── src/
│   ├── commands/           # CLI command implementations
│   │   ├── create.js       # Project creation
│   │   └── generate.js     # Code generation
│   ├── templates/          # EJS templates
│   │   ├── base-project/   # New project scaffold
│   │   └── model/          # Model generation
│   └── utils/              # Utility functions
│       └── fs.js           # Filesystem helpers
├── __tests__/              # Test files
└── README.md
```

### Key Areas

- **Commands** (`src/commands/`): CLI command logic
- **Templates** (`src/templates/`): EJS templates for code generation
- **Utils** (`src/utils/`): Shared utility functions
- **Tests** (`__tests__/`): Unit and integration tests

## Testing

### Writing Tests

- Place tests in `__tests__/` directory or next to source files as `*.test.js`
- Use descriptive test names
- Test both success and failure cases
- Mock external dependencies

Example:

```javascript
import { describe, it, expect } from '@jest/globals';
import { pascalCase } from '../src/utils/string.js';

describe('pascalCase', () => {
  it('should convert kebab-case to PascalCase', () => {
    expect(pascalCase('user-profile')).toBe('UserProfile');
  });

  it('should handle single words', () => {
    expect(pascalCase('user')).toBe('User');
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Update CHANGELOG.md (or let semantic-release handle it)
- Include code examples where helpful

## Getting Help

- Check existing [issues](https://github.com/tashikomaaa/aapi/issues)
- Join our [discussions](https://github.com/tashikomaaa/aapi/discussions)
- Read the [README](README.md)

## Recognition

Contributors will be recognized in our README and release notes. Thank you for making AAPI better!

---

**Happy Contributing! 🚀**
