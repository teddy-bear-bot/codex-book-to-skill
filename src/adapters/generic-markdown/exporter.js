function bulletList(items) {
  return items.map((item) => `- ${item}`);
}

function stripTrailingFullStop(value) {
  return typeof value === 'string' ? value.replace(/。$/u, '') : value;
}

function renderInputField(field) {
  return [
    `### \`${field.name}\``,
    '',
    `- Required: ${field.required ? 'Yes' : 'No'}`,
    field.type ? `- Type: \`${field.type}\`` : null,
    `- Description: ${stripTrailingFullStop(field.description)}`,
    field.example !== undefined ? `- Example: ${field.example}` : null,
  ].filter((line) => line !== null);
}

function renderPrinciple(principle, index) {
  return [
    `### ${index + 1}. ${principle.title}`,
    '',
    principle.description,
    '',
    `理由：${principle.rationale || ''}`,
  ];
}

function renderWorkflowStep(step) {
  return [
    `### Step ${step.step}. ${step.title}`,
    '',
    `- Instruction: ${stripTrailingFullStop(step.instruction)}`,
    step.when_to_apply ? `- When to Apply: ${stripTrailingFullStop(step.when_to_apply)}` : null,
    step.expected_output ? `- Expected Output: ${stripTrailingFullStop(step.expected_output)}` : null,
  ].filter((line) => line !== null);
}

function renderDecisionRule(rule) {
  return [
    `- ${stripTrailingFullStop(rule.condition)}：${stripTrailingFullStop(rule.action)}`,
    `  Reason: ${stripTrailingFullStop(rule.reason || '')}`,
  ];
}

function renderExampleTask(task) {
  return [
    `### ${task.title || '示例任务'}`,
    '',
    `- Input: ${stripTrailingFullStop(task.input)}`,
    `- Expected Behavior: ${stripTrailingFullStop(task.expected_behavior)}`,
    task.example_output ? `- Example Output: ${task.example_output}` : null,
  ].filter((line) => line !== null);
}

function renderMarkdown(spec) {
  const lines = [
    `# ${spec.title}`,
    '',
    '## 概览',
    '',
    spec.summary,
    '',
    `- Skill ID: \`${spec.id || ''}\``,
    `- Version: \`${spec.version}\``,
    spec.target_user ? `- Target User: ${spec.target_user}` : null,
    `- Goal: ${stripTrailingFullStop(spec.goal)}`,
    '',
    '## 来源',
    '',
    `- Source Book: 《${spec.source_book.title}》`,
    spec.source_book.author ? `- Author: ${spec.source_book.author}` : null,
    spec.source_book.source_type ? `- Source Type: ${spec.source_book.source_type.toUpperCase()}` : null,
    spec.source_book.rights_note ? `- Rights Note: ${stripTrailingFullStop(spec.source_book.rights_note)}` : null,
    '',
    '## 适用场景',
    '',
    ...bulletList(spec.applicable_scenarios),
    '',
    '## 必要输入',
    '',
    ...spec.required_inputs.flatMap((field, index) => [
      ...(index > 0 ? [''] : []),
      ...renderInputField(field),
    ]),
    '',
    '## 核心原则',
    '',
    ...spec.core_principles.flatMap((principle, index) => [
      ...(index > 0 ? [''] : []),
      ...renderPrinciple(principle, index),
    ]),
    '',
    '## 工作流',
    '',
    ...spec.workflow.flatMap((step, index) => [
      ...(index > 0 ? [''] : []),
      ...renderWorkflowStep(step),
    ]),
    '',
    '## 决策规则',
    '',
    ...spec.decision_rules.flatMap((rule, index) => [
      ...(index > 0 ? [''] : []),
      ...renderDecisionRule(rule),
    ]),
    '',
    '## 约束',
    '',
    ...bulletList(spec.constraints.map(stripTrailingFullStop)),
    '',
    '## 反模式',
    '',
    ...spec.anti_patterns.map(
      (pattern) => `- ${pattern.name}：${stripTrailingFullStop(pattern.description)}`
    ),
    '',
    '## 输出格式',
    '',
    `- Format: ${spec.output_format.format}`,
    spec.output_format.tone ? `- Tone: ${spec.output_format.tone}` : null,
    '',
    '### Output Structure',
    '',
    ...spec.output_format.structure.map((item, index) => `${index + 1}. ${item}`),
    '',
    '### Style Notes',
    '',
    ...bulletList(spec.output_format.style_notes || []),
    '',
    '## 示例任务',
    '',
    ...spec.example_tasks.flatMap((task, index) => [
      ...(index > 0 ? [''] : []),
      ...renderExampleTask(task),
    ]),
    '',
    '## 评估清单',
    '',
    ...bulletList(spec.evaluation_checklist.map(stripTrailingFullStop)),
    '',
    '## 导出元数据',
    '',
    '- Adapter: `generic-markdown`',
    '- Format: `markdown`',
    '- Status: `stable`',
    spec.metadata && spec.metadata.visibility ? `- Visibility: \`${spec.metadata.visibility}\`` : null,
    spec.metadata && spec.metadata.created_by ? `- Created By: \`${spec.metadata.created_by}\`` : null,
    spec.metadata && Array.isArray(spec.metadata.tags)
      ? `- Tags: ${spec.metadata.tags.map((tag) => `\`${tag}\``).join(', ')}`
      : null,
    '',
  ].filter((line) => line !== null);

  return `${lines.join('\n')}`;
}

function buildWarnings() {
  return [
    {
      code: 'metadata-partial-render',
      message:
        'Metadata was partially rendered into the markdown artifact instead of being preserved as a standalone structured block.',
    },
  ];
}

function buildLosses() {
  return [
    {
      field: 'platform_adapters',
      reason:
        'Platform adapter definitions were not expanded in the markdown artifact and were reduced to export metadata context only.',
    },
    {
      field: 'metadata.created_at',
      reason:
        'Timestamp fields were omitted from the human-readable markdown export to keep the document concise.',
    },
    {
      field: 'metadata.updated_at',
      reason:
        'Timestamp fields were omitted from the human-readable markdown export to keep the document concise.',
    },
  ];
}

function exportGenericMarkdown(spec) {
  return {
    adapter: 'generic-markdown',
    status: 'ok',
    artifacts: [
      {
        path: `exports/${spec.id || 'skill'}.md`,
        media_type: 'text/markdown',
        encoding: 'utf-8',
        content: renderMarkdown(spec),
      },
    ],
    warnings: buildWarnings(),
    losses: buildLosses(),
  };
}

module.exports = {
  exportGenericMarkdown,
};
