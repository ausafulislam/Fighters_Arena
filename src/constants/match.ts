import type { AttackName, AttackRuntime } from '@/types/match';

/** Fixed logical-space tuning for the playable arcade match. */
export const MATCH_CONFIG = {
  ROUND_TIME: 99,
  MAX_HEALTH: 100,
  ROUNDS_TO_WIN: 2,
  MAX_ROUNDS: 3,
  GROUND_Y: 292,
  ARENA_LEFT: 32,
  ARENA_RIGHT: 608,
  PLAYER_START_X: 208,
  OPPONENT_START_X: 432,
  FIGHTER_WIDTH: 54,
  FIGHTER_HEIGHT: 118,
  MIN_DISTANCE: 42,
  GRAVITY: 1500,
  JUMP_VELOCITY: -455,
  WALK_SPEED: 98,
  BACK_SPEED: 76,
  RUN_SPEED: 158,
  SPECIAL_MAX: 100,
  SPECIAL_COST: 60,
  ENERGY_ON_HIT: 14,
  ENERGY_ON_TAKING_HIT: 8,
  BLOCK_REDUCTION: 0.22,
  HITSTUN_MS: 260,
  KNOCKDOWN_MS: 720,
  GETUP_MS: 420,
  ROUND_INTRO_MS: 1400,
  ROUND_END_MS: 1500,
  COMBO_WINDOW_MS: 900,
  AI_DECISION_MS: 260,
  MAX_DELTA_MS: 50,
} as const;

export interface AttackConfig {
  label: string;
  startupMs: number;
  activeMs: number;
  recoveryMs: number;
  damage: number;
  /** Horizontal reach measured from the fighter's centre. */
  reach: number;
  /** Hitbox width / height in logical pixels. */
  width: number;
  height: number;
  /** Vertical centre of the hitbox, above the ground. */
  centerY: number;
  knockback: number;
  hitstunMs: number;
  energyGain: number;
  cooldownMs: number;
  sfx: string;
}

/**
 * One definition per attack. Startup -> active -> recovery is real timing: a
 * hit is only registered during the active window and only when the attack
 * hitbox intersects the defender's body box. No overlap-only fake hits.
 */
export const ATTACKS: Readonly<Record<AttackName, AttackConfig>> = {
  light_punch: {
    label: 'LIGHT PUNCH',
    startupMs: 70,
    activeMs: 90,
    recoveryMs: 130,
    damage: 7,
    reach: 46,
    width: 38,
    height: 26,
    centerY: 74,
    knockback: 42,
    hitstunMs: 200,
    energyGain: 10,
    cooldownMs: 60,
    sfx: 'punch_light',
  },
  heavy_punch: {
    label: 'HEAVY PUNCH',
    startupMs: 150,
    activeMs: 110,
    recoveryMs: 240,
    damage: 14,
    reach: 54,
    width: 46,
    height: 34,
    centerY: 76,
    knockback: 96,
    hitstunMs: 340,
    energyGain: 15,
    cooldownMs: 110,
    sfx: 'punch_heavy',
  },
  kick: {
    label: 'KICK',
    startupMs: 120,
    activeMs: 100,
    recoveryMs: 210,
    damage: 11,
    reach: 60,
    width: 50,
    height: 30,
    centerY: 46,
    knockback: 78,
    hitstunMs: 300,
    energyGain: 12,
    cooldownMs: 90,
    sfx: 'kick',
  },
  special: {
    label: 'SPECIAL ATTACK',
    startupMs: 190,
    activeMs: 190,
    recoveryMs: 320,
    damage: 22,
    reach: 78,
    width: 68,
    height: 70,
    centerY: 66,
    knockback: 150,
    hitstunMs: 460,
    energyGain: 0,
    cooldownMs: 260,
    sfx: 'special',
  },
} as const;

export const ATTACK_DURATION = (name: AttackName): number => {
  const a = ATTACKS[name];
  return a.startupMs + a.activeMs + a.recoveryMs;
};

export const attackPhase = (runtime: AttackRuntime): AttackRuntime['phase'] => {
  const a = ATTACKS[runtime.name];
  if (runtime.elapsedMs < a.startupMs) return 'startup';
  if (runtime.elapsedMs < a.startupMs + a.activeMs) return 'active';
  return 'recovery';
};

/** HUD geometry in the fixed 640 x 360 logical space. */
export const MATCH_HUD_LAYOUT = {
  playerPortrait: { x: 32, y: 32, size: 40 },
  playerName: { x: 104, y: 20 },
  playerBar: { x: 104, y: 34, width: 178, height: 12 },
  opponentPortrait: { x: 608, y: 32, size: 40 },
  opponentName: { x: 536, y: 20 },
  opponentBar: { x: 536, y: 34, width: 178, height: 12 },
  timer: { x: 320, y: 32, width: 60, height: 38 },
  playerRounds: { x: 104, y: 52 },
  opponentRounds: { x: 536, y: 52 },
  playerEnergy: { x: 104, y: 62, width: 130, height: 5 },
  opponentEnergy: { x: 536, y: 62, width: 130, height: 5 },
  pause: { x: 24, y: 84, width: 26, height: 26 },
} as const;

export const MATCH_DEPTH = {
  BACKGROUND: 0,
  SCRIM: 1,
  AMBIENT: 3,
  FLOOR_GLOW: 5,
  FIGHTERS: 10,
  EFFECTS: 14,
  HUD: 30,
  TOUCH: 36,
  POPUP_DIM: 100,
  POPUP: 101,
  RESULT: 110,
} as const;

export const AI_CONFIG = {
  PREFERRED_DISTANCE: 66,
  ATTACK_DISTANCE: 96,
  BLOCK_CHANCE: 0.22,
  JUMP_CHANCE: 0.06,
  RETREAT_CHANCE: 0.16,
  ATTACK_CHANCE: 0.62,
  SPECIAL_CHANCE: 0.2,
  REACTION_MS: 180,
} as const;
