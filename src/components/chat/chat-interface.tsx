'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Bot, User, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { Citation } from '@/types/tools'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  toolCalls?: Array<{
    name: string
    status: 'pending' | 'confirmed' | 'executed' | 'failed'
  }>
  createdAt: string
}

interface ChatInterfaceProps {
  projectId?: string
  projectName?: string
  onSendMessage: (message: string) => Promise<void>
  messages: Message[]
  isLoading?: boolean
}

export function ChatInterface({
  projectId,
  projectName,
  onSendMessage,
  messages,
  isLoading,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const message = input
    setInput('')
    await onSendMessage(message)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Assistant Hub MCP</h2>
            {projectName && (
              <p className="text-xs text-muted-foreground">Contexte: {projectName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-2">
              <Bot className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="font-medium">Commencez une conversation</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Posez des questions sur vos projets, recherchez dans les emails, ou demandez des actions.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-4">
                <SuggestionChip onClick={() => setInput("Quelles sont les décisions récentes ?")}>
                  Décisions récentes
                </SuggestionChip>
                <SuggestionChip onClick={() => setInput("Résume le dernier email de construction")}>
                  Résumer un email
                </SuggestionChip>
                <SuggestionChip onClick={() => setInput("Crée une tâche pour le suivi chantier")}>
                  Créer une tâche
                </SuggestionChip>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="icon" className="shrink-0">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez une question ou demandez une action..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || isLoading} className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-primary/10'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
      </div>

      <div className={cn('flex flex-col gap-2 max-w-[80%]', isUser && 'items-end')}>
        <Card className={cn('p-3', isUser && 'bg-primary text-primary-foreground')}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </Card>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Sources:</p>
            {message.citations.map((citation, i) => (
              <CitationCard key={i} citation={citation} />
            ))}
          </div>
        )}

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {message.toolCalls.map((tool, i) => (
              <Badge
                key={i}
                variant={
                  tool.status === 'executed'
                    ? 'success'
                    : tool.status === 'failed'
                    ? 'destructive'
                    : 'secondary'
                }
                className="gap-1"
              >
                {tool.status === 'executed' && <CheckCircle className="h-3 w-3" />}
                {tool.status === 'failed' && <AlertCircle className="h-3 w-3" />}
                {tool.name}
              </Badge>
            ))}
          </div>
        )}

        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(message.createdAt)}
        </span>
      </div>
    </div>
  )
}

function CitationCard({ citation }: { citation: Citation }) {
  const typeLabels: Record<string, string> = {
    email: 'Email',
    document: 'Document',
    meeting: 'Réunion',
    note: 'Note',
    decision: 'Décision',
  }

  return (
    <div className="flex items-start gap-2 rounded-md border bg-muted/50 p-2 text-xs">
      <Badge variant="outline" className="shrink-0">
        {typeLabels[citation.sourceType] || citation.sourceType}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{citation.title}</p>
        <p className="text-muted-foreground line-clamp-2">{citation.excerpt}</p>
      </div>
      {citation.url && (
        <a
          href={citation.url}
          className="shrink-0 text-primary hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
      <div className="shrink-0 text-muted-foreground">
        {Math.round(citation.confidence * 100)}%
      </div>
    </div>
  )
}

function SuggestionChip({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-3 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      {children}
    </button>
  )
}
