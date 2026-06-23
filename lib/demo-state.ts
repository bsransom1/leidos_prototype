const KEYS = {
  BAA: 'DEMO_BAA_DATA',
  ORG: 'DEMO_ORG_CONTEXT',
  PROPOSAL: 'DEMO_PROPOSAL',
} as const;

export function saveDemoBaa(data: object): void {
  sessionStorage.setItem(KEYS.BAA, JSON.stringify(data));
}

export function getDemoBaa(): object | null {
  try {
    const raw = sessionStorage.getItem(KEYS.BAA);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDemoOrgContext(data: object): void {
  sessionStorage.setItem(KEYS.ORG, JSON.stringify(data));
}

export function getDemoOrgContext(): object | null {
  try {
    const raw = sessionStorage.getItem(KEYS.ORG);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDemoProposal(data: object): void {
  sessionStorage.setItem(KEYS.PROPOSAL, JSON.stringify(data));
}

export function getDemoProposal(): object | null {
  try {
    const raw = sessionStorage.getItem(KEYS.PROPOSAL);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDemoState(): void {
  sessionStorage.removeItem(KEYS.BAA);
  sessionStorage.removeItem(KEYS.ORG);
  sessionStorage.removeItem(KEYS.PROPOSAL);
}
