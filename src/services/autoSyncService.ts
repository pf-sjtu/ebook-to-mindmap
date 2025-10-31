import { WebDAVService } from './webdavService'
import { useConfigStore } from '../stores/configStore'

// 定义本地类型（避免循环依赖）
interface BookSummary {
  title: string
  author: string
  chapters: Array<{
    id: string
    title: string
    content: string
    summary?: string
    processed: boolean
  }>
  connections: string
  overallSummary: string
}

interface BookMindMap {
  title: string
  author: string
  chapters: Array<{
    id: string
    title: string
    content: string
    mindMap?: any
    processed: boolean
  }>
  combinedMindMap?: any
}

// 同步文件类型
export type SyncFileType = 'summary' | 'mindmap' | 'combined_mindmap'

// 同步文件信息
export interface SyncFileInfo {
  name: string
  content: string | ArrayBuffer
  path: string
  type: SyncFileType
}

/**
 * 自动同步服务
 * 负责在文件处理完成后自动同步到WebDAV
 */
export class AutoSyncService {
  private webdavService: WebDAVService

  constructor() {
    this.webdavService = new WebDAVService()
  }

  /**
   * 同步摘要文件到WebDAV
   */
  async syncSummary(bookSummary: BookSummary, fileName: string): Promise<boolean> {
    try {
      // 检查是否启用自动同步
      const config = useConfigStore.getState().webdavConfig
      if (!config.enabled || !config.autoSync) {
        console.log('自动同步未启用，跳过同步')
        return true
      }

      // 初始化WebDAV服务
      const initResult = await this.webdavService.initialize(config)
      if (!initResult.success) {
        console.error('WebDAV初始化失败:', initResult.error)
        return false
      }

      // 准备同步文件
      const syncFiles: SyncFileInfo[] = []

      // 添加全书摘要
      const summaryContent = this.formatSummaryAsMarkdown(bookSummary)
      syncFiles.push({
        name: `${fileName}_summary.md`,
        content: summaryContent,
        path: `${fileName}/${fileName}_summary.md`,
        type: 'summary'
      })

      // 添加各章节摘要
      bookSummary.chapters.forEach((chapter, index) => {
        const chapterSummary = this.formatChapterSummary(chapter, index + 1)
        syncFiles.push({
          name: `${fileName}_chapter_${index + 1}_summary.md`,
          content: chapterSummary,
          path: `${fileName}/chapters/${fileName}_chapter_${index + 1}_summary.md`,
          type: 'summary'
        })
      })

      // 执行同步
      const syncResult = await this.webdavService.syncFiles(syncFiles)
      
      if (syncResult.success) {
        console.log(`✅ 摘要文件同步成功: ${syncFiles.length} 个文件`)
        // 更新最后同步时间
        useConfigStore.getState().updateWebDAVLastSyncTime()
        return true
      } else {
        console.error('摘要文件同步失败:', syncResult.error)
        return false
      }
    } catch (error) {
      console.error('同步摘要文件时发生错误:', error)
      return false
    }
  }

  /**
   * 同步思维导图文件到WebDAV
   */
  async syncMindMap(bookMindMap: BookMindMap, fileName: string): Promise<boolean> {
    try {
      // 检查是否启用自动同步
      const config = useConfigStore.getState().webdavConfig
      if (!config.enabled || !config.autoSync) {
        console.log('自动同步未启用，跳过同步')
        return true
      }

      // 初始化WebDAV服务
      const initResult = await this.webdavService.initialize(config)
      if (!initResult.success) {
        console.error('WebDAV初始化失败:', initResult.error)
        return false
      }

      // 准备同步文件
      const syncFiles: SyncFileInfo[] = []

      // 添加各章节思维导图
      bookMindMap.chapters.forEach((chapter, index) => {
        if (chapter.mindMap) {
          const mindMapJson = JSON.stringify(chapter.mindMap, null, 2)
          syncFiles.push({
            name: `${fileName}_chapter_${index + 1}_mindmap.json`,
            content: mindMapJson,
            path: `${fileName}/mindmaps/${fileName}_chapter_${index + 1}_mindmap.json`,
            type: 'mindmap'
          })
        }
      })

      // 添加整书思维导图（如果存在）
      if (bookMindMap.combinedMindMap) {
        const combinedMindMapJson = JSON.stringify(bookMindMap.combinedMindMap, null, 2)
        syncFiles.push({
          name: `${fileName}_combined_mindmap.json`,
          content: combinedMindMapJson,
          path: `${fileName}/${fileName}_combined_mindmap.json`,
          type: 'combined_mindmap'
        })
      }

      // 执行同步
      const syncResult = await this.webdavService.syncFiles(syncFiles)
      
      if (syncResult.success) {
        console.log(`✅ 思维导图文件同步成功: ${syncFiles.length} 个文件`)
        // 更新最后同步时间
        useConfigStore.getState().updateWebDAVLastSyncTime()
        return true
      } else {
        console.error('思维导图文件同步失败:', syncResult.error)
        return false
      }
    } catch (error) {
      console.error('同步思维导图文件时发生错误:', error)
      return false
    }
  }

  /**
   * 格式化摘要为Markdown
   */
  private formatSummaryAsMarkdown(bookSummary: BookSummary): string {
    let markdown = `# ${bookSummary.title}\n\n`
    
    if (bookSummary.author) {
      markdown += `**作者**: ${bookSummary.author}\n\n`
    }

    markdown += `## 全书总结\n\n${bookSummary.overallSummary}\n\n`

    if (bookSummary.connections) {
      markdown += `## 章节关联分析\n\n${bookSummary.connections}\n\n`
    }

    markdown += `## 章节摘要\n\n`
    
    bookSummary.chapters.forEach((chapter, index) => {
      markdown += `### 第${index + 1}章: ${chapter.title}\n\n`
      markdown += `${chapter.summary}\n\n---\n\n`
    })

    markdown += `\n---\n*由 fastReader 自动生成于 ${new Date().toLocaleString('zh-CN')}*`
    
    return markdown
  }

  /**
   * 格式化章节摘要
   */
  private formatChapterSummary(chapter: any, chapterNumber: number): string {
    let markdown = `# 第${chapterNumber}章: ${chapter.title}\n\n`
    markdown += `${chapter.summary}\n\n`
    markdown += `---\n*由 fastReader 自动生成于 ${new Date().toLocaleString('zh-CN')}*`
    
    return markdown
  }
}

// 导出单例实例
export const autoSyncService = new AutoSyncService()
