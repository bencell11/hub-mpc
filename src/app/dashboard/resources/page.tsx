'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Lightbulb,
  ExternalLink,
  Search,
  Layers,
  Cpu,
  PenTool,
  Wand2,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Star,
  BookOpen,
  Video,
  FileText,
} from 'lucide-react'

const DEV_USER = { name: 'Développeur', email: 'dev@example.com' }

interface Tool {
  id: string
  name: string
  description: string
  category: 'generation' | 'bim' | 'rendering' | 'parametric'
  url: string
  pricing: 'free' | 'freemium' | 'paid' | 'enterprise'
  recommended?: boolean
  strengths: string[]
  limitations: string[]
  useCase: string
}

interface Resource {
  id: string
  title: string
  type: 'article' | 'video' | 'documentation'
  url: string
  description: string
}

const AI_TOOLS: Tool[] = [
  {
    id: 'maket',
    name: 'Maket.ai',
    description: 'Génération de plans par contraintes (taille de parcelle, adjacences, zoning)',
    category: 'generation',
    url: 'https://www.maket.ai/',
    pricing: 'freemium',
    recommended: true,
    strengths: [
      'Interface intuitive',
      'Génération rapide de variantes',
      'Respect des contraintes de zoning',
      'Export DXF/DWG',
    ],
    limitations: [
      'Limité à la phase esquisse',
      'Personnalisation limitée',
    ],
    useCase: 'Idéal pour explorer rapidement plusieurs agencements lors de la phase de conception initiale.',
  },
  {
    id: 'archilabs',
    name: 'ArchiLabs',
    description: 'Plugin Revit avec IA conversationnelle pour automatiser les tâches BIM',
    category: 'bim',
    url: 'https://archilabs.ai/',
    pricing: 'paid',
    recommended: true,
    strengths: [
      'Intégration native Revit',
      'Commandes en langage naturel',
      'Automatisation des tâches répétitives',
      'Modification précise du modèle',
    ],
    limitations: [
      'Nécessite Revit',
      'Courbe d\'apprentissage',
    ],
    useCase: 'Pour modifier précisément des éléments comme "déplacer la cuisine de 50cm" ou "changer la hauteur sous plafond".',
  },
  {
    id: 'forma',
    name: 'Autodesk Forma',
    description: 'Analyse de site et optimisation de massing avec données environnementales',
    category: 'parametric',
    url: 'https://www.autodesk.com/products/forma',
    pricing: 'enterprise',
    strengths: [
      'Analyse soleil/vent/bruit',
      'Optimisation automatique',
      'Intégration Revit',
      'Données en temps réel',
    ],
    limitations: [
      'Prix élevé',
      'Orienté phase amont',
    ],
    useCase: 'Pour l\'analyse de faisabilité et l\'optimisation de l\'implantation sur site.',
  },
  {
    id: 'wisebim',
    name: 'WiseBIM',
    description: 'Conversion automatique de plans 2D (PDF, DWG) en modèles 3D Revit',
    category: 'bim',
    url: 'https://www.wisebim.com/',
    pricing: 'paid',
    strengths: [
      'Conversion rapide 2D→3D',
      'Supporte PDF, DWG, JPEG',
      'Détection automatique des éléments',
    ],
    limitations: [
      'Qualité dépend du plan source',
      'Nécessite vérification manuelle',
    ],
    useCase: 'Pour numériser des plans existants et les convertir en modèle BIM éditable.',
  },
  {
    id: 'testfit',
    name: 'TestFit',
    description: 'Faisabilité automatique : parking, massing, topographie',
    category: 'parametric',
    url: 'https://testfit.io/',
    pricing: 'enterprise',
    strengths: [
      'Études de faisabilité rapides',
      'Optimisation automatique',
      'Calcul de rentabilité',
    ],
    limitations: [
      'Orienté promoteurs',
      'Prix élevé',
    ],
    useCase: 'Pour évaluer rapidement la faisabilité d\'un projet sur un terrain.',
  },
  {
    id: 'snaptrude',
    name: 'Snaptrude',
    description: 'Alternative BIM simplifiée avec IA intégrée, accessible sans formation',
    category: 'bim',
    url: 'https://www.snaptrude.com/',
    pricing: 'freemium',
    recommended: true,
    strengths: [
      'Interface intuitive',
      'Pas besoin de formation BIM',
      'Collaboration en temps réel',
      'Export vers Revit/Archicad',
    ],
    limitations: [
      'Moins puissant que Revit',
      'Fonctionnalités avancées limitées',
    ],
    useCase: 'Alternative idéale si le cabinet n\'utilise pas encore de logiciel BIM.',
  },
  {
    id: 'controlnet',
    name: 'ControlNet + Stable Diffusion',
    description: 'Génération d\'images contrôlée préservant la structure spatiale',
    category: 'rendering',
    url: 'https://stable-diffusion-art.com/controlnet/',
    pricing: 'free',
    strengths: [
      'Gratuit (local)',
      'Préserve la géométrie',
      'Multiples modes de contrôle',
      'Rendus photoréalistes',
    ],
    limitations: [
      'Setup technique requis',
      'Pour rendus uniquement, pas modification de plans',
    ],
    useCase: 'Pour générer des rendus visuels cohérents à partir d\'un même plan ou d\'une même maquette.',
  },
  {
    id: 'hypar',
    name: 'Hypar',
    description: 'Space planning intelligent avec optimisation automatique des agencements',
    category: 'parametric',
    url: 'https://hypar.io/',
    pricing: 'freemium',
    strengths: [
      'Optimisation automatique',
      'Intégration Revit',
      'API personnalisable',
    ],
    limitations: [
      'Courbe d\'apprentissage',
    ],
    useCase: 'Pour optimiser automatiquement l\'agencement intérieur selon les contraintes.',
  },
]

