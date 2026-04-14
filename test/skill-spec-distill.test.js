const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const distillExamplePath = path.join(rootDir, 'distill-input.example.json');

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

function createDistillInput(overrides = {}) {
  return {
    book_title: 'Atomic Habits',
    author: 'James Clear',
    topic: 'habit-design',
    target_user: '希望把习惯设计方法落地的个人创作者',
    scenarios: ['设计一套新的写作习惯', '优化已有的学习流程'],
    inputs: [
      {
        name: 'goal',
        description: '这次想建立或优化的具体习惯目标。',
        required: true,
        type: 'string',
        example: '建立每天 30 分钟写作习惯',
      },
      {
        name: 'current_context',
        description: '当前环境、阻力和已有习惯线索。',
        required: false,
        type: 'text',
      },
    ],
    fragments: [
      {
        type: 'summary',
        title: '身份先于结果',
        chapter: 'Chapter 1',
        importance: 5,
        content: '先定义你想成为怎样的人，再让每个小习惯为这个身份投票。',
      },
      {
        type: 'summary',
        title: '让好习惯显而易见',
        chapter: 'Chapter 4',
        importance: 4,
        content: '通过环境设计强化提示，让正确行动更容易被看见和触发。',
      },
      {
        type: 'excerpt',
        title: '四步行为循环',
        source_pages: '43-48',
        importance: 3,
        content: '行为改变通常经历提示、渴望、反应、奖励四个环节。',
      },
    ],
    ...overrides,
  };
}

test('createSkillSpecFromFragments generates a valid skill spec draft from structured fragments', async () => {
  const { createSkillSpecFromFragments } = require('../src/distill');

  const result = await createSkillSpecFromFragments(createDistillInput());

  assert.equal(result.warnings.length, 0);
  assert.equal(result.spec.version, '1.0.0');
  assert.match(result.spec.title, /Atomic Habits/);
  assert.match(result.spec.summary, /习惯|Atomic Habits/);
  assert.match(result.spec.goal, /Atomic Habits|习惯/);
  assert.equal(result.spec.source_book.title, 'Atomic Habits');
  assert.equal(result.spec.source_book.author, 'James Clear');
  assert.equal(Array.isArray(result.spec.applicable_scenarios), true);
  assert.equal(result.spec.applicable_scenarios.length, 2);
  assert.equal(Array.isArray(result.spec.required_inputs), true);
  assert.equal(result.spec.required_inputs.length >= 2, true);
  assert.equal(Array.isArray(result.spec.core_principles), true);
  assert.equal(result.spec.core_principles.length >= 2, true);
  assert.equal(Array.isArray(result.spec.workflow), true);
  assert.equal(result.spec.workflow.length >= 3, true);
  assert.equal(Array.isArray(result.spec.constraints), true);
  assert.equal(result.spec.constraints.length >= 2, true);
  assert.equal(typeof result.spec.output_format, 'object');
  assert.equal(Array.isArray(result.spec.evaluation_checklist), true);
  assert.equal(result.spec.evaluation_checklist.length >= 3, true);
});

test('createSkillSpecFromFragments warns and falls back when input types are omitted', async () => {
  const { createSkillSpecFromFragments } = require('../src/distill');
  const input = createDistillInput({
    inputs: [
      {
        name: 'goal',
        description: '这次想建立的习惯目标。',
        required: true,
      },
    ],
  });

  const result = await createSkillSpecFromFragments(input);

  assert.equal(result.warnings.length > 0, true);
  assert.match(result.warnings[0], /missing type/i);
  assert.equal(result.spec.required_inputs[0].type, 'string');
});

test('CLI distill command writes a skill spec json file', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-distill-cli-'));
  const inputPath = path.join(tempDir, 'distill-input.json');
  const outputPath = path.join(tempDir, 'distilled-spec.json');
  await fs.writeFile(inputPath, `${JSON.stringify(createDistillInput(), null, 2)}\n`, 'utf8');

  const result = await runNode(['src/cli.js', 'distill', inputPath, '--output', outputPath]);
  const spec = JSON.parse(await fs.readFile(outputPath, 'utf8'));

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Distilled skill spec to/);
  assert.equal(spec.version, '1.0.0');
  assert.equal(spec.source_book.title, 'Atomic Habits');
});

test('distilled spec output can be consumed by from-spec to create a skill package', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-distill-from-spec-'));
  const outputPath = path.join(tempDir, 'distilled-spec.json');
  const targetDir = path.join(tempDir, 'generated-skill');
  const { distillSkillSpec } = require('../src/distill');
  const { createSkillPackageFromSpec } = require('../src/from-spec');

  await distillSkillSpec(createDistillInput(), outputPath);
  const packageResult = await createSkillPackageFromSpec(outputPath, targetDir);
  const manifest = JSON.parse(await fs.readFile(path.join(targetDir, 'skill.json'), 'utf8'));

  assert.equal(packageResult.manifest.id.length > 0, true);
  assert.match(manifest.name, /Atomic Habits/);
});

test('checked-in distill input example can be distilled through the CLI', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bts-distill-example-'));
  const outputPath = path.join(tempDir, 'distilled-spec.json');

  const result = await runNode(['src/cli.js', 'distill', distillExamplePath, '--output', outputPath]);
  const spec = JSON.parse(await fs.readFile(outputPath, 'utf8'));

  assert.equal(result.code, 0);
  assert.match(spec.title, /Atomic Habits/);
  assert.equal(Array.isArray(spec.core_principles), true);
  assert.equal(spec.core_principles.length >= 2, true);
});
