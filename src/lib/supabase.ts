import { createBrowserClient } from '@supabase/ssr'

// Create a singleton client for use in browser/client components
export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yceifgbdjekznvijbgty.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}
