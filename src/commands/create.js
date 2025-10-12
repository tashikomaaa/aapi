import path from 'path';
import fs from 'fs-extra';
import ejs from 'ejs';
import ora from 'ora';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function create(projectName) {
  const spinner = ora(`Création du projet ${projectName}...`).start();

  try {
    const targetDir = path.resolve(process.cwd(), projectName);
    const tplRoot = path.resolve(__dirname, '..', 'templates', 'base-project');

    await fs.ensureDir(targetDir);

    // Copie fichiers statiques
    await fs.copy(path.join(tplRoot, '.env.example'), path.join(targetDir, '.env.example'));
    await fs.copy(path.join(tplRoot, 'src', 'graphql', 'typeDefs', 'base.graphql'), path.join(targetDir, 'src', 'graphql', 'typeDefs', 'base.graphql'));

    // Render EJS fichiers
    const render = async (srcRel, destRel, locals = {}) => {
      const src = path.join(tplRoot, srcRel);
      const dest = path.join(targetDir, destRel);
      const content = await ejs.renderFile(src, { projectName, ...locals }, { async: true });
      await fs.ensureDir(path.dirname(dest));
      await fs.writeFile(dest, content, 'utf8');
    };

    await render('package.json.ejs', 'package.json');
    await render(path.join('src', 'server.js.ejs'), path.join('src', 'server.js'));
    await render(path.join('src', 'db', 'connection.js.ejs'), path.join('src', 'db', 'connection.js'));
    await render(path.join('src', 'models', 'index.js.ejs'), path.join('src', 'models', 'index.js'));
    await render(path.join('src', 'graphql', 'typeDefs', 'index.js.ejs'), path.join('src', 'graphql', 'typeDefs', 'index.js'));
    await render(path.join('src', 'graphql', 'resolvers', 'index.js.ejs'), path.join('src', 'graphql', 'resolvers', 'index.js'));

    spinner.succeed(chalk.green(`Projet ${projectName} créé.`));

    console.log(`\n👉 Étapes suivantes :`);
    console.log(chalk.cyan(`cd ${projectName}`));
    console.log(chalk.cyan('npm i'));
    console.log(chalk.cyan('cp .env.example .env  # configure MONGODB_URI'));
    console.log(chalk.cyan('npm run dev'));
  } catch (err) {
    spinner.fail('Échec de création : ' + err.message);
    process.exit(1);
  }
}
