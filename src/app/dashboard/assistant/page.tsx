'use client'

import { useState, useRef, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Bot,
  Send,
  Paperclip,
  Mic,
  FileText,
  Mail,
  Calendar,
  FolderKanban,
  Search,
  Sparkles,
  MessageSquare,
  History,
  Settings,
  ExternalLink,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  WifiOff
} from 'lucide-react'

// DEV MODE: Mock user (à remplacer par auth réelle)
const DEV_USER = { name: 'Développeur', email: 'dev@example.com' }

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  citations?: Citation[]
  toolCalls?: ToolCall[]
  pendingConfirmation?: PendingAction
  error?: boolean
}

interface Citation {
  id: string
  type: 'document' | 'email' | 'meeting' | 'note'
  title: string
  excerpt: string
  source: string
  sourceId?: string
}

interface ToolCall {
  name: string
  status: 'pending' | 'executed' | 'failed'
  result?: string
  arguments?: Record<string, unknown>
}

interface PendingAction {
  type: string
  description: string
  risk: 'low' | 'medium' | 'high'
}

// Types pour l'API
interface ChatApiResponse {
  content: string
  citations?: Array<{
    id: string
    sourceType: 'document' | 'email' | 'meeting' | 'note'
    sourceId: string
    title: string
    excerpt: string
  }>
  toolCalls?: Array<{
    name: string
    arguments: Record<string, unknown>
    result?: unknown
  }>
  error?: string
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Bonjour ! Je suis votre assistant Hub MCP. Je peux vous aider à rechercher des informations dans vos projets, emails, documents et réunions. Je peux également exécuter des actions comme créer des notes ou des tâches.\n\nQue puis-je faire pour vous aujourd\'hui ?',
    timestamp: new Date(Date.now() - 60000),
  },
]

const SUGGESTED_PROMPTS = [
  { icon: Search, text: 'Recherche les documents liés au projet en cours' },
  { icon: Mail, text: 'Résume les derniers emails importants' },
  { icon: Calendar, text: 'Quelles sont les prochaines réunions prévues ?' },
  { icon: FileText, text: 'Crée une note de suivi pour le projet' },
]

const typeIcons = {
  document: FileText,
  email: Mail,
  meeting: Calendar,
  note: MessageSquare,
}

