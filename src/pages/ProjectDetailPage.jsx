import { useState, useEffect, useCallback, useRef } from 'react';
import { getScenario } from '../utils/scenarios';
import { exportReconciliationPDF, exportReconciliationExcel } from '../utils/reportExport';
import { useToast } from '../components/Toast';
import { parseFile } from '../utils/fileParser';

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function FileIcon({ name }) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return <div className="pd-file-icon" style={{ background: '#217346' }}>XLS</div>;
  }
  if (ext === 'pdf') {
    return <div className="pd-file-icon" style={{ background: '#E53935' }}>PDF</div>;
  }
  return <div className="pd-file-icon" style={{ background: '#7C4DFF' }}>IMG</div>;
}

function fmt(val) {
  return (val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 });
}

function SplitFilePreview({ fileData, allFiles, activeIdx, onSwitchFile, onClose, parsedData }) {
  const name = fileData.name || '';
  const ext = name.split('.').pop().toLowerCase();
  const isImage = fileData.type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'].includes(ext);
  const isPdf = fileData.type === 'application/pdf' || ext === 'pdf';
  const isExcel = ['xlsx', 'xls', 'csv'].includes(ext);
  const blob = fileData.blob;

  return (
    <>
      <div className="home-preview-header">
        <span className="home-preview-filename">{name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {allFiles.length > 1 && (
            <div className="home-preview-nav">
              {allFiles.map((f, i) => (
                <button key={i} className={`home-preview-tab ${i === activeIdx ? 'active' : ''}`} onClick={() => onSwitchFile(i)}>
                  {(f.name || '').length > 12 ? f.name.slice(0, 10) + '...' : (f.name || '')}
                </button>
              ))}
            </div>
          )}
          <span style={{ cursor: 'pointer', fontSize: 18, color: 'var(--text-tertiary)', lineHeight: 1 }} onClick={onClose}>×</span>
        </div>
      </div>
      <div className="home-preview-body">
        {blob && isImage && (
          <img src={URL.createObjectURL(blob)} alt={name} className="home-preview-img" />
        )}
        {blob && isPdf && (
          <iframe src={URL.createObjectURL(blob)} className="home-preview-iframe" title={name} />
        )}
        {blob && isExcel && parsedData && parsedData.entries?.length > 0 && (
          <div className="home-preview-table-wrap">
            <table className="home-preview-table">
              <thead>
                <tr>
                  {parsedData.headers ? parsedData.headers.map((h, i) => <th key={i}>{h}</th>) : <><th>日期</th><th>摘要</th><th>金额</th><th>余额</th></>}
                </tr>
              </thead>
              <tbody>
                {parsedData.entries.slice(0, 100).map((e, i) => (
                  <tr key={i}>
                    {parsedData.headers && e.raw ? (
                      parsedData.headers.map((h, hi) => <td key={hi}>{e.raw[hi] != null ? String(e.raw[hi]) : '-'}</td>)
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
            {parsedData.entries.length > 100 && (
              <div className="home-preview-table-more">显示前 100 条 / 共 {parsedData.entries.length} 条</div>
            )}
          </div>
        )}
        {blob && isExcel && (!parsedData || parsedData.entries?.length === 0) && (
          <div className="home-preview-empty">
            {parsedData === null ? '正在解析...' : '暂无可预览的数据'}
          </div>
        )}
        {!blob && (
          <div className="home-preview-empty">文件数据不可用（Demo 模式下不保存原始文件）</div>
        )}
      </div>
    </>
  );
}

export default function ProjectDetailPage({ project, getProjectFiles, getProjectResult, onBack, onViewReport }) {
  const toast = useToast();
  const [files, setFiles] = useState(null);
  const [result, setResult] = useState(null);
  const [previewIdx, setPreviewIdx] = useState(null);
  const [parsedPreview, setParsedPreview] = useState({});
  const [leftWidth, setLeftWidth] = useState(520);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!project) return;
    getProjectFiles(project.id).then(f => setFiles(f));
    getProjectResult(project.id).then(r => setResult(r));
  }, [project, getProjectFiles, getProjectResult]);

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

  if (!project) return null;

  const scenario = project.scenarioId ? getScenario(project.scenarioId) : null;
  const statusLabel = project.status === 'completed' ? '已完成' : project.status === 'archived' ? '已归档' : '进行中';
  const statusCls = project.status === 'completed' ? 'ws-status-done' : project.status === 'archived' ? 'ws-status-archived' : 'ws-status-active';

  const handleExportPDF = () => {
    if (!result) return;
    try {
      const period = project.resultSummary?.completedAt?.slice(0, 10) || '';
      exportReconciliationPDF(result.reconciliation, result.matchResults, period, result.scenario);
      toast('PDF 报告已下载');
    } catch (e) { toast('导出失败: ' + e.message); }
  };

  const handleExportExcel = () => {
    if (!result) return;
    try {
      const period = project.resultSummary?.completedAt?.slice(0, 10) || '';
      exportReconciliationExcel(result.reconciliation, result.matchResults, period, result.scenario);
      toast('Excel 报告已下载');
    } catch (e) { toast('导出失败: ' + e.message); }
  };

  const projectFiles = project.files || [];

  const handleOpenPreview = (idx) => {
    if (!files || !files[idx]) return;
    if (previewIdx === idx) {
      setPreviewIdx(null);
      return;
    }
    setPreviewIdx(idx);
    const f = projectFiles[idx];
    const ext = (f.name || '').split('.').pop().toLowerCase();
    const isExcel = ['xlsx', 'xls', 'csv'].includes(ext);
    if (isExcel && !parsedPreview[idx]) {
      const blob = files[idx];
      const fakeFile = new File([blob], f.name, { type: blob.type });
      parseFile(fakeFile).then(parsed => {
        setParsedPreview(prev => ({ ...prev, [idx]: parsed }));
      }).catch(() => {
        setParsedPreview(prev => ({ ...prev, [idx]: { entries: [] } }));
      });
    }
  };

  const getPreviewData = (idx) => {
    if (idx === null || !projectFiles[idx]) return null;
    return { ...projectFiles[idx], blob: files?.[idx] || null };
  };

  const detailContent = (
    <>
      <div className="pc-page-header">
        <div className="pc-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <h2 className="pc-page-title">{project.name}</h2>
        <span className={`ws-project-status ${statusCls}`} style={{ marginLeft: 12 }}>{statusLabel}</span>
      </div>

      <section className="pd-section">
        <div className="pd-section-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-pressed)" strokeWidth="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
          <span>源文件 ({projectFiles.length})</span>
        </div>
        <div className="pd-file-grid">
          {projectFiles.map((f, i) => (
            <div key={i} className={`pd-file-card ${previewIdx === i ? 'pd-file-card-active' : ''}`} onClick={() => handleOpenPreview(i)}>
              <FileIcon name={f.name} />
              <div className="pd-file-info">
                <div className="pd-file-name">{f.name}</div>
                <div className="pd-file-meta">
                  {f.role && <span className="pd-file-role">{f.role}</span>}
                  {f.size && <span>{formatSize(f.size)}</span>}
                  {f.entryCount > 0 && <span>{f.entryCount}条记录</span>}
                </div>
              </div>
              {files && files[i] && (
                <span className="pd-file-view" style={previewIdx === i ? { color: 'var(--accent)' } : undefined}>
                  {previewIdx === i ? '收起' : '查看'}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {result && (
        <section className="pd-section">
          <div className="pd-section-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-pressed)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>对账结果</span>
          </div>
          <div className="pd-result-card">
            <div className="pd-result-summary">
              <div className="pd-result-badge" style={{ background: result.reconciliation?.isBalanced ? 'var(--accent-light)' : 'var(--danger-light)', color: result.reconciliation?.isBalanced ? 'var(--accent-pressed)' : 'var(--danger)' }}>
                {result.reconciliation?.isBalanced ? '一致' : '差异'}
              </div>
              <div className="pd-result-info">
                {result.reconciliation?.useBalanceMode ? (
                  <span>调节后余额：¥ {fmt(result.reconciliation?.sideAAdjusted)}</span>
                ) : (
                  <span>匹配率：{result.reconciliation?.matchRate?.toFixed(1)}%</span>
                )}
              </div>
            </div>
            <div className="pd-result-actions">
              <button className="btn-pc-outline" onClick={handleExportExcel}>导出 Excel</button>
              <button className="btn-pc-outline" onClick={handleExportPDF}>导出 PDF</button>
              <button className="btn-pc-primary" onClick={() => onViewReport && onViewReport(result)}>查看完整报告</button>
            </div>
          </div>
        </section>
      )}

      {project.logs && project.logs.length > 0 && (
        <section className="pd-section">
          <div className="pd-section-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-pressed)" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span>操作日志</span>
          </div>
          <div className="pd-log-list">
            {[...project.logs].reverse().map((log, i) => (
              <div key={i} className="pd-log-item">
                <span className="pd-log-time">{new Date(log.time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                <span className="pd-log-action">{log.action}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );

  const previewData = getPreviewData(previewIdx);

  if (previewData) {
    return (
      <div className="pc-page confirm-split-layout">
        <div className="confirm-split-left" style={{ width: leftWidth }}>
          <SplitFilePreview
            fileData={previewData}
            allFiles={projectFiles}
            activeIdx={previewIdx}
            onSwitchFile={(i) => { if (files && files[i]) handleOpenPreview(i); }}
            onClose={() => setPreviewIdx(null)}
            parsedData={parsedPreview[previewIdx] || null}
          />
        </div>
        <div className="home-split-divider" onMouseDown={handleDividerMouseDown} />
        <div className="confirm-split-right">
          {detailContent}
        </div>
      </div>
    );
  }

  return (
    <div className="pc-page pd-page">
      {detailContent}
    </div>
  );
}
