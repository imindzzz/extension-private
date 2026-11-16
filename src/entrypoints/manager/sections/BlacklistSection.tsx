import { useState } from 'react';

import { normalizeDomain, toWildcardDomain } from '@/lib/blacklist';
import { createRuleId } from '@/lib/id';
import { blacklistItem } from '@/lib/storage';
import type { RuleSource } from '@/lib/types';

import { useStorageItem } from '../useStorageItem';

const SOURCE_LABELS: Record<RuleSource, string> = {
  popup: '弹窗',
  'context-menu': '右键菜单',
  manager: '手动添加',
  import: '导入',
};

const pad = (value: number) => String(value).padStart(2, '0');

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function BlacklistSection() {
  const { value: rules, update, loaded } = useStorageItem(blacklistItem);
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const list = rules ?? [];

  const addRule = (input: string) => {
    const domain = normalizeDomain(input);
    if (!domain) {
      setFeedback({ ok: false, text: '域名格式不正确' });
      return;
    }
    if (list.some((rule) => rule.domain === domain)) {
      setFeedback({ ok: false, text: `${domain} 已在列表中` });
      return;
    }

    update([...list, { id: createRuleId(), domain, source: 'manager', createdAt: Date.now() }]);
    setDraft('');
    setFeedback({ ok: true, text: `已添加 ${domain}` });
  };

  const removeRule = (id: string) => {
    update(list.filter((rule) => rule.id !== id));
  };

  if (!loaded) return <p className="muted">读取中…</p>;

  return (
    <section className="section">
      <div className="section__head">
        <h2>黑名单</h2>
        <p className="muted">
          共 {list.length} 条。只按域名匹配，<code>*</code> 可匹配任意字符，例如 <code>*.bilibili.com</code>{' '}
          覆盖所有子域。
        </p>
      </div>

      <form
        className="row"
        onSubmit={(event) => {
          event.preventDefault();
          addRule(draft);
        }}
      >
        <input
          className="input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="example.com 或 *.example.com"
          spellCheck={false}
        />
        <button className="btn btn--primary" type="submit">
          添加
        </button>
        <button
          className="btn"
          type="button"
          disabled={!draft.trim()}
          onClick={() => setDraft(toWildcardDomain(normalizeDomain(draft) ?? ''))}
        >
          转成含子域
        </button>
      </form>

      {feedback && <p className={feedback.ok ? 'feedback' : 'feedback feedback--error'}>{feedback.text}</p>}

      {list.length === 0 ? (
        <p className="empty">还没有规则。可以在任意网页右键「把当前域名加入黑名单」，或在上方手动添加。</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>域名模式</th>
              <th>来源</th>
              <th>添加时间</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((rule) => (
              <tr key={rule.id}>
                <td>
                  <code>{rule.domain}</code>
                </td>
                <td className="muted">{SOURCE_LABELS[rule.source] ?? rule.source}</td>
                <td className="muted">{formatTime(rule.createdAt)}</td>
                <td className="table__actions">
                  <button className="btn btn--danger-text" type="button" onClick={() => removeRule(rule.id)}>
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {list.length > 0 && (
        <div className="section__foot">
          <button
            className="btn btn--danger"
            type="button"
            onClick={() => {
              if (confirm(`确定清空全部 ${list.length} 条规则？`)) update([]);
            }}
          >
            清空全部
          </button>
        </div>
      )}
    </section>
  );
}

export default BlacklistSection;
