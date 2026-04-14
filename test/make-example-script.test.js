const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');

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

test('make-example script generates distilled spec, skill package directory, and tarball', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-make-example-'));
  const outputDir = path.join(tempDir, 'demo-output');
  const scriptPath = path.join(rootDir, 'scripts', 'make-example.sh');

  const result = await runCommand('sh', [scriptPath, outputDir]);

  const spec = JSON.parse(await fs.readFile(path.join(outputDir, 'distilled-spec.json'), 'utf8'));
  const manifest = JSON.parse(
    await fs.readFile(path.join(outputDir, 'generated-skill', 'skill.json'), 'utf8')
  );
  const distEntries = await fs.readdir(path.join(outputDir, 'generated-skill', 'dist'));

  assert.equal(result.code, 0);
  assert.match(result.stdout, /distilled-spec\.json/);
  assert.match(result.stdout, /generated-skill/);
  assert.match(spec.title, /Atomic Habits/);
  assert.equal(manifest.package_schema_version, '1.0.0');
  assert.equal(distEntries.some((entry) => entry.endsWith('.tar.gz')), true);
});

test('clean-example script removes the generated example output directory', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-clean-example-'));
  const outputDir = path.join(tempDir, 'demo-output');
  const makeScriptPath = path.join(rootDir, 'scripts', 'make-example.sh');
  const cleanScriptPath = path.join(rootDir, 'scripts', 'clean-example.sh');

  const buildResult = await runCommand('sh', [makeScriptPath, outputDir]);
  assert.equal(buildResult.code, 0);

  const cleanResult = await runCommand('sh', [cleanScriptPath, outputDir]);

  await assert.rejects(fs.stat(outputDir), /ENOENT/);
  assert.equal(cleanResult.code, 0);
  assert.match(cleanResult.stdout, /Cleaned example output/);
});

test('demo.sh make generates the example output directory', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-demo-make-'));
  const outputDir = path.join(tempDir, 'demo-output');
  const scriptPath = path.join(rootDir, 'scripts', 'demo.sh');

  const result = await runCommand('sh', [scriptPath, 'make', outputDir]);
  const spec = JSON.parse(await fs.readFile(path.join(outputDir, 'distilled-spec.json'), 'utf8'));

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Example artifacts created/);
  assert.match(spec.title, /Atomic Habits/);
});

test('demo.sh clean removes the example output directory', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-demo-clean-'));
  const outputDir = path.join(tempDir, 'demo-output');
  const makeScriptPath = path.join(rootDir, 'scripts', 'make-example.sh');
  const scriptPath = path.join(rootDir, 'scripts', 'demo.sh');

  const buildResult = await runCommand('sh', [makeScriptPath, outputDir]);
  assert.equal(buildResult.code, 0);

  const cleanResult = await runCommand('sh', [scriptPath, 'clean', outputDir]);

  await assert.rejects(fs.stat(outputDir), /ENOENT/);
  assert.equal(cleanResult.code, 0);
  assert.match(cleanResult.stdout, /Cleaned example output/);
});

test('demo.sh reset recreates artifacts after cleaning', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-demo-reset-'));
  const outputDir = path.join(tempDir, 'demo-output');
  const makeScriptPath = path.join(rootDir, 'scripts', 'make-example.sh');
  const scriptPath = path.join(rootDir, 'scripts', 'demo.sh');

  const buildResult = await runCommand('sh', [makeScriptPath, outputDir]);
  assert.equal(buildResult.code, 0);

  const resetResult = await runCommand('sh', [scriptPath, 'reset', outputDir]);
  const manifest = JSON.parse(
    await fs.readFile(path.join(outputDir, 'generated-skill', 'skill.json'), 'utf8')
  );

  assert.equal(resetResult.code, 0);
  assert.match(resetResult.stdout, /Cleaned example output/);
  assert.match(resetResult.stdout, /Example artifacts created/);
  assert.equal(manifest.package_schema_version, '1.0.0');
});

