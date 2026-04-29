import { useState, useCallback, useEffect } from 'react';
import { useReconciliation } from '../hooks/useReconciliation';
import { ToastProvider } from '../components/Toast';
import { getScenario } from '../utils/scenarios';
import { isFinancialDoc, classifyFromText } from './pages/CSAnalyzingPage';
import { BUILTIN_FINANCIAL_DOCS, builtinDocToFile } from './data/embeddedFiles';
import CSHomePage from './pages/CSHomePage';
import CSDocViewPage from './pages/CSDocViewPage';
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
  const [showReconBtn, setShowReconBtn] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // CS Home: user clicks a doc → go to doc view (no files, screenshot mode)
  const handleOpenDocument = useCallback((doc) => {
    setCsStep('cs-docview');
    setShowReconBtn(false);
    setUploadedFiles([]);
  }, []);

  // CS Home: user clicks camera → upload files → go directly to docview
  const handleUploadFiles = useCallback((files) => {
    setUploadedFiles(files);
    setCsStep('cs-docview-with-files');
  }, []);

  // Background analysis when files are loaded
  useEffect(() => {
    if (csStep !== 'cs-docview-with-files' || uploadedFiles.length === 0) return;

    async function analyze() {
      const results = [];
      for (const file of uploadedFiles) {
        let textContent = '';
        let docType = null;
        if (file.name) {
          const nameClassification = classifyFromText(file.name);
          if (nameClassification) docType = nameClassification;
        }
        if (file.type && file.type.includes('text')) {
          try { textContent = await file.text(); } catch (e) { /* ignore */ }
        }
        if (!docType && textContent) {
          docType = classifyFromText(textContent);
        }
        const isFinancial = docType !== null || isFinancialDoc(file.name + ' ' + textContent);
        results.push({ file, textContent: textContent.slice(0, 500), docType, isFinancial });
      }

      const hasFinancial = results.some(r => r.isFinancial);
      const financialResults = results.filter(r => r.isFinancial);
      const docTypes = financialResults.map(r => r.docType).filter(Boolean);

      setAnalysisResult({
        results,
        hasFinancial,
        docTypes,
        financialCount: financialResults.length,
      });
      setShowReconBtn(hasFinancial);
    }

    analyze();
  }, [csStep, uploadedFiles]);

  // User clicks 财务对账 in doc view toolbar
  const handleStartReconciliation = useCallback(() => {
    const docTypes = analysisResult?.docTypes || [];
    const typeSet = new Set(docTypes.map(d => d.type));
    const hasBothSides = (typeSet.has('bank_statement') && typeSet.has('company_ledger')) ||
                         (typeSet.has('invoice') && typeSet.has('contract'));

    if (hasBothSides || analysisResult?.results?.length >= 2) {
      loadDemo('bank_recon');
      setCsStep('reconciling');
    } else {
      setCsStep('cs-doc-select');
    }
  }, [analysisResult, loadDemo]);

  // Doc select: user adds more files
  const handleAddMoreFiles = useCallback((files) => {
    setUploadedFiles(prev => [...prev, ...files]);
  }, []);

  // Doc select: confirm → feed files into reconciliation pipeline
  const handleDocSelectConfirm = useCallback(async () => {
    if (uploadedFiles.length >= 2) {
      await homeAddFiles(uploadedFiles);
      const ok = confirmData();
      if (ok) {
        setCsStep('reconciling');
      } else {
        loadDemo('bank_recon');
        setCsStep('reconciling');
      }
    } else {
      loadDemo('bank_recon');
      setCsStep('reconciling');
    }
  }, [uploadedFiles, homeAddFiles, confirmData, loadDemo]);

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

  if (csStep === 'cs-docview' || csStep === 'cs-docview-with-files') {
    return (
      <CSDocViewPage
        files={uploadedFiles}
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
        onCancel={() => setCsStep('cs-docview-with-files')}
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
