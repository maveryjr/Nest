import { EmbeddingChunk, SavedLink, QueryResult } from '../types';
import { openDB, IDBPDatabase } from 'idb';

/**
 * EmbeddingsService - Handles text embeddings for semantic search
 * Uses OpenAI's text-embedding-ada-002 model and stores vectors in IndexedDB
 */
export class EmbeddingsService {
  private db: IDBPDatabase | null = null;
  private apiKey: string = '';
  private readonly CHUNK_SIZE = 1000; // Characters per chunk
  private readonly CHUNK_OVERLAP = 200; // Overlap between chunks
  private readonly EMBEDDING_DIMENSION = 1536; // OpenAI ada-002 dimension

  constructor() {
    this.initializeDB();
    this.loadApiKey();
  }

  /**
   * Initialize IndexedDB for storing embeddings
   */
  private async initializeDB(): Promise<void> {
    try {
      this.db = await openDB('nest-embeddings', 1, {
        upgrade(db) {
          // Store for embedding chunks
          if (!db.objectStoreNames.contains('chunks')) {
            const chunkStore = db.createObjectStore('chunks', { keyPath: 'id' });
            chunkStore.createIndex('linkId', 'linkId', { unique: false });
            chunkStore.createIndex('createdAt', 'createdAt', { unique: false });
          }

          // Store for embedding metadata
          if (!db.objectStoreNames.contains('metadata')) {
            const metaStore = db.createObjectStore('metadata', { keyPath: 'linkId' });
            metaStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
          }
        },
      });
      console.log('EmbeddingsService: IndexedDB initialized');
    } catch (error) {
      console.error('EmbeddingsService: Failed to initialize IndexedDB:', error);
    }
  }

  /**
   * Load API key from storage
   */
  private async loadApiKey(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('nest_settings');
      this.apiKey = result.nest_settings?.openaiApiKey || '';
    } catch (error) {
      console.error('EmbeddingsService: Failed to load API key:', error);
    }
  }

  /**
   * Update API key
   */
  updateApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Generate embeddings for a saved link
   */
  async generateEmbeddings(link: SavedLink): Promise<void> {
    if (!this.apiKey) {
      console.warn('EmbeddingsService: No API key available for embeddings generation');
      return;
    }

    try {
      console.log(`EmbeddingsService: Generating embeddings for link ${link.id}`);
      
      // Combine all text content
      const fullText = this.combineTextContent(link);
      
      if (!fullText.trim()) {
        console.log(`EmbeddingsService: No text content found for link ${link.id}`);
        return;
      }

      // Split into chunks
      const chunks = this.splitIntoChunks(fullText, link.id);
      
      // Generate embeddings for each chunk
      const embeddingChunks: EmbeddingChunk[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        try {
          const embedding = await this.generateEmbedding(chunks[i].text);
          
          if (embedding.length === this.EMBEDDING_DIMENSION) {
            embeddingChunks.push({
              ...chunks[i],
              embedding,
              createdAt: new Date(),
            });
            
            // Add small delay to respect rate limits
            await this.delay(100);
          }
        } catch (error) {
          console.error(`EmbeddingsService: Failed to generate embedding for chunk ${i}:`, error);
        }
      }

      // Store embeddings in IndexedDB
      await this.storeEmbeddings(link.id, embeddingChunks);
      
      console.log(`EmbeddingsService: Generated ${embeddingChunks.length} embeddings for link ${link.id}`);
    } catch (error) {
      console.error(`EmbeddingsService: Failed to generate embeddings for link ${link.id}:`, error);
    }
  }

  /**
   * Search for similar content using embeddings
   */
  async searchSimilar(query: string, limit: number = 10, linkIds?: string[]): Promise<EmbeddingChunk[]> {
    if (!this.apiKey || !this.db) {
      console.warn('EmbeddingsService: No API key or database available for search');
      return [];
    }

    try {
      console.log(`EmbeddingsService: Searching for: "${query}"`);
      
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);
      
      if (queryEmbedding.length !== this.EMBEDDING_DIMENSION) {
        throw new Error('Invalid query embedding dimension');
      }

      // Get all chunks from database
      const tx = this.db.transaction(['chunks'], 'readonly');
      const store = tx.objectStore('chunks');
      
      let allChunks: EmbeddingChunk[];
      
      if (linkIds && linkIds.length > 0) {
        // Filter by specific link IDs
        allChunks = [];
        for (const linkId of linkIds) {
          const chunks = await store.index('linkId').getAll(linkId);
          allChunks.push(...chunks);
        }
      } else {
        // Get all chunks
        allChunks = await store.getAll();
      }

      // Calculate similarities
      const similarities = allChunks.map(chunk => ({
        chunk,
        similarity: this.calculateSimilarity(queryEmbedding, chunk.embedding),
      }));

      // Sort by similarity and return top results
      const results = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .filter(result => result.similarity > 0.7) // Threshold for relevance
        .map(result => result.chunk);

      console.log(`EmbeddingsService: Found ${results.length} similar chunks`);
      return results;
    } catch (error) {
      console.error('EmbeddingsService: Search failed:', error);
      return [];
    }
  }

  /**
   * Process natural language query and return results with context
   */
  async processQuery(query: string, scope?: string[]): Promise<QueryResult> {
    const startTime = Date.now();
    
    try {
      // Search for similar chunks
      const similarChunks = await this.searchSimilar(query, 5, scope);
      
      if (similarChunks.length === 0) {
        return {
          answer: "I couldn't find any relevant content in your saved items for this query.",
          sources: [],
          confidence: 0,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Generate contextual response using similar chunks
      const answer = await this.generateContextualResponse(query, similarChunks);
      
      // Create sources array
      const sources = await this.createSources(similarChunks);
      
      // Calculate confidence based on similarity scores and number of sources
      const queryEmbedding = await this.generateEmbedding(query);
      const avgSimilarity = similarChunks.reduce((sum, chunk) => {
        return sum + this.calculateSimilarity(queryEmbedding, chunk.embedding);
      }, 0) / similarChunks.length;
      
      const confidence = Math.min(0.95, avgSimilarity * (similarChunks.length / 5));

      return {
        answer,
        sources,
        confidence,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error('EmbeddingsService: Query processing failed:', error);
      return {
        answer: "Sorry, I encountered an error while processing your query. Please try again.",
        sources: [],
        confidence: 0,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Remove embeddings for a specific link
   */
  async removeEmbeddings(linkId: string): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction(['chunks', 'metadata'], 'readwrite');
      
      // Remove chunks
      const chunkStore = tx.objectStore('chunks');
      const chunks = await chunkStore.index('linkId').getAllKeys(linkId);
      for (const key of chunks) {
        await chunkStore.delete(key);
      }

      // Remove metadata
      const metaStore = tx.objectStore('metadata');
      await metaStore.delete(linkId);

      await tx.done;
      console.log(`EmbeddingsService: Removed embeddings for link ${linkId}`);
    } catch (error) {
      console.error(`EmbeddingsService: Failed to remove embeddings for link ${linkId}:`, error);
    }
  }

  /**
   * Get embedding statistics
   */
  async getStats(): Promise<{ totalChunks: number; totalLinks: number; lastUpdated?: Date }> {
    if (!this.db) {
      return { totalChunks: 0, totalLinks: 0 };
    }

    try {
      const tx = this.db.transaction(['chunks', 'metadata'], 'readonly');
      
      const totalChunks = await tx.objectStore('chunks').count();
      const totalLinks = await tx.objectStore('metadata').count();
      
      // Get most recent update
      const allMeta = await tx.objectStore('metadata').getAll();
      const lastUpdated = allMeta.length > 0 
        ? new Date(Math.max(...allMeta.map(m => m.lastUpdated.getTime())))
        : undefined;

      return { totalChunks, totalLinks, lastUpdated };
    } catch (error) {
      console.error('EmbeddingsService: Failed to get stats:', error);
      return { totalChunks: 0, totalLinks: 0 };
    }
  }

  // Private helper methods

  private combineTextContent(link: SavedLink): string {
    let text = `${link.title}\n\n`;
    
    if (link.userNote) text += `${link.userNote}\n\n`;
    if (link.aiSummary) text += `${link.aiSummary}\n\n`;
    if (link.extractedText) text += `${link.extractedText}\n\n`;
    
    // Add highlights
    if (link.highlights) {
      const highlightText = link.highlights
        .map(h => `${h.selectedText} ${h.userNote || ''}`)
        .join('\n');
      text += `${highlightText}\n\n`;
    }

    // Add media attachment text
    if (link.mediaAttachments) {
      const attachmentText = link.mediaAttachments
        .map(a => a.extractedText || '')
        .filter(t => t.trim())
        .join('\n');
      text += attachmentText;
    }

    return text.trim();
  }

  private splitIntoChunks(text: string, linkId: string): Omit<EmbeddingChunk, 'embedding' | 'createdAt'>[] {
    const chunks: Omit<EmbeddingChunk, 'embedding' | 'createdAt'>[] = [];
    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + this.CHUNK_SIZE, text.length);
      const chunkText = text.slice(startIndex, endIndex);

      chunks.push({
        id: `${linkId}_chunk_${chunkIndex}`,
        linkId,
        chunkIndex,
        text: chunkText,
        startIndex,
        endIndex,
      });

      startIndex = endIndex - this.CHUNK_OVERLAP;
      chunkIndex++;
    }

    return chunks;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text.slice(0, 8000), // OpenAI limit
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  private async storeEmbeddings(linkId: string, chunks: EmbeddingChunk[]): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction(['chunks', 'metadata'], 'readwrite');
      
      // Store chunks
      const chunkStore = tx.objectStore('chunks');
      for (const chunk of chunks) {
        await chunkStore.put(chunk);
      }

      // Store metadata
      const metaStore = tx.objectStore('metadata');
      await metaStore.put({
        linkId,
        chunkCount: chunks.length,
        lastUpdated: new Date(),
      });

      await tx.done;
    } catch (error) {
      console.error('EmbeddingsService: Failed to store embeddings:', error);
    }
  }

  private calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    try {
      // Calculate cosine similarity manually
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      
      for (let i = 0; i < embedding1.length; i++) {
        dotProduct += embedding1[i] * embedding2[i];
        normA += embedding1[i] ** 2;
        normB += embedding2[i] ** 2;
      }
      
      const cosineSimilarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
      return cosineSimilarity;
    } catch (error) {
      console.error('EmbeddingsService: Similarity calculation failed:', error);
      return 0;
    }
  }

  private async generateContextualResponse(query: string, chunks: EmbeddingChunk[]): Promise<string> {
    if (!this.apiKey) {
      return "I found relevant content but need an OpenAI API key to generate a detailed response.";
    }

    try {
      const context = chunks.map(chunk => chunk.text).join('\n\n');
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that answers questions based on the user\'s saved content. Provide accurate, helpful responses using only the provided context. If the context doesn\'t contain enough information, say so clearly.'
            },
            {
              role: 'user',
              content: `Based on this content from my saved items:\n\n${context}\n\nQuestion: ${query}`
            }
          ],
          max_tokens: 500,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('EmbeddingsService: Response generation failed:', error);
      return "I found relevant content but couldn't generate a detailed response. Please check your OpenAI API key.";
    }
  }

  private async createSources(chunks: EmbeddingChunk[]): Promise<QueryResult['sources']> {
    // Group chunks by linkId to avoid duplicate sources
    const linkChunks = new Map<string, EmbeddingChunk[]>();
    
    for (const chunk of chunks) {
      if (!linkChunks.has(chunk.linkId)) {
        linkChunks.set(chunk.linkId, []);
      }
      linkChunks.get(chunk.linkId)!.push(chunk);
    }

    const sources: QueryResult['sources'] = [];
    
    // Get link data for each unique linkId
    for (const [linkId, linkChunks] of linkChunks.entries()) {
      try {
        // This would require access to storage - simplified for now
        const snippet = linkChunks[0].text.slice(0, 200) + '...';
        
        sources.push({
          linkId,
          title: `Saved Item ${linkId}`, // Would be replaced with actual title
          snippet,
          relevanceScore: 0.8, // Would be calculated properly
          url: '', // Would be fetched from storage
        });
      } catch (error) {
        console.error('EmbeddingsService: Failed to create source:', error);
      }
    }

    return sources;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const embeddingsService = new EmbeddingsService(); 