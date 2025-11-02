import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Minus, Plus, RotateCcw } from 'lucide-react'

interface FontSizeControlProps {
  className?: string
  showLabel?: boolean
  variant?: 'compact' | 'full'
}

export const FontSizeControl: React.FC<FontSizeControlProps> = ({
  className = '',
  showLabel = true,
  variant = 'compact'
}) => {
  const [fontScale, setFontScale] = useState(1)

  // 从localStorage读取保存的字体大小设置
  useEffect(() => {
    const savedScale = localStorage.getItem('font-scale')
    if (savedScale) {
      const scale = parseFloat(savedScale)
      if (!isNaN(scale) && scale >= 0.5 && scale <= 2) {
        setFontScale(scale)
        document.documentElement.style.setProperty('--font-scale', scale.toString())
      }
    }
  }, [])

  const updateFontScale = (scale: number) => {
    setFontScale(scale)
    document.documentElement.style.setProperty('--font-scale', scale.toString())
    localStorage.setItem('font-scale', scale.toString())
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

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showLabel && (
          <span className="text-sm font-medium text-muted-foreground">
            字体
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={decreaseFontSize}
          disabled={fontScale <= 0.5}
          title="减小字体"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium px-2 min-w-[60px] text-center">
          {Math.round(fontScale * 100)}%
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={increaseFontSize}
          disabled={fontScale >= 2}
          title="增大字体"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFontSize}
          disabled={fontScale === 1}
          title="重置字体大小"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              字体大小控制
            </h3>
            <p className="text-sm text-muted-foreground">
              调节预览内容的字体大小
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={decreaseFontSize}
              disabled={fontScale <= 0.5}
            >
              <Minus className="h-4 w-4 mr-1" />
              减小
            </Button>
            <span className="text-sm font-medium px-3 py-1 bg-muted rounded min-w-[80px] text-center">
              {Math.round(fontScale * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={increaseFontSize}
              disabled={fontScale >= 2}
            >
              <Plus className="h-4 w-4 mr-1" />
              增大
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFontSize}
              disabled={fontScale === 1}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              重置
            </Button>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          当前缩放比例: {fontScale}x (基础大小: 16px)
        </div>
      </CardContent>
    </Card>
  )
}
