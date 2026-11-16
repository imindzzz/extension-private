import { settingsItem } from '@/lib/storage';
import { COPY_FORMAT_LABELS, type CopyFormat, type Settings } from '@/lib/types';

import { useStorageItem } from '../useStorageItem';

const COPY_FORMATS = Object.keys(COPY_FORMAT_LABELS) as CopyFormat[];
const PLAYBACK_STEPS = [0.25, 0.5, 1, 2];

function SettingsSection() {
  const { value: settings, update, loaded } = useStorageItem(settingsItem);

  if (!loaded || !settings) return <p className="muted">读取中…</p>;

  const patch = (partial: Partial<Settings>) => update({ ...settings, ...partial });

  return (
    <section className="section">
      <div className="section__head">
        <h2>设置</h2>
        <p className="muted">修改后立即写入本地存储，其他页面与弹窗会同步生效。</p>
      </div>

      <div className="field">
        <span className="field__label">Alt + C 复制格式</span>
        <div className="field__options">
          {COPY_FORMATS.map((format) => (
            <label key={format} className="radio">
              <input
                type="radio"
                name="copyFormat"
                checked={settings.copyFormat === format}
                onChange={() => patch({ copyFormat: format })}
              />
              {COPY_FORMAT_LABELS[format]}
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="playback-step">
          B 站倍速步长
        </label>
        <select
          id="playback-step"
          className="input input--narrow"
          value={settings.playbackStep}
          onChange={(event) => patch({ playbackStep: Number(event.target.value) })}
        >
          {PLAYBACK_STEPS.map((step) => (
            <option key={step} value={step}>
              +{step}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="check">
          <input
            type="checkbox"
            checked={settings.blacklistEnabled}
            onChange={(event) => patch({ blacklistEnabled: event.target.checked })}
          />
          启用黑名单拦截
        </label>
        <p className="muted">关闭后所有规则保留但不生效，页面不再被拦截。</p>
      </div>

      <div className="field">
        <label className="check">
          <input
            type="checkbox"
            checked={settings.pauseMediaOnBlock}
            onChange={(event) => patch({ pauseMediaOnBlock: event.target.checked })}
          />
          拦截时暂停页面上的音视频
        </label>
      </div>
    </section>
  );
}

export default SettingsSection;
