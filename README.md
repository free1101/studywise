# StudyWise

> **AI-powered learning annotation assistant** — Chat with AI to generate study content, annotate any text, get instant AI answers, and review with auto-generated summaries and quizzes.

> 🇨🇳 **中文简介**：StudyWise 是一款 AI 学习批注助手。与 AI 对话生成学习内容，选中文字添加笔记/问题，AI 即时结合上下文解答，学完自动生成总结与复习题，并支持导出离线 HTML。数据全部本地存储（SQLite），自带 API Key 即可使用。完整中文文档见 [README.zh-CN.md](README.zh-CN.md)。

<p align="center">
  <a href="https://github.com/free1101/studywise"><img src="https://img.shields.io/github/stars/free1101/studywise" alt="Stars"></a>
  <a href="https://github.com/free1101/studywise"><img src="https://img.shields.io/github/forks/free1101/studywise" alt="Forks"></a>
  <a href="https://github.com/free1101/studywise/actions"><img src="https://img.shields.io/github/actions/workflow/status/free1101/studywise/ci.yml" alt="Build"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/free1101/studywise" alt="License"></a>
  <a href="https://img.shields.io/badge/Next.js-16-black?logo=next.js"><img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js"></a>
  <a href="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript"><img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript"></a>
  <a href="https://img.shields.io/badge/React-19-61DAFB?logo=react"><img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React"></a>
  <a href="https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss"><img src="https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss" alt="TailwindCSS"></a>
  <a href="https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite"><img src="https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite" alt="SQLite"></a>
  <a href="https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?logo=drizzle"><img src="https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?logo=drizzle" alt="Drizzle ORM"></a>
  <a href="https://img.shields.io/badge/Made_with-StudyWise-8A2BE2"><img src="https://img.shields.io/badge/Made_with-StudyWise-8A2BE2" alt="Made with"></a>
</p>

<p align="center">
  <b>🚀 Ready for your next learning session.</b>
</p>

---

## 📸 Screenshots

> **⚠️ Placeholder** — run `npm run dev`, take screenshots, and drop them into `docs/screenshots/`. Then update the image paths below.

| Main learning interface | Annotations & AI replies | Summary & review quiz |
|:---:|:---:|:---:|
| ![Main interface](docs/screenshots/demo-screenshot-1.png) | ![Annotations & AI replies](docs/screenshots/demo-screenshot-2.png) | ![Summary & quiz](docs/screenshots/demo-screenshot-3.png) |

---

## ✨ Features

- 💬 **AI generates study content** — tell AI what you want to learn, and it produces structured HTML learning material in a single conversation.
- 📝 **Select-and-annotate** — highlight any text in the content to add a note or ask a question; notes (green) and questions (yellow) are visually distinct.
- 🤖 **Instant AI replies** — AI answers your questions with the surrounding content as context.
- 🔗 **Two-way scrolling sync** — click a highlight and the annotation panel scrolls to it (and vice versa); scrolling one panel auto-scrolls the other.
- 🔎 **Multi-turn follow-ups** — keep asking follow-up questions on any AI answer; the thread auto-collapses to the first reply.
- 📊 **AI summary** — after learning, AI generates a knowledge summary based on your notes and questions.
- ❓ **Review quizzes** — auto-generated fill-in-the-blank / Q&A review questions with interactive answering.
- 📤 **Export standalone HTML** — export content + annotations + summary + quiz into a single offline-readable HTML file.
- 🌐 **Multiple AI providers** — switchable providers (Volcengine DeepSeek / OpenAI-compatible / Claude) in one click.
- 💾 **Local-first data** — everything is stored in local SQLite; your API key stays yours.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** (developed and tested on Node 20)
- npm (bundled with Node)
- An API key from an OpenAI-compatible AI provider (Volcengine Ark recommended)

### 1. Clone the repo

