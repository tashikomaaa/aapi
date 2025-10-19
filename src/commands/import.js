import path from 'path';
import fs from 'fs-extra';
import ora from 'ora';
import chalk from 'chalk';
import { parseAndGenerate } from '../utils/schema-parser.js';
import { validateModelName } from '../utils/validate.js';

/**
 * Imports a JSON schema and generates model, resolver, and GraphQL schema
 * @param {string} filePath - Path to JSON file
 * @param {Object} options - Command options
 * @param {string} options.name - Custom model name (optional, defaults to filename)
 * @param {boolean} options.force - Overwrite existing files
 * @param {boolean} options.preview - Preview generated code without creating files
 * @returns {Promise<void>}
 */
export default async function importSchema(filePath, options = {}) {
  const spinner = ora('Analyzing JSON schema...').start();

  try {
    // Resolve file path
    const absolutePath = path.resolve(process.cwd(), filePath);

    // Check if file exists
    if (!(await fs.pathExists(absolutePath))) {
      spinner.fail(chalk.red(`File not found: ${filePath}`));
      process.exit(1);
    }

    // Read JSON file
    let jsonData;
    try {
      const fileContent = await fs.readFile(absolutePath, 'utf8');
      jsonData = JSON.parse(fileContent);
    } catch (err) {
      spinner.fail(chalk.red('Failed to parse JSON file'));
      console.error(chalk.gray('\nError:'), err.message);
      console.log(chalk.yellow('\n💡 Make sure the file contains valid JSON'));
      process.exit(1);
    }

    // Determine model name
    let modelName = options.name;
    if (!modelName) {
      // Use filename as model name
      const basename = path.basename(absolutePath, path.extname(absolutePath));
      // Convert to PascalCase
      modelName = basename
        .replace(/[-_]+/g, ' ')
        .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
        .replace(/^(.)/, (_, c) => c.toUpperCase())
        .replace(/\s+/g, '');
    }

    // Validate model name
    const validation = validateModelName(modelName);
    if (!validation.valid) {
      spinner.fail(chalk.red(`Invalid model name: ${validation.error}`));
      console.log(chalk.yellow(`\nDerived name: "${modelName}"`));
      console.log(chalk.gray('Use --name option to specify a custom name'));
      process.exit(1);
    }

    spinner.text = `Generating ${modelName} from schema...`;

    // Parse and generate code
    const generated = parseAndGenerate(jsonData, modelName);

    if (options.preview) {
      // Preview mode - just show generated code
      spinner.succeed(chalk.green('Schema analyzed successfully!'));

      console.log(chalk.bold('\n📊 Schema Summary:'));
      console.log(chalk.cyan(`  Model name: ${modelName}`));
      console.log(chalk.cyan(`  Total fields: ${generated.summary.totalFields}`));
      console.log(chalk.cyan(`  Required fields: ${generated.summary.requiredFields}`));
      console.log(chalk.cyan(`  Optional fields: ${generated.summary.optionalFields}`));

      console.log(chalk.bold('\n📋 Detected Fields:'));
      for (const [name, field] of Object.entries(generated.fields)) {
        const requiredBadge = field.required ? chalk.red('[required]') : chalk.gray('[optional]');
        console.log(`  ${name}: ${chalk.yellow(field.graphqlType)} ${requiredBadge}`);
        if (field.samples.length > 0) {
          console.log(chalk.gray(`    Sample: ${JSON.stringify(field.samples[0])}`));
        }
      }

      console.log(chalk.bold('\n📦 Generated Mongoose Schema:'));
      console.log(chalk.gray(generated.mongooseSchema));

      console.log(chalk.bold('\n🔷 Generated GraphQL Schema:'));
      console.log(chalk.gray(generated.graphqlSchema));

      console.log(chalk.green('\n✅ Preview complete!'));
      console.log(chalk.yellow('\nTo create files, run without --preview flag'));
      return;
    }

    // Create files
    const cwd = process.cwd();

    // Check if files already exist
    const modelPath = path.join(cwd, 'src', 'models', `${modelName}.js`);
    const schemaPath = path.join(cwd, 'src', 'graphql', 'typeDefs', `${modelName}.graphql`);
    const resolverPath = path.join(cwd, 'src', 'graphql', 'resolvers', `${modelName}Resolver.js`);

    const existingFiles = [];
    if (await fs.pathExists(modelPath)) existingFiles.push(modelPath);
    if (await fs.pathExists(schemaPath)) existingFiles.push(schemaPath);
    if (await fs.pathExists(resolverPath)) existingFiles.push(resolverPath);

    if (existingFiles.length > 0 && !options.force) {
      spinner.fail(chalk.red(`Model ${modelName} already exists`));
      console.log(chalk.yellow('\nExisting files:'));
      existingFiles.forEach((file) => console.log(chalk.yellow(`  - ${path.relative(cwd, file)}`)));
      console.log(
        chalk.yellow('\nUse --force to overwrite, or --preview to see what would be generated')
      );
      process.exit(1);
    }

    // Create Mongoose model file
    const modelCode = `import mongoose from 'mongoose';

const ${modelName}Schema = new mongoose.Schema(
  ${generated.mongooseSchema},
  {
    timestamps: true,
  }
);

export default mongoose.model('${modelName}', ${modelName}Schema);
`;

    await fs.ensureDir(path.dirname(modelPath));
    await fs.writeFile(modelPath, modelCode, 'utf8');

    // Create GraphQL schema file
    await fs.ensureDir(path.dirname(schemaPath));
    await fs.writeFile(schemaPath, generated.graphqlSchema, 'utf8');

    // Create resolver file
    await fs.ensureDir(path.dirname(resolverPath));
    await fs.writeFile(resolverPath, generated.resolvers, 'utf8');

    spinner.succeed(chalk.green(`${modelName} imported successfully!`));

    console.log(chalk.bold('\n📊 Schema Summary:'));
    console.log(chalk.cyan(`  Total fields: ${generated.summary.totalFields}`));
    console.log(chalk.cyan(`  Required: ${generated.summary.requiredFields}`));
    console.log(chalk.cyan(`  Optional: ${generated.summary.optionalFields}`));

    console.log('\n✅ Files created:');
    console.log(chalk.cyan(`  - src/models/${modelName}.js`));
    console.log(chalk.cyan(`  - src/graphql/typeDefs/${modelName}.graphql`));
    console.log(chalk.cyan(`  - src/graphql/resolvers/${modelName}Resolver.js`));

    console.log(chalk.bold('\n📋 Detected Fields:'));
    for (const [name, field] of Object.entries(generated.fields)) {
      const requiredBadge = field.required ? chalk.green('✓') : chalk.gray('○');
      console.log(`  ${requiredBadge} ${name}: ${chalk.yellow(field.graphqlType)}`);
    }

    console.log(chalk.yellow("\n💡 Remember to restart your server if it's currently running."));
  } catch (err) {
    spinner.fail(chalk.red(`Import failed: ${err.message}`));
    console.error(chalk.gray('\nError details:'), err);
    process.exit(1);
  }
}
