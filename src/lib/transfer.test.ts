import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { FILE_BLACKLIST, FILE_SETTINGS, ImportError, buildExportZip, mergeRules, parseImportZip } from './transfer';
import { DEFAULT_SETTINGS, type BlacklistRule, type Settings } from './types';

const rule = (domain: string, createdAt = 0): BlacklistRule => ({
  id: `id-${domain}`,
  domain,
  source: 'manager',
  createdAt,
});

const settings: Settings = { ...DEFAULT_SETTINGS, copyFormat: 'markdown', playbackStep: 0.5 };

describe('buildExportZip / parseImportZip', () => {
  it('导出再导入保持数据一致', () => {
    const rules = [rule('example.com', 1), rule('*.bilibili.com', 2)];
    const zip = buildExportZip({ blacklist: rules, settings }, new Date('2026-11-16T00:00:00Z'));
    const result = parseImportZip(zip);

    expect(result.blacklist).toEqual(rules);
    expect(result.settings).toEqual(settings);
    expect(result.skipped).toBe(0);
    expect(result.meta?.ruleCount).toBe(2);
    expect(result.meta?.schemaVersion).toBe(1);
    expect(result.meta?.exportedAt).toBe('2026-11-16T00:00:00.000Z');
  });

  it('非 zip 内容抛 ImportError', () => {
    expect(() => parseImportZip(strToU8('not a zip'))).toThrow(ImportError);
  });

  it('缺少两个数据文件时抛错', () => {
    const onlyManifest = zipSync({ 'manifest.json': strToU8('{"schemaVersion":1}') });
    expect(() => parseImportZip(onlyManifest)).toThrow(/没有/);
  });

  it('只给 settings.json 也能导入（部分备份）', () => {
    const partial = zipSync({ [FILE_SETTINGS]: strToU8(JSON.stringify({ copyFormat: 'url' })) });
    const result = parseImportZip(partial);
    expect(result.settings).toEqual({ copyFormat: 'url' });
    expect(result.blacklist).toEqual([]);
  });

  it('丢弃非法域名并统计数量', () => {
    const raw = JSON.stringify([
      { domain: 'good.com' },
      { domain: '   ' },
      { domain: '' },
      { notDomain: 1 },
      { domain: '*.ok.com' },
    ]);
    const zip = zipSync({ [FILE_BLACKLIST]: strToU8(raw) });
    const result = parseImportZip(zip);

    expect(result.blacklist.map((r) => r.domain)).toEqual(['good.com', '*.ok.com']);
    expect(result.skipped).toBe(3);
    expect(result.blacklist.every((r) => r.source === 'import')).toBe(true);
  });

  it('忽略未知设置项与越界取值', () => {
    const raw = JSON.stringify({
      copyFormat: 'invalid',
      playbackStep: 99,
      blacklistEnabled: true,
      unknownKey: 'x',
    });
    const zip = zipSync({ [FILE_SETTINGS]: strToU8(raw) });
    const result = parseImportZip(zip);

    expect(result.settings).toEqual({ blacklistEnabled: true });
  });

  it('版本过新时拒绝导入', () => {
    const zip = zipSync({
      'manifest.json': strToU8(JSON.stringify({ schemaVersion: 99 })),
      [FILE_SETTINGS]: strToU8('{}'),
    });
    expect(() => parseImportZip(zip)).toThrow(/更新的版本/);
  });

  it('兼容压缩包带一层目录', () => {
    const zip = zipSync({
      'backup/blacklist.json': strToU8(JSON.stringify([{ domain: 'nested.com' }])),
      'backup/settings.json': strToU8('{}'),
    });
    expect(parseImportZip(zip).blacklist[0]?.domain).toBe('nested.com');
  });
});

describe('mergeRules', () => {
  it('按域名去重且保留原有顺序', () => {
    const base = [rule('a.com'), rule('b.com')];
    const incoming = [rule('b.com'), rule('c.com'), rule('d.com')];
    const merged = mergeRules(base, incoming);

    expect(merged.map((r) => r.domain)).toEqual(['a.com', 'b.com', 'c.com', 'd.com']);
  });

  it('不修改入参', () => {
    const base = [rule('a.com')];
    mergeRules(base, [rule('b.com')]);
    expect(base).toHaveLength(1);
  });
});
