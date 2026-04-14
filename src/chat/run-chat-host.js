const readline = require('node:readline');
const { installSkillPackage, listInstalledSkills } = require('../install');
const { syncInstalledSkillToCodex } = require('./codex-skill-adapter');
const {
  formatHostInfo,
  formatHostTip,
  formatHostWelcomeScreen,
} = require('./format-host-screen');
const {
  clearPendingSkillSelection,
  createSessionState,
  resetSkillSession,
  setActiveSkill,
  setPendingSkillSelection,
} = require('./session-state');
const { launchCodex } = require('./launch-codex');
const { findSelectedSkill, listSkillsForSelection, toSkillLabel } = require('./select-skill');
const { readSkillInputFieldSummary } = require('./skill-runtime');

const GLOBAL_STORE_ROOT = '/usr/local/share/book-to-skill/skills';
const USER_STORE_ROOT = '~/.book-to-skill/skills';

function resolveStoreRoot(options = {}) {
  if (options.storeRoot) {
    return options.storeRoot;
  }
  if (options.globalInstall) {
    return GLOBAL_STORE_ROOT;
  }
  return USER_STORE_ROOT;
}

function isArchivePath(source) {
  return /\.(tar\.gz|tgz)$/i.test(source || '');
}

function parseScript(script) {
  return script
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function writeLine(output, line = '') {
  output.write(`${line}\n`);
}

function formatHostHelpText() {
  return [
    'Host commands:',
    '  /skill  choose an installed skill',
    '  /inputs show active skill input fields',
    '  /reset  reset active skill session',
    '  /help   show this help',
    '  /info   show host status',
    '  /exit   exit chat host',
    '  /quit   exit chat host',
  ].join('\n');
}

function writeTip(output, message) {
  writeLine(output, formatHostTip(message, { useAnsi: Boolean(output && output.isTTY) }));
}

async function handleHostInput(line, context) {
  if (line === '/help') {
    writeLine(context.stdout, formatHostHelpText());
    return false;
  }
  if (line === '/info') {
    const activeSkill = context.sessionState.activeSkill;
    if (!activeSkill) {
      writeLine(context.stdout, formatHostInfo({ storeRoot: context.storeRoot }));
      return false;
    }
    writeLine(
      context.stdout,
      [
        'BOOK-TO-SKILL host',
        `Store: ${context.storeRoot}`,
        `Status: ACTIVE ${toSkillLabel(activeSkill)}`,
        `Active skill: ${toSkillLabel(activeSkill)}`,
      ].join('\n')
    );
    return false;
  }
  if (line === '/exit' || line === '/quit') {
    writeLine(context.stdout, 'Exiting chat host.');
    return true;
  }
  if (line === '/skill') {
    const selection = await listSkillsForSelection(context.storeRoot);
    for (const outputLine of selection.lines) {
      writeLine(context.stdout, outputLine);
    }
    if (selection.skills.length > 0) {
      writeTip(context.stdout, 'Type the exact skill id or id@version');
    }
    if (selection.skills.length > 0) {
      setPendingSkillSelection(context.sessionState, selection.skills);
    } else {
      clearPendingSkillSelection(context.sessionState);
    }
    return false;
  }
  if (line === '/inputs') {
    const activeSkill = context.sessionState.activeSkill;
    if (!activeSkill) {
      writeLine(context.stdout, 'No skill selected. Use /skill to choose one.');
      return false;
    }
    try {
      const summary = await readSkillInputFieldSummary(activeSkill);
      writeLine(
        context.stdout,
        `Inputs schema fields (${toSkillLabel(activeSkill)}): ${summary.fields.join(', ') || '(none)'}`
      );
      writeLine(
        context.stdout,
        `Required fields: ${summary.required.join(', ') || '(none)'}`
      );
    } catch (error) {
      writeLine(context.stdout, `Failed to load skill inputs: ${error.message}`);
    }
    return false;
  }
  if (line === '/reset') {
    if (!context.sessionState.activeSkill) {
      writeLine(context.stdout, 'No skill selected. Use /skill to choose one.');
      return false;
    }
    resetSkillSession(context.sessionState);
    writeLine(context.stdout, 'Session reset.');
    return false;
  }
  if (line.startsWith('/')) {
    writeLine(context.stdout, `Unknown command: ${line}`);
    return false;
  }
  if (context.sessionState.pendingSkillSelection) {
    const selected = findSelectedSkill(line, context.sessionState.pendingSkillSelection);
    if (!selected) {
      writeLine(
        context.stdout,
        'Invalid skill selection. Enter an exact skill id or id@version.'
      );
      return false;
    }
    setActiveSkill(context.sessionState, selected);
    writeLine(context.stdout, `Active skill: ${toSkillLabel(selected)}`);
    writeLine(
      context.stdout,
      formatHostWelcomeScreen({
        storeRoot: context.storeRoot,
        status: toSkillLabel(selected),
        useAnsi: Boolean(context.stdout && context.stdout.isTTY),
      })
    );
    try {
      const syncResult = await syncInstalledSkillToCodex(selected, {
        codexSkillsRoot: context.codexSkillsRoot,
      });
      writeLine(context.stdout, `Installed Codex skill: ${syncResult.codexSkillPath}`);
    } catch (error) {
      context.sessionState.activeSkill = null;
      writeLine(context.stdout, `Failed to install Codex skill: ${error.message}`);
      return false;
    }

    writeLine(context.stdout, 'Launching Codex...');
    const launchResult = await launchCodex({
      codexBin: context.codexBin,
      stdio: context.codexStdio,
      stdout: context.stdout,
      stderr: context.stderr,
    });
    if (!launchResult.ok) {
      if (launchResult.reason === 'missing_command') {
        writeLine(
          context.stdout,
          `Open Codex manually: ${launchResult.command} (skill: ${toSkillLabel(selected)})`
        );
        writeTip(context.stdout, 'Please run the command above to open Codex.');
      } else {
        context.sessionState.activeSkill = null;
        writeLine(
          context.stdout,
          `Failed to launch Codex: ${launchResult.message || launchResult.reason}${
            typeof launchResult.exitCode === 'number'
              ? ` (exit code ${launchResult.exitCode})`
              : ''
          }`
        );
      }
      return false;
    }

    writeTip(context.stdout, 'Codex is opening for you now.');
    return true;
  }

  if (context.sessionState.activeSkill) {
    writeLine(
      context.stdout,
      'Active skill is in Codex handoff mode. Use /skill to relaunch Codex or /exit.'
    );
    return false;
  }

  writeLine(context.stdout, 'No skill selected. Use /skill to choose one.');
  return false;
}

async function runScriptedLoop(script, context) {
  for (const line of parseScript(script)) {
    const shouldExit = await handleHostInput(line, context);
    if (shouldExit) {
      return;
    }
  }
}

async function runInteractiveLoop(context) {
  const terminal = Boolean(context.stdin.isTTY && context.stdout.isTTY);
  const rl = readline.createInterface({
    input: context.stdin,
    output: context.stdout,
    terminal,
  });

  if (terminal) {
    rl.setPrompt('host> ');
    rl.prompt();
  }

  for await (const line of rl) {
    const shouldExit = await handleHostInput(line.trim(), context);
    if (shouldExit) {
      rl.close();
      return;
    }
    if (terminal) {
      rl.prompt();
    }
  }
}

async function maybeInstallIncomingSource(options, context) {
  if (!options.source) {
    return;
  }

  const installedSkills = await listInstalledSkills({ storeRoot: context.storeRoot });
  const isInstalledSkillId = installedSkills.some(
    (skill) => skill.id === options.source || `${skill.id}@${skill.version}` === options.source
  );
  if (isInstalledSkillId) {
    return;
  }

  if (!isArchivePath(options.source)) {
    return;
  }

  const result = await installSkillPackage(options.source, {
    storeRoot: context.storeRoot,
  });
  writeLine(
    context.stdout,
    `Installed ${result.manifest.id}@${result.manifest.version} to ${result.installedPath}`
  );
}

async function runChatHost(options = {}) {
  const stdin = options.stdin || process.stdin;
  const stdout = options.stdout || process.stdout;
  const stderr = options.stderr || process.stderr;
  const storeRoot = resolveStoreRoot(options);
  const useAnsi = Boolean(stdout && stdout.isTTY);
  const hasInteractiveTerminal = Boolean(stdin.isTTY && stdout.isTTY);
  const context = {
    stdin,
    stdout,
    stderr,
    storeRoot,
    sessionState: createSessionState(),
    codexSkillsRoot: options.codexSkillsRoot || process.env.BTS_CODEX_SKILLS_ROOT,
    codexBin: options.codexBin || process.env.BTS_CODEX_BIN,
    codexStdio: options.codexStdio || (hasInteractiveTerminal ? 'inherit' : 'pipe'),
  };
  const scriptedInputCandidate =
    typeof options.script === 'string' ? options.script : process.env.BTS_CHAT_SCRIPT;
  const hasScriptedInput =
    typeof scriptedInputCandidate === 'string' && scriptedInputCandidate.trim().length > 0;

  await maybeInstallIncomingSource(options, context);

  writeLine(stdout, formatHostWelcomeScreen({ storeRoot, useAnsi }));
  writeTip(stdout, "Type '/skill' to choose an installed skill");

  if (hasScriptedInput) {
    await runScriptedLoop(scriptedInputCandidate, context);
    return;
  }

  await runInteractiveLoop(context);
}

module.exports = {
  runChatHost,
};
