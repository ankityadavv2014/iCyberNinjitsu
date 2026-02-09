export interface RegistryPrompt {
  id: string;
  postType: string;
  inputs: string[];
  outputs: string;
  constraints: { maxLength?: number; maxLengthPerPart?: number; requireSourceIfCitation?: boolean; claimCheck?: boolean };
}

export interface PromptRegistryConfig {
  version: string;
  prompts: RegistryPrompt[];
}

export function loadRegistryFromJson(json: PromptRegistryConfig): Map<string, RegistryPrompt> {
  const map = new Map<string, RegistryPrompt>();
  for (const p of json.prompts) {
    map.set(p.id, p);
    map.set(p.postType, p);
  }
  return map;
}

export function substituteVariables(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), v ?? '');
  }
  return out;
}
