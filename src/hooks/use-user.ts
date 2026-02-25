'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserInfo {
  name: string
  email: string
}

export function useUser() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (authUser) {
        setUser({
          name: authUser.user_metadata?.name || authUser.email || 'Utilisateur',
          email: authUser.email || '',
        })
      }
      setLoading(false)
    })
  }, [])

  return { user, loading }
}
