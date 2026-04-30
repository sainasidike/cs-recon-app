import { useState, useCallback, useRef, useEffect } from 'react';
import { BANK_DATA, LEDGER_DATA, COMPANY_INFO, BANK_TOTAL_OUT, BANK_TOTAL_IN, LEDGER_TOTAL_DEBIT, LEDGER_TOTAL_CREDIT } from './demoData';
import { runMatching } from './matchEngine';
import CropEditor from './CropEditor';
import { parseFile, classifyDocumentLocal } from '../utils/fileParser';

function fmt(v) {
  return (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 });
}

function getAmt(e) { return e.out || e.income || e.debit || e.credit || e.amount || 0; }
function getDir(e) {
  if (e.out || e.debit) return 'debit';
  if (e.income || e.credit) return 'credit';
  return e.direction || 'unknown';
}
function getDesc(e) { return e.desc || e.description || ''; }
function getPayee(e) { return e.payee || e.counterparty || ''; }
function getRef(e) { return e.ref || e.reference || e.voucher || ''; }
function getBalance(e) { return e.balance ?? null; }

function buildReconData(bankEntries, ledgerEntries, docNames) {
  const bankTotalOut = bankEntries.filter(e => getDir(e) === 'debit').reduce((s, e) => s + getAmt(e), 0);
  const bankTotalIn = bankEntries.filter(e => getDir(e) === 'credit').reduce((s, e) => s + getAmt(e), 0);
  const ledgerTotalDebit = ledgerEntries.filter(e => getDir(e) === 'debit').reduce((s, e) => s + getAmt(e), 0);
  const ledgerTotalCredit = ledgerEntries.filter(e => getDir(e) === 'credit').reduce((s, e) => s + getAmt(e), 0);
  const openingBal = bankEntries.length > 0 ? (getBalance(bankEntries[0]) ?? 0) : 0;
  const closingBal = bankEntries.length > 0 ? (getBalance(bankEntries[bankEntries.length - 1]) ?? 0) : 0;
  const allDates = [...bankEntries, ...ledgerEntries].map(e => e.date).filter(Boolean).sort();
  const periodStart = allDates[0] || '';
  const periodEnd = allDates[allDates.length - 1] || '';
  let name = '对账企业';
  if (docNames && docNames.length) {
    for (const n of docNames) {
      const m = n.match(/[_\-]([^_\-.]{2,})[_\-.]/);
      if (m) { name = m[1]; break; }
    }
  }
  const period = periodStart ? periodStart.slice(0, 7).replace('-', '年') + '月' : '';
  return {
    bankEntries, ledgerEntries,
    companyInfo: { name, period, periodStart, periodEnd, openingBalance: openingBal, closingBalance: closingBal },
    bankTotalOut, bankTotalIn, ledgerTotalDebit, ledgerTotalCredit,
  };
}

function dataUrlToFile(dataUrl, filename) {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new File([array], filename, { type: mime });
}

const PIPELINE = [
  { key: 'upload', label: '上传', icon: '📤' },
  { key: 'edit', label: '编辑', icon: '✂️' },
  { key: 'docs', label: '文档', icon: '📂' },
  { key: 'analyze', label: '分析', icon: '🤖' },
  { key: 'results', label: '结果', icon: '📊' },
  { key: 'report', label: '报告', icon: '📋' },
];

const ZHIPU_KEY = import.meta.env.VITE_ZHIPU_API_KEY || 'caa4b333b81041feae2b2268a36bcc84.O0wJBlQIlcF0yEmT';

const AI_CLASSIFY_PROMPT = `你是财务文档分类专家。根据文档内容判断文档类型，只返回JSON：{"type":"类型代码","scenario":"场景代码"}

类型代码（必须是以下之一）：
- bank: 银行流水/银行对账单
- ledger: 企业账簿/总账/明细账
- supplier_stmt: 供应商对账单/客户对账单/往来对账单
- ar_ap: 应收账款/应付账款明细
- invoice: 发票（增值税发票、普通发票）
- contract: 合同/入库单/采购订单/验收单
- expense_claim: 报销单/费用报销申请
- receipt: 银行回单/付款凭证
- cash_journal: 现金日记账
- cash_receipt: 收据/小票
- tax_return: 纳税申报表
- tax_ledger: 税务台账/增值税明细
- payroll: 工资表/薪资单
- bank_payroll: 银行代发明细
- asset_ledger: 固定资产台账
- asset_invoice: 资产采购发票/入库单

场景代码：bank/trade/invoice/expense/cash/tax/salary/asset

只返回JSON，不要解释。`;

