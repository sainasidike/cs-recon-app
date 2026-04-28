const SESSION_KEY = 'cs_recon_session';

export function saveSession(state) {
  const serializable = {
    step: state.step,
    scenarioId: state.scenarioId,
    sideAData: state.sideAData ? {
      entries: state.sideAData.entries,
      fileNames: state.sideAData.files?.map(f => f.file?.name || ''),
    } : null,
    sideBData: state.sideBData ? {
      entries: state.sideBData.entries,
      fileNames: state.sideBData.files?.map(f => f.file?.name || ''),
    } : null,
    sideCData: state.sideCData ? {
      entries: state.sideCData.entries,
      fileNames: state.sideCData.files?.map(f => f.file?.name || ''),
    } : null,
    sideABalance: state.sideABalance,
    sideBBalance: state.sideBBalance,
    matchResults: state.matchResults,
    reconciliation: state.reconciliation,
    confirmedMatches: state.confirmedMatches,
    rejectedMatches: state.rejectedMatches,
    validation: state.validation,
    periodStart: state.periodStart,
    periodEnd: state.periodEnd,
    sessionId: state.sessionId,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(serializable));
  } catch {
    // storage full
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const savedAt = new Date(data.savedAt);
    const hoursSince = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSince > 24) {
      clearSession();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
