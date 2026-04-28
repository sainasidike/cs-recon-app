import * as XLSX from 'xlsx';

function fmt(val) {
  return (val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 });
}

export function exportReconciliationPDF(reconciliation, matchResults, period, scenario) {
  const sideALabel = scenario?.sideA?.shortLabel || 'A方';
  const sideBLabel = scenario?.sideB?.shortLabel || 'B方';
  const title = scenario?.reportTitle || '对账调节表';
  const summary = reconciliation.matchSummary;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif; color: #1a1a2e; padding: 40px; font-size: 13px; line-height: 1.6; }
  h1 { text-align: center; font-size: 22px; margin-bottom: 4px; }
  .subtitle { text-align: center; font-size: 12px; color: #666; margin-bottom: 24px; }
  h2 { font-size: 15px; margin: 20px 0 10px; border-bottom: 2px solid #3ecf8e; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { padding: 8px 10px; border: 1px solid #ddd; text-align: left; }
  th { background: #f5f5f7; font-weight: 600; font-size: 12px; }
  .right { text-align: right; }
  .total-row { background: #f0fdf4; font-weight: 600; }
  .result-ok { text-align: center; padding: 16px; background: #f0fdf4; border: 2px solid #3ecf8e; border-radius: 8px; color: #2da06f; font-weight: 700; font-size: 16px; margin: 20px 0; }
  .result-bad { text-align: center; padding: 16px; background: #fef2f2; border: 2px solid #e53e3e; border-radius: 8px; color: #e53e3e; font-weight: 700; font-size: 16px; margin: 20px 0; }
  .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 16px; }
  .sign-area { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 16px; }
  .sign-box { width: 200px; text-align: center; font-size: 12px; color: #666; }
  .sign-line { border-bottom: 1px solid #333; height: 40px; margin-bottom: 4px; }
  @media print { body { padding: 20px; } @page { margin: 15mm; } }
</style>
</head><body>
<h1>${title}</h1>
<div class="subtitle">对账期间：${period} | 生成时间：${new Date().toLocaleString('zh-CN')}</div>

<h2>一、对账摘要</h2>
<table>
  <tr><th>项目</th><th class="right">笔数</th><th class="right">占比</th></tr>
  <tr><td>精确匹配</td><td class="right">${summary.exactCount}</td><td class="right">${summary.total > 0 ? ((summary.exactCount / summary.total) * 100).toFixed(1) : 0}%</td></tr>
  <tr><td>模糊匹配</td><td class="right">${summary.fuzzyCount}</td><td class="right">${summary.total > 0 ? ((summary.fuzzyCount / summary.total) * 100).toFixed(1) : 0}%</td></tr>
  <tr><td>语义匹配</td><td class="right">${summary.semanticCount}</td><td class="right">${summary.total > 0 ? ((summary.semanticCount / summary.total) * 100).toFixed(1) : 0}%</td></tr>
  ${summary.manyToOneCount ? `<tr><td>合并匹配</td><td class="right">${summary.manyToOneCount} 组</td><td class="right">-</td></tr>` : ''}
  <tr><td>未匹配(${sideALabel})</td><td class="right">${summary.unmatchedACount}</td><td class="right">-</td></tr>
  <tr><td>未匹配(${sideBLabel})</td><td class="right">${summary.unmatchedBCount}</td><td class="right">-</td></tr>
  <tr class="total-row"><td>合计</td><td class="right">${summary.total}</td><td class="right">-</td></tr>
</table>

<h2>二、${sideALabel}调节</h2>
<table>
  <tr><td>${scenario?.balanceLabels?.sideA || sideALabel + '余额'}</td><td></td><td class="right">¥ ${fmt(reconciliation.sideABalance)}</td></tr>
  ${reconciliation.sideAAdj.adds.map(item => `<tr><td style="padding-left:24px">加：${item.description || item.reason}</td><td>${item.date || ''}</td><td class="right" style="color:#2da06f">+ ¥ ${fmt(item.amount)}</td></tr>`).join('')}
  ${reconciliation.sideAAdj.subs.map(item => `<tr><td style="padding-left:24px">减：${item.description || item.reason}</td><td>${item.date || ''}</td><td class="right" style="color:#e53e3e">- ¥ ${fmt(item.amount)}</td></tr>`).join('')}
  <tr class="total-row"><td>调节后余额</td><td></td><td class="right">¥ ${fmt(reconciliation.sideAAdjusted)}</td></tr>
</table>

<h2>三、${sideBLabel}调节</h2>
<table>
  <tr><td>${scenario?.balanceLabels?.sideB || sideBLabel + '余额'}</td><td></td><td class="right">¥ ${fmt(reconciliation.sideBBalance)}</td></tr>
  ${reconciliation.sideBAdj.adds.map(item => `<tr><td style="padding-left:24px">加：${item.description || item.reason}</td><td>${item.date || ''}</td><td class="right" style="color:#2da06f">+ ¥ ${fmt(item.amount)}</td></tr>`).join('')}
  ${reconciliation.sideBAdj.subs.map(item => `<tr><td style="padding-left:24px">减：${item.description || item.reason}</td><td>${item.date || ''}</td><td class="right" style="color:#e53e3e">- ¥ ${fmt(item.amount)}</td></tr>`).join('')}
  <tr class="total-row"><td>调节后余额</td><td></td><td class="right">¥ ${fmt(reconciliation.sideBAdjusted)}</td></tr>
</table>

<div class="${reconciliation.isBalanced ? 'result-ok' : 'result-bad'}">
  ${reconciliation.isBalanced ? '✓ 调节后余额一致 ¥ ' + fmt(reconciliation.sideAAdjusted) : '✗ 调节后余额不一致 差额 ¥ ' + fmt(Math.abs(reconciliation.sideAAdjusted - reconciliation.sideBAdjusted))}
</div>

<div class="sign-area">
  <div class="sign-box"><div class="sign-line"></div>编制人</div>
  <div class="sign-box"><div class="sign-line"></div>审核人</div>
  <div class="sign-box"><div class="sign-line"></div>主管</div>
</div>

<div class="footer">本报告由智能对账系统自动生成，仅供参考，最终以审核签章为准</div>
</body></html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('弹窗被浏览器拦截，请允许弹窗后重试');
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}

export function exportReconciliationExcel(reconciliation, matchResults, period, scenario) {
  const wb = XLSX.utils.book_new();

  const sideALabel = scenario?.sideA?.shortLabel || 'A方';
  const sideBLabel = scenario?.sideB?.shortLabel || 'B方';
  const title = scenario?.reportTitle || '对账调节表';

  const summaryData = [
    [title],
    [`对账期间: ${period || ''}`],
    [`生成时间: ${new Date().toLocaleString('zh-CN')}`],
    [],
    ['一、对账摘要'],
    ['项目', '笔数', '占比'],
    ['精确匹配', reconciliation.matchSummary.exactCount, `${reconciliation.matchSummary.total > 0 ? ((reconciliation.matchSummary.exactCount / reconciliation.matchSummary.total) * 100).toFixed(1) : 0}%`],
    ['模糊匹配', reconciliation.matchSummary.fuzzyCount, `${reconciliation.matchSummary.total > 0 ? ((reconciliation.matchSummary.fuzzyCount / reconciliation.matchSummary.total) * 100).toFixed(1) : 0}%`],
    ['语义匹配', reconciliation.matchSummary.semanticCount, ''],
    [`未匹配(${sideALabel})`, reconciliation.matchSummary.unmatchedACount, ''],
    [`未匹配(${sideBLabel})`, reconciliation.matchSummary.unmatchedBCount, ''],
  ];

  if (reconciliation.matchSummary.manyToOneCount) {
    summaryData.push(['合并匹配', reconciliation.matchSummary.manyToOneCount + ' 组', '']);
  }

  summaryData.push(
    [`${sideALabel}总笔数`, reconciliation.matchSummary.sideATotalCount || '', ''],
    [`${sideBLabel}总笔数`, reconciliation.matchSummary.sideBTotalCount || '', ''],
    [],
    [`二、${sideALabel}调节`],
    [`${sideALabel}余额`, '', reconciliation.sideABalance],
  );

  reconciliation.sideAAdj.adds.forEach(item => {
    summaryData.push([`  加: ${item.description || item.reason}`, item.date || '', item.amount]);
  });
  reconciliation.sideAAdj.subs.forEach(item => {
    summaryData.push([`  减: ${item.description || item.reason}`, item.date || '', -item.amount]);
  });
  summaryData.push(['调节后余额', '', reconciliation.sideAAdjusted]);
  summaryData.push([]);
  summaryData.push([`三、${sideBLabel}调节`]);
  summaryData.push([`${sideBLabel}余额`, '', reconciliation.sideBBalance]);

  reconciliation.sideBAdj.adds.forEach(item => {
    summaryData.push([`  加: ${item.description || item.reason}`, item.date || '', item.amount]);
  });
  reconciliation.sideBAdj.subs.forEach(item => {
    summaryData.push([`  减: ${item.description || item.reason}`, item.date || '', -item.amount]);
  });
  summaryData.push(['调节后余额', '', reconciliation.sideBAdjusted]);
  summaryData.push([]);
  summaryData.push([reconciliation.isBalanced ? '✓ 调节后余额一致' : '✗ 调节后余额不一致']);

  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, '调节表');

  const matchData = [[`日期(${sideALabel})`, `摘要(${sideALabel})`, `金额(${sideALabel})`, `流水号(${sideALabel})`, `日期(${sideBLabel})`, `摘要(${sideBLabel})`, `金额(${sideBLabel})`, `流水号(${sideBLabel})`, '匹配类型', '置信度']];
  [...matchResults.exact, ...matchResults.fuzzy, ...matchResults.semantic].forEach(m => {
    matchData.push([
      m.sideA.date, m.sideA.description, m.sideA.direction === 'debit' ? -m.sideA.amount : m.sideA.amount, m.sideA.reference || '',
      m.sideB.date, m.sideB.description, m.sideB.direction === 'debit' ? -m.sideB.amount : m.sideB.amount, m.sideB.reference || '',
      m.type === 'exact' ? '精确' : m.type === 'fuzzy' ? '模糊' : m.type === 'manual' ? '手动' : '语义',
      m.confidence,
    ]);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(matchData);
  XLSX.utils.book_append_sheet(wb, ws2, '匹配明细');

  const unmatchData = [['来源', '日期', '摘要', '金额', '方向', '对方', '流水号']];
  matchResults.unmatchedA.forEach(u => {
    unmatchData.push([sideALabel, u.entry.date, u.entry.description, u.entry.amount, u.entry.direction === 'debit' ? '借' : '贷', u.entry.counterparty || '', u.entry.reference || '']);
  });
  matchResults.unmatchedB.forEach(u => {
    unmatchData.push([sideBLabel, u.entry.date, u.entry.description, u.entry.amount, u.entry.direction === 'debit' ? '借' : '贷', u.entry.counterparty || '', u.entry.reference || '']);
  });
  if (matchResults.unmatchedC?.length > 0) {
    const sideCLabel = scenario?.sideC?.shortLabel || 'C方';
    matchResults.unmatchedC.forEach(u => {
      unmatchData.push([sideCLabel, u.entry.date, u.entry.description, u.entry.amount, u.entry.direction === 'debit' ? '借' : '贷', u.entry.counterparty || '', u.entry.reference || '']);
    });
  }
  const ws3 = XLSX.utils.aoa_to_sheet(unmatchData);
  XLSX.utils.book_append_sheet(wb, ws3, '未匹配项');

  XLSX.writeFile(wb, `${title}_${period || new Date().toISOString().slice(0, 10)}.xlsx`);
}
