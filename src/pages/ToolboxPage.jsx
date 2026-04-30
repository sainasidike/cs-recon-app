export default function ToolboxPage({ onEnterRecon }) {
  return (
    <div className="tb-page">
      <img src="/toolbox-bg.png" alt="CamScanner 工具箱" className="tb-bg" draggable={false} />

      {/* Top welcome banner */}
      <div className="tb-banner">
        欢迎体验 CS 文档 Agent 智能对账，点击下方卡片开始
      </div>

      {/* Main floating card for 智能对账 */}
      <div className="tb-card" onClick={onEnterRecon}>
        <div className="tb-card-badge">NEW</div>
        <div className="tb-card-title">智能对账</div>
        <div className="tb-card-subtitle">AI 自动识别匹配，30秒生成余额调节表</div>
        <button className="tb-card-btn" onClick={onEnterRecon}>开始体验</button>
      </div>

      {/* Fake "即将上线" overlay badges for other tool areas */}
      <div className="tb-coming-soon" style={{ top: '28%', left: '12%' }}>即将上线</div>
      <div className="tb-coming-soon" style={{ top: '28%', right: '12%' }}>即将上线</div>
      <div className="tb-coming-soon" style={{ top: '72%', left: '12%' }}>即将上线</div>
      <div className="tb-coming-soon" style={{ top: '72%', right: '12%' }}>即将上线</div>

      <style>{`
        .tb-page {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .tb-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
        }

        .tb-banner {
          position: relative;
          z-index: 10;
          margin-top: 48px;
          padding: 10px 20px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          border-radius: 20px;
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          text-align: center;
          letter-spacing: 0.5px;
        }

        .tb-card {
          position: relative;
          z-index: 10;
          margin-top: auto;
          margin-bottom: 120px;
          width: 300px;
          padding: 28px 24px;
          background: rgba(30, 30, 30, 0.92);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          border: 2px solid rgba(0, 200, 83, 0.6);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          animation: tb-pulse-border 2s ease-in-out infinite;
          box-shadow: 0 8px 32px rgba(0, 200, 83, 0.15);
        }

        @keyframes tb-pulse-border {
          0%, 100% {
            border-color: rgba(0, 200, 83, 0.6);
            box-shadow: 0 8px 32px rgba(0, 200, 83, 0.15);
          }
          50% {
            border-color: rgba(0, 200, 83, 1);
            box-shadow: 0 8px 40px rgba(0, 200, 83, 0.35);
          }
        }

        .tb-card-badge {
          position: absolute;
          top: -10px;
          right: -10px;
          background: #00c853;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          letter-spacing: 1px;
          animation: tb-breathe 2s ease-in-out infinite;
        }

        @keyframes tb-breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.85;
          }
        }

        .tb-card-title {
          font-size: 20px;
          font-weight: 700;
          color: #fff;
        }

        .tb-card-subtitle {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          line-height: 1.4;
        }

        .tb-card-btn {
          margin-top: 8px;
          padding: 10px 36px;
          background: #00c853;
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          border: none;
          border-radius: 24px;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }

        .tb-card-btn:active {
          transform: scale(0.96);
          background: #00a844;
        }

        .tb-coming-soon {
          position: absolute;
          z-index: 10;
          padding: 6px 14px;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 12px;
          font-weight: 500;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
