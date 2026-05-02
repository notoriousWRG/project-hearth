import type { UserType } from '../../shared/types.js';
import type { Theme } from './theme.js';

export type ViewMode = 'parent' | 'child';

const ACTIVE_USER_KEY = 'hearth:activeUserId';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function getViewMode(userType: UserType): ViewMode {
  return userType === 'parent' ? 'parent' : 'child';
}

export function getThemeForViewMode(mode: ViewMode): Theme {
  return mode === 'parent' ? 'clean' : 'whimsy';
}

export function loadActiveUserId(storage: StorageLike = localStorage): number | null {
  const raw = storage.getItem(ACTIVE_USER_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return isNaN(n) ? null : n;
}

export function saveActiveUserId(id: number | null, storage: StorageLike = localStorage): void {
  if (id === null) {
    storage.setItem(ACTIVE_USER_KEY, '');
  } else {
    storage.setItem(ACTIVE_USER_KEY, String(id));
  }
}
