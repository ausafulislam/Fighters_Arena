import type Phaser from 'phaser';

import { CHARACTERS, UNLOCKED_CHARACTERS, characterById } from '@/constants/characters';
import { GAME_EVENTS, REGISTRY_KEYS } from '@/constants/scenes';
import { ArenaSelection } from '@/game/arenas/ArenaSelection';
import { CharacterSelection } from '@/game/characters/CharacterSelection';
import type { CharacterConfig } from '@/types/characters';
import type { MatchSetupSnapshot } from '@/types/match';

/**
 * The flow state that must survive every transition:
 * Welcome -> Game Mode -> Character -> Arena -> Preview -> VS -> Gameplay.
 * It is derived from the two game-level selection managers instead of being
 * copied into scene data, so there is exactly one source of truth.
 */
export class MatchSetup {
  private static instance: MatchSetup | null = null;

  static getInstance(): MatchSetup {
    MatchSetup.instance ??= new MatchSetup();
    return MatchSetup.instance;
  }

  private game: Phaser.Game | null = null;
  private modeId: string | null = null;

  attach(game: Phaser.Game): void {
    if (this.game) return;
    this.game = game;
    this.publish();
  }

  setMode(modeId: string | null): void {
    this.modeId = modeId;
    this.publish();
  }

  get player(): CharacterConfig {
    return CharacterSelection.getInstance().selected;
  }

  /** Kenji vs Shadow by default; any other pick still faces Shadow. */
  get opponent(): CharacterConfig {
    const candidates = UNLOCKED_CHARACTERS.filter((entry) => entry.id !== this.player.id);
    const preferred = characterById('shadow');
    const pick =
      preferred && candidates.some((entry) => entry.id === preferred.id)
        ? preferred
        : (candidates[0] ?? CHARACTERS[0]!);
    return pick;
  }

  get arenaId(): string {
    return ArenaSelection.getInstance().selected.id;
  }

  getSnapshot(): MatchSetupSnapshot {
    return {
      playerId: this.player.id,
      opponentId: this.opponent.id,
      arenaId: this.arenaId,
      modeId: this.modeId,
    };
  }

  private publish(): void {
    if (!this.game) return;
    const snapshot = this.getSnapshot();
    this.game.registry.set(REGISTRY_KEYS.MATCH_SETUP, snapshot);
    this.game.events.emit(GAME_EVENTS.MATCH_CHANGED, snapshot);
  }

  dispose(): void {
    this.game = null;
    MatchSetup.instance = null;
  }
}
