import { useState, useCallback, useEffect } from 'react';

const META_KEY = 'cs_recon_projects_meta';
const DB_NAME = 'cs_recon_db';
const DB_VERSION = 1;
const STORE_FILES = 'files';
const STORE_RESULTS = 'results';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES);
      }
      if (!db.objectStoreNames.contains(STORE_RESULTS)) {
        db.createObjectStore(STORE_RESULTS);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(storeName, key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGet(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveMeta(projects) {
  localStorage.setItem(META_KEY, JSON.stringify(projects));
}

export function useProjects() {
  const [projects, setProjects] = useState(loadMeta);

  useEffect(() => {
    saveMeta(projects);
  }, [projects]);

  const createProject = useCallback(async (data) => {
    const id = generateId();
    const project = {
      id,
      name: data.name || '未命名项目',
      scenarioId: data.scenarioId || null,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: (data.files || []).map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        role: f.role,
        entryCount: f.entryCount || 0,
      })),
      resultSummary: null,
      logs: [{ time: new Date().toISOString(), action: '创建项目' }],
    };

    if (data.fileBlobs && data.fileBlobs.length > 0) {
      try {
        await dbPut(STORE_FILES, id, data.fileBlobs);
      } catch (e) { console.warn('Failed to store file blobs:', e); }
    }

    setProjects(prev => [project, ...prev]);
    return project;
  }, []);

  const saveResult = useCallback(async (projectId, { reconciliation, matchResults, scenario }) => {
    try {
      await dbPut(STORE_RESULTS, projectId, { reconciliation, matchResults, scenario });
    } catch (e) { console.warn('Failed to store results:', e); }

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const isBalanced = reconciliation?.isBalanced;
      const matchRate = reconciliation?.matchRate;
      return {
        ...p,
        status: 'completed',
        updatedAt: new Date().toISOString(),
        resultSummary: {
          isBalanced,
          matchRate,
          completedAt: new Date().toISOString(),
        },
        logs: [...(p.logs || []), { time: new Date().toISOString(), action: '对账完成' }],
      };
    }));
  }, []);

  const getProjectFiles = useCallback(async (projectId) => {
    try {
      return await dbGet(STORE_FILES, projectId);
    } catch { return null; }
  }, []);

  const getProjectResult = useCallback(async (projectId) => {
    try {
      return await dbGet(STORE_RESULTS, projectId);
    } catch { return null; }
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

  const deleteProject = useCallback(async (id) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    try {
      await dbDelete(STORE_FILES, id);
      await dbDelete(STORE_RESULTS, id);
    } catch (e) { console.warn('Failed to delete project data:', e); }
  }, []);

  const recentProjects = projects.filter(p => p.status !== 'archived').slice(0, 20);
  const archivedProjects = projects.filter(p => p.status === 'archived');

  return {
    projects,
    recentProjects,
    archivedProjects,
    createProject,
    saveResult,
    getProjectFiles,
    getProjectResult,
    updateProject,
    archiveProject,
    deleteProject,
  };
}
