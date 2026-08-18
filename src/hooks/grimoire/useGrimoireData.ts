import { useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Category, WikiPage } from "@/types/grimoire";
import type { RpgSystem } from "@/lib/types/rpgSystem";

interface PopupPageListEntry {
  id: string;
  title: string;
  category_id: string | null;
}

interface FetchWikiPagesParams {
  isGlobal: boolean;
  campaignId?: string;
  system: RpgSystem;
}

interface FetchCategoriesParams {
  system: RpgSystem;
  campaignId?: string;
}

interface CreateCategoryParams {
  name: string;
  parentId: string | null;
  positionIndex: number;
  campaignId: string | null;
  system: RpgSystem;
}

interface FetchPopupIndexParams {
  system?: RpgSystem;
  campaignId?: string;
}

export function useGrimoireData() {
  const matchesSystem = useCallback((value: unknown, system: RpgSystem): boolean => {
    if (value === null || value === undefined || value === "") return true
    return String(value).toUpperCase() === system
  }, [])

  const getCurrentUserId = useCallback(async (): Promise<string | null> => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user?.id ?? null;
  }, []);

  const fetchCategories = useCallback(async ({ system, campaignId }: FetchCategoriesParams): Promise<Category[]> => {
    let query = supabase
      .from("categories")
      .select("*")
      .order("position_index", { ascending: true })
      .order("name");
    if (campaignId) {
      query = query.or(`campaign_id.eq.${campaignId},campaign_id.is.null`);
    } else {
      query = query.is("campaign_id", null);
    }
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as Category[];

    return rows.filter((c) => matchesSystem(c.system, system));
  }, [matchesSystem]);

  const fetchWikiPages = useCallback(async ({ isGlobal, campaignId, system }: FetchWikiPagesParams): Promise<WikiPage[]> => {
    let query = supabase.from("wiki_pages").select("*").order("position_index", { ascending: true });
    if (isGlobal) {
      query = query.is("campaign_id", null);
    } else if (campaignId) {
      query = query.or(`campaign_id.eq.${campaignId},campaign_id.is.null`);
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as WikiPage[];

    return rows.filter((p) => matchesSystem(p.system, system));
  }, [matchesSystem]);

  const fetchPopupIndex = useCallback(async ({ system, campaignId }: FetchPopupIndexParams = {}): Promise<{ pages: PopupPageListEntry[]; categories: Category[] }> => {
    let pagesQuery = supabase
      .from("wiki_pages")
      .select("id, title, category_id, campaign_id, system")
      .order("title");
    let categoriesQuery = supabase.from("categories").select("*");

    if (campaignId) {
      pagesQuery = pagesQuery.or(`campaign_id.eq.${campaignId},campaign_id.is.null`);
      categoriesQuery = categoriesQuery.or(`campaign_id.eq.${campaignId},campaign_id.is.null`);
    } else {
      pagesQuery = pagesQuery.is("campaign_id", null);
      categoriesQuery = categoriesQuery.is("campaign_id", null);
    }

    const [{ data: pagesData, error: pagesError }, { data: categoriesData, error: categoriesError }] = await Promise.all([
      pagesQuery,
      categoriesQuery,
    ]);

    if (pagesError) throw pagesError;
    if (categoriesError) throw categoriesError;

    const filteredPages = (pagesData ?? [])
      .filter((page) => !system || matchesSystem(page.system, system))
      .map((page) => ({
        id: page.id,
        title: page.title,
        category_id: page.category_id,
      })) as PopupPageListEntry[];

    const filteredCategories = ((categoriesData ?? []) as Category[])
      .filter((category) => !system || matchesSystem(category.system, system));

    return {
      pages: filteredPages,
      categories: filteredCategories,
    };
  }, [matchesSystem]);

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

  const createCategory = useCallback(async ({ name, parentId, positionIndex, campaignId, system }: CreateCategoryParams): Promise<Category> => {
    const { data, error } = await supabase
      .from("categories")
      .insert({
        name,
        parent_id: parentId,
        position_index: positionIndex,
        campaign_id: campaignId,
        system,
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
