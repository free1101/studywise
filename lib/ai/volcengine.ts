import OpenAI from 'openai'

// 火山引擎 DeepSeek（OpenAI 兼容格式）
export function createVolcengineClient() {
  return new OpenAI({
    apiKey: process.env.VOLCENGINE_API_KEY || '',
    baseURL: process.env.VOLCENGINE_ENDPOINT || 'https://ark.cn-beijing.volces.com/api/plan/v3',
  })
}

export const VOLCENGINE_MODEL = process.env.VOLCENGINE_MODEL || 'deepseek-v4-flash'
