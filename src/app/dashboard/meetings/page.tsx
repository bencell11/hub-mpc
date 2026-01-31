'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
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
  CalendarDays,
  CheckCircle2,
  MoreVertical,
  Loader2,
  X,
  ChevronRight,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

// DEV MODE
const DEV_USER = { name: 'Développeur', email: 'dev@example.com' }

interface Attendee {
  name: string
  role: string
}

interface Meeting {
  id: string
  title: string
  date: string
  time: string
  duration: number
  type: 'on-site' | 'video' | 'phone'
  location: string | null
  project: { id: string; name: string } | null
  attendees: Attendee[]
  hasRecording: boolean
  hasTranscription: boolean
  hasSummary: boolean
  status: 'upcoming' | 'completed'
  summary?: string
}

interface Project {
  id: string
  name: string
}

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
  const router = useRouter()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all')
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false)

  // Fetch meetings and projects
  useEffect(() => {
    fetchMeetings()
    fetchProjects()
  }, [])

  const fetchMeetings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/meetings')

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors du chargement')
      }

      const data = await response.json()
      setMeetings(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch {
      // Ignore project fetch errors
    }
  }

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch =
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (meeting.project?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter =
      filter === 'all' ||
      (filter === 'upcoming' && meeting.status === 'upcoming') ||
      (filter === 'completed' && meeting.status === 'completed')
    return matchesSearch && matchesFilter
  })

  const upcomingMeetings = meetings.filter(m => m.status === 'upcoming')
  const completedMeetings = meetings.filter(m => m.status === 'completed')
  const totalRecordings = meetings.filter(m => m.hasRecording).length

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
            <Button onClick={() => setShowNewMeetingModal(true)}>
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
                  <p className="text-2xl font-bold">{meetings.filter(m => m.hasSummary).length}</p>
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
              <Button variant="outline" className="mt-4" onClick={fetchMeetings}>
                Réessayer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Meetings list */}
        {!loading && !error && (
          <div className="space-y-4">
            {filteredMeetings.map((meeting) => {
              const TypeIcon = typeConfig[meeting.type]?.icon || MapPin
              const typeStyle = typeConfig[meeting.type] || typeConfig['on-site']
              return (
                <Card
                  key={meeting.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/dashboard/meetings/${meeting.id}`)}
                >
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
                          <div className={`flex items-center gap-1 ${typeStyle.color}`}>
                            <TypeIcon className="h-4 w-4" />
                            <span>{meeting.location || typeStyle.label}</span>
                          </div>
                          {meeting.project && (
                            <Badge variant="outline">{meeting.project.name}</Badge>
                          )}
                        </div>

                        {/* Attendees */}
                        {meeting.attendees.length > 0 && (
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
                        )}

                        {/* Summary for completed meetings */}
                        {meeting.status === 'completed' && meeting.summary && (
                          <div className="bg-muted/50 rounded-lg p-3 mb-3">
                            <p className="text-sm font-medium mb-1">Résumé IA</p>
                            <p className="text-sm text-muted-foreground">{meeting.summary}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/dashboard/meetings/${meeting.id}`)}
                              >
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

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            // TODO: Open menu
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
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
                  <Button className="mt-4" onClick={() => setShowNewMeetingModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle réunion
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* New Meeting Modal */}
        {showNewMeetingModal && (
          <NewMeetingModal
            projects={projects}
            onClose={() => setShowNewMeetingModal(false)}
            onCreated={() => {
              setShowNewMeetingModal(false)
              fetchMeetings()
            }}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

// Modal de création de réunion
function NewMeetingModal({
  projects,
  onClose,
  onCreated
}: {
  projects: Project[]
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState('60')
  const [type, setType] = useState<'on-site' | 'video' | 'phone'>('video')
  const [location, setLocation] = useState('')
  const [projectId, setProjectId] = useState('')
  const [attendees, setAttendees] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Parse attendees
    const attendeesList = attendees
      .split(',')
      .map(a => a.trim())
      .filter(a => a)
      .map(name => ({ name, role: 'Participant' }))

    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          date,
          time,
          duration: parseInt(duration),
          type,
          location: location || null,
          projectId: projectId || null,
          attendees: attendeesList,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la création')
      }

      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Nouvelle réunion</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Titre de la réunion *</label>
              <Input
                placeholder="Ex: Réunion de chantier"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date *</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Heure *</label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Durée (minutes)</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">1 heure</option>
                  <option value="90">1h30</option>
                  <option value="120">2 heures</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value as typeof type)}
                >
                  <option value="video">Visioconférence</option>
                  <option value="on-site">Sur site</option>
                  <option value="phone">Téléphone</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Lieu / Lien</label>
              <Input
                placeholder={type === 'video' ? 'https://meet.google.com/...' : 'Adresse...'}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Projet (optionnel)</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">Aucun projet</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Participants</label>
              <Input
                placeholder="Jean Dupont, Marie Martin..."
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Séparez les noms par des virgules</p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" className="flex-1" disabled={loading || !title || !date || !time}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
