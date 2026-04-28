import { useState } from 'react';
import { useToast } from '../components/Toast';
import { getScenario } from '../utils/scenarios';

function HistoryPanel() {
  const [expanded, setExpanded] = useState(false);
  const history = JSON.parse(localStorage.getItem('cs_recon_history') || '[]');

  if (history.length === 0) return null;

  return (
    <div className="card mt-lg">
      <div className="card-header" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
        历史对账记录 ({history.length})
        <span style={{ marginLeft: 'auto', fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="card-body" style={{ padding: 0 }}>
          {history.map((item, i) => {
            const d = new Date(item.timestamp);
            const dateStr = d.toLocaleDateString('zh-CN');
            const timeStr = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            const s = item.reconciliation?.matchSummary;
            const total = s?.total || 0;
            const matched = (s?.exactCount || 0) + (s?.fuzzyCount || 0) + (s?.semanticCount || 0);
            const historyScenario = item.scenarioId ? getScenario(item.scenarioId) : null;
            const scenarioName = historyScenario?.name || '对账';
            return (
              <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 'var(--font-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>
                    {historyScenario?.icon || '📊'} {scenarioName} · {dateStr} {timeStr}
                  </span>
                  <span style={{ color: item.reconciliation?.isBalanced ? 'var(--accent)' : 'var(--danger)', fontWeight: 600 }}>
                    {item.reconciliation?.isBalanced ? '平衡' : '不平衡'}
                  </span>
                </div>
                <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-xs)' }}>
                  {item.files?.map(f => f.name).join(' + ')} · {total}笔 · 匹配率 {total > 0 ? ((matched / total) * 100).toFixed(0) : 0}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CompletePage({ scenario, reconciliation, matchResults, parsedFiles, archived, onArchive, onReset }) {
  const toast = useToast();
  const summary = reconciliation?.matchSummary;
  const total = summary?.total || 0;
  const manyToOneCount = (matchResults?.manyToOne || []).reduce((s, g) => s + g.parts.length, 0);
  const matched = (summary?.exactCount || 0) + (summary?.fuzzyCount || 0) + (summary?.semanticCount || 0) + manyToOneCount;

  const scenarioName = scenario?.name || '对账';
  const sideALabel = scenario?.sideA?.shortLabel || 'A方';
  const sideBLabel = scenario?.sideB?.shortLabel || 'B方';
  const sideCLabel = scenario?.sideC?.shortLabel || null;

  const handleArchive = () => {
    onArchive();
    toast('对账记录已归档保存');
  };

  return (
    <div className="pc-page">
      <div className="pc-page-header">
        <h2 className="pc-page-title">{scenarioName}完成</h2>
      </div>
      <div>
        <div className="success-wrap">
          <div className="success-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div className="success-title">对账完成</div>
          <div className="success-desc">
            共处理 {total} 笔交易，匹配率 {total > 0 ? ((matched / total) * 100).toFixed(1) : 0}%
            {reconciliation?.isBalanced && <><br />调节后余额一致</>}
          </div>
          <div className="saved-time-badge">
            预计为您节省 {total <= 20 ? `${Math.max(5, total * 3)} 分钟` : `${Math.max(1, Math.round(total * 3 / 60))} 小时`}
          </div>
        </div>

        <div className="card mt-lg">
          <div className="card-header">对账结果</div>
          <div className="card-body" style={{ fontSize: 'var(--font-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>精确匹配</span>
              <span style={{ color: 'var(--accent)' }}>{summary?.exactCount || 0} 笔</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>模糊/语义匹配</span>
              <span style={{ color: 'var(--warning)' }}>{(summary?.fuzzyCount || 0) + (summary?.semanticCount || 0)} 笔</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>未匹配({sideALabel})</span>
              <span style={{ color: 'var(--danger)' }}>{summary?.unmatchedACount || 0} 笔</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>未匹配({sideBLabel})</span>
              <span style={{ color: 'var(--danger)' }}>{summary?.unmatchedBCount || 0} 笔</span>
            </div>
            {sideCLabel && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>未匹配({sideCLabel})</span>
                <span style={{ color: 'var(--danger)' }}>{summary?.unmatchedCCount || 0} 笔</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>调节表状态</span>
              <span style={{ color: reconciliation?.isBalanced ? 'var(--accent)' : 'var(--danger)' }}>
                {reconciliation?.isBalanced ? '余额一致' : '余额不一致'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>包含文件</span>
              <span style={{ color: 'var(--text-primary)' }}>{parsedFiles?.length || 0} 个</span>
            </div>
          </div>
        </div>

        {!archived ? (
          <button className="btn btn-secondary mt-lg" onClick={handleArchive}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 8v13H3V8" /><path d="M1 3h22v5H1z" /><path d="M10 12h4" />
            </svg>
            归档保存对账记录
          </button>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 'var(--font-sm)', color: 'var(--accent)', fontWeight: 600 }}>
            已归档保存
          </div>
        )}

        <HistoryPanel />

        <button className="btn btn-primary mt-lg" onClick={onReset}>
          开始新的对账
        </button>
      </div>
    </div>
  );
}
