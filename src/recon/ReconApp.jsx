import { useState, useCallback, useRef, useEffect } from 'react';
import { BANK_DATA, LEDGER_DATA, COMPANY_INFO, BANK_TOTAL_OUT, BANK_TOTAL_IN, LEDGER_TOTAL_DEBIT, LEDGER_TOTAL_CREDIT } from './demoData';
import { runMatching } from './matchEngine';
import CropEditor from './CropEditor';

function fmt(v) {
  return (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 });
}

const PIPELINE = [
  { key: 'upload', label: '上传', icon: '📤' },
  { key: 'edit', label: '编辑', icon: '✂️' },
  { key: 'docs', label: '文档', icon: '📂' },
  { key: 'analyze', label: '分析', icon: '🤖' },
  { key: 'results', label: '结果', icon: '📊' },
  { key: 'report', label: '报告', icon: '📋' },
];

function classifyDoc(name) {
  const n = (name || '').toLowerCase();
  if (/银行|bank|流水|对账单|account.?statement/i.test(n)) return 'bank';
  if (/账簿|ledger|凭证|记账|企业|voucher|总账/i.test(n)) return 'ledger';
  return 'unknown';
}

const DOC_TYPE_LABEL = { bank: '银行流水', ledger: '企业账簿', unknown: '待分类' };
const DOC_TYPE_COLOR = { bank: '#4a90d9', ledger: '#f5a623', unknown: '#999' };

const FILTERS = [
  { key: 'original', label: '原图', filter: 'none', hot: false },
  { key: 'hd', label: '智能高清', filter: 'contrast(1.2) brightness(1.05) saturate(1.05)', hot: true },
  { key: 'shadow', label: '去阴影', filter: 'brightness(1.15) contrast(1.25)', hot: false },
  { key: 'handwriting', label: '去除手写', filter: 'contrast(1.6) brightness(1.2) saturate(0)', hot: false },
  { key: 'bright', label: '增亮', filter: 'brightness(1.3) contrast(1.1)', hot: false },
  { key: 'sharp', label: '增强锐化', filter: 'contrast(1.4) brightness(1.1) saturate(1.1)', hot: false },
];