```bash
git clone https://github.com/free1101/studywise.git
cd studywise
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your API key:

```bash
cp .env.example .env.local
```

| Variable | Description | How to get |
|----------|-------------|------------|
| `VOLCENGINE_API_KEY` | Volcengine Ark API key | [Volcengine Ark console](https://console.volcengine.com/ark) |
| `VOLCENGINE_ENDPOINT` | API endpoint (pre-filled) | Leave as-is |
| `VOLCENGINE_MODEL` | Model name (pre-filled) | Leave as-is |
| `DEFAULT_AI_PROVIDER` | Default provider: `volcengine` / `openai` / `claude` | Default `volcengine` |

> **Any OpenAI-compatible provider** — the `provider` field accepts `volcengine`, `openai`, or `claude`. For OpenAI-compatible endpoints, set `DEFAULT_AI_PROVIDER=openai` (or choose the provider in the in-app status bar) and configure the corresponding `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` in `.env.local`.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start learning.

---

## 🧱 Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| UI | TailwindCSS + shadcn/ui |
| AI | Volcengine DeepSeek (OpenAI-compatible) |
| Database | SQLite + better-sqlite3 |
| ORM | Drizzle ORM |
| Annotation | @recogito/react-text-annotator |

## 📁 Project Structure

```
studywise/
├── app/
│   ├── page.tsx                    # Main learning UI (three-pane layout)
│   ├── layout.tsx                  # Global layout
│   └── api/
│       ├── chat/route.ts           # AI conversation (streaming)
│       ├── contents/route.ts       # Save content
│       ├── annotations/            # Annotation CRUD
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── ai/
│       │   ├── reply/route.ts      # AI reply to annotation (multi-turn)
│       │   └── summarize/route.ts  # AI summary + review questions
│       ├── summaries/route.ts      # Persisted summary retrieval
│       └── export/route.ts         # Export standalone HTML
├── components/
│   ├── ui/                         # shadcn/ui base components
│   ├── chat/                       # Chat panel & message
│   ├── content/                    # Content viewer + annotation popup
│   ├── annotation/                 # Annotation list & detail
│   ├── summary/                    # Summary + review quiz
│   ├── export/                     # Export dialog
│   └── layout/                     # Sidebar, resizable panel, status bar
├── hooks/
│   ├── useAnnotations.ts           # Annotation CRUD hook
│   └── useChat.ts                  # AI chat hook
├── lib/
│   ├── db.ts                       # Drizzle + SQLite connection
│   ├── schema.ts                   # DB schema & types
│   └── ai/
│       ├── providers.ts            # Unified AI provider interface
│       └── volcengine.ts           # Volcengine DeepSeek wrapper
├── scripts/                        # Regression test scripts
├── docs/screenshots/               # Place screenshots here
├── AGENTS.md                       # Dev conventions
├── LICENSE
└── package.json
```

---

## 🔧 How It Works

1. **Conversation → Content** — you chat with AI; when AI produces HTML learning material, the front-end extracts and renders it into the central content viewer.
2. **Annotate → Reply** — selecting text opens a popup to add a note/question; the annotation is stored in SQLite and AI replies with the surrounding content as context. Follow-up questions reuse the same endpoint with the previous reply for multi-turn coherence.
3. **Scroll Sync** — highlights and annotation cards share stable IDs; scrolling either panel reports the visible annotation and syncs the other side (with programmatic-scroll guards to prevent loops).
4. **Summarize & Export** — on completion, AI summarizes your notes/questions into a summary plus review questions (persisted to DB); the export endpoint merges content, annotations, summary, and quiz into one standalone HTML file.

---

## 📚 Docs

- **[AGENTS.md](AGENTS.md)** — development conventions, coding standards, and the self-check checklist.
- **[question.txt](question.txt)** — an audit trail of bug reports, root-cause analysis, and fixes across multiple iterations (evidence of quality and rigor).
- **[scripts/](scripts/)** — regression tests:
  - `node scripts/api-test.mjs` — API regression tests across all backend routes (needs the dev server running).
  - `node scripts/frontend-logic-test.mjs` — dependency-free front-end logic contract tests (HTML extraction).

---

## ❓ FAQ

**How do I switch AI providers?**
Set `DEFAULT_AI_PROVIDER` in `.env.local` to `volcengine`, `openai`, or `claude`, configure the matching API key, and (optionally) select the provider from the in-app status bar. Any OpenAI-compatible endpoint works with the `openai` provider.

**Where is my data stored?**
Locally in a SQLite database file (`local.db`) at the project root. Nothing leaves your machine except the AI API requests you make.

**How do I deploy this?**
It's a standard Next.js app — build with `npm run build`, then `npm run start` (or deploy to Vercel). Just make sure the SQLite file path is writable in your deployment environment and that your API key is set.

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Read [AGENTS.md](AGENTS.md) to follow the conventions.
2. Fork the repo and create a feature branch.
3. Ensure `npm run lint` and `npm run build` pass, and run the regression tests in [scripts/](scripts/).
4. Open a pull request describing the change.

---

## ⭐ Support

If you find StudyWise useful, please **give it a star ⭐** — it helps more people discover the project and keeps the motivation going!

[![GitHub Stars](https://img.shields.io/github/stars/free1101/studywise?style=social)](https://github.com/free1101/studywise)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## ⚠️ Disclaimer

- **Local data only** — all learning content, annotations, and summaries are stored locally in SQLite. We never upload your data to any server.
- **Bring your own API key** — StudyWise calls AI providers using *your* API key. You are responsible for the usage and cost of your own key.
- This is an open-source learning demo project; use at your own discretion.
