import { useState, useCallback, useRef, useEffect } from 'react';
import { BANK_DATA, LEDGER_DATA, COMPANY_INFO, BANK_TOTAL_OUT, BANK_TOTAL_IN, LEDGER_TOTAL_DEBIT, LEDGER_TOTAL_CREDIT } from './demoData';
import { runMatching } from './matchEngine';
import CropEditor from './CropEditor';

function fmt(v) {
  return (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 });
}

const PIPELINE = [
  { key: 'upload', label: '上传', icon: '📤' },
  { key: 'crop', label: '切边', icon: '✂️' },
  { key: 'enhance', label: '增强', icon: '✨' },
  { key: 'analyze', label: '分析', icon: '🤖' },
  { key: 'results', label: '结果', icon: '📊' },
  { key: 'report', label: '报告', icon: '📋' },
];

const FILTERS = [
  { key: 'original', label: '原图', filter: 'none' },
  { key: 'auto', label: '自动', filter: 'contrast(1.2) brightness(1.05)' },
  { key: 'sharp', label: '锐化', filter: 'contrast(1.4) brightness(1.1) saturate(0)' },
  { key: 'bw', label: '黑白', filter: 'grayscale(1) contrast(1.3)' },
  { key: 'bright', label: '明亮', filter: 'brightness(1.3) contrast(1.1)' },
  { key: 'stamp', label: '印章', filter: 'contrast(2) brightness(1.5) saturate(0)' },
];

