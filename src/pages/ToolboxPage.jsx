export default function ToolboxPage({ onEnterRecon }) {
  const tools = {
    convert: [
      { icon: 'word', name: '转 Word', desc: '将图片、PDF 转换为保留原格式的 Word，轻松编辑' },
      { icon: 'excel', name: '转 Excel', desc: '将图片、PDF 转换为可编辑的 Excel' },
      { icon: 'ppt', name: '转 PPT', desc: '将 PDF 转换为可编辑的 PPT 文档' },
      { icon: 'img', name: '逐页转图片', desc: '将 PDF 逐页转换成图片' },
      { icon: 'pdf', name: '转 PDF', desc: '将图片、Office 文档转换为通用的 PDF 文档' },
    ],
    organize: [
      { icon: 'merge', name: '文档合并', desc: '将多个文档合并为一个文档' },
      { icon: 'extract', name: '页面提取', desc: '选择部分页面生成新文档' },
      { icon: 'sort', name: '页面排序', desc: '自由调整文档页面顺序，并支持删除、旋转页面' },
    ],
    utility: [
      { icon: 'ai', name: 'AI 文档助手', desc: '一键获取答案，还可提炼重点知识' },
      { icon: 'bank', name: '银行流水识别', desc: 'AI 助力银行流水识别，精准识别与转化，让录入、审核更高效' },
      { icon: 'recon', name: '财务对账', desc: 'AI 智能匹配银行流水与企业账簿，自动生成余额调节表' },
    ],
    edit: [
      { icon: 'sign', name: 'PDF 签名', desc: '直接书写或上传手写签名图片，即可创建你的签名', appOnly: true },
      { icon: 'watermark', name: 'PDF 加水印', desc: '只需几秒钟，即可给你的 PDF 文件添加图片或文字水印。', appOnly: true },
      { icon: 'lock', name: 'PDF 加密', desc: '使用密码来保护你的 PDF 文件加密，以防止未经授权的访问。', appOnly: true },
    ],
  };

  const renderIcon = (type) => {
    const icons = {
      word: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="4" width="28" height="24" rx="3" fill="#2B579A"/>
          <path d="M8 10l3 12h1l2.5-8 2.5 8h1l3-12h-2l-2 8-2.5-8h-1l-2.5 8-2-8z" fill="white"/>
        </svg>
      ),
      excel: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="4" width="28" height="24" rx="3" fill="#217346"/>
          <path d="M10 10l5 6-5 6h3l3.5-4.2L15 22h3l-5-6 5-6h-3l-3.5 4.2L8 10z" fill="white"/>
        </svg>
      ),
      ppt: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="4" width="28" height="24" rx="3" fill="#D24726"/>
          <path d="M11 10v12h2v-4h3c2.2 0 4-1.8 4-4s-1.8-4-4-4h-5zm2 2h3c1.1 0 2 .9 2 2s-.9 2-2 2h-3v-4z" fill="white"/>
        </svg>
      ),
      img: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="4" width="28" height="24" rx="3" fill="#4CAF50"/>
          <circle cx="12" cy="13" r="3" fill="rgba(255,255,255,0.8)"/>
          <path d="M6 24l6-8 4 5 4-6 6 9H6z" fill="rgba(255,255,255,0.8)"/>
        </svg>
      ),
      pdf: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="4" width="28" height="24" rx="3" fill="#E53935"/>
          <path d="M9 20v2h2v-2h1c1.7 0 3-1.3 3-3s-1.3-3-3-3H9v8zm2-4h1c.6 0 1 .4 1 1s-.4 1-1 1h-1v-2zm6-2h2c2.2 0 4 1.8 4 4s-1.8 4-4 4h-2v-8zm2 6c1.1 0 2-.9 2-2s-.9-2-2-2v4z" fill="white"/>
        </svg>
      ),
      merge: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="4" width="28" height="24" rx="3" fill="#E53935"/>
          <path d="M10 10h4v4h-4zm0 6h4v4h-4zm8-6h4v4h-4zm0 6h4v4h-4zM14 16l4 0" stroke="white" strokeWidth="1.5"/>
          <path d="M16 12v8" stroke="white" strokeWidth="1.5"/>
        </svg>
      ),
      extract: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="4" width="28" height="24" rx="3" fill="#43A047"/>
          <rect x="8" y="9" width="7" height="10" rx="1" fill="rgba(255,255,255,0.9)"/>
          <rect x="17" y="13" width="7" height="10" rx="1" fill="rgba(255,255,255,0.6)"/>
          <path d="M13 16l3 0m0-2v4" stroke="#43A047" strokeWidth="1.5"/>
        </svg>
      ),
      sort: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="4" width="28" height="24" rx="3" fill="#43A047"/>
          <rect x="8" y="9" width="6" height="8" rx="1" fill="rgba(255,255,255,0.9)"/>
          <rect x="16" y="11" width="6" height="8" rx="1" fill="rgba(255,255,255,0.7)"/>
          <path d="M24 14l-2 2 2 2" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" fill="none"/>
        </svg>
      ),
      ai: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="4" width="28" height="24" rx="3" fill="#2196F3"/>
          <circle cx="16" cy="16" r="6" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.5"/>
          <circle cx="16" cy="16" r="2.5" fill="white"/>
          <path d="M16 10v2m0 8v2m-6-6h2m8 0h2" stroke="white" strokeWidth="1.5"/>
        </svg>
      ),
      bank: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="4" width="28" height="24" rx="3" fill="#43A047"/>
          <path d="M8 14h16M8 18h16M8 22h10" stroke="white" strokeWidth="1.5"/>
          <path d="M16 8l6 4H10l6-4z" fill="rgba(255,255,255,0.8)"/>
        </svg>
      ),
      recon: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="4" width="28" height="24" rx="3" fill="#7C4DFF"/>
          <path d="M9 12h6M9 16h6M9 20h4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/>
          <path d="M17 12h6M17 16h6M17 20h4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/>
          <path d="M20 22l2 2 4-4" stroke="#4CAF50" strokeWidth="2" fill="none"/>
        </svg>
      ),
      sign: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="4" width="28" height="24" rx="3" fill="#FF7043"/>
          <path d="M10 22c2-4 4-8 6-8s2 4 4 4 2-2 2-2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>
      ),
      watermark: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="4" width="28" height="24" rx="3" fill="#5C6BC0"/>
          <path d="M10 14l3 8 3-5 3 5 3-8" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="22" cy="11" r="2" fill="rgba(255,255,255,0.6)"/>
        </svg>
      ),
      lock: (
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="4" width="28" height="24" rx="3" fill="#78909C"/>
          <rect x="11" y="15" width="10" height="8" rx="2" fill="rgba(255,255,255,0.9)"/>
          <path d="M13 15v-3a3 3 0 016 0v3" stroke="rgba(255,255,255,0.9)" strokeWidth="2" fill="none"/>
          <circle cx="16" cy="19" r="1.5" fill="#78909C"/>
        </svg>
      ),
    };
    return icons[type] || null;
  };

  const renderToolCard = (tool) => {
    const isRecon = tool.icon === 'recon';
    return (
      <div
        key={tool.name}
        className={`tb-tool-card ${isRecon ? 'tb-tool-card-highlight' : ''}`}
        onClick={isRecon ? onEnterRecon : undefined}
        style={isRecon ? { cursor: 'pointer' } : undefined}
      >
        {tool.appOnly && <span className="tb-app-badge">App 专享</span>}
        <div className="tb-tool-icon">{renderIcon(tool.icon)}</div>
        <div className="tb-tool-name">{tool.name}</div>
        <div className="tb-tool-desc">{tool.desc}</div>
      </div>
    );
  };

  return (
    <div className="tb-layout">
      <aside className="tb-sidebar">
        <div className="tb-sidebar-logo">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="#3ECF8E"/>
            <text x="5" y="22" fontSize="14" fontWeight="bold" fill="white">CS</text>
          </svg>
          <span className="tb-sidebar-brand">扫描全能王</span>
        </div>

        <nav className="tb-sidebar-nav">
          <div className="tb-nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
            <span>首页</span>
          </div>
          <div className="tb-nav-item tb-nav-expandable">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
              <polyline points="13 2 13 9 20 9"/>
            </svg>
            <span>我的文档</span>
            <svg className="tb-nav-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          <div className="tb-nav-sub">
            <div className="tb-nav-sub-item">文件夹A</div>
            <div className="tb-nav-sub-item">私密文件夹</div>
          </div>
          <div className="tb-nav-item tb-nav-expandable">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>
            <span>备份</span>
          </div>
          <div className="tb-nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="18" rx="2"/>
              <path d="M8 7h8M8 11h5"/>
            </svg>
            <span>证件卡包(1)</span>
          </div>
          <div className="tb-nav-item tb-nav-active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
            </svg>
            <span>工具箱</span>
          </div>
        </nav>

        <div className="tb-sidebar-bottom">
          <button className="tb-desktop-btn">桌面版下载</button>
          <div className="tb-storage">
            <div className="tb-storage-bar">
              <div className="tb-storage-used" style={{ width: '18%' }}></div>
            </div>
            <span className="tb-storage-text">2.64GB / 14.71GB</span>
            <a className="tb-storage-expand">扩容</a>
          </div>
        </div>
      </aside>

      <div className="tb-main">
        <header className="tb-topbar">
          <div className="tb-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="支持多关键词搜索" readOnly />
          </div>
          <div className="tb-topbar-right">
            <div className="tb-topbar-lang">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
              </svg>
              <span>简体中文</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            <button className="tb-topbar-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/>
              </svg>
            </button>
            <button className="tb-topbar-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            </button>
            <div className="tb-topbar-avatar">
              <div className="tb-avatar-dot"></div>
              <span>saina_sidike</span>
            </div>
          </div>
        </header>

        <div className="tb-content">
          <section className="tb-section">
            <h2 className="tb-section-title">格式转换</h2>
            <div className="tb-tool-grid tb-grid-5">
              {tools.convert.map(renderToolCard)}
            </div>
          </section>

          <section className="tb-section">
            <h2 className="tb-section-title">整理</h2>
            <div className="tb-tool-grid tb-grid-3">
              {tools.organize.map(renderToolCard)}
            </div>
          </section>

          <section className="tb-section">
            <h2 className="tb-section-title">实用工具</h2>
            <div className="tb-tool-grid tb-grid-3">
              {tools.utility.map(renderToolCard)}
            </div>
          </section>

          <section className="tb-section">
            <h2 className="tb-section-title">文档编辑</h2>
            <div className="tb-tool-grid tb-grid-3">
              {tools.edit.map(renderToolCard)}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
