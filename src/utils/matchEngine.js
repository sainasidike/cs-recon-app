function daysDiff(dateStr1, dateStr2) {
  if (!dateStr1 || !dateStr2) return Infinity;
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return Math.abs((d1 - d2) / (1000 * 60 * 60 * 24));
}

function textSimilarity(a, b) {
  if (!a || !b) return 0;
  const sa = a.toLowerCase().replace(/\s+/g, '');
  const sb = b.toLowerCase().replace(/\s+/g, '');
  if (sa === sb) return 1;
  if (sa.includes(sb) || sb.includes(sa)) return 0.8;

  const setA = new Set(sa.split(''));
  const setB = new Set(sb.split(''));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

function directionsCompatible(dirA, dirB, scenarioType) {
  if (dirA === 'unknown' || dirB === 'unknown') return true;
  if (scenarioType === 'bank_recon') {
    return dirA === dirB;
  }
  return true;
}

function refSimilarity(refA, refB) {
  if (!refA || !refB) return 0;
  const a = refA.trim().toLowerCase();
  const b = refB.trim().toLowerCase();
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const aDigits = a.replace(/\D/g, '');
  const bDigits = b.replace(/\D/g, '');
  if (aDigits.length >= 4 && bDigits.length >= 4 && (aDigits.includes(bDigits) || bDigits.includes(aDigits))) return 0.7;
  return 0;
}

function computeScore(entryA, entryB, config, round, scenarioType) {
  if (entryA.amount == null || entryB.amount == null) return 0;
  if (entryA.amount === 0 && entryB.amount === 0) return 0;

  const amountDiff = Math.abs(entryA.amount - entryB.amount);
  const maxAmt = Math.max(Math.abs(entryA.amount), Math.abs(entryB.amount));
  const amountRatio = maxAmt > 0 ? amountDiff / maxAmt : 0;
  const dd = daysDiff(entryA.date, entryB.date);

  if (!directionsCompatible(entryA.direction, entryB.direction, scenarioType)) return 0;

  const refScore = refSimilarity(entryA.reference, entryB.reference);
  if (refScore >= 0.9 && amountDiff < 0.01) {
    return 100;
  }

  if (round === 'exact') {
    const tolerance = config.exactAmountTolerance || 0.01;
    if (amountDiff > tolerance) return 0;
    const dateTol = config.exactDateTolerance != null ? config.exactDateTolerance : 3;
    const datesMissing = !entryA.date || !entryB.date;
    if (!datesMissing && dd > dateTol) return 0;

    let score = 95;
    if (!datesMissing && dd > 0) score -= dd * 1;
    if (datesMissing) score -= 2;
    const descSim = textSimilarity(
      (entryA.description || '') + (entryA.counterparty || ''),
      (entryB.description || '') + (entryB.counterparty || '')
    );
    score += descSim * 5;
    if (refScore > 0) score = Math.min(score + 2, 100);
    return Math.round(Math.min(score, 100));
  }

  if (round === 'fuzzy') {
    const tolerance = config.exactAmountTolerance || 0.01;
    if (amountDiff > tolerance) return 0;
    const datesMissing2 = !entryA.date || !entryB.date;
    if (!datesMissing2 && dd > (config.fuzzyDateTolerance || 5)) return 0;

    let score = datesMissing2 ? 88 : 92 - dd * 2;
    const descSim = textSimilarity(
      (entryA.description || '') + (entryA.counterparty || ''),
      (entryB.description || '') + (entryB.counterparty || '')
    );
    score += descSim * 8 * (config.textWeight || 0.5);
    if (refScore > 0.5) score += 5;
    return Math.round(Math.min(Math.max(score, 80), 94));
  }

  if (round === 'semantic') {
    if (amountRatio > (config.amountTolerance || 0.05)) return 0;
    const datesMissing3 = !entryA.date || !entryB.date;
    if (!datesMissing3 && dd > (config.semanticDateTolerance || 7)) return 0;

    const descSim = textSimilarity(
      (entryA.description || '') + (entryA.counterparty || ''),
      (entryB.description || '') + (entryB.counterparty || '')
    );
    if (descSim < 0.2 && refScore < 0.5) return 0;

    const ddPenalty = datesMissing3 ? 3 : dd * 2;
    let score = 70 - ddPenalty + descSim * 15 - amountRatio * 50;
    if (refScore > 0.5) score += 8;
    return Math.min(Math.max(Math.round(score), 60), 79);
  }

  return 0;
}

function detectReversals(entries) {
  const reversals = [];
  const used = new Set();
  for (let i = 0; i < entries.length; i++) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < entries.length; j++) {
      if (used.has(j)) continue;
      const a = entries[i], b = entries[j];
      if (a.amount && b.amount && Math.abs(a.amount - b.amount) < 0.01 && a.direction !== b.direction) {
        const descSim = textSimilarity(a.description || '', b.description || '');
        if (descSim > 0.4) {
          reversals.push({ index1: i, index2: j, entry1: a, entry2: b });
          used.add(i);
          used.add(j);
          break;
        }
      }
    }
  }
  return reversals;
}

