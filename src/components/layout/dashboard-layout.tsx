'use client'

import { Sidebar } from './sidebar'
import { Header } from './header'

interface DashboardLayoutProps {
  children: React.ReactNode
  user?: {
    name: string
    email: string
    avatarUrl?: string
  }
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-muted/30">
      <Sidebar />
      <div className="pl-64">
        <Header user={user} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
