const fs = require('node:fs/promises');
const path = require('node:path');

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function loadManifestFile(sourceDir) {
  const manifestPath = path.join(sourceDir, 'skill.json');

  if (!(await pathExists(manifestPath))) {
    throw new Error(`skill.json not found in package directory: ${sourceDir}`);
  }

  return readJsonFile(manifestPath);
}

function validateRequiredManifestFields(manifest) {
  const required = [
    'package_schema_version',
    'id',
    'name',
    'version',
    'description',
    'skill_spec_file',
    'entrypoints',
    'installation',
    'adapters',
  ];

  for (const field of required) {
    if (manifest[field] === undefined || manifest[field] === null) {
      throw new Error(`Missing required manifest field: ${field}`);
    }
  }

  if (!manifest.entrypoints.system_prompt_file) {
    throw new Error('Missing required manifest field: entrypoints.system_prompt_file');
  }
  if (!manifest.entrypoints.inputs_schema_file) {
    throw new Error('Missing required manifest field: entrypoints.inputs_schema_file');
  }
  if (!Array.isArray(manifest.adapters) || manifest.adapters.length === 0) {
    throw new Error('Manifest must declare at least one adapter');
  }
}

async function validateRequiredFiles(sourceDir, manifest) {
  const requiredFiles = [
    'skill.json',
    manifest.skill_spec_file,
    manifest.entrypoints.system_prompt_file,
    manifest.entrypoints.inputs_schema_file,
  ];

  for (const adapter of manifest.adapters) {
    requiredFiles.push(adapter.manifest_file);
  }

  for (const relativeFile of requiredFiles) {
    const fullPath = path.join(sourceDir, relativeFile);
    if (!(await pathExists(fullPath))) {
      throw new Error(`Required package file not found: ${relativeFile}`);
    }
  }
}

async function loadValidatedManifest(sourceDir) {
  const manifest = await loadManifestFile(sourceDir);
  validateRequiredManifestFields(manifest);
  await validateRequiredFiles(sourceDir, manifest);

  return manifest;
}

module.exports = {
  loadManifestFile,
  loadValidatedManifest,
  pathExists,
  readJsonFile,
};