function findManyToOneMatches(unmatchedEntries, oppositeEntries, matchedOpposite, config, scenarioType) {
  const groups = [];
  const usedUnmatched = new Set();

  for (let oi = 0; oi < oppositeEntries.length; oi++) {
    if (matchedOpposite.has(oi)) continue;
    const target = oppositeEntries[oi];
    if (!target.amount) continue;

    const candidates = [];
    for (let ui = 0; ui < unmatchedEntries.length; ui++) {
      if (usedUnmatched.has(ui)) continue;
      const entry = unmatchedEntries[ui].entry;
      if (!entry.amount) continue;
      if (!directionsCompatible(entry.direction, target.direction, scenarioType)) continue;
      const dd = daysDiff(entry.date, target.date);
      if (entry.date && target.date && dd > (config.semanticDateTolerance || 7)) continue;
      candidates.push({ idx: ui, entry, dd });
    }

    if (candidates.length < 2) continue;

    candidates.sort((a, b) => a.entry.amount - b.entry.amount);
    const targetAmount = target.amount;

    const pctTolerance = config.amountTolerance || 0;
    const absTolerance = Math.max(config.exactAmountTolerance || 0.01, targetAmount * pctTolerance);
    for (let size = Math.min(candidates.length, 5); size >= 2; size--) {
      const found = findSubsetSum(candidates, targetAmount, size, absTolerance);
      if (found) {
        const group = {
          targetIdx: oi,
          target,
          parts: found.map(c => ({ unmatchedIdx: c.idx, entry: c.entry })),
          totalAmount: found.reduce((s, c) => s + c.entry.amount, 0),
          confidence: 75,
          type: 'many_to_one',
        };
        groups.push(group);
        found.forEach(c => usedUnmatched.add(c.idx));
        matchedOpposite.add(oi);
        break;
      }
    }
  }

  return groups;
}

function findSubsetSum(candidates, target, size, tolerance) {
  if (size === 2) {
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        if (Math.abs(candidates[i].entry.amount + candidates[j].entry.amount - target) <= tolerance) {
          return [candidates[i], candidates[j]];
        }
      }
    }
    return null;
  }
  if (size === 3) {
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        for (let k = j + 1; k < candidates.length; k++) {
          if (Math.abs(candidates[i].entry.amount + candidates[j].entry.amount + candidates[k].entry.amount - target) <= tolerance) {
            return [candidates[i], candidates[j], candidates[k]];
          }
        }
      }
    }
    return null;
  }
  if (size === 4) {
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        for (let k = j + 1; k < candidates.length; k++) {
          for (let l = k + 1; l < candidates.length; l++) {
            const sum = candidates[i].entry.amount + candidates[j].entry.amount + candidates[k].entry.amount + candidates[l].entry.amount;
            if (Math.abs(sum - target) <= tolerance) {
              return [candidates[i], candidates[j], candidates[k], candidates[l]];
            }
          }
        }
      }
    }
    return null;
  }
  if (size === 5) {
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        for (let k = j + 1; k < candidates.length; k++) {
          for (let l = k + 1; l < candidates.length; l++) {
            for (let m = l + 1; m < candidates.length; m++) {
              const sum = candidates[i].entry.amount + candidates[j].entry.amount + candidates[k].entry.amount + candidates[l].entry.amount + candidates[m].entry.amount;
              if (Math.abs(sum - target) <= tolerance) {
                return [candidates[i], candidates[j], candidates[k], candidates[l], candidates[m]];
              }
            }
          }
        }
      }
    }
    return null;
  }
  return null;
}

