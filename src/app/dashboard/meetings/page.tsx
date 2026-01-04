'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Calendar,
  Plus,
  Search,
  Clock,
  MapPin,
  Users,
  Video,
  Phone,
  FileText,
  Mic,
  Play,
  Download,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  MoreVertical
} from 'lucide-react'

// DEV MODE: Mock data
const DEV_USER = { name: 'Développeur', email: 'dev@example.com' }

const MOCK_MEETINGS = [
  {
    id: '1',
    title: 'Réunion de chantier - Appartement Haussmann',
    date: new Date(Date.now() + 86400000).toISOString(),
    time: '10:00',
    duration: 90,
    type: 'on-site' as const,
    location: '15 Avenue Montaigne, Paris 8e',
    project: 'Rénovation Appartement Haussmann',
    attendees: [
      { name: 'Jean Dupont', role: 'Client' },
      { name: 'Marie Martin', role: 'Architecte' },
      { name: 'Pierre Durand', role: 'Chef de chantier' },
    ],
    hasRecording: false,
    hasTranscription: false,
    hasSummary: false,
    status: 'upcoming' as const,
  },
  {
    id: '2',
    title: 'Point hebdomadaire - TechCorp',
    date: new Date(Date.now() + 172800000).toISOString(),
    time: '14:30',
    duration: 60,
    type: 'video' as const,
    location: 'Google Meet',
    project: 'Bureaux Startup Tech',
    attendees: [
      { name: 'Sophie Bernard', role: 'Client' },
      { name: 'Marc Lefebvre', role: 'Designer' },
    ],
    hasRecording: false,
    hasTranscription: false,
    hasSummary: false,
    status: 'upcoming' as const,
  },
  {
    id: '3',
    title: 'Validation finale plans - Villa Côte d\'Azur',
    date: new Date(Date.now() - 86400000).toISOString(),
    time: '11:00',
    duration: 120,
    type: 'video' as const,
    location: 'Zoom',
    project: 'Villa Côte d\'Azur',
    attendees: [
      { name: 'M. et Mme Bernard', role: 'Clients' },
      { name: 'Équipe projet', role: 'Interne' },
    ],
    hasRecording: true,
    hasTranscription: true,
    hasSummary: true,
    status: 'completed' as const,
    summary: 'Plans validés avec modifications mineures sur la terrasse. Prochain RDV pour choix des matériaux.',
  },
  {
    id: '4',
    title: 'Réunion permis de construire',
    date: new Date(Date.now() - 259200000).toISOString(),
    time: '09:00',
    duration: 45,
    type: 'phone' as const,
    location: 'Appel téléphonique',
    project: 'Extension Maison Vincennes',
    attendees: [
      { name: 'Service Urbanisme', role: 'Administration' },
    ],
    hasRecording: true,
    hasTranscription: true,
    hasSummary: true,
    status: 'completed' as const,
    summary: 'Dossier accepté avec réserves. Documents complémentaires à fournir sous 15 jours.',
  },
  {
    id: '5',
    title: 'Kick-off projet Extension',
    date: new Date(Date.now() - 604800000).toISOString(),
    time: '15:00',
    duration: 90,
    type: 'on-site' as const,
    location: 'Bureau cabinet',
    project: 'Extension Maison Vincennes',
    attendees: [
      { name: 'Mme Martin', role: 'Cliente' },
      { name: 'Équipe architecture', role: 'Interne' },
    ],
    hasRecording: true,
    hasTranscription: true,
    hasSummary: true,
    status: 'completed' as const,
    summary: 'Définition du cahier des charges. Budget validé. Démarrage études préliminaires.',
  },
]

