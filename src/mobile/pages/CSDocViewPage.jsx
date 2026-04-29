import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { classifyFromText } from './CSAnalyzingPage';

function getFileType(file) {
  if (file.type) {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.includes('spreadsheet') || file.type.includes('excel') || file.type === 'text/csv') return 'spreadsheet';
  }
  const ext = (file.name || '').split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'spreadsheet';
  return 'unknown';
}

export default function CSDocViewPage({ files, showReconBtn, onBack, onReconciliation }) {
  const primaryFile = files && files.length > 0 ? files[0] : null;
  const fileType = primaryFile ? getFileType(primaryFile) : 'unknown';
  const isSpreadsheet = fileType === 'spreadsheet';

  const classification = primaryFile ? classifyFromText(primaryFile.name) : null;
  const title = classification
    ? classification.label
    : primaryFile
      ? primaryFile.name.replace(/\.[^.]+$/, '')
      : '文档';

  const [imageUrl, setImageUrl] = useState(null);
  const [tableData, setTableData] = useState(null);

  useEffect(() => {
    if (!primaryFile) return;
    if (fileType === 'image' || fileType === 'pdf') {
      const url = URL.createObjectURL(primaryFile);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [primaryFile, fileType]);

  useEffect(() => {
    if (!primaryFile || !isSpreadsheet) return;
    const ext = (primaryFile.name || '').split('.').pop().toLowerCase();

    if (ext === 'csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const rows = text.split(/\r?\n/).filter(line => line.trim());
          const data = rows.map(row => row.split(','));
          setTableData(data);
        } catch (err) {
          console.error('CSV parse error:', err);
        }
      };
      reader.readAsText(primaryFile, 'UTF-8');
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
          setTableData(data);
        } catch (err) {
          console.error('Parse error:', err);
        }
      };
      reader.readAsArrayBuffer(primaryFile);
    }
  }, [primaryFile, isSpreadsheet]);

  if (!primaryFile) {
    return (
      <div className="cs-screenshot-page">
        <img src="/cs-docview.jpg" alt="文档预览" className="cs-screenshot-bg" />
        <div className="cs-hotzone" style={{ top: '5.5%', left: '0', width: '15%', height: '4%' }} onClick={onBack} />
        {showReconBtn && (
          <div className="cs-recon-overlay">
            <button className="cs-recon-btn" onClick={onReconciliation}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.8">
                <path d="M9 2H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 2v6h12M3 8v12a2 2 0 002 2h14a2 2 0 002-2V8"/>
                <path d="M8 14l2.5 2.5L16 11" strokeWidth="2.2"/>
              </svg>
              <span>财务对账</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  if (isSpreadsheet) {
    return (
      <div className="csdv">
        <div className="csdv-status">
          <span className="csdv-status-time">{new Date().getHours()}:{String(new Date().getMinutes()).padStart(2, '0')}</span>
          <div className="csdv-status-icons">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#1a1a1a"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
            <svg width="20" height="12" viewBox="0 0 24 14" fill="#1a1a1a"><rect x="0" y="2" width="18" height="10" rx="2" fill="none" stroke="#1a1a1a" strokeWidth="1.5"/><rect x="2" y="4" width="10" height="6" rx="1" fill="#1a1a1a"/><rect x="19" y="5" width="3" height="4" rx="1" fill="#1a1a1a"/></svg>
          </div>
        </div>

        <div className="csdv-topbar">
          <div className="csdv-back" onClick={onBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </div>
          <div className="csdv-title-area">
            <span className="csdv-title">{title}</span>
            <span className="csdv-tag">标签+</span>
          </div>
          <div className="csdv-topbar-right" />
        </div>

        <div className="csdv-content csdv-content-sheet">
          {tableData ? (
            <div className="csdv-table-wrap">
              <table className="csdv-table">
                <tbody>
                  {tableData.map((row, ri) => (
                    <tr key={ri} className={ri === 0 ? 'csdv-table-header' : ''}>
                      {row.map((cell, ci) => (
                        ri === 0
                          ? <th key={ci}>{cell != null ? String(cell) : ''}</th>
                          : <td key={ci}>{cell != null ? String(cell) : ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="csdv-loading-data">
              <div className="csdv-loading-spinner" />
              <span>正在解析文档...</span>
            </div>
          )}
        </div>

        <div className="csdv-bottombar csdv-bottombar-sheet">
          <div className="csdv-bottom-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
            </svg>
            <span>在电脑上编辑</span>
          </div>
          <div className="csdv-bottom-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span className="csdv-bottom-label-sm">另存为 PDF</span>
          </div>
          {showReconBtn && (
            <div className="csdv-bottom-item csdv-bottom-recon" onClick={onReconciliation}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
              </svg>
              <span>财务对账</span>
            </div>
          )}
          <div className="csdv-bottom-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#555">
              <circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/>
            </svg>
            <span>更多</span>
          </div>
          <button className="csdv-export-btn">导出文档</button>
        </div>
      </div>
    );
  }

  // Image / PDF view
  return (
    <div className="csdv">
      <div className="csdv-status">
        <span className="csdv-status-time">{new Date().getHours()}:{String(new Date().getMinutes()).padStart(2, '0')}</span>
        <div className="csdv-status-icons">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#1a1a1a"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
          <svg width="20" height="12" viewBox="0 0 24 14" fill="#1a1a1a"><rect x="0" y="2" width="18" height="10" rx="2" fill="none" stroke="#1a1a1a" strokeWidth="1.5"/><rect x="2" y="4" width="10" height="6" rx="1" fill="#1a1a1a"/><rect x="19" y="5" width="3" height="4" rx="1" fill="#1a1a1a"/></svg>
        </div>
      </div>

      <div className="csdv-topbar">
        <div className="csdv-back" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </div>
        <div className="csdv-title-area">
          <span className="csdv-title">{title}</span>
          <span className="csdv-tag">标签+</span>
        </div>
        <div className="csdv-topbar-actions">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="1.8">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="1.8">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#1a1a1a">
            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
          </svg>
        </div>
      </div>

      <div className="csdv-content csdv-content-img">
        <div className="csdv-doc-paper">
          {fileType === 'pdf' ? (
            <object data={imageUrl} type="application/pdf" className="csdv-pdf-embed">
              <div className="csdv-pdf-fallback">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span>PDF 文档</span>
              </div>
            </object>
          ) : imageUrl ? (
            <img src={imageUrl} alt="文档" className="csdv-doc-img" />
          ) : (
            <div className="csdv-pdf-fallback">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span>{primaryFile.name}</span>
            </div>
          )}
        </div>
        <div className="csdv-add-page">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          <span>继续添加页面</span>
        </div>
      </div>

      <div className="csdv-bottombar csdv-bottombar-img">
        <div className="csdv-bottom-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M12 8v8M8 12h8"/>
          </svg>
          <span>添加</span>
        </div>
        <div className="csdv-bottom-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <span>编辑</span>
        </div>
        <div className="csdv-bottom-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          <span>分享</span>
        </div>
        <div className="csdv-bottom-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="2" width="18" height="20" rx="2" stroke="#555" strokeWidth="1.3"/>
            <text x="12" y="15" textAnchor="middle" fill="#555" fontSize="8" fontWeight="700">W</text>
          </svg>
          <span>转 Word</span>
        </div>
        {showReconBtn ? (
          <div className="csdv-bottom-item csdv-bottom-recon" onClick={onReconciliation}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="2" width="18" height="20" rx="2" stroke="#3DD598" strokeWidth="1.3"/>
              <text x="12" y="15" textAnchor="middle" fill="#3DD598" fontSize="7" fontWeight="700">Excel</text>
            </svg>
            <span>财务对账</span>
          </div>
        ) : (
          <div className="csdv-bottom-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="2" width="18" height="20" rx="2" stroke="#555" strokeWidth="1.3"/>
              <text x="12" y="15" textAnchor="middle" fill="#555" fontSize="7" fontWeight="700">Excel</text>
            </svg>
            <span>转 Excel</span>
          </div>
        )}
      </div>
    </div>
  );
}
