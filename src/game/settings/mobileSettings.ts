import type { MobileSettings, TouchControlSize } from '@/types/welcome';

/**
 * Phase 3 prepares future mobile gameplay preferences only. Values are stored
 * locally and validated on read so a corrupt / stale entry can never break the
 * menu. No mobile controls are created in this phase.
 */
export const MOBILE_SETTINGS_STORAGE_KEY = 'fighters-arena:mobile-settings:v1';

export const DEFAULT_MOBILE_SETTINGS: MobileSettings = Object.freeze({
  showMobileControls: true,
  leftHanded: false,
  touchControlSize: 'medium',
});

const TOUCH_SIZES: readonly TouchControlSize[] = ['small', 'medium', 'large'];

function sanitize(raw: unknown): MobileSettings {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_MOBILE_SETTINGS };
  const value = raw as Record<string, unknown>;
  return {
    showMobileControls:
      typeof value.showMobileControls === 'boolean'
        ? value.showMobileControls
        : DEFAULT_MOBILE_SETTINGS.showMobileControls,
    leftHanded:
      typeof value.leftHanded === 'boolean' ? value.leftHanded : DEFAULT_MOBILE_SETTINGS.leftHanded,
    touchControlSize: TOUCH_SIZES.includes(value.touchControlSize as TouchControlSize)
      ? (value.touchControlSize as TouchControlSize)
      : DEFAULT_MOBILE_SETTINGS.touchControlSize,
  };
}

export function loadMobileSettings(): MobileSettings {
  try {
    const raw = window.localStorage.getItem(MOBILE_SETTINGS_STORAGE_KEY);
    return raw === null ? { ...DEFAULT_MOBILE_SETTINGS } : sanitize(JSON.parse(raw));
  } catch {
    // Private browsing / storage disabled / malformed JSON.
    return { ...DEFAULT_MOBILE_SETTINGS };
  }
}

/** Returns the normalised settings that were persisted. */
export function saveMobileSettings(settings: MobileSettings): MobileSettings {
  const clean = sanitize(settings);
  try {
    window.localStorage.setItem(MOBILE_SETTINGS_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // Preferences stay in memory for this session if storage is unavailable.
  }
  return clean;
}
