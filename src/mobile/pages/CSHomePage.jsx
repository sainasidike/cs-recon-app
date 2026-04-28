import { MOCK_DOCUMENTS } from '../data/mockDocuments';

const FEATURES = [
  { icon: 'scan', label: '智能扫描' },
  { icon: 'photo', label: '导入图片' },
  { icon: 'doc', label: '导入文档' },
  { icon: 'pdf', label: 'PDF 工具包' },
  { icon: 'id', label: '扫描证件' },
  { icon: 'ocr', label: '提取文字' },
  { icon: 'word', label: '拍图转 Word', hot: true },
  { icon: 'all', label: '全部' },
];

function FeatureIcon({ type }) {
  const colors = {
    scan: '#3DD598', photo: '#5B8DEF', doc: '#3DD598', pdf: '#E53935',
    id: '#3DD598', ocr: '#3DD598', word: '#5B8DEF', all: '#3DD598',
  };
  const color = colors[type] || '#3DD598';

  const icons = {
    scan: <><rect x="3" y="3" width="7" height="7" rx="1" fill={color} opacity="0.3"/><rect x="14" y="3" width="7" height="7" rx="1" fill={color}/><rect x="3" y="14" width="7" height="7" rx="1" fill={color}/><rect x="14" y="14" width="7" height="7" rx="1" fill={color} opacity="0.3"/></>,
    photo: <><rect x="2" y="4" width="20" height="16" rx="2" fill={color} opacity="0.2"/><circle cx="12" cy="12" r="4" fill={color}/><rect x="14" y="5" width="5" height="3" rx="1" fill={color} opacity="0.5"/></>,
    doc: <><rect x="4" y="2" width="16" height="20" rx="2" fill={color} opacity="0.2"/><path d="M8 8h8M8 12h8M8 16h5" stroke={color} strokeWidth="1.5"/></>,
    pdf: <><rect x="3" y="2" width="18" height="20" rx="2" fill={color}/><text x="12" y="15" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">PDF</text></>,
    id: <><rect x="2" y="5" width="20" height="14" rx="2" fill={color} opacity="0.2"/><circle cx="9" cy="12" r="3" fill={color} opacity="0.5"/><path d="M14 10h5M14 13h4" stroke={color} strokeWidth="1.2"/></>,
    ocr: <><rect x="3" y="3" width="18" height="18" rx="2" fill={color} opacity="0.2"/><path d="M7 8h10M7 12h8M7 16h6" stroke={color} strokeWidth="1.5"/></>,
    word: <><rect x="3" y="2" width="18" height="20" rx="2" fill="#5B8DEF" opacity="0.2"/><text x="12" y="15" textAnchor="middle" fill="#5B8DEF" fontSize="7" fontWeight="bold">W</text></>,
    all: <><rect x="3" y="3" width="8" height="8" rx="2" fill={color}/><rect x="13" y="3" width="8" height="8" rx="2" fill={color} opacity="0.5"/><rect x="3" y="13" width="8" height="8" rx="2" fill={color} opacity="0.5"/><rect x="13" y="13" width="8" height="8" rx="2" fill={color} opacity="0.3"/></>,
  };
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none">{icons[type]}</svg>;
}

function ThumbIcon({ type }) {
  if (type === 'excel') {
    return (
      <div className="cs-doc-thumb cs-thumb-excel">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="3" fill="#217346"/>
          <text x="12" y="15" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">X</text>
        </svg>
      </div>
    );
  }
  if (type === 'word') {
    return (
      <div className="cs-doc-thumb cs-thumb-word">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="3" fill="#2B579A"/>
          <text x="12" y="15" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">W</text>
        </svg>
      </div>
    );
  }
  return (
    <div className="cs-doc-thumb cs-thumb-scan">
      <div className="cs-thumb-lines">
        <div /><div /><div /><div />
      </div>
    </div>
  );
}

export default function CSHomePage({ onOpenDocument }) {
  const docs = MOCK_DOCUMENTS;
  const firstDoc = docs[0];

  return (
    <div className="cs-home">
      {/* Status bar + Header */}
      <div className="cs-header">
        <div className="cs-header-inner">
          <div className="cs-logo">
            <div className="cs-logo-icon">
              <span className="cs-logo-text">CS</span>
            </div>
            <span className="cs-brand">扫描全能王<sup>™</sup></span>
          </div>
        </div>
      </div>

      <div className="cs-body">
        {/* Search bar */}
        <div className="cs-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <span>试试搜索应用，如"转 Word"</span>
        </div>

        {/* Feature grid */}
        <div className="cs-features">
          {FEATURES.map(f => (
            <div key={f.icon} className="cs-feature-item">
              <div className="cs-feature-icon-wrap">
                <FeatureIcon type={f.icon} />
                {f.hot && <span className="cs-feature-hot">HOT</span>}
              </div>
              <span className="cs-feature-label">{f.label}</span>
            </div>
          ))}
        </div>

        {/* Recent documents */}
        <div className="cs-section-header">
          <span className="cs-section-title">最近文档</span>
          <span className="cs-section-more">全部文档 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg></span>
        </div>

        <div className="cs-doc-list">
          {docs.map((doc, i) => (
            <div key={doc.id}>
              <div className="cs-doc-item" onClick={() => onOpenDocument(doc)}>
                <ThumbIcon type={doc.thumbType} />
                <div className="cs-doc-info">
                  <div className="cs-doc-name">{doc.name}</div>
                  <div className="cs-doc-meta">{doc.date}  |  <span className="cs-doc-pages">☐ {doc.pages}</span></div>
                </div>
                <div className="cs-doc-check-placeholder" />
              </div>
              {i === 0 && (
                <div className="cs-doc-actions">
                  <button className="cs-doc-action-btn">分享</button>
                  <button className="cs-doc-action-btn cs-doc-action-ai">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8 2.4-7.2-6-4.8h7.6z" fill="#3DD598"/>
                    </svg>
                    转 Word
                  </button>
                  <button className="cs-doc-action-btn">查看</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom tab bar */}
      <div className="cs-tabbar">
        <div className="cs-tab active">
          <div className="cs-tab-icon-home">
            <div className="cs-tab-cs-icon"><span>CS</span></div>
          </div>
          <span>首页</span>
        </div>
        <div className="cs-tab">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          <span>全部文档</span>
        </div>
        <div className="cs-tab cs-tab-camera">
          <div className="cs-camera-btn">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <rect x="2" y="5" width="20" height="15" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M15 5l-1-2H10L9 5"/>
            </svg>
          </div>
        </div>
        <div className="cs-tab">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/>
          </svg>
          <span>工具箱</span>
        </div>
        <div className="cs-tab">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          <span>我的</span>
        </div>
      </div>
    </div>
  );
}