export function runMatching(sideAEntries, sideBEntries, config = {}, sideCEntries = null, scenarioType = 'bank_recon') {
  const matchedA = new Set();
  const matchedB = new Set();
  const results = {
    exact: [], fuzzy: [], semantic: [], manyToOne: [],
    unmatchedA: [], unmatchedB: [], unmatchedC: [],
    reversalsA: detectReversals(sideAEntries),
    reversalsB: detectReversals(sideBEntries),
    sideATotalCount: sideAEntries.length,
    sideBTotalCount: sideBEntries.length,
  };

  const rounds = [
    { name: 'exact', minScore: 95 },
    { name: 'fuzzy', minScore: 80 },
    { name: 'semantic', minScore: 60 },
  ];

  for (const round of rounds) {
    sideAEntries.forEach((ae, ai) => {
      if (matchedA.has(ai)) return;
      let bestScore = 0, bestIdx = -1;
      sideBEntries.forEach((be, bi) => {
        if (matchedB.has(bi)) return;
        const score = computeScore(ae, be, config, round.name, scenarioType);
        if (score > bestScore) { bestScore = score; bestIdx = bi; }
      });
      if (bestScore >= round.minScore && bestIdx >= 0) {
        matchedA.add(ai);
        matchedB.add(bestIdx);
        const be = sideBEntries[bestIdx];
        const dd = daysDiff(ae.date, be.date);
        const amountDiff = Math.abs(ae.amount - be.amount);
        let diffType = round.name;
        if (round.name !== 'exact') {
          if (amountDiff > 0.01) diffType = 'amount_diff';
          else if (dd > 0) diffType = 'time_diff';
        }
        results[round.name].push({
          sideA: ae, sideB: be,
          confidence: bestScore, type: round.name,
          diffType, diffDays: dd, amountDiff,
          sideAIdx: ai, sideBIdx: bestIdx,
        });
      }
    });
  }

  const tempUnmatchedA = [];
  sideAEntries.forEach((ae, ai) => {
    if (!matchedA.has(ai)) tempUnmatchedA.push({ entry: ae, idx: ai, source: 'sideA' });
  });
  const tempUnmatchedB = [];
  sideBEntries.forEach((be, bi) => {
    if (!matchedB.has(bi)) tempUnmatchedB.push({ entry: be, idx: bi, source: 'sideB' });
  });

  const mtoA = findManyToOneMatches(tempUnmatchedA, sideBEntries, matchedB, config, scenarioType);
  mtoA.forEach(g => {
    g.parts.forEach(p => matchedA.add(tempUnmatchedA[p.unmatchedIdx].idx));
    g.direction = 'aToB';
    results.manyToOne.push(g);
  });

  const mtoB = findManyToOneMatches(tempUnmatchedB, sideAEntries, matchedA, config, scenarioType);
  mtoB.forEach(g => {
    g.parts.forEach(p => matchedB.add(tempUnmatchedB[p.unmatchedIdx].idx));
    g.direction = 'bToA';
    results.manyToOne.push(g);
  });

  sideAEntries.forEach((ae, ai) => {
    if (!matchedA.has(ai)) results.unmatchedA.push({ entry: ae, idx: ai, source: 'sideA' });
  });
  sideBEntries.forEach((be, bi) => {
    if (!matchedB.has(bi)) results.unmatchedB.push({ entry: be, idx: bi, source: 'sideB' });
  });

  if (sideCEntries && sideCEntries.length > 0) {
    const matchedC = new Set();
    const allMatched = [...results.exact, ...results.fuzzy, ...results.semantic];

    sideCEntries.forEach((ce, ci) => {
      let bestScore = 0, bestMatchIdx = -1;
      allMatched.forEach((m, mi) => {
        const amtDiffA = ce.amount != null && m.sideA.amount != null ? Math.abs(ce.amount - m.sideA.amount) : Infinity;
        const amtDiffB = ce.amount != null && m.sideB.amount != null ? Math.abs(ce.amount - m.sideB.amount) : Infinity;
        const textA = textSimilarity((ce.description || '') + (ce.counterparty || ''), (m.sideA.description || '') + (m.sideA.counterparty || ''));
        const textB = textSimilarity((ce.description || '') + (ce.counterparty || ''), (m.sideB.description || '') + (m.sideB.counterparty || ''));
        const tolAmt = Math.max(m.sideA.amount || 0, m.sideB.amount || 0) * 0.05;
        let score = 0;
        if (amtDiffA <= Math.max(tolAmt, 0.01)) score = Math.max(score, 70 + textA * 30);
        if (amtDiffB <= Math.max(tolAmt, 0.01)) score = Math.max(score, 70 + textB * 30);
        if (score > bestScore) { bestScore = score; bestMatchIdx = mi; }
      });
      if (bestScore >= 60 && bestMatchIdx >= 0) {
        matchedC.add(ci);
        allMatched[bestMatchIdx].sideC = ce;
        allMatched[bestMatchIdx].sideCIdx = ci;
        allMatched[bestMatchIdx].threeway = true;
      }
    });

    if (matchedC.size < sideCEntries.length) {
      sideCEntries.forEach((ce, ci) => {
        if (matchedC.has(ci)) return;
        let bestScore = 0, bestMatchIdx = -1;
        sideAEntries.forEach((ae, ai) => {
          if (ce.amount == null || ae.amount == null) return;
          const amtDiff = Math.abs(ce.amount - ae.amount);
          const tol = Math.max(ae.amount * 0.05, 0.01);
          if (amtDiff <= tol) {
            const ts = textSimilarity((ce.description || '') + (ce.counterparty || ''), (ae.description || '') + (ae.counterparty || ''));
            const score = 65 + ts * 30;
            if (score > bestScore) { bestScore = score; bestMatchIdx = ai; }
          }
        });
        if (bestScore >= 60) {
          matchedC.add(ci);
          const existingMatch = allMatched.find(m => m.sideAIdx === bestMatchIdx);
          if (existingMatch) {
            existingMatch.sideC = ce;
            existingMatch.sideCIdx = ci;
            existingMatch.threeway = true;
          }
        }
      });
    }

    sideCEntries.forEach((ce, ci) => {
      if (!matchedC.has(ci)) results.unmatchedC.push({ entry: ce, idx: ci, source: 'sideC' });
    });
  }

  detectInputErrors(results, sideAEntries, sideBEntries, matchedA, matchedB);

  return results;
}

function isDigitTranspose(a, b) {
  const sa = String(Math.round(a * 100));
  const sb = String(Math.round(b * 100));
  if (sa.length !== sb.length || sa === sb) return false;
  let diffs = 0;
  for (let i = 0; i < sa.length; i++) {
    if (sa[i] !== sb[i]) diffs++;
  }
  if (diffs === 2) {
    const diff = Math.abs(a - b);
    return diff % 9 === 0 || Math.abs(diff * 100) % 9 === 0;
  }
  return false;
}

function isDecimalShift(a, b) {
  if (a === 0 || b === 0) return false;
  const ratio = a / b;
  return ratio === 10 || ratio === 100 || ratio === 0.1 || ratio === 0.01;
}

function detectInputErrors(results, sideAEntries, sideBEntries, matchedA, matchedB) {
  if (!results.inputErrors) results.inputErrors = [];

  const unmatchedAIndices = sideAEntries.map((_, i) => i).filter(i => !matchedA.has(i));
  const unmatchedBIndices = sideBEntries.map((_, i) => i).filter(i => !matchedB.has(i));

  for (const ai of unmatchedAIndices) {
    const ae = sideAEntries[ai];
    for (const bi of unmatchedBIndices) {
      const be = sideBEntries[bi];
      if (daysDiff(ae.date, be.date) > 5) continue;

      let errorType = null;
      if (isDigitTranspose(ae.amount, be.amount)) {
        errorType = 'digit_transpose';
      } else if (isDecimalShift(ae.amount, be.amount)) {
        errorType = 'decimal_shift';
      }

      if (errorType) {
        const descSim = textSimilarity(
          ae.description + (ae.counterparty || ''),
          be.description + (be.counterparty || '')
        );
        if (descSim > 0.2) {
          results.inputErrors.push({
            sideA: ae, sideB: be, sideAIdx: ai, sideBIdx: bi,
            errorType,
            sideAAmount: ae.amount, sideBAmount: be.amount,
            suggestion: errorType === 'digit_transpose'
              ? `疑似数字录反: A方 ¥${ae.amount.toFixed(2)} vs B方 ¥${be.amount.toFixed(2)}，差值为9的倍数`
              : `疑似小数点位错: A方 ¥${ae.amount.toFixed(2)} vs B方 ¥${be.amount.toFixed(2)}，为10倍/100倍关系`,
          });
        }
      }
    }
  }
}

export function classifyDifference(item) {
  if (item.type === 'fuzzy' || item.type === 'semantic') {
    if (item.diffType === 'time_diff') {
      const dd = item.diffDays || 0;
      let reason = '处理时效差异';
      if (dd === 1) reason = '次日处理入账';
      else if (dd <= 3) reason = '跨工作日/节假日延迟';
      else reason = '可能涉及在途款项或月末截止差异';
      return {
        label: '时间差', color: 'blue',
        suggestion: `日期差 ${dd} 天 - ${reason}。金额一致，建议确认匹配。`,
        action: 'confirm',
      };
    }
    if (item.diffType === 'amount_diff') {
      const diff = item.amountDiff || 0;
      let reason = '原因待查';
      if (diff < 100) reason = '可能为手续费或小额税费差异';
      else if (diff < 1000) reason = '可能为税费、佣金扣除或部分付款';
      else reason = '差额较大，可能为分批付款、合并付款或录入错误';
      return {
        label: '金额差', color: 'red',
        suggestion: `金额差异 ¥${diff.toFixed(2)} - ${reason}。建议核实原始凭证。`,
        action: 'review',
      };
    }
    return {
      label: '语义匹配', color: 'orange',
      suggestion: '通过摘要语义相似度匹配，日期和金额存在差异。建议对照原始单据人工确认。',
      action: 'review',
    };
  }
  return { label: '精确匹配', color: 'green', suggestion: '日期、金额、方向完全一致。', action: 'auto' };
}

export function analyzeUnmatched(item, scenario) {
  const sideALabel = scenario?.sideA?.shortLabel || 'A方';
  const sideBLabel = scenario?.sideB?.shortLabel || 'B方';

  if (item.source === 'sideA') {
    return {
      label: `${sideALabel}有${sideBLabel}无`,
      type: 'sideA_only',
      reason: `${sideALabel}已记录但${sideBLabel}尚未确认`,
      suggestion: `该笔交易仅在${sideALabel}出现，建议核实${sideBLabel}是否遗漏记录。`,
      voucherSuggestion: null,
    };
  }

  if (item.source === 'sideB') {
    return {
      label: `${sideBLabel}有${sideALabel}无`,
      type: 'sideB_only',
      reason: `${sideBLabel}已记录但${sideALabel}尚未确认`,
      suggestion: `该笔交易仅在${sideBLabel}出现，建议核实${sideALabel}是否遗漏记录。`,
      voucherSuggestion: null,
    };
  }

  if (item.source === 'sideC') {
    const sideCLabel = scenario?.sideC?.shortLabel || 'C方';
    return {
      label: `${sideCLabel}未匹配`,
      type: 'sideC_only',
      reason: `${sideCLabel}记录未匹配到对应的A/B方记录`,
      suggestion: `该${sideCLabel}记录未找到匹配项，建议人工核查。`,
      voucherSuggestion: null,
    };
  }

  return { label: '未匹配', type: 'unknown', reason: '未知来源', suggestion: '建议人工核查', voucherSuggestion: null };
}

export function manualMatch(matchResults, sideAIdx, sideBIdx, sideAEntries, sideBEntries) {
  const ae = sideAEntries[sideAIdx];
  const be = sideBEntries[sideBIdx];
  if (!ae || !be) return matchResults;

  const updated = { ...matchResults };
  updated.unmatchedA = updated.unmatchedA.filter(u => u.idx !== sideAIdx);
  updated.unmatchedB = updated.unmatchedB.filter(u => u.idx !== sideBIdx);

  const dd = daysDiff(ae.date, be.date);
  const amountDiff = Math.abs(ae.amount - be.amount);
  updated.fuzzy = [...updated.fuzzy, {
    sideA: ae, sideB: be,
    confidence: 85, type: 'manual',
    diffType: 'manual', diffDays: dd, amountDiff,
    sideAIdx, sideBIdx, manualMatch: true,
  }];

  return updated;
}

