#!/usr/bin/env node
/**
 * End-to-end check for a generated AAPI project.
 *
 * Scaffolds a project, generates models, installs it, runs its test suite, then
 * boots the server against an in-memory MongoDB and exercises it over HTTP.
 *
 * The HTTP step matters: template bugs like a second `request` listener racing
 * Yoga on /health only surface when the server actually serves a request.
 *
 * Usage: node scripts/verify-generated-project.mjs [--apollo] [--keep]
 */

import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI = path.join(repoRoot, 'bin', 'cli.js');

const useApollo = process.argv.includes('--apollo');
const keep = process.argv.includes('--keep');
const PORT = 4787;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const step = (msg) => console.log(`\n▶ ${msg}`);

const run = (args, cwd) =>
  execFileAsync(process.execPath, [CLI, ...args], { cwd, maxBuffer: 10 * 1024 * 1024 });

const npm = (args, cwd) =>
  execFileAsync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
    cwd,
    shell: process.platform === 'win32',
    maxBuffer: 50 * 1024 * 1024,
  });

const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aapi-verify-'));
const projectDir = path.join(workDir, 'verify-api');
let server;
let mongo;

try {
  step(`Scaffolding ${useApollo ? 'Apollo Server' : 'GraphQL Yoga'} project`);
  await run(['create', 'verify-api', '--skip-install', ...(useApollo ? ['--apollo'] : [])], workDir);

  step('Generating models');
  await run(['generate', 'model', 'post', '--relations', 'author:User', '--with-pagination'], projectDir);
  await run(['generate', 'model', 'user'], projectDir);
  // Subscriptions are Yoga-only; on Apollo the CLI must refuse them.
  if (useApollo) {
    await run(['generate', 'model', 'event', '--with-cache'], projectDir);
    let refused = false;
    try {
      await run(['generate', 'model', 'live', '--with-subscriptions', '--force'], projectDir);
    } catch {
      refused = true;
    }
    if (!refused) throw new Error('--with-subscriptions should be rejected on an Apollo project');
    console.log('  --with-subscriptions correctly refused on Apollo');
  } else {
    await run(['generate', 'model', 'event', '--with-subscriptions', '--with-cache'], projectDir);
  }

  step('Type-checking every generated file');
  const files = [];
  const walk = async (dir) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith('.js')) files.push(full);
    }
  };
  await walk(path.join(projectDir, 'src'));
  for (const file of files) {
    await execFileAsync(process.execPath, ['--check', file]);
  }
  console.log(`  ${files.length} files parse`);

  step('npm install');
  await npm(['install', '--no-audit', '--no-fund'], projectDir);

  step('Generated project test suite');
  const { stdout, stderr } = await npm(['test'], projectDir);
  console.log(
    (stderr || stdout)
      .split('\n')
      .filter((l) => /Tests:|Test Suites:/.test(l))
      .join('\n')
  );

  step('Booting the server from "/" against an in-memory MongoDB');
  const { MongoMemoryServer } = await import(
    path.join(projectDir, 'node_modules', 'mongodb-memory-server', 'index.js')
  );
  mongo = await MongoMemoryServer.create();

  server = spawn(process.execPath, [path.join(projectDir, 'src', 'server.js')], {
    cwd: '/', // never the project root: catches cwd-dependent module loading
    env: { ...process.env, MONGODB_URI: mongo.getUri(), PORT: String(PORT), NODE_ENV: 'development' },
  });
  let log = '';
  server.stdout.on('data', (d) => (log += d));
  server.stderr.on('data', (d) => (log += d));

  let healthy = false;
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/health`);
      if (res.ok) {
        console.log('  GET /health ->', await res.text());
        healthy = true;
        break;
      }
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  if (!healthy) throw new Error(`server never became healthy\n--- log ---\n${log}`);

  // Hit it twice: a duplicate request listener crashes on the first response,
  // so the second call is what proves the process survived.
  const second = await fetch(`http://localhost:${PORT}/health`);
  if (!second.ok) throw new Error(`/health died after one request\n--- log ---\n${log}`);

  const gql = async (query) => {
    const res = await fetch(`http://localhost:${PORT}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const body = await res.json();
    if (body.errors) throw new Error(`GraphQL error: ${JSON.stringify(body.errors)}`);
    return body.data;
  };

  step('CRUD round-trip over the generated schema');
  const created = await gql('mutation { createPost(input: {name: "verify"}) { _id name } }');
  console.log('  createPost ->', JSON.stringify(created.createPost));

  const listed = await gql('{ posts(page: 1, limit: 10) { items { name } pageInfo { total } } }');
  console.log('  posts ->', JSON.stringify(listed.posts));
  if (listed.posts.pageInfo.total !== 1) throw new Error('CRUD round-trip returned wrong total');

  console.log('\n✅ generated project builds, tests, boots and serves requests');
} catch (err) {
  console.error(`\n❌ ${err.message}`);
  process.exitCode = 1;
} finally {
  if (server) {
    server.kill('SIGTERM');
    await sleep(500);
    server.kill('SIGKILL');
  }
  if (mongo) await mongo.stop();
  if (keep) console.log(`\nProject kept at ${projectDir}`);
  else await fs.rm(workDir, { recursive: true, force: true });
}
