import { NextResponse } from 'next/server'

interface ReviewQuestion {
  question: string
  answer: string
}

interface ExportAnnotation {
  quote: string
  body: string
  type: string
  aiReply?: string | null
}

function generateHtml(
  contentHtml: string,
  annotations: ExportAnnotation[],
  summary?: string | null,
  reviewQuestions: ReviewQuestion[] = [],
) {
  const annotationsHtml = annotations
    .map(
      (a, i) => `
    <div class="annotation">
      <div class="annotation-header">
        <span class="annotation-type ${a.type}">${a.type === 'question' ? '问题' : '笔记'}</span>
        <span class="annotation-index">#${i + 1}</span>
      </div>
      <div class="annotation-quote">"${a.quote}"</div>
      <div class="annotation-body">${a.body}</div>
      ${a.aiReply ? `<div class="ai-reply"><strong>AI 回复：</strong>${a.aiReply}</div>` : ''}
    </div>
  `
    )
    .join('\n')

  const summaryHtml = summary
    ? `
    <div class="block">
      <h2>学习总结</h2>
      <div class="summary-text">${summary}</div>
    </div>
  `
    : ''

  const reviewQuestionsHtml = reviewQuestions.length
    ? `
    <div class="block">
      <h2>复习题 (${reviewQuestions.length})</h2>
      ${reviewQuestions
        .map(
          (q, i) => `
      <div class="review-question">
        <div class="review-question-title">${i + 1}. ${q.question}</div>
        ${q.answer ? `<div class="review-answer"><strong>答案：</strong>${q.answer}</div>` : ''}
      </div>
    `,
        )
        .join('\n')}
    </div>
  `
    : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StudyWise 学习笔记 - ${new Date().toLocaleDateString('zh-CN')}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background: #f9fafb;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #111827;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 0.5rem;
    }
    .content {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 2rem;
    }
    .content h2 {
      font-size: 1.25rem;
      margin: 1.5rem 0 0.75rem;
      color: #1f2937;
    }
    .content p {
      margin-bottom: 0.75rem;
    }
    .content ul, .content ol {
      margin: 0.75rem 0;
      padding-left: 1.5rem;
    }
    .content li {
      margin-bottom: 0.25rem;
    }
    .annotations {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .annotation {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .annotation:last-child {
      margin-bottom: 0;
    }
    .annotation-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    .annotation-type {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-weight: 500;
    }
    .annotation-type.note {
      background: #dbeafe;
      color: #1e40af;
    }
    .annotation-type.question {
      background: #fef3c7;
      color: #92400e;
    }
    .annotation-index {
      color: #9ca3af;
      font-size: 0.875rem;
    }
    .annotation-quote {
      font-style: italic;
      color: #6b7280;
      padding: 0.5rem;
      background: #f3f4f6;
      border-radius: 4px;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }
    .annotation-body {
      font-size: 0.9375rem;
    }
    .ai-reply {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: #f0fdf4;
      border-left: 3px solid #22c55e;
      border-radius: 4px;
      font-size: 0.875rem;
    }
    .ai-reply strong {
      color: #16a34a;
    }
    .block {
      background: white;
      padding: 1.5rem 2rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 1.5rem;
    }
    .block h2 {
      font-size: 1.25rem;
      margin-bottom: 0.75rem;
      color: #1f2937;
    }
    .summary-text {
      white-space: pre-wrap;
      font-size: 0.9375rem;
      color: #374151;
      line-height: 1.7;
    }
    .review-question {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 0.75rem 1rem;
      margin-bottom: 0.75rem;
    }
    .review-question:last-child {
      margin-bottom: 0;
    }
    .review-question-title {
      font-weight: 500;
      margin-bottom: 0.5rem;
    }
    .review-answer {
      padding: 0.5rem;
      background: #f0fdf4;
      border-left: 3px solid #22c55e;
      border-radius: 4px;
      font-size: 0.875rem;
      color: #374151;
    }
    .footer {
      text-align: center;
      color: #9ca3af;
      font-size: 0.875rem;
      margin-top: 2rem;
    }
  </style>
</head>
<body>
  <h1>StudyWise 学习笔记</h1>
  
  <div class="content">
    ${contentHtml}
  </div>

  <div class="annotations">
    <h2 style="margin-bottom: 1rem; font-size: 1.25rem; color: #1f2937;">
      批注 (${annotations.length})
    </h2>
    ${annotationsHtml || '<p style="color: #9ca3af;">暂无批注</p>'}
  </div>

  ${summaryHtml}
  ${reviewQuestionsHtml}

  <div class="footer">
    <p>由 StudyWise 生成 - ${new Date().toLocaleDateString('zh-CN')}</p>
  </div>
</body>
</html>`
}

export async function POST(request: Request) {
  try {
    const { contentHtml, annotations, summary, reviewQuestions } = await request.json()

    if (!contentHtml) {
      return NextResponse.json(
        { error: 'contentHtml is required' },
        { status: 400 }
      )
    }

    const html = generateHtml(contentHtml, annotations || [], summary, reviewQuestions || [])

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="studywise-export-${Date.now()}.html"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
