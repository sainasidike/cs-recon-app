import { useState, useMemo } from 'react';
import ApprovalPanel from '../components/ApprovalPanel';
import AuditLogPanel from '../components/AuditLogPanel';
import { useToast } from '../components/Toast';
import { exportReconciliationPDF, exportReconciliationExcel } from '../utils/reportExport';
import { generateAIReport } from '../utils/zhipuAI';

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: 'var(--text-primary)', margin: '16px 0 6px' }}>{line.slice(4).replace(/\*\*/g, '')}</h4>);
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={i} style={{ fontSize: 'var(--font-md)', fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 8px' }}>{line.slice(3).replace(/\*\*/g, '')}</h3>);
    } else if (line.startsWith('# ')) {
      elements.push(<h2 key={i} style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--text-primary)', margin: '20px 0 8px' }}>{line.slice(2).replace(/\*\*/g, '')}</h2>);
    } else if (line.match(/^\d+\.\s/) || line.startsWith('- ')) {
      const isOrdered = line.match(/^\d+\.\s/);
      const items = [];
      while (i < lines.length && (lines[i].match(/^\d+\.\s/) || lines[i].startsWith('- ') || lines[i].startsWith('  '))) {
        const item = lines[i].replace(/^\d+\.\s/, '').replace(/^- /, '').replace(/^\s+/, '');
        items.push(<li key={i} style={{ marginBottom: 4 }}>{inlineMd(item)}</li>);
        i++;
      }
      const ListTag = isOrdered ? 'ol' : 'ul';
      elements.push(<ListTag key={`list-${i}`} style={{ paddingLeft: 20, margin: '8px 0' }}>{items}</ListTag>);
      continue;
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 8 }} />);
    } else {
      elements.push(<p key={i} style={{ margin: '6px 0' }}>{inlineMd(line)}</p>);
    }
    i++;
  }
  return elements;
}

function inlineMd(text) {
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch) {
      const idx = boldMatch.index;
      if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
      parts.push(<strong key={key++} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(idx + boldMatch[0].length);
    } else {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
  }
  return parts;
}

function fmt(val) {
  return (val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 });
}

