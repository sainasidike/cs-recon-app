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
    const { ocrResult } = req.body;
    const messages = [
      {
        role: 'system',
        content: `你是财务数据提取专家。从 OCR 识别的表格数据中，提取结构化的财务记录。
返回 JSON 格式：
{
  "entries": [{"date": "YYYY-MM-DD", "description": "摘要", "debit": 金额或null, "credit": 金额或null, "balance": 余额或null, "counterparty": "对方或null"}],
  "docType": "bank_statement/company_ledger/bank_receipt/invoice",
  "metadata": {"company": "公司名", "period": "对账期间", "account": "账号"}
}`
      },
      {
        role: 'user',
        content: `OCR 识别结果：${JSON.stringify(ocrResult).slice(0, 6000)}`
      }
    ];
    const data = await callGLM(messages, { max_tokens: 4096 });
    const content = data.choices?.[0]?.message?.content || '{}';
    try {
      res.status(200).json(JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim()));
    } catch {
      res.status(200).json({ entries: [], docType: 'unknown', metadata: {}, raw: content });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
