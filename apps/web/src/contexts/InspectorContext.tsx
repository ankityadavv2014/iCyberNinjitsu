'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type InspectorContextValue = {
  content: ReactNode;
  setContent: (node: ReactNode) => void;
};

const InspectorContext = createContext<InspectorContextValue | null>(null);

export function InspectorProvider({ children }: { children: ReactNode }) {
  const [content, setContentState] = useState<ReactNode>(null);
  const setContent = useCallback((node: ReactNode) => setContentState(node), []);
  return (
    <InspectorContext.Provider value={{ content, setContent }}>
      {children}
    </InspectorContext.Provider>
  );
}

export function useInspector() {
  const ctx = useContext(InspectorContext);
  return ctx ?? { content: null, setContent: () => {} };
}
