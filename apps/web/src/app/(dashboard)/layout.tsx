'use client';

import { AuthGate } from '@/components/AuthGate';
import { DashboardShell } from '@/components/DashboardShell';
import { WorkspaceProvider, useWorkspace } from '@/contexts/WorkspaceContext';
import { InspectorProvider } from '@/contexts/InspectorContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/components/Toast';

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { workspaceId, setWorkspaceId, workspaces } = useWorkspace();
  return (
    <ThemeProvider>
    <InspectorProvider>
    <DashboardShell
      workspaceId={workspaceId}
      workspaces={workspaces.map((w) => ({ id: w.id, name: w.paused ? `${w.name} (paused)` : w.name }))}
      onWorkspaceChange={setWorkspaceId}
    >
      {children}
    </DashboardShell>
    </InspectorProvider>
    </ThemeProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <WorkspaceProvider>
        <ToastProvider>
          <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </ToastProvider>
      </WorkspaceProvider>
    </AuthGate>
  );
}
