const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const examplePackageDir = path.join(rootDir, 'skill-package.example');

function runNode(args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: rootDir,
      ...options,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      ...options,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function createGitRepoFromExample() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-git-repo-'));
  const repoDir = path.join(tempDir, 'repo');
  await fs.mkdir(repoDir, { recursive: true });
  await fs.cp(examplePackageDir, repoDir, { recursive: true });

  let result = await runCommand('git', ['init'], { cwd: repoDir });
  assert.equal(result.code, 0);
  result = await runCommand('git', ['config', 'user.name', 'Book To Skill Test'], { cwd: repoDir });
  assert.equal(result.code, 0);
  result = await runCommand('git', ['config', 'user.email', 'test@example.com'], { cwd: repoDir });
  assert.equal(result.code, 0);
  result = await runCommand('git', ['add', '.'], { cwd: repoDir });
  assert.equal(result.code, 0);
  result = await runCommand('git', ['commit', '-m', 'init'], { cwd: repoDir });
  assert.equal(result.code, 0);

  return {
    repoDir,
    repoUrl: `file://${repoDir}`,
  };
}

async function createGitRepoWithAlternateRef() {
  const { repoDir, repoUrl } = await createGitRepoFromExample();
  const branchName = 'alternate-release';
  const tagName = 'v1.0.0';

  let result = await runCommand('git', ['tag', tagName], { cwd: repoDir });
  assert.equal(result.code, 0);

  result = await runCommand('git', ['checkout', '-b', branchName], { cwd: repoDir });
  assert.equal(result.code, 0);

  const manifestPath = path.join(repoDir, 'skill.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  manifest.version = '2.0.0';
  manifest.name = 'Pyramid Writing Skill Alternate';
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  result = await runCommand('git', ['add', 'skill.json'], { cwd: repoDir });
  assert.equal(result.code, 0);
  result = await runCommand('git', ['commit', '-m', 'alternate release'], { cwd: repoDir });
  assert.equal(result.code, 0);
  result = await runCommand('git', ['checkout', '-'], { cwd: repoDir });
  assert.equal(result.code, 0);

  return {
    repoDir,
    repoUrl,
    branchName,
    tagName,
  };
}

async function createMultiSkillGitRepo() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-git-multi-'));
  const repoDir = path.join(tempDir, 'repo');
  const nestedSkillDir = path.join(repoDir, 'skills', 'pyramid-writing-skill');
  await fs.mkdir(path.dirname(nestedSkillDir), { recursive: true });
  await fs.cp(examplePackageDir, nestedSkillDir, { recursive: true });

  let result = await runCommand('git', ['init'], { cwd: repoDir });
  assert.equal(result.code, 0);
  result = await runCommand('git', ['config', 'user.name', 'Book To Skill Test'], { cwd: repoDir });
  assert.equal(result.code, 0);
  result = await runCommand('git', ['config', 'user.email', 'test@example.com'], { cwd: repoDir });
  assert.equal(result.code, 0);
  result = await runCommand('git', ['add', '.'], { cwd: repoDir });
  assert.equal(result.code, 0);
  result = await runCommand('git', ['commit', '-m', 'init'], { cwd: repoDir });
  assert.equal(result.code, 0);

  return {
    repoDir,
    repoUrl: `file://${repoDir}`,
    subdir: 'skills/pyramid-writing-skill',
  };
}

async function createArchiveWithoutSkillJson() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-invalid-archive-'));
  const sourceDir = path.join(tempDir, 'package');
  const archivePath = path.join(tempDir, 'missing-skill-json.tar.gz');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.writeFile(path.join(sourceDir, 'README.md'), '# invalid archive\n', 'utf8');

  const result = await runCommand('tar', ['-czf', archivePath, '-C', sourceDir, '.']);
  assert.equal(result.code, 0);

  return archivePath;
}

async function listTmpEntriesWithPrefix(prefix) {
  const names = await fs.readdir(os.tmpdir());
  return new Set(names.filter((name) => name.startsWith(prefix)));
}

function getAddedEntries(before, after) {
  const added = [];
  for (const entry of after) {
    if (!before.has(entry)) {
      added.push(entry);
    }
  }
  return added;
}

