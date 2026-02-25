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
  ArrowRight,
  Image,
} from 'lucide-react'

const DEV_USER = { name: 'Développeur', email: 'dev@example.com' }

interface Tool {
  id: string
  name: string
  description: string
  category: 'cad' | 'bim' | 'rendering' | 'parametric' | 'generation'
  url: string
  pricing: 'free' | 'freemium' | 'paid' | 'enterprise'
  recommended?: boolean
  dwgSupport?: 'import' | 'export' | 'both' | 'none'
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
  // ===== RECOMMANDES =====
  {
    id: 'rayon',
    name: 'Rayon',
    description: 'CAO 2D web avec import/export DWG natif, bibliothèque de 10 000+ blocs, et IA intégrée',
    category: 'cad',
    url: 'https://www.rayon.design/',
    pricing: 'freemium',
    recommended: true,
    dwgSupport: 'both',
    strengths: [
      'Import/export DWG natif (XREF, dynamic blocks)',
      'Modification précise : murs, portes, fenêtres, cotes',
      '10 000+ blocs CAD (meubles, sanitaires, cuisine)',
      'Plans meublés 2D colorés et stylés',
      'Collaboration temps réel (Figma for floor plans)',
      'IA : génération de blocs, suggestions d\'aménagement',
      'Web-based, rien à installer',
    ],
    limitations: [
      'Strictement 2D, pas de modélisation 3D',
      'Pas de rendus photoréalistes intégrés',
      'Plans/élévations/coupes créés séparément',
    ],
    useCase: 'Outil principal pour importer vos DWG, modifier l\'agencement (murs, pièces, mobilier), exporter en DWG. Idéal pour un cabinet travaillant déjà en DWG.',
  },
  {
    id: 'archivinci',
    name: 'ArchiVinci',
    description: 'Rendu IA : transforme un plan 2D ou sketch en visualisation 3D photoréaliste en secondes',
    category: 'rendering',
    url: 'https://www.archivinci.com/',
    pricing: 'freemium',
    recommended: true,
    dwgSupport: 'none',
    strengths: [
      'Plan 2D / sketch → rendu 3D réaliste',
      'Multiples styles architecturaux',
      'Résultat en quelques secondes',
      'Interface simple',
    ],
    limitations: [
      'Rendu uniquement, pas de modification de plan',
      'Qualité variable selon le plan source',
    ],
    useCase: 'Complément de Rayon : exportez votre plan meublé en image, uploadez dans ArchiVinci pour obtenir un rendu 3D réaliste à montrer au client.',
  },
  {
    id: 'snaptrude',
    name: 'Snaptrude',
    description: 'Plateforme BIM tout-en-un avec IA : import DWG, modélisation 3D, rendus, collaboration',
    category: 'bim',
    url: 'https://www.snaptrude.com/',
    pricing: 'freemium',
    recommended: true,
    dwgSupport: 'both',
    strengths: [
      'Import/export DWG bidirectionnel',
      'Modélisation 3D complète',
      'IA conversationnelle ("mid-rise office in downtown")',
      'Analyse soleil, coûts, surfaces en temps réel',
      'Collaboration cloud',
      'Interface accessible sans formation BIM lourde',
    ],
    limitations: [
      'Moins puissant que Revit pour le détail',
      'Courbe d\'apprentissage pour les fonctions avancées',
    ],
    useCase: 'Alternative tout-en-un si vous voulez DWG + 3D + rendus dans un seul outil. Changement de workflow plus important que Rayon.',
  },
  // ===== RENDUS IA =====
  {
    id: 'rendair',
    name: 'Rendair AI',
    description: 'Rendu IA spécialisé architecture : sketch, plan ou photo → visualisation photoréaliste',
    category: 'rendering',
    url: 'https://rendair.ai/',
    pricing: 'freemium',
    dwgSupport: 'none',
    strengths: [
      'Spécialisé architecture et intérieur',
      'Multiples modes (sketch, photo, plan)',
      'Styles personnalisables',
      'Résultats professionnels',
    ],
    limitations: [
      'Rendu uniquement',
      'Crédits limités en version gratuite',
    ],
    useCase: 'Alternative à ArchiVinci pour les rendus. Bon pour transformer des croquis rapides en présentations client.',
  },
  {
    id: 'mnml',
    name: 'mnml.ai',
    description: 'Sketch-to-render IA : transforme des croquis architecturaux en rendus professionnels',
    category: 'rendering',
    url: 'https://mnml.ai/',
    pricing: 'freemium',
    dwgSupport: 'none',
    strengths: [
      'Spécialisé architecture',
      'Du croquis au rendu en secondes',
      'Résultats de haute qualité',
    ],
    limitations: [
      'Rendu uniquement',
      'Moins de contrôle que ControlNet',
    ],
    useCase: 'Pour les rendus rapides de façades et d\'espaces à partir de croquis main.',
  },
  {
    id: 'controlnet',
    name: 'ControlNet + Stable Diffusion',
    description: 'Génération d\'images contrôlée préservant la structure spatiale (open source)',
    category: 'rendering',
    url: 'https://stable-diffusion-art.com/controlnet/',
    pricing: 'free',
    dwgSupport: 'none',
    strengths: [
      'Gratuit et local',
      'Préserve la géométrie exacte (Canny, MLSD, Depth)',
      'Contrôle total sur le résultat',
      'Rendus photoréalistes',
    ],
    limitations: [
      'Installation technique requise (Python, GPU)',
      'Courbe d\'apprentissage importante',
      'Pour rendus uniquement, pas modification de plans',
    ],
    useCase: 'Pour les équipes techniques voulant un contrôle total sur les rendus, sans coût récurrent.',
  },
  // ===== CAO & BIM =====
  {
    id: 'archilabs',
    name: 'ArchiLabs',
    description: 'Plugin Revit avec IA conversationnelle pour automatiser les tâches BIM',
    category: 'bim',
    url: 'https://archilabs.ai/',
    pricing: 'paid',
    dwgSupport: 'both',
    strengths: [
      'Intégration native Revit',
      'Commandes en langage naturel',
      'Automatisation des tâches répétitives',
      'Modification précise du modèle BIM',
    ],
    limitations: [
      'Nécessite Revit (licence séparée)',
      'Courbe d\'apprentissage BIM',
    ],
    useCase: 'Si le cabinet utilise déjà Revit ou envisage de passer au BIM.',
  },
  {
    id: 'wisebim',
    name: 'WiseBIM',
    description: 'Conversion automatique de plans 2D (PDF, DWG, JPEG) en modèles 3D Revit',
    category: 'bim',
    url: 'https://wisebim.app/',
    pricing: 'paid',
    dwgSupport: 'import',
    strengths: [
      'Conversion rapide DWG/PDF → modèle Revit 3D',
      'Détection automatique murs, portes, fenêtres',
      'Gain de temps considérable',
    ],
    limitations: [
      'Qualité dépend du plan source',
      'Nécessite Revit pour exploiter le résultat',
      'Vérification manuelle requise',
    ],
    useCase: 'Pour numériser des plans DWG existants et les convertir automatiquement en modèle BIM 3D.',
  },
  // ===== GENERATION & PARAMETRIQUE =====
  {
    id: 'maket',
    name: 'Maket.ai',
    description: 'Génération de plans par contraintes (taille de parcelle, adjacences, zoning)',
    category: 'generation',
    url: 'https://www.maket.ai/',
    pricing: 'freemium',
    dwgSupport: 'export',
    strengths: [
      'Interface intuitive',
      'Génération rapide de variantes',
      'Respect des contraintes de zoning',
      'Export DXF (pas DWG)',
    ],
    limitations: [
      'Pas d\'import DWG',
      'Limité à la phase esquisse initiale',
      'Ne modifie pas de plans existants',
      'Export DXF uniquement (pas DWG natif)',
    ],
    useCase: 'Pour explorer des agencements en phase esquisse uniquement. Ne convient pas pour modifier des plans DWG existants.',
  },
  {
    id: 'forma',
    name: 'Autodesk Forma',
    description: 'Analyse de site et optimisation de massing avec données environnementales (soleil, vent, bruit)',
    category: 'parametric',
    url: 'https://www.autodesk.com/products/forma',
    pricing: 'enterprise',
    dwgSupport: 'both',
    strengths: [
      'Analyse soleil/vent/bruit en temps réel',
      'Optimisation automatique du massing',
      'Intégration Revit bidirectionnelle',
    ],
    limitations: [
      'Prix élevé (licence entreprise)',
      'Orienté phase amont et urbanisme',
    ],
    useCase: 'Pour l\'analyse de faisabilité et l\'optimisation de l\'implantation sur site.',
  },
  {
    id: 'testfit',
    name: 'TestFit',
    description: 'Faisabilité automatique : parking, massing, topographie, rentabilité',
    category: 'parametric',
    url: 'https://testfit.io/',
    pricing: 'enterprise',
    dwgSupport: 'both',
    strengths: [
      'Études de faisabilité en temps réel',
      'Optimisation automatique',
      'Calcul de rentabilité intégré',
    ],
    limitations: [
      'Orienté promoteurs immobiliers',
      'Prix élevé',
    ],
    useCase: 'Pour évaluer rapidement la faisabilité d\'un projet sur un terrain.',
  },
  {
    id: 'hypar',
    name: 'Hypar',
    description: 'Space planning intelligent avec optimisation automatique des agencements',
    category: 'parametric',
    url: 'https://hypar.io/',
    pricing: 'freemium',
    dwgSupport: 'none',
    strengths: [
      'Optimisation automatique d\'agencement',
      'Intégration Revit',
      'API personnalisable',
    ],
    limitations: [
      'Courbe d\'apprentissage',
      'Plus orienté bureaux/commercial',
    ],
    useCase: 'Pour optimiser automatiquement l\'agencement intérieur selon des contraintes.',
  },
]

