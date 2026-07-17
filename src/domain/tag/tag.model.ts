export interface Tag {
  id: string;
  name: string;
  slug: string;
  articleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagInput {
  name: string;
  slug: string;
}