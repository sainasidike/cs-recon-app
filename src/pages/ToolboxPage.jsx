import { useRef, useEffect, useState } from 'react';

export default function ToolboxPage({ onEnterRecon }) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [style, setStyle] = useState(null);

  const calc = () => {
    const img = imgRef.current;
    if (!img) return;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    if (!natW || !natH) return;

    const imgW = img.clientWidth;
    const scale = imgW / natW;

    // Pixel-measured from 1610x1011 screenshot using canvas sampling:
    // Card1 "AI文档助手": x=263-506 (w=243)
    // Card2 "银行流水识别": x=528-770 (w=242)
    // Gap between cards: 22px
    // Card3 position: x=792, width=242
    // "实用工具" title at y≈530-550, cards start y≈560
    // Card height (from 整理 section): ~140px
    const x = 792;
    const y = 610;
    const w = 242;
    const h = 140;

    setStyle({
      left: x * scale,
      top: y * scale,
      width: w * scale,
      height: h * scale,
      fontSize: scale,
    });
  };

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const onReady = () => calc();
    if (img.complete && img.naturalWidth > 0) calc();
    img.addEventListener('load', onReady);
    window.addEventListener('resize', calc);
    return () => {
      img.removeEventListener('load', onReady);
      window.removeEventListener('resize', calc);
    };
  }, []);

  return (
    <div className="tb-page" ref={containerRef}>
      <img
        ref={imgRef}
        src="/toolbox-bg.png"
        alt="CamScanner 工具箱"
        className="tb-bg"
        draggable={false}
      />
      {style && (
        <div
          className="tb-recon-hotspot"
          onClick={onEnterRecon}
          style={{
            position: 'absolute',
            left: style.left,
            top: style.top,
            width: style.width,
            height: style.height,
          }}
        >
          <div className="tb-recon-card" style={{ fontSize: 15 * style.fontSize }}>
            <div className="tb-recon-icon" style={{ width: 28 * style.fontSize, height: 28 * style.fontSize }}>
              <svg width="100%" height="100%" viewBox="0 0 32 32" fill="none">
                <rect x="2" y="4" width="28" height="24" rx="3" fill="#43A047"/>
                <path d="M9 12h6M9 16h6M9 20h4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/>
                <path d="M17 12h6M17 16h6M17 20h4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/>
                <path d="M20 22l2 2 4-4" stroke="white" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <div className="tb-recon-name">财务对账</div>
            <div className="tb-recon-desc">AI 智能匹配银行流水与企业账簿，自动生成余额调节表</div>
          </div>
        </div>
      )}
    </div>
  );
}
