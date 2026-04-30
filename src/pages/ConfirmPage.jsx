import { useState, useCallback, useRef } from 'react';

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

function SplitDocPreview({ pf, allFiles, activeIdx, onSwitchFile, onClose }) {
  const file = pf.file;
  const ext = (file?.name || '').split('.').pop().toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'].includes(ext);
  const isPdf = ext === 'pdf';
  const isExcel = ['xlsx', 'xls', 'csv'].includes(ext);
  const entries = pf.parsed?.entries || [];

  return (
    <>
      <div className="home-preview-header">
        <span className="home-preview-filename">{file?.name || '文件'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {allFiles.length > 1 && (
            <div className="home-preview-nav">
              {allFiles.map((f, i) => (
                <button key={i} className={`home-preview-tab ${i === activeIdx ? 'active' : ''}`} onClick={() => onSwitchFile(i)}>
                  {(f.file?.name || f.name || '').length > 12 ? (f.file?.name || f.name || '').slice(0, 10) + '...' : (f.file?.name || f.name || '')}
                </button>
              ))}
            </div>
          )}
          <span style={{ cursor: 'pointer', fontSize: 18, color: 'var(--text-tertiary)', lineHeight: 1 }} onClick={onClose}>×</span>
        </div>
      </div>
      <div className="home-preview-body">
        {isPdf && file && (
          <iframe src={URL.createObjectURL(file)} className="home-preview-iframe" title={file.name} />
        )}
        {isImage && file && (
          <img src={URL.createObjectURL(file)} alt={file.name} className="home-preview-img" />
        )}
        {isExcel && entries.length > 0 && (
          <div className="home-preview-table-wrap">
            <table className="home-preview-table">
              <thead>
                <tr>
                  {pf.parsed.headers ? pf.parsed.headers.map((h, i) => <th key={i}>{h}</th>) : <><th>日期</th><th>摘要</th><th>金额</th><th>余额</th></>}
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 100).map((e, i) => (
                  <tr key={i}>
                    {pf.parsed.headers && e.raw ? (
                      pf.parsed.headers.map((h, hi) => <td key={hi}>{e.raw[hi] != null ? String(e.raw[hi]) : '-'}</td>)
                    ) : (
                      <>
                        <td>{e.date || '-'}</td>
                        <td>{e.description || e.counterparty || '-'}</td>
                        <td className={e.direction === 'credit' ? 'amount-credit' : 'amount-debit'}>{(e.amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</td>
                        <td>{e.balance != null ? e.balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '-'}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {entries.length > 100 && (
              <div className="home-preview-table-more">显示前 100 条 / 共 {entries.length} 条</div>
            )}
          </div>
        )}
        {isExcel && entries.length === 0 && (
          <div className="home-preview-empty">暂无可预览的数据</div>
        )}
        {!isImage && !isPdf && !isExcel && (
          <div className="home-preview-empty">暂不支持该格式预览</div>
        )}
      </div>
    </>
  );
}

function SourceFileList({ sideAData, sideBData, sideCData, parsedFiles, scenario, previewIdx, onOpenPreview }) {
  const buildFiles = () => {
    const aFiles = sideAData?.files || [];
    const bFiles = sideBData?.files || [];
    const cFiles = sideCData?.files || [];
    if (aFiles.length > 0 || bFiles.length > 0 || cFiles.length > 0) {
      return [
        ...aFiles.map(f => ({ ...f, roleLabel: scenario?.sideA?.shortLabel || 'A方' })),
        ...bFiles.map(f => ({ ...f, roleLabel: scenario?.sideB?.shortLabel || 'B方' })),
        ...cFiles.map(f => ({ ...f, roleLabel: scenario?.sideC?.shortLabel || 'C方' })),
      ];
    }
    if (parsedFiles && parsedFiles.length > 0) {
      return parsedFiles.map(pf => {
        const role = pf.assignedRole;
        const roleLabel = role === 'sideA' ? (scenario?.sideA?.shortLabel || 'A方')
          : role === 'sideB' ? (scenario?.sideB?.shortLabel || 'B方')
          : role === 'sideC' ? (scenario?.sideC?.shortLabel || 'C方') : '';
        return { ...pf, roleLabel };
      });
    }
    return [];
  };
  const allFiles = buildFiles();
  if (allFiles.length === 0) return null;

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getIcon = (name) => {
    const ext = (name || '').split('.').pop().toLowerCase();
    if (['xlsx', 'xls', 'csv'].includes(ext)) return { bg: '#217346', label: 'XLS' };
    if (ext === 'pdf') return { bg: '#E53935', label: 'PDF' };
    return { bg: '#7C4DFF', label: 'IMG' };
  };

  return (
    <div className="source-files-card">
      <div className="source-files-title">已上传文件 ({allFiles.length})</div>
      <div className="source-files-list">
        {allFiles.map((pf, i) => {
          const icon = getIcon(pf.file?.name || pf.name);
          const isActive = previewIdx === i;
          return (
            <div key={i} className={`source-file-item ${isActive ? 'source-file-item-active' : ''}`} onClick={() => onOpenPreview(isActive ? null : i)} style={{ cursor: 'pointer' }}>
              <div className="source-file-badge" style={{ background: icon.bg }}>{icon.label}</div>
              <div className="source-file-info">
                <div className="source-file-name">{pf.file?.name || pf.name || '文件'}</div>
                <div className="source-file-meta">
                  {pf.roleLabel}
                  {pf.file?.size ? ` · ${formatSize(pf.file.size)}` : ''}
                  {pf.parsed?.entries?.length ? ` · ${pf.parsed.entries.length}条` : ''}
                </div>
              </div>
              <span className="source-file-arrow" style={{ color: 'var(--accent)', fontSize: 12 }}>预览</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ConfirmPage({ scenario, sideAData, sideBData, sideCData, parsedFiles, sideABalance, sideBBalance, validation, onSetBalances, onBack, onNext, onUpdateEntries }) {
  const [activeTab, setActiveTab] = useState('sideA');
  const [localABal, setLocalABal] = useState(sideABalance || 0);
  const [localBBal, setLocalBBal] = useState(sideBBalance || 0);
  const [editModal, setEditModal] = useState(null);
  const [localAEntries, setLocalAEntries] = useState(null);
  const [localBEntries, setLocalBEntries] = useState(null);
  const [localCEntries, setLocalCEntries] = useState(null);

  const [previewFileIdx, setPreviewFileIdx] = useState(null);
  const [leftWidth, setLeftWidth] = useState(520);
  const draggingRef = useRef(false);

  const handleDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;
    const startX = e.clientX;
    const startW = leftWidth;
    const divider = e.currentTarget;
    divider.classList.add('dragging');

    const onMouseMove = (ev) => {
      const delta = ev.clientX - startX;
      setLeftWidth(Math.max(300, Math.min(800, startW + delta)));
    };
    const onMouseUp = () => {
      draggingRef.current = false;
      divider.classList.remove('dragging');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [leftWidth]);

  const getAllPreviewFiles = () => {
    const aFiles = sideAData?.files || [];
    const bFiles = sideBData?.files || [];
    const cFiles = sideCData?.files || [];
    if (aFiles.length > 0 || bFiles.length > 0 || cFiles.length > 0) {
      return [...aFiles, ...bFiles, ...cFiles];
    }
    if (parsedFiles && parsedFiles.length > 0) return parsedFiles;
    return [];
  };
  const allPreviewFiles = getAllPreviewFiles();

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

  const confirmContent = (
    <>
      <div className="pc-page-header">
        <div className="pc-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <h2 className="pc-page-title">数据确认</h2>
        <span style={{ marginLeft: 'auto', fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
          共 {aEntries.length + bEntries.length + cEntries.length} 条记录
        </span>
      </div>

      <ValidationPanel validation={validation} />

      <div className="confirm-layout">
        <div className="confirm-sidebar-col">
          <SourceFileList sideAData={sideAData} sideBData={sideBData} sideCData={sideCData} parsedFiles={parsedFiles} scenario={scenario} previewIdx={previewFileIdx} onOpenPreview={setPreviewFileIdx} />
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
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', padding: '0 0 10px', lineHeight: 1.5 }}>
                请输入对账单/账簿最后一行的期末余额数字
              </div>
              <div className="balance-inputs">
                <div className="balance-input-group">
                  <span className="balance-input-label">{scenario.balanceLabels?.sideA || `${aLabel}余额`}</span>
                  <input className="input" type="number" step="0.01" value={localABal} onChange={e => setLocalABal(e.target.value)} placeholder="对账单最后一行余额" />
                </div>
                <div className="balance-input-group">
                  <span className="balance-input-label">{scenario.balanceLabels?.sideB || `${bLabel}余额`}</span>
                  <input className="input" type="number" step="0.01" value={localBBal} onChange={e => setLocalBBal(e.target.value)} placeholder="账簿最后一行余额" />
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
    </>
  );

  if (previewFileIdx !== null && allPreviewFiles[previewFileIdx]) {
    return (
      <div className="pc-page confirm-split-layout">
        <div className="confirm-split-left" style={{ width: leftWidth }}>
          <SplitDocPreview
            pf={allPreviewFiles[previewFileIdx]}
            allFiles={allPreviewFiles}
            activeIdx={previewFileIdx}
            onSwitchFile={setPreviewFileIdx}
            onClose={() => setPreviewFileIdx(null)}
          />
        </div>
        <div className="home-split-divider" onMouseDown={handleDividerMouseDown} />
        <div className="confirm-split-right">
          {confirmContent}
        </div>
      </div>
    );
  }

  return (
    <div className="pc-page">
      {confirmContent}
    </div>
  );
}
