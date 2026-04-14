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

async function createPackageForNormalize() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-normalize-'));
  const packageDir = path.join(tempDir, 'normalize-skill');
  await fs.mkdir(packageDir, { recursive: true });
  await fs.mkdir(path.join(packageDir, 'adapters'), { recursive: true });

  await fs.writeFile(
    path.join(packageDir, 'skill.json'),
    `${JSON.stringify(
      {
        id: 'normalize-skill',
        name: 'Normalize Skill',
        version: '1.2.3',
        description: 'Needs manifest normalization.',
        skill_spec_file: 'spec.json',
        entrypoints: {
          inputs_schema_file: 'inputs.schema.json',
          system_prompt_file: 'system.md',
        },
        adapters: [
          {
            manifest_file: 'adapters/generic.json',
            platform: 'generic',
            default: true,
          },
        ],
        installation: {},
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  await fs.writeFile(path.join(packageDir, 'README.md'), '# Normalize Skill\n', 'utf8');
  await fs.writeFile(path.join(packageDir, 'system.md'), 'System prompt\n', 'utf8');
  await fs.writeFile(path.join(packageDir, 'spec.json'), '{}\n', 'utf8');
  await fs.writeFile(path.join(packageDir, 'inputs.schema.json'), '{}\n', 'utf8');
  await fs.writeFile(path.join(packageDir, 'adapters', 'generic.json'), '{}\n', 'utf8');

  return packageDir;
}

test('normalizeSkillPackage rewrites skill.json with defaults and canonical field order', async () => {
  const packageDir = await createPackageForNormalize();
  const { normalizeSkillPackage } = require('../src/manifest');

  await normalizeSkillPackage(packageDir);
  const normalizedText = await fs.readFile(path.join(packageDir, 'skill.json'), 'utf8');
  const normalized = JSON.parse(normalizedText);

  assert.equal(normalized.package_schema_version, '1.0.0');
  assert.equal(normalized.readme_file, 'README.md');
  assert.equal(normalized.installation.mode, 'copy');
  assert.equal(normalizedText.indexOf('"package_schema_version"') < normalizedText.indexOf('"id"'), true);
});

test('writeSkillLock creates a minimal skill.lock.json for a valid package directory', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-lock-'));
  const packageDir = path.join(tempDir, 'lock-skill');
  await fs.cp(examplePackageDir, packageDir, { recursive: true });
  const { writeSkillLock } = require('../src/manifest');

  const result = await writeSkillLock(packageDir);
  const lock = JSON.parse(await fs.readFile(path.join(packageDir, 'skill.lock.json'), 'utf8'));

  assert.equal(result.lockPath, path.join(packageDir, 'skill.lock.json'));
  assert.equal(lock.package.id, 'pyramid-writing-skill');
  assert.equal(Array.isArray(lock.files), true);
  assert.equal(lock.files.includes('skill.json'), true);
});

test('CLI normalize command rewrites the local manifest', async () => {
  const packageDir = await createPackageForNormalize();

  const result = await runNode(['src/cli.js', 'normalize', packageDir]);
  const normalized = JSON.parse(await fs.readFile(path.join(packageDir, 'skill.json'), 'utf8'));

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Normalized normalize-skill@1.2.3/);
  assert.equal(normalized.installation.install_subdir_pattern, '{id}@{version}');
});

test('CLI lock command writes skill.lock.json', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-lock-cli-'));
  const packageDir = path.join(tempDir, 'lock-cli-skill');
  await fs.cp(examplePackageDir, packageDir, { recursive: true });

  const result = await runNode(['src/cli.js', 'lock', packageDir]);
  const stat = await fs.stat(path.join(packageDir, 'skill.lock.json'));

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Wrote lockfile for pyramid-writing-skill@1.0.0/);
  assert.equal(stat.isFile(), true);
});
