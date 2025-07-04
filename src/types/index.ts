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
  searchRank?: number;
  searchHeadline?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic?: boolean;
  shareToken?: string;
  viewCount?: number;
  lastViewedAt?: Date;
}

export interface PublicCollection {
  id: string;
  name: string;
  description?: string;
  viewCount: number;
  createdAt: Date;
  ownerEmail: string;
}

export interface PublicLink {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  domain: string;
  userNote?: string;
  aiSummary?: string;
  category: string;
  createdAt: Date;
  tags: string[];
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