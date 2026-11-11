import type Phaser from 'phaser';

import { ARENAS, DEFAULT_ARENA_ID, arenaById, arenaIndex } from '@/constants/arenas';
import { GAME_EVENTS, REGISTRY_KEYS } from '@/constants/scenes';
import type { ArenaConfig, ArenaId, ArenaManagerSnapshot } from '@/types/arenas';

export type ArenaSource = 'default' | 'card' | 'arrow' | 'preview' | null;

export interface ArenaChange {
  config: ArenaConfig;
  source: ArenaSource;
  snapshot: ArenaManagerSnapshot;
}

type Listener = (change: ArenaChange) => void;

/**
 * Game-level arena selection. It outlives scene transitions, so Back from the
 * preview keeps the locked arena, and the VS intro / gameplay read the same
 * value. All five arenas are available in this phase.
 */
export class ArenaSelection {
  private static instance: ArenaSelection | null = null;

  static getInstance(): ArenaSelection {
    ArenaSelection.instance ??= new ArenaSelection();
    return ArenaSelection.instance;
  }

  private game: Phaser.Game | null = null;
  private selectedId: ArenaId = DEFAULT_ARENA_ID;
  private selectionCount = 0;
  private lastSource: ArenaSource = null;
  private readonly listeners = new Set<Listener>();

  attach(game: Phaser.Game): void {
    if (this.game) return;
    this.game = game;
    this.publish('default');
  }

  get selected(): ArenaConfig {
    return arenaById(this.selectedId) ?? ARENAS[0]!;
  }

  get selectedIndex(): number {
    return arenaIndex(this.selectedId);
  }

  select(id: ArenaId, source: ArenaSource = 'card'): ArenaConfig | null {
    const config = arenaById(id);
    if (!config) return null;
    if (config.id !== this.selectedId) this.selectionCount += 1;
    this.selectedId = config.id;
    this.lastSource = source;
    this.publish(source);
    return config;
  }

  selectIndex(index: number, source: ArenaSource = 'arrow'): ArenaConfig | null {
    const config = ARENAS[((index % ARENAS.length) + ARENAS.length) % ARENAS.length];
    return config ? this.select(config.id, source) : null;
  }

  step(delta: number, source: ArenaSource = 'arrow'): ArenaConfig | null {
    return this.selectIndex(this.selectedIndex + delta, source);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): ArenaManagerSnapshot {
    return {
      selectedId: this.selectedId,
      selectedIndex: this.selectedIndex,
      selectionCount: this.selectionCount,
      lastSource: this.lastSource,
    };
  }

  private publish(source: ArenaSource): void {
    const change: ArenaChange = {
      config: this.selected,
      source,
      snapshot: this.getSnapshot(),
    };
    for (const listener of this.listeners) listener(change);
    if (!this.game) return;
    this.game.registry.set(REGISTRY_KEYS.ARENA_STATE, change.snapshot);
    this.game.events.emit(GAME_EVENTS.ARENA_CHANGED, change);
    window.dispatchEvent(new CustomEvent('fighters-arena:arena-changed'));
  }

  dispose(): void {
    this.listeners.clear();
    this.game = null;
    ArenaSelection.instance = null;
  }
}
