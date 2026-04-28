import { useToast } from '../../components/Toast';

function fmt(val) {
  return (val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 });
}

export default function MobileComplete({ scenario, reconciliation, matchResults, parsedFiles, archived, onArchive, onReset }) {
  const toast = useToast();
  const summary = reconciliation?.matchSummary;
  const total = summary?.total || 0;
  const manyToOneCount = (matchResults?.manyToOne || []).reduce((s, g) => s + g.parts.length, 0);
  const matched = (summary?.exactCount || 0) + (summary?.fuzzyCount || 0) + (summary?.semanticCount || 0) + manyToOneCount;

  const handleArchive = () => {
    onArchive();
    toast('对账记录已归档保存');
  };

  return (
    <div className="m-page">
      <div className="m-success">
        <div className="m-success-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-pressed)" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <div className="m-success-title">对账完成</div>
        <div className="m-success-desc">
          共处理 {total} 笔交易，匹配率 {total > 0 ? ((matched / total) * 100).toFixed(1) : 0}%
          {reconciliation?.isBalanced && <><br />调节后余额一致</>}
        </div>
      </div>

      <div className="m-card">
        <div className="m-card-title">对账结果</div>
        <div className="m-card-row">
          <span className="m-card-row-label">精确匹配</span>
          <span className="m-card-row-value" style={{ color: 'var(--accent-pressed)' }}>{summary?.exactCount || 0} 笔</span>
        </div>
        <div className="m-card-row">
          <span className="m-card-row-label">模糊/语义匹配</span>
          <span className="m-card-row-value" style={{ color: 'var(--warning)' }}>{(summary?.fuzzyCount || 0) + (summary?.semanticCount || 0)} 笔</span>
        </div>
        <div className="m-card-row">
          <span className="m-card-row-label">未匹配</span>
          <span className="m-card-row-value" style={{ color: 'var(--danger)' }}>{(summary?.unmatchedACount || 0) + (summary?.unmatchedBCount || 0)} 笔</span>
        </div>
        <div className="m-card-row">
          <span className="m-card-row-label">包含文件</span>
          <span className="m-card-row-value">{parsedFiles?.length || 0} 个</span>
        </div>
        <div className="m-card-row" style={{ borderBottom: 'none' }}>
          <span className="m-card-row-label">调节表状态</span>
          <span className="m-card-row-value" style={{ color: reconciliation?.isBalanced ? 'var(--accent-pressed)' : 'var(--danger)' }}>
            {reconciliation?.isBalanced ? '余额一致' : '余额不一致'}
          </span>
        </div>
      </div>

      <div style={{ padding: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!archived && (
          <button className="m-btn-secondary" style={{ height: 44, width: '100%', borderRadius: 'var(--radius-md)' }} onClick={handleArchive}>
            归档保存
          </button>
        )}
        {archived && (
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--accent-pressed)', fontWeight: 500, padding: 8 }}>
            ✓ 已归档保存
          </div>
        )}
        <button className="m-btn-primary" style={{ height: 44, width: '100%', borderRadius: 'var(--radius-md)' }} onClick={onReset}>
          开始新的对账
        </button>
      </div>
    </div>
  );
}