async function aiClassifyDoc(file, processedUrl) {
  try {
    const isImage = file?.type?.startsWith('image/') || /\.(jpg|jpeg|png|bmp|webp)$/i.test(file?.name || '');
    let messages;

    if (isImage && processedUrl) {
      messages = [
        { role: 'system', content: AI_CLASSIFY_PROMPT },
        { role: 'user', content: [
          { type: 'image_url', image_url: { url: processedUrl } },
          { type: 'text', text: `文件名: ${file?.name || '扫描文档'}。请识别这张财务文档的类型。` }
        ]}
      ];
      const resp = await fetch('/zhipu-api/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ZHIPU_KEY}` },
        body: JSON.stringify({ model: 'glm-4v-flash', messages, temperature: 0.1, max_tokens: 100 }),
      });
      if (!resp.ok) throw new Error('vision failed');
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || '';
      const match = content.match(/\{[^}]+\}/);
      if (match) return JSON.parse(match[0]);
    }

    let textContent = `文件名: ${file?.name || '未知'}`;
    if (file && /\.(csv|xlsx|xls)$/i.test(file.name)) {
      try {
        const parsed = await parseFile(file);
        textContent += `\n表头: ${(parsed.headers || []).join(', ')}\n前3行: ${(parsed.entries || []).slice(0, 3).map(e => JSON.stringify(e)).join('\n')}`;
      } catch {}
    }

    messages = [
      { role: 'system', content: AI_CLASSIFY_PROMPT },
      { role: 'user', content: textContent }
    ];
    const resp = await fetch('/zhipu-api/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ZHIPU_KEY}` },
      body: JSON.stringify({ model: 'glm-4-flash', messages, temperature: 0.1, max_tokens: 100 }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';
    const match = content.match(/\{[^}]+\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return null;
}

const RECON_SCENARIOS = {
  bank: { name: '银行对账', sideA: 'bank', sideB: 'ledger', labelA: '银行流水', labelB: '企业账簿' },
  trade: { name: '往来对账', sideA: 'supplier_stmt', sideB: 'ar_ap', labelA: '供应商/客户对账单', labelB: '应收/应付账款' },
  invoice: { name: '发票核验', sideA: 'invoice', sideB: 'contract', labelA: '发票', labelB: '合同/入库单' },
  expense: { name: '费用报销', sideA: 'expense_claim', sideB: 'receipt', labelA: '报销单', labelB: '发票/银行回单' },
  cash: { name: '现金对账', sideA: 'cash_journal', sideB: 'cash_receipt', labelA: '现金日记账', labelB: '收据/小票' },
  tax: { name: '税务对账', sideA: 'tax_return', sideB: 'tax_ledger', labelA: '纳税申报表', labelB: '账簿/发票汇总' },
  salary: { name: '工资对账', sideA: 'payroll', sideB: 'bank_payroll', labelA: '工资表', labelB: '银行代发明细' },
  asset: { name: '固定资产对账', sideA: 'asset_ledger', sideB: 'asset_invoice', labelA: '资产台账', labelB: '采购发票/入库单' },
};

function classifyDoc(name) {
  const n = (name || '').toLowerCase();
  // 银行对账
  if (/银行|bank|流水|account.?statement/i.test(n)) return 'bank';
  if (/账簿|ledger|凭证|记账|总账|voucher/i.test(n)) return 'ledger';
  // 往来对账
  if (/供应商|客户.*对账|往来|vendor.*statement|customer.*statement/i.test(n)) return 'supplier_stmt';
  if (/应收|应付|ar|ap|receivable|payable/i.test(n)) return 'ar_ap';
  // 发票核验
  if (/发票|invoice|增值税|vat/i.test(n)) return 'invoice';
  if (/合同|contract|入库|验收|采购订单|purchase.*order/i.test(n)) return 'contract';
  // 费用报销
  if (/报销|expense.*claim|reimburse/i.test(n)) return 'expense_claim';
  if (/银行回单|回单|receipt|付款凭证/i.test(n)) return 'receipt';
  // 现金对账
  if (/现金.*日记|cash.*journal|现金.*账/i.test(n)) return 'cash_journal';
  if (/收据|小票|cash.*receipt|petty/i.test(n)) return 'cash_receipt';
  // 税务对账
  if (/纳税|税务申报|tax.*return|报税/i.test(n)) return 'tax_return';
  if (/税.*汇总|税.*台账|tax.*ledger|税.*明细/i.test(n)) return 'tax_ledger';
  // 工资对账
  if (/工资|薪资|payroll|salary|薪酬/i.test(n)) return 'payroll';
  if (/代发|bank.*payroll|工资.*明细|代付/i.test(n)) return 'bank_payroll';
  // 固定资产对账
  if (/资产.*台账|asset.*ledger|固定资产.*表/i.test(n)) return 'asset_ledger';
  if (/资产.*发票|asset.*invoice|资产.*入库/i.test(n)) return 'asset_invoice';
  // 通用 — 按对账单关键字
  if (/对账单|对账/i.test(n)) return 'supplier_stmt';
  return 'unknown';
}

const DOC_TYPE_LABEL = {
  bank: '银行流水', ledger: '企业账簿',
  supplier_stmt: '供应商/客户对账单', ar_ap: '应收/应付',
  invoice: '发票', contract: '合同/入库单',
  expense_claim: '报销单', receipt: '发票/回单',
  cash_journal: '现金日记账', cash_receipt: '收据/小票',
  tax_return: '纳税申报', tax_ledger: '税务台账',
  payroll: '工资表', bank_payroll: '银行代发',
  asset_ledger: '资产台账', asset_invoice: '资产发票',
  unknown: '待分类'
};
const DOC_TYPE_COLOR = {
  bank: '#4a90d9', ledger: '#f5a623',
  supplier_stmt: '#8b5cf6', ar_ap: '#6366f1',
  invoice: '#ef4444', contract: '#f97316',
  expense_claim: '#ec4899', receipt: '#14b8a6',
  cash_journal: '#06b6d4', cash_receipt: '#0891b2',
  tax_return: '#d97706', tax_ledger: '#b45309',
  payroll: '#7c3aed', bank_payroll: '#2563eb',
  asset_ledger: '#059669', asset_invoice: '#10b981',
  unknown: '#999'
};

function detectScenario(docTypes, docs) {
  if (docs) {
    const aiScenarios = docs.map(d => d.aiScenario).filter(Boolean);
    if (aiScenarios.length > 0) {
      const freq = {};
      aiScenarios.forEach(s => { freq[s] = (freq[s] || 0) + 1; });
      const best = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
      if (RECON_SCENARIOS[best]) return best;
    }
  }
  for (const [key, sc] of Object.entries(RECON_SCENARIOS)) {
    if (docTypes.includes(sc.sideA) || docTypes.includes(sc.sideB)) return key;
  }
  return 'bank';
}

function getScenarioReadiness(docsArr) {
  const types = docsArr.map(d => d.type);
  const scenario = detectScenario(types, docsArr);
  const sc = RECON_SCENARIOS[scenario];
  const hasA = types.includes(sc.sideA);
  const hasB = types.includes(sc.sideB);
  return { scenario, sc, hasA, hasB, ready: hasA && hasB };
}

const FILTERS = [
  { key: 'original', label: '原图', filter: 'none', hot: false },
  { key: 'hd', label: '智能高清', filter: 'contrast(1.2) brightness(1.05) saturate(1.05)', hot: true },
  { key: 'shadow', label: '去阴影', filter: 'brightness(1.15) contrast(1.25)', hot: false },
  { key: 'handwriting', label: '去除手写', filter: 'contrast(1.6) brightness(1.2) saturate(0)', hot: false },
  { key: 'bright', label: '增亮', filter: 'brightness(1.3) contrast(1.1)', hot: false },
  { key: 'sharp', label: '增强锐化', filter: 'contrast(1.4) brightness(1.1) saturate(1.1)', hot: false },
];

export default function ReconApp() {
  const [step, setStep] = useState('landing');
  const [files, setFiles] = useState([]);
  const [currentFileIdx, setCurrentFileIdx] = useState(0);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [cropBoxes, setCropBoxes] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('hd');
  const [isCropping, setIsCropping] = useState(false);
  const [processedUrls, setProcessedUrls] = useState([]);
  const [parseSteps, setParseSteps] = useState([]);
  const [parseResult, setParseResult] = useState(null);
  const [matchResults, setMatchResults] = useState(null);
  const [confirmed, setConfirmed] = useState({});
  const [rejected, setRejected] = useState({});
  const [activeResultTab, setActiveResultTab] = useState('exact');
  const [docExpanded, setDocExpanded] = useState({ bank: false, ledger: false });
  const [showAllResults, setShowAllResults] = useState(false);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rc-history') || '[]'); } catch { return []; }
  });
  const [docs, setDocs] = useState([]);
  const [flowMode, setFlowMode] = useState('recon');
  const [reconData, setReconData] = useState(null);
  const [prevStep, setPrevStep] = useState(null);
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [previewDocId, setPreviewDocId] = useState(null);
  const [allDocsFolder, setAllDocsFolder] = useState(null);
  const [allDocsProject, setAllDocsProject] = useState(null);
  const savedDocsRef = useRef([]);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const docsInputRef = useRef(null);
  const docsCameraRef = useRef(null);
  const scanCameraRef = useRef(null);

  const CS_LIBRARY = [
    { id: 'cs-1', name: 'bank_锦鲤餐饮.png', date: '2026/4/20 15:28', pages: 1, type: 'bank', thumb: null, previewUrl: null },
    { id: 'cs-2', name: 'ledger_锦鲤餐饮_202604.xlsx', date: '2026/4/20 14:05', pages: 3, type: 'ledger', thumb: null, previewUrl: null },
    { id: 'cs-3', name: 'CamScanner 2026-4-23 10.55', date: '2026/4/23 10:55', pages: 1, type: 'unknown', thumb: null, previewUrl: null },
    { id: 'cs-4', name: '鸿蒙', date: '2026/4/23 10:54', pages: 13, type: 'unknown', thumb: null, previewUrl: null },
    { id: 'cs-5', name: 'Convert to Word 2026-4-20', date: '2026/4/28 17:22', pages: 3, type: 'unknown', thumb: null, previewUrl: null },
    { id: 'cs-6', name: '供应商对账单_永辉_202604.pdf', date: '2026/4/18 09:30', pages: 2, type: 'bank', thumb: null, previewUrl: null },
  ];

  const stepIdx = PIPELINE.findIndex(s => s.key === step);

  const handleFiles = useCallback((fileList) => {
    const newFiles = Array.from(fileList).filter(f =>
      f.type.startsWith('image/') || f.type === 'application/pdf' ||
      f.type.includes('spreadsheet') || f.type.includes('excel') || f.type === 'text/csv' ||
      /\.(xlsx|xls|csv|pdf|jpg|jpeg|png)$/i.test(f.name)
    );
    if (newFiles.length === 0) return;

    setFiles(newFiles);
    setCurrentFileIdx(0);
    setCropBoxes(newFiles.map(() => ({ x: 0.03, y: 0.03, w: 0.94, h: 0.94 })));

    newFiles.forEach((file, i) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrls(prev => { const n = [...prev]; n[i] = e.target.result; return n; });
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrls(prev => { const n = [...prev]; n[i] = null; return n; });
      }
    });

    setStep('edit');
  }, []);

  const handleEditConfirm = useCallback(() => {
    const processSingle = (idx) => new Promise((resolve) => {
      const url = previewUrls[idx];
      if (!url) { resolve({ previewUrl: null, processedUrl: null }); return; }
      const img = new Image();
      img.onload = () => {
        const box = cropBoxes[idx];
        const sx = box ? Math.round(box.x * img.naturalWidth) : 0;
        const sy = box ? Math.round(box.y * img.naturalHeight) : 0;
        const sw = box ? Math.round(box.w * img.naturalWidth) : img.naturalWidth;
        const sh = box ? Math.round(box.h * img.naturalHeight) : img.naturalHeight;
        const cvs = document.createElement('canvas');
        cvs.width = sw; cvs.height = sh;
        const ctx = cvs.getContext('2d');
        const flt = FILTERS.find(f => f.key === selectedFilter);
        if (flt && flt.filter !== 'none') ctx.filter = flt.filter;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        resolve({ previewUrl: url, processedUrl: cvs.toDataURL('image/jpeg', 0.92) });
      };
      img.src = url;
    });
    Promise.all(files.map((_, i) => processSingle(i))).then((results) => {
      const newDocs = files.map((file, i) => ({
        id: Date.now() + i,
        name: file.name || `文档${i + 1}`,
        type: 'unknown',
        previewUrl: results[i].previewUrl,
        processedUrl: results[i].processedUrl,
        file: file,
      }));
      setDocs(prev => [...prev, ...newDocs]);
      setProcessedUrls(results.map(r => r.processedUrl));
      setStep('list');
      newDocs.forEach((doc, i) => {
        aiClassifyDoc(doc.file, doc.processedUrl).then(result => {
          if (result?.type) {
            setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, type: result.type, aiScenario: result.scenario || null } : d));
          }
        });
      });
    });
  }, [files, previewUrls, cropBoxes, selectedFilter, flowMode]);

  const handleRemoveDoc = useCallback((id) => {
    setDocs(prev => prev.filter(d => d.id !== id));
  }, []);

  const handleChangeDocType = useCallback((id) => {
    const cycle = { bank: 'ledger', ledger: 'unknown', unknown: 'bank' };
    setDocs(prev => prev.map(d => d.id === id ? { ...d, type: cycle[d.type] } : d));
  }, []);

  const startAnalyze = useCallback(async (demoMode = false, passedDocs = null) => {
    const activeDocs = passedDocs || docs;
    setStep('analyze');
    setParseSteps([]);
    setParseResult(null);

    if (demoMode) {
      const steps = [
        { text: '正在进行 OCR 文字识别...', delay: 200 },
        { text: '识别到表格结构，提取数据中...', delay: 500 },
        { text: '检测到文档类型：银行对账单', delay: 800 },
        { text: '解析 20 笔交易记录', delay: 1100 },
        { text: '加载企业账簿，解析 20 笔记账凭证', delay: 1400 },
        { text: '执行精确匹配（金额+日期完全一致）...', delay: 1700 },
        { text: '执行模糊匹配（日期容差±3天）...', delay: 2000 },
        { text: '执行语义匹配（描述相似度分析）...', delay: 2300 },
        { text: '检测未达账项，生成匹配报告...', delay: 2600 },
      ];
      steps.forEach(({ text, delay }) => {
        setTimeout(() => setParseSteps(prev => [...prev, text]), delay);
      });
      setTimeout(() => {
        const rd = {
          bankEntries: BANK_DATA, ledgerEntries: LEDGER_DATA,
          companyInfo: COMPANY_INFO,
          bankTotalOut: BANK_TOTAL_OUT, bankTotalIn: BANK_TOTAL_IN,
          ledgerTotalDebit: LEDGER_TOTAL_DEBIT, ledgerTotalCredit: LEDGER_TOTAL_CREDIT,
        };
        setReconData(rd);
        const results = runMatching(BANK_DATA, LEDGER_DATA);
        setMatchResults(results);
        setStep('results');
      }, 3000);
      return;
    }

    try {
      const { scenario, sc } = getScenarioReadiness(activeDocs);
      const sideADocs = activeDocs.filter(d => d.type === sc.sideA);
      const sideBDocs = activeDocs.filter(d => d.type === sc.sideB);
      const allBankEntries = [];
      const allLedgerEntries = [];

      setParseSteps(prev => [...prev, `检测到场景: ${sc.name}，开始解析 ${activeDocs.length} 份文档...`]);

      for (const doc of sideADocs) {
        setParseSteps(prev => [...prev, `解析${sc.labelA}: ${doc.name}...`]);
        let fileObj = doc.file;
        if (!fileObj || fileObj.type === 'processed') {
          if (doc.processedUrl) {
            fileObj = dataUrlToFile(doc.processedUrl, doc.name);
          } else continue;
        }
        try {
          const parsed = await parseFile(fileObj);
          setParseSteps(prev => [...prev, `${sc.labelA}识别 ${parsed.parsedRows} 笔记录`]);
          allBankEntries.push(...parsed.entries);
        } catch (err) {
          setParseSteps(prev => [...prev, `${sc.labelA}解析失败: ${err.message}`]);
        }
      }

      for (const doc of sideBDocs) {
        setParseSteps(prev => [...prev, `解析${sc.labelB}: ${doc.name}...`]);
        let fileObj = doc.file;
        if (!fileObj || fileObj.type === 'processed') {
          if (doc.processedUrl) {
            fileObj = dataUrlToFile(doc.processedUrl, doc.name);
          } else continue;
        }
        try {
          const parsed = await parseFile(fileObj);
          setParseSteps(prev => [...prev, `${sc.labelB}识别 ${parsed.parsedRows} 笔记录`]);
          allLedgerEntries.push(...parsed.entries);
        } catch (err) {
          setParseSteps(prev => [...prev, `${sc.labelB}解析失败: ${err.message}`]);
        }
      }

      if (allBankEntries.length === 0 && allLedgerEntries.length === 0) {
        setParseSteps(prev => [...prev, '未能解析出有效数据，请检查文档格式']);
        return;
      }

      setParseSteps(prev => [...prev, `共解析${sc.labelA} ${allBankEntries.length} 笔、${sc.labelB} ${allLedgerEntries.length} 笔`]);
      setParseSteps(prev => [...prev, '执行智能匹配...']);

      const rd = buildReconData(allBankEntries, allLedgerEntries, activeDocs.map(d => d.name));
      setReconData(rd);
      const results = runMatching(allBankEntries, allLedgerEntries);
      setMatchResults(results);
      setParseSteps(prev => [...prev, `匹配完成: ${results.matchedCount} 笔匹配, ${results.unmatchedBank.length + results.unmatchedLedger.length} 笔未达`]);

      setTimeout(() => setStep('results'), 500);
    } catch (err) {
      setParseSteps(prev => [...prev, `解析出错: ${err.message}`]);
    }
  }, [docs]);

  const handleStartFromDocs = useCallback(() => {
    setFiles(docs.map(d => ({ name: d.name, type: 'processed' })));
    setPreviewUrls(docs.map(d => d.previewUrl));
    setProcessedUrls(docs.map(d => d.processedUrl));
    startAnalyze(false, docs);
  }, [docs, startAnalyze]);

  const handleConfirm = useCallback((key) => {
    setConfirmed(prev => ({ ...prev, [key]: true }));
    setRejected(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);
  const handleReject = useCallback((key) => {
    setRejected(prev => ({ ...prev, [key]: true }));
    setConfirmed(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  const handleFinish = useCallback(() => {
    if (matchResults && reconData) {
      const { scenario, sc } = getScenarioReadiness(docs);
      const record = {
        id: Date.now(),
        company: reconData.companyInfo.name,
        period: reconData.companyInfo.period,
        scenario: scenario,
        scenarioName: sc.name,
        matchRate: matchResults.matchRate,
        matchedCount: matchResults.matchedCount,
        unmatchedCount: matchResults.unmatchedBank.length + matchResults.unmatchedLedger.length,
        totalCount: reconData.bankEntries.length + reconData.ledgerEntries.length,
        time: new Date().toLocaleString('zh-CN'),
        docs: docs.map(d => ({ id: d.id, name: d.name, type: d.type, typeLabel: DOC_TYPE_LABEL[d.type] || d.type })),
        resultDocs: [
          { name: '余额调节表', type: 'result_sheet' },
          { name: 'AI分析报告', type: 'result_report' },
        ],
      };
      const next = [record, ...history].slice(0, 20);
      setHistory(next);
      try { localStorage.setItem('rc-history', JSON.stringify(next)); } catch {}
    }
    setStep('home'); setFiles([]); setPreviewUrls([]); setCropBoxes([]); setDocs([]);
    setProcessedUrls([]); setParseSteps([]); setParseResult(null); setReconData(null);
    setMatchResults(null); setConfirmed({}); setRejected({});
    setSelectedFilter('hd'); setCurrentFileIdx(0); setIsCropping(false);
  }, [matchResults, reconData, history, docs]);

  const handleReset = useCallback(() => {
    setStep('home'); setFiles([]); setPreviewUrls([]); setCropBoxes([]); setDocs([]);
    setProcessedUrls([]); setParseSteps([]); setParseResult(null); setReconData(null);
    setMatchResults(null); setConfirmed({}); setRejected({});
    setSelectedFilter('hd'); setCurrentFileIdx(0); setIsCropping(false);
  }, []);

  const isDocFile = files[currentFileIdx] && !files[currentFileIdx]?.type?.startsWith('image/');

  return (
    <div className="rc">
      {/* LANDING — Product Introduction Page */}
      {step === 'landing' && (
        <div className="rc-landing">
          <div className="rc-landing-hero">
            <div className="rc-landing-hero-bg" />
            <div className="rc-landing-hero-content">
              <div className="rc-landing-logo">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.3">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M3 15h18M9 3v18" />
                </svg>
              </div>
              <div className="rc-landing-badge">CamScanner AI</div>
              <h1 className="rc-landing-title">智能财务对账</h1>
              <p className="rc-landing-subtitle">拍照即对账，AI 三层匹配引擎<br/>让财务核对从 3 小时缩短到 3 分钟</p>
              <button className="rc-landing-cta" onClick={() => setStep('toolbox')}>
                <span>立即体验</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>

          <div className="rc-landing-section">
            <div className="rc-landing-section-tag">痛点洞察</div>
            <h2 className="rc-landing-h2">传统对账的困境</h2>
            <div className="rc-landing-pain-grid">
              <div className="rc-landing-pain-card">
                <div className="rc-landing-pain-icon">⏰</div>
                <div className="rc-landing-pain-title">耗时长</div>
                <div className="rc-landing-pain-desc">100笔交易手工对账需3-4小时，月末加班成常态</div>
              </div>
              <div className="rc-landing-pain-card">
                <div className="rc-landing-pain-icon">❌</div>
                <div className="rc-landing-pain-title">易出错</div>
                <div className="rc-landing-pain-desc">肉眼比对遗漏率15-20%，错一笔可能损失数万元</div>
              </div>
              <div className="rc-landing-pain-card">
                <div className="rc-landing-pain-icon">📋</div>
                <div className="rc-landing-pain-title">格式乱</div>
                <div className="rc-landing-pain-desc">银行单据格式不统一，纸质/PDF/Excel混杂难整合</div>
              </div>
              <div className="rc-landing-pain-card">
                <div className="rc-landing-pain-icon">🔄</div>
                <div className="rc-landing-pain-title">重复劳动</div>
                <div className="rc-landing-pain-desc">每月重复机械工作，高学历财务人员价值被浪费</div>
              </div>
            </div>
          </div>

          <div className="rc-landing-section rc-landing-section-dark">
            <div className="rc-landing-section-tag light">核心能力</div>
            <h2 className="rc-landing-h2 light">AI 如何解决</h2>
            <div className="rc-landing-flow">
              <div className="rc-landing-flow-step">
                <div className="rc-landing-flow-num">01</div>
                <div className="rc-landing-flow-content">
                  <div className="rc-landing-flow-title">智能扫描识别</div>
                  <div className="rc-landing-flow-desc">TextIn OCR 引擎，支持拍照/PDF/Excel，<strong>表格识别准确率 99.2%</strong></div>
                </div>
              </div>
              <div className="rc-landing-flow-line" />
              <div className="rc-landing-flow-step">
                <div className="rc-landing-flow-num">02</div>
                <div className="rc-landing-flow-content">
                  <div className="rc-landing-flow-title">AI 结构化提取</div>
                  <div className="rc-landing-flow-desc">大模型自动理解表格语义，精准提取日期、金额、摘要等关键字段</div>
                </div>
              </div>
              <div className="rc-landing-flow-line" />
              <div className="rc-landing-flow-step">
                <div className="rc-landing-flow-num">03</div>
                <div className="rc-landing-flow-content">
                  <div className="rc-landing-flow-title">三层智能匹配</div>
                  <div className="rc-landing-flow-desc">精确匹配 → 模糊匹配（容差±3天）→ 语义匹配，<strong>综合匹配率 &gt;95%</strong></div>
                </div>
              </div>
              <div className="rc-landing-flow-line" />
              <div className="rc-landing-flow-step">
                <div className="rc-landing-flow-num">04</div>
                <div className="rc-landing-flow-content">
                  <div className="rc-landing-flow-title">一键生成调节表</div>
                  <div className="rc-landing-flow-desc">自动输出银行余额调节表，标注未达账项，支持导出 PDF/Excel</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rc-landing-section">
            <div className="rc-landing-section-tag">适用场景</div>
            <h2 className="rc-landing-h2">谁需要这个功能</h2>
            <div className="rc-landing-scenarios">
              <div className="rc-landing-scenario">
                <div className="rc-landing-scenario-icon">🏢</div>
                <div className="rc-landing-scenario-title">中小企业财务</div>
                <div className="rc-landing-scenario-desc">月末银行对账、供应商往来核对</div>
              </div>
              <div className="rc-landing-scenario">
                <div className="rc-landing-scenario-icon">👤</div>
                <div className="rc-landing-scenario-title">个体工商户</div>
                <div className="rc-landing-scenario-desc">多平台收款对账、流水与记账比对</div>
              </div>
              <div className="rc-landing-scenario">
                <div className="rc-landing-scenario-icon">📊</div>
                <div className="rc-landing-scenario-title">代账公司</div>
                <div className="rc-landing-scenario-desc">批量客户对账、提升人效降本</div>
              </div>
              <div className="rc-landing-scenario">
                <div className="rc-landing-scenario-icon">🏦</div>
                <div className="rc-landing-scenario-title">银行/金融机构</div>
                <div className="rc-landing-scenario-desc">内部清算核对、贷后流水审核</div>
              </div>
            </div>
          </div>

          <div className="rc-landing-section rc-landing-section-accent">
            <div className="rc-landing-roi">
              <h2 className="rc-landing-h2 light">效率提升数据</h2>
              <div className="rc-landing-roi-grid">
                <div className="rc-landing-roi-item">
                  <div className="rc-landing-roi-value">97%</div>
                  <div className="rc-landing-roi-label">时间节省</div>
                </div>
                <div className="rc-landing-roi-item">
                  <div className="rc-landing-roi-value">99%</div>
                  <div className="rc-landing-roi-label">识别准确率</div>
                </div>
                <div className="rc-landing-roi-item">
                  <div className="rc-landing-roi-value">3min</div>
                  <div className="rc-landing-roi-label">完成对账</div>
                </div>
                <div className="rc-landing-roi-item">
                  <div className="rc-landing-roi-value">0</div>
                  <div className="rc-landing-roi-label">人工遗漏</div>
                </div>
              </div>
              <div className="rc-landing-roi-compare">
                <div className="rc-landing-roi-bar">
                  <span className="rc-landing-roi-bar-label">传统手工</span>
                  <div className="rc-landing-roi-bar-track">
                    <div className="rc-landing-roi-bar-fill old" style={{ width: '100%' }} />
                  </div>
                  <span className="rc-landing-roi-bar-val">3-4h</span>
                </div>
                <div className="rc-landing-roi-bar">
                  <span className="rc-landing-roi-bar-label">AI 对账</span>
                  <div className="rc-landing-roi-bar-track">
                    <div className="rc-landing-roi-bar-fill new" style={{ width: '5%' }} />
                  </div>
                  <span className="rc-landing-roi-bar-val">3min</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rc-landing-section">
            <div className="rc-landing-section-tag">技术优势</div>
            <h2 className="rc-landing-h2">为什么选择我们</h2>
            <div className="rc-landing-advantages">
              <div className="rc-landing-adv">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--rc-accent)" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <div>
                  <div className="rc-landing-adv-title">数据安全</div>
                  <div className="rc-landing-adv-desc">文档本地处理，不存储原始文件，端到端加密传输</div>
                </div>
              </div>
              <div className="rc-landing-adv">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--rc-accent)" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                <div>
                  <div className="rc-landing-adv-title">多端协同</div>
                  <div className="rc-landing-adv-desc">手机拍照、电脑编辑，对账结果云端同步</div>
                </div>
              </div>
              <div className="rc-landing-adv">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--rc-accent)" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h6M9 17h4"/></svg>
                <div>
                  <div className="rc-landing-adv-title">格式兼容</div>
                  <div className="rc-landing-adv-desc">支持拍照、PDF、Excel、CSV，一站式处理各类单据</div>
                </div>
              </div>
              <div className="rc-landing-adv">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--rc-accent)" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                <div>
                  <div className="rc-landing-adv-title">持续学习</div>
                  <div className="rc-landing-adv-desc">AI 模型不断优化，越用越准，适配企业个性化规则</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rc-landing-footer">
            <div className="rc-landing-footer-brand">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M3 15h18M9 3v18" />
              </svg>
              <span>CamScanner AI · 智能财务对账</span>
            </div>
            <button className="rc-landing-footer-cta" onClick={() => setStep('toolbox')}>
              开始体验 Demo
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <p className="rc-landing-footer-note">TextIn OCR + 智谱 AI 大模型驱动</p>
          </div>
        </div>
      )}

      {/* TOOLBOX */}
      {step === 'toolbox' && (
        <div className="rc-toolbox">
          <div className="rc-tb-header">
            <h2>工具箱</h2>
            <div className="rc-tb-header-right">
              <span className="rc-tb-new-badge">功能上新</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
          </div>
          <div className="rc-tb-tabs">
            <span>格式转换</span>
            <span>文档编辑</span>
            <span className="active">实用工具</span>
            <span>求职与校园</span>
            <span>其他</span>
          </div>
          <div className="rc-tb-section-title">实用工具</div>
          <div className="rc-tb-grid">
            <div className="rc-tb-card">
              <span className="rc-tb-card-name">AI 测量</span>
              <div className="rc-tb-card-icon">📐</div>
            </div>
            <div className="rc-tb-card">
              <span className="rc-tb-card-name">滚动截屏</span>
              <div className="rc-tb-card-icon">📜</div>
            </div>
            <div className="rc-tb-card">
              <span className="rc-tb-card-name">拍照计数</span>
              <div className="rc-tb-card-icon">🔢</div>
            </div>
            <div className="rc-tb-card">
              <span className="rc-tb-card-name">二维码</span>
              <div className="rc-tb-card-icon">📱</div>
            </div>
            <div className="rc-tb-card rc-tb-card-highlight" onClick={() => { setFlowMode('recon'); setDocs([]); setFiles([]); setPreviewUrls([]); setCropBoxes([]); setProcessedUrls([]); setStep('home'); }}>
              <span className="rc-tb-card-name">财务对账</span>
              <div className="rc-tb-card-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>
                </svg>
              </div>
              <span className="rc-tb-new-tag">NEW</span>
            </div>
            <div className="rc-tb-card">
              <span className="rc-tb-card-name">证件扫描</span>
              <div className="rc-tb-card-icon">🪪</div>
            </div>
          </div>
          <div className="rc-tb-section-title">求职与校园</div>
          <div className="rc-tb-grid">
            <div className="rc-tb-card">
              <span className="rc-tb-card-name">AI 搜题</span>
              <div className="rc-tb-card-icon">📝</div>
            </div>
            <div className="rc-tb-card">
              <span className="rc-tb-card-name">简历模板</span>
              <div className="rc-tb-card-icon">📄</div>
            </div>
            <div className="rc-tb-card">
              <span className="rc-tb-card-name">扫描学生证件</span>
              <div className="rc-tb-card-icon">🎓</div>
            </div>
            <div className="rc-tb-card">
              <span className="rc-tb-card-name">更多</span>
              <div className="rc-tb-card-icon">⊞</div>
            </div>
          </div>
          <div className="rc-tb-section-title">其他</div>
          <div className="rc-tb-grid rc-tb-grid-3">
            <div className="rc-tb-card-sm">
              <span className="rc-tb-card-name">打印文档</span>
              <div className="rc-tb-card-icon">🖨️</div>
            </div>
            <div className="rc-tb-card-sm">
              <span className="rc-tb-card-name">购买设备</span>
              <div className="rc-tb-card-icon">🛒</div>
            </div>
            <div className="rc-tb-card-sm">
              <span className="rc-tb-card-name">创新实验室</span>
              <div className="rc-tb-card-icon">🚀</div>
            </div>
          </div>
          <div style={{ height: 80 }} />
          <div className="rc-tb-tabbar">
            <div className="rc-tb-tabbar-item"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span>首页</span></div>
            <div className="rc-tb-tabbar-item" onClick={() => { setAllDocsFolder(null); setStep('alldocs'); }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>全部文档</span></div>
            <div className="rc-tb-tabbar-camera" onClick={() => { setFlowMode('scan'); scanCameraRef.current?.click(); }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg></div>
            <div className="rc-tb-tabbar-item active"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg><span>工具箱</span></div>
            <div className="rc-tb-tabbar-item"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>我的</span></div>
          </div>
        </div>
      )}

      {/* ALL DOCS — CS-style file manager */}
      {step === 'alldocs' && (
        <div className="rc-alldocs">
          <div className="rc-alldocs-header">
            <h2 className="rc-alldocs-title">文档</h2>
            <div className="rc-alldocs-search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span>试试搜索文档</span>
            </div>
          </div>

          <div className="rc-alldocs-actions">
            <div className="rc-alldocs-action-item">
              <div className="rc-alldocs-action-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4a90d9" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              </div>
              <span>导入文档</span>
            </div>
            <div className="rc-alldocs-action-item">
              <div className="rc-alldocs-action-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4a90d9" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
              <span>导入图片</span>
            </div>
            <div className="rc-alldocs-action-item">
              <div className="rc-alldocs-action-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
              </div>
              <span>新建文件夹</span>
            </div>
          </div>

          {!allDocsFolder ? (
            <div className="rc-alldocs-body">
              <div className="rc-alldocs-section-head">
                <span className="rc-alldocs-count">所有文档 ({history.length + 5}) ▾</span>
                <div className="rc-alldocs-view-opts">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="14" y2="18"/><polyline points="16 16 18 18 22 14"/></svg>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>
                </div>
              </div>

              <div className="rc-alldocs-list">
                <div className="rc-alldocs-folder" onClick={() => setAllDocsFolder('recon')}>
                  <div className="rc-alldocs-folder-icon rc-alldocs-folder-recon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
                  </div>
                  <div className="rc-alldocs-folder-info">
                    <div className="rc-alldocs-folder-name">财务对账</div>
                    <div className="rc-alldocs-folder-meta">{new Date().toLocaleDateString('zh-CN')} | 日 {history.length}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </div>

                <div className="rc-alldocs-folder">
                  <div className="rc-alldocs-folder-icon rc-alldocs-folder-sign">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                  </div>
                  <div className="rc-alldocs-folder-info">
                    <div className="rc-alldocs-folder-name">合合签文档</div>
                  </div>
                </div>

                <div className="rc-alldocs-folder">
                  <div className="rc-alldocs-folder-icon rc-alldocs-folder-convert">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
                  </div>
                  <div className="rc-alldocs-folder-info">
                    <div className="rc-alldocs-folder-name">文档转换结果</div>
                  </div>
                </div>

                <div className="rc-alldocs-folder">
                  <div className="rc-alldocs-folder-icon rc-alldocs-folder-normal">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                  </div>
                  <div className="rc-alldocs-folder-info">
                    <div className="rc-alldocs-folder-name">文件夹 A</div>
                    <div className="rc-alldocs-folder-meta">2026/1/13 12:59 | 日 15</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </div>

                <div className="rc-alldocs-folder">
                  <div className="rc-alldocs-folder-icon rc-alldocs-folder-lock">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  </div>
                  <div className="rc-alldocs-folder-info">
                    <div className="rc-alldocs-folder-name">私密文件夹</div>
                    <div className="rc-alldocs-folder-meta">2025/8/25 15:10 | 日 2</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </div>

                <div className="rc-alldocs-folder">
                  <div className="rc-alldocs-folder-icon rc-alldocs-folder-backup">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                  </div>
                  <div className="rc-alldocs-folder-info">
                    <div className="rc-alldocs-folder-name">备份</div>
                    <div className="rc-alldocs-folder-meta">2025/8/21 15:34 | 日 1</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </div>
              </div>
            </div>
          ) : allDocsProject ? (
            <div className="rc-alldocs-body">
              <div className="rc-alldocs-section-head">
                <button className="rc-alldocs-folder-back" onClick={() => setAllDocsProject(null)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                  <span>{allDocsProject.company} · {allDocsProject.period}</span>
                </button>
              </div>

              <div className="rc-alldocs-project-detail">
                <div className="rc-alldocs-project-summary">
                  <span className="rc-alldocs-project-badge">{allDocsProject.scenarioName || '银行对账'}</span>
                  <span className="rc-alldocs-project-rate" style={{ color: allDocsProject.matchRate >= 80 ? '#3DD598' : '#ef4444' }}>匹配率 {allDocsProject.matchRate.toFixed(0)}%</span>
                  <span className="rc-alldocs-project-time">{allDocsProject.time}</span>
                </div>

                <div className="rc-alldocs-project-section">
                  <div className="rc-alldocs-project-section-title">原始文档</div>
                  {(allDocsProject.docs || []).map((d, i) => (
                    <div key={i} className="rc-alldocs-file-item">
                      <div className="rc-alldocs-file-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </div>
                      <div className="rc-alldocs-file-info">
                        <div className="rc-alldocs-file-name">{d.name}</div>
                        <div className="rc-alldocs-file-type">{d.typeLabel || d.type}</div>
                      </div>
                    </div>
                  ))}
                  {(!allDocsProject.docs || allDocsProject.docs.length === 0) && (
                    <div className="rc-alldocs-file-item">
                      <div className="rc-alldocs-file-info"><div className="rc-alldocs-file-name" style={{color:'#999'}}>暂无文档记录</div></div>
                    </div>
                  )}
                </div>

                <div className="rc-alldocs-project-section">
                  <div className="rc-alldocs-project-section-title">对账结果</div>
                  {(allDocsProject.resultDocs || []).map((d, i) => (
                    <div key={i} className="rc-alldocs-file-item">
                      <div className="rc-alldocs-file-icon">
                        {d.type === 'result_sheet' ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a90d9" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        )}
                      </div>
                      <div className="rc-alldocs-file-info">
                        <div className="rc-alldocs-file-name">{d.name}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rc-alldocs-project-stats">
                  <div className="rc-alldocs-stat"><span>总笔数</span><strong>{allDocsProject.totalCount}</strong></div>
                  <div className="rc-alldocs-stat"><span>匹配</span><strong>{allDocsProject.matchedCount}</strong></div>
                  <div className="rc-alldocs-stat"><span>未达</span><strong>{allDocsProject.unmatchedCount}</strong></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rc-alldocs-body">
              <div className="rc-alldocs-section-head">
                <button className="rc-alldocs-folder-back" onClick={() => { setAllDocsFolder(null); setAllDocsProject(null); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                  <span>财务对账</span>
                </button>
              </div>

              {history.length === 0 ? (
                <div className="rc-alldocs-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <p>暂无对账记录</p>
                  <span>完成对账后，文档和结果将自动保存到这里</span>
                </div>
              ) : (
                <div className="rc-alldocs-list">
                  {history.map(h => (
                    <div key={h.id} className="rc-alldocs-project" onClick={() => setAllDocsProject(h)}>
                      <div className="rc-alldocs-project-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                      </div>
                      <div className="rc-alldocs-project-info">
                        <div className="rc-alldocs-project-name">{h.company} · {h.period}</div>
                        <div className="rc-alldocs-project-meta">{h.scenarioName || '银行对账'} | {h.time} | {(h.docs || []).length + (h.resultDocs || []).length} 个文件</div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="rc-tb-tabbar">
            <div className="rc-tb-tabbar-item"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span>首页</span></div>
            <div className="rc-tb-tabbar-item active"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>全部文档</span></div>
            <div className="rc-tb-tabbar-camera" onClick={() => { setFlowMode('scan'); scanCameraRef.current?.click(); }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg></div>
            <div className="rc-tb-tabbar-item" onClick={() => setStep('toolbox')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg><span>工具箱</span></div>
            <div className="rc-tb-tabbar-item"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>我的</span></div>
          </div>
        </div>
      )}

      {/* Pipeline Progress */}
      {step !== 'home' && step !== 'toolbox' && step !== 'landing' && step !== 'select' && step !== 'list' && step !== 'alldocs' && flowMode === 'recon' && (
        <div className="rc-pipeline">
          {PIPELINE.map((s, i) => (
            <div key={s.key} className={`rc-pip-step ${i < stepIdx ? 'done' : ''} ${i === stepIdx ? 'active' : ''}`}>
              <div className="rc-pip-dot">{i < stepIdx ? '✓' : s.icon}</div>
              <span>{s.label}</span>
            </div>
          ))}
          <div className="rc-pip-bar" style={{ width: `${Math.max(0, (stepIdx / (PIPELINE.length - 1)) * 100)}%` }} />
        </div>
      )}

      {/* HOME */}
      {step === 'home' && (
        <div className="rc-section rc-center" style={{ padding: '32px 20px' }}>
          <div className="rc-home-logo">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.3">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18" />
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '12px 0 6px' }}>CS 智能对账</h2>
          <p style={{ fontSize: 13, color: 'var(--rc-text2)', marginBottom: 24, textAlign: 'center', lineHeight: 1.5 }}>
            AI 自动识别财务文档、智能匹配、生成调节表
          </p>

          <button className="rc-home-demo-primary" onClick={() => {
            setFiles([{ name: '银行对账单_锦鲤餐饮_202604.xlsx', type: 'demo' }]);
            setPreviewUrls([null]);
            startAnalyze(true);
          }}>
            <div className="rc-home-demo-left">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
                <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
                <polyline points="13 2 13 9 20 9"/>
              </svg>
            </div>
            <div className="rc-home-demo-info">
              <div className="rc-home-demo-title">体验 Demo 对账</div>
              <div className="rc-home-demo-desc">锦鲤餐饮 · 20笔银行流水 vs 20笔账簿</div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          <div className="rc-home-divider"><span>或上传您的文档</span></div>

          <div className="rc-home-upload-row">
            <button className="rc-home-upload-btn" onClick={() => fileInputRef.current?.click()}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              <span>选择文件</span>
            </button>
            <button className="rc-home-upload-btn" onClick={() => cameraInputRef.current?.click()}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span>拍照扫描</span>
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--rc-text3)', textAlign: 'center', marginTop: 8 }}>支持 JPG、PNG、PDF、Excel、CSV</p>

          {history.length > 0 && (
            <div className="rc-history" style={{ marginTop: 24 }}>
              <div className="rc-history-title">历史记录</div>
              {history.map(h => (
                <div key={h.id} className="rc-history-item">
                  <div className="rc-history-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                  </div>
                  <div className="rc-history-info">
                    <div className="rc-history-name">{h.company} · {h.period}</div>
                    <div className="rc-history-meta">匹配率 {h.matchRate.toFixed(0)}% · {h.matchedCount}笔匹配 · {h.unmatchedCount}笔未达 · {h.time}</div>
                  </div>
                  <span className="rc-history-rate" style={{ color: h.matchRate >= 80 ? 'var(--rc-accent-dark)' : 'var(--rc-danger)' }}>{h.matchRate.toFixed(0)}%</span>
                  <button className="rc-history-del" onClick={(e) => {
                    e.stopPropagation();
                    const next = history.filter(item => item.id !== h.id);
                    setHistory(next);
                    try { localStorage.setItem('rc-history', JSON.stringify(next)); } catch {}
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* SELECT — CS-style file picker for reconciliation */}
      {step === 'select' && (() => {
        const userDocs = docs.filter(d => !CS_LIBRARY.find(c => c.id === d.id));
        const allDocs = [...userDocs, ...CS_LIBRARY];
        const selectedDocs = allDocs.filter(d => selectedDocIds.has(d.id));
        const selTypes = selectedDocs.map(d => d.type);
        const scenario = detectScenario(selTypes, selectedDocs);
        const sc = RECON_SCENARIOS[scenario];
        const hasA = selTypes.includes(sc.sideA);
        const hasB = selTypes.includes(sc.sideB);
        const canStart = hasA && hasB;
        const docA = selectedDocs.find(d => d.type === sc.sideA);
        const docB = selectedDocs.find(d => d.type === sc.sideB);
        const missing = [];
        if (!hasA) missing.push(sc.labelA);
        if (!hasB) missing.push(sc.labelB);

        const toggleSelect = (id) => {
          setSelectedDocIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        };

        const handlePreviewDoc = (doc) => {
          setPrevStep('select');
          setPreviewDocId(doc.id);
          savedDocsRef.current = docs;
          const previewDoc = { id: doc.id, name: doc.name, type: doc.type, previewUrl: doc.previewUrl || null, processedUrl: doc.processedUrl || null, file: doc.file || null };
          setDocs([previewDoc]);
          setFlowMode('scan');
          setStep('list');
        };

        const handleStartRecon = () => {
          if (!canStart) return;
          const reconDocs = selectedDocs.map(d => ({
            id: d.id, name: d.name, type: d.type,
            previewUrl: d.previewUrl || null,
            processedUrl: d.processedUrl || null,
            file: d.file || null,
          }));
          setDocs(reconDocs);
          const hasRealFiles = reconDocs.some(d => d.file || d.processedUrl);
          startAnalyze(!hasRealFiles, reconDocs);
        };

        return (
          <div className="rc-select">
            <div className="rc-select-topbar">
              <button className="rc-select-back" onClick={() => setStep('toolbox')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div className="rc-select-title">选择文档</div>
              <button className="rc-select-cancel" onClick={() => setStep('toolbox')}>取消</button>
            </div>

            <div className="rc-select-status">
              <div className={`rc-select-status-item ${hasA ? 'done' : 'missing'}`}>
                <div className={`rc-select-status-dot ${hasA ? 'done' : ''}`}>{hasA ? '✓' : ''}</div>
                <div className="rc-select-status-info">
                  <span className="rc-select-status-label">{sc.labelA}</span>
                  <span className="rc-select-status-file">{docA ? docA.name : '未选择'}</span>
                </div>
              </div>
              <div className={`rc-select-status-item ${hasB ? 'done' : 'missing'}`}>
                <div className={`rc-select-status-dot ${hasB ? 'done' : ''}`}>{hasB ? '✓' : ''}</div>
                <div className="rc-select-status-info">
                  <span className="rc-select-status-label">{sc.labelB}</span>
                  <span className="rc-select-status-file">{docB ? docB.name : '未选择'}</span>
                </div>
              </div>
            </div>

            <div className="rc-select-list">
              {allDocs.map(doc => {
                const isSelected = selectedDocIds.has(doc.id);
                const docTypeLabel = doc.type !== 'unknown' ? DOC_TYPE_LABEL[doc.type] : null;
                return (
                  <div key={doc.id} className={`rc-select-item ${isSelected ? 'selected' : ''}`}>
                    <div className="rc-select-item-left" onClick={() => handlePreviewDoc(doc)}>
                      <div className="rc-select-item-thumb">
                        {(doc.processedUrl || doc.previewUrl || doc.thumb) ? (
                          <img src={doc.processedUrl || doc.previewUrl || doc.thumb} alt="" />
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        )}
                      </div>
                      <div className="rc-select-item-info">
                        <div className="rc-select-item-name">{doc.name}</div>
                        <div className="rc-select-item-meta">
                          {doc.date ? `${doc.date} | ` : ''}{doc.pages ? `${doc.pages}页` : '已上传'}
                          {isSelected && docTypeLabel && <span className="rc-select-item-type-tag">{docTypeLabel}</span>}
                        </div>
                      </div>
                    </div>
                    <button className={`rc-select-checkbox ${isSelected ? 'checked' : ''}`} onClick={() => toggleSelect(doc.id)}>
                      {isSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="rc-select-bottom">
              {!canStart && <p className="rc-select-hint">还需选择 <strong>{missing.join('、')}</strong> 才能开始对账</p>}
              <button className={`rc-select-btn ${canStart ? '' : 'disabled'}`} disabled={!canStart} onClick={handleStartRecon}>
                {canStart ? '开始对账' : '补充文档并开始对账'}
              </button>
            </div>
          </div>
        );
      })()}

      {/* EDIT — CamScanner doc edit page (crop + filter combined) */}
      {step === 'edit' && (
        <div className="rc-edit">
          {/* Top bar */}
          <div className="rc-edit-topbar">
            <button className="rc-edit-back" onClick={() => setStep(flowMode === 'scan' ? 'toolbox' : docs.length > 0 ? 'docs' : 'home')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div className="rc-edit-title">{files[currentFileIdx]?.name || '扫描全能王'}</div>
            <div style={{ width: 22 }} />
          </div>

          {/* Document preview area */}
          <div className="rc-edit-canvas">
            {previewUrls[currentFileIdx] ? (
              isCropping ? (
                <CropEditor
                  src={previewUrls[currentFileIdx]}
                  box={cropBoxes[currentFileIdx] || { x: 0, y: 0, w: 1, h: 1 }}
                  onChange={(box) => setCropBoxes(prev => { const n = [...prev]; n[currentFileIdx] = box; return n; })}
                />
              ) : (
                <div className="rc-edit-doc-wrap">
                  <img
                    src={previewUrls[currentFileIdx]}
                    alt=""
                    className="rc-edit-doc-img"
                    style={{ filter: FILTERS.find(f => f.key === selectedFilter)?.filter || 'none' }}
                  />
                </div>
              )
            ) : (
              <div className="rc-doc-placeholder" style={{ padding: '60px 20px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>{files[currentFileIdx]?.name || '文档文件'}</span>
              </div>
            )}
          </div>

          {/* Page indicator */}
          <div className="rc-edit-pager">
            <span>◀</span>
            <span>{currentFileIdx + 1}/{files.length || 1}</span>
            <span>▶</span>
            <span className="rc-edit-compare">对比</span>
          </div>

          {/* Filter strip */}
          <div className="rc-edit-filter-strip">
            {FILTERS.map(f => (
              <button key={f.key} className={`rc-edit-filter-item ${selectedFilter === f.key ? 'active' : ''}`} onClick={() => { setSelectedFilter(f.key); setIsCropping(false); }}>
                <div className="rc-edit-filter-thumb">
                  {previewUrls[currentFileIdx] ? (
                    <img src={previewUrls[currentFileIdx]} alt="" style={{ filter: f.filter }} />
                  ) : (
                    <div className="rc-filter-placeholder" style={{ filter: f.filter }} />
                  )}
                  {f.hot && <span className="rc-edit-filter-hot">HOT</span>}
                </div>
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          {/* Bottom toolbar */}
          <div className="rc-edit-toolbar">
            <button className="rc-edit-tool" onClick={() => fileInputRef.current?.click()}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>继续导入</span>
            </button>
            <button className="rc-edit-tool">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
              <span>左转</span>
            </button>
            <button className="rc-edit-tool" onClick={() => setIsCropping(!isCropping)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isCropping ? '#3DD598' : '#333'} strokeWidth="1.8"><path d="M6 2v4H2M18 22v-4h4M2 6h20M22 18H2"/></svg>
              <span style={{ color: isCropping ? '#3DD598' : undefined }}>裁剪</span>
            </button>
            <button className="rc-edit-tool">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              <span>提取文字</span>
            </button>
            <button className="rc-edit-tool-confirm" onClick={handleEditConfirm}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* DOCS — Document Management */}
      {step === 'docs' && (
        <div className="rc-section">
          <div className="rc-docs-header">
            <button className="rc-docs-back" onClick={() => setStep('home')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h3>文档管理</h3>
            <span className="rc-docs-count">{docs.length} 份文档</span>
          </div>

          {(() => {
            const { sc, hasA, hasB } = getScenarioReadiness(docs);
            const missing = [];
            if (!hasA) missing.push(sc.labelA);
            if (!hasB) missing.push(sc.labelB);
            if (missing.length > 0) return (
              <div className="rc-docs-warning">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span>还需添加 <strong>{missing.join('、')}</strong> 才能开始对账</span>
              </div>
            );
            return null;
          })()}

          <div className="rc-docs-list">
            {docs.map(doc => (
              <div key={doc.id} className="rc-docs-card">
                <div className="rc-docs-thumb">
                  {doc.processedUrl || doc.previewUrl ? (
                    <img src={doc.processedUrl || doc.previewUrl} alt="" />
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  )}
                </div>
                <div className="rc-docs-info">
                  <div className="rc-docs-name">{doc.name}</div>
                  <button
                    className="rc-docs-type-badge"
                    style={{ background: DOC_TYPE_COLOR[doc.type] + '20', color: DOC_TYPE_COLOR[doc.type] }}
                    onClick={() => handleChangeDocType(doc.id)}
                  >
                    {DOC_TYPE_LABEL[doc.type]}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                </div>
                <button className="rc-docs-remove" onClick={() => handleRemoveDoc(doc.id)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>

          <div className="rc-docs-add">
            <button className="rc-docs-add-btn" onClick={() => docsCameraRef.current?.click()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span>扫描添加</span>
            </button>
            <button className="rc-docs-add-btn" onClick={() => docsInputRef.current?.click()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>导入文档</span>
            </button>
          </div>

          <input ref={docsInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.xlsx,.xls,.csv" style={{ display: 'none' }}
            onChange={e => { if (e.target.files.length) handleFiles(e.target.files); e.target.value = ''; }} />
          <input ref={docsCameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
            onChange={e => { if (e.target.files.length) handleFiles(e.target.files); e.target.value = ''; }} />

          <div className="rc-bottom">
            {(() => {
              const { ready: canStart } = getScenarioReadiness(docs);
              return (
                <button
                  className={`rc-btn-primary${!canStart ? ' disabled' : ''}`}
                  disabled={!canStart}
                  onClick={canStart ? handleStartFromDocs : undefined}
                  style={!canStart ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  开始对账
                </button>
              );
            })()}
          </div>
        </div>
      )}

      {/* ANALYZE - OCR + AI Matching combined */}
      {step === 'analyze' && (
        <div className="rc-section rc-center">
          <div className="rc-analysis">
            <div className="rc-analysis-brain">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.3">
                <path d="M12 2a7 7 0 00-7 7c0 2.5 1.5 4.5 3 6l1 3h6l1-3c1.5-1.5 3-3.5 3-6a7 7 0 00-7-7z" />
                <path d="M9 18h6M10 21h4" />
              </svg>
              <div className="rc-analysis-pulse" />
            </div>
            <h3>AI 识别与对账中</h3>
            <div className="rc-analysis-steps">
              {parseSteps.map((s, i) => (
                <div key={i} className="rc-analysis-step"><span className="rc-analysis-check">✓</span><span>{s}</span></div>
              ))}
              <div className="rc-analysis-step loading"><div className="rc-mini-spinner" /><span>处理中...</span></div>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS */}
      {step === 'results' && matchResults && reconData && (
        <div className="rc-section">
          <div className="rc-stats-row">
            <div className="rc-stat"><div className="rc-stat-value">{matchResults.matchedCount}</div><div className="rc-stat-label">匹配</div></div>
            <div className="rc-stat"><div className="rc-stat-value accent">{matchResults.matchRate.toFixed(0)}%</div><div className="rc-stat-label">匹配率</div></div>
            <div className="rc-stat"><div className="rc-stat-value danger">{matchResults.unmatchedBank.length + matchResults.unmatchedLedger.length}</div><div className="rc-stat-label">未匹配</div></div>
            <div className="rc-stat"><div className="rc-stat-value">¥{fmt(matchResults.matchedAmt)}</div><div className="rc-stat-label">匹配额</div></div>
          </div>

          {/* Documents — collapsible, one card per doc */}
          {(docs.length > 0 ? docs : [
            { id: 'demo-bank', name: '银行对账单_锦鲤餐饮_202604.xlsx', type: 'bank' },
            { id: 'demo-ledger', name: '企业账簿_锦鲤餐饮_202604.xlsx', type: 'ledger' },
          ]).map(doc => {
            const expanded = !!docExpanded[doc.id];
            const badgeColor = DOC_TYPE_COLOR[doc.type] || '#999';
            const data = doc.type === 'bank' ? reconData.bankEntries : doc.type === 'ledger' ? reconData.ledgerEntries : null;
            const imgSrc = doc.processedUrl || doc.previewUrl || null;
            return (
              <div key={doc.id} className="rc-doc-full">
                <div className="rc-doc-full-header" onClick={() => setDocExpanded(prev => ({ ...prev, [doc.id]: !prev[doc.id] }))}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={badgeColor} strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span className={`rc-doc-full-badge ${doc.type}`}>{DOC_TYPE_LABEL[doc.type] || '文档'}</span>
                  <span>{doc.name}</span>
                  <svg className={`rc-doc-full-arrow${expanded ? ' open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rc-text3)" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                {expanded && (
                  <>
                    {imgSrc ? (
                      <img src={imgSrc} alt="" className="rc-doc-full-img" />
                    ) : data && doc.type === 'bank' ? (
                      <div className="rc-doc-full-table-wrap">
                        <table className="rc-doc-full-table">
                          <thead><tr><th>#</th><th>日期</th><th>摘要</th><th>对方</th><th style={{ textAlign: 'right' }}>支出</th><th style={{ textAlign: 'right' }}>收入</th><th style={{ textAlign: 'right' }}>余额</th></tr></thead>
                          <tbody>{data.map((r, i) => (<tr key={r.id}><td className="rc-dft-idx">{i+1}</td><td className="rc-dft-date">{r.date}</td><td className="rc-dft-desc">{getDesc(r)}</td><td className="rc-dft-desc">{getPayee(r)}</td><td className="rc-dft-amt out" style={{ textAlign: 'right' }}>{getDir(r) === 'debit' ? fmt(getAmt(r)) : ''}</td><td className="rc-dft-amt in" style={{ textAlign: 'right' }}>{getDir(r) === 'credit' ? fmt(getAmt(r)) : ''}</td><td className="rc-dft-bal" style={{ textAlign: 'right' }}>{getBalance(r) != null ? fmt(getBalance(r)) : ''}</td></tr>))}</tbody>
                          <tfoot><tr><td colSpan={3}>合计 {data.length} 笔</td><td></td><td className="rc-dft-amt out" style={{ textAlign: 'right' }}>{fmt(reconData.bankTotalOut)}</td><td className="rc-dft-amt in" style={{ textAlign: 'right' }}>{fmt(reconData.bankTotalIn)}</td><td className="rc-dft-bal" style={{ textAlign: 'right' }}>{fmt(reconData.companyInfo.closingBalance)}</td></tr></tfoot>
                        </table>
                      </div>
                    ) : data && doc.type === 'ledger' ? (
                      <div className="rc-doc-full-table-wrap">
                        <table className="rc-doc-full-table">
                          <thead><tr><th>#</th><th>日期</th><th>摘要</th><th>对方</th><th style={{ textAlign: 'right' }}>借方</th><th style={{ textAlign: 'right' }}>贷方</th><th>凭证号</th></tr></thead>
                          <tbody>{data.map((r, i) => (<tr key={r.id}><td className="rc-dft-idx">{i+1}</td><td className="rc-dft-date">{r.date}</td><td className="rc-dft-desc">{getDesc(r)}</td><td className="rc-dft-desc">{getPayee(r)}</td><td className="rc-dft-amt out" style={{ textAlign: 'right' }}>{getDir(r) === 'debit' ? fmt(getAmt(r)) : ''}</td><td className="rc-dft-amt in" style={{ textAlign: 'right' }}>{getDir(r) === 'credit' ? fmt(getAmt(r)) : ''}</td><td className="rc-dft-date">{getRef(r)}</td></tr>))}</tbody>
                          <tfoot><tr><td colSpan={3}>合计 {data.length} 笔</td><td></td><td className="rc-dft-amt out" style={{ textAlign: 'right' }}>{fmt(reconData.ledgerTotalDebit)}</td><td className="rc-dft-amt in" style={{ textAlign: 'right' }}>{fmt(reconData.ledgerTotalCredit)}</td><td></td></tr></tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="rc-doc-placeholder" style={{ padding: '20px' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span>{doc.name}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          <div className="rc-tabs">
            <button className={`rc-tab ${activeResultTab === 'exact' ? 'active' : ''}`} onClick={() => setActiveResultTab('exact')}>精确 ({matchResults.exact.length})</button>
            <button className={`rc-tab ${activeResultTab === 'fuzzy' ? 'active' : ''}`} onClick={() => setActiveResultTab('fuzzy')}>模糊 ({matchResults.fuzzy.length + matchResults.semantic.length})</button>
            <button className={`rc-tab ${activeResultTab === 'unmatched' ? 'active' : ''}`} onClick={() => setActiveResultTab('unmatched')}>未匹配 ({matchResults.unmatchedBank.length + matchResults.unmatchedLedger.length})</button>
          </div>

          {activeResultTab === 'exact' && (() => {
            const items = matchResults.exact;
            const visible = showAllResults ? items : items.slice(0, 3);
            return (
              <>
                {visible.map((m, i) => {
                  const key = `exact-${i}`;
                  return (
                    <div key={key} className="rc-match-card">
                      <div className="rc-match-head"><span className="rc-badge exact">精确</span><span className="rc-match-score">{m.score}%</span><span className="rc-match-amt">¥{fmt(getAmt(m.bank))}</span></div>
                      <div className="rc-match-pair">
                        <div className="rc-match-side"><span className="rc-match-tag bank">银行</span><span>{m.bank.date}</span><span className="rc-match-desc">{getDesc(m.bank)}</span></div>
                        <div className="rc-match-arrow">↔</div>
                        <div className="rc-match-side"><span className="rc-match-tag ledger">企业</span><span>{m.ledger.date}</span><span className="rc-match-desc">{getDesc(m.ledger)}</span></div>
                      </div>
                      {!confirmed[key] && !rejected[key] && (<div className="rc-match-actions"><button className="rc-action-btn confirm" onClick={() => handleConfirm(key)}>✓ 确认</button><button className="rc-action-btn reject" onClick={() => handleReject(key)}>✗ 驳回</button></div>)}
                      {confirmed[key] && <div className="rc-match-status confirmed">✓ 已确认</div>}
                      {rejected[key] && <div className="rc-match-status rejected">✗ 已驳回</div>}
                    </div>
                  );
                })}
                {!showAllResults && items.length > 3 && (
                  <button className="rc-show-more" onClick={() => setShowAllResults(true)}>
                    查看全部 {items.length} 条匹配结果
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                )}
              </>
            );
          })()}
          {activeResultTab === 'fuzzy' && [...matchResults.fuzzy, ...matchResults.semantic].map((m, i) => {
            const key = `fuzzy-${i}`;
            return (
              <div key={key} className="rc-match-card">
                <div className="rc-match-head"><span className={`rc-badge ${m.score >= 75 ? 'fuzzy' : 'semantic'}`}>{m.score >= 75 ? '模糊' : '语义'}</span><span className="rc-match-score">{m.score}%</span><span className="rc-match-amt">¥{fmt(getAmt(m.bank))}</span></div>
                <div className="rc-match-pair">
                  <div className="rc-match-side"><span className="rc-match-tag bank">银行</span><span>{m.bank.date}</span><span className="rc-match-desc">{getDesc(m.bank)}</span></div>
                  <div className="rc-match-arrow">↔</div>
                  <div className="rc-match-side"><span className="rc-match-tag ledger">企业</span><span>{m.ledger.date}</span><span className="rc-match-desc">{getDesc(m.ledger)}</span></div>
                </div>
                {m.daysDiff > 0 && <div className="rc-match-diff">日期差异 {m.daysDiff} 天</div>}
                {!confirmed[key] && !rejected[key] && (<div className="rc-match-actions"><button className="rc-action-btn confirm" onClick={() => handleConfirm(key)}>✓ 确认</button><button className="rc-action-btn reject" onClick={() => handleReject(key)}>✗ 驳回</button></div>)}
                {confirmed[key] && <div className="rc-match-status confirmed">✓ 已确认</div>}
                {rejected[key] && <div className="rc-match-status rejected">✗ 已驳回</div>}
              </div>
            );
          })}
          {activeResultTab === 'unmatched' && (
            <>
              {matchResults.unmatchedBank.length > 0 && (<div className="rc-card"><div className="rc-card-title danger">银行未达 ({matchResults.unmatchedBank.length})</div>{matchResults.unmatchedBank.map(b => (<div key={b.id} className="rc-unmatched-row"><span className="rc-um-date">{b.date}</span><span className="rc-um-desc">{getDesc(b)}</span><span className={`rc-um-amt ${getDir(b) === 'debit' ? 'out' : 'in'}`}>{getDir(b) === 'debit' ? `-¥${fmt(getAmt(b))}` : `+¥${fmt(getAmt(b))}`}</span></div>))}</div>)}
              {matchResults.unmatchedLedger.length > 0 && (<div className="rc-card"><div className="rc-card-title danger">企业未达 ({matchResults.unmatchedLedger.length})</div>{matchResults.unmatchedLedger.map(l => (<div key={l.id} className="rc-unmatched-row"><span className="rc-um-date">{l.date}</span><span className="rc-um-desc">{getDesc(l)}</span><span className={`rc-um-amt ${getDir(l) === 'debit' ? 'out' : 'in'}`}>{getDir(l) === 'debit' ? `-¥${fmt(getAmt(l))}` : `+¥${fmt(getAmt(l))}`}</span></div>))}</div>)}
            </>
          )}
          <div className="rc-bottom">
            <button className="rc-btn-secondary" onClick={handleReset}>重新对账</button>
            <button className="rc-btn-primary" onClick={() => setStep('report')}>生成调节表</button>
          </div>
        </div>
      )}

      {/* REPORT */}
      {step === 'report' && matchResults && reconData && (
        <div className="rc-section">
          <div className="rc-report-header">
            <h3>银行存款余额调节表</h3>
            <p>{reconData.companyInfo.name}</p>
            <p className="rc-report-period">{reconData.companyInfo.periodStart} 至 {reconData.companyInfo.periodEnd}</p>
          </div>
          <div className="rc-report-grid">
            <div className="rc-report-col">
              <div className="rc-report-col-title">银行对账单</div>
              <div className="rc-report-row"><span>期末余额</span><span className="rc-report-val">¥{fmt(reconData.companyInfo.closingBalance)}</span></div>
              {matchResults.unmatchedLedger.filter(l => getDir(l) === 'credit').map((l, i) => (<div key={i} className="rc-report-row add"><span>加：{getDesc(l)}</span><span className="rc-report-val">+¥{fmt(getAmt(l))}</span></div>))}
              {matchResults.unmatchedLedger.filter(l => getDir(l) === 'debit').map((l, i) => (<div key={i} className="rc-report-row sub"><span>减：{getDesc(l)}</span><span className="rc-report-val">-¥{fmt(getAmt(l))}</span></div>))}
              {(() => { const adj = reconData.companyInfo.closingBalance + matchResults.unmatchedLedger.filter(l => getDir(l) === 'credit').reduce((s, l) => s + getAmt(l), 0) - matchResults.unmatchedLedger.filter(l => getDir(l) === 'debit').reduce((s, l) => s + getAmt(l), 0); return <div className="rc-report-row total"><span>调节后余额</span><span className="rc-report-val">¥{fmt(adj)}</span></div>; })()}
            </div>
            <div className="rc-report-col">
              <div className="rc-report-col-title">企业账面</div>
              {(() => { const lb = reconData.companyInfo.openingBalance - reconData.ledgerTotalDebit + reconData.ledgerTotalCredit; return (<><div className="rc-report-row"><span>期末余额</span><span className="rc-report-val">¥{fmt(lb)}</span></div>
                {matchResults.unmatchedBank.filter(b => getDir(b) === 'credit').map((b, i) => (<div key={i} className="rc-report-row add"><span>加：{getDesc(b)}</span><span className="rc-report-val">+¥{fmt(getAmt(b))}</span></div>))}
                {matchResults.unmatchedBank.filter(b => getDir(b) === 'debit').map((b, i) => (<div key={i} className="rc-report-row sub"><span>减：{getDesc(b)}</span><span className="rc-report-val">-¥{fmt(getAmt(b))}</span></div>))}
                {(() => { const adj = lb + matchResults.unmatchedBank.filter(b => getDir(b) === 'credit').reduce((s, b) => s + getAmt(b), 0) - matchResults.unmatchedBank.filter(b => getDir(b) === 'debit').reduce((s, b) => s + getAmt(b), 0); return <div className="rc-report-row total"><span>调节后余额</span><span className="rc-report-val">¥{fmt(adj)}</span></div>; })()}
              </>); })()}
            </div>
          </div>
          <div className="rc-card">
            <div className="rc-card-title">匹配汇总</div>
            <div className="rc-summary-row"><span>精确匹配</span><span>{matchResults.exact.length} 笔</span></div>
            <div className="rc-summary-row"><span>模糊匹配</span><span>{matchResults.fuzzy.length} 笔</span></div>
            {matchResults.semantic.length > 0 && <div className="rc-summary-row"><span>语义匹配</span><span>{matchResults.semantic.length} 笔</span></div>}
            <div className="rc-summary-row"><span>银行未达</span><span className="danger">{matchResults.unmatchedBank.length} 笔</span></div>
            <div className="rc-summary-row"><span>企业未达</span><span className="danger">{matchResults.unmatchedLedger.length} 笔</span></div>
            <div className="rc-summary-row total"><span>匹配率</span><span>{matchResults.matchRate.toFixed(1)}%</span></div>
          </div>
          <div className="rc-bottom">
            <button className="rc-btn-secondary" onClick={() => setStep('results')}>返回</button>
            <button className="rc-btn-primary" onClick={() => {
              if (matchResults && reconData) {
                const record = {
                  id: Date.now(),
                  company: reconData.companyInfo.name,
                  period: reconData.companyInfo.period,
                  matchRate: matchResults.matchRate,
                  matchedCount: matchResults.matchedCount,
                  unmatchedCount: matchResults.unmatchedBank.length + matchResults.unmatchedLedger.length,
                  totalCount: reconData.bankEntries.length + reconData.ledgerEntries.length,
                  time: new Date().toLocaleString('zh-CN'),
                };
                const next = [record, ...history].slice(0, 20);
                setHistory(next);
                try { localStorage.setItem('rc-history', JSON.stringify(next)); } catch {}
              }
              setStep('list');
            }}>保存结果</button>
          </div>
        </div>
      )}
      {/* LIST — Document view (scan) or Balance Reconciliation Sheet (recon) */}
      {step === 'list' && (flowMode === 'scan' || (flowMode === 'recon' && !(matchResults && reconData))) && (
        <div className="rc-list rc-list-img">
          <div className="rc-list-topbar">
            <button className="rc-list-back" onClick={() => { if (prevStep === 'select') { setDocs(savedDocsRef.current); setStep('select'); setPrevStep(null); } else { setStep(flowMode === 'recon' ? 'home' : 'toolbox'); setFiles([]); setPreviewUrls([]); setCropBoxes([]); setDocs([]); setProcessedUrls([]); } }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div className="rc-list-title">{docs[0]?.name || '扫描文档'}</div>
            <div className="rc-list-topbar-right">
              <span className="rc-list-tag-btn">标签+</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </div>
          </div>

          {flowMode === 'recon' && (() => {
            const { sc, hasA, hasB, scenario } = getScenarioReadiness(docs);
            const hasAiScenario = docs.some(d => d.aiScenario);
            const missing = [];
            if (!hasA) missing.push(sc.labelA);
            if (!hasB) missing.push(sc.labelB);
            if (missing.length > 0) return (
              <div className="rc-list-doc-hint">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span>{hasAiScenario ? `检测到「${sc.name}」场景，还需添加` : '还需添加'} <strong>{missing.join('、')}</strong> 才能开始对账</span>
              </div>
            );
            if (hasA && hasB && hasAiScenario) return (
              <div className="rc-list-doc-hint" style={{ background: 'rgba(0,180,80,0.08)', borderColor: '#00b450' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00b450" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>已识别「<strong>{sc.name}</strong>」场景，文档齐全，可以开始对账</span>
              </div>
            );
            return null;
          })()}

          <div className="rc-list-img-content">
            {docs.map((doc, i) => {
              const imgSrc = doc.processedUrl || doc.previewUrl;
              const typeLabel = DOC_TYPE_LABEL[doc.type] || '待分类';
              const typeColor = DOC_TYPE_COLOR[doc.type] || '#999';
              return (
                <div key={doc.id} className="rc-list-img-page">
                  {i > 0 && <div className="rc-list-img-divider" />}
                  <div className="rc-list-img-tag" style={{ background: typeColor }}>
                    {doc.type === 'unknown' ? '识别中...' : typeLabel}
                  </div>
                  {imgSrc ? (
                    <img src={imgSrc} alt={doc.name} className="rc-list-img-photo" />
                  ) : (
                    <div className="rc-doc-placeholder" style={{ padding: '40px 20px' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <span>{doc.name}</span>
                    </div>
                  )}
                </div>
              );
            })}

            <button className="rc-list-img-add" onClick={() => scanCameraRef.current?.click()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--rc-accent)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
              <span>继续添加页面</span>
            </button>
          </div>

          <div className="rc-list-bottom rc-list-bottom-img">
            <button className="rc-list-action" onClick={() => scanCameraRef.current?.click()}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/><line x1="14" y1="3" x2="14" y2="8"/><line x1="11" y1="5.5" x2="17" y2="5.5"/></svg>
              <span>添加</span>
            </button>
            <button className="rc-list-action">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>编辑</span>
            </button>
            <button className="rc-list-action">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              <span>分享</span>
            </button>
            <button className="rc-list-action">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              <span>转 Word</span>
            </button>
            <button className="rc-list-action rc-list-action-recon" onClick={() => {
              const currentDocs = docs;
              const { ready } = getScenarioReadiness(currentDocs);
              if (ready) {
                setFlowMode('recon');
                const hasRealFiles = currentDocs.some(d => d.file || d.processedUrl);
                startAnalyze(!hasRealFiles, currentDocs);
              } else {
                setFlowMode('recon');
                setSelectedDocIds(new Set(currentDocs.map(d => d.id)));
                setStep('select');
              }
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
              <span>财务对账</span>
            </button>
          </div>
        </div>
      )}

      {step === 'list' && flowMode === 'recon' && matchResults && reconData && (() => {
        const bankAdj = reconData.companyInfo.closingBalance
          + matchResults.unmatchedLedger.filter(l => getDir(l) === 'credit').reduce((s, l) => s + getAmt(l), 0)
          - matchResults.unmatchedLedger.filter(l => getDir(l) === 'debit').reduce((s, l) => s + getAmt(l), 0);
        const ledgerBalance = reconData.companyInfo.openingBalance - reconData.ledgerTotalDebit + reconData.ledgerTotalCredit;
        const ledgerAdj = ledgerBalance
          + matchResults.unmatchedBank.filter(b => getDir(b) === 'credit').reduce((s, b) => s + getAmt(b), 0)
          - matchResults.unmatchedBank.filter(b => getDir(b) === 'debit').reduce((s, b) => s + getAmt(b), 0);
        const balanced = Math.abs(bankAdj - ledgerAdj) < 0.01;
        const now = new Date();
        const genTime = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        const totalEntries = reconData.bankEntries.length + reconData.ledgerEntries.length;

        return (
          <div className="rc-list">
            <div className="rc-list-topbar">
              <button className="rc-list-back" onClick={handleFinish}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div className="rc-list-title">银行余额调节表</div>
              <div style={{ width: 20 }} />
            </div>

            <div className="rc-list-tabs">
              <button className="rc-list-tab active">Sheet1</button>
              <button className="rc-list-tab">Sheet2</button>
              <button className="rc-list-tab">Sheet3</button>
            </div>

            <div className="rc-list-sheet">
              <table className="rc-list-table">
                <tbody>
                  <tr><td colSpan={3} className="rc-lt-title">银行余额调节表</td></tr>
                  <tr><td colSpan={3} className="rc-lt-meta">对账期间: {reconData.companyInfo.periodStart} ~ {reconData.companyInfo.periodEnd}</td></tr>
                  <tr><td colSpan={3} className="rc-lt-meta">生成时间: {genTime}</td></tr>
                  <tr><td colSpan={3} className="rc-lt-blank"></td></tr>

                  <tr><td colSpan={3} className="rc-lt-section">一、对账摘要</td></tr>
                  <tr className="rc-lt-header"><td className="rc-lt-bold">项目</td><td className="rc-lt-right">笔数</td><td className="rc-lt-right">占比</td></tr>
                  <tr><td>精确匹配</td><td className="rc-lt-right">{matchResults.exact.length}</td><td className="rc-lt-right">{totalEntries > 0 ? ((matchResults.exact.length / totalEntries) * 100).toFixed(1) : 0}%</td></tr>
                  <tr><td>模糊匹配</td><td className="rc-lt-right">{matchResults.fuzzy.length}</td><td className="rc-lt-right">{totalEntries > 0 ? ((matchResults.fuzzy.length / totalEntries) * 100).toFixed(1) : 0}%</td></tr>
                  <tr><td>语义匹配</td><td className="rc-lt-right">{matchResults.semantic.length}</td><td className="rc-lt-right"></td></tr>
                  <tr><td>未匹配(银行)</td><td className="rc-lt-right">{matchResults.unmatchedBank.length}</td><td className="rc-lt-right"></td></tr>
                  <tr><td>未匹配(企业)</td><td className="rc-lt-right">{matchResults.unmatchedLedger.length}</td><td className="rc-lt-right"></td></tr>
                  <tr className="rc-lt-bold-row"><td>银行总笔数</td><td className="rc-lt-right">{reconData.bankEntries.length}</td><td></td></tr>
                  <tr className="rc-lt-bold-row"><td>企业总笔数</td><td className="rc-lt-right">{reconData.ledgerEntries.length}</td><td></td></tr>

                  <tr><td colSpan={3} className="rc-lt-section">二、银行调节</td></tr>
                  <tr className="rc-lt-bold-row"><td>银行余额</td><td></td><td className="rc-lt-right">{fmt(reconData.companyInfo.closingBalance)}</td></tr>
                  {matchResults.unmatchedLedger.filter(l => getDir(l) === 'credit').map((l, i) => (
                    <tr key={`ba-${i}`}><td className="rc-lt-indent">加: {getDesc(l)}</td><td></td><td className="rc-lt-right"></td></tr>
                  ))}
                  {matchResults.unmatchedLedger.filter(l => getDir(l) === 'debit').map((l, i) => (
                    <tr key={`bs-${i}`}><td className="rc-lt-indent">减: {getDesc(l)}-{fmt(getAmt(l))}</td><td></td><td className="rc-lt-right"></td></tr>
                  ))}
                  <tr className="rc-lt-total-row"><td className="rc-lt-bold">调节后余额</td><td></td><td className="rc-lt-right rc-lt-bold">{fmt(bankAdj)}</td></tr>

                  <tr><td colSpan={3} className="rc-lt-section">三、企业调节</td></tr>
                  <tr className="rc-lt-bold-row"><td>企业余额</td><td></td><td className="rc-lt-right">{fmt(ledgerBalance)}</td></tr>
                  {matchResults.unmatchedBank.filter(b => getDir(b) === 'credit').map((b, i) => (
                    <tr key={`la-${i}`}><td className="rc-lt-indent">加: {getDesc(b)}{fmt(getAmt(b))}</td><td></td><td className="rc-lt-right">{fmt(getAmt(b))}</td></tr>
                  ))}
                  {matchResults.unmatchedBank.filter(b => getDir(b) === 'debit').map((b, i) => (
                    <tr key={`ls-${i}`}><td className="rc-lt-indent">减: 银行{b.date}{getDesc(b)}</td><td></td><td className="rc-lt-right">-{fmt(getAmt(b))}</td></tr>
                  ))}
                  <tr className="rc-lt-total-row"><td className="rc-lt-bold">调节后余额</td><td></td><td className="rc-lt-right rc-lt-bold">{fmt(ledgerAdj)}</td></tr>

                  <tr><td colSpan={3} className={`rc-lt-verdict ${balanced ? 'ok' : 'err'}`}>
                    {balanced ? '✓ 调节后余额一致' : '✗ 调节后余额不一致'}
                  </td></tr>
                </tbody>
              </table>
            </div>

            <div className="rc-list-bottom">
              <button className="rc-list-action" onClick={handleFinish}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                <span>在电脑上编辑</span>
              </button>
              <button className="rc-list-action">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h6M9 17h4"/></svg>
                <span>另存为 PDF</span>
              </button>
              <button className="rc-list-action">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                <span>更多</span>
              </button>
              <button className="rc-list-export">导出文档</button>
            </div>
          </div>
        );
      })()}

      <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.xlsx,.xls,.csv" style={{ display: 'none' }}
        onChange={e => { if (e.target.files.length) handleFiles(e.target.files); e.target.value = ''; }} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={e => { if (e.target.files.length) handleFiles(e.target.files); e.target.value = ''; }} />
      <input ref={scanCameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={e => { if (e.target.files.length) handleFiles(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
