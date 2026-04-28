import { useState } from 'react';

function fmt(val) {
  return (val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 });
}

export default function ManualMatchPanel({ unmatchedA, unmatchedB, scenario, onMatch, onClose }) {
  const [selectedA, setSelectedA] = useState(null);
  const [selectedB, setSelectedB] = useState(null);

  const sideALabel = scenario?.sideA?.shortLabel || 'A方';
  const sideBLabel = scenario?.sideB?.shortLabel || 'B方';

  const handleMatch = () => {
    if (selectedA != null && selectedB != null) {
      onMatch(unmatchedA[selectedA].idx, unmatchedB[selectedB].idx);
      setSelectedA(null);
      setSelectedB(null);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: 24, width: '95%', maxWidth: 800, maxHeight: '85vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--font-lg)' }}>手动匹配</div>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>x</button>
        </div>
        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginBottom: 16 }}>
          分别在左右两列各选中一条记录，点击"确认匹配"
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)', marginBottom: 8, color: 'var(--text-secondary)' }}>
              {sideALabel}未匹配 ({unmatchedA.length})
            </div>
            <div style={{ maxHeight: 400, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {unmatchedA.map((u, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedA(i)}
                  style={{
                    padding: '8px 10px',
                    background: selectedA === i ? 'var(--accent-light)' : 'var(--bg-input)',
                    border: selectedA === i ? '2px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 'var(--font-xs)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{u.entry.date} · ¥{fmt(u.entry.amount)}</div>
                  <div style={{ color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.entry.description || '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)', marginBottom: 8, color: 'var(--text-secondary)' }}>
              {sideBLabel}未匹配 ({unmatchedB.length})
            </div>
            <div style={{ maxHeight: 400, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {unmatchedB.map((u, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedB(i)}
                  style={{
                    padding: '8px 10px',
                    background: selectedB === i ? 'var(--blue-light)' : 'var(--bg-input)',
                    border: selectedB === i ? '2px solid var(--blue)' : '1px solid var(--border)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 'var(--font-xs)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{u.entry.date} · ¥{fmt(u.entry.amount)}</div>
                  <div style={{ color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.entry.description || '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {selectedA != null && selectedB != null && (
          <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-input)', borderRadius: 8, fontSize: 'var(--font-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>{sideALabel}: ¥{fmt(unmatchedA[selectedA].entry.amount)}</span>
              <span style={{ color: 'var(--text-tertiary)' }}>⟷</span>
              <span>{sideBLabel}: ¥{fmt(unmatchedB[selectedB].entry.amount)}</span>
            </div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-xs)' }}>
              金额差异: ¥{fmt(Math.abs(unmatchedA[selectedA].entry.amount - unmatchedB[selectedB].entry.amount))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose}>关闭</button>
          <button
            className="btn btn-primary btn-sm"
            style={{ flex: 1 }}
            disabled={selectedA == null || selectedB == null}
            onClick={handleMatch}
          >
            确认匹配
          </button>
        </div>
      </div>
    </div>
  );
}
