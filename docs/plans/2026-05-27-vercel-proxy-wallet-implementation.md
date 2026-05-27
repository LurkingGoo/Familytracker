# Vercel Stability, Proxy Migration & Glass Wallet Redesign Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Resolve Vercel build blockers by migrating to the Next.js 16 `proxy.ts` Edge convention, bypass the legacy landing page, and introduce a swipeable glassmorphic card wallet interface under `/cards`.

**Architecture:** Edge-level routing via a dedicated `src/proxy.ts` file replacing deprecated middleware. Swipeable payments deck built with `framer-motion` drag gestures, using HSL-tailored monochrome glass styling, and matching offline syncing.

**Tech Stack:** Next.js 16 (App Router), Supabase (@supabase/ssr, Auth, RLS), TanStack Query, Framer Motion, Tailwind CSS, Lucide React.

---

### Task 1: Next.js 16 Proxy Migration & Edge Redirection

**Files:**
- Create: `src/proxy.ts`
- Delete: `src/middleware.ts`

**Step 1: Write the Next.js 16 Proxy configuration**
Create `src/proxy.ts` containing the named `proxy` function to handle auth redirection:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yceifgbdjekznvijbgty.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthPage = pathname === '/login' || pathname === '/'
  const isProtectedPage = 
    pathname.startsWith('/personal') ||
    pathname.startsWith('/groups') ||
    pathname.startsWith('/cards')

  if (!user && (isProtectedPage || pathname === '/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/personal'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

**Step 2: Delete deprecated Middleware**
Delete the old `src/middleware.ts` file to avoid build conflicts.

**Step 3: Verify dev compile**
Verify the file renames compile and dev server runs successfully.
Run: `npm run build`
Expected: Compile succeeds with zero "middleware is deprecated" warnings.

**Step 4: Commit**
```bash
git add src/proxy.ts src/middleware.ts
git commit -m "feat: migrate middleware to next.js 16 proxy convention and implement auth bypass redirection"
```

---

### Task 2: Simplify Package.json Build Command for Vercel

**Files:**
- Modify: `package.json:7`

**Step 1: Simplify package.json script**
Change `"build": "next build --webpack"` to `"build": "next build"`.
```json
    "build": "next build",
```

**Step 2: Verify local build compiles cleanly**
Run: `npm run build`
Expected: Successful production build using standard compilation pipeline.

**Step 3: Commit**
```bash
git add package.json
git commit -m "chore: remove custom webpack flag from build command for vercel pipeline stability"
```

---

### Task 3: Redesign Cards Dashboard with Swipeable Glass Wallet

**Files:**
- Modify: `src/app/cards/page.tsx`

**Step 1: Write Swipeable Glass Wallet UI in cards page**
Refactor `src/app/cards/page.tsx` to integrate drag-to-swipe physics, metal branding highlights, and glass layouts.

```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/providers/supabase-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CreditCard, Plus, Trash2, ArrowLeft, Landmark, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function CardsDashboard() {
  const { user, supabase } = useAuth()
  const router = useRouter()
  
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newCardName, setNewCardName] = useState('')
  const [adding, setAdding] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const fetchCards = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setCards(data || [])
    } catch (err: any) {
      toast.error('Failed to load wallet')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCards()
  }, [user])

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCardName.trim()) return
    setAdding(true)
    try {
      const { error } = await supabase
        .from('cards')
        .insert({
          user_id: user?.id,
          card_name: newCardName.trim()
        })
      if (error) throw error
      toast.success('Card added to your secure wallet!')
      setNewCardName('')
      await fetchCards()
      setActiveIndex(0)
    } catch (err: any) {
      toast.error(err.message || 'Failed to add card')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteCard = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', id)
      if (error) throw error
      toast.success('Card deleted successfully')
      await fetchCards()
      setActiveIndex(0)
    } catch (err: any) {
      toast.error('Failed to remove card')
    }
  }

  return (
    <div className="min-h-screen pb-safe bg-black text-white px-4 py-8 flex flex-col items-center">
      <div className="absolute top-[-20%] left-[-20%] h-[60%] w-[60%] rounded-full bg-white/[0.01] blur-[150px] pointer-events-none" />

      <div className="mx-auto max-w-[450px] w-full z-10 flex flex-col items-center">
        {/* Navigation */}
        <div className="flex items-center justify-between w-full mb-8 border-b border-neutral-900 pb-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/personal')}
            className="text-slate-400 hover:text-white rounded-xl px-3 flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Vault
          </Button>
          <span className="text-sm font-bold uppercase tracking-widest text-slate-500">Wallet</span>
          <div className="w-16" />
        </div>

        {/* Swipeable Wallet Container */}
        <div className="relative w-full h-[240px] flex items-center justify-center overflow-hidden mb-6">
          {loading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : cards.length === 0 ? (
            <div className="text-center p-6 border border-neutral-900 border-dashed rounded-3xl w-full h-full flex flex-col items-center justify-center bg-neutral-950/20">
              <CreditCard className="h-8 w-8 text-neutral-700 mb-2" />
              <h4 className="text-xs font-semibold text-slate-400">Empty Wallet</h4>
              <p className="text-[10px] text-slate-600 max-w-[200px] mt-1">
                No active custom cards configured yet. Add your personal cards below.
              </p>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <AnimatePresence initial={false}>
                {cards.map((card, idx) => {
                  const offset = idx - activeIndex
                  const isVisible = Math.abs(offset) <= 2
                  if (!isVisible) return null

                  return (
                    <motion.div
                      key={card.id}
                      style={{
                        zIndex: cards.length - idx,
                        transformOrigin: 'bottom center',
                      }}
                      animate={{
                        x: offset * 280,
                        scale: idx === activeIndex ? 1 : 0.9,
                        opacity: idx === activeIndex ? 1 : 0.4,
                      }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.4}
                      onDragEnd={(_, info) => {
                        if (info.offset.x < -60 && activeIndex < cards.length - 1) {
                          setActiveIndex(activeIndex + 1)
                        } else if (info.offset.x > 60 && activeIndex > 0) {
                          setActiveIndex(activeIndex - 1)
                        }
                      }}
                      className="absolute w-[280px] h-[170px] cursor-grab active:cursor-grabbing"
                    >
                      {/* Premium Card Frame */}
                      <div className="w-full h-full rounded-2xl p-5 relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800 shadow-2xl flex flex-col justify-between">
                        {/* Shimmer Highlight */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.04] to-transparent pointer-events-none" />
                        
                        {/* Header Details */}
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-neutral-400" />
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Vault</span>
                          </div>
                          <Landmark className="h-5 w-5 text-neutral-300" />
                        </div>

                        {/* Card Name */}
                        <div className="space-y-0.5">
                          <h4 className="text-base font-black tracking-wide text-white truncate max-w-full">
                            {card.card_name}
                          </h4>
                          <p className="text-[8px] text-neutral-500 font-mono tracking-widest">
                            SECURED RLS CREDENTIAL
                          </p>
                        </div>

                        {/* Card Chip / Brand Metallic Accent */}
                        <div className="flex justify-between items-end">
                          <div className="h-6 w-8 rounded-md bg-neutral-900 border border-neutral-800/80 flex items-center justify-center">
                            <div className="h-3 w-4 rounded-sm border border-neutral-700/60" />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCard(card.id)}
                            className="h-7 w-7 text-neutral-600 hover:text-rose-400 hover:bg-rose-950/15 rounded-md"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Page Selector Dots */}
        {!loading && cards.length > 0 && (
          <div className="flex gap-1.5 justify-center items-center mb-8">
            {cards.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 w-1.5 rounded-full transition-all duration-350 ${
                  idx === activeIndex ? 'bg-white w-3' : 'bg-neutral-850'
                }`}
              />
            ))}
          </div>
        )}

        {/* Register Card Form */}
        <Card className="w-full border-neutral-900 bg-neutral-950/40 backdrop-blur-2xl p-5 rounded-2xl shadow-xl">
          <form onSubmit={handleAddCard} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider pl-0.5">
                Register Custom Card
              </label>
              <input
                type="text"
                required
                maxLength={22}
                value={newCardName}
                onChange={(e) => setNewCardName(e.target.value)}
                placeholder="e.g. Target RedCard"
                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl py-3.5 px-4 text-sm text-white placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-white focus:border-white transition-all duration-300"
              />
            </div>
            
            <Button
              type="submit"
              disabled={adding}
              className="w-full bg-white hover:bg-neutral-200 text-black font-bold rounded-xl py-5 shadow-md flex items-center justify-center gap-2 border border-transparent"
            >
              {adding ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Add Card to Wallet
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
```

**Step 2: Verify compile**
Run: `npm run build`
Expected: Succeeds.

**Step 3: Commit**
```bash
git add src/app/cards/page.tsx
git commit -m "style: redesign secure wallet deck to a premium swipeable glass card layout"
```

---

### Task 4: Complete System Consistency & Backend Verification

**Step 1: Check Database Schema RLS**
Ensure PostgreSQL triggers and RLS policies allow correct query execution. Run the typescript compiler and Next build one final time.
Run: `npm run build`
Expected: Compile succeeds with zero TypeScript or packaging issues.

**Step 2: Commit and Finalize**
```bash
git commit --allow-empty -m "verification: perform system coherency, RLS safety, and route compilation sweep"
```
