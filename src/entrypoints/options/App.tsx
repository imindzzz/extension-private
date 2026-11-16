import { browser } from 'wxt/browser';

const manifest = browser.runtime.getManifest();

function App() {
  return (
    <main className="options">
      <h1>{manifest.name}</h1>
      <p>{manifest.description}</p>
      <dl>
        <dt>版本</dt>
        <dd>{manifest.version}</dd>
        <dt>Manifest</dt>
        <dd>V{manifest.manifest_version}</dd>
      </dl>
      <p className="hint">
        构建：<code>npm run dev</code> / <code>npm run build</code>
      </p>
    </main>
  );
}

export default App;
