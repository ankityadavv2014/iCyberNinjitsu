'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Workspace = { id: string; name: string; paused?: boolean };

const WorkspaceContext = createContext<{
  workspaceId: string;
  setWorkspaceId: (id: string) => void;
  workspaces: Workspace[];
}>({ workspaceId: '', setWorkspaceId: () => {}, workspaces: [] });

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceIdState] = useState('');

  useEffect(() => {
    let cancelled = false;
    api<{ items: Workspace[] }>('/workspaces')
      .then((d) => {
        if (!cancelled) setWorkspaces(Array.isArray(d?.items) ? d.items : []);
      })
      .catch(() => {
        if (!cancelled) setWorkspaces([]);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!workspaces.length) return;
    const stored = typeof window !== 'undefined' ? localStorage.getItem('astra_workspace_id') ?? '' : '';
    setWorkspaceIdState((prev) => {
      if (stored && workspaces.some((w) => w.id === stored)) return stored;
      if (prev && workspaces.some((w) => w.id === prev)) return prev;
      return workspaces[0].id;
    });
  }, [workspaces]);

  const setWorkspaceId = useCallback((id: string) => {
    setWorkspaceIdState(id);
    if (typeof window !== 'undefined') localStorage.setItem('astra_workspace_id', id);
  }, []);

  return (
    <WorkspaceContext.Provider value={{ workspaceId, setWorkspaceId, workspaces }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
