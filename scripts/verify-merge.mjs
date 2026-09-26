import { mergeSuggestionsIntoParagraph } from '../node_modules/.cache/merge.mjs'

let failures = 0
const assert = (name, condition, detail) => {
  if (condition) console.log(`  ✓ ${name}`)
  else { failures += 1; console.error(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`) }
}

// 场景 1：同段两条引用不重叠，按锚点顺序合并，互不覆盖
{
  const base = '本文收集 12 个活跃开源项目连续 18 个月的议题记录，并访谈 26 位核心维护者。'
  const result = mergeSuggestionsIntoParagraph(base, [
    { id: 'c8', quote: '12 个活跃开源项目', replacement: 'GitHub 平台上 12 个活跃开源项目', baseText: base, createdAt: 2 },
    { id: 'c7', quote: '26 位核心维护者', replacement: '26 位来自 9 个国家的核心维护者', baseText: base, createdAt: 1 },
  ])
  assert('不重叠的两条建议都生效', result.acceptedIds.length === 2, JSON.stringify(result))
  assert('按锚点位置顺序合并（与提交顺序无关）', result.text === '本文收集 GitHub 平台上 12 个活跃开源项目连续 18 个月的议题记录，并访谈 26 位来自 9 个国家的核心维护者。', result.text)
  assert('无冲突', result.blocked.length === 0, JSON.stringify(result.blocked))
}

// 场景 2：引用重复，只接受第一条，第二条停下并说明原因
{
  const base = '在高活跃度项目中，维护者更关注建议是否可验证，而非建议生成速度。'
  const result = mergeSuggestionsIntoParagraph(base, [
    { id: 'c11', quote: '建议是否可验证，而非建议生成速度', replacement: '建议的可验证性与适用范围，而非建议的生成速度', baseText: base, createdAt: 1 },
    { id: 'c12', quote: '建议是否可验证，而非建议生成速度', replacement: '建议的可验证性，而不仅是建议生成的速度', baseText: base, createdAt: 2 },
  ])
  assert('引用重复：仅先处理的一条生效', result.acceptedIds.length === 1 && result.acceptedIds[0] === 'c11', JSON.stringify(result.acceptedIds))
  assert('引用重复：第二条被阻止且原因正确', result.blocked.length === 1 && result.blocked[0].id === 'c12' && result.blocked[0].reason.includes('引用重复'), JSON.stringify(result.blocked))
  assert('引用重复：正文采用第一条改写', result.text === '在高活跃度项目中，维护者更关注建议的可验证性与适用范围，而非建议的生成速度。', result.text)
}

// 场景 3：范围重叠（引用不同但落在前一条改写范围），第一条生效、第二条停下
{
  const base = '我们采用混合研究方法，将议题生命周期划分为响应、评审与合并三个阶段。编码过程由两名研究者独立完成。'
  const result = mergeSuggestionsIntoParagraph(base, [
    { id: 'c9', quote: '将议题生命周期划分为响应、评审与合并三个阶段', replacement: '将议题生命周期划分为受理、分派、响应、评审与合并五个阶段', baseText: base, createdAt: 1 },
    { id: 'c10', quote: '响应、评审与合并三个阶段', replacement: '分派、响应、评审与合并四个阶段', baseText: base, createdAt: 2 },
  ])
  assert('范围重叠：左侧锚点建议先生效', result.acceptedIds.length === 1 && result.acceptedIds[0] === 'c9', JSON.stringify(result))
  assert('范围重叠：第二条被阻止且原因正确', result.blocked.length === 1 && result.blocked[0].id === 'c10' && result.blocked[0].reason.includes('范围重叠'), JSON.stringify(result.blocked))
  assert('范围重叠：其余内容保留，未被覆盖', result.text === '我们采用混合研究方法，将议题生命周期划分为受理、分派、响应、评审与合并五个阶段。编码过程由两名研究者独立完成。', result.text)
}

// 场景 4：前一条改写后引用在当前文本中消失（初始范围与前一条不重叠）
{
  const base = '句子一。句子二。句子三。'
  const result = mergeSuggestionsIntoParagraph(base, [
    { id: 'a', quote: '句子二。', replacement: '全新内容。', baseText: base, createdAt: 1 },
    { id: 'b', quote: '子二', replacement: 'XX', baseText: base, createdAt: 2 },
  ])
  // '子二' 的初始范围 [3,5) 与 '句子二。' [2,5) 重叠，先命中范围重叠分支
  assert('已被改写：第一条生效', result.acceptedIds[0] === 'a', JSON.stringify(result))
  assert('已被改写：第二条被阻止且原因正确', result.blocked[0]?.id === 'b' && result.blocked[0].reason.includes('范围重叠'), JSON.stringify(result.blocked))
}

// 场景 6：提交后作者已手动改写正文，baseText 中的锚点在当前文本里找不到（非本批次改写所致）
{
  const base = '旧的段落原文，包含引用片段。'
  const current = '作者已手动重写过这段文字。'
  const result = mergeSuggestionsIntoParagraph(current, [
    { id: 'a', quote: '引用片段', replacement: '新片段', baseText: base, createdAt: 1 },
  ])
  assert('正文已改：不强行套用', result.acceptedIds.length === 0, JSON.stringify(result))
  assert('正文已改：在当前段落中找不到引用，提示人工核对后重试', result.blocked[0]?.reason.includes('找不到'), JSON.stringify(result.blocked))
}

// 场景 5：引用在提交时原文中出现多次，无法唯一定位
{
  const base = '建议建议建议'
  const result = mergeSuggestionsIntoParagraph(base, [
    { id: 'a', quote: '建议', replacement: '意见', baseText: base, createdAt: 1 },
  ])
  assert('多处匹配：无建议生效', result.acceptedIds.length === 0, JSON.stringify(result))
  assert('多处匹配：提示无法唯一定位', result.blocked[0]?.reason.includes('出现多次'), JSON.stringify(result.blocked))
}

// 场景 7：baseText 中唯一、当前文本因前一条改写出现多处匹配
{
  const base = '甲。乙。'
  const result = mergeSuggestionsIntoParagraph(base, [
    { id: 'a', quote: '甲', replacement: '乙', baseText: base, createdAt: 1 },
    { id: 'b', quote: '乙。', replacement: '丙。', baseText: base, createdAt: 2 },
  ])
  // a 生效后文本为 '乙。乙。'，b 的引用 '乙。' 出现两次（初始范围与 a 不重叠）
  assert('改写后多匹配：a 生效', result.acceptedIds[0] === 'a', JSON.stringify(result))
  assert('改写后多匹配：b 被阻止', result.blocked[0]?.id === 'b' && result.blocked[0].reason.includes('出现多处'), JSON.stringify(result.blocked))
}

// 场景 8：同批次中一条冲突，同段其他不相关建议照常生效
{
  const base = '开头片段，中间片段，结尾片段。'
  const result = mergeSuggestionsIntoParagraph(base, [
    { id: 'a', quote: '开头片段', replacement: '开头已改', baseText: base, createdAt: 1 },
    { id: 'b', quote: '开头片段', replacement: '重复改写', baseText: base, createdAt: 2 },
    { id: 'c', quote: '结尾片段', replacement: '结尾已改', baseText: base, createdAt: 3 },
  ])
  assert('混合批次：无冲突的 a、c 照常生效', result.acceptedIds.join() === 'a,c', JSON.stringify(result.acceptedIds))
  assert('混合批次：仅 b 被阻止', result.blocked.length === 1 && result.blocked[0].id === 'b', JSON.stringify(result.blocked))
  assert('混合批次：正文同时包含两处改写', result.text === '开头已改，中间片段，结尾已改。', result.text)
}

// 场景 9：跨批次——此前已接受过相同引用的建议，再次勾选不重复应用
{
  const base = '一段带有标记的文字。'
  const current = '一段带有【已接受】标记的文字。' // 假设此前接受把“带有标记”改成了“带有【已接受】标记”
  const result = mergeSuggestionsIntoParagraph(current, [
    { id: 'a', quote: '带有标记', replacement: '另一改写', baseText: base, createdAt: 1 },
  ], ['带有标记'])
  assert('跨批次引用重复：不再应用', result.acceptedIds.length === 0, JSON.stringify(result))
  assert('跨批次引用重复：原因正确', result.blocked[0]?.reason.includes('引用重复'), JSON.stringify(result.blocked))
}

// 场景 10：建议按锚点位置排序处理，即使数组顺序是乱的
{
  const base = 'AAA BBB CCC'
  const result = mergeSuggestionsIntoParagraph(base, [
    { id: 'c', quote: 'CCC', replacement: '3', baseText: base, createdAt: 3 },
    { id: 'a', quote: 'AAA', replacement: '1', baseText: base, createdAt: 1 },
    { id: 'b', quote: 'BBB', replacement: '2', baseText: base, createdAt: 2 },
  ])
  assert('乱序输入按锚点位置从左到右合并', result.text === '1 2 3' && result.acceptedIds.join() === 'a,b,c', `${result.text} ${result.acceptedIds.join()}`)
}

if (failures) { console.error(`\n${failures} 项验证失败`); process.exit(1) }
console.log('\n全部验证通过')
