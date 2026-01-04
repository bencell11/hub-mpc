'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  FolderKanban,
  Plus,
  Search,
  MoreVertical,
  Calendar,
  FileText,
  Mail,
  CheckSquare,
  Users,
  Clock,
  ArrowUpRight
} from 'lucide-react'

// DEV MODE: Mock data
const DEV_USER = { name: 'Développeur', email: 'dev@example.com' }

const MOCK_PROJECTS = [
  {
    id: '1',
    name: 'Rénovation Appartement Haussmann',
    description: 'Rénovation complète d\'un appartement de 120m² dans le 8ème arrondissement',
    status: 'active' as const,
    documentsCount: 24,
    emailsCount: 45,
    tasksCount: 12,
    meetingsCount: 8,
    lastActivity: new Date(Date.now() - 3600000).toISOString(),
    progress: 65,
    client: 'M. Dupont',
  },
  {
    id: '2',
    name: 'Extension Maison Vincennes',
    description: 'Extension de 40m² avec véranda bioclimatique',
    status: 'active' as const,
    documentsCount: 18,
    emailsCount: 32,
    tasksCount: 8,
    meetingsCount: 5,
    lastActivity: new Date(Date.now() - 86400000).toISOString(),
    progress: 40,
    client: 'Mme Martin',
  },
  {
    id: '3',
    name: 'Bureaux Startup Tech',
    description: 'Aménagement de bureaux open-space 200m²',
    status: 'active' as const,
    documentsCount: 35,
    emailsCount: 67,
    tasksCount: 20,
    meetingsCount: 12,
    lastActivity: new Date(Date.now() - 172800000).toISOString(),
    progress: 85,
    client: 'TechCorp SAS',
  },
  {
    id: '4',
    name: 'Villa Côte d\'Azur',
    description: 'Construction d\'une villa contemporaine de 250m²',
    status: 'completed' as const,
    documentsCount: 89,
    emailsCount: 156,
    tasksCount: 0,
    meetingsCount: 24,
    lastActivity: new Date(Date.now() - 604800000).toISOString(),
    progress: 100,
    client: 'M. et Mme Bernard',
  },
]

const statusConfig = {
  active: { label: 'En cours', variant: 'default' as const },
  completed: { label: 'Terminé', variant: 'secondary' as const },
  archived: { label: 'Archivé', variant: 'outline' as const },
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'À l\'instant'
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays}j`
  return date.toLocaleDateString('fr-FR')
}

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)

  const filteredProjects = MOCK_PROJECTS.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.client.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DashboardLayout user={DEV_USER}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Projets</h1>
            <p className="text-muted-foreground">Gérez vos projets et suivez leur avancement</p>
          </div>
          <Button onClick={() => setShowNewProjectModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau projet
          </Button>
        </div>

        {/* Search and filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un projet..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Tous</Button>
            <Button variant="ghost" size="sm">En cours</Button>
            <Button variant="ghost" size="sm">Terminés</Button>
            <Button variant="ghost" size="sm">Archivés</Button>
          </div>
        </div>

        {/* Stats summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{MOCK_PROJECTS.length}</p>
                  <p className="text-xs text-muted-foreground">Projets total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{MOCK_PROJECTS.filter(p => p.status === 'active').length}</p>
                  <p className="text-xs text-muted-foreground">En cours</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{MOCK_PROJECTS.reduce((acc, p) => acc + p.tasksCount, 0)}</p>
                  <p className="text-xs text-muted-foreground">Tâches ouvertes</p>
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
                  <p className="text-2xl font-bold">{MOCK_PROJECTS.reduce((acc, p) => acc + p.documentsCount, 0)}</p>
                  <p className="text-xs text-muted-foreground">Documents</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects list */}
        <div className="grid gap-4">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <FolderKanban className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">{project.name}</h3>
                        <Badge variant={statusConfig[project.status].variant}>
                          {statusConfig[project.status].label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{project.description}</p>

                      {/* Progress bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progression</span>
                          <span className="font-medium">{project.progress}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{project.client}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>{project.documentsCount} docs</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          <span>{project.emailsCount} emails</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{project.meetingsCount} réunions</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckSquare className="h-4 w-4" />
                          <span>{project.tasksCount} tâches</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs text-muted-foreground">{getTimeAgo(project.lastActivity)}</span>
                    <Button variant="ghost" size="icon">
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty state */}
        {filteredProjects.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 font-medium">Aucun projet trouvé</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery ? 'Essayez avec d\'autres termes de recherche' : 'Créez votre premier projet pour commencer'}
              </p>
              {!searchQuery && (
                <Button className="mt-4" onClick={() => setShowNewProjectModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un projet
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
