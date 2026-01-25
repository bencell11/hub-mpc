'use client'

import { Bell, Search, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

interface HeaderProps {
  user?: {
    name: string
    email: string
    avatarUrl?: string
  }
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-6">
      {/* Search */}
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans les projets, emails, documents..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau projet
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <Avatar size="md" className="cursor-pointer">
          {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user?.name} />}
          <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
