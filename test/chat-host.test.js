const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { Readable, Writable } = require('node:stream');
const {
  createFakeCodexCommand,
  installExampleSkill,
} = require('./helpers/skill-test-helpers');
const { launchCodex } = require('../src/chat/launch-codex');

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
    child.on('error', (error) => {
      stderr += error.message;
      resolve({ code: 1, stdout, stderr });
    });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function createExampleArchive() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-archive-'));
  const archivePath = path.join(tempDir, 'pyramid-writing-skill-1.0.0.tar.gz');
  const { createSkillPackageArchive } = require('../src/pack');
  await createSkillPackageArchive(examplePackageDir, { outputPath: archivePath });
  return archivePath;
}

async function createVersionedExampleArchive(version) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-versioned-'));
  const packageDir = path.join(tempDir, `skill-${version}`);
  const archivePath = path.join(tempDir, `pyramid-writing-skill-${version}.tar.gz`);
  await fs.cp(examplePackageDir, packageDir, { recursive: true });
  const manifestPath = path.join(packageDir, 'skill.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  manifest.version = version;
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const { createSkillPackageArchive } = require('../src/pack');
  await createSkillPackageArchive(packageDir, { outputPath: archivePath });
  return archivePath;
}

async function createArchiveServer() {
  const archivePath = await createExampleArchive();
  const archiveBuffer = await fs.readFile(archivePath);
  const server = http.createServer((req, res) => {
    if (req.url !== '/skill.tar.gz') {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    res.statusCode = 200;
    res.setHeader('content-type', 'application/gzip');
    res.end(archiveBuffer);
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}/skill.tar.gz`,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

async function createDelayedExitCodexCommand(delayMs = 1200) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-fake-codex-delayed-'));
  const commandPath = path.join(tempDir, process.platform === 'win32' ? 'codex.cmd' : 'codex');
  const commandSource = process.platform === 'win32'
    ? `@echo off\r\nnode -e "setTimeout(() => process.exit(0), ${delayMs})"\r\n`
    : `#!/usr/bin/env node\nsetTimeout(() => process.exit(0), ${delayMs});\n`;

  await fs.writeFile(commandPath, commandSource, 'utf8');
  if (process.platform !== 'win32') {
    await fs.chmod(commandPath, 0o755);
  }

  return {
    commandPath,
    delayMs,
  };
}

async function createStdinEofCodexCommand({ timeoutMs = 1600 } = {}) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-fake-codex-stdin-eof-'));
  const commandPath = path.join(tempDir, process.platform === 'win32' ? 'codex.cmd' : 'codex');
  const commandSource = process.platform === 'win32'
    ? `@echo off\r\nnode -e "const timer=setTimeout(() => process.exit(9), ${timeoutMs});process.stdin.resume();process.stdin.on('end',()=>{clearTimeout(timer);console.log('stdin eof received');process.exit(0);});"\r\n`
    : `#!/usr/bin/env node\nconst timer=setTimeout(() => process.exit(9), ${timeoutMs});\nprocess.stdin.resume();\nprocess.stdin.on('end',()=>{clearTimeout(timer);console.log('stdin eof received');process.exit(0);});\n`;

  await fs.writeFile(commandPath, commandSource, 'utf8');
  if (process.platform !== 'win32') {
    await fs.chmod(commandPath, 0o755);
  }

  return {
    commandPath,
    timeoutMs,
  };
}

async function createNonZeroExitCodexCommand(exitCode = 7) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-fake-codex-non-zero-'));
  const commandPath = path.join(tempDir, process.platform === 'win32' ? 'codex.cmd' : 'codex');
  const commandSource = process.platform === 'win32'
    ? `@echo off\r\nnode -e "process.exit(${exitCode})"\r\n`
    : `#!/usr/bin/env node\nprocess.exit(${exitCode});\n`;

  await fs.writeFile(commandPath, commandSource, 'utf8');
  if (process.platform !== 'win32') {
    await fs.chmod(commandPath, 0o755);
  }

  return {
    commandPath,
    exitCode,
  };
}

