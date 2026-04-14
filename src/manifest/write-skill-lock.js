const fs = require('node:fs/promises');
const path = require('node:path');

const { loadValidatedManifest, pathExists } = require('../install/package-validation');

function getDefaultAdapter(manifest) {
  const explicit = manifest.adapters.find((adapter) => adapter.default);
  return explicit ? explicit.platform : manifest.adapters[0].platform;
}

async function buildLockFiles(sourceDir, manifest) {
  const files = [
    'skill.json',
    manifest.skill_spec_file,
    manifest.entrypoints.system_prompt_file,
    manifest.entrypoints.inputs_schema_file,
  ];

  if (manifest.readme_file && (await pathExists(path.join(sourceDir, manifest.readme_file)))) {
    files.push(manifest.readme_file);
  }

  for (const adapter of manifest.adapters) {
    files.push(adapter.manifest_file);
  }

  return [...new Set(files)].sort();
}

async function writeSkillLock(sourceDir) {
  const resolvedDir = path.resolve(sourceDir);
  const manifest = await loadValidatedManifest(resolvedDir);
  const lockPath = path.join(resolvedDir, 'skill.lock.json');
  const files = await buildLockFiles(resolvedDir, manifest);

  const payload = {
    lock_schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    package: {
      id: manifest.id,
      version: manifest.version,
      default_adapter: getDefaultAdapter(manifest),
    },
    files,
    source_manifest: {
      id: manifest.id,
      version: manifest.version,
      package_schema_version: manifest.package_schema_version,
    },
  };

  await fs.writeFile(lockPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  return {
    lockPath,
    lock: payload,
  };
}

module.exports = {
  writeSkillLock,
};
