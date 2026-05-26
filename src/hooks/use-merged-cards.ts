import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/components/providers/supabase-provider'

export interface MergedCard {
  id: string
  name: string
  isPreset: boolean
}

export function useMergedCards(groupId?: string) {
  const [cards, setCards] = useState<MergedCard[]>([])
  const [loading, setLoading] = useState(true)
  const { supabase, user } = useAuth()

  const fetchCards = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // 1. Fetch User's Private Cards
      const { data: privateCardsData, error: privateError } = await supabase
        .from('cards')
        .select('id, card_name')
        .order('card_name')

      if (privateError) throw privateError

      const privateCards: MergedCard[] = (privateCardsData || []).map((c) => ({
        id: c.id,
        name: c.card_name,
        isPreset: false,
      }))

      // 2. Fetch Group's Preset Cards (if groupId provided)
      let presetCards: MergedCard[] = []
      if (groupId) {
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('preset_card_names')
          .eq('id', groupId)
          .single()

        if (groupError) {
          // If error occurs (e.g. group doesn't exist yet), ignore and proceed with private cards
          console.warn('Could not fetch group presets:', groupError)
        } else if (groupData && groupData.preset_card_names) {
          presetCards = groupData.preset_card_names.map((name: string) => ({
            id: `preset-${name}`,
            name,
            isPreset: true,
          }))
        }
      }

      // 3. Merge and deduplicate by card name (prioritize private card if names clash)
      const mergedMap = new Map<string, MergedCard>()
      
      presetCards.forEach((c) => mergedMap.set(c.name.toLowerCase(), c))
      privateCards.forEach((c) => mergedMap.set(c.name.toLowerCase(), c))

      setCards(Array.from(mergedMap.values()).sort((a, b) => a.name.localeCompare(b.name)))
    } catch (err) {
      console.error('Error fetching/merging cards:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, user, groupId])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  return { cards, loading, refetch: fetchCards }
}
