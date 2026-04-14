const fs = require('node:fs/promises');
const path = require('node:path');

const {
  loadManifestFile,
  pathExists,
} = require('../install/package-validation');

const FIELD_ORDER = [
  '$schema',
  'package_schema_version',
  'id',
  'name',
  'version',
  'description',
  'license',
  'source_repository',
  'skill_spec_file',
  'readme_file',
  'entrypoints',
  'installation',
  'adapters',
  'compatibility',
];

function orderObject(input, orderedKeys) {
  const result = {};
  for (const key of orderedKeys) {
    if (input[key] !== undefined) {
      result[key] = input[key];
    }
  }
  for (const key of Object.keys(input)) {
    if (!(key in result)) {
      result[key] = input[key];
    }
  }
  return result;
}

function normalizeAdapters(adapters) {
  if (!Array.isArray(adapters)) {
    return adapters;
  }

  return [...adapters].sort((left, right) => {
    if (Boolean(left.default) !== Boolean(right.default)) {
      return left.default ? -1 : 1;
    }
    return String(left.platform).localeCompare(String(right.platform));
  });
}

async function normalizeSkillPackage(sourceDir) {
  const resolvedDir = path.resolve(sourceDir);
  const manifest = await loadManifestFile(resolvedDir);
  const readmeExists = await pathExists(path.join(resolvedDir, 'README.md'));

  const normalized = orderObject(
    {
      ...manifest,
      package_schema_version: manifest.package_schema_version || '1.0.0',
      readme_file: manifest.readme_file || (readmeExists ? 'README.md' : undefined),
      installation: {
        mode: 'copy',
        default_install_root: '~/.book-to-skill/skills',
        install_subdir_pattern: '{id}@{version}',
        ...(manifest.installation || {}),
      },
      adapters: normalizeAdapters(manifest.adapters),
    },
    FIELD_ORDER
  );

  const manifestPath = path.join(resolvedDir, 'skill.json');
  await fs.writeFile(manifestPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');

  return {
    sourceDir: resolvedDir,
    manifest: normalized,
    manifestPath,
  };
}

module.exports = {
  normalizeSkillPackage,
};
