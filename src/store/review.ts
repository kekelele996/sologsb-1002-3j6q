import { create } from 'zustand'
import type { Comment, CommentStatus, EditConflict, Paragraph, Reply, Role, SuggestionApplyResult, Version } from '../types'

const DRAFT_KEY = 'sologsb-1002-draft-v1'
const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

const baseParagraphs: Paragraph[] = [
  { id: 'p-01', section: '摘要', number: '1.', text: '开源软件供应链的稳定性不仅取决于代码质量，也取决于维护者能否持续识别并回应社区需求。', original: '开源软件供应链的稳定性不仅取决于代码质量，也取决于维护者能否持续识别并回应社区需求。', status: 'accepted', highlighted: false },
  { id: 'p-02', section: '1 引言', number: '2.', text: '近年来，大型语言模型被广泛用于代码生成与缺陷定位，但其在真实维护工作流中的影响仍缺少系统证据。', original: '近年来，大型语言模型被广泛用于代码生成与缺陷定位，但其在真实维护工作流中的影响仍缺少系统证据。', status: 'open', highlighted: true },
  { id: 'p-03', section: '1 引言', number: '3.', text: '本文收集 12 个活跃开源项目连续 18 个月的议题记录，并访谈 26 位核心维护者。', original: '本文收集 12 个活跃开源项目连续 18 个月的议题记录，并访谈 26 位核心维护者。', status: 'open', highlighted: true },
  { id: 'p-04', section: '2 方法', number: '4.', text: '我们采用混合研究方法，将议题生命周期划分为响应、评审与合并三个阶段。编码过程由两名研究者独立完成。', original: '我们采用混合研究方法，将议题生命周期划分为响应、评审与合并三个阶段。编码过程由两名研究者独立完成。', status: 'open', highlighted: false },
  { id: 'p-05', section: '2 方法', number: '5.', text: '当编码结果不一致时，研究者通过讨论达成一致；若仍有分歧，则邀请第三位研究者裁决。', original: '当编码结果不一致时，研究者通过讨论达成一致；若仍有分歧，则邀请第三位研究者裁决。', status: 'accepted', highlighted: true },
  { id: 'p-06', section: '3 结果', number: '6.', text: '初步结果显示，辅助工具缩短了首次响应时间，但没有显著降低维护者处理复杂议题的认知负担。', original: '初步结果显示，辅助工具缩短了首次响应时间，但没有显著降低维护者处理复杂议题的认知负担。', status: 'open', highlighted: true },
  { id: 'p-07', section: '3 结果', number: '7.', text: '在高活跃度项目中，维护者更关注建议是否可验证，而非建议生成速度。', original: '在高活跃度项目中，维护者更关注建议是否可验证，而非建议生成速度。', status: 'open', highlighted: false },
]
const baseComments: Comment[] = [
  { id: 'c-01', paragraphId: 'p-02', author: '审稿人 A', role: 'reviewer', type: 'suggestion', quote: '其在真实维护工作流中的影响', body: '建议把“影响”具体化为可观察指标。', suggestion: '近年来，大型语言模型被广泛用于代码生成与缺陷定位，但在真实维护工作流中究竟改变了哪些协作行为，仍缺少系统证据。', baseText: '近年来，大型语言模型被广泛用于代码生成与缺陷定位，但其在真实维护工作流中的影响仍缺少系统证据。', status: 'open', replies: [{ id: 'r-01', author: '作者', role: 'author', body: '可以，修改后会补充指标定义。', createdAt: Date.now() - 7200000 }], createdAt: Date.now() - 86400000 },
  { id: 'c-02', paragraphId: 'p-02', author: '审稿人 B', role: 'reviewer', type: 'comment', quote: '缺少系统证据', body: '这里的“系统证据”范围过大，建议限定为本研究覆盖的议题语料。', baseText: '近年来，大型语言模型被广泛用于代码生成与缺陷定位，但其在真实维护工作流中的影响仍缺少系统证据。', status: 'open', replies: [], createdAt: Date.now() - 64000000 },
  { id: 'c-03', paragraphId: 'p-03', author: '审稿人 A', role: 'reviewer', type: 'comment', quote: '26 位核心维护者', body: '请说明抽样方式和地域分布，避免样本选择偏差。', baseText: '本文收集 12 个活跃开源项目连续 18 个月的议题记录，并访谈 26 位核心维护者。', status: 'open', replies: [], createdAt: Date.now() - 54000000 },
  { id: 'c-04', paragraphId: 'p-04', author: '审稿人 C', role: 'reviewer', type: 'comment', quote: '两名研究者独立完成', body: '建议报告编码者间一致性系数，并明确不一致处理规则。', baseText: '我们采用混合研究方法，将议题生命周期划分为响应、评审与合并三个阶段。编码过程由两名研究者独立完成。', status: 'open', replies: [], createdAt: Date.now() - 48000000 },
  { id: 'c-05', paragraphId: 'p-05', author: '审稿人 D', role: 'reviewer', type: 'comment', quote: '邀请第三位研究者裁决', body: '与上一段重复：都在说明编码分歧如何解决，建议合并意见。', baseText: '当编码结果不一致时，研究者通过讨论达成一致；若仍有分歧，则邀请第三位研究者裁决。', status: 'open', replies: [], createdAt: Date.now() - 43000000 },
  { id: 'c-06', paragraphId: 'p-06', author: '审稿人 B', role: 'reviewer', type: 'suggestion', quote: '但没有显著降低维护者处理复杂议题的认知负担', body: '“显著”需要给出统计检验与效应量。', suggestion: '初步结果显示，辅助工具缩短了首次响应时间，但对复杂议题处理时长与自我报告认知负担均未产生统计显著影响。', baseText: '初步结果显示，辅助工具缩短了首次响应时间，但没有显著降低维护者处理复杂议题的认知负担。', status: 'open', replies: [], createdAt: Date.now() - 36000000 },
  { id: 'c-07', paragraphId: 'p-02', author: '审稿人 B', role: 'reviewer', type: 'suggestion', quote: '工作流中的影响仍缺少系统证据', body: '结论应限定到可验证的协作行为指标，与审稿人 A 的意见部分重叠。', suggestion: '近年来，大型语言模型被广泛用于代码生成与缺陷定位，但其在真实维护工作流中的具体影响仍缺少可验证的系统证据。', baseText: '近年来，大型语言模型被广泛用于代码生成与缺陷定位，但其在真实维护工作流中的影响仍缺少系统证据。', status: 'open', replies: [], createdAt: Date.now() - 30000000 },
]
const seed = typeof localStorage !== 'undefined' ? localStorage.getItem(DRAFT_KEY) : null
const parsed = seed ? JSON.parse(seed) as Partial<{ paragraphs: Paragraph[]; comments: Comment[]; versions: Version[] }> : null
const initialParagraphs = parsed?.paragraphs?.length ? parsed.paragraphs : baseParagraphs
const initialComments: Comment[] = (parsed?.comments ?? baseComments).map((comment) => ({
  ...comment,
  // 旧版本草稿没有提交时段落快照，用段落原文兜底
  baseText: comment.baseText ?? initialParagraphs.find((paragraph) => paragraph.id === comment.paragraphId)?.original ?? '',
}))
const initialVersions: Version[] = parsed?.versions ?? [
  { id: 'v-01', label: '投稿初稿 v1', createdAt: Date.now() - 1209600000, paragraphs: JSON.parse(JSON.stringify(baseParagraphs)) as Paragraph[] },
  { id: 'v-02', label: '审阅基线 v2', createdAt: Date.now() - 172800000, paragraphs: JSON.parse(JSON.stringify(baseParagraphs.map((p) => p.id === 'p-04' ? { ...p, text: `${p.text} 编码规则在预注册方案中说明。` } : p))) as Paragraph[] },
]

