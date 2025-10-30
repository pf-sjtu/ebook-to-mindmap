// 第二版思维导图提示词模板 - 优化版

export const MINDMAP_TEMPLATES_V2 = {
  chapter: {
    name: '章节思维导图 V2',
    template: `\`\`\`ts
export interface NodeObj {
  topic: string
  id: string
  tags?: string[]
  children?: NodeObj[]
}
// 总结父id的第start到end个节点的内容
export interface Summary {
  id: string
  label: string
  parent: string
  start: number
  end: number
}
\`\`\`

任务：分析以下章节内容，生成符合以下格式的JSON思维导图数据：
{
  nodeData: NodeObj
  summaries?: Summary[]
}

严格规则：
1. 节点ID使用递增数字
2. 适当应用父子级别的分层，不要只使用兄弟节点关系
3. 可选标签：核心、案例、实践、金句
4. Summary用于总结同父节点的子节点，显示在侧边，禁止总结根节点
5. 适当添加Summary，不要多余
6. 最后添加一个金句节点记录本章金句
7. 适当添加表达节点内涵的emoji
8. 如果内容是致谢、目录、前言、序言、参考文献等页面，直接回复"{nodeData:null}"
9. 只输出JSON格式，不要输出任何解释性文字、问候语或无关内容

输出格式：纯JSON，无任何前缀或后缀文字`
  },
  arrow: {
    name: '思维导图箭头连接 V2',
    template: `\`\`\`ts
export interface NodeObj {
  topic: string
  id: string
  tags?: string[]
  children?: NodeObj[]
}

export interface Arrow {
  id: string
  label: string
  from: string
  to: string
  delta1: { x: number; y: number }
  delta2: { x: number; y: number }
  bidirectional?: boolean
}
\`\`\`

任务：为已有思维导图添加箭头连接，输出符合以下格式的JSON：
{
  arrows?: Arrow[]
}

严格规则：
1. Arrow连接任意节点，label说明节点联系，delta默认值50,50
2. 直接的父子关系不需要使用Arrow
3. 最多添加6条Arrow，只连接最关键的节点关系
4. 只输出JSON格式，不要输出任何解释性文字、问候语或无关内容

输出格式：纯JSON，无任何前缀或后缀文字`
  },
  combined: {
    name: '整书思维导图 V2',
    template: `\`\`\`ts
export interface NodeObj {
  topic: string
  id: string
  tags?: string[]
  children?: NodeObj[]
}
// 总结父id的第start到end个节点的内容
export interface Summary {
  id: string
  label: string
  parent: string
  start: number
  end: number
}
\`\`\`

任务：分析整书章节结构，生成符合以下格式的JSON思维导图数据：
{
  nodeData: NodeObj
  summaries?: Summary[]
}

严格规则：
1. 节点ID使用递增数字
2. 体现整书的逻辑结构和层次关系
3. 可选标签：核心、案例、实践、金句
4. Summary用于总结同父节点的子节点，显示在侧边
5. 适当添加Summary，不要多余
6. 最后添加一个金句节点记录全书金句
7. 适当添加表达节点内涵的emoji
8. 只输出JSON格式，不要输出任何解释性文字、问候语或无关内容

输出格式：纯JSON，无任何前缀或后缀文字`
  }
} as const
