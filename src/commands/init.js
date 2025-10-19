import path from 'path';
import fs from 'fs-extra';
import ejs from 'ejs';
import ora from 'ora';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initializes AAPI in an existing project
 * Adds AAPI configuration files without overwriting existing code
 * @param {Object} options - Command options
 * @param {boolean} options.force - Overwrite existing AAPI files if they exist
 * @param {boolean} options.yoga - Use GraphQL Yoga instead of Apollo Server
 * @param {boolean} options.apollo - Use Apollo Server + Express
 * @param {boolean} options.secure - Add authentication, authorization, and security features
 * @returns {Promise<void>}
 */
export default async function init(options = {}) {
  const spinner = ora('Initializing AAPI in current project...').start();

  // Determine which GraphQL server to use (default to Yoga)
  const useYoga = options.yoga || (!options.apollo && !options.yoga);
  const useSecure = options.secure || false;
  const serverType = useYoga ? 'GraphQL Yoga' : 'Apollo Server';
  const securityMode = useSecure ? ' (Secure)' : '';

  try {
    const cwd = process.cwd();
    const tplRoot = path.resolve(__dirname, '..', 'templates', 'base-project');

    // Check if package.json exists
    const packageJsonPath = path.join(cwd, 'package.json');
    if (!(await fs.pathExists(packageJsonPath))) {
      spinner.fail(
        chalk.red('No package.json found. Please run this command in a Node.js project directory.')
      );
      console.log(chalk.yellow('\n💡 Tip: Run "npm init" first to create a new project.'));
      process.exit(1);
    }

    // Read existing package.json
    const packageJson = await fs.readJson(packageJsonPath);
    const projectName = packageJson.name || path.basename(cwd);

    console.log(chalk.gray(`\nProject name: ${projectName}`));
    console.log(chalk.gray(`GraphQL Server: ${serverType}${securityMode}`));

    if (useSecure) {
      console.log(chalk.green('✓ Authentication & Authorization enabled'));
      console.log(chalk.green('✓ Rate limiting enabled'));
      console.log(chalk.green('✓ Input sanitization enabled'));
      console.log(chalk.green('✓ Audit logging enabled'));
      console.log(chalk.green('✓ Security headers enabled'));
    }

    const filesToCreate = [];
    const filesToSkip = [];

    // Check which files need to be created
    let serverTemplate;
    if (useSecure && useYoga) {
      serverTemplate = 'src/server-secure-yoga.js.ejs';
    } else if (useYoga) {
      serverTemplate = 'src/server-yoga.js.ejs';
    } else {
      serverTemplate = 'src/server.js.ejs';
    }

    const envTemplate = useSecure ? '.env.secure.example.ejs' : '.env.example.ejs';

    const aapiFiles = [
      { src: serverTemplate, dest: 'src/server.js', render: true },
      { src: 'src/db/connection.js.ejs', dest: 'src/db/connection.js', render: true },
      { src: 'src/models/index.js.ejs', dest: 'src/models/index.js', render: true },
      {
        src: 'src/graphql/typeDefs/base.graphql',
        dest: 'src/graphql/typeDefs/base.graphql',
        render: false,
      },
      {
        src: 'src/graphql/typeDefs/index.js.ejs',
        dest: 'src/graphql/typeDefs/index.js',
        render: true,
      },
      {
        src: 'src/graphql/resolvers/index.js.ejs',
        dest: 'src/graphql/resolvers/index.js',
        render: true,
      },
      { src: envTemplate, dest: '.env.example', render: true },
      { src: '.gitignore', dest: '.gitignore', render: false },
      { src: '.editorconfig', dest: '.editorconfig', render: false },
      { src: 'README.md.ejs', dest: 'README.aapi.md', render: true }, // Don't overwrite README.md
    ];

    for (const file of aapiFiles) {
      const destPath = path.join(cwd, file.dest);
      if (await fs.pathExists(destPath)) {
        if (!options.force) {
          filesToSkip.push(file.dest);
        } else {
          filesToCreate.push(file);
        }
      } else {
        filesToCreate.push(file);
      }
    }

    if (filesToSkip.length > 0 && !options.force) {
      spinner.warn(chalk.yellow('Some files already exist and will be skipped:'));
      filesToSkip.forEach((file) => console.log(chalk.yellow(`  - ${file}`)));
      console.log(chalk.gray('\n💡 Use --force to overwrite existing files'));
    }

    if (filesToCreate.length === 0) {
      spinner.succeed(chalk.green('AAPI is already initialized in this project!'));
      return;
    }

    // Create directories
    const dirs = ['src/db', 'src/models', 'src/graphql/typeDefs', 'src/graphql/resolvers'];

    if (useSecure) {
      dirs.push('src/utils', 'src/middleware');
    }

    for (const dir of dirs) {
      await fs.ensureDir(path.join(cwd, dir));
    }

    // Create files
    const render = async (srcRel, destRel, locals = {}) => {
      const src = path.join(tplRoot, srcRel);
      const dest = path.join(cwd, destRel);
      const content = await ejs.renderFile(src, { projectName, ...locals }, { async: true });
      await fs.ensureDir(path.dirname(dest));
      await fs.writeFile(dest, content, 'utf8');
    };

    for (const file of filesToCreate) {
      if (file.render) {
        await render(file.src, file.dest);
      } else {
        const srcPath = path.join(tplRoot, file.src);
        if (await fs.pathExists(srcPath)) {
          await fs.copy(srcPath, path.join(cwd, file.dest));
        }
      }
    }

    // Copy security files if --secure flag is enabled
    if (useSecure) {
      spinner.text = 'Adding security features...';

      // Copy security utilities
      await render('src/utils/auth.js.ejs', 'src/utils/auth.js');

      // Copy security middleware
      await render('src/middleware/auth.js.ejs', 'src/middleware/auth.js');
      await render('src/middleware/rateLimiter.js.ejs', 'src/middleware/rateLimiter.js');
      await render('src/middleware/sanitize.js.ejs', 'src/middleware/sanitize.js');
      await render('src/middleware/security.js.ejs', 'src/middleware/security.js');
      await render('src/middleware/auditLog.js.ejs', 'src/middleware/auditLog.js');

      // Copy User model
      await render('src/models/User.js.ejs', 'src/models/User.js');

      // Copy authentication resolvers and schema
      await render(
        'src/graphql/resolvers/AuthResolver.js.ejs',
        'src/graphql/resolvers/AuthResolver.js'
      );

      const authSchemaPath = path.join(tplRoot, 'src', 'graphql', 'typeDefs', 'auth.graphql');
      if (await fs.pathExists(authSchemaPath)) {
        await fs.copy(authSchemaPath, path.join(cwd, 'src', 'graphql', 'typeDefs', 'auth.graphql'));
      }
    }

    // Update package.json with AAPI dependencies
    let aapiDependencies;
    if (useSecure && useYoga) {
      aapiDependencies = {
        '@graphql-tools/merge': '^9.0.8',
        '@graphql-tools/schema': '^10.0.7',
        bcryptjs: '^2.4.3',
        dotenv: '^16.4.7',
        graphql: '^16.9.0',
        'graphql-yoga': '^5.10.4',
        jsonwebtoken: '^9.0.2',
        'lodash.merge': '^4.6.2',
        mongoose: '^8.9.4',
        validator: '^13.12.0',
      };
    } else if (useYoga) {
      aapiDependencies = {
        '@graphql-tools/merge': '^9.0.8',
        '@graphql-tools/schema': '^10.0.7',
        dotenv: '^16.4.7',
        graphql: '^16.9.0',
        'graphql-yoga': '^5.10.4',
        'lodash.merge': '^4.6.2',
        mongoose: '^8.9.4',
      };
    } else {
      aapiDependencies = {
        '@apollo/server': '^4.11.0',
        'apollo-server-express': '^3.13.0',
        express: '^4.21.2',
        mongoose: '^8.9.4',
        dotenv: '^16.4.7',
      };
    }

    const aapiScripts = useSecure
      ? {
          dev: 'node --watch src/server.js',
          start: 'node src/server.js',
          'security:check': 'npm audit && npm outdated',
          'security:generate-secret':
            "node -e \"console.log('New secret:', require('crypto').randomBytes(64).toString('hex'))\"",
        }
      : {
          dev: 'node --watch src/server.js',
          start: 'node src/server.js',
        };

    let packageUpdated = false;

    // Merge dependencies
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }

    for (const [dep, version] of Object.entries(aapiDependencies)) {
      if (!packageJson.dependencies[dep]) {
        packageJson.dependencies[dep] = version;
        packageUpdated = true;
      }
    }

    // Merge scripts
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    for (const [script, command] of Object.entries(aapiScripts)) {
      if (!packageJson.scripts[script]) {
        packageJson.scripts[script] = command;
        packageUpdated = true;
      }
    }

    // Set type to module if not already set
    if (packageJson.type !== 'module') {
      packageJson.type = 'module';
      packageUpdated = true;
    }

    if (packageUpdated) {
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
    }

    spinner.succeed(chalk.green('AAPI initialized successfully!'));

    console.log('\n✅ Files created:');
    filesToCreate.forEach((file) => console.log(chalk.cyan(`  - ${file.dest}`)));

    if (packageUpdated) {
      console.log(chalk.green('\n✅ package.json updated with AAPI dependencies and scripts'));
    }

    console.log(`\n👉 Next steps:`);
    console.log(chalk.cyan('  npm install'));

    if (useSecure) {
      console.log(chalk.cyan('  cp .env.example .env  # configure environment'));
      console.log(chalk.yellow('\n⚠️  IMPORTANT: Update JWT secrets in .env before deploying!'));
      console.log(chalk.gray('  Generate secure secrets with:'));
      console.log(chalk.gray('  npm run security:generate-secret'));
    } else {
      console.log(chalk.cyan('  cp .env.example .env  # configure MONGODB_URI'));
    }

    console.log(chalk.cyan('  npm run dev'));

    if (useSecure) {
      console.log(chalk.gray('\n📚 Security features documentation:'));
      console.log(chalk.gray('  Authentication: JWT with access & refresh tokens'));
      console.log(chalk.gray('  Authorization: Role-based access control (user/moderator/admin)'));
      console.log(chalk.gray('  Rate limiting: Protects against DDoS attacks'));
      console.log(chalk.gray('  Input sanitization: XSS and injection prevention'));
      console.log(chalk.gray('  Audit logging: Track all operations'));
      console.log(chalk.gray('  Security headers: OWASP recommended headers'));
      console.log(
        chalk.gray('\n  Visit https://github.com/yourusername/aapi/blob/main/SECURITY.md')
      );
    } else {
      console.log(chalk.gray('\n💡 Generate your first model with:'));
      console.log(chalk.gray('  aapi generate model User'));
    }
  } catch (err) {
    spinner.fail(chalk.red(`Initialization failed: ${err.message}`));
    console.error(chalk.gray('\nError details:'), err);
    process.exit(1);
  }
}
