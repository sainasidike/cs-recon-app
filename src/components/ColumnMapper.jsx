import { useState } from 'react';

const FIELD_OPTIONS = [
  { value: '', label: '不映射' },
  { value: 'date', label: '日期' },
  { value: 'amount', label: '金额' },
  { value: 'debit', label: '借方金额' },
  { value: 'credit', label: '贷方金额' },
  { value: 'description', label: '摘要' },
  { value: 'counterparty', label: '对方' },
  { value: 'balance', label: '余额' },
  { value: 'reference', label: '流水号/凭证号' },
];

export default function ColumnMapper({ headers, currentMapping, onApply, onClose }) {
  const reverseMap = {};
  if (currentMapping) {
    Object.entries(currentMapping).forEach(([field, idx]) => {
      if (idx >= 0) reverseMap[idx] = field;
    });
  }

  const [mapping, setMapping] = useState(() => {
    const m = {};
    headers.forEach((_, i) => { m[i] = reverseMap[i] || ''; });
    return m;
  });

  const handleChange = (colIdx, field) => {
    setMapping(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (next[k] === field && field) next[k] = ''; });
      next[colIdx] = field;
      return next;
    });
  };

  const handleApply = () => {
    const result = { date: -1, amount: -1, debit: -1, credit: -1, description: -1, counterparty: -1, balance: -1, reference: -1 };
    Object.entries(mapping).forEach(([idx, field]) => {
      if (field && result.hasOwnProperty(field)) result[field] = Number(idx);
    });
    onApply(result);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 24, width: '90%', maxWidth: 520, maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ fontWeight: 600, fontSize: 'var(--font-lg)', marginBottom: 16 }}>列映射修正</div>
        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginBottom: 16 }}>
          系统已自动检测列含义，如有误请手动修正
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {headers.map((h, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 140, fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {h || `列${i + 1}`}
              </span>
              <select
                value={mapping[i] || ''}
                onChange={e => handleChange(i, e.target.value)}
                style={{ flex: 1, padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 'var(--font-sm)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
              >
                {FIELD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose}>取消</button>
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={handleApply}>应用</button>
        </div>
      </div>
    </div>
  );
}
