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

export function runMatching(bankData, ledgerData) {
  const usedB = new Set();
  const usedL = new Set();
  const exact = [];
  const fuzzy = [];
  const semantic = [];

  for (const b of bankData) {
    const bAmt = b.out || b.income || 0;
    const bDir = b.out ? 'debit' : 'credit';
    let best = null;
    let bestScore = 0;

    for (const l of ledgerData) {
      if (usedL.has(l.id)) continue;
      const lAmt = l.debit || l.credit || 0;
      const lDir = l.debit ? 'debit' : 'credit';
      if (bDir !== lDir) continue;

      const amtMatch = Math.abs(bAmt - lAmt) < 0.01;
      const dd = daysDiff(b.date, l.date);
      const ts = textSim(b.desc + ' ' + (b.payee || ''), l.desc + ' ' + (l.payee || ''));

      let score = 0;
      if (amtMatch && dd <= 1) score = 95 + ts * 5;
      else if (amtMatch && dd <= 3) score = 85 + ts * 10;
      else if (amtMatch && dd <= 7) score = 70 + ts * 15;
      else if (Math.abs(bAmt - lAmt) / Math.max(bAmt, 1) < 0.05 && dd <= 5) score = 60 + ts * 20;

      if (score > bestScore) {
        bestScore = score;
        best = { bank: b, ledger: l, score: Math.round(score), amtDiff: Math.abs(bAmt - lAmt), daysDiff: dd };
      }
    }

    if (best && bestScore >= 60) {
      usedB.add(best.bank.id);
      usedL.add(best.ledger.id);
      if (bestScore >= 90) exact.push(best);
      else if (bestScore >= 75) fuzzy.push(best);
      else semantic.push(best);
    }
  }

  const unmatchedBank = bankData.filter(b => !usedB.has(b.id));
  const unmatchedLedger = ledgerData.filter(l => !usedL.has(l.id));

  const matchedAmt = [...exact, ...fuzzy, ...semantic].reduce((s, m) => s + (m.bank.out || m.bank.income || 0), 0);
  const totalBankAmt = bankData.reduce((s, b) => s + (b.out || b.income || 0), 0);

  return {
    exact, fuzzy, semantic,
    unmatchedBank, unmatchedLedger,
    matchedCount: exact.length + fuzzy.length + semantic.length,
    matchedAmt,
    matchRate: totalBankAmt > 0 ? (matchedAmt / totalBankAmt * 100) : 0,
    totalBankCount: bankData.length,
    totalLedgerCount: ledgerData.length,
  };
}
