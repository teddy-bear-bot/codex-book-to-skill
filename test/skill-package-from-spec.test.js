const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const specPath = path.join(rootDir, 'skill-spec.example.json');

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

async function createSpecWithoutId() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-from-spec-'));
  const targetPath = path.join(tempDir, 'spec-no-id.json');
  const spec = JSON.parse(await fs.readFile(specPath, 'utf8'));
  delete spec.id;
  await fs.writeFile(targetPath, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');
  return targetPath;
}

test('createSkillPackageFromSpec generates a skill package directory from a local spec file', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-from-spec-lib-'));
  const targetDir = path.join(tempDir, 'generated-skill');
  const { createSkillPackageFromSpec } = require('../src/from-spec');

  const result = await createSkillPackageFromSpec(specPath, targetDir);
  const manifest = JSON.parse(await fs.readFile(path.join(targetDir, 'skill.json'), 'utf8'));
  const inputsSchema = JSON.parse(await fs.readFile(path.join(targetDir, 'inputs.schema.json'), 'utf8'));

  assert.equal(result.manifest.id, 'pyramid-writing-skill');
  assert.equal(manifest.name, '金字塔结构写作 Skill');
  assert.equal(inputsSchema.required.includes('topic'), true);
});

test('createSkillPackageFromSpec warns when the source spec does not define id', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-from-spec-warn-'));
  const targetDir = path.join(tempDir, 'generated-skill');
  const specWithoutIdPath = await createSpecWithoutId();
  const { createSkillPackageFromSpec } = require('../src/from-spec');

  const result = await createSkillPackageFromSpec(specWithoutIdPath, targetDir);

  assert.equal(result.warnings.length > 0, true);
  assert.match(result.warnings[0], /missing spec id/i);
});

test('CLI from-spec command creates a local skill package directory', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-from-spec-cli-'));
  const targetDir = path.join(tempDir, 'generated-skill');

  const result = await runNode(['src/cli.js', 'from-spec', specPath, targetDir]);
  const stat = await fs.stat(path.join(targetDir, 'system.md'));

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Created pyramid-writing-skill@0.1.0/);
  assert.equal(stat.isFile(), true);
});

test('generated package from from-spec can be inspected successfully', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-from-spec-inspect-'));
  const targetDir = path.join(tempDir, 'generated-skill');
  const { createSkillPackageFromSpec } = require('../src/from-spec');
  const { inspectSkillPackage } = require('../src/install');

  await createSkillPackageFromSpec(specPath, targetDir);
  const summary = await inspectSkillPackage(targetDir);

  assert.equal(summary.id, 'pyramid-writing-skill');
  assert.equal(summary.defaultAdapter, 'generic');
});
