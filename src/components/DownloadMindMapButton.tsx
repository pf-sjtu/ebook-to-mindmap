import React from 'react'
import { Download, ChevronDown } from 'lucide-react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import type { MindElixirReactRef } from './project/MindElixirReact'

interface DownloadMindMapButtonProps {
  mindElixirRef: React.RefObject<MindElixirReactRef | null> | (() => MindElixirReactRef | null | undefined)
  title: string
  downloadMindMap: (instance: any, title: string, format: string) => void
}

const EXPORT_FORMATS = [
  { key: 'PNG', label: '下载为 PNG' },
  { key: 'JPEG', label: '下载为 JPEG' },
  { key: 'WEBP', label: '下载为 WEBP' },
  { key: 'HTML', label: '下载为 HTML' },
  { key: 'JSON', label: '下载为 JSON' },
  { key: 'Markdown', label: '下载为 Markdown' },
]

export const DownloadMindMapButton: React.FC<DownloadMindMapButtonProps> = ({
  mindElixirRef,
  title,
  downloadMindMap,
}) => {
  const handleDownload = (format: string) => {
    let instance
    if (typeof mindElixirRef === 'function') {
      instance = mindElixirRef()?.instance
    } else {
      instance = mindElixirRef.current?.instance
    }
    
    if (instance) {
      downloadMindMap(instance, title, format)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          title="下载思维导图"
        >
          <Download className="h-4 w-4 mr-1" />
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {EXPORT_FORMATS.map((format) => (
          <DropdownMenuItem
            key={format.key}
            onClick={() => handleDownload(format.key)}
          >
            {format.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}