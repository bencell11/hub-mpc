'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Mail,
  MessageCircle,
  Calendar,
  HardDrive,
  Plus,
  Settings,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  ExternalLink
} from 'lucide-react'

// DEV MODE
const DEV_USER = { name: 'Développeur', email: 'dev@example.com' }

interface Connector {
  id: string
  type: 'EMAIL' | 'TELEGRAM' | 'CALENDAR' | 'STORAGE'
  name: string
  status: 'active' | 'inactive' | 'error'
  lastSync?: string
  config: Record<string, string>
}

// Données mockées pour la démo
const MOCK_CONNECTORS: Connector[] = [
  {
    id: '1',
    type: 'EMAIL',
    name: 'Gmail Professionnel',
    status: 'active',
    lastSync: '2024-01-24T10:30:00Z',
    config: { email: 'cabinet@architectes.fr', provider: 'gmail' }
  },
]

const CONNECTOR_TYPES = [
  {
    type: 'EMAIL' as const,
    icon: Mail,
    title: 'Email',
    description: 'Connectez Gmail ou un serveur IMAP pour importer vos emails',
    color: 'text-red-500 bg-red-50',
    available: true,
  },
  {
    type: 'TELEGRAM' as const,
    icon: MessageCircle,
    title: 'Telegram',
    description: 'Recevez des notifications et envoyez des messages via un bot Telegram',
    color: 'text-blue-500 bg-blue-50',
    available: true,
  },
  {
    type: 'CALENDAR' as const,
    icon: Calendar,
    title: 'Calendrier',
    description: 'Synchronisez Google Calendar ou Outlook pour vos réunions',
    color: 'text-purple-500 bg-purple-50',
    available: false,
  },
  {
    type: 'STORAGE' as const,
    icon: HardDrive,
    title: 'Stockage Cloud',
    description: 'Connectez Google Drive ou Dropbox pour vos documents',
    color: 'text-green-500 bg-green-50',
    available: false,
  },
]

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>(MOCK_CONNECTORS)
  const [showAddModal, setShowAddModal] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // États du formulaire Email
  const [emailForm, setEmailForm] = useState({
    name: '',
    provider: 'gmail',
    email: '',
    password: '',
    imapHost: '',
    imapPort: '993',
  })

  // États du formulaire Telegram
  const [telegramForm, setTelegramForm] = useState({
    name: '',
    botToken: '',
    chatId: '',
  })

  const handleAddConnector = async (type: string) => {
    setIsLoading(true)

    // Simuler l'ajout
    await new Promise(resolve => setTimeout(resolve, 1500))

    const newConnector: Connector = {
      id: Date.now().toString(),
      type: type as Connector['type'],
      name: type === 'EMAIL' ? emailForm.name : telegramForm.name,
      status: 'active',
      lastSync: new Date().toISOString(),
      config: type === 'EMAIL'
        ? { email: emailForm.email, provider: emailForm.provider }
        : { chatId: telegramForm.chatId }
    }

    setConnectors(prev => [...prev, newConnector])
    setShowAddModal(null)
    setIsLoading(false)

    // Reset forms
    setEmailForm({ name: '', provider: 'gmail', email: '', password: '', imapHost: '', imapPort: '993' })
    setTelegramForm({ name: '', botToken: '', chatId: '' })
  }

  const handleDeleteConnector = (id: string) => {
    setConnectors(prev => prev.filter(c => c.id !== id))
  }

  const handleSyncConnector = async (id: string) => {
    setConnectors(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'active' as const, lastSync: new Date().toISOString() } : c
    ))
  }

  const formatLastSync = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)}h`
    return d.toLocaleDateString('fr-FR')
  }

  return (
    <DashboardLayout user={DEV_USER}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Connecteurs</h1>
            <p className="text-muted-foreground">
              Gérez vos intégrations avec les services externes
            </p>
          </div>
        </div>

        {/* Connecteurs actifs */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Connecteurs actifs</h2>

          {connectors.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Aucun connecteur configuré. Ajoutez-en un ci-dessous.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {connectors.map(connector => {
                const typeInfo = CONNECTOR_TYPES.find(t => t.type === connector.type)
                const Icon = typeInfo?.icon || Settings

                return (
                  <Card key={connector.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${typeInfo?.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{connector.name}</h3>
                            <Badge variant={connector.status === 'active' ? 'default' : 'destructive'}>
                              {connector.status === 'active' ? (
                                <><CheckCircle2 className="h-3 w-3 mr-1" /> Actif</>
                              ) : (
                                <><XCircle className="h-3 w-3 mr-1" /> Erreur</>
                              )}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {connector.config.email || connector.config.chatId}
                          </p>
                          {connector.lastSync && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Dernière sync : {formatLastSync(connector.lastSync)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSyncConnector(connector.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDeleteConnector(connector.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Ajouter un connecteur */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Ajouter un connecteur</h2>

          <div className="grid md:grid-cols-2 gap-4">
            {CONNECTOR_TYPES.map(type => (
              <Card
                key={type.type}
                className={!type.available ? 'opacity-60' : 'hover:border-primary cursor-pointer transition-colors'}
                onClick={() => type.available && setShowAddModal(type.type)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${type.color}`}>
                      <type.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{type.title}</CardTitle>
                      {!type.available && (
                        <Badge variant="secondary" className="text-xs">Bientôt disponible</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{type.description}</CardDescription>
                </CardContent>
                {type.available && (
                  <CardFooter className="pt-0">
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Configurer
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Modal Email */}
        {showAddModal === 'EMAIL' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-red-500" />
                  Configurer Email
                </CardTitle>
                <CardDescription>
                  Connectez votre boîte mail pour importer vos emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nom du connecteur</label>
                  <Input
                    placeholder="Ex: Gmail Professionnel"
                    value={emailForm.name}
                    onChange={e => setEmailForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Fournisseur</label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    value={emailForm.provider}
                    onChange={e => setEmailForm(prev => ({ ...prev, provider: e.target.value }))}
                  >
                    <option value="gmail">Gmail (OAuth)</option>
                    <option value="imap">Serveur IMAP</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Adresse email</label>
                  <Input
                    type="email"
                    placeholder="votre@email.com"
                    value={emailForm.email}
                    onChange={e => setEmailForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                {emailForm.provider === 'gmail' ? (
                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
                    <p className="font-medium text-blue-800">Connexion OAuth</p>
                    <p className="text-blue-700 mt-1">
                      Vous serez redirigé vers Google pour autoriser l'accès à votre compte.
                    </p>
                    <Button variant="outline" size="sm" className="mt-2">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Se connecter avec Google
                    </Button>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium">Mot de passe / App Password</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={emailForm.password}
                          onChange={e => setEmailForm(prev => ({ ...prev, password: e.target.value }))}
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Serveur IMAP</label>
                        <Input
                          placeholder="imap.exemple.com"
                          value={emailForm.imapHost}
                          onChange={e => setEmailForm(prev => ({ ...prev, imapHost: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Port</label>
                        <Input
                          placeholder="993"
                          value={emailForm.imapPort}
                          onChange={e => setEmailForm(prev => ({ ...prev, imapPort: e.target.value }))}
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddModal(null)}
                  disabled={isLoading}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleAddConnector('EMAIL')}
                  disabled={isLoading || !emailForm.name || !emailForm.email}
                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connexion...</>
                  ) : (
                    'Connecter'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* Modal Telegram */}
        {showAddModal === 'TELEGRAM' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-500" />
                  Configurer Telegram
                </CardTitle>
                <CardDescription>
                  Connectez un bot Telegram pour les notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg text-sm">
                  <p className="font-medium text-blue-800">Comment créer un bot Telegram ?</p>
                  <ol className="text-blue-700 mt-2 list-decimal list-inside space-y-1">
                    <li>Ouvrez Telegram et cherchez @BotFather</li>
                    <li>Envoyez /newbot et suivez les instructions</li>
                    <li>Copiez le token fourni ci-dessous</li>
                  </ol>
                </div>

                <div>
                  <label className="text-sm font-medium">Nom du connecteur</label>
                  <Input
                    placeholder="Ex: Notifications Cabinet"
                    value={telegramForm.name}
                    onChange={e => setTelegramForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Token du bot</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="123456789:ABCdefGHI..."
                      value={telegramForm.botToken}
                      onChange={e => setTelegramForm(prev => ({ ...prev, botToken: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Chat ID (optionnel)</label>
                  <Input
                    placeholder="ID du chat ou groupe"
                    value={telegramForm.chatId}
                    onChange={e => setTelegramForm(prev => ({ ...prev, chatId: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Envoyez /start à votre bot pour obtenir votre Chat ID
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddModal(null)}
                  disabled={isLoading}
                >
                  Annuler
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleAddConnector('TELEGRAM')}
                  disabled={isLoading || !telegramForm.name || !telegramForm.botToken}
                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connexion...</>
                  ) : (
                    'Connecter'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