async function createInvalidArchiveServer() {
  const server = http.createServer((req, res) => {
    if (req.url !== '/broken.tar.gz') {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    res.statusCode = 200;
    res.setHeader('content-type', 'application/gzip');
    res.end('not-a-real-tarball');
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}/broken.tar.gz`,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

test('installSkillPackage copies a package into the target store and updates registry', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-install-'));
  const storeDir = path.join(tempDir, 'skills');
  const { installSkillPackage } = require('../src/install');

  const result = await installSkillPackage(examplePackageDir, { storeRoot: storeDir });

  const installedDir = path.join(storeDir, 'pyramid-writing-skill@1.0.0');
  const registryPath = path.join(storeDir, 'registry.json');
  const installedManifest = JSON.parse(
    await fs.readFile(path.join(installedDir, 'skill.json'), 'utf8')
  );
  const registry = JSON.parse(await fs.readFile(registryPath, 'utf8'));

  assert.equal(result.installedPath, installedDir);
  assert.equal(installedManifest.id, 'pyramid-writing-skill');
  assert.equal(registry.skills[0].defaultAdapter, 'generic');
});

test('CLI install command installs a skill package from a local path', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-cli-'));
  const storeDir = path.join(tempDir, 'skills');

  const result = await runNode(
    ['src/cli.js', 'install', examplePackageDir, '--store', storeDir],
    {}
  );

  const installedDir = path.join(storeDir, 'pyramid-writing-skill@1.0.0');
  const stat = await fs.stat(path.join(installedDir, 'spec.json'));

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Installed pyramid-writing-skill@1.0.0/);
  assert.equal(stat.isFile(), true);
});

test('installSkillPackage rejects directories without skill.json', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-invalid-'));
  const invalidPackageDir = path.join(tempDir, 'invalid-skill');
  await fs.mkdir(invalidPackageDir, { recursive: true });
  const { installSkillPackage } = require('../src/install');

  await assert.rejects(
    () => installSkillPackage(invalidPackageDir, { storeRoot: path.join(tempDir, 'skills') }),
    /skill\.json/
  );
});

test('listInstalledSkills returns registry entries from the target store', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-list-'));
  const storeDir = path.join(tempDir, 'skills');
  const { installSkillPackage, listInstalledSkills } = require('../src/install');

  await installSkillPackage(examplePackageDir, { storeRoot: storeDir });
  const skills = await listInstalledSkills({ storeRoot: storeDir });

  assert.equal(skills.length, 1);
  assert.equal(skills[0].id, 'pyramid-writing-skill');
  assert.equal(skills[0].version, '1.0.0');
});

test('uninstallSkillPackage removes installed files and registry entry', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-uninstall-'));
  const storeDir = path.join(tempDir, 'skills');
  const { installSkillPackage, uninstallSkillPackage, listInstalledSkills } = require('../src/install');

  await installSkillPackage(examplePackageDir, { storeRoot: storeDir });
  const removed = await uninstallSkillPackage('pyramid-writing-skill@1.0.0', { storeRoot: storeDir });
  const skills = await listInstalledSkills({ storeRoot: storeDir });

  await assert.rejects(
    () => fs.stat(path.join(storeDir, 'pyramid-writing-skill@1.0.0')),
    /ENOENT/
  );
  assert.equal(removed.id, 'pyramid-writing-skill');
  assert.equal(skills.length, 0);
});

test('CLI list and uninstall commands manage local installed skills', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-cli-manage-'));
  const storeDir = path.join(tempDir, 'skills');

  const installResult = await runNode(['src/cli.js', 'install', examplePackageDir, '--store', storeDir]);
  const listResult = await runNode(['src/cli.js', 'list', '--store', storeDir]);
  const uninstallResult = await runNode([
    'src/cli.js',
    'uninstall',
    'pyramid-writing-skill@1.0.0',
    '--store',
    storeDir,
  ]);
  const listAfterUninstallResult = await runNode(['src/cli.js', 'list', '--store', storeDir]);

  assert.equal(installResult.code, 0);
  assert.equal(listResult.code, 0);
  assert.match(listResult.stdout, /pyramid-writing-skill@1.0.0/);
  assert.equal(uninstallResult.code, 0);
  assert.match(uninstallResult.stdout, /Uninstalled pyramid-writing-skill@1.0.0/);
  assert.equal(listAfterUninstallResult.code, 0);
  assert.doesNotMatch(listAfterUninstallResult.stdout, /pyramid-writing-skill@1.0.0/);
});

test('installSkillPackage installs a skill package from a git file URL', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-git-install-'));
  const storeDir = path.join(tempDir, 'skills');
  const { repoUrl } = await createGitRepoFromExample();
  const { installSkillPackage } = require('../src/install');

  const result = await installSkillPackage(repoUrl, { storeRoot: storeDir });
  const installedManifest = JSON.parse(
    await fs.readFile(path.join(result.installedPath, 'skill.json'), 'utf8')
  );

  assert.equal(installedManifest.id, 'pyramid-writing-skill');
  assert.equal(result.manifest.id, 'pyramid-writing-skill');
});

test('CLI install command installs a skill package from a git file URL', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-cli-git-'));
  const storeDir = path.join(tempDir, 'skills');
  const { repoUrl } = await createGitRepoFromExample();

  const result = await runNode(['src/cli.js', 'install', repoUrl, '--store', storeDir]);
  const installedDir = path.join(storeDir, 'pyramid-writing-skill@1.0.0');
  const stat = await fs.stat(path.join(installedDir, 'spec.json'));

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Installed pyramid-writing-skill@1.0.0/);
  assert.equal(stat.isFile(), true);
});

test('installSkillPackage installs from a local subdirectory when subdir is specified', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-local-subdir-'));
  const sourceRoot = path.join(tempDir, 'repo');
  const nestedSkillDir = path.join(sourceRoot, 'skills', 'pyramid-writing-skill');
  const storeDir = path.join(tempDir, 'skills-store');
  await fs.mkdir(path.dirname(nestedSkillDir), { recursive: true });
  await fs.cp(examplePackageDir, nestedSkillDir, { recursive: true });
  const { installSkillPackage } = require('../src/install');

  const result = await installSkillPackage(sourceRoot, {
    storeRoot: storeDir,
    subdir: 'skills/pyramid-writing-skill',
  });

  const stat = await fs.stat(path.join(result.installedPath, 'skill.json'));
  assert.equal(result.manifest.id, 'pyramid-writing-skill');
  assert.equal(stat.isFile(), true);
});

test('installSkillPackage installs from a git repo subdirectory when subdir is specified', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-git-subdir-'));
  const storeDir = path.join(tempDir, 'skills');
  const { repoUrl, subdir } = await createMultiSkillGitRepo();
  const { installSkillPackage } = require('../src/install');

  const result = await installSkillPackage(repoUrl, { storeRoot: storeDir, subdir });
  const stat = await fs.stat(path.join(result.installedPath, 'skill.json'));

  assert.equal(result.manifest.id, 'pyramid-writing-skill');
  assert.equal(stat.isFile(), true);
});

test('CLI install command installs from a git repo subdirectory via --subdir', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-cli-subdir-'));
  const storeDir = path.join(tempDir, 'skills');
  const { repoUrl, subdir } = await createMultiSkillGitRepo();

  const result = await runNode([
    'src/cli.js',
    'install',
    repoUrl,
    '--subdir',
    subdir,
    '--store',
    storeDir,
  ]);
  const installedDir = path.join(storeDir, 'pyramid-writing-skill@1.0.0');
  const stat = await fs.stat(path.join(installedDir, 'spec.json'));

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Installed pyramid-writing-skill@1.0.0/);
  assert.equal(stat.isFile(), true);
});

test('installSkillPackage installs from the requested git ref when ref is specified', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-git-ref-'));
  const storeDir = path.join(tempDir, 'skills');
  const { repoUrl, branchName } = await createGitRepoWithAlternateRef();
  const { installSkillPackage } = require('../src/install');

  const result = await installSkillPackage(repoUrl, { storeRoot: storeDir, ref: branchName });
  const installedManifest = JSON.parse(
    await fs.readFile(path.join(result.installedPath, 'skill.json'), 'utf8')
  );

  assert.equal(result.manifest.version, '2.0.0');
  assert.equal(installedManifest.version, '2.0.0');
});

test('CLI install command installs from the requested git ref via --ref', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-cli-ref-'));
  const storeDir = path.join(tempDir, 'skills');
  const { repoUrl, branchName } = await createGitRepoWithAlternateRef();

  const result = await runNode([
    'src/cli.js',
    'install',
    repoUrl,
    '--ref',
    branchName,
    '--store',
    storeDir,
  ]);
  const installedDir = path.join(storeDir, 'pyramid-writing-skill@2.0.0');
  const stat = await fs.stat(path.join(installedDir, 'skill.json'));

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Installed pyramid-writing-skill@2.0.0/);
  assert.equal(stat.isFile(), true);
});

test('installSkillPackage installs a skill package from a local .tar.gz archive', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-archive-install-'));
  const storeDir = path.join(tempDir, 'skills');
  const archivePath = path.join(tempDir, 'pyramid-writing-skill-1.0.0.tar.gz');
  const { createSkillPackageArchive } = require('../src/pack');
  const { installSkillPackage } = require('../src/install');

  await createSkillPackageArchive(examplePackageDir, { outputPath: archivePath });
  const result = await installSkillPackage(archivePath, { storeRoot: storeDir });
  const installedManifest = JSON.parse(
    await fs.readFile(path.join(result.installedPath, 'skill.json'), 'utf8')
  );

  assert.equal(result.manifest.id, 'pyramid-writing-skill');
  assert.equal(installedManifest.version, '1.0.0');
});

test('CLI install command installs a skill package from a local .tar.gz archive', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-cli-archive-install-'));
  const storeDir = path.join(tempDir, 'skills');
  const archivePath = path.join(tempDir, 'pyramid-writing-skill-1.0.0.tar.gz');
  const { createSkillPackageArchive } = require('../src/pack');

  await createSkillPackageArchive(examplePackageDir, { outputPath: archivePath });
  const result = await runNode([
    'src/cli.js',
    'install',
    archivePath,
    '--store',
    storeDir,
  ]);
  const installedDir = path.join(storeDir, 'pyramid-writing-skill@1.0.0');
  const stat = await fs.stat(path.join(installedDir, 'skill.json'));

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Installed pyramid-writing-skill@1.0.0/);
  assert.equal(stat.isFile(), true);
});

test('installSkillPackage rejects invalid .tar.gz files with an archive-specific error', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-bad-archive-'));
  const storeDir = path.join(tempDir, 'skills');
  const archivePath = path.join(tempDir, 'broken.tar.gz');
  const { installSkillPackage } = require('../src/install');

  await fs.writeFile(archivePath, 'this is not a tarball', 'utf8');

  await assert.rejects(
    () => installSkillPackage(archivePath, { storeRoot: storeDir }),
    /invalid skill package archive/i
  );
});

test('installSkillPackage cleans extract temp dirs when local archive extraction fails', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-bad-archive-cleanup-'));
  const storeDir = path.join(tempDir, 'skills');
  const archivePath = path.join(tempDir, 'broken.tar.gz');
  const { installSkillPackage } = require('../src/install');
  const createdTempRoots = [];

  await fs.writeFile(archivePath, 'this is not a tarball', 'utf8');

  await assert.rejects(
    () =>
      installSkillPackage(archivePath, {
        storeRoot: storeDir,
        onTempRootCreated(tempRoot) {
          createdTempRoots.push(tempRoot);
        },
      }),
    /invalid skill package archive/i
  );

  assert.equal(createdTempRoots.length > 0, true);
  for (const tempRoot of createdTempRoots) {
    await assert.rejects(() => fs.access(tempRoot), /ENOENT/);
  }
});

test('installSkillPackage cleans download and extract temp dirs when remote archive extraction fails', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-bad-remote-archive-cleanup-'));
  const storeDir = path.join(tempDir, 'skills');
  const { installSkillPackage } = require('../src/install');
  const server = await createInvalidArchiveServer();
  const createdTempRoots = [];

  try {
    await assert.rejects(
      () =>
        installSkillPackage(server.url, {
          storeRoot: storeDir,
          onTempRootCreated(tempRoot) {
            createdTempRoots.push(tempRoot);
          },
        }),
      /invalid skill package archive/i
    );
  } finally {
    await server.close();
  }

  assert.equal(createdTempRoots.length >= 2, true);
  for (const tempRoot of createdTempRoots) {
    await assert.rejects(() => fs.access(tempRoot), /ENOENT/);
  }
});

test('CLI install command rejects archives without skill.json with a clear error', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-cli-missing-skill-json-'));
  const storeDir = path.join(tempDir, 'skills');
  const archivePath = await createArchiveWithoutSkillJson();

  const result = await runNode([
    'src/cli.js',
    'install',
    archivePath,
    '--store',
    storeDir,
  ]);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /invalid skill package archive/i);
});
