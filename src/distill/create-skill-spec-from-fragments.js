const fs = require('node:fs/promises');
const path = require('node:path');

const ALLOWED_INPUT_TYPES = new Set(['string', 'text', 'number', 'boolean', 'list', 'object']);
const ALLOWED_FRAGMENT_TYPES = new Set(['summary', 'excerpt']);

function toKebabCase(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function ensureNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Distill input is missing required field: ${fieldName}`);
  }
  return value.trim();
}

function firstSentence(text) {
  const trimmed = String(text).replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return '';
  }

  const match = trimmed.match(/^(.+?[。！？.!?])(?:\s|$)/);
  if (match) {
    return match[1].trim();
  }

  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

function humanizeTopic(topic) {
  return String(topic).trim().replace(/[-_]+/g, ' ');
}

function normalizeFragments(fragments, warnings) {
  if (!Array.isArray(fragments) || fragments.length === 0) {
    throw new Error('Distill input is missing required field: fragments');
  }

  return fragments.map((fragment, index) => {
    if (!fragment || typeof fragment !== 'object') {
      throw new Error(`Fragment at index ${index} must be an object`);
    }

    const title = ensureNonEmptyString(fragment.title, `fragments[${index}].title`);
    const content = ensureNonEmptyString(fragment.content, `fragments[${index}].content`);
    let type = fragment.type;

    if (!type) {
      type = 'summary';
      warnings.push(`Fragment "${title}" missing type; defaulted to summary.`);
    } else if (!ALLOWED_FRAGMENT_TYPES.has(type)) {
      warnings.push(`Fragment "${title}" has unsupported type "${type}"; defaulted to summary.`);
      type = 'summary';
    }

    return {
      ...fragment,
      type,
      title,
      content,
    };
  });
}

function normalizeInputs(inputs, topicLabel, warnings) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    return [
      {
        name: 'goal',
        description: `这次希望通过 ${topicLabel} 达成的具体目标。`,
        required: true,
        type: 'string',
      },
      {
        name: 'current_context',
        description: '当前场景、限制条件和已有做法。',
        required: false,
        type: 'text',
      },
    ];
  }

  return inputs.map((input, index) => {
    if (!input || typeof input !== 'object') {
      throw new Error(`Input at index ${index} must be an object`);
    }

    const name = ensureNonEmptyString(input.name, `inputs[${index}].name`);
    const description =
      typeof input.description === 'string' && input.description.trim()
        ? input.description.trim()
        : `与 ${topicLabel} 相关的输入信息。`;

    let type = input.type;
    if (!type) {
      type = 'string';
      warnings.push(`Input "${name}" missing type; defaulted to string.`);
    } else if (!ALLOWED_INPUT_TYPES.has(type)) {
      warnings.push(`Input "${name}" has unsupported type "${type}"; defaulted to string.`);
      type = 'string';
    }

    return {
      name,
      description,
      required: Boolean(input.required),
      type,
      ...(input.example !== undefined ? { example: input.example } : {}),
    };
  });
}

function buildSummary(bookTitle, topicLabel, fragments) {
  const summaryFragment = fragments.find((fragment) => fragment.type === 'summary') || fragments[0];
  const distilled = firstSentence(summaryFragment.content);
  return `将《${bookTitle}》中与 ${topicLabel} 相关的方法蒸馏为可复用 skill，帮助用户快速调用关键原则与步骤。${distilled}`;
}

function buildGoal(bookTitle, topicLabel, targetUser, scenarios) {
  const audience = targetUser || '用户';
  const scenarioText = scenarios[0] || `与 ${topicLabel} 相关的任务`;
  return `帮助${audience}在 ${scenarioText} 中应用《${bookTitle}》提炼出的 ${topicLabel} 方法，输出清晰、可执行的结果。`;
}

function buildScenarios(topicLabel, scenarios) {
  if (Array.isArray(scenarios) && scenarios.length > 0) {
    return scenarios.map((item) => String(item).trim()).filter(Boolean);
  }

  return [`把 ${topicLabel} 应用到一个具体任务中`];
}

function buildCorePrinciples(fragments) {
  const candidates = fragments.filter((fragment) => fragment.type === 'summary');
  const selected = (candidates.length > 0 ? candidates : fragments).slice(0, 3);

  return selected.map((fragment, index) => ({
    id: toKebabCase(fragment.title) || `principle-${index + 1}`,
    title: fragment.title,
    description: firstSentence(fragment.content) || fragment.content.trim(),
    ...(fragment.chapter ? { rationale: `Distilled from ${fragment.chapter}.` } : {}),
    priority: index + 1,
  }));
}

function buildWorkflow(bookTitle, topicLabel, principles) {
  const principleTitles = principles.map((item) => item.title).join('、');

  return [
    {
      step: 1,
      title: '澄清任务目标',
      instruction: `先重述用户当前的 ${topicLabel} 目标、场景和限制，确认本次任务边界。`,
      expected_output: '一条明确的任务定义。',
    },
    {
      step: 2,
      title: '提炼适用原则',
      instruction: `从《${bookTitle}》蒸馏结果中挑选最相关的原则，优先考虑：${principleTitles}。`,
      expected_output: '2 到 3 条与当前任务直接相关的原则。',
    },
    {
      step: 3,
      title: '转换为执行步骤',
      instruction: '把原则改写成当前场景下可执行的步骤、检查点或建议顺序。',
      expected_output: '一组可执行步骤。',
    },
    {
      step: 4,
      title: '输出结构化结果',
      instruction: '按统一结构给出方案、注意事项和下一步建议，保持表达清晰可复用。',
      expected_output: '可直接执行或继续编辑的结构化输出。',
    },
  ];
}

function buildConstraints(hasExcerpt) {
  const constraints = [
    '不要复刻书中大段原文。',
    '优先输出方法、原则和步骤，不要把章节摘要当成最终答案。',
    '如果输入信息不足，要明确假设，不要编造书中未给出的结论。',
  ];

  if (hasExcerpt) {
    constraints.push('如需引用摘录，只保留必要短句与出处信息。');
  }

  return constraints;
}

function buildOutputFormat(topicLabel) {
  return {
    format: '结构化执行方案',
    structure: [
      '任务目标重述',
      '适用原则',
      `围绕 ${topicLabel} 的执行步骤`,
      '风险与约束',
      '下一步建议',
    ],
    tone: '清晰、克制、偏方法论',
    style_notes: ['先给结论', '优先列步骤', '避免空泛口号'],
  };
}

function buildEvaluationChecklist() {
  return [
    '是否明确重述了用户目标与场景。',
    '是否引用了蒸馏出的关键原则，而不是泛泛总结。',
    '执行步骤是否具体、可操作、顺序清晰。',
    '是否避免了大段原文复刻与无依据扩写。',
  ];
}

async function readJsonFile(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function createSkillSpecFromFragments(input) {
  const payload = typeof input === 'string' ? await readJsonFile(path.resolve(input)) : input;
  if (!payload || typeof payload !== 'object') {
    throw new Error('Distill input must be an object or a path to a JSON file');
  }

  const warnings = [];
  const bookTitle = ensureNonEmptyString(payload.book_title, 'book_title');
  const topic = ensureNonEmptyString(payload.topic, 'topic');
  const topicLabel = humanizeTopic(topic);
  const fragments = normalizeFragments(payload.fragments, warnings);
  const scenarios = buildScenarios(topicLabel, payload.scenarios);
  const principles = buildCorePrinciples(fragments);
  const inputs = normalizeInputs(payload.inputs, topicLabel, warnings);
  const hasExcerpt = fragments.some((fragment) => fragment.type === 'excerpt');

  const spec = {
    version: '1.0.0',
    id: toKebabCase(`${bookTitle} ${topic}`),
    title: `${bookTitle} ${topicLabel} Skill`,
    summary: buildSummary(bookTitle, topicLabel, fragments),
    ...(payload.target_user ? { target_user: String(payload.target_user).trim() } : {}),
    goal: buildGoal(bookTitle, topicLabel, payload.target_user, scenarios),
    source_book: {
      title: bookTitle,
      ...(payload.author ? { author: String(payload.author).trim() } : {}),
      source_type: payload.source_type || 'other',
      rights_note: '仅蒸馏方法论，不公开分发原文。',
    },
    applicable_scenarios: scenarios,
    required_inputs: inputs,
    core_principles: principles,
    workflow: buildWorkflow(bookTitle, topicLabel, principles),
    constraints: buildConstraints(hasExcerpt),
    output_format: buildOutputFormat(topicLabel),
    evaluation_checklist: buildEvaluationChecklist(),
  };

  return {
    spec,
    warnings,
  };
}

async function distillSkillSpec(input, outputPath) {
  const result = await createSkillSpecFromFragments(input);

  if (!outputPath) {
    return result;
  }

  const resolvedOutputPath = path.resolve(outputPath);
  await writeJson(resolvedOutputPath, result.spec);

  return {
    ...result,
    outputPath: resolvedOutputPath,
  };
}

module.exports = {
  createSkillSpecFromFragments,
  distillSkillSpec,
};
