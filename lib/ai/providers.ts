import { createVolcengineClient, VOLCENGINE_MODEL } from './volcengine'
import OpenAI from 'openai'

export type AIProvider = 'volcengine' | 'openai' | 'claude'

export function getDefaultProvider(): AIProvider {
  return (process.env.DEFAULT_AI_PROVIDER as AIProvider) || 'volcengine'
}

function getClient(provider: AIProvider): OpenAI {
  switch (provider) {
    case 'volcengine':
      return createVolcengineClient()
    case 'openai':
      return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: 'https://api.openai.com/v1',
      })
    default:
      return createVolcengineClient()
  }
}

function getModel(provider: AIProvider): string {
  switch (provider) {
    case 'volcengine':
      return VOLCENGINE_MODEL
    case 'openai':
      return 'gpt-4o-mini'
    default:
      return VOLCENGINE_MODEL
  }
}

export async function* chatStream(
  messages: OpenAI.ChatCompletionMessageParam[],
  provider: AIProvider = getDefaultProvider()
) {
  const client = getClient(provider)
  const model = getModel(provider)

  const stream = await client.chat.completions.create({
    model,
    messages,
    stream: true,
  })

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content
    if (content) {
      yield content
    }
  }
}

export async function chat(
  messages: OpenAI.ChatCompletionMessageParam[],
  provider: AIProvider = getDefaultProvider()
): Promise<string> {
  const client = getClient(provider)
  const model = getModel(provider)

  const response = await client.chat.completions.create({
    model,
    messages,
  })

  return response.choices[0]?.message?.content || ''
}

// 回复批注中的问题/笔记（带学习内容上下文）
// previousReply：多轮追问时，可选携带上一轮 AI 回答作为上下文，保证追加提问回答连贯。
export async function replyToAnnotation(
  annotationBody: string,
  annotationType: 'note' | 'question',
  selectedQuote: string,
  provider: AIProvider = getDefaultProvider(),
  contentHtml?: string,
  previousReply?: string
): Promise<string> {
  // 从 HTML 中提取纯文本作为上下文
  const contentText = contentHtml
    ? contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 3000)
    : ''

  const systemPrompt = annotationType === 'question'
    ? `你是一个学习助手。用户在阅读学习内容时对某段文字提出了问题。
请结合学习内容的上下文，给出清晰、有帮助的回答。
回答要简洁但完整，引用相关内容来支持你的回答。`
    : `你是一个学习助手。用户在阅读学习内容时对某段文字添加了笔记。
请结合学习内容的上下文，对用户的笔记进行补充、扩展或提供相关见解。`

  const userContent = contentText
    ? `学习内容摘要：\n${contentText}\n\n---\n\n用户选中的原文：\n"${selectedQuote}"\n\n用户${annotationType === 'question' ? '的问题' : '的笔记'}：\n${annotationBody}`
    : `用户选中的原文：\n"${selectedQuote}"\n\n用户${annotationType === 'question' ? '的问题' : '的笔记'}：\n${annotationBody}`

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ]

  // 多轮追问上下文：将上一轮 AI 回答作为 assistant 消息注入，作为追加提问的前置上下文
  if (previousReply) {
    messages.push({ role: 'assistant', content: `AI 上一轮的回答：\n${previousReply}` })
  }

  messages.push({ role: 'user', content: userContent })

  return chat(messages, provider)
}

// 生成总结和复习题（带学习内容）
export async function generateSummary(
  annotations: Array<{ quote: string; body: string; type: string; aiReply?: string }>,
  provider: AIProvider = getDefaultProvider(),
  contentHtml?: string
): Promise<{ summary: string; reviewQuestions: Array<{ question: string; answer: string }> }> {
  const contentText = contentHtml
    ? contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 4000)
    : ''

  const annotationsText = annotations
    .map((a, i) => `${i + 1}. [${a.type === 'question' ? '问题' : '笔记'}] "${a.quote}" → ${a.body}${a.aiReply ? `\n   AI回复: ${a.aiReply}` : ''}`)
    .join('\n\n')

  const userContent = contentText
    ? `学习内容：\n${contentText}\n\n---\n\n用户的笔记和问题：\n\n${annotationsText}`
    : `用户的笔记和问题：\n\n${annotationsText}`

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `你是一个学习助手。请根据学习内容和用户的笔记/问题，生成一份学习总结和复习题。

要求：
1. 总结要以学习内容为主体，结合用户的笔记和问题进行补充
2. 总结要涵盖学习内容的关键知识点
3. 结合用户的笔记和问题，指出重点和易错点
4. 复习题要基于学习内容，帮助用户巩固知识

请返回 JSON 格式：
{
  "summary": "学习总结内容（300-500字，分段落）",
  "reviewQuestions": [
    { "question": "复习题1", "answer": "答案1" },
    { "question": "复习题2", "answer": "答案2" },
    { "question": "复习题3", "answer": "答案3" },
    { "question": "复习题4", "answer": "答案4" },
    { "question": "复习题5", "answer": "答案5" }
  ]
}`,
    },
    {
      role: 'user',
      content: userContent,
    },
  ]

  const response = await chat(messages, provider)

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch {
    // 解析失败
  }

  return {
    summary: response,
    reviewQuestions: [],
  }
}
