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

  return {
    exact, fuzzy, semantic,
    unmatchedBank, unmatchedLedger,
    matchedCount: exact.length + fuzzy.length + semantic.length,
    matchedAmt,
    matchRate: totalAmt > 0 ? (matchedAmt / totalAmt * 100) : 0,
    totalBankCount: sideA.length,
    totalLedgerCount: sideB.length,
  };
}
