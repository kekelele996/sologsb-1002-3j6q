export interface MergeItem {
  id: string
  quote: string
  replacement: string
  /** 建议提交时该段落的原文快照 */
  baseText: string
  createdAt: number
}

export interface MergeBlock {
  id: string
  reason: string
}

export interface MergeResult {
  text: string
  acceptedIds: string[]
  blocked: MergeBlock[]
}

const countOccurrences = (text: string, quote: string) => {
  if (!quote) return 0
  let count = 0
  let cursor = text.indexOf(quote)
  while (cursor !== -1) { count += 1; cursor = text.indexOf(quote, cursor + 1) }
  return count
}

const overlaps = (start: number, end: number, ranges: { start: number; end: number }[]) =>
  ranges.some((range) => start < range.end && end > range.start)

/**
 * 把同一段落的一组建议按引用锚点顺序合并进段落文本。
 * - 引用必须能在提交时原文中唯一定位；
 * - 与本批次已接受建议引用重复 / 初始范围重叠，或引用已被前一条改写、
 *   前一条改写后出现多处匹配时，停止该条并给出冲突原因；
 * - 其余建议照常处理，互不影响。
 *
 * @param previousAcceptedQuotes 此前批次已接受建议在本段落的引用，用于识别跨批次引用重复
 */
export function mergeSuggestionsIntoParagraph(
  paragraphText: string,
  items: MergeItem[],
  previousAcceptedQuotes: string[] = [],
): MergeResult {
  const acceptedIds: string[] = []
  const blocked: MergeBlock[] = []
  let workingText = paragraphText
  const appliedRanges: { start: number; end: number }[] = []

  // 组内按引用在提交时原文中的位置从左到右顺序合并
  const ordered = items
    .map((item) => ({ item, anchor: (item.baseText ?? paragraphText).indexOf(item.quote) }))
    .sort((a, b) => {
      if (a.anchor !== b.anchor) return a.anchor === -1 ? 1 : b.anchor === -1 ? -1 : a.anchor - b.anchor
      return a.item.createdAt - b.item.createdAt
    })

  for (const { item } of ordered) {
    const { quote, replacement } = item

    if (!quote) { blocked.push({ id: item.id, reason: '该建议没有锚定引用原文，无法唯一定位修改范围' }); continue }

    // 1) 以提交时段落原文为基准，保证锚点不被其他建议或正文改动悄悄挪动
    const initialText = item.baseText ?? paragraphText
    const initialIndex = initialText.indexOf(quote)
    if (initialIndex === -1) { blocked.push({ id: item.id, reason: '提交时的段落原文中找不到这段引用，可能正文已被改写，请人工核对后重试' }); continue }
    if (countOccurrences(initialText, quote) > 1) { blocked.push({ id: item.id, reason: '这段引用在提交时原文中出现多次，无法唯一定位，请收窄引用范围' }); continue }

    // 2) 初始范围与已接受建议重叠：引用重复或范围重叠
    const initialRange = { start: initialIndex, end: initialIndex + quote.length }
    if (overlaps(initialRange.start, initialRange.end, appliedRanges) || previousAcceptedQuotes.includes(quote)) {
      const duplicated = appliedRanges.length > 0
        && acceptedIds.some((acceptedId) => items.find((candidate) => candidate.id === acceptedId)?.quote === quote)
      blocked.push({ id: item.id, reason: duplicated || previousAcceptedQuotes.includes(quote)
        ? '该引用与已接受的建议引用重复，未再次应用'
        : '引用范围与前一条已接受建议的改写范围重叠，合并在此停止，请人工合并后重试' })
      continue
    }

    // 3) 在当前工作文本中重新定位：
    //    同批次已接受建议只会改动各自引用范围内的字符，范围外的引用一定还在，
    //    因此 0 匹配意味着建议提交后正文被手动编辑过；多匹配则可能由前一条改写引入。
    const liveOccurrences = countOccurrences(workingText, quote)
    if (liveOccurrences === 0) { blocked.push({ id: item.id, reason: '当前段落中已找不到这段引用，正文在建议提交后被改写过，合并在此停止，请人工核对后重试' }); continue }
    if (liveOccurrences > 1) { blocked.push({ id: item.id, reason: '按前一条建议改写后该引用在当前段落中出现多处，无法唯一定位，合并在此停止' }); continue }

    const liveIndex = workingText.indexOf(quote)
    workingText = `${workingText.slice(0, liveIndex)}${replacement}${workingText.slice(liveIndex + quote.length)}`
    appliedRanges.push(initialRange)
    acceptedIds.push(item.id)
  }

  return { text: workingText, acceptedIds, blocked }
}
