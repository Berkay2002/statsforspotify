'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * This component checks if a user is authenticated and redirects them to the dashboard.
 * Used on the public home page to prevent authenticated users from seeing the landing page.
 */
export function AuthRedirect() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('reauth') || params.has('error')) return
    let active = true
    // Check if user is already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && active) {
        router.push('/dashboard')
      }
    })
    return () => { active = false }
  }, [router, supabase])

  return null
}
