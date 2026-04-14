# Export Adapters

## 1. 目的

`Export Adapter` 负责把平台无关的 `Skill Spec` 转换成具体平台或具体格式可消费的产物。

它是 Book-to-Skill 架构中的适配层，而不是核心协议层。

对应关系：

- 核心协议定义在 [SKILL_SPEC.md](./SKILL_SPEC.md)
- 结构约束定义在 [skill-spec.schema.json](./skill-spec.schema.json)
- 适配层负责把协议映射到目标平台或目标格式

## 2. 设计原则

- 不污染核心协议
- 不依赖单一平台术语
- 显式保留导出损耗
- 优先稳定映射，而不是追求“完美还原”
- 平台差异放在适配层，而不是回写到通用 Spec

## 3. 适配层职责

适配层负责：

- 读取并校验 `Skill Spec`
- 将核心字段映射到目标格式
- 生成导出文件或导出 payload
- 返回导出元数据和兼容性说明

适配层不负责：

- 修改原始 Skill 的业务语义
- 重新蒸馏方法论
- 越过 `constraints`
- 将版权受限原文注入导出结果

## 4. 适配器类型

当前建议把导出器分成 3 类：

### 4.1 Format Adapter

面向通用格式，而不是特定平台。

示例：

- Markdown
- JSON bundle
- YAML
- Plain text prompt pack

### 4.2 Platform Adapter

面向具体平台的导出器。

示例：

- OpenAI-compatible prompt bundle
- Claude-oriented prompt package
- 通用 agent skill package

### 4.3 Runtime Adapter

不直接生成文件，而是生成可供运行时加载的结构化对象。

适合：

- Playground
- API 调用层
- 本地运行器

## 5. 适配器输入

每个适配器至少接收以下输入：

- `skill_spec`
- `target`
- `options`

建议输入结构：

```json
{
  "skill_spec": "<Book-to-Skill Spec object>",
  "target": {
    "platform": "generic-markdown",
    "format": "markdown"
  },
  "options": {
    "locale": "zh-CN",
    "include_examples": true,
    "include_metadata": false
  }
}
```

### 5.1 `skill_spec`

必须先通过 schema 校验，再进入适配流程。

### 5.2 `target`

描述目标导出对象。

建议至少包含：

- `platform`
- `format`

可扩展字段：

- `version`
- `profile`

### 5.3 `options`

表示导出时的非语义配置。

示例：

- 是否带示例任务
- 是否包含元数据
- 输出语言
- 是否压缩说明文本

要求：

- `options` 只能影响表现形式，不能改写 Skill 的核心语义

## 6. 适配器输出

建议每个适配器输出统一包装结构：

```json
{
  "adapter": "generic-markdown",
  "status": "ok",
  "artifacts": [
    {
      "path": "exports/pyramid-writing-skill.md",
      "media_type": "text/markdown",
      "content": "# Skill ..."
    }
  ],
  "warnings": [],
  "losses": []
}
```

### 6.1 `adapter`

当前适配器标识。

### 6.2 `status`

建议使用：

- `ok`
- `partial`
- `error`

### 6.3 `artifacts`

导出后的文件或结构化产物列表。

每个 artifact 建议包含：

- `path`
- `media_type`
- `content`

可选：

- `encoding`
- `checksum`

### 6.4 `warnings`

表示非阻断问题，例如：

- 某目标平台不支持 `anti_patterns`
- 某格式无法完整保留 `metadata`

### 6.5 `losses`

表示导出过程中被丢弃或降级的语义。

这是非常重要的字段。

例如：

- `evaluation_checklist` 被折叠为注释
- `decision_rules` 被合并进 system prompt
- `platform_adapters` 未写入目标文件

## 7. 字段映射原则

### 7.1 应优先保留的字段

以下字段应优先完整保留：

- `title`
- `summary`
- `goal`
- `required_inputs`
- `core_principles`
- `workflow`
- `constraints`
- `output_format`

### 7.2 可降级字段

