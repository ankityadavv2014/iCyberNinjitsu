export type TriggerType = 'cron' | 'manual';

export interface PipelineTrigger {
  type: TriggerType;
  schedule?: string;
}

export type StepType = 'ingest' | 'rank' | 'generate' | 'gate' | 'schedule';

export interface PipelineStep {
  id: string;
  type: StepType;
  config?: Record<string, unknown>;
}

export interface PipelineDefinition {
  id: string;
  name: string;
  triggers: PipelineTrigger[];
  steps: PipelineStep[];
  approvalRequired: boolean;
}
