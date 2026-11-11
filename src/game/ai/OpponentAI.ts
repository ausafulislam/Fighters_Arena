import { AI_CONFIG, MATCH_CONFIG } from '@/constants/match';
import { EMPTY_COMMAND } from '@/types/input';
import type { FighterCommand, InputFrame } from '@/types/input';
import type { Fighter } from '@/game/characters/Fighter';
import type { AttackName } from '@/types/match';

export type AiState =
  'idle' | 'approach' | 'retreat' | 'attack' | 'block' | 'crouch' | 'jump' | 'hit' | 'knockdown';

/**
 * State-based CPU opponent. Decisions run on a timer (never every frame), the
 * fighter must be idle and off cooldown before a new attack is queued, and a
 * minimum gap between attacks prevents spam. The CPU reacts to the player's
 * attacks, health, distance and its own hit/knockdown state, and uses the exact
 * same animation-driven Fighter as the player.
 */
export class OpponentAI {
  private decisionMs = 0;
  private attackGapMs = 0;
  private state: AiState = 'approach';
  private held: FighterCommand = { ...EMPTY_COMMAND };
  private pendingAttack: AttackName | null = null;
  private pendingJump = false;
  private readonly random: () => number;

  constructor(seed = 0x51a7) {
    let value = seed >>> 0;
    this.random = () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 0x100000000;
    };
  }

  get currentState(): AiState {
    return this.state;
  }

  reset(): void {
    this.decisionMs = 0;
    this.attackGapMs = 0;
    this.state = 'approach';
    this.held = { ...EMPTY_COMMAND };
    this.pendingAttack = null;
    this.pendingJump = false;
  }

  update(dtMs: number, self: Fighter, player: Fighter): InputFrame {
    this.decisionMs -= dtMs;
    this.attackGapMs = Math.max(0, this.attackGapMs - dtMs);
    if (this.decisionMs <= 0) {
      this.decide(self, player);
      this.decisionMs = MATCH_CONFIG.AI_DECISION_MS + this.random() * 140;
    }

    const pressed: FighterCommand = { ...EMPTY_COMMAND };
    if (this.pendingJump) {
      pressed.up = true;
      this.pendingJump = false;
    }
    if (this.pendingAttack) {
      pressed[this.pendingAttack] = true;
      this.pendingAttack = null;
      this.attackGapMs = 460 + this.random() * 320;
    }
    return { held: { ...this.held }, pressed };
  }

  private decide(self: Fighter, player: Fighter): void {
    this.held = { ...EMPTY_COMMAND };
    if (!self.alive || self.hitstunMs > 0 || self.knockdownMs > 0 || self.getupMs > 0) {
      this.state = self.knockdownMs > 0 || self.getupMs > 0 ? 'knockdown' : 'hit';
      this.pendingAttack = null;
      return;
    }
    if (self.state === 'RECOVERING' || self.state === 'LANDING') {
      this.state = 'hit';
      return;
    }
    if (self.attack) {
      this.state = 'attack';
      return;
    }

    const distance = Math.abs(player.x - self.x);
    const toward = player.x > self.x ? 'right' : 'left';
    const away = toward === 'right' ? 'left' : 'right';
    const roll = this.random();
    const lowHealth = self.health < MATCH_CONFIG.MAX_HEALTH * 0.32;

    // React to an incoming attack: block or duck under it.
    if (player.attack && distance < AI_CONFIG.ATTACK_DISTANCE + 20) {
      if (roll < AI_CONFIG.BLOCK_CHANCE + 0.38) {
        this.state = 'block';
        this.held.block = true;
        return;
      }
      if (roll < AI_CONFIG.BLOCK_CHANCE + 0.55) {
        this.state = 'crouch';
        this.held.down = true;
        return;
      }
    }

    if (distance > AI_CONFIG.ATTACK_DISTANCE) {
      this.state = 'approach';
      this.held[toward] = true;
      if (roll < AI_CONFIG.JUMP_CHANCE && self.grounded && distance > 170) {
        this.pendingJump = true;
        this.state = 'jump';
      }
      return;
    }

    if (lowHealth && roll < AI_CONFIG.RETREAT_CHANCE + 0.18) {
      this.state = 'retreat';
      this.held[away] = true;
      return;
    }
    if (roll < AI_CONFIG.RETREAT_CHANCE) {
      this.state = 'retreat';
      this.held[away] = true;
      return;
    }
    if (roll < AI_CONFIG.RETREAT_CHANCE + AI_CONFIG.BLOCK_CHANCE) {
      this.state = 'block';
      this.held.block = true;
      return;
    }
    if (self.cooldownMs > 0 || this.attackGapMs > 0) {
      this.state = 'idle';
      if (distance > AI_CONFIG.PREFERRED_DISTANCE) this.held[toward] = true;
      return;
    }

    this.state = 'attack';
    const canSpecial = self.energy >= MATCH_CONFIG.SPECIAL_COST;
    if (canSpecial && this.random() < AI_CONFIG.SPECIAL_CHANCE) {
      this.pendingAttack = 'special';
    } else if (distance > AI_CONFIG.PREFERRED_DISTANCE + 18) {
      // Longer range: kick or heavy punch.
      this.pendingAttack = this.random() < 0.5 ? 'kick' : 'heavy_punch';
    } else {
      // Point blank: fast light punches with the occasional heavy.
      this.pendingAttack = this.random() < 0.68 ? 'light_punch' : 'heavy_punch';
    }
    if (distance > AI_CONFIG.PREFERRED_DISTANCE) this.held[toward] = true;
  }
}
