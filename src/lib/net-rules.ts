import type { BlacklistRule } from './types';

/**
 * Chrome 只保证至少 1000 条 `regexFilter` 规则可用，留出水位避免整个更新调用被拒绝。
 * 超出部分会被截断，由调用方提示。
 */
export const MAX_BLOCK_RULES = 900;

const REGEXP_SPECIAL = /[.+?^${}()|[\]\\]/g;

type DynamicRuleOptions = Parameters<typeof browser.declarativeNetRequest.updateDynamicRules>[0];
export type NetRule = NonNullable<DynamicRuleOptions['addRules']>[number];
export type NetResourceType = NonNullable<NonNullable<NetRule['condition']['excludedResourceTypes']>>[number];

function escapeRegExp(text: string): string {
  return text.replace(REGEXP_SPECIAL, '\\$&');
}

/**
 * 把域名模式转成 DNR 的 `regexFilter`。
 *
 * 语义必须与 {@link import('./blacklist').matchesDomain} 完全一致，否则会出现
 * 「页面没弹拦截提示、子资源却被拦掉」的错位：
 * - `*` 匹配任意字符序列（含空），其余字符按字面量
 * - 只匹配主机名，`scheme://` 之后到端口/路径之前都必须落在模式内
 *
 * 主机名部分刻意用 `[^/?#]*` 而不是 `.*`：`.*` 会跨过 `/` 和 `?`，
 * 让 `https://evil.com/?a=.example.com` 这种 URL 误命中 `*.example.com`。
 */
export function domainToRegexFilter(pattern: string): string {
  const body = pattern.split('*').map(escapeRegExp).join('[^/?#]*');
  // wss 也要覆盖，websocket 请求的 URL 是 wss:// 开头
  return `^(?:https?|wss?)://${body}(?::\\d+)?(?:[/?#]|$)`;
}

/**
 * 生成屏蔽子资源的规则：默认拦掉除主文档之外的一切请求。
 *
 * 主文档故意放行 —— 一旦拦掉 `main_frame`，浏览器只会显示 `ERR_BLOCKED_BY_CLIENT`，
 * 自制的拦截页和「本次仍要访问」按钮就都不会出现了。
 */
export function buildBlockRules(rules: readonly BlacklistRule[]): { rules: NetRule[]; truncated: number } {
  const seen = new Set<string>();
  const result: NetRule[] = [];
  let truncated = 0;

  for (const rule of rules) {
    const pattern = rule.domain.trim().toLowerCase();
    if (!pattern || seen.has(pattern)) continue;

    if (result.length >= MAX_BLOCK_RULES) {
      truncated += 1;
      continue;
    }
    seen.add(pattern);

    result.push({
      id: result.length + 1,
      priority: 1,
      action: { type: 'block' },
      condition: {
        regexFilter: domainToRegexFilter(pattern),
        // 'main_frame' 需要断言：DNR 的资源类型在类型层是枚举，运行时只认字符串
        excludedResourceTypes: ['main_frame'] as NetResourceType[],
      },
    });
  }

  return { rules: result, truncated };
}

/**
 * 主机名是否被某条 `requestDomains` 覆盖。
 * DNR 的 `requestDomains` 自动包含子域，这里的判断必须跟着一起包含。
 */
export function isHostCovered(hostname: string, domains: readonly string[]): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return false;
  return domains.some((domain) => {
    const d = domain.trim().toLowerCase();
    return host === d || host.endsWith(`.${d}`);
  });
}
