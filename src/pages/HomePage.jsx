import { useRef, useState, useCallback, useEffect } from 'react';
import ColumnMapper from '../components/ColumnMapper';
import { useToast } from '../components/Toast';
import { SCENARIOS, getScenario } from '../utils/scenarios';
import { getDemoList } from '../utils/demoData';
import { parseFile } from '../utils/fileParser';

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

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function ReportsView({ projectsHook, onOpenProject, onSwitchNav }) {
  const { projects, deleteProject } = projectsHook || {};
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const completedProjects = (projects || []).filter(p => p.status === 'completed' || p.status === 'archived');

  const filtered = completedProjects.filter(p => {
    if (filter === 'balanced' && !p.resultSummary?.isBalanced) return false;
    if (filter === 'unbalanced' && p.resultSummary?.isBalanced !== false) return false;
    if (searchQuery && !p.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const thisMonth = new Date();
  const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString();
  const thisMonthCount = completedProjects.filter(p => p.resultSummary?.completedAt >= monthStart).length;
  const balancedRate = completedProjects.length > 0
    ? Math.round(completedProjects.filter(p => p.resultSummary?.isBalanced).length / completedProjects.length * 100)
    : 0;

  const handleDelete = async (id) => {
    await deleteProject(id);
    setConfirmDelete(null);
  };

  if (completedProjects.length === 0) {
    return (
      <div className="ws-page-v2">
        <div className="nav-page-header">
          <h2 className="nav-page-title">报告中心</h2>
        </div>
        <div className="ws-records-empty" style={{ marginTop: 80 }}>
          <div className="ws-records-empty-icon">📊</div>
          <div className="ws-records-empty-text">暂无对账报告</div>
          <div className="ws-records-empty-hint">完成对账流程后，报告将自动保存在这里</div>
          <button className="nav-empty-cta" onClick={() => onSwitchNav('workspace')}>去工作台开始对账</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-page-v2">
      <div className="nav-page-header">
        <h2 className="nav-page-title">报告中心</h2>
      </div>

      <section className="ws-stats-row">
        <div className="ws-stat-card">
          <div className="ws-stat-card-value">{completedProjects.length}</div>
          <div className="ws-stat-card-label">总报告数</div>
        </div>
        <div className="ws-stat-card">
          <div className="ws-stat-card-value" style={{ color: 'var(--accent)' }}>{thisMonthCount}</div>
          <div className="ws-stat-card-label">本月新增</div>
        </div>
        <div className="ws-stat-card">
          <div className="ws-stat-card-value">{balancedRate}%</div>
          <div className="ws-stat-card-label">平衡率</div>
        </div>
        <div className="ws-stat-card">
          <div className="ws-stat-card-value">{completedProjects.reduce((s, p) => s + (p.files?.length || 0), 0)}</div>
          <div className="ws-stat-card-label">涉及文件</div>
        </div>
      </section>

      <section className="nav-table-section">
        <div className="nav-table-toolbar">
          <div className="ws-filter-tabs">
            {[
              { key: 'all', label: '全部' },
              { key: 'balanced', label: '已平衡' },
              { key: 'unbalanced', label: '未平衡' },
            ].map(tab => (
              <button key={tab.key} className={`ws-filter-tab ${filter === tab.key ? 'active' : ''}`} onClick={() => setFilter(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="ws-search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="text" placeholder="搜索报告..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="nav-table-wrap">
          <table className="nav-table">
            <thead>
              <tr>
                <th>项目名称</th>
                <th>场景</th>
                <th>匹配率</th>
                <th>状态</th>
                <th>完成时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(project => {
                const scenarioInfo = project.scenarioId ? getScenario(project.scenarioId) : null;
                const matchRate = project.resultSummary?.matchRate;
                const isBalanced = project.resultSummary?.isBalanced;
                return (
                  <tr key={project.id}>
                    <td className="nav-table-name" onClick={() => onOpenProject(project)}>
                      <span className="nav-table-icon">{scenarioInfo?.icon || '📋'}</span>
                      {project.name}
                    </td>
                    <td>{scenarioInfo?.name || '-'}</td>
                    <td>{matchRate != null ? `${matchRate.toFixed(1)}%` : '-'}</td>
                    <td>
                      <span className={`nav-balance-badge ${isBalanced ? 'balanced' : 'unbalanced'}`}>
                        {isBalanced ? '✓ 平衡' : '✗ 差异'}
                      </span>
                    </td>
                    <td>{formatDate(project.resultSummary?.completedAt)}</td>
                    <td>
                      <div className="nav-table-actions">
                        <button className="nav-action-btn" title="查看详情" onClick={() => onOpenProject(project)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button className="nav-action-btn danger" title="删除" onClick={() => setConfirmDelete(project.id)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="nav-table-empty">没有匹配的报告</div>
          )}
        </div>
      </section>

      {confirmDelete && (
        <div className="nav-confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="nav-confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="nav-confirm-title">确认删除</div>
            <div className="nav-confirm-desc">删除后将无法恢复该对账报告及相关数据</div>
            <div className="nav-confirm-actions">
              <button className="nav-confirm-cancel" onClick={() => setConfirmDelete(null)}>取消</button>
              <button className="nav-confirm-ok" onClick={() => handleDelete(confirmDelete)}>删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocsView({ projectsHook, onOpenProject, onSwitchNav, onAddFiles }) {
  const { projects, getProjectFiles, updateProject, deleteProject } = projectsHook || {};
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [readerFile, setReaderFile] = useState(null);
  const [readerData, setReaderData] = useState(null);
  const [readerPage, setReaderPage] = useState(0);
  const [menuOpen, setMenuOpen] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [thumbnails, setThumbnails] = useState({});

  const allFiles = (projects || []).flatMap(p =>
    (p.files || []).map((f, idx) => ({
      ...f,
      fileIndex: idx,
      projectId: p.id,
      projectName: p.name,
      uploadedAt: p.createdAt,
    }))
  );

  const getFileType = (name) => {
    const ext = (name || '').split('.').pop().toLowerCase();
    if (['xlsx', 'xls', 'csv'].includes(ext)) return 'excel';
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'].includes(ext)) return 'image';
    return 'other';
  };

  const filtered = allFiles.filter(f => {
    const type = getFileType(f.name);
    if (filter === 'excel' && type !== 'excel') return false;
    if (filter === 'pdf' && type !== 'pdf') return false;
    if (filter === 'image' && type !== 'image') return false;
    if (searchQuery && !f.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: allFiles.length,
    excel: allFiles.filter(f => getFileType(f.name) === 'excel').length,
    pdf: allFiles.filter(f => getFileType(f.name) === 'pdf').length,
    image: allFiles.filter(f => getFileType(f.name) === 'image').length,
  };

  useEffect(() => {
    let cancelled = false;
    const generateThumbs = async () => {
      for (const file of allFiles) {
        const key = `${file.projectId}-${file.fileIndex}`;
        if (thumbnails[key]) continue;
        const type = getFileType(file.name);
        if (type === 'image') {
          try {
            const blobs = await getProjectFiles(file.projectId);
            if (cancelled) return;
            const blob = blobs?.[file.fileIndex];
            if (blob) {
              const url = URL.createObjectURL(blob);
              setThumbnails(prev => ({ ...prev, [key]: url }));
            }
          } catch {}
        }
      }
    };
    generateThumbs();
    return () => { cancelled = true; };
  }, [allFiles.length]);

  const openReader = async (file) => {
    setReaderFile(file);
    setReaderData(null);
    setReaderPage(0);
    try {
      const blobs = await getProjectFiles(file.projectId);
      if (!blobs) return;
      const blob = blobs[file.fileIndex];
      if (!blob) return;
      const type = getFileType(file.name);
      if (type === 'excel') {
        const fileObj = new File([blob], file.name, { type: blob.type || 'application/octet-stream' });
        const parsed = await parseFile(fileObj);
        const ROWS_PER_PAGE = 50;
        const pages = [];
        for (let i = 0; i < parsed.entries.length; i += ROWS_PER_PAGE) {
          pages.push(parsed.entries.slice(i, i + ROWS_PER_PAGE));
        }
        if (pages.length === 0) pages.push([]);
        setReaderData({ type: 'table', pages, headers: parsed.headers, totalEntries: parsed.entries.length });
      } else if (type === 'pdf') {
        setReaderData({ type: 'pdf', url: URL.createObjectURL(blob), pages: [{ label: 'PDF' }] });
      } else if (type === 'image') {
        setReaderData({ type: 'image', url: URL.createObjectURL(blob), pages: [{ label: '图片' }] });
      }
    } catch (e) {
      console.warn('Reader open failed:', e);
    }
  };

  const handleDownload = async (file) => {
    try {
      const blobs = await getProjectFiles(file.projectId);
      const blob = blobs?.[file.fileIndex];
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setMenuOpen(null);
  };

  const handleRename = (file) => {
    setRenameTarget(file);
    const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : '';
    setRenameValue(file.name.replace(ext, ''));
    setMenuOpen(null);
  };

  const confirmRename = () => {
    if (!renameTarget || !renameValue.trim()) { setRenameTarget(null); return; }
    const ext = renameTarget.name.includes('.') ? '.' + renameTarget.name.split('.').pop() : '';
    const newName = renameValue.trim() + ext;
    const project = (projects || []).find(p => p.id === renameTarget.projectId);
    if (project) {
      const newFiles = [...project.files];
      newFiles[renameTarget.fileIndex] = { ...newFiles[renameTarget.fileIndex], name: newName };
      updateProject(renameTarget.projectId, { files: newFiles });
    }
    setRenameTarget(null);
  };

  const handleDelete = (file) => {
    setConfirmDelete(file);
    setMenuOpen(null);
  };

  const confirmDeleteFile = () => {
    if (!confirmDelete) return;
    const project = (projects || []).find(p => p.id === confirmDelete.projectId);
    if (project) {
      const newFiles = project.files.filter((_, i) => i !== confirmDelete.fileIndex);
      if (newFiles.length === 0) {
        deleteProject(confirmDelete.projectId);
      } else {
        updateProject(confirmDelete.projectId, { files: newFiles });
      }
    }
    setConfirmDelete(null);
  };

  if (readerFile && readerData) {
    const totalPages = readerData.type === 'table' ? readerData.pages.length : 1;
    return (
      <div className="doc-reader">
        <div className="doc-reader-toolbar">
          <button className="doc-reader-back" onClick={() => { setReaderFile(null); setReaderData(null); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            返回
          </button>
          <span className="doc-reader-filename">{readerFile.name}</span>
          <div className="doc-reader-actions">
            <button className="doc-reader-action-btn" onClick={() => handleDownload(readerFile)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              下载
            </button>
            <button className="doc-reader-action-btn danger" onClick={() => handleDelete(readerFile)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              删除
            </button>
          </div>
        </div>

        <div className="doc-reader-body">
          {readerData.type === 'table' && totalPages > 1 && (
            <div className="doc-reader-sidebar">
              {readerData.pages.map((_, i) => (
                <div
                  key={i}
                  className={`doc-reader-sidebar-item ${i === readerPage ? 'active' : ''}`}
                  onClick={() => setReaderPage(i)}
                >
                  <div className="doc-reader-sidebar-thumb">
                    <span>{i + 1}</span>
                  </div>
                  <div className="doc-reader-sidebar-label">第 {i + 1} 页</div>
                </div>
              ))}
            </div>
          )}

          <div className="doc-reader-content">
            {readerData.type === 'table' && (
              <div className="doc-reader-table-wrap">
                <table className="home-preview-table">
                  <thead>
                    <tr>
                      {readerData.headers ? readerData.headers.map((h, i) => <th key={i}>{h}</th>) : <th>数据</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(readerData.pages[readerPage] || []).map((e, i) => (
                      <tr key={i}>
                        {readerData.headers && e.raw ? (
                          readerData.headers.map((h, hi) => <td key={hi}>{e.raw[hi] != null ? String(e.raw[hi]) : '-'}</td>)
                        ) : (
                          <>
                            <td>{e.date || '-'}</td>
                            <td>{e.description || e.counterparty || '-'}</td>
                            <td>{(e.amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {readerData.type === 'pdf' && (
              <iframe src={readerData.url} className="doc-reader-iframe" title={readerFile.name} />
            )}
            {readerData.type === 'image' && (
              <div className="doc-reader-image-wrap">
                <img src={readerData.url} alt={readerFile.name} />
              </div>
            )}

            {readerData.type === 'table' && totalPages > 1 && (
              <div className="doc-reader-pagination">
                <button disabled={readerPage <= 0} onClick={() => setReaderPage(p => p - 1)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <span>{readerPage + 1} / {totalPages}</span>
                <button disabled={readerPage >= totalPages - 1} onClick={() => setReaderPage(p => p + 1)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {confirmDelete && (
          <div className="nav-confirm-overlay" onClick={() => setConfirmDelete(null)}>
            <div className="nav-confirm-dialog" onClick={e => e.stopPropagation()}>
              <div className="nav-confirm-title">确认删除</div>
              <div className="nav-confirm-desc">删除「{confirmDelete.name}」后将无法恢复</div>
              <div className="nav-confirm-actions">
                <button className="nav-confirm-cancel" onClick={() => setConfirmDelete(null)}>取消</button>
                <button className="nav-confirm-ok" onClick={confirmDeleteFile}>删除</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (allFiles.length === 0) {
    return (
      <div className="ws-page-v2">
        <div className="nav-page-header">
          <h2 className="nav-page-title">文档管理</h2>
        </div>
        <div className="ws-records-empty" style={{ marginTop: 80 }}>
          <div className="ws-records-empty-icon">📁</div>
          <div className="ws-records-empty-text">暂无文档</div>
          <div className="ws-records-empty-hint">上传的对账文件将自动归档在这里，方便随时复用</div>
          <button className="nav-empty-cta" onClick={() => onSwitchNav('workspace')}>去上传文件</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ws-page-v2">
      <div className="nav-page-header">
        <h2 className="nav-page-title">文档管理</h2>
      </div>

      <section className="ws-stats-row">
        <div className="ws-stat-card">
          <div className="ws-stat-card-value">{stats.total}</div>
          <div className="ws-stat-card-label">总文件数</div>
        </div>
        <div className="ws-stat-card">
          <div className="ws-stat-card-value" style={{ color: '#217346' }}>{stats.excel}</div>
          <div className="ws-stat-card-label">Excel</div>
        </div>
        <div className="ws-stat-card">
          <div className="ws-stat-card-value" style={{ color: '#E53935' }}>{stats.pdf}</div>
          <div className="ws-stat-card-label">PDF</div>
        </div>
        <div className="ws-stat-card">
          <div className="ws-stat-card-value" style={{ color: '#7C4DFF' }}>{stats.image}</div>
          <div className="ws-stat-card-label">图片</div>
        </div>
      </section>

      <section className="docs-grid-section">
        <div className="docs-grid-toolbar">
          <div className="ws-filter-tabs">
            {[
              { key: 'all', label: '全部' },
              { key: 'excel', label: 'Excel' },
              { key: 'pdf', label: 'PDF' },
              { key: 'image', label: '图片' },
            ].map(tab => (
              <button key={tab.key} className={`ws-filter-tab ${filter === tab.key ? 'active' : ''}`} onClick={() => setFilter(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="ws-search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="text" placeholder="搜索文件名..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="docs-grid">
            {filtered.map((file, i) => {
              const type = getFileType(file.name);
              const key = `${file.projectId}-${file.fileIndex}`;
              const thumbUrl = thumbnails[key];
              const isMenuOpen = menuOpen === key;
              return (
                <div key={key} className="docs-card" onClick={() => openReader(file)}>
                  <div className={`docs-card-thumb ${type}`}>
                    {type === 'image' && thumbUrl ? (
                      <img src={thumbUrl} alt={file.name} />
                    ) : type === 'excel' ? (
                      <div className="docs-card-thumb-icon">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" fill="#217346"/><path d="M7 7h4v3H7zm0 4h4v3H7zm0 4h4v2H7zm5-8h5v3h-5zm0 4h5v3h-5zm0 4h5v2h-5z" fill="rgba(255,255,255,0.8)"/></svg>
                        <span className="docs-card-thumb-ext">XLSX</span>
                      </div>
                    ) : type === 'pdf' ? (
                      <div className="docs-card-thumb-icon">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><rect x="3" y="2" width="18" height="20" rx="2" fill="#E53935"/><path d="M8 8h8M8 11h8M8 14h5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/></svg>
                        <span className="docs-card-thumb-ext">PDF</span>
                      </div>
                    ) : (
                      <div className="docs-card-thumb-icon">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" fill="#7C4DFF"/><circle cx="9" cy="9" r="2" fill="rgba(255,255,255,0.7)"/><path d="M3 16l5-5 3 3 4-4 6 6v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3z" fill="rgba(255,255,255,0.3)"/></svg>
                        <span className="docs-card-thumb-ext">IMG</span>
                      </div>
                    )}
                  </div>
                  <div className="docs-card-info">
                    <div className="docs-card-name" title={file.name}>{file.name}</div>
                    <div className="docs-card-meta">
                      {file.entryCount > 0 && <span>{file.entryCount}条</span>}
                      {file.entryCount > 0 && <span>·</span>}
                      <span>{formatDate(file.uploadedAt)}</span>
                      {file.size > 0 && <><span>·</span><span>{formatSize(file.size)}</span></>}
                    </div>
                  </div>
                  <button
                    className="docs-card-menu-btn"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(isMenuOpen ? null : key); }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                  </button>
                  {isMenuOpen && (
                    <div className="docs-card-menu" onClick={e => e.stopPropagation()}>
                      <div className="docs-card-menu-item" onClick={() => handleRename(file)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        重命名
                      </div>
                      <div className="docs-card-menu-item" onClick={() => handleDownload(file)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        下载
                      </div>
                      <div className="docs-card-menu-item danger" onClick={() => handleDelete(file)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        删除
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="nav-table-empty">没有匹配的文件</div>
        )}
      </section>

      {renameTarget && (
        <div className="nav-confirm-overlay" onClick={() => setRenameTarget(null)}>
          <div className="nav-confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="nav-confirm-title">重命名文件</div>
            <div style={{ marginBottom: 16 }}>
              <input
                className="docs-rename-input"
                type="text"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmRename(); }}
                autoFocus
              />
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
                扩展名将保持不变：{renameTarget.name.includes('.') ? '.' + renameTarget.name.split('.').pop() : ''}
              </div>
            </div>
            <div className="nav-confirm-actions">
              <button className="nav-confirm-cancel" onClick={() => setRenameTarget(null)}>取消</button>
              <button className="nav-confirm-ok" style={{ background: 'var(--accent)' }} onClick={confirmRename}>确认</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="nav-confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="nav-confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="nav-confirm-title">确认删除</div>
            <div className="nav-confirm-desc">删除「{confirmDelete.name}」后将无法恢复</div>
            <div className="nav-confirm-actions">
              <button className="nav-confirm-cancel" onClick={() => setConfirmDelete(null)}>取消</button>
              <button className="nav-confirm-ok" onClick={confirmDeleteFile}>删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SCENARIO_DATA = [
  {
    id: 'bank_recon',
    icon: '🏦',
    name: '银行对账',
    parties: '银行流水 vs 企业账簿',
    frequency: '月度',
    complexity: '低',
    documents: ['银行对账单', '银行回单', '记账凭证'],
    description: '每月核对银行对账单与企业记账凭证，确认资金收支一致。最常见的对账场景，几乎所有企业每月必做。',
    diffReason: '未达账项——银行已入账企业未入账（在途款），或企业已入账银行未入账（未兑现支票）。',
    process: ['上传银行流水 + 企业账簿', 'AI 识别日期/金额/摘要/对方户名', '三轮匹配（精确 → 模糊 → 语义）', '生成余额调节表，标注未达账项'],
    csValue: '银行流水纸质件多，CS 扫描全能王可直接拍照识别导入，省去手动录入。AI 智能匹配替代人工逐笔比对，月末对账从 2 小时缩短到 30 秒。',
    demoFiles: [
      { name: '招商银行流水_星辰科技_202603', role: '银行流水', img: '/scenario-docs/bank_recon_a.png' },
      { name: '企业账簿_星辰科技_202603', role: '企业账簿', img: '/scenario-docs/bank_recon_b.png' },
    ],
    demoResult: { matchRate: 84.2, matched: 16, unmatched: 3, diffs: ['银行手续费：企业未入账（¥35）', '客户回款：银行已收，企业次月入账（¥45,000）', '域名续费+ESS证书：银行已扣，企业未记账（¥1,280）'] },
    demoId: 'bank_recon',
  },
  {
    id: 'partner_recon',
    icon: '🤝',
    name: '往来对账',
    parties: '企业 vs 供应商/客户',
    frequency: '月度/季度',
    complexity: '中',
    documents: ['采购单', '送货单', '对账单', '发票'],
    description: '与供应商或客户定期核对应付/应收账款余额，确认双方账目一致。常见于有大量供应商往来的制造业和贸易公司。',
    diffReason: '入账时间差（对方已发货未到）、价格调整未同步、退货/折让未及时冲账。',
    process: ['上传企业采购/销售记录 + 对方对账单', 'AI 识别单号/金额/日期/客户名', '按单号精确匹配 + 按金额模糊匹配', '生成差异明细和余额核对表'],
    csValue: '供应商对账单常为纸质或 PDF 格式，CS 扫描全能王一拍即识，自动提取表格数据。免去手动抄写和逐行比对。',
    demoFiles: [
      { name: '企业采购记录_深圳鑫达电子_202603', role: '企业记录', img: '/scenario-docs/partner_recon_a.png' },
      { name: '供应商对账单_深圳鑫达电子_202603', role: '供应商对账', img: '/scenario-docs/partner_recon_b.png' },
    ],
    demoResult: { matchRate: 78.5, matched: 8, unmatched: 3, diffs: ['退货 RET-2026-0318：企业已冲账，供应商未处理（¥7,500）', '采购 PO-2026-0310：供应商已发货，企业未收货入账（¥18,900）', '价格调整：合同变更后单价不一致（差额 ¥2,100）'] },
    demoId: null,
  },
  {
    id: 'invoice_verify',
    icon: '🧾',
    name: '发票核验',
    parties: '发票 vs 合同 vs 入库单',
    frequency: '逐笔',
    complexity: '高',
    documents: ['增值税发票', '采购合同', '入库验收单'],
    description: '三单匹配：逐笔核验发票金额是否与合同约定和实际入库数量一致。是财务合规的核心环节，审计重点关注。',
    diffReason: '发票金额与合同不符、入库数量短少、税率适用错误、跨期开票。',
    process: ['上传增值税发票 + 合同 + 入库验收单', 'AI 识别发票号/合同号/品名/数量/金额', '三方交叉匹配（发票↔合同↔入库）', '输出匹配报告，标注差异项和风险点'],
    csValue: '三单匹配强依赖单据识别能力，CS 扫描全能王可精准识别发票、合同表格和入库单，三方数据自动串联比对。',
    demoFiles: [
      { name: '增值税发票_202603', role: '发票', img: '/scenario-docs/invoice_verify_a.png' },
      { name: '采购合同_202603', role: '合同', img: '/scenario-docs/invoice_verify_b.png' },
      { name: '入库验收单_202603', role: '入库单', img: '/scenario-docs/invoice_verify_c.png' },
    ],
    demoResult: { matchRate: 76.5, matched: 4, unmatched: 2, diffs: ['入库数量短少：合同约定 500 台，实收 480 台', '税率差异：合同约定 13%，发票开具 9%（需确认适用税率）'] },
    demoId: 'invoice_verify',
  },
  {
    id: 'expense_recon',
    icon: '💳',
    name: '费用报销',
    parties: '报销单 vs 发票 vs 银行付款',
    frequency: '随时',
    complexity: '中',
    documents: ['费用报销单', '发票', '出差审批单', '银行回单'],
    description: '核验员工报销申请是否有对应发票支撑，以及银行实际付款是否与审批金额一致。票据量大且类型杂，手工核对极易出错。',
    diffReason: '发票金额与报销金额不符、重复报销、超标报销、付款金额与审批不一致。',
    process: ['上传报销单 + 发票 + 银行付款记录', 'AI 识别报销单号/发票号/金额/日期', '报销↔发票↔付款三方匹配', '输出异常清单（超标/缺票/重复）'],
    csValue: '报销票据种类多（餐饮/交通/住宿/办公），CS 全能王一扫全识别，自动分类归集。大批量票据秒级完成比对。',
    demoFiles: [
      { name: '费用报销单_星辰科技_202603', role: '报销单', img: '/scenario-docs/expense_recon_a.png' },
      { name: '发票_星辰科技_202603', role: '发票', img: '/scenario-docs/expense_recon_b.png' },
      { name: '银行付款回单_202603', role: '银行付款', img: '/scenario-docs/expense_recon_c.png' },
    ],
    demoResult: { matchRate: 91.7, matched: 11, unmatched: 1, diffs: ['差旅报销 EXP-2026-008：报销金额 ¥3,200 但发票合计仅 ¥2,850（差额 ¥350 无票据支撑）'] },
    demoId: 'expense_recon',
  },
  {
    id: 'cash_recon',
    icon: '💰',
    name: '现金对账',
    parties: '现金日记账 vs 实际盘点',
    frequency: '日/周',
    complexity: '低',
    documents: ['收据', '付款凭证', '现金盘点表'],
    description: '核对现金日记账余额与实际库存现金是否一致。适用于有大量现金交易的零售、餐饮等行业。',
    diffReason: '记账遗漏、找零误差、白条抵库、盘点计数错误。',
    process: ['上传现金日记账 + 盘点表', 'AI 识别日期/摘要/收支金额/余额', '逐日余额对比，定位差异日期', '输出差异明细和可能原因分析'],
    csValue: '手写收据多，CS 扫描全能王的手写体识别能力可快速数字化纸质凭证。',
    demoFiles: [
      { name: '现金日记账_202603', role: '日记账', img: '/scenario-docs/cash_recon_a.png' },
      { name: '现金盘点表_20260331', role: '盘点表', img: '/scenario-docs/cash_recon_b.png' },
    ],
    demoResult: { matchRate: 95.0, matched: 28, unmatched: 2, diffs: ['3月15日零星采购：日记账记录 ¥280，但无对应收据', '3月28日盘点差额：账面余额 ¥12,350 vs 实盘 ¥12,300（差 ¥50）'] },
    demoId: null,
  },
  {
    id: 'tax_recon',
    icon: '📋',
    name: '税务对账',
    parties: '企业账簿 vs 税务申报',
    frequency: '月度/季度',
    complexity: '高',
    documents: ['纳税申报表', '完税证明', '发票汇总'],
    description: '核对企业账面税金与税务局申报数据是否一致。季度/年度汇算清缴前的必要动作，确保税务合规。',
    diffReason: '进项税转出未同步、免税收入归类错误、跨期发票认证时间差。',
    process: ['上传企业增值税明细 + 纳税申报表', 'AI 识别税种/税率/计税基础/应纳税额', '按税种逐项比对（销项税/进项税/附加税）', '输出税差分析报告'],
    csValue: '部分纳税申报表为扫描件，CS 全能王精准识别表格结构和数字，避免人工誊抄错误。',
    demoFiles: [
      { name: '企业账簿_增值税明细_202603', role: '企业账簿', img: '/scenario-docs/tax_recon_a.png' },
      { name: '增值税申报表_202603', role: '申报表', img: '/scenario-docs/tax_recon_b.png' },
    ],
    demoResult: { matchRate: 88.0, matched: 5, unmatched: 1, diffs: ['进项税差异：账面进项 ¥45,200 vs 申报认证 ¥42,800（差额 ¥2,400 为当月取得次月认证的发票）'] },
    demoId: null,
  },
  {
    id: 'payroll_recon',
    icon: '👥',
    name: '工资对账',
    parties: '工资表 vs 银行代发回单',
    frequency: '月度',
    complexity: '低',
    documents: ['工资表', '银行代发明细', '个税扣缴表'],
    description: '核对 HR 工资表与银行实际代发金额是否一致，确保每位员工实发工资准确到账。',
    diffReason: '银行退汇（账号错误）、代扣代缴差异、离职人员未及时从名单剔除。',
    process: ['上传工资表 + 银行代发明细', 'AI 识别姓名/工号/应发/实发/卡号', '按姓名+金额精确匹配', '输出未匹配名单（退汇/漏发/多发）'],
    csValue: '多为电子数据，CS 全能王可快速识别银行代发回单 PDF，自动提取结构化数据进行比对。',
    demoFiles: [
      { name: '工资表_星辰科技_202603', role: '工资表', img: '/scenario-docs/payroll_recon_a.png' },
      { name: '银行代发明细_星辰科技_202603', role: '银行代发', img: '/scenario-docs/payroll_recon_b.png' },
    ],
    demoResult: { matchRate: 92.3, matched: 12, unmatched: 1, diffs: ['员工吴磊（工号 008）：工资表实发 ¥10,600，银行代发 ¥0（银行退汇，卡号变更未更新）'] },
    demoId: null,
  },
  {
    id: 'asset_recon',
    icon: '🏗',
    name: '固定资产对账',
    parties: '资产台账 vs 实物盘点',
    frequency: '年度',
    complexity: '中',
    documents: ['资产卡片', '盘点表', '采购发票'],
    description: '年度盘点时核对财务系统资产台账与实际在用资产是否一致，发现盘盈盘亏和闲置资产。',
    diffReason: '资产报废未销账、调拨未更新台账、新购资产未及时入账、实物丢失。',
    process: ['上传固定资产台账 + 实物盘点表', 'AI 识别资产编号/名称/规格/存放位置', '按资产编号精确匹配', '输出盘盈/盘亏/状态不符清单'],
    csValue: '盘点表通常为手填纸质表格，CS 全能王可将手写盘点结果快速数字化，与系统台账自动比对。',
    demoFiles: [
      { name: '固定资产台账_星辰科技_2026', role: '资产台账', img: '/scenario-docs/asset_recon_a.png' },
      { name: '实物盘点表_星辰科技_20260331', role: '盘点表', img: '/scenario-docs/asset_recon_b.png' },
    ],
    demoResult: { matchRate: 80.0, matched: 8, unmatched: 2, diffs: ['FA-2023-005（UPS 不间断电源）：台账在册，盘点未发现（疑似报废未销账）', 'FA-2026-007（17寸 PC 显示器）：台账显示"在用"，盘点标注"闲置待处理"'] },
    demoId: null,
  },
];

function ScenariosView({ onSelectDemo, onSwitchNav }) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = SCENARIO_DATA.find(s => s.id === selectedId);

  if (selected) {
    return (
      <div className="ws-page-v2 sc-detail-page">
        <div className="sc-detail-back" onClick={() => setSelectedId(null)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          返回场景列表
        </div>

        <div className="sc-detail-header">
          <span className="sc-detail-icon">{selected.icon}</span>
          <div>
            <h2 className="sc-detail-title">{selected.name}</h2>
            <div className="sc-detail-meta">
              {selected.parties} · {selected.frequency} · 复杂度{selected.complexity}
            </div>
          </div>
        </div>

        <section className="sc-section">
          <h3 className="sc-section-title">场景说明</h3>
          <p className="sc-section-text">{selected.description}</p>
          <p className="sc-section-text sc-diff-reason"><strong>常见差异原因：</strong>{selected.diffReason}</p>
        </section>

        <section className="sc-section">
          <h3 className="sc-section-title">涉及单据</h3>
          <div className="sc-doc-tags">
            {selected.documents.map((doc, i) => (
              <span key={i} className="sc-doc-tag">{doc}</span>
            ))}
          </div>
        </section>

        <section className="sc-section">
          <h3 className="sc-section-title">对账流程</h3>
          <div className="sc-process-steps">
            {selected.process.map((step, i) => (
              <div key={i} className="sc-process-step">
                <span className="sc-process-num">{i + 1}</span>
                <span className="sc-process-text">{step}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="sc-section">
          <h3 className="sc-section-title">Demo 文件预览</h3>
          <div className="sc-demo-files">
            {selected.demoFiles.map((file, i) => (
              <div key={i} className="sc-demo-file">
                <div className="sc-demo-file-header">
                  <span className="sc-demo-file-role">{file.role}</span>
                  <span className="sc-demo-file-name">{file.name}</span>
                </div>
                <div className="sc-demo-file-preview">
                  <img src={file.img} alt={file.name} className="sc-demo-file-img" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="sc-section">
          <h3 className="sc-section-title">对账结果示例</h3>
          <div className="sc-result-card">
            <div className="sc-result-stats">
              <div className="sc-result-stat">
                <div className="sc-result-stat-value">{selected.demoResult.matchRate}%</div>
                <div className="sc-result-stat-label">匹配率</div>
              </div>
              <div className="sc-result-stat">
                <div className="sc-result-stat-value">{selected.demoResult.matched}</div>
                <div className="sc-result-stat-label">已匹配</div>
              </div>
              <div className="sc-result-stat">
                <div className="sc-result-stat-value sc-result-stat-warn">{selected.demoResult.unmatched}</div>
                <div className="sc-result-stat-label">未匹配</div>
              </div>
            </div>
            <div className="sc-result-diffs">
              <div className="sc-result-diffs-title">差异原因分析：</div>
              {selected.demoResult.diffs.map((d, i) => (
                <div key={i} className="sc-result-diff-item">· {d}</div>
              ))}
            </div>
          </div>
        </section>

        <section className="sc-section">
          <h3 className="sc-section-title">CS 切入价值</h3>
          <p className="sc-section-text sc-value-text">{selected.csValue}</p>
        </section>

        {selected.demoId && (
          <div className="sc-cta-area">
            <button className="sc-cta-btn" onClick={() => { onSelectDemo(selected.demoId); onSwitchNav('workspace'); }}>
              ▶ 用 Demo 数据体验{selected.name}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ws-page-v2">
      <div className="nav-page-header">
        <h2 className="nav-page-title">对账场景</h2>
        <p className="sc-subtitle">覆盖企业日常 8 大对账场景，AI 自动识别单据并智能匹配</p>
      </div>

      <div className="sc-grid">
        {SCENARIO_DATA.map(s => (
          <div key={s.id} className="sc-card" onClick={() => setSelectedId(s.id)}>
            <div className="sc-card-icon">{s.icon}</div>
            <div className="sc-card-name">{s.name}</div>
            <div className="sc-card-parties">{s.parties}</div>
            <div className="sc-card-tags">
              <span className="sc-card-tag">{s.frequency}</span>
              <span className={`sc-card-tag sc-complexity-${s.complexity}`}>复杂度{s.complexity}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HelpView() {
  return (
    <div className="ws-page-v2">
      <div className="ws-header-v2">
        <h1 className="ws-title-v2">使用帮助</h1>
        <p className="ws-subtitle-v2">快速了解 CS 智能对账的核心功能</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
        {[
          { q: '如何开始对账？', a: '点击侧边栏「新建对账」按钮，上传文件或选择 Demo 数据即可快速体验。' },
          { q: '支持哪些文件格式？', a: '支持 Excel（.xlsx/.xls）、CSV、PDF 和图片（JPG/PNG）格式的财务单据。' },
          { q: '什么是 AI 智能匹配？', a: '系统通过三轮匹配（精确→模糊→语义）自动对比两方或三方数据，找出匹配项和差异项。' },
          { q: '如何查看历史报告？', a: '在「报告中心」页面可查看所有已完成的对账报告，支持筛选和导出。' },
          { q: '文件会被保存吗？', a: '文件仅存储在浏览器本地（IndexedDB），不会上传到服务器，清除浏览器数据后将丢失。' },
          { q: '对账结果不准确怎么办？', a: '在结果页可手动确认或拒绝每条匹配，也可以进行手动匹配来修正 AI 的判断。' },
        ].map((item, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{item.q}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage({ parsedFiles, isProcessing, error, scenarioId, detectedScenarioId, periodStart, periodEnd, onAddFiles, onRemoveFile, onAssignRole, onSelectScenario, onSetPeriod, onSelectDemo, onConfirmData, onLoadHistory, onUpdateMapping, onBackToToolbox, projectsHook, onOpenProject, navPage, setNavPage }) {
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

  // === Non-workspace pages (must be checked before hasFiles early return) ===
  if (navPage === 'reports') {
    return <ReportsView projectsHook={projectsHook} onOpenProject={onOpenProject} onSwitchNav={setNavPage} />;
  }
  if (navPage === 'docs') {
    return <DocsView projectsHook={projectsHook} onOpenProject={onOpenProject} onSwitchNav={setNavPage} onAddFiles={onAddFiles} />;
  }
  if (navPage === 'scenarios') {
    return <ScenariosView onSelectDemo={onSelectDemo} onSwitchNav={setNavPage} />;
  }
  if (navPage === 'help') {
    return <HelpView />;
  }

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

      {/* B) Upload zone + Demo scenarios */}
      <section className="ws-start-section">
        <div
          ref={uploadZoneRef}
          className={`ws-upload-zone ${dragOver || demoAnim ? 'ws-upload-zone-active' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="ws-upload-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div className="ws-upload-text">点击或拖拽上传文件开始对账</div>
          <div className="ws-upload-hint">支持 Excel / CSV / PDF / 图片，至少上传 2 个文件</div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
          />
        </div>

        <div className="ws-demo-section">
          <div className="ws-demo-label">或选择体验案例快速了解</div>
          <div className="ws-demo-cards">
            {DEMOS.map(d => (
              <button key={d.id} className="ws-demo-card" onClick={(e) => handleDemoClick(d.id, e)}>
                <span className="ws-demo-card-icon">{DEMO_ICONS[d.id] || '📊'}</span>
                <div className="ws-demo-card-info">
                  <div className="ws-demo-card-name">{d.name}</div>
                  <div className="ws-demo-card-desc">{d.fileNames?.length || 2} 个示例文件</div>
                </div>
              </button>
            ))}
          </div>
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
