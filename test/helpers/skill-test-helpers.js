const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createSkillPackageArchive } = require('../../src/pack');
const { installSkillPackage, listInstalledSkills } = require('../../src/install');

const rootDir = path.resolve(__dirname, '../..');
const examplePackageDir = path.join(rootDir, 'skill-package.example');

async function createVersionedPackage(version) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-skill-helper-versioned-'));
  const packageDir = path.join(tempDir, `skill-${version}`);
  await fs.cp(examplePackageDir, packageDir, { recursive: true });
  const manifestPath = path.join(packageDir, 'skill.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  manifest.version = version;
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return packageDir;
}

async function createExampleArchive(version = '1.0.0') {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-skill-helper-archive-'));
  const archivePath = path.join(tempDir, `pyramid-writing-skill-${version}.tar.gz`);
  const packageDir = version === '1.0.0' ? examplePackageDir : await createVersionedPackage(version);
  await createSkillPackageArchive(packageDir, { outputPath: archivePath });
  return archivePath;
}

async function installExampleSkill({ storeRoot, version = '1.0.0' } = {}) {
  const resolvedStoreRoot = storeRoot || (await fs.mkdtemp(path.join(os.tmpdir(), 'bts-skill-helper-store-')));
  const archivePath = await createExampleArchive(version);
  await installSkillPackage(archivePath, { storeRoot: resolvedStoreRoot });
  const skills = await listInstalledSkills({ storeRoot: resolvedStoreRoot });
  const installedSkill = skills.find((skill) => skill.version === version);

  return {
    installedSkill,
    storeRoot: resolvedStoreRoot,
  };
}

async function createInstalledSkillMissingEntrypointFixture({ file }) {
  if (!['system.md', 'inputs.schema.json'].includes(file)) {
    throw new Error(`Unsupported fixture file: ${file}`);
  }

  const { installedSkill, storeRoot } = await installExampleSkill();
  await fs.rm(path.join(installedSkill.installedPath, file), { force: true });

  return {
    installedSkill,
    storeRoot,
  };
}

async function createFakeCodexCommand() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-fake-codex-'));
  const commandPath = path.join(tempDir, process.platform === 'win32' ? 'codex.cmd' : 'codex');
  const commandSource = process.platform === 'win32'
    ? '@echo off\r\nnode -e "console.log(\'fake codex started\')"\r\n'
    : '#!/usr/bin/env node\nconsole.log(\'fake codex started\');\n';

  await fs.writeFile(commandPath, commandSource, 'utf8');
  if (process.platform !== 'win32') {
    await fs.chmod(commandPath, 0o755);
  }

  return {
    commandPath,
    binDir: tempDir,
    binPath: commandPath,
  };
}

module.exports = {
  createExampleArchive,
  installExampleSkill,
  createInstalledSkillMissingEntrypointFixture,
  createFakeCodexCommand,
};
