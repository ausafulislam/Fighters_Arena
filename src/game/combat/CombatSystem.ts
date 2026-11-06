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
  attackLabel: string;
  specialName: string;
  blocked: boolean;
  damage: number;
  x: number;
  y: number;
  combo: number;
  heavy: boolean;
}

/**
 * Resolves real attack hitboxes against real body boxes. One hit per attack:
 * `hasHit` is latched even if the active frames keep overlapping. Damage uses
 * each fighter's centralised combat profile; blocking reduces damage, and
 * knockback / hitstun / energy / combo tracking all live here.
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

    const config = ATTACKS[runtime.name];
    const blocked = defender.blocking && defender.grounded;
    const profile = attacker.config.combat;
    const raw = config.damage * profile.damage * (blocked ? MATCH_CONFIG.BLOCK_REDUCTION : 1);
    const damage = Math.max(1, Math.round(raw / defender.config.combat.defense));
    // Compute the contact point while the active hitbox is still available.
    const point = contactPoint(attacker, defender);
    runtime.hasHit = true;

    attacker.registerHit();
    defender.applyHit(
      damage,
      config.knockback,
      config.hitstunMs,
      attacker.facing,
      blocked,
      config.knockdown,
    );

    playSfx(blocked ? SFX.BLOCK : SFX.HIT);
    if (!blocked && attacker.combo >= 3) playSfx(SFX.COMBO, 0.5);

    this.onHit({
      attacker,
      defender,
      attack: runtime.name,
      attackLabel: config.label,
      specialName: profile.specialName,
      blocked,
      damage,
      x: point.x,
      y: point.y,
      combo: attacker.combo,
      heavy: runtime.name !== 'light_punch',
    });
  }
}
