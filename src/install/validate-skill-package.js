const { loadValidatedManifest } = require('./package-validation');
const { resolveSkillPackageSource } = require('./source-resolution');

function getDefaultAdapter(manifest) {
  const explicit = manifest.adapters.find((adapter) => adapter.default);
  return explicit ? explicit.platform : manifest.adapters[0].platform;
}

function buildSummary(manifest, source) {
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    defaultAdapter: getDefaultAdapter(manifest),
    sourceType: source.sourceType,
    sourceRef: source.sourceRef,
  };
}

async function validateSkillPackage(sourcePath, options = {}) {
  let source;

  try {
    source = await resolveSkillPackageSource(sourcePath, options);
    const manifest = await loadValidatedManifest(source.resolvedSource);

    return {
      valid: true,
      errors: [],
      warnings: [],
      summary: buildSummary(manifest, source),
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error.message],
      warnings: [],
      summary: null,
    };
  } finally {
    if (source) {
      await source.cleanup();
    }
  }
}

module.exports = {
  validateSkillPackage,
};
