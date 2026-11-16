import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  /**
   * 去掉 `{{modeSuffix}}`，让 `npm run dev` 与 `npm run build` 输出到同一个目录，
   * 这样 Chrome 里只需要加载一次 `.output/chrome-mv3-dev`，
   * 目录里是哪个版本完全取决于你最后运行的是哪条命令。
   *
   * 保留 `{{browser}}` 维度，避免 firefox 构建覆盖 chrome 的产物。
   */
  outDirTemplate: '{{browser}}-mv{{manifestVersion}}-dev',
  manifest: {
    name: 'Extension Private',
    description: '自用插件合集',
  },
});
