export interface SavedLink {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  userNote: string;
  aiSummary?: string;
  category: string;
  collectionId?: string;
  createdAt: Date;
  updatedAt: Date;
  domain: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
  isDefault?: boolean;
}

export interface StorageData {
  links: SavedLink[];
  collections: Collection[];
  categories: Category[];
  settings: {
    openaiApiKey?: string;
    defaultCategory: string;
    autoSummarize: boolean;
  };
} 