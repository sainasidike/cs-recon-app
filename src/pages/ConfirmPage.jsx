import { useState, useCallback } from 'react';

function DataTable({ entries, maxRows = 50, showDirection = true, onRowClick }) {
  if (!entries || entries.length === 0) return <div style={{ padding: 16, color: 'var(--text-tertiary)', textAlign: 'center' }}>暂无数据</div>;
  const show = entries.slice(0, maxRows);

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>日期</th>
            <th>摘要</th>
            <th style={{ textAlign: 'right' }}>金额</th>
          </tr>
        </thead>
        <tbody>
          {show.map((e, i) => (
            <tr key={i} onClick={() => onRowClick?.(i)} style={onRowClick ? { cursor: 'pointer' } : undefined} className={e._manual ? 'manual-row' : ''}>
              <td style={{ color: 'var(--text-tertiary)' }}>{e._manual ? '✎' : i + 1}</td>
              <td>{e.date || '-'}</td>
              <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description || e.counterparty || '-'}</td>
              <td style={{ textAlign: 'right' }}>
                <span className={showDirection ? (e.direction === 'debit' ? 'amount-debit' : 'amount-credit') : ''} style={showDirection ? {} : { fontWeight: 500 }}>
                  {showDirection ? (e.direction === 'debit' ? '-' : '+') : ''}
                  {(e.amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length > maxRows && (
        <div style={{ padding: '8px 12px', fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
          显示前 {maxRows} 条 / 共 {entries.length} 条
        </div>
      )}
    </div>
  );
}

function ValidationPanel({ validation }) {
  if (!validation || validation.totalWarnings === 0) return null;

  const [expanded, setExpanded] = useState(false);
  const errors = [...validation.sideAWarnings, ...validation.sideBWarnings].filter(w => w.severity === 'error');
  const warnings = [...validation.sideAWarnings, ...validation.sideBWarnings].filter(w => w.severity === 'warning');
  const dupes = [
    ...validation.sideADuplicates.map(d => ({ ...d, source: 'A方' })),
    ...validation.sideBDuplicates.map(d => ({ ...d, source: 'B方' })),
  ];

  return (
    <div className="card mb-md" style={{ borderColor: errors.length > 0 ? 'rgba(229,62,62,0.3)' : 'rgba(221,140,4,0.3)' }}>
      <div className="card-header" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
        <span style={{ color: errors.length > 0 ? 'var(--danger)' : 'var(--warning)' }}>
          {errors.length > 0 ? '!' : 'i'} 数据预检
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
          {errors.length > 0 && <span style={{ color: 'var(--danger)' }}>{errors.length} 异常</span>}
          {errors.length > 0 && warnings.length > 0 && ' / '}
          {warnings.length > 0 && <span style={{ color: 'var(--warning)' }}>{warnings.length} 提醒</span>}
          {dupes.length > 0 && <span style={{ color: 'var(--info)' }}> / {dupes.length} 疑似重复</span>}
          <span style={{ marginLeft: 8 }}>{expanded ? '▲' : '▼'}</span>
        </span>
      </div>
      {expanded && (
        <div className="card-body" style={{ fontSize: 'var(--font-xs)', maxHeight: 300, overflowY: 'auto' }}>
          {dupes.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, color: 'var(--info)', marginBottom: 6 }}>疑似重复记录</div>
              {dupes.map((d, i) => (
                <div key={`d${i}`} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  [{d.source}] 第{d.index1 + 1}行 与 第{d.index2 + 1}行：{d.entry1.date} {d.entry1.description} ¥{d.entry1.amount?.toFixed(2)}
                </div>
              ))}
            </div>
          )}
          {errors.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 6 }}>数据异常</div>
              {errors.map((w, i) => <div key={`e${i}`} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', color: 'var(--danger)' }}>{w.message}</div>)}
            </div>
          )}
          {warnings.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, color: 'var(--warning)', marginBottom: 6 }}>数据提醒</div>
              {warnings.slice(0, 20).map((w, i) => <div key={`w${i}`} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{w.message}</div>)}
              {warnings.length > 20 && <div style={{ padding: '6px 0', color: 'var(--text-tertiary)' }}>还有 {warnings.length - 20} 条提醒...</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EntryModal({ entry, onSave, onDelete, onClose, mode }) {
  const [form, setForm] = useState({
    date: entry?.date || new Date().toISOString().slice(0, 10),
    amount: entry?.amount || '',
    direction: entry?.direction || 'debit',
    description: entry?.description || '',
    counterparty: entry?.counterparty || '',
  });

  const handleSave = () => {
    if (!form.amount) return;
    onSave({
      ...entry,
      id: entry?.id || `manual-${Date.now()}`,
      date: form.date || null,
      amount: Math.abs(Number(form.amount)),
      direction: form.direction,
      description: form.description,
      counterparty: form.counterparty,
      balance: null,
      reference: '',
      _manual: true,
    });
  };

  return (
    <div className="cs-modal-overlay" onClick={onClose}>
      <div className="cs-modal" onClick={e => e.stopPropagation()}>
        <div className="cs-modal-header">
          <span>{mode === 'add' ? '手动录入' : '编辑条目'}</span>
          <span className="cs-modal-close" onClick={onClose}>×</span>
        </div>
        <div className="cs-modal-body">
          <div className="input-group mb-sm">
            <label className="input-label">日期</label>
            <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="input-group mb-sm">
            <label className="input-label">金额</label>
            <input className="input" type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="请输入金额" />
          </div>
          <div className="input-group mb-sm">
            <label className="input-label">方向</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`cs-dir-btn ${form.direction === 'debit' ? 'active-debit' : ''}`} onClick={() => setForm(f => ({ ...f, direction: 'debit' }))}>借/支出</button>
              <button className={`cs-dir-btn ${form.direction === 'credit' ? 'active-credit' : ''}`} onClick={() => setForm(f => ({ ...f, direction: 'credit' }))}>贷/收入</button>
            </div>
          </div>
          <div className="input-group mb-sm">
            <label className="input-label">摘要</label>
            <input className="input" type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="交易摘要/说明" />
          </div>
          <div className="input-group mb-sm">
            <label className="input-label">对方</label>
            <input className="input" type="text" value={form.counterparty} onChange={e => setForm(f => ({ ...f, counterparty: e.target.value }))} placeholder="对方名称（可选）" />
          </div>
        </div>
        <div className="cs-modal-footer">
          {mode === 'edit' && onDelete && (
            <button className="btn btn-danger-outline" onClick={() => { onDelete(); onClose(); }}>删除</button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => { handleSave(); onClose(); }}>保存</button>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage({ scenario, sideAData, sideBData, sideCData, sideABalance, sideBBalance, validation, onSetBalances, onBack, onNext, onUpdateEntries }) {
  const [activeTab, setActiveTab] = useState('sideA');
  const [localABal, setLocalABal] = useState(sideABalance || 0);
  const [localBBal, setLocalBBal] = useState(sideBBalance || 0);
  const [editModal, setEditModal] = useState(null);
  const [localAEntries, setLocalAEntries] = useState(null);
  const [localBEntries, setLocalBEntries] = useState(null);
  const [localCEntries, setLocalCEntries] = useState(null);

  const aEntries = localAEntries || sideAData?.entries || [];
  const bEntries = localBEntries || sideBData?.entries || [];
  const cEntries = localCEntries || sideCData?.entries || [];

  const getSetterForTab = (tab) => {
    if (tab === 'sideA') return [aEntries, (v) => setLocalAEntries(v)];
    if (tab === 'sideB') return [bEntries, (v) => setLocalBEntries(v)];
    return [cEntries, (v) => setLocalCEntries(v)];
  };

  const handleAddEntry = () => {
    setEditModal({ mode: 'add', tab: activeTab, entry: null });
  };

  const handleEditEntry = (idx) => {
    const [entries] = getSetterForTab(activeTab);
    setEditModal({ mode: 'edit', tab: activeTab, entry: entries[idx], idx });
  };

  const handleSaveEntry = (saved) => {
    const [entries, setter] = getSetterForTab(editModal.tab);
    if (editModal.mode === 'add') {
      setter([...entries, saved]);
    } else {
      const updated = [...entries];
      updated[editModal.idx] = saved;
      setter(updated);
    }
  };

  const handleDeleteEntry = () => {
    const [entries, setter] = getSetterForTab(editModal.tab);
    setter(entries.filter((_, i) => i !== editModal.idx));
  };

  const aTotalDebit = aEntries.filter(e => e.direction === 'debit').reduce((s, e) => s + (e.amount || 0), 0);
  const aTotalCredit = aEntries.filter(e => e.direction === 'credit').reduce((s, e) => s + (e.amount || 0), 0);
  const bTotalDebit = bEntries.filter(e => e.direction === 'debit').reduce((s, e) => s + (e.amount || 0), 0);
  const bTotalCredit = bEntries.filter(e => e.direction === 'credit').reduce((s, e) => s + (e.amount || 0), 0);

  const aLabel = scenario?.sideA?.shortLabel || 'A方';
  const bLabel = scenario?.sideB?.shortLabel || 'B方';
  const cLabel = scenario?.sideC?.shortLabel || 'C方';

  const handleNext = () => {
    onSetBalances(Number(localABal) || 0, Number(localBBal) || 0);
    if (onUpdateEntries) {
      onUpdateEntries(aEntries, bEntries, cEntries.length > 0 ? cEntries : null);
    }
    onNext();
  };

  return (
    <div className="pc-page">
      <div className="pc-page-header">
        <div className="pc-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <h2 className="pc-page-title">数据确认</h2>
      </div>

      <ValidationPanel validation={validation} />

      <div className="confirm-layout">
        <div className="confirm-sidebar-col">
          <div className="stats-col">
            <div className="stat-item">
              <span className="stat-item-label">{aLabel}记录</span>
              <span className="stat-item-value">{aEntries.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-item-label">{bLabel}记录</span>
              <span className="stat-item-value">{bEntries.length}</span>
            </div>
            {cEntries.length > 0 && (
              <div className="stat-item">
                <span className="stat-item-label">{cLabel}记录</span>
                <span className="stat-item-value">{cEntries.length}</span>
              </div>
            )}
            <div className="stat-item">
              <span className="stat-item-label">总计</span>
              <span className="stat-item-value">{aEntries.length + bEntries.length + cEntries.length}</span>
            </div>
          </div>

          {scenario?.hasBalance && (
            <div className="balance-card">
              <div className="balance-card-title">期末余额</div>
              <div className="balance-inputs">
                <div className="balance-input-group">
                  <span className="balance-input-label">{scenario.balanceLabels?.sideA || `${aLabel}余额`}</span>
                  <input className="input" type="number" step="0.01" value={localABal} onChange={e => setLocalABal(e.target.value)} placeholder="请输入余额" />
                </div>
                <div className="balance-input-group">
                  <span className="balance-input-label">{scenario.balanceLabels?.sideB || `${bLabel}余额`}</span>
                  <input className="input" type="number" step="0.01" value={localBBal} onChange={e => setLocalBBal(e.target.value)} placeholder="请输入余额" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="confirm-main-col">
          <div className="table-header-row">
            <div className="tabs" style={{ marginBottom: 0 }}>
              <div className={`tab ${activeTab === 'sideA' ? 'active' : ''}`} onClick={() => setActiveTab('sideA')}>
                {aLabel} ({aEntries.length})
              </div>
              <div className={`tab ${activeTab === 'sideB' ? 'active' : ''}`} onClick={() => setActiveTab('sideB')}>
                {bLabel} ({bEntries.length})
              </div>
              {cEntries.length > 0 && (
                <div className={`tab ${activeTab === 'sideC' ? 'active' : ''}`} onClick={() => setActiveTab('sideC')}>
                  {cLabel} ({cEntries.length})
                </div>
              )}
            </div>
            <button className="add-entry-btn" onClick={handleAddEntry}>+ 手动录入</button>
          </div>

          {activeTab === 'sideA' && (
            <DataTable entries={aEntries} showDirection={!!scenario?.hasBalance} onRowClick={handleEditEntry} />
          )}
          {activeTab === 'sideB' && (
            <DataTable entries={bEntries} showDirection={!!scenario?.hasBalance} onRowClick={handleEditEntry} />
          )}
          {activeTab === 'sideC' && (
            <DataTable entries={cEntries} showDirection={false} onRowClick={handleEditEntry} />
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
            <button className="btn-pc-primary" onClick={handleNext}>开始智能比对</button>
          </div>
        </div>
      </div>

      {editModal && (
        <EntryModal
          entry={editModal.entry}
          mode={editModal.mode}
          onSave={handleSaveEntry}
          onDelete={editModal.mode === 'edit' ? handleDeleteEntry : null}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  );
}
