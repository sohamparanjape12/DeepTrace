import { Asset, Violation } from '@/types';

/**
 * A violation is terminal if it's dropped by the gate, fully classified, 
 * or hit a permanent failure.
 */
export function isTerminalViolation(v: Violation): boolean {
  const terminalStages = ['gate_dropped', 'classified', 'failed_permanent'];
  return !!v.stage && terminalStages.includes(v.stage);
}

/**
 * An asset is terminal if it reached the 'complete' or 'failed' stage.
 */
export function isTerminalAsset(a: Asset): boolean {
  const terminalStages = ['complete', 'failed'];
  return !!a.stage && terminalStages.includes(a.stage);
}
