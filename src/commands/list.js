import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

/**
 * Lists all generated models in the current project
 * @returns {Promise<void>}
 */
export default async function list() {
  try {
    const cwd = process.cwd();
    const modelsDir = path.join(cwd, 'src', 'models');
    const typeDefsDir = path.join(cwd, 'src', 'graphql', 'typeDefs');
    const resolversDir = path.join(cwd, 'src', 'graphql', 'resolvers');

    // Check if we're in an AAPI project
    if (!(await fs.pathExists(modelsDir))) {
      console.error(
        chalk.red(
          '\n✗ Not in an AAPI project directory. Please run this command from a project created with "aapi create".'
        )
      );
      process.exit(1);
    }

    // Read model files
    const modelFiles = await fs.readdir(modelsDir);
    const models = modelFiles
      .filter((file) => file.endsWith('.js') && file !== 'index.js')
      .map((file) => path.basename(file, '.js'));

    if (models.length === 0) {
      console.log(chalk.yellow('\n📋 No models found in this project.'));
      console.log(chalk.cyan('\nCreate your first model with:'));
      console.log(chalk.cyan('  aapi generate model <Name>'));
      return;
    }

    console.log(chalk.green(`\n📋 Found ${models.length} model(s):\n`));

    for (const model of models) {
      const modelPath = path.join(modelsDir, `${model}.js`);
      const schemaPath = path.join(typeDefsDir, `${model}.graphql`);
      const resolverPath = path.join(resolversDir, `${model}Resolver.js`);

      const hasSchema = await fs.pathExists(schemaPath);
      const hasResolver = await fs.pathExists(resolverPath);

      console.log(chalk.bold(`  ${model}`));
      console.log(chalk.gray(`    Model:    ${hasSchema ? '✓' : '✗'} ${path.relative(cwd, modelPath)}`));
      console.log(chalk.gray(`    Schema:   ${hasSchema ? '✓' : '✗'} ${path.relative(cwd, schemaPath)}`));
      console.log(chalk.gray(`    Resolver: ${hasResolver ? '✓' : '✗'} ${path.relative(cwd, resolverPath)}`));

      if (!hasSchema || !hasResolver) {
        console.log(chalk.yellow(`    ⚠ Incomplete model (missing files)`));
      }
      console.log();
    }

    console.log(chalk.cyan('💡 Tip: Use "aapi generate model <Name>" to create a new model\n'));
  } catch (err) {
    console.error(chalk.red('Failed to list models: ' + err.message));
    process.exit(1);
  }
}
