import { useState } from 'react';

function fmt(val) {
  return (val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 });
}

export default function MobileConfirm({ scenario, sideAData, sideBData, sideCData, sideABalance, sideBBalance, validation, onSetBalances, onUpdateEntries, onBack, onNext }) {
  const [activeTab, setActiveTab] = useState('sideA');
  const sideALabel = scenario?.sideA?.shortLabel || 'A方';
  const sideBLabel = scenario?.sideB?.shortLabel || 'B方';
  const sideCLabel = scenario?.sideC?.shortLabel || null;
  const useBalanceMode = scenario?.useBalanceMode;

  const tabs = [
    { key: 'sideA', label: sideALabel },
    { key: 'sideB', label: sideBLabel },
  ];
  if (sideCLabel) tabs.push({ key: 'sideC', label: sideCLabel });

  const currentData = activeTab === 'sideA' ? sideAData : activeTab === 'sideB' ? sideBData : sideCData;
  const entries = currentData?.entries || [];

  return (
    <div className="m-page">
      <div className="m-navbar">
        <button className="m-navbar-back" onClick={onBack}>
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="m-navbar-title">数据确认</div>
      </div>

      {useBalanceMode && (
        <div className="m-card">
          <div className="m-card-title">💰 余额录入</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>{sideALabel}余额</label>
              <input
                type="number"
                className="m-period-input"
                style={{ width: '100%' }}
                value={sideABalance || ''}
                onChange={e => onSetBalances(Number(e.target.value), sideBBalance)}
                placeholder="输入余额"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>{sideBLabel}余额</label>
              <input
                type="number"
                className="m-period-input"
                style={{ width: '100%' }}
                value={sideBBalance || ''}
                onChange={e => onSetBalances(sideABalance, Number(e.target.value))}
                placeholder="输入余额"
              />
            </div>
          </div>
        </div>
      )}

      <div className="m-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`m-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label} ({(activeTab === t.key ? entries : (t.key === 'sideA' ? sideAData : t.key === 'sideB' ? sideBData : sideCData)?.entries || []).length})
          </button>
        ))}
      </div>

      {validation && (
        <div className="m-card" style={{ padding: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {validation.totalEntries} 条记录 · 金额合计 ¥{fmt(validation.totalAmount)}
            {validation.duplicates > 0 && <span style={{ color: 'var(--warning)', marginLeft: 8 }}>⚠️ {validation.duplicates} 条疑似重复</span>}
          </div>
        </div>
      )}

      <div className="m-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="m-data-table">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>摘要</th>
                <th>金额</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 20, color: 'var(--text-tertiary)' }}>暂无数据</td></tr>
              )}
              {entries.slice(0, 50).map((e, i) => (
                <tr key={i}>
                  <td>{e.date || '-'}</td>
                  <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.description || e.summary || '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>¥{fmt(e.amount)}</td>
                </tr>
              ))}
              {entries.length > 50 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 10 }}>... 共 {entries.length} 条</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="m-bottom-bar">
        <button className="m-btn-secondary" onClick={onBack}>返回</button>
        <button className="m-btn-primary" onClick={onNext}>开始匹配</button>
      </div>
    </div>
  );
}
