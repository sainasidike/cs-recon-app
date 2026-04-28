const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || '';

async function callGLM(messages, options = {}) {
  const resp = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ZHIPU_API_KEY}`,
    },
    body: JSON.stringify({
      model: options.model || 'glm-4-flash-250414',
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens || 2048,
      stream: false,
    }),
  });
  return resp.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!ZHIPU_API_KEY) return res.status(500).json({ error: 'Zhipu API 未配置' });

  try {
    const { reconciliation, matchResults, scenarioContext } = req.body;
    const ctx = scenarioContext || '通用对账';
    const messages = [
      {
        role: 'system',
        content: `你是财务对账报告撰写专家。当前对账场景：${ctx}。根据对账结果生成一份简洁的自然语言对账总结报告。
要求：1）概述对账结果 2）列出主要差异项及原因 3）给出后续处理建议。
控制在300字以内，使用专业财务语言。直接返回报告文本，不要用 JSON。`
      },
      {
        role: 'user',
        content: `对账摘要：
- A方余额：¥${reconciliation.sideABalance}
- B方余额：¥${reconciliation.sideBBalance}
- 调节后A方余额：¥${reconciliation.sideAAdjusted}
- 调节后B方余额：¥${reconciliation.sideBAdjusted}
- 是否平衡：${reconciliation.isBalanced ? '是' : '否'}
- 精确匹配：${reconciliation.matchSummary.exactCount}笔
- 模糊匹配：${reconciliation.matchSummary.fuzzyCount}笔
- 语义匹配：${reconciliation.matchSummary.semanticCount}笔
- 未匹配(A方)：${reconciliation.matchSummary.unmatchedACount}笔
- 未匹配(B方)：${reconciliation.matchSummary.unmatchedBCount}笔
A方调节项加：${JSON.stringify(reconciliation.sideAAdj.adds.map(i => ({ desc: i.description, amount: i.amount })))}
A方调节项减：${JSON.stringify(reconciliation.sideAAdj.subs.map(i => ({ desc: i.description, amount: i.amount })))}
B方调节项加：${JSON.stringify(reconciliation.sideBAdj.adds.map(i => ({ desc: i.description, amount: i.amount })))}
B方调节项减：${JSON.stringify(reconciliation.sideBAdj.subs.map(i => ({ desc: i.description, amount: i.amount })))}`
      }
    ];
    const data = await callGLM(messages);
    const content = data.choices?.[0]?.message?.content || '暂无报告';
    res.status(200).json({ report: content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
