'use client'

import { useState, useEffect, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatDrawer } from './ChatDrawer'
import { useVoiceInput } from './useVoiceInput'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function ChatButton() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)
  const voiceModeRef = useRef(voiceMode)
  useEffect(() => {
    voiceModeRef.current = voiceMode
  }, [voiceMode])

  function speak(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
  }

  async function fetchReply(msgs: Message[]) {
    setIsLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs }),
      })
      const data = await res.json()
      if (data.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
        if (voiceModeRef.current) speak(data.message)
      } else {
        const errorMessage = data.error
          ? `Sorry, I couldn't fetch your financial data right now (${data.error}${data.detail ? `: ${data.detail}` : ''}).`
          : 'Sorry, I couldn\'t fetch your financial data right now. Please try again.'
        setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }])
        if (voiceModeRef.current) speak(errorMessage)
      }
    } catch {
      const errorMessage = 'Sorry, I couldn\'t fetch your financial data right now. Please try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }])
      if (voiceModeRef.current) speak(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const messagesRef = useRef(messages)
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const { supported: voiceSupported, listening, interimTranscript, start: startListening, stop: stopListening } =
    useVoiceInput(transcript => {
      if (!transcript) return
      const updated: Message[] = [...messagesRef.current, { role: 'user', content: transcript }]
      setMessages(updated)
      fetchReply(updated)
    })

  useEffect(() => {
    if (!open) {
      window.speechSynthesis?.cancel()
      stopListening()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open && messages.length === 0 && !isLoading) {
      fetchReply([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return
    const updated: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(updated)
    setInput('')
    fetchReply(updated)
  }

  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 h-12 w-12 rounded-full shadow-lg"
        onClick={() => setOpen(true)}
        aria-label="Open financial assistant"
      >
        <Sparkles className="h-5 w-5" />
      </Button>
      <ChatDrawer
        open={open}
        onOpenChange={setOpen}
        messages={messages}
        input={input}
        isLoading={isLoading}
        onInputChange={setInput}
        onSend={handleSend}
        voiceSupported={voiceSupported}
        listening={listening}
        interimTranscript={interimTranscript}
        onStartListening={startListening}
        onStopListening={stopListening}
        voiceMode={voiceMode}
        onToggleVoiceMode={() => setVoiceMode(v => !v)}
      />
    </>
  )
}
