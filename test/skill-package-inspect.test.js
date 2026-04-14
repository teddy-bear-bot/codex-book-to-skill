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

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
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

async function createGitRepoFromExample() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-inspect-git-'));
  const repoDir = path.join(tempDir, 'repo');
  await fs.mkdir(repoDir, { recursive: true });
  await fs.cp(examplePackageDir, repoDir, { recursive: true });

  let result = await runCommand('git', ['init'], { cwd: repoDir });
  assert.equal(result.code, 0);
  result = await runCommand('git', ['config', 'user.name', 'Book To Skill Test'], { cwd: repoDir });
  assert.equal(result.code, 0);
  result = await runCommand('git', ['config', 'user.email', 'test@example.com'], { cwd: repoDir });
  assert.equal(result.code, 0);
  result = await runCommand('git', ['add', '.'], { cwd: repoDir });
  assert.equal(result.code, 0);
  result = await runCommand('git', ['commit', '-m', 'init'], { cwd: repoDir });
  assert.equal(result.code, 0);

  return {
    repoDir,
    repoUrl: `file://${repoDir}`,
  };
}

async function createGitRepoWithAlternateRef() {
  const { repoDir, repoUrl } = await createGitRepoFromExample();
  const branchName = 'alternate-release';

  let result = await runCommand('git', ['checkout', '-b', branchName], { cwd: repoDir });
  assert.equal(result.code, 0);

  const manifestPath = path.join(repoDir, 'skill.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  manifest.version = '2.0.0';
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  result = await runCommand('git', ['add', 'skill.json'], { cwd: repoDir });
  assert.equal(result.code, 0);
  result = await runCommand('git', ['commit', '-m', 'alternate release'], { cwd: repoDir });
  assert.equal(result.code, 0);
  result = await runCommand('git', ['checkout', '-'], { cwd: repoDir });
  assert.equal(result.code, 0);

  return {
    repoUrl,
    branchName,
  };
}

test('inspectSkillPackage returns a summary for a local package directory', async () => {
  const { inspectSkillPackage } = require('../src/install');

  const result = await inspectSkillPackage(examplePackageDir);

  assert.equal(result.id, 'pyramid-writing-skill');
  assert.equal(result.version, '1.0.0');
  assert.equal(result.defaultAdapter, 'generic');
  assert.equal(result.sourceType, 'directory');
});

test('inspectSkillPackage returns a summary for a local .tar.gz package', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-inspect-archive-'));
  const archivePath = path.join(tempDir, 'pyramid-writing-skill-1.0.0.tar.gz');
  const { createSkillPackageArchive } = require('../src/pack');
  const { inspectSkillPackage } = require('../src/install');

  await createSkillPackageArchive(examplePackageDir, { outputPath: archivePath });
  const result = await inspectSkillPackage(archivePath);

  assert.equal(result.id, 'pyramid-writing-skill');
  assert.equal(result.sourceType, 'archive');
});

test('inspectSkillPackage returns a summary for a git package at a specific ref', async () => {
  const { repoUrl, branchName } = await createGitRepoWithAlternateRef();
  const { inspectSkillPackage } = require('../src/install');

  const result = await inspectSkillPackage(repoUrl, { ref: branchName });

  assert.equal(result.version, '2.0.0');
  assert.equal(result.sourceType, 'git');
  assert.equal(result.sourceRef, branchName);
});

test('CLI inspect command prints skill package summary as JSON', async () => {
  const result = await runNode(['src/cli.js', 'inspect', examplePackageDir]);
  const payload = JSON.parse(result.stdout);

  assert.equal(result.code, 0);
  assert.equal(payload.id, 'pyramid-writing-skill');
  assert.equal(payload.defaultAdapter, 'generic');
  assert.equal(payload.sourceType, 'directory');
});
