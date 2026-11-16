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
| 压缩     | fflate（数据备份的 zip 编解码）                       |

> TypeScript 固定在 5.9 而非最新的 7.x：`typescript-eslint` 8.x 的 peer 范围是 `<6.1.0`，升到 7 会让 lint 直接不可用。

## 常用命令

```bash
npm run dev          # 开发模式（不自动开浏览器，手动加载产物目录）
npm run build        # 生产构建，产物在 .output/chrome-mv3-dev
npm run zip          # 打包成可上传的 zip
npm run compile      # tsc --noEmit 类型检查
npm run lint         # ESLint
npm run lint:fix     # ESLint 自动修复
npm run format       # Prettier 格式化
npm run test         # Vitest 单测
```

首次开发需要先 `npm install`，`postinstall` 会自动执行 `wxt prepare` 生成 `.wxt/` 类型。

## 功能

| 功能              | 触发方式                       | 说明                                                          |
| ----------------- | ------------------------------ | ------------------------------------------------------------- |
| 复制页面          | 任意页面 `Alt + C`             | 格式由设置决定：标题+链接 / Markdown / 仅链接                 |
| B 站分 P 进度     | 视频页分 P 列表下方            | 已看时长 / 总时长 / 百分比，另有按步长加速按钮                |
| LeetCode 粘贴裁剪 | leetcode.cn 题目页直接粘贴     | 只保留 `leetcode start`~`end` 之间，剔除 `leetcode ignore` 行 |
| 黑名单拦截        | 右键菜单 / 扩展弹窗 / 管理界面 | 按域名拦截，先阻断子资源请求再整页遮盖，可临时放行            |

### 黑名单

- **按域名匹配**，不区分协议、端口、路径。
- `*` 是通配符，匹配任意字符：
  - `*.bilibili.com` 匹配所有子域，**不含裸域** `bilibili.com`
  - `*` 单独使用等于拦截全部
- 三个添加入口：
  - 网页右键 →「把当前域名加入黑名单」/「把当前域名及所有子域加入黑名单」/「把当前域名移出黑名单」；链接上右键可加该链接的域名
  - 点扩展图标 → 当前站点一键加入 / 移出，或「拦整站」
  - 管理界面手动输入，支持通配符
- 命中后是**两层拦截**：
  1. **网络层**：`declarativeNetRequest` 在请求发出前就 block 掉该站点的全部子资源（脚本、图片、样式、字体、媒体、接口、websocket），页面内容不会被下载。
  2. **页面层**：内容脚本先用 `visibility: hidden` 压住首屏避免白闪，再渲染拦截页；可按设置暂停音视频。
- **主文档（`main_frame`）刻意不拦**。一旦拦掉它，浏览器只会显示 `ERR_BLOCKED_BY_CLIENT`，自制拦截页和「本次仍要访问」按钮就都没有出现的时机了。HTML 本身很小，省下的流量几乎都在子资源上。
- 拦截页的三个动作都走后台，因为要等规则更新落地后再重载：
  - 「本次仍要访问」→ 写入 session 级 `allowAllRequests` 规则（随浏览器关闭失效）后重载，本次浏览期间该站点连子资源也完全放行
  - 「移出黑名单」→ 删除规则、同步网络规则后重载（首次加载时子资源已被拦掉，必须重来一次）
  - 「打开管理界面」→ 新标签页打开
- 拦截页用 `popover="manual"` 送进 **top layer**。只靠 `z-index: 2147483647` 是不够的：宿主页面任意祖先带 `transform` / `filter` / `will-change` / `contain` 都会新建层叠上下文，`position: fixed` 也会改为相对那个祖先定位，最大 z-index 只在小圈子里比较，照样被盖住。
- 网络层可以在设置里单独关掉，关掉后只剩页面遮盖。
- 已知边界：规则只按域名匹配，所以 `*.bilibili.com` 拦不住第三方 CDN（例如 B 站的 `bilivideo.com`）上的视频流。

## 管理界面

独立标签页，三个入口：扩展图标 →「打开管理界面」、右键扩展 →「选项」、拦截页上的按钮。

- **黑名单**：增删、清空、查看来源与添加时间
- **设置**：复制格式、B 站倍速步长、黑名单总开关、是否暂停音视频、是否在网络层拦截子资源
- **数据**：导出 / 导入 / 清空

## 数据与备份

全部数据存在 `storage.local`，只有两个 key：`blacklist` 与 `settings`。导出的 zip 结构：

```
extension-private-20261116-1030.zip
├─ manifest.json    # 元信息：schema 版本、导出时间、规则条数
├─ blacklist.json
└─ settings.json
```

导入时的处理规则：

- 不是 zip、JSON 损坏、`schemaVersion` 高于当前 → 直接报错并中止
- 域名非法的规则被丢弃，并提示丢弃条数
- 未知设置项与越界取值被忽略，只接受已知字段
- 支持「合并（按域名去重）」与「覆盖」两种模式，也支持只含部分文件的备份

## 调试与本地安装

