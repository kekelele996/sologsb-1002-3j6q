export type Role = 'author' | 'reviewer' | 'editor'
export type ParagraphStatus = 'open' | 'accepted' | 'locked'
// blocked：建议在批量合并时因引用冲突未能应用，仍待作者处理
export type CommentStatus = 'open' | 'accepted' | 'rejected' | 'merged' | 'blocked'
export type CommentType = 'comment' | 'suggestion'

export interface Reply {
  id: string
  author: string
  role: Role
  body: string
  createdAt: number
}

export interface Comment {
  id: string
  paragraphId: string
  author: string
  role: Role
  type: CommentType
  quote: string
  body: string
  suggestion?: string
  status: CommentStatus
  replies: Reply[]
  createdAt: number
  mergedInto?: string
  /** 建议提交时的段落原文快照，用于锚定引用与冲突排查 */
  baseText?: string
  /** status 为 blocked 时的冲突原因说明 */
  blockReason?: string
}

export interface Paragraph {
  id: string
  section: string
  number: string
  text: string
  original: string
  status: ParagraphStatus
  highlighted: boolean
}

export interface Version {
  id: string
  label: string
  createdAt: number
  paragraphs: Paragraph[]
}

export interface EditConflict {
  id: string
  paragraphId: string
  localText: string
  remoteText: string
  localAuthor: string
  remoteAuthor: string
  detectedAt: number
}

export interface HistorySnapshot {
  paragraphs: Paragraph[]
  comments: Comment[]
  versions: Version[]
}

/** 一次批量处理建议的结果，供界面逐条反馈生效 / 待处理情况 */
export interface SuggestionBatchOutcome {
  accepted: Comment[]
  rejected: Comment[]
  blocked: { comment: Comment; reason: string }[]
}
