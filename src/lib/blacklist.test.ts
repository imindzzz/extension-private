import { describe, expect, it } from 'vitest';

import { findMatchingRule, matchesDomain, normalizeDomain, toWildcardDomain } from './blacklist';
import type { BlacklistRule } from './types';

const rule = (domain: string, id = domain): BlacklistRule => ({
  id,
  domain,
  source: 'manager',
  createdAt: 0,
});

describe('normalizeDomain', () => {
  it('保留裸域名', () => {
    expect(normalizeDomain('example.com')).toBe('example.com');
    expect(normalizeDomain('  WWW.Example.COM  ')).toBe('www.example.com');
  });

  it('从完整 URL 中取主机名，丢掉协议与路径', () => {
    expect(normalizeDomain('https://example.com/a/b?c=1')).toBe('example.com');
    expect(normalizeDomain('example.com/path')).toBe('example.com');
    expect(normalizeDomain('http://user:pass@a.com:8080/x')).toBe('a.com');
  });

  it('保留通配前缀', () => {
    expect(normalizeDomain('*.example.com')).toBe('*.example.com');
    expect(normalizeDomain('*.example.com/path')).toBe('*.example.com');
  });

  it('单个 * 是合法的「全拦」规则', () => {
    expect(normalizeDomain('*')).toBe('*');
    expect(matchesDomain('any.domain.com', '*')).toBe(true);
  });

  it('非法输入返回 null', () => {
    expect(normalizeDomain('')).toBeNull();
    expect(normalizeDomain('   ')).toBeNull();
    expect(normalizeDomain('http://')).toBeNull();
  });
});

describe('matchesDomain', () => {
  it('精确匹配只看完整主机名', () => {
    expect(matchesDomain('example.com', 'example.com')).toBe(true);
    expect(matchesDomain('www.example.com', 'example.com')).toBe(false);
  });

  it('*. 通配所有子域，不含裸域', () => {
    const pattern = '*.example.com';
    expect(matchesDomain('a.example.com', pattern)).toBe(true);
    expect(matchesDomain('a.b.example.com', pattern)).toBe(true);
    expect(matchesDomain('example.com', pattern)).toBe(false);
    expect(matchesDomain('notexample.com', pattern)).toBe(false);
  });

  it('通配可以出现在任意位置', () => {
    expect(matchesDomain('a.example.com.cn', '*.example.*')).toBe(true);
    expect(matchesDomain('example.org', 'example.*')).toBe(true);
  });

  it('大小写不敏感', () => {
    expect(matchesDomain('WWW.Example.com', '*.example.COM')).toBe(true);
  });

  it('正则元字符按字面量处理', () => {
    expect(matchesDomain('a+b.com', 'a+b.com')).toBe(true);
    expect(matchesDomain('aab.com', 'a+b.com')).toBe(false);
  });
});

describe('findMatchingRule', () => {
  const rules = [rule('example.com'), rule('*.bilibili.com')];

  it('命中精确域名', () => {
    expect(findMatchingRule('https://example.com/x?y=1', rules)?.domain).toBe('example.com');
  });

  it('命中子域通配', () => {
    expect(findMatchingRule('https://www.bilibili.com/video/BV1', rules)?.domain).toBe('*.bilibili.com');
  });

  it('未命中返回 null', () => {
    expect(findMatchingRule('https://github.com', rules)).toBeNull();
  });

  it('URL 非法时返回 null 而不是抛错', () => {
    expect(findMatchingRule('not a url', rules)).toBeNull();
  });
});

describe('toWildcardDomain', () => {
  it('三段以上域名丢掉最左一段', () => {
    expect(toWildcardDomain('www.bilibili.com')).toBe('*.bilibili.com');
    expect(toWildcardDomain('a.b.c.com')).toBe('*.b.c.com');
  });

  it('两段域名与 localhost 不变换', () => {
    expect(toWildcardDomain('bilibili.com')).toBe('bilibili.com');
    expect(toWildcardDomain('localhost')).toBe('localhost');
  });

  it('IP 不变换', () => {
    expect(toWildcardDomain('127.0.0.1')).toBe('127.0.0.1');
  });
});