const RESOURCES: Resource[] = [
  {
    id: '1',
    title: 'Top 18 AI Tools for Architects in 2025',
    type: 'article',
    url: 'https://www.snaptrude.com/blog/top-18-ai-tools-for-architects-in-2025',
    description: 'Guide complet des outils IA pour architectes',
  },
  {
    id: '2',
    title: 'Best AI Tools for Architects - ArchEyes',
    type: 'article',
    url: 'https://archeyes.com/best-ai-tools-for-architects-in-2025-a-comprehensive-guide/',
    description: 'Comparatif détaillé avec cas d\'usage',
  },
  {
    id: '3',
    title: 'AI Revit Automation - ArchiLabs',
    type: 'documentation',
    url: 'https://archilabs.ai/posts/ai-revit-automation-for-residential-architecture-archilabs',
    description: 'Guide d\'automatisation Revit avec IA',
  },
  {
    id: '4',
    title: 'ControlNet Complete Guide',
    type: 'documentation',
    url: 'https://stable-diffusion-art.com/controlnet/',
    description: 'Tutoriel complet pour maîtriser ControlNet',
  },
  {
    id: '5',
    title: 'AI Tools for Architectural Planning - PAACADEMY',
    type: 'article',
    url: 'https://paacademy.com/blog/top-ai-tools-architectural-planning',
    description: 'Focus sur la planification architecturale',
  },
]

const categoryConfig = {
  generation: { label: 'Génération de plans', icon: Layers, color: 'bg-blue-100 text-blue-700' },
  bim: { label: 'BIM & Automatisation', icon: Building2, color: 'bg-green-100 text-green-700' },
  rendering: { label: 'Rendus & Visualisation', icon: Wand2, color: 'bg-purple-100 text-purple-700' },
  parametric: { label: 'Design paramétrique', icon: Cpu, color: 'bg-orange-100 text-orange-700' },
}

const pricingConfig = {
  free: { label: 'Gratuit', color: 'bg-green-100 text-green-700' },
  freemium: { label: 'Freemium', color: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Payant', color: 'bg-yellow-100 text-yellow-700' },
  enterprise: { label: 'Entreprise', color: 'bg-red-100 text-red-700' },
}

const resourceTypeConfig = {
  article: { icon: FileText, label: 'Article' },
  video: { icon: Video, label: 'Vidéo' },
  documentation: { icon: BookOpen, label: 'Documentation' },
}

export default function ResourcesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedTool, setExpandedTool] = useState<string | null>(null)

  const filteredTools = AI_TOOLS.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || tool.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const recommendedTools = AI_TOOLS.filter(t => t.recommended)

  return (
    <DashboardLayout user={DEV_USER}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-yellow-500" />
            Ressources IA pour l'Architecture
          </h1>
          <p className="text-muted-foreground mt-1">
            Outils et ressources pour intégrer l'IA dans votre workflow de conception
          </p>
        </div>

        {/* Problem Context */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Pourquoi ChatGPT/DALL-E ne convient pas pour les plans ?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>Les modèles génératifs comme DALL-E <strong>recréent une image entière</strong> à chaque génération :</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Pas de "mémoire spatiale" - ils ne comprennent pas que "la cuisine est à gauche"</li>
              <li>Chaque modification = nouvelle interprétation = incohérences</li>
              <li>Inadapté pour un travail technique nécessitant précision et reproductibilité</li>
            </ul>
            <p className="font-medium text-amber-800 mt-3">
              Solution : Passer d'une logique "image" à une logique "modèle paramétrique" où l'IA modifie des données, pas des pixels.
            </p>
          </CardContent>
        </Card>

        {/* Recommended Tools */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Outils recommandés
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {recommendedTools.map(tool => {
              const CategoryIcon = categoryConfig[tool.category].icon
              return (
                <Card key={tool.id} className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {tool.name}
                          <Badge variant="secondary" className="text-xs">
                            Recommandé
                          </Badge>
                        </CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge className={categoryConfig[tool.category].color}>
                            <CategoryIcon className="h-3 w-3 mr-1" />
                            {categoryConfig[tool.category].label}
                          </Badge>
                          <Badge className={pricingConfig[tool.pricing].color}>
                            {pricingConfig[tool.pricing].label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{tool.description}</p>
                    <p className="text-sm italic text-primary/80 mb-3">{tool.useCase}</p>
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-full h-9 px-3 text-sm font-medium border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Visiter
                    </a>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un outil..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              Tous
            </Button>
            {Object.entries(categoryConfig).map(([key, config]) => {
              const Icon = config.icon
              return (
                <Button
                  key={key}
                  variant={selectedCategory === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(key)}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {config.label}
                </Button>
              )
            })}
          </div>
        </div>

        {/* All Tools */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Tous les outils ({filteredTools.length})</h2>
          <div className="space-y-3">
            {filteredTools.map(tool => {
              const CategoryIcon = categoryConfig[tool.category].icon
              const isExpanded = expandedTool === tool.id
              return (
                <Card key={tool.id} className="overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedTool(isExpanded ? null : tool.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${categoryConfig[tool.category].color}`}>
                          <CategoryIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium flex items-center gap-2">
                            {tool.name}
                            {tool.recommended && (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground">{tool.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={pricingConfig[tool.pricing].color}>
                          {pricingConfig[tool.pricing].label}
                        </Badge>
                        <a
                          href={tool.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t bg-muted/30">
                      <div className="grid md:grid-cols-2 gap-4 pt-4">
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            Points forts
                          </h4>
                          <ul className="text-sm space-y-1">
                            {tool.strengths.map((s, i) => (
                              <li key={i} className="text-muted-foreground">• {s}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            Limitations
                          </h4>
                          <ul className="text-sm space-y-1">
                            {tool.limitations.map((l, i) => (
                              <li key={i} className="text-muted-foreground">• {l}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                        <h4 className="font-medium text-sm mb-1">Cas d'usage idéal</h4>
                        <p className="text-sm text-muted-foreground">{tool.useCase}</p>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>

        {/* Workflow Recommendation */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Workflow recommandé
            </CardTitle>
            <CardDescription>
              Pour modifier précisément des plans existants (ex: élévation de la cuisine)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-4 text-center">
              <div className="flex-1 p-4 bg-muted rounded-lg">
                <div className="font-medium">1. Plan existant</div>
                <div className="text-sm text-muted-foreground">DWG / PDF</div>
              </div>
              <div className="text-2xl">→</div>
              <div className="flex-1 p-4 bg-muted rounded-lg">
                <div className="font-medium">2. Conversion 3D</div>
                <div className="text-sm text-muted-foreground">WiseBIM</div>
              </div>
              <div className="text-2xl">→</div>
              <div className="flex-1 p-4 bg-muted rounded-lg">
                <div className="font-medium">3. Modèle BIM</div>
                <div className="text-sm text-muted-foreground">Revit / Snaptrude</div>
              </div>
              <div className="text-2xl">→</div>
              <div className="flex-1 p-4 bg-muted rounded-lg">
                <div className="font-medium">4. Modification IA</div>
                <div className="text-sm text-muted-foreground">ArchiLabs</div>
              </div>
              <div className="text-2xl">→</div>
              <div className="flex-1 p-4 bg-primary/10 rounded-lg border border-primary/30">
                <div className="font-medium">5. Export</div>
                <div className="text-sm text-muted-foreground">Plans 2D, 3D, Rendus</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* External Resources */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Ressources complémentaires
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {RESOURCES.map(resource => {
              const TypeIcon = resourceTypeConfig[resource.type].icon
              return (
                <Card key={resource.id} className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{resource.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{resource.description}</p>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-primary hover:underline mt-2"
                        >
                          Lire <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
