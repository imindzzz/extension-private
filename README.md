# Extension Private

自用 Chrome 扩展合集，基于 [WXT](https://wxt.dev) + Vite 8 + React 19 构建。

## 技术栈

| 用途     | 选型                                                  |
| -------- | ----------------------------------------------------- |
| 扩展框架 | WXT 0.21（自动生成 manifest、HMR、自动重载扩展）      |
| 构建     | Vite 8                                                |
| UI       | React 19                                              |
| 语言     | TypeScript 5.9（strict + `noUncheckedIndexedAccess`） |
| 校验     | ESLint 10（flat config）+ Prettier 3                  |
| 测试     | Vitest 5                                              |

> TypeScript 固定在 5.9 而非最新的 7.x：`typescript-eslint` 8.x 的 peer 范围是 `<6.1.0`，升到 7 会让 lint 直接不可用。

## 常用命令

```bash
npm run dev          # 开发模式，自带热更新，自动打开 Chrome
npm run build        # 生产构建，产物在 .output/chrome-mv3
npm run zip          # 打包成可上传的 zip
npm run compile      # tsc --noEmit 类型检查
npm run lint         # ESLint
npm run lint:fix     # ESLint 自动修复
npm run format       # Prettier 格式化
npm run test         # Vitest 单测
```

首次开发需要先 `npm install`，`postinstall` 会自动执行 `wxt prepare` 生成 `.wxt/` 类型。

## 目录结构

```
src/
├─ entrypoints/                     # 文件名即 manifest 声明，WXT 自动识别
│  ├─ copy-with-title.content.ts    # Alt+C 复制「标题 + 链接」
│  ├─ leetcode-paste.content.ts     # LeetCode 粘贴裁剪
│  ├─ blacklist.content.ts          # 黑名单骨架（TODO）
│  ├─ bilibili.content/             # B 站分 P 观看进度（Shadow Root UI）
│  │  ├─ index.tsx
│  │  ├─ Progress.tsx
│  │  └─ style.css
│  ├─ popup/                        # 工具栏弹窗
│  └─ options/                      # 选项页
└─ utils/                           # 纯函数，配 *.test.ts
```

新增一个内容脚本只需在 `src/entrypoints/` 下建 `<name>.content.ts` 并默认导出 `defineContentScript({ ... })`，manifest 会自动生成，无需手写。

## 权限说明

扩展不申请任何 `permissions`，能力全部来自内容脚本的注入范围。每项注入范围的理由记录在 [CHROMEWEBSTORE.md](./CHROMEWEBSTORE.md)。

## 开发方式

- 扩展开发规范与最新 API 参考：使用 `chrome-extensions` 技能（Chrome 官方 Modern Web Guidance）。
- 查询某个 Web 平台能力怎么用：`npx modern-web-guidance@latest search <关键词>`。
- 扫描过时写法：`npx modern-web-guidance@latest legacy-scan .`
- 浏览器内的自动调试：`chrome-devtools` MCP（需在 `chrome://inspect/#remote-debugging` 手动允许远程调试）。
