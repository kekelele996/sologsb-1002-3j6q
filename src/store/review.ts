import { create } from 'zustand'
import type { Comment, EditConflict, Paragraph, Reply, Role, SuggestionBatchOutcome, Version } from '../types'
import { mergeSuggestionsIntoParagraph } from '../utils/merge'

const DRAFT_KEY = 'sologsb-1002-draft-v2'
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
const now = Date.now()
const baseComments: Comment[] = [
  { id: 'c-01', paragraphId: 'p-02', author: '审稿人 A', role: 'reviewer', type: 'suggestion', quote: '但其在真实维护工作流中的影响仍缺少系统证据', body: '建议把“影响”具体化为可观察指标。', suggestion: '但在真实维护工作流中究竟改变了哪些协作行为，仍缺少系统证据', baseText: baseParagraphs[1].text, status: 'open', replies: [{ id: 'r-01', author: '作者', role: 'author', body: '可以，修改后会补充指标定义。', createdAt: now - 7200000 }], createdAt: now - 86400000 },
  { id: 'c-02', paragraphId: 'p-02', author: '审稿人 B', role: 'reviewer', type: 'comment', quote: '缺少系统证据', body: '这里的“系统证据”范围过大，建议限定为本研究覆盖的议题语料。', status: 'open', replies: [], createdAt: now - 64000000 },
  { id: 'c-03', paragraphId: 'p-03', author: '审稿人 A', role: 'reviewer', type: 'comment', quote: '26 位核心维护者', body: '请说明抽样方式和地域分布，避免样本选择偏差。', status: 'open', replies: [], createdAt: now - 54000000 },
  // 与 c-08 锚定同一段落中互不重叠的两个片段，可按顺序合并
  { id: 'c-07', paragraphId: 'p-03', author: '审稿人 B', role: 'reviewer', type: 'suggestion', quote: '26 位核心维护者', body: '补充受访者范围。', suggestion: '26 位来自 9 个国家的核心维护者', baseText: baseParagraphs[2].text, status: 'open', replies: [], createdAt: now - 46000000 },
  { id: 'c-08', paragraphId: 'p-03', author: '审稿人 C', role: 'reviewer', type: 'suggestion', quote: '12 个活跃开源项目', body: '交代项目筛选来源。', suggestion: 'GitHub 平台上 12 个活跃开源项目', baseText: baseParagraphs[2].text, status: 'open', replies: [], createdAt: now - 45000000 },
  { id: 'c-04', paragraphId: 'p-04', author: '审稿人 C', role: 'reviewer', type: 'comment', quote: '两名研究者独立完成', body: '建议报告编码者间一致性系数，并明确不一致处理规则。', status: 'open', replies: [], createdAt: now - 48000000 },
  // c-09 与 c-10 锚定范围重叠：接受前一条后，后一条的引用仍在但落在已改写范围，应停下报冲突
  { id: 'c-09', paragraphId: 'p-04', author: '审稿人 A', role: 'reviewer', type: 'suggestion', quote: '将议题生命周期划分为响应、评审与合并三个阶段', body: '统一术语表述。', suggestion: '将议题生命周期划分为受理、分派、响应、评审与合并五个阶段', baseText: baseParagraphs[3].text, status: 'open', replies: [], createdAt: now - 40000000 },
  { id: 'c-10', paragraphId: 'p-04', author: '审稿人 D', role: 'reviewer', type: 'suggestion', quote: '响应、评审与合并三个阶段', body: '建议补上分派环节，并明确各阶段时长。', suggestion: '分派、响应、评审与合并四个阶段', baseText: baseParagraphs[3].text, status: 'open', replies: [], createdAt: now - 39000000 },
  { id: 'c-05', paragraphId: 'p-05', author: '审稿人 D', role: 'reviewer', type: 'comment', quote: '邀请第三位研究者裁决', body: '与上一段重复：都在说明编码分歧如何解决，建议合并意见。', status: 'open', replies: [], createdAt: now - 43000000 },
  { id: 'c-06', paragraphId: 'p-06', author: '审稿人 B', role: 'reviewer', type: 'suggestion', quote: '但没有显著降低维护者处理复杂议题的认知负担', body: '“显著”需要给出统计检验与效应量。', suggestion: '但对复杂议题处理时长与自我报告认知负担均未产生统计显著影响', baseText: baseParagraphs[5].text, status: 'open', replies: [], createdAt: now - 36000000 },
  // c-11 与 c-12 引用同一片段（引用重复），应只接受先处理的一条
  { id: 'c-11', paragraphId: 'p-07', author: '审稿人 A', role: 'reviewer', type: 'suggestion', quote: '建议是否可验证，而非建议生成速度', body: '建议把两个评价对象对举得更清楚。', suggestion: '建议的可验证性与适用范围，而非建议的生成速度', baseText: baseParagraphs[6].text, status: 'open', replies: [], createdAt: now - 30000000 },
  { id: 'c-12', paragraphId: 'p-07', author: '审稿人 E', role: 'reviewer', type: 'suggestion', quote: '建议是否可验证，而非建议生成速度', body: '另一位审稿人也想改写这句，和前述建议引用重复。', suggestion: '建议的可验证性，而不仅是建议生成的速度', baseText: baseParagraphs[6].text, status: 'open', replies: [], createdAt: now - 29000000 },
]
const seed = typeof localStorage !== 'undefined' ? localStorage.getItem(DRAFT_KEY) : null
const parsed = seed ? JSON.parse(seed) as Partial<{ paragraphs: Paragraph[]; comments: Comment[]; versions: Version[] }> : null
const initialParagraphs = parsed?.paragraphs?.length ? parsed.paragraphs : baseParagraphs
const initialComments = parsed?.comments ?? baseComments
const baseVersions: Version[] = [
  { id: 'v-01', label: '投稿初稿 v1', createdAt: now - 1209600000, paragraphs: JSON.parse(JSON.stringify(baseParagraphs)) as Paragraph[] },
  { id: 'v-02', label: '审阅基线 v2', createdAt: now - 172800000, paragraphs: JSON.parse(JSON.stringify(baseParagraphs.map((p) => p.id === 'p-04' ? { ...p, text: `${p.text} 编码规则在预注册方案中说明。` } : p))) as Paragraph[] },
]
const initialVersions: Version[] = parsed?.versions ?? baseVersions

