export interface SavedLink {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  userNote: string;
  aiSummary?: string;
  category: string;
  collectionId?: string;
  isInInbox?: boolean;
  highlights?: Highlight[];
  createdAt: Date;
  updatedAt: Date;
  domain: string;
  searchRank?: number;
  searchHeadline?: string;
}

export interface Highlight {
  id: string;
  selectedText: string;
  userNote?: string;
  context?: string; // surrounding text for context
  position?: {
    startOffset: number;
    endOffset: number;
    xpath?: string;
  };
  createdAt: Date;
  updatedAt: Date;
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
    autoTagging?: boolean;
    autoCategorization?: boolean;
  };
}

// New AI-related types for auto-tagging and categorization
export interface AITagSuggestion {
  tag: string;
  confidence: number; // 0-1 score
  reason?: string; // Why this tag was suggested
}

export interface AICategorySuggestion {
  category: string;
  confidence: number;
  reason?: string;
}

export interface AIAnalysisResult {
  summary?: string;
  tagSuggestions: AITagSuggestion[];
  categorySuggestions: AICategorySuggestion[];
  contentType?: 'article' | 'tutorial' | 'documentation' | 'video' | 'tool' | 'reference' | 'blog' | 'news' | 'research' | 'other';
  topics?: string[]; // Main topics/themes identified
  complexity?: 'beginner' | 'intermediate' | 'advanced';
  readingTime?: number; // Estimated reading time in minutes
}

export interface SmartCollection {
  id: string;
  name: string;
  description: string;
  query: string; // AI-generated query for finding relevant links
  isSystem: boolean; // Whether this is a system-generated collection
  autoUpdate: boolean; // Whether to automatically add new matching links
  icon?: string;
  color?: string;
  filters?: {
    categories?: string[];
    tags?: string[];
    domains?: string[];
    dateRange?: {
      start?: Date;
      end?: Date;
    };
    contentType?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
} 