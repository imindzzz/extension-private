import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';

import { findMatchingRule, normalizeDomain, toWildcardDomain } from '@/lib/blacklist';
import { createRuleId } from '@/lib/id';
import { blacklistItem, settingsItem } from '@/lib/storage';
import type { BlacklistRule } from '@/lib/types';

function App() {
  const [host, setHost] = useState<string | null>(null);
  const [hit, setHit] = useState<BlacklistRule | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const [tabs, settings, rules] = await Promise.all([
        browser.tabs.query({ active: true, currentWindow: true }),
        settingsItem.getValue(),
        blacklistItem.getValue(),
      ]);

      const url = tabs[0]?.url;
      let hostname: string | null = null;
      if (url) {
        try {
          hostname = new URL(url).hostname || null;
        } catch {
          hostname = null;
        }
      }

      setHost(hostname);
      setEnabled(settings.blacklistEnabled);
      setHit(url ? findMatchingRule(url, rules) : null);
    })();
  }, []);

  const addDomain = async (domain: string) => {
    const rules = await blacklistItem.getValue();
    if (rules.some((rule) => rule.domain === domain)) return;

    const rule: BlacklistRule = { id: createRuleId(), domain, source: 'popup', createdAt: Date.now() };
    await blacklistItem.setValue([...rules, rule]);
    setHit(rule);
  };

  const toggleCurrent = async () => {
    if (!host) return;
    setBusy(true);
    try {
      if (hit) {
        const rules = await blacklistItem.getValue();
        await blacklistItem.setValue(rules.filter((rule) => rule.id !== hit.id));
        setHit(null);
      } else {
        const domain = normalizeDomain(host);
        if (domain) await addDomain(domain);
      }
    } finally {
      setBusy(false);
    }
  };

  const blockWholeSite = async () => {
    if (!host) return;
    setBusy(true);
    try {
      const domain = toWildcardDomain(host);
      if (domain) await addDomain(domain);
    } finally {
      setBusy(false);
    }
  };

  const openManager = () => {
    void browser.tabs.create({ url: browser.runtime.getURL('/manager.html') });
  };

  return (
    <main className="popup">
      <h1>Extension Private</h1>

      {host ? (
        <>
          <p className="popup__host">{host}</p>
          <p className={hit ? 'popup__state popup__state--blocked' : 'popup__state'}>
            {hit ? `已拦截（规则 ${hit.domain}）` : '未在黑名单中'}
          </p>

          {!enabled && <p className="popup__warn">黑名单总开关已关闭，规则不会生效</p>}

          <div className="popup__actions">
            <button className="btn btn--primary" type="button" disabled={busy} onClick={() => void toggleCurrent()}>
              {hit ? '移出黑名单' : '加入黑名单'}
            </button>
            {!hit && (
              <button className="btn" type="button" disabled={busy} onClick={() => void blockWholeSite()}>
                拦整站
              </button>
            )}
          </div>
        </>
      ) : (
        <p className="popup__state">当前页面不支持</p>
      )}

      <button className="link" type="button" onClick={openManager}>
        打开管理界面
      </button>
    </main>
  );
}

export default App;
