import { useEffect, useState } from 'react';

const FINANCIAL_KEYWORDS = [
  '银行流水', '银行对账', '对账单', '台账', '总账', '明细账',
  '财务', '会计', '记账', '凭证', '结算', '账单', '发票',
  '结账', '完税', '纳税', '收据', '报销', '付款', '收款',
  '借方', '贷方', '余额', '期初', '期末', '摘要',
  '应收', '应付', '利润', '资产', '负债',
  'bank', 'statement', 'ledger', 'invoice', 'receipt',
  'balance', 'debit', 'credit', 'payment', 'amount',
  '工资', '薪酬', '社保', '公积金', '个税',
  '进项', '销项', '增值税', '税额',
];

const FINANCIAL_DOC_TYPES = {
  bank_statement: { keywords: ['银行流水', '银行对账', '对账单', 'bank statement', '交易明细', '账户'], label: '银行流水' },
  company_ledger: { keywords: ['总账', '明细账', '台账', '记账凭证', 'ledger', '科目'], label: '企业账簿' },
  invoice: { keywords: ['发票', '增值税', 'invoice', '税额', '价税合计', '开票'], label: '发票' },
  receipt: { keywords: ['收据', '入库', 'receipt', '验收', '签收'], label: '收据/入库单' },
  expense: { keywords: ['报销', '费用', '差旅', 'expense', '出差'], label: '报销单' },
  payroll: { keywords: ['工资', '薪酬', '社保', '公积金', '个税', 'payroll'], label: '工资表' },
  tax: { keywords: ['完税', '纳税', '税务', '申报', 'tax'], label: '税务凭证' },
  settlement: { keywords: ['结算', '结账', '清算', 'settlement'], label: '结算单' },
};

function classifyFromText(text) {
  if (!text) return null;
  const lower = text.toLowerCase();

  for (const [type, config] of Object.entries(FINANCIAL_DOC_TYPES)) {
    for (const kw of config.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return { type, label: config.label };
      }
    }
  }
  return null;
}

function isFinancialDoc(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  let matchCount = 0;
  for (const kw of FINANCIAL_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      matchCount++;
      if (matchCount >= 2) return true;
    }
  }
  return false;
}

const OCR_STEPS = [
  'OCR 识别文档文字...',
  'AI 分析文档内容...',
  '智能识别文档类型...',
  '判断对账场景...',
];

export default function CSAnalyzingPage({ files, onComplete }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('正在处理...');

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();
    const MIN_DISPLAY_MS = 3000;

    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const naturalProgress = Math.min((elapsed / MIN_DISPLAY_MS) * 100, 95);
      setProgress(naturalProgress);
    }, 50);

    const stepTimer = setInterval(() => {
      setStepIdx(prev => Math.min(prev + 1, OCR_STEPS.length - 1));
    }, 700);

    async function analyze() {
      const results = [];

      for (const file of files) {
        let textContent = '';
        let docType = null;

        if (file.name) {
          const nameClassification = classifyFromText(file.name);
          if (nameClassification) docType = nameClassification;
        }

        if (file.type && file.type.includes('text')) {
          try {
            textContent = await file.text();
          } catch (e) { /* ignore */ }
        }

        if (!docType && textContent) {
          docType = classifyFromText(textContent);
        }

        const isFinancial = docType !== null || isFinancialDoc(file.name + ' ' + textContent);

        results.push({
          file,
          textContent: textContent.slice(0, 500),
          docType,
          isFinancial,
        });
      }

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(MIN_DISPLAY_MS - elapsed, 0);
      await new Promise(r => setTimeout(r, remaining));

      if (cancelled) return;

      clearInterval(progressTimer);
      clearInterval(stepTimer);
      setProgress(100);

      const hasFinancial = results.some(r => r.isFinancial);
      const financialResults = results.filter(r => r.isFinancial);
      const docTypes = financialResults.map(r => r.docType).filter(Boolean);

      setTimeout(() => {
        if (!cancelled) {
          onComplete({
            results,
            hasFinancial,
            docTypes,
            financialCount: financialResults.length,
          });
        }
      }, 500);
    }

    analyze();

    return () => {
      cancelled = true;
      clearInterval(progressTimer);
      clearInterval(stepTimer);
    };
  }, [files, onComplete]);

  return (
    <div className="cs-analyzing">
      <div className="cs-analyzing-content">
        <div className="cs-analyzing-icon">
          <div className="cs-analyzing-ring">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(61,213,152,0.15)" strokeWidth="4"/>
              <circle
                cx="40" cy="40" r="36" fill="none" stroke="#3DD598" strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
                style={{ transition: 'stroke-dashoffset 0.1s linear' }}
              />
            </svg>
            <div className="cs-analyzing-ring-inner">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
          </div>
        </div>

        <h2 className="cs-analyzing-title">AI 智能分析中</h2>
        <p className="cs-analyzing-step">{OCR_STEPS[stepIdx]}</p>

        <div className="cs-analyzing-bar-wrap">
          <div className="cs-analyzing-bar">
            <div className="cs-analyzing-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="cs-analyzing-files">
          {files.map((f, i) => (
            <div key={i} className="cs-analyzing-file-tag">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
                <rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>
              </svg>
              <span>{f.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { isFinancialDoc, classifyFromText, FINANCIAL_DOC_TYPES };
