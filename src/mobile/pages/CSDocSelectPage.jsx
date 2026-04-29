import { useState, useRef } from 'react';
import { MOCK_FOLDERS, MOCK_DOCUMENTS } from '../data/mockDocuments';
import { BUILTIN_FINANCIAL_DOCS, builtinDocToFile } from '../data/embeddedFiles';

function FileIcon({ type, size = 40 }) {
  if (type === 'csv' || type === 'excel') {
    return (
      <div style={{ width: size, height: size, borderRadius: 8, background: 'rgba(33,115,70,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="2" width="18" height="20" rx="2" stroke="#217346" strokeWidth="1.5" />
          <text x="12" y="15" textAnchor="middle" fill="#217346" fontSize="8" fontWeight="700">CSV</text>
        </svg>
      </div>
    );
  }
  if (type === 'word') {
    return (
      <div style={{ width: size, height: size, borderRadius: 8, background: 'rgba(43,87,154,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="2" width="18" height="20" rx="2" stroke="#2B579A" strokeWidth="1.5" />
          <text x="12" y="15" textAnchor="middle" fill="#2B579A" fontSize="8" fontWeight="700">W</text>
        </svg>
      </div>
    );
  }
  if (type === 'scan' || type === 'scan-finance') {
    return (
      <div style={{ width: size, height: size, borderRadius: 8, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: 8, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    </div>
  );
}

function FolderIcon({ locked }) {
  return (
    <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(61,213,152,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#3DD598" stroke="none">
        <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
      </svg>
      {locked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" style={{ position: 'absolute', marginTop: 14, marginLeft: 14 }}>
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      )}
    </div>
  );
}

function Checkbox({ checked, onChange }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`m-select-item-check ${checked ? 'checked' : ''}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

export default function CSDocSelectPage({ onCancel, onAddMore, onConfirm, uploadedFiles }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const fileInputRef = useRef(null);

  const allDocs = [
    ...BUILTIN_FINANCIAL_DOCS.map(d => ({ ...d, source: 'builtin' })),
    ...MOCK_DOCUMENTS.map(d => ({ ...d, source: 'mock' })),
  ];

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedCount = selectedIds.size;

  const handleConfirm = () => {
    const selectedBuiltins = BUILTIN_FINANCIAL_DOCS.filter(d => selectedIds.has(d.id));
    if (selectedBuiltins.length > 0) {
      const files = selectedBuiltins.map(builtinDocToFile);
      if (onAddMore) onAddMore(files);
    }
    onConfirm();
  };

  const handleUploadLocal = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0 && onAddMore) onAddMore(files);
    e.target.value = '';
  };

  const hasUploadedFiles = uploadedFiles && uploadedFiles.length > 0;

  return (
    <div className="m-select-page">
      {/* Header */}
      <div className="m-select-header">
        <div style={{ width: 60 }} />
        <div className="m-select-title">选择文档</div>
        <button className="m-select-cancel" onClick={onCancel}>取消</button>
      </div>

      {/* My Device row */}
      <div style={{ padding: '8px 0' }}>
        <div
          className="m-select-item"
          style={{ background: 'rgba(43,87,154,0.06)', margin: '0 16px', borderRadius: 12, padding: '12px 14px' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#2B579A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <rect x="5" y="2" width="14" height="20" rx="3" /><line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
          <div className="m-select-item-info">
            <div className="m-select-item-name">我的设备</div>
            <div className="m-select-item-meta" style={{ color: '#2B579A' }}>上传本地文件</div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {/* Folders */}
      <div style={{ padding: '4px 0' }}>
        {MOCK_FOLDERS.filter(f => f.type !== 'device').map(folder => (
          <div key={folder.id} className="m-select-item" style={{ opacity: 0.5 }}>
            <FolderIcon locked={folder.locked} />
            <div className="m-select-item-info">
              <div className="m-select-item-name">{folder.name}</div>
              <div className="m-select-item-meta">{folder.date}{folder.count ? ` | ${folder.count} 页` : ''}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 8, background: '#f2f3f5' }} />

      {/* Financial docs section */}
      {BUILTIN_FINANCIAL_DOCS.length > 0 && (
        <>
          <div style={{ padding: '12px 16px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="2">
              <path d="M9 2H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 2v6h12M3 8v12a2 2 0 002 2h14a2 2 0 002-2V8" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#3DD598' }}>财务文档</span>
          </div>
          {BUILTIN_FINANCIAL_DOCS.map(doc => (
            <div
              key={doc.id}
              className="m-select-item"
              onClick={() => toggleSelect(doc.id)}
              style={{ background: selectedIds.has(doc.id) ? 'rgba(61,213,152,0.04)' : undefined }}
            >
              <FileIcon type={doc.thumbType} size={48} />
              <div className="m-select-item-info">
                <div className="m-select-item-name">{doc.shortName}</div>
                <div className="m-select-item-meta">
                  {doc.date} | {doc.pages} 条
                  <span style={{
                    marginLeft: 6,
                    fontSize: 10,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: 'rgba(61,213,152,0.1)',
                    color: '#3DD598',
                    fontWeight: 600,
                  }}>
                    {doc.categoryLabel}
                  </span>
                </div>
              </div>
              <Checkbox
                checked={selectedIds.has(doc.id)}
                onChange={() => toggleSelect(doc.id)}
              />
            </div>
          ))}
          <div style={{ height: 8, background: '#f2f3f5' }} />
        </>
      )}

      {/* Regular documents */}
      <div style={{ paddingBottom: 90 }}>
        {MOCK_DOCUMENTS.map(doc => (
          <div
            key={doc.id}
            className="m-select-item"
            style={{ opacity: doc.isFinancial ? 1 : 0.55 }}
          >
            <FileIcon type={doc.thumbType} size={48} />
            <div className="m-select-item-info">
              <div className="m-select-item-name">{doc.name}</div>
              <div className="m-select-item-meta">{doc.date} | {doc.pages} 页</div>
            </div>
            {doc.isFinancial ? (
              <Checkbox
                checked={selectedIds.has(doc.id)}
                onChange={() => toggleSelect(doc.id)}
              />
            ) : (
              <div style={{ width: 22, height: 22, borderRadius: 4, border: '1.5px solid #e0e0e0', opacity: 0.4, flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>

      {/* Bottom action bar */}
      <div className="m-select-bottom">
        {hasUploadedFiles && (
          <div style={{ fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 8 }}>
            已导入 {uploadedFiles.length} 个文件
          </div>
        )}
        <button
          className="m-select-bottom-btn"
          onClick={handleConfirm}
          disabled={selectedCount === 0 && !hasUploadedFiles}
        >
          {selectedCount > 0
            ? `补充 ${selectedCount} 个文档并开始对账`
            : hasUploadedFiles
              ? '开始对账'
              : '请选择文档'
          }
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png"
        style={{ display: 'none' }}
        onChange={handleUploadLocal}
      />
    </div>
  );
}
