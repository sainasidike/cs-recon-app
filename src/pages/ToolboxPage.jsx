export default function ToolboxPage({ onEnterRecon }) {
  return (
    <div className="tb-page">
      <img src="/toolbox-bg.png" alt="" className="tb-bg" draggable={false} />
      <div
        className="tb-recon-hotspot"
        onClick={onEnterRecon}
        title="财务对账"
      >
        <div className="tb-recon-card">
          <div className="tb-recon-icon">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect x="2" y="4" width="28" height="24" rx="3" fill="#7C4DFF"/>
              <path d="M9 12h6M9 16h6M9 20h4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/>
              <path d="M17 12h6M17 16h6M17 20h4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/>
              <path d="M20 22l2 2 4-4" stroke="#4CAF50" strokeWidth="2" fill="none"/>
            </svg>
          </div>
          <div className="tb-recon-name">财务对账</div>
          <div className="tb-recon-desc">AI 智能匹配银行流水与企业账簿，自动生成余额调节表</div>
        </div>
      </div>
    </div>
  );
}
