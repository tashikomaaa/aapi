import path from 'path';
import fs from 'fs-extra';
import ejs from 'ejs';
import ora from 'ora';
import chalk from 'chalk';

function pascalCase(str) {
  return str
    .replace(/[-_]+/g, ' ')
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

export default async function generate(type, name) {
  const spinner = ora(`Génération ${type} ${name}...`).start();
  try {
    if (type !== 'model') {
      throw new Error(`Type non supporté: ${type}. Utilise: aapi generate model <Name>`);
    }

    const Name = pascalCase(name);
    const cwd = process.cwd();
    const tplRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'templates', 'model');

    const render = async (src, dest, locals = {}) => {
      const content = await ejs.renderFile(path.join(tplRoot, src), { Name, ...locals }, { async: true });
      await fs.ensureDir(path.dirname(dest));
      await fs.writeFile(dest, content, 'utf8');
    };

    // 1) Mongoose model
    await render('model.js.ejs', path.join(cwd, 'src', 'models', `${Name}.js`));

    // 2) GraphQL schema
    await render('schema.graphql.ejs', path.join(cwd, 'src', 'graphql', 'typeDefs', `${Name}.graphql`));

    // 3) Resolver
    await render('resolver.js.ejs', path.join(cwd, 'src', 'graphql', 'resolvers', `${Name}Resolver.js`));

    spinner.succeed(chalk.green(`${Name} généré.`));

    console.log('\n✅ Fichiers créés :');
    console.log(` - src/models/${Name}.js`);
    console.log(` - src/graphql/typeDefs/${Name}.graphql`);
    console.log(` - src/graphql/resolvers/${Name}Resolver.js`);

    console.log('\nℹ️ Pense à (re)lancer ton serveur si nécessaire.');
  } catch (err) {
    spinner.fail('Échec de génération : ' + err.message);
    process.exit(1);
  }
}
