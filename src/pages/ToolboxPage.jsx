export default function ToolboxPage({ onEnterRecon }) {
  return (
    <div className="tb-page">
      <img src="/toolbox-bg.png" alt="CamScanner 工具箱" className="tb-bg" draggable={false} />
      <div className="tb-hotspot" onClick={onEnterRecon} title="财务对账" />
    </div>
  );
}
