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
    const { bankEntry, companyEntry, diffType, diffDays, amountDiff } = req.body;
    const messages = [
      {
        role: 'system',
        content: `你是银行对账差异分析专家。分析银行流水和企业账簿之间的差异，给出原因分析和处理建议。
返回 JSON 格式：{"reason": "差异原因", "suggestion": "处理建议", "riskLevel": "low/medium/high"}`
      },
      {
        role: 'user',
        content: `银行记录：日期=${bankEntry.date}，摘要=${bankEntry.description}，金额=${bankEntry.amount}，方向=${bankEntry.direction}
企业记录：日期=${companyEntry.date}，摘要=${companyEntry.description}，金额=${companyEntry.amount}，方向=${companyEntry.direction}
差异类型：${diffType}${diffDays ? `，日期差${diffDays}天` : ''}${amountDiff ? `，金额差¥${amountDiff}` : ''}`
      }
    ];
    const data = await callGLM(messages);
    const content = data.choices?.[0]?.message?.content || '{}';
    try {
      res.status(200).json(JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim()));
    } catch {
      res.status(200).json({ reason: content, suggestion: '建议人工核实', riskLevel: 'medium' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
