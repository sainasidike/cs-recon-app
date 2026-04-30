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

export default function HomePage({ parsedFiles, isProcessing, error, scenarioId, detectedScenarioId, periodStart, periodEnd, onAddFiles, onRemoveFile, onAssignRole, onSelectScenario, onSetPeriod, onSelectDemo, onConfirmData, onLoadHistory, onUpdateMapping, onBackToToolbox, projectsHook, onOpenProject }) {
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

  // 上传后的文件管理界面（或正在解析中）
  if (hasFiles) {
    return (
      <div className="pc-page">
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
                <div key={i} className="cs-file-item" onClick={() => {
                  if (window.parent !== window) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      window.parent.postMessage({ type: 'recon-open-file', file: { name: pf.file.name, role: pf.assignedRole, mimeType: pf.file.type, dataUrl: ev.target.result } }, '*');
                    };
                    reader.readAsDataURL(pf.file);
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
    );
  }

  // 工作站首页
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

  return (
    <div className="ws-page">
      {onBackToToolbox && (
        <div className="cs-tool-back" onClick={onBackToToolbox}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          返回工具箱
        </div>
      )}

      {/* Hero + Upload */}
      <section className="ws-hero">
        <div className="ws-hero-left">
          <h1 className="ws-hero-title">AI 智能对账助手</h1>
          <p className="ws-hero-subtitle">上传财务文档，AI 自动识别场景并完成多方智能对账</p>
          <div className="ws-hero-features">
            <div className="ws-feature-item">
              <div className="ws-feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-pressed)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <div className="ws-feature-text">
                <span className="ws-feature-name">智能识别</span>
                <span className="ws-feature-desc">自动识别文档格式与对账场景</span>
              </div>
            </div>
            <div className="ws-feature-item">
              <div className="ws-feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-pressed)" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              </div>
              <div className="ws-feature-text">
                <span className="ws-feature-name">三轮匹配</span>
                <span className="ws-feature-desc">精确 → 模糊 → 语义逐层匹配</span>
              </div>
            </div>
            <div className="ws-feature-item">
              <div className="ws-feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-pressed)" strokeWidth="1.5"><path d="M9 17H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-4"/><polyline points="12 15 12 21"/><polyline points="8 21 16 21"/></svg>
              </div>
              <div className="ws-feature-text">
                <span className="ws-feature-name">一键报告</span>
                <span className="ws-feature-desc">生成调节表 + AI 分析报告</span>
              </div>
            </div>
          </div>
        </div>

        <div className="ws-hero-right">
          <div
            ref={uploadZoneRef}
            className={`ws-upload-zone ${dragOver || demoAnim ? 'ws-upload-zone-active' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="ws-upload-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="ws-upload-text">拖拽文件到此处，或点击选择</div>
            <button className="ws-upload-btn" onClick={() => fileInputRef.current?.click()}>
              选择文件
            </button>
            <div className="ws-upload-formats">
              支持多文件同时上传 · Excel / CSV / PDF / 图片
            </div>
            <div className="ws-upload-ocr">TextIn OCR 赋能，图片与扫描件自动识别</div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
              onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
            />
          </div>
        </div>
      </section>

      {/* Demo 体验区 */}
      <section className="ws-demo-section">
        <div className="ws-demo-header">
          <h2 className="ws-section-title">Demo 快速体验</h2>
          <p className="ws-demo-subtitle">无需上传文件，一键加载示例数据体验完整对账流程</p>
        </div>
        <div className="ws-demo-grid">
          {DEMOS.map(d => (
            <div key={d.id} className="ws-demo-card" onClick={(e) => handleDemoClick(d.id, e)}>
              <span className="ws-demo-card-icon">{DEMO_ICONS[d.id] || '📊'}</span>
              <div className="ws-demo-card-body">
                <div className="ws-demo-card-name">{d.name}</div>
                <div className="ws-demo-card-desc">{d.desc}</div>
              </div>
              <span className="ws-demo-card-action">立即体验 →</span>
            </div>
          ))}
        </div>
      </section>

      {/* 项目管理 / 快速引导 */}
      <section className="ws-projects">
        {hasProjects ? (
          <>
            <div className="ws-projects-header">
              <h2 className="ws-section-title">对账记录</h2>
              <div className="ws-projects-toolbar">
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
            <div className="ws-project-grid">
              {filteredProjects.map(project => {
                const status = STATUS_MAP[project.status] || STATUS_MAP.active;
                const scenarioInfo = project.scenarioId ? getScenario(project.scenarioId) : null;
                return (
                  <div key={project.id} className="ws-project-card" onClick={() => onOpenProject && onOpenProject(project)}>
                    <div className="ws-project-card-top">
                      <span className="ws-project-icon">{scenarioInfo?.icon || '📋'}</span>
                      <span className={`ws-project-status ${status.cls}`}>{status.label}</span>
                    </div>
                    <div className="ws-project-name">{project.name}</div>
                    <div className="ws-project-meta">
                      <span>{(project.files || []).length} 个文件</span>
                      <span>{formatTime(project.updatedAt)}</span>
                    </div>
                    {project.logs && project.logs.length > 0 && (
                      <div className="ws-project-log">
                        {project.logs[project.logs.length - 1].action}
                      </div>
                    )}
                    <div className="ws-project-actions" onClick={e => e.stopPropagation()}>
                      {project.status !== 'archived' && (
                        <button className="ws-action-btn" onClick={() => archiveProject(project.id)} title="归档">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                        </button>
                      )}
                      <button className="ws-action-btn ws-action-danger" onClick={() => deleteProject(project.id)} title="删除">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="ws-guide">
            <h2 className="ws-section-title">如何开始</h2>
            <div className="ws-guide-steps">
              <div className="ws-guide-step">
                <div className="ws-guide-step-num">1</div>
                <div className="ws-guide-step-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-pressed)" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <span className="ws-guide-step-label">上传文件</span>
                <span className="ws-guide-step-desc">上传 2 个以上财务文件</span>
              </div>
              <div className="ws-guide-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
              <div className="ws-guide-step">
                <div className="ws-guide-step-num">2</div>
                <div className="ws-guide-step-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-pressed)" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                </div>
                <span className="ws-guide-step-label">AI 智能匹配</span>
                <span className="ws-guide-step-desc">三轮引擎自动比对</span>
              </div>
              <div className="ws-guide-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
              <div className="ws-guide-step">
                <div className="ws-guide-step-num">3</div>
                <div className="ws-guide-step-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-pressed)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <span className="ws-guide-step-label">获取报告</span>
                <span className="ws-guide-step-desc">调节表 + AI 分析</span>
              </div>
            </div>
          </div>
        )}
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
