import type { BlacklistRule } from './types';

const WILDCARD_PREFIX = '*.';
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

const regexCache = new Map<string, RegExp>();

function escapeRegExp(text: string): string {
  return text.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 把用户输入规范成域名模式，非法输入返回 `null`。
 *
 * 接受：`example.com`、`www.example.com/path`、`https://example.com/x`、`*.example.com`
 * 输出：只保留主机名，通配前缀原样保留，统一小写。
 */
export function normalizeDomain(input: string): string | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;

  const wildcard = raw.startsWith(WILDCARD_PREFIX);
  const body = wildcard ? raw.slice(WILDCARD_PREFIX.length) : raw;
  if (!body) return null;

  const withScheme = body.includes('://') ? body : `https://${body}`;

  let hostname: string;
  try {
    hostname = new URL(withScheme).hostname;
  } catch {
    return null;
  }
  if (!hostname) return null;

  return wildcard ? `${WILDCARD_PREFIX}${hostname}` : hostname;
}

/**
 * 主机名是否命中某个域名模式。`*` 匹配任意字符序列（含空）。
 */
export function matchesDomain(hostname: string, pattern: string): boolean {
  const host = hostname.trim().toLowerCase();
  const rule = pattern.trim().toLowerCase();
  if (!host || !rule) return false;

  if (!rule.includes('*')) return host === rule;

  let regex = regexCache.get(rule);
  if (!regex) {
    regex = new RegExp(`^${rule.split('*').map(escapeRegExp).join('.*')}$`);
    regexCache.set(rule, regex);
  }
  return regex.test(host);
}

/**
 * 找出第一条命中该 URL 的规则。只看主机名，忽略协议、端口与路径。
 */
export function findMatchingRule(url: string, rules: readonly BlacklistRule[]): BlacklistRule | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return null;
  }
  if (!hostname) return null;

  return rules.find((rule) => matchesDomain(hostname, rule.domain)) ?? null;
}

/**
 * 从主机名推导「含所有子域」的模式，用于一键拦整站。
 * `www.bilibili.com` → `*.bilibili.com`；`a.b.c.com` → `*.b.c.com`。
 * 两段以内的域名与 IP 不做变换，原样返回。
 */
export function toWildcardDomain(hostname: string): string {
  const host = hostname.trim().toLowerCase();
  if (!host || IPV4.test(host) || host === 'localhost') return host;

  const parts = host.split('.').filter(Boolean);
  if (parts.length <= 2) return host;

  return `${WILDCARD_PREFIX}${parts.slice(1).join('.')}`;
}
