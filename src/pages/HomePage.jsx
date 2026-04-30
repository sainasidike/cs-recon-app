import { useRef, useState, useCallback, useEffect } from 'react';
import ColumnMapper from '../components/ColumnMapper';
import { useToast } from '../components/Toast';
import { SCENARIOS, getScenario } from '../utils/scenarios';
import { getDemoList } from '../utils/demoData';

const MAX_FILES_PER_ROLE = 10;

const DEMOS = getDemoList().filter(d => d.id !== 'bank_jinli');
const DEMO_ICONS = { bank_recon: '🏦', expense_recon: '💳', invoice_verify: '🧾' };

const STATUS_MAP = {
  active: { label: '进行中', cls: 'ws-status-active' },
  completed: { label: '已完成', cls: 'ws-status-done' },
  archived: { label: '已归档', cls: 'ws-status-archived' },
};

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function HomePage({ parsedFiles, isProcessing, error, scenarioId, detectedScenarioId, periodStart, periodEnd, onAddFiles, onRemoveFile, onAssignRole, onSelectScenario, onSetPeriod, onSelectDemo, onConfirmData, onLoadHistory, onUpdateMapping, onBackToToolbox, projectsHook, onOpenProject, navPage }) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const uploadZoneRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [showScenarioPicker, setShowScenarioPicker] = useState(false);
  const [demoAnim, setDemoAnim] = useState(null);
  const [mappingFileIdx, setMappingFileIdx] = useState(null);
  const { recentProjects, archivedProjects, archiveProject, deleteProject } = projectsHook || {};
  const [docFilter, setDocFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const hasFiles = parsedFiles.length > 0 || isProcessing;
  const [previewFileIdx, setPreviewFileIdx] = useState(0);
  const splitRef = useRef(null);
  const [rightWidth, setRightWidth] = useState(420);
  const draggingRef = useRef(false);

  const handleDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;
    const startX = e.clientX;
    const startWidth = rightWidth;
    const divider = e.currentTarget;
    divider.classList.add('dragging');

    const onMouseMove = (ev) => {
      const delta = startX - ev.clientX;
      const newWidth = Math.max(320, Math.min(700, startWidth + delta));
      setRightWidth(newWidth);
    };
    const onMouseUp = () => {
      draggingRef.current = false;
      divider.classList.remove('dragging');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [rightWidth]);

  // File management view (when files are uploaded or processing)
  if (hasFiles) {
    const previewFile = parsedFiles[previewFileIdx] || parsedFiles[0];
    const previewExt = previewFile ? previewFile.file.name.split('.').pop().toLowerCase() : '';
    const previewIsImage = ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'].includes(previewExt);
    const previewIsPdf = previewExt === 'pdf';
    const previewIsExcel = ['xlsx', 'xls', 'csv'].includes(previewExt);

    return (
      <div className="pc-page home-split-layout">
        {/* Left document preview */}
        <div className="home-split-left">
          {previewFile && (
            <>
              <div className="home-preview-header">
                <span className="home-preview-filename">{previewFile.file.name}</span>
                {parsedFiles.length > 1 && (
                  <div className="home-preview-nav">
                    {parsedFiles.map((pf, i) => (
                      <button key={i} className={`home-preview-tab ${i === previewFileIdx ? 'active' : ''}`} onClick={() => setPreviewFileIdx(i)}>
                        {pf.file.name.length > 15 ? pf.file.name.slice(0, 12) + '...' : pf.file.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="home-preview-body">
                {previewIsPdf && (
                  <iframe src={URL.createObjectURL(previewFile.file)} className="home-preview-iframe" title={previewFile.file.name} />
                )}
                {previewIsImage && (
                  <img src={URL.createObjectURL(previewFile.file)} alt={previewFile.file.name} className="home-preview-img" />
                )}
                {previewIsExcel && previewFile.parsed.entries.length > 0 && (
                  <div className="home-preview-table-wrap">
                    <table className="home-preview-table">
                      <thead>
                        <tr>
                          {previewFile.parsed.headers ? previewFile.parsed.headers.map((h, i) => <th key={i}>{h}</th>) : <><th>日期</th><th>摘要/用途</th><th>金额</th><th>余额</th><th>对方户名</th></>}
                        </tr>
                      </thead>
                      <tbody>
                        {previewFile.parsed.entries.slice(0, 50).map((e, i) => (
                          <tr key={i}>
                            {previewFile.parsed.headers && e.raw ? (
                              previewFile.parsed.headers.map((h, hi) => <td key={hi}>{e.raw[hi] != null ? String(e.raw[hi]) : '-'}</td>)
                            ) : (
                              <>
                                <td>{e.date || '-'}</td>
                                <td>{e.description || e.counterparty || '-'}</td>
                                <td className={e.direction === 'credit' ? 'amount-credit' : 'amount-debit'}>{(e.amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</td>
                                <td>{e.balance != null ? e.balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '-'}</td>
                                <td>{e.counterparty || '-'}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewFile.parsed.entries.length > 50 && (
                      <div className="home-preview-table-more">显示前 50 条 / 共 {previewFile.parsed.entries.length} 条</div>
                    )}
                  </div>
                )}
                {previewIsExcel && previewFile.parsed.entries.length === 0 && (
                  <div className="home-preview-empty">文件解析中或暂无数据</div>
                )}
              </div>
            </>
          )}
          {!previewFile && (
            <div className="home-preview-empty">上传文件后将在此处预览文档内容</div>
          )}
        </div>

        {/* Drag divider */}
        <div className="home-split-divider" onMouseDown={handleDividerMouseDown} />

        {/* Right file manager */}
        <div className="home-split-right" style={{ width: rightWidth }}>
          <div className="home-header">
            {onBackToToolbox && (
              <div className="home-back-link" onClick={onBackToToolbox}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                返回工具箱
              </div>
            )}
            <h1 className="home-title">智能对账</h1>
            <p className="home-desc">上传文件自动识别场景，或选择体验案例</p>
          </div>

          <div className="cs-home-page">
            <div
              ref={uploadZoneRef}
              className={`cs-upload-zone cs-upload-zone-compact ${dragOver ? 'cs-upload-zone-active' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="cs-upload-zone-compact-inner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>继续添加文件</span>
              </div>
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
                <div key={i} className={`cs-file-item ${previewFileIdx === i ? 'cs-file-item-active' : ''}`} onClick={() => {
                  setPreviewFileIdx(i);
                  if (window.parent !== window) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      window.parent.postMessage({ type: 'recon-open-file', file: { name: pf.file.name, role: pf.assignedRole, mimeType: pf.file.type, dataUrl: ev.target.result } }, '*');
                    };
                    reader.readAsDataURL(pf.file);
                  }
                }} style={{ cursor: 'pointer' }}>
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
        </div>

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

          <div className="cs-bottom-bar">
            <div className="cs-selected-count">
              已选择 {parsedFiles.length} 个文件
              {!canProceed && disabledReason && (
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--danger)', marginTop: 2 }}>{disabledReason}</div>
              )}
            </div>
            <button className="cs-confirm-btn" disabled={!canProceed || isProcessing} onClick={onConfirmData}>下一步</button>
          </div>

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
        </div>
      </div>
    );
  }

  // === Workspace homepage (new layout) ===
  const allProjects = docFilter === 'all' ? [...(recentProjects || []), ...(archivedProjects || [])]
    : docFilter === 'archived' ? (archivedProjects || [])
    : (recentProjects || []).filter(p => p.status === docFilter);

  const filteredProjects = searchQuery
    ? allProjects.filter(p => p.name?.includes(searchQuery) || (p.files || []).some(f => (f.name || f).includes(searchQuery)))
    : allProjects;

  const hasProjects = (recentProjects?.length || 0) > 0 || (archivedProjects?.length || 0) > 0;

  const formatTime = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
    return d.toLocaleDateString('zh-CN');
  };

  // Compute stats
  const totalProjects = allProjects.length;
  const completedProjects = allProjects.filter(p => p.resultSummary?.completedAt);
  const avgMatchRate = completedProjects.length > 0
    ? Math.round(completedProjects.reduce((sum, p) => sum + (p.resultSummary?.matchRate || 0), 0) / completedProjects.length)
    : 0;
  const totalFiles = allProjects.reduce((sum, p) => sum + (p.files?.length || 0), 0);

  return (
    <div className="ws-page-v2">
      {/* A) Stats overview */}
      <section className="ws-stats-row">
        <div className="ws-stat-card">
          <div className="ws-stat-card-value">{totalProjects}</div>
          <div className="ws-stat-card-label">总对账数</div>
        </div>
        <div className="ws-stat-card">
          <div className="ws-stat-card-value" style={{ color: 'var(--accent)' }}>{completedProjects.length}</div>
          <div className="ws-stat-card-label">已完成</div>
        </div>
        <div className="ws-stat-card">
          <div className="ws-stat-card-value">{avgMatchRate}%</div>
          <div className="ws-stat-card-label">平均匹配率</div>
        </div>
        <div className="ws-stat-card">
          <div className="ws-stat-card-value">{totalFiles}</div>
          <div className="ws-stat-card-label">处理文档</div>
        </div>
      </section>

      {/* B) Quick start bar */}
      <section className="ws-quick-bar">
        <div
          ref={uploadZoneRef}
          className={`ws-quick-upload ${dragOver || demoAnim ? 'ws-quick-upload-active' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>点击或拖拽上传文件开始对账</span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
          />
        </div>
        <div className="ws-quick-demos">
          {DEMOS.map(d => (
            <button key={d.id} className="ws-quick-demo-btn" onClick={(e) => handleDemoClick(d.id, e)}>
              <span>{DEMO_ICONS[d.id] || '📊'}</span>
              <span>{d.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* C) Records list */}
      <section className="ws-records-section">
        <div className="ws-records-header">
          <h2 className="ws-records-title">最近对账</h2>
          <div className="ws-records-toolbar">
            <div className="ws-filter-tabs">
              {[
                { key: 'all', label: '全部' },
                { key: 'active', label: '进行中' },
                { key: 'completed', label: '已完成' },
                { key: 'archived', label: '已归档' },
              ].map(tab => (
                <button
                  key={tab.key}
                  className={`ws-filter-tab ${docFilter === tab.key ? 'active' : ''}`}
                  onClick={() => setDocFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="ws-search-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input
                type="text"
                placeholder="搜索项目或文件..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {filteredProjects.length > 0 ? (
          <div className="ws-record-grid-v2">
            {filteredProjects.map(project => {
              const status = STATUS_MAP[project.status] || STATUS_MAP.active;
              const scenarioInfo = project.scenarioId ? getScenario(project.scenarioId) : null;
              const fileCount = (project.files || []).length;
              const entryCount = (project.files || []).reduce((s, f) => s + (f.entryCount || 0), 0);
              const matchRate = project.resultSummary?.matchRate;
              const isBalanced = project.resultSummary?.isBalanced;

              return (
                <div key={project.id} className="ws-record-card-v2" onClick={() => onOpenProject && onOpenProject(project)}>
                  <div className="ws-record-card-top">
                    <span className="ws-record-card-icon">{scenarioInfo?.icon || '📋'}</span>
                    <span className="ws-record-card-name">{project.name}</span>
                    <span className={`ws-project-status ${status.cls}`}>{status.label}</span>
                  </div>
                  <div className="ws-record-card-meta">
                    <span>{project.createdAt ? new Date(project.createdAt).toLocaleDateString('zh-CN') : '-'}</span>
                    <span>{fileCount} 个文件</span>
                    {entryCount > 0 && <span>{entryCount} 条记录</span>}
                  </div>
                  <div className="ws-record-card-result">
                    {matchRate != null ? (
                      <span className="ws-record-card-rate">{matchRate.toFixed(1)}% 匹配率</span>
                    ) : isBalanced != null ? (
                      <span className={`ws-record-card-balance ${isBalanced ? 'balanced' : 'unbalanced'}`}>
                        {isBalanced ? '账平' : '有差异'}
                      </span>
                    ) : (
                      <span className="ws-record-card-progress">进行中</span>
                    )}
                  </div>
                  <div className="ws-record-card-bottom">
                    <div className="ws-record-card-actions" onClick={e => e.stopPropagation()}>
                      {project.status === 'completed' && (
                        <button className="ws-record-action-btn" title="导出">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          导出
                        </button>
                      )}
                      <button className="ws-record-action-btn" title="预览">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        预览
                      </button>
                    </div>
                    <span className="ws-record-card-time">{formatTime(project.updatedAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ws-records-empty">
            <div className="ws-records-empty-icon">📋</div>
            <div className="ws-records-empty-text">暂无对账记录</div>
            <div className="ws-records-empty-hint">上传文件或选择 Demo 开始第一次对账</div>
          </div>
        )}
      </section>

      {/* D) Bottom tip card */}
      <section className="ws-tip-card">
        <div className="ws-tip-card-icon">💡</div>
        <div className="ws-tip-card-content">
          <div className="ws-tip-card-title">提示</div>
          <div className="ws-tip-card-desc">上传 2 个以上财务文件（Excel/CSV/PDF），AI 将自动识别对账场景并完成三轮智能匹配，生成调节表和分析报告。</div>
        </div>
      </section>

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
