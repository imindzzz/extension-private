import { defineBackground } from 'wxt/utils/define-background';

import { findMatchingRule, normalizeDomain, toWildcardDomain } from '@/lib/blacklist';
import { createRuleId } from '@/lib/id';
import { buildBlockRules, isHostCovered, type NetResourceType } from '@/lib/net-rules';
import { blacklistItem, settingsItem } from '@/lib/storage';
import type { RuleSource } from '@/lib/types';

const MENU = {
  block: 'blacklist-block',
  blockWildcard: 'blacklist-block-wildcard',
  unblock: 'blacklist-unblock',
  blockLink: 'blacklist-block-link',
} as const;

/** 内容脚本 ←→ 后台的消息类型 */
const MSG_IS_ALLOWED = 'net:is-allowed';
const MSG_ALLOW = 'net:allow';
const MSG_UNBLOCK = 'net:unblock';

/** allow 规则必须高于 block（block 用默认的 1） */
const ALLOW_RULE_PRIORITY = 100;

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

/**
 * 把黑名单同步成动态 DNR 规则：命中站点的子资源在发出前就被拦掉。
 * 主文档不在拦截范围内，否则浏览器只会显示错误页，自制拦截页就没有出现的时机了。
 */
async function syncBlockRules(): Promise<void> {
  const [rules, settings] = await Promise.all([blacklistItem.getValue(), settingsItem.getValue()]);
  const active = settings.blacklistEnabled && settings.blockSubresources;
  const { rules: next, truncated } = active ? buildBlockRules(rules) : { rules: [], truncated: 0 };

  if (truncated > 0) {
    console.warn(`[extension-private] 网络拦截规则已达上限，${truncated} 条规则仅保留页面拦截`);
  }

  const existing = await browser.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((rule) => rule.id);

  try {
    await browser.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: next });
  } catch (error) {
    // 整批被拒通常是个别 regex 不被接受。留着旧规则会与新黑名单错位，宁可先清空
    console.error('[extension-private] 网络拦截规则被浏览器拒绝，已清空', error);
    await browser.declarativeNetRequest.updateDynamicRules({ removeRuleIds }).catch(() => undefined);
    throw error;
  }
}

/** storage 连续变化时串行同步，避免两次 updateDynamicRules 交叉覆盖 */
let syncChain: Promise<void> = Promise.resolve();

function scheduleSyncBlockRules(): Promise<void> {
  syncChain = syncChain.then(syncBlockRules).catch((error: unknown) => {
    console.warn('[extension-private] 同步网络拦截规则失败', error);
  });
  return syncChain;
}

/** session 规则随浏览器关闭失效，正好对应「本次放行」的语义 */
async function getSessionAllowDomains(): Promise<string[]> {
  const rules = await browser.declarativeNetRequest.getSessionRules();
  return rules.flatMap((rule) => rule.condition.requestDomains ?? []);
}

async function isAllowedForSession(hostname: string): Promise<boolean> {
  return isHostCovered(hostname, await getSessionAllowDomains());
}

async function allowForSession(hostname: string): Promise<void> {
  const host = hostname.trim().toLowerCase();
  if (!host || (await isAllowedForSession(host))) return;

  const existing = await browser.declarativeNetRequest.getSessionRules();
  const nextId = existing.reduce((max, rule) => Math.max(max, rule.id), 0) + 1;

  await browser.declarativeNetRequest.updateSessionRules({
    addRules: [
      {
        id: nextId,
        priority: ALLOW_RULE_PRIORITY,
        // allowAllRequests 覆盖该 frame 及其全部子请求，否则放行后页面依然是残缺的
        action: { type: 'allowAllRequests' },
        condition: {
          requestDomains: [host],
          // 类型层是枚举，运行时只认字符串
          resourceTypes: ['main_frame'] as NetResourceType[],
        },
      },
    ],
  });
}

/** 删规则并等网络规则同步完成，这样调用方重载页面时子资源已经能正常加载 */
async function unblockRule(ruleId: string): Promise<void> {
  const rules = await blacklistItem.getValue();
  const next = rules.filter((rule) => rule.id !== ruleId);
  if (next.length === rules.length) return;

  await blacklistItem.setValue(next);
  await scheduleSyncBlockRules();
}

function handleMessage(message: unknown, sendResponse: (response: boolean) => void): boolean | undefined {
  const data = message as { type?: unknown; host?: unknown; ruleId?: unknown } | null;
  if (!data || typeof data.type !== 'string') return undefined;

  switch (data.type) {
    case MSG_IS_ALLOWED: {
      if (typeof data.host !== 'string') return undefined;
      void isAllowedForSession(data.host).then(sendResponse, () => sendResponse(false));
      return true;
    }
    case MSG_ALLOW: {
      if (typeof data.host !== 'string') return undefined;
      void allowForSession(data.host).then(
        () => sendResponse(true),
        () => sendResponse(false)
      );
      return true;
    }
    case MSG_UNBLOCK: {
      if (typeof data.ruleId !== 'string') return undefined;
      void unblockRule(data.ruleId).then(
        () => sendResponse(true),
        () => sendResponse(false)
      );
      return true;
    }
    default:
      return undefined;
  }
}

export default defineBackground(() => {
  createMenus();
  void scheduleSyncBlockRules();

  browser.runtime.onInstalled.addListener(() => {
    createMenus();
    void scheduleSyncBlockRules();
  });

  // session 规则随上次会话结束一起消失，启动时重算一遍动态规则即可
  browser.runtime.onStartup.addListener(() => void scheduleSyncBlockRules());

  blacklistItem.watch(() => void scheduleSyncBlockRules());
  settingsItem.watch(() => void scheduleSyncBlockRules());

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    // Chrome 需要显式返回 true 才能异步回复
    return handleMessage(message, sendResponse) as undefined;
  });

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
