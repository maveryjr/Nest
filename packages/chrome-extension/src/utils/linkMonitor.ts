// Link monitoring service for automated dead link detection and recovery
import { SavedLink } from '../types';
import { storage } from './storage';

export interface LinkHealth {
  linkId: string;
  url: string;
  status: 'healthy' | 'redirected' | 'dead' | 'unreachable' | 'checking';
  lastChecked: Date;
  statusCode?: number;
  redirectUrl?: string;
  alternativeUrls?: string[];
  error?: string;
  recoveryAttempted?: boolean;
  recoverySuccess?: boolean;
}

export interface LinkCheckResult {
  success: boolean;
  status: LinkHealth['status'];
  statusCode?: number;
  redirectUrl?: string;
  error?: string;
  responseTime?: number;
}

export interface RecoveryResult {
  success: boolean;
  recoveredUrl?: string;
  method?: 'wayback' | 'google_cache' | 'archive_today';
  timestamp?: string;
  error?: string;
}

export class LinkMonitor {
  private static instance: LinkMonitor;
  private checkQueue: string[] = [];
  private isProcessing: boolean = false;
  private readonly CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly BATCH_SIZE = 5; // Check 5 links at a time
  private readonly RATE_LIMIT_DELAY = 2000; // 2 seconds between checks
  
  public static getInstance(): LinkMonitor {
    if (!LinkMonitor.instance) {
      LinkMonitor.instance = new LinkMonitor();
    }
    return LinkMonitor.instance;
  }

  /**
   * Initialize the link monitor service
   */
  async initialize(): Promise<void> {
    try {
      console.log('LinkMonitor: Initializing service...');
      
      // Clear any existing processing state
      this.isProcessing = false;
      this.checkQueue = [];
      
      // Schedule initial health checks for links that haven't been checked recently
      await this.schedulePeriodicChecks();
      
      console.log('LinkMonitor: Service initialized successfully');
    } catch (error) {
      console.error('LinkMonitor: Failed to initialize service:', error);
    }
  }

