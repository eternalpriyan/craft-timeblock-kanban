'use client'

import { useState, useRef, useEffect, CSSProperties } from 'react'

interface InlineEditorProps {
  type: 'timeblock' | 'task'
  onSubmit: (value: string) => void
  onCancel: () => void
  placeholder?: string
  style?: CSSProperties
}

export default function InlineEditor({
  type,
  onSubmit,
  onCancel,
  placeholder,
  style,
}: InlineEditorProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSubmit(value)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  const handleBlur = () => {
    if (value.trim()) {
      onSubmit(value)
    } else {
      onCancel()
    }
  }

  if (type === 'timeblock') {
    return (
      <div
        style={style}
        className="bg-orange-500/20 border border-orange-500/50 rounded-md px-3 py-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex-shrink-0 w-4 h-4 rounded border border-slate-400 dark:border-zinc-500" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-slate-700 dark:text-zinc-300 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none"
      />
    </div>
  )
}
