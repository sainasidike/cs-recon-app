import React from 'react';

const STEPS = [
  { label: '上传', key: 1 },
  { label: '确认', key: 2 },
  { label: '匹配', key: 3 },
  { label: '报告', key: 4 },
];

function getStepNumber(currentStep) {
  switch (currentStep) {
    case 'home':
    case 'scenario':
      return 1;
    case 'confirm':
      return 2;
    case 'matching':
    case 'results':
      return 3;
    case 'reconciliation':
    case 'complete':
      return 4;
    default:
      return 1;
  }
}

export default function StepIndicator({ currentStep }) {
  const active = getStepNumber(currentStep);

  return (
    <div
      className="step-ind-container"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '12px 24px',
        width: '100%',
      }}
    >
      {STEPS.map((step, idx) => {
        const isCompleted = step.key < active;
        const isCurrent = step.key === active;

        return (
          <React.Fragment key={step.key}>
            {idx > 0 && (
              <div
                className="step-ind-line"
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor: isCompleted || isCurrent
                    ? 'var(--accent)'
                    : 'var(--text-tertiary)',
                  alignSelf: 'center',
                  opacity: isCompleted || isCurrent ? 1 : 0.4,
                }}
              />
            )}
            <div className="step-ind-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                className="step-ind-circle"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  backgroundColor: isCompleted
                    ? 'var(--accent)'
                    : isCurrent
                      ? 'var(--accent)'
                      : 'transparent',
                  border: isCompleted || isCurrent
                    ? '2px solid var(--accent)'
                    : '2px solid var(--text-tertiary)',
                  color: isCompleted || isCurrent
                    ? '#fff'
                    : 'var(--text-tertiary)',
                }}
              >
                {isCompleted ? '✓' : step.key}
              </div>
              <span
                className="step-ind-label"
                style={{
                  fontSize: 11,
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCurrent
                    ? 'var(--text-primary)'
                    : isCompleted
                      ? 'var(--accent)'
                      : 'var(--text-tertiary)',
                }}
              >
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