const typeColors = {
  document: 'bg-red-100 text-red-600',
  email: 'bg-green-100 text-green-600',
  meeting: 'bg-purple-100 text-purple-600',
  note: 'bg-blue-100 text-blue-600',
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Convertir les messages au format API
  const messagesToApiFormat = (msgs: Message[]) => {
    return msgs
      .filter(m => m.id !== '1') // Exclure le message initial de bienvenue
      .map(m => ({
        role: m.role,
        content: m.content,
      }))
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesToApiFormat(updatedMessages),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erreur ${response.status}`)
      }

      const data: ChatApiResponse = await response.json()
      setIsConnected(true)

      // Transformer les citations de l'API au format local
      const citations: Citation[] = (data.citations || []).map((c, i) => ({
        id: c.id || `citation-${i}`,
        type: c.sourceType,
        title: c.title,
        excerpt: c.excerpt,
        source: `${c.sourceType} - ${c.sourceId}`,
        sourceId: c.sourceId,
      }))

      // Transformer les tool calls
      const toolCalls: ToolCall[] = (data.toolCalls || []).map(tc => ({
        name: tc.name,
        status: 'executed' as const,
        result: typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result),
        arguments: tc.arguments,
      }))

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        citations: citations.length > 0 ? citations : undefined,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      setIsConnected(false)

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error
          ? `Désolé, une erreur s'est produite : ${error.message}\n\nVérifiez que vous êtes connecté et réessayez.`
          : 'Désolé, une erreur s\'est produite. Veuillez réessayer.',
        timestamp: new Date(),
        error: true,
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmAction = (messageId: string, confirmed: boolean) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          pendingConfirmation: undefined,
          toolCalls: msg.toolCalls?.map(tc => ({
            ...tc,
            status: confirmed ? 'executed' as const : 'failed' as const,
            result: confirmed ? 'Action exécutée avec succès' : 'Action annulée'
          }))
        }
      }
      return msg
    }))
  }

  const handleRetry = () => {
    // Retirer le dernier message d'erreur et le dernier message utilisateur
    const lastUserMessageIndex = messages.findLastIndex(m => m.role === 'user')
    if (lastUserMessageIndex > 0) {
      const userInput = messages[lastUserMessageIndex].content
      setMessages(prev => prev.slice(0, lastUserMessageIndex))
      setInput(userInput)
    }
  }

  return (
    <DashboardLayout user={DEV_USER}>
      <div className="flex h-[calc(100vh-8rem)] gap-6">
        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <CardHeader className="border-b py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                    <Bot className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Assistant Hub MCP</CardTitle>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {isConnected ? (
                        <>
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          Connecté - GPT-4o
                        </>
                      ) : (
                        <>
                          <WifiOff className="h-3 w-3 text-red-500" />
                          <span className="text-red-500">Déconnecté</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <History className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={`${message.error ? 'bg-red-500' : 'bg-primary'} text-primary-foreground`}>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                    <div
                      className={`rounded-lg p-4 ${message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : message.error
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-muted'
                        }`}
                    >
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>

                    {/* Citations */}
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Sources :</p>
                        {message.citations.map((citation) => {
                          const Icon = typeIcons[citation.type]
                          return (
                            <div
                              key={citation.id}
                              className="flex items-start gap-2 p-2 rounded-lg border bg-background hover:bg-muted/50 cursor-pointer transition-colors"
                            >
                              <div className={`p-1.5 rounded ${typeColors[citation.type]}`}>
                                <Icon className="h-3 w-3" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{citation.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{citation.excerpt}</p>
                                <p className="text-xs text-muted-foreground mt-1">{citation.source}</p>
                              </div>
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Tool calls executed */}
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Actions exécutées :</p>
                        {message.toolCalls.map((tc, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-2 text-sm p-2 rounded border ${
                              tc.status === 'executed'
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-red-50 border-red-200 text-red-700'
                            }`}
                          >
                            {tc.status === 'executed' ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                            <span className="font-medium">{tc.name}</span>
                            {tc.result && <span className="text-xs">- {tc.result}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pending confirmation */}
                    {message.pendingConfirmation && (
                      <div className="mt-3 p-3 rounded-lg border-2 border-yellow-500 bg-yellow-50">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-yellow-800">Confirmation requise</p>
                            <p className="text-sm text-yellow-700">{message.pendingConfirmation.description}</p>
                            <div className="flex items-center gap-2 mt-3">
                              <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                                Risque: {message.pendingConfirmation.risk}
                              </Badge>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                onClick={() => handleConfirmAction(message.id, true)}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Confirmer
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleConfirmAction(message.id, false)}
                              >
                                Annuler
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Message actions */}
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-1 mt-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                        {message.error && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={handleRetry}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">L'assistant réfléchit...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </CardContent>

            {/* Suggested prompts */}
            {messages.length <= 2 && (
              <div className="px-4 pb-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">Suggestions :</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setInput(prompt.text)
                        inputRef.current?.focus()
                      }}
                    >
                      <prompt.icon className="mr-2 h-3 w-3" />
                      {prompt.text}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t p-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" disabled>
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  ref={inputRef}
                  placeholder="Posez une question ou demandez une action..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button variant="ghost" size="icon" disabled>
                  <Mic className="h-4 w-4" />
                </Button>
                <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                L'assistant utilise GPT-4o et recherche dans vos documents indexés
              </p>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="w-72 space-y-4">
          {/* Quick actions */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Actions rapides
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3 space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-9"
                onClick={() => setInput('Crée une note de suivi pour ce projet')}
              >
                <FileText className="mr-2 h-4 w-4" />
                Créer une note
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-9"
                onClick={() => setInput('Crée une tâche pour le suivi du projet')}
              >
                <FolderKanban className="mr-2 h-4 w-4" />
                Créer une tâche
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-9"
                onClick={() => setInput('Recherche les documents importants du projet')}
              >
                <Search className="mr-2 h-4 w-4" />
                Rechercher
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm h-9"
                onClick={() => setInput('Résume les derniers emails du projet')}
              >
                <Mail className="mr-2 h-4 w-4" />
                Résumer emails
              </Button>
            </CardContent>
          </Card>

          {/* Connection status */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">État du système</CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">API Chat</span>
                  <Badge variant={isConnected ? "default" : "destructive"}>
                    {isConnected ? 'Connecté' : 'Erreur'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Modèle</span>
                  <span className="font-medium">GPT-4o</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Outils</span>
                  <span className="font-medium">5 actifs</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent conversations */}
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Conversations récentes</CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="py-0 pb-3 space-y-1">
              <p className="text-xs text-muted-foreground text-center py-2">
                L'historique des conversations sera disponible prochainement
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
