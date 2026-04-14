#!/usr/bin/env node

const {
  installSkillPackage,
  inspectSkillPackage,
  listInstalledSkills,
  uninstallSkillPackage,
  validateSkillPackage,
} = require('./install');
const { distillSkillSpec } = require('./distill');
const { createSkillPackageFromSpec } = require('./from-spec');
const { createSkillPackageSkeleton } = require('./init');
const { normalizeSkillPackage, writeSkillLock } = require('./manifest');
const { createSkillPackageArchive } = require('./pack');
const { publishSkillPackage } = require('./publish');
const { runChatHost } = require('./chat');

function parseCommonFlags(rest) {
  const flags = {
    positionals: [],
    storeRoot: undefined,
    subdir: undefined,
    ref: undefined,
    output: undefined,
    json: false,
    globalInstall: false,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];

    if (token === '--store') {
      flags.storeRoot = rest[index + 1];
      index += 1;
      continue;
    }
    if (token === '--subdir') {
      flags.subdir = rest[index + 1];
      index += 1;
      continue;
    }
    if (token === '--ref') {
      flags.ref = rest[index + 1];
      index += 1;
      continue;
    }
    if (token === '--output') {
      flags.output = rest[index + 1];
      index += 1;
      continue;
    }
    if (token === '--json') {
      flags.json = true;
      continue;
    }
    if (token === '--global') {
      flags.globalInstall = true;
      continue;
    }
    if (token.startsWith('--')) {
      continue;
    }
    flags.positionals.push(token);
  }

  return flags;
}

function parseArgs(argv) {
  const [, , command, ...rest] = argv;
  const flags = parseCommonFlags(rest);
  const { positionals, storeRoot, subdir, ref, output, json, globalInstall } = flags;

  if (command === 'install') {
    const sourcePath = positionals[0];
    if (!sourcePath) {
      throw new Error('Missing package path. Usage: book-to-skill install <path> [--store <path>]');
    }
    return { command, sourcePath, storeRoot, subdir, ref };
  }

  if (command === 'inspect') {
    const sourcePath = positionals[0];
    if (!sourcePath) {
      throw new Error('Missing package path. Usage: book-to-skill inspect <path>');
    }
    return { command, sourcePath, subdir, ref };
  }

  if (command === 'validate') {
    const sourcePath = positionals[0];
    if (!sourcePath) {
      throw new Error('Missing package path. Usage: book-to-skill validate <path>');
    }
    return { command, sourcePath, subdir, ref, json };
  }

  if (command === 'init') {
    const targetDir = positionals[0];
    if (!targetDir) {
      throw new Error('Missing target path. Usage: book-to-skill init <path>');
    }
    return { command, targetDir };
  }

  if (command === 'from-spec') {
    const specPath = positionals[0];
    const targetDir = positionals[1];
    if (!specPath || !targetDir) {
      throw new Error('Usage: book-to-skill from-spec <spec.json> <target-dir>');
    }
    return { command, specPath, targetDir };
  }

  if (command === 'distill') {
    const inputPath = positionals[0];
    if (!inputPath || !output) {
      throw new Error('Usage: book-to-skill distill <input.json> --output <spec.json>');
    }
    return { command, inputPath, output };
  }

  if (command === 'normalize') {
    const sourcePath = positionals[0];
    if (!sourcePath) {
      throw new Error('Missing package path. Usage: book-to-skill normalize <path>');
    }
    return { command, sourcePath };
  }

  if (command === 'lock') {
    const sourcePath = positionals[0];
    if (!sourcePath) {
      throw new Error('Missing package path. Usage: book-to-skill lock <path>');
    }
    return { command, sourcePath };
  }

  if (command === 'publish') {
    const sourcePath = positionals[0];
    if (!sourcePath) {
      throw new Error('Missing package path. Usage: book-to-skill publish <path> [--output <file>]');
    }
    return { command, sourcePath, output };
  }

  if (command === 'list') {
    return { command, storeRoot };
  }

  if (command === 'pack') {
    const packageDir = positionals[0];
    if (!packageDir) {
      throw new Error(
        'Missing package path. Usage: book-to-skill pack <path> [--output <file>]'
      );
    }
    return { command, packageDir, output };
  }

  if (command === 'uninstall') {
    const identifier = positionals[0];
    if (!identifier) {
      throw new Error(
        'Missing skill identifier. Usage: book-to-skill uninstall <id@version> [--store <path>]'
      );
    }
    return { command, identifier, storeRoot };
  }

  if (command === 'chat') {
    const source = positionals[0];
    return { command, source, storeRoot, globalInstall };
  }

  throw new Error(
    'Usage: book-to-skill <chat|distill|from-spec|init|install|inspect|lock|normalize|pack|publish|validate|list|uninstall> [args] [--store <path>]'
  );
}

