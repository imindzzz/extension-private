import { describe, expect, it } from 'vitest';

import { matchesDomain } from './blacklist';
import { MAX_BLOCK_RULES, buildBlockRules, domainToRegexFilter, isHostCovered } from './net-rules';
import type { BlacklistRule } from './types';

function rule(domain: string, id = domain): BlacklistRule {
  return { id, domain, source: 'manager', createdAt: 0 };
}

function blockMatches(pattern: string, url: string): boolean {
  return new RegExp(domainToRegexFilter(pattern)).test(url);
}

describe('domainToRegexFilter', () => {
  it('精确域名只匹配自身，不含子域', () => {
    expect(blockMatches('example.com', 'https://example.com/a')).toBe(true);
    expect(blockMatches('example.com', 'https://example.com')).toBe(true);
    expect(blockMatches('example.com', 'https://example.com:8080/a?b=1#c')).toBe(true);
    expect(blockMatches('example.com', 'https://www.example.com/a')).toBe(false);
  });

  it('`*.` 前缀匹配子域但不含裸域', () => {
    expect(blockMatches('*.example.com', 'https://www.example.com/a')).toBe(true);
    expect(blockMatches('*.example.com', 'https://a.b.example.com/a')).toBe(true);
    expect(blockMatches('*.example.com', 'https://example.com/a')).toBe(false);
  });

  it('通配符可以出现在中间', () => {
    expect(blockMatches('img*.example.com', 'https://img1.example.com/a')).toBe(true);
    expect(blockMatches('img*.example.com', 'https://cdn.example.com/a')).toBe(false);
  });

  it('单独一个 `*` 拦截所有 http(s) 与 websocket', () => {
    expect(blockMatches('*', 'https://anything.test/a')).toBe(true);
    expect(blockMatches('*', 'http://localhost:3000/')).toBe(true);
    expect(blockMatches('*', 'wss://live.example.com/socket')).toBe(true);
  });

  it('不会跨过路径分隔符误伤', () => {
    // .* 会跨过 / 和 ?，导致这种 URL 被 *.example.com 误命中
    expect(blockMatches('*.example.com', 'https://evil.test/?a=.example.com')).toBe(false);
    expect(blockMatches('*.example.com', 'https://evil.test/x/.example.com')).toBe(false);
  });

  it('与 matchesDomain 的语义保持一致', () => {
    const cases: [string, string][] = [
      ['example.com', 'https://example.com/x'],
      ['example.com', 'https://sub.example.com/x'],
      ['*.example.com', 'https://sub.example.com/x'],
      ['*.example.com', 'https://example.com/x'],
      ['*.example.com', 'https://deep.sub.example.com/x'],
      ['img*.example.com', 'https://img9.example.com/x'],
      ['*', 'https://whatever.test/x'],
      ['a.*.com', 'https://a.b.com/x'],
      ['a.*.com', 'https://a.com/x'],
    ];

    for (const [pattern, url] of cases) {
      const hostname = new URL(url).hostname;
      expect(blockMatches(pattern, url), `${pattern} vs ${url}`).toBe(matchesDomain(hostname, pattern));
    }
  });
});

describe('buildBlockRules', () => {
  it('按顺序分配从 1 开始的 id，并排除主文档', () => {
    const { rules } = buildBlockRules([rule('a.com'), rule('b.com')]);

    expect(rules.map((r) => r.id)).toEqual([1, 2]);
    expect(rules.map((r) => r.action.type)).toEqual(['block', 'block']);
    expect(rules.map((r) => r.condition.excludedResourceTypes)).toEqual([['main_frame'], ['main_frame']]);
  });

  it('相同域名只生成一条规则', () => {
    const { rules, truncated } = buildBlockRules([rule('a.com', '1'), rule('a.com', '2')]);
    expect(rules).toHaveLength(1);
    expect(truncated).toBe(0);
  });

  it('跳过空模式', () => {
    const { rules } = buildBlockRules([rule('   ')]);
    expect(rules).toHaveLength(0);
  });

  it('超过上限时截断并报告条数', () => {
    const many = Array.from({ length: MAX_BLOCK_RULES + 3 }, (_, i) => rule(`site${i}.test`));
    const { rules, truncated } = buildBlockRules(many);

    expect(rules).toHaveLength(MAX_BLOCK_RULES);
    expect(truncated).toBe(3);
  });
});

describe('isHostCovered', () => {
  it('覆盖自身与子域', () => {
    expect(isHostCovered('example.com', ['example.com'])).toBe(true);
    expect(isHostCovered('www.example.com', ['example.com'])).toBe(true);
    expect(isHostCovered('www.example.com', ['other.com'])).toBe(false);
  });

  it('不做后缀误匹配', () => {
    expect(isHostCovered('notexample.com', ['example.com'])).toBe(false);
  });
});
