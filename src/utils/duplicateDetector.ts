// Duplicate detection and merging utility for smart content management
import { SavedLink } from '../types';
import { storage } from './storage';

export interface DuplicateCandidate {
  originalId: string;
  duplicateId: string;
  similarity: number; // 0-1 scale
  similarityReasons: string[];
  mergeRecommendation: 'auto' | 'manual' | 'skip';
  confidence: number; // How confident we are in the duplicate detection
}

export interface MergeAction {
  type: 'merge' | 'keep_both' | 'delete_duplicate';
  primaryLinkId: string;
  duplicateLinkId: string;
  mergeStrategy: {
    title: 'primary' | 'duplicate' | 'combined';
    notes: 'primary' | 'duplicate' | 'combined';
    tags: 'union' | 'primary' | 'duplicate';
    highlights: 'union' | 'primary' | 'duplicate';
    collections: 'primary' | 'duplicate' | 'keep_separate';
  };
  reasoning: string;
}

export interface MergeResult {
  success: boolean;
  mergedLinkId?: string;
  deletedLinkId?: string;
  conflicts?: string[];
  summary: string;
  error?: string;
}

export class DuplicateDetector {
  private static instance: DuplicateDetector;
  
  public static getInstance(): DuplicateDetector {
    if (!DuplicateDetector.instance) {
      DuplicateDetector.instance = new DuplicateDetector();
    }
    return DuplicateDetector.instance;
  }

  /**
   * Find potential duplicates across all saved links
   */
  async findDuplicates(): Promise<DuplicateCandidate[]> {
    try {
      const data = await storage.getData();
      const links = data.links;
      
      if (links.length < 2) return [];

      const candidates: DuplicateCandidate[] = [];
      const processed = new Set<string>();

      // Compare each link with every other link
      for (let i = 0; i < links.length; i++) {
        for (let j = i + 1; j < links.length; j++) {
          const link1 = links[i];
          const link2 = links[j];
          
          const pairKey = `${link1.id}_${link2.id}`;
          if (processed.has(pairKey)) continue;
          processed.add(pairKey);

          const similarity = await this.calculateSimilarity(link1, link2);
          
          if (similarity.score > 0.3) { // Only consider items with >30% similarity
            const candidate: DuplicateCandidate = {
              originalId: link1.id,
              duplicateId: link2.id,
              similarity: similarity.score,
              similarityReasons: similarity.reasons,
              mergeRecommendation: this.determineMergeRecommendation(similarity.score, similarity.reasons),
              confidence: similarity.confidence
            };
            
            candidates.push(candidate);
          }
        }
      }

      // Sort by similarity score (highest first)
      return candidates.sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      console.error('Failed to find duplicates:', error);
      return [];
    }
  }

  /**
   * Calculate similarity between two links
   */
  async calculateSimilarity(link1: SavedLink, link2: SavedLink): Promise<{
    score: number;
    reasons: string[];
    confidence: number;
  }> {
    const reasons: string[] = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    // URL similarity (highest weight)
    const urlSimilarity = this.compareUrls(link1.url, link2.url);
    totalScore += urlSimilarity * 0.4;
    maxPossibleScore += 0.4;
    if (urlSimilarity > 0.1) {
      reasons.push(`URLs are ${Math.round(urlSimilarity * 100)}% similar`);
    }

    // Title similarity (high weight)
    const titleSimilarity = this.compareTexts(link1.title, link2.title);
    totalScore += titleSimilarity * 0.3;
    maxPossibleScore += 0.3;
    if (titleSimilarity > 0.3) {
      reasons.push(`Titles are ${Math.round(titleSimilarity * 100)}% similar`);
    }

    // Domain match (medium weight)
    const domainMatch = link1.domain === link2.domain ? 1 : 0;
    totalScore += domainMatch * 0.15;
    maxPossibleScore += 0.15;
    if (domainMatch) {
      reasons.push('Same domain');
    }

    // Content similarity via summaries (medium weight)
    const contentSimilarity = this.compareTexts(
      link1.aiSummary || '', 
      link2.aiSummary || ''
    );
    totalScore += contentSimilarity * 0.1;
    maxPossibleScore += 0.1;
    if (contentSimilarity > 0.5) {
      reasons.push(`Content summaries are ${Math.round(contentSimilarity * 100)}% similar`);
    }

    // Tag overlap (low weight)
    const tagSimilarity = await this.compareTagSimilarity(link1.id, link2.id);
    totalScore += tagSimilarity * 0.05;
    maxPossibleScore += 0.05;
    if (tagSimilarity > 0.3) {
      reasons.push(`Share ${Math.round(tagSimilarity * 100)}% of tags`);
    }

    // Normalize score
    const normalizedScore = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
    
    // Calculate confidence based on available data
    let confidence = 0.5; // Base confidence
    if (link1.aiSummary && link2.aiSummary) confidence += 0.2;
    if (reasons.length > 2) confidence += 0.2;
    if (urlSimilarity > 0.8) confidence += 0.1;

    return {
      score: Math.min(normalizedScore, 1),
      reasons,
      confidence: Math.min(confidence, 1)
    };
  }

