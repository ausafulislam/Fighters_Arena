import type { FighterAnimationName } from '@/constants/fighterFrames';

export type AttackName = 'light_punch' | 'heavy_punch' | 'kick' | 'special';
export type FighterState = FighterAnimationName;
export type AttackPhase = 'startup' | 'active' | 'recovery';
export type MatchPhase = 'intro' | 'fighting' | 'roundEnd' | 'matchEnd' | 'paused';

export interface AttackRuntime {
  name: AttackName;
  elapsedMs: number;
  phase: AttackPhase;
  /** One hit per attack, even if the active frames keep overlapping. */
  hasHit: boolean;
}

export interface FighterSnapshot {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  energy: number;
  state: FighterState;
  attack: AttackName | null;
  facing: 1 | -1;
  grounded: boolean;
  blocking: boolean;
  combo: number;
  frameIndex: number;
}

export interface MatchSnapshot {
  sceneKey: string;
  phase: MatchPhase;
  phaseBeforePause: MatchPhase | null;
  paused: boolean;
  orientationPaused: boolean;
  round: number;
  playerRounds: number;
  opponentRounds: number;
  timeLeft: number;
  player: FighterSnapshot;
  opponent: FighterSnapshot;
  winner: 'player' | 'opponent' | 'draw' | null;
  matchWinner: 'player' | 'opponent' | 'draw' | null;
  playerId: string;
  opponentId: string;
  arenaId: string;
  modeId: string | null;
  hitCount: number;
  blockedCount: number;
  specialCount: number;
  jumpCount: number;
  aiState: string;
  pauseCount: number;
  resumeCount: number;
  restartCount: number;
  quitCount: number;
  rematchCount: number;
  mobileControlsVisible: boolean;
  leftHanded: boolean;
  touchControlSize: string;
}

export interface MatchSetupSnapshot {
  playerId: string;
  opponentId: string;
  arenaId: string;
  modeId: string | null;
}
