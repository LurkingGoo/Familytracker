'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RootLandingPageFallback() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
    </div>
  )
}