  /**
   * Suggest merge strategy for duplicate candidates
   */
  async suggestMergeStrategy(candidates: DuplicateCandidate[]): Promise<MergeAction[]> {
    const actions: MergeAction[] = [];

    for (const candidate of candidates) {
      try {
        const [link1, link2] = await Promise.all([
          this.getLinkById(candidate.originalId),
          this.getLinkById(candidate.duplicateId)
        ]);

        if (!link1 || !link2) continue;

        const action: MergeAction = {
          type: candidate.mergeRecommendation === 'auto' ? 'merge' : 'keep_both',
          primaryLinkId: this.choosePrimaryLink(link1, link2),
          duplicateLinkId: this.choosePrimaryLink(link1, link2) === link1.id ? link2.id : link1.id,
          mergeStrategy: await this.determineMergeStrategy(link1, link2),
          reasoning: this.generateMergeReasoning(candidate, link1, link2)
        };

        actions.push(action);
      } catch (error) {
        console.error('Failed to suggest merge strategy for candidate:', error);
      }
    }

    return actions;
  }

  /**
   * Execute a merge action
   */
  async executeMerge(action: MergeAction): Promise<MergeResult> {
    try {
      const [primaryLink, duplicateLink] = await Promise.all([
        this.getLinkById(action.primaryLinkId),
        this.getLinkById(action.duplicateLinkId)
      ]);

      if (!primaryLink || !duplicateLink) {
        return {
          success: false,
          error: 'One or both links not found',
          summary: 'Merge failed: links not found'
        };
      }

      // Create merged link data
      const mergedData = await this.createMergedLink(primaryLink, duplicateLink, action.mergeStrategy);
      
      // Update primary link with merged data
      await storage.updateLink(action.primaryLinkId, mergedData);
      
      // Handle collections - update references before deleting
      await this.updateCollectionReferences(action.duplicateLinkId, action.primaryLinkId);
      
      // Delete duplicate link
      await storage.deleteLink(action.duplicateLinkId);
      
      // Log the merge activity
      await storage.logActivity('organize', action.primaryLinkId, undefined, {
        action: 'merge_duplicate',
        mergedFromId: action.duplicateLinkId,
        strategy: action.mergeStrategy,
        automated: true
      });

      return {
        success: true,
        mergedLinkId: action.primaryLinkId,
        deletedLinkId: action.duplicateLinkId,
        summary: `Successfully merged "${duplicateLink.title}" into "${primaryLink.title}"`
      };
    } catch (error) {
      console.error('Failed to execute merge:', error);
      return {
        success: false,
        error: error.message || 'Merge execution failed',
        summary: 'Merge operation failed'
      };
    }
  }

