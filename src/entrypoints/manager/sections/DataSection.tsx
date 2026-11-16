import { useRef, useState } from 'react';

import { blacklistItem, settingsItem } from '@/lib/storage';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { ImportError, buildExportZip, mergeRules, parseImportZip, type ImportResult } from '@/lib/transfer';

const pad = (value: number) => String(value).padStart(2, '0');

function stamp(): string {
  const date = new Date();
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function toBlob(bytes: Uint8Array): Blob {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy], { type: 'application/zip' });
}

function DataSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const exportAll = async () => {
    const [rules, settings] = await Promise.all([blacklistItem.getValue(), settingsItem.getValue()]);
    const bytes = buildExportZip({ blacklist: rules, settings });
    const url = URL.createObjectURL(toBlob(bytes));

    const link = document.createElement('a');
    link.href = url;
    link.download = `extension-private-${stamp()}.zip`;
    link.click();
    URL.revokeObjectURL(url);

    setError('');
    setStatus(`已导出 ${rules.length} 条规则与全部设置`);
  };

  const pickFile = async (file: File | undefined) => {
    setPreview(null);
    setStatus('');
    setError('');
    if (!file) return;

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      setPreview(parseImportZip(bytes));
    } catch (caught) {
      setError(caught instanceof ImportError ? caught.message : '导入失败：无法解析该文件');
    }
  };

  const applyImport = async () => {
    if (!preview) return;

    const [rules, settings] = await Promise.all([blacklistItem.getValue(), settingsItem.getValue()]);

    if (mode === 'replace') {
      await blacklistItem.setValue(preview.blacklist);
      await settingsItem.setValue({ ...DEFAULT_SETTINGS, ...preview.settings });
      setStatus(`已覆盖为 ${preview.blacklist.length} 条规则`);
    } else {
      await blacklistItem.setValue(mergeRules(rules, preview.blacklist));
      await settingsItem.setValue({ ...settings, ...preview.settings });
      setStatus('已合并导入，重复域名已跳过');
    }

    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const clearAll = async () => {
    if (!confirm('确定清空所有黑名单规则并恢复默认设置？此操作不可撤销。')) return;
    await blacklistItem.setValue([]);
    await settingsItem.setValue(DEFAULT_SETTINGS);
    setStatus('已清空全部数据');
    setPreview(null);
  };

  const settingKeys = preview ? Object.keys(preview.settings) : [];

  return (
    <section className="section">
      <div className="section__head">
        <h2>数据</h2>
        <p className="muted">
          导出为一个 zip，内部是 <code>manifest.json</code>、<code>blacklist.json</code>、<code>settings.json</code>{' '}
          三个文件。 导入时只读取这三个已知文件，缺失的部分跳过。
        </p>
      </div>

      <div className="block">
        <h3>导出</h3>
        <p className="muted">包含全部黑名单规则与设置。</p>
        <button className="btn btn--primary" type="button" onClick={() => void exportAll()}>
          导出 zip
        </button>
      </div>

      <div className="block">
        <h3>导入</h3>
        <input
          ref={fileRef}
          className="input"
          type="file"
          accept=".zip,application/zip"
          onChange={(event) => void pickFile(event.target.files?.[0])}
        />

        {preview && (
          <div className="preview">
            <p>
              备份共 <strong>{preview.blacklist.length}</strong> 条规则
              {preview.skipped > 0 && <span className="warn">（{preview.skipped} 条域名非法已跳过）</span>}
            </p>
            <p className="muted">
              设置项：{settingKeys.length > 0 ? settingKeys.join('、') : '无'}
              {preview.meta?.exportedAt && ` · 导出于 ${preview.meta.exportedAt}`}
            </p>

            <div className="field__options">
              <label className="radio">
                <input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} />
                合并（按域名去重）
              </label>
              <label className="radio">
                <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                覆盖（清空现有规则）
              </label>
            </div>

            <button className="btn btn--primary" type="button" onClick={() => void applyImport()}>
              确认导入
            </button>
          </div>
        )}
      </div>

      <div className="block block--danger">
        <h3>清空</h3>
        <p className="muted">删除全部规则并把设置恢复为默认值。</p>
        <button className="btn btn--danger" type="button" onClick={() => void clearAll()}>
          清空全部数据
        </button>
      </div>

      {error && <p className="feedback feedback--error">{error}</p>}
      {status && <p className="feedback">{status}</p>}
    </section>
  );
}

export default DataSection;
