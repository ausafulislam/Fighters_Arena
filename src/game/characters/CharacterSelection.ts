import type Phaser from 'phaser';

import {
  CHARACTERS,
  DEFAULT_CHARACTER_ID,
  UNLOCKED_CHARACTERS,
  characterById,
  characterIndex,
} from '@/constants/characters';
import { GAME_EVENTS, REGISTRY_KEYS } from '@/constants/scenes';
import type { CharacterConfig, CharacterId, CharacterManagerSnapshot } from '@/types/characters';

export type SelectionSource = 'default' | 'card' | 'keyboard' | 'random' | null;

export interface SelectionChange {
  config: CharacterConfig;
  source: SelectionSource;
  snapshot: CharacterManagerSnapshot;
}

type Listener = (change: SelectionChange) => void;

/**
 * Game-level character selection state. It outlives scene transitions, so
 * leaving to Game Mode Selection and coming back keeps the same fighter.
 * Locked fighters are filtered here - neither a card click nor RANDOM can ever
 * resolve to an unavailable character.
 */
export class CharacterSelection {
  private static instance: CharacterSelection | null = null;

  static getInstance(): CharacterSelection {
    CharacterSelection.instance ??= new CharacterSelection();
    return CharacterSelection.instance;
  }

  private game: Phaser.Game | null = null;
  private selectedId: CharacterId = DEFAULT_CHARACTER_ID;
  private selectionCount = 0;
  private randomCount = 0;
  private lastSource: SelectionSource = null;
  private readonly listeners = new Set<Listener>();

  attach(game: Phaser.Game): void {
    if (this.game) return;
    this.game = game;
    this.publish('default');
  }

  get selected(): CharacterConfig {
    return characterById(this.selectedId) ?? CHARACTERS[0]!;
  }

  get selectedIndex(): number {
    return characterIndex(this.selectedId);
  }

  get available(): readonly CharacterConfig[] {
    return UNLOCKED_CHARACTERS;
  }

  select(id: CharacterId, source: SelectionSource = 'card'): CharacterConfig | null {
    const config = characterById(id);
    if (!config || !config.unlocked) return null;
    this.selectedId = config.id;
    this.selectionCount += 1;
    this.lastSource = source;
    this.publish(source);
    return config;
  }

  selectIndex(index: number, source: SelectionSource = 'keyboard'): CharacterConfig | null {
    const config = CHARACTERS[index];
    return config ? this.select(config.id, source) : null;
  }

  /** Picks among unlocked fighters, avoiding a repeat when there is a choice. */
  selectRandom(randomFn: () => number = Math.random): CharacterConfig {
    const pool = UNLOCKED_CHARACTERS.filter((entry) => entry.id !== this.selectedId);
    const candidates = pool.length > 0 ? pool : UNLOCKED_CHARACTERS;
    const roll = Math.min(0.999999, Math.max(0, randomFn()));
    const picked = candidates[Math.floor(roll * candidates.length)] ?? UNLOCKED_CHARACTERS[0]!;
    this.randomCount += 1;
    return this.select(picked.id, 'random') ?? picked;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): CharacterManagerSnapshot {
    return {
      selectedId: this.selectedId,
      selectedIndex: this.selectedIndex,
      selectionCount: this.selectionCount,
      randomCount: this.randomCount,
      lastSource: this.lastSource,
    };
  }

  private publish(source: SelectionSource): void {
    const change: SelectionChange = {
      config: this.selected,
      source,
      snapshot: this.getSnapshot(),
    };
    for (const listener of this.listeners) listener(change);
    if (!this.game) return;
    this.game.registry.set(REGISTRY_KEYS.CHARACTER_STATE, change.snapshot);
    this.game.events.emit(GAME_EVENTS.CHARACTER_CHANGED, change);
    window.dispatchEvent(new CustomEvent('fighters-arena:character-changed'));
  }

  dispose(): void {
    this.listeners.clear();
    this.game = null;
    CharacterSelection.instance = null;
  }
}