test('demo.sh status reports missing output when directory does not exist', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-demo-status-missing-'));
  const outputDir = path.join(tempDir, 'demo-output');
  const scriptPath = path.join(rootDir, 'scripts', 'demo.sh');

  const result = await runCommand('sh', [scriptPath, 'status', outputDir]);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /output_dir=/);
  assert.match(result.stdout, /directory=missing/);
  assert.match(result.stdout, /distilled_spec=missing/);
  assert.match(result.stdout, /skill_dir=missing/);
  assert.match(result.stdout, /archive_count=0/);
});

test('demo.sh status reports generated artifacts after make', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-demo-status-present-'));
  const outputDir = path.join(tempDir, 'demo-output');
  const makeScriptPath = path.join(rootDir, 'scripts', 'make-example.sh');
  const scriptPath = path.join(rootDir, 'scripts', 'demo.sh');

  const buildResult = await runCommand('sh', [makeScriptPath, outputDir]);
  assert.equal(buildResult.code, 0);

  const statusResult = await runCommand('sh', [scriptPath, 'status', outputDir]);

  assert.equal(statusResult.code, 0);
  assert.match(statusResult.stdout, /directory=present/);
  assert.match(statusResult.stdout, /distilled_spec=present/);
  assert.match(statusResult.stdout, /skill_dir=present/);
  assert.match(statusResult.stdout, /archive_count=1/);
});

test('demo.sh status --json reports missing output as JSON', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-demo-status-json-missing-'));
  const outputDir = path.join(tempDir, 'demo-output');
  const scriptPath = path.join(rootDir, 'scripts', 'demo.sh');

  const result = await runCommand('sh', [scriptPath, 'status', '--json', outputDir]);
  const payload = JSON.parse(result.stdout);

  assert.equal(result.code, 0);
  assert.equal(payload.output_dir, outputDir);
  assert.equal(payload.directory, 'missing');
  assert.equal(payload.distilled_spec, 'missing');
  assert.equal(payload.skill_dir, 'missing');
  assert.equal(payload.archive_count, 0);
});

test('demo.sh status --json reports generated artifacts as JSON', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-demo-status-json-present-'));
  const outputDir = path.join(tempDir, 'demo-output');
  const makeScriptPath = path.join(rootDir, 'scripts', 'make-example.sh');
  const scriptPath = path.join(rootDir, 'scripts', 'demo.sh');

  const buildResult = await runCommand('sh', [makeScriptPath, outputDir]);
  assert.equal(buildResult.code, 0);

  const result = await runCommand('sh', [scriptPath, 'status', '--json', outputDir]);
  const payload = JSON.parse(result.stdout);

  assert.equal(result.code, 0);
  assert.equal(payload.output_dir, outputDir);
  assert.equal(payload.directory, 'present');
  assert.equal(payload.distilled_spec, 'present');
  assert.equal(payload.skill_dir, 'present');
  assert.equal(payload.archive_count, 1);
});

test('demo.sh make supports explicit --output-dir', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-demo-output-dir-make-'));
  const outputDir = path.join(tempDir, 'explicit-output');
  const scriptPath = path.join(rootDir, 'scripts', 'demo.sh');

  const result = await runCommand('sh', [scriptPath, 'make', '--output-dir', outputDir]);
  const spec = JSON.parse(await fs.readFile(path.join(outputDir, 'distilled-spec.json'), 'utf8'));

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Example artifacts created/);
  assert.match(spec.title, /Atomic Habits/);
});

test('demo.sh status --json supports explicit --output-dir', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-demo-output-dir-status-'));
  const outputDir = path.join(tempDir, 'explicit-output');
  const makeScriptPath = path.join(rootDir, 'scripts', 'make-example.sh');
  const scriptPath = path.join(rootDir, 'scripts', 'demo.sh');

  const buildResult = await runCommand('sh', [makeScriptPath, outputDir]);
  assert.equal(buildResult.code, 0);

  const result = await runCommand('sh', [
    scriptPath,
    'status',
    '--json',
    '--output-dir',
    outputDir,
  ]);
  const payload = JSON.parse(result.stdout);

  assert.equal(result.code, 0);
  assert.equal(payload.output_dir, outputDir);
  assert.equal(payload.directory, 'present');
  assert.equal(payload.archive_count, 1);
});
