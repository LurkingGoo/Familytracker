'use client'

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { QueryProvider } from '@/components/providers/query-provider'
import { SupabaseProvider } from '@/components/providers/supabase-provider'
import { Toaster } from '@/components/ui/sonner'
import { Wallet, Users, CreditCard } from 'lucide-react'

export function PwaShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const isAuthPage = pathname === '/login' || pathname === '/'

  const navItems = [
    { label: 'Personal', path: '/personal', icon: Wallet },
    { label: 'Workspaces', path: '/groups', icon: Users },
    { label: 'Wallet', path: '/cards', icon: CreditCard },
  ]

  return (
    <SupabaseProvider>
      <QueryProvider>
        <div className="flex-1 flex flex-col min-h-screen relative select-none">
          {/* Main Content Area */}
          <main className={`flex-1 flex flex-col ${!isAuthPage ? 'pb-24' : ''}`}>
            {children}
          </main>

          {/* Native Mobile Bottom Navigation Bar */}
          {!isAuthPage && (
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-2xl border-t border-neutral-900 pb-safe shadow-2xl">
              <div className="mx-auto max-w-[600px] w-full h-16 flex items-center justify-around px-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname.startsWith(item.path)

                  return (
                    <button
                      key={item.path}
                      onClick={() => router.push(item.path)}
                      className="flex flex-col items-center justify-center gap-1 w-20 h-full relative group"
                    >
                      {/* Active highlight backing */}
                      {isActive && (
                        <span className="absolute top-0 h-0.5 w-10 bg-white rounded-full" />
                      )}

                      <Icon
                        className={`h-5 w-5 transition-all duration-300 ${
                          isActive
                            ? 'text-white scale-110'
                            : 'text-neutral-500 group-hover:text-neutral-300'
                        }`}
                      />
                      <span
                        className={`text-[9px] font-semibold tracking-wide transition-all ${
                          isActive
                            ? 'text-white'
                            : 'text-neutral-500 group-hover:text-neutral-400'
                        }`}
                      >
                        {item.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </nav>
          )}
        </div>
        <Toaster theme="dark" position="top-center" closeButton />
      </QueryProvider>
    </SupabaseProvider>
  )
}
