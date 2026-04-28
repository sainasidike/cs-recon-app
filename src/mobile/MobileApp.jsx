import { useState, useCallback } from 'react';
import { useReconciliation } from '../hooks/useReconciliation';
import { ToastProvider } from '../components/Toast';
import { getScenario } from '../utils/scenarios';
import CSHomePage from './pages/CSHomePage';
import CSDocViewPage from './pages/CSDocViewPage';
import CSAnalyzingPage from './pages/CSAnalyzingPage';
import CSDocSelectPage from './pages/CSDocSelectPage';
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

  const [csStep, setCsStep] = useState('cs-home');
  const [currentDoc, setCurrentDoc] = useState(null);
  const [extraDocs, setExtraDocs] = useState([]);

  const handleOpenDocument = useCallback((doc) => {
    setCurrentDoc(doc);
    setCsStep('cs-docview');
  }, []);

  const handleBackToHome = useCallback(() => {
    setCsStep('cs-home');
    setCurrentDoc(null);
  }, []);

  const handleStartReconciliation = useCallback(() => {
    setCsStep('cs-analyzing');
  }, []);

  const handleAnalysisComplete = useCallback(() => {
    if (currentDoc?.sufficient) {
      loadDemo('bank_recon');
      setCsStep('reconciling');
    } else {
      setCsStep('cs-doc-select');
    }
  }, [currentDoc, loadDemo]);

  const handleDocSelectCancel = useCallback(() => {
    setCsStep('cs-docview');
  }, []);

  const handleDocSelectConfirm = useCallback((docs) => {
    setExtraDocs(docs);
    setCsStep('cs-analyzing-2');
  }, []);

  const handleAnalysis2Complete = useCallback(() => {
    loadDemo('bank_recon');
    setCsStep('reconciling');
  }, [loadDemo]);

  const handleResetToCS = useCallback(() => {
    reset();
    setCsStep('cs-home');
    setCurrentDoc(null);
    setExtraDocs([]);
  }, [reset]);

  const { step } = state;
  const scenario = state.scenarioId ? getScenario(state.scenarioId) : null;

  if (csStep === 'cs-home') {
    return <CSHomePage onOpenDocument={handleOpenDocument} />;
  }

  if (csStep === 'cs-docview') {
    return (
      <CSDocViewPage
        document={currentDoc}
        onBack={handleBackToHome}
        onReconciliation={handleStartReconciliation}
      />
    );
  }

  if (csStep === 'cs-analyzing') {
    return (
      <CSAnalyzingPage
        document={currentDoc}
        onComplete={handleAnalysisComplete}
      />
    );
  }

  if (csStep === 'cs-doc-select') {
    return (
      <CSDocSelectPage
        currentDocId={currentDoc?.id}
        onCancel={handleDocSelectCancel}
        onConfirm={handleDocSelectConfirm}
      />
    );
  }

  if (csStep === 'cs-analyzing-2') {
    return (
      <CSAnalyzingPage
        document={currentDoc}
        onComplete={handleAnalysis2Complete}
      />
    );
  }

  if (csStep === 'reconciling') {
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
          onBack={handleResetToCS}
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
          onNext={() => { archiveReport(); handleResetToCS(); }}
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
          onReset={handleResetToCS}
        />
      );
    }
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
