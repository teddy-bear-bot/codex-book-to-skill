const fs = require('node:fs/promises');
const path = require('node:path');

function toKebabCase(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

async function ensureTargetIsEmpty(targetDir) {
  try {
    const entries = await fs.readdir(targetDir);
    if (entries.length > 0) {
      throw new Error(`Target directory is not empty: ${targetDir}`);
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

async function readJsonFile(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function mapInputType(type) {
  if (type === 'number' || type === 'boolean' || type === 'array') {
    return type;
  }
  return 'string';
}

function buildInputsSchema(spec, warnings) {
  const properties = {};
  const required = [];

  for (const input of spec.required_inputs) {
    if (!input.name) {
      throw new Error('Spec input is missing required field: name');
    }
    if (properties[input.name]) {
      throw new Error(`Duplicate input name in spec: ${input.name}`);
    }
    if (!input.type) {
      warnings.push(`Input "${input.name}" missing type; defaulted to string.`);
    }
    properties[input.name] = {
      type: mapInputType(input.type),
      description: input.description || '',
    };
    if (input.required) {
      required.push(input.name);
    }
  }

  return {
    type: 'object',
    additionalProperties: false,
    properties,
    required,
  };
}

function buildSystemPrompt(spec) {
  const principles = spec.core_principles
    .map((item) => `- ${item.title || item}`)
    .join('\n');
  const workflow = spec.workflow
    .map((item, index) => `${index + 1}. ${item.title}: ${item.instruction}`)
    .join('\n');
  const constraints = spec.constraints.map((item) => `- ${item}`).join('\n');

  return [
    `# ${spec.title}`,
    '',
    spec.summary,
    '',
    '## Goal',
    spec.goal,
    '',
    '## Core Principles',
    principles,
    '',
    '## Workflow',
    workflow,
    '',
    '## Constraints',
    constraints,
    '',
    '## Output Format',
    typeof spec.output_format.format === 'string'
      ? spec.output_format.format
      : JSON.stringify(spec.output_format, null, 2),
    '',
  ].join('\n');
}

function buildReadme(spec) {
  const scenarios = Array.isArray(spec.applicable_scenarios)
    ? spec.applicable_scenarios.map((item) => `- ${item}`).join('\n')
    : '-';
  const inputs = spec.required_inputs
    .map((item) => `- \`${item.name}\`${item.required ? ' (required)' : ''}: ${item.description}`)
    .join('\n');
  const sourceBook = spec.source_book
    ? `${spec.source_book.title || ''} / ${spec.source_book.author || ''}`.trim()
    : 'Unknown';

  return [
    `# ${spec.title}`,
    '',
    spec.summary,
    '',
    '## Source',
    sourceBook,
    '',
    '## Applicable Scenarios',
    scenarios,
    '',
    '## Required Inputs',
    inputs,
    '',
  ].join('\n');
}

function validateSpecForGeneration(spec) {
  const requiredFields = [
    'title',
    'summary',
    'required_inputs',
    'core_principles',
    'workflow',
    'constraints',
    'output_format',
  ];

  for (const field of requiredFields) {
    if (spec[field] === undefined || spec[field] === null) {
      throw new Error(`Spec is missing required field for package generation: ${field}`);
    }
  }

  if (!Array.isArray(spec.required_inputs)) {
    throw new Error('Spec field required_inputs must be an array');
  }
}

async function createSkillPackageFromSpec(specPath, targetDir) {
  const resolvedSpecPath = path.resolve(specPath);
  const resolvedTargetDir = path.resolve(targetDir);
  const warnings = [];
  const spec = await readJsonFile(resolvedSpecPath);

  validateSpecForGeneration(spec);
  await ensureTargetIsEmpty(resolvedTargetDir);

  const derivedId =
    spec.id || toKebabCase(spec.title) || toKebabCase(path.basename(resolvedSpecPath, '.json'));
  if (!spec.id) {
    warnings.push('Missing spec id; derived package id from title or filename.');
  }

  const manifest = {
    package_schema_version: '1.0.0',
    id: derivedId,
    name: spec.title,
    version: spec.package_version || '0.1.0',
    description: spec.summary,
    license: 'Apache-2.0',
    skill_spec_file: 'spec.json',
    readme_file: 'README.md',
    entrypoints: {
      system_prompt_file: 'system.md',
      inputs_schema_file: 'inputs.schema.json',
    },
    installation: {
      mode: 'copy',
      default_install_root: '~/.book-to-skill/skills',
      install_subdir_pattern: '{id}@{version}',
    },
    adapters: [
      {
        platform: 'generic',
        manifest_file: 'adapters/generic.json',
        default: true,
      },
    ],
    compatibility: {
      book_to_skill_cli: '>=0.1.0',
      runtimes: ['generic-prompt-runtime'],
    },
  };

  await fs.mkdir(path.join(resolvedTargetDir, 'adapters'), { recursive: true });
  await writeJson(path.join(resolvedTargetDir, 'skill.json'), manifest);
  await writeJson(path.join(resolvedTargetDir, 'spec.json'), spec);
  await writeJson(
    path.join(resolvedTargetDir, 'inputs.schema.json'),
    buildInputsSchema(spec, warnings)
  );
  await fs.writeFile(path.join(resolvedTargetDir, 'system.md'), buildSystemPrompt(spec), 'utf8');
  await fs.writeFile(path.join(resolvedTargetDir, 'README.md'), buildReadme(spec), 'utf8');
  await writeJson(path.join(resolvedTargetDir, 'adapters', 'generic.json'), {
    platform: 'generic',
    entry: 'system.md',
    notes: 'Generated from skill spec.',
  });

  return {
    targetDir: resolvedTargetDir,
    manifest,
    warnings,
  };
}

module.exports = {
  createSkillPackageFromSpec,
};
