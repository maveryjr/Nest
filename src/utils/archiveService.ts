// Archive service for recovering dead links using Wayback Machine and other archive services
import { SavedLink } from '../types';
import { storage } from './storage';

export interface ArchivedVersion {
  url: string;
  archivedUrl: string;
  service: 'wayback' | 'google_cache' | 'archive_today' | 'webcitation';
  timestamp: string;
  status: 'available' | 'unavailable' | 'checking';
  title?: string;
  preview?: string; // First few lines of content
}

export interface ArchiveResult {
  originalUrl: string;
  linkId: string;
  versions: ArchivedVersion[];
  bestVersion?: ArchivedVersion;
  lastChecked: string;
  status: 'found' | 'not_found' | 'error';
}

export interface ArchiveStats {
  totalDeadLinks: number;
  archivedVersionsFound: number;
  recoveryRate: number; // Percentage of dead links with archived versions
  lastScanDate: string;
}

export class ArchiveService {
  private static instance: ArchiveService;
  private readonly WAYBACK_CDX_API = 'https://web.archive.org/cdx/search/cdx';
  private readonly WAYBACK_BASE_URL = 'https://web.archive.org/web/';
  private readonly GOOGLE_CACHE_BASE = 'https://webcache.googleusercontent.com/search?q=cache:';
  private readonly ARCHIVE_TODAY_API = 'https://archive.today/';

  public static getInstance(): ArchiveService {
    if (!ArchiveService.instance) {
      ArchiveService.instance = new ArchiveService();
    }
    return ArchiveService.instance;
  }

  /**
   * Find archived versions for a specific URL
   */
  async findArchivedVersions(url: string, linkId?: string): Promise<ArchiveResult> {
    const result: ArchiveResult = {
      originalUrl: url,
      linkId: linkId || '',
      versions: [],
      lastChecked: new Date().toISOString(),
      status: 'checking' as any
    };

    try {
      // Check multiple archive services in parallel
      const [waybackVersions, googleCacheVersion, archiveTodayVersion] = await Promise.allSettled([
        this.checkWaybackMachine(url),
        this.checkGoogleCache(url),
        this.checkArchiveToday(url)
      ]);

      // Collect all successful results
      if (waybackVersions.status === 'fulfilled') {
        result.versions.push(...waybackVersions.value);
      }

      if (googleCacheVersion.status === 'fulfilled' && googleCacheVersion.value) {
        result.versions.push(googleCacheVersion.value);
      }

      if (archiveTodayVersion.status === 'fulfilled' && archiveTodayVersion.value) {
        result.versions.push(archiveTodayVersion.value);
      }

      // Sort by recency and pick the best version
      result.versions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      result.bestVersion = result.versions.find(v => v.status === 'available');
      
      result.status = result.versions.length > 0 ? 'found' : 'not_found';

      // Cache the result
      if (linkId) {
        await this.cacheArchiveResult(linkId, result);
      }

      return result;
    } catch (error) {
      console.error('Failed to find archived versions:', error);
      result.status = 'error';
      return result;
    }
  }

  /**
   * Search for archives of multiple dead links
   */
  async batchFindArchives(deadLinkIds: string[]): Promise<ArchiveResult[]> {
    const results: ArchiveResult[] = [];
    const batchSize = 3; // Process 3 at a time to avoid rate limiting

    try {
      const data = await storage.getData();
      
      for (let i = 0; i < deadLinkIds.length; i += batchSize) {
        const batch = deadLinkIds.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (linkId) => {
          const link = data.links.find(l => l.id === linkId);
          if (!link) return null;

          // Check if we already have cached results
          const cached = await this.getCachedArchiveResult(linkId);
          if (cached && this.isCacheValid(cached.lastChecked)) {
            return cached;
          }

          return await this.findArchivedVersions(link.url, linkId);
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            results.push(result.value);
          }
        });

        // Add delay between batches to respect rate limits
        if (i + batchSize < deadLinkIds.length) {
          await this.delay(2000);
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to batch find archives:', error);
      return results;
    }
  }