const persistDraft = (paragraphs: Paragraph[], comments: Comment[], versions: Version[]) => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ paragraphs, comments, versions }))
}
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const countOccurrences = (text: string, fragment: string) => {
  let count = 0
  let index = text.indexOf(fragment)
  while (index !== -1) { count += 1; index = text.indexOf(fragment, index + 1) }
  return count
}

/** 计算 next 相对 base 的公共前缀/后缀，得到最小替换区间 */
const diffReplacement = (base: string, next: string) => {
  let start = 0
  const limit = Math.min(base.length, next.length)
  while (start < limit && base[start] === next[start]) start += 1
  let endBase = base.length
  let endNext = next.length
  while (endBase > start && endNext > start && base[endBase - 1] === next[endNext - 1]) { endBase -= 1; endNext -= 1 }
  return { start, end: endBase, replacement: next.slice(start, endNext) }
}

type MergeOutcome = { text: string; range: [number, number] } | { error: string }

/**
 * 把一条建议合并进当前段落文本。建议锚定 quote（引用原文），并以提交时段落
 * baseText 为基准把整段 suggestion 归约为对 quote 的局部替换，避免整段覆盖。
 * 返回的 range 是该建议在合并后文本中“主张的范围”（引用范围与实际改动范围的并集），
 * 供后续建议判断引用范围是否重叠。
 */
