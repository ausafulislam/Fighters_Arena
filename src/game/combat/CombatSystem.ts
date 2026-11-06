import { ATTACKS, MATCH_CONFIG } from '@/constants/match';
import { contactPoint, hitboxIntersects } from '@/game/combat/HitboxManager';
import { playSfx } from '@/game/audio/Sfx';
import { SFX } from '@/game/audio/audioKeys';
import type { Fighter } from '@/game/characters/Fighter';
import type { AttackName } from '@/types/match';

export interface CombatHit {
  attacker: Fighter;
  defender: Fighter;
  attack: AttackName;
  blocked: boolean;
  damage: number;
  x: number;
  y: number;
  combo: number;
}

/**
 * Resolves real attack hitboxes against real body boxes. One hit per attack:
 * `hasHit` is latched even if the active frames keep overlapping. Damage,
 * blocking reduction, knockback, hitstun, energy and combo tracking all live
 * here so no scene duplicates combat rules.
 */
export class CombatSystem {
  private readonly onHit: (hit: CombatHit) => void;

  constructor(onHit: (hit: CombatHit) => void) {
    this.onHit = onHit;
  }

  update(player: Fighter, opponent: Fighter): void {
    this.check(player, opponent);
    this.check(opponent, player);
  }

  private check(attacker: Fighter, defender: Fighter): void {
    const runtime = attacker.attack;
    if (!runtime || runtime.hasHit || runtime.phase !== 'active') return;
    if (!hitboxIntersects(attacker, defender)) return;

    runtime.hasHit = true;
    const config = ATTACKS[runtime.name];
    const blocked = defender.blocking && defender.grounded && !defender.crouching;
    const damage = Math.max(
      1,
      Math.round(config.damage * (blocked ? MATCH_CONFIG.BLOCK_REDUCTION : 1)),
    );
    const point = contactPoint(attacker, defender);

    attacker.registerHit();
    defender.applyHit(damage, config.knockback, config.hitstunMs, attacker.facing, blocked);

    playSfx(blocked ? SFX.BLOCK : SFX.HIT);
    this.onHit({
      attacker,
      defender,
      attack: runtime.name,
      blocked,
      damage,
      x: point.x,
      y: point.y,
      combo: attacker.combo,
    });
  }
}
