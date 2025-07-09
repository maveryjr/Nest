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
  readingTime?: number;
  tags?: string[];
  searchRank?: number;
  searchHeadline?: string;
  voiceMemos?: VoiceMemo[];
  richNotes?: RichNote[];
  readingProgress?: number; // 0-100
  lastReadAt?: Date;
  readingGoals?: string[]; // Goal IDs
  collaborativeFeatures?: CollaborativeFeatures;
  knowledgeGraphId?: string;
  // Batch 1 - Multimodal enhancements
  contentType?: 'webpage' | 'pdf' | 'image' | 'audio' | 'video' | 'email' | 'social';
  mediaAttachments?: MediaAttachment[];
  extractedText?: string;  // OCR or transcription text
  videoTimestamp?: number; // For YouTube/video links (seconds)
  author?: string;
  publishDate?: Date;
  sourceMetadata?: Record<string, any>; // Platform-specific metadata
}

export interface Highlight {
  id: string;
  selectedText: string;
  context: string;
  position: any;
  createdAt: Date;
  updatedAt: Date;
  userNote?: string;
  voiceMemo?: VoiceMemo;
  richNote?: RichNote;
  tags?: string[];
}

export interface VoiceMemo {
  id: string;
  audioBlob?: Blob;
  audioDataURL?: string;
  duration: number; // in seconds
  transcription?: string;
  createdAt: Date;
}

export interface RichNote {
  id: string;
  content: string; // HTML content
  plainText: string; // Plain text version
  formatting: RichNoteFormatting;
  lastEdited: Date;
}

export interface RichNoteFormatting {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  color?: string;
  icon?: string;
  isPublic?: boolean;
  tags?: string[];
  collaborativeFeatures?: CollaborativeFeatures;
  knowledgeGraphId?: string;
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

export interface Category {
  id: string;
  name: string;
  color?: string;
  isDefault?: boolean;
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

export interface MediaAttachment {
  id: string;
  type: 'image' | 'audio' | 'pdf' | 'video';
  filename: string;
  mimeType: string;
  size: number; // bytes
  dataURL?: string; // base64 data for small files
  storageKey?: string; // key for larger files in cloud storage
  extractedText?: string; // OCR or transcription
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface EmbeddingChunk {
  id: string;
  linkId: string;
  chunkIndex: number;
  text: string;
  embedding: number[]; // 1536-dimensional vector for OpenAI ada-002
  startIndex: number;
  endIndex: number;
  createdAt: Date;
}

export interface QueryResult {
  answer: string;
  sources: Array<{
    linkId: string;
    title: string;
    snippet: string;
    relevanceScore: number;
    url: string;
  }>;
  confidence: number;
  queryEmbedding?: number[];
  processingTimeMs: number;
}

export interface ActivityPattern {
  userId: string;
  preferredReadingTimes: number[]; // Hours of day (0-23)
  averageSessionLength: number;    // Minutes
  contentPreferences: Record<string, number>; // Domain/topic scores (0-1)
  stalenessThresholds: Record<string, number>; // Days by content type
  lastUpdated: Date;
}

export interface Suggestion {
  id: string;
  type: 'read_next' | 'archive' | 'organize' | 'review_highlights' | 'create_collection' | 'summarize_clear';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  actionData: any;
  reasoning: string;
  dismissible: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface LinkHealth {
  linkId: string;
  url: string;
  status: 'healthy' | 'redirected' | 'dead' | 'unreachable' | 'checking';
  statusCode?: number;
  lastChecked: Date;
  redirectUrl?: string;
  alternativeUrls: string[];
  errorCount: number;
  rescueAttempts: number;
}

export interface DuplicateCandidate {
  originalId: string;
  duplicateId: string;
  similarity: number; // 0-1 score
  similarityReasons: string[];
  mergeRecommendation: 'auto' | 'manual' | 'skip';
  confidence: number;
  createdAt: Date;
}

export interface CollaborativeFeatures {
  teamId?: string;
  permissions: UserPermission[];
  sharedWith: string[]; // User IDs
  isPublic: boolean;
  collaborationHistory: CollaborationEvent[];
}

export interface UserPermission {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  permissions: string[];
  grantedAt: Date;
}

export interface CollaborationEvent {
  id: string;
  userId: string;
  action: 'created' | 'edited' | 'deleted' | 'shared' | 'commented';
  targetType: 'link' | 'highlight' | 'collection' | 'note';
  targetId: string;
  changes?: Record<string, any>;
  timestamp: Date;
}

export interface FocusMode {
  enabled: boolean;
  type: 'reading' | 'research' | 'distraction-free';
  startTime: Date;
  plannedDuration: number; // minutes
  blockedSites: string[];
  allowedSites: string[];
  goals: string[];
  customSettings: Record<string, any>;
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

// Settings and configuration types
export interface NestSettings {
  openaiApiKey?: string;
  defaultCategory: string;
  autoSummarize: boolean;
  autoTagging?: boolean;
  autoCategorization?: boolean;
  enableBackgroundProcessing?: boolean;
  enableNotifications?: boolean;
  enableActivityTracking?: boolean;
  highlightColor?: string;
  highlightStyle?: 'solid' | 'gradient' | 'underline' | 'outline';
  enableAIInsights?: boolean;
  enableCrossReferences?: boolean;
  enableAnalytics?: boolean;
}

export interface StorageData {
  links: SavedLink[];
  collections: Collection[];
  smartCollections: SmartCollection[];
  categories: Category[];
  readingAnalytics?: ReadingAnalytics[];
  knowledgeGraph?: KnowledgeGraph;
  settings: NestSettings;
} 