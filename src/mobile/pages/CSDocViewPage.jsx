export default function CSDocViewPage({ document, onBack, onReconciliation }) {
  const docName = document?.name || '扫描全能王 2026-4-10 12.11';

  return (
    <div className="cs-docview">
      {/* Top navbar */}
      <div className="cs-docview-nav">
        <button className="cs-docview-back" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2.2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div className="cs-docview-title">{docName}</div>
        <div className="cs-docview-actions">
          <button className="cs-docview-tag-btn">标签 +</button>
          <button className="cs-docview-icon-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="1.5">
              <rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>
            </svg>
          </button>
          <button className="cs-docview-icon-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18"/>
              <path d="M16 8l-4 8"/>
            </svg>
          </button>
          <button className="cs-docview-icon-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="1.5">
              <circle cx="12" cy="6" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="18" r="1.5"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Document content area */}
      <div className="cs-docview-content">
        {/* Page 1 */}
        <div className="cs-docview-page">
          <div className="cs-docview-page-inner">
            <div className="cs-page-corner" />
            <h2 style={{ textAlign: 'right', fontSize: 22, fontWeight: 700, marginBottom: 40, marginTop: 60 }}>译者序</h2>
            <p className="cs-page-text">这是一本关于 JavaScript 性能的书。</p>
            <p className="cs-page-text">在 Web 应用日趋丰富的今天，越来越多的 JavaScript 被运用在我们的网页中。随着用户体验被日益重视，前端性能对用户体验的影响开始备受关注，而引起性能问题的因素相对复杂，因此它很难得到全面的解决。这本书是一个契机，它尝试着从多个方面综合分析导致性能问题的原因，并给出适合的解决方案，帮助我们改善 Web 应用的品质。</p>
            <p className="cs-page-text">这本书页数不多，但它承载着 JavaScript 性能方面最为宝贵的经验。不仅从语言特性、数据结构、浏览器机理、网络传输等层面分析导致性能问题的原因，还介绍了多种工具来帮助我们提升开发过程和部署环节的工作效率。</p>
            <p className="cs-page-text">本书作者 Nicholas C. Zakas 是一位经验丰富的前端专家，他的许多研究（www.nczonline.net）对前端业界的贡献让我们受益匪浅。本书的另外五位特约作者均为各自领域的专家，他们的专业技能和知识的融入使得本书内容更为充实，更具实用价值。</p>
            <p className="cs-page-text">特别感谢赵泽欣（小马），他为审阅译文花了大量的时间和精力，他的耐心和细致让我十分敬佩。感谢朱宁（白鸦）和周筠老师的引荐让我得以参与本书的翻译。还要感谢博文视点的编辑们在本书翻译过程中给予的极大理解和帮助。</p>
            <p className="cs-page-text">我们在本书翻译过程中力求保持行文流畅，但纰漏在所难免，恳请广大读者批评指正。关于本书的任何意见或想法，欢迎发送邮件至 hpj.feedback@gmail.com。</p>
            <p className="cs-page-text" style={{ marginTop: 24 }}>言，希望本书能帮助业界同仁打造出性能更为卓越的 Web 产品。</p>
            <p style={{ textAlign: 'right', marginTop: 40, fontSize: 14 }}>丁琛</p>
          </div>
        </div>

        {/* Page 2 */}
        <div className="cs-docview-page">
          <div className="cs-docview-page-inner">
            <h2 style={{ textAlign: 'right', fontSize: 22, fontWeight: 700, marginBottom: 40, marginTop: 60 }}>译者序</h2>
            <p className="cs-page-text">这是一本关于 JavaScript 性能的书。</p>
            <p className="cs-page-text">在 Web 应用日趋丰富的今天，越来越多的 JavaScript 被运用在我们的网页中。随着用户体验被日益重视，前端性能对用户体验的影响开始备受关注，而引起性能问题的因素相对复杂，因此它很难得到全面的解决。这本书是一个契机，它尝试着从多个方面综合分析导致性能问题的原因，并给出适合的解决方案，帮助我们改善 Web 应用的品质。</p>
          </div>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="cs-docview-toolbar">
        <button className="cs-toolbar-btn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
            <rect x="6" y="6" width="12" height="12" rx="1"/><path d="M6 10h12"/><path d="M10 6v12"/>
          </svg>
          <span>添加</span>
        </button>
        <button className="cs-toolbar-btn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
            <path d="M15.232 5.232l3.536 3.536M9 13l-2 6 6-2 8.5-8.5a2.121 2.121 0 00-3-3L10 14"/>
          </svg>
          <span>编辑</span>
        </button>
        <button className="cs-toolbar-btn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
            <path d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          <span>分享</span>
        </button>
        <button className="cs-toolbar-btn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="2" width="18" height="20" rx="2" fill="none" stroke="#555" strokeWidth="1.5"/>
            <text x="12" y="15" textAnchor="middle" fill="#555" fontSize="7" fontWeight="bold">Word</text>
          </svg>
          <span>转 Word</span>
        </button>
        <button className="cs-toolbar-btn cs-toolbar-btn-recon" onClick={onReconciliation}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.5">
            <path d="M9 2H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 2v6h12M3 8v12a2 2 0 002 2h14a2 2 0 002-2V8"/>
            <path d="M8 14l2.5 2.5L16 11" strokeWidth="2"/>
          </svg>
          <span>财务对账</span>
        </button>
      </div>
    </div>
  );
}
