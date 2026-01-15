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
    // Check if user is already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log('[AuthRedirect] User is authenticated, redirecting to dashboard')
        router.push('/dashboard')
      } else {
        console.log('[AuthRedirect] User is not authenticated, staying on home page')
      }
    })
  }, [router, supabase])

  return null
}
