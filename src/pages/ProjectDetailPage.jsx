import { useState, useEffect } from 'react';
import { getScenario } from '../utils/scenarios';
import { exportReconciliationPDF, exportReconciliationExcel } from '../utils/reportExport';
import { useToast } from '../components/Toast';

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

export default function ProjectDetailPage({ project, getProjectFiles, getProjectResult, onBack, onViewReport }) {
  const toast = useToast();
  const [files, setFiles] = useState(null);
  const [result, setResult] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    if (!project) return;
    getProjectFiles(project.id).then(f => setFiles(f));
    getProjectResult(project.id).then(r => setResult(r));
  }, [project, getProjectFiles, getProjectResult]);

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

  const handlePreview = (fileData) => {
    if (!fileData) return;
    setPreviewFile(fileData);
  };

  return (
    <div className="pc-page pd-page">
      <div className="pc-page-header">
        <div className="pc-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <h2 className="pc-page-title">{project.name}</h2>
        <span className={`ws-project-status ${statusCls}`} style={{ marginLeft: 12 }}>{statusLabel}</span>
      </div>

      {/* 源文件 */}
      <section className="pd-section">
        <div className="pd-section-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-pressed)" strokeWidth="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
          <span>源文件 ({project.files?.length || 0})</span>
        </div>
        <div className="pd-file-grid">
          {(project.files || []).map((f, i) => (
            <div key={i} className="pd-file-card" onClick={() => files && files[i] && handlePreview({ ...f, blob: files[i] })}>
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
                <span className="pd-file-view">查看</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 对账结果 */}
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

      {/* 操作日志 */}
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

      {/* 文件预览 Modal */}
      {previewFile && (
        <div className="cs-modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="cs-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '80vh' }}>
            <div className="cs-modal-header">
              <span>{previewFile.name}</span>
              <span className="cs-modal-close" onClick={() => setPreviewFile(null)}>×</span>
            </div>
            <div className="cs-modal-body" style={{ overflow: 'auto', maxHeight: '60vh' }}>
              {previewFile.blob && previewFile.type?.startsWith('image/') && (
                <img src={URL.createObjectURL(previewFile.blob)} alt={previewFile.name} style={{ maxWidth: '100%', borderRadius: 8 }} />
              )}
              {previewFile.blob && previewFile.type === 'application/pdf' && (
                <iframe src={URL.createObjectURL(previewFile.blob)} style={{ width: '100%', height: '55vh', border: 'none', borderRadius: 8 }} title={previewFile.name} />
              )}
              {previewFile.blob && !previewFile.type?.startsWith('image/') && previewFile.type !== 'application/pdf' && (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>
                  <p>Excel 文件已保存</p>
                  <p style={{ fontSize: 12, marginTop: 8 }}>{previewFile.entryCount > 0 ? `共 ${previewFile.entryCount} 条数据记录` : ''}</p>
                </div>
              )}
              {!previewFile.blob && (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>
                  文件数据不可用（Demo 模式下不保存原始文件）
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
