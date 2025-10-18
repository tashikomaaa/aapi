import path from 'path';
import fs from 'fs-extra';
import ejs from 'ejs';
import ora from 'ora';
import chalk from 'chalk';
import { validateModelName, sanitizePath } from '../utils/validate.js';

/**
 * Converts a string to PascalCase (e.g., "my-model" => "MyModel")
 * @param {string} str - The string to convert
 * @returns {string} PascalCase string
 */
function pascalCase(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[-_]+/g, ' ')
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase())
    .replace(/\s+/g, ''); // Remove remaining spaces
}

/**
 * Generates code files for a model, resolver, and GraphQL schema
 * @param {string} type - The type of code to generate (currently only "model" is supported)
 * @param {string} name - The name of the model to generate
 * @returns {Promise<void>}
 * @throws {Error} If type is not supported or name is invalid
 */
export default async function generate(type, name) {
  if (type !== 'model') {
    console.error(
      chalk.red(`\n✗ Unsupported type: ${type}. Use: aapi generate model <Name>`)
    );
    process.exit(1);
  }

  // Sanitize input to prevent path traversal
  const safeName = sanitizePath(name);
  if (safeName !== name) {
    console.error(chalk.red(`\n✗ Invalid model name: path traversal detected`));
    process.exit(1);
  }

  const Name = pascalCase(name);

  // Validate the generated PascalCase name
  const validation = validateModelName(Name);
  if (!validation.valid) {
    console.error(chalk.red(`\n✗ Invalid model name: ${validation.error}`));
    console.log(chalk.yellow(`\nOriginal input: "${name}"`));
    console.log(chalk.yellow(`Converted to: "${Name}"`));
    process.exit(1);
  }

  const spinner = ora(`Generating ${type} ${Name}...`).start();

  try {
    const cwd = process.cwd();
    const tplRoot = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '..',
      'templates',
      'model'
    );

    const render = async (src, dest, locals = {}) => {
      const content = await ejs.renderFile(
        path.join(tplRoot, src),
        { Name, ...locals },
        { async: true }
      );
      await fs.ensureDir(path.dirname(dest));
      await fs.writeFile(dest, content, 'utf8');
    };

    // Check if files already exist
    const modelPath = path.join(cwd, 'src', 'models', `${Name}.js`);
    const schemaPath = path.join(cwd, 'src', 'graphql', 'typeDefs', `${Name}.graphql`);
    const resolverPath = path.join(cwd, 'src', 'graphql', 'resolvers', `${Name}Resolver.js`);

    const existingFiles = [];
    if (await fs.pathExists(modelPath)) existingFiles.push(modelPath);
    if (await fs.pathExists(schemaPath)) existingFiles.push(schemaPath);
    if (await fs.pathExists(resolverPath)) existingFiles.push(resolverPath);

    if (existingFiles.length > 0) {
      spinner.fail(chalk.red(`Model ${Name} already exists`));
      console.log(chalk.yellow('\nExisting files:'));
      existingFiles.forEach((file) => console.log(chalk.yellow(`  - ${path.relative(cwd, file)}`)));
      console.log(
        chalk.yellow('\nPlease choose a different name or remove the existing files first.')
      );
      process.exit(1);
    }

    // 1) Mongoose model
    await render('model.js.ejs', modelPath);

    // 2) GraphQL schema
    await render('schema.graphql.ejs', schemaPath);

    // 3) Resolver
    await render('resolver.js.ejs', resolverPath);

    spinner.succeed(chalk.green(`${Name} generated successfully!`));

    console.log('\n✅ Files created:');
    console.log(chalk.cyan(`  - src/models/${Name}.js`));
    console.log(chalk.cyan(`  - src/graphql/typeDefs/${Name}.graphql`));
    console.log(chalk.cyan(`  - src/graphql/resolvers/${Name}Resolver.js`));

    console.log(
      chalk.yellow('\n💡 Remember to restart your server if it\'s currently running.')
    );
  } catch (err) {
    spinner.fail(chalk.red('Generation failed: ' + err.message));
    console.error(chalk.gray('\nError details:'), err);
    process.exit(1);
  }
}