const mergeSuggestionIntoText = (comment: Comment, text: string): MergeOutcome => {
  const quote = comment.quote.trim()
  if (!quote) return { error: '建议未锚定引用原文，无法定位' }
  if (!comment.suggestion) return { error: '建议内容为空' }
  const first = text.indexOf(quote)
  if (first === -1) return { error: '引用原文在当前段落中未找到，可能已被前一条建议或手动编辑改写' }
  const occurrences = countOccurrences(text, quote)
  if (occurrences > 1) return { error: `引用原文在段落中出现 ${occurrences} 次，无法唯一定位` }
  const quoteEnd = first + quote.length
  const base = comment.baseText || text
  // 段落自建议提交后未变化：直接按最小 diff 应用，等价于采用整段建议但不扩大已修改范围
  if (text === base) {
    const diff = diffReplacement(base, comment.suggestion)
    const merged = base.slice(0, diff.start) + diff.replacement + base.slice(diff.end)
    const lo = Math.min(first, diff.start)
    const hi = Math.max(quoteEnd, diff.end)
    const claimLength = (diff.start - lo) + diff.replacement.length + (hi - diff.end)
    return { text: merged, range: [lo, lo + claimLength] }
  }
  // 段落已被作者或前一条建议改动：只有当 suggestion 相对 baseText 只改了 quote 范围时才能安全局部合并
  const baseIndex = base.indexOf(quote)
  if (baseIndex !== -1 && base.indexOf(quote, baseIndex + 1) === -1) {
    const pre = base.slice(0, baseIndex)
    const post = base.slice(baseIndex + quote.length)
    if (comment.suggestion.startsWith(pre) && comment.suggestion.endsWith(post) && comment.suggestion.length >= pre.length + post.length) {
      const replacement = comment.suggestion.slice(pre.length, comment.suggestion.length - post.length)
      return { text: text.slice(0, first) + replacement + text.slice(quoteEnd), range: [first, first + replacement.length] }
    }
  }
  return { error: '建议改动超出引用范围，且段落内容自提交后已变化，无法安全合并' }
}

/** 按提交时间顺序把多条建议合并进段落，返回新数据和逐条结果（冲突条目不影响其他条目） */
const applySuggestionsToState = (state: { paragraphs: Paragraph[]; comments: Comment[] }, commentIds: string[]) => {
  const targets = Array.from(new Set(commentIds))
    .map((cid) => state.comments.find((comment) => comment.id === cid))
    .filter((comment): comment is Comment => Boolean(comment))
    .sort((a, b) => a.createdAt - b.createdAt)
  const paragraphs = state.paragraphs.map((paragraph) => ({ ...paragraph }))
  const appliedRanges = new Map<string, [number, number][]>()
  const updates = new Map<string, { status: CommentStatus; conflictReason?: string }>()
  const results: SuggestionApplyResult[] = []
  const markConflict = (commentId: string, reason: string) => {
    updates.set(commentId, { status: 'conflicted', conflictReason: reason })
    results.push({ commentId, outcome: 'conflicted', reason })
  }
  for (const comment of targets) {
    if (comment.type !== 'suggestion' || !comment.suggestion) { results.push({ commentId: comment.id, outcome: 'skipped' }); continue }
    if (comment.status !== 'open' && comment.status !== 'conflicted') { results.push({ commentId: comment.id, outcome: 'skipped' }); continue }
    const paragraph = paragraphs.find((item) => item.id === comment.paragraphId)
    if (!paragraph) { results.push({ commentId: comment.id, outcome: 'skipped' }); continue }
    if (paragraph.status === 'locked') { markConflict(comment.id, '段落已被编辑锁定，无法合并修改'); continue }
    const outcome = mergeSuggestionIntoText(comment, paragraph.text)
    if ('error' in outcome) { markConflict(comment.id, outcome.error); continue }
    const [start, end] = outcome.range
    const ranges = appliedRanges.get(paragraph.id) ?? []
    if (ranges.some(([rs, re]) => start < re && rs < end)) { markConflict(comment.id, '引用范围与本次已合并建议重叠，无法安全合并'); continue }
    paragraph.text = outcome.text
    paragraph.status = 'accepted'
    paragraph.highlighted = true
    ranges.push(outcome.range)
    appliedRanges.set(paragraph.id, ranges)
    updates.set(comment.id, { status: 'accepted', conflictReason: undefined })
    results.push({ commentId: comment.id, outcome: 'applied' })
  }
  const comments = state.comments.map((comment) => {
    const update = updates.get(comment.id)
    return update ? { ...comment, ...update } : comment
  })
  return { paragraphs, comments, results }
}

