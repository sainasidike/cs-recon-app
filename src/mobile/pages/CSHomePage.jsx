import { MOCK_DOCUMENTS } from '../data/mockDocuments';

const FEATURES_ROW1 = [
  { id: 'scan', label: '智能扫描' },
  { id: 'photo', label: '导入图片' },
  { id: 'doc', label: '导入文档' },
  { id: 'pdf', label: 'PDF 工具包' },
];
const FEATURES_ROW2 = [
  { id: 'id', label: '扫描证件' },
  { id: 'ocr', label: '提取文字' },
  { id: 'word', label: '拍图转 Word', hot: true },
  { id: 'all', label: '全部' },
];

function FeatureIcon({ id }) {
  const size = 44;
  switch (id) {
    case 'scan':
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <rect x="6" y="6" width="13" height="13" rx="3" fill="#3DD598" opacity="0.25"/>
          <rect x="25" y="6" width="13" height="13" rx="3" fill="#3DD598"/>
          <rect x="6" y="25" width="13" height="13" rx="3" fill="#3DD598"/>
          <rect x="25" y="25" width="13" height="13" rx="3" fill="#3DD598" opacity="0.25"/>
          <rect x="10" y="10" width="5" height="5" rx="1" fill="#3DD598"/>
          <rect x="29" y="10" width="5" height="5" rx="1" fill="#fff"/>
          <rect x="10" y="29" width="5" height="5" rx="1" fill="#fff"/>
          <rect x="29" y="29" width="5" height="5" rx="1" fill="#3DD598"/>
        </svg>
      );
    case 'photo':
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <rect x="4" y="8" width="36" height="28" rx="4" fill="#5B8DEF" opacity="0.15"/>
          <rect x="4" y="8" width="36" height="28" rx="4" stroke="#5B8DEF" strokeWidth="1.5" fill="none"/>
          <circle cx="18" cy="22" r="6" fill="#5B8DEF" opacity="0.3"/>
          <path d="M4 28l10-8 8 6 6-4 12 8v2a4 4 0 01-4 4H8a4 4 0 01-4-4v-4z" fill="#5B8DEF" opacity="0.4"/>
          <circle cx="32" cy="15" r="3" fill="#FFD54F"/>
        </svg>
      );
    case 'doc':
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <path d="M10 6h16l10 10v22a4 4 0 01-4 4H10a4 4 0 01-4-4V10a4 4 0 014-4z" fill="#3DD598" opacity="0.15"/>
          <path d="M10 6h16l10 10v22a4 4 0 01-4 4H10a4 4 0 01-4-4V10a4 4 0 014-4z" stroke="#3DD598" strokeWidth="1.5" fill="none"/>
          <path d="M26 6v10h10" stroke="#3DD598" strokeWidth="1.5" fill="none"/>
          <path d="M14 22h16M14 28h12M14 34h8" stroke="#3DD598" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      );
    case 'pdf':
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <rect x="6" y="4" width="32" height="36" rx="4" fill="#E53935"/>
          <path d="M22 4h12a4 4 0 014 4v2L26 4z" fill="#B71C1C" opacity="0.3"/>
          <rect x="11" y="16" width="22" height="16" rx="2" fill="#fff" opacity="0.9"/>
          <text x="22" y="28" textAnchor="middle" fill="#E53935" fontSize="11" fontWeight="800" fontFamily="Arial">PDF</text>
        </svg>
      );
    case 'id':
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <rect x="4" y="10" width="36" height="24" rx="4" fill="#3DD598" opacity="0.15"/>
          <rect x="4" y="10" width="36" height="24" rx="4" stroke="#3DD598" strokeWidth="1.5" fill="none"/>
          <circle cx="16" cy="22" r="5" fill="#3DD598" opacity="0.3"/>
          <circle cx="16" cy="20" r="3" fill="#3DD598" opacity="0.5"/>
          <path d="M11 28c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" stroke="#3DD598" strokeWidth="1.2" fill="none"/>
          <path d="M26 19h10M26 23h8M26 27h6" stroke="#3DD598" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case 'ocr':
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <rect x="6" y="6" width="32" height="32" rx="4" fill="#3DD598" opacity="0.15"/>
          <rect x="6" y="6" width="32" height="32" rx="4" stroke="#3DD598" strokeWidth="1.5" fill="none"/>
          <path d="M14 16h16M14 22h13M14 28h10" stroke="#3DD598" strokeWidth="2" strokeLinecap="round"/>
          <path d="M34 14v16" stroke="#3DD598" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 3"/>
        </svg>
      );
    case 'word':
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <rect x="4" y="6" width="20" height="32" rx="3" fill="#5B8DEF"/>
          <text x="14" y="27" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800" fontFamily="Arial">W</text>
          <rect x="20" y="12" width="18" height="8" rx="2" fill="#5B8DEF" opacity="0.15"/>
          <rect x="20" y="24" width="18" height="8" rx="2" fill="#5B8DEF" opacity="0.15"/>
          <path d="M24 15h10M24 27h10" stroke="#5B8DEF" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      );
    case 'all':
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
          <rect x="6" y="6" width="14" height="14" rx="3" fill="#3DD598"/>
          <rect x="24" y="6" width="14" height="14" rx="3" fill="#5B8DEF"/>
          <rect x="6" y="24" width="14" height="14" rx="3" fill="#FFB74D"/>
          <rect x="24" y="24" width="14" height="14" rx="3" fill="#E57373"/>
        </svg>
      );
    default:
      return <div style={{ width: size, height: size }} />;
  }
}

