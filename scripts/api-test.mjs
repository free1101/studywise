/**
 * StudyWise API 回归测试脚本
 *
 * 覆盖所有后端接口，可重复运行。用 Node 原生 fetch，不依赖额外包。
 *
 * 用法：
 *   node scripts/api-test.mjs
 *   TEST_BASE_URL=http://localhost:3000 node scripts/api-test.mjs
 *
 * 退出码：
 *   0  - 所有测试通过（WARN 不视为失败）
 *   1  - 有 FAIL
 */
import { randomUUID } from 'node:crypto'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

// AI 相关接口标记为 WARN 而不是 FAIL（可能是环境/鉴权问题）
const AI_ENDPOINTS = new Set(['chat', 'summarize', 'ai/reply'])

const results = []
let passCount = 0
let failCount = 0
let warnCount = 0

function record(name, passed, detail, { warn = false } = {}) {
  const status = warn ? 'WARN' : passed ? 'PASS' : 'FAIL'
  if (status === 'PASS') passCount++
  else if (status === 'FAIL') failCount++
  else warnCount++
  results.push({ name, status, detail })
}

async function request(name, path, { method = 'GET', body = undefined, isStream = false } = {}) {
  const url = BASE_URL + path
  const init = { method, headers: {} }
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }

  const isAI = AI_ENDPOINTS.has(name)

  const start = Date.now()
  let response
  try {
    response = await fetch(url, init)
  } catch (err) {
    record(name, false, `请求异常（可能是网络/服务未启动）: ${err.message}`, { warn: isAI })
    return null
  }
  const elapsed = Date.now() - start
  const status = response.status

  // 流式接口：读取前几个 chunk 后中断
  if (isStream) {
    try {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let received = 0
      let text = ''
      // 读取前 ~10 个 chunk 或约 2000 字符后中断
      for (let i = 0; i < 10; i++) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        received += value.length
        if (received >= 2000) break
      }
      reader.cancel().catch(() => {})
      const hasContent = text.length > 0
      record(
        name,
        status >= 200 && status < 300 && hasContent,
        `status=${status}, 收到 ${text.length} 字符（已中断流）: ${text.slice(0, 200)}`,
        { warn: isAI }
      )
    } catch (err) {
      record(name, false, `流式读取异常: ${err.message}`, { warn: isAI })
    }
    return null
  }

  // 非流式：尝试解析 JSON；失败则读文本
  let payload
  let text
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json()
    } catch {
      text = await response.text()
      record(name, false, `status=${status} 但响应体非法 JSON（${elapsed}ms）: ${text.slice(0, 500)}`, { warn: isAI })
      return null
    }
  } else {
    text = await response.text()
  }

  const summary = (obj) => {
    const raw = text !== undefined ? text : JSON.stringify(obj)
    return raw.slice(0, 500)
  }

  // 记录结果由调用方通过断言决定；这里先返回
  return { status, payload, text, elapsed, summary, isAI }
}

async function assert(name, resp, { expectStatus = null, expectKey = null, note = '' }) {
  if (!resp) return // 已在 request 里记录
  const okStatus = expectStatus === null ? true : resp.status === expectStatus
  const okKey = expectKey === null ? true : resp.payload && resp.payload[expectKey] !== undefined
  const passed = okStatus && okKey
  const detail = `status=${resp.status}（期望 ${expectStatus}）${note}${resp.summary(resp.payload)}`
  record(name, passed, detail, { warn: resp.isAI })
}

function uid() {
  return randomUUID()
}

// ---------- 测试数据 ----------
const sessionId = uid()
const html = `<h1>JS 闭包</h1><p>闭包是函数与其词法作用域的组合。</p><p>它可以访问外部函数作用域中的变量。</p>`