`npm run dev` 和 `npm run build` **输出到同一个目录** `.output/chrome-mv3-dev`（配置见 `wxt.config.ts` 的 `outDirTemplate`），Chrome 里只需要加载一次：

1. 打开 `chrome://extensions`，右上角启用「开发者模式」
2. 「加载已解压的扩展程序」→ 选 `.output/chrome-mv3-dev`

目录里是哪个版本，完全取决于你最后运行的是哪条命令：

| 最后运行        | 目录内容 | 体积   | 特征                                                                                                                                    |
| --------------- | -------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`   | 开发版   | 3.6 MB | 含 reloader `background.js`；`content_scripts` 改为运行时注册；额外申请 `<all_urls>` 与 `http://localhost/*`；CSP 放开 `localhost:3000` |
| `npm run build` | 生产版   | 595 kB | 权限为 `storage` / `contextMenus` / `activeTab` / `declarativeNetRequest` + `<all_urls>`；`content_scripts` 由 manifest 静态声明        |

### 四个必须记住的坑

- **开发版不能当日常版本用**。它把内容脚本改成由 background 在运行时注册，依赖 `localhost:3000` 的 dev server 存活，并且权限范围明显更大。**用完 dev 想日常使用，务必再跑一次 `npm run build`。**
- **不要同时运行 dev 和 build**。两者写同一目录，会互相覆盖，dev server 的 watcher 还会把 build 产物再改回开发版。
- **`wxt clean` 会删掉 `.output`**，Chrome 里已加载的扩展会变成「已损坏」。重新 `npm run build` 后点扩展的刷新按钮即可。
- **合并后无法同时保留两份产物**。需要并排对比时，把 `outDirTemplate` 改回带 `{{modeSuffix}}` 即可恢复 `chrome-mv3` / `chrome-mv3-dev` 双目录。

改动 manifest 的权限或 content script 匹配范围后，必须重新 build 并在 `chrome://extensions` 点刷新，Chrome 不会热更新这些声明。

## 目录结构

```
src/
├─ entrypoints/
│  ├─ background.ts                 # 右键菜单：加入 / 移出黑名单
│  ├─ copy-with-title.content.ts    # Alt+C 复制
│  ├─ leetcode-paste.content.ts     # LeetCode 粘贴裁剪
│  ├─ blacklist.content/            # 黑名单拦截（刻意不用 React，控制体积）
│  │  ├─ index.ts
│  │  ├─ blocked-ui.ts
│  │  └─ style.css
│  ├─ bilibili.content/             # B 站分 P 进度（Shadow Root UI）
│  │  ├─ index.tsx
│  │  ├─ Progress.tsx
│  │  └─ style.css
│  ├─ manager/                      # 管理界面（独立标签页）
│  │  ├─ App.tsx
│  │  ├─ useStorageItem.ts
│  │  └─ sections/
│  └─ popup/                        # 工具栏弹窗
├─ lib/                             # 数据层，纯逻辑 + 单测
│  ├─ types.ts                      # BlacklistRule / Settings
│  ├─ storage.ts                    # storage.defineItem
│  ├─ blacklist.ts                  # 域名规范化与匹配
│  ├─ net-rules.ts                  # 黑名单 → DNR 正则规则
│  ├─ copy-format.ts
│  ├─ transfer.ts                   # zip 导入导出
│  └─ id.ts
└─ utils/                           # 通用纯函数
```

新增内容脚本只需在 `src/entrypoints/` 下建 `<name>.content.ts` 并默认导出 `defineContentScript({ ... })`，manifest 会自动生成。

## 权限

| 权限                    | 用途                                             |
| ----------------------- | ------------------------------------------------ |
| `storage`               | 保存黑名单规则与设置                             |
| `contextMenus`          | 右键菜单的加入 / 移出黑名单                      |
| `activeTab`             | 弹窗读取当前标签页域名（仅在点击扩展图标时授予） |
| `declarativeNetRequest` | 在请求发出前阻断黑名单站点的子资源               |
| `host_permissions: *`   | 网络层拦截必须在请求发起前匹配，域名无法预先枚举 |

`host_permissions` 为 `<all_urls>`，安装时的权限提示会变成「读取和更改您在所有网站上的数据」。这是 DNR 的前置条件：没有 host 权限就只能拿到规则能力，实际请求一条也匹配不到。

`blacklist` 内容脚本注入所有页面，但样式用 `?inline` 打进 JS，因此没有向全站暴露的 `web_accessible_resources` 文件。详细理由记录在 [CHROMEWEBSTORE.md](./CHROMEWEBSTORE.md)。

## 开发方式

- 扩展开发规范与最新 API 参考：使用 `chrome-extensions` 技能（Chrome 官方 Modern Web Guidance）。
- 查询某个 Web 平台能力怎么用：`npx modern-web-guidance@latest search <关键词>`。
- 扫描过时写法：`npx modern-web-guidance@latest legacy-scan .`
- 浏览器内的自动调试：`chrome-devtools` MCP（需在 `chrome://inspect/#remote-debugging` 手动允许远程调试）。
