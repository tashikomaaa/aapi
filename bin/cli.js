#!/usr/bin/env node
import { Command } from 'commander';
import create from '../src/commands/create.js';
import generate from '../src/commands/generate.js';

const program = new Command();

program
  .name('aapi')
  .description('Automatic API builder for Node.js (Apollo + Mongoose)')
  .version('0.0.1')

program
  .command('create <projectName>')
  .description('Crée un nouveau projet API (Apollo + Express + Mongoose)')
  .action(create);

program
  .command('generate <type> <name>')
  .description('Génère du code (ex: model <Name>)')
  .action(generate);

program.parse();
