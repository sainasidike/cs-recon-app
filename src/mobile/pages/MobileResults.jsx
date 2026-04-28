import { useState } from 'react';

function fmt(val) {
  return (val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 });
}

export default function MobileResults({ scenario, matchResults, confirmedMatches, rejectedMatches, onConfirmMatch, onRejectMatch, onManualMatch, onBack, onNext }) {
  const [activeTab, setActiveTab] = useState('exact');

  if (!matchResults) return null;

  const { exact = [], fuzzy = [], semantic = [], manyToOne = [], unmatchedA = [], unmatchedB = [], unmatchedC = [] } = matchResults;
  const sideALabel = scenario?.sideA?.shortLabel || 'A方';
  const sideBLabel = scenario?.sideB?.shortLabel || 'B方';

  const allMatches = [...exact, ...fuzzy, ...semantic];
  const manyToOneItems = manyToOne.reduce((s, g) => s + g.parts.length, 0);
  const totalMatched = allMatches.length + manyToOneItems;
  const totalUnmatched = unmatchedA.length + unmatchedB.length + unmatchedC.length;
  const matchedAmount = allMatches.reduce((s, m) => s + (m.sideA?.amount || 0), 0) + manyToOne.reduce((s, g) => s + g.parts.reduce((ss, p) => ss + (p.amount || 0), 0), 0);

  const tabs = [
    { key: 'exact', label: '精确', count: exact.length },
    { key: 'fuzzy', label: '模糊', count: fuzzy.length },
  ];
  if (manyToOne.length > 0) tabs.push({ key: 'manyToOne', label: '多对一', count: manyToOne.length });
  if (totalUnmatched > 0) tabs.push({ key: 'unmatched', label: '未匹配', count: totalUnmatched });

  const renderMatch = (m, type) => {
    const key = `${type}-${m.sideA?.id || ''}-${m.sideB?.id || ''}`;
    const isConfirmed = confirmedMatches[key];
    const isRejected = rejectedMatches[key];

    return (
      <div key={key} className="m-match-item">
        <div className="m-match-header">
          <span className={`m-match-badge ${type}`}>{type === 'exact' ? '精确' : type === 'fuzzy' ? '模糊' : '语义'}</span>
          <span className="m-match-amount">¥{fmt(m.sideA?.amount)}</span>
        </div>
        <div className="m-match-detail">{sideALabel}: {m.sideA?.date} {m.sideA?.description || ''}</div>
        <div className="m-match-detail">{sideBLabel}: {m.sideB?.date} {m.sideB?.description || ''}</div>
        {m.confidence && <div className="m-match-detail">置信度: {(m.confidence * 100).toFixed(0)}%</div>}
        {!isConfirmed && !isRejected && (
          <div className="m-match-actions">
            <button className="m-match-btn confirm" onClick={() => onConfirmMatch(key)}>✓ 确认</button>
            <button className="m-match-btn reject" onClick={() => onRejectMatch(key)}>✗ 驳回</button>
          </div>
        )}
        {isConfirmed && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent-pressed)', fontWeight: 500 }}>✓ 已确认</div>}
        {isRejected && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)', fontWeight: 500 }}>✗ 已驳回</div>}
      </div>
    );
  };

  return (
    <div className="m-page">
      <div className="m-navbar">
        <button className="m-navbar-back" onClick={onBack}>
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="m-navbar-title">匹配结果</div>
      </div>

      <div className="m-stats">
        <div className="m-stat-card">
          <div className="m-stat-value">{totalMatched}</div>
          <div className="m-stat-label">匹配笔数</div>
        </div>
        <div className="m-stat-card">
          <div className="m-stat-value" style={{ color: 'var(--accent-pressed)' }}>¥{fmt(matchedAmount)}</div>
          <div className="m-stat-label">匹配金额</div>
        </div>
        <div className="m-stat-card">
          <div className="m-stat-value" style={{ color: totalUnmatched > 0 ? 'var(--danger)' : undefined }}>{totalUnmatched}</div>
          <div className="m-stat-label">未匹配</div>
        </div>
        <div className="m-stat-card">
          <div className="m-stat-value">{exact.length}</div>
          <div className="m-stat-label">精确匹配</div>
        </div>
      </div>

      <div className="m-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`m-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}({t.count})
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'exact' && exact.map(m => renderMatch(m, 'exact'))}
        {activeTab === 'fuzzy' && (
          <>
            {fuzzy.map(m => renderMatch(m, 'fuzzy'))}
            {semantic.map(m => renderMatch(m, 'semantic'))}
          </>
        )}
        {activeTab === 'manyToOne' && manyToOne.map((group, gi) => (
          <div key={gi} className="m-match-item">
            <div className="m-match-header">
              <span className="m-match-badge exact">多对一</span>
              <span className="m-match-amount">¥{fmt(group.target?.amount)}</span>
            </div>
            <div className="m-match-detail">目标: {group.target?.date} {group.target?.description}</div>
            {group.parts.map((p, pi) => (
              <div key={pi} className="m-match-detail">├ {p.date} {p.description} ¥{fmt(p.amount)}</div>
            ))}
          </div>
        ))}
        {activeTab === 'unmatched' && (
          <>
            {unmatchedA.length > 0 && (
              <div className="m-card">
                <div className="m-card-title" style={{ color: 'var(--danger)' }}>{sideALabel}未匹配 ({unmatchedA.length})</div>
                {unmatchedA.slice(0, 20).map((item, i) => (
                  <div key={i} className="m-card-row">
                    <span className="m-card-row-label">{item.date} {item.description || ''}</span>
                    <span className="m-card-row-value">¥{fmt(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            {unmatchedB.length > 0 && (
              <div className="m-card">
                <div className="m-card-title" style={{ color: 'var(--danger)' }}>{sideBLabel}未匹配 ({unmatchedB.length})</div>
                {unmatchedB.slice(0, 20).map((item, i) => (
                  <div key={i} className="m-card-row">
                    <span className="m-card-row-label">{item.date} {item.description || ''}</span>
                    <span className="m-card-row-value">¥{fmt(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="m-bottom-bar">
        <button className="m-btn-secondary" onClick={onBack}>返回</button>
        <button className="m-btn-primary" onClick={onNext}>生成报告</button>
      </div>
    </div>
  );
}
