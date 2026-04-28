const ZHIPU_API_KEY = import.meta.env.VITE_ZHIPU_API_KEY || 'caa4b333b81041feae2b2268a36bcc84.O0wJBlQIlcF0yEmT';

export async function callZhipuAIStream(messages, options = {}, onChunk) {
  const { model = 'glm-4-flash', temperature = 0.7, max_tokens = 2000 } = options;

  const resp = await fetch('/zhipu-api/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ZHIPU_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
      stream: true,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `智谱API调用失败 (${resp.status})`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content || '';
        if (delta) {
          full += delta;
          onChunk(full);
        }
      } catch {}
    }
  }

  return full;
}

export async function generateAIReport(reconciliation, matchResults, scenario, onChunk) {
  const sideALabel = scenario?.sideA?.shortLabel || 'A方';
  const sideBLabel = scenario?.sideB?.shortLabel || 'B方';
  const sideCLabel = scenario?.sideC?.shortLabel || null;
  const { matchSummary } = reconciliation;

  const unmatchedADetails = (matchResults?.unmatchedA || []).slice(0, 10).map(u => ({
    date: u.entry.date,
    amount: u.entry.amount,
    desc: u.entry.description || u.entry.counterparty || '',
    direction: u.entry.direction,
  }));

  const unmatchedBDetails = (matchResults?.unmatchedB || []).slice(0, 10).map(u => ({
    date: u.entry.date,
    amount: u.entry.amount,
    desc: u.entry.description || u.entry.counterparty || '',
    direction: u.entry.direction,
  }));

  const fuzzyMatches = (matchResults?.fuzzy || []).slice(0, 5).map(m => ({
    dateA: m.sideA.date,
    dateB: m.sideB.date,
    amountA: m.sideA.amount,
    amountB: m.sideB.amount,
    descA: m.sideA.description || '',
    descB: m.sideB.description || '',
    diffType: m.diffType,
    diffDays: m.diffDays,
    amountDiff: m.amountDiff,
    confidence: m.confidence,
  }));

  const semanticMatches = (matchResults?.semantic || []).slice(0, 5).map(m => ({
    dateA: m.sideA.date,
    dateB: m.sideB.date,
    amountA: m.sideA.amount,
    amountB: m.sideB.amount,
    descA: m.sideA.description || '',
    descB: m.sideB.description || '',
    confidence: m.confidence,
  }));

  const inputErrors = (matchResults?.inputErrors || []).map(e => ({
    type: e.errorType,
    amountA: e.sideAAmount,
    amountB: e.sideBAmount,
    suggestion: e.suggestion,
  }));

  const manyToOne = (matchResults?.manyToOne || []).slice(0, 3).map(g => ({
    targetAmount: g.target.amount,
    parts: g.parts.map(p => p.entry.amount),
    totalAmount: g.totalAmount,
  }));

  const dataContext = JSON.stringify({
    scenario: scenario?.name || '未知',
    scenarioDesc: scenario?.desc || '',
    period: `${reconciliation.sideABalance ? '有余额' : '无余额'}`,
    summary: {
      sideATotal: matchSummary.sideATotalCount,
      sideBTotal: matchSummary.sideBTotalCount,
      exactMatch: matchSummary.exactCount,
      fuzzyMatch: matchSummary.fuzzyCount,
      semanticMatch: matchSummary.semanticCount,
      manyToOneMatch: matchSummary.manyToOneCount,
      unmatchedA: matchSummary.unmatchedACount,
      unmatchedB: matchSummary.unmatchedBCount,
      unmatchedC: matchSummary.unmatchedCCount || 0,
    },
    balance: {
      sideABalance: reconciliation.sideABalance,
      sideBBalance: reconciliation.sideBBalance,
      sideAAdjusted: reconciliation.sideAAdjusted,
      sideBAdjusted: reconciliation.sideBAdjusted,
      isBalanced: reconciliation.isBalanced,
      difference: Math.abs(reconciliation.sideAAdjusted - reconciliation.sideBAdjusted),
    },
    unmatchedA: unmatchedADetails,
    unmatchedB: unmatchedBDetails,
    fuzzyMatches,
    semanticMatches,
    inputErrors,
    manyToOne,
  }, null, 0);

  const systemPrompt = `你是一名资深财务审计师，专精于${scenario?.name || '对账'}分析。请基于提供的对账数据生成一份专业、详尽的AI分析报告。

报告要求：
1. 【对账结论】明确判断对账结果，是否存在异常
2. 【匹配分析】分析匹配质量，关注模糊匹配和语义匹配的合理性
3. 【未达账项分析】逐笔分析未匹配项的可能原因（如在途款项、跨期入账、遗漏记账等）
4. 【差异分析】对金额差异、时间差异进行专业解读
5. 【风险提示】标注大额未匹配项、疑似录入错误等风险点
6. 【处理建议】给出具体的后续处理建议（补做凭证、核实原始单据等）

术语说明：
- ${sideALabel}：${scenario?.sideA?.label || 'A方数据'}
- ${sideBLabel}：${scenario?.sideB?.label || 'B方数据'}
${sideCLabel ? `- ${sideCLabel}：${scenario?.sideC?.label || 'C方数据'}` : ''}

请用中文输出，格式清晰，分段用标题，重点内容加粗（用**包裹）。报告长度800-1200字。`;

  const userPrompt = `以下是本次${scenario?.name || '对账'}的完整数据：

${dataContext}

请生成AI对账分析报告。`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  return await callZhipuAIStream(messages, { temperature: 0.4, max_tokens: 2500 }, onChunk);
}