interface ReviewState {
  role: Role
  paragraphs: Paragraph[]
  comments: Comment[]
  versions: Version[]
  selectedParagraphId: string
  commentFilter: 'all' | 'open' | 'suggestion' | 'duplicate'
  revisionMode: boolean
  dirty: boolean
  conflicts: EditConflict[]
  past: { paragraphs: Paragraph[]; comments: Comment[]; versions: Version[] }[]
  future: { paragraphs: Paragraph[]; comments: Comment[]; versions: Version[] }[]
  setRole: (role: Role) => void
  selectParagraph: (id: string) => void
  setCommentFilter: (filter: ReviewState['commentFilter']) => void
  setRevisionMode: (value: boolean) => void
  updateParagraph: (id: string, text: string) => void
  addComment: (input: Pick<Comment, 'paragraphId' | 'type' | 'quote' | 'body' | 'suggestion'>) => void
  replyComment: (commentId: string, body: string) => void
  /** 单条接受（按锚定局部合并，可能返回 conflicted）或拒绝 */
  resolveSuggestion: (commentId: string, accepted: boolean) => SuggestionApplyResult[]
  /** 勾选多条建议后一次性按顺序合并，冲突条目跳过并记录原因 */
  applySuggestions: (commentIds: string[]) => SuggestionApplyResult[]
  /** 批量拒绝 */
  rejectSuggestions: (commentIds: string[]) => void
  mergeComment: (commentId: string, targetId: string) => void
  toggleLock: (paragraphId: string) => void
  createVersion: (label: string) => void
  addConflict: (conflict: EditConflict) => void
  resolveConflict: (conflictId: string, strategy: 'local' | 'remote') => void
  dismissConflict: (conflictId: string) => void
  undo: () => void
  redo: () => void
  save: () => void
  resetDemo: () => void
}

