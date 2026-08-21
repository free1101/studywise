/**
 * StudyWise 前端纯逻辑回归测试（Node 原生，无依赖、无 DOM/React）
 *
 * 覆盖 useChat.ts 的 HTML 提取契约，验证三种 ```html 围栏模式的提取行为：
 *   1) 围栏带 ```html 标记
 *   2) 首行即 HTML 标签（``` 后直接标签）
 *   3) 围栏后含解释文本（结尾 ``` 之后追加说明）
 * 以及：气泡最终不显示 HTML 原文。
 *
 * 说明：此脚本是自包含的契约测试（内联实现了与 useChat.extractHtml 等价的判定逻辑），
 * 不导入业务代码、不改任何业务文件。若 useChat.ts 的实现被改动，本测试的断言需同步对齐契约。
 *
 * 用法：node scripts/frontend-logic-test.mjs
 * 退出码：0=全部通过，1=存在失败
 */

// ---------- 与 useChat.ts extractHtml 等价的提取逻辑 ----------
function looksLikeHtml(s) {
  return /<(?:div|section|article|main|body|html|h[1-6]|p|ul|ol|table|span)\b/i.test(s)
}

// 返回字符串是否含完整 HTML 结构（用于断言气泡不显示原文）
function containsHtmlTag(s) {
  return /<(?:\/?)(?:div|section|article|main|body|html|h[1-6]|p|ul|ol|table|span)\b/i.test(s)
}

// 截断到最后一个 HTML 闭合标签（容忍流式输出缺结尾围栏/标签中途被切断）
function truncateToLastTag(s) {
  const closes = Array.from(s.matchAll(/<\/[a-zA-Z][\w:-]*\s*>/g))
  if (closes.length === 0) {
    const lastOpen = s.lastIndexOf('>')
    return lastOpen > 0 ? s.slice(0, lastOpen + 1) : s
  }
  const last = closes[closes.length - 1]
  const end = (last.index ?? 0) + last[0].length
  return s.slice(0, end)
}

function isSubstantialHtml(s) {
  return looksLikeHtml(s) && s.length > 40
}

function extractHtml(content) {
  // 1. 成对 ``` 围栏（带 html 标签或不带），允许围栏后换行/首行即标签，结尾 ``` 前可有换行/内容，围栏后可有解释文本
  const fenced = content.match(/```(?:html)?\s*\n?\s*(<[\s\S]*?)\n?\s*```/i)
  if (fenced && looksLikeHtml(fenced[1])) {
    return fenced[1].trim()
  }
  // 2. 完整 <html>...</html> 文档
  const doc = content.match(/<html[\s\S]*?<\/html>/i)
  if (doc) return doc[0]
  // 3. 只有开头围栏、缺结尾围栏（流式输出常被截断）：取围栏后到最后一个 HTML 闭合标签
  const openFence = content.match(/```(?:html)?\s*\n?\s*(<[\s\S]*)$/i)
  if (openFence) {
    const html = truncateToLastTag(openFence[1])
    if (isSubstantialHtml(html)) return html.trim()
  }
  // 4. 大段以 HTML 结构标签开头（含 h1-p/ul/ol/table 等）的内容，截断到最后一个闭合标签
  const bare = content.match(/<(\/?)(?:div|section|article|main|body|html|h[1-6]|p|ul|ol|li|table|blockquote|strong|em)\b[\s\S]*$/i)
  if (bare) {
    const html = truncateToLastTag(bare[0])
    if (isSubstantialHtml(html)) return html.trim()
  }
  return null
}

// 模拟 useChat.sendMessage 完成后的气泡最终内容：
// 提取到 HTML -> 调 onContentGenerated，气泡替换为引导语 + "学习内容已生成！"
function simulateFinalBubble(fullContent) {
  const htmlContent = extractHtml(fullContent)
  if (!htmlContent) return { html: null, bubble: fullContent }
  const idx = fullContent.indexOf(htmlContent)
  const intro = fullContent.slice(0, idx).trim()
  return {
    html: htmlContent,
    bubble: intro
      ? `${intro}\n\n学习内容已生成！请在中间区域查看和批注。`
      : '学习内容已生成！请在中间区域查看和批注。',
  }
}

// ---------- 测试用例 ----------
const cases = [
  {
    name: '围栏带 ```html 标记（含换行）',
    content: '好的，这是你要的学习内容：\n\n```html\n<h1>React 入门</h1>\n<p>组件是 UI 的基础。</p>\n```',
    expectHtml: true,
    expectBubbleNoHtml: true,
  },
  {
    name: '首行即 HTML 标签（``` 后无 html 标签、直接换行接标签）',
    content: '```\n<div><section><p>首行就是结构标签</p></section></div>\n```',
    expectHtml: true,
    expectBubbleNoHtml: true,
  },
  {
    name: '围栏后含解释文本（```html ... ``` 之后追加说明）',
    content: '```html\n<p>这是主体内容</p>\n```\n以上就是全部学习内容，如有问题可继续问我。',
    expectHtml: true,
    expectBubbleNoHtml: true,
  },
  {
    name: '无围栏、大段以 div 开头并闭合（bare 模式）',
    content: '接下来是完整内容：\n<div><article><p>无围栏包裹的大段 HTML 内容，长度足够长以触发判定。</p></article></div>',
    expectHtml: true,
    expectBubbleNoHtml: true,
  },
  {
    name: '完整 <html> 文档被引导语包裹',
    content: '已生成：<html><head></head><body><p>完整文档</p></body></html>',
    expectHtml: true,
    expectBubbleNoHtml: true,
  },
  {
    name: '围栏有开头缺结尾 + 首标签为 h1（流式截断，回归用）',
    content: '以下是学习内容：\n\n```html\n<h1>React 入门</h1>\n<p>组件是构建 UI 的基础。</p>\n<ul><li>要点一</li></ul>',
    expectHtml: true,
    expectBubbleNoHtml: true,
    expectExtractStart: '<h1>',
  },
  {
    name: '无围栏、直接以 h1 开头（真实保存样例，回归用）',
    content: '已为你生成：\n<h1>测试内容</h1><p>React 是一个用于构建用户界面的 JavaScript 库。</p>',
    expectHtml: true,
    expectBubbleNoHtml: true,
    expectExtractStart: '<h1>',
  },
  {
    name: '无围栏、以 p 开头并含列表（回归用）',
    content: '学习内容如下：\n<p>本段落介绍核心概念，内容长度足够。</p>\n<ul><li>第一点</li><li>第二点</li></ul>',
    expectHtml: true,
    expectBubbleNoHtml: true,
    expectExtractStart: '<p>',
  },
  {
    name: '嵌套 div 结构不被非贪婪提前截断（回归用）',
    content: '```html\n<div><p>第一段</p><div><p>第二段</p></div></div>\n```',
    expectHtml: true,
    expectBubbleNoHtml: true,
    expectExtractEnd: '</div>',
  },
  {
    name: '普通文本（无 HTML）——不提取',
    content: '你好，请告诉我你想学习什么主题？',
    expectHtml: false,
    expectBubbleNoHtml: true, // 原文无 HTML，气泡显示原文，不含标签
  },
]

// ---------- 执行 ----------
let pass = 0
let fail = 0
const failures = []

console.log('=== StudyWise 前端纯逻辑回归测试（HTML 提取契约） ===\n')

for (const c of cases) {
  const { html, bubble } = simulateFinalBubble(c.content)

  const htmlOk = c.expectHtml === (html !== null)
  const bubbleOk = !c.expectBubbleNoHtml || !containsHtmlTag(bubble)
  const startOk = !c.expectExtractStart || (html !== null && html.trimStart().startsWith(c.expectExtractStart))
  const endOk = !c.expectExtractEnd || (html !== null && html.trimEnd().endsWith(c.expectExtractEnd))
  const ok = htmlOk && bubbleOk && startOk && endOk

  if (ok) pass++
  else {
    fail++
    failures.push({
      name: c.name,
      detail: `提取结果: ${html === null ? 'null(未提取)' : `已提取(${html.length})`}（期望 ${c.expectHtml ? '已提取' : '未提取'}）; 气泡含 HTML 标签: ${containsHtmlTag(bubble)}; 前缀校验: ${startOk}; 后缀校验: ${endOk}; 提取内容前120字符: ${(html || '').slice(0, 120)}`,
    })
  }
  console.log(`${ok ? '✅ [PASS]' : '❌ [FAIL]'} ${c.name}`)
}

console.log(`\n通过: ${pass} | 失败: ${fail}`)

if (failures.length > 0) {
  console.error('\n失败详情：')
  for (const f of failures) {
    console.error(`- ${f.name}`)
    console.error(`    ${f.detail}`)
  }
  process.exitCode = 1
} else {
  console.log('全部前端逻辑测试通过。')
}
