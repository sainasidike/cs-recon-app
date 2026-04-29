import { useRef, useState, useCallback, useEffect } from 'react';
import ColumnMapper from '../components/ColumnMapper';
import { useToast } from '../components/Toast';
import { SCENARIOS, getScenario } from '../utils/scenarios';
import { getDemoList } from '../utils/demoData';

const MAX_FILES_PER_ROLE = 10;

const FEATURES = [
  { label: 'AI 驱动', icon: '🤖' },
  { label: '多轮匹配', icon: '🔗' },
  { label: '自动调节表', icon: '📊' },
  { label: '录入纠错', icon: '🔍' },
];

const DEMOS = getDemoList();
const DEMO_ICONS = { bank_recon: '🏦', expense_recon: '💳', invoice_verify: '🧾' };

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function HomePage({ parsedFiles, isProcessing, error, scenarioId, detectedScenarioId, periodStart, periodEnd, onAddFiles, onRemoveFile, onAssignRole, onSelectScenario, onSetPeriod, onSelectDemo, onConfirmData, onLoadHistory, onUpdateMapping }) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const uploadZoneRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [showScenarioPicker, setShowScenarioPicker] = useState(false);
  const [demoAnim, setDemoAnim] = useState(null);
  const [mappingFileIdx, setMappingFileIdx] = useState(null);

  const handleFiles = useCallback((files) => {
    const valid = Array.from(files).filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      return ['xlsx', 'xls', 'csv', 'pdf', 'jpg', 'jpeg', 'png'].includes(ext);
    });
    if (valid.length > 0) onAddFiles(valid);
  }, [onAddFiles]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDemoClick = useCallback((demoId, e) => {
    const card = e.currentTarget;
    const cardRect = card.getBoundingClientRect();
    const zoneRect = uploadZoneRef.current?.getBoundingClientRect();
    if (!zoneRect) { onSelectDemo(demoId); return; }

    const demo = DEMOS.find(d => d.id === demoId);
    setDemoAnim({
      demoId,
      files: demo?.fileNames || [],
      startX: cardRect.left + cardRect.width / 2,
      startY: cardRect.top + cardRect.height / 2,
      endX: zoneRect.left + zoneRect.width / 2,
      endY: zoneRect.top + zoneRect.height / 2,
    });
  }, [onSelectDemo]);

  useEffect(() => {
    if (!demoAnim) return;
    const timer = setTimeout(() => {
      setDemoAnim(null);
      onSelectDemo(demoAnim.demoId);
    }, 800);
    return () => clearTimeout(timer);
  }, [demoAnim, onSelectDemo]);

  const scenario = scenarioId ? getScenario(scenarioId) : null;
  const activeScenarioId = scenarioId || detectedScenarioId;
  const activeScenario = activeScenarioId ? getScenario(activeScenarioId) : null;

  const roleCount = (role) => parsedFiles.filter(f => f.assignedRole === role).length;
  const handleAssignRole = (index, role) => {
    if (role !== 'auto' && roleCount(role) >= MAX_FILES_PER_ROLE) {
      const roleLabel = activeScenario?.roles?.find(r => r.value === role)?.label || role;
      toast(`「${roleLabel}」已达上限 ${MAX_FILES_PER_ROLE} 个文件`);
      return;
    }
    onAssignRole(index, role);
  };

  const hasSideA = parsedFiles.some(f => f.assignedRole === 'sideA');
  const hasSideB = parsedFiles.some(f => f.assignedRole === 'sideB');
  const hasSideC = !activeScenario?.sideC || parsedFiles.some(f => f.assignedRole === 'sideC');
  const isImageOrPdf = (f) => {
    const ext = f.file.name.split('.').pop().toLowerCase();
    return ['pdf', 'jpg', 'jpeg', 'png', 'bmp', 'tiff'].includes(ext);
  };
  const assignedFiles = parsedFiles.filter(f => f.assignedRole !== 'auto');
  const hasEntries = assignedFiles.length === 0 || assignedFiles.every(f => f.parsed.entries.length > 0 || f.parsed.needsOCR || isImageOrPdf(f));
  const hasUnassigned = parsedFiles.some(f => f.assignedRole === 'auto');
  const canProceed = parsedFiles.length >= 2 && activeScenarioId && hasSideA && hasSideB && hasSideC && hasEntries && !hasUnassigned;

  const disabledReason = (() => {
    if (parsedFiles.length < 2) return '至少需要上传 2 个文件';
    if (!activeScenarioId) return '请选择对账场景';
    if (hasUnassigned) return '有文件未分配角色，请手动选择分类';
    if (!hasSideA) return `缺少「${activeScenario?.sideA?.shortLabel || 'A方'}」文件`;
    if (!hasSideB) return `缺少「${activeScenario?.sideB?.shortLabel || 'B方'}」文件`;
    if (!hasSideC) return `缺少「${activeScenario?.sideC?.shortLabel || 'C方'}」文件`;
    if (!hasEntries) return '部分文件未解析出有效数据';
    return '';
  })();

  const hasFiles = parsedFiles.length > 0;

  return (
    <div className="pc-page">
      <div className="home-header">
        <h1 className="home-title">开始对账</h1>
        <p className="home-desc">上传文件自动识别场景，或选择体验案例</p>
      </div>

      <div className="cs-home-page">
        {!hasFiles && (
          <div className="cs-home-features">
            {FEATURES.map(f => (
              <span key={f.label} className="cs-home-feature-tag">
                <span className="cs-home-feature-icon">{f.icon}</span>
                {f.label}
              </span>
            ))}
          </div>
        )}

        <div
          ref={uploadZoneRef}
          className={`cs-upload-zone ${hasFiles ? 'cs-upload-zone-compact' : ''} ${dragOver || demoAnim ? 'cs-upload-zone-active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {hasFiles ? (
            <div className="cs-upload-zone-compact-inner" onClick={() => fileInputRef.current?.click()}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>继续添加文件</span>
            </div>
          ) : (
            <>
              <div className="cs-upload-zone-doc-icon">
                <svg width="64" height="64" viewBox="0 0 80 80" fill="none">
                  <rect x="16" y="8" width="48" height="64" rx="4" fill="#fff" stroke="#d0d5dd" strokeWidth="1.5"/>
                  <path d="M26 24h28M26 32h28M26 40h20" stroke="#d0d5dd" strokeWidth="1.5" strokeLinecap="round"/>
                  <rect x="44" y="4" width="16" height="16" rx="2" fill="none" stroke="#d0d5dd" strokeWidth="1"/>
                  <path d="M48 56l4-4 4 4" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <button className="cs-upload-btn-primary" onClick={() => fileInputRef.current?.click()}>
                选择本地图片
              </button>
              <button className="cs-upload-btn-outline" onClick={() => fileInputRef.current?.click()}>
                选择本地文档
              </button>
              <button className="cs-upload-btn-outline" onClick={() => fileInputRef.current?.click()}>
                选择扫描全能王账号内文档
              </button>
              <div className="cs-upload-zone-drag-hint">或拖拽文档至此</div>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
          />
        </div>

        {isProcessing && (
          <div className="cs-loading"><div className="cs-spinner" /><span>正在解析文件...</span></div>
        )}

        {error && <div className="cs-error">{error}</div>}

        {hasFiles && (
          <>
            {activeScenario && (
              <div className="cs-home-scenario-bar">
                <div className="cs-home-scenario-info">
                  <span className="cs-home-scenario-icon">{activeScenario.icon}</span>
                  <div>
                    <div className="cs-home-scenario-name">{activeScenario.name}</div>
                    <div className="cs-home-scenario-desc">{activeScenario.desc}</div>
                  </div>
                </div>
                <button className="cs-home-btn-switch" onClick={() => setShowScenarioPicker(true)}>切换</button>
              </div>
            )}
            {!activeScenario && (
              <div className="cs-home-scenario-bar" style={{ borderColor: 'var(--warning)' }}>
                <div className="cs-home-scenario-info">
                  <span className="cs-home-scenario-icon">⚠️</span>
                  <div>
                    <div className="cs-home-scenario-name">未识别到对账场景</div>
                    <div className="cs-home-scenario-desc">请手动选择</div>
                  </div>
                </div>
                <button className="cs-home-btn-confirm" onClick={() => setShowScenarioPicker(true)}>选择</button>
              </div>
            )}

            <div className="cs-file-list">
              {parsedFiles.map((pf, i) => {
                const ext = pf.file.name.split('.').pop().toLowerCase();
                const isExcel = ['xlsx', 'xls', 'csv'].includes(ext);
                const isPdf = ext === 'pdf';
                return (
                  <div key={i} className="cs-file-item" onClick={() => {
                    if (window.parent !== window) {
                      window.parent.postMessage({ type: 'recon-open-file', file: { name: pf.file.name, headers: pf.parsed.headers || [], entries: (pf.parsed.entries || []).slice(0, 100), role: pf.assignedRole } }, '*');
                    }
                  }} style={window.parent !== window ? { cursor: 'pointer' } : undefined}>
                    <div className={`cs-file-thumb ${isExcel ? 'excel' : isPdf ? 'pdf' : 'img'}`}>
                      {isExcel && <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" fill="#217346"/><path d="M7 7h4v3H7zm0 4h4v3H7zm0 4h4v2H7zm5-8h5v3h-5zm0 4h5v3h-5zm0 4h5v2h-5z" fill="rgba(255,255,255,0.8)"/></svg>}
                      {isPdf && <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="2" width="18" height="20" rx="2" fill="#E53935"/><path d="M8 8h8M8 11h8M8 14h5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/></svg>}
                      {!isExcel && !isPdf && <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" fill="#7C4DFF"/><circle cx="9" cy="9" r="2" fill="rgba(255,255,255,0.7)"/></svg>}
                    </div>
                    <div className="cs-file-info">
                      <div className="cs-file-name">{pf.file.name}</div>
                      <div className="cs-file-meta">
                        {formatSize(pf.file.size)}
                        {pf.parsed.entries.length > 0 && <> · {pf.parsed.entries.length} 条记录</>}
                        {pf.parsed.needsOCR && <> · 需要 OCR</>}
                      </div>
                      <div className="cs-file-role-row">
                        {activeScenario && (
                          <select
                            className="cs-role-select"
                            value={pf.assignedRole}
                            onChange={e => handleAssignRole(i, e.target.value)}
                            style={pf.assignedRole === 'auto' ? { borderColor: 'var(--danger)', color: 'var(--danger)' } : undefined}
                          >
                            {activeScenario.roles.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.value === 'auto' ? '⚠ 请选择分类' : opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                        {pf.parsed.headers && pf.parsed.headers.length > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setMappingFileIdx(i); }}
                            style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: 'var(--blue-light)', color: 'var(--blue)', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            列映射
                          </button>
                        )}
                        {pf.docType && pf.docType !== 'unknown' && (() => {
                          const typeLabels = { bank_statement: '银行流水', company_ledger: '企业账簿', invoice: '发票', contract: '合同', receipt: '入库单', expense: '报销单', payment: '付款', payroll: '工资表', inventory: '盘点', tax: '税务', tax_detail: '税务明细', cashbook: '现金日记', asset_ledger: '资产台账', ap_ar_statement: '往来对账' };
                          const label = typeLabels[pf.docType];
                          if (label) {
                            return <span className="cs-ai-tag green" style={{ whiteSpace: 'nowrap' }}>AI: {label}</span>;
                          }
                          return <span className="cs-ai-tag" style={{ whiteSpace: 'nowrap', background: 'var(--warning-light)', color: 'var(--warning)' }}>AI: 未识别</span>;
                        })()}
                      </div>
                    </div>
                    <button className="cs-file-remove" onClick={() => onRemoveFile(i)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="card mt-md">
              <div className="card-header">对账期间</div>
              <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input type="date" className="input" value={periodStart || ''} onChange={e => onSetPeriod(e.target.value, periodEnd)} style={{ flex: 1 }} />
                <span style={{ color: 'var(--text-tertiary)' }}>至</span>
                <input type="date" className="input" value={periodEnd || ''} onChange={e => onSetPeriod(periodStart, e.target.value)} style={{ flex: 1 }} />
              </div>
              <div style={{ padding: '0 16px 12px', fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                不填则对比全部数据
              </div>
            </div>
          </>
        )}

        {showScenarioPicker && (
          <div className="cs-home-picker-overlay" onClick={() => setShowScenarioPicker(false)}>
            <div className="cs-home-picker" onClick={e => e.stopPropagation()}>
              <div className="cs-home-picker-title">选择对账场景</div>
              <div className="cs-home-picker-list">
                {SCENARIOS.map(s => (
                  <div
                    key={s.id}
                    className={`cs-home-picker-item ${s.id === activeScenarioId ? 'active' : ''}`}
                    onClick={() => { onSelectScenario(s.id); setShowScenarioPicker(false); }}
                  >
                    <span className="cs-home-picker-icon">{s.icon}</span>
                    <div className="cs-home-picker-info">
                      <div className="cs-home-picker-name">{s.name}</div>
                      <div className="cs-home-picker-desc">{s.desc}</div>
                    </div>
                    {s.id === activeScenarioId && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!hasFiles && (
          <div className="cs-home-section">
            <div className="cs-home-section-title">Demo 体验</div>
            <div className="cs-home-demo-grid">
              {DEMOS.map(d => (
                <div key={d.id} className="cs-home-demo-card" onClick={(e) => handleDemoClick(d.id, e)}>
                  <span className="cs-home-demo-icon">{DEMO_ICONS[d.id] || '📊'}</span>
                  <div className="cs-home-demo-name">{d.name}</div>
                  <div className="cs-home-demo-desc">{d.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {hasFiles && (
        <div className="cs-bottom-bar">
          <div className="cs-selected-count">
            已选择 {parsedFiles.length} 个文件
            {!canProceed && disabledReason && (
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--danger)', marginTop: 2 }}>{disabledReason}</div>
            )}
          </div>
          <button className="cs-confirm-btn" disabled={!canProceed || isProcessing} onClick={onConfirmData}>下一步</button>
        </div>
      )}

      {mappingFileIdx != null && parsedFiles[mappingFileIdx] && (
        <ColumnMapper
          headers={parsedFiles[mappingFileIdx].parsed.headers}
          currentMapping={parsedFiles[mappingFileIdx].parsed.columnMapping}
          onApply={(newMapping) => {
            if (onUpdateMapping) onUpdateMapping(mappingFileIdx, newMapping);
            setMappingFileIdx(null);
          }}
          onClose={() => setMappingFileIdx(null)}
        />
      )}

      {demoAnim && (
        <div className="cs-demo-anim-overlay">
          {(demoAnim.files.length > 0 ? demoAnim.files : ['文件1', '文件2']).map((fname, i) => (
            <div
              key={i}
              className="cs-demo-anim-file"
              style={{
                '--start-x': `${demoAnim.startX}px`,
                '--start-y': `${demoAnim.startY}px`,
                '--end-x': `${demoAnim.endX}px`,
                '--end-y': `${demoAnim.endY}px`,
                animationDelay: `${i * 120}ms`,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" fill="#217346"/><path d="M7 7h4v3H7zm0 4h4v3H7zm5-4h5v3h-5zm0 4h5v3h-5z" fill="rgba(255,255,255,0.8)"/></svg>
              <span>{fname}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