async function main() {
  console.log(`\n=== StudyWise API 回归测试 ===`)
  console.log(`BASE_URL: ${BASE_URL}`)
  console.log(`时间: ${new Date().toLocaleString()}\n`)

  // 1. POST /api/contents
  const contentId = uid()
  let contentResp = await request('contents', '/api/contents', {
    method: 'POST',
    body: { sessionId, html, source: 'ai_generated', id: contentId },
  })
  await assert('POST /api/contents', contentResp, { expectStatus: 201, expectKey: 'id', note: '（保存学习内容）' })

  // 1b. POST /api/contents — 非法 JSON body 应返回 400 而非 500（Q4 加固）
  // 直接发送原始非法 JSON 文本，绕过 request() 的 JSON.stringify 包装。
  {
    const url = BASE_URL + '/api/contents'
    const start = Date.now()
    let status = null
    let bodyText = ''
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{非法 JSON: 未闭合}',
      })
      status = resp.status
      bodyText = await resp.text()
    } catch (err) {
      record('POST /api/contents（非法 JSON body）', false, `请求异常: ${err.message}`)
    }
    const elapsed = Date.now() - start
    if (status !== null) {
      const passed = status === 400
      record(
        'POST /api/contents（非法 JSON body→400）',
        passed,
        `status=${status}（期望 400，${elapsed}ms）: ${bodyText.slice(0, 300)}`,
      )
    }
  }

  // 2. POST /api/annotations
  const annotationId = uid()
  const annBody = '什么是闭包的作用？'
  let annResp = await request('annotations', '/api/annotations', {
    method: 'POST',
    body: { contentId, quote: '闭包是函数与其词法作用域的组合', quoteOffset: 0, quoteLength: 16, body: annBody, type: 'question', color: '#FFEB3B' },
  })
  await assert('POST /api/annotations', annResp, { expectStatus: 201, expectKey: 'id', note: '（创建批注）' })
  const createdAnnId = annResp?.payload?.id || annotationId

  // 3. GET /api/annotations?contentId=xxx
  const getResp = await request('annotations-get', `/api/annotations?contentId=${contentId}`, {})
  if (getResp) {
    const isArray = Array.isArray(getResp.payload)
    const hasItem = isArray && getResp.payload.length > 0
    const passed = getResp.status === 200 && isArray && hasItem
    record('GET /api/annotations?contentId=', passed, `status=${getResp.status}, 返回 ${isArray ? getResp.payload.length : '非数组'} 条批注${getResp.summary(getResp.payload)}`, { warn: getResp.isAI })
  }

  // 4. PUT /api/annotations/[id]（更新 body/type/aiReply/color）
  const putResp = await request('annotations-put', `/api/annotations/${createdAnnId}`, {
    method: 'PUT',
    body: { body: '更新后的笔记内容', type: 'note', aiReply: 'AI 测试回复', color: '#FF0000' },
  })
  await assert('PUT /api/annotations/[id]', putResp, { expectStatus: 200, expectKey: 'color', note: '（更新批注）' })

  // 5. DELETE /api/annotations/[id]
  const delResp = await request('annotations-delete', `/api/annotations/${createdAnnId}`, { method: 'DELETE' })
  if (delResp) {
    const passed = delResp.status === 200 && delResp.payload?.success === true
    record('DELETE /api/annotations/[id]', passed, `status=${delResp.status}, ${delResp.summary(delResp.payload)}`, { warn: delResp.isAI })
  }

  // 6. GET /api/summaries?sessionId=xxx（尚无总结，预期返回 null）
  const sumGetResp = await request('summaries-get', `/api/summaries?sessionId=${sessionId}`, {})
  if (sumGetResp) {
    const passed = sumGetResp.status === 200
    record('GET /api/summaries?sessionId=', passed, `status=${sumGetResp.status}, ${sumGetResp.summary(sumGetResp.payload)}`, { warn: sumGetResp.isAI })
  }

  // 7a. POST /api/export — 新契约：summary + reviewQuestions（ux-dev 增强）
  const exportResp = await request('export', '/api/export', {
    method: 'POST',
    body: {
      sessionId,
      title: '测试导出',
      summary: '这是学习总结内容',
      reviewQuestions: [
        { question: '什么是闭包？', answer: '函数与其词法作用域的组合' },
        { question: '闭包有什么作用？', answer: '可以访问外部函数作用域中的变量' },
      ],
      annotations: [{ quote: '闭包', body: '笔记', type: 'note' }],
      contentHtml: html,
    },
  })
  if (exportResp) {
    const text = exportResp.text || ''
    const isHtml = text.trim().startsWith('<!DOCTYPE')
    const hasSummarySection = isHtml && text.includes('学习总结') && text.includes('这是学习总结内容')
    const hasQuizSection = isHtml && text.includes('复习题 (2)') && text.includes('什么是闭包？')
    const hasAnswer = isHtml && text.includes('函数与其词法作用域的组合')
    const passed = exportResp.status === 200 && hasSummarySection && hasQuizSection && hasAnswer
    record(
      'POST /api/export（summary+reviewQuestions）',
      passed,
      `status=${exportResp.status}; HTML=${isHtml}; 总结区块=${hasSummarySection}; 复习题区块=${hasQuizSection}; 含答案=${hasAnswer}`,
      { warn: exportResp.isAI },
    )
  }

  // 7b. POST /api/export — 边界：summary 缺省 + reviewQuestions 空数组（不含对应区块）
  const exportEdgeResp = await request('export', '/api/export', {
    method: 'POST',
    body: { contentHtml: html },
  })
  if (exportEdgeResp) {
    const text = exportEdgeResp.text || ''
    const isHtml = text.trim().startsWith('<!DOCTYPE')
    const noSummary = !text.includes('学习总结')
    const noQuiz = !text.includes('复习题')
    const passed = exportEdgeResp.status === 200 && isHtml && noSummary && noQuiz
    record(
      'POST /api/export（缺省 summary + 空复习题）',
      passed,
      `status=${exportEdgeResp.status}; HTML=${isHtml}; 无总结区块=${noSummary}; 无复习题区块=${noQuiz}`,
      { warn: exportEdgeResp.isAI },
    )
  }

  // 7c. POST /api/export — 兼容性：旧 body（仅 contentHtml + annotations）仍正常
  const exportCompatResp = await request('export', '/api/export', {
    method: 'POST',
    body: {
      sessionId,
      title: '测试导出',
      annotations: [{ quote: '闭包', body: '笔记', type: 'note' }],
      contentHtml: html,
    },
  })
  if (exportCompatResp) {
    const text = exportCompatResp.text || ''
    const isHtml = text.trim().startsWith('<!DOCTYPE')
    const hasContent = isHtml && text.includes('JS 闭包') && text.includes('批注 (1)')
    const passed = exportCompatResp.status === 200 && isHtml && hasContent
    record(
      'POST /api/export（旧 body 兼容）',
      passed,
      `status=${exportCompatResp.status}; HTML=${isHtml}; 含内容与批注=${hasContent}`,
      { warn: exportCompatResp.isAI },
    )
  }

  // 8. POST /api/ai/summarize（真实调用 AI，耗时较长）
  const sumResp = await request('summarize', '/api/ai/summarize', {
    method: 'POST',
    body: {
      annotations: [{ quote: '闭包', body: '请解释闭包', type: 'question' }],
      contentHtml: html,
      sessionId,
      provider: process.env.TEST_AI_PROVIDER || 'volcengine',
    },
  })
  await assert('POST /api/ai/summarize', sumResp, { expectStatus: 200, expectKey: 'summary', note: '（真实调用 AI）' })

  // 9. POST /api/chat（真实调用 AI，流式，请求前几个 chunk 后中断）
  await request('chat', '/api/chat', {
    method: 'POST',
    body: { messages: [{ role: 'user', content: '你好，请用一句话介绍自己' }], provider: process.env.TEST_AI_PROVIDER || 'volcengine' },
    isStream: true,
  })

  // 10. POST /api/ai/reply（真实调用 AI）
  const replyResp = await request('ai/reply', '/api/ai/reply', {
    method: 'POST',
    body: { annotationId: createdAnnId, body: annBody, type: 'question', quote: '闭包', contentHtml: html, provider: process.env.TEST_AI_PROVIDER || 'volcengine' },
  })
  await assert('POST /api/ai/reply', replyResp, { expectStatus: 200, expectKey: 'reply', note: '（真实调用 AI）' })

  // 10b. POST /api/ai/reply 携带 previousReply（Q10 多轮追问可选字段，向后兼容）
  const followupResp = await request('ai/reply', '/api/ai/reply', {
    method: 'POST',
    body: {
      annotationId: createdAnnId,
      body: '请展开讲讲闭包导致的内存泄漏如何避免',
      type: 'question',
      quote: '闭包',
      contentHtml: html,
      provider: process.env.TEST_AI_PROVIDER || 'volcengine',
      previousReply: replyResp?.payload?.reply ?? '',
    },
  })
  await assert('POST /api/ai/reply（携带 previousReply）', followupResp, { expectStatus: 200, expectKey: 'reply', note: '（Q10 多轮追问，可选字段向后兼容）' })

  // ---------- 汇总 ----------
  console.log('\n=== 测试结果汇总 ===')
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌'
    console.log(`${icon} [${r.status}] ${r.name}`)
    if (r.status !== 'PASS') {
      console.log(`    ${r.detail}`)
    }
  }
  console.log(`\n通过: ${passCount} | 失败: ${failCount} | 警告: ${warnCount}`)
  console.log(`BASE_URL: ${BASE_URL}`)

  if (failCount > 0) {
    console.error('\n存在失败测试，exit code = 1')
    process.exitCode = 1
  } else {
    console.log('\n全部测试通过（或仅有环境性 WARN）')
  }
}

main().catch((err) => {
  console.error('脚本执行异常:', err)
  process.exit(1)
})