export default function ReconciliationPage({ scenario, reconciliation, matchResults, periodStart, periodEnd, sessionId, approvalStatus, approvalComment, onSubmitApproval, onApprove, onReject, onBack, onNext }) {
  const toast = useToast();
  const [aiReport, setAiReport] = useState(null);
  const [aiReportLoading, setAiReportLoading] = useState(false);

  if (!reconciliation) return null;

  const sideALabel = scenario?.sideA?.shortLabel || 'A方';
  const sideBLabel = scenario?.sideB?.shortLabel || 'B方';
  const sideCLabel = scenario?.sideC?.shortLabel || null;
  const reportTitle = scenario?.reportTitle || '对账调节表';

  const { sideABalance, sideBBalance, sideAAdj, sideBAdj, sideAAdjusted, sideBAdjusted, isBalanced, matchSummary, useBalanceMode, matchedAmount, unmatchedAAmount, unmatchedBAmount, unmatchedCAmount, sideATotalAmount, sideBTotalAmount, matchRate } = reconciliation;

  const inferPeriod = () => {
    if (!matchResults) return new Date().toISOString().slice(0, 7);
    const allMatches = [
      ...(matchResults.exact || []),
      ...(matchResults.fuzzy || []),
      ...(matchResults.semantic || []),
    ];
    const dates = allMatches
      .flatMap(m => [m.sideA?.date, m.sideB?.date])
      .filter(Boolean)
      .sort();
    if (dates.length > 0) return `${dates[0]} ~ ${dates[dates.length - 1]}`;
    return new Date().toISOString().slice(0, 7);
  };
  const period = periodStart && periodEnd
    ? `${periodStart} ~ ${periodEnd}`
    : periodStart || periodEnd || inferPeriod();

  const handleExportPDF = () => {
    try {
      exportReconciliationPDF(reconciliation, matchResults, period, scenario);
      toast('PDF 报告已下载');
    } catch (e) {
      toast('导出失败: ' + e.message);
    }
  };

  const handleExportExcel = () => {
    try {
      exportReconciliationExcel(reconciliation, matchResults, period, scenario);
      toast('Excel 报告已下载');
    } catch (e) {
      toast('导出失败: ' + e.message);
    }
  };

  return (
    <div className="pc-page">
      <div className="pc-page-header">
        <div className="pc-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <h2 className="pc-page-title">{reportTitle}</h2>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 24, fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
        对账期间：{period} &nbsp;|&nbsp; 生成时间：{new Date().toLocaleString('zh-CN')}
      </div>

      {/* Result banner */}
      <div className="recon-result-banner" style={{ textAlign: 'center', padding: '32px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', border: '0.5px solid var(--border)', marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, margin: '0 auto 12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isBalanced ? 'var(--accent-light)' : 'var(--danger-light)' }}>
          {isBalanced
            ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-pressed)" strokeWidth="2"><path d="M5 13l4 4L19 7"/></svg>
            : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
          }
        </div>
        <div style={{ fontSize: '0.93rem', color: 'var(--text-primary)', marginBottom: 6 }}>
          {useBalanceMode
            ? (isBalanced ? '调节后余额一致' : '调节后余额不一致')
            : (isBalanced ? '全部单据匹配成功' : '存在未匹配单据')
          }
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 300, letterSpacing: '-0.5px', color: isBalanced ? 'var(--accent-pressed)' : 'var(--danger)' }}>
          {useBalanceMode
            ? `¥ ${fmt(sideAAdjusted)}`
            : `匹配率 ${matchRate.toFixed(1)}%`
          }
        </div>
        {useBalanceMode && !isBalanced && (
          <div style={{ marginTop: 8, fontSize: 'var(--font-sm)', color: 'var(--danger)' }}>
            差额：¥ {fmt(Math.abs(sideAAdjusted - sideBAdjusted))}
          </div>
        )}
        {!useBalanceMode && (
          <div style={{ marginTop: 8, fontSize: 'var(--font-sm)', color: 'var(--text-tertiary)' }}>
            匹配金额合计：¥ {fmt(matchedAmount)}
          </div>
        )}
      </div>

      {useBalanceMode ? (
        /* Balance mode: Dual-column reconciliation tables */
        <div className="recon-layout">
          <div className="recon-card">
            <div className="recon-card-title">{scenario?.icon || '📊'} {sideALabel}对账单</div>
            <div className="recon-card-row">
              <span className="recon-card-row-label">{scenario?.balanceLabels?.sideA || `${sideALabel}余额`}</span>
              <span className="recon-card-row-value">¥ {fmt(sideABalance)}</span>
            </div>
            {sideAAdj.adds.length > 0 && sideAAdj.adds.map((item, i) => (
              <div key={i} className="recon-card-row">
                <span className="recon-card-row-label recon-card-row-add">+ {item.date} {item.description || item.reason}</span>
                <span className="recon-card-row-value recon-card-row-add">+ ¥ {fmt(item.amount)}</span>
              </div>
            ))}
            {sideAAdj.subs.length > 0 && sideAAdj.subs.map((item, i) => (
              <div key={i} className="recon-card-row">
                <span className="recon-card-row-label recon-card-row-sub">- {item.date} {item.description || item.reason}</span>
                <span className="recon-card-row-value recon-card-row-sub">- ¥ {fmt(item.amount)}</span>
              </div>
            ))}
            <div className="recon-card-row recon-card-row-total">
              <span className="recon-card-row-label">调节后余额</span>
              <span className="recon-card-row-value">¥ {fmt(sideAAdjusted)}</span>
            </div>
          </div>

          <div className="recon-card">
            <div className="recon-card-title">📒 {sideBLabel}账面</div>
            <div className="recon-card-row">
              <span className="recon-card-row-label">{scenario?.balanceLabels?.sideB || `${sideBLabel}余额`}</span>
              <span className="recon-card-row-value">¥ {fmt(sideBBalance)}</span>
            </div>
            {sideBAdj.adds.length > 0 && sideBAdj.adds.map((item, i) => (
              <div key={i} className="recon-card-row">
                <span className="recon-card-row-label recon-card-row-add">+ {item.date} {item.description || item.reason}</span>
                <span className="recon-card-row-value recon-card-row-add">+ ¥ {fmt(item.amount)}</span>
              </div>
            ))}
            {sideBAdj.subs.length > 0 && sideBAdj.subs.map((item, i) => (
              <div key={i} className="recon-card-row">
                <span className="recon-card-row-label recon-card-row-sub">- {item.date} {item.description || item.reason}</span>
                <span className="recon-card-row-value recon-card-row-sub">- ¥ {fmt(item.amount)}</span>
              </div>
            ))}
            <div className="recon-card-row recon-card-row-total">
              <span className="recon-card-row-label">调节后余额</span>
              <span className="recon-card-row-value">¥ {fmt(sideBAdjusted)}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Match mode: per-side match summary */
        <div className="recon-layout">
          <div className="recon-card">
            <div className="recon-card-title">{scenario?.icon || '📊'} 匹配汇总</div>
            <div className="recon-card-row">
              <span className="recon-card-row-label">匹配笔数</span>
              <span className="recon-card-row-value">{(matchSummary?.exactCount || 0) + (matchSummary?.fuzzyCount || 0) + (matchSummary?.semanticCount || 0) + (matchSummary?.manyToOneCount || 0)} 笔</span>
            </div>
            <div className="recon-card-row">
              <span className="recon-card-row-label">匹配金额</span>
              <span className="recon-card-row-value">¥ {fmt(matchedAmount)}</span>
            </div>
            <div className="recon-card-row">
              <span className="recon-card-row-label">精确匹配</span>
              <span className="recon-card-row-value">{matchSummary?.exactCount || 0} 笔</span>
            </div>
            {(matchSummary?.fuzzyCount || 0) > 0 && (
              <div className="recon-card-row">
                <span className="recon-card-row-label">模糊匹配</span>
                <span className="recon-card-row-value">{matchSummary.fuzzyCount} 笔</span>
              </div>
            )}
            {(matchSummary?.semanticCount || 0) > 0 && (
              <div className="recon-card-row">
                <span className="recon-card-row-label">语义匹配</span>
                <span className="recon-card-row-value">{matchSummary.semanticCount} 笔</span>
              </div>
            )}
            {(matchSummary?.manyToOneCount || 0) > 0 && (
              <div className="recon-card-row">
                <span className="recon-card-row-label">多对一匹配</span>
                <span className="recon-card-row-value">{matchSummary.manyToOneCount} 组</span>
              </div>
            )}
            <div className="recon-card-row recon-card-row-total">
              <span className="recon-card-row-label">匹配率</span>
              <span className="recon-card-row-value">{matchRate.toFixed(1)}%</span>
            </div>
          </div>

          <div className="recon-card">
            <div className="recon-card-title">📋 各方金额</div>
            <div className="recon-card-row">
              <span className="recon-card-row-label">{sideALabel}总额</span>
              <span className="recon-card-row-value">¥ {fmt(sideATotalAmount)}</span>
            </div>
            <div className="recon-card-row">
              <span className="recon-card-row-label">{sideBLabel}总额</span>
              <span className="recon-card-row-value">¥ {fmt(sideBTotalAmount)}</span>
            </div>
            {sideCLabel && (
              <div className="recon-card-row">
                <span className="recon-card-row-label">{sideCLabel}总额</span>
                <span className="recon-card-row-value">¥ {fmt((matchedAmount || 0) + (unmatchedCAmount || 0))}</span>
              </div>
            )}
            {(matchSummary?.unmatchedACount || 0) > 0 && (
              <div className="recon-card-row">
                <span className="recon-card-row-label recon-card-row-sub">{sideALabel}未匹配</span>
                <span className="recon-card-row-value recon-card-row-sub">{matchSummary.unmatchedACount} 笔 / ¥ {fmt(unmatchedAAmount)}</span>
              </div>
            )}
            {(matchSummary?.unmatchedBCount || 0) > 0 && (
              <div className="recon-card-row">
                <span className="recon-card-row-label recon-card-row-sub">{sideBLabel}未匹配</span>
                <span className="recon-card-row-value recon-card-row-sub">{matchSummary.unmatchedBCount} 笔 / ¥ {fmt(unmatchedBAmount)}</span>
              </div>
            )}
            {(matchSummary?.unmatchedCCount || 0) > 0 && (
              <div className="recon-card-row">
                <span className="recon-card-row-label recon-card-row-sub">{sideCLabel}未匹配</span>
                <span className="recon-card-row-value recon-card-row-sub">{matchSummary.unmatchedCCount} 笔 / ¥ {fmt(unmatchedCAmount)}</span>
              </div>
            )}
            <div className="recon-card-row recon-card-row-total">
              <span className="recon-card-row-label">核验结论</span>
              <span className="recon-card-row-value" style={{ color: isBalanced ? 'var(--accent-pressed)' : 'var(--danger)' }}>
                {isBalanced ? '全部一致' : '存在差异'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* AI Report */}
      <div className="ai-report-card">
        <div className="ai-report-title">AI 对账分析</div>
        <div className="ai-report-content">
          {!aiReport && !aiReportLoading && (
            <button className="ai-analyze-btn" onClick={async () => {
              setAiReportLoading(true);
              try {
                await generateAIReport(reconciliation, matchResults, scenario, (partial) => {
                  setAiReport(partial);
                });
              } catch (e) {
                setAiReport(prev => prev || ('AI 报告生成失败: ' + e.message));
              }
              setAiReportLoading(false);
            }}>
              生成 AI 分析报告
            </button>
          )}
          {aiReportLoading && !aiReport && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-tertiary)', fontSize: 'var(--font-sm)' }}>
              <div className="cs-spinner" style={{ margin: '0 auto 8px' }} />
              AI 正在分析对账数据...
            </div>
          )}
          {aiReport && (
            <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 2 }}>
              {renderMarkdown(aiReport)}
              {aiReportLoading && <span className="ai-cursor">▊</span>}
            </div>
          )}
        </div>
      </div>

      <AuditLogPanel sessionId={sessionId} />

      <div className="btn-row" style={{ marginTop: 24 }}>
        <button className="btn-pc-outline" onClick={handleExportExcel}>导出 Excel</button>
        <button className="btn-pc-primary" onClick={onNext}>完成对账</button>
      </div>
    </div>
  );
}
