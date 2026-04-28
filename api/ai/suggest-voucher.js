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
    const { entry, unmatchType } = req.body;
    const messages = [
      {
        role: 'system',
        content: `你是会计凭证专家。根据未匹配的交易记录，推荐应补记的会计凭证。
返回 JSON 格式：{"debitAccount": "借方科目", "creditAccount": "贷方科目", "amount": 金额数字, "summary": "凭证摘要", "explanation": "一句话说明为什么这样记账"}`
      },
      {
        role: 'user',
        content: `未匹配类型：${unmatchType === 'bank_only' ? '银行已记企业未记' : '企业已记银行未记'}
交易记录：日期=${entry.date}，摘要=${entry.description}，金额=${entry.amount}，方向=${entry.direction}，对方=${entry.counterparty || '无'}`
      }
    ];
    const data = await callGLM(messages);
    const content = data.choices?.[0]?.message?.content || '{}';
    try {
      res.status(200).json(JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim()));
    } catch {
      res.status(200).json({ debitAccount: '待确认', creditAccount: '待确认', amount: entry.amount, summary: entry.description, explanation: content });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
