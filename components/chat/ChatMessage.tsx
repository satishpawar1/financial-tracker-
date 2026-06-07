'use client'

interface Props {
  role: 'user' | 'assistant'
  content: string
}

export function ChatMessage({ role, content }: Props) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
          isUser
            ? 'rounded-tr-sm bg-primary text-primary-foreground'
            : 'rounded-tl-sm bg-muted text-foreground'
        }`}
      >
        {content}
      </div>
    </div>
  )
}