const RESOURCES: Resource[] = [
  {
    id: '1',
    title: 'Rayon - Import DWG/DXF (Documentation)',
    type: 'documentation',
    url: 'https://docs.rayon.design/documentation/import-export/dwg-dxf-import',
    description: 'Guide officiel pour importer des fichiers DWG dans Rayon',
  },
  {
    id: '2',
    title: 'Rayon - Création de plans meublés',
    type: 'documentation',
    url: 'https://www.rayon.design/use-cases/floor-plan-creation',
    description: 'Tutoriel pour créer et modifier des plans avec mobilier',
  },
  {
    id: '3',
    title: 'AutoCAD vs Rayon : comparatif détaillé',
    type: 'article',
    url: 'https://www.spacesbydee.com/autocad-vs-rayon-which-software-is-better-for-architectural-drawings/',
    description: 'Analyse comparative pour choisir entre AutoCAD et Rayon',
  },
  {
    id: '4',
    title: 'Top 18 AI Tools for Architects in 2025',
    type: 'article',
    url: 'https://www.snaptrude.com/blog/top-18-ai-tools-for-architects-in-2025',
    description: 'Guide complet des outils IA pour architectes',
  },
  {
    id: '5',
    title: 'ControlNet Complete Guide',
    type: 'documentation',
    url: 'https://stable-diffusion-art.com/controlnet/',
    description: 'Tutoriel pour maîtriser les rendus IA contrôlés',
  },
  {
    id: '6',
    title: 'Rayon 2D vs 3D - Foundamental',
    type: 'article',
    url: 'https://www.foundamental.com/perspectives/rayon-2d-vs-3d-the-future-design-software-stack',
    description: 'Analyse du positionnement 2D de Rayon dans l\'écosystème',
  },
]

const categoryConfig = {
  cad: { label: 'CAO & Dessin 2D', icon: PenTool, color: 'bg-indigo-100 text-indigo-700' },
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

const dwgConfig = {
  both: { label: 'DWG Import + Export', color: 'bg-emerald-100 text-emerald-700' },
  import: { label: 'DWG Import', color: 'bg-teal-100 text-teal-700' },
  export: { label: 'DXF Export seulement', color: 'bg-gray-100 text-gray-600' },
  none: { label: 'Pas de DWG', color: 'bg-gray-100 text-gray-400' },
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
            Ressources IA pour l&apos;Architecture
          </h1>
          <p className="text-muted-foreground mt-1">
            Outils et workflow pour modifier des plans DWG avec l&apos;IA et produire des visualisations client
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
            <p>Les modèles génératifs comme DALL-E <strong>recr&eacute;ent une image enti&egrave;re</strong> &agrave; chaque g&eacute;n&eacute;ration :</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Pas de &quot;m&eacute;moire spatiale&quot; - modifier l&apos;&eacute;l&eacute;vation de la cuisine change tout le reste</li>
              <li>Chaque modification = nouvelle interpr&eacute;tation = incoh&eacute;rences</li>
              <li>Inadapt&eacute; pour un travail technique n&eacute;cessitant pr&eacute;cision et reproductibilit&eacute;</li>
            </ul>
            <p className="font-medium text-amber-800 mt-3">
              Solution : Utiliser des outils qui modifient des <strong>donn&eacute;es vectorielles</strong> (murs, cotes, pi&egrave;ces), pas des pixels. Puis g&eacute;n&eacute;rer les rendus visuels avec l&apos;IA s&eacute;par&eacute;ment.
            </p>
          </CardContent>
        </Card>

        {/* Workflow Recommendation - MOVED UP */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Workflow recommand&eacute; pour le cabinet (DWG)
            </CardTitle>
            <CardDescription>
              Modifier pr&eacute;cis&eacute;ment des plans existants et produire des visualisations am&eacute;nag&eacute;es
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main workflow */}
            <div className="flex flex-col md:flex-row items-center gap-3 text-center">
              <div className="flex-1 p-4 bg-muted rounded-lg">
                <div className="font-medium">1. Plan existant</div>
                <div className="text-sm text-muted-foreground">Fichier .dwg (AutoCAD)</div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 rotate-90 md:rotate-0" />
              <div className="flex-1 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <div className="font-medium text-indigo-700">2. Rayon</div>
                <div className="text-sm text-muted-foreground">Import DWG + modification</div>
                <div className="text-xs text-muted-foreground mt-1">Murs, agencement, mobilier, cotes</div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 rotate-90 md:rotate-0" />
              <div className="flex-1 p-4 bg-muted rounded-lg">
                <div className="font-medium">3. Export</div>
                <div className="text-sm text-muted-foreground">DWG + image du plan meubl&eacute;</div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 rotate-90 md:rotate-0" />
              <div className="flex-1 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="font-medium text-purple-700">4. Rendu IA</div>
                <div className="text-sm text-muted-foreground">ArchiVinci / Rendair</div>
                <div className="text-xs text-muted-foreground mt-1">Plan → visu 3D r&eacute;aliste</div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 rotate-90 md:rotate-0" />
              <div className="flex-1 p-4 bg-primary/10 rounded-lg border border-primary/30">
                <div className="font-medium">5. Client</div>
                <div className="text-sm text-muted-foreground">Plans DWG + rendus visuels</div>
              </div>
            </div>

            {/* Cost estimate */}
            <div className="grid md:grid-cols-3 gap-4 pt-2">
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <div className="font-medium">Rayon Pro</div>
                <div className="text-muted-foreground">~21$/mois par &eacute;diteur</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <div className="font-medium">ArchiVinci / Rendair</div>
                <div className="text-muted-foreground">~15-30$/mois (cr&eacute;dits)</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <div className="font-medium">Total estim&eacute;</div>
                <div className="text-muted-foreground">~35-50$/mois par utilisateur</div>
              </div>
            </div>

            {/* Alternative */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <p className="text-sm">
                <strong>Alternative tout-en-un :</strong> <a href="https://www.snaptrude.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Snaptrude</a> combine import DWG + modification + 3D + rendus dans un seul outil, mais implique un changement de workflow plus important.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recommended Tools */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Outils recommand&eacute;s
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
                            Recommand&eacute;
                          </Badge>
                        </CardTitle>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <Badge className={categoryConfig[tool.category].color}>
                            <CategoryIcon className="h-3 w-3 mr-1" />
                            {categoryConfig[tool.category].label}
                          </Badge>
                          <Badge className={pricingConfig[tool.pricing].color}>
                            {pricingConfig[tool.pricing].label}
                          </Badge>
                          {tool.dwgSupport && tool.dwgSupport !== 'none' && (
                            <Badge className={dwgConfig[tool.dwgSupport].color}>
                              {dwgConfig[tool.dwgSupport].label}
                            </Badge>
                          )}
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
                        {tool.dwgSupport && tool.dwgSupport !== 'none' && (
                          <Badge className={dwgConfig[tool.dwgSupport].color}>
                            {dwgConfig[tool.dwgSupport].label}
                          </Badge>
                        )}
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
                              <li key={i} className="text-muted-foreground">{s}</li>
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
                              <li key={i} className="text-muted-foreground">{l}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                        <h4 className="font-medium text-sm mb-1">Cas d&apos;usage id&eacute;al</h4>
                        <p className="text-sm text-muted-foreground">{tool.useCase}</p>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>

        {/* External Resources */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Ressources compl&eacute;mentaires
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
