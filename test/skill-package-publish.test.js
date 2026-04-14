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

test('publishSkillPackage runs normalize, validate, lock, and pack for a local package', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-publish-'));
  const packageDir = path.join(tempDir, 'publish-skill');
  await fs.cp(examplePackageDir, packageDir, { recursive: true });
  const { publishSkillPackage } = require('../src/publish');

  const result = await publishSkillPackage(packageDir);
  const archiveStat = await fs.stat(result.archivePath);
  const lockStat = await fs.stat(result.lockPath);

  assert.equal(result.manifest.id, 'pyramid-writing-skill');
  assert.equal(path.basename(result.archivePath), 'pyramid-writing-skill-1.0.0.tar.gz');
  assert.equal(archiveStat.isFile(), true);
  assert.equal(lockStat.isFile(), true);
});

test('publishSkillPackage supports a custom output archive path', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-publish-output-'));
  const packageDir = path.join(tempDir, 'publish-skill');
  const archivePath = path.join(tempDir, 'artifacts', 'custom-output.tar.gz');
  await fs.cp(examplePackageDir, packageDir, { recursive: true });
  const { publishSkillPackage } = require('../src/publish');

  const result = await publishSkillPackage(packageDir, { outputPath: archivePath });

  assert.equal(result.archivePath, archivePath);
});

test('CLI publish command writes dist tarball and lockfile', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-publish-cli-'));
  const packageDir = path.join(tempDir, 'publish-skill');
  await fs.cp(examplePackageDir, packageDir, { recursive: true });

  const result = await runNode(['src/cli.js', 'publish', packageDir]);
  const archiveStat = await fs.stat(
    path.join(packageDir, 'dist', 'pyramid-writing-skill-1.0.0.tar.gz')
  );
  const lockStat = await fs.stat(path.join(packageDir, 'skill.lock.json'));

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Published pyramid-writing-skill@1.0.0/);
  assert.equal(archiveStat.isFile(), true);
  assert.equal(lockStat.isFile(), true);
});
