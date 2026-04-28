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
    const { headers, sampleRows, fileName } = req.body;
    const messages = [
      {
        role: 'system',
        content: `你是一个财务文档分类专家。根据文件名、表头和样本数据，判断文档类型。
只能返回以下 JSON 格式（不要返回其他内容）：
{"type": "bank_statement" 或 "company_ledger" 或 "bank_receipt" 或 "invoice" 或 "unknown", "confidence": 0-100, "reason": "一句话说明判断依据"}`
      },
      {
        role: 'user',
        content: `文件名：${fileName}\n表头：${JSON.stringify(headers)}\n前3行数据：${JSON.stringify(sampleRows)}`
      }
    ];
    const data = await callGLM(messages);
    const content = data.choices?.[0]?.message?.content || '{}';
    try {
      const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
      res.status(200).json(parsed);
    } catch {
      res.status(200).json({ type: 'unknown', confidence: 0, reason: content });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
