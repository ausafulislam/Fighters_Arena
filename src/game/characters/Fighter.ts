import Phaser from 'phaser';

import { fighterSheetTextureKey } from '@/constants/assets';
import type { FighterAnimationName } from '@/constants/fighterFrames';
import {
  ATTACKS,
  ATTACK_DURATION,
  MATCH_CONFIG,
  MATCH_DEPTH,
  attackPhase,
} from '@/constants/match';
import {
  animationDuration,
  createFighterAnimations,
  currentAnimationFrame,
  currentSheetFrame,
  fighterIdleFrame,
  playFighterState,
  type AnimationContext,
} from '@/game/animations/FighterAnimator';
import { playSfx, playSfxFile } from '@/game/audio/Sfx';
import { SFX } from '@/game/audio/audioKeys';
import type { CharacterConfig } from '@/types/characters';
import type { AttackName, AttackRuntime, FighterSnapshot, FighterState } from '@/types/match';
import type { FighterCommand, InputFrame } from '@/types/input';

const C = MATCH_CONFIG;

const LOCKED_STATES: ReadonlySet<FighterState> = new Set<FighterState>([
  'ATTACKING',
  'HIT',
  'KNOCKBACK',
  'KNOCKDOWN',
  'RECOVERING',
  'LANDING',
  'VICTORY',
  'DEFEAT',
]);

/**
 * A playable fighter driven by **Phaser Arcade Physics** and a single
 * upper-case state machine.
 *
 * Physics: gravity, jump impulse, ground/world-bound detection, controlled
 * acceleration and deceleration, body separation and facing all come from a
 * real Arcade Body. Animations: 112 individually drawn frames per character
 * played through Phaser `anims`; the resolved animation only changes when the
 * state changes, so no animation is restarted every update frame and no walk
 * loop can play during an attack.
 */
export class Fighter {
  readonly config: CharacterConfig;
  readonly side: 'player' | 'opponent';
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly body: Phaser.Physics.Arcade.Body;

  state: FighterState = 'IDLE';
  animation: FighterAnimationName = 'idle';
  attack: AttackRuntime | null = null;
  facing: 1 | -1;
  health: number = C.MAX_HEALTH;
  energy = 0;
  grounded = true;
  blocking = false;
  crouching = false;

  hitstunMs = 0;
  knockbackMs = 0;
  knockdownMs = 0;
  getupMs = 0;
  cooldownMs = 0;
  combo = 0;
  comboTimerMs = 0;
  jumpCount = 0;
  specialCount = 0;
  blockedCount = 0;
  landingCount = 0;

  private stateElapsedMs = 0;
  private clockMs = 0;
  private idleStillMs = 0;
  private lastForwardTapMs = -1000;
  private runActive = false;
  private wasGrounded = true;
  private jumpPhase: 'takeoff' | 'airborne' = 'takeoff';
  private takeoffMs = 0;
  private landingMs = 0;
  private previousCommand: FighterCommand | null = null;
  private animationsPaused = false;
  private readonly animationContext: AnimationContext = {
    attack: null,
    forward: true,
    jumpPhase: 'takeoff',
    breathing: false,
  };

  constructor(
    scene: Phaser.Scene,
    config: CharacterConfig,
    side: 'player' | 'opponent',
    x: number,
    facing: 1 | -1,
  ) {
    this.config = config;
    this.side = side;
    this.facing = facing;
    createFighterAnimations(scene, config.id);

    // One authored cell pixel renders as exactly 2x2 framebuffer pixels under
    // the integer camera zoom: no setDisplaySize, no distortion, nearest only.
    this.sprite = scene.physics.add
      .sprite(x, C.GROUND_Y, fighterSheetTextureKey(config.id), fighterIdleFrame())
      .setOrigin(0.5, 1)
      .setDepth(MATCH_DEPTH.FIGHTERS)
      .setFlipX(facing === -1)
      .setCollideWorldBounds(true);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body
      .setSize(C.FIGHTER_WIDTH, C.FIGHTER_FRAME_HEIGHT)
      .setOffset((C.FIGHTER_FRAME_WIDTH - C.FIGHTER_WIDTH) / 2, 0)
      .setGravityY(C.GRAVITY)
      .setMaxVelocity(C.RUN_SPEED * 2.2, C.MAX_FALL_SPEED)
      .setAllowGravity(true)
      .setAllowDrag(true);
    this.sprite.setPushable(true);

    this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.onAnimationComplete, this);
    playFighterState(this.sprite, config.id, 'IDLE', this.animationContext, true);
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  get alive(): boolean {
    return this.health > 0;
  }

  get locked(): boolean {
    return LOCKED_STATES.has(this.state);
  }

  /** Full reset for a new round / rematch without recreating the physics body. */
  reset(x: number, facing: 1 | -1): void {
    this.body.reset(x, C.GROUND_Y);
    this.body.setGravityY(C.GRAVITY);
    this.body.setAllowGravity(true);
    this.body.setVelocity(0, 0);
    this.body.setAcceleration(0, 0);
    this.facing = facing;
    this.health = C.MAX_HEALTH;
    this.energy = 0;
    this.grounded = true;
    this.wasGrounded = true;
    this.blocking = false;
    this.crouching = false;
    this.state = 'IDLE';
    this.attack = null;
    this.hitstunMs = 0;
    this.knockbackMs = 0;
    this.knockdownMs = 0;
    this.getupMs = 0;
    this.cooldownMs = 0;
    this.combo = 0;
    this.comboTimerMs = 0;
    this.stateElapsedMs = 0;
    this.clockMs = 0;
    this.idleStillMs = 0;
    this.lastForwardTapMs = -1000;
    this.runActive = false;
    this.jumpPhase = 'takeoff';
    this.takeoffMs = 0;
    this.landingMs = 0;
    this.previousCommand = null;
    this.sprite
      .setFlipX(facing === -1)
      .setAlpha(1)
      .setAngle(0);
    this.setAnimationsPaused(false);
    this.syncAnimation(true);
  }

  /** Pause/resume only this sprite's animation playhead (scene physics too). */
  setAnimationsPaused(value: boolean): void {
    if (this.animationsPaused === value) return;
    this.animationsPaused = value;
    if (value) this.sprite.anims.pause();
    else this.sprite.anims.resume();
  }

  /** Body box used for real hit detection (shrinks while crouching). */
  get bodyBox(): Phaser.Geom.Rectangle {
    const height = this.crouching ? C.FIGHTER_HEIGHT * 0.6 : C.FIGHTER_HEIGHT * 0.94;
    return new Phaser.Geom.Rectangle(
      this.x - C.FIGHTER_WIDTH / 2,
      this.y - height,
      C.FIGHTER_WIDTH,
      height,
    );
  }

  /** Only the ACTIVE window of an attack produces a hitbox. */
  get attackHitbox(): Phaser.Geom.Rectangle | null {
    if (!this.attack || this.attack.hasHit || this.attack.phase !== 'active') return null;
    const a = ATTACKS[this.attack.name];
    const reach = a.reach * this.config.combat.reach;
    const centerX = this.x + this.facing * (C.FIGHTER_WIDTH / 2 + reach / 2);
    return new Phaser.Geom.Rectangle(
      centerX - a.width / 2,
      this.y - a.centerY - a.height / 2,
      a.width,
      a.height,
    );
  }

  /** Apply a resolved hit. Returns the damage actually dealt. */
  applyHit(
    damage: number,
    knockback: number,
    hitstunMs: number,
    sourceFacing: 1 | -1,
    blocked: boolean,
    knockdown = false,
  ): number {
    const dealt = Math.max(0, damage);
    this.health = Math.max(0, this.health - dealt);
    this.energy = Math.min(C.SPECIAL_MAX, this.energy + (blocked ? 5 : C.ENERGY_ON_TAKING_HIT));
    if (blocked) this.blockedCount += 1;
    this.attack = null;
    this.combo = 0;
    this.comboTimerMs = 0;
    this.blocking = false;
    this.crouching = false;

    this.landingMs = 0;
    if (blocked) {
      this.hitstunMs = hitstunMs * 0.35;
      this.body.setVelocityX(knockback * 0.3 * sourceFacing);
      this.setState('BLOCKING');
    } else if (knockdown || !this.alive) {
      // Heavy / special strikes (and K.O.s) floor the fighter; the get-up
      // animation then plays from the RECOVERING state.
      this.body.setVelocityX(knockback * 0.8 * sourceFacing);
      this.startKnockdown();
      this.setState('KNOCKDOWN');
    } else {
      this.hitstunMs = hitstunMs;
      this.knockbackMs = hitstunMs * 0.6;
      this.body.setVelocityX(knockback * sourceFacing);
      this.setState('KNOCKBACK');
    }
    if (!this.alive && !knockdown) {
      this.startKnockdown();
      this.setState('KNOCKDOWN');
    }
    this.syncAnimation(true);
    return dealt;
  }

  registerHit(): void {
    if (!this.attack) return;
    this.combo += 1;
    this.comboTimerMs = C.COMBO_WINDOW_MS;
    const a = ATTACKS[this.attack.name];
    this.energy = Math.min(
      C.SPECIAL_MAX,
      this.energy + (a.energyGain + C.ENERGY_ON_HIT) * this.config.combat.energyGain,
    );
  }

  private startKnockdown(): void {
    this.knockdownMs = C.KNOCKDOWN_MS;
    this.getupMs = C.GETUP_MS;
    this.hitstunMs = 0;
    this.knockbackMs = 0;
    this.landingMs = 0;
    this.attack = null;
  }

  /** Keep the two fighters from walking through each other. */
  separateFrom(other: Fighter): void {
    const delta = other.x - this.x;
    const distance = Math.abs(delta);
    if (distance >= C.MIN_DISTANCE) return;
    const direction = delta === 0 ? (this.side === 'player' ? 1 : -1) : Math.sign(delta);
    const overlap = (C.MIN_DISTANCE - distance) / 2;
    this.shiftX(-direction * overlap);
    other.shiftX(direction * overlap);
  }

  private shiftX(amount: number): void {
    this.sprite.setX(this.sprite.x + amount);
    this.body.updateFromGameObject();
  }

  update(dtMs: number, frame: InputFrame, opponent: Fighter): void {
    const dt = dtMs / 1000;
    this.previousCommand = frame.held;
    this.clockMs += dtMs;
    this.stateElapsedMs += dtMs;
    if (this.state === 'IDLE') this.idleStillMs += dtMs;
    this.facing = opponent.x >= this.x ? 1 : -1;

    if (this.cooldownMs > 0) this.cooldownMs = Math.max(0, this.cooldownMs - dtMs);
    if (this.comboTimerMs > 0) {
      this.comboTimerMs -= dtMs;
      if (this.comboTimerMs <= 0) this.combo = 0;
    }

    this.wasGrounded = this.grounded;
    this.grounded = this.body.blocked.down || this.body.touching.down;
    if (this.grounded && !this.wasGrounded && !this.locked) this.onLand();

    if (this.knockdownMs > 0) {
      this.knockdownMs -= dtMs;
      this.setState('KNOCKDOWN');
      this.body.setVelocityX(this.body.velocity.x * 0.9);
      if (this.knockdownMs <= 0) {
        this.knockdownMs = 0;
        this.setState('RECOVERING');
      }
    } else if (this.getupMs > 0) {
      this.getupMs -= dtMs;
      this.setState('RECOVERING');
      if (this.getupMs <= 0) {
        this.getupMs = 0;
        this.setState('IDLE');
      }
    } else if (this.hitstunMs > 0) {
      this.hitstunMs -= dtMs;
      this.knockbackMs = Math.max(0, this.knockbackMs - dtMs);
      this.setState(this.knockbackMs > 0 ? 'KNOCKBACK' : 'HIT');
      if (this.hitstunMs <= 0) this.setState('IDLE');
    } else if (this.landingMs > 0) {
      // Landing owns the state until its animation finishes; input cannot
      // overwrite it with IDLE on the same frame.
      this.landingMs -= dtMs;
      this.setState('LANDING');
      this.setHorizontal(0, dt);
      if (this.landingMs <= 0) this.setState('IDLE');
    } else if (this.state === 'VICTORY' || this.state === 'DEFEAT') {
      // End-of-round poses are held, never replaced by locomotion.
      this.setHorizontal(0, dt);
    } else if (this.attack) {
      this.setState('ATTACKING');
      this.advanceAttack(dtMs);
    } else {
      this.handleInput(frame, dt);
    }

    // Physics-derived vertical states. A locked reaction / attack / landing is
    // never overwritten by a jump or fall animation (no animation conflicts).
    if (!this.grounded && !this.locked) {
      const rising = this.body.velocity.y < -30;
      if (rising) {
        this.setState('JUMPING');
        this.takeoffMs += dtMs;
        this.jumpPhase =
          this.takeoffMs >= animationDuration('jump_takeoff') ? 'airborne' : 'takeoff';
      } else {
        this.setState('FALLING');
      }
    }

    this.sprite.setFlipX(this.facing === -1);
    this.syncAnimation(false);
  }

  private onLand(): void {
    this.landingCount += 1;
    this.landingMs = animationDuration('landing');
    this.takeoffMs = 0;
    this.jumpPhase = 'takeoff';
    this.setState('LANDING');
    this.body.setVelocityY(0);
    playSfx(SFX.LAND);
    this.syncAnimation(true);
  }

  private setState(next: FighterState): void {
    if (this.state === next) return;
    this.state = next;
    this.stateElapsedMs = 0;
    if (next === 'IDLE') this.idleStillMs = 0;
  }

  private advanceAttack(dtMs: number): void {
    const runtime = this.attack;
    if (!runtime) return;
    runtime.elapsedMs += dtMs;
    runtime.phase = attackPhase(runtime);
    if (runtime.elapsedMs >= ATTACK_DURATION(runtime.name)) {
      if (!runtime.hasHit) {
        runtime.whiffed = true;
        playSfx(SFX.WHIFF, 0.35);
      }
      this.cooldownMs = ATTACKS[runtime.name].cooldownMs;
      this.attack = null;
      this.setState('IDLE');
      this.body.setVelocityX(this.body.velocity.x * 0.35);
    }
  }

  private handleInput(frame: InputFrame, dt: number): void {
    const { held, pressed } = frame;
    this.blocking = false;
    this.crouching = false;

    if (!this.grounded) {
      // Limited air control; the jump / falling animation owns the state.
      const direction = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      this.setHorizontal(direction * C.WALK_SPEED * C.AIR_CONTROL, dt);
      return;
    }

    // Attack inputs are only accepted while grounded and off cooldown.
    if (pressed.special && this.energy >= C.SPECIAL_COST && this.cooldownMs === 0) {
      this.startAttack('special');
      return;
    }
    if (pressed.heavy_punch && this.cooldownMs === 0) {
      this.startAttack('heavy_punch');
      return;
    }
    if (pressed.kick && this.cooldownMs === 0) {
      this.startAttack('kick');
      return;
    }
    if (pressed.light_punch && this.cooldownMs === 0) {
      this.startAttack('light_punch');
      return;
    }
    if (this.cooldownMs > 0) {
      this.setState('IDLE');
      this.setHorizontal(0, dt);
      return;
    }

    if (held.block) {
      this.blocking = true;
      this.setState('BLOCKING');
      this.setHorizontal(0, dt);
      return;
    }
    if (held.down) {
      this.crouching = true;
      this.setState('CROUCHING');
      this.setHorizontal(0, dt);
      return;
    }
    if (pressed.up) {
      this.body.setVelocityY(C.JUMP_VELOCITY);
      this.grounded = false;
      this.takeoffMs = 0;
      this.jumpPhase = 'takeoff';
      this.jumpCount += 1;
      this.setState('JUMPING');
      playSfx(SFX.JUMP);
      return;
    }

    const direction = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    const forwardPress = this.facing === 1 ? pressed.right : pressed.left;
    if (forwardPress) {
      // Double-tap forward starts a run; no extra key or touch button needed.
      this.runActive = this.clockMs - this.lastForwardTapMs < 300;
      this.lastForwardTapMs = this.clockMs;
    }
    if (direction === 0) {
      this.runActive = false;
      this.setState('IDLE');
      this.setHorizontal(0, dt);
      return;
    }
    const forward = direction === this.facing;
    if (!forward) this.runActive = false;
    const running = forward && this.runActive;
    const speed =
      (running ? C.RUN_SPEED : forward ? C.WALK_SPEED : C.BACK_SPEED) *
      this.config.combat.moveSpeed;
    this.setHorizontal(direction * speed, dt);
    this.setState(running ? 'RUNNING' : 'WALKING');
  }

  /** Frame-rate independent exponential approach to a target velocity. */
  private setHorizontal(target: number, dt: number): void {
    const blend = 1 - Math.exp(-C.MOVE_RESPONSE * dt);
    const next = Phaser.Math.Linear(this.body.velocity.x, target, blend);
    this.body.setVelocityX(Math.abs(next) < 1 ? 0 : next);
  }

  private startAttack(name: AttackName): void {
    this.attack = { name, elapsedMs: 0, phase: 'startup', hasHit: false, whiffed: false };
    this.setState('ATTACKING');
    this.body.setVelocityX(name === 'special' ? this.facing * 32 : 0);
    if (name === 'special') {
      this.energy = Math.max(0, this.energy - C.SPECIAL_COST);
      this.specialCount += 1;
    }
    playSfxFile(ATTACKS[name].sfx);
    this.syncAnimation(true);
  }

  private syncAnimation(force: boolean): void {
    this.animationContext.attack = this.attack?.name ?? null;
    this.animationContext.jumpPhase = this.jumpPhase;
    this.animationContext.forward = Math.sign(this.body.velocity.x || this.facing) === this.facing;
    this.animationContext.breathing = this.state === 'IDLE' && this.idleStillMs > 900;
    this.animation = playFighterState(
      this.sprite,
      this.config.id,
      this.state,
      this.animationContext,
      force,
    );
  }

  private readonly onAnimationComplete = (animation: Phaser.Animations.Animation): void => {
    const key = animation.key;
    const landing = `${this.config.id}-landing`;
    const getup = `${this.config.id}-getup`;
    const takeoff = `${this.config.id}-jump_takeoff`;
    if (key.endsWith(takeoff)) {
      this.jumpPhase = 'airborne';
      return;
    }
    if (key.endsWith(landing) && this.state === 'LANDING') {
      this.landingMs = 0;
      this.setState('IDLE');
    }
    if (key.endsWith(getup) && this.state === 'RECOVERING') this.setState('IDLE');
  };

  /** Freeze into a victory / defeat pose at the end of a round. */
  celebrate(victory: boolean): void {
    this.attack = null;
    this.hitstunMs = 0;
    this.knockbackMs = 0;
    this.knockdownMs = 0;
    this.getupMs = 0;
    this.landingMs = 0;
    this.body.setVelocity(0, 0);
    this.body.setAcceleration(0, 0);
    this.setState(victory ? 'VICTORY' : 'DEFEAT');
    this.syncAnimation(true);
  }

  getSnapshot(): FighterSnapshot {
    return {
      id: this.config.id,
      name: this.config.name,
      x: Math.round(this.x * 10) / 10,
      y: Math.round(this.y * 10) / 10,
      vx: Math.round(this.body.velocity.x),
      vy: Math.round(this.body.velocity.y),
      health: this.health,
      energy: Math.round(this.energy),
      state: this.state,
      animation: this.animation,
      frameIndex: currentSheetFrame(this.sprite),
      animationFrame: currentAnimationFrame(this.sprite),
      stateElapsedMs: Math.round(this.stateElapsedMs),
      attack: this.attack?.name ?? null,
      attackPhase: this.attack?.phase ?? null,
      facing: this.facing,
      grounded: this.grounded,
      blockedDown: this.body.blocked.down,
      blocking: this.blocking,
      crouching: this.crouching,
      combo: this.combo,
      bodyX: Math.round(this.body.x * 10) / 10,
      bodyY: Math.round(this.body.y * 10) / 10,
    };
  }

  get lastCommand(): FighterCommand | null {
    return this.previousCommand;
  }

  destroy(): void {
    this.sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE, this.onAnimationComplete, this);
    this.sprite.destroy();
  }
}
