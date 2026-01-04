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
  Plus
} from 'lucide-react'

// DEV MODE: Mock data
const DEV_USER = { name: 'Développeur', email: 'dev@example.com' }

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  citations?: Citation[]
  toolCalls?: ToolCall[]
  pendingConfirmation?: PendingAction
}

interface Citation {
  id: string
  type: 'document' | 'email' | 'meeting' | 'note'
  title: string
  excerpt: string
  source: string
}

interface ToolCall {
  name: string
  status: 'pending' | 'executed' | 'failed'
  result?: string
}

interface PendingAction {
  type: string
  description: string
  risk: 'low' | 'medium' | 'high'
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Bonjour ! Je suis votre assistant Hub MCP. Je peux vous aider à rechercher des informations dans vos projets, emails, documents et réunions. Je peux également exécuter des actions comme envoyer des emails ou créer des tâches.\n\nQue puis-je faire pour vous aujourd\'hui ?',
    timestamp: new Date(Date.now() - 60000),
  },
]

const SUGGESTED_PROMPTS = [
  { icon: Search, text: 'Quel est l\'état d\'avancement du projet Haussmann ?' },
  { icon: Mail, text: 'Résume les derniers emails de Jean Dupont' },
  { icon: Calendar, text: 'Quelles sont les prochaines réunions prévues ?' },
  { icon: FileText, text: 'Trouve les devis en attente de validation' },
]

const MOCK_CITATIONS: Citation[] = [
  {
    id: '1',
    type: 'email',
    title: 'RE: Plans révisés appartement Haussmann',
    excerpt: 'Le client a validé les modifications de la cuisine...',
    source: 'Jean Dupont - il y a 2 jours',
  },
  {
    id: '2',
    type: 'document',
    title: 'Compte-rendu réunion chantier',
    excerpt: 'Avancement travaux : 65% - Prochaine étape : pose menuiseries',
    source: 'Réunion du 15/01/2024',
  },
  {
    id: '3',
    type: 'meeting',
    title: 'Point hebdomadaire client',
    excerpt: 'Discussion sur les choix de revêtements...',
    source: 'Réunion du 12/01/2024',
  },
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateMockResponse(input),
        timestamp: new Date(),
        citations: input.toLowerCase().includes('projet') || input.toLowerCase().includes('haussmann')
          ? MOCK_CITATIONS
          : undefined,
        toolCalls: input.toLowerCase().includes('email') || input.toLowerCase().includes('envoie')
          ? [{ name: 'send_email', status: 'pending' }]
          : undefined,
        pendingConfirmation: input.toLowerCase().includes('envoie')
          ? {
            type: 'send_email',
            description: 'Envoyer un email à Jean Dupont',
            risk: 'medium'
          }
          : undefined,
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }

  const generateMockResponse = (query: string): string => {
    if (query.toLowerCase().includes('avancement') || query.toLowerCase().includes('haussmann')) {
      return `**Projet Rénovation Appartement Haussmann - État d'avancement**

📊 **Progression globale : 65%**

**Travaux terminés :**
- Démolition et gros œuvre ✅
- Électricité (passage câbles) ✅
- Plomberie (réseaux) ✅

**En cours :**
- Pose des menuiseries intérieures (prévu semaine prochaine)
- Finitions plâtrerie

**À venir :**
- Peinture
- Pose carrelage cuisine et SDB
- Installation cuisine

**Prochaine réunion de chantier :** Demain à 10h00

Le client a validé les derniers choix de matériaux pour la cuisine lors de notre dernier échange.`
    }

    if (query.toLowerCase().includes('email') || query.toLowerCase().includes('dupont')) {
      return `Voici un résumé des **3 derniers emails de Jean Dupont** :

1. **Aujourd'hui** - "RE: Plans révisés appartement"
   → Validation des plans avec remarques mineures sur la cuisine

2. **Il y a 2 jours** - "Question matériaux salle de bain"
   → Demande de précisions sur les options de carrelage

3. **Il y a 5 jours** - "Planning travaux"
   → Confirmation de disponibilité pour la réunion de chantier

*Souhaitez-vous que je vous aide à rédiger une réponse ?*`
    }

    if (query.toLowerCase().includes('réunion') || query.toLowerCase().includes('prochaine')) {
      return `**Prochaines réunions prévues :**

📅 **Demain - 10h00**
Réunion de chantier - Appartement Haussmann
📍 15 Avenue Montaigne, Paris 8e

📅 **Jeudi - 14h30**
Point hebdomadaire - TechCorp
💻 Google Meet

📅 **Vendredi - 11h00**
Validation matériaux - Villa Côte d'Azur
💻 Zoom

*Voulez-vous que j'ajoute une réunion au planning ?*`
    }

    return `J'ai bien compris votre demande. Je recherche dans vos projets, emails et documents...

Pour vous donner une réponse précise, pourriez-vous me donner plus de contexte sur :
- Le projet concerné
- La période de temps

*Vous pouvez aussi utiliser les suggestions ci-dessous pour des recherches rapides.*`
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
            result: confirmed ? 'Email envoyé avec succès' : 'Action annulée'
          }))
        }
      }
      return msg
    }))
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
                    <p className="text-xs text-muted-foreground">
                      Recherche sémantique - Actions automatisées
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
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                    <div
                      className={`rounded-lg p-4 ${message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
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

                    {/* Tool call results */}
                    {message.toolCalls?.some(tc => tc.status !== 'pending') && (
                      <div className="mt-2">
                        {message.toolCalls.map((tc, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-2 text-sm ${tc.status === 'executed' ? 'text-green-600' : 'text-red-600'
                              }`}
                          >
                            {tc.status === 'executed' ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                            <span>{tc.result}</span>
                          </div>
                        ))}
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
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <RotateCcw className="h-3 w-3" />
                        </Button>
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
                      <span className="text-sm text-muted-foreground">Recherche en cours...</span>
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
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  ref={inputRef}
                  placeholder="Posez une question ou demandez une action..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon">
                  <Mic className="h-4 w-4" />
                </Button>
                <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                L'assistant recherche dans vos documents, emails et réunions
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
              <Button variant="ghost" className="w-full justify-start text-sm h-9">
                <Mail className="mr-2 h-4 w-4" />
                Rédiger un email
              </Button>
              <Button variant="ghost" className="w-full justify-start text-sm h-9">
                <FileText className="mr-2 h-4 w-4" />
                Résumer un document
              </Button>
              <Button variant="ghost" className="w-full justify-start text-sm h-9">
                <Calendar className="mr-2 h-4 w-4" />
                Planifier une réunion
              </Button>
              <Button variant="ghost" className="w-full justify-start text-sm h-9">
                <FolderKanban className="mr-2 h-4 w-4" />
                État d'un projet
              </Button>
            </CardContent>
          </Card>

          {/* Context */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Contexte actuel</CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Projet</span>
                  <Badge variant="outline">Tous</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Documents indexés</span>
                  <span className="font-medium">156</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Emails analysés</span>
                  <span className="font-medium">1,247</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Réunions</span>
                  <span className="font-medium">45</span>
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
              {['Avancement Haussmann', 'Devis menuiserie', 'Planning TechCorp'].map((conv, i) => (
                <Button key={i} variant="ghost" className="w-full justify-start text-sm h-9">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span className="truncate">{conv}</span>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
