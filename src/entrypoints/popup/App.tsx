const FEATURES = [
  { name: '复制标题 + 链接', trigger: '任意页面 Alt + C' },
  { name: 'B 站分 P 观看进度', trigger: 'bilibili 视频页，分 P 列表下方' },
  { name: 'LeetCode 粘贴剔除调试代码', trigger: 'leetcode.cn 题目页直接粘贴' },
  { name: '黑名单拦截', trigger: '尚未实现' },
];

function App() {
  return (
    <main className="popup">
      <h1>Extension Private</h1>
      <ul>
        {FEATURES.map((feature) => (
          <li key={feature.name}>
            <strong>{feature.name}</strong>
            <span>{feature.trigger}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default App;