  /**
   * Get archive statistics for the user's dead links
   */
  async getArchiveStats(): Promise<ArchiveStats> {
    try {
      const data = await storage.getData();
      const deadLinks = data.links.filter(link => {
        // Check if link is marked as dead in health data
        return false; // This would check against LinkMonitor health data
      });

      let archivedCount = 0;
      
      // Count links with archived versions
      for (const link of deadLinks.slice(0, 10)) { // Sample first 10 to avoid long delays
        const cached = await this.getCachedArchiveResult(link.id);
        if (cached && cached.status === 'found') {
          archivedCount++;
        }
      }

      const recoveryRate = deadLinks.length > 0 ? (archivedCount / Math.min(deadLinks.length, 10)) * 100 : 0;

      return {
        totalDeadLinks: deadLinks.length,
        archivedVersionsFound: archivedCount,
        recoveryRate,
        lastScanDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get archive stats:', error);
      return {
        totalDeadLinks: 0,
        archivedVersionsFound: 0,
        recoveryRate: 0,
        lastScanDate: new Date().toISOString()
      };
    }
  }

  /**
   * Replace a dead link with its best archived version
   */
  async replaceWithArchivedVersion(linkId: string, archiveVersion?: ArchivedVersion): Promise<boolean> {
    try {
      if (!archiveVersion) {
        const archiveResult = await this.findArchivedVersions('', linkId);
        archiveVersion = archiveResult.bestVersion;
      }

      if (!archiveVersion) {
        return false;
      }

      // Update the link's URL to point to the archived version
      const updateData = {
        url: archiveVersion.archivedUrl,
        domain: new URL(archiveVersion.archivedUrl).hostname,
        userNote: await this.addArchiveNote(linkId, archiveVersion)
      };

      await storage.updateLink(linkId, updateData);

      // Log the recovery activity
      await storage.logActivity('organize', linkId, undefined, {
        action: 'archive_recovery',
        archiveService: archiveVersion.service,
        originalUrl: archiveVersion.url,
        archivedUrl: archiveVersion.archivedUrl,
        automated: true
      });

      return true;
    } catch (error) {
      console.error('Failed to replace with archived version:', error);
      return false;
    }
  }

  // Private helper methods

  private async checkWaybackMachine(url: string): Promise<ArchivedVersion[]> {
    try {
      const encodedUrl = encodeURIComponent(url);
      const cdxUrl = `${this.WAYBACK_CDX_API}?url=${encodedUrl}&output=json&limit=5&sort=timestamp:desc`;

      const response = await fetch(cdxUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Wayback Machine API error');
      }

      const data = await response.json();
      const versions: ArchivedVersion[] = [];

      // Skip the header row
      if (data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          const [urlkey, timestamp, original, mimetype, statuscode, digest, length] = data[i];
          
          if (statuscode === '200') {
            const waybackUrl = `${this.WAYBACK_BASE_URL}${timestamp}/${original}`;
            const date = this.parseWaybackTimestamp(timestamp);

            versions.push({
              url: original,
              archivedUrl: waybackUrl,
              service: 'wayback',
              timestamp: date.toISOString(),
              status: 'available'
            });
          }
        }
      }

      return versions;
    } catch (error) {
      console.error('Wayback Machine check failed:', error);
      return [];
    }
  }

  private async checkGoogleCache(url: string): Promise<ArchivedVersion | null> {
    try {
      const cacheUrl = `${this.GOOGLE_CACHE_BASE}${encodeURIComponent(url)}`;
      
      // We can't actually verify if Google Cache has the page without making a full request
      // So we'll just construct the potential URL and mark it as checking
      // The user can click to verify if it works
      
      return {
        url,
        archivedUrl: cacheUrl,
        service: 'google_cache',
        timestamp: new Date().toISOString(), // Current time since we don't know when it was cached
        status: 'checking' // User needs to verify manually
      };
    } catch (error) {
      console.error('Google Cache check failed:', error);
      return null;
    }
  }

  private async checkArchiveToday(url: string): Promise<ArchivedVersion | null> {
    try {
      // Archive.today doesn't have a simple API, so we'll construct potential URLs
      // This would need to be enhanced with actual API calls if available
      
      const archiveUrl = `${this.ARCHIVE_TODAY_API}${encodeURIComponent(url)}`;
      
      return {
        url,
        archivedUrl: archiveUrl,
        service: 'archive_today',
        timestamp: new Date().toISOString(),
        status: 'checking'
      };
    } catch (error) {
      console.error('Archive.today check failed:', error);
      return null;
    }
  }

