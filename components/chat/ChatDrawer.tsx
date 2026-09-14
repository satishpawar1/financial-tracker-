'use client'

import { useEffect, useRef } from 'react'
import { Send, Mic, Volume2, VolumeX } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChatMessage } from './ChatMessage'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  messages: Message[]
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSend: () => void
  voiceSupported: boolean
  listening: boolean
  interimTranscript: string
  onStartListening: () => void
  onStopListening: () => void
  voiceMode: boolean
  onToggleVoiceMode: () => void
}

export function ChatDrawer({
  open,
  onOpenChange,
  messages,
  input,
  isLoading,
  onInputChange,
  onSend,
  voiceSupported,
  listening,
  interimTranscript,
  onStartListening,
  onStopListening,
  voiceMode,
  onToggleVoiceMode,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading && input.trim()) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0 flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-base">Financial Assistant</SheetTitle>
          {voiceSupported && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onToggleVoiceMode}
              aria-label={voiceMode ? 'Turn off spoken replies' : 'Turn on spoken replies'}
              aria-pressed={voiceMode}
            >
              {voiceMode ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {messages.length === 0 && isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce [animation-delay:0ms]">·</span>
                  <span className="animate-bounce [animation-delay:150ms]">·</span>
                  <span className="animate-bounce [animation-delay:300ms]">·</span>
                </span>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}
          {messages.length > 0 && isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce [animation-delay:0ms]">·</span>
                  <span className="animate-bounce [animation-delay:150ms]">·</span>
                  <span className="animate-bounce [animation-delay:300ms]">·</span>
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="shrink-0 border-t px-4 py-3 flex gap-2">
          <Input
            value={listening ? interimTranscript : input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={listening ? 'Listening…' : 'Ask about your spending…'}
            disabled={isLoading || listening}
            className="flex-1"
          />
          {voiceSupported && (
            <Button
              size="icon"
              variant={listening ? 'default' : 'outline'}
              onClick={listening ? onStopListening : onStartListening}
              disabled={isLoading}
              aria-label={listening ? 'Stop listening' : 'Ask by voice'}
              className={cn(listening && 'animate-pulse')}
            >
              <Mic className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            onClick={onSend}
            disabled={isLoading || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
