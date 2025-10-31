import { toast } from 'sonner'
import { launchMindElixir } from '@mind-elixir/open-desktop'
import { downloadMethodList } from '@mind-elixir/export-mindmap'
import type { MindElixirData, MindElixirInstance } from 'mind-elixir'

/**
 * 滚动到页面顶部
 */
export const scrollToTop = () => {
  const scrollContainer = document.querySelector('.scroll-container')
  if (scrollContainer) {
    scrollContainer.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
}

// 防止重复点击的标记
let isLaunching = false

/**
 * 在 MindElixir Desktop 中打开思维导图
 * @param mindmapData 思维导图数据
 * @param title 思维导图标题
 */
export const openInMindElixir = async (mindmapData: MindElixirData, title: string) => {
  // 防止重复点击
  if (isLaunching) {
    console.log('⏳ Mind Elixir 正在启动中，请稍候...')
    toast.warning('Mind Elixir 正在启动中，请稍候...', {
      duration: 2000,
      position: 'top-center',
    })
    return
  }

  isLaunching = true
  
  try {
    console.log('正在尝试启动 Mind Elixir Desktop...')
    
    // 添加超时机制，防止无限重试
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('服务启动超时'))
      }, 10000) // 10秒超时
    })
    
    // 使用 Promise.race 来实现超时控制
    await Promise.race([
      launchMindElixir(mindmapData),
      timeoutPromise
    ])
    
    toast.success(`已成功发送"${title}"到 Mind Elixir Desktop`, {
      duration: 3000,
      position: 'top-center',
    })
  } catch (error) {
    console.error('启动 Mind Elixir 失败:', error)
    
    // 根据错误类型提供不同的提示
    let errorMessage = '启动 Mind Elixir 失败'
    let detailedMessage = ''
    
    if (error instanceof Error) {
      const errorString = error.message.toLowerCase()
      
      // 优先检查更具体的错误
      if (errorString.includes('ping')) {
        errorMessage = '无法连接到 Mind Elixir Desktop'
        detailedMessage = '请启动 Mind Elixir Desktop 应用程序'
      } else if (errorString.includes('scheme') || errorString.includes('protocol')) {
        errorMessage = 'Mind Elixir Desktop 未安装'
        detailedMessage = '请先安装 Mind Elixir Desktop 应用程序'
      } else if (errorString.includes('timeout') || errorString.includes('connection') || errorString.includes('启动超时') || errorString.includes('服务启动')) {
        errorMessage = 'Mind Elixir Desktop 连接超时'
        detailedMessage = '请确保 Mind Elixir Desktop 正在运行'
      }
    }
    
    // 显示详细的错误提示
    toast.error(`${errorMessage}${detailedMessage ? ': ' + detailedMessage : ''}`, {
      duration: 8000,
      position: 'top-center',
      action: {
        label: '下载',
        onClick: () => {
          // 打开 Mind Elixir 官网下载页面
          window.open('https://mind-elixir.com/', '_blank')
        }
      }
    })
    
    // 在控制台提供更详细的帮助信息
    console.log('%c💡 Mind Elixir Desktop 安装帮助:', 'color: #3b82f6; font-weight: bold; font-size: 14px;')
    console.log('%c1. 请访问 https://mind-elixir.com/ 下载并安装 Mind Elixir Desktop', 'color: #64748b;')
    console.log('%c2. 安装后请确保应用程序正在运行', 'color: #64748b;')
    console.log('%c3. 再次点击"在 Mind Elixir 中打开"按钮', 'color: #64748b;')
  } finally {
    // 重置状态
    isLaunching = false
  }
}

/**
 * 下载思维导图
 * @param mindElixirInstance MindElixir 实例
 * @param title 思维导图标题
 * @param format 导出格式
 */
export const downloadMindMap = async (mindElixirInstance: MindElixirInstance, title: string, format: string) => {
  try {
    // 查找对应的下载方法
    const method = downloadMethodList.find((item) => item.type === format)
    if (!method) {
      throw new Error(`不支持的格式: ${format}`)
    }

    // 执行下载
    await method.download(mindElixirInstance)

    toast.success(`${title} 已成功导出为 ${format} 格式`, {
      duration: 3000,
      position: 'top-center',
    })
  } catch (error) {
    console.error('导出思维导图失败:', error)
    toast.error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`, {
      duration: 5000,
      position: 'top-center',
    })
  }
}
