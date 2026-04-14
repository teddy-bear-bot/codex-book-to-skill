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

test('validateSkillPackage returns a passing report for a valid local package directory', async () => {
  const { validateSkillPackage } = require('../src/install');

  const result = await validateSkillPackage(examplePackageDir);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.summary.id, 'pyramid-writing-skill');
});

test('validateSkillPackage returns errors for an invalid package directory', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-validate-invalid-'));
  const invalidDir = path.join(tempDir, 'invalid-skill');
  await fs.mkdir(invalidDir, { recursive: true });
  await fs.writeFile(path.join(invalidDir, 'README.md'), '# invalid\n', 'utf8');
  const { validateSkillPackage } = require('../src/install');

  const result = await validateSkillPackage(invalidDir);

  assert.equal(result.valid, false);
  assert.equal(result.errors.length > 0, true);
  assert.equal(result.summary, null);
});

test('CLI validate command prints a human-readable report for a valid package', async () => {
  const result = await runNode(['src/cli.js', 'validate', examplePackageDir]);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /VALID/);
  assert.match(result.stdout, /pyramid-writing-skill@1.0.0/);
});

test('CLI validate --json prints a JSON report and exits non-zero for invalid packages', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-validate-json-'));
  const invalidDir = path.join(tempDir, 'invalid-skill');
  await fs.mkdir(invalidDir, { recursive: true });

  const result = await runNode(['src/cli.js', 'validate', invalidDir, '--json']);
  const payload = JSON.parse(result.stdout);

  assert.equal(result.code, 1);
  assert.equal(payload.valid, false);
  assert.equal(Array.isArray(payload.errors), true);
  assert.equal(payload.errors.length > 0, true);
});