function formatValidationReport(report) {
  if (report.valid) {
    const summary = report.summary;
    return [
      'VALID',
      `${summary.id}@${summary.version}`,
      `defaultAdapter=${summary.defaultAdapter}`,
      `sourceType=${summary.sourceType}`,
    ].join('\n');
  }

  return ['INVALID', ...report.errors.map((error) => `- ${error}`)].join('\n');
}

async function main() {
  try {
    const args = parseArgs(process.argv);

    if (args.command === 'install') {
      const result = await installSkillPackage(args.sourcePath, {
        storeRoot: args.storeRoot,
        subdir: args.subdir,
        ref: args.ref,
      });
      process.stdout.write(
        `Installed ${result.manifest.id}@${result.manifest.version} to ${result.installedPath}\n`
      );
      return;
    }

    if (args.command === 'list') {
      const skills = await listInstalledSkills({ storeRoot: args.storeRoot });
      if (skills.length === 0) {
        process.stdout.write('No installed skills\n');
        return;
      }
      for (const skill of skills) {
        process.stdout.write(`${skill.id}@${skill.version} [default=${skill.defaultAdapter}]\n`);
      }
      return;
    }

    if (args.command === 'inspect') {
      const result = await inspectSkillPackage(args.sourcePath, {
        subdir: args.subdir,
        ref: args.ref,
      });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }

    if (args.command === 'validate') {
      const result = await validateSkillPackage(args.sourcePath, {
        subdir: args.subdir,
        ref: args.ref,
      });
      if (args.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        process.stdout.write(`${formatValidationReport(result)}\n`);
      }
      if (!result.valid) {
        process.exitCode = 1;
      }
      return;
    }

    if (args.command === 'init') {
      const result = await createSkillPackageSkeleton(args.targetDir);
      process.stdout.write(
        `Initialized ${result.manifest.id}@${result.manifest.version} at ${result.targetDir}\n`
      );
      return;
    }

    if (args.command === 'from-spec') {
      const result = await createSkillPackageFromSpec(args.specPath, args.targetDir);
      process.stdout.write(
        `Created ${result.manifest.id}@${result.manifest.version} at ${result.targetDir}\n`
      );
      for (const warning of result.warnings) {
        process.stdout.write(`warning: ${warning}\n`);
      }
      return;
    }

    if (args.command === 'distill') {
      const result = await distillSkillSpec(args.inputPath, args.output);
      process.stdout.write(`Distilled skill spec to ${result.outputPath}\n`);
      for (const warning of result.warnings) {
        process.stdout.write(`warning: ${warning}\n`);
      }
      return;
    }

    if (args.command === 'normalize') {
      const result = await normalizeSkillPackage(args.sourcePath);
      process.stdout.write(
        `Normalized ${result.manifest.id}@${result.manifest.version} at ${result.manifestPath}\n`
      );
      return;
    }

    if (args.command === 'lock') {
      const result = await writeSkillLock(args.sourcePath);
      process.stdout.write(
        `Wrote lockfile for ${result.lock.package.id}@${result.lock.package.version} at ${result.lockPath}\n`
      );
      return;
    }

    if (args.command === 'publish') {
      const result = await publishSkillPackage(args.sourcePath, {
        outputPath: args.output,
      });
      process.stdout.write(
        `Published ${result.manifest.id}@${result.manifest.version}\nlockfile=${result.lockPath}\narchive=${result.archivePath}\n`
      );
      return;
    }

    if (args.command === 'pack') {
      const result = await createSkillPackageArchive(args.packageDir, {
        outputPath: args.output,
      });
      process.stdout.write(
        `Packed ${result.manifest.id}@${result.manifest.version} to ${result.outputPath}\n`
      );
      return;
    }

    if (args.command === 'uninstall') {
      const removed = await uninstallSkillPackage(args.identifier, { storeRoot: args.storeRoot });
      process.stdout.write(`Uninstalled ${removed.id}@${removed.version}\n`);
      return;
    }

    if (args.command === 'chat') {
      await runChatHost({
        source: args.source,
        storeRoot: args.storeRoot,
        globalInstall: args.globalInstall,
        stdin: process.stdin,
        stdout: process.stdout,
        stderr: process.stderr,
      });
    }
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
