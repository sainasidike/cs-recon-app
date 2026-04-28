import { useEffect, useState } from 'react';

const STEPS = [
  '正在识别文档内容...',
  '分析财务数据类型...',
  '检测对账场景...',
  '准备数据确认...',
];

export default function CSAnalyzingPage({ document, onComplete }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    const stepTimer = setInterval(() => {
      setStepIdx(prev => Math.min(prev + 1, STEPS.length - 1));
    }, 500);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2200);

    return () => {
      clearInterval(timer);
      clearInterval(stepTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="cs-analyzing">
      <div className="cs-analyzing-content">
        <div className="cs-analyzing-icon">
          <div className="cs-analyzing-ring">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(61,213,152,0.15)" strokeWidth="4"/>
              <circle
                cx="40" cy="40" r="36" fill="none" stroke="#3DD598" strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
                style={{ transition: 'stroke-dashoffset 0.1s linear' }}
              />
            </svg>
            <div className="cs-analyzing-ring-inner">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.5">
                <path d="M9 2H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 2v6h12M3 8v12a2 2 0 002 2h14a2 2 0 002-2V8"/>
                <path d="M8 14l2.5 2.5L16 11" strokeWidth="2"/>
              </svg>
            </div>
          </div>
        </div>

        <h2 className="cs-analyzing-title">AI 智能分析中</h2>
        <p className="cs-analyzing-step">{STEPS[stepIdx]}</p>

        <div className="cs-analyzing-bar-wrap">
          <div className="cs-analyzing-bar">
            <div className="cs-analyzing-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="cs-analyzing-doc">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
            <rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>
          </svg>
          <span>{document?.name || '文档'}</span>
        </div>
      </div>
    </div>
  );
}
