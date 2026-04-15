import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Hook pour récupérer la liste des catégories uniques
export function useWikiCategories() {
  return useQuery({
    queryKey: ['wikiCategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wiki_entities')
        .select('category')
        .eq('type', 'rule')
      
      if (error) throw error
      
      // On extrait les catégories uniques, on enlève les null/undefined et on trie
      const categories = Array.from(new Set(data.map(item => item.category))).filter(Boolean) as string[]
      return categories.sort()
    }
  })
}

// Hook pour récupérer les règles d'une catégorie spécifique
export function useWikiRules(category: string | null) {
  return useQuery({
    queryKey: ['wikiRules', category],
    queryFn: async () => {
      let query = supabase.from('wiki_entities').select('*').eq('type', 'rule')
      
      if (category) {
        query = query.eq('category', category)
      }
      
      const { data, error } = await query.order('name')
      if (error) throw error
      return data
    },
    // Ne s'exécute que si une catégorie est sélectionnée
    enabled: !!category 
  })
}

export function useSaveWikiEntity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entity: { id?: string, name: string, category: string, type: string, stats: Record<string, unknown> }) => {
      if (entity.id) {
        // Mise à jour
        const { data, error } = await supabase
          .from('wiki_entities')
          .update(entity)
          .eq('id', entity.id)
          .select()
        if (error) throw error
        return data[0]
      } else {
        // Création
        const { data, error } = await supabase
          .from('wiki_entities')
          .insert([entity])
          .select()
        if (error) throw error
        return data[0]
      }
    },
    onSuccess: () => {
      // Invalide le cache pour forcer le rechargement immédiat de l'UI
      queryClient.invalidateQueries({ queryKey: ['wikiRules'] })
      queryClient.invalidateQueries({ queryKey: ['wikiCategories'] })
    }
  })
}

// Hook pour supprimer un article unique
export function useDeleteWikiEntity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('wiki_entities').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wikiRules'] })
      queryClient.invalidateQueries({ queryKey: ['wikiCategories'] })
    }
  })
}

// Hook pour supprimer TOUTE une catégorie (Suppression en cascade)
export function useDeleteWikiCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (category: string) => {
      const { error } = await supabase.from('wiki_entities').delete().eq('category', category)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wikiRules'] })
      queryClient.invalidateQueries({ queryKey: ['wikiCategories'] })
    }
  })
}