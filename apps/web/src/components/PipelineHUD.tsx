'use client';

/**
 * Pipeline HUD — a global 5-node stepper bar showing pipeline run state.
 *
 * Nodes: Fetch → Parse → Rank → Generate → Queue
 * States: idle | active | done | error
 *
 * Shows a status line for the active step and connects nodes with
 * animated connectors. Sits at the top of the Control Center (dashboard).
 */

type NodeState = 'idle' | 'active' | 'done' | 'error';

export type PipelineHUDStep = {
  label: string;
  state: NodeState;
  statusLine?: string;   // e.g. "Fetching 14 sources…"
};

const DEFAULT_STEPS: PipelineHUDStep[] = [
  { label: 'Fetch', state: 'idle' },
  { label: 'Parse', state: 'idle' },
  { label: 'Rank', state: 'idle' },
  { label: 'Generate', state: 'idle' },
  { label: 'Queue', state: 'idle' },
];

function NodeIcon({ state }: { state: NodeState }) {
  if (state === 'done') {
    return (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (state === 'error') {
    return (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }
  if (state === 'active') {
    return <span className="w-2 h-2 rounded-full bg-current animate-pulse" />;
  }
  return <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />;
}

export function PipelineHUD({
  steps = DEFAULT_STEPS,
  onViewLogs,
}: {
  steps?: PipelineHUDStep[];
  onViewLogs?: () => void;
}) {
  const activeStep = steps.find((s) => s.state === 'active');
  const errorStep = steps.find((s) => s.state === 'error');
  const anyRunning = steps.some((s) => s.state === 'active');

  return (
    <div className="w-full px-4 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200/60 dark:border-gray-700/60">
      {/* Stepper nodes */}
      <div className="flex items-center justify-center gap-1 max-w-2xl mx-auto">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center">
            {/* Node */}
            <div
              className={`icn-hud-node flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                step.state === 'active'
                  ? 'icn-hud-active bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400'
                  : step.state === 'done'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400'
                    : step.state === 'error'
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
              }`}
            >
              <NodeIcon state={step.state} />
              <span>{step.label}</span>
            </div>
            {/* Connector */}
            {i < steps.length - 1 && (
              <div
                className={`icn-hud-connector w-6 h-px mx-1 ${
                  steps[i + 1].state !== 'idle' || step.state === 'active'
                    ? 'bg-blue-300 dark:bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Status line */}
      {(activeStep?.statusLine || errorStep) && (
        <div className="flex items-center justify-center gap-2 mt-2 text-xs">
          {activeStep?.statusLine && (
            <span className="text-blue-600 dark:text-blue-400">{activeStep.statusLine}</span>
          )}
          {errorStep && (
            <button
              type="button"
              onClick={onViewLogs}
              className="text-red-500 hover:text-red-400 font-medium"
            >
              Error — View logs
            </button>
          )}
          {anyRunning && (
            <span className="text-gray-400 dark:text-gray-500">|</span>
          )}
          {anyRunning && (
            <span className="inline-flex items-center gap-1 text-gray-400 dark:text-gray-500">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
        </div>
      )}
    </div>
  );
}
