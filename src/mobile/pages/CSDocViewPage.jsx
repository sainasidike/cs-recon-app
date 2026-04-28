export default function CSDocViewPage({ document, showReconBtn, onBack, onReconciliation }) {
  return (
    <div className="cs-screenshot-page">
      <img src="/cs-docview.jpg" alt="文档预览" className="cs-screenshot-bg" />

      {/* Back button hotzone */}
      <div
        className="cs-hotzone"
        style={{ top: '5.5%', left: '0', width: '15%', height: '4%' }}
        onClick={onBack}
      />

      {/* Bottom toolbar area - replace last button with 财务对账 if detected */}
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
