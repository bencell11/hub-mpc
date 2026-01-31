'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Upload,
  Search,
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
  MoreVertical,
  Clock,
  HardDrive,
  Brain,
  CheckCircle2,
  Loader2,
  Tag,
  X
} from 'lucide-react'

// DEV MODE
const DEV_USER = { name: 'Développeur', email: 'dev@example.com' }

interface Document {
  id: string
  name: string
  type: 'PDF' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'SPREADSHEET' | 'TEXT' | 'OTHER'
  size: number
  project: { id: string; name: string } | null
  uploadedAt: string
  tags: string[]
  isIndexed: boolean
  hasTranscription: boolean
  transcriptionPreview?: string
  storagePath?: string
}

interface Project {
  id: string
  name: string
}

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
  const [documents, setDocuments] = useState<Document[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch documents and projects
  useEffect(() => {
    fetchDocuments()
    fetchProjects()
  }, [])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/documents')

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors du chargement')
      }

      const data = await response.json()
      setDocuments(data)
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

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.project?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesType = !selectedType || doc.type === selectedType
    return matchesSearch && matchesType
  })

  const totalSize = documents.reduce((acc, doc) => acc + doc.size, 0)
  const indexedCount = documents.filter(d => d.isIndexed).length
  const audioVideoCount = documents.filter(d => d.type === 'AUDIO' || d.type === 'VIDEO').length
  const transcribedCount = documents.filter(d => d.hasTranscription).length

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      setShowUploadModal(true)
    }
  }, [])

  return (
    <DashboardLayout user={DEV_USER}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Documents</h1>
            <p className="text-muted-foreground">Gérez et indexez tous vos documents de projet</p>
          </div>
          <Button onClick={() => setShowUploadModal(true)}>
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
                  <p className="text-2xl font-bold">{documents.length}</p>
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
        <Card
          className={`border-dashed transition-colors ${isDragging ? 'border-primary bg-primary/5' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <Upload className={`h-10 w-10 mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              <h3 className="font-medium mb-1">Glissez-déposez vos fichiers ici</h3>
              <p className="text-sm text-muted-foreground mb-4">
                PDF, Images, Audio, Vidéo, Tableurs - Max 100 MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setShowUploadModal(true)
                  }
                }}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                Parcourir les fichiers
              </Button>
            </div>
          </CardContent>
        </Card>

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
              <Button variant="outline" className="mt-4" onClick={fetchDocuments}>
                Réessayer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Documents list */}
        {!loading && !error && (
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
                            <span title="Indexé pour l'IA">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </span>
                          )}
                          {doc.hasTranscription && (
                            <Badge variant="secondary" className="text-xs">Transcrit</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{formatSize(doc.size)}</span>
                          <span>•</span>
                          {doc.project && (
                            <>
                              <Badge variant="outline" className="text-xs">{doc.project.name}</Badge>
                              <span>•</span>
                            </>
                          )}
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
                    {!searchQuery && (
                      <Button className="mt-4" onClick={() => setShowUploadModal(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        Importer un document
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <UploadModal
            projects={projects}
            onClose={() => setShowUploadModal(false)}
            onUploaded={() => {
              setShowUploadModal(false)
              fetchDocuments()
            }}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

// Modal d'upload
function UploadModal({
  projects,
  onClose,
  onUploaded
}: {
  projects: Project[]
  onClose: () => void
  onUploaded: () => void
}) {
  const [files, setFiles] = useState<File[]>([])
  const [projectId, setProjectId] = useState('')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Veuillez sélectionner au moins un fichier')
      return
    }

    setLoading(true)
    setError(null)

    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        if (projectId) formData.append('projectId', projectId)
        if (tags) formData.append('tags', tags)

        const response = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || `Erreur lors de l'upload de ${file.name}`)
        }

        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
      }

      onUploaded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Importer des documents</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* File selection */}
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Cliquez pour sélectionner des fichiers</p>
              <p className="text-xs text-muted-foreground mt-1">ou glissez-déposez</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Selected files */}
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{files.length} fichier(s) sélectionné(s)</p>
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">({formatSize(file.size)})</span>
                    </div>
                    {uploadProgress[file.name] === 100 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFile(index)}
                        disabled={loading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Project selection */}
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

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags (optionnel)</label>
              <Input
                placeholder="tag1, tag2, tag3..."
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Séparez les tags par des virgules</p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpload}
                disabled={loading || files.length === 0}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Importer'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
