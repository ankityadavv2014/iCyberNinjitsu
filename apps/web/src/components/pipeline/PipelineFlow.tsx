'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

type PipelineNode = {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
  count?: number;
  status?: 'active' | 'pending' | 'idle';
  description?: string;
};

type PipelineFlowProps = {
  nodes: PipelineNode[];
  activeNodeId?: string;
  onNodeClick?: (nodeId: string) => void;
};

function ArrowConnector({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`} aria-hidden>
      <svg className="w-8 h-8 text-gray-300 dark:text-gray-600 animate-[astra-pulse-arrow_2s_ease-in-out_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    </div>
  );
}

function PipelineNodeCard({ node, isActive, onClick }: { node: PipelineNode; isActive: boolean; onClick?: (nodeId: string) => void }) {
  const handleClick = () => {
    if (onClick) onClick(node.id);
  };
  const statusColors = {
    active: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
    pending: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
    idle: 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400',
  };
  const status = node.status || 'idle';
  const baseClasses = 'group relative rounded-2xl border-2 p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg';
  const activeClasses = isActive ? 'ring-2 ring-primary/50 shadow-lg scale-105 animate-[astra-flow-glow_3s_ease-in-out_infinite]' : '';
  const statusClasses = statusColors[status];

  const content = (
    <div className={`${baseClasses} ${statusClasses} ${activeClasses} ${onClick ? 'cursor-pointer' : ''}`} onClick={handleClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/50 dark:bg-gray-800/50 text-2xl shrink-0">
            {node.icon}
          </div>
          <div>
            <h3 className="font-semibold text-base mb-0.5">{node.label}</h3>
            {node.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{node.description}</p>
            )}
          </div>
        </div>
        {node.count != null && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 dark:bg-gray-700 text-xs font-semibold shrink-0">
            {node.count}
          </span>
        )}
      </div>
      {status === 'active' && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse" aria-hidden />
      )}
    </div>
  );

  if (node.href && !onClick) {
    return (
      <Link href={node.href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

export function PipelineFlow({ nodes, activeNodeId, onNodeClick }: PipelineFlowProps) {
  return (
    <div className="w-full overflow-x-auto py-8">
      <div className="flex items-center justify-center min-w-max px-4 gap-2 sm:gap-4">
        {nodes.map((node, index) => (
          <div key={node.id} className="flex items-center">
            <PipelineNodeCard node={node} isActive={activeNodeId === node.id} onClick={onNodeClick} />
            {index < nodes.length - 1 && (
              <ArrowConnector className="mx-2 sm:mx-4" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
