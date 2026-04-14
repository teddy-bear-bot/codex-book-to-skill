const { loadValidatedManifest } = require('./package-validation');
const { resolveSkillPackageSource } = require('./source-resolution');

function getDefaultAdapter(manifest) {
  const explicit = manifest.adapters.find((adapter) => adapter.default);
  return explicit ? explicit.platform : manifest.adapters[0].platform;
}

async function inspectSkillPackage(sourcePath, options = {}) {
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

    return {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description,
      defaultAdapter: getDefaultAdapter(manifest),
      sourceType: source.sourceType,
      sourceRef: source.sourceRef,
      entrypoints: manifest.entrypoints,
      adapters: manifest.adapters.map((adapter) => ({
        platform: adapter.platform,
        default: Boolean(adapter.default),
      })),
    };
  } finally {
    await source.cleanup();
  }
}

module.exports = {
  inspectSkillPackage,
};
