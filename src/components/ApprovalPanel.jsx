import { useState } from 'react';

export default function ApprovalPanel({ status, comment, onSubmit, onApprove, onReject }) {
  const [rejectReason, setRejectReason] = useState('');
  const [approveComment, setApproveComment] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [showApprove, setShowApprove] = useState(false);

  if (status === 'approved') {
    return (
      <div style={{ padding: 16, background: 'rgba(62,207,142,0.06)', border: '1px solid rgba(62,207,142,0.3)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--accent)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          已审核通过
        </div>
        {comment && <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: 6 }}>{comment}</div>}
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div style={{ padding: 16, background: 'var(--danger-light)', border: '1px solid rgba(229,62,62,0.3)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--danger)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          已退回
        </div>
        {comment && <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginTop: 6 }}>{comment}</div>}
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div style={{ padding: 16, background: 'var(--warning-light)', border: '1px solid rgba(221,140,4,0.3)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
        <div style={{ fontWeight: 600, color: 'var(--warning)', marginBottom: 12 }}>待审核</div>
        {!showApprove && !showReject && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => setShowApprove(true)}>审核通过</button>
            <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => setShowReject(true)}>退回修改</button>
          </div>
        )}
        {showApprove && (
          <div>
            <input className="input" placeholder="审核意见（可选）" value={approveComment} onChange={e => setApproveComment(e.target.value)} style={{ marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setShowApprove(false)}>取消</button>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => onApprove(approveComment)}>确认通过</button>
            </div>
          </div>
        )}
        {showReject && (
          <div>
            <input className="input" placeholder="退回原因" value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={{ marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setShowReject(false)}>取消</button>
              <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => onReject(rejectReason)}>确认退回</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button className="btn btn-secondary mt-md" onClick={onSubmit}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
      </svg>
      提交审核
    </button>
  );
}
