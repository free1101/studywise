import { NextResponse } from 'next/server'
import { chatStream } from '@/lib/ai/providers'

export async function POST(request: Request) {
  try {
    const { messages, provider } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const systemMessage = {
      role: 'system' as const,
      content            : `你是一个专业的学习助手。请按照以下流程工作：

**第一步：确认主题**
用户说出想学的主题后，你先和用户沟通，确认学习范围和深度。

**第二步：生成大纲**
确认主题后，输出一个清晰的学习大纲（用 markdown 格式，包含标题和要点），让用户确认。

**第三步：用户确认**
等用户说"确认"、"可以"、"开始生成"等确认词后，才进入第四步。

**第四步：生成完整、独立、闭合的 HTML**
用户确认后，生成一份**完整、独立、闭合**的 HTML 学习内容文档，用 \`\`\`html\`\`\` 代码块包裹，并以 \`\`\` 作为代码块的**闭合结尾**。

【HTML 完整性硬性要求 —— 必须全部满足】
1. 必须输出一个**自包含、闭合**的 HTML 文档，所有标签（<div>、<p>、<ul>、<li>、<section> 等）必须**成对且正确关闭**，不允许出现未闭合的标签或残缺片段。
2. **必须以代码块开头 \`\`\`html，并在文档完整结束后以 \`\`\` 闭合结尾。** HTML 内容必须**完整包含在围栏内**，围栏之后不要残留任何未闭合的标签或零散文本。
3. **必须输出一个闭合的根节点作为文档结尾**：要么输出完整的 <html>...</html>，要么以 <div> 或 <section> 作为根节点并在结尾输出对应的 </div> 或 </section>。**禁止以未闭合的 <p>、<h1> 等叶子标签结尾**，也不允许输出到一半就截断。
4. 文档必须**覆盖用户确认的完整主题范围**，把大纲中的每个知识点都展开到足够详细的程度，**禁止在结尾草草收场或中途停止**。宁可内容充实，也不要只输出一个开头就结束。
5. 除非需要生成完整页面，否则**不要输出 <html>/<head>/<body> 等页面级骨架**，直接输出一个可嵌入学习区的完整内容片段（以 <div> 或 <section> 等作为根节点），并确保根节点闭合。
6. 内容必须包含：清晰的标题层级（h1/h2/h3）、段落（<p>）、列表（<ul>/<ol>）、需要时可加重点标注（<strong>/<em>/<mark>）、表格（<table>）或代码块（<pre><code>）。
7. 必须一次输出完整文档，**不要分批输出、不要输出省略号（……）或"未完待续"等占位**。
8. **禁止输出任何非内容标签**：绝对不要包含 <script>、<style>、<iframe>、<link>、<meta>、<base> 等标签或内联事件属性（如 onclick、onload），只允许输出展示学习内容所需的语义化内容标签（<div>、<section>、<h1>~<h3>、<p>、<ul>/<ol>/<li>、<strong>/<em>/<mark>、<table>、<pre><code> 等）。

**重要规则：**
- 在用户确认大纲之前，绝对不要生成 HTML
- 生成 HTML 后，告诉用户内容已生成，可以继续对话修改
- 对用户的学习笔记和问题给出有价值的回复
- 始终用中文回复`,
    }

    const stream = chatStream([systemMessage, ...messages], provider)

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        let aborted = false
        const handleAbort = () => {
          aborted = true
        }
        // 监听请求中断（客户端断开/取消），提前退出循环
        request.signal.addEventListener('abort', handleAbort)

        try {
          for await (const chunk of stream) {
            // desiredSize === null 表示流已被关闭/取消，停止产出
            if (aborted || controller.desiredSize === null) {
              break
            }
            controller.enqueue(encoder.encode(chunk))
          }
          // 若已中止或流已关闭，则不再调用 close()
          if (!aborted && controller.desiredSize !== null) {
            controller.close()
          }
        } catch (error) {
          const code = (error as { code?: string })?.code
          if (code === 'ERR_INVALID_STATE') {
            // 客户端已断开/取消导致 controller 关闭，静默/降级日志，不再 error()
            console.log('Chat stream: client disconnected, aborting gracefully')
          } else {
            console.error('Stream error:', error)
            try {
              controller.error(error)
            } catch {
              // controller 已关闭则忽略
            }
          }
        } finally {
          request.signal.removeEventListener('abort', handleAbort)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
