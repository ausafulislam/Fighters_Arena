import type { FighterAnimationName } from '@/constants/fighterFrames';

export type AttackName = 'light_punch' | 'heavy_punch' | 'kick' | 'special';

/**
 * Canonical character state machine. Exactly one of these is active at a time,
 * so a walking animation can never play during an attack, and an animation is
 * never restarted on every update frame.
 */
export type FighterState =
  | 'IDLE'
  | 'WALKING'
  | 'RUNNING'
  | 'JUMPING'
  | 'FALLING'
  | 'LANDING'
  | 'CROUCHING'
  | 'BLOCKING'
  | 'ATTACKING'
  | 'HIT'
  | 'KNOCKBACK'
  | 'KNOCKDOWN'
  | 'RECOVERING'
  | 'VICTORY'
  | 'DEFEAT';

export const FIGHTER_STATES: readonly FighterState[] = [
  'IDLE',
  'WALKING',
  'RUNNING',
  'JUMPING',
  'FALLING',
  'LANDING',
  'CROUCHING',
  'BLOCKING',
  'ATTACKING',
  'HIT',
  'KNOCKBACK',
  'KNOCKDOWN',
  'RECOVERING',
  'VICTORY',
  'DEFEAT',
] as const;

export type AttackPhase = 'startup' | 'active' | 'recovery';
export type MatchPhase = 'intro' | 'fighting' | 'roundEnd' | 'matchEnd' | 'paused';

export interface AttackRuntime {
  name: AttackName;
  elapsedMs: number;
  phase: AttackPhase;
  /** One hit per attack, even if the active frames keep overlapping. */
  hasHit: boolean;
  /** Set when the attack finished without connecting (used for feedback). */
  whiffed: boolean;
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
  /** The actual Phaser animation currently playing on the sprite. */
  animation: FighterAnimationName;
  /** Sheet frame index of the currently displayed Phaser animation frame. */
  frameIndex: number;
  /** Position of the playhead within the current animation (0-based). */
  animationFrame: number;
  stateElapsedMs: number;
  attack: AttackName | null;
  attackPhase: AttackPhase | null;
  facing: 1 | -1;
  grounded: boolean;
  blockedDown: boolean;
  blocking: boolean;
  crouching: boolean;
  combo: number;
  bodyX: number;
  bodyY: number;
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
  /** Physics + effect diagnostics used by the automated verification. */
  physics: {
    gravityY: number;
    paused: boolean;
    worldBottom: number;
    particles: number;
    effects: number;
  };
}

export interface MatchSetupSnapshot {
  playerId: string;
  opponentId: string;
  arenaId: string;
  modeId: string | null;
}
