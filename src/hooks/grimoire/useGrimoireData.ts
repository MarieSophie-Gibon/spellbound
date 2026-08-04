import { useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Category, WikiPage } from "@/types/grimoire";

interface PopupPageListEntry {
  id: string;
  title: string;
  category_id: string | null;
}

interface FetchWikiPagesParams {
  isGlobal: boolean;
  campaignId?: string;
}

interface CreateCategoryParams {
  name: string;
  parentId: string | null;
  positionIndex: number;
  campaignId: string | null;
}

export function useGrimoireData() {
  const getCurrentUserId = useCallback(async (): Promise<string | null> => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user?.id ?? null;
  }, []);

  const fetchCategories = useCallback(async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("position_index", { ascending: true })
      .order("name");
    if (error) throw error;
    return (data ?? []) as Category[];
  }, []);

  const fetchWikiPages = useCallback(async ({ isGlobal, campaignId }: FetchWikiPagesParams): Promise<WikiPage[]> => {
    let query = supabase.from("wiki_pages").select("*").order("position_index", { ascending: true });
    if (isGlobal) query = query.is("campaign_id", null);
    else if (campaignId) query = query.or(`campaign_id.eq.${campaignId},campaign_id.is.null`);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as WikiPage[];
  }, []);

  const fetchPopupIndex = useCallback(async (): Promise<{ pages: PopupPageListEntry[]; categories: Category[] }> => {
    const [{ data: pagesData, error: pagesError }, { data: categoriesData, error: categoriesError }] = await Promise.all([
      supabase.from("wiki_pages").select("id, title, category_id").order("title"),
      supabase.from("categories").select("*"),
    ]);

    if (pagesError) throw pagesError;
    if (categoriesError) throw categoriesError;

    return {
      pages: (pagesData ?? []) as PopupPageListEntry[],
      categories: (categoriesData ?? []) as Category[],
    };
  }, []);

  const fetchWikiPageById = useCallback(async (id: string): Promise<WikiPage | null> => {
    const { data, error } = await supabase.from("wiki_pages").select("*").eq("id", id).single();
    if (error) throw error;
    return (data as WikiPage) ?? null;
  }, []);

  const uploadWikiImage = useCallback(async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `grimoire/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("wiki-images").upload(path, file);
    if (error) throw error;

    const { data } = supabase.storage.from("wiki-images").getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const renameCategory = useCallback(async (id: string, name: string): Promise<void> => {
    const { error } = await supabase.from("categories").update({ name }).eq("id", id);
    if (error) throw error;
  }, []);

  const deleteCategory = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;
  }, []);

  const createCategory = useCallback(async ({ name, parentId, positionIndex, campaignId }: CreateCategoryParams): Promise<Category> => {
    const { data, error } = await supabase
      .from("categories")
      .insert({
        name,
        parent_id: parentId,
        position_index: positionIndex,
        campaign_id: campaignId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  }, []);

  const updateWikiPage = useCallback(async (id: string, payload: Record<string, unknown>): Promise<void> => {
    const { error } = await supabase.from("wiki_pages").update(payload).eq("id", id);
    if (error) throw error;
  }, []);

  const insertWikiPage = useCallback(async (payload: Record<string, unknown>): Promise<void> => {
    const { error } = await supabase.from("wiki_pages").insert(payload);
    if (error) throw error;
  }, []);

  const deleteWikiPage = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase.from("wiki_pages").delete().eq("id", id);
    if (error) throw error;
  }, []);

  const updateCategoryPosition = useCallback(async (id: string, positionIndex: number): Promise<void> => {
    const { error } = await supabase.from("categories").update({ position_index: positionIndex }).eq("id", id);
    if (error) throw error;
  }, []);

  const updateWikiPagePlacement = useCallback(
    async (id: string, categoryId: string | null, subCategoryId: string | null, positionIndex: number | undefined): Promise<void> => {
      const { error } = await supabase
        .from("wiki_pages")
        .update({
          category_id: categoryId,
          subcategory_id: subCategoryId,
          position_index: positionIndex,
        })
        .eq("id", id);
      if (error) throw error;
    },
    []
  );

  const updateWikiPagePosition = useCallback(async (id: string, positionIndex: number): Promise<void> => {
    const { error } = await supabase.from("wiki_pages").update({ position_index: positionIndex }).eq("id", id);
    if (error) throw error;
  }, []);

  return useMemo(
    () => ({
      getCurrentUserId,
      fetchCategories,
      fetchWikiPages,
      fetchPopupIndex,
      fetchWikiPageById,
      uploadWikiImage,
      renameCategory,
      deleteCategory,
      createCategory,
      updateWikiPage,
      insertWikiPage,
      deleteWikiPage,
      updateCategoryPosition,
      updateWikiPagePlacement,
      updateWikiPagePosition,
    }),
    [
      getCurrentUserId,
      fetchCategories,
      fetchWikiPages,
      fetchPopupIndex,
      fetchWikiPageById,
      uploadWikiImage,
      renameCategory,
      deleteCategory,
      createCategory,
      updateWikiPage,
      insertWikiPage,
      deleteWikiPage,
      updateCategoryPosition,
      updateWikiPagePlacement,
      updateWikiPagePosition,
    ]
  );
}
