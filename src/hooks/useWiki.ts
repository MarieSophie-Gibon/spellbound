import { useQuery } from '@tanstack/react-query'
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