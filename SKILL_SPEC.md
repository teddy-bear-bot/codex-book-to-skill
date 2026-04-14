# Skill Spec

## 1. 目的

`Skill Spec` 是 Book-to-Skill 的平台无关中间协议。

它的目标不是绑定某个具体 AI 平台，而是先把一本书蒸馏出的“方法论能力”描述清楚，再由不同导出器把这份能力映射到具体平台格式。

对应文件：

- Schema: [skill-spec.schema.json](./skill-spec.schema.json)
- Example: [skill-spec.example.json](./skill-spec.example.json)

## 2. 设计原则

- 平台无关：不在核心协议里写死某个平台的术语
- 面向执行：描述的是可调用能力，而不是摘要文本
- 可解释：不仅要能运行，还要能说明为什么这样运行
- 可导出：核心字段要能稳定映射到 Prompt、JSON、Markdown 或其他平台格式
- 可演进：允许后续增加适配器和元数据，而不破坏已有实现

## 3. 顶层结构

当前顶层字段分为 6 组：

1. 标识与版本
2. 来源信息
3. 使用上下文
4. 方法论主体
5. 输出与评估
6. 适配与元数据

## 4. 必填字段

以下字段为必填：

- `version`
- `title`
- `summary`
- `goal`
- `source_book`
- `applicable_scenarios`
- `required_inputs`
- `core_principles`
- `workflow`
- `constraints`
- `output_format`
- `evaluation_checklist`

这些字段的作用是保证一份 Skill 至少具备：

- 它是什么
- 来自哪里
- 适用于什么问题
- 需要用户提供什么输入
- 按什么方法运行
- 不能做什么
- 输出应该长什么样
- 如何评估输出质量

## 5. 字段说明

### 5.1 标识与版本

#### `version`

表示 Skill Spec payload 的协议版本，而不是书籍版本，也不是 skill 内容版本。

要求：

- 使用语义化版本号
- 当前建议从 `1.0.0` 开始

用途：

- 做协议兼容判断
- 让导出器决定如何解析字段

#### `id`

稳定标识符，用于存储、引用和导出。

建议：

- 使用小写 kebab-case
- 一旦公开后尽量不要随意变更

#### `title`

给人看的 Skill 名称，强调可理解性，不强调稳定性。

#### `summary`

一句或一小段说明 Skill 的核心作用。

要求：

- 必须可读
- 不应只是复述书名
- 应体现“这项能力帮助用户做什么”

### 5.2 来源信息

#### `source_book`

表示这份 Skill 的来源书籍或知识源。

当前最重要的字段：

- `title`
- `author`
- `source_type`
- `rights_note`

设计意图：

- 让 Skill 的知识来源可追溯
- 在协议层保留版权边界提示

注意：

- `source_book` 描述来源，不等于允许公开分发原文

### 5.3 使用上下文

#### `target_user`

描述主要用户是谁。

这是帮助编辑器、导出器和 UI 做更好提示的辅助字段，不是权限字段。

#### `goal`

定义这份 Skill 最核心的任务结果。

要求：

- 必须明确
- 必须可执行
- 不应写成空泛口号

#### `applicable_scenarios`

列出适用场景，帮助用户快速判断何时调用该 Skill。

建议：

- 尽量写成实际任务，而不是抽象类别
- 用“公众号提纲生成”这类表达，优于“内容创作”

#### `required_inputs`

定义调用 Skill 时建议用户提供哪些输入。

每个输入至少应包含：

- `name`
- `description`
- `required`

可选字段：

- `type`
- `example`

设计意图：

- 让 Skill 从“静态说明”变成“可执行接口”
- 为 Playground、表单生成器和导出器提供统一输入定义

### 5.4 方法论主体

#### `core_principles`

表示这份 Skill 最核心的原则集合。

它回答的是：

- 这份 Skill 依赖哪些关键判断标准
- 为什么这种方法有效

原则不是步骤。

建议：

- 原则数量保持克制
- 每条原则都应能独立成立
- 不要把案例、口号或输出要求混进来

#### `workflow`

表示这份 Skill 的执行步骤。

它回答的是：

- Skill 实际运行时先做什么
- 再做什么
- 最后输出什么

每一步至少应包含：

- `title`
- `instruction`

建议字段：

- `step`
- `when_to_apply`
- `expected_output`

原则上：

- `core_principles` 决定怎么想
- `workflow` 决定怎么做

#### `decision_rules`