const persistDraft = (paragraphs: Paragraph[], comments: Comment[], versions: Version[]) => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ paragraphs, comments, versions }))
}
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

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
  applySuggestions: (commentIds: string[], mode: 'accept' | 'reject') => SuggestionBatchOutcome
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
    addComment: (input) => record((state) => {
      // 建议锚定提交时的段落原文，供后续按引用片段定位与合并
      const baseText = input.type === 'suggestion'
        ? state.paragraphs.find((paragraph) => paragraph.id === input.paragraphId)?.text
        : undefined
      return {
        comments: [{
          ...input,
          id: id('comment'),
          author: state.role === 'reviewer' ? '审稿人 A' : state.role === 'author' ? '作者' : '编辑',
          role: state.role,
          status: 'open' as const,
          replies: [],
          createdAt: Date.now(),
          baseText,
        }, ...state.comments],
      }
    }),
    replyComment: (commentId, body) => record((state) => ({
      comments: state.comments.map((comment) => comment.id === commentId ? {
        ...comment,
        replies: [...comment.replies, { id: id('reply'), author: state.role === 'author' ? '作者' : state.role === 'reviewer' ? '审稿人 A' : '编辑', role: state.role, body, createdAt: Date.now() } as Reply],
      } : comment),
    })),
    applySuggestions: (commentIds, mode) => {
      const outcome: SuggestionBatchOutcome = { accepted: [], rejected: [], blocked: [] }
      record((state) => {
        const targets = state.comments.filter((comment) => commentIds.includes(comment.id) && comment.type === 'suggestion')
        if (!targets.length) return {}

        if (mode === 'reject') {
          const rejectedIds = new Set(targets.map((comment) => comment.id))
          targets.forEach((comment) => outcome.rejected.push(comment))
          return {
            comments: state.comments.map((comment) => rejectedIds.has(comment.id)
              ? { ...comment, status: 'rejected' as const, blockReason: undefined }
              : comment),
          }
        }

        // 接受模式：按段落分组，组内按引用在提交时原文中的位置从左到右顺序合并
        const acceptedIds = new Set<string>()
        const blockedById = new Map<string, string>()

        const groupByParagraph = new Map<string, Comment[]>()
        targets.forEach((comment) => {
          const list = groupByParagraph.get(comment.paragraphId) ?? []
          list.push(comment)
          groupByParagraph.set(comment.paragraphId, list)
        })

        const updatedParagraphs = state.paragraphs.map((paragraph) => {
          const group = groupByParagraph.get(paragraph.id)
          if (!group) return paragraph
          if (paragraph.status === 'locked') {
            group.forEach((comment) => blockedById.set(comment.id, '段落已被编辑锁定，无法自动应用修改'))
            return paragraph
          }

          // 同批次之后已接受的引用（同段其他分组不会出现，此处主要做跨批次重复识别）
          const previousAcceptedQuotes = state.comments
            .filter((comment) => comment.paragraphId === paragraph.id && comment.status === 'accepted')
            .map((comment) => comment.quote)
          const result = mergeSuggestionsIntoParagraph(paragraph.text, group.map((comment) => ({
            id: comment.id,
            quote: comment.quote,
            replacement: comment.suggestion ?? '',
            baseText: comment.baseText ?? paragraph.text,
            createdAt: comment.createdAt,
          })), previousAcceptedQuotes)

          result.acceptedIds.forEach((commentId) => acceptedIds.add(commentId))
          result.blocked.forEach(({ id: commentId, reason }) => blockedById.set(commentId, reason))

          return result.acceptedIds.length
            ? { ...paragraph, text: result.text, status: 'accepted' as const, highlighted: true }
            : paragraph
        })

        // 段落缺失等异常情况兜底
        targets.forEach((comment) => {
          if (!acceptedIds.has(comment.id) && !blockedById.has(comment.id) && !updatedParagraphs.some((paragraph) => paragraph.id === comment.paragraphId)) {
            blockedById.set(comment.id, '找不到建议对应的段落')
          }
        })

        const updatedComments = state.comments.map((comment) => {
          if (acceptedIds.has(comment.id)) return { ...comment, status: 'accepted' as const, blockReason: undefined }
          const reason = blockedById.get(comment.id)
          if (reason) return { ...comment, status: 'blocked' as const, blockReason: reason }
          return comment
        })

        targets.forEach((comment) => {
          if (acceptedIds.has(comment.id)) outcome.accepted.push(comment)
          else outcome.blocked.push({ comment, reason: blockedById.get(comment.id) ?? '未处理' })
        })
        return { paragraphs: updatedParagraphs, comments: updatedComments }
      })
      return outcome
    },
    mergeComment: (commentId, targetId) => record((state) => ({
      comments: state.comments.map((comment) => comment.id === commentId ? { ...comment, status: 'merged' as const, mergedInto: targetId } : comment),
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
      set({ paragraphs: clone(baseParagraphs), comments: clone(baseComments), versions: clone(baseVersions), conflicts: [], past: [], future: [], dirty: false })
      persistDraft(baseParagraphs, baseComments, baseVersions)
    },
  }
})
