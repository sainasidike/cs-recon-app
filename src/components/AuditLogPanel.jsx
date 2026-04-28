import { useState } from 'react';
import { getSessionLog } from '../utils/auditLog';

const ACTION_LABELS = {
  select_scenario: '选择场景',
  confirm_data: '确认数据',
  set_balance: '设置余额',
  matching_complete: '匹配完成',
  confirm_match: '确认匹配',
  reject_match: '驳回匹配',
  manual_match: '手动匹配',
  generate_report: '生成报告',
  submit_approval: '提交审核',
  approve: '审核通过',
  reject_report: '退回',
  archive: '归档',
};

export default function AuditLogPanel({ sessionId }) {
  const [expanded, setExpanded] = useState(false);
  const logs = getSessionLog(sessionId);

  if (logs.length === 0) return null;

  return (
    <div className="card mt-md">
      <div className="card-header" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
        操作日志 ({logs.length})
        <span style={{ marginLeft: 'auto', fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="card-body" style={{ padding: 0, maxHeight: 300, overflowY: 'auto' }}>
          {logs.map((log, i) => {
            const time = new Date(log.timestamp);
            return (
              <div key={i} style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: 'var(--font-xs)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{ACTION_LABELS[log.action] || log.action}</span>
                  {log.detail && <span style={{ color: 'var(--text-tertiary)', marginLeft: 8 }}>{log.detail}</span>}
                </div>
                <span style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                  {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
