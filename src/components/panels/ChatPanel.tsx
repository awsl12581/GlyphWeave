import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, Send, MessageCircle } from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export function ChatPanel() {
  const { t } = useTranslation()
  const chatOpen = useUiStore((s) => s.chatOpen)
  const setChatOpen = useUiStore((s) => s.setChatOpen)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [chatOpen])

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || sending) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)

    // TODO: Replace with actual AI/API integration
    // Simulate a delayed assistant response
    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: t('chat.placeholder', 'This is a placeholder response. Chat integration coming soon.'),
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      setSending(false)
    }, 800)
  }, [input, sending, t])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    },
    [sendMessage],
  )

  return (
    <>
      {/* Backdrop */}
      {chatOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm transition-opacity"
          onClick={() => setChatOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={
          'fixed bottom-0 left-0 right-0 z-40 flex flex-col transition-transform duration-300 ease-out ' +
          (chatOpen ? 'translate-y-0' : 'translate-y-full')
        }
        style={{ height: '420px' }}
      >
        <div
          className="flex flex-col h-full mx-auto w-full max-w-2xl rounded-t-3xl border border-b-0 border-zinc-700/60 bg-zinc-900/95 shadow-2xl shadow-black/40 backdrop-blur-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between shrink-0 px-5 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-zinc-200">
                {t('chat.title', 'Assistant')}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-zinc-500 hover:text-zinc-300"
              onClick={() => setChatOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0">
            <div ref={scrollRef} className="px-5 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-800/50 mb-4">
                    <MessageCircle className="w-7 h-7 text-zinc-600" />
                  </div>
                  <p className="text-sm text-zinc-500">
                    {t('chat.empty', 'Ask me anything about your map.')}
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={
                      'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ' +
                      (msg.role === 'user'
                        ? 'bg-emerald-600/80 text-white rounded-br-md'
                        : 'bg-zinc-800/80 text-zinc-200 rounded-bl-md')
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800/80 text-zinc-400 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="shrink-0 px-4 py-3 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.inputPlaceholder', 'Type a message...')}
                disabled={sending}
                className="flex-1 h-9 rounded-xl border-zinc-700 bg-zinc-800/50 text-sm text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-emerald-500/30"
              />
              <Button
                variant="default"
                size="icon"
                className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
                onClick={sendMessage}
                disabled={!input.trim() || sending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