const typeConfig = {
  'on-site': { icon: MapPin, label: 'Sur site', color: 'text-green-600' },
  'video': { icon: Video, label: 'Visio', color: 'text-blue-600' },
  'phone': { icon: Phone, label: 'Téléphone', color: 'text-orange-600' },
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === today.toDateString()) return 'Aujourd\'hui'
  if (date.toDateString() === tomorrow.toDateString()) return 'Demain'
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function MeetingsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all')

  const filteredMeetings = MOCK_MEETINGS.filter(meeting => {
    const matchesSearch =
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meeting.project.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter =
      filter === 'all' ||
      (filter === 'upcoming' && meeting.status === 'upcoming') ||
      (filter === 'completed' && meeting.status === 'completed')
    return matchesSearch && matchesFilter
  })

  const upcomingMeetings = MOCK_MEETINGS.filter(m => m.status === 'upcoming')
  const completedMeetings = MOCK_MEETINGS.filter(m => m.status === 'completed')
  const totalRecordings = MOCK_MEETINGS.filter(m => m.hasRecording).length

  return (
    <DashboardLayout user={DEV_USER}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Réunions</h1>
            <p className="text-muted-foreground">Planifiez vos réunions et accédez aux comptes-rendus</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Connecter agenda
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle réunion
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{upcomingMeetings.length}</p>
                  <p className="text-xs text-muted-foreground">À venir</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedMeetings.length}</p>
                  <p className="text-xs text-muted-foreground">Terminées</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                  <Mic className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalRecordings}</p>
                  <p className="text-xs text-muted-foreground">Enregistrements</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{MOCK_MEETINGS.filter(m => m.hasSummary).length}</p>
                  <p className="text-xs text-muted-foreground">Comptes-rendus</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une réunion..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Toutes
            </Button>
            <Button
              variant={filter === 'upcoming' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('upcoming')}
            >
              À venir
            </Button>
            <Button
              variant={filter === 'completed' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('completed')}
            >
              Terminées
            </Button>
          </div>
        </div>

        {/* Meetings list */}
        <div className="space-y-4">
          {filteredMeetings.map((meeting) => {
            const TypeIcon = typeConfig[meeting.type].icon
            return (
              <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Date badge */}
                    <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg ${meeting.status === 'upcoming' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <span className="text-2xl font-bold">{new Date(meeting.date).getDate()}</span>
                      <span className="text-xs uppercase">{new Date(meeting.date).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{meeting.title}</h3>
                        <Badge variant={meeting.status === 'upcoming' ? 'default' : 'secondary'}>
                          {meeting.status === 'upcoming' ? 'À venir' : 'Terminée'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{meeting.time} ({meeting.duration} min)</span>
                        </div>
                        <div className={`flex items-center gap-1 ${typeConfig[meeting.type].color}`}>
                          <TypeIcon className="h-4 w-4" />
                          <span>{meeting.location}</span>
                        </div>
                        <Badge variant="outline">{meeting.project}</Badge>
                      </div>

                      {/* Attendees */}
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div className="flex -space-x-2">
                          {meeting.attendees.slice(0, 4).map((attendee, i) => (
                            <Avatar key={i} className="h-8 w-8 border-2 border-background">
                              <AvatarFallback className="text-xs">{getInitials(attendee.name)}</AvatarFallback>
                            </Avatar>
                          ))}
                          {meeting.attendees.length > 4 && (
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted border-2 border-background text-xs">
                              +{meeting.attendees.length - 4}
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {meeting.attendees.map(a => a.name).join(', ')}
                        </span>
                      </div>

                      {/* Summary for completed meetings */}
                      {meeting.status === 'completed' && meeting.summary && (
                        <div className="bg-muted/50 rounded-lg p-3 mb-3">
                          <p className="text-sm font-medium mb-1">Résumé IA</p>
                          <p className="text-sm text-muted-foreground">{meeting.summary}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {meeting.status === 'completed' && (
                          <>
                            {meeting.hasRecording && (
                              <Button variant="outline" size="sm">
                                <Play className="mr-2 h-3 w-3" />
                                Écouter
                              </Button>
                            )}
                            {meeting.hasTranscription && (
                              <Button variant="outline" size="sm">
                                <FileText className="mr-2 h-3 w-3" />
                                Transcription
                              </Button>
                            )}
                            {meeting.hasSummary && (
                              <Button variant="outline" size="sm">
                                <Download className="mr-2 h-3 w-3" />
                                Exporter
                              </Button>
                            )}
                          </>
                        )}
                        {meeting.status === 'upcoming' && (
                          <>
                            <Button variant="outline" size="sm">
                              <Mic className="mr-2 h-3 w-3" />
                              Enregistrer
                            </Button>
                            <Button size="sm">
                              Rejoindre
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {filteredMeetings.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 font-medium">Aucune réunion trouvée</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery ? 'Essayez avec d\'autres termes de recherche' : 'Planifiez votre première réunion'}
                </p>
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle réunion
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
