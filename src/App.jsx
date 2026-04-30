import { useState, useEffect, useRef } from 'react';
import { useReconciliation } from './hooks/useReconciliation';
import { useProjects } from './hooks/useProjects';
import { ToastProvider } from './components/Toast';
import StepIndicator from './components/StepIndicator';
import ToolboxPage from './pages/ToolboxPage';
import HomePage from './pages/HomePage';
import ConfirmPage from './pages/ConfirmPage';
import ResultsPage from './pages/ResultsPage';
import ReconciliationPage from './pages/ReconciliationPage';
import CompletePage from './pages/CompletePage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import HistoryListPage from './pages/HistoryListPage';
import { getScenario } from './utils/scenarios';
import './styles/theme.css';
import './styles/components.css';
import './styles/toolbox.css';

function MatchingAnimation({ hasSideC }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 600);
    const t2 = setTimeout(() => setStage(2), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const stages = [
    { label: '精确匹配', desc: '日期+金额完全一致', icon: '🎯' },
    { label: '模糊匹配', desc: '金额一致+日期相近', icon: '🔍' },
    { label: hasSideC ? '多维匹配' : '语义匹配', desc: hasSideC ? '三方数据交叉验证' : '描述相似+金额匹配', icon: '🧠' },
  ];

  return (
    <div className="loading-page" style={{ paddingTop: 40 }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>AI 智能匹配中</div>
      <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-sm)', marginBottom: 32 }}>
        正在帮你省下数小时的手工对账时间...
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 360 }}>
        {stages.map((s, i) => {
          const isDone = i < stage;
          const isActive = i === stage;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 12, background: isDone ? 'var(--accent-light)' : isActive ? 'var(--bg-card)' : 'var(--bg-input)', border: isActive ? '1.5px solid var(--accent)' : '1px solid var(--border)', transition: 'all 0.3s' }}>
              <span style={{ fontSize: 22 }}>{isDone ? '✓' : s.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: isDone ? 'var(--accent)' : isActive ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                  第{i + 1}轮：{s.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.desc}</div>
              </div>
              {isActive && <div className="cs-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />}
              {isDone && <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>完成</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AppSidebar({ navPage, setNavPage, onNewRecon, onBackToToolbox }) {

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-logo">
        <div className="app-sidebar-logo-title">CS 智能对账</div>
        <div className="app-sidebar-logo-desc">AI 驱动的财务对账助手</div>
      </div>

      <button className="app-sidebar-cta" onClick={onNewRecon}>
        <span>✨</span> 新建对账
      </button>

      <nav className="app-sidebar-nav">
        <div
          className={`app-sidebar-item ${navPage === 'workspace' ? 'active' : ''}`}
          onClick={() => setNavPage('workspace')}
        >
          <span className="app-sidebar-item-icon">🏠</span>
          <span className="app-sidebar-item-label">对账工作台</span>
        </div>
        <div
          className={`app-sidebar-item ${navPage === 'reports' ? 'active' : ''}`}
          onClick={() => setNavPage('reports')}
        >
          <span className="app-sidebar-item-icon">📊</span>
          <span className="app-sidebar-item-label">报告中心</span>
        </div>
        <div
          className={`app-sidebar-item ${navPage === 'docs' ? 'active' : ''}`}
          onClick={() => setNavPage('docs')}
        >
          <span className="app-sidebar-item-icon">📁</span>
          <span className="app-sidebar-item-label">文档管理</span>
        </div>

        <div
          className={`app-sidebar-item ${navPage === 'scenarios' ? 'active' : ''}`}
          onClick={() => setNavPage('scenarios')}
        >
          <span className="app-sidebar-item-icon">🎯</span>
          <span className="app-sidebar-item-label">对账场景</span>
        </div>

        <div className="app-sidebar-section">工具</div>
        <div
          className={`app-sidebar-item ${navPage === 'help' ? 'active' : ''}`}
          onClick={() => setNavPage('help')}
        >
          <span className="app-sidebar-item-icon">❓</span>
          <span className="app-sidebar-item-label">使用帮助</span>
        </div>
      </nav>

      <div className="app-sidebar-bottom">
        {onBackToToolbox && (
          <div className="app-sidebar-back" onClick={onBackToToolbox}>
            ← 返回工具箱
          </div>
        )}
      </div>
    </aside>
  );
}

function AppInner() {
  const {
    state,
    homeAddFiles, homeRemoveFile, homeSelectScenario, loadDemo, loadHistory,
    assignRole, setPeriod,
    confirmData, startMatching, confirmMatch, rejectMatch, doManualMatch, generateReport,
    setBalances, submitForApproval, approveReport, rejectReport,
    goToStep, archiveReport, reset, updateEntries, updateMapping,
  } = useReconciliation();

  const projectsHook = useProjects();
  const [viewingProject, setViewingProject] = useState(null);
  const [navPage, setNavPage] = useState('workspace');

  const params = new URLSearchParams(window.location.search);
  const autoloadId = params.get('autoload');
  const isEmbed = params.get('embed') === '1';
  const [showToolbox, setShowToolbox] = useState(!autoloadId);
  const autoloaded = useRef(false);

  useEffect(() => {
    if (autoloadId && !autoloaded.current) {
      autoloaded.current = true;
      import('./utils/demoData.js').then(({ buildDemoFiles }) => {
        const files = buildDemoFiles(autoloadId);
        if (files.length > 0) {
          homeAddFiles([files[0]]);
        }
      });
    }
  }, [autoloadId, homeAddFiles]);

  const { step } = state;
  const scenario = state.scenarioId ? getScenario(state.scenarioId) : null;

  useEffect(() => {
    if (!isEmbed) return;
    window.parent.postMessage({ type: 'recon-step', step }, '*');
  }, [isEmbed, step]);

  if (showToolbox && !isEmbed) {
    return <ToolboxPage onEnterRecon={() => setShowToolbox(false)} />;
  }

  const handleNewRecon = () => {
    reset();
    goToStep('home');
    setViewingProject(null);
    setNavPage('workspace');
  };


  const renderPage = () => {
    if (viewingProject) {
      return (
        <ProjectDetailPage
          project={viewingProject}
          getProjectFiles={projectsHook.getProjectFiles}
          getProjectResult={projectsHook.getProjectResult}
          onBack={() => setViewingProject(null)}
          onViewReport={(result) => {
            if (result) {
              goToStep('reconciliation');
              setViewingProject(null);
            }
          }}
        />
      );
    }

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
          onBackToToolbox={isEmbed ? undefined : () => { reset(); setShowToolbox(true); }}
          projectsHook={projectsHook}
          onOpenProject={(project) => setViewingProject(project)}
          navPage={navPage}
          setNavPage={setNavPage}
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
          parsedFiles={state.parsedFiles}
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
          <StepIndicator currentStep="matching" />
          <MatchingAnimation hasSideC={!!scenario?.sideC} />
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
          onNext={async () => {
            archiveReport();
            if (isEmbed) {
              window.parent.postMessage({
                type: 'recon-save-result',
                reconciliation: state.reconciliation,
                matchResults: state.matchResults,
                scenario: scenario,
                periodStart: state.periodStart,
                periodEnd: state.periodEnd,
              }, '*');
            } else {
              const filesMeta = (state.parsedFiles || []).map(pf => ({
                name: pf.file?.name || 'unknown',
                size: pf.file?.size || 0,
                type: pf.file?.type || '',
                role: pf.assignedRole,
                entryCount: pf.parsed?.entries?.length || 0,
              }));
              const fileBlobs = (state.parsedFiles || []).map(pf => pf.file).filter(Boolean);
              const projectName = `${scenario?.name || '对账'} - ${new Date().toLocaleDateString('zh-CN')}`;
              const project = await projectsHook.createProject({
                name: projectName,
                scenarioId: state.scenarioId,
                files: filesMeta,
                fileBlobs,
              });
              await projectsHook.saveResult(project.id, {
                reconciliation: state.reconciliation,
                matchResults: state.matchResults,
                scenario,
              });
              reset();
              goToStep('home');
            }
          }}
        />
      );
    }

    if (step === 'historyList') {
      return (
        <HistoryListPage
          onLoadHistory={loadHistory}
          onNewRecon={reset}
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

  if (isEmbed) {
    return (
      <div className="embed-layout">
        <main className="embed-content">
          {renderPage()}
        </main>
      </div>
    );
  }

  // Show sidebar only when on the home/scenario step and not viewing project detail in flow
  const showSidebar = (step === 'home' || step === 'scenario') && !showToolbox;
  const showStepIndicator = !showSidebar && ['confirm', 'results', 'reconciliation'].includes(step);

  return (
    <div className={`fullpage-layout ${showSidebar ? 'app-layout' : ''}`}>
      {showSidebar && (
        <AppSidebar
          navPage={navPage}
          setNavPage={setNavPage}
          onNewRecon={handleNewRecon}
          onBackToToolbox={() => { reset(); setShowToolbox(true); }}
        />
      )}
      <div className={showSidebar ? 'app-main-content' : ''}>
        {showStepIndicator && <StepIndicator currentStep={step} />}
        {renderPage()}
      </div>
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
