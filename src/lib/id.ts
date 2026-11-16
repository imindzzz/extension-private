/** 生成规则 id，不依赖 runtime，便于在测试中直接调用 */
export function createRuleId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
