import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'cs_recon_projects';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function useProjects() {
  const [projects, setProjects] = useState(loadProjects);

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  const createProject = useCallback((data) => {
    const project = {
      id: generateId(),
      name: data.name || '未命名项目',
      scenarioId: data.scenarioId || null,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: data.files || [],
      results: null,
      logs: [{ time: new Date().toISOString(), action: '创建项目' }],
    };
    setProjects(prev => [project, ...prev]);
    return project;
  }, []);

  const updateProject = useCallback((id, updates) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, ...updates, updatedAt: new Date().toISOString() };
      if (updates.logEntry) {
        updated.logs = [...(p.logs || []), { time: new Date().toISOString(), action: updates.logEntry }];
        delete updated.logEntry;
      }
      return updated;
    }));
  }, []);

  const archiveProject = useCallback((id) => {
    updateProject(id, { status: 'archived', logEntry: '归档项目' });
  }, [updateProject]);

  const deleteProject = useCallback((id) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  const saveReconciliationResult = useCallback((projectId, reconciliation, matchResults, scenario) => {
    updateProject(projectId, {
      status: 'completed',
      results: { reconciliation, matchResults, scenario, completedAt: new Date().toISOString() },
      logEntry: '对账完成',
    });
  }, [updateProject]);

  const recentProjects = projects.filter(p => p.status !== 'archived').slice(0, 10);
  const archivedProjects = projects.filter(p => p.status === 'archived');

  return {
    projects,
    recentProjects,
    archivedProjects,
    createProject,
    updateProject,
    archiveProject,
    deleteProject,
    saveReconciliationResult,
  };
}
