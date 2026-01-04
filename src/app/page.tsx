import Link from 'next/link'
import { ArrowRight, Bot, FolderKanban, Mail, Shield, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              H
            </div>
            <span className="font-semibold text-xl">Hub MCP</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">Connexion</Button>
            </Link>
            <Link href="/auth/signup">
              <Button>Commencer</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Votre hub central de
          <span className="text-primary"> gestion de projet</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Connectez vos outils, indexez vos contenus et laissez l&apos;IA vous aider
          à retrouver, comprendre et agir sur toutes les informations de vos projets.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link href="/auth/signup">
            <Button size="lg" className="gap-2">
              Créer un workspace
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/demo">
            <Button size="lg" variant="outline">
              Voir la démo
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-24">
        <h2 className="text-center text-3xl font-bold mb-12">
          Tout ce dont vous avez besoin
        </h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={FolderKanban}
            title="Gestion de projets"
            description="Organisez vos projets avec documents, emails, réunions et tâches en un seul endroit."
          />
          <FeatureCard
            icon={Mail}
            title="Connecteurs"
            description="Connectez Gmail, Telegram, calendriers et fichiers pour centraliser vos données."
          />
          <FeatureCard
            icon={Bot}
            title="Assistant IA"
            description="Posez des questions, recherchez des infos et exécutez des actions via un chat intelligent."
          />
          <FeatureCard
            icon={Shield}
            title="Gouvernance"
            description="Contrôlez les permissions, exigez des confirmations et gardez une trace de tout."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-24 text-center">
          <h2 className="text-3xl font-bold mb-4">Prêt à centraliser vos projets ?</h2>
          <p className="text-muted-foreground mb-8">
            Commencez gratuitement et connectez vos premiers outils en quelques minutes.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" className="gap-2">
              <Zap className="h-4 w-4" />
              Démarrer maintenant
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Hub MCP - Gestion de projet assistée par IA</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