test('CLI chat command enters host mode with no active skill', async () => {
  const result = await runNode(['src/cli.js', 'chat'], {
    env: { ...process.env, BTS_CHAT_SCRIPT: '/exit\n' },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /BOOK-TO-SKILL/i);
  assert.match(result.stdout, /NO SKILL SELECTED/i);
});

test('launchCodex resolves quickly in inherit mode after successful spawn', async () => {
  const { commandPath, delayMs } = await createDelayedExitCodexCommand(1200);
  const start = Date.now();
  const result = await launchCodex({
    codexBin: commandPath,
    stdio: 'inherit',
  });
  const elapsedMs = Date.now() - start;

  assert.equal(result.ok, true);
  assert.ok(elapsedMs < delayMs / 2, `expected fast resolve, got ${elapsedMs}ms`);
});

test('launchCodex closes stdin in pipe mode and resolves after EOF-driven child exit', async () => {
  const { commandPath } = await createStdinEofCodexCommand({ timeoutMs: 200 });
  let captured = '';
  const output = new Writable({
    write(chunk, encoding, callback) {
      captured += chunk.toString();
      callback();
    },
  });
  const result = await launchCodex({
    codexBin: commandPath,
    stdio: 'pipe',
    stdout: output,
    stderr: output,
  });

  assert.equal(result.ok, true);
  assert.equal(result.exitCode, 0);
  assert.match(captured, /stdin eof received/);
});

test('CLI install supports flag-before-positional ordering', async () => {
  const archivePath = await createExampleArchive();
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-install-flag-order-'));
  const result = await runNode(
    ['src/cli.js', 'install', '--store', storeDir, archivePath],
    {}
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Installed pyramid-writing-skill@1.0.0/i);
});

test('CLI chat installs a local tarball before entering host mode', async () => {
  const archivePath = await createExampleArchive();
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-store-'));
  const result = await runNode(
    ['src/cli.js', 'chat', archivePath, '--store', storeDir],
    {
      env: { ...process.env, BTS_CHAT_SCRIPT: '/exit\n' },
    }
  );

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Installed pyramid-writing-skill@1.0.0/i);
  assert.match(result.stdout, /NO SKILL SELECTED/i);
});

test('chat accepts a remote tarball URL', async () => {
  const server = await createArchiveServer();
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-remote-store-'));
  try {
    const result = await runNode(['src/cli.js', 'chat', server.url, '--store', storeDir], {
      env: { ...process.env, BTS_CHAT_SCRIPT: '/exit\n' },
    });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /Installed pyramid-writing-skill@1.0.0/i);
  } finally {
    await server.close();
  }
});

