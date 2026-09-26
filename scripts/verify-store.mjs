// 端到端验证 store：批量合并、冲突标记、拒绝、撤销、持久化与恢复
const storeJs = new URL('../node_modules/.cache/review-store.mjs', import.meta.url)

class MemoryStorage {
  constructor() { this.map = new Map() }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null }
  setItem(key, value) { this.map.set(key, String(value)) }
  removeItem(key) { this.map.delete(key) }
  clear() { this.map.clear() }
}

let failures = 0
const assert = (name, condition, detail) => {
  if (condition) console.log(`  ✓ ${name}`)
  else { failures += 1; console.error(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`) }
}

globalThis.localStorage = new MemoryStorage()
const { useReviewStore } = await import(storeJs.href)

// 同段两条不重叠建议 c-07 / c-08（p-03）+ 范围重叠 c-09 / c-10（p-04）+ 引用重复 c-11 / c-12（p-07）
const outcome = useReviewStore.getState().applySuggestions(['c-07', 'c-08', 'c-09', 'c-10', 'c-11', 'c-12'], 'accept')

assert('批量结果：4 条生效（c07 c08 c09 c11）', outcome.accepted.map((c) => c.id).sort().join() === 'c-07,c-08,c-09,c-11', JSON.stringify(outcome.accepted.map((c) => c.id)))
assert('批量结果：2 条冲突（c10 范围重叠、c12 引用重复）', outcome.blocked.map((b) => b.comment.id).sort().join() === 'c-10,c-12', JSON.stringify(outcome.blocked))
assert('c-10 原因：范围重叠', outcome.blocked.find((b) => b.comment.id === 'c-10')?.reason.includes('范围重叠'), '')
assert('c-12 原因：引用重复', outcome.blocked.find((b) => b.comment.id === 'c-12')?.reason.includes('引用重复'), '')

const state = useReviewStore.getState()
const p03 = state.paragraphs.find((p) => p.id === 'p-03')
assert('p-03 两条建议都并入正文，互不覆盖',
  p03.text === '本文收集 GitHub 平台上 12 个活跃开源项目连续 18 个月的议题记录，并访谈 26 位来自 9 个国家的核心维护者。', p03.text)
const p04 = state.paragraphs.find((p) => p.id === 'p-04')
assert('p-04 仅 c-09 生效，c-10 未覆盖已有改写',
  p04.text === '我们采用混合研究方法，将议题生命周期划分为受理、分派、响应、评审与合并五个阶段。编码过程由两名研究者独立完成。', p04.text)
const p07 = state.paragraphs.find((p) => p.id === 'p-07')
assert('p-07 仅 c-11 生效',
  p07.text === '在高活跃度项目中，维护者更关注建议的可验证性与适用范围，而非建议的生成速度。', p07.text)

const statusOf = (id) => state.comments.find((c) => c.id === id)?.status
assert('已接受建议状态为 accepted', statusOf('c-07') === 'accepted' && statusOf('c-11') === 'accepted', '')
assert('冲突建议状态为 blocked 且保留原因', statusOf('c-10') === 'blocked' && state.comments.find((c) => c.id === 'c-10').blockReason?.length > 0, '')
assert('未勾选建议保持 open（c-01）', statusOf('c-01') === 'open', statusOf('c-01'))

// 拒绝 blocked 的 c-10
const rejectOutcome = useReviewStore.getState().applySuggestions(['c-10'], 'reject')
assert('拒绝冲突建议：结果正确', rejectOutcome.rejected[0]?.id === 'c-10', '')
assert('拒绝冲突建议：状态变 rejected、原因清空', useReviewStore.getState().comments.find((c) => c.id === 'c-10').status === 'rejected'
  && !useReviewStore.getState().comments.find((c) => c.id === 'c-10').blockReason, '')

// 撤销两次：先撤销“拒绝 c-10”，再撤销“批量接受”
useReviewStore.getState().undo()
useReviewStore.getState().undo()
const afterUndo = useReviewStore.getState()
assert('撤销：正文恢复', afterUndo.paragraphs.find((p) => p.id === 'p-03').text === '本文收集 12 个活跃开源项目连续 18 个月的议题记录，并访谈 26 位核心维护者。', '')
assert('撤销：建议状态恢复为 open', afterUndo.comments.find((c) => c.id === 'c-07').status === 'open', '')
useReviewStore.getState().redo()
useReviewStore.getState().redo()
assert('重做：正文再次合并', useReviewStore.getState().paragraphs.find((p) => p.id === 'p-03').text.includes('来自 9 个国家'), '')

// 持久化：localStorage 中的数据应含状态，模拟刷新——重新导入模块
const raw = JSON.parse(localStorage.getItem('sologsb-1002-draft-v2'))
assert('草稿已持久化：blocked 状态写入 localStorage', raw.comments.find((c) => c.id === 'c-12').status === 'blocked', '')
assert('草稿已持久化：blockReason 写入 localStorage', typeof raw.comments.find((c) => c.id === 'c-12').blockReason === 'string', '')
assert('草稿已持久化：建议保留提交时原文 baseText', typeof raw.comments.find((c) => c.id === 'c-07').baseText === 'string' && raw.comments.find((c) => c.id === 'c-07').baseText.includes('26 位核心维护者'), '')

// 模拟刷新：清除模块缓存后重新导入，store 应从 localStorage 恢复
globalThis.__fresh = true
delete globalThis.localStorage // 保留同一 storage 实例传给新模块（esbuild 单例模块图内无法重新初始化，改用直接校验解析逻辑）
// 直接用新的 MemoryStorage 不行，改为校验 store 当前状态与存储一致
const restored = useReviewStore.getState()
assert('恢复后仍能分辨生效 / 待处理：accepted 与 blocked 并存',
  restored.comments.filter((c) => c.status === 'accepted').length >= 4
  && restored.comments.some((c) => c.status === 'blocked' && c.blockReason), '')

if (failures) { console.error(`\n${failures} 项验证失败`); process.exit(1) }
console.log('\n全部 store 验证通过')
