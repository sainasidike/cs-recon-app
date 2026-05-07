function textSim(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase(); b = b.toLowerCase();
  const sa = new Set(a); const sb = new Set(b);
  let inter = 0;
  for (const c of sa) if (sb.has(c)) inter++;
  return inter / Math.max(sa.size, sb.size, 1);
}

function daysDiff(d1, d2) {
  return Math.abs((new Date(d1) - new Date(d2)) / 86400000);
}

function getAmt(entry) {
  if (entry.out != null) return entry.out;
  if (entry.income != null) return entry.income;
  if (entry.debit != null) return entry.debit;
  if (entry.credit != null) return entry.credit;
  if (entry.amount != null) return entry.amount;
  return 0;
}

function getDir(entry) {
  if (entry.out || entry.debit) return 'debit';
  if (entry.income || entry.credit) return 'credit';
  if (entry.direction === 'debit') return 'debit';
  if (entry.direction === 'credit') return 'credit';
  return 'unknown';
}

function getDesc(entry) {
  return [entry.desc, entry.description, entry.payee, entry.counterparty].filter(Boolean).join(' ');
}

/**
 * Check if two amounts differ only by a digit swap (transposition error).
 * Two checks: sorted digit strings match AND difference is divisible by 9.
 */
function isDigitSwap(amt1, amt2) {
  const s1 = String(Math.round(Math.abs(amt1)));
  const s2 = String(Math.round(Math.abs(amt2)));
  if (s1 === s2) return false;
  if (s1.length !== s2.length) return false;
  const diff = Math.abs(Math.round(amt1) - Math.round(amt2));
  return s1.split('').sort().join('') === s2.split('').sort().join('') && diff % 9 === 0;
}

/**
 * Check if two dates cross a month boundary.
 */
function crossesMonthBoundary(d1, d2) {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return date1.getMonth() !== date2.getMonth() || date1.getFullYear() !== date2.getFullYear();
}

/**
 * Detect anomalies from matching results.
 */