export function generateReconciliation(results, sideABalance, sideBBalance, scenario) {
  const sideAAdj = { adds: [], subs: [] };
  const sideBAdj = { adds: [], subs: [] };
  const sideALabel = scenario?.sideA?.shortLabel || 'A方';
  const sideBLabel = scenario?.sideB?.shortLabel || 'B方';

  results.unmatchedA.forEach(item => {
    if (item.entry.direction === 'credit') {
      sideBAdj.adds.push({ ...item.entry, reason: `${sideALabel}有${sideBLabel}无` });
    } else {
      sideBAdj.subs.push({ ...item.entry, reason: `${sideALabel}有${sideBLabel}无` });
    }
  });

  results.unmatchedB.forEach(item => {
    if (item.entry.direction === 'debit') {
      sideAAdj.subs.push({ ...item.entry, reason: `${sideBLabel}有${sideALabel}无` });
    } else {
      sideAAdj.adds.push({ ...item.entry, reason: `${sideBLabel}有${sideALabel}无` });
    }
  });

  const sideAAdjTotal = sideAAdj.adds.reduce((s, e) => s + (e.amount || 0), 0)
    - sideAAdj.subs.reduce((s, e) => s + (e.amount || 0), 0);
  const sideBAdjTotal = sideBAdj.adds.reduce((s, e) => s + (e.amount || 0), 0)
    - sideBAdj.subs.reduce((s, e) => s + (e.amount || 0), 0);

  const sideAAdjusted = (sideABalance || 0) + sideAAdjTotal;
  const sideBAdjusted = (sideBBalance || 0) + sideBAdjTotal;

  const matchedCount = results.exact.length + results.fuzzy.length + results.semantic.length;
  const manyToOneCount = (results.manyToOne || []).reduce((s, g) => s + g.parts.length, 0);

  const allMatches = [...results.exact, ...results.fuzzy, ...results.semantic];
  const manyToOneAmount = (results.manyToOne || []).reduce((s, g) => s + (g.target?.amount || g.totalAmount || 0), 0);
  const matchedAmount = allMatches.reduce((s, m) => s + (m.sideA?.amount || 0), 0) + manyToOneAmount;
  const unmatchedAAmount = results.unmatchedA.reduce((s, m) => s + (m.entry?.amount || 0), 0);
  const unmatchedBAmount = results.unmatchedB.reduce((s, m) => s + (m.entry?.amount || 0), 0);
  const unmatchedCAmount = (results.unmatchedC || []).reduce((s, m) => s + (m.entry?.amount || 0), 0);
  const sideATotalAmount = allMatches.reduce((s, m) => s + (m.sideA?.amount || 0), 0) + manyToOneAmount + unmatchedAAmount;
  const sideBTotalAmount = allMatches.reduce((s, m) => s + (m.sideB?.amount || 0), 0) + manyToOneAmount + unmatchedBAmount;
  const totalItems = matchedCount + manyToOneCount + results.unmatchedA.length + results.unmatchedB.length;
  const matchRate = totalItems > 0 ? ((matchedCount + manyToOneCount) / totalItems * 100) : 0;

  const useBalanceMode = scenario?.hasBalance !== false;

  return {
    useBalanceMode,
    sideABalance: sideABalance || 0,
    sideBBalance: sideBBalance || 0,
    sideAAdj,
    sideBAdj,
    sideAAdjusted,
    sideBAdjusted,
    isBalanced: useBalanceMode
      ? Math.abs(sideAAdjusted - sideBAdjusted) < 0.01
      : (results.unmatchedA.length === 0 && results.unmatchedB.length === 0 && (results.unmatchedC || []).length === 0),
    matchedAmount,
    unmatchedAAmount,
    unmatchedBAmount,
    unmatchedCAmount,
    sideATotalAmount,
    sideBTotalAmount,
    matchRate,
    matchSummary: {
      sideATotalCount: results.sideATotalCount || 0,
      sideBTotalCount: results.sideBTotalCount || 0,
      total: totalItems,
      exactCount: results.exact.length,
      fuzzyCount: results.fuzzy.length,
      semanticCount: results.semantic.length,
      manyToOneCount: (results.manyToOne || []).length,
      manyToOneItemCount: manyToOneCount,
      unmatchedACount: results.unmatchedA.length,
      unmatchedBCount: results.unmatchedB.length,
      unmatchedCCount: results.unmatchedC?.length || 0,
    },
  };
}
