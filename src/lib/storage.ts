import { storage } from 'wxt/utils/storage';

import { DEFAULT_SETTINGS, type BlacklistRule, type Settings } from './types';

/** 黑名单规则，按 `local:blacklist` 存在 storage.local 里 */
export const blacklistItem = storage.defineItem<BlacklistRule[]>('local:blacklist', {
  fallback: [],
});

/** 全局设置 */
export const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
});