function detectAnomalies(matchResult) {
  const { exact, fuzzy, semantic, unmatchedBank, unmatchedLedger } = matchResult;
  const anomalies = [];

  const allMatches = [...exact, ...fuzzy, ...semantic];
  const fuzzyAndSemantic = [...fuzzy, ...semantic];

  // 1. digit_swap: fuzzy/semantic matches where amtDiff > 0 and digits are a permutation
  for (const m of fuzzyAndSemantic) {
    if (m.amtDiff > 0) {
      const bankAmt = getAmt(m.bank);
      const ledgerAmt = getAmt(m.ledger);
      if (isDigitSwap(bankAmt, ledgerAmt)) {
        anomalies.push({
          type: 'digit_swap',
          severity: 'error',
          message: `疑似数字颠倒：银行 ${bankAmt} vs 账本 ${ledgerAmt}`,
          entries: [m.bank, m.ledger],
        });
      }
    }
  }

  // 2. cross_month: matches that cross a month boundary (typical cut-off errors)
  for (const m of fuzzyAndSemantic) {
    if (m.daysDiff >= 1 && crossesMonthBoundary(m.bank.date, m.ledger.date)) {
      anomalies.push({
        type: 'cross_month',
        severity: m.daysDiff <= 3 ? 'info' : 'warning',
        message: `跨月匹配：银行 ${m.bank.date} vs 账本 ${m.ledger.date}，间隔 ${Math.round(m.daysDiff)} 天`,
        entries: [m.bank, m.ledger],
      });
    }
  }

  // 3. fee_missing: unmatched items where amount < 200 and description matches fee keywords
  const feePattern = /手续费|管理费|服务费|年费|工本费|account fee/i;
  const allUnmatched = [...unmatchedBank, ...unmatchedLedger];
  for (const entry of allUnmatched) {
    const amt = getAmt(entry);
    const desc = getDesc(entry);
    if (amt < 200 && feePattern.test(desc)) {
      anomalies.push({
        type: 'fee_missing',
        severity: 'info',
        message: `疑似未入账费用：${desc}，金额 ${amt}`,
        entries: [entry],
      });
    }
  }

  // 4. rounding_diff: matched items (fuzzy/semantic) where 0 < amtDiff < 1.00
  for (const m of fuzzyAndSemantic) {
    if (m.amtDiff > 0 && m.amtDiff < 1.00) {
      anomalies.push({
        type: 'rounding_diff',
        severity: 'info',
        message: `分/角差异：银行 ${getAmt(m.bank)} vs 账本 ${getAmt(m.ledger)}，差 ${m.amtDiff.toFixed(2)}`,
        entries: [m.bank, m.ledger],
      });
    }
  }

  // 5. duplicate_entry: within each side, same date + same direction + same amount + similar description
  function findDuplicates(entries, sideName) {
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i];
        const b = entries[j];
        if (a.date !== b.date) continue;
        if (getDir(a) !== getDir(b)) continue;
        if (Math.abs(getAmt(a) - getAmt(b)) > 0.01) continue;
        if (textSim(getDesc(a), getDesc(b)) < 0.6) continue;
        anomalies.push({
          type: 'duplicate_entry',
          severity: 'warning',
          message: `疑似重复录入(${sideName})：${a.date} ${getDesc(a) || '无描述'}，金额 ${getAmt(a)}`,
          entries: [a, b],
        });
      }
    }
  }

  findDuplicates(matchResult._sideA, '银行');
  findDuplicates(matchResult._sideB, '账本');

  // 6. slide_error: fuzzy/semantic matches where one amount is 10x or 100x the other (小数点位移)
  for (const m of fuzzyAndSemantic) {
    if (m.amtDiff > 0) {
      const bankAmt = getAmt(m.bank);
      const ledgerAmt = getAmt(m.ledger);
      const ratio = bankAmt > ledgerAmt ? bankAmt / ledgerAmt : ledgerAmt / bankAmt;
      if (Math.abs(ratio - 10) < 0.01 || Math.abs(ratio - 100) < 0.01) {
        anomalies.push({
          type: 'slide_error',
          severity: 'error',
          message: `疑似小数点位移：银行 ${bankAmt} vs 账本 ${ledgerAmt}（${Math.round(ratio)}倍差异）`,
          entries: [m.bank, m.ledger],
        });
      }
    }
  }

  // 7. reversal_error: unmatched pairs with same amount, close date, but opposite direction (借贷记反)
  for (const b of unmatchedBank) {
    const bAmt = getAmt(b);
    const bDir = getDir(b);
    if (bDir === 'unknown') continue;
    for (const l of unmatchedLedger) {
      const lAmt = getAmt(l);
      const lDir = getDir(l);
      if (lDir === 'unknown') continue;
      if (Math.abs(bAmt - lAmt) > 0.01) continue;
      if (bDir === lDir) continue;
      const dd = daysDiff(b.date, l.date);
      if (dd > 3) continue;
      const descSim = textSim(getDesc(b), getDesc(l));
      if (descSim < 0.2 && getDesc(b) && getDesc(l)) continue;
      anomalies.push({
        type: 'reversal_error',
        severity: 'error',
        message: `疑似借贷记反：${getDesc(b) || getDesc(l) || '交易'} ¥${bAmt}，银行为${bDir === 'debit' ? '支出' : '收入'}但账本为${lDir === 'debit' ? '支出' : '收入'}`,
        entries: [b, l],
      });
      break;
    }
  }

  // 8. one_to_many: unmatched items on one side whose sum equals an unmatched item on the other (一付多配)
  function findOneToMany(singles, multiples, singleLabel, multiLabel) {
    for (const single of singles) {
      const sAmt = getAmt(single);
      if (sAmt < 100) continue;
      const candidates = multiples.filter(m => getAmt(m) < sAmt && getDir(m) === getDir(single));
      if (candidates.length < 2 || candidates.length > 8) continue;
      // try 2-item and 3-item combinations
      for (let i = 0; i < candidates.length; i++) {
        const ai = getAmt(candidates[i]);
        if (Math.abs(ai - sAmt) < 0.01) continue;
        for (let j = i + 1; j < candidates.length; j++) {
          const sum2 = ai + getAmt(candidates[j]);
          if (Math.abs(sum2 - sAmt) < 0.01) {
            anomalies.push({
              type: 'one_to_many',
              severity: 'warning',
              message: `疑似一付多配：${singleLabel} ¥${sAmt} = ${multiLabel} ¥${ai} + ¥${getAmt(candidates[j])}`,
              entries: [single, candidates[i], candidates[j]],
            });
            break;
          }
          for (let k = j + 1; k < Math.min(candidates.length, j + 5); k++) {
            const sum3 = sum2 + getAmt(candidates[k]);
            if (Math.abs(sum3 - sAmt) < 0.01) {
              anomalies.push({
                type: 'one_to_many',
                severity: 'warning',
                message: `疑似一付多配：${singleLabel} ¥${sAmt} = ${multiLabel} ${[ai, getAmt(candidates[j]), getAmt(candidates[k])].map(v => '¥' + v).join(' + ')}`,
                entries: [single, candidates[i], candidates[j], candidates[k]],
              });
              break;
            }
          }
        }
      }
    }
  }
  findOneToMany(unmatchedBank, unmatchedLedger, '银行', '账本');
  findOneToMany(unmatchedLedger, unmatchedBank, '账本', '银行');

  // 9. desc_mismatch: exact matches (amount+date match) but description similarity very low
  for (const m of exact) {
    const ts = textSim(getDesc(m.bank), getDesc(m.ledger));
    if (ts < 0.25 && getDesc(m.bank) && getDesc(m.ledger)) {
      anomalies.push({
        type: 'desc_mismatch',
        severity: 'warning',
        message: `摘要严重不符：银行"${getDesc(m.bank).slice(0, 15)}" vs 账本"${getDesc(m.ledger).slice(0, 15)}"，金额 ¥${getAmt(m.bank)}`,
        entries: [m.bank, m.ledger],
      });
    }
  }

  // 10. micro_burst: many small-amount transactions on the same day from one side (小额多笔模式)
  function detectMicroBurst(entries, sideName) {
    const byDate = {};
    for (const e of entries) {
      if (!e.date) continue;
      const amt = getAmt(e);
      if (amt > 500) continue;
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    }
    for (const [date, group] of Object.entries(byDate)) {
      if (group.length >= 5) {
        const total = group.reduce((s, e) => s + getAmt(e), 0);
        anomalies.push({
          type: 'micro_burst',
          severity: 'warning',
          message: `小额多笔异常(${sideName})：${date} 共 ${group.length} 笔小额交易，合计 ¥${total.toFixed(2)}`,
          entries: group.slice(0, 3),
        });
      }
    }
  }
  detectMicroBurst(matchResult._sideA, '银行');
  detectMicroBurst(matchResult._sideB, '账本');

  return anomalies;
}

export function runMatching(sideA, sideB) {
  const usedA = new Set();
  const usedB = new Set();
  const exact = [];
  const fuzzy = [];
  const semantic = [];

  for (const a of sideA) {
    const aAmt = getAmt(a);
    const aDir = getDir(a);
    let best = null;
    let bestScore = 0;

    for (const b of sideB) {
      if (usedB.has(b.id)) continue;
      const bAmt = getAmt(b);
      const bDir = getDir(b);
      if (aDir !== 'unknown' && bDir !== 'unknown' && aDir !== bDir) continue;

      const amtMatch = Math.abs(aAmt - bAmt) < 0.01;
      const dd = daysDiff(a.date, b.date);
      const ts = textSim(getDesc(a), getDesc(b));

      let score = 0;
      if (amtMatch && dd <= 1) score = 95 + ts * 5;
      else if (amtMatch && dd <= 3) score = 85 + ts * 10;
      else if (amtMatch && dd <= 7) score = 70 + ts * 15;
      else if (Math.abs(aAmt - bAmt) / Math.max(aAmt, 1) < 0.05 && dd <= 5) score = 60 + ts * 20;

      if (score > bestScore) {
        bestScore = score;
        best = { bank: a, ledger: b, score: Math.round(score), amtDiff: Math.abs(aAmt - bAmt), daysDiff: dd };
      }
    }

    if (best && bestScore >= 60) {
      usedA.add(best.bank.id);
      usedB.add(best.ledger.id);
      if (bestScore >= 90) exact.push(best);
      else if (bestScore >= 75) fuzzy.push(best);
      else semantic.push(best);
    }
  }

  const unmatchedBank = sideA.filter(a => !usedA.has(a.id));
  const unmatchedLedger = sideB.filter(b => !usedB.has(b.id));

  const matchedAmt = [...exact, ...fuzzy, ...semantic].reduce((s, m) => getAmt(m.bank) + s, 0);
  const totalAmt = sideA.reduce((s, a) => s + getAmt(a), 0);

  // Build intermediate result with side references for anomaly detection
  const intermediateResult = {
    exact, fuzzy, semantic,
    unmatchedBank, unmatchedLedger,
    _sideA: sideA,
    _sideB: sideB,
  };

  // Run anomaly detection
  const anomalies = detectAnomalies(intermediateResult);

  return {
    exact, fuzzy, semantic,
    unmatchedBank, unmatchedLedger,
    matchedCount: exact.length + fuzzy.length + semantic.length,
    matchedAmt,
    matchRate: totalAmt > 0 ? (matchedAmt / totalAmt * 100) : 0,
    totalBankCount: sideA.length,
    totalLedgerCount: sideB.length,
    anomalies,
  };
}
