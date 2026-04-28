const STORAGE_KEY = 'cs_recon_audit_log';

export function logAction(action) {
  const log = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  log.push({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    user: '当前用户',
    ...action,
  });
  if (log.length > 500) log.splice(0, log.length - 500);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
}

export function getAuditLog(sessionId) {
  const log = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (sessionId) return log.filter(l => l.sessionId === sessionId);
  return log;
}

export function getSessionLog(sessionId) {
  return getAuditLog(sessionId);
}