export default function ReconApp() {
  const [step, setStep] = useState('toolbox');
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
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rc-history') || '[]'); } catch { return []; }
  });
  const [docs, setDocs] = useState([]);
  const [flowMode, setFlowMode] = useState('recon');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const docsInputRef = useRef(null);
  const docsCameraRef = useRef(null);
  const scanCameraRef = useRef(null);

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
        type: classifyDoc(file.name),
        previewUrl: results[i].previewUrl,
        processedUrl: results[i].processedUrl,
      }));
      setDocs(prev => [...prev, ...newDocs]);
      if (flowMode === 'scan') {
        setProcessedUrls(results.map(r => r.processedUrl));
        setStep('list');
      } else {
        setStep('docs');
      }
    });
  }, [files, previewUrls, cropBoxes, selectedFilter, flowMode]);

  const handleRemoveDoc = useCallback((id) => {
    setDocs(prev => prev.filter(d => d.id !== id));
  }, []);

  const handleChangeDocType = useCallback((id) => {
    const cycle = { bank: 'ledger', ledger: 'unknown', unknown: 'bank' };
    setDocs(prev => prev.map(d => d.id === id ? { ...d, type: cycle[d.type] } : d));
  }, []);

  const startAnalyze = useCallback(() => {
    setStep('analyze');
    setParseSteps([]);
    setParseResult(null);

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
      setParseResult({
        bankCount: BANK_DATA.length,
        ledgerCount: LEDGER_DATA.length,
      });
      const results = runMatching(BANK_DATA, LEDGER_DATA);
      setMatchResults(results);
      setStep('results');
    }, 3000);
  }, []);

  const handleStartFromDocs = useCallback(() => {
    setFiles(docs.map(d => ({ name: d.name, type: 'processed' })));
    setPreviewUrls(docs.map(d => d.previewUrl));
    setProcessedUrls(docs.map(d => d.processedUrl));
    startAnalyze();
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
    if (matchResults) {
      const record = {
        id: Date.now(),
        company: COMPANY_INFO.name,
        period: COMPANY_INFO.period,
        matchRate: matchResults.matchRate,
        matchedCount: matchResults.matchedCount,
        unmatchedCount: matchResults.unmatchedBank.length + matchResults.unmatchedLedger.length,
        totalCount: BANK_DATA.length + LEDGER_DATA.length,
        time: new Date().toLocaleString('zh-CN'),
      };
      const next = [record, ...history].slice(0, 20);
      setHistory(next);
      try { localStorage.setItem('rc-history', JSON.stringify(next)); } catch {}
    }
    setStep('home'); setFiles([]); setPreviewUrls([]); setCropBoxes([]); setDocs([]);
    setProcessedUrls([]); setParseSteps([]); setParseResult(null);
    setMatchResults(null); setConfirmed({}); setRejected({});
    setSelectedFilter('hd'); setCurrentFileIdx(0); setIsCropping(false);
  }, [matchResults, history]);

  const handleReset = useCallback(() => {
    setStep('home'); setFiles([]); setPreviewUrls([]); setCropBoxes([]); setDocs([]);
    setProcessedUrls([]); setParseSteps([]); setParseResult(null);
    setMatchResults(null); setConfirmed({}); setRejected({});
    setSelectedFilter('hd'); setCurrentFileIdx(0); setIsCropping(false);
  }, []);

  const isDocFile = files[currentFileIdx] && !files[currentFileIdx]?.type?.startsWith('image/');

  return (
    <div className="rc">
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
            <div className="rc-tb-card rc-tb-card-highlight" onClick={() => { setFlowMode('recon'); setStep('home'); }}>
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
            <div className="rc-tb-tabbar-item"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>全部文档</span></div>
            <div className="rc-tb-tabbar-camera" onClick={() => { setFlowMode('scan'); scanCameraRef.current?.click(); }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg></div>
            <div className="rc-tb-tabbar-item active"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg><span>工具箱</span></div>
            <div className="rc-tb-tabbar-item"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>我的</span></div>
          </div>
        </div>
      )}

      {/* Pipeline Progress */}
      {step !== 'home' && step !== 'toolbox' && step !== 'list' && flowMode === 'recon' && (
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
        <div className="rc-section rc-center" style={{ padding: '40px 20px' }}>
          <div className="rc-home-logo">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.3">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18" />
            </svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '16px 0 6px' }}>CS 智能对账</h2>
          <p style={{ fontSize: 13, color: 'var(--rc-text2)', marginBottom: 32, textAlign: 'center', lineHeight: 1.6 }}>
            扫描或上传银行对账单、企业账簿等财务文档<br />AI 自动识别、匹配、生成调节表
          </p>

          <div className="rc-upload-area">
            <div className="rc-upload-actions">
              <button className="rc-upload-btn camera" onClick={() => cameraInputRef.current?.click()}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>拍照扫描</span>
              </button>
              <button className="rc-upload-btn gallery" onClick={() => fileInputRef.current?.click()}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>从相册导入</span>
              </button>
              <button className="rc-upload-btn file" onClick={() => fileInputRef.current?.click()}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                <span>导入文档</span>
              </button>
            </div>
            <p className="rc-upload-hint">支持 JPG、PNG、PDF、Excel、CSV</p>
          </div>

          <div className="rc-divider"><span>或使用示例数据</span></div>

          <button className="rc-demo-btn" onClick={() => {
            setFiles([{ name: '银行对账单_锦鲤餐饮_202604.xlsx', type: 'demo' }]);
            setPreviewUrls([null]);
            startAnalyze();
          }}>
            <div className="rc-demo-icon">🏦</div>
            <div className="rc-demo-info">
              <div className="rc-demo-name">锦鲤餐饮 · 银行对账</div>
              <div className="rc-demo-desc">20笔银行流水 vs 20笔企业账簿 · 2026年4月</div>
            </div>
            <span className="rc-demo-arrow">→</span>
          </button>

          {history.length > 0 && (
            <div className="rc-history">
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
            const hasBank = docs.some(d => d.type === 'bank');
            const hasLedger = docs.some(d => d.type === 'ledger');
            const missing = [];
            if (!hasBank) missing.push('银行流水');
            if (!hasLedger) missing.push('企业账簿');
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
              const hasBank = docs.some(d => d.type === 'bank');
              const hasLedger = docs.some(d => d.type === 'ledger');
              const canStart = hasBank && hasLedger;
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
      {step === 'results' && matchResults && (
        <div className="rc-section">
          {/* Documents — collapsible, one card per doc */}
          {(docs.length > 0 ? docs : [
            { id: 'demo-bank', name: '银行对账单_锦鲤餐饮_202604.xlsx', type: 'bank' },
            { id: 'demo-ledger', name: '企业账簿_锦鲤餐饮_202604.xlsx', type: 'ledger' },
          ]).map(doc => {
            const expanded = !!docExpanded[doc.id];
            const badgeColor = DOC_TYPE_COLOR[doc.type] || '#999';
            const data = doc.type === 'bank' ? BANK_DATA : doc.type === 'ledger' ? LEDGER_DATA : null;
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
                          <tbody>{data.map((r, i) => (<tr key={r.id}><td className="rc-dft-idx">{i+1}</td><td className="rc-dft-date">{r.date}</td><td className="rc-dft-desc">{r.desc}</td><td className="rc-dft-desc">{r.payee}</td><td className="rc-dft-amt out" style={{ textAlign: 'right' }}>{r.out ? fmt(r.out) : ''}</td><td className="rc-dft-amt in" style={{ textAlign: 'right' }}>{r.income ? fmt(r.income) : ''}</td><td className="rc-dft-bal" style={{ textAlign: 'right' }}>{fmt(r.balance)}</td></tr>))}</tbody>
                          <tfoot><tr><td colSpan={3}>合计 {data.length} 笔</td><td></td><td className="rc-dft-amt out" style={{ textAlign: 'right' }}>{fmt(BANK_TOTAL_OUT)}</td><td className="rc-dft-amt in" style={{ textAlign: 'right' }}>{fmt(BANK_TOTAL_IN)}</td><td className="rc-dft-bal" style={{ textAlign: 'right' }}>{fmt(COMPANY_INFO.closingBalance)}</td></tr></tfoot>
                        </table>
                      </div>
                    ) : data && doc.type === 'ledger' ? (
                      <div className="rc-doc-full-table-wrap">
                        <table className="rc-doc-full-table">
                          <thead><tr><th>#</th><th>日期</th><th>摘要</th><th>对方</th><th style={{ textAlign: 'right' }}>借方</th><th style={{ textAlign: 'right' }}>贷方</th><th>凭证号</th></tr></thead>
                          <tbody>{data.map((r, i) => (<tr key={r.id}><td className="rc-dft-idx">{i+1}</td><td className="rc-dft-date">{r.date}</td><td className="rc-dft-desc">{r.desc}</td><td className="rc-dft-desc">{r.payee}</td><td className="rc-dft-amt out" style={{ textAlign: 'right' }}>{r.debit ? fmt(r.debit) : ''}</td><td className="rc-dft-amt in" style={{ textAlign: 'right' }}>{r.credit ? fmt(r.credit) : ''}</td><td className="rc-dft-date">{r.voucher}</td></tr>))}</tbody>
                          <tfoot><tr><td colSpan={3}>合计 {data.length} 笔</td><td></td><td className="rc-dft-amt out" style={{ textAlign: 'right' }}>{fmt(LEDGER_TOTAL_DEBIT)}</td><td className="rc-dft-amt in" style={{ textAlign: 'right' }}>{fmt(LEDGER_TOTAL_CREDIT)}</td><td></td></tr></tfoot>
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

          <button className="rc-results-upload" onClick={() => fileInputRef.current?.click()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            继续上传文档
          </button>

          <div className="rc-stats-row">
            <div className="rc-stat"><div className="rc-stat-value">{matchResults.matchedCount}</div><div className="rc-stat-label">匹配</div></div>
            <div className="rc-stat"><div className="rc-stat-value accent">{matchResults.matchRate.toFixed(0)}%</div><div className="rc-stat-label">匹配率</div></div>
            <div className="rc-stat"><div className="rc-stat-value danger">{matchResults.unmatchedBank.length + matchResults.unmatchedLedger.length}</div><div className="rc-stat-label">未匹配</div></div>
            <div className="rc-stat"><div className="rc-stat-value">¥{fmt(matchResults.matchedAmt)}</div><div className="rc-stat-label">匹配额</div></div>
          </div>
          <div className="rc-tabs">
            <button className={`rc-tab ${activeResultTab === 'exact' ? 'active' : ''}`} onClick={() => setActiveResultTab('exact')}>精确 ({matchResults.exact.length})</button>
            <button className={`rc-tab ${activeResultTab === 'fuzzy' ? 'active' : ''}`} onClick={() => setActiveResultTab('fuzzy')}>模糊 ({matchResults.fuzzy.length + matchResults.semantic.length})</button>
            <button className={`rc-tab ${activeResultTab === 'unmatched' ? 'active' : ''}`} onClick={() => setActiveResultTab('unmatched')}>未匹配 ({matchResults.unmatchedBank.length + matchResults.unmatchedLedger.length})</button>
          </div>

          {activeResultTab === 'exact' && matchResults.exact.map((m, i) => {
            const key = `exact-${i}`;
            return (
              <div key={key} className="rc-match-card">
                <div className="rc-match-head"><span className="rc-badge exact">精确</span><span className="rc-match-score">{m.score}%</span><span className="rc-match-amt">¥{fmt(m.bank.out || m.bank.income)}</span></div>
                <div className="rc-match-pair">
                  <div className="rc-match-side"><span className="rc-match-tag bank">银行</span><span>{m.bank.date}</span><span className="rc-match-desc">{m.bank.desc}</span></div>
                  <div className="rc-match-arrow">↔</div>
                  <div className="rc-match-side"><span className="rc-match-tag ledger">企业</span><span>{m.ledger.date}</span><span className="rc-match-desc">{m.ledger.desc}</span></div>
                </div>
                {!confirmed[key] && !rejected[key] && (<div className="rc-match-actions"><button className="rc-action-btn confirm" onClick={() => handleConfirm(key)}>✓ 确认</button><button className="rc-action-btn reject" onClick={() => handleReject(key)}>✗ 驳回</button></div>)}
                {confirmed[key] && <div className="rc-match-status confirmed">✓ 已确认</div>}
                {rejected[key] && <div className="rc-match-status rejected">✗ 已驳回</div>}
              </div>
            );
          })}
          {activeResultTab === 'fuzzy' && [...matchResults.fuzzy, ...matchResults.semantic].map((m, i) => {
            const key = `fuzzy-${i}`;
            return (
              <div key={key} className="rc-match-card">
                <div className="rc-match-head"><span className={`rc-badge ${m.score >= 75 ? 'fuzzy' : 'semantic'}`}>{m.score >= 75 ? '模糊' : '语义'}</span><span className="rc-match-score">{m.score}%</span><span className="rc-match-amt">¥{fmt(m.bank.out || m.bank.income)}</span></div>
                <div className="rc-match-pair">
                  <div className="rc-match-side"><span className="rc-match-tag bank">银行</span><span>{m.bank.date}</span><span className="rc-match-desc">{m.bank.desc}</span></div>
                  <div className="rc-match-arrow">↔</div>
                  <div className="rc-match-side"><span className="rc-match-tag ledger">企业</span><span>{m.ledger.date}</span><span className="rc-match-desc">{m.ledger.desc}</span></div>
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
              {matchResults.unmatchedBank.length > 0 && (<div className="rc-card"><div className="rc-card-title danger">银行未达 ({matchResults.unmatchedBank.length})</div>{matchResults.unmatchedBank.map(b => (<div key={b.id} className="rc-unmatched-row"><span className="rc-um-date">{b.date}</span><span className="rc-um-desc">{b.desc}</span><span className={`rc-um-amt ${b.out ? 'out' : 'in'}`}>{b.out ? `-¥${fmt(b.out)}` : `+¥${fmt(b.income)}`}</span></div>))}</div>)}
              {matchResults.unmatchedLedger.length > 0 && (<div className="rc-card"><div className="rc-card-title danger">企业未达 ({matchResults.unmatchedLedger.length})</div>{matchResults.unmatchedLedger.map(l => (<div key={l.id} className="rc-unmatched-row"><span className="rc-um-date">{l.date}</span><span className="rc-um-desc">{l.desc}</span><span className={`rc-um-amt ${l.debit ? 'out' : 'in'}`}>{l.debit ? `-¥${fmt(l.debit)}` : `+¥${fmt(l.credit)}`}</span></div>))}</div>)}
            </>
          )}
          <div className="rc-bottom">
            <button className="rc-btn-secondary" onClick={handleReset}>重新对账</button>
            <button className="rc-btn-primary" onClick={() => setStep('report')}>生成调节表</button>
          </div>
        </div>
      )}

      {/* REPORT */}
      {step === 'report' && matchResults && (
        <div className="rc-section">
          <div className="rc-report-header">
            <h3>银行存款余额调节表</h3>
            <p>{COMPANY_INFO.name}</p>
            <p className="rc-report-period">{COMPANY_INFO.periodStart} 至 {COMPANY_INFO.periodEnd}</p>
          </div>
          <div className="rc-report-grid">
            <div className="rc-report-col">
              <div className="rc-report-col-title">银行对账单</div>
              <div className="rc-report-row"><span>期末余额</span><span className="rc-report-val">¥{fmt(COMPANY_INFO.closingBalance)}</span></div>
              {matchResults.unmatchedLedger.filter(l => l.credit).map((l, i) => (<div key={i} className="rc-report-row add"><span>加：{l.desc}</span><span className="rc-report-val">+¥{fmt(l.credit)}</span></div>))}
              {matchResults.unmatchedLedger.filter(l => l.debit).map((l, i) => (<div key={i} className="rc-report-row sub"><span>减：{l.desc}</span><span className="rc-report-val">-¥{fmt(l.debit)}</span></div>))}
              {(() => { const adj = COMPANY_INFO.closingBalance + matchResults.unmatchedLedger.filter(l => l.credit).reduce((s, l) => s + l.credit, 0) - matchResults.unmatchedLedger.filter(l => l.debit).reduce((s, l) => s + l.debit, 0); return <div className="rc-report-row total"><span>调节后余额</span><span className="rc-report-val">¥{fmt(adj)}</span></div>; })()}
            </div>
            <div className="rc-report-col">
              <div className="rc-report-col-title">企业账面</div>
              {(() => { const lb = COMPANY_INFO.openingBalance - LEDGER_TOTAL_DEBIT + LEDGER_TOTAL_CREDIT; return (<><div className="rc-report-row"><span>期末余额</span><span className="rc-report-val">¥{fmt(lb)}</span></div>
                {matchResults.unmatchedBank.filter(b => b.income).map((b, i) => (<div key={i} className="rc-report-row add"><span>加：{b.desc}</span><span className="rc-report-val">+¥{fmt(b.income)}</span></div>))}
                {matchResults.unmatchedBank.filter(b => b.out).map((b, i) => (<div key={i} className="rc-report-row sub"><span>减：{b.desc}</span><span className="rc-report-val">-¥{fmt(b.out)}</span></div>))}
                {(() => { const adj = lb + matchResults.unmatchedBank.filter(b => b.income).reduce((s, b) => s + b.income, 0) - matchResults.unmatchedBank.filter(b => b.out).reduce((s, b) => s + b.out, 0); return <div className="rc-report-row total"><span>调节后余额</span><span className="rc-report-val">¥{fmt(adj)}</span></div>; })()}
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
              if (matchResults) {
                const record = {
                  id: Date.now(),
                  company: COMPANY_INFO.name,
                  period: COMPANY_INFO.period,
                  matchRate: matchResults.matchRate,
                  matchedCount: matchResults.matchedCount,
                  unmatchedCount: matchResults.unmatchedBank.length + matchResults.unmatchedLedger.length,
                  totalCount: BANK_DATA.length + LEDGER_DATA.length,
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
      {step === 'list' && flowMode === 'scan' && (
        <div className="rc-list rc-list-img">
          <div className="rc-list-topbar">
            <button className="rc-list-back" onClick={() => { setStep('toolbox'); setFiles([]); setPreviewUrls([]); setCropBoxes([]); setDocs([]); setProcessedUrls([]); }}>
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

          <div className="rc-list-img-content">
            {docs.map((doc, i) => {
              const imgSrc = doc.processedUrl || doc.previewUrl;
              return (
                <div key={doc.id} className="rc-list-img-page">
                  {i > 0 && <div className="rc-list-img-divider" />}
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
            <button className="rc-list-action rc-list-action-recon" onClick={() => { setFlowMode('recon'); setStep('docs'); }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
              <span>财务对账</span>
            </button>
          </div>
        </div>
      )}

      {step === 'list' && flowMode === 'recon' && matchResults && (() => {
        const bankAdj = COMPANY_INFO.closingBalance
          + matchResults.unmatchedLedger.filter(l => l.credit).reduce((s, l) => s + l.credit, 0)
          - matchResults.unmatchedLedger.filter(l => l.debit).reduce((s, l) => s + l.debit, 0);
        const ledgerBalance = COMPANY_INFO.openingBalance - LEDGER_TOTAL_DEBIT + LEDGER_TOTAL_CREDIT;
        const ledgerAdj = ledgerBalance
          + matchResults.unmatchedBank.filter(b => b.income).reduce((s, b) => s + b.income, 0)
          - matchResults.unmatchedBank.filter(b => b.out).reduce((s, b) => s + b.out, 0);
        const balanced = Math.abs(bankAdj - ledgerAdj) < 0.01;
        const now = new Date();
        const genTime = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

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
                  <tr><td colSpan={3} className="rc-lt-meta">对账期间: {COMPANY_INFO.periodStart} ~ {COMPANY_INFO.periodEnd}</td></tr>
                  <tr><td colSpan={3} className="rc-lt-meta">生成时间: {genTime}</td></tr>
                  <tr><td colSpan={3} className="rc-lt-blank"></td></tr>

                  <tr><td colSpan={3} className="rc-lt-section">一、对账摘要</td></tr>
                  <tr className="rc-lt-header"><td className="rc-lt-bold">项目</td><td className="rc-lt-right">笔数</td><td className="rc-lt-right">占比</td></tr>
                  <tr><td>精确匹配</td><td className="rc-lt-right">{matchResults.exact.length}</td><td className="rc-lt-right">{((matchResults.exact.length / (BANK_DATA.length + LEDGER_DATA.length)) * 100).toFixed(1)}%</td></tr>
                  <tr><td>模糊匹配</td><td className="rc-lt-right">{matchResults.fuzzy.length}</td><td className="rc-lt-right">{((matchResults.fuzzy.length / (BANK_DATA.length + LEDGER_DATA.length)) * 100).toFixed(1)}%</td></tr>
                  <tr><td>语义匹配</td><td className="rc-lt-right">{matchResults.semantic.length}</td><td className="rc-lt-right"></td></tr>
                  <tr><td>未匹配(银行)</td><td className="rc-lt-right">{matchResults.unmatchedBank.length}</td><td className="rc-lt-right"></td></tr>
                  <tr><td>未匹配(企业)</td><td className="rc-lt-right">{matchResults.unmatchedLedger.length}</td><td className="rc-lt-right"></td></tr>
                  <tr className="rc-lt-bold-row"><td>银行总笔数</td><td className="rc-lt-right">{BANK_DATA.length}</td><td></td></tr>
                  <tr className="rc-lt-bold-row"><td>企业总笔数</td><td className="rc-lt-right">{LEDGER_DATA.length}</td><td></td></tr>

                  <tr><td colSpan={3} className="rc-lt-section">二、银行调节</td></tr>
                  <tr className="rc-lt-bold-row"><td>银行余额</td><td></td><td className="rc-lt-right">{fmt(COMPANY_INFO.closingBalance)}</td></tr>
                  {matchResults.unmatchedLedger.filter(l => l.credit).map((l, i) => (
                    <tr key={`ba-${i}`}><td className="rc-lt-indent">加: {l.desc}</td><td></td><td className="rc-lt-right"></td></tr>
                  ))}
                  {matchResults.unmatchedLedger.filter(l => l.debit).map((l, i) => (
                    <tr key={`bs-${i}`}><td className="rc-lt-indent">减: {l.desc}-{fmt(l.debit)}</td><td></td><td className="rc-lt-right"></td></tr>
                  ))}
                  <tr className="rc-lt-total-row"><td className="rc-lt-bold">调节后余额</td><td></td><td className="rc-lt-right rc-lt-bold">{fmt(bankAdj)}</td></tr>

                  <tr><td colSpan={3} className="rc-lt-section">三、企业调节</td></tr>
                  <tr className="rc-lt-bold-row"><td>企业余额</td><td></td><td className="rc-lt-right">{fmt(ledgerBalance)}</td></tr>
                  {matchResults.unmatchedBank.filter(b => b.income).map((b, i) => (
                    <tr key={`la-${i}`}><td className="rc-lt-indent">加: {b.desc}{fmt(b.income)}</td><td></td><td className="rc-lt-right">{fmt(b.income)}</td></tr>
                  ))}
                  {matchResults.unmatchedBank.filter(b => b.out).map((b, i) => (
                    <tr key={`ls-${i}`}><td className="rc-lt-indent">减: 银行{b.date}{b.desc}</td><td></td><td className="rc-lt-right">-{fmt(b.out)}</td></tr>
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