  /**
   * Get duplicate statistics
   */
  async getDuplicateStats(): Promise<{
    totalDuplicates: number;
    highConfidenceDuplicates: number;
    autoMergeable: number;
    manualReviewNeeded: number;
    spaceRecoverable: string; // e.g., "5 links, ~2MB"
  }> {
    try {
      const candidates = await this.findDuplicates();
      
      const stats = {
        totalDuplicates: candidates.length,
        highConfidenceDuplicates: candidates.filter(c => c.confidence > 0.8).length,
        autoMergeable: candidates.filter(c => c.mergeRecommendation === 'auto').length,
        manualReviewNeeded: candidates.filter(c => c.mergeRecommendation === 'manual').length,
        spaceRecoverable: `${candidates.length} links`
      };

      return stats;
    } catch (error) {
      console.error('Failed to get duplicate stats:', error);
      return {
        totalDuplicates: 0,
        highConfidenceDuplicates: 0,
        autoMergeable: 0,
        manualReviewNeeded: 0,
        spaceRecoverable: '0 links'
      };
    }
  }

  // Private helper methods

  private compareUrls(url1: string, url2: string): number {
    try {
      const parsed1 = new URL(url1);
      const parsed2 = new URL(url2);

      // Exact match
      if (url1 === url2) return 1;

      // Same domain + path
      if (parsed1.hostname === parsed2.hostname && parsed1.pathname === parsed2.pathname) {
        return 0.9; // High similarity, might just differ in query params
      }

      // Same domain, different path
      if (parsed1.hostname === parsed2.hostname) {
        const pathSimilarity = this.compareTexts(parsed1.pathname, parsed2.pathname);
        return 0.3 + (pathSimilarity * 0.4); // 0.3-0.7 range
      }

      // Different domains - check for redirects or URL shorteners
      if (this.isLikelyRedirect(url1, url2)) {
        return 0.8;
      }

      return 0;
    } catch (error) {
      // Fallback to string comparison if URLs are malformed
      return this.compareTexts(url1, url2);
    }
  }

  private compareTexts(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    
    const str1 = text1.toLowerCase().trim();
    const str2 = text2.toLowerCase().trim();
    
    if (str1 === str2) return 1;
    
    // Use Levenshtein distance
    const maxLen = Math.max(str1.length, str2.length);
    const distance = this.levenshteinDistance(str1, str2);
    
    return Math.max(0, 1 - (distance / maxLen));
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator  // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private async compareTagSimilarity(linkId1: string, linkId2: string): Promise<number> {
    try {
      const [tags1, tags2] = await Promise.all([
        storage.getLinkTags(linkId1),
        storage.getLinkTags(linkId2)
      ]);

      if (tags1.length === 0 && tags2.length === 0) return 0;
      if (tags1.length === 0 || tags2.length === 0) return 0;

      const tagNames1 = new Set(tags1.map(t => t.name.toLowerCase()));
      const tagNames2 = new Set(tags2.map(t => t.name.toLowerCase()));

      const intersection = new Set([...tagNames1].filter(tag => tagNames2.has(tag)));
      const union = new Set([...tagNames1, ...tagNames2]);

      return intersection.size / union.size; // Jaccard similarity
    } catch (error) {
      return 0;
    }
  }

  private isLikelyRedirect(url1: string, url2: string): boolean {
    const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'short.link'];
    
