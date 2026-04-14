const path = require('node:path');

const { normalizeSkillPackage, writeSkillLock } = require('../manifest');
const { validateSkillPackage } = require('../install');
const { createSkillPackageArchive } = require('../pack');

async function publishSkillPackage(sourceDir, options = {}) {
  const normalized = await normalizeSkillPackage(sourceDir);
  const validation = await validateSkillPackage(normalized.sourceDir);

  if (!validation.valid) {
    throw new Error(`Publish failed validation: ${validation.errors.join('; ')}`);
  }

  const lock = await writeSkillLock(normalized.sourceDir);
  const archivePath =
    options.outputPath ||
    path.join(
      normalized.sourceDir,
      'dist',
      `${normalized.manifest.id}-${normalized.manifest.version}.tar.gz`
    );
  const archive = await createSkillPackageArchive(normalized.sourceDir, { outputPath: archivePath });

  return {
    manifest: normalized.manifest,
    valid: validation.valid,
    lockPath: lock.lockPath,
    archivePath: archive.outputPath,
  };
}

module.exports = {
  publishSkillPackage,
};
