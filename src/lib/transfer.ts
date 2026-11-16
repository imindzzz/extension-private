import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

import { normalizeDomain } from './blacklist';
import { createRuleId } from './id';
import type { BlacklistRule, CopyFormat, RuleSource, Settings } from './types';

export const SCHEMA_VERSION = 1;
export const APP_ID = 'extension-private';

export const FILE_META = 'manifest.json';
export const FILE_BLACKLIST = 'blacklist.json';
export const FILE_SETTINGS = 'settings.json';

const COPY_FORMATS: readonly CopyFormat[] = ['title-url', 'markdown', 'url'];
const RULE_SOURCES: readonly RuleSource[] = ['popup', 'context-menu', 'manager', 'import'];

export interface ExportMeta {
  app: string;
  schemaVersion: number;
  exportedAt: string;
  ruleCount: number;
}

export interface ExportBundle {
  blacklist: readonly BlacklistRule[];
  settings: Settings;
}

export interface ImportResult {
  blacklist: BlacklistRule[];
  settings: Partial<Settings>;
  meta?: Partial<ExportMeta>;
  /** 因域名非法被丢弃的规则条数 */
  skipped: number;
}

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

/** 把规则与设置打成 zip：manifest.json + blacklist.json + settings.json */
export function buildExportZip(bundle: ExportBundle, now: Date = new Date()): Uint8Array {
  const meta: ExportMeta = {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    ruleCount: bundle.blacklist.length,
  };

  const files: Record<string, Uint8Array> = {
    [FILE_META]: strToU8(JSON.stringify(meta, null, 2)),
    [FILE_BLACKLIST]: strToU8(JSON.stringify(bundle.blacklist, null, 2)),
    [FILE_SETTINGS]: strToU8(JSON.stringify(bundle.settings, null, 2)),
  };

  return zipSync(files, { level: 6 });
}

function readJson(entries: Map<string, Uint8Array>, name: string): unknown {
  const data = entries.get(name);
  if (!data) return undefined;
  try {
    return JSON.parse(strFromU8(data));
  } catch {
    throw new ImportError(`${name} 不是合法的 JSON`);
  }
}

function sanitizeRules(input: unknown): { rules: BlacklistRule[]; skipped: number } {
  if (!Array.isArray(input)) return { rules: [], skipped: 0 };

  const rules: BlacklistRule[] = [];
  let skipped = 0;

  for (const raw of input) {
    const candidate = raw as Partial<BlacklistRule> | null;
    const domain = typeof candidate?.domain === 'string' ? normalizeDomain(candidate.domain) : null;
    if (!domain) {
      skipped += 1;
      continue;
    }
    rules.push({
      id: typeof candidate?.id === 'string' && candidate.id ? candidate.id : createRuleId(),
      domain,
      // 导出再导入不该抹掉原始来源，只有缺失或非法时才标记为 import
      source: RULE_SOURCES.includes(candidate?.source as RuleSource) ? (candidate?.source as RuleSource) : 'import',
      createdAt: typeof candidate?.createdAt === 'number' ? candidate.createdAt : Date.now(),
    });
  }

  return { rules, skipped };
}

function sanitizeSettings(input: unknown): Partial<Settings> {
  if (!input || typeof input !== 'object') return {};

  const raw = input as Record<string, unknown>;
  const result: Partial<Settings> = {};

  if (typeof raw.copyFormat === 'string' && COPY_FORMATS.includes(raw.copyFormat as CopyFormat)) {
    result.copyFormat = raw.copyFormat as CopyFormat;
  }
  if (typeof raw.playbackStep === 'number' && raw.playbackStep > 0 && raw.playbackStep <= 4) {
    result.playbackStep = raw.playbackStep;
  }
  if (typeof raw.blacklistEnabled === 'boolean') {
    result.blacklistEnabled = raw.blacklistEnabled;
  }
  if (typeof raw.pauseMediaOnBlock === 'boolean') {
    result.pauseMediaOnBlock = raw.pauseMediaOnBlock;
  }

  return result;
}

/**
 * 解析导入的 zip。只读已知文件名，缺失的文件跳过，因此支持「只导入黑名单」这类部分备份。
 * 结构性错误（不是 zip、JSON 损坏、版本过新）抛 {@link ImportError}。
 */
export function parseImportZip(bytes: Uint8Array): ImportResult {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    throw new ImportError('不是有效的 zip 文件');
  }

  // 兼容压缩包里带一层目录的情况
  const byName = new Map<string, Uint8Array>();
  for (const [path, data] of Object.entries(entries)) {
    const name = path.split('/').pop();
    if (name) byName.set(name, data);
  }

  const meta = readJson(byName, FILE_META) as Partial<ExportMeta> | undefined;
  if (meta?.schemaVersion && meta.schemaVersion > SCHEMA_VERSION) {
    throw new ImportError(`备份来自更新的版本（schema ${meta.schemaVersion}），当前仅支持 ${SCHEMA_VERSION}`);
  }

  const { rules, skipped } = sanitizeRules(readJson(byName, FILE_BLACKLIST));
  const settings = sanitizeSettings(readJson(byName, FILE_SETTINGS));

  if (!byName.has(FILE_BLACKLIST) && !byName.has(FILE_SETTINGS)) {
    throw new ImportError(`压缩包里没有 ${FILE_BLACKLIST} 或 ${FILE_SETTINGS}`);
  }

  return { blacklist: rules, settings, meta, skipped };
}

/** 合并规则：按 domain 去重，保留 base 中已有的顺序 */
export function mergeRules(base: readonly BlacklistRule[], incoming: readonly BlacklistRule[]): BlacklistRule[] {
  const seen = new Set(base.map((rule) => rule.domain));
  const merged = [...base];

  for (const rule of incoming) {
    if (seen.has(rule.domain)) continue;
    seen.add(rule.domain);
    merged.push(rule);
  }

  return merged;
}
