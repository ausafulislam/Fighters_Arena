import { AI_CONFIG, MATCH_CONFIG } from '@/constants/match';
import { EMPTY_COMMAND } from '@/types/input';
import type { FighterCommand, InputFrame } from '@/types/input';
import type { Fighter } from '@/game/characters/Fighter';
import type { AttackName } from '@/types/match';

export type AiState =
  'idle' | 'approach' | 'retreat' | 'attack' | 'block' | 'jump' | 'hit' | 'knockdown';

/**
 * Small state-based CPU opponent. Decisions are made on a timer (not every
 * frame), attacks require the fighter to be idle and off cooldown, and the AI
 * never queues a new attack while one is running - so it cannot spam.
 */
export class OpponentAI {
  private decisionMs = 0;
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
    this.state = 'approach';
    this.held = { ...EMPTY_COMMAND };
    this.pendingAttack = null;
    this.pendingJump = false;
  }

  update(dtMs: number, self: Fighter, player: Fighter): InputFrame {
    this.decisionMs -= dtMs;
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
    }
    return { held: { ...this.held }, pressed };
  }

  private decide(self: Fighter, player: Fighter): void {
    this.held = { ...EMPTY_COMMAND };
    if (!self.alive || self.hitstunMs > 0 || self.knockdownMs > 0 || self.getupMs > 0) {
      this.state = self.knockdownMs > 0 || self.getupMs > 0 ? 'knockdown' : 'hit';
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

    if (distance > AI_CONFIG.ATTACK_DISTANCE) {
      this.state = 'approach';
      this.held[toward] = true;
      if (roll < AI_CONFIG.JUMP_CHANCE && self.grounded) this.pendingJump = true;
      return;
    }

    if (player.attack && roll < AI_CONFIG.BLOCK_CHANCE + 0.25) {
      this.state = 'block';
      this.held.block = true;
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
    if (self.cooldownMs > 0) {
      this.state = 'idle';
      return;
    }

    this.state = 'attack';
    const canSpecial = self.energy >= MATCH_CONFIG.SPECIAL_COST;
    if (canSpecial && this.random() < AI_CONFIG.SPECIAL_CHANCE) {
      this.pendingAttack = 'special';
    } else {
      const choices: readonly AttackName[] = ['light_punch', 'heavy_punch', 'kick'];
      this.pendingAttack = choices[Math.floor(this.random() * choices.length)] ?? 'light_punch';
    }
    // A short forward step makes the AI close the last few pixels.
    if (distance > AI_CONFIG.PREFERRED_DISTANCE) this.held[toward] = true;
  }
}