    try {
      const domain1 = new URL(url1).hostname;
      const domain2 = new URL(url2).hostname;
      
      return shorteners.includes(domain1) || shorteners.includes(domain2);
    } catch {
      return false;
    }
  }

  private determineMergeRecommendation(similarity: number, reasons: string[]): DuplicateCandidate['mergeRecommendation'] {
    // Auto-merge if very high similarity and strong indicators
    if (similarity > 0.8 && reasons.some(r => r.includes('URLs are') && r.includes('90%'))) {
      return 'auto';
    }
    
    // Manual review if medium similarity
    if (similarity > 0.5) {
      return 'manual';
    }
    
    // Skip if low similarity
    return 'skip';
  }

  private choosePrimaryLink(link1: SavedLink, link2: SavedLink): string {
    // Prefer link with more data
    const score1 = this.calculateLinkRichness(link1);
    const score2 = this.calculateLinkRichness(link2);
    
    if (score1 !== score2) {
      return score1 > score2 ? link1.id : link2.id;
    }
    
    // Prefer older link (first saved)
    return link1.createdAt <= link2.createdAt ? link1.id : link2.id;
  }

  private calculateLinkRichness(link: SavedLink): number {
    let score = 0;
    
    if (link.userNote && link.userNote.trim()) score += 3;
    if (link.aiSummary) score += 2;
    if (link.highlights && link.highlights.length > 0) score += link.highlights.length;
    
    return score;
  }

  private async determineMergeStrategy(link1: SavedLink, link2: SavedLink): Promise<MergeAction['mergeStrategy']> {
    const richer = this.calculateLinkRichness(link1) >= this.calculateLinkRichness(link2) ? link1 : link2;
    const isLink1Richer = richer.id === link1.id;

    return {
      title: isLink1Richer ? 'primary' : 'duplicate',
      notes: link1.userNote && link2.userNote ? 'combined' : (isLink1Richer ? 'primary' : 'duplicate'),
      tags: 'union',
      highlights: 'union',
      collections: 'primary'
    };
  }

  private generateMergeReasoning(candidate: DuplicateCandidate, link1: SavedLink, link2: SavedLink): string {
    const similarity = Math.round(candidate.similarity * 100);
    const reasons = candidate.similarityReasons.join(', ');
    const primary = this.choosePrimaryLink(link1, link2) === link1.id ? link1 : link2;
    
    return `${similarity}% similarity detected (${reasons}). Merging into "${primary.title}" as it has more content.`;
  }

  private async createMergedLink(primaryLink: SavedLink, duplicateLink: SavedLink, strategy: MergeAction['mergeStrategy']): Promise<Partial<SavedLink>> {
    const merged: Partial<SavedLink> = {};

    // Title
    if (strategy.title === 'combined') {
      merged.title = `${primaryLink.title} | ${duplicateLink.title}`;
    } else if (strategy.title === 'duplicate') {
      merged.title = duplicateLink.title;
    }
    // Primary title is used by default (no change needed)

    // Notes
    if (strategy.notes === 'combined') {
      const notes = [primaryLink.userNote, duplicateLink.userNote].filter(Boolean);
      merged.userNote = notes.join('\n\n---\n\n');
    } else if (strategy.notes === 'duplicate') {
      merged.userNote = duplicateLink.userNote;
    }

    // Highlights
    if (strategy.highlights === 'union') {
      const allHighlights = [...(primaryLink.highlights || []), ...(duplicateLink.highlights || [])];
      merged.highlights = allHighlights;
    } else if (strategy.highlights === 'duplicate') {
      merged.highlights = duplicateLink.highlights;
    }

    // Tags will be handled separately via tag management system
    if (strategy.tags === 'union') {
      try {
        const [primaryTags, duplicateTags] = await Promise.all([
          storage.getLinkTags(primaryLink.id),
          storage.getLinkTags(duplicateLink.id)
        ]);
        
        const allTagNames = new Set([
          ...primaryTags.map(t => t.name),
          ...duplicateTags.map(t => t.name)
        ]);
        
        // Add tags to primary link
        await storage.addTagsToLink(primaryLink.id, Array.from(allTagNames));
      } catch (error) {
        console.error('Failed to merge tags:', error);
      }
    }

    return merged;
  }

  private async updateCollectionReferences(oldLinkId: string, newLinkId: string): Promise<void> {
    try {
      // This would update any collection references, but our current storage
      // system uses linkId references, so we don't need to do anything special
      // The link will just be removed when deleted
    } catch (error) {
      console.error('Failed to update collection references:', error);
    }
  }

  private async getLinkById(linkId: string): Promise<SavedLink | null> {
    try {
      const data = await storage.getData();
      return data.links.find(link => link.id === linkId) || null;
    } catch (error) {
      console.error('Failed to get link by ID:', error);
      return null;
    }
  }
}

// Export singleton instance
export const duplicateDetector = DuplicateDetector.getInstance(); 