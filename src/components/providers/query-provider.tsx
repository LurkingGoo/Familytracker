'use client'

import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 60 * 24 * 7, // 1 week garbage collection
            refetchOnWindowFocus: false, // Prevent aggressive focus refetches
            retry: 1,
          },
        },
      })
  )

  const [persister] = useState(() => {
    if (typeof window === 'undefined') return undefined
    return createSyncStoragePersister({
      storage: window.localStorage,
    })
  })

  // Fallback to standard provider on Server Side / Hydration to prevent type clashing
  if (typeof window === 'undefined' || !persister) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week max cache age
      }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
