export interface ClaimCheckInput {
  claim: string;
  sourceText: string;
}

export function claimCheck(_input: ClaimCheckInput): { passes: boolean; reason?: string } {
  return { passes: true };
}
