const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const https = require('node:https');
const { spawn } = require('node:child_process');

function isGitSource(sourcePath) {
  if (isRemoteArchiveSource(sourcePath)) {
    return false;
  }
  return /^(file|https?):\/\//.test(sourcePath) || /^git@/.test(sourcePath);
}

function isArchiveSource(sourcePath) {
  return /\.(tar\.gz|tgz)$/i.test(sourcePath);
}

function isRemoteArchiveSource(sourcePath) {
  return /^https?:\/\//i.test(sourcePath || '') && isArchiveSource(sourcePath);
}

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

function recordTempRoot(options, tempRoot) {
  if (typeof options.onTempRootCreated === 'function') {
    options.onTempRootCreated(tempRoot);
  }
}

async function cloneGitSource(sourcePath, options = {}) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-clone-'));
  recordTempRoot(options, tempRoot);
  const checkoutDir = path.join(tempRoot, 'repo');
  await runCommand('git', ['clone', sourcePath, checkoutDir], { cwd: tempRoot });
  if (options.ref) {
    await runCommand('git', ['checkout', options.ref], { cwd: checkoutDir });
  }
  return {
    tempRoot,
    resolvedSource: checkoutDir,
    sourceType: 'git',
  };
}

async function extractArchiveSource(sourcePath, options = {}) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-extract-'));
  recordTempRoot(options, tempRoot);
  const extractDir = path.join(tempRoot, 'package');
  await fs.mkdir(extractDir, { recursive: true });
  try {
    await runCommand('tar', ['-xzf', sourcePath, '-C', extractDir]);
  } catch {
    await fs.rm(tempRoot, { recursive: true, force: true });
    throw new Error(`Invalid skill package archive: unable to extract ${sourcePath}`);
  }
  return {
    tempRoot,
    resolvedSource: extractDir,
    sourceType: 'archive',
  };
}

function downloadArchiveToPath(sourceUrl, outputPath, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(sourceUrl);
    const transport = requestUrl.protocol === 'https:' ? https : http;
    let settled = false;
    let fileStream = null;
    const fail = (message) => {
      if (settled) {
        return;
      }
      settled = true;
      if (fileStream) {
        fileStream.destroy();
      }
      reject(new Error(message));
    };

    const request = transport.get(requestUrl, (response) => {
      const statusCode = response.statusCode || 0;

      if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
        if (redirectCount >= 5) {
          fail(`Failed to download archive: too many redirects for ${sourceUrl}`);
          return;
        }
        response.resume();
        const nextUrl = new URL(response.headers.location, requestUrl).toString();
        settled = true;
        resolve(downloadArchiveToPath(nextUrl, outputPath, redirectCount + 1));
        return;
      }

      if (statusCode !== 200) {
        response.resume();
        fail(`Failed to download archive: ${sourceUrl} returned ${statusCode}`);
        return;
      }

      fileStream = fsSync.createWriteStream(outputPath);
      response.pipe(fileStream);
      response.on('error', (error) => {
        fail(`Failed to download archive: ${error.message}`);
      });
      fileStream.on('finish', () => {
        if (settled) {
          return;
        }
        settled = true;
        fileStream.close(() => resolve(outputPath));
      });
      fileStream.on('error', (error) => {
        fail(`Failed to download archive: ${error.message}`);
      });
    });

    request.setTimeout(15000, () => {
      request.destroy(new Error('download timed out'));
    });
    request.on('error', (error) => {
      fail(`Failed to download archive: ${error.message}`);
    });
  });
}

async function downloadRemoteArchiveSource(sourcePath, options = {}) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-download-'));
  recordTempRoot(options, tempRoot);
  const archivePath = path.join(tempRoot, 'package.tgz');

  try {
    await downloadArchiveToPath(sourcePath, archivePath);
  } catch (error) {
    await fs.rm(tempRoot, { recursive: true, force: true });
    throw error;
  }

  return {
    tempRoot,
    archivePath,
  };
}

async function resolveSkillPackageSource(sourcePath, options = {}) {
  const originalSource = sourcePath;
  let resolvedSource = path.resolve(sourcePath);
  const tempRoots = [];
  let sourceType = 'directory';

  try {
    if (isGitSource(sourcePath)) {
      const cloneResult = await cloneGitSource(sourcePath, options);
      resolvedSource = cloneResult.resolvedSource;
      tempRoots.push(cloneResult.tempRoot);
      sourceType = cloneResult.sourceType;
    } else if (isRemoteArchiveSource(sourcePath)) {
      const downloadResult = await downloadRemoteArchiveSource(sourcePath, options);
      tempRoots.push(downloadResult.tempRoot);
      const extractResult = await extractArchiveSource(downloadResult.archivePath, options);
      resolvedSource = extractResult.resolvedSource;
      tempRoots.push(extractResult.tempRoot);
      sourceType = extractResult.sourceType;
    } else if (isArchiveSource(sourcePath)) {
      const extractResult = await extractArchiveSource(resolvedSource, options);
      resolvedSource = extractResult.resolvedSource;
      tempRoots.push(extractResult.tempRoot);
      sourceType = extractResult.sourceType;
    }

    if (options.subdir) {
      resolvedSource = path.join(resolvedSource, options.subdir);
    }
  } catch (error) {
    for (const tempRoot of tempRoots) {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
    throw error;
  }

  return {
    originalSource,
    resolvedSource,
    sourceType,
    sourceRef: options.ref || null,
    async cleanup() {
      for (const tempRoot of tempRoots) {
        await fs.rm(tempRoot, { recursive: true, force: true });
      }
    },
  };
}

module.exports = {
  resolveSkillPackageSource,
};
