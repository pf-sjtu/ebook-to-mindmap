// 通知服务
export class NotificationService {
  private static instance: NotificationService

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  // 请求通知权限
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('此浏览器不支持桌面通知')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }

    return false
  }

  // 发送通知
  async sendNotification(title: string, options?: NotificationOptions): Promise<void> {
    const hasPermission = await this.requestPermission()
    
    if (!hasPermission) {
      console.warn('没有通知权限，无法发送通知')
      return
    }

    const defaultOptions: NotificationOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'ebook-to-mindmap',
      requireInteraction: false,
      ...options
    }

    try {
      const notification = new Notification(title, defaultOptions)
      
      // 自动关闭通知（5秒后）
      setTimeout(() => {
        notification.close()
      }, 5000)

      // 点击通知时聚焦到窗口
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    } catch (error) {
      console.error('发送通知失败:', error)
    }
  }

  // 发送任务完成通知
  async sendTaskCompleteNotification(taskType: string, bookTitle?: string): Promise<void> {
    const title = '任务完成'
    const message = bookTitle 
      ? `${taskType}已完成：${bookTitle}`
      : `${taskType}已完成`

    await this.sendNotification(title, {
      body: message,
      icon: '/favicon.ico'
    })
  }

  // 发送处理进度通知
  async sendProgressNotification(progress: number, currentStep: string): Promise<void> {
    const title = '处理进度更新'
    const message = `当前进度：${progress}% - ${currentStep}`

    await this.sendNotification(title, {
      body: message,
      icon: '/favicon.ico'
    })
  }

  // 发送错误通知
  async sendErrorNotification(error: string): Promise<void> {
    const title = '处理出错'
    const message = `任务执行失败：${error}`

    await this.sendNotification(title, {
      body: message,
      icon: '/favicon.ico'
    })
  }

  // 检查是否支持通知
  isSupported(): boolean {
    return 'Notification' in window
  }

  // 检查是否有通知权限
  hasPermission(): boolean {
    return Notification.permission === 'granted'
  }
}

// 导出单例实例
export const notificationService = NotificationService.getInstance()
