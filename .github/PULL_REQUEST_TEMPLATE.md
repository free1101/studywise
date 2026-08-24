---
name: Pull Request
about: 提交代码变更
title: ""
labels: []
assignees: []
---

## 变更描述

请清晰、简洁地描述这次变更做了什么，以及为什么做这个变更。

关联 Issue：`#<issue-number>`（如有）

## 变更类型

- [ ] 新功能（feat）
- [ ] Bug 修复（fix）
- [ ] 文档（docs）
- [ ] 代码风格 / 重构（style / refactor）
- [ ] 性能优化（perf）
- [ ] 测试（test）
- [ ] 构建 / 工具链（chore）

## 自检清单

- [ ] `npm run lint`（ESLint）通过
- [ ] `npm run build`（TypeScript 类型检查 + 生产构建）通过
- [ ] 已根据功能编写/更新相关测试
- [ ] 遵循了 `AGENTS.md` 中的开发规范与禁止事项
- [ ] 未引入 `any` 类型，类型定义引用于 `lib/schema.ts`
- [ ] 未硬编码 API Key，敏感信息通过 `process.env` 访问
- [ ] 代码风格与命名符合规范

## 测试说明

描述如何测试你的变更，包括复现步骤或截图。

## 额外说明

其他需要维护者注意的信息。
