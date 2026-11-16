# Chrome Web Store Listing — Extension Private

> Last Updated: 2026-11-16
> 状态：**私有分发，暂不上架**。本文档用于记录权限理由与合规信息，若后续发布可直接对照填写。

## Store Listing

**Extension Name**

Extension Private

**Short Description**

自用插件合集：复制标题链接、B 站分 P 进度、LeetCode 粘贴裁剪。

**Detailed Description**

一组日常自用的浏览器小工具，装在本机浏览器里长期使用。

复制标题与链接：在任意页面按 Alt + C，把「页面标题 + 当前网址」一起复制到剪贴板，贴到聊天窗口时不会丢掉出处。

B 站分 P 观看进度：在 B 站视频页的分 P 列表下方显示已看时长、总时长与百分比，并提供一个每按一次加一档的倍速按钮。

LeetCode 粘贴裁剪：从本地编辑器往 LeetCode 粘贴代码时，自动只保留 `leetcode start` 与 `leetcode end` 之间、并剔除标了 `leetcode ignore` 的行，省去手动删测试代码的动作。

扩展不联网、不上传任何内容，所有处理都在本机浏览器内完成。

**Category**

Developer Tools

**Single Purpose**

在浏览网页时提供若干本地化的小工具（复制链接、展示播放进度、清理粘贴内容）。

**Primary Language**

Chinese (Simplified)

## Graphics & Assets

| Asset            | Dimensions          | Status         | Filename              |
| ---------------- | ------------------- | -------------- | --------------------- |
| Store Icon       | 128×128 PNG         | ✅ Ready       | `public/icon/128.png` |
| Screenshot 1     | 1280×800 或 640×400 | ⬜ Not created |                       |
| Screenshot 2     | 1280×800 或 640×400 | ⬜ Not created |                       |
| Small Promo Tile | 440×280             | ⬜ Not created |                       |

## Permissions Justification

扩展**不申请任何 `permissions`**（无 `storage`、无 `tabs`、无 `scripting`、无 `activeTab`）。
全部能力仅来自内容脚本的注入范围：

| Permission（manifest 字段）                                | Type           | Justification                                                           |
| ---------------------------------------------------------- | -------------- | ----------------------------------------------------------------------- |
| `content_scripts.matches: https://www.bilibili.com/video*` | content script | 在 B 站视频页读取分 P 列表的时长文本并展示观看进度，仅在视频页注入      |
| `content_scripts.matches: https://leetcode.cn/problems/*`  | content script | 在 LeetCode 题目页拦截粘贴事件，裁剪带标记的代码块，仅在题目页注入      |
| `content_scripts.matches: <all_urls>`（copy-with-title）   | content script | Alt + C 需在用户任意当前页面生效，无法预先枚举域名                      |
| `content_scripts.matches: <all_urls>`（blacklist）         | content script | 黑名单功能需在任意站点尽早生效；当前为**未启用骨架**，命中逻辑尚未实现  |
| `web_accessible_resources: content-scripts/bilibili.css`   | resource       | Shadow Root UI 的样式表需要在页面上下文中加载，仅对 `bilibili.com` 暴露 |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

扩展只在本地读取当前页面的 DOM（标题、网址、播放列表时长、剪贴板文本），不写入磁盘、不发送网络请求、不做遥测。

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL**

Not applicable — 本地处理、无数据收集、无服务器，且当前不上架。

## Distribution

**Visibility**: Private（仅本机加载）
**Regions**: Not applicable

## Developer Info

**Publisher Name**

imindzzz

**Contact Email**

（未上架，无需填写）

**Support URL / Email**

https://github.com/imindzzz

## Version History

| Version | Date       | Changes                                                                    | Status |
| ------- | ---------- | -------------------------------------------------------------------------- | ------ |
| 0.1.0   | 2026-11-16 | 从 Plasmo 迁移到 WXT 0.21 / Vite 8 / React 19；补 lint、类型检查与单元测试 | Draft  |

## Review Notes

### Known Issues / Limitations

- `blacklist` 内容脚本目前是空骨架，已在代码中标注 TODO；如需上架建议先删除该 entrypoint，避免为未实现功能申请全站注入范围。
- B 站倍速按钮直接修改 `video.playbackRate`，与站点播放器自身的倍速状态不联动，切换分 P 后会被重置。
- 图标由 512×512 源图生成 16/32/48/96/128 五档。

### Rejection History

（无）
