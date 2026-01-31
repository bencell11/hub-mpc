'use client'

import { useState, useEffect, useRef, use } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Phone,
  Mic,
  Square,
  Play,
  Pause,
  Upload,
  FileText,
  Sparkles,
  Send,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Save,
  X,
  MessageSquare,
} from 'lucide-react'
import Link from 'next/link'

const DEV_USER = { name: 'Développeur', email: 'dev@example.com' }

interface Meeting {
  id: string
  title: string
  scheduled_at: string | null
  duration: number | null
  status: string
  location: string | null
  meeting_type: string | null
  transcription_raw: string | null
  transcription_final: string | null
  metadata: {
    context?: string
    summaryTemplate?: string
    attendees?: Array<{ name: string; role?: string }>
  } | null
  project: { id: string; name: string } | null
  audio_path: string | null
}

interface Summary {
  id: string
  content: string
  created_at: string
  generated_by: string
}

const typeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  'on-site': { icon: MapPin, label: 'Sur site', color: 'text-green-600' },
  'video': { icon: Video, label: 'Visio', color: 'text-blue-600' },
  'phone': { icon: Phone, label: 'Téléphone', color: 'text-orange-600' },
}

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  // Transcription state
  const [isTranscribing, setIsTranscribing] = useState(false)

  // Summary state
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [customTemplate, setCustomTemplate] = useState('')
  const [meetingContext, setMeetingContext] = useState('')

  // Edit context state
  const [isEditingContext, setIsEditingContext] = useState(false)
  const [editedContext, setEditedContext] = useState('')

  // Send report state
  const [showSendModal, setShowSendModal] = useState(false)
  const [recipients, setRecipients] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [isSendingReport, setIsSendingReport] = useState(false)

  // Fetch meeting data
  useEffect(() => {
    fetchMeeting()
  }, [resolvedParams.id])

  const fetchMeeting = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/meetings/${resolvedParams.id}`)

      if (!response.ok) {
        throw new Error('Réunion non trouvée')
      }

      const data = await response.json()
      setMeeting(data.meeting)
      setSummary(data.summary)
      setMeetingContext(data.meeting.metadata?.context || '')
      setEditedContext(data.meeting.metadata?.context || '')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start(1000)
      setIsRecording(true)
      setIsPaused(false)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Error starting recording:', err)
      alert('Impossible d\'accéder au microphone. Vérifiez les permissions.')
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume()
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1)
        }, 1000)
      } else {
        mediaRecorderRef.current.pause()
        if (timerRef.current) clearInterval(timerRef.current)
      }
      setIsPaused(!isPaused)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Upload audio
  const uploadAudio = async () => {
    if (!audioBlob) return

    setIsUploading(true)
    setUploadProgress('Préparation...')

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, `meeting-${resolvedParams.id}.webm`)

      setUploadProgress('Upload en cours...')
      const response = await fetch(`/api/meetings/${resolvedParams.id}/audio`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'upload')
      }

      setUploadProgress('Terminé!')
      setAudioBlob(null)
      fetchMeeting()
    } catch (err) {
      console.error('Upload error:', err)
      setUploadProgress('Erreur!')
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(null), 2000)
    }
  }

  // Transcribe
  const transcribe = async () => {
    setIsTranscribing(true)
    try {
      const response = await fetch(`/api/meetings/${resolvedParams.id}/transcribe`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la transcription')
      }

      fetchMeeting()
    } catch (err) {
      console.error('Transcription error:', err)
      alert(err instanceof Error ? err.message : 'Erreur lors de la transcription')
    } finally {
      setIsTranscribing(false)
    }
  }

  // Generate summary
  const generateSummary = async () => {
    setIsGeneratingSummary(true)
    try {
      const response = await fetch(`/api/meetings/${resolvedParams.id}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: customTemplate || undefined,
          context: meetingContext || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la génération')
      }

      const data = await response.json()
      setSummary({
        id: data.summaryId,
        content: data.summary,
        created_at: new Date().toISOString(),
        generated_by: 'gpt-4o',
      })
    } catch (err) {
      console.error('Summary error:', err)
      alert(err instanceof Error ? err.message : 'Erreur lors de la génération')
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  // Update context
  const saveContext = async () => {
    try {
      const response = await fetch(`/api/meetings/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            ...meeting?.metadata,
            context: editedContext,
          },
        }),
      })

      if (response.ok) {
        setMeetingContext(editedContext)
        setIsEditingContext(false)
        fetchMeeting()
      }
    } catch (err) {
      console.error('Error saving context:', err)
    }
  }

  // Send report
  const sendReport = async () => {
    if (!recipients.trim()) return

    setIsSendingReport(true)
    try {
      const recipientList = recipients.split(',').map(r => r.trim()).filter(r => r)

      const response = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'send_meeting_report',
          input: {
            meetingId: resolvedParams.id,
            recipients: recipientList,
            customMessage: customMessage || undefined,
            includeDecisions: true,
            includeTasks: true,
          },
          confirmed: true,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de l\'envoi')
      }

      alert('Compte rendu envoyé avec succès!')
      setShowSendModal(false)
      setRecipients('')
      setCustomMessage('')
    } catch (err) {
      console.error('Send report error:', err)
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'envoi')
    } finally {
      setIsSendingReport(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout user={DEV_USER}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !meeting) {
    return (
      <DashboardLayout user={DEV_USER}>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold">{error || 'Réunion non trouvée'}</h2>
          <Link href="/dashboard/meetings">
            <Button className="mt-4">Retour aux réunions</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const TypeIcon = typeConfig[meeting.meeting_type || 'on-site']?.icon || MapPin
  const typeStyle = typeConfig[meeting.meeting_type || 'on-site'] || typeConfig['on-site']
  const hasAudio = !!meeting.audio_path
  const hasTranscription = !!meeting.transcription_final

  return (
    <DashboardLayout user={DEV_USER}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/meetings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{meeting.title}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              {meeting.scheduled_at && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(meeting.scheduled_at).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {meeting.scheduled_at && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>
                    {new Date(meeting.scheduled_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
              <div className={`flex items-center gap-1 ${typeStyle.color}`}>
                <TypeIcon className="h-4 w-4" />
                <span>{meeting.location || typeStyle.label}</span>
              </div>
            </div>
          </div>
          <Badge variant={meeting.status === 'completed' ? 'secondary' : 'default'}>
            {meeting.status === 'completed' ? 'Terminée' : meeting.status === 'in_progress' ? 'En cours' : 'Planifiée'}
          </Badge>
        </div>

        {/* Context section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Contexte de la réunion
            </CardTitle>
            {!isEditingContext && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditingContext(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditingContext ? (
              <div className="space-y-3">
                <Textarea
                  placeholder="Décrivez le contexte de cette réunion... Ex: Réunion de suivi de chantier pour le projet Villa Moderne. Points à aborder: planning, budget, problèmes techniques."
                  value={editedContext}
                  onChange={(e) => setEditedContext(e.target.value)}
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveContext}>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setIsEditingContext(false)
                    setEditedContext(meetingContext)
                  }}>
                    <X className="h-4 w-4 mr-2" />
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">
                {meetingContext || 'Aucun contexte défini. Cliquez sur "Modifier" pour ajouter des informations sur cette réunion.'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recording section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Enregistrement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasAudio && !audioBlob && !isRecording && (
              <div className="text-center py-8">
                <Mic className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Aucun enregistrement</p>
                <Button className="mt-4" onClick={startRecording}>
                  <Mic className="mr-2 h-4 w-4" />
                  Démarrer l'enregistrement
                </Button>
              </div>
            )}

            {isRecording && (
              <div className="flex flex-col items-center py-8">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center ${isPaused ? 'bg-yellow-100' : 'bg-red-100 animate-pulse'}`}>
                  <Mic className={`h-10 w-10 ${isPaused ? 'text-yellow-600' : 'text-red-600'}`} />
                </div>
                <p className="mt-4 text-2xl font-mono font-bold">{formatTime(recordingTime)}</p>
                <p className="text-sm text-muted-foreground">
                  {isPaused ? 'En pause' : 'Enregistrement en cours...'}
                </p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={pauseRecording}>
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </Button>
                  <Button variant="destructive" onClick={stopRecording}>
                    <Square className="h-4 w-4 mr-2" />
                    Arrêter
                  </Button>
                </div>
              </div>
            )}

            {audioBlob && !isRecording && (
              <div className="flex flex-col items-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
                <p className="mt-4 font-medium">Enregistrement terminé</p>
                <p className="text-sm text-muted-foreground">Durée: {formatTime(recordingTime)}</p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => setAudioBlob(null)}>
                    Supprimer
                  </Button>
                  <Button onClick={uploadAudio} disabled={isUploading}>
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {uploadProgress}
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Envoyer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {hasAudio && !audioBlob && !isRecording && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>Enregistrement disponible</span>
                </div>
                <div className="flex gap-2">
                  {!hasTranscription && (
                    <Button onClick={transcribe} disabled={isTranscribing}>
                      {isTranscribing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Transcription...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Transcrire
                        </>
                      )}
                    </Button>
                  )}
                  <Button variant="outline" onClick={startRecording}>
                    <Mic className="mr-2 h-4 w-4" />
                    Nouvel enregistrement
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transcription section */}
        {hasTranscription && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Transcription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-sans">
                  {meeting.transcription_final}
                </pre>
              </div>
              {!summary && (
                <div className="mt-4">
                  <Button onClick={generateSummary} disabled={isGeneratingSummary}>
                    {isGeneratingSummary ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Génération en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Générer le compte rendu
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary section */}
        {summary && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Compte rendu
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowSendModal(true)}>
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Exporter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div
                  className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg p-6 border"
                  dangerouslySetInnerHTML={{
                    __html: summary.content
                      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
                      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
                      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
                      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.+?)\*/g, '<em>$1</em>')
                      .replace(/- \[ \] (.+)/g, '<div class="flex items-center gap-2"><input type="checkbox" disabled /><span>$1</span></div>')
                      .replace(/- \[x\] (.+)/gi, '<div class="flex items-center gap-2"><input type="checkbox" checked disabled /><span>$1</span></div>')
                      .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
                      .replace(/\n/g, '<br />')
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Généré le {new Date(summary.created_at).toLocaleString('fr-FR')} par {summary.generated_by}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Custom template section */}
        {hasTranscription && !summary && (
          <Card>
            <CardHeader>
              <CardTitle>Personnalisation du compte rendu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Modèle personnalisé (optionnel)</label>
                <Textarea
                  placeholder="Laissez vide pour utiliser le modèle par défaut, ou personnalisez avec vos sections..."
                  value={customTemplate}
                  onChange={(e) => setCustomTemplate(e.target.value)}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Utilisez ## pour les titres de section et - pour les listes
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Send Report Modal */}
        {showSendModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg mx-4">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Envoyer le compte rendu</h2>
                  <Button variant="ghost" size="icon" onClick={() => setShowSendModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Destinataires *</label>
                    <Input
                      placeholder="email1@exemple.com, email2@exemple.com..."
                      value={recipients}
                      onChange={(e) => setRecipients(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Séparez les adresses par des virgules
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Message personnalisé (optionnel)</label>
                    <Textarea
                      placeholder="Bonjour, veuillez trouver ci-joint le compte rendu de notre réunion..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" className="flex-1" onClick={() => setShowSendModal(false)}>
                      Annuler
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={sendReport}
                      disabled={!recipients.trim() || isSendingReport}
                    >
                      {isSendingReport ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Envoyer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Participants */}
        {meeting.metadata?.attendees && meeting.metadata.attendees.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {meeting.metadata.attendees.map((attendee, i) => (
                  <Badge key={i} variant="secondary" className="px-3 py-1">
                    {attendee.name}
                    {attendee.role && <span className="ml-1 opacity-60">({attendee.role})</span>}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
