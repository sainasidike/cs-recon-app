import { useState, useRef, useEffect } from 'react';

const DOC_TYPE_LABELS = {
  bank_statement: { label: '银行流水', color: '#3dd598', bg: 'rgba(61,213,152,0.1)' },
  company_ledger: { label: '企业账簿', color: '#4a90d9', bg: 'rgba(74,144,217,0.1)' },
  invoice: { label: '发票', color: '#f5a623', bg: 'rgba(245,166,35,0.1)' },
  contract: { label: '合同', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  expense: { label: '报销单', color: '#f472b6', bg: 'rgba(244,114,182,0.1)' },
  payroll: { label: '工资表', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
  tax: { label: '税务', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  tax_detail: { label: '税务明细', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  cashbook: { label: '现金账', color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  asset_ledger: { label: '资产台账', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  receipt: { label: '验收单', color: '#c084fc', bg: 'rgba(192,132,252,0.1)' },
  payment: { label: '付款单', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  ap_ar_statement: { label: '往来对账', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  inventory: { label: '盘点表', color: '#a3e635', bg: 'rgba(163,230,53,0.1)' },
  unknown: { label: '待分类', color: '#999', bg: 'rgba(0,0,0,0.05)' },
};

const CLASSIFY_OPTIONS = [
  { value: 'bank_statement', label: '银行流水' },
  { value: 'company_ledger', label: '企业账簿' },
  { value: 'invoice', label: '发票' },
  { value: 'contract', label: '合同' },
  { value: 'expense', label: '报销单' },
  { value: 'payroll', label: '工资表' },
  { value: 'tax', label: '税务' },
  { value: 'cashbook', label: '现金账' },
  { value: 'receipt', label: '验收单' },
  { value: 'payment', label: '付款单' },
];

const ROLE_LABELS = {
  sideA: 'A方',
  sideB: 'B方',
  sideC: 'C方',
  auto: '自动',
};

function fmt(val) {
  return (val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 });
}

function getDocTypeInfo(docType) {
  return DOC_TYPE_LABELS[docType] || DOC_TYPE_LABELS.unknown;
}

function FileTypeIcon({ docType, size = 36 }) {
  const info = getDocTypeInfo(docType);
  const letter = info.label.charAt(0);
  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: info.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: size * 0.38, fontWeight: 700, color: info.color }}>{letter}</span>
    </div>
  );
}

function DocCard({ pf, index, isActive, onClick }) {
  const info = getDocTypeInfo(pf.docType || 'unknown');
  const entryCount = pf.parsed?.entries?.length || 0;
  const fileName = pf.file?.name || `文档 ${index + 1}`;
  const shortName = fileName.length > 18 ? fileName.slice(0, 16) + '...' : fileName;

  return (
    <div
      onClick={onClick}
      style={{
        minWidth: 140, maxWidth: 160, padding: '10px 12px',
        background: isActive ? 'rgba(61,213,152,0.06)' : '#fff',
        border: isActive ? '1.5px solid var(--accent)' : '1px solid var(--border)',
        borderRadius: 12, flexShrink: 0, cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <FileTypeIcon docType={pf.docType} size={32} />
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
          background: info.bg, color: info.color, whiteSpace: 'nowrap',
        }}>
          {info.label}
        </span>
      </div>
      <div style={{
        fontSize: 12, fontWeight: 500, color: 'var(--text-primary)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4,
      }}>
        {shortName}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
        {entryCount} 条记录
      </div>
    </div>
  );
}

function ClassifyModal({ currentType, onSelect, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{
        position: 'relative', width: '100%', maxWidth: 430, background: '#fff',
        borderRadius: '16px 16px 0 0', padding: '20px 16px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, textAlign: 'center' }}>选择文档类型</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {CLASSIFY_OPTIONS.map(opt => {
            const info = DOC_TYPE_LABELS[opt.value];
            const isActive = currentType === opt.value;
            return (
              <div
                key={opt.value}
                onClick={() => onSelect(opt.value)}
                style={{
                  padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  border: isActive ? `1.5px solid ${info.color}` : '1px solid var(--border)',
                  background: isActive ? info.bg : '#fff',
                  display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: info.color, flexShrink: 0,
                }} />
                <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, color: isActive ? info.color : 'var(--text-primary)' }}>
                  {opt.label}
                </span>
              </div>
            );
          })}
        </div>
        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 16, padding: '12px 0', borderRadius: 10,
            background: 'var(--bg-input)', fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)',
          }}
        >
          取消
        </button>
      </div>
    </div>
  );
}

export default function MobileConfirm({
  scenario, parsedFiles, sideAData, sideBData, sideCData,
  sideABalance, sideBBalance, validation,
  onSetBalances, onUpdateEntries, onAssignRole, onBack, onNext,
}) {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [classifyTarget, setClassifyTarget] = useState(null);
  const scrollRef = useRef(null);

  const files = parsedFiles || [];
  const hasFiles = files.length > 0;

  const activePf = hasFiles ? files[activeFileIndex] : null;
  const activeEntries = activePf?.parsed?.entries || [];

  const sideALabel = scenario?.sideA?.shortLabel || 'A方';
  const sideBLabel = scenario?.sideB?.shortLabel || 'B方';
  const useBalanceMode = scenario?.useBalanceMode;

  const totalEntries = files.reduce((sum, pf) => sum + (pf.parsed?.entries?.length || 0), 0);
  const totalAmount = files.reduce((sum, pf) => {
    const entries = pf.parsed?.entries || [];
    return sum + entries.reduce((s, e) => s + Math.abs(e.amount || 0), 0);
  }, 0);

  useEffect(() => {
    if (scrollRef.current && activeFileIndex >= 0) {
      const card = scrollRef.current.children[activeFileIndex];
      if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeFileIndex]);

  const handleClassify = (docType) => {
    if (classifyTarget !== null && onAssignRole) {
      const roleMapping = {
        bank_statement: 'sideA',
        company_ledger: 'sideB',
        invoice: 'sideA',
        contract: 'sideB',
      };
      const role = roleMapping[docType] || 'auto';
      onAssignRole(classifyTarget, role);
    }
    setClassifyTarget(null);
  };

  // Fallback: if no parsedFiles, show old tab-based view
  if (!hasFiles) {
    const allEntries = [
      ...(sideAData?.entries || []),
      ...(sideBData?.entries || []),
      ...(sideCData?.entries || []),
    ];
    return (
      <div className="m-page">
        <div className="m-navbar">
          <button className="m-navbar-back" onClick={onBack}>
            <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="m-navbar-title">数据确认</div>
        </div>
        <div className="m-card" style={{ padding: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {allEntries.length} 条记录 · 金额合计 ¥{fmt(allEntries.reduce((s, e) => s + Math.abs(e.amount || 0), 0))}
          </div>
        </div>
        <div className="m-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="m-data-table">
            <table>
              <thead><tr><th>日期</th><th>摘要</th><th>金额</th></tr></thead>
              <tbody>
                {allEntries.slice(0, 50).map((e, i) => (
                  <tr key={i}>
                    <td>{e.date || '-'}</td>
                    <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.description || e.summary || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>¥{fmt(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="m-bottom-bar">
          <button className="m-btn-secondary" onClick={onBack}>返回</button>
          <button className="m-btn-primary" onClick={onNext}>开始匹配</button>
        </div>
      </div>
    );
  }

  return (
    <div className="m-page" style={{ padding: 0, paddingBottom: 'calc(80px + var(--safe-bottom))' }}>
      <div className="m-navbar">
        <button className="m-navbar-back" onClick={onBack}>
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="m-navbar-title">数据确认</div>
      </div>

      {/* Document cards horizontal scroll */}
      <div style={{ padding: '12px 0 8px' }}>
        <div
          ref={scrollRef}
          style={{
            display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px',
            scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none', msOverflowStyle: 'none',
          }}
        >
          {files.map((pf, i) => (
            <div key={i} style={{ scrollSnapAlign: 'center' }}>
              <DocCard
                pf={pf}
                index={i}
                isActive={i === activeFileIndex}
                onClick={() => setActiveFileIndex(i)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Active file info bar */}
      {activePf && (
        <div style={{ padding: '0 16px', marginBottom: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', background: '#fff', borderRadius: 10,
            border: '0.5px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                {activePf.file?.name?.length > 20
                  ? activePf.file.name.slice(0, 18) + '...'
                  : activePf.file?.name || `文档 ${activeFileIndex + 1}`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {(() => {
                const info = getDocTypeInfo(activePf.docType || 'unknown');
                const isUnknown = !activePf.docType || activePf.docType === 'unknown';
                return (
                  <button
                    onClick={() => setClassifyTarget(activeFileIndex)}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                      background: info.bg, color: info.color, border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}
                  >
                    {info.label}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={info.color} strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                );
              })()}
              {activePf.assignedRole && activePf.assignedRole !== 'auto' && (
                <span style={{
                  fontSize: 10, padding: '2px 6px', borderRadius: 4,
                  background: 'var(--bg-input)', color: 'var(--text-tertiary)', fontWeight: 500,
                }}>
                  {ROLE_LABELS[activePf.assignedRole] || activePf.assignedRole}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div style={{ padding: '0 16px', marginBottom: 8 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px',
          background: 'var(--accent-light)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)',
        }}>
          <span>共 <b style={{ color: 'var(--text-primary)' }}>{files.length}</b> 个文档</span>
          <span>·</span>
          <span><b style={{ color: 'var(--text-primary)' }}>{totalEntries}</b> 条记录</span>
          <span>·</span>
          <span>¥<b style={{ color: 'var(--text-primary)' }}>{fmt(totalAmount)}</b></span>
        </div>
      </div>

      {/* Balance inputs */}
      {useBalanceMode && (
        <div style={{ padding: '0 16px', marginBottom: 8 }}>
          <div style={{
            padding: '12px 14px', background: '#fff', borderRadius: 10,
            border: '0.5px solid var(--border)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              余额录入
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, display: 'block' }}>{sideALabel}余额</label>
                <input
                  type="number"
                  className="m-period-input"
                  style={{ width: '100%' }}
                  value={sideABalance || ''}
                  onChange={e => onSetBalances(Number(e.target.value), sideBBalance)}
                  placeholder="输入"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4, display: 'block' }}>{sideBLabel}余额</label>
                <input
                  type="number"
                  className="m-period-input"
                  style={{ width: '100%' }}
                  value={sideBBalance || ''}
                  onChange={e => onSetBalances(sideABalance, Number(e.target.value))}
                  placeholder="输入"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data table for active file */}
      <div style={{ padding: '0 16px' }}>
        <div style={{
          background: '#fff', borderRadius: 12, border: '0.5px solid var(--border)',
          overflow: 'hidden',
        }}>
          {/* Table header with entry count */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderBottom: '0.5px solid var(--border)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              明细数据
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              {activeEntries.length} 条
              {activeEntries.length > 0 && (
                <> · ¥{fmt(activeEntries.reduce((s, e) => s + Math.abs(e.amount || 0), 0))}</>
              )}
            </span>
          </div>

          <div className="m-data-table">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 80 }}>日期</th>
                  <th>摘要</th>
                  <th style={{ textAlign: 'right', width: 100 }}>金额</th>
                </tr>
              </thead>
              <tbody>
                {activeEntries.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: 30, color: 'var(--text-tertiary)' }}>暂无数据</td></tr>
                )}
                {activeEntries.slice(0, 50).map((e, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{e.date || '-'}</td>
                    <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.description || e.counterparty || e.summary || '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                      <span style={{ color: e.direction === 'debit' ? 'var(--danger)' : 'var(--accent)' }}>
                        ¥{fmt(e.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
                {activeEntries.length > 50 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 10, fontSize: 12 }}>
                      ... 共 {activeEntries.length} 条
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Validation warnings */}
      {validation && validation.totalWarnings > 0 && (
        <div style={{ padding: '8px 16px 0' }}>
          <div style={{
            padding: '8px 12px', borderRadius: 8, fontSize: 12,
            background: 'var(--warning-light)', color: 'var(--warning)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            {validation.totalWarnings} 条数据预检提醒
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="m-bottom-bar">
        <button className="m-btn-secondary" onClick={onBack}>返回</button>
        <button className="m-btn-primary" onClick={onNext}>开始匹配</button>
      </div>

      {/* Classify modal */}
      {classifyTarget !== null && (
        <ClassifyModal
          currentType={files[classifyTarget]?.docType}
          onSelect={handleClassify}
          onClose={() => setClassifyTarget(null)}
        />
      )}
    </div>
  );
}
