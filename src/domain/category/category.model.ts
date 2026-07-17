export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  order?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  isActive?: boolean;
  order?: number;
}