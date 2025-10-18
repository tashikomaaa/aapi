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

const program = new Command();

program
  .name('aapi')
  .description('Automatic API builder for Node.js (Apollo + Mongoose)')
  .version('0.1.0');

program
  .command('create <projectName>')
  .description('Create a new API project (Apollo + Express + Mongoose)')
  .action(create);

program
  .command('generate <type> <name>')
  .description('Generate code (e.g., model <Name>)')
  .action(generate);

program
  .command('list')
  .description('List all models in the current project')
  .action(list);

program.parse();
