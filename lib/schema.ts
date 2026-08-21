import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// 学习会话
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  title: text('title'),
  aiProvider: text('ai_provider').default('volcengine'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})

// 学习内容
export const contents = sqliteTable('contents', {
  id: text('id').primaryKey(),
  sessionId: text('session_id'),
  html: text('html'),
  source: text('source'), // 'user_upload' | 'ai_generated'
  createdAt: integer('created_at', { mode: 'timestamp' }),
})

// 批注（笔记/问题）
export const annotations = sqliteTable('annotations', {
  id: text('id').primaryKey(),
  contentId: text('content_id'),
  quote: text('quote'),
  quoteOffset: integer('quote_offset'),
  quoteLength: integer('quote_length'),
  body: text('body'),
  type: text('type'), // 'note' | 'question'
  aiReply: text('ai_reply'),
  color: text('color').default('#FFEB3B'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
})

// 学习总结
export const summaries = sqliteTable('summaries', {
  id: text('id').primaryKey(),
  sessionId: text('session_id'),
  reviewQuestions: text('review_questions'), // JSON
  aiEvaluation: text('ai_evaluation'), // JSON
  finalSummary: text('final_summary'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
})

// 导出类型
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type Content = typeof contents.$inferSelect
export type NewContent = typeof contents.$inferInsert
export type Annotation = typeof annotations.$inferSelect
export type NewAnnotation = typeof annotations.$inferInsert
export type Summary = typeof summaries.$inferSelect
export type NewSummary = typeof summaries.$inferInsert

// 聊天消息类型
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}