export default function ReconApp() {
  const [step, setStep] = useState('toolbox');
  const [files, setFiles] = useState([]);
  const [currentFileIdx, setCurrentFileIdx] = useState(0);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [cropBoxes, setCropBoxes] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('auto');
  const [processedUrls, setProcessedUrls] = useState([]);
  const [parseSteps, setParseSteps] = useState([]);
  const [parseResult, setParseResult] = useState(null);
  const [matchResults, setMatchResults] = useState(null);
  const [confirmed, setConfirmed] = useState({});
  const [rejected, setRejected] = useState({});
  const [activeResultTab, setActiveResultTab] = useState('exact');
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rc-history') || '[]'); } catch { return []; }
  });
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

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

    setStep('crop');
  }, []);

  const handleCropConfirm = useCallback(() => {
    const url = previewUrls[currentFileIdx];
    if (url && cropBoxes[currentFileIdx]) {
      const img = new Image();
      img.onload = () => {
        const box = cropBoxes[currentFileIdx];
        const sx = Math.round(box.x * img.naturalWidth);
        const sy = Math.round(box.y * img.naturalHeight);
        const sw = Math.round(box.w * img.naturalWidth);
        const sh = Math.round(box.h * img.naturalHeight);
        const cvs = document.createElement('canvas');
        cvs.width = sw; cvs.height = sh;
        cvs.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        setProcessedUrls(prev => { const n = [...prev]; n[currentFileIdx] = cvs.toDataURL('image/jpeg', 0.92); return n; });
        setStep('enhance');
      };
      img.src = url;
    } else {
      setProcessedUrls(prev => { const n = [...prev]; n[currentFileIdx] = url; return n; });
      setStep('enhance');
    }
  }, [previewUrls, cropBoxes, currentFileIdx]);

  const handleEnhanceConfirm = useCallback(() => {
    const url = processedUrls[currentFileIdx];
    if (url && selectedFilter !== 'original') {
      const img = new Image();
      img.onload = () => {
        const cvs = document.createElement('canvas');
        cvs.width = img.naturalWidth; cvs.height = img.naturalHeight;
        const ctx = cvs.getContext('2d');
        ctx.filter = FILTERS.find(f => f.key === selectedFilter)?.filter || 'none';
        ctx.drawImage(img, 0, 0);
        setProcessedUrls(prev => { const n = [...prev]; n[currentFileIdx] = cvs.toDataURL('image/jpeg', 0.92); return n; });
        startAnalyze();
      };
      img.src = url;
    } else {
      startAnalyze();
    }
  }, [processedUrls, selectedFilter, currentFileIdx]);

  const startAnalyze = useCallback(() => {
    setStep('analyze');
    setParseSteps([]);
    setParseResult(null);

    const steps = [
      { text: '正在进行 OCR 文字识别...', delay: 500 },
      { text: '识别到表格结构，提取数据中...', delay: 1200 },
      { text: '检测到文档类型：银行对账单', delay: 1800 },
      { text: '解析 20 笔交易记录', delay: 2400 },
      { text: '加载企业账簿，解析 20 笔记账凭证', delay: 3000 },
      { text: '执行精确匹配（金额+日期完全一致）...', delay: 3800 },
      { text: '执行模糊匹配（日期容差±3天）...', delay: 4600 },
      { text: '执行语义匹配（描述相似度分析）...', delay: 5200 },
      { text: '检测未达账项，生成匹配报告...', delay: 5800 },
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
    }, 6500);
  }, []);

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
    setStep('home'); setFiles([]); setPreviewUrls([]); setCropBoxes([]);
    setProcessedUrls([]); setParseSteps([]); setParseResult(null);
    setMatchResults(null); setConfirmed({}); setRejected({});
    setSelectedFilter('auto'); setCurrentFileIdx(0);
  }, [matchResults, history]);

  const handleReset = useCallback(() => {
    setStep('home'); setFiles([]); setPreviewUrls([]); setCropBoxes([]);
    setProcessedUrls([]); setParseSteps([]); setParseResult(null);
    setMatchResults(null); setConfirmed({}); setRejected({});
    setSelectedFilter('auto'); setCurrentFileIdx(0);
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
            <div className="rc-tb-card rc-tb-card-highlight" onClick={() => setStep('home')}>
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
            <div className="rc-tb-tabbar-camera"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg></div>
            <div className="rc-tb-tabbar-item active"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg><span>工具箱</span></div>
            <div className="rc-tb-tabbar-item"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>我的</span></div>
          </div>
        </div>
      )}

      {/* Pipeline Progress */}
      {step !== 'home' && step !== 'toolbox' && (
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
                </div>
              ))}
            </div>
          )}

          <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.xlsx,.xls,.csv" style={{ display: 'none' }}
            onChange={e => { if (e.target.files.length) handleFiles(e.target.files); e.target.value = ''; }} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
            onChange={e => { if (e.target.files.length) handleFiles(e.target.files); e.target.value = ''; }} />
        </div>
      )}

      {/* CROP */}
      {step === 'crop' && (
        <div className="rc-section">
          <div className="rc-stage-title">
            <span className="rc-stage-icon">✂️</span>
            <div>
              <h3>智能切边</h3>
              <p>拖拽调整裁剪范围，去除多余背景</p>
            </div>
          </div>
          <div className="rc-crop-area">
            {previewUrls[currentFileIdx] ? (
              <CropEditor
                src={previewUrls[currentFileIdx]}
                box={cropBoxes[currentFileIdx] || { x: 0, y: 0, w: 1, h: 1 }}
                onChange={(box) => setCropBoxes(prev => { const n = [...prev]; n[currentFileIdx] = box; return n; })}
              />
            ) : (
              <div className="rc-doc-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--rc-text3)" strokeWidth="1.2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>{files[currentFileIdx]?.name || '文档文件'}</span>
                <span className="rc-doc-hint">非图片文件，跳过切边</span>
              </div>
            )}
          </div>
          <div className="rc-bottom">
            <button className="rc-btn-secondary" onClick={() => { if (previewUrls[currentFileIdx]) { handleCropConfirm(); } else { setProcessedUrls([...previewUrls]); setStep('enhance'); } }}>
              {previewUrls[currentFileIdx] ? '跳过裁剪' : '跳过'}
            </button>
            <button className="rc-btn-primary" onClick={() => { if (previewUrls[currentFileIdx]) { handleCropConfirm(); } else { setProcessedUrls([...previewUrls]); startAnalyze(); } }}>
              {previewUrls[currentFileIdx] ? '确认裁剪' : '下一步'}
            </button>
          </div>
        </div>
      )}

      {/* ENHANCE */}
      {step === 'enhance' && (
        <div className="rc-section">
          <div className="rc-stage-title">
            <span className="rc-stage-icon">✨</span>
            <div>
              <h3>图像增强</h3>
              <p>选择滤镜效果，提升文档清晰度</p>
            </div>
          </div>
          <div className="rc-enhance-preview">
            {processedUrls[currentFileIdx] ? (
              <img
                src={processedUrls[currentFileIdx]}
                alt="预览"
                style={{ filter: FILTERS.find(f => f.key === selectedFilter)?.filter || 'none' }}
              />
            ) : (
              <div className="rc-doc-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--rc-text3)" strokeWidth="1.2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>{files[currentFileIdx]?.name}</span>
              </div>
            )}
          </div>
          <div className="rc-filter-strip">
            {FILTERS.map(f => (
              <button key={f.key} className={`rc-filter-item ${selectedFilter === f.key ? 'active' : ''}`} onClick={() => setSelectedFilter(f.key)}>
                <div className="rc-filter-thumb" style={{ filter: f.filter }}>
                  {processedUrls[currentFileIdx] ? (
                    <img src={processedUrls[currentFileIdx]} alt="" />
                  ) : (
                    <div className="rc-filter-placeholder" />
                  )}
                </div>
                <span>{f.label}</span>
              </button>
            ))}
          </div>
          <div className="rc-bottom">
            <button className="rc-btn-secondary" onClick={() => setStep('crop')}>返回</button>
            <button className="rc-btn-primary" onClick={handleEnhanceConfirm}>确认增强</button>
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
            <button className="rc-btn-primary" onClick={handleFinish}>完成对账</button>
          </div>
        </div>
      )}
    </div>
  );
}
