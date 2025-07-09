// Export all types
export * from './types';

// Export API client
export * from './api';

// Export utilities
export * from './utils';

// Re-export commonly used types for convenience
export type {
  SavedLink,
  Collection,
  Highlight,
  Category,
  SmartCollection,
  ReadingAnalytics,
  NestSettings,
  StorageData,
  QueryResult,
  ActivityPattern,
  Suggestion,
  LinkHealth,
  DuplicateCandidate,
  AIInsight,
  KnowledgeGraph,
  MediaAttachment,
  EmbeddingChunk,
  FocusMode,
  PublicCollection,
  PublicLink,
  CollaborativeFeatures,
  UserPermission,
  CollaborationEvent,
  VoiceMemo,
  RichNote,
  RichNoteFormatting,
  KnowledgeNode,
  KnowledgeEdge,
} from './types';

export type {
  NestApiClient,
  NestApiConfig,
} from './api'; 