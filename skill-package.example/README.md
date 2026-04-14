# 金字塔结构写作 Skill Package

这是一个示例 `Skill Package`。

它展示了如何把一本书蒸馏后的内容封装成一个：

- 可放进 git 仓库
- 可被本地安装
- 可被不同运行时识别

的技能包目录。

## 目录

- `skill.json`：技能包 manifest
- `spec.json`：平台无关 Skill Spec
- `system.md`：运行时系统提示层
- `inputs.schema.json`：运行时输入 schema
- `adapters/`：平台适配 manifest

## 预期安装方式

```bash
book-to-skill install ./skill-package.example
```

或在仓库中：

```bash
git clone <repo>
cd <repo>
book-to-skill install ./skill-package.example
```

## 预期安装结果

安装器应将该目录复制到：

```text
~/.book-to-skill/skills/pyramid-writing-skill@1.0.0/
```

并注册默认适配器 `generic`。

