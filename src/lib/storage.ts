import { storage } from 'wxt/utils/storage';

import { DEFAULT_SETTINGS, type BlacklistRule, type Settings } from './types';

/** 黑名单规则，按 `local:blacklist` 存在 storage.local 里 */
export const blacklistItem = storage.defineItem<BlacklistRule[]>('local:blacklist', {
  fallback: [],
});

/**
 * 全局设置。
 *
 * v2 新增 `blockSubresources`：v1 存下的对象里没有这个字段，`getValue` 会直接返回旧对象，
 * 导致读出来是 `undefined`（关掉网络拦截）。迁移时用默认值补齐。
 */
export const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
  version: 2,
  migrations: {
    2: (old: Partial<Settings> | null) => ({ ...DEFAULT_SETTINGS, ...old }),
  },
});
