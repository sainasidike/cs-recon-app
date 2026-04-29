import { useState, useCallback, useEffect } from 'react';
import { BANK_DATA, LEDGER_DATA, COMPANY_INFO, BANK_TOTAL_OUT, BANK_TOTAL_IN, LEDGER_TOTAL_DEBIT, LEDGER_TOTAL_CREDIT } from './demoData';
import { runMatching } from './matchEngine';

function fmt(v) {
  return (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 });
}

const STEPS = [
  { key: 'upload', label: '上传文档' },
  { key: 'preview', label: '数据预览' },
  { key: 'matching', label: 'AI匹配' },
  { key: 'results', label: '匹配结果' },
  { key: 'report', label: '调节表' },
  { key: 'complete', label: '完成' },
];

export default function ReconApp() {
  const [step, setStep] = useState('upload');
  const [matchResults, setMatchResults] = useState(null);
  const [confirmed, setConfirmed] = useState({});
  const [rejected, setRejected] = useState({});
  const [analysisSteps, setAnalysisSteps] = useState([]);
  const [activePreviewTab, setActivePreviewTab] = useState('bank');
  const [activeResultTab, setActiveResultTab] = useState('exact');

  const stepIdx = STEPS.findIndex(s => s.key === step);

  const handleStartAnalysis = useCallback(() => {
    setStep('matching');
    setAnalysisSteps([]);

    const steps = [
      { text: '解析银行流水文档...', delay: 400 },
      { text: '识别到 20 笔银行交易记录', delay: 800 },
      { text: '解析企业账簿文档...', delay: 1200 },
      { text: '识别到 20 笔企业记账凭证', delay: 1600 },
      { text: '执行第一轮精确匹配（金额+日期）...', delay: 2200 },
      { text: '执行第二轮模糊匹配（容差±3天）...', delay: 2800 },
      { text: '执行第三轮语义匹配（描述相似度）...', delay: 3400 },
      { text: '检测未达账项...', delay: 3800 },
      { text: '生成匹配报告...', delay: 4200 },
    ];

    steps.forEach(({ text, delay }) => {
      setTimeout(() => setAnalysisSteps(prev => [...prev, text]), delay);
    });

    setTimeout(() => {
      const results = runMatching(BANK_DATA, LEDGER_DATA);
      setMatchResults(results);
      setStep('results');
    }, 4800);
  }, []);

  const handleConfirm = useCallback((key) => {
    setConfirmed(prev => ({ ...prev, [key]: true }));
    setRejected(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  const handleReject = useCallback((key) => {
    setRejected(prev => ({ ...prev, [key]: true }));
    setConfirmed(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  return (
    <div className="rc">
      {/* Progress Bar */}
      <div className="rc-progress">
        {STEPS.map((s, i) => (
          <div key={s.key} className={`rc-progress-step ${i <= stepIdx ? 'active' : ''} ${i === stepIdx ? 'current' : ''}`}>
            <div className="rc-progress-dot">{i < stepIdx ? '✓' : i + 1}</div>
            <span className="rc-progress-label">{s.label}</span>
          </div>
        ))}
        <div className="rc-progress-line" style={{ width: `${(stepIdx / (STEPS.length - 1)) * 100}%` }} />
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="rc-section">
          <div className="rc-hero">
            <div className="rc-hero-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18" />
              </svg>
            </div>
            <h2>银行余额调节表</h2>
            <p className="rc-hero-sub">杭州锦鲤餐饮管理有限公司 · {COMPANY_INFO.period}</p>
          </div>

          <div className="rc-info-grid">
            <div className="rc-info-item">
              <span className="rc-info-label">开户行</span>
              <span className="rc-info-value">{COMPANY_INFO.bank}</span>
            </div>
            <div className="rc-info-item">
              <span className="rc-info-label">账号</span>
              <span className="rc-info-value">{COMPANY_INFO.account}</span>
            </div>
            <div className="rc-info-item">
              <span className="rc-info-label">对账期间</span>
              <span className="rc-info-value">{COMPANY_INFO.periodStart} ~ {COMPANY_INFO.periodEnd}</span>
            </div>
            <div className="rc-info-item">
              <span className="rc-info-label">期初余额</span>
              <span className="rc-info-value">¥{fmt(COMPANY_INFO.openingBalance)}</span>
            </div>
          </div>

          <div className="rc-file-cards">
            <div className="rc-file-card">
              <div className="rc-file-icon bank">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" /></svg>
              </div>
              <div className="rc-file-info">
                <div className="rc-file-name">银行对账单_锦鲤餐饮_202604.xlsx</div>
                <div className="rc-file-meta">{BANK_DATA.length} 笔交易 · 支出 ¥{fmt(BANK_TOTAL_OUT)} · 收入 ¥{fmt(BANK_TOTAL_IN)}</div>
              </div>
              <div className="rc-file-status">✓</div>
            </div>
            <div className="rc-file-card">
              <div className="rc-file-icon ledger">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
              </div>
              <div className="rc-file-info">
                <div className="rc-file-name">企业账簿_锦鲤餐饮_202604.xlsx</div>
                <div className="rc-file-meta">{LEDGER_DATA.length} 笔凭证 · 借方 ¥{fmt(LEDGER_TOTAL_DEBIT)} · 贷方 ¥{fmt(LEDGER_TOTAL_CREDIT)}</div>
              </div>
              <div className="rc-file-status">✓</div>
            </div>
          </div>

          <div className="rc-bottom">
            <button className="rc-btn-primary" onClick={() => setStep('preview')}>查看数据</button>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div className="rc-section">
          <div className="rc-tabs">
            <button className={`rc-tab ${activePreviewTab === 'bank' ? 'active' : ''}`} onClick={() => setActivePreviewTab('bank')}>
              银行流水 ({BANK_DATA.length})
            </button>
            <button className={`rc-tab ${activePreviewTab === 'ledger' ? 'active' : ''}`} onClick={() => setActivePreviewTab('ledger')}>
              企业账簿 ({LEDGER_DATA.length})
            </button>
          </div>

          <div className="rc-table-wrap">
            {activePreviewTab === 'bank' ? (
              <table className="rc-table">
                <thead>
                  <tr><th>日期</th><th>摘要</th><th>对方</th><th>支出</th><th>收入</th><th>余额</th></tr>
                </thead>
                <tbody>
                  {BANK_DATA.map(r => (
                    <tr key={r.id}>
                      <td className="rc-td-date">{r.date}</td>
                      <td className="rc-td-desc">{r.desc}</td>
                      <td className="rc-td-desc">{r.payee}</td>
                      <td className="rc-td-amt out">{r.out ? fmt(r.out) : ''}</td>
                      <td className="rc-td-amt in">{r.income ? fmt(r.income) : ''}</td>
                      <td className="rc-td-amt">{fmt(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>合计</td>
                    <td className="rc-td-amt out" style={{ fontWeight: 600 }}>{fmt(BANK_TOTAL_OUT)}</td>
                    <td className="rc-td-amt in" style={{ fontWeight: 600 }}>{fmt(BANK_TOTAL_IN)}</td>
                    <td className="rc-td-amt" style={{ fontWeight: 600 }}>{fmt(COMPANY_INFO.closingBalance)}</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <table className="rc-table">
                <thead>
                  <tr><th>日期</th><th>摘要</th><th>对方</th><th>借方</th><th>贷方</th><th>凭证号</th></tr>
                </thead>
                <tbody>
                  {LEDGER_DATA.map(r => (
                    <tr key={r.id}>
                      <td className="rc-td-date">{r.date}</td>
                      <td className="rc-td-desc">{r.desc}</td>
                      <td className="rc-td-desc">{r.payee}</td>
                      <td className="rc-td-amt out">{r.debit ? fmt(r.debit) : ''}</td>
                      <td className="rc-td-amt in">{r.credit ? fmt(r.credit) : ''}</td>
                      <td className="rc-td-ref">{r.voucher}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>合计</td>
                    <td className="rc-td-amt out" style={{ fontWeight: 600 }}>{fmt(LEDGER_TOTAL_DEBIT)}</td>
                    <td className="rc-td-amt in" style={{ fontWeight: 600 }}>{fmt(LEDGER_TOTAL_CREDIT)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          <div className="rc-bottom">
            <button className="rc-btn-secondary" onClick={() => setStep('upload')}>返回</button>
            <button className="rc-btn-primary" onClick={handleStartAnalysis}>开始AI匹配</button>
          </div>
        </div>
      )}

      {/* Step: Matching (AI Analysis) */}
      {step === 'matching' && (
        <div className="rc-section rc-center">
          <div className="rc-analysis">
            <div className="rc-analysis-brain">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="1.2">
                <path d="M12 2a7 7 0 00-7 7c0 2.5 1.5 4.5 3 6l1 3h6l1-3c1.5-1.5 3-3.5 3-6a7 7 0 00-7-7z" />
                <path d="M9 18h6M10 21h4" />
              </svg>
              <div className="rc-analysis-pulse" />
            </div>
            <h3>AI 智能对账分析中</h3>
            <div className="rc-analysis-steps">
              {analysisSteps.map((s, i) => (
                <div key={i} className="rc-analysis-step">
                  <span className="rc-analysis-check">✓</span>
                  <span>{s}</span>
                </div>
              ))}
              {analysisSteps.length < 9 && (
                <div className="rc-analysis-step loading">
                  <div className="rc-mini-spinner" />
                  <span>处理中...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step: Results */}
      {step === 'results' && matchResults && (
        <div className="rc-section">
          <div className="rc-stats-row">
            <div className="rc-stat">
              <div className="rc-stat-value">{matchResults.matchedCount}</div>
              <div className="rc-stat-label">匹配笔数</div>
            </div>
            <div className="rc-stat">
              <div className="rc-stat-value accent">¥{fmt(matchResults.matchedAmt)}</div>
              <div className="rc-stat-label">匹配金额</div>
            </div>
            <div className="rc-stat">
              <div className="rc-stat-value danger">{matchResults.unmatchedBank.length + matchResults.unmatchedLedger.length}</div>
              <div className="rc-stat-label">未匹配</div>
            </div>
            <div className="rc-stat">
              <div className="rc-stat-value">{matchResults.matchRate.toFixed(1)}%</div>
              <div className="rc-stat-label">匹配率</div>
            </div>
          </div>

          <div className="rc-tabs">
            <button className={`rc-tab ${activeResultTab === 'exact' ? 'active' : ''}`} onClick={() => setActiveResultTab('exact')}>
              精确 ({matchResults.exact.length})
            </button>
            <button className={`rc-tab ${activeResultTab === 'fuzzy' ? 'active' : ''}`} onClick={() => setActiveResultTab('fuzzy')}>
              模糊 ({matchResults.fuzzy.length + matchResults.semantic.length})
            </button>
            <button className={`rc-tab ${activeResultTab === 'unmatched' ? 'active' : ''}`} onClick={() => setActiveResultTab('unmatched')}>
              未匹配 ({matchResults.unmatchedBank.length + matchResults.unmatchedLedger.length})
            </button>
          </div>

          {activeResultTab === 'exact' && matchResults.exact.map((m, i) => {
            const key = `exact-${i}`;
            return (
              <div key={key} className="rc-match-card">
                <div className="rc-match-head">
                  <span className="rc-badge exact">精确</span>
                  <span className="rc-match-score">{m.score}%</span>
                  <span className="rc-match-amt">¥{fmt(m.bank.out || m.bank.income)}</span>
                </div>
                <div className="rc-match-pair">
                  <div className="rc-match-side">
                    <span className="rc-match-tag bank">银行</span>
                    <span>{m.bank.date}</span>
                    <span className="rc-match-desc">{m.bank.desc}</span>
                  </div>
                  <div className="rc-match-arrow">↔</div>
                  <div className="rc-match-side">
                    <span className="rc-match-tag ledger">企业</span>
                    <span>{m.ledger.date}</span>
                    <span className="rc-match-desc">{m.ledger.desc}</span>
                  </div>
                </div>
                {!confirmed[key] && !rejected[key] && (
                  <div className="rc-match-actions">
                    <button className="rc-action-btn confirm" onClick={() => handleConfirm(key)}>✓ 确认</button>
                    <button className="rc-action-btn reject" onClick={() => handleReject(key)}>✗ 驳回</button>
                  </div>
                )}
                {confirmed[key] && <div className="rc-match-status confirmed">✓ 已确认</div>}
                {rejected[key] && <div className="rc-match-status rejected">✗ 已驳回</div>}
              </div>
            );
          })}

          {activeResultTab === 'fuzzy' && [...matchResults.fuzzy, ...matchResults.semantic].map((m, i) => {
            const key = `fuzzy-${i}`;
            return (
              <div key={key} className="rc-match-card">
                <div className="rc-match-head">
                  <span className={`rc-badge ${m.score >= 75 ? 'fuzzy' : 'semantic'}`}>{m.score >= 75 ? '模糊' : '语义'}</span>
                  <span className="rc-match-score">{m.score}%</span>
                  <span className="rc-match-amt">¥{fmt(m.bank.out || m.bank.income)}</span>
                </div>
                <div className="rc-match-pair">
                  <div className="rc-match-side">
                    <span className="rc-match-tag bank">银行</span>
                    <span>{m.bank.date}</span>
                    <span className="rc-match-desc">{m.bank.desc}</span>
                  </div>
                  <div className="rc-match-arrow">↔</div>
                  <div className="rc-match-side">
                    <span className="rc-match-tag ledger">企业</span>
                    <span>{m.ledger.date}</span>
                    <span className="rc-match-desc">{m.ledger.desc}</span>
                  </div>
                </div>
                {m.daysDiff > 0 && <div className="rc-match-diff">日期差异 {m.daysDiff} 天</div>}
                {!confirmed[key] && !rejected[key] && (
                  <div className="rc-match-actions">
                    <button className="rc-action-btn confirm" onClick={() => handleConfirm(key)}>✓ 确认</button>
                    <button className="rc-action-btn reject" onClick={() => handleReject(key)}>✗ 驳回</button>
                  </div>
                )}
                {confirmed[key] && <div className="rc-match-status confirmed">✓ 已确认</div>}
                {rejected[key] && <div className="rc-match-status rejected">✗ 已驳回</div>}
              </div>
            );
          })}

          {activeResultTab === 'unmatched' && (
            <>
              {matchResults.unmatchedBank.length > 0 && (
                <div className="rc-card">
                  <div className="rc-card-title danger">银行未达账项 ({matchResults.unmatchedBank.length})</div>
                  <div className="rc-card-hint">银行已入账，企业尚未记录</div>
                  {matchResults.unmatchedBank.map(b => (
                    <div key={b.id} className="rc-unmatched-row">
                      <span className="rc-um-date">{b.date}</span>
                      <span className="rc-um-desc">{b.desc}</span>
                      <span className={`rc-um-amt ${b.out ? 'out' : 'in'}`}>
                        {b.out ? `-¥${fmt(b.out)}` : `+¥${fmt(b.income)}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {matchResults.unmatchedLedger.length > 0 && (
                <div className="rc-card">
                  <div className="rc-card-title danger">企业未达账项 ({matchResults.unmatchedLedger.length})</div>
                  <div className="rc-card-hint">企业已记账，银行尚未入账</div>
                  {matchResults.unmatchedLedger.map(l => (
                    <div key={l.id} className="rc-unmatched-row">
                      <span className="rc-um-date">{l.date}</span>
                      <span className="rc-um-desc">{l.desc}</span>
                      <span className={`rc-um-amt ${l.debit ? 'out' : 'in'}`}>
                        {l.debit ? `-¥${fmt(l.debit)}` : `+¥${fmt(l.credit)}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="rc-bottom">
            <button className="rc-btn-secondary" onClick={() => setStep('preview')}>返回</button>
            <button className="rc-btn-primary" onClick={() => setStep('report')}>生成调节表</button>
          </div>
        </div>
      )}

      {/* Step: Report */}
      {step === 'report' && matchResults && (
        <div className="rc-section">
          <div className="rc-report-header">
            <h3>银行存款余额调节表</h3>
            <p>{COMPANY_INFO.name}</p>
            <p className="rc-report-period">{COMPANY_INFO.periodStart} 至 {COMPANY_INFO.periodEnd}</p>
          </div>

          <div className="rc-report-grid">
            <div className="rc-report-col">
              <div className="rc-report-col-title">银行对账单</div>
              <div className="rc-report-row">
                <span>期末余额</span>
                <span className="rc-report-val">¥{fmt(COMPANY_INFO.closingBalance)}</span>
              </div>
              {matchResults.unmatchedLedger.filter(l => l.credit).map((l, i) => (
                <div key={i} className="rc-report-row add">
                  <span>加：企业已收银行未收 - {l.desc}</span>
                  <span className="rc-report-val">+¥{fmt(l.credit)}</span>
                </div>
              ))}
              {matchResults.unmatchedLedger.filter(l => l.debit).map((l, i) => (
                <div key={i} className="rc-report-row sub">
                  <span>减：企业已付银行未付 - {l.desc}</span>
                  <span className="rc-report-val">-¥{fmt(l.debit)}</span>
                </div>
              ))}
              {(() => {
                const adj = COMPANY_INFO.closingBalance
                  + matchResults.unmatchedLedger.filter(l => l.credit).reduce((s, l) => s + l.credit, 0)
                  - matchResults.unmatchedLedger.filter(l => l.debit).reduce((s, l) => s + l.debit, 0);
                return (
                  <div className="rc-report-row total">
                    <span>调节后银行余额</span>
                    <span className="rc-report-val">¥{fmt(adj)}</span>
                  </div>
                );
              })()}
            </div>

            <div className="rc-report-col">
              <div className="rc-report-col-title">企业账面</div>
              {(() => {
                const ledgerBalance = COMPANY_INFO.openingBalance
                  - LEDGER_TOTAL_DEBIT + LEDGER_TOTAL_CREDIT;
                return (
                  <>
                    <div className="rc-report-row">
                      <span>期末余额</span>
                      <span className="rc-report-val">¥{fmt(ledgerBalance)}</span>
                    </div>
                    {matchResults.unmatchedBank.filter(b => b.income).map((b, i) => (
                      <div key={i} className="rc-report-row add">
                        <span>加：银行已收企业未收 - {b.desc}</span>
                        <span className="rc-report-val">+¥{fmt(b.income)}</span>
                      </div>
                    ))}
                    {matchResults.unmatchedBank.filter(b => b.out).map((b, i) => (
                      <div key={i} className="rc-report-row sub">
                        <span>减：银行已付企业未付 - {b.desc}</span>
                        <span className="rc-report-val">-¥{fmt(b.out)}</span>
                      </div>
                    ))}
                    {(() => {
                      const adjLedger = ledgerBalance
                        + matchResults.unmatchedBank.filter(b => b.income).reduce((s, b) => s + b.income, 0)
                        - matchResults.unmatchedBank.filter(b => b.out).reduce((s, b) => s + b.out, 0);
                      return (
                        <div className="rc-report-row total">
                          <span>调节后企业余额</span>
                          <span className="rc-report-val">¥{fmt(adjLedger)}</span>
                        </div>
                      );
                    })()}
                  </>
                );
              })()}
            </div>
          </div>

          <div className="rc-report-summary">
            <div className="rc-card">
              <div className="rc-card-title">匹配汇总</div>
              <div className="rc-summary-row"><span>精确匹配</span><span>{matchResults.exact.length} 笔</span></div>
              <div className="rc-summary-row"><span>模糊匹配</span><span>{matchResults.fuzzy.length} 笔</span></div>
              {matchResults.semantic.length > 0 && <div className="rc-summary-row"><span>语义匹配</span><span>{matchResults.semantic.length} 笔</span></div>}
              <div className="rc-summary-row"><span>银行未达</span><span className="danger">{matchResults.unmatchedBank.length} 笔</span></div>
              <div className="rc-summary-row"><span>企业未达</span><span className="danger">{matchResults.unmatchedLedger.length} 笔</span></div>
              <div className="rc-summary-row total"><span>匹配率</span><span>{matchResults.matchRate.toFixed(1)}%</span></div>
            </div>
          </div>

          <div className="rc-bottom">
            <button className="rc-btn-secondary" onClick={() => setStep('results')}>返回</button>
            <button className="rc-btn-primary" onClick={() => setStep('complete')}>完成对账</button>
          </div>
        </div>
      )}

      {/* Step: Complete */}
      {step === 'complete' && (
        <div className="rc-section rc-center">
          <div className="rc-complete">
            <div className="rc-complete-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3DD598" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3>对账完成</h3>
            <p className="rc-complete-sub">
              共处理 {matchResults?.totalBankCount || 0} 笔银行交易和 {matchResults?.totalLedgerCount || 0} 笔企业凭证
            </p>

            <div className="rc-complete-stats">
              <div className="rc-complete-stat">
                <div className="rc-complete-stat-val accent">{matchResults?.matchedCount || 0}</div>
                <div>匹配成功</div>
              </div>
              <div className="rc-complete-stat">
                <div className="rc-complete-stat-val">{matchResults?.matchRate.toFixed(1)}%</div>
                <div>匹配率</div>
              </div>
              <div className="rc-complete-stat">
                <div className="rc-complete-stat-val danger">{(matchResults?.unmatchedBank.length || 0) + (matchResults?.unmatchedLedger.length || 0)}</div>
                <div>未达账项</div>
              </div>
            </div>

            <div className="rc-complete-actions">
              <button className="rc-btn-secondary" onClick={() => { setStep('upload'); setMatchResults(null); setConfirmed({}); setRejected({}); }}>
                新建对账
              </button>
              <button className="rc-btn-primary" onClick={() => setStep('report')}>
                查看调节表
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
