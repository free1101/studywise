# StudyWise - AI 学习批注助手

> 与 AI 对话生成学习内容，选中文字添加笔记/问题，AI 即时回复，学完自动生成总结和复习题。

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.36-C5F74F?logo=drizzle)

<!-- 截图占位：后续补充 GIF 动图 -->
<!-- ![StudyWise Demo](docs/demo.gif) -->

---

## 功能特性

- **AI 对话生成内容** - 告诉 AI 你想学什么，自动生成结构化 HTML 学习材料
- **选中文字批注** - 在学习内容上选中任意文字，添加笔记或提问
- **AI 即时回复** - 对批注中的问题，AI 会结合上下文给出解答
- **学习总结** - 学习完成后，AI 基于你的笔记和提问生成知识总结
- **复习题** - 自动生成填空/问答形式的复习题，支持交互作答
- **导出 HTML** - 将学习内容 + 批注导出为独立 HTML 文件，离线可看

---

## 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript (strict mode) |
| UI | TailwindCSS + shadcn/ui |
| AI | 火山引擎 DeepSeek (OpenAI 兼容格式) |
| 数据库 | SQLite + better-sqlite3 |
| ORM | Drizzle ORM |

---

## 在线 Demo

<!-- TODO: 部署后补充链接 -->
- [在线体验 Demo](https://studywise.example.com)

---

## 本地运行

### 1. 克隆仓库

```bash
git clone https://github.com/your-username/studywise.git
cd studywise
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env.local`，填入你的 API Key：

```bash
cp .env.example .env.local
```

| 变量 | 说明 | 获取方式 |
|------|------|---------|
| `VOLCENGINE_API_KEY` | 火山引擎 API Key | [火山引擎控制台](https://console.volcengine.com/ark) |
| `VOLCENGINE_ENDPOINT` | API 端点地址 | 默认已填，无需修改 |
| `VOLCENGINE_MODEL` | 使用的模型名 | 默认已填，无需修改 |
| `DEFAULT_AI_PROVIDER` | 默认 AI 提供商 | 默认 `volcengine` |

### 4. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

---

## 项目架构

```
studywise/
├── app/
│   ├── page.tsx                    # 主学习界面（三栏布局）
│   ├── layout.tsx                  # 全局布局
│   ├── globals.css                 # 全局样式
│   └── api/
│       ├── chat/route.ts           # AI 对话（流式返回）
│       ├── contents/route.ts       # 内容保存
│       ├── annotations/            # 批注 CRUD
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── ai/
│       │   ├── reply/route.ts      # AI 回复批注
│       │   └── summarize/route.ts # AI 生成总结 + 复习题
│       ├── summaries/route.ts      # 总结持久化
│       └── export/route.ts         # 导出独立 HTML
├── components/
│   ├── ui/                         # shadcn/ui 基础组件
│   ├── chat/                       # AI 对话面板
│   ├── content/                    # 内容展示 + 批注
│   ├── annotation/                 # 批注详情
│   ├── summary/                    # 总结 + 复习题
│   ├── export/                     # 导出弹窗
│   └── layout/                     # 布局组件（侧栏、状态栏）
├── hooks/
│   ├── useAnnotations.ts           # 批注 CRUD Hook
│   └── useChat.ts                  # AI 对话 Hook
├── lib/
│   ├── db.ts                       # Drizzle + SQLite 连接
│   ├── schema.ts                   # 数据库 Schema 定义
│   ├── utils.ts                    # 通用工具函数
│   └── ai/
│       ├── providers.ts            # AI 提供商统一接口
│       └── volcengine.ts           # 火山引擎 DeepSeek 封装
├── drizzle.config.ts
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | ESLint 代码检查 |

---

## License

MIT
