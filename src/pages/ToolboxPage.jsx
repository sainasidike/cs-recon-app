export default function ToolboxPage({ onEnterRecon }) {
  return (
    <div className="tb-page" onClick={onEnterRecon}>
      <img src="/toolbox-bg.png" alt="CamScanner 工具箱" className="tb-bg" draggable={false} />
    </div>
  );
}
