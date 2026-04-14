const ANSI = {
  bold: '\u001B[1m',
  cyan: '\u001B[36m',
  italic: '\u001B[3m',
  magenta: '\u001B[35m',
  yellow: '\u001B[33m',
  dim: '\u001B[2m',
  reset: '\u001B[0m',
};

function colorize(text, color, useAnsi) {
  if (!useAnsi) {
    return text;
  }
  return `${color}${text}${ANSI.reset}`;
}

function formatHostWelcomeScreen(context = {}) {
  const useAnsi = Boolean(context.useAnsi);
  const storeRoot = context.storeRoot || '~/.book-to-skill/skills';
  const status = context.status || 'NO SKILL SELECTED';
  return [
    colorize('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓', ANSI.cyan, useAnsi),
    `${colorize('┃', ANSI.cyan, useAnsi)} ${colorize('BOOK-TO-SKILL', ANSI.magenta, useAnsi)} HOST`,
    `${colorize('┃', ANSI.cyan, useAnsi)} STATUS : ${colorize(status, ANSI.yellow, useAnsi)}`,
    `${colorize('┃', ANSI.cyan, useAnsi)} STORE  : ${storeRoot}`,
    colorize('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛', ANSI.cyan, useAnsi),
    colorize('Type /help for commands', ANSI.dim, useAnsi),
  ].join('\n');
}

function formatHostHelp() {
  return [
    'Host commands:',
    '  /skill  choose an installed skill (not implemented yet)',
    '  /help   show this help',
    '  /info   show host status',
    '  /exit   exit chat host',
    '  /quit   exit chat host',
  ].join('\n');
}

function formatHostInfo(context = {}) {
  const storeRoot = context.storeRoot || '~/.book-to-skill/skills';
  return ['BOOK-TO-SKILL host', `Store: ${storeRoot}`, 'Status: NO SKILL SELECTED'].join('\n');
}

function formatHostTip(message, context = {}) {
  const useAnsi = Boolean(context.useAnsi);
  if (!useAnsi) {
    return `Tip: ${message}`;
  }
  return [
    `${ANSI.bold}Tip:${ANSI.reset}`,
    `${ANSI.italic}${ANSI.dim}${message}${ANSI.reset}`,
  ].join(' ');
}

module.exports = {
  formatHostHelp,
  formatHostInfo,
  formatHostTip,
  formatHostWelcomeScreen,
};
