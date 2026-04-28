import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { readFileSync } from 'fs';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const TEXTIN_APP_ID = process.env.TEXTIN_APP_ID || '';
const TEXTIN_SECRET = process.env.TEXTIN_SECRET || '';
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || '';

// ---------- TextIn OCR ----------

app.post('/api/ocr/table', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未上传文件' });

    const url = 'https://api.textin.com/ai/service/v2/recognize/table/multipage?excel=1';
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'x-ti-app-id': TEXTIN_APP_ID,
        'x-ti-secret-code': TEXTIN_SECRET,
        'Content-Type': 'application/octet-stream',
      },
      body: req.file.buffer,
    });
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ocr/bank-receipt', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未上传文件' });

    const url = 'https://api.textin.com/ai/service/v1/bank_receipt?multipage=1';
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'x-ti-app-id': TEXTIN_APP_ID,
        'x-ti-secret-code': TEXTIN_SECRET,
        'Content-Type': 'application/octet-stream',
      },
      body: req.file.buffer,
    });
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ocr/invoice', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未上传文件' });

    const url = 'https://api.textin.com/robot/v1.0/api/vat_invoice';
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'x-ti-app-id': TEXTIN_APP_ID,
        'x-ti-secret-code': TEXTIN_SECRET,
        'Content-Type': 'application/octet-stream',
      },
      body: req.file.buffer,
    });
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Zhipu GLM AI ----------

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

app.post('/api/ai/classify', async (req, res) => {
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
      res.json(parsed);
    } catch {
      res.json({ type: 'unknown', confidence: 0, reason: content });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/analyze-diff', async (req, res) => {
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
      res.json(JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim()));
    } catch {
      res.json({ reason: content, suggestion: '建议人工核实', riskLevel: 'medium' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/suggest-voucher', async (req, res) => {
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
      res.json(JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim()));
    } catch {
      res.json({ debitAccount: '待确认', creditAccount: '待确认', amount: entry.amount, summary: entry.description, explanation: content });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/report-summary', async (req, res) => {
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
    res.json({ report: content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/ai/extract-table', async (req, res) => {
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
      res.json(JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim()));
    } catch {
      res.json({ entries: [], docType: 'unknown', metadata: {}, raw: content });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