test('host commands /help /info /quit work before a skill is selected', async () => {
  const result = await runNode(['src/cli.js', 'chat'], {
    env: { ...process.env, BTS_CHAT_SCRIPT: '/help\n/info\n/quit\n' },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /\/skill/i);
  assert.match(result.stdout, /NO SKILL SELECTED/i);
});

test('host welcome shows a startup tip for choosing a skill', async () => {
  const result = await runNode(['src/cli.js', 'chat'], {
    env: { ...process.env, BTS_CHAT_SCRIPT: '/exit\n' },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Tip:\s+Type '\/skill' to choose an installed skill/i);
});

test('host unknown slash command shows a clear hint', async () => {
  const result = await runNode(['src/cli.js', 'chat'], {
    env: { ...process.env, BTS_CHAT_SCRIPT: '/unknown\n/exit\n' },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Unknown command: \/unknown/);
});

test('host /exit prints exit message', async () => {
  const result = await runNode(['src/cli.js', 'chat'], {
    env: { ...process.env, BTS_CHAT_SCRIPT: '/exit\n' },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Exiting chat host\./);
});

test('host free text before skill selection shows guidance message', async () => {
  const result = await runNode(['src/cli.js', 'chat'], {
    env: { ...process.env, BTS_CHAT_SCRIPT: 'hello host\n/exit\n' },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Use \/skill to choose one\./i);
});

test('/skill lists installed skills and rejects numeric selection', async () => {
  const archivePath = await createExampleArchive();
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-skill-select-'));
  const codexSkillsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-codex-skills-'));
  const result = await runNode(['src/cli.js', 'chat', archivePath, '--store', storeDir], {
    env: {
      ...process.env,
      BTS_CHAT_SCRIPT: '/skill\n1\npyramid-writing-skill@1.0.0\n/info\n/exit\n',
      BTS_CODEX_SKILLS_ROOT: codexSkillsRoot,
      BTS_CODEX_BIN: path.join(codexSkillsRoot, 'missing-codex-bin'),
    },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /-\s+pyramid-writing-skill@1\.0\.0/);
  assert.doesNotMatch(result.stdout, /1\.\s+pyramid-writing-skill@1\.0\.0/);
  assert.match(result.stdout, /Invalid skill selection/i);
  assert.match(result.stdout, /Active skill: pyramid-writing-skill@1\.0\.0/);
  assert.match(result.stdout, /Active skill: pyramid-writing-skill@1\.0\.0/);
});

test('/skill supports exact skill id selection', async () => {
  const archivePath = await createExampleArchive();
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-skill-id-select-'));
  const codexSkillsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-id-codex-skills-'));
  const result = await runNode(['src/cli.js', 'chat', archivePath, '--store', storeDir], {
    env: {
      ...process.env,
      BTS_CHAT_SCRIPT: '/skill\npyramid-writing-skill\n/info\n/exit\n',
      BTS_CODEX_SKILLS_ROOT: codexSkillsRoot,
      BTS_CODEX_BIN: path.join(codexSkillsRoot, 'missing-codex-bin'),
    },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Active skill: pyramid-writing-skill@1\.0\.0/);
});

test('/skill supports exact id@version selection', async () => {
  const archivePath = await createExampleArchive();
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-skill-id-version-select-'));
  const codexSkillsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-id-version-codex-skills-'));
  const result = await runNode(['src/cli.js', 'chat', archivePath, '--store', storeDir], {
    env: {
      ...process.env,
      BTS_CHAT_SCRIPT: '/skill\npyramid-writing-skill@1.0.0\n/info\n/exit\n',
      BTS_CODEX_SKILLS_ROOT: codexSkillsRoot,
      BTS_CODEX_BIN: path.join(codexSkillsRoot, 'missing-codex-bin'),
    },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Active skill: pyramid-writing-skill@1\.0\.0/);
});

test('/skill selection redraws host status with selected skill version', async () => {
  const archivePath = await createExampleArchive();
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-selected-status-'));
  const codexSkillsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-status-codex-'));
  const result = await runNode(['src/cli.js', 'chat', archivePath, '--store', storeDir], {
    env: {
      ...process.env,
      BTS_CHAT_SCRIPT: '/skill\npyramid-writing-skill@1.0.0\n/exit\n',
      BTS_CODEX_SKILLS_ROOT: codexSkillsRoot,
      BTS_CODEX_BIN: path.join(codexSkillsRoot, 'missing-codex-bin'),
    },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /STATUS : pyramid-writing-skill@1\.0\.0/);
});

test('/skill shows empty-state when no skills are installed', async () => {
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-empty-skill-list-'));
  const result = await runNode(['src/cli.js', 'chat', '--store', storeDir], {
    env: { ...process.env, BTS_CHAT_SCRIPT: '/skill\n/exit\n' },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /No installed skills/i);
});

test('/skill shows a tip for exact id selection after listing installed skills', async () => {
  const archivePath = await createExampleArchive();
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-tip-select-'));
  const result = await runNode(['src/cli.js', 'chat', archivePath, '--store', storeDir], {
    env: { ...process.env, BTS_CHAT_SCRIPT: '/skill\n/exit\n' },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Installed skills:/i);
  assert.match(result.stdout, /Tip:\s+Type the exact skill id or id@version/i);
});

test('/skill invalid selection shows retry hint and keeps host alive', async () => {
  const archivePath = await createExampleArchive();
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-invalid-skill-select-'));
  const result = await runNode(['src/cli.js', 'chat', archivePath, '--store', storeDir], {
    env: { ...process.env, BTS_CHAT_SCRIPT: '/skill\n999\n/exit\n' },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Invalid skill selection/i);
  assert.match(result.stdout, /Exiting chat host\./);
});

test('/inputs shows installed schema fields after choosing an active skill', async () => {
  const archivePath = await createExampleArchive();
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-inputs-'));
  const codexSkillsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-inputs-codex-'));
  const result = await runNode(['src/cli.js', 'chat', archivePath, '--store', storeDir], {
    env: {
      ...process.env,
      BTS_CHAT_SCRIPT: '/skill\npyramid-writing-skill@1.0.0\n/inputs\n/exit\n',
      BTS_CODEX_SKILLS_ROOT: codexSkillsRoot,
      BTS_CODEX_BIN: path.join(codexSkillsRoot, 'missing-codex-bin'),
    },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Inputs schema fields/i);
  assert.match(result.stdout, /\bgoal\b/i);
});

test('/reset clears current skill session context and prints reset message', async () => {
  const archivePath = await createExampleArchive();
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-reset-'));
  const codexSkillsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-reset-codex-'));
  const result = await runNode(['src/cli.js', 'chat', archivePath, '--store', storeDir], {
    env: {
      ...process.env,
      BTS_CHAT_SCRIPT: '/skill\npyramid-writing-skill@1.0.0\nhello runtime\n/reset\n/exit\n',
      BTS_CODEX_SKILLS_ROOT: codexSkillsRoot,
      BTS_CODEX_BIN: path.join(codexSkillsRoot, 'missing-codex-bin'),
    },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Session reset\./i);
});

test('/skill selection syncs to Codex and falls back when codex is unavailable', async () => {
  const { storeRoot } = await installExampleSkill();
  const codexSkillsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-codex-missing-'));
  const result = await runNode(['src/cli.js', 'chat', '--store', storeRoot], {
    env: {
      ...process.env,
      BTS_CHAT_SCRIPT: '/skill\npyramid-writing-skill@1.0.0\n/exit\n',
      BTS_CODEX_SKILLS_ROOT: codexSkillsRoot,
      BTS_CODEX_BIN: path.join(codexSkillsRoot, 'missing-codex-bin'),
    },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Installed Codex skill:/);
  assert.match(result.stdout, /Open Codex manually/);
  assert.match(result.stdout, /Tip:\s+Please run the command above to open Codex\./i);
});

test('successful /skill selection launches Codex handoff', async () => {
  const { storeRoot } = await installExampleSkill();
  const { commandPath } = await createFakeCodexCommand();
  const codexSkillsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-codex-launch-'));
  const result = await runNode(['src/cli.js', 'chat', '--store', storeRoot], {
    env: {
      ...process.env,
      BTS_CHAT_SCRIPT: '/skill\npyramid-writing-skill@1.0.0\n',
      BTS_CODEX_SKILLS_ROOT: codexSkillsRoot,
      BTS_CODEX_BIN: commandPath,
    },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Launching Codex/);
  assert.match(result.stdout, /fake codex started/);
  assert.match(result.stdout, /Tip:\s+Codex is opening for you now\./i);
});

test('sync failure for missing source skill files keeps host alive', async () => {
  const { installedSkill, storeRoot } = await installExampleSkill();
  const codexSkillsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-codex-sync-fail-'));
  await fs.rm(path.join(installedSkill.installedPath, 'system.md'), { force: true });
  const result = await runNode(['src/cli.js', 'chat', '--store', storeRoot], {
    env: {
      ...process.env,
      BTS_CHAT_SCRIPT: '/skill\npyramid-writing-skill@1.0.0\n/exit\n',
      BTS_CODEX_SKILLS_ROOT: codexSkillsRoot,
      BTS_CODEX_BIN: path.join(codexSkillsRoot, 'missing-codex-bin'),
    },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Failed to install Codex skill/);
  assert.match(result.stdout, /Exiting chat host\./);
});

test('unexpected spawn failure keeps host alive after /skill selection', async () => {
  const { storeRoot } = await installExampleSkill();
  const codexSkillsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-codex-spawn-fail-'));
  const result = await runNode(['src/cli.js', 'chat', '--store', storeRoot], {
    env: {
      ...process.env,
      BTS_CHAT_SCRIPT: '/skill\npyramid-writing-skill@1.0.0\n/exit\n',
      BTS_CODEX_SKILLS_ROOT: codexSkillsRoot,
      BTS_CODEX_BIN: '/',
    },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Failed to launch Codex/);
  assert.match(result.stdout, /Exiting chat host\./);
});

test('/skill selection keeps host alive when codex exits non-zero', async () => {
  const { storeRoot } = await installExampleSkill();
  const { commandPath, exitCode } = await createNonZeroExitCodexCommand(7);
  const codexSkillsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-codex-non-zero-'));
  const result = await runNode(['src/cli.js', 'chat', '--store', storeRoot], {
    env: {
      ...process.env,
      BTS_CHAT_SCRIPT: '/skill\npyramid-writing-skill@1.0.0\n/exit\n',
      BTS_CODEX_SKILLS_ROOT: codexSkillsRoot,
      BTS_CODEX_BIN: commandPath,
    },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Failed to launch Codex/);
  assert.match(result.stdout, new RegExp(`exit code\\s*${exitCode}`));
  assert.match(result.stdout, /Exiting chat host\./);
});

test('active skill can re-enter /skill flow and switch selection', async () => {
  const archiveV1 = await createExampleArchive();
  const archiveV2 = await createVersionedExampleArchive('2.0.0');
  const storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-reskill-'));
  const codexSkillsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-chat-reskill-codex-'));
  await runNode(['src/cli.js', 'install', '--store', storeDir, archiveV1]);
  await runNode(['src/cli.js', 'install', '--store', storeDir, archiveV2]);

  const result = await runNode(['src/cli.js', 'chat', '--store', storeDir], {
    env: {
      ...process.env,
      BTS_CHAT_SCRIPT: '/skill\npyramid-writing-skill@1.0.0\n/info\n/skill\npyramid-writing-skill@2.0.0\n/info\n/exit\n',
      BTS_CODEX_SKILLS_ROOT: codexSkillsRoot,
      BTS_CODEX_BIN: path.join(codexSkillsRoot, 'missing-codex-bin'),
    },
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /-\s+pyramid-writing-skill@1\.0\.0/);
  assert.match(result.stdout, /-\s+pyramid-writing-skill@2\.0\.0/);
  assert.match(result.stdout, /Active skill: pyramid-writing-skill@1\.0\.0/);
  assert.match(result.stdout, /Active skill: pyramid-writing-skill@2\.0\.0/);
});

test('host welcome output degrades cleanly without ANSI in non-TTY', async () => {
  const result = await runNode(['src/cli.js', 'chat'], {
    env: { ...process.env, BTS_CHAT_SCRIPT: '/exit\n' },
  });

  assert.equal(result.code, 0);
  assert.doesNotMatch(result.stdout, /\u001B\[[0-9;]*m/);
});

test('empty BTS_CHAT_SCRIPT is treated as no script input', async () => {
  const { runChatHost } = require('../src/chat');
  const stdin = Readable.from(['/exit\n']);
  let captured = '';
  const stdout = new Writable({
    write(chunk, encoding, callback) {
      captured += chunk.toString();
      callback();
    },
  });

  await runChatHost({
    script: '',
    stdin,
    stdout,
    stderr: stdout,
    storeRoot: '/tmp/book-to-skill-chat-test-store',
  });

  assert.match(captured, /Exiting chat host\./);
});
