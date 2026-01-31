'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Mail,
  Search,
  Filter,
  RefreshCw,
  Star,
  Paperclip,
  Clock,
  Inbox,
  Send,
  Archive,
  Trash2,
  Settings,
  Link2,
  Loader2,
  ChevronRight
} from 'lucide-react'

// DEV MODE
const DEV_USER = { name: 'Développeur', email: 'dev@example.com' }

interface Email {
  id: string
  from: {
    email: string
    name: string | null
  }
  to: string[]
  cc: string[]
  subject: string
  preview: string
  bodyText: string | null
  bodyHtml: string | null
  receivedAt: string
  attachments: Array<{ name: string; size: number }>
  project: { id: string; name: string } | null
  metadata: { labels?: string[]; isRead?: boolean; isStarred?: boolean }
}

interface Connector {
  id: string
  type: string
  name: string
  status: 'active' | 'inactive' | 'error' | 'syncing'
  lastSyncAt: string | null
}

interface Project {
  id: string
  name: string
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) return `${diffMins} min`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const labelColors: Record<string, string> = {
  'Client': 'bg-blue-100 text-blue-700',
  'Important': 'bg-red-100 text-red-700',
  'Fournisseur': 'bg-green-100 text-green-700',
  'Administratif': 'bg-purple-100 text-purple-700',
  'Facture': 'bg-orange-100 text-orange-700',
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>([])
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [availableProjects, setAvailableProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolder, setSelectedFolder] = useState('inbox')
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [selectedProjectForSync, setSelectedProjectForSync] = useState<string>('')

  // Fetch emails, connectors, and projects
  useEffect(() => {
    fetchEmails()
    fetchConnectors()
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setAvailableProjects(data)
        if (data.length > 0) {
          setSelectedProjectForSync(data[0].id)
        }
      }
    } catch {
      // Ignore project fetch errors
    }
  }

  const fetchEmails = async (search?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const response = await fetch(`/api/emails?${params}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors du chargement')
      }

      const data = await response.json()
      setEmails(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const fetchConnectors = async () => {
    try {
      const response = await fetch('/api/connectors?type=email')
      if (response.ok) {
        const data = await response.json()
        setConnectors(data)
      }
    } catch {
      // Ignore connector fetch errors
    }
  }

  const handleSync = async () => {
    if (connectors.length === 0 || !selectedProjectForSync) return

    setSyncing(true)
    setSyncResult(null)
    setShowSyncModal(false)

    try {
      const response = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectorId: connectors[0].id,
          projectId: selectedProjectForSync,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSyncResult({
          success: true,
          message: `Synchronisation terminee: ${data.itemsCreated || 0} nouveaux emails importes, ${data.itemsUpdated || 0} mis a jour`,
        })
        await fetchEmails()
        await fetchConnectors()
      } else {
        setSyncResult({
          success: false,
          message: data.error || 'Erreur lors de la synchronisation',
        })
      }
    } catch (err) {
      setSyncResult({
        success: false,
        message: err instanceof Error ? err.message : 'Erreur de connexion',
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleSearch = () => {
    fetchEmails(searchQuery)
  }

  const filteredEmails = emails.filter(email => {
    if (!searchQuery) return true
    return (
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (email.from.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.preview.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const unreadCount = emails.filter(e => !e.metadata?.isRead).length

  // Get unique projects from emails
  const projects = [...new Set(emails.filter(e => e.project).map(e => e.project!.name))]

  return (
    <DashboardLayout user={DEV_USER}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Emails</h1>
            <p className="text-muted-foreground">Centralisez et gérez les emails de vos projets</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => connectors.length > 0 ? setShowSyncModal(true) : null}
              disabled={syncing || connectors.length === 0}
            >
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Synchroniser
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/dashboard/settings/connectors'}
            >
              <Link2 className="mr-2 h-4 w-4" />
              Connecter un compte
            </Button>
          </div>
        </div>

        {/* Connected accounts */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Comptes connectés:</span>
                {connectors.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Aucun compte email connecté</span>
                ) : (
                  connectors.map((connector) => (
                    <div key={connector.id} className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${connector.status === 'active' ? 'bg-green-500' : connector.status === 'error' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`} />
                      <span className="text-sm">{connector.name}</span>
                      <Badge variant="outline" className="text-xs">{connector.type}</Badge>
                    </div>
                  ))
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/dashboard/settings/connectors'}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-48 space-y-1">
            <Button
              variant={selectedFolder === 'inbox' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setSelectedFolder('inbox')}
            >
              <Inbox className="mr-2 h-4 w-4" />
              Boîte de réception
              {unreadCount > 0 && (
                <Badge className="ml-auto" variant="default">{unreadCount}</Badge>
              )}
            </Button>
            <Button
              variant={selectedFolder === 'starred' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setSelectedFolder('starred')}
            >
              <Star className="mr-2 h-4 w-4" />
              Favoris
            </Button>
            <Button
              variant={selectedFolder === 'sent' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setSelectedFolder('sent')}
            >
              <Send className="mr-2 h-4 w-4" />
              Envoyés
            </Button>
            <Button
              variant={selectedFolder === 'archive' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setSelectedFolder('archive')}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archives
            </Button>
            <Button
              variant={selectedFolder === 'trash' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setSelectedFolder('trash')}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Corbeille
            </Button>

            {projects.length > 0 && (
              <div className="pt-4 border-t mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 px-3">PROJETS</p>
                {projects.map((project) => (
                  <Button
                    key={project}
                    variant="ghost"
                    className="w-full justify-start text-xs h-8"
                    onClick={() => setSearchQuery(project)}
                  >
                    <div className="h-2 w-2 rounded-full bg-primary mr-2" />
                    <span className="truncate">{project}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Email list */}
          <div className="flex-1">
            {/* Search and filters */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans les emails..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filtres
              </Button>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Error state */}
            {error && (
              <Card className="border-destructive">
                <CardContent className="py-6 text-center text-destructive">
                  <p>{error}</p>
                  <Button variant="outline" className="mt-4" onClick={() => fetchEmails()}>
                    Réessayer
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Email list */}
            {!loading && !error && (
              <Card>
                <CardContent className="p-0 divide-y">
                  {filteredEmails.map((email) => {
                    const isRead = email.metadata?.isRead ?? true
                    const isStarred = email.metadata?.isStarred ?? false
                    const labels = email.metadata?.labels ?? []

                    return (
                      <div
                        key={email.id}
                        className={`flex items-start gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors ${!isRead ? 'bg-blue-50/50' : ''}`}
                        onClick={() => setSelectedEmail(email.id)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className={!isRead ? 'bg-primary text-primary-foreground' : ''}>
                            {getInitials(email.from.name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${!isRead ? 'font-semibold' : ''}`}>
                                {email.from.name || email.from.email}
                              </span>
                              {isStarred && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {email.attachments.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Paperclip className="h-3 w-3" />
                                  <span>{email.attachments.length}</span>
                                </div>
                              )}
                              <Clock className="h-3 w-3" />
                              <span>{getTimeAgo(email.receivedAt)}</span>
                            </div>
                          </div>

                          <p className={`text-sm mb-1 ${!isRead ? 'font-medium' : ''}`}>
                            {email.subject}
                          </p>

                          <p className="text-sm text-muted-foreground truncate mb-2">
                            {email.preview}
                          </p>

                          <div className="flex items-center gap-2">
                            {email.project && (
                              <Badge variant="outline" className="text-xs">
                                {email.project.name}
                              </Badge>
                            )}
                            {labels.map((label) => (
                              <span
                                key={label}
                                className={`text-xs px-2 py-0.5 rounded-full ${labelColors[label] || 'bg-gray-100 text-gray-700'}`}
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        </div>

                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}

                  {filteredEmails.length === 0 && (
                    <div className="py-12 text-center">
                      <Mail className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <h3 className="mt-4 font-medium">Aucun email trouvé</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery ? 'Essayez avec d\'autres termes de recherche' : 'Connectez un compte email pour commencer'}
                      </p>
                      {connectors.length === 0 && (
                        <Button
                          className="mt-4"
                          onClick={() => window.location.href = '/dashboard/settings/connectors'}
                        >
                          <Link2 className="mr-2 h-4 w-4" />
                          Connecter un compte
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Sync Result Toast */}
        {syncResult && (
          <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg max-w-md ${syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-start gap-3">
              {syncResult.success ? (
                <div className="text-green-600">&#10003;</div>
              ) : (
                <div className="text-red-600">&#10007;</div>
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${syncResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {syncResult.success ? 'Synchronisation reussie' : 'Erreur de synchronisation'}
                </p>
                <p className={`text-sm ${syncResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {syncResult.message}
                </p>
              </div>
              <button
                onClick={() => setSyncResult(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                &#10005;
              </button>
            </div>
          </div>
        )}

        {/* Sync Modal */}
        {showSyncModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Synchroniser les emails</h3>

                {availableProjects.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">
                      Vous devez creer un projet avant de synchroniser des emails.
                    </p>
                    <Button onClick={() => window.location.href = '/dashboard/projects'}>
                      Creer un projet
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      Selectionnez le projet auquel associer les emails importes:
                    </p>

                    <select
                      className="w-full px-3 py-2 border rounded-md mb-4"
                      value={selectedProjectForSync}
                      onChange={(e) => setSelectedProjectForSync(e.target.value)}
                    >
                      {availableProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowSyncModal(false)}
                      >
                        Annuler
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleSync}
                        disabled={!selectedProjectForSync}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Synchroniser
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