  /**
   * Check the health of multiple links by their IDs
   */
  async checkLinksHealth(linkIds: string[]): Promise<LinkCheckResult[]> {
    try {
      console.log(`Checking health of ${linkIds.length} links`);
      
      const results: LinkCheckResult[] = [];
      
      for (const linkId of linkIds) {
        try {
          const link = await this.getLinkById(linkId);
          if (link) {
            const result = await this.checkLinkHealth(link.url);
            results.push({
              ...result,
              linkId // Add linkId to the result for reference
            } as LinkCheckResult & { linkId: string });
            
            // Rate limiting
            await this.delay(this.RATE_LIMIT_DELAY);
          }
        } catch (error) {
          console.error(`Failed to check link ${linkId}:`, error);
          results.push({
            success: false,
            status: 'unreachable',
            error: error.message || 'Unknown error',
            linkId
          } as LinkCheckResult & { linkId: string });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Failed to check links health:', error);
      return [];
    }
  }

  /**
   * Check the health of a single link
   */
  async checkLinkHealth(url: string): Promise<LinkCheckResult> {
    try {
      console.log(`Checking link health: ${url}`);
      
      const startTime = Date.now();
      
      // Use fetch with timeout to check the link
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch(url, {
          method: 'HEAD', // Use HEAD to avoid downloading full content
          signal: controller.signal,
          headers: {
            'User-Agent': 'Nest Extension Link Checker'
          }
        });
        
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        
        // Check for redirects
        if (response.redirected && response.url !== url) {
          return {
            success: true,
            status: 'redirected',
            statusCode: response.status,
            redirectUrl: response.url,
            responseTime
          };
        }
        
        // Check status code
        if (response.ok) {
          return {
            success: true,
            status: 'healthy',
            statusCode: response.status,
            responseTime
          };
        } else if (response.status >= 400 && response.status < 500) {
          return {
            success: false,
            status: 'dead',
            statusCode: response.status,
            error: `HTTP ${response.status}`,
            responseTime
          };
        } else {
          return {
            success: false,
            status: 'unreachable',
            statusCode: response.status,
            error: `Server error: HTTP ${response.status}`,
            responseTime
          };
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          return {
            success: false,
            status: 'unreachable',
            error: 'Request timeout',
            responseTime: Date.now() - startTime
          };
        }
        
        return {
          success: false,
          status: 'unreachable',
          error: fetchError.message || 'Network error',
          responseTime: Date.now() - startTime
        };
      }
    } catch (error) {
      console.error('Error checking link health:', error);
      return {
        success: false,
        status: 'unreachable',
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * Schedule periodic health checks for all links
   */
  async schedulePeriodicChecks(): Promise<void> {
    try {
      const data = await storage.getData();
      const links = data.links;
      
      // Filter links that need checking (haven't been checked recently)
      const linksToCheck = await this.getLinksNeedingCheck(links);
      
      if (linksToCheck.length === 0) {
        console.log('No links need health checking at this time');
        return;
      }
      
      console.log(`Scheduling health checks for ${linksToCheck.length} links`);
      
      // Add to check queue
      for (const link of linksToCheck) {
        if (!this.checkQueue.includes(link.id)) {
          this.checkQueue.push(link.id);
        }
      }
      
      // Start processing if not already running
      if (!this.isProcessing) {
        this.processCheckQueue();
      }
    } catch (error) {
      console.error('Failed to schedule periodic checks:', error);
    }
  }

  /**
   * Attempt to rescue a dead link using archive services
   */
  async rescueDeadLink(linkId: string): Promise<RecoveryResult> {
    try {
      const link = await this.getLinkById(linkId);
      if (!link) {
        return { success: false, error: 'Link not found' };
      }

      console.log(`Attempting to rescue dead link: ${link.url}`);

      // Try different recovery methods in order of preference
      const recoveryMethods = [
        () => this.tryWaybackMachine(link.url),
        () => this.tryGoogleCache(link.url),
        () => this.tryArchiveToday(link.url)
      ];

      for (const method of recoveryMethods) {
        try {
          const result = await method();
          if (result.success) {
            // Update link with recovered URL
            await this.updateLinkWithRecovery(linkId, result);
            return result;
          }
        } catch (error) {
          console.log('Recovery method failed:', error.message);
          continue;
        }
      }

      return { success: false, error: 'No working archive found' };
    } catch (error) {
      console.error('Failed to rescue dead link:', error);
      return { success: false, error: error.message || 'Recovery failed' };
    }
  }

  /**
   * Get dead link IDs for processing
   */
  async getDeadLinks(): Promise<string[]> {
    try {
      const healthData = await this.getAllLinkHealth();
      return healthData
        .filter(health => health.status === 'dead')
        .map(health => health.linkId);
    } catch (error) {
      console.error('Failed to get dead links:', error);
      return [];
    }
  }

  /**
   * Get comprehensive health report for all links
   */
  async getHealthReport(): Promise<{
    totalLinks: number;
    healthyLinks: number;
    deadLinks: string[]; // Changed to return array of IDs
    unreachableLinks: number;
    redirectedLinks: number;
    uncheckedLinks: number;
    recentlyRecovered: number;
  }> {
    try {
      const healthData = await this.getAllLinkHealth();
      
      const report = {
        totalLinks: 0,
        healthyLinks: 0,
        deadLinks: [] as string[], // Changed to array of IDs
        unreachableLinks: 0,
        redirectedLinks: 0,
        uncheckedLinks: 0,
        recentlyRecovered: 0
      };

      const data = await storage.getData();
      report.totalLinks = data.links.length;

      for (const health of healthData) {
        switch (health.status) {
          case 'healthy':
            report.healthyLinks++;
            break;
          case 'dead':
            report.deadLinks.push(health.linkId); // Add ID to array
            break;
          case 'unreachable':
            report.unreachableLinks++;
            break;
          case 'redirected':
            report.redirectedLinks++;
            break;
        }

        if (health.recoverySuccess) {
          report.recentlyRecovered++;
        }
      }

      report.uncheckedLinks = report.totalLinks - healthData.length;

      return report;
    } catch (error) {
      console.error('Failed to generate health report:', error);
      return {
        totalLinks: 0,
        healthyLinks: 0,
        deadLinks: [], // Changed to empty array
        unreachableLinks: 0,
        redirectedLinks: 0,
        uncheckedLinks: 0,
        recentlyRecovered: 0
      };
    }
  }

  // Private helper methods

  private async getLinksNeedingCheck(links: SavedLink[]): Promise<SavedLink[]> {
    const healthData = await this.getAllLinkHealth();
    const healthMap = new Map(healthData.map(h => [h.linkId, h]));
    
    const now = new Date();
    const needsCheck: SavedLink[] = [];

    for (const link of links) {
      const health = healthMap.get(link.id);
      
      if (!health) {
        // Never checked before
        needsCheck.push(link);
      } else {
        const timeSinceCheck = now.getTime() - health.lastChecked.getTime();
        const shouldRecheck = timeSinceCheck > this.CHECK_INTERVAL;
        
        // Recheck dead links more frequently (every 7 days)
        const isDeadAndOld = health.status === 'dead' && timeSinceCheck > (7 * 24 * 60 * 60 * 1000);
        
        if (shouldRecheck || isDeadAndOld) {
          needsCheck.push(link);
        }
      }
    }

    return needsCheck;
  }

  private async processCheckQueue(): Promise<void> {
    if (this.isProcessing || this.checkQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`Processing link health check queue: ${this.checkQueue.length} items`);

    try {
      while (this.checkQueue.length > 0) {
        const batch = this.checkQueue.splice(0, this.BATCH_SIZE);
        
        // Process batch concurrently but with rate limiting
        const batchPromises = batch.map(async (linkId, index) => {
          // Stagger requests to avoid overwhelming servers
          await this.delay(index * 500); // 500ms between each request in batch
          return this.checkAndUpdateLinkHealth(linkId);
        });

        await Promise.all(batchPromises);
        
        // Wait before next batch
        if (this.checkQueue.length > 0) {
          await this.delay(this.RATE_LIMIT_DELAY);
        }
      }
    } catch (error) {
      console.error('Error processing check queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async checkAndUpdateLinkHealth(linkId: string): Promise<void> {
    try {
      const link = await this.getLinkById(linkId);
      if (!link) return;

      const result = await this.checkLinkHealth(link.url);
      
      const health: LinkHealth = {
        linkId,
        url: link.url,
        status: result.status,
        lastChecked: new Date(),
        statusCode: result.statusCode,
        redirectUrl: result.redirectUrl,
        error: result.error
      };

      await this.saveLinkHealth(health);

      // If link is dead, attempt recovery
      if (result.status === 'dead' && !health.recoveryAttempted) {
        setTimeout(async () => {
          try {
            const recoveryResult = await this.rescueDeadLink(linkId);
            await this.updateHealthWithRecovery(linkId, recoveryResult);
          } catch (error) {
            console.error('Auto-recovery failed:', error);
          }
        }, 5000); // Wait 5 seconds before attempting recovery
      }

      console.log(`Link health updated: ${link.url} -> ${result.status}`);
    } catch (error) {
      console.error(`Failed to check link ${linkId}:`, error);
    }
  }

  private async tryWaybackMachine(url: string): Promise<RecoveryResult> {
    try {
      // Wayback Machine CDX API
      const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&limit=1&sort=timestamp&order=desc`;
      
      const response = await fetch(cdxUrl);
      if (!response.ok) {
        throw new Error('Wayback API request failed');
      }

      const text = await response.text();
      const lines = text.trim().split('\n');
      
      if (lines.length === 0 || !lines[0]) {
        return { success: false, error: 'No archived version found' };
      }

      const parts = lines[0].split(' ');
      if (parts.length < 3) {
        return { success: false, error: 'Invalid response format' };
      }

      const timestamp = parts[1];
      const archivedUrl = `https://web.archive.org/web/${timestamp}/${url}`;

      return {
        success: true,
        recoveredUrl: archivedUrl,
        method: 'wayback',
        timestamp
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async tryGoogleCache(url: string): Promise<RecoveryResult> {
    try {
      const cacheUrl = `http://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
      
      // Test if cache exists by making a HEAD request
      const response = await fetch(cacheUrl, { method: 'HEAD' });
      
      if (response.ok) {
        return {
          success: true,
          recoveredUrl: cacheUrl,
          method: 'google_cache'
        };
      } else {
        return { success: false, error: 'No cached version found' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async tryArchiveToday(url: string): Promise<RecoveryResult> {
    try {
      // Archive.today API
      const apiUrl = `http://archive.today/timemap/json/${encodeURIComponent(url)}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Archive.today API request failed');
      }

      const data = await response.json();
      
      if (!Array.isArray(data) || data.length < 2) {
        return { success: false, error: 'No archived version found' };
      }

      // Get the most recent archive (skip header row)
      const latestArchive = data[data.length - 1];
      const archivedUrl = latestArchive[1];

      return {
        success: true,
        recoveredUrl: archivedUrl,
        method: 'archive_today'
      };
    } catch (error) {
      return { success: false, error: error.message };
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

  private async getAllLinkHealth(): Promise<LinkHealth[]> {
    try {
      const result = await chrome.storage.local.get('nest_link_health');
      return result.nest_link_health || [];
    } catch (error) {
      console.error('Failed to get link health data:', error);
      return [];
    }
  }

  private async saveLinkHealth(health: LinkHealth): Promise<void> {
    try {
      const allHealth = await this.getAllLinkHealth();
      const existingIndex = allHealth.findIndex(h => h.linkId === health.linkId);
      
      if (existingIndex >= 0) {
        allHealth[existingIndex] = health;
      } else {
        allHealth.push(health);
      }
      
      await chrome.storage.local.set({ nest_link_health: allHealth });
    } catch (error) {
      console.error('Failed to save link health:', error);
    }
  }

  private async updateLinkWithRecovery(linkId: string, recovery: RecoveryResult): Promise<void> {
    try {
      if (recovery.success && recovery.recoveredUrl) {
        // Add recovery URL as user note
        const link = await this.getLinkById(linkId);
        if (link) {
          const recoveryNote = `\n\n[Auto-recovered via ${recovery.method}]\nRecovered URL: ${recovery.recoveredUrl}`;
          const updatedNote = (link.userNote || '') + recoveryNote;
          
          await storage.updateLink(linkId, { userNote: updatedNote });
        }
      }
    } catch (error) {
      console.error('Failed to update link with recovery info:', error);
    }
  }

  private async updateHealthWithRecovery(linkId: string, recovery: RecoveryResult): Promise<void> {
    try {
      const allHealth = await this.getAllLinkHealth();
      const health = allHealth.find(h => h.linkId === linkId);
      
      if (health) {
        health.recoveryAttempted = true;
        health.recoverySuccess = recovery.success;
        if (recovery.success && recovery.recoveredUrl) {
          health.alternativeUrls = [recovery.recoveredUrl];
        }
        
        await this.saveLinkHealth(health);
      }
    } catch (error) {
      console.error('Failed to update health with recovery:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const linkMonitor = LinkMonitor.getInstance(); 