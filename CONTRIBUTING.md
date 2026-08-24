# 贡献指南

感谢你对 StudyWise 的关注！我们欢迎任何形式的贡献：提交 Issue、修复 Bug、添加新功能、改进文档等。

在开始之前，请阅读 [`AGENTS.md`](./AGENTS.md)，它定义了本项目的开发规范与禁止事项。所有代码必须符合该规范。

---

## 如何报告 Bug

1. 在提交 Bug 之前，先在 [Issues](https://github.com/free1101/studywise/issues) 中搜索是否已有人报告过相同问题。
2. 如果没有，请使用 [Bug 报告模板](https://github.com/free1101/studywise/issues/new?template=bug_report.md) 创建新 Issue。
3. 请尽量提供：
   - 完整的**复现步骤**
   - **期望行为**与**实际行为**
   - 运行环境信息（Node 版本、操作系统、浏览器、API Provider 配置方式等）
   - 相关的控制台报错或日志

## 如何提出新功能

使用 [功能建议模板](https://github.com/free1101/studywise/issues/new?template=feature_request.md) 提交。请说明：
- 该功能解决什么问题
- 期望的使用方式
- 可选的实现思路

---

## 开发流程

1. **Fork 并克隆**

   ```bash
   git clone https://github.com/free1101/studywise.git
   cd studywise
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **配置环境变量**

   复制 `.env.example` 为 `.env.local` 并填入你的 API Key：

   ```bash
   cp .env.example .env.local
   ```

   具体变量说明见 `README.md` 或 `.env.example`。

4. **创建分支**

   ```bash
   git checkout -b feat/your-feature-name
   ```

5. **启动开发服务器**

   ```bash
   npm run dev
   ```

   打开 [http://localhost:3000](http://localhost:3000) 进行开发。

6. **修改代码**

   遵循 `AGENTS.md` 中的命名规范、目录结构与禁止事项。

7. **自检**

   提交前必须通过以下检查：

   ```bash
   npm run lint   # ESLint 代码检查
   npm run build  # 生产构建（含 TypeScript 类型检查）
   ```

8. **提交并推送**

   ```bash
   git add .
   git commit -m "feat: describe your change"
   git push origin feat/your-feature-name
   ```

9. **发起 Pull Request**

   使用 [PR 模板](https://github.com/free1101/studywise/compare) 提交 PR，并在描述中关联相关 Issue。

---

## 代码规范摘要

完整规范见 [`AGENTS.md`](./AGENTS.md)，核心要求摘要如下：

- **AI 调用**必须通过 `lib/ai/providers.ts` 统一入口，禁止在组件中直接调用 AI SDK。
- **API 路由**只做请求处理，禁止写复杂业务逻辑；必须包含 `try/catch` 错误处理。
- **禁止使用 `any` 类型**，复杂类型定义在 `lib/schema.ts`。
- **数据库操作**必须引用 `lib/schema.ts` 中的表结构定义。
- **禁止硬编码 API Key**，敏感信息放 `.env.local`，通过 `process.env` 访问。
- **每个组件一个文件**，组件名与文件名一致。
- 样式使用 TailwindCSS 原子类。

## 提交信息规范

我们采用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 风格：

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档变更
- `style:` 代码风格调整（不影响逻辑）
- `refactor:` 重构
- `perf:` 性能优化
- `test:` 测试
- `chore:` 构建或工具链变更

示例：`feat: 支持多轮追问`

---

## 需要帮助？

如果你在贡献过程中遇到问题，欢迎在 Discussion 中提问，或联系维护者。
