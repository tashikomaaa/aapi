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
    await fs.copy(path.join(tplRoot, '.env.example'), path.join(targetDir, '.env.example'));
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
    const serverType = useYoga ? 'GraphQL Yoga' : 'Apollo Server';

    console.log(chalk.gray(`Using ${serverType}...`));

    // Render EJS files
    const render = async (srcRel, destRel, locals = {}) => {
      const src = path.join(tplRoot, srcRel);
      const dest = path.join(targetDir, destRel);
      const content = await ejs.renderFile(src, { projectName, ...locals }, { async: true });
      await fs.ensureDir(path.dirname(dest));
      await fs.writeFile(dest, content, 'utf8');
    };

    // Choose package.json based on server type
    const packageTemplate = useYoga ? 'package-yoga.json.ejs' : 'package.json.ejs';
    await render(packageTemplate, 'package.json');
    await render('README.md.ejs', 'README.md');

    // Choose server template based on server type
    const serverTemplate = useYoga ? 'src/server-yoga.js.ejs' : 'src/server.js.ejs';
    await render(serverTemplate, path.join('src', 'server.js'));
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

    spinner.succeed(chalk.green(`Project ${projectName} created successfully!`));

    console.log(`\n👉 Next steps:`);
    console.log(chalk.cyan(`  cd ${projectName}`));

    if (options.skipInstall) {
      console.log(chalk.yellow('  (Skipped npm install - remember to run it later)'));
      console.log(chalk.cyan('  npm install'));
    } else {
      console.log(chalk.cyan('  npm install'));
    }

    console.log(chalk.cyan('  cp .env.example .env  # configure MONGODB_URI'));
    console.log(chalk.cyan('  npm run dev'));

    if (options.skipInstall) {
      console.log(chalk.gray('\n💡 Tip: Use --skip-install to skip dependency installation'));
    }
  } catch (err) {
    spinner.fail(chalk.red(`Project creation failed: ${err.message}`));
    console.error(chalk.gray('\nError details:'), err);
    process.exit(1);
  }
}
