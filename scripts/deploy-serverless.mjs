import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const [major, minor, patch] = process.versions.node.split('.').map(Number);
if (!((major === 22 && (minor > 23 || (minor === 23 && patch >= 4))) ||
      (major === 24 && (minor > 22 || (minor === 22 && patch >= 1))))) {
  throw new Error('Use patched Node 22.23.4+ or 24.22.1+ for deployment.');
}
const repositoryRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: root }).toString().trim();
if (realpathSync(repositoryRoot) !== realpathSync(root)) throw new Error('Run this wrapper from the Servobill repository.');
const snapshot = mkdtempSync(path.join(tmpdir(), 'servobill-security-deploy-'));
const prepareOnly = process.argv.includes('--prepare-only');
let retain = false;
try {
  const names = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root }).toString().split('\0').filter(Boolean);
  for (const name of names) {
    if (!existsSync(path.join(root, name))) continue;
    mkdirSync(path.dirname(path.join(snapshot, name)), { recursive: true });
    cpSync(path.join(root, name), path.join(snapshot, name));
  }
  for (const name of ['.env', '.env.local', '.sst/provider-lock.json']) {
    if (!existsSync(path.join(root, name))) continue;
    mkdirSync(path.dirname(path.join(snapshot, name)), { recursive: true });
    cpSync(path.join(root, name), path.join(snapshot, name));
    chmodSync(path.join(snapshot, name), 0o600);
  }
  writeFileSync(path.join(snapshot, '.servobill-deploy-snapshot'), 'Disposable serverless build snapshot\n');
  const manifest = JSON.parse(readFileSync(path.join(snapshot, 'package.json'), 'utf8'));
  for (const group of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    for (const name of ['pg', 'sqlite', 'sqlite3']) delete manifest[group]?.[name];
  }
  writeFileSync(path.join(snapshot, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  if (prepareOnly) {
    retain = true;
    console.log(snapshot);
  } else {
    const fileEnv = existsSync(path.join(snapshot, '.env')) ? parse(readFileSync(path.join(snapshot, '.env'))) : {};
    const env = { ...fileEnv, ...process.env };
    env.AWS_PROFILE ||= env.USE_AWS_PROFILE;
    env.USE_AWS_PROFILE ||= env.AWS_PROFILE;
    env.AWS_REGION ||= 'eu-central-1';
    const run = (command, args) => {
      const result = spawnSync(command, args, { cwd: snapshot, env, stdio: 'inherit' });
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error(`${command} failed with exit ${result.status}`);
    };
    run('npm', ['install', '--no-audit', '--no-fund']);
    run('npx', ['--no-install', 'tsx', '--tsconfig', 'tsconfig.json', 'scripts/prepare-serverless-snapshot.ts']);
    run('npm', ['run', 'gql:type']);
    run('npm', ['run', 'security:runtime-layers']);
    run('npx', ['--no-install', 'sst', 'deploy', '--stage', 'prod']);
  }
} finally {
  if (!retain) rmSync(snapshot, { recursive: true, force: true });
}
