import { useState } from 'react';
import ManualMatchPanel from '../components/ManualMatchPanel';
import { classifyDifference, analyzeUnmatched } from '../utils/matchEngine';
import { aiAnalyzeDiff, aiSuggestVoucher } from '../utils/api';

function MatchItem({ match, type, matchKey, scenario, isConfirmed, isRejected, onConfirm, onReject }) {
  const [expanded, setExpanded] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const diff = type === 'fuzzy' || type === 'semantic' || type === 'manual' ? classifyDifference(match) : null;
  const needsAction = type === 'fuzzy' || type === 'semantic' || type === 'manual';

  const sideALabel = scenario?.sideA?.shortLabel || 'A方';
  const sideBLabel = scenario?.sideB?.shortLabel || 'B方';
  const sideCLabel = scenario?.sideC?.shortLabel || 'C方';

  const handleAiAnalyze = async (e) => {
    e.stopPropagation();
    setAiLoading(true);
    try {
      const result = await aiAnalyzeDiff(match.sideA, match.sideB, match.diffType, match.diffDays, match.amountDiff);
      setAiAnalysis(result);
    } catch {
      setAiAnalysis({ reason: 'AI 分析不可用', suggestion: '请人工核实', riskLevel: 'medium' });
    }
    setAiLoading(false);
  };

  return (
    <div className={`match-item ${isConfirmed ? 'match-confirmed' : ''} ${isRejected ? 'match-rejected' : ''}`}>
      <div className="match-item-header" onClick={() => setExpanded(!expanded)}>
        <div className="match-item-left">
          <span className={`tag ${match.confidence >= 90 ? 'tag-green' : match.confidence >= 70 ? 'tag-orange' : 'tag-red'}`}>
            {match.confidence}%
          </span>
          {match.manualMatch && <span className="tag tag-blue">手动</span>}
          {diff && <span className={`tag ${diff.color === 'blue' ? 'tag-blue' : diff.color === 'red' ? 'tag-red' : 'tag-orange'}`}>{diff.label}</span>}
          {match.threeway && <span className="tag tag-purple">三方匹配</span>}
          {isConfirmed && <span className="tag tag-green">已确认</span>}
          {isRejected && <span className="tag tag-red">已驳回</span>}
        </div>
        <div className="match-item-amount">
          ¥ {(match.sideA.amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </div>
      </div>
      {expanded && (
        <div className="match-item-body">
          <div className="match-pair">
            <div className="match-pair-side">
              <div className="match-pair-label">{sideALabel}</div>
              <div className="match-pair-field">{match.sideA.date}</div>
              <div className="match-pair-field">{match.sideA.description || '-'}</div>
              {match.sideA.reference && <div className="match-pair-field" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>#{match.sideA.reference}</div>}
              <div className="match-pair-amount">
                <span className={match.sideA.direction === 'debit' ? 'amount-debit' : 'amount-credit'}>
                  {match.sideA.direction === 'debit' ? '-' : '+'}¥{match.sideA.amount?.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="match-pair-arrow">⟷</div>
            <div className="match-pair-side">
              <div className="match-pair-label">{sideBLabel}</div>
              <div className="match-pair-field">{match.sideB.date}</div>
              <div className="match-pair-field">{match.sideB.description || '-'}</div>
              {match.sideB.reference && <div className="match-pair-field" style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>#{match.sideB.reference}</div>}
              <div className="match-pair-amount">
                <span className={match.sideB.direction === 'debit' ? 'amount-debit' : 'amount-credit'}>
                  {match.sideB.direction === 'debit' ? '-' : '+'}¥{match.sideB.amount?.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
          {match.threeway && match.sideC && (
            <div className="match-pair" style={{ marginTop: 8 }}>
              <div className="match-pair-side" style={{ flex: 1 }}>
                <div className="match-pair-label">{sideCLabel}</div>
                <div className="match-pair-field">{match.sideC.date}</div>
                <div className="match-pair-field">{match.sideC.description || '-'}</div>
                <div className="match-pair-amount">
                  <span className={match.sideC.direction === 'debit' ? 'amount-debit' : 'amount-credit'}>
                    {match.sideC.direction === 'debit' ? '-' : '+'}¥{match.sideC.amount?.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
          {diff && <div className="match-ai-tip">{diff.suggestion}</div>}
          {needsAction && !aiAnalysis && (
            <button className="ai-analyze-btn" onClick={handleAiAnalyze} disabled={aiLoading}>
              {aiLoading ? '分析中...' : 'AI 深度分析'}
            </button>
          )}
          {aiAnalysis && (
            <div className="match-ai-tip" style={{ borderLeftColor: aiAnalysis.riskLevel === 'high' ? 'var(--danger)' : aiAnalysis.riskLevel === 'low' ? 'var(--accent)' : 'var(--warning)' }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--font-xs)', marginBottom: 4, color: aiAnalysis.riskLevel === 'high' ? 'var(--danger)' : aiAnalysis.riskLevel === 'low' ? 'var(--accent)' : 'var(--warning)' }}>
                AI 分析 · 风险{aiAnalysis.riskLevel === 'high' ? '高' : aiAnalysis.riskLevel === 'low' ? '低' : '中'}
              </div>
              <div style={{ marginBottom: 4 }}>{aiAnalysis.reason}</div>
              <div style={{ color: 'var(--text-tertiary)' }}>{aiAnalysis.suggestion}</div>
            </div>
          )}
          {needsAction && !isConfirmed && !isRejected && (
            <div className="match-actions">
              <button className="match-action-btn confirm" onClick={(e) => { e.stopPropagation(); onConfirm(matchKey); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                确认匹配
              </button>
              <button className="match-action-btn reject" onClick={(e) => { e.stopPropagation(); onReject(matchKey); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                驳回
              </button>
            </div>
          )}
          {isConfirmed && (
            <div className="match-actions">
              <button className="match-action-btn reject" onClick={(e) => { e.stopPropagation(); onReject(matchKey); }}>撤销确认</button>
            </div>
          )}
          {isRejected && (
            <div className="match-actions">
              <button className="match-action-btn confirm" onClick={(e) => { e.stopPropagation(); onConfirm(matchKey); }}>重新确认</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InputErrorItem({ error, scenario }) {
  const [expanded, setExpanded] = useState(false);
  const sideALabel = scenario?.sideA?.shortLabel || 'A方';
  const sideBLabel = scenario?.sideB?.shortLabel || 'B方';

  return (
    <div className="match-item" style={{ borderColor: 'rgba(90,93,240,0.3)' }}>
      <div className="match-item-header" onClick={() => setExpanded(!expanded)}>
        <div className="match-item-left">
          <span className="tag tag-purple">录入错误</span>
          <span className="tag" style={{ background: 'rgba(90,93,240,0.08)', color: 'var(--info)', fontSize: 10 }}>
            {error.errorType === 'digit_transpose' ? '数字翻转' : '小数点位错'}
          </span>
        </div>
        <div className="match-item-amount" style={{ color: 'var(--info)' }}>
          ¥ {error.sideAAmount.toFixed(2)} / ¥ {error.sideBAmount.toFixed(2)}
        </div>
      </div>
      {expanded && (
        <div className="match-item-body">
          <div className="match-pair">
            <div className="match-pair-side">
              <div className="match-pair-label">{sideALabel}</div>
              <div className="match-pair-field">{error.sideA.date}</div>
              <div className="match-pair-field">{error.sideA.description || '-'}</div>
              <div className="match-pair-amount">
                <span style={{ color: 'var(--info)', fontWeight: 700 }}>¥ {error.sideAAmount.toFixed(2)}</span>
              </div>
            </div>
            <div className="match-pair-arrow" style={{ color: 'var(--info)' }}>≠</div>
            <div className="match-pair-side">
              <div className="match-pair-label">{sideBLabel}</div>
              <div className="match-pair-field">{error.sideB.date}</div>
              <div className="match-pair-field">{error.sideB.description || '-'}</div>
              <div className="match-pair-amount">
                <span style={{ color: 'var(--danger)', fontWeight: 700 }}>¥ {error.sideBAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="match-ai-tip" style={{ borderLeftColor: 'var(--info)' }}>
            {error.suggestion}
          </div>
        </div>
      )}
    </div>
  );
}

function ManyToOneItem({ group, scenario }) {
  const [expanded, setExpanded] = useState(false);
  const sideALabel = scenario?.sideA?.shortLabel || 'A方';
  const sideBLabel = scenario?.sideB?.shortLabel || 'B方';
  const targetLabel = group.direction === 'aToB' ? sideBLabel : sideALabel;
  const partsLabel = group.direction === 'aToB' ? sideALabel : sideBLabel;

  return (
    <div className="match-item" style={{ borderColor: 'rgba(53,116,224,0.3)' }}>
      <div className="match-item-header" onClick={() => setExpanded(!expanded)}>
        <div className="match-item-left">
          <span className="tag tag-blue">{group.parts.length}:1</span>
          <span className="tag tag-blue">合并匹配</span>
        </div>
        <div className="match-item-amount">
          ¥ {(group.target.amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </div>
      </div>
      {expanded && (
        <div className="match-item-body">
          <div style={{ padding: '10px 12px', background: 'var(--blue-light)', borderRadius: 'var(--radius-sm)', marginTop: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 600, marginBottom: 4 }}>{targetLabel}（合计）</div>
            <div style={{ fontSize: 'var(--font-sm)' }}>{group.target.date} · {group.target.description || '-'}</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>¥ {group.target.amount?.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 10, marginBottom: 4 }}>{partsLabel}（{group.parts.length} 笔明细）</div>
          {group.parts.map((p, i) => (
            <div key={i} style={{ padding: '6px 12px', background: 'var(--bg-input)', borderRadius: 6, marginBottom: 4, fontSize: 'var(--font-xs)' }}>
              {p.entry.date} · {p.entry.description || '-'} · ¥{p.entry.amount?.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
          ))}
          <div className="match-ai-tip" style={{ borderLeftColor: 'var(--blue)' }}>
            {group.parts.length} 笔明细合计 ¥{group.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}，
            与{targetLabel}记录金额一致，属于合并/拆分记账差异。
          </div>
        </div>
      )}
    </div>
  );
}

function ReversalItem({ reversal, label }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="match-item" style={{ borderColor: 'rgba(221,140,4,0.3)' }}>
      <div className="match-item-header" onClick={() => setExpanded(!expanded)}>
        <div className="match-item-left">
          <span className="tag tag-orange">冲销</span>
          <span className="tag" style={{ background: 'rgba(221,140,4,0.08)', color: 'var(--warning)', fontSize: 10 }}>{label}</span>
        </div>
        <div className="match-item-amount" style={{ color: 'var(--warning)' }}>
          ¥ {reversal.entry1.amount?.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </div>
      </div>
      {expanded && (
        <div className="match-item-body">
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <div style={{ flex: 1, padding: 10, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-xs)' }}>
              <div style={{ color: 'var(--accent)', fontWeight: 600 }}>+¥{reversal.entry1.amount?.toFixed(2)}</div>
              <div style={{ marginTop: 4, color: 'var(--text-secondary)' }}>{reversal.entry1.date} · {reversal.entry1.description || '-'}</div>
            </div>
            <div style={{ flex: 1, padding: 10, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-xs)' }}>
              <div style={{ color: 'var(--danger)', fontWeight: 600 }}>-¥{reversal.entry2.amount?.toFixed(2)}</div>
              <div style={{ marginTop: 4, color: 'var(--text-secondary)' }}>{reversal.entry2.date} · {reversal.entry2.description || '-'}</div>
            </div>
          </div>
          <div className="match-ai-tip" style={{ borderLeftColor: 'var(--warning)' }}>
            这对记录金额相同、方向相反且摘要相似，疑似冲销/红冲。对账时可考虑互抵处理。
          </div>
        </div>
      )}
    </div>
  );
}

function UnmatchedItem({ item, scenario }) {
  const [expanded, setExpanded] = useState(false);
  const [aiVoucher, setAiVoucher] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const info = analyzeUnmatched(item, scenario);
  const entry = item.entry;

  const sourceLabel = item.source === 'sideA'
    ? (scenario?.sideA?.shortLabel || 'A方')
    : item.source === 'sideB'
      ? (scenario?.sideB?.shortLabel || 'B方')
      : (scenario?.sideC?.shortLabel || 'C方');

  const handleAiVoucher = async (e) => {
    e.stopPropagation();
    setAiLoading(true);
    try {
      const result = await aiSuggestVoucher(entry, info.type);
      setAiVoucher(result);
    } catch {
      setAiVoucher({ debitAccount: '待确认', creditAccount: '待确认', amount: entry.amount, summary: entry.description, explanation: 'AI 建议不可用，请人工判断' });
    }
    setAiLoading(false);
  };

  const voucher = aiVoucher || info.voucherSuggestion;

  return (
    <div className="match-item">
      <div className="match-item-header" onClick={() => setExpanded(!expanded)}>
        <div className="match-item-left">
          <span className="tag tag-red">{sourceLabel}</span>
          <span className={`tag ${info.type === 'sideA_only' ? 'tag-orange' : info.type === 'sideC_only' ? 'tag-purple' : 'tag-blue'}`}>{info.label}</span>
        </div>
        <div className="match-item-amount">
          ¥ {(entry.amount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </div>
      </div>
      {expanded && (
        <div className="match-item-body">
          <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: 12, marginTop: 12 }}>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginBottom: 6 }}>
              {sourceLabel}记录
            </div>
            <div style={{ fontSize: 'var(--font-sm)', marginBottom: 4 }}>{entry.date} · {entry.description || '-'}</div>
            <div style={{ fontSize: 'var(--font-sm)', marginBottom: 4 }}>{entry.counterparty || ''}</div>
            {entry.reference && <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4 }}>#{entry.reference}</div>}
            <div className={entry.direction === 'debit' ? 'amount-debit' : 'amount-credit'}>
              {entry.direction === 'debit' ? '-' : '+'}¥{entry.amount?.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="match-ai-tip">{info.suggestion}</div>
          {!aiVoucher && (
            <button className="ai-analyze-btn" onClick={handleAiVoucher} disabled={aiLoading}>
              {aiLoading ? '生成中...' : 'AI 凭证建议'}
            </button>
          )}
          {voucher && (
            <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--warning-light)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-xs)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--warning)' }}>
                {aiVoucher ? 'AI 建议补记凭证' : '建议补记凭证'}
              </div>
              <div>借：{voucher.debitAccount} — ¥{voucher.amount?.toFixed(2)}</div>
              <div>贷：{voucher.creditAccount} — ¥{voucher.amount?.toFixed(2)}</div>
              {aiVoucher?.explanation && (
                <div style={{ marginTop: 6, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{aiVoucher.explanation}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResultsPage({ scenario, matchResults, confirmedMatches, rejectedMatches, onConfirmMatch, onRejectMatch, onManualMatch, onBack, onNext }) {
  const [tab, setTab] = useState('overview');
  const [showManualMatch, setShowManualMatch] = useState(false);

  if (!matchResults) return null;

  const sideALabel = scenario?.sideA?.shortLabel || 'A方';
  const sideBLabel = scenario?.sideB?.shortLabel || 'B方';
  const sideCLabel = scenario?.sideC?.shortLabel || null;

  const { exact, fuzzy, semantic, unmatchedA, unmatchedB, manyToOne } = matchResults;
  const unmatchedC = matchResults.unmatchedC || [];
  const inputErrors = matchResults.inputErrors || [];
  const reversalsA = matchResults.reversalsA || [];
  const reversalsB = matchResults.reversalsB || [];
  const matchedCount = exact.length + fuzzy.length + semantic.length;
  const manyToOneCount = (manyToOne || []).reduce((s, g) => s + g.parts.length, 0);
  const pendingCount = fuzzy.length + semantic.length;
  const unmatchedCount = unmatchedA.length + unmatchedB.length + unmatchedC.length;
  const totalCount = matchedCount + manyToOneCount + unmatchedCount;

  const sideATotalCount = matchResults.sideATotalCount || 0;
  const sideBTotalCount = matchResults.sideBTotalCount || 0;

  const rejectedCount = Object.keys(rejectedMatches).length;
  const confirmedCount = Object.keys(confirmedMatches).length;
  const unreviewedCount = pendingCount - confirmedCount - rejectedCount;

  const exactAmount = exact.reduce((s, m) => s + (m.sideA.amount || 0), 0);
  const matchedAmount = [...exact, ...fuzzy, ...semantic].reduce((s, m) => s + (m.sideA.amount || 0), 0);
  const pendingAmount = [...fuzzy, ...semantic].reduce((s, m) => s + (m.sideA.amount || 0), 0);
  const unmatchedAmount = [...unmatchedA, ...unmatchedB, ...unmatchedC].reduce((s, m) => s + (m.entry.amount || 0), 0);

  return (
    <div className="pc-page">
      <div className="pc-page-header">
        <div className="pc-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </div>
        <h2 className="pc-page-title">对账结果</h2>
      </div>

      <div className="results-layout">
        <div className="results-main">
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
          <span>{sideALabel}：{sideATotalCount} 笔</span>
          <span>{sideBLabel}：{sideBTotalCount} 笔</span>
        </div>

        <div className="stats-grid mb-md">
          <div className="stat-card green">
            <div className="stat-card-value">{exact.length}</div>
            <div className="stat-card-sub">¥ {exactAmount.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</div>
            <div className="stat-card-label">精确匹配</div>
          </div>
          <div className="stat-card orange">
            <div className="stat-card-value">{pendingCount}</div>
            <div className="stat-card-sub">¥ {pendingAmount.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</div>
            <div className="stat-card-label">待确认</div>
          </div>
          <div className="stat-card red">
            <div className="stat-card-value">{unmatchedCount}</div>
            <div className="stat-card-sub">¥ {unmatchedAmount.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}</div>
            <div className="stat-card-label">未匹配</div>
          </div>
        </div>

        <div style={{ background: 'var(--accent-light)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 12, fontSize: 'var(--font-sm)', color: 'var(--accent)' }}>
          匹配率 {totalCount > 0 ? (((matchedCount + manyToOneCount) / totalCount) * 100).toFixed(1) : 0}% · 已匹配 {matchedCount + manyToOneCount} 笔 / 共 {totalCount} 笔
        </div>

        {pendingCount > 0 && (
          <div style={{ background: 'var(--warning-light)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 12, fontSize: 'var(--font-xs)', color: 'var(--warning)', display: 'flex', justifyContent: 'space-between' }}>
            <span>审核进度</span>
            <span>{confirmedCount} 已确认 · {rejectedCount} 已驳回 · {unreviewedCount > 0 ? `${unreviewedCount} 待审核` : '全部完成'}</span>
          </div>
        )}

        {unmatchedCount > 0 && (
          <button
            className="btn btn-secondary btn-sm mb-md"
            onClick={() => setShowManualMatch(true)}
            style={{ maxWidth: 'none' }}
          >
            手动匹配未配对项
          </button>
        )}

        <div className="tabs">
          <div className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>全部</div>
          <div className={`tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
            待确认{unreviewedCount > 0 ? ` (${unreviewedCount})` : ''}
          </div>
          <div className={`tab ${tab === 'unmatched' ? 'active' : ''}`} onClick={() => setTab('unmatched')}>未匹配 ({unmatchedCount})</div>
          {(inputErrors.length > 0 || reversalsA.length > 0 || reversalsB.length > 0 || (manyToOne || []).length > 0) && (
            <div className={`tab ${tab === 'special' ? 'active' : ''}`} onClick={() => setTab('special')}>
              特殊项 ({inputErrors.length + reversalsA.length + reversalsB.length + (manyToOne || []).length})
            </div>
          )}
        </div>

        {tab === 'special' && (
          <>
            {(manyToOne || []).length > 0 && (
              <>
                <div className="section-title">
                  <span className="section-dot" style={{ background: 'var(--blue)' }} />
                  合并匹配（一对多/多对一）
                </div>
                {manyToOne.map((g, i) => (
                  <ManyToOneItem key={`mto-${i}`} group={g} scenario={scenario} />
                ))}
              </>
            )}

            {(reversalsA.length > 0 || reversalsB.length > 0) && (
              <>
                <div className="section-title">
                  <span className="section-dot" style={{ background: 'var(--warning)' }} />
                  疑似冲销/红冲
                </div>
                {reversalsA.map((r, i) => (
                  <ReversalItem key={`revA-${i}`} reversal={r} label={sideALabel} />
                ))}
                {reversalsB.map((r, i) => (
                  <ReversalItem key={`revB-${i}`} reversal={r} label={sideBLabel} />
                ))}
              </>
            )}

            {inputErrors.length > 0 && (
              <>
                <div className="section-title">
                  <span className="section-dot" style={{ background: 'var(--info)' }} />
                  疑似录入错误
                </div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                  以下交易金额疑似存在录入错误（数字翻转或小数点位移），建议核实原始凭证
                </div>
                {inputErrors.map((err, i) => (
                  <InputErrorItem key={`err-${i}`} error={err} scenario={scenario} />
                ))}
              </>
            )}
          </>
        )}

        {(tab === 'overview' || tab === 'pending') && pendingCount > 0 && (
          <>
            <div className="section-title">
              <span className="section-dot" style={{ background: 'var(--warning)' }} />
              模糊/语义匹配 · 需确认
            </div>
            {[...fuzzy.map((m, i) => ({ ...m, _key: `fuzzy-${i}` })), ...semantic.map((m, i) => ({ ...m, _key: `semantic-${i}` }))].filter(m => {
              if (tab === 'pending') return !confirmedMatches[m._key] && !rejectedMatches[m._key];
              return true;
            }).map(m => (
              <MatchItem
                key={m._key}
                match={m}
                type={m.type}
                matchKey={m._key}
                scenario={scenario}
                isConfirmed={!!confirmedMatches[m._key]}
                isRejected={!!rejectedMatches[m._key]}
                onConfirm={onConfirmMatch}
                onReject={onRejectMatch}
              />
            ))}
          </>
        )}

        {(tab === 'overview' || tab === 'unmatched') && unmatchedCount > 0 && (
          <>
            <div className="section-title">
              <span className="section-dot" style={{ background: 'var(--danger)' }} />
              未匹配项
            </div>
            {unmatchedA.length > 0 && (
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginBottom: 4, marginTop: 8 }}>
                {sideALabel}未匹配 ({unmatchedA.length})
              </div>
            )}
            {unmatchedA.map((u, i) => (
              <UnmatchedItem key={`unmatchedA-${i}`} item={u} scenario={scenario} />
            ))}
            {unmatchedB.length > 0 && (
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginBottom: 4, marginTop: 8 }}>
                {sideBLabel}未匹配 ({unmatchedB.length})
              </div>
            )}
            {unmatchedB.map((u, i) => (
              <UnmatchedItem key={`unmatchedB-${i}`} item={u} scenario={scenario} />
            ))}
            {unmatchedC.length > 0 && (
              <>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginBottom: 4, marginTop: 8 }}>
                  {sideCLabel}未匹配 ({unmatchedC.length})
                </div>
                {unmatchedC.map((u, i) => (
                  <UnmatchedItem key={`unmatchedC-${i}`} item={u} scenario={scenario} />
                ))}
              </>
            )}
          </>
        )}

        {tab === 'overview' && exact.length > 0 && (
          <>
            <div className="section-title">
              <span className="section-dot" style={{ background: 'var(--accent)' }} />
              精确匹配 ({exact.length} 笔)
            </div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginBottom: 8 }}>
              以下交易已精确匹配，点击可展开详情
            </div>
            {exact.slice(0, 10).map((m, i) => (
              <MatchItem
                key={`exact-${i}`}
                match={m}
                type="exact"
                matchKey={`exact-${i}`}
                scenario={scenario}
                isConfirmed={false}
                isRejected={false}
                onConfirm={() => {}}
                onReject={() => {}}
              />
            ))}
            {exact.length > 10 && (
              <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>
                显示前 10 条 / 共 {exact.length} 条精确匹配
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <button className="btn-pc-primary" onClick={onNext}>
            生成{scenario?.reportTitle || '对账报告'}
          </button>
        </div>
        </div>

        <div className="results-summary">
          <div className="summary-card">
            <div className="summary-card-title">对账摘要</div>
            <div className="summary-row"><span className="summary-row-label">{sideALabel}总笔数</span><span className="summary-row-value">{sideATotalCount}</span></div>
            <div className="summary-row"><span className="summary-row-label">{sideBLabel}总笔数</span><span className="summary-row-value">{sideBTotalCount}</span></div>
            <div className="summary-row" style={{ borderTop: '0.5px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
              <span className="summary-row-label">匹配率</span>
              <span className="summary-row-value" style={{ color: 'var(--accent-pressed)' }}>
                {totalCount > 0 ? (((matchedCount + manyToOneCount) / totalCount) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-card-title">匹配明细</div>
            <div className="summary-row"><span className="summary-row-label">精确匹配</span><span className="summary-row-value">{exact.length} 笔</span></div>
            <div className="summary-row"><span className="summary-row-label">模糊匹配</span><span className="summary-row-value">{fuzzy.length} 笔</span></div>
            <div className="summary-row"><span className="summary-row-label">语义匹配</span><span className="summary-row-value">{semantic.length} 笔</span></div>
            {(manyToOne || []).length > 0 && (
              <div className="summary-row"><span className="summary-row-label">合并匹配</span><span className="summary-row-value">{(manyToOne || []).length} 组</span></div>
            )}
            <div className="summary-row"><span className="summary-row-label">未匹配({sideALabel})</span><span className="summary-row-value" style={{ color: 'var(--danger)' }}>{unmatchedA.length} 笔</span></div>
            <div className="summary-row"><span className="summary-row-label">未匹配({sideBLabel})</span><span className="summary-row-value" style={{ color: 'var(--danger)' }}>{unmatchedB.length} 笔</span></div>
          </div>
        </div>
      </div>

      {showManualMatch && (
        <ManualMatchPanel
          unmatchedA={unmatchedA}
          unmatchedB={unmatchedB}
          scenario={scenario}
          onMatch={(aIdx, bIdx) => {
            onManualMatch(aIdx, bIdx);
            setShowManualMatch(false);
          }}
          onClose={() => setShowManualMatch(false)}
        />
      )}
    </div>
  );
}
