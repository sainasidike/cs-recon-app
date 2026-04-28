import { useState, useEffect, useCallback } from 'react';
import { getScenario } from '../utils/scenarios';

export default function Sidebar({ collapsed, onToggle, onGoHome, onLoadHistory }) {
  const [historyList, setHistoryList] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadHistory = useCallback(() => {
    const raw = JSON.parse(localStorage.getItem('cs_recon_history') || '[]');
    setHistoryList(raw);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshKey]);

  useEffect(() => {
    const orig = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function(key, value) {
      orig(key, value);
      if (key === 'cs_recon_history') {
        setRefreshKey(k => k + 1);
      }
    };
    return () => { localStorage.setItem = orig; };
  }, []);

  const deleteHistory = (index, e) => {
    e.stopPropagation();
    const all = JSON.parse(localStorage.getItem('cs_recon_history') || '[]');
    all.splice(index, 1);
    localStorage.setItem('cs_recon_history', JSON.stringify(all));
    setHistoryList(all);
  };

  if (collapsed) {
    return (
      <aside className="sidebar sidebar-collapsed">
        <button className="sidebar-toggle" onClick={onToggle} title="展开侧边栏">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand" onClick={onGoHome}>
          <div className="sidebar-title">智能对账</div>
          <div className="sidebar-sub">AI · 多轮匹配 · 调节表</div>
        </div>
        <button className="sidebar-toggle" onClick={onToggle} title="收起侧边栏">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div className="sidebar-home-btn" onClick={onGoHome}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
        新建对账
      </div>

      <div className="sidebar-section-label">历史记录</div>

      <div className="sidebar-history">
        {historyList.length === 0 && (
          <div className="sidebar-empty">暂无历史记录</div>
        )}
        {historyList.map((item, i) => {
          const d = new Date(item.timestamp);
          const dateStr = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
          const timeStr = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          const sc = item.scenarioId ? getScenario(item.scenarioId) : null;
          const s = item.reconciliation?.matchSummary;
          const total = s?.total || 0;
          const matched = (s?.exactCount || 0) + (s?.fuzzyCount || 0) + (s?.semanticCount || 0);
          const rate = total > 0 ? Math.round((matched / total) * 100) : 0;

          return (
            <div key={i} className="sidebar-history-item" onClick={() => onLoadHistory(item)}>
              <div className="sidebar-history-top">
                <span className="sidebar-history-icon">{sc?.icon || '📊'}</span>
                <span className="sidebar-history-name">{sc?.name || '对账'}</span>
                <button className="sidebar-history-del" onClick={(e) => deleteHistory(i, e)} title="删除">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="sidebar-history-meta">
                {dateStr} {timeStr} · {rate}%匹配
                <span className={`sidebar-history-status ${item.reconciliation?.isBalanced ? 'balanced' : 'unbalanced'}`}>
                  {item.reconciliation?.isBalanced ? '平衡' : '不平衡'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-footer-text">CamScanner 智能对账 v2.0</div>
      </div>
    </aside>
  );
}
