'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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
  MoreVertical,
  ChevronRight,
  Settings,
  Link2
} from 'lucide-react'

// DEV MODE: Mock data
const DEV_USER = { name: 'Développeur', email: 'dev@example.com' }

const MOCK_EMAILS = [
  {
    id: '1',
    from: 'jean.dupont@client.fr',
    fromName: 'Jean Dupont',
    subject: 'RE: Plans révisés appartement Haussmann',
    preview: 'Bonjour, je viens de recevoir les plans révisés et j\'ai quelques remarques concernant la disposition de la cuisine...',
    receivedAt: new Date(Date.now() - 1800000).toISOString(),
    isRead: false,
    isStarred: true,
    hasAttachments: true,
    attachmentCount: 3,
    project: 'Rénovation Appartement Haussmann',
    labels: ['Client', 'Important'],
  },
  {
    id: '2',
    from: 'marie.martin@architecte.com',
    fromName: 'Marie Martin',
    subject: 'Validation des matériaux - Villa Côte d\'Azur',
    preview: 'Suite à notre réunion de ce matin, voici la liste des matériaux validés pour la façade. Merci de confirmer...',
    receivedAt: new Date(Date.now() - 7200000).toISOString(),
    isRead: true,
    isStarred: false,
    hasAttachments: true,
    attachmentCount: 1,
    project: 'Villa Côte d\'Azur',
    labels: ['Fournisseur'],
  },
  {
    id: '3',
    from: 'permis@mairie-paris.fr',
    fromName: 'Service Urbanisme Paris',
    subject: 'Notification - Dossier PC 75008-2024-001',
    preview: 'Madame, Monsieur, nous vous informons que votre dossier de permis de construire a été instruit favorablement...',
    receivedAt: new Date(Date.now() - 86400000).toISOString(),
    isRead: true,
    isStarred: true,
    hasAttachments: true,
    attachmentCount: 2,
    project: 'Extension Maison Vincennes',
    labels: ['Administratif', 'Important'],
  },
  {
    id: '4',
    from: 'contact@techcorp.io',
    fromName: 'Sophie Bernard - TechCorp',
    subject: 'Aménagement bureaux - Planning travaux',
    preview: 'Bonjour, pourriez-vous nous envoyer le planning prévisionnel des travaux ? Nous devons organiser le déménagement...',
    receivedAt: new Date(Date.now() - 172800000).toISOString(),
    isRead: true,
    isStarred: false,
    hasAttachments: false,
    attachmentCount: 0,
    project: 'Bureaux Startup Tech',
    labels: ['Client'],
  },
  {
    id: '5',
    from: 'factures@fournisseur.com',
    fromName: 'Comptabilité Matériaux Pro',
    subject: 'Facture N°2024-1234 - Livraison carrelage',
    preview: 'Veuillez trouver ci-joint la facture relative à la livraison de carrelage effectuée le 15/01/2024...',
    receivedAt: new Date(Date.now() - 259200000).toISOString(),
    isRead: true,
    isStarred: false,
    hasAttachments: true,
    attachmentCount: 1,
    project: 'Rénovation Appartement Haussmann',
    labels: ['Facture'],
  },
]

const CONNECTED_ACCOUNTS = [
  { email: 'cabinet@architecte.fr', provider: 'Gmail', status: 'connected' },
  { email: 'pro@outlook.com', provider: 'Outlook', status: 'syncing' },
]

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

function getInitials(name: string): string {
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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolder, setSelectedFolder] = useState('inbox')
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)

  const filteredEmails = MOCK_EMAILS.filter(email =>
    email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.fromName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.preview.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const unreadCount = MOCK_EMAILS.filter(e => !e.isRead).length

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
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Synchroniser
            </Button>
            <Button variant="outline" size="sm">
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
                {CONNECTED_ACCOUNTS.map((account) => (
                  <div key={account.email} className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${account.status === 'connected' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                    <span className="text-sm">{account.email}</span>
                    <Badge variant="outline" className="text-xs">{account.provider}</Badge>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm">
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

            <div className="pt-4 border-t mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2 px-3">PROJETS</p>
              {['Rénovation Appartement Haussmann', 'Villa Côte d\'Azur', 'Bureaux Startup Tech'].map((project) => (
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
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filtres
              </Button>
            </div>

            {/* Email list */}
            <Card>
              <CardContent className="p-0 divide-y">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    className={`flex items-start gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors ${!email.isRead ? 'bg-blue-50/50' : ''}`}
                    onClick={() => setSelectedEmail(email.id)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={!email.isRead ? 'bg-primary text-primary-foreground' : ''}>
                        {getInitials(email.fromName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${!email.isRead ? 'font-semibold' : ''}`}>
                            {email.fromName}
                          </span>
                          {email.isStarred && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {email.hasAttachments && (
                            <div className="flex items-center gap-1">
                              <Paperclip className="h-3 w-3" />
                              <span>{email.attachmentCount}</span>
                            </div>
                          )}
                          <Clock className="h-3 w-3" />
                          <span>{getTimeAgo(email.receivedAt)}</span>
                        </div>
                      </div>

                      <p className={`text-sm mb-1 ${!email.isRead ? 'font-medium' : ''}`}>
                        {email.subject}
                      </p>

                      <p className="text-sm text-muted-foreground truncate mb-2">
                        {email.preview}
                      </p>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {email.project}
                        </Badge>
                        {email.labels.map((label) => (
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
                ))}

                {filteredEmails.length === 0 && (
                  <div className="py-12 text-center">
                    <Mail className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 font-medium">Aucun email trouvé</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchQuery ? 'Essayez avec d\'autres termes de recherche' : 'Connectez un compte email pour commencer'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
