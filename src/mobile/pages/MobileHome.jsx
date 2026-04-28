import { useRef, useState, useCallback } from 'react';
import { useToast } from '../../components/Toast';
import { SCENARIOS, getScenario } from '../../utils/scenarios';
import { getDemoList } from '../../utils/demoData';

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

export default function MobileHome({ parsedFiles, isProcessing, error, scenarioId, detectedScenarioId, periodStart, periodEnd, onAddFiles, onRemoveFile, onAssignRole, onSelectScenario, onSetPeriod, onSelectDemo, onConfirmData, onUpdateMapping }) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [showPicker, setShowPicker] = useState(false);

  const handleFiles = useCallback((files) => {
    const valid = Array.from(files).filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      return ['xlsx', 'xls', 'csv', 'pdf', 'jpg', 'jpeg', 'png'].includes(ext);
    });
    if (valid.length > 0) onAddFiles(valid);
  }, [onAddFiles]);

  const activeScenarioId = scenarioId || detectedScenarioId;
  const activeScenario = activeScenarioId ? getScenario(activeScenarioId) : null;

  const roleCount = (role) => parsedFiles.filter(f => f.assignedRole === role).length;
  const handleAssignRole = (index, role) => {
    if (role !== 'auto' && roleCount(role) >= MAX_FILES_PER_ROLE) {
      toast(`已达上限 ${MAX_FILES_PER_ROLE} 个文件`);
      return;
    }
    onAssignRole(index, role);
  };

  const hasSideA = parsedFiles.some(f => f.assignedRole === 'sideA');
  const hasSideB = parsedFiles.some(f => f.assignedRole === 'sideB');
  const hasSideC = !activeScenario?.sideC || parsedFiles.some(f => f.assignedRole === 'sideC');
  const hasUnassigned = parsedFiles.some(f => f.assignedRole === 'auto');
  const isImageOrPdf = (f) => {
    const ext = f.file.name.split('.').pop().toLowerCase();
    return ['pdf', 'jpg', 'jpeg', 'png', 'bmp', 'tiff'].includes(ext);
  };
  const assignedFiles = parsedFiles.filter(f => f.assignedRole !== 'auto');
  const hasEntries = assignedFiles.length === 0 || assignedFiles.every(f => f.parsed.entries.length > 0 || f.parsed.needsOCR || isImageOrPdf(f));
  const canProceed = parsedFiles.length >= 2 && activeScenarioId && hasSideA && hasSideB && hasSideC && hasEntries && !hasUnassigned;

  const disabledReason = (() => {
    if (parsedFiles.length < 2) return '至少需要上传 2 个文件';
    if (!activeScenarioId) return '请选择对账场景';
    if (hasUnassigned) return '有文件未分配角色';
    if (!hasSideA) return `缺少「${activeScenario?.sideA?.shortLabel || 'A方'}」文件`;
    if (!hasSideB) return `缺少「${activeScenario?.sideB?.shortLabel || 'B方'}」文件`;
    if (!hasSideC) return `缺少「${activeScenario?.sideC?.shortLabel || 'C方'}」文件`;
    if (!hasEntries) return '部分文件未解析出有效数据';
    return '';
  })();

  const hasFiles = parsedFiles.length > 0;

  return (
    <div className="m-page">
      <div style={{ paddingTop: 20, textAlign: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>智能对账</h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
          上传文件自动识别，或选择体验案例
        </p>
      </div>

      {!hasFiles && (
        <div className="m-features">
          {FEATURES.map(f => (
            <span key={f.label} className="m-feature-tag">
              <span>{f.icon}</span> {f.label}
            </span>
          ))}
        </div>
      )}

      <div
        className={`m-upload-zone ${hasFiles ? 'm-upload-zone-compact' : ''}`}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="m-upload-icon">
          <svg width={hasFiles ? 24 : 36} height={hasFiles ? 24 : 36} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div className="m-upload-title">{hasFiles ? '继续添加文件' : '上传文件开始对账'}</div>
        {!hasFiles && <div className="m-upload-desc">支持 Excel / CSV / PDF / 图片</div>}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, color: 'var(--text-tertiary)', fontSize: 13 }}>
          <div className="m-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
          正在解析文件...
        </div>
      )}

      {error && <div className="m-error">{error}</div>}

      {hasFiles && (
        <>
          {activeScenario && (
            <div className="m-scenario-bar" style={{ marginTop: 12 }}>
              <span className="m-scenario-icon">{activeScenario.icon}</span>
              <div className="m-scenario-info">
                <div className="m-scenario-name">{activeScenario.name}</div>
                <div className="m-scenario-desc">{activeScenario.desc}</div>
              </div>
              <button className="m-scenario-switch" onClick={() => setShowPicker(true)}>切换</button>
            </div>
          )}
          {!activeScenario && (
            <div className="m-scenario-bar" style={{ marginTop: 12, borderColor: 'var(--warning)' }}>
              <span className="m-scenario-icon">⚠️</span>
              <div className="m-scenario-info">
                <div className="m-scenario-name">未识别到对账场景</div>
                <div className="m-scenario-desc">请手动选择</div>
              </div>
              <button className="m-scenario-switch" onClick={() => setShowPicker(true)}>选择</button>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            {parsedFiles.map((pf, i) => {
              const ext = pf.file.name.split('.').pop().toLowerCase();
              const isExcel = ['xlsx', 'xls', 'csv'].includes(ext);
              const isPdf = ext === 'pdf';
              return (
                <div key={i} className="m-file-item">
                  <div className={`m-file-thumb ${isExcel ? 'excel' : isPdf ? 'pdf' : 'img'}`}>
                    {isExcel && <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" fill="#217346"/><path d="M7 7h4v3H7zm5-0h5v3h-5z" fill="rgba(255,255,255,0.8)"/></svg>}
                    {isPdf && <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="2" width="18" height="20" rx="2" fill="#E53935"/><path d="M8 8h8M8 11h8M8 14h5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/></svg>}
                    {!isExcel && !isPdf && <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" fill="#7C4DFF"/></svg>}
                  </div>
                  <div className="m-file-info">
                    <div className="m-file-name">{pf.file.name}</div>
                    <div className="m-file-meta">
                      {formatSize(pf.file.size)}
                      {pf.parsed.entries.length > 0 && <> · {pf.parsed.entries.length} 条</>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                      {activeScenario && (
                        <select
                          className={`m-role-select ${pf.assignedRole === 'auto' ? 'warning' : ''}`}
                          value={pf.assignedRole}
                          onChange={e => handleAssignRole(i, e.target.value)}
                        >
                          {activeScenario.roles.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.value === 'auto' ? '⚠ 请选择' : opt.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {pf.docType && pf.docType !== 'unknown' && (() => {
                        const typeLabels = { bank_statement: '银行流水', company_ledger: '企业账簿', invoice: '发票', contract: '合同', receipt: '入库单', expense: '报销单', payment: '付款', payroll: '工资表' };
                        const label = typeLabels[pf.docType];
                        return label
                          ? <span className="m-ai-tag">AI: {label}</span>
                          : <span className="m-ai-tag warning">AI: 未识别</span>;
                      })()}
                    </div>
                  </div>
                  <button className="m-file-remove" onClick={() => onRemoveFile(i)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="m-card" style={{ marginTop: 12 }}>
            <div className="m-card-title">对账期间</div>
            <div className="m-period-row">
              <input type="date" className="m-period-input" value={periodStart || ''} onChange={e => onSetPeriod(e.target.value, periodEnd)} />
              <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>至</span>
              <input type="date" className="m-period-input" value={periodEnd || ''} onChange={e => onSetPeriod(periodStart, e.target.value)} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>不填则对比全部数据</div>
          </div>
        </>
      )}

      {!hasFiles && (
        <div className="m-section">
          <div className="m-section-title">Demo 体验</div>
          <div className="m-demo-grid">
            {DEMOS.map(d => (
              <div key={d.id} className="m-demo-card" onClick={() => onSelectDemo(d.id)}>
                <span className="m-demo-icon">{DEMO_ICONS[d.id] || '📊'}</span>
                <div className="m-demo-info">
                  <div className="m-demo-name">{d.name}</div>
                  <div className="m-demo-desc">{d.desc}</div>
                </div>
                <span className="m-demo-arrow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasFiles && (
        <div className="m-bottom-bar">
          <button className="m-btn-primary" disabled={!canProceed || isProcessing} onClick={onConfirmData}>
            下一步
          </button>
        </div>
      )}
      {hasFiles && !canProceed && disabledReason && (
        <div className="m-disabled-hint" style={{ position: 'fixed', bottom: `calc(56px + var(--safe-bottom))`, left: 0, right: 0 }}>
          {disabledReason}
        </div>
      )}

      {showPicker && (
        <div className="m-picker-overlay" onClick={() => setShowPicker(false)}>
          <div className="m-picker-sheet" onClick={e => e.stopPropagation()}>
            <div className="m-picker-handle" />
            <div className="m-picker-title">选择对账场景</div>
            {SCENARIOS.map(s => (
              <div
                key={s.id}
                className={`m-picker-item ${s.id === activeScenarioId ? 'active' : ''}`}
                onClick={() => { onSelectScenario(s.id); setShowPicker(false); }}
              >
                <span className="m-picker-item-icon">{s.icon}</span>
                <div>
                  <div className="m-picker-item-name">{s.name}</div>
                  <div className="m-picker-item-desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
