import { useState, useEffect } from 'react';
import { getScenario } from '../utils/scenarios';

export default function HistoryListPage({ onLoadHistory, onNewRecon }) {
  const [list, setList] = useState([]);

  useEffect(() => {
    const raw = JSON.parse(localStorage.getItem('cs_recon_history') || '[]');
    setList(raw);
  }, []);

  const deleteItem = (idx, e) => {
    e.stopPropagation();
    const all = [...list];
    all.splice(idx, 1);
    localStorage.setItem('cs_recon_history', JSON.stringify(all));
    setList(all);
  };

  return (
    <div className="pc-page">
      <div className="history-list-page">
        <div className="history-list-header">
          <h2 className="history-list-title">余额调节表</h2>
          <button className="btn-pc-primary" onClick={onNewRecon} style={{ padding: '8px 20px', fontSize: 13 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, verticalAlign: -2 }}>
              <path d="M12 5v14M5 12h14"/>
            </svg>
            新建对账
          </button>
        </div>

        {list.length === 0 ? (
          <div className="history-list-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8h8M8 12h5"/>
            </svg>
            <p>暂无保存的调节表</p>
          </div>
        ) : (
          <div className="history-list-grid">
            {list.map((item, i) => {
              const d = new Date(item.timestamp);
              const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
              const timeStr = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
              const sc = item.scenarioId ? getScenario(item.scenarioId) : null;
              const s = item.reconciliation?.matchSummary;
              const total = s?.total || 0;
              const matched = (s?.exactCount || 0) + (s?.fuzzyCount || 0) + (s?.semanticCount || 0) + (s?.manyToOneItemCount || 0);
              const rate = total > 0 ? Math.round((matched / total) * 100) : 0;
              const isBalanced = item.reconciliation?.isBalanced;
              const files = item.files || [];

              return (
                <div key={i} className="history-list-card" onClick={() => onLoadHistory(item)}>
                  <div className="history-card-top">
                    <span className="history-card-icon">{sc?.icon || '📊'}</span>
                    <span className="history-card-name">{sc?.name || '对账'}</span>
                    <span className={`history-card-badge ${isBalanced ? 'balanced' : 'unbalanced'}`}>
                      {isBalanced ? '平衡' : '不平衡'}
                    </span>
                    <button className="history-card-del" onClick={(e) => deleteItem(i, e)} title="删除">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                  <div className="history-card-meta">
                    <span>{dateStr} {timeStr}</span>
                    <span>匹配率 {rate}%</span>
                  </div>
                  <div className="history-card-files">
                    {files.slice(0, 3).map((f, fi) => (
                      <span key={fi} className="history-card-file">{f.name}</span>
                    ))}
                    {files.length > 3 && <span className="history-card-file">+{files.length - 3}</span>}
                  </div>
                  {item.periodStart && (
                    <div className="history-card-period">{item.periodStart} ~ {item.periodEnd}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
