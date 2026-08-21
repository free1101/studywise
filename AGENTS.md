# StudyWise 开发规范

> AI 学习批注助手 - GitHub 开源项目，求职作品集展示

## 项目定位

**核心功能**：用户在单页面上学习，选中文字添加笔记/问题，AI 即时回复，学习后生成总结和复习题。

**目标**：GitHub 100+ Stars，求职作品集展示。

**形态**：
- 开源 GitHub 仓库（用户克隆本地运行）
- 在线 Demo（用你的 API Key，让人体验）

---

## 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript (strict mode) |
| UI | TailwindCSS + shadcn/ui |
| AI | 火山引擎 DeepSeek（OpenAI 兼容格式） |
| 数据库 | SQLite + better-sqlite3 |
| ORM | Drizzle ORM |
| 包管理 | npm |

---

## 目录结构

```
studywise/
├── app/
│   ├── page.tsx                          # 主学习界面
│   ├── layout.tsx                        # 全局布局
│   ├── globals.css                       # 全局样式
│   └── api/
│       ├── chat/
│       │   └── route.ts                  # AI 对话（流式）
│       ├── contents/
│       │   └── route.ts                  # 内容保存（POST）
│       ├── annotations/
│       │   ├── route.ts                  # GET 列表 / POST 创建
│       │   └── [id]/
│       │       └── route.ts              # PUT 更新 / DELETE 删除
│       ├── ai/
│       │   ├── reply/
│       │   │   └── route.ts              # AI 回复批注
│       │   └── summarize/
│       │       └── route.ts              # AI 生成总结 + 复习题（持久化）
│       ├── summaries/
│       │   └── route.ts                  # 获取已保存的总结（GET）
│       └── export/
│           └── route.ts                  # 导出独立 HTML
├── components/
│   ├── ui/                               # shadcn/ui 组件
│   ├── chat/
│   │   ├── ChatPanel.tsx                 # AI 对话面板（渲染层）
│   │   └── ChatMessage.tsx               # 单条消息组件
│   ├── content/
│   │   ├── ContentViewer.tsx             # 内容展示 + 文字选中批注
│   │   └── AnnotationPopup.tsx           # 选中文字后弹出的批注输入框
│   ├── annotation/
│   │   ├── AnnotationDetail.tsx          # 右侧批注详情 + AI 回复
│   │   └── AnnotationItem.tsx            # 单条批注卡片
│   ├── summary/
│   │   ├── SummaryPanel.tsx              # 总结 + 复习题
│   │   └── ReviewQuiz.tsx                # 复习题交互组件
│   ├── export/
│   │   └── ExportDialog.tsx              # 导出选项弹窗
│   └── layout/
│       ├── Sidebar.tsx                   # 可折叠侧栏
│       ├── ResizablePanel.tsx            # 可拖拽调整宽度的面板
│       └── StatusBar.tsx                 # 底部状态栏
├── lib/
│   ├── db.ts                             # Drizzle + SQLite 连接
│   ├── schema.ts                         # 数据库 schema 定义
│   ├── utils.ts                          # 通用工具函数
│   └── ai/
│       ├── providers.ts                  # AI 提供商统一接口
│       └── volcengine.ts                 # 火山引擎 DeepSeek 封装
├── hooks/
│   ├── useAnnotations.ts                 # 批注 CRUD Hook
│   └── useChat.ts                        # AI 对话 Hook
├── .env.example                          # 环境变量示例
├── .gitignore
├── AGENTS.md                             # 本文件
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── drizzle.config.ts
└── components.json                       # shadcn/ui 配置
```

---

## 命名规范

### 文件命名
- React 组件：PascalCase（`ChatPanel.tsx`）
- 工具函数/Hook：camelCase（`useChat.ts`）
- 数据库 Schema：camelCase（`schema.ts`）
- API 路由：`route.ts`（Next.js App Router 约定）
- CSS：TailwindCSS 原子类

### 变量命名
- 组件：PascalCase（`ChatPanel`）
- 函数/Hook：camelCase（`useChat`、`formatDate`）
- 数据库表：snake_case（`annotations`）
- 常量：UPPER_SNAKE_CASE（`DEFAULT_AI_PROVIDER`）
- 类型/接口：PascalCase（`Annotation`、`ChatMessage`）

### 导入顺序
```typescript
// 1. React
import { useState, useEffect } from 'react'

// 2. 第三方库
import { TextAnnotator } from '@recogito/react-text-annotator'

// 3. 本地组件
import { ChatMessage } from './ChatMessage'

// 4. 本地工具/Hook
import { useChat } from '@/hooks/useChat'

// 5. 类型
import type { Message } from '@/lib/schema'
```

---

## 禁止事项

1. **禁止在组件中直接调用 AI SDK**
   - 必须通过 `lib/ai/providers.ts` 统一入口
   - 组件只负责渲染，AI 调用放 `lib/ai/`

