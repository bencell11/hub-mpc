'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Upload,
  Search,
  Filter,
  Grid,
  List,
  FolderOpen,
  File,
  FileImage,
  FileAudio,
  FileVideo,
  FileSpreadsheet,
  Download,
  Eye,
  Trash2,
  MoreVertical,
  Clock,
  HardDrive,
  Brain,
  CheckCircle2,
  Loader2,
  Tag,
  Plus
} from 'lucide-react'

// DEV MODE: Mock data
const DEV_USER = { name: 'Développeur', email: 'dev@example.com' }

const MOCK_DOCUMENTS = [
  {
    id: '1',
    name: 'Plans_RDC_v3.pdf',
    type: 'PDF' as const,
    size: 2450000,
    project: 'Rénovation Appartement Haussmann',
    uploadedAt: new Date(Date.now() - 3600000).toISOString(),
    uploadedBy: 'Marie Martin',
    tags: ['Plans', 'RDC', 'Version finale'],
    isIndexed: true,
    hasTranscription: false,
  },
  {
    id: '2',
    name: 'Réunion_chantier_15jan.mp3',
    type: 'AUDIO' as const,
    size: 45000000,
    project: 'Rénovation Appartement Haussmann',
    uploadedAt: new Date(Date.now() - 86400000).toISOString(),
    uploadedBy: 'Système',
    tags: ['Réunion', 'Audio', 'Chantier'],
    isIndexed: true,
    hasTranscription: true,
    transcriptionPreview: 'Bonjour à tous, nous sommes réunis pour faire le point sur l\'avancement des travaux...',
  },
  {
    id: '3',
    name: 'Devis_menuiserie.xlsx',
    type: 'SPREADSHEET' as const,
    size: 125000,
    project: 'Extension Maison Vincennes',
    uploadedAt: new Date(Date.now() - 172800000).toISOString(),
    uploadedBy: 'Pierre Durand',
    tags: ['Devis', 'Menuiserie', 'Fournisseur'],
    isIndexed: true,
    hasTranscription: false,
  },
  {
    id: '4',
    name: 'Photo_facade_avant.jpg',
    type: 'IMAGE' as const,
    size: 3200000,
    project: 'Villa Côte d\'Azur',
    uploadedAt: new Date(Date.now() - 259200000).toISOString(),
    uploadedBy: 'Jean Dupont',
    tags: ['Photo', 'Façade', 'État initial'],
    isIndexed: true,
    hasTranscription: false,
  },
  {
    id: '5',
    name: 'Visite_terrain.mp4',
    type: 'VIDEO' as const,
    size: 156000000,
    project: 'Bureaux Startup Tech',
    uploadedAt: new Date(Date.now() - 604800000).toISOString(),
    uploadedBy: 'Sophie Bernard',
    tags: ['Vidéo', 'Visite', 'Terrain'],
    isIndexed: true,
    hasTranscription: true,
    transcriptionPreview: 'Nous sommes actuellement dans les futurs locaux de TechCorp...',
  },
  {
    id: '6',
    name: 'Cahier_des_charges.pdf',
    type: 'PDF' as const,
    size: 1800000,
    project: 'Bureaux Startup Tech',
    uploadedAt: new Date(Date.now() - 864000000).toISOString(),
    uploadedBy: 'Marie Martin',
    tags: ['CDC', 'Spécifications', 'Client'],
    isIndexed: true,
    hasTranscription: false,
  },
]

const typeConfig = {
  PDF: { icon: FileText, color: 'text-red-500', bg: 'bg-red-100' },
  IMAGE: { icon: FileImage, color: 'text-green-500', bg: 'bg-green-100' },
  AUDIO: { icon: FileAudio, color: 'text-purple-500', bg: 'bg-purple-100' },
  VIDEO: { icon: FileVideo, color: 'text-blue-500', bg: 'bg-blue-100' },
  SPREADSHEET: { icon: FileSpreadsheet, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  TEXT: { icon: File, color: 'text-gray-500', bg: 'bg-gray-100' },
  OTHER: { icon: File, color: 'text-gray-500', bg: 'bg-gray-100' },
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
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

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [selectedType, setSelectedType] = useState<string | null>(null)

  const filteredDocuments = MOCK_DOCUMENTS.filter(doc => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesType = !selectedType || doc.type === selectedType
    return matchesSearch && matchesType
  })

  const totalSize = MOCK_DOCUMENTS.reduce((acc, doc) => acc + doc.size, 0)
  const indexedCount = MOCK_DOCUMENTS.filter(d => d.isIndexed).length
  const audioVideoCount = MOCK_DOCUMENTS.filter(d => d.type === 'AUDIO' || d.type === 'VIDEO').length
  const transcribedCount = MOCK_DOCUMENTS.filter(d => d.hasTranscription).length

  return (
    <DashboardLayout user={DEV_USER}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Documents</h1>
            <p className="text-muted-foreground">Gérez et indexez tous vos documents de projet</p>
          </div>
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Importer
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{MOCK_DOCUMENTS.length}</p>
                  <p className="text-xs text-muted-foreground">Documents total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                  <HardDrive className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatSize(totalSize)}</p>
                  <p className="text-xs text-muted-foreground">Stockage utilisé</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{indexedCount}</p>
                  <p className="text-xs text-muted-foreground">Indexés pour l'IA</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                  <FileAudio className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{transcribedCount}/{audioVideoCount}</p>
                  <p className="text-xs text-muted-foreground">Transcrits</p>
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
              placeholder="Rechercher un document..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedType === null ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedType(null)}
            >
              Tous
            </Button>
            <Button
              variant={selectedType === 'PDF' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedType('PDF')}
            >
              PDF
            </Button>
            <Button
              variant={selectedType === 'IMAGE' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedType('IMAGE')}
            >
              Images
            </Button>
            <Button
              variant={selectedType === 'AUDIO' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedType('AUDIO')}
            >
              Audio
            </Button>
            <Button
              variant={selectedType === 'VIDEO' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedType('VIDEO')}
            >
              Vidéo
            </Button>
          </div>
          <div className="ml-auto flex gap-1">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Drop zone */}
        <Card className="border-dashed">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">Glissez-déposez vos fichiers ici</h3>
              <p className="text-sm text-muted-foreground mb-4">
                PDF, Images, Audio, Vidéo, Tableurs - Max 100 MB
              </p>
              <Button variant="outline">
                Parcourir les fichiers
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documents list */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredDocuments.map((doc) => {
                const TypeIcon = typeConfig[doc.type]?.icon || File
                const typeStyle = typeConfig[doc.type] || typeConfig.OTHER
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    {/* Icon */}
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${typeStyle.bg}`}>
                      <TypeIcon className={`h-6 w-6 ${typeStyle.color}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{doc.name}</h3>
                        {doc.isIndexed && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" title="Indexé pour l'IA" />
                        )}
                        {doc.hasTranscription && (
                          <Badge variant="secondary" className="text-xs">Transcrit</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatSize(doc.size)}</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">{doc.project}</Badge>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getTimeAgo(doc.uploadedAt)}
                        </span>
                      </div>

                      {/* Tags */}
                      {doc.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          {doc.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 rounded-full bg-muted"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Transcription preview */}
                      {doc.hasTranscription && doc.transcriptionPreview && (
                        <div className="mt-2 text-sm text-muted-foreground italic truncate">
                          "{doc.transcriptionPreview}"
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" title="Prévisualiser">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Télécharger">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}

              {filteredDocuments.length === 0 && (
                <div className="py-12 text-center">
                  <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 font-medium">Aucun document trouvé</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchQuery ? 'Essayez avec d\'autres termes de recherche' : 'Importez vos premiers documents'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
