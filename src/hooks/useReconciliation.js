import { useState, useCallback, useEffect } from 'react';
import { parseFile, classifyDocument, classifyDocumentLocal, detectDuplicates, validateEntries } from '../utils/fileParser';
import { runMatching, generateReconciliation, manualMatch } from '../utils/matchEngine';
import { getScenario, detectScenarioFromDocTypes, DOC_TYPE_TO_ROLE } from '../utils/scenarios';
import { logAction } from '../utils/auditLog';
import { saveSession, loadSession, clearSession } from '../utils/sessionStore';

const initialState = {
  step: 'home',
  scenarioId: null,
  detectedScenarioId: null,
  files: [],
  parsedFiles: [],
  sideAData: null,
  sideBData: null,
  sideCData: null,
  sideABalance: 0,
  sideBBalance: 0,
  matchResults: null,
  reconciliation: null,
  error: null,
  isProcessing: false,
  validation: null,
  confirmedMatches: {},
  rejectedMatches: {},
  archived: false,
  periodStart: '',
  periodEnd: '',
  sessionId: `session-${Date.now()}`,
  approvalStatus: 'draft',
  approvalComment: '',
};


function guessRole(parsed, scenario) {
  const localType = classifyDocumentLocal(parsed);
  const mapping = DOC_TYPE_TO_ROLE[scenario.id];
  if (mapping && mapping[localType]) return mapping[localType];
  return 'auto';
}

export function useReconciliation() {
  const [state, setState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoload')) {
      clearSession();
      return initialState;
    }
    const saved = loadSession();
    if (saved && saved.step !== 'home' && saved.step !== 'scenario' && saved.step !== 'upload') {
      return {
        ...initialState,
        ...saved,
        files: [],
        parsedFiles: [],
        isProcessing: false,
        error: null,
        _restored: true,
      };
    }
    return initialState;
  });

  useEffect(() => {
    if (state.step !== 'home' && state.step !== 'scenario' && state.step !== 'upload') {
      saveSession(state);
    }
  }, [state.step, state.matchResults, state.reconciliation, state.confirmedMatches, state.rejectedMatches, state.sideABalance, state.sideBBalance]);

  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const homeAddFiles = useCallback(async (fileList) => {
    const newFiles = Array.from(fileList);
    updateState({ isProcessing: true, error: null });

    const results = await Promise.allSettled(newFiles.map(async (file) => {
      const result = await parseFile(file);
      const docType = classifyDocumentLocal(result);
      return { file, parsed: result, docType, assignedRole: 'auto' };
    }));

    const succeeded = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected');

    setState(prev => {
      const newParsed = [...prev.parsedFiles, ...succeeded];
      const docTypes = newParsed.map(f => f.docType).filter(d => d && d !== 'unknown');
      const detected = detectScenarioFromDocTypes(docTypes);
      const activeScenarioId = prev.scenarioId || detected || prev.detectedScenarioId;
      const mapping = activeScenarioId ? (DOC_TYPE_TO_ROLE[activeScenarioId] || {}) : {};
      const reassigned = newParsed.map(f => {
        if (f.assignedRole !== 'auto') return f;
        const role = mapping[f.docType] || 'auto';
        return { ...f, assignedRole: role };
      });
      return {
        ...prev,
        files: [...prev.files, ...succeeded.map(s => s.file)],
        parsedFiles: reassigned,
        detectedScenarioId: detected || prev.detectedScenarioId,
        scenarioId: activeScenarioId,
        isProcessing: false,
        error: failed.length > 0 ? `${failed.length} 个文件解析失败` : null,
      };
    });
  }, [updateState]);

  const homeRemoveFile = useCallback((index) => {
    setState(prev => {
      const newParsed = prev.parsedFiles.filter((_, i) => i !== index);
      const docTypes = newParsed.map(f => f.docType).filter(d => d && d !== 'unknown');
      const detected = newParsed.length > 0 ? detectScenarioFromDocTypes(docTypes) : null;
      return {
        ...prev,
        files: prev.files.filter((_, i) => i !== index),
        parsedFiles: newParsed,
        detectedScenarioId: detected,
        scenarioId: newParsed.length > 0 ? prev.scenarioId : null,
      };
    });
  }, []);

  const homeSelectScenario = useCallback((scenarioId) => {
    setState(prev => {
      const mapping = DOC_TYPE_TO_ROLE[scenarioId] || {};
      const reassigned = prev.parsedFiles.map(f => {
        const role = mapping[f.docType] || 'auto';
        return { ...f, assignedRole: role };
      });
      return {
        ...prev,
        detectedScenarioId: scenarioId,
        scenarioId,
        parsedFiles: reassigned,
      };
    });
  }, []);

  const loadDemo = useCallback(async (demoId) => {
    const { buildDemoFiles } = await import('../utils/demoData.js');
    const files = buildDemoFiles(demoId);
    if (!files.length) return;

    updateState({ isProcessing: true, error: null });

    const results = await Promise.allSettled(files.map(async (file) => {
      const result = await parseFile(file);
      const docType = classifyDocumentLocal(result);
      return { file, parsed: result, docType, assignedRole: 'auto' };
    }));

    const succeeded = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const scenario = getScenario(demoId);
    const mapping = DOC_TYPE_TO_ROLE[demoId] || {};
    const newSessionId = `session-${Date.now()}`;
    logAction({ sessionId: newSessionId, action: 'load_demo', detail: demoId });

    const reassigned = succeeded.map(f => ({
      ...f,
      assignedRole: mapping[f.docType] || 'auto',
    }));

    const sideAFiles = reassigned.filter(f => f.assignedRole === 'sideA');
    const sideBFiles = reassigned.filter(f => f.assignedRole === 'sideB');
    const sideCFiles = scenario.sideC ? reassigned.filter(f => f.assignedRole === 'sideC') : [];

    let sideAEntries = sideAFiles.flatMap(f => f.parsed.entries);
    let sideBEntries = sideBFiles.flatMap(f => f.parsed.entries);
    let sideCEntries = sideCFiles.flatMap(f => f.parsed.entries);

    const aDupes = detectDuplicates(sideAEntries);
    const bDupes = detectDuplicates(sideBEntries);
    const aWarnings = validateEntries(sideAEntries);
    const bWarnings = validateEntries(sideBEntries);

    const validation = {
      sideADuplicates: aDupes,
      sideBDuplicates: bDupes,
      sideAWarnings: aWarnings,
      sideBWarnings: bWarnings,
      hasErrors: aWarnings.some(w => w.severity === 'error') || bWarnings.some(w => w.severity === 'error'),
      totalWarnings: aWarnings.length + bWarnings.length + aDupes.length + bDupes.length,
    };

    const lastBalEntryA = sideAEntries.filter(e => e.balance != null).pop();
    const autoABal = lastBalEntryA ? lastBalEntryA.balance : 0;
    const lastBalEntryB = sideBEntries.filter(e => e.balance != null).pop();
    const autoBBal = lastBalEntryB ? lastBalEntryB.balance : 0;

    setState(prev => ({
      ...prev,
      scenarioId: demoId,
      detectedScenarioId: demoId,
      sessionId: newSessionId,
      files: reassigned.map(s => s.file),
      parsedFiles: reassigned,
      sideAData: { entries: sideAEntries, files: sideAFiles },
      sideBData: { entries: sideBEntries, files: sideBFiles },
      sideCData: sideCEntries.length > 0 ? { entries: sideCEntries, files: sideCFiles } : null,
      sideABalance: autoABal,
      sideBBalance: autoBBal,
      validation,
      step: 'confirm',
      isProcessing: false,
      error: null,
    }));
  }, [updateState]);

  const selectScenario = useCallback((scenarioId) => {
    const newSessionId = `session-${Date.now()}`;
    logAction({ sessionId: newSessionId, action: 'select_scenario', detail: scenarioId });
    updateState({ scenarioId, step: 'upload', sessionId: newSessionId });
  }, [updateState]);

  const addFiles = useCallback(async (fileList) => {
    const newFiles = Array.from(fileList);
    updateState({ isProcessing: true, error: null });
    const scenario = getScenario(state.scenarioId);

    const results = await Promise.allSettled(newFiles.map(async (file) => {
      const result = await parseFile(file);
      const role = guessRole(result, scenario);
      const item = { file, parsed: result, docType: classifyDocumentLocal(result), assignedRole: role };
      classifyDocument(result).then(aiType => {
        if (aiType) {
          setState(prev => {
            const pf = prev.parsedFiles.map(f => {
              if (f.file !== file) return f;
              let newRole = f.assignedRole;
              if (f.assignedRole === 'auto') {
                const mapping = DOC_TYPE_TO_ROLE[scenario.id];
                if (mapping && mapping[aiType]) {
                  const targetRole = mapping[aiType];
                  const currentCount = prev.parsedFiles.filter(pf2 => pf2.assignedRole === targetRole).length;
                  if (currentCount < 10) newRole = targetRole;
                }
              }
              return { ...f, docType: aiType, assignedRole: newRole };
            });
            return { ...prev, parsedFiles: pf };
          });
        }
      }).catch(() => {});
      return item;
    }));

    const succeeded = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected');

    setState(prev => {
      const existingRoleCounts = {};
      prev.parsedFiles.forEach(f => {
        if (f.assignedRole !== 'auto') {
          existingRoleCounts[f.assignedRole] = (existingRoleCounts[f.assignedRole] || 0) + 1;
        }
      });
      const capped = succeeded.map(s => {
        if (s.assignedRole !== 'auto') {
          const count = existingRoleCounts[s.assignedRole] || 0;
          if (count >= 10) {
            return { ...s, assignedRole: 'auto' };
          }
          existingRoleCounts[s.assignedRole] = count + 1;
        }
        return s;
      });
      return {
        ...prev,
        files: [...prev.files, ...capped.map(s => s.file)],
        parsedFiles: [...prev.parsedFiles, ...capped],
        isProcessing: false,
        error: failed.length > 0 ? `${failed.length} 个文件解析失败` : null,
      };
    });
  }, [updateState, state.scenarioId]);

  const removeFile = useCallback((index) => {
    setState(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
      parsedFiles: prev.parsedFiles.filter((_, i) => i !== index),
    }));
  }, []);

  const assignRole = useCallback((index, role) => {
    setState(prev => {
      const pf = [...prev.parsedFiles];
      pf[index] = { ...pf[index], assignedRole: role };
      return { ...prev, parsedFiles: pf };
    });
  }, []);

  const setPeriod = useCallback((start, end) => {
    updateState({ periodStart: start, periodEnd: end });
  }, [updateState]);

  const confirmData = useCallback(() => {
    const scenario = getScenario(state.scenarioId);
    const sideAFiles = state.parsedFiles.filter(f => f.assignedRole === 'sideA');
    const sideBFiles = state.parsedFiles.filter(f => f.assignedRole === 'sideB');
    const sideCFiles = scenario.sideC ? state.parsedFiles.filter(f => f.assignedRole === 'sideC') : [];

    const needC = !!scenario.sideC;
    if (sideAFiles.length === 0 || sideBFiles.length === 0) {
      updateState({ error: `请确保至少有一个「${scenario.sideA.label}」和一个「${scenario.sideB.label}」文件` });
      return false;
    }
    if (needC && sideCFiles.length === 0) {
      updateState({ error: `请确保至少有一个「${scenario.sideC.label}」文件` });
      return false;
    }

    let sideAEntries = sideAFiles.flatMap(f => f.parsed.entries);
    let sideBEntries = sideBFiles.flatMap(f => f.parsed.entries);
    let sideCEntries = sideCFiles.flatMap(f => f.parsed.entries);

    if (state.periodStart || state.periodEnd) {
      const filterByPeriod = (entries) => entries.filter(e => {
        if (!e.date) return true;
        if (state.periodStart && e.date < state.periodStart) return false;
        if (state.periodEnd && e.date > state.periodEnd) return false;
        return true;
      });
      sideAEntries = filterByPeriod(sideAEntries);
      sideBEntries = filterByPeriod(sideBEntries);
      sideCEntries = filterByPeriod(sideCEntries);
    }

    const aDupes = detectDuplicates(sideAEntries);
    const bDupes = detectDuplicates(sideBEntries);
    const aWarnings = validateEntries(sideAEntries);
    const bWarnings = validateEntries(sideBEntries);

    const validation = {
      sideADuplicates: aDupes,
      sideBDuplicates: bDupes,
      sideAWarnings: aWarnings,
      sideBWarnings: bWarnings,
      hasErrors: aWarnings.some(w => w.severity === 'error') || bWarnings.some(w => w.severity === 'error'),
      totalWarnings: aWarnings.length + bWarnings.length + aDupes.length + bDupes.length,
    };

    const lastBalEntryA = sideAEntries.filter(e => e.balance != null).pop();
    const autoABal = lastBalEntryA ? lastBalEntryA.balance : 0;
    const lastBalEntryB = sideBEntries.filter(e => e.balance != null).pop();
    const autoBBal = lastBalEntryB ? lastBalEntryB.balance : 0;

    logAction({ sessionId: state.sessionId, action: 'confirm_data', detail: `A:${sideAEntries.length} B:${sideBEntries.length}` });

    updateState({
      sideAData: { entries: sideAEntries, files: sideAFiles },
      sideBData: { entries: sideBEntries, files: sideBFiles },
      sideCData: sideCEntries.length > 0 ? { entries: sideCEntries, files: sideCFiles } : null,
      sideABalance: autoABal,
      sideBBalance: autoBBal,
      validation,
      step: 'confirm',
      error: null,
    });
    return true;
  }, [state.parsedFiles, state.scenarioId, state.periodStart, state.periodEnd, state.sessionId, updateState]);

  const startMatching = useCallback(() => {
    if (!state.sideAData || !state.sideBData) return;
    const scenario = getScenario(state.scenarioId);

    updateState({ step: 'matching', isProcessing: true });

    setTimeout(() => {
      const results = runMatching(
        state.sideAData.entries,
        state.sideBData.entries,
        scenario.matchConfig,
        scenario.sideC && state.sideCData ? state.sideCData.entries : null,
        scenario.id,
      );
      logAction({ sessionId: state.sessionId, action: 'matching_complete', detail: `exact:${results.exact.length} fuzzy:${results.fuzzy.length} semantic:${results.semantic.length}` });
      updateState({ matchResults: results, step: 'results', isProcessing: false, confirmedMatches: {}, rejectedMatches: {} });
    }, 100);
  }, [state.sideAData, state.sideBData, state.sideCData, state.scenarioId, state.sessionId, updateState]);

  const confirmMatch = useCallback((matchKey) => {
    logAction({ sessionId: state.sessionId, action: 'confirm_match', detail: matchKey });
    setState(prev => {
      const confirmed = { ...prev.confirmedMatches, [matchKey]: true };
      const rejected = { ...prev.rejectedMatches };
      delete rejected[matchKey];
      return { ...prev, confirmedMatches: confirmed, rejectedMatches: rejected };
    });
  }, [state.sessionId]);

  const rejectMatch = useCallback((matchKey) => {
    logAction({ sessionId: state.sessionId, action: 'reject_match', detail: matchKey });
    setState(prev => {
      const rejected = { ...prev.rejectedMatches, [matchKey]: true };
      const confirmed = { ...prev.confirmedMatches };
      delete confirmed[matchKey];
      return { ...prev, rejectedMatches: rejected, confirmedMatches: confirmed };
    });
  }, [state.sessionId]);

  const doManualMatch = useCallback((sideAIdx, sideBIdx) => {
    if (!state.matchResults || !state.sideAData || !state.sideBData) return;
    logAction({ sessionId: state.sessionId, action: 'manual_match', detail: `A:${sideAIdx} B:${sideBIdx}` });
    const updated = manualMatch(state.matchResults, sideAIdx, sideBIdx, state.sideAData.entries, state.sideBData.entries);
    updateState({ matchResults: updated });
  }, [state.matchResults, state.sideAData, state.sideBData, state.sessionId, updateState]);

  const generateReport = useCallback(() => {
    if (!state.matchResults) return;
    const scenario = getScenario(state.scenarioId);
    const adjusted = { ...state.matchResults };

    const rejectedKeys = Object.keys(state.rejectedMatches);
    if (rejectedKeys.length > 0) {
      const rejectedSet = new Set(rejectedKeys);
      const rejectFromList = (list) => {
        const kept = [];
        const removed = [];
        list.forEach((m, i) => {
          const key = `${m.type}-${i}`;
          if (rejectedSet.has(key)) removed.push(m);
          else kept.push(m);
        });
        return { kept, removed };
      };

      const fuzzyResult = rejectFromList(adjusted.fuzzy);
      const semanticResult = rejectFromList(adjusted.semantic);

      adjusted.fuzzy = fuzzyResult.kept;
      adjusted.semantic = semanticResult.kept;

      [...fuzzyResult.removed, ...semanticResult.removed].forEach(m => {
        adjusted.unmatchedA.push({ entry: m.sideA, idx: m.sideAIdx, source: 'sideA' });
        adjusted.unmatchedB.push({ entry: m.sideB, idx: m.sideBIdx, source: 'sideB' });
      });
    }

    const recon = generateReconciliation(adjusted, state.sideABalance, state.sideBBalance, scenario);
    logAction({ sessionId: state.sessionId, action: 'generate_report', detail: `balanced:${recon.isBalanced}` });
    updateState({ reconciliation: recon, step: 'reconciliation' });
  }, [state.matchResults, state.sideABalance, state.sideBBalance, state.rejectedMatches, state.scenarioId, state.sessionId, updateState]);

  const setBalances = useCallback((a, b) => {
    logAction({ sessionId: state.sessionId, action: 'set_balance', detail: `A:${a} B:${b}` });
    updateState({ sideABalance: a, sideBBalance: b });
  }, [state.sessionId, updateState]);

  const submitForApproval = useCallback(() => {
    logAction({ sessionId: state.sessionId, action: 'submit_approval' });
    updateState({ approvalStatus: 'pending' });
  }, [state.sessionId, updateState]);

  const approveReport = useCallback((comment) => {
    logAction({ sessionId: state.sessionId, action: 'approve', detail: comment });
    updateState({ approvalStatus: 'approved', approvalComment: comment || '审核通过' });
  }, [state.sessionId, updateState]);

  const rejectReport = useCallback((comment) => {
    logAction({ sessionId: state.sessionId, action: 'reject_report', detail: comment });
    updateState({ approvalStatus: 'rejected', approvalComment: comment || '退回修改' });
  }, [state.sessionId, updateState]);

  const goToStep = useCallback((step) => {
    if (step === 'home' || step === 'scenario') {
      clearSession();
      setState(initialState);
      return;
    }
    updateState({ step });
  }, [updateState]);

  const archiveReport = useCallback(() => {
    if (!state.reconciliation || !state.matchResults) return;

    const archiveData = {
      id: `recon-${Date.now()}`,
      timestamp: new Date().toISOString(),
      scenarioId: state.scenarioId,
      reconciliation: state.reconciliation,
      matchResults: state.matchResults,
      sideABalance: state.sideABalance,
      sideBBalance: state.sideBBalance,
      periodStart: state.periodStart,
      periodEnd: state.periodEnd,
      approvalStatus: state.approvalStatus,
      files: state.parsedFiles.map(f => ({ name: f.file.name, size: f.file.size, role: f.assignedRole })),
    };

    const existing = JSON.parse(localStorage.getItem('cs_recon_history') || '[]');
    existing.unshift(archiveData);
    if (existing.length > 20) existing.length = 20;
    localStorage.setItem('cs_recon_history', JSON.stringify(existing));

    logAction({ sessionId: state.sessionId, action: 'archive', detail: archiveData.id });
    clearSession();
    updateState({ archived: true });
    return archiveData.id;
  }, [state.reconciliation, state.matchResults, state.sideABalance, state.sideBBalance, state.parsedFiles, state.scenarioId, state.sessionId, state.periodStart, state.periodEnd, state.approvalStatus, updateState]);

  const loadHistory = useCallback((historyItem) => {
    if (!historyItem?.reconciliation) return;
    const newSessionId = `session-${Date.now()}`;
    logAction({ sessionId: newSessionId, action: 'load_history', detail: historyItem.id });
    setState({
      ...initialState,
      sessionId: newSessionId,
      scenarioId: historyItem.scenarioId,
      reconciliation: historyItem.reconciliation,
      matchResults: historyItem.matchResults || { exact: [], fuzzy: [], semantic: [], merged: [], unmatchedA: [], unmatchedB: [] },
      sideABalance: historyItem.sideABalance || 0,
      sideBBalance: historyItem.sideBBalance || 0,
      periodStart: historyItem.periodStart || '',
      periodEnd: historyItem.periodEnd || '',
      approvalStatus: historyItem.approvalStatus || 'draft',
      archived: true,
      step: 'reconciliation',
    });
  }, []);

  const updateEntries = useCallback((aEntries, bEntries, cEntries) => {
    setState(prev => ({
      ...prev,
      sideAData: prev.sideAData ? { ...prev.sideAData, entries: aEntries } : null,
      sideBData: prev.sideBData ? { ...prev.sideBData, entries: bEntries } : null,
      sideCData: cEntries ? (prev.sideCData ? { ...prev.sideCData, entries: cEntries } : { entries: cEntries, files: [] }) : prev.sideCData,
    }));
  }, []);

  const updateMapping = useCallback((fileIdx, newMapping) => {
    setState(prev => {
      const pf = [...prev.parsedFiles];
      if (!pf[fileIdx]) return prev;
      pf[fileIdx] = { ...pf[fileIdx], parsed: { ...pf[fileIdx].parsed, columnMapping: newMapping } };
      return { ...prev, parsedFiles: pf };
    });
  }, []);

  const reset = useCallback(() => {
    clearSession();
    setState(initialState);
  }, []);

  return {
    state,
    homeAddFiles,
    homeRemoveFile,
    homeSelectScenario,
    loadDemo,
    selectScenario,
    addFiles,
    removeFile,
    assignRole,
    setPeriod,
    confirmData,
    startMatching,
    confirmMatch,
    rejectMatch,
    doManualMatch,
    generateReport,
    setBalances,
    submitForApproval,
    approveReport,
    rejectReport,
    goToStep,
    archiveReport,
    loadHistory,
    updateEntries,
    updateMapping,
    reset,
  };
}
