import { api } from './client';

export type Zone = 'double-down' | 'small-tests' | 'protect-or-partner' | 'cut-pause-sell';

export interface ScoredProject {
  projectKey: string;
  displayName: string;
  archetype: string;
  status: string;
  traction: number;
  leverage: number;
  zone: Zone;
  why: string;
}

export interface QuietlyBroken {
  projectKey: string;
  displayName: string;
  title: string;
  detail: string;
  kind: string;
}

export interface Briefing {
  date: string;
  runAt: string;
  trigger: string;
  products: ScoredProject[];
  quietlyBroken: QuietlyBroken[];
  zoneCounts: { doubleDown: number; smallTests: number; protectPartner: number; cutPauseSell: number };
  headline: string;
  narrative: string;
  beaconsReachable: number;
  beaconsTotal: number;
  tokensUsed: number;
  cost: number;
  model: string;
}

export async function getPortfolioBriefing(): Promise<Briefing | null> {
  const { data } = await api.get('/portfolio/latest');
  return data?.briefing ?? null;
}

export async function runPortfolioBriefing(): Promise<Briefing | null> {
  const { data } = await api.post('/portfolio/run', { email: false });
  return data?.briefing ?? null;
}
