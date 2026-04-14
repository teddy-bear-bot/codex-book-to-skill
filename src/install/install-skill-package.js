const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {
  loadValidatedManifest,
  pathExists,
  readJsonFile,
} = require('./package-validation');
const { resolveSkillPackageSource } = require('./source-resolution');

function expandHome(inputPath) {
  if (!inputPath) return inputPath;
  if (inputPath === '~') return os.homedir();
  if (inputPath.startsWith('~/')) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

async function loadRegistry(registryPath) {
  if (!(await pathExists(registryPath))) {
    return { skills: [] };
  }
  return readJsonFile(registryPath);
}

async function saveRegistry(registryPath, registry) {
  await fs.writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf8');
}

function getDefaultAdapter(manifest) {
  const explicit = manifest.adapters.find((adapter) => adapter.default);
  return explicit ? explicit.platform : manifest.adapters[0].platform;
}

async function installSkillPackage(sourcePath, options = {}) {
  const source = await resolveSkillPackageSource(sourcePath, options);

  try {
    let manifest;
    try {
      manifest = await loadValidatedManifest(source.resolvedSource);
    } catch (error) {
      if (source.sourceType === 'archive') {
        throw new Error(`Invalid skill package archive: ${error.message}`);
      }
      throw error;
    }

    const storeRoot = path.resolve(
      expandHome(options.storeRoot || manifest.installation.default_install_root)
    );
    const installDirName = manifest.installation.install_subdir_pattern
      .replace('{id}', manifest.id)
      .replace('{version}', manifest.version);
    const installedPath = path.join(storeRoot, installDirName);
    const registryPath = path.join(storeRoot, 'registry.json');
    const defaultAdapter = getDefaultAdapter(manifest);

    await fs.mkdir(storeRoot, { recursive: true });
    await fs.rm(installedPath, { recursive: true, force: true });
    await fs.cp(source.resolvedSource, installedPath, { recursive: true });

    const registry = await loadRegistry(registryPath);
    registry.skills = registry.skills.filter(
      (skill) => !(skill.id === manifest.id && skill.version === manifest.version)
    );
    registry.skills.push({
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      installedPath,
      defaultAdapter,
      sourcePath: source.resolvedSource,
      originalSource: source.originalSource,
      originalRef: source.sourceRef,
    });
    await saveRegistry(registryPath, registry);

    return {
      manifest,
      installedPath,
      storeRoot,
      registryPath,
      defaultAdapter,
    };
  } finally {
    await source.cleanup();
  }
}

async function listInstalledSkills(options = {}) {
  const storeRoot = path.resolve(
    expandHome(options.storeRoot || '~/.book-to-skill/skills')
  );
  const registryPath = path.join(storeRoot, 'registry.json');
  const registry = await loadRegistry(registryPath);
  return registry.skills;
}

async function uninstallSkillPackage(identifier, options = {}) {
  const storeRoot = path.resolve(
    expandHome(options.storeRoot || '~/.book-to-skill/skills')
  );
  const registryPath = path.join(storeRoot, 'registry.json');
  const registry = await loadRegistry(registryPath);
  const match = registry.skills.find(
    (skill) => `${skill.id}@${skill.version}` === identifier
  );

  if (!match) {
    throw new Error(`Installed skill not found: ${identifier}`);
  }

  await fs.rm(match.installedPath, { recursive: true, force: true });
  registry.skills = registry.skills.filter(
    (skill) => `${skill.id}@${skill.version}` !== identifier
  );
  await saveRegistry(registryPath, registry);

  return match;
}

module.exports = {
  installSkillPackage,
  listInstalledSkills,
  uninstallSkillPackage,
};
