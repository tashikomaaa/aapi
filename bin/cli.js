#!/usr/bin/env node
/**
 * AAPI CLI - Automatic API builder for Node.js
 * Generates complete Apollo GraphQL + Express + MongoDB APIs from templates
 * @module bin/cli
 */

import { Command } from 'commander';
import create from '../src/commands/create.js';
import generate from '../src/commands/generate.js';
import list from '../src/commands/list.js';
import init from '../src/commands/init.js';
import importSchema from '../src/commands/import.js';
import { validateNodeVersion } from '../src/utils/version.js';

// Validate Node.js version before running any commands
validateNodeVersion('18.0.0');

const program = new Command();

program
  .name('aapi')
  .description('Automatic API builder for Node.js (Apollo + Mongoose)')
  .version('0.1.0');

program
  .command('create <projectName>')
  .description('Create a new API project (GraphQL + Mongoose)')
  .option('-f, --force', 'Overwrite existing directory if it exists')
  .option('--skip-install', 'Skip npm install after project creation')
  .option('--yoga', 'Use GraphQL Yoga instead of Apollo Server (recommended)')
  .option('--apollo', 'Use Apollo Server + Express (legacy)')
  .action((projectName, options) => create(projectName, options));

program
  .command('init')
  .description('Initialize AAPI in an existing Node.js project')
  .option('-f, --force', 'Overwrite existing AAPI files if they exist')
  .option('--yoga', 'Use GraphQL Yoga instead of Apollo Server (recommended)')
  .option('--apollo', 'Use Apollo Server + Express (legacy)')
  .action((options) => init(options));

program
  .command('generate <type> <name>')
  .description('Generate code (e.g., model <Name>)')
  .option('-f, --force', 'Overwrite existing files if they exist')
  .action((type, name, options) => generate(type, name, options));

program.command('list').description('List all models in the current project').action(list);

program
  .command('import <file>')
  .description('Import models from JSON schema file')
  .option('-n, --name <name>', 'Custom model name (defaults to filename)')
  .option('-f, --force', 'Overwrite existing files if they exist')
  .option('-p, --preview', 'Preview generated code without creating files')
  .action((file, options) => importSchema(file, options));

program.parse();
