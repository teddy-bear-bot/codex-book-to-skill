const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

const { loadValidatedManifest } = require('../install/package-validation');

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`Command failed: ${command} ${args.join(' ')}\n${stderr || stdout}`));
    });
  });
}

async function createSkillPackageArchive(packageDir, options = {}) {
  const resolvedPackageDir = path.resolve(packageDir);
  const manifest = await loadValidatedManifest(resolvedPackageDir);
  const outputPath = path.resolve(
    options.outputPath || `${manifest.id}-${manifest.version}.tar.gz`
  );

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.rm(outputPath, { force: true });
  await runCommand('tar', ['-czf', outputPath, '-C', resolvedPackageDir, '.']);

  return {
    manifest,
    outputPath,
  };
}

module.exports = {
  createSkillPackageArchive,
};
