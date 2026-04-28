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
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showReconBtn, setShowReconBtn] = useState(false);

  // CS Home: user clicks a doc → go to doc view
  const handleOpenDocument = useCallback((doc) => {
    setCsStep('cs-docview');
    setShowReconBtn(false);
  }, []);

  // CS Home: user clicks camera → upload files → analyze
  const handleUploadFiles = useCallback((files) => {
    setUploadedFiles(files);
    setCsStep('cs-analyzing');
  }, []);

  // Analysis done: check if financial
  const handleAnalysisComplete = useCallback((result) => {
    setAnalysisResult(result);
    if (result.hasFinancial) {
      // Financial doc detected → show doc view with 财务对账 button
      setCsStep('cs-docview-with-recon');
      setShowReconBtn(true);
    } else {
      // Not financial → just show doc view normally
      setCsStep('cs-docview');
      setShowReconBtn(false);
    }
  }, []);

  // User clicks 财务对账 in doc view toolbar
  const handleStartReconciliation = useCallback(() => {
    const docTypes = analysisResult?.docTypes || [];
    const hasMultipleTypes = docTypes.length >= 2;
    const typeSet = new Set(docTypes.map(d => d.type));
    const hasBothSides = (typeSet.has('bank_statement') && typeSet.has('company_ledger')) ||
                         (typeSet.has('invoice') && typeSet.has('contract'));

    if (hasBothSides || analysisResult?.results?.length >= 2) {
      // Enough docs → load demo and go to confirm
      loadDemo('bank_recon');
      setCsStep('reconciling');
    } else {
      // Need more docs → show select page
      setCsStep('cs-doc-select');
    }
  }, [analysisResult, loadDemo]);

  // Doc select: user adds more files
  const handleAddMoreFiles = useCallback((files) => {
    setUploadedFiles(prev => [...prev, ...files]);
  }, []);

  // Doc select: confirm → re-analyze with all files then proceed
  const handleDocSelectConfirm = useCallback(() => {
    loadDemo('bank_recon');
    setCsStep('reconciling');
  }, [loadDemo]);

  const handleBackToHome = useCallback(() => {
    setCsStep('cs-home');
    setUploadedFiles([]);
    setAnalysisResult(null);
    setShowReconBtn(false);
  }, []);

  const handleResetToCS = useCallback(() => {
    reset();
    setCsStep('cs-home');
    setUploadedFiles([]);
    setAnalysisResult(null);
    setShowReconBtn(false);
  }, [reset]);

  const { step } = state;
  const scenario = state.scenarioId ? getScenario(state.scenarioId) : null;

  // CS flow pages
  if (csStep === 'cs-home') {
    return (
      <CSHomePage
        onOpenDocument={handleOpenDocument}
        onUploadFiles={handleUploadFiles}
      />
    );
  }

  if (csStep === 'cs-analyzing') {
    return (
      <CSAnalyzingPage
        files={uploadedFiles}
        onComplete={handleAnalysisComplete}
      />
    );
  }

  if (csStep === 'cs-docview' || csStep === 'cs-docview-with-recon') {
    return (
      <CSDocViewPage
        showReconBtn={showReconBtn}
        onBack={handleBackToHome}
        onReconciliation={handleStartReconciliation}
      />
    );
  }

  if (csStep === 'cs-doc-select') {
    return (
      <CSDocSelectPage
        uploadedFiles={uploadedFiles}
        onCancel={() => setCsStep('cs-docview-with-recon')}
        onAddMore={handleAddMoreFiles}
        onConfirm={handleDocSelectConfirm}
      />
    );
  }

  // Reconciliation flow
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
