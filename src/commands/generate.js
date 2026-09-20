import path from 'path';
import fs from 'fs-extra';
import ejs from 'ejs';
import ora from 'ora';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { validateModelName, sanitizePath } from '../utils/validate.js';
import {
  parseRelations,
  generateMongooseRelationField,
  generateGraphQLRelationField,
  generateGraphQLInputField,
  generatePopulateChain,
  generateReverseRelationSuggestion,
} from '../utils/relations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * @param {Object} options - Command options
 * @param {boolean} options.force - Overwrite existing files if they exist
 * @param {string} options.relations - Relations definition (e.g., "author:User,comments:[Comment]")
 * @param {boolean} options.withPagination - Enable pagination, filtering, and sorting
 * @param {boolean} options.cascadeDelete - Enable cascade delete for one-to-many relations
 * @returns {Promise<void>}
 * @throws {Error} If type is not supported or name is invalid
 */
export default async function generate(type, name, options = {}) {
  if (type !== 'model') {
    console.error(chalk.red(`\n✗ Unsupported type: ${type}. Use: aapi generate model <Name>`));
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

  // Parse relations if provided
  const relations = options.relations ? parseRelations(options.relations) : [];
  const withPagination = options.withPagination || false;
  const enableCascadeDelete = options.cascadeDelete || false;
  const withSubscriptions = options.withSubscriptions || false;
  const withCache = options.withCache || false;
  // `--no-tests` is mapped by commander to `options.tests === false`.
  // `options.withTests` is kept for programmatic callers.
  const withTests = options.tests !== false && options.withTests !== false;
  const cacheTTL = options.cacheTtl || 300;

  const spinner = ora(`Generating ${type} ${Name}...`).start();

  try {
    const cwd = process.cwd();

    // Subscriptions rely on the GraphQL Yoga PubSub. Apollo Server needs extra
    // transport wiring (graphql-ws) that AAPI does not scaffold, so emitting a
    // Subscription resolver there would produce code that cannot run.
    if (withSubscriptions) {
      const projectPkgPath = path.join(cwd, 'package.json');
      if (await fs.pathExists(projectPkgPath)) {
        const projectPkg = await fs.readJson(projectPkgPath);
        const deps = { ...projectPkg.dependencies, ...projectPkg.devDependencies };
        if (!deps['graphql-yoga']) {
          spinner.fail(chalk.red('--with-subscriptions requires GraphQL Yoga'));
          console.log(
            chalk.yellow('\nThis project does not depend on graphql-yoga (Apollo Server project?).')
          );
          console.log(
            chalk.gray(
              '  Create a Yoga project with "aapi create <name>" (the default), or drop --with-subscriptions.'
            )
          );
          process.exit(1);
        }
      }
    }
    const tplRoot = path.resolve(__dirname, '..', 'templates', 'model');
    const baseTplRoot = path.resolve(__dirname, '..', 'templates', 'base-project');

    // Prepare relation data for templates
    const relationData = relations.map((rel) => ({
      ...rel,
      mongooseField: generateMongooseRelationField(rel),
      graphqlField: generateGraphQLRelationField(rel),
      inputField: generateGraphQLInputField(rel),
    }));

    // Generate populate chain for resolvers
    const populateChain = generatePopulateChain(relations);

    const render = async (src, dest, locals = {}) => {
      const content = await ejs.renderFile(
        path.join(tplRoot, src),
        {
          Name,
          name: Name.charAt(0).toLowerCase() + Name.slice(1),
          relations: relationData,
          populateChain,
          withPagination,
          enableCascadeDelete,
          withSubscriptions,
          withCache,
          cacheTTL,
          ...locals,
        },
        { async: true }
      );
      await fs.ensureDir(path.dirname(dest));
      await fs.writeFile(dest, content, 'utf8');
    };

    /**
     * Renders a base-project template into the current project, but only when the
     * destination is missing, so user edits are never clobbered.
     * @returns {Promise<boolean>} true if the file was created
     */
    const ensureRuntimeDependency = async (srcRel, destRel) => {
      const dest = path.join(cwd, destRel);
      if (await fs.pathExists(dest)) return false;

      const content = await ejs.renderFile(
        path.join(baseTplRoot, srcRel),
        { projectName: path.basename(cwd) },
        { async: true }
      );
      await fs.ensureDir(path.dirname(dest));
      await fs.writeFile(dest, content, 'utf8');
      return true;
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
      if (!options.force) {
        spinner.fail(chalk.red(`Model ${Name} already exists`));
        console.log(chalk.yellow('\nExisting files:'));
        existingFiles.forEach((file) =>
          console.log(chalk.yellow(`  - ${path.relative(cwd, file)}`))
        );
        console.log(
          chalk.yellow(
            '\nPlease choose a different name, remove the existing files, or use --force to overwrite.'
          )
        );
        process.exit(1);
      } else {
        spinner.info(chalk.yellow(`Overwriting existing model ${Name}...`));
      }
    }

    // 1) Mongoose model
    await render('model.js.ejs', modelPath);

    // 2) GraphQL schema
    const schemaTemplate = withSubscriptions
      ? 'schema-with-subscriptions.graphql.ejs'
      : 'schema.graphql.ejs';
    await render(schemaTemplate, schemaPath);

    // 3) Resolver
    const resolverTemplate =
      withSubscriptions || withCache ? 'resolver-with-subscriptions.js.ejs' : 'resolver.js.ejs';
    await render(resolverTemplate, resolverPath);

    // 4) Runtime modules the generated resolver imports
    const runtimeFiles = [];
    if (withSubscriptions) {
      const created = await ensureRuntimeDependency(
        path.join('src', 'utils', 'pubsub.js.ejs'),
        path.join('src', 'utils', 'pubsub.js')
      );
      if (created) runtimeFiles.push('src/utils/pubsub.js');
    }
    if (withCache) {
      const created = await ensureRuntimeDependency(
        path.join('src', 'utils', 'cache.js.ejs'),
        path.join('src', 'utils', 'cache.js')
      );
      if (created) runtimeFiles.push('src/utils/cache.js');
    }

    // 5) Tests (optional)
    if (withTests) {
      const testPath = path.join(cwd, 'src', '__tests__', `${Name}.test.js`);
      await render('model.test.js.ejs', testPath);
    }

    spinner.succeed(chalk.green(`${Name} generated successfully!`));

    console.log('\n✅ Files created:');
    console.log(chalk.cyan(`  - src/models/${Name}.js`));
    console.log(chalk.cyan(`  - src/graphql/typeDefs/${Name}.graphql`));
    console.log(chalk.cyan(`  - src/graphql/resolvers/${Name}Resolver.js`));
    if (withTests) {
      console.log(chalk.cyan(`  - src/__tests__/${Name}.test.js`));
    }
    runtimeFiles.forEach((file) => console.log(chalk.cyan(`  - ${file}`)));

    if (relations.length > 0) {
      console.log(chalk.green('\n✓ Relations configured:'));
      relations.forEach((rel) => {
        console.log(chalk.cyan(`  - ${rel.fieldName} → ${rel.modelName} (${rel.relationType})`));
        const suggestion = generateReverseRelationSuggestion(Name, rel);
        if (suggestion) {
          console.log(chalk.gray(`    ${suggestion}`));
        }
      });
    }

    if (withPagination) {
      console.log(chalk.green('\n✓ Pagination, filtering & sorting enabled'));
      console.log(chalk.gray('  - Supports page, limit, sort, and filter parameters'));
    }

    if (enableCascadeDelete) {
      console.log(chalk.green('\n✓ Cascade delete enabled'));
      console.log(chalk.gray('  - Related documents will be deleted automatically'));
    }

    if (withSubscriptions) {
      console.log(chalk.green('\n✓ GraphQL subscriptions enabled'));
      console.log(
        chalk.gray(
          `  - ${Name.toLowerCase()}Created, ${Name.toLowerCase()}Updated, ${Name.toLowerCase()}Deleted`
        )
      );
    }

    if (withCache) {
      console.log(chalk.green('\n✓ Caching enabled'));
      console.log(chalk.gray(`  - TTL: ${cacheTTL} seconds (configure via --cache-ttl)`));
    }

    if (withTests) {
      console.log(chalk.green('\n✓ Tests generated'));
      console.log(chalk.gray('  - Run tests with: npm test'));
    }

    console.log(chalk.yellow("\n💡 Remember to restart your server if it's currently running."));
  } catch (err) {
    spinner.fail(chalk.red(`Generation failed: ${err.message}`));
    console.error(chalk.gray('\nError details:'), err);
    process.exit(1);
  }
}
