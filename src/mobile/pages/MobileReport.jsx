import { useState } from 'react';
import { useToast } from '../../components/Toast';
import { exportReconciliationExcel } from '../../utils/reportExport';

function fmt(val) {
  return (val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 });
}

export default function MobileReport({ scenario, reconciliation, matchResults, periodStart, periodEnd, sessionId, onBack, onNext }) {
  const toast = useToast();

  if (!reconciliation) return null;

  const sideALabel = scenario?.sideA?.shortLabel || 'A方';
  const sideBLabel = scenario?.sideB?.shortLabel || 'B方';
  const reportTitle = scenario?.reportTitle || '对账调节表';

  const { sideABalance, sideBBalance, sideAAdj, sideBAdj, sideAAdjusted, sideBAdjusted, isBalanced, matchSummary, useBalanceMode, matchedAmount, unmatchedAAmount, unmatchedBAmount, sideATotalAmount, sideBTotalAmount, matchRate } = reconciliation;

  const period = periodStart && periodEnd
    ? `${periodStart} ~ ${periodEnd}`
    : periodStart || periodEnd || new Date().toISOString().slice(0, 7);

  const handleExport = () => {
    try {
      exportReconciliationExcel(reconciliation, matchResults, period, scenario);
      toast('Excel 报告已下载');
    } catch (e) {
      toast('导出失败: ' + e.message);
    }
  };

  return (
    <div className="m-page">
      <div className="m-navbar">
        <button className="m-navbar-back" onClick={onBack}>
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="m-navbar-title">{reportTitle}</div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 11, color: 'var(--text-tertiary)' }}>
        对账期间：{period}
      </div>

      <div className="m-result-banner">
        <div className="m-result-icon" style={{ background: isBalanced ? 'var(--accent-light)' : 'var(--danger-light)' }}>
          {isBalanced
            ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-pressed)" strokeWidth="2.5"><path d="M5 13l4 4L19 7"/></svg>
            : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
          }
        </div>
        <div className="m-result-status">
          {useBalanceMode
            ? (isBalanced ? '调节后余额一致' : '调节后余额不一致')
            : (isBalanced ? '全部单据匹配成功' : '存在未匹配单据')
          }
        </div>
        <div className="m-result-value" style={{ color: isBalanced ? 'var(--accent-pressed)' : 'var(--danger)' }}>
          {useBalanceMode
            ? `¥ ${fmt(sideAAdjusted)}`
            : `${matchRate.toFixed(1)}%`
          }
        </div>
        {useBalanceMode && !isBalanced && (
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)' }}>
            差额：¥ {fmt(Math.abs(sideAAdjusted - sideBAdjusted))}
          </div>
        )}
        {!useBalanceMode && (
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
            匹配金额：¥ {fmt(matchedAmount)}
          </div>
        )}
      </div>

      {useBalanceMode ? (
        <>
          <div className="m-card">
            <div className="m-card-title">{scenario?.icon || '📊'} {sideALabel}</div>
            <div className="m-card-row">
              <span className="m-card-row-label">{scenario?.balanceLabels?.sideA || `${sideALabel}余额`}</span>
              <span className="m-card-row-value">¥{fmt(sideABalance)}</span>
            </div>
            {sideAAdj.adds.map((item, i) => (
              <div key={i} className="m-adj-row add">
                <span>+ {item.description || item.reason}</span>
                <span>+¥{fmt(item.amount)}</span>
              </div>
            ))}
            {sideAAdj.subs.map((item, i) => (
              <div key={i} className="m-adj-row sub">
                <span>- {item.description || item.reason}</span>
                <span>-¥{fmt(item.amount)}</span>
              </div>
            ))}
            <div className="m-adj-total">
              <span>调节后余额</span>
              <span>¥{fmt(sideAAdjusted)}</span>
            </div>
          </div>

          <div className="m-card">
            <div className="m-card-title">📒 {sideBLabel}</div>
            <div className="m-card-row">
              <span className="m-card-row-label">{scenario?.balanceLabels?.sideB || `${sideBLabel}余额`}</span>
              <span className="m-card-row-value">¥{fmt(sideBBalance)}</span>
            </div>
            {sideBAdj.adds.map((item, i) => (
              <div key={i} className="m-adj-row add">
                <span>+ {item.description || item.reason}</span>
                <span>+¥{fmt(item.amount)}</span>
              </div>
            ))}
            {sideBAdj.subs.map((item, i) => (
              <div key={i} className="m-adj-row sub">
                <span>- {item.description || item.reason}</span>
                <span>-¥{fmt(item.amount)}</span>
              </div>
            ))}
            <div className="m-adj-total">
              <span>调节后余额</span>
              <span>¥{fmt(sideBAdjusted)}</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="m-card">
            <div className="m-card-title">📊 匹配汇总</div>
            <div className="m-card-row">
              <span className="m-card-row-label">匹配笔数</span>
              <span className="m-card-row-value">{(matchSummary?.exactCount || 0) + (matchSummary?.fuzzyCount || 0) + (matchSummary?.semanticCount || 0) + (matchSummary?.manyToOneItemCount || 0)} 笔</span>
            </div>
            <div className="m-card-row">
              <span className="m-card-row-label">匹配金额</span>
              <span className="m-card-row-value">¥{fmt(matchedAmount)}</span>
            </div>
            <div className="m-card-row">
              <span className="m-card-row-label">精确匹配</span>
              <span className="m-card-row-value">{matchSummary?.exactCount || 0} 笔</span>
            </div>
            {(matchSummary?.fuzzyCount || 0) > 0 && (
              <div className="m-card-row">
                <span className="m-card-row-label">模糊匹配</span>
                <span className="m-card-row-value">{matchSummary.fuzzyCount} 笔</span>
              </div>
            )}
            {(matchSummary?.manyToOneCount || 0) > 0 && (
              <div className="m-card-row">
                <span className="m-card-row-label">多对一匹配</span>
                <span className="m-card-row-value">{matchSummary.manyToOneCount} 组</span>
              </div>
            )}
            <div className="m-card-row" style={{ borderBottom: 'none', fontWeight: 600 }}>
              <span className="m-card-row-label">匹配率</span>
              <span className="m-card-row-value" style={{ color: isBalanced ? 'var(--accent-pressed)' : 'var(--danger)' }}>{matchRate.toFixed(1)}%</span>
            </div>
          </div>

          <div className="m-card">
            <div className="m-card-title">📋 各方金额</div>
            <div className="m-card-row">
              <span className="m-card-row-label">{sideALabel}总额</span>
              <span className="m-card-row-value">¥{fmt(sideATotalAmount)}</span>
            </div>
            <div className="m-card-row">
              <span className="m-card-row-label">{sideBLabel}总额</span>
              <span className="m-card-row-value">¥{fmt(sideBTotalAmount)}</span>
            </div>
            {(matchSummary?.unmatchedACount || 0) > 0 && (
              <div className="m-card-row">
                <span className="m-card-row-label" style={{ color: 'var(--danger)' }}>{sideALabel}未匹配</span>
                <span className="m-card-row-value" style={{ color: 'var(--danger)' }}>{matchSummary.unmatchedACount} 笔 / ¥{fmt(unmatchedAAmount)}</span>
              </div>
            )}
            {(matchSummary?.unmatchedBCount || 0) > 0 && (
              <div className="m-card-row">
                <span className="m-card-row-label" style={{ color: 'var(--danger)' }}>{sideBLabel}未匹配</span>
                <span className="m-card-row-value" style={{ color: 'var(--danger)' }}>{matchSummary.unmatchedBCount} 笔 / ¥{fmt(unmatchedBAmount)}</span>
              </div>
            )}
          </div>
        </>
      )}

      <div className="m-bottom-bar">
        <button className="m-btn-secondary" onClick={handleExport}>导出</button>
        <button className="m-btn-primary" onClick={onNext}>完成对账</button>
      </div>
    </div>
  );
}