以下字段允许根据目标能力降级：

- `example_tasks`
- `metadata`
- `platform_adapters`

### 7.3 需谨慎压缩的字段

以下字段可以压缩，但不能直接忽略：

- `decision_rules`
- `anti_patterns`
- `evaluation_checklist`

如果目标平台没有天然结构字段，建议把这些内容折叠到：

- 系统提示词
- 附加说明段
- 校验说明段

## 8. 推荐映射顺序

建议导出器按以下顺序处理：

1. 校验 `skill_spec`
2. 识别目标平台能力边界
3. 生成基础身份信息
4. 映射输入定义
5. 映射原则和工作流
6. 映射约束与反模式
7. 映射输出格式与评估项
8. 记录 warnings 和 losses
9. 输出 artifact

## 9. 兼容性与损耗策略

不同平台能力不同，因此导出器必须显式处理损耗。

### 9.1 无损导出

当目标格式支持结构化字段时，尽量逐字段映射。

典型目标：

- JSON bundle
- YAML bundle
- Runtime object

### 9.2 有损导出

当目标格式只能接受长文本或弱结构化文本时，允许把多个字段合并。

典型目标：

- 单文件 prompt
- Markdown 说明文档

要求：

- 必须记录 `losses`
- 不得静默丢弃核心约束

## 10. 错误处理

适配器应区分三类错误：

### 10.1 Schema Error

输入不符合 `skill-spec.schema.json`。

处理方式：

- 直接失败
- 不进入导出逻辑

### 10.2 Mapping Error

字段存在但无法映射到目标平台。

处理方式：

- 允许部分成功
- 记录 warning 或 partial status

### 10.3 Runtime Error

文件生成、写盘、序列化等过程失败。

处理方式：

- 记录错误上下文
- 不应误报导出成功

## 11. 安全与版权约束

导出器必须遵守：

- 不得把受版权保护的大段原文注入导出文件
- 不得泄露私有密钥和运行时配置
- 不得绕过 `constraints`
- 不得默认公开 `metadata` 中不适合公开的信息

如果某平台模板要求引用原文，导出器应：

- 默认拒绝
- 或要求显式开启并记录风险

## 12. 推荐接口形态

当前建议导出器实现统一接口：

```ts
type ExportAdapter = {
  id: string;
  supports(target: ExportTarget): boolean;
  validate(spec: SkillSpec): ValidationResult;
  export(spec: SkillSpec, target: ExportTarget, options?: ExportOptions): ExportResult;
};
```

建议的数据类型：

```ts
type ExportTarget = {
  platform: string;
  format: string;
  version?: string;
  profile?: string;
};

type ExportOptions = {
  locale?: string;
  includeExamples?: boolean;
  includeMetadata?: boolean;
  compact?: boolean;
};
```

## 13. 初始适配器建议

建议优先实现以下适配器：

1. `generic-markdown`
2. `json-bundle`
3. `openai-compatible`

原因：

- `generic-markdown` 适合阅读和分享
- `json-bundle` 适合作为内部交换格式
- `openai-compatible` 能帮助验证导出层的实用价值

## 14. 文件组织建议

建议仓库内采用类似结构：

```text
adapters/
  generic-markdown/
  json-bundle/
  openai-compatible/
schemas/
  skill-spec.schema.json
examples/
  skill-spec.example.json
```

如果暂时不拆目录，也应保证：

- 适配器实现独立
- 适配器模板独立
- 导出测试样例独立

## 15. 测试建议

每个适配器至少应有：

- 1 个最小合法输入测试
- 1 个完整示例输入测试
- 1 个损耗记录测试
- 1 个错误输入测试

额外建议：

- 对 `constraints` 和 `evaluation_checklist` 做回归测试
- 对导出结果做 snapshot 测试

## 16. 后续演进方向

未来可以逐步增加：

- 平台适配器独立 schema
- 适配器能力声明文件
- 多文件导出包规范
- 导出结果签名和校验机制
- 社区适配器注册表