2. **禁止在 API 路由中写复杂业务逻辑**
   - API 路由只做请求处理
   - 业务逻辑放 `lib/` 或 `hooks/`

3. **禁止使用 `any` 类型**
   - 所有变量必须有明确类型
   - 复杂类型定义在 `lib/schema.ts`

4. **禁止合并多个组件到一个文件**
   - 每个组件一个文件
   - 文件名与组件名一致

5. **禁止在没有类型定义的情况下写数据库操作**
   - 所有表结构定义在 `lib/schema.ts`
   - 操作数据库时必须引用 schema

6. **禁止跳过错误处理**
   - API 路由必须有 try/catch
   - 组件必须处理 loading 和 error 状态

7. **禁止硬编码 API Key**
   - 所有敏感信息放 `.env.local`
   - 通过 `process.env` 访问

---

## 强制流程

### 开发每个功能模块时：
1. **先看 AGENTS.md**：确认规范和禁止事项
2. **设计**：明确组件/API 结构
3. **拆分**：将大任务拆成小任务（每任务独立可测试）
4. **实现**：按规范写代码
5. **自检**：检查清单（见下方）
6. **更新 AGENTS.md**：如果发现新规则，立即更新

### 自检清单
- [ ] 文件位置是否正确？
- [ ] 命名是否符合规范？
- [ ] 导入顺序是否正确？
- [ ] 类型定义是否从 schema.ts 导入？
- [ ] 业务逻辑是否放在 hooks/ 或 lib/ 中？
- [ ] AI 调用是否通过 providers.ts？
- [ ] API 路由是否有 try/catch？
- [ ] 样式是否用 TailwindCSS 原子类？
- [ ] 是否避免了禁止事项中的所有问题？

---

## 数据库 Schema

### sessions 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键 |
| title | TEXT | 会话标题 |
| ai_provider | TEXT | AI 提供商（默认 deepseek） |
| created_at | INTEGER | 创建时间戳 |
| updated_at | INTEGER | 更新时间戳 |

### contents 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键 |
| session_id | TEXT | 关联 sessions |
| html | TEXT | 学习内容 HTML |
| source | TEXT | 'user_upload' 或 'ai_generated' |
| created_at | INTEGER | 创建时间戳 |

### annotations 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键 |
| content_id | TEXT | 关联 contents |
| quote | TEXT | 选中的原文 |
| quote_offset | INTEGER | 起始位置 |
| quote_length | INTEGER | 长度 |
| body | TEXT | 用户写的笔记/问题 |
| type | TEXT | 'note' 或 'question' |
| ai_reply | TEXT | AI 的回复 |
| color | TEXT | 高亮颜色（默认 #FFEB3B） |
| created_at | INTEGER | 创建时间戳 |

### summaries 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键 |
| session_id | TEXT | 关联 sessions |
| review_questions | TEXT | JSON 格式复习题 |
| ai_evaluation | TEXT | JSON 格式 AI 评判 |
| final_summary | TEXT | 总结内容 |
| created_at | INTEGER | 创建时间戳 |

---

## API 路由设计

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/chat` | AI 对话（流式返回） |
| POST | `/api/contents` | 保存学习内容 |
| GET | `/api/annotations?contentId=xxx` | 获取批注列表 |
| POST | `/api/annotations` | 创建批注 |
| PUT | `/api/annotations/[id]` | 更新批注 |
| DELETE | `/api/annotations/[id]` | 删除批注 |
| POST | `/api/ai/reply` | AI 回复批注中的问题/笔记 |
| POST | `/api/ai/summarize` | AI 生成总结 + 复习题（持久化到 DB） |
| GET | `/api/summaries?sessionId=xxx` | 获取已保存的总结 |
| POST | `/api/export` | 导出独立 HTML |

---

## 迭代规则

**当犯错时，必须更新本文件：**
1. 在"禁止事项"中添加新的禁止项
2. 在"自检清单"中添加新的检查项
3. 如果是命名/结构问题，更新"命名规范"
4. 如果是流程问题，更新"强制流程"

**目的**：防止同样的错误再次发生。

---

## 版本记录

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-08-20 | v1.0 | 初始版本 |
| 2026-08-20 | v1.1 | AI Provider 改为火山引擎 DeepSeek（OpenAI 兼容格式） |
| 2026-08-20 | v1.2 | 完成 Phase 1-3：基础架构、数据库、AI 接口、单页面布局、Chat、批注 |
| 2026-08-20 | v1.3 | 完成 Phase 4：总结功能、复习题、导出 HTML |
| 2026-08-21 | v1.4 | 代码质量改进：重写 README、修复 .gitignore、抽离 useChat Hook、持久化 Summary、统一包管理器为 npm、next.config 配置 serverExternalPackages、目录结构与实际代码对齐 |