function DocThumb({ type }) {
  if (type === 'excel' || type === 'scan-finance') {
    return (
      <div className="cs-doc-thumb cs-thumb-file">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <rect x="2" y="2" width="32" height="32" rx="4" fill="#217346"/>
          <text x="18" y="23" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800" fontFamily="Arial">X</text>
        </svg>
      </div>
    );
  }
  if (type === 'word') {
    return (
      <div className="cs-doc-thumb cs-thumb-file">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <rect x="2" y="2" width="32" height="32" rx="4" fill="#2B579A"/>
          <text x="18" y="23" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800" fontFamily="Arial">W</text>
          <text x="30" y="32" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="600" opacity="0.7">cs</text>
        </svg>
      </div>
    );
  }
  return (
    <div className="cs-doc-thumb cs-thumb-scan">
      <div className="cs-thumb-preview">
        <div className="cs-thumb-text-line w90" />
        <div className="cs-thumb-text-line w100" />
        <div className="cs-thumb-text-line w70" />
        <div className="cs-thumb-text-line w85" />
        <div className="cs-thumb-text-line w60" />
        <div className="cs-thumb-text-line w95" />
      </div>
    </div>
  );
}

export default function CSHomePage({ onOpenDocument }) {
  const docs = MOCK_DOCUMENTS;

  return (
    <div className="cs-home">
      <div className="cs-header">
        <div className="cs-header-inner">
          <div className="cs-logo">
            <div className="cs-logo-icon">
              <span className="cs-logo-text">CS</span>
            </div>
            <span className="cs-brand">扫描全能王<sup>™</sup></span>
          </div>
        </div>
        <div className="cs-header-search">
          <div className="cs-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <span>试试搜索应用，如"转 Word"</span>
          </div>
        </div>
      </div>

      <div className="cs-content-area">
        <div className="cs-features">
          <div className="cs-features-row">
            {FEATURES_ROW1.map(f => (
              <div key={f.id} className="cs-feature-item">
                <div className="cs-feature-icon-wrap">
                  <FeatureIcon id={f.id} />
                </div>
                <span className="cs-feature-label">{f.label}</span>
              </div>
            ))}
          </div>
          <div className="cs-features-row">
            {FEATURES_ROW2.map(f => (
              <div key={f.id} className="cs-feature-item">
                <div className="cs-feature-icon-wrap">
                  <FeatureIcon id={f.id} />
                  {f.hot && <span className="cs-feature-hot">HOT</span>}
                </div>
                <span className="cs-feature-label">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cs-divider" />

      <div className="cs-doc-section">
        <div className="cs-section-header">
          <span className="cs-section-title">最近文档</span>
          <span className="cs-section-more">全部文档 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg></span>
        </div>

        <div className="cs-doc-list">
          {docs.map((doc, i) => (
            <div key={doc.id} className="cs-doc-list-item">
              <div className="cs-doc-row" onClick={() => onOpenDocument(doc)}>
                <DocThumb type={doc.thumbType} />
                <div className="cs-doc-info">
                  <div className="cs-doc-name">{doc.name}</div>
                  <div className="cs-doc-meta">{doc.date}  |  ☐ {doc.pages}</div>
                </div>
                <div className="cs-doc-checkbox">
                  <div className="cs-checkbox-box" />
                </div>
              </div>
              {i === 0 && (
                <div className="cs-doc-actions">
                  <button className="cs-action-btn">分享</button>
                  <button className="cs-action-btn cs-action-ai">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" fill="#3DD598"/>
                      <path d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="#3DD598" opacity="0.6"/>
                    </svg>
                    转 Word
                  </button>
                  <button className="cs-action-btn">查看</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="cs-tabbar">
        <div className="cs-tab cs-tab-active">
          <div className="cs-tab-icon-wrap">
            <div className="cs-tab-cs-badge"><span>CS</span></div>
          </div>
          <span className="cs-tab-label cs-tab-label-active">首页</span>
        </div>
        <div className="cs-tab">
          <div className="cs-tab-icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
            </svg>
          </div>
          <span className="cs-tab-label">全部文档</span>
        </div>
        <div className="cs-tab cs-tab-center">
          <div className="cs-camera-btn">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
        </div>
        <div className="cs-tab">
          <div className="cs-tab-icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/>
            </svg>
          </div>
          <span className="cs-tab-label">工具箱</span>
        </div>
        <div className="cs-tab">
          <div className="cs-tab-icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <span className="cs-tab-label">我的</span>
        </div>
      </div>
    </div>
  );
}