export const useReviewStore = create<ReviewState>((set, get) => {
  const record = (producer: (state: ReviewState) => Partial<ReviewState>) => set((state) => {
    const history = { paragraphs: clone(state.paragraphs), comments: clone(state.comments), versions: clone(state.versions) }
    const next = producer(state)
    const paragraphs = next.paragraphs ?? state.paragraphs
    const comments = next.comments ?? state.comments
    const versions = next.versions ?? state.versions
    persistDraft(paragraphs, comments, versions)
    return { ...next, past: [...state.past.slice(-49), history], future: [], dirty: true }
  })

  return {
    role: 'reviewer',
    paragraphs: initialParagraphs,
    comments: initialComments,
    versions: initialVersions,
    selectedParagraphId: 'p-02',
    commentFilter: 'all',
    revisionMode: false,
    dirty: false,
    conflicts: [],
    past: [],
    future: [],
    setRole: (role) => set({ role, selectedParagraphId: get().paragraphs[0]?.id ?? '' }),
    selectParagraph: (selectedParagraphId) => set({ selectedParagraphId }),
    setCommentFilter: (commentFilter) => set({ commentFilter }),
    setRevisionMode: (revisionMode) => set({ revisionMode }),
    updateParagraph: (paragraphId, text) => record((state) => ({
      paragraphs: state.paragraphs.map((paragraph) => paragraph.id === paragraphId && paragraph.status !== 'locked'
        ? { ...paragraph, text, status: 'open' as const, highlighted: true }
        : paragraph),
    })),
    addComment: (input) => record((state) => ({
      comments: [{
        ...input,
        // 保留提交建议时的段落完整内容，作为后续局部合并的基准
        baseText: state.paragraphs.find((paragraph) => paragraph.id === input.paragraphId)?.text,
        id: id('comment'),
        author: state.role === 'reviewer' ? '审稿人 A' : state.role === 'author' ? '作者' : '编辑',
        role: state.role,
        status: 'open',
        replies: [],
        createdAt: Date.now(),
      }, ...state.comments],
    })),
    replyComment: (commentId, body) => record((state) => ({
      comments: state.comments.map((comment) => comment.id === commentId ? {
        ...comment,
        replies: [...comment.replies, { id: id('reply'), author: state.role === 'author' ? '作者' : state.role === 'reviewer' ? '审稿人 A' : '编辑', role: state.role, body, createdAt: Date.now() } as Reply],
      } : comment),
    })),
    resolveSuggestion: (commentId, accepted) => {
      if (!accepted) { get().rejectSuggestions([commentId]); return [] }
      return get().applySuggestions([commentId])
    },
    applySuggestions: (commentIds) => {
      let results: SuggestionApplyResult[] = []
      record((state) => {
        const merged = applySuggestionsToState(state, commentIds)
        results = merged.results
        return { paragraphs: merged.paragraphs, comments: merged.comments }
      })
      return results
    },
    rejectSuggestions: (commentIds) => record((state) => ({
      comments: state.comments.map((comment) =>
        commentIds.includes(comment.id) && (comment.status === 'open' || comment.status === 'conflicted')
          ? { ...comment, status: 'rejected' as const, conflictReason: undefined }
          : comment),
    })),
    mergeComment: (commentId, targetId) => record((state) => ({
      comments: state.comments.map((comment) => comment.id === commentId ? { ...comment, status: 'merged', mergedInto: targetId } : comment),
    })),
    toggleLock: (paragraphId) => record((state) => ({
      paragraphs: state.paragraphs.map((paragraph) => paragraph.id === paragraphId ? {
        ...paragraph,
        status: paragraph.status === 'locked' ? 'accepted' : 'locked',
      } : paragraph),
    })),
    createVersion: (label) => record((state) => ({
      versions: [{ id: id('version'), label: label.trim() || `版本 ${state.versions.length + 1}`, createdAt: Date.now(), paragraphs: clone(state.paragraphs) }, ...state.versions],
    })),
    addConflict: (conflict) => set((state) => ({ conflicts: [conflict, ...state.conflicts] })),
    resolveConflict: (conflictId, strategy) => record((state) => {
      const conflict = state.conflicts.find((item) => item.id === conflictId)
      return {
        paragraphs: conflict && strategy === 'remote'
          ? state.paragraphs.map((paragraph) => paragraph.id === conflict.paragraphId ? { ...paragraph, text: conflict.remoteText, highlighted: true } : paragraph)
          : state.paragraphs,
        conflicts: state.conflicts.filter((item) => item.id !== conflictId),
      }
    }),
    dismissConflict: (conflictId) => set((state) => ({ conflicts: state.conflicts.filter((item) => item.id !== conflictId) })),
    undo: () => set((state) => {
      const previous = state.past.at(-1)
      if (!previous) return state
      const current = { paragraphs: clone(state.paragraphs), comments: clone(state.comments), versions: clone(state.versions) }
      persistDraft(previous.paragraphs, previous.comments, previous.versions)
      return { ...previous, past: state.past.slice(0, -1), future: [current, ...state.future], dirty: true }
    }),
    redo: () => set((state) => {
      const next = state.future[0]
      if (!next) return state
      const current = { paragraphs: clone(state.paragraphs), comments: clone(state.comments), versions: clone(state.versions) }
      persistDraft(next.paragraphs, next.comments, next.versions)
      return { ...next, past: [...state.past, current], future: state.future.slice(1), dirty: true }
    }),
    save: () => {
      persistDraft(get().paragraphs, get().comments, get().versions)
      set({ dirty: false })
    },
    resetDemo: () => {
      localStorage.removeItem(DRAFT_KEY)
      set({ paragraphs: clone(baseParagraphs), comments: clone(baseComments), versions: clone(initialVersions), conflicts: [], past: [], future: [], dirty: false })
      persistDraft(baseParagraphs, baseComments, initialVersions)
    },
  }
})
