export interface CancelInstruction {
  type: 'cancel';
  activityId: string;
  cancelCurrentActiveActivityInstances?: boolean;
}

export interface StartBeforeInstruction {
  type: 'startBeforeActivity';
  activityId: string;
  variables?: Record<string, TriggerVariableValue>;
}

export interface StartAfterInstruction {
  type: 'startAfterActivity';
  activityId: string;
  variables?: Record<string, TriggerVariableValue>;
}

export interface StartTransitionInstruction {
  type: 'startTransition';
  transitionId: string;
  variables?: Record<string, TriggerVariableValue>;
}

export type ModificationInstruction =
  | CancelInstruction
  | StartBeforeInstruction
  | StartAfterInstruction
  | StartTransitionInstruction;

export interface TriggerVariableValue {
  value: unknown;
  type?: string;
  valueInfo?: Record<string, unknown>;
}

export interface ModificationDto {
  processDefinitionId: string;
  instructions: ModificationInstruction[];
  processInstanceIds?: string[];
  processInstanceQuery?: Record<string, unknown>;
  historicProcessInstanceQuery?: Record<string, unknown>;
  skipCustomListeners?: boolean;
  skipIoMappings?: boolean;
  annotation?: string;
}
