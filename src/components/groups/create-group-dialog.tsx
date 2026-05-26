'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/providers/supabase-provider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Sparkles, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface CreateGroupDialogProps {
  onSuccess: () => void
}

export function CreateGroupDialog({ onSuccess }: CreateGroupDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [joinCode, setJoinCode] = useState(() => generateCode())
  const [newCard, setNewCard] = useState('')
  const [presets, setPresets] = useState<string[]>(['Amex Gold', 'Chase Sapphire'])
  const [submitting, setSubmitting] = useState(false)
  const { supabase, user } = useAuth()

  function generateCode() {
    return 'FAM-' + Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const handleRegenerateCode = (e: React.MouseEvent) => {
    e.preventDefault()
    setJoinCode(generateCode())
  }

  const handleAddPreset = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCard.trim()) return
    if (presets.includes(newCard.trim())) {
      toast.error('Card preset already added')
      return
    }
    setPresets([...presets, newCard.trim()])
    setNewCard('')
  }

  const handleRemovePreset = (index: number) => {
    setPresets(presets.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!title.trim()) {
      toast.error('Group title is required')
      return
    }
    if (!joinCode.trim()) {
      toast.error('Invite join code is required')
      return
    }

    setSubmitting(true)
    try {
      // 1. Insert Group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          title: title.trim(),
          join_code: joinCode.trim().toUpperCase(),
          preset_card_names: presets,
          created_by: user.id,
        })
        .select()
        .single()

      if (groupError) {
        if (groupError.code === '23505') {
          throw new Error('Join code must be unique. Please generate another code.')
        }
        throw groupError
      }

      // 2. Insert Membership
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupData.id,
          profile_id: user.id,
          role: 'creator',
        })

      if (memberError) throw memberError

      toast.success(`Group "${title}" created successfully!`)
      setTitle('')
      setJoinCode(generateCode())
      setPresets(['Amex Gold', 'Chase Sapphire'])
      setOpen(false)
      onSuccess()
    } catch (error: any) {
      console.error('Error creating group:', error)
      toast.error(error.message || 'Failed to create group workspace')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="bg-white hover:bg-neutral-200 text-black rounded-xl shadow-lg font-medium py-5 px-5 flex gap-2 border border-transparent">
          <Plus className="h-4 w-4" /> Create Family Group
        </Button>
      } />
      <DialogContent className="border-neutral-900 bg-neutral-950/95 text-white max-w-[420px] rounded-2xl shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold bg-linear-to-b from-white to-neutral-400 bg-clip-text text-transparent">
            <Sparkles className="h-5 w-5 text-neutral-300" /> Create Workspace
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs mt-1">
            Establish a persistent family or group hub to share expenses and split balances.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs text-slate-300">Group Title</Label>
            <Input
              id="title"
              placeholder="e.g. Koh Family Home, Japan 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-200 placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-white focus:border-white"
            />
          </div>

          {/* Join Code */}
          <div className="space-y-2">
            <Label htmlFor="code" className="text-xs text-slate-300">Unique Invite Join Code</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                placeholder="FAM-XXXXXX"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-200 uppercase tracking-widest font-mono focus:outline-none focus:ring-1 focus:ring-white focus:border-white"
              />
              <Button
                variant="outline"
                type="button"
                onClick={handleRegenerateCode}
                className="border-neutral-800 bg-neutral-900/40 hover:bg-neutral-800 text-slate-300 text-xs rounded-xl"
              >
                Generate
              </Button>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Family members will enter this code to securely join your shared workspace.
            </p>
          </div>

          {/* Card Presets */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-300">Preset Shared Cards</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Amex Gold"
                value={newCard}
                onChange={(e) => setNewCard(e.target.value)}
                className="border-neutral-800 bg-neutral-900/50 rounded-xl text-slate-200 placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-white focus:border-white"
              />
              <Button
                type="button"
                onClick={handleAddPreset}
                className="bg-neutral-800 hover:bg-neutral-750 text-slate-200 rounded-xl px-3"
              >
                Add
              </Button>
            </div>
            <p className="text-[10px] text-slate-500">
              Preset configs defined by you. Group members can select these cards instantly.
            </p>

            {/* Presets List */}
            <div className="flex flex-wrap gap-1.5 pt-2 max-h-[80px] overflow-y-auto">
              <AnimatePresence>
                {presets.map((preset, idx) => (
                  <motion.div
                    key={preset}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Badge className="border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800 text-slate-300 text-xs rounded-lg px-2 py-1 flex items-center gap-1.5 font-normal">
                      {preset}
                      <button
                        type="button"
                        onClick={() => handleRemovePreset(idx)}
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-white hover:bg-neutral-200 text-black font-semibold rounded-xl py-6 mt-4 shadow-2xl flex items-center justify-center gap-2 border border-transparent"
          >
            {submitting ? 'Creating Group...' : 'Create Group Workspace'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
