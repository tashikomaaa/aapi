import path from 'path';
import fs from 'fs-extra';
import ejs from 'ejs';
import ora from 'ora';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { validateProjectName, sanitizePath } from '../utils/validate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates a new API project from templates
 * @param {string} projectName - The name of the project to create (lowercase, alphanumeric, hyphens, underscores, dots)
 * @param {Object} options - Command options
 * @param {boolean} options.force - Overwrite existing directory if it exists
 * @param {boolean} options.skipInstall - Skip npm install after project creation
 * @returns {Promise<void>}
 * @throws {Error} If project name is invalid or directory already exists with content
 */
export default async function create(projectName, options = {}) {
  // Validate project name
  const validation = validateProjectName(projectName);
  if (!validation.valid) {
    console.error(chalk.red(`\n✗ Invalid project name: ${validation.error}`));
    process.exit(1);
  }

  // Sanitize project name to prevent path traversal
  const safeName = sanitizePath(projectName);
  if (safeName !== projectName) {
    console.error(chalk.red(`\n✗ Invalid project name: path traversal detected`));
    process.exit(1);
  }

  const spinner = ora(`Creating project ${projectName}...`).start();

  try {
    const targetDir = path.resolve(process.cwd(), projectName);
    const tplRoot = path.resolve(__dirname, '..', 'templates', 'base-project');

    // Check if directory exists and has content
    if (await fs.pathExists(targetDir)) {
      const files = await fs.readdir(targetDir);
      if (files.length > 0) {
        if (!options.force) {
          spinner.fail(chalk.red(`Directory ${projectName} already exists and is not empty`));
          console.log(
            chalk.yellow(
              '\nPlease choose a different name, remove the existing directory, or use --force to overwrite.'
            )
          );
          process.exit(1);
        } else {
          spinner.info(chalk.yellow(`Overwriting existing directory ${projectName}...`));
          await fs.emptyDir(targetDir);
        }
      }
    }

    await fs.ensureDir(targetDir);

    // Copy static files
    await fs.copy(
      path.join(tplRoot, 'src', 'graphql', 'typeDefs', 'base.graphql'),
      path.join(targetDir, 'src', 'graphql', 'typeDefs', 'base.graphql')
    );

    // Copy configuration files if they exist
    const configFiles = ['.gitignore', '.editorconfig'];
    for (const file of configFiles) {
      const srcPath = path.join(tplRoot, file);
      if (await fs.pathExists(srcPath)) {
        await fs.copy(srcPath, path.join(targetDir, file));
      }
    }

    // Determine which GraphQL server to use (default to Yoga)
    const useYoga = options.yoga || (!options.apollo && !options.yoga);
    const useSecure = options.secure || false;
    const serverType = useYoga ? 'GraphQL Yoga' : 'Apollo Server';
    const securityMode = useSecure ? ' (Secure)' : '';

    console.log(chalk.gray(`Using ${serverType}${securityMode}...`));
    if (useSecure) {
      console.log(chalk.green('✓ Authentication & Authorization enabled'));
      console.log(chalk.green('✓ Rate limiting enabled'));
      console.log(chalk.green('✓ Input sanitization enabled'));
      console.log(chalk.green('✓ Audit logging enabled'));
      console.log(chalk.green('✓ Security headers enabled'));
    }

    // Render EJS files
    const render = async (srcRel, destRel, locals = {}) => {
      const src = path.join(tplRoot, srcRel);
      const dest = path.join(targetDir, destRel);
      const content = await ejs.renderFile(src, { projectName, ...locals }, { async: true });
      await fs.ensureDir(path.dirname(dest));
      await fs.writeFile(dest, content, 'utf8');
    };

    // Choose package.json based on server type and security
    let packageTemplate;
    if (useSecure && useYoga) {
      packageTemplate = 'package-secure-yoga.json.ejs';
    } else if (useYoga) {
      packageTemplate = 'package-yoga.json.ejs';
    } else {
      packageTemplate = 'package.json.ejs';
    }
    await render(packageTemplate, 'package.json');
    await render('README.md.ejs', 'README.md');

    // Choose server template based on server type and security
    let serverTemplate;
    if (useSecure && useYoga) {
      serverTemplate = 'src/server-secure-yoga.js.ejs';
    } else if (useYoga) {
      serverTemplate = 'src/server-yoga.js.ejs';
    } else {
      serverTemplate = 'src/server.js.ejs';
    }
    await render(serverTemplate, path.join('src', 'server.js'));

    // Copy appropriate .env.example
    const envTemplate = useSecure ? '.env.secure.example.ejs' : '.env.example.ejs';
    await render(envTemplate, '.env.example');
    await render(
      path.join('src', 'db', 'connection.js.ejs'),
      path.join('src', 'db', 'connection.js')
    );
    await render(
      path.join('src', 'models', 'index.js.ejs'),
      path.join('src', 'models', 'index.js')
    );
    await render(
      path.join('src', 'graphql', 'typeDefs', 'index.js.ejs'),
      path.join('src', 'graphql', 'typeDefs', 'index.js')
    );
    await render(
      path.join('src', 'graphql', 'resolvers', 'index.js.ejs'),
      path.join('src', 'graphql', 'resolvers', 'index.js')
    );

    // Copy security files if --secure flag is enabled
    if (useSecure) {
      spinner.text = 'Adding security features...';

      // Create directories
      await fs.ensureDir(path.join(targetDir, 'src', 'utils'));
      await fs.ensureDir(path.join(targetDir, 'src', 'middleware'));

      // Copy security utilities
      await render(path.join('src', 'utils', 'auth.js.ejs'), path.join('src', 'utils', 'auth.js'));

      // Copy security middleware
      await render(
        path.join('src', 'middleware', 'auth.js.ejs'),
        path.join('src', 'middleware', 'auth.js')
      );
      await render(
        path.join('src', 'middleware', 'rateLimiter.js.ejs'),
        path.join('src', 'middleware', 'rateLimiter.js')
      );
      await render(
        path.join('src', 'middleware', 'sanitize.js.ejs'),
        path.join('src', 'middleware', 'sanitize.js')
      );
      await render(
        path.join('src', 'middleware', 'security.js.ejs'),
        path.join('src', 'middleware', 'security.js')
      );
      await render(
        path.join('src', 'middleware', 'auditLog.js.ejs'),
        path.join('src', 'middleware', 'auditLog.js')
      );

      // Copy User model
      await render(
        path.join('src', 'models', 'User.js.ejs'),
        path.join('src', 'models', 'User.js')
      );

      // Copy authentication resolvers and schema
      await render(
        path.join('src', 'graphql', 'resolvers', 'AuthResolver.js.ejs'),
        path.join('src', 'graphql', 'resolvers', 'AuthResolver.js')
      );

      const authSchemaPath = path.join(tplRoot, 'src', 'graphql', 'typeDefs', 'auth.graphql');
      if (await fs.pathExists(authSchemaPath)) {
        await fs.copy(
          authSchemaPath,
          path.join(targetDir, 'src', 'graphql', 'typeDefs', 'auth.graphql')
        );
      }
    }

    spinner.succeed(chalk.green(`Project ${projectName} created successfully!`));

    console.log(`\n👉 Next steps:`);
    console.log(chalk.cyan(`  cd ${projectName}`));

    if (options.skipInstall) {
      console.log(chalk.yellow('  (Skipped npm install - remember to run it later)'));
      console.log(chalk.cyan('  npm install'));
    } else {
      console.log(chalk.cyan('  npm install'));
    }

    console.log(chalk.cyan('  cp .env.example .env  # configure environment'));

    if (useSecure) {
      console.log(chalk.yellow('\n⚠️  IMPORTANT: Update JWT secrets in .env before deploying!'));
      console.log(chalk.gray('  Generate secure secrets with:'));
      console.log(chalk.gray('  npm run security:generate-secret'));
    }

    console.log(chalk.cyan('\n  npm run dev'));

    if (useSecure) {
      console.log(chalk.gray('\n📚 Security features documentation:'));
      console.log(chalk.gray('  Authentication: JWT with access & refresh tokens'));
      console.log(chalk.gray('  Authorization: Role-based access control (user/moderator/admin)'));
      console.log(chalk.gray('  Rate limiting: Protects against DDoS attacks'));
      console.log(chalk.gray('  Input sanitization: XSS and injection prevention'));
      console.log(chalk.gray('  Audit logging: Track all operations'));
      console.log(chalk.gray('  Security headers: OWASP recommended headers'));
      console.log(chalk.gray('\n  Visit http://localhost:4000/security for configuration info'));
    }
  } catch (err) {
    spinner.fail(chalk.red(`Project creation failed: ${err.message}`));
    console.error(chalk.gray('\nError details:'), err);
    process.exit(1);
  }
}
