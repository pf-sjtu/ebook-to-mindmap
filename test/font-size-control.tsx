import React, { useState, useEffect } from 'react'

// 字体大小控制组件测试
export const FontSizeControlTest: React.FC = () => {
  const [fontScale, setFontScale] = useState(1)

  const updateFontScale = (scale: number) => {
    setFontScale(scale)
    document.documentElement.style.setProperty('--font-scale', scale.toString())
  }

  const increaseFontSize = () => {
    const newScale = Math.min(fontScale + 0.1, 2)
    updateFontScale(newScale)
  }

  const decreaseFontSize = () => {
    const newScale = Math.max(fontScale - 0.1, 0.5)
    updateFontScale(newScale)
  }

  const resetFontSize = () => {
    updateFontScale(1)
  }

  useEffect(() => {
    // 初始化字体大小
    document.documentElement.style.setProperty('--font-scale', fontScale.toString())
  }, [])

  const testContent = `
# 字体大小测试

这是一个包含<u>下划线文本</u>的测试段落。

这里有一些[链接测试](https://example.com)和<mark>标记文本</mark>。

还有<ins>插入文本</ins>和<del>删除文本</del>。

测试上标X<sup>2</sup>和下标H<sub>2</sub>O。

<small>这是小号文本</small>和正常文本的对比。
  `

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">字体大小控制测试</h3>
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={decreaseFontSize}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            减小字体 (A-)
          </button>
          <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded min-w-[80px] text-center">
            {Math.round(fontScale * 100)}%
          </span>
          <button
            onClick={increaseFontSize}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            增大字体 (A+)
          </button>
          <button
            onClick={resetFontSize}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            重置
          </button>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          当前字体缩放比例: {fontScale}x (基础字体大小: 16px)
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
        <h3 className="text-lg font-semibold mb-3">预览内容测试</h3>
        <div className="prose prose-sm max-w-none">
          <div dangerouslySetInnerHTML={{ __html: testContent.replace(/\n/g, '<br>') }} />
        </div>
      </div>
    </div>
  )
}
