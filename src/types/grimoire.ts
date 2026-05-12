export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  position_index: number;
  campaign_id: string | null;
}

export interface WikiPage {
  id: string;
  title: string;
  content: string;
  category_id: string | null;
  subcategory_id: string | null;
  position_index: number;
}

export type DraggedItem = { type: "page" | "category"; id: string } | null;
