import { MATCH_CONFIG } from '@/constants/match';
import type { Fighter } from '@/game/characters/Fighter';
import type { MatchPhase } from '@/types/match';

export type Winner = 'player' | 'opponent' | 'draw' | null;
export type MatchEvent = 'roundStart' | 'fight' | 'roundEnd' | 'matchEnd' | 'timeUp';

/**
 * Best-of-three match rules: 99-second rounds, two round wins to take the
 * match, time-out decided by remaining health, draws handled without a crash.
 * The scene only reacts to the returned events; all rules live here.
 */
export class MatchManager {
  phase: MatchPhase = 'intro';
  round = 1;
  playerRounds = 0;
  opponentRounds = 0;
  timeLeft: number = MATCH_CONFIG.ROUND_TIME;
  winner: Winner = null;
  matchWinner: Winner = null;
  phaseTimerMs = 0;
  hitCount = 0;
  blockedCount = 0;
  specialCount = 0;
  jumpCount = 0;

  startMatch(): void {
    this.round = 1;
    this.playerRounds = 0;
    this.opponentRounds = 0;
    this.matchWinner = null;
    this.hitCount = 0;
    this.blockedCount = 0;
    this.specialCount = 0;
    this.jumpCount = 0;
    this.beginRound();
  }

  beginRound(): void {
    this.phase = 'intro';
    this.phaseTimerMs = MATCH_CONFIG.ROUND_INTRO_MS;
    this.timeLeft = MATCH_CONFIG.ROUND_TIME;
    this.winner = null;
  }

  update(dtMs: number, player: Fighter, opponent: Fighter): MatchEvent[] {
    const events: MatchEvent[] = [];
    if (this.phase === 'intro') {
      this.phaseTimerMs -= dtMs;
      if (this.phaseTimerMs <= 0) {
        this.phase = 'fighting';
        events.push('fight');
      }
      return events;
    }

    if (this.phase === 'fighting') {
      this.timeLeft = Math.max(0, this.timeLeft - dtMs / 1000);
      if (!player.alive || !opponent.alive) {
        this.finishRound(player.alive ? 'player' : opponent.alive ? 'opponent' : 'draw', events);
      } else if (this.timeLeft <= 0) {
        events.push('timeUp');
        const p = player.health / MATCH_CONFIG.MAX_HEALTH;
        const o = opponent.health / MATCH_CONFIG.MAX_HEALTH;
        this.finishRound(Math.abs(p - o) < 0.001 ? 'draw' : p > o ? 'player' : 'opponent', events);
      }
      return events;
    }

    if (this.phase === 'roundEnd') {
      this.phaseTimerMs -= dtMs;
      if (this.phaseTimerMs <= 0) {
        if (this.matchWinner) {
          this.phase = 'matchEnd';
          events.push('matchEnd');
        } else {
          this.round += 1;
          this.beginRound();
          events.push('roundStart');
        }
      }
    }
    return events;
  }

  private finishRound(winner: Winner, events: MatchEvent[]): void {
    this.winner = winner;
    if (winner === 'player') this.playerRounds += 1;
    else if (winner === 'opponent') this.opponentRounds += 1;
    if (this.playerRounds >= MATCH_CONFIG.ROUNDS_TO_WIN) this.matchWinner = 'player';
    else if (this.opponentRounds >= MATCH_CONFIG.ROUNDS_TO_WIN) this.matchWinner = 'opponent';
    this.phase = 'roundEnd';
    this.phaseTimerMs = MATCH_CONFIG.ROUND_END_MS;
    events.push('roundEnd');
  }

  registerHit(blocked: boolean): void {
    this.hitCount += 1;
    if (blocked) this.blockedCount += 1;
  }

  registerSpecial(): void {
    this.specialCount += 1;
  }

  registerJump(): void {
    this.jumpCount += 1;
  }

  /** Restart the whole match (RESTART MATCH / REMATCH) without losing setup. */
  restart(): void {
    this.startMatch();
  }
}
