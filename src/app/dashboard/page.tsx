import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { FolderKanban, Mail, Calendar, FileText, CheckSquare, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/auth/login')
  }

  const user = { id: authUser.id, email: authUser.email || '', name: authUser.user_metadata?.name || authUser.email || 'Utilisateur' }

  // Get user's workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace:workspaces(*)')
    .eq('user_id', authUser.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaceData = (membership as any)?.workspace
  if (!workspaceData) {
    redirect('/onboarding')
  }
  const workspace = { id: workspaceData.id as string, name: workspaceData.name as string }

  const [projectsCount, emailsCount, meetingsCount, tasksCount] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
    supabase.from('emails').select('*', { count: 'exact', head: true }),
    supabase.from('meetings').select('*', { count: 'exact', head: true }),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'TODO'),
  ])

  const stats = [
    { name: 'Projets', value: projectsCount.count || 0, icon: FolderKanban, color: 'text-blue-500' },
    { name: 'Emails', value: emailsCount.count || 0, icon: Mail, color: 'text-green-500' },
    { name: 'Réunions', value: meetingsCount.count || 0, icon: Calendar, color: 'text-purple-500' },
    { name: 'Tâches', value: tasksCount.count || 0, icon: CheckSquare, color: 'text-orange-500' },
  ]

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('updated_at', { ascending: false })
    .limit(5)

  const recentProjects = (projects || []).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    updated_at: p.updated_at
  }))

  return (
    <DashboardLayout user={{ name: user.name || user.email, email: user.email }}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Bienvenue dans {workspace.name}</h1>
          <p className="text-muted-foreground">Voici un aperçu de votre activité</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.name}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.name}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Projets récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentProjects && recentProjects.length > 0 ? (
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FolderKanban className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {project.description || 'Aucune description'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(project.updated_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 font-medium">Aucun projet</h3>
                <p className="text-sm text-muted-foreground">
                  Créez votre premier projet pour commencer
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
