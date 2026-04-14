# Skill Package

## 1. 目的

`Skill Package` 是 Book-to-Skill 的**可分发、可安装交付物**。

如果说：

- [SKILL_SPEC.md](./SKILL_SPEC.md) 定义的是平台无关的中间协议
- [EXPORT_ADAPTERS.md](./EXPORT_ADAPTERS.md) 定义的是导出与适配层

那么 `Skill Package` 定义的就是：

> 一份技能如何被封装成一个 git 仓库中的目录，并被其他人下载到本地后安装使用。

## 2. 设计目标

`Skill Package` 需要同时满足：

- 可放进 git 仓库
- 可被版本化
- 可被本地安装
- 可被不同运行时识别
- 不要求任意执行安装脚本

核心原则：

- 安装优先走**声明式 manifest**
- Skill 的核心语义仍然来自 `Skill Spec`
- 安装过程不应依赖不受控的任意代码执行
- 包结构应适合单技能仓库或多技能仓库

## 3. 关系模型

三层关系建议如下：

### 3.1 Skill Spec

描述方法论能力本身。

回答：

- 这项 Skill 是什么
- 如何输入
- 如何运行
- 如何评估

### 3.2 Skill Package

描述如何把一份 Skill 组织成可安装目录。

回答：

- 哪些文件属于这个技能包
- 哪个文件是入口
- 安装到哪里
- 哪些平台适配文件可用

### 3.3 Installed Skill

描述技能在本地安装后的状态。

回答：

- 这个技能被安装到了哪个本地目录
- 注册到了哪个运行时
- 当前可被哪个命令或界面调用

## 4. 推荐目录结构

最小目录结构：

```text
my-skill/
  skill.json
  README.md
  spec.json
  system.md
  inputs.schema.json
  adapters/
    generic.json
```

推荐扩展结构：

```text
my-skill/
  skill.json
  README.md
  spec.json
  system.md
  inputs.schema.json
  examples/
    example-input.json
  adapters/
    generic.json
    codex.json
    openai-compatible.json
```

## 5. 必须文件

### 5.1 `skill.json`

技能包 manifest。

这是安装器的主入口。

### 5.2 `spec.json`

平台无关的 Skill Spec。

用于：

- 运行时理解 Skill 的核心语义
- 导出器重建其他平台格式
- 校验包内容是否完整

### 5.3 `system.md`

供运行时直接读取的人类可读提示层。

用途：

- 通用 prompt runtime
- 调试与人工审阅
- 平台适配器的基础素材

### 5.4 `inputs.schema.json`

定义技能运行时需要的输入。

用途：

- 本地安装器生成表单
- Playground 生成输入界面
- 运行时做输入校验

## 6. 可选文件

### 6.1 `README.md`

面向使用者的人类说明文档。

### 6.2 `adapters/*.json`

平台适配 manifest。

每个适配文件描述：

- 对应平台
- 该平台使用哪个入口
- 该平台的兼容状态

### 6.3 `examples/*`

示例输入、示例输出或示例调用。

## 7. 安装模型

安装应采用**声明式安装**，而不是默认执行任意安装脚本。

推荐安装命令形态：

```bash
book-to-skill install ./my-skill
```

或：

```bash
book-to-skill install https://github.com/example/my-skill-repo
```

安装器的职责：

1. 找到 `skill.json`
2. 校验 manifest
3. 校验 `spec.json`
4. 校验必要文件存在
5. 复制到本地 skill store
6. 注册默认适配器

## 8. 推荐本地安装目录

建议默认安装到：

```text
~/.book-to-skill/skills/<id>@<version>/
```

例如：

```text
~/.book-to-skill/skills/pyramid-writing-skill@1.0.0/
```

优点：

- 同一 skill 可并存多个版本
- 安装器逻辑简单
- git 下载目录和本地安装目录解耦

## 9. Git 分发方式

### 9.1 单技能仓库

适合：

- 单本书一个 skill
- 单个作者单独维护

结构：

```text
repo-root/
  skill.json
  spec.json
  ...
```

### 9.2 多技能仓库

适合：

- 一个作者维护一组 skills
- 主题化合集

结构：

```text
repo-root/
  skills/
    pyramid-writing-skill/
      skill.json
    brand-positioning-skill/
      skill.json
```

安装命令可指定子目录：

```bash
book-to-skill install ./skills/pyramid-writing-skill
```

## 10. Manifest 职责

`skill.json` 负责定义：

- 技能包身份
- 版本
- 入口文件
- 安装信息
- 适配器清单

它不负责：

- 直接承载整个 Skill Spec
- 承载长篇系统提示词
- 承载运行时日志

## 11. 安全原则

默认安装流程不应执行包内任意脚本。

理由：

- git 仓库来源不可完全信任
- 安装过程应尽可能可审计
- Skill 的交付重点是能力配置，不是安装时执行逻辑

因此当前建议：

- 默认安装器只读取 manifest 和静态文件
- 如果未来支持 hook，也必须显式开启并给出风险提示

## 12. 平台适配方式

平台适配建议由 `adapters/*.json` 负责，而不是污染 `skill.json`。

推荐分层：

- `skill.json`：包级身份和入口
- `spec.json`：能力语义
- `adapters/*.json`：平台映射

这样可以：

- 一个包支持多个平台
- 新增平台时不必重写 Skill Spec
- 避免核心 manifest 过重

## 13. 使用流程

一条完整链路应如下：

1. 书籍蒸馏生成 `Skill Spec`
2. 将 `Skill Spec` 编译成 `Skill Package`
3. 将目录提交到 git 仓库
4. 其他用户 clone 或下载目录
5. 本地安装器安装该包
6. 本地 runtime 读取已安装 skill 并调用

## 14. 示例

参考示例包目录：

- `skill-package.example/`

其中：

- `skill.json` 是安装入口
- `spec.json` 是 Skill Spec
- `system.md` 是运行时提示层
- `inputs.schema.json` 是输入约束
- `adapters/generic.json` 是最基础适配器

## 15. 后续方向

后续可以逐步增加：

- `installed-skill.registry.json`
- 包签名和校验
- 平台安装器接口
- 远程仓库索引
- 包依赖与组合技能