  private parseWaybackTimestamp(timestamp: string): Date {
    // Wayback timestamps are in format: YYYYMMDDHHMMSS
    const year = parseInt(timestamp.substr(0, 4));
    const month = parseInt(timestamp.substr(4, 2)) - 1; // Month is 0-indexed
    const day = parseInt(timestamp.substr(6, 2));
    const hour = parseInt(timestamp.substr(8, 2)) || 0;
    const minute = parseInt(timestamp.substr(10, 2)) || 0;
    const second = parseInt(timestamp.substr(12, 2)) || 0;

    return new Date(year, month, day, hour, minute, second);
  }

  private async addArchiveNote(linkId: string, archiveVersion: ArchivedVersion): Promise<string> {
    try {
      const data = await storage.getData();
      const link = data.links.find(l => l.id === linkId);
      
      if (!link) return '';

      const archiveNote = `\n\n[RECOVERED] This link was recovered from ${archiveVersion.service} on ${new Date().toLocaleDateString()}. Original URL: ${archiveVersion.url}`;
      
      return (link.userNote || '') + archiveNote;
    } catch (error) {
      console.error('Failed to add archive note:', error);
      return '';
    }
  }

  private async cacheArchiveResult(linkId: string, result: ArchiveResult): Promise<void> {
    try {
      const cacheKey = `archive_${linkId}`;
      await chrome.storage.local.set({
        [cacheKey]: {
          ...result,
          cachedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to cache archive result:', error);
    }
  }

  private async getCachedArchiveResult(linkId: string): Promise<ArchiveResult | null> {
    try {
      const cacheKey = `archive_${linkId}`;
      const result = await chrome.storage.local.get(cacheKey);
      return result[cacheKey] || null;
    } catch (error) {
      console.error('Failed to get cached archive result:', error);
      return null;
    }
  }

  private isCacheValid(lastChecked: string): boolean {
    const cacheAge = Date.now() - new Date(lastChecked).getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    return cacheAge < maxAge;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear archive cache for a specific link or all links
   */
  async clearArchiveCache(linkId?: string): Promise<void> {
    try {
      if (linkId) {
        const cacheKey = `archive_${linkId}`;
        await chrome.storage.local.remove(cacheKey);
      } else {
        // Clear all archive cache
        const result = await chrome.storage.local.get(null);
        const archiveKeys = Object.keys(result).filter(key => key.startsWith('archive_'));
        await chrome.storage.local.remove(archiveKeys);
      }
    } catch (error) {
      console.error('Failed to clear archive cache:', error);
    }
  }

  /**
   * Get recovery suggestions for dead links
   */
  async getRecoverySuggestions(deadLinkIds: string[]): Promise<{
    linkId: string;
    title: string;
    originalUrl: string;
    suggestions: ArchivedVersion[];
    priority: 'high' | 'medium' | 'low';
  }[]> {
    try {
      const data = await storage.getData();
      const suggestions = [];

      for (const linkId of deadLinkIds.slice(0, 5)) { // Limit to 5 for performance
        const link = data.links.find(l => l.id === linkId);
        if (!link) continue;

        const archiveResult = await this.findArchivedVersions(link.url, linkId);
        
        if (archiveResult.versions.length > 0) {
          // Determine priority based on user engagement with the link
          let priority: 'high' | 'medium' | 'low' = 'low';
          
          if (link.highlights && link.highlights.length > 0) priority = 'high';
          else if (link.userNote) priority = 'medium';

          suggestions.push({
            linkId,
            title: link.title,
            originalUrl: link.url,
            suggestions: archiveResult.versions.slice(0, 3), // Top 3 suggestions
            priority
          });
        }
      }

      // Sort by priority
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      suggestions.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

      return suggestions;
    } catch (error) {
      console.error('Failed to get recovery suggestions:', error);
      return [];
    }
  }
}

// Export singleton instance
export const archiveService = ArchiveService.getInstance(); 