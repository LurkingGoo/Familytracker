'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/providers/supabase-provider'
import { CreateGroupDialog } from '@/components/groups/create-group-dialog'
import { JoinGroupDialog } from '@/components/groups/join-group-dialog'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users2, ArrowUpRight, Copy, Check, Sparkles, FolderLock } from 'lucide-react'
import { toast } from 'sonner'

interface GroupItem {
  role: string
  groups: {
    id: string
    title: string
    join_code: string
    preset_card_names: string[]
    created_at: string
  }
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { supabase, user } = useAuth()
  const router = useRouter()

  const loadGroups = useCallback(async () => {
    if (!user) return
    try {
      // Query group memberships and join groups metadata
      const { data, error } = await supabase
        .from('group_members')
        .select('role, groups(*)')

      if (error) throw error

      // Filter out any null joins
      const validGroups = (data || []).filter((item: any) => item.groups) as unknown as GroupItem[]
      setGroups(validGroups)
    } catch (err) {
      console.error('Error fetching group list:', err)
      toast.error('Failed to load shared workspaces')
    } finally {
      setLoading(false)
    }
  }, [supabase, user])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('Invite join code copied!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="min-h-screen pb-safe bg-black text-white px-4 py-8">
      {/* Subtle background ambient blur */}
      <div className="absolute top-[-20%] left-[-20%] h-[60%] w-[60%] rounded-full bg-white/[0.01] blur-[150px] pointer-events-none" />

      <div className="mx-auto max-w-[600px] w-full z-10 relative">
        {/* Header Block */}
        <div className="flex flex-col gap-1 mb-8">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 uppercase tracking-widest">
            <Sparkles className="h-3 w-3" /> Shared Hubs
          </div>
          <h1 className="text-3xl font-black tracking-tight bg-linear-to-b from-white to-neutral-400 bg-clip-text text-transparent">
            Shared Workspaces
          </h1>
          <p className="text-neutral-400 text-xs">
            Collaborative spaces for family expenses, trip calculations, and shared cards preset.
          </p>
        </div>

        {/* Buttons Action Bar */}
        <div className="flex items-center gap-3 mb-8 w-full">
          <CreateGroupDialog onSuccess={loadGroups} />
          <JoinGroupDialog onSuccess={loadGroups} />
        </div>

        {/* Groups List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <p className="text-xs text-slate-500 font-medium">Fetching workspaces...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {groups.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center border border-neutral-900 border-dashed rounded-2xl py-16 px-4 text-center bg-neutral-950/20 backdrop-blur-sm"
                >
                  <Users2 className="h-10 w-10 text-slate-600 mb-3" />
                  <h3 className="text-sm font-semibold text-slate-300">No Shared Groups Yet</h3>
                  <p className="text-[11px] text-slate-500 max-w-[280px] mt-1 leading-relaxed">
                    Create a new family group to invite others, or enter a join code to access an existing workspace.
                  </p>
                </motion.div>
              ) : (
                groups.map((item) => (
                  <motion.div
                    key={item.groups.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border-neutral-900 bg-neutral-950/40 hover:bg-neutral-950/60 backdrop-blur-2xl shadow-lg transition-all duration-300 group overflow-hidden">
                      <div className="absolute top-0 left-0 h-0.5 w-full bg-neutral-800/40 group-hover:bg-white transition-all duration-500" />
                      <CardHeader className="flex flex-row items-start justify-between pb-3">
                        <div className="space-y-1 max-w-[70%]">
                          <CardTitle className="text-lg font-bold text-white group-hover:text-neutral-200 transition-colors duration-300 truncate">
                            {item.groups.title}
                          </CardTitle>
                          <CardDescription className="text-[10px] text-slate-400">
                            Created at {new Date(item.groups.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge
                          className="border-neutral-800 bg-neutral-900 text-neutral-300 font-medium rounded-lg text-[10px] py-0.5 px-2.5"
                        >
                          {item.role === 'creator' ? 'Creator' : 'Member'}
                        </Badge>
                      </CardHeader>
                      <CardContent className="pb-4">
                        {/* Invite Join Code Section */}
                        <div className="flex items-center justify-between bg-neutral-900/40 border border-neutral-900 rounded-xl px-3 py-2 text-xs">
                          <span className="text-[10px] text-neutral-400 font-medium flex items-center gap-1">
                            <FolderLock className="h-3.5 w-3.5 text-neutral-400" /> INVITE CODE:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <code className="font-mono font-bold tracking-widest text-slate-200">{item.groups.join_code}</code>
                            <button
                              onClick={() => copyToClipboard(item.groups.join_code, item.groups.id)}
                              className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-md transition-colors"
                            >
                              {copiedId === item.groups.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0 pb-4 border-t border-slate-900 pt-3 flex justify-between items-center text-xs">
                        <span className="text-[10px] text-slate-500 font-medium">
                          {item.groups.preset_card_names?.length || 0} card preset configs
                        </span>
                        <Button
                          onClick={() => router.push(`/groups/${item.groups.id}`)}
                          className="bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs flex gap-1 font-semibold transition-all group-hover:border-neutral-700"
                        >
                          Open Workspace <ArrowUpRight className="h-3.5 w-3.5" />
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
