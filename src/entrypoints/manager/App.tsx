import { useState } from 'react';

import BlacklistSection from './sections/BlacklistSection';
import DataSection from './sections/DataSection';
import SettingsSection from './sections/SettingsSection';

const TABS = [
  { id: 'blacklist', label: '黑名单' },
  { id: 'settings', label: '设置' },
  { id: 'data', label: '数据' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function App() {
  const [tab, setTab] = useState<TabId>('blacklist');

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">Extension Private</h1>
        <nav className="app__tabs">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`app__tab${tab === item.id ? ' app__tab--active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app__body">
        {tab === 'blacklist' && <BlacklistSection />}
        {tab === 'settings' && <SettingsSection />}
        {tab === 'data' && <DataSection />}
      </main>
    </div>
  );
}

export default App;
