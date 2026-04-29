import { useState, useEffect, useRef } from 'react';
import { useReconciliation } from './hooks/useReconciliation';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import ToolboxPage from './pages/ToolboxPage';
import HomePage from './pages/HomePage';
import ConfirmPage from './pages/ConfirmPage';
import ResultsPage from './pages/ResultsPage';
import ReconciliationPage from './pages/ReconciliationPage';
import CompletePage from './pages/CompletePage';
import { getScenario } from './utils/scenarios';
import './styles/theme.css';
import './styles/components.css';
import './styles/toolbox.css';

function AppInner() {
  const {
    state,
    homeAddFiles, homeRemoveFile, homeSelectScenario, loadDemo, loadHistory,
    assignRole, setPeriod,
    confirmData, startMatching, confirmMatch, rejectMatch, doManualMatch, generateReport,
    setBalances, submitForApproval, approveReport, rejectReport,
    goToStep, archiveReport, reset, updateEntries, updateMapping,
  } = useReconciliation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const autoloadId = params.get('autoload');
  const [showToolbox, setShowToolbox] = useState(!autoloadId);
  const autoloaded = useRef(false);

  useEffect(() => {
    if (autoloadId && !autoloaded.current) {
      autoloaded.current = true;
      loadDemo(autoloadId);
    }
  }, [autoloadId, loadDemo]);

  const { step } = state;
  const scenario = state.scenarioId ? getScenario(state.scenarioId) : null;

  if (showToolbox) {
    return <ToolboxPage onEnterRecon={() => setShowToolbox(false)} />;
  }

  const renderPage = () => {
    if (step === 'home' || step === 'scenario') {
      return (
        <HomePage
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
          onLoadHistory={loadHistory}
          onUpdateMapping={updateMapping}
        />
      );
    }

    if (step === 'confirm') {
      return (
        <ConfirmPage
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
      return (
        <div className="pc-page">
          <div className="loading-page">
            <div className="progress-ring-wrap">
              <svg viewBox="0 0 120 120">
                <circle className="progress-ring-bg" cx="60" cy="60" r="52" />
                <circle className="progress-ring-fill" cx="60" cy="60" r="52"
                  style={{ strokeDasharray: 327, strokeDashoffset: 80, animation: 'spin 1.5s linear infinite' }} />
              </svg>
              <div className="progress-ring-text">
                <div className="progress-pct" style={{ fontSize: 18 }}>比对中</div>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: 20, fontSize: 'var(--font-sm)' }}>
              {scenario?.sideC ? '正在执行多维智能匹配...' : '正在执行三轮智能匹配...'}
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      );
    }

    if (step === 'results') {
      return (
        <ResultsPage
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
        <ReconciliationPage
          scenario={scenario}
          reconciliation={state.reconciliation}
          matchResults={state.matchResults}
          periodStart={state.periodStart}
          periodEnd={state.periodEnd}
          sessionId={state.sessionId}
          approvalStatus={state.approvalStatus}
          approvalComment={state.approvalComment}
          onSubmitApproval={submitForApproval}
          onApprove={approveReport}
          onReject={rejectReport}
          onBack={() => goToStep('results')}
          onNext={() => { archiveReport(); reset(); }}
        />
      );
    }

    if (step === 'complete') {
      return (
        <CompletePage
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
  };

  return (
    <div className={`layout ${sidebarCollapsed ? 'layout-collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
        onGoHome={reset}
        onLoadHistory={loadHistory}
        onBackToToolbox={() => { reset(); setShowToolbox(true); }}
      />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
