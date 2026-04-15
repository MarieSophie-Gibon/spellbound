import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Il manque les variables d'environnement Supabase.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function uploadWikiImage(file: File): Promise<string | null> {
  // On génère un nom de fichier unique pour éviter les conflits
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
  const filePath = `images/${fileName}`

  // Upload dans le bucket 'wiki-images'
  const { error: uploadError } = await supabase.storage
    .from('wiki-images')
    .upload(filePath, file)

  if (uploadError) {
    console.error("Erreur d'incantation de l'image :", uploadError.message)
    return null
  }

  // Récupération de l'URL publique
  const { data } = supabase.storage
    .from('wiki-images')
    .getPublicUrl(filePath)

  return data.publicUrl
}