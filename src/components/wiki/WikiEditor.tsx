/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Heading from '@tiptap/extension-heading'
import { uploadWikiImage } from '@/lib/supabase'
import { useSaveWikiEntity, useWikiCategories } from '@/hooks/useWiki'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Bold, Italic, Heading1, Heading2, Heading3, 
  List, ImagePlus, Loader2 
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// Styles partagés entre l'éditeur et la vue Wiki pour une cohérence parfaite
export const tiptapStyles = "text-slate-200 text-sm leading-relaxed [&_h1]:text-3xl [&_h1]:font-serif [&_h1]:text-amber-300 [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:tracking-tight [&_h2]:text-2xl [&_h2]:font-serif [&_h2]:text-indigo-300 [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-amber-400/90 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:tracking-widest [&_h3]:uppercase [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_p]:last:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:mb-4 [&_img]:rounded-xl [&_img]:shadow-2xl [&_img]:border [&_img]:border-white/10 [&_img]:my-6 [&_img]:max-h-[450px] [&_img]:mx-auto [&_li_p]:m-0 [&_li_p]:inline";

interface WikiEditorProps {
  isOpen: boolean
  onClose: () => void
  initialData?: any | null
}

// Barre d'outils de l'éditeur
const MenuBar = ({ editor }: { editor: any }) => {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!editor) return null

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const imageUrl = await uploadWikiImage(file)
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run()
    }
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-black/60 border border-white/10 rounded-t-xl border-b-0 backdrop-blur-md">
      <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} 
        className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'}`}>
        <Bold className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} 
        className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'}`}>
        <Italic className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-4 bg-white/10 mx-1" />

      <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
        className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 1 }) ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'}`}>
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
        className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 2 }) ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'}`}>
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} 
        className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 3 }) ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'}`}>
        <Heading3 className="h-4 w-4" />
      </Button>

      <div className="w-px h-4 bg-white/10 mx-1" />

      <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} 
        className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'}`}>
        <List className="h-4 w-4" />
      </Button>

      <div className="w-px h-4 bg-white/10 mx-1" />

      {/* Couleurs HoYoverse */}
      <div className="flex gap-1.5 px-2">
        <button onClick={() => editor.chain().focus().setColor('#f1f5f9').run()} className="w-4 h-4 rounded-full bg-slate-100 border border-white/20 hover:scale-125 transition-transform" />
        <button onClick={() => editor.chain().focus().setColor('#fbbf24').run()} className="w-4 h-4 rounded-full bg-amber-400 border border-white/20 hover:scale-125 transition-transform" />
        <button onClick={() => editor.chain().focus().setColor('#818cf8').run()} className="w-4 h-4 rounded-full bg-indigo-400 border border-white/20 hover:scale-125 transition-transform" />
      </div>

      <div className="w-px h-4 bg-white/10 mx-1" />

      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
      <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading} 
        className="h-8 px-3 text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/20">
        {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImagePlus className="h-4 w-4 mr-2" />}
        <span className="text-xs font-bold uppercase tracking-tighter">Illustration</span>
      </Button>
    </div>
  )
}

export function WikiEditor({ isOpen, onClose, initialData }: WikiEditorProps) {
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  // Removed isNewCategory and newCategoryName (no longer needed)

  const { data: categories } = useWikiCategories()
  const saveMutation = useSaveWikiEntity()
  // No createCategoryMutation available, so remove related logic

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Heading.configure({ levels: [1, 2, 3] }),
      TextStyle,
      Color,
      Image.configure({
        HTMLAttributes: { class: 'max-w-full h-auto' },
      }),
    ],
    editorProps: {
      attributes: {
        class: `min-h-[400px] max-h-[600px] overflow-y-auto p-6 bg-black/40 border border-white/10 rounded-b-xl focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${tiptapStyles}`,
      },
    },
  })

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '')
      setCategoryId(initialData?.category_id || '')
      editor?.commands.setContent(initialData?.content || '')
    }
  }, [initialData, isOpen, editor])

  const handleSave = async () => {
    try {
      // No category creation, just use selected category
      await saveMutation.mutateAsync({
        id: initialData?.id,
        name: title,
        category: categoryId,
        type: 'rule',
        stats: { content: editor?.getHTML() || '' }
      })
      onClose()
    } catch (err) {
      console.error("Erreur de forge :", err)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl bg-slate-900/95 backdrop-blur-2xl border-white/10 text-slate-200 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <DialogHeader>
          <DialogTitle className="text-3xl font-serif text-amber-300 tracking-wide">
            {initialData ? 'Modifier l\'Archive' : 'Nouvelle Inscription'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6 py-4">
          {/* Inputs de Métadonnées */}
          <div className="col-span-2 space-y-2">
            <Label className="text-amber-200/70 ml-1 text-xs uppercase tracking-widest font-bold">Titre du Manuscrit</Label>
            <Input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="ex: Grimoire des Flammes..."
              className="bg-black/40 border-white/10 h-12 text-lg focus-visible:ring-amber-500/50 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-amber-200/70 ml-1 text-xs uppercase tracking-widest font-bold">Catégorie</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="bg-black/40 border-white/10 h-12 focus-visible:ring-amber-500/50 rounded-xl">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                {categories?.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Éditeur Tiptap principal */}
          <div className="col-span-3 space-y-1">
            <Label className="text-amber-200/70 ml-1 text-xs uppercase tracking-widest font-bold block mb-2">Contenu du Grimoire</Label>
            <MenuBar editor={editor} />
            <EditorContent editor={editor} />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <p className="text-xs text-slate-500 italic flex items-center">
            Les modifications seront visibles par tous les membres de la troupe.
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white rounded-full px-6">
              Annuler
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saveMutation.isPending || !title || !categoryId}
              className="bg-linear-to-r from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300 text-slate-950 font-bold rounded-full px-8 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
            >
              {saveMutation.isPending ? 'Incantation...' : 'Sceller l\'Archive'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}