export interface SavedLink {
  id: string;
  url: string;
  title: string;
  description?: string;
  savedAt: number;
  tags: string[];
  category: string;
  isPrivate: boolean;
  highlights?: Highlight[];
  notes?: Note[];
  crossReferences?: CrossReference[];
  aiInsights?: AIInsight[];
  readingTime?: number;
  lastAccessed?: number;
  accessCount?: number;
}

export interface Highlight {
  id: string;
  text: string;
  context: string;
  position: {
    start: number;
    end: number;
    path: string;
  };
  url: string;
  createdAt: number;
  notes?: Note[];
  crossReferences?: CrossReference[];
  aiInsights?: AIInsight[];
}

export interface Note {
  id: string;
  content: string;
  type: 'text' | 'voice' | 'image';
  createdAt: number;
  updatedAt: number;
  isPrivate: boolean;
  tags?: string[];
}

export interface CrossReference {
  id: string;
  targetType: 'link' | 'highlight' | 'collection';
  targetId: string;
  relationshipType: 'related' | 'contradicts' | 'supports' | 'cites' | 'builds-on';
  strength: number; // 0-1, confidence in the relationship
  createdAt: number;
  note?: string;
}

export interface AIInsight {
  id: string;
  type: 'question' | 'summary' | 'flashcard' | 'connection' | 'recommendation';
  content: string;
  metadata?: {
    difficulty?: 'easy' | 'medium' | 'hard';
    topic?: string;
    confidence?: number;
    relatedConcepts?: string[];
  };
  createdAt: number;
  isReviewed?: boolean;
  userRating?: number; // 1-5 stars
}

export interface ReadingAnalytics {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  linksRead: number;
  highlightsMade: number;
  timeSpent: number; // minutes
  topicsExplored: string[];
  mostActiveHours: number[];
  readingStreak: number;
  knowledgeGrowthScore: number;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  lastUpdated: number;
}

export interface KnowledgeNode {
  id: string;
  type: 'link' | 'highlight' | 'topic' | 'concept';
  label: string;
  weight: number; // importance/frequency
  metadata?: any;
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  relationship: string;
  weight: number;
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
  smartCollections: SmartCollection[];
  categories: Category[];
  readingAnalytics?: ReadingAnalytics[];
  knowledgeGraph?: KnowledgeGraph;
  settings: {
    openaiApiKey?: string;
    defaultCategory: string;
    autoSummarize: boolean;
    autoTagging?: boolean;
    autoCategorization?: boolean;
    enableSmartCollections?: boolean;
    enableActivityTracking?: boolean;
    highlightColor?: string;
    highlightStyle?: 'solid' | 'gradient' | 'underline' | 'outline';
    enableAIInsights?: boolean;
    enableCrossReferences?: boolean;
    enableAnalytics?: boolean;
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

// Activity tracking types for future features
export interface ActivityEvent {
  id: string;
  type: 'save' | 'read' | 'highlight' | 'organize' | 'search';
  linkId?: string;
  collectionId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface UserStreak {
  id: string;
  type: 'daily_save' | 'weekly_organize' | 'reading_streak';
  currentCount: number;
  bestCount: number;
  lastActivityAt: Date;
  createdAt: Date;
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

export interface DigestPreferences {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  timezone: string;
  includeStats: boolean;
  includeRecentSaves: boolean;
  includePopularLinks: boolean;
  includeSmartCollections: boolean;
  includeActivitySummary: boolean;
  maxLinksPerSection: number;
}

export interface DigestContent {
  id: string;
  userId: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  stats: {
    linksSaved: number;
    linksRead: number;
    collectionsCreated: number;
    tagsUsed: number;
    currentStreak: number;
  };
  sections: DigestSection[];
  aiInsights?: string;
  sent: boolean;
  sentAt?: Date;
}

export interface DigestSection {
  type: 'recent_saves' | 'popular_links' | 'smart_collections' | 'activity_summary' | 'recommendations';
  title: string;
  content: any[];
  aiSummary?: string;
} 