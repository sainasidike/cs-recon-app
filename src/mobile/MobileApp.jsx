import { useState } from 'react';
import { useReconciliation } from '../hooks/useReconciliation';
import { ToastProvider } from '../components/Toast';
import { getScenario } from '../utils/scenarios';
import MobileHome from './pages/MobileHome';
import MobileConfirm from './pages/MobileConfirm';
import MobileResults from './pages/MobileResults';
import MobileReport from './pages/MobileReport';
import MobileComplete from './pages/MobileComplete';
import MobileLoading from './components/MobileLoading';

function MobileAppInner() {
  const {
    state,
    homeAddFiles, homeRemoveFile, homeSelectScenario, loadDemo, loadHistory,
    assignRole, setPeriod,
    confirmData, startMatching, confirmMatch, rejectMatch, doManualMatch, generateReport,
    setBalances, submitForApproval, approveReport, rejectReport,
    goToStep, archiveReport, reset, updateEntries, updateMapping,
  } = useReconciliation();

  const { step } = state;
  const scenario = state.scenarioId ? getScenario(state.scenarioId) : null;

  if (step === 'home' || step === 'scenario') {
    return (
      <MobileHome
        parsedFiles={state.parsedFiles}
        isProcessing={state.isProcessing}
        error={state.error}
        scenarioId={state.scenarioId}
        detectedScenarioId={state.detectedScenarioId}
        periodStart={state.periodStart}
        periodEnd={state.periodEnd}
        onAddFiles={homeAddFiles}
        onRemoveFile={homeRemoveFile}
        onAssignRole={assignRole}
        onSelectScenario={homeSelectScenario}
        onSetPeriod={setPeriod}
        onSelectDemo={loadDemo}
        onConfirmData={confirmData}
        onUpdateMapping={updateMapping}
      />
    );
  }

  if (step === 'confirm') {
    return (
      <MobileConfirm
        scenario={scenario}
        sideAData={state.sideAData}
        sideBData={state.sideBData}
        sideCData={state.sideCData}
        sideABalance={state.sideABalance}
        sideBBalance={state.sideBBalance}
        validation={state.validation}
        onSetBalances={setBalances}
        onUpdateEntries={updateEntries}
        onBack={() => goToStep('home')}
        onNext={startMatching}
      />
    );
  }

  if (step === 'matching') {
    return <MobileLoading scenario={scenario} />;
  }

  if (step === 'results') {
    return (
      <MobileResults
        scenario={scenario}
        matchResults={state.matchResults}
        confirmedMatches={state.confirmedMatches}
        rejectedMatches={state.rejectedMatches}
        onConfirmMatch={confirmMatch}
        onRejectMatch={rejectMatch}
        onManualMatch={doManualMatch}
        onBack={() => goToStep('confirm')}
        onNext={generateReport}
      />
    );
  }

  if (step === 'reconciliation') {
    return (
      <MobileReport
        scenario={scenario}
        reconciliation={state.reconciliation}
        matchResults={state.matchResults}
        periodStart={state.periodStart}
        periodEnd={state.periodEnd}
        sessionId={state.sessionId}
        onBack={() => goToStep('results')}
        onNext={() => { archiveReport(); reset(); }}
      />
    );
  }

  if (step === 'complete') {
    return (
      <MobileComplete
        scenario={scenario}
        reconciliation={state.reconciliation}
        matchResults={state.matchResults}
        parsedFiles={state.parsedFiles}
        archived={state.archived}
        onArchive={archiveReport}
        onReset={reset}
      />
    );
  }

  return null;
}

export default function MobileApp() {
  return (
    <ToastProvider>
      <MobileAppInner />
    </ToastProvider>
  );
}
