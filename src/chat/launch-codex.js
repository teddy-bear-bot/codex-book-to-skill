const { spawn } = require('node:child_process');

function resolveCodexCommand(options = {}) {
  return options.codexBin || process.env.BTS_CODEX_BIN || 'codex';
}

async function launchCodex(options = {}) {
  const command = resolveCodexCommand(options);
  const stdio = options.stdio || 'pipe';
  const waitForClose = stdio !== 'inherit';
  const output = options.stdout || process.stdout;
  const errorOutput = options.stderr || process.stderr;

  return new Promise((resolve) => {
    let finished = false;
    const finish = (result) => {
      if (finished) {
        return;
      }
      finished = true;
      resolve(result);
    };

    const child = spawn(command, {
      stdio,
      shell: false,
    });

    if (stdio !== 'inherit') {
      if (child.stdout) {
        child.stdout.on('data', (chunk) => {
          output.write(chunk);
        });
      }
      if (child.stderr) {
        child.stderr.on('data', (chunk) => {
          errorOutput.write(chunk);
        });
      }
    }

    child.once('error', (spawnError) => {
      if (spawnError.code === 'ENOENT') {
        finish({ ok: false, reason: 'missing_command', command });
        return;
      }
      finish({
        ok: false,
        reason: 'spawn_failed',
        command,
        message: spawnError.message,
      });
    });

    child.once('spawn', () => {
      if (waitForClose && child.stdin && !child.stdin.destroyed) {
        child.stdin.end();
      }
      if (!waitForClose) {
        finish({ ok: true, command, exitCode: null });
      }
    });

    child.once('close', (exitCode, signal) => {
      if (!waitForClose) {
        return;
      }
      const normalizedExitCode = typeof exitCode === 'number' ? exitCode : null;
      if (normalizedExitCode !== 0) {
        finish({
          ok: false,
          reason: 'non_zero_exit',
          command,
          exitCode: normalizedExitCode,
          message:
            normalizedExitCode === null
              ? `Codex exited before handoff completed (signal: ${signal || 'unknown'})`
              : `Codex exited with non-zero exit code ${normalizedExitCode}`,
        });
        return;
      }
      finish({
        ok: true,
        command,
        exitCode: normalizedExitCode,
      });
    });
  });
}

module.exports = {
  launchCodex,
  resolveCodexCommand,
};
