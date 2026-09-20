/**
 * Integration tests for `aapi generate model`.
 *
 * AAPI is a code generator, so the property that actually matters is that the
 * emitted files are valid JavaScript. A unit test on the template inputs cannot
 * see an EJS escaping bug; running `node --check` on the output can.
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { execFile } from 'child_process';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(__dirname, '..', '..', 'bin', 'cli.js');

let workDir;

/**
 * Runs the CLI inside a throwaway project directory.
 * @param {string[]} args - CLI arguments
 * @param {string} cwd - Working directory
 */
async function runCli(args, cwd) {
  return execFileAsync(process.execPath, [CLI, ...args], { cwd });
}

/**
 * Asserts every generated .js file under a directory is syntactically valid.
 * @param {string} dir - Directory to walk
 * @returns {Promise<string[]>} The checked file paths
 */
async function expectAllJsFilesToParse(dir) {
  const checked = [];

  const walk = async (current) => {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        await walk(full);
      } else if (entry.name.endsWith('.js')) {
        await expect(execFileAsync(process.execPath, ['--check', full])).resolves.toBeDefined();
        checked.push(full);
      }
    }
  };

  await walk(dir);
  return checked;
}

beforeAll(async () => {
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aapi-generate-'));
}, 30000);

afterAll(async () => {
  if (workDir) await fs.remove(workDir);
});

describe('aapi generate model', () => {
  /**
   * Creates a fresh project directory for one scenario.
   * @param {string} name - Scenario name
   */
  const scaffold = async (name) => {
    const projectDir = path.join(workDir, name);
    await runCli(['create', name, '--skip-install'], workDir);
    return projectDir;
  };

  it('generates syntactically valid files for a plain model', async () => {
    const projectDir = await scaffold('plain');
    await runCli(['generate', 'model', 'product'], projectDir);

    const checked = await expectAllJsFilesToParse(path.join(projectDir, 'src'));
    expect(checked.length).toBeGreaterThan(0);
    expect(await fs.pathExists(path.join(projectDir, 'src/models/Product.js'))).toBe(true);
  }, 60000);

  it('generates syntactically valid files when relations are used', async () => {
    const projectDir = await scaffold('relations');
    await runCli(
      ['generate', 'model', 'post', '--relations', 'author:User,comments:[Comment]'],
      projectDir
    );

    await expectAllJsFilesToParse(path.join(projectDir, 'src'));

    // Regression guard: relation fragments are code, so they must be injected
    // with `<%-`. `<%=` HTML-escapes the quotes and produces `ref: &#39;User&#39;`.
    const model = await fs.readFile(path.join(projectDir, 'src/models/Post.js'), 'utf8');
    expect(model).toContain("ref: 'User'");
    expect(model).not.toContain('&#39;');

    const resolver = await fs.readFile(
      path.join(projectDir, 'src/graphql/resolvers/PostResolver.js'),
      'utf8'
    );
    expect(resolver).toContain(".populate('author')");
    expect(resolver).not.toContain('&#39;');
  }, 60000);

  it('emits the runtime modules that subscription and cache resolvers import', async () => {
    const projectDir = await scaffold('runtime');
    await runCli(
      ['generate', 'model', 'event', '--with-subscriptions', '--with-cache'],
      projectDir
    );

    expect(await fs.pathExists(path.join(projectDir, 'src/utils/pubsub.js'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'src/utils/cache.js'))).toBe(true);
    await expectAllJsFilesToParse(path.join(projectDir, 'src'));
  }, 60000);

  it('honours --no-tests', async () => {
    const projectDir = await scaffold('notests');
    await runCli(['generate', 'model', 'widget', '--no-tests'], projectDir);

    expect(await fs.pathExists(path.join(projectDir, 'src/__tests__/Widget.test.js'))).toBe(false);
  }, 60000);

  it('generates tests that import the model from the right depth', async () => {
    const projectDir = await scaffold('testpaths');
    await runCli(['generate', 'model', 'order'], projectDir);

    const testFile = path.join(projectDir, 'src/__tests__/Order.test.js');
    expect(await fs.pathExists(testFile)).toBe(true);

    const contents = await fs.readFile(testFile, 'utf8');
    expect(contents).toContain("from '../models/Order.js'");
    expect(contents).not.toContain("from '../../models/");
  }, 60000);
});

describe('aapi create', () => {
  it('ships the jest configuration the generated test script needs', async () => {
    const projectDir = path.join(workDir, 'jestwiring');
    await runCli(['create', 'jestwiring', '--skip-install'], workDir);

    expect(await fs.pathExists(path.join(projectDir, 'jest.config.js'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'jest.setup.js'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, '.gitignore'))).toBe(true);

    const pkg = await fs.readJson(path.join(projectDir, 'package.json'));
    expect(pkg.scripts.test).toContain('jest');
    expect(pkg.devDependencies).toHaveProperty('jest');
  }, 60000);
});
