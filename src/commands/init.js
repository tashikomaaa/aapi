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
 * @returns {Promise<void>}
 */
export default async function init(options = {}) {
  const spinner = ora('Initializing AAPI in current project...').start();

  // Determine which GraphQL server to use (default to Yoga)
  const useYoga = options.yoga || (!options.apollo && !options.yoga);
  const serverType = useYoga ? 'GraphQL Yoga' : 'Apollo Server';

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
    console.log(chalk.gray(`GraphQL Server: ${serverType}`));

    const filesToCreate = [];
    const filesToSkip = [];

    // Check which files need to be created
    const serverTemplate = useYoga ? 'src/server-yoga.js.ejs' : 'src/server.js.ejs';
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
      { src: '.env.example', dest: '.env.example', render: false },
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

    // Update package.json with AAPI dependencies
    const aapiDependencies = useYoga
      ? {
          '@graphql-tools/merge': '^9.0.8',
          '@graphql-tools/schema': '^10.0.7',
          dotenv: '^16.4.7',
          graphql: '^16.9.0',
          'graphql-yoga': '^5.10.4',
          'lodash.merge': '^4.6.2',
          mongoose: '^8.9.4',
        }
      : {
          '@apollo/server': '^4.11.0',
          'apollo-server-express': '^3.13.0',
          express: '^4.21.2',
          mongoose: '^8.9.4',
          dotenv: '^16.4.7',
        };

    const aapiScripts = {
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
    console.log(chalk.cyan('  cp .env.example .env  # configure MONGODB_URI'));
    console.log(chalk.cyan('  npm run dev'));
    console.log(chalk.gray('\n💡 Generate your first model with:'));
    console.log(chalk.gray('  aapi generate model User'));
  } catch (err) {
    spinner.fail(chalk.red(`Initialization failed: ${err.message}`));
    console.error(chalk.gray('\nError details:'), err);
    process.exit(1);
  }
}
