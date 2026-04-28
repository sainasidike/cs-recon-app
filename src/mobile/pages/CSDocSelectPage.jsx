import { useState } from 'react';
import { MOCK_FOLDERS, MOCK_DOCUMENTS } from '../data/mockDocuments';

export default function CSDocSelectPage({ currentDocId, onCancel, onConfirm }) {
  const [selected, setSelected] = useState(new Set());

  const toggleDoc = (docId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const selectableDocs = MOCK_DOCUMENTS.filter(d => d.id !== currentDocId);
  const selectedCount = selected.size;

  return (
    <div className="cs-select-page">
      {/* Header */}
      <div className="cs-select-nav">
        <div className="cs-select-nav-title">选择文档</div>
        <button className="cs-select-nav-cancel" onClick={onCancel}>取消</button>
      </div>

      <div className="cs-select-body">
        {/* Folders */}
        {MOCK_FOLDERS.map(folder => (
          <div key={folder.id} className="cs-select-folder-item">
            <div className={`cs-select-folder-icon ${folder.type === 'device' ? 'device' : folder.locked ? 'locked' : ''}`}>
              {folder.type === 'device' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="2" width="14" height="20" rx="2" fill="#5B8DEF" opacity="0.15"/>
                  <rect x="5" y="2" width="14" height="20" rx="2" stroke="#5B8DEF" strokeWidth="1.2" fill="none"/>
                  <rect x="10" y="18" width="4" height="1.5" rx="0.75" fill="#5B8DEF"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" fill="#3DD598" opacity="0.2" stroke="#3DD598" strokeWidth="1.2"/>
                  {folder.locked && <rect x="10" y="10" width="4" height="5" rx="1" fill="#3DD598" opacity="0.6"/>}
                </svg>
              )}
            </div>
            <div className="cs-select-folder-info">
              <div className="cs-select-folder-name">{folder.name}</div>
              <div className="cs-select-folder-meta">
                {folder.subtitle || `${folder.date}  |  ☐ ${folder.count}`}
              </div>
            </div>
            {folder.type === 'device' && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            )}
          </div>
        ))}

        {/* Documents */}
        {selectableDocs.map(doc => {
          const isChecked = selected.has(doc.id);
          return (
            <div key={doc.id} className="cs-select-doc-item" onClick={() => toggleDoc(doc.id)}>
              <DocThumb type={doc.thumbType} />
              <div className="cs-select-doc-info">
                <div className="cs-select-doc-name">{doc.name}</div>
                <div className="cs-select-doc-meta">{doc.date}  |  ☐ {doc.pages}</div>
              </div>
              <div className={`cs-select-checkbox ${isChecked ? 'checked' : ''}`}>
                {isChecked && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom bar */}
      <div className="cs-select-bottom">
        <button
          className="cs-select-confirm-btn"
          disabled={selectedCount === 0}
          onClick={() => {
            const docs = MOCK_DOCUMENTS.filter(d => selected.has(d.id));
            onConfirm(docs);
          }}
        >
          合并 ({selectedCount})
        </button>
      </div>
    </div>
  );
}

function DocThumb({ type }) {
  if (type === 'excel') {
    return (
      <div className="cs-select-thumb excel">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="3" fill="#217346"/>
          <text x="12" y="15" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">X</text>
        </svg>
      </div>
    );
  }
  if (type === 'word') {
    return (
      <div className="cs-select-thumb word">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="3" fill="#2B579A"/>
          <text x="12" y="15" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">W</text>
        </svg>
      </div>
    );
  }
  return (
    <div className="cs-select-thumb scan">
      <div className="cs-thumb-lines"><div /><div /><div /><div /></div>
    </div>
  );
}
