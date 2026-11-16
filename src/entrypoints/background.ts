import { defineBackground } from 'wxt/utils/define-background';

import { findMatchingRule, normalizeDomain, toWildcardDomain } from '@/lib/blacklist';
import { createRuleId } from '@/lib/id';
import { blacklistItem } from '@/lib/storage';
import type { RuleSource } from '@/lib/types';

const MENU = {
  block: 'blacklist-block',
  blockWildcard: 'blacklist-block-wildcard',
  unblock: 'blacklist-unblock',
  blockLink: 'blacklist-block-link',
} as const;

function hostnameOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

async function addDomain(input: string, source: RuleSource): Promise<boolean> {
  const domain = normalizeDomain(input);
  if (!domain) return false;

  const rules = await blacklistItem.getValue();
  if (rules.some((rule) => rule.domain === domain)) return false;

  await blacklistItem.setValue([...rules, { id: createRuleId(), domain, source, createdAt: Date.now() }]);
  return true;
}

/** 按实际命中的规则删除，这样 `*.example.com` 也能从 `www.example.com` 上解开 */
async function removeForUrl(url: string): Promise<boolean> {
  const rules = await blacklistItem.getValue();
  const hit = findMatchingRule(url, rules);
  if (!hit) return false;

  await blacklistItem.setValue(rules.filter((rule) => rule.id !== hit.id));
  return true;
}

function createMenus(): void {
  browser.contextMenus.removeAll(() => {
    const done = () => void browser.runtime.lastError;

    browser.contextMenus.create({ id: MENU.block, title: '把当前域名加入黑名单', contexts: ['page'] }, done);
    browser.contextMenus.create(
      { id: MENU.blockWildcard, title: '把当前域名及所有子域加入黑名单', contexts: ['page'] },
      done
    );
    browser.contextMenus.create({ id: MENU.unblock, title: '把当前域名移出黑名单', contexts: ['page'] }, done);
    browser.contextMenus.create({ id: MENU.blockLink, title: '把该链接的域名加入黑名单', contexts: ['link'] }, done);
  });
}

export default defineBackground(() => {
  createMenus();
  browser.runtime.onInstalled.addListener(() => createMenus());

  browser.contextMenus.onClicked.addListener((info, tab) => {
    void (async () => {
      const url = info.menuItemId === MENU.blockLink ? info.linkUrl : (info.pageUrl ?? tab?.url);
      const host = hostnameOf(url);
      if (!host || !url) return;

      let changed = false;

      switch (info.menuItemId) {
        case MENU.block:
        case MENU.blockLink: {
          changed = await addDomain(host, 'context-menu');
          break;
        }
        case MENU.blockWildcard: {
          changed = await addDomain(toWildcardDomain(host), 'context-menu');
          break;
        }
        case MENU.unblock: {
          changed = await removeForUrl(url);
          break;
        }
        default:
          return;
      }

      // 加入或移出后刷新页面，让拦截状态立刻生效
      if (changed && tab?.id !== undefined) {
        await browser.tabs.reload(tab.id);
      }
    })();
  });
});
