const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');

function runNode(args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: rootDir,
      ...options,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

test('createSkillPackageSkeleton creates a valid minimal skill package scaffold', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-init-lib-'));
  const targetDir = path.join(tempDir, 'my-new-skill');
  const { createSkillPackageSkeleton } = require('../src/init');

  const result = await createSkillPackageSkeleton(targetDir);
  const manifest = JSON.parse(await fs.readFile(path.join(targetDir, 'skill.json'), 'utf8'));
  const systemPrompt = await fs.readFile(path.join(targetDir, 'system.md'), 'utf8');

  assert.equal(result.targetDir, targetDir);
  assert.equal(manifest.id, 'my-new-skill');
  assert.equal(manifest.version, '0.1.0');
  assert.match(systemPrompt, /my-new-skill/);
});

test('CLI init command scaffolds a new skill package directory', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-init-cli-'));
  const targetDir = path.join(tempDir, 'cli-skill');

  const result = await runNode(['src/cli.js', 'init', targetDir]);
  const stat = await fs.stat(path.join(targetDir, 'inputs.schema.json'));

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Initialized cli-skill@0.1.0/);
  assert.equal(stat.isFile(), true);
});

test('generated init package can be inspected successfully', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-init-inspect-'));
  const targetDir = path.join(tempDir, 'inspectable-skill');
  const { createSkillPackageSkeleton } = require('../src/init');
  const { inspectSkillPackage } = require('../src/install');

  await createSkillPackageSkeleton(targetDir);
  const summary = await inspectSkillPackage(targetDir);

  assert.equal(summary.id, 'inspectable-skill');
  assert.equal(summary.defaultAdapter, 'generic');
  assert.equal(summary.sourceType, 'directory');
});