表示条件式判断逻辑。

适合描述：

- 主题太大时怎么处理
- 素材不足时怎么降级
- 用户已有结构时是否重写

设计意图：

- 避免 Skill 只在理想输入下可用
- 让导出器和运行时在边界场景中表现稳定

#### `constraints`

表示硬约束。

这是整个协议中非常重要的安全和风格边界字段。

常见用途：

- 避免大段原文复刻
- 避免超出来源书籍立场
- 避免不适配的输出方式

#### `anti_patterns`

表示典型错误模式。

与 `constraints` 的区别：

- `constraints` 是禁止事项
- `anti_patterns` 是失败案例画像

适合用于：

- 评估器
- 质量检查
- 导出器中的负向提示

### 5.5 输出与评估

#### `output_format`

定义输出应该长什么样。

至少应包含：

- `format`
- `structure`

常见用途：

- 告诉模型结果应该按什么结构组织
- 帮助前端渲染结构提示
- 帮助导出器生成平台特定模板

#### `example_tasks`

提供使用示例。

这不是测试集，而是帮助人类和程序理解“如何调用这份 Skill”。

建议每条样例包含：

- `input`
- `expected_behavior`

可选：

- `title`
- `example_output`

#### `evaluation_checklist`

定义“一个好结果应该满足什么”。

这是从摘要工具走向能力工具的关键字段。

典型用途：

- Playground 自评
- 后续自动评估
- 人工 review 清单

### 5.6 适配与元数据

#### `platform_adapters`

表示这份 Skill 针对具体平台的映射信息。

注意：

- 这是可选字段
- 核心协议不依赖它才能成立

设计意图：

- 保持协议平台无关
- 允许生态层逐步增加导出器和平台映射

#### `metadata`

用于记录辅助信息，例如：

- `created_at`
- `updated_at`
- `created_by`
- `tags`
- `visibility`

原则：

- `metadata` 服务于管理与展示
- 不应承载核心方法论逻辑

## 6. 协议边界

`Skill Spec` 不负责以下内容：

- 存储用户原始书籍文件
- 分发书籍原文
- 绑定模型厂商私有参数
- 表达 UI 布局细节
- 承载运行时审计日志

它负责的是：

- 统一描述 Skill 的能力边界
- 统一描述输入、方法、输出和评估
- 为导出器与运行时提供中间层

## 7. 兼容性策略

### 7.1 向后兼容

在 `1.x` 阶段应尽量遵守：

- 新增字段优先采用可选方式
- 不轻易删除既有字段
- 不随意改变既有字段的语义

### 7.2 破坏性变更

以下改动应视为破坏性变更：

- 修改必填字段集合
- 改变字段含义
- 改变已有枚举值语义
- 让旧导出器无法可靠解析

出现以上情况时，应提升主版本号。

## 8. 导出器约束

导出器实现者应遵守：

- 不得要求所有 Skill 都必须带 `platform_adapters`
- 不得假设所有可选字段都存在
- 不得绕过 `constraints` 和 `anti_patterns`
- 不得把 `source_book` 当作可公开引用原文的许可

建议：

- 优先从 `goal`、`required_inputs`、`core_principles`、`workflow`、`output_format` 生成平台特定能力

## 9. 生成器约束

Skill 生成器在写入 Spec 时应优先保证：

- 字段语义正确
- 原则与步骤分离
- 约束明确
- 场景具体
- 评估项可执行

不建议：

- 用空泛词填满字段
- 把摘要直接塞进 `core_principles`
- 把目录结构直接塞进 `workflow`

## 10. 校验建议

最小校验应包含：

1. JSON 语法合法
2. 满足 `skill-spec.schema.json`
3. `core_principles` 与 `workflow` 非空
4. `constraints` 与 `evaluation_checklist` 非空
5. `output_format.structure` 非空

进一步可增加语义校验：

- 原则数量是否过多
- 工作流是否有顺序冲突
- 场景是否过于抽象
- 约束是否与输出要求互相矛盾

## 11. 示例

参考样例：

- [skill-spec.example.json](./skill-spec.example.json)

该示例展示了如何把一本写作方法书蒸馏成可用于内容创作的 Skill。

## 12. 后续演进方向

后续可以考虑增加但当前不应过早引入的能力：

- 多来源知识融合
- 引文级可追溯依据
- 平台适配器的独立 schema
- 运行时评估结果记录
- Skill 组合与继承机制

