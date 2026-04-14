const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const examplePackageDir = path.join(rootDir, 'skill-package.example');

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

test('createSkillPackageArchive creates a .tar.gz archive from a valid skill package directory', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-pack-'));
  const outputPath = path.join(tempDir, 'pyramid-writing-skill-1.0.0.tar.gz');
  const { createSkillPackageArchive } = require('../src/pack');

  const result = await createSkillPackageArchive(examplePackageDir, { outputPath });
  const archiveStat = await fs.stat(outputPath);

  assert.equal(result.outputPath, outputPath);
  assert.equal(archiveStat.isFile(), true);
});

test('CLI pack command creates a .tar.gz archive', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-cli-pack-'));
  const outputPath = path.join(tempDir, 'skill.tar.gz');

  const result = await runNode([
    'src/cli.js',
    'pack',
    examplePackageDir,
    '--output',
    outputPath,
  ]);
  const archiveStat = await fs.stat(outputPath);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Packed pyramid-writing-skill@1.0.0/);
  assert.equal(archiveStat.isFile(), true);
});
