// Activity analysis utility for generating intelligent inbox suggestions
import { SavedLink, Collection, ActivityEvent } from '../types';
import { storage } from './storage';

export interface ActivityPattern {
  userId: string;
  preferredReadingTimes: number[]; // Hours of day (0-23)
  averageSessionLength: number;    // Minutes
  contentPreferences: Record<string, number>; // Domain/topic scores
  stalenessThresholds: Record<string, number>; // Days by content type
  readingVelocity: number; // Links read per day
  organizationFrequency: number; // Days between organization sessions
  tagUsagePatterns: Record<string, number>; // Tag frequency scores
  collectionUsagePatterns: Record<string, number>; // Collection usage scores
}

export interface StaleContentItem {
  link: SavedLink;
  staleness: number; // 0-1 scale, 1 being most stale
  reason: 'time_based' | 'topic_shift' | 'never_accessed' | 'duplicate_content';
  daysSinceCreated: number;
  daysSinceLastAccess?: number;
  suggestedAction: 'archive' | 'review' | 'delete' | 'organize';
}

export interface ContentCluster {
  theme: string;
  links: SavedLink[];
  confidence: number; // How confident we are in this clustering
  suggestedCollectionName?: string;
  suggestedTags?: string[];
}

export class ActivityAnalyzer {
  private static instance: ActivityAnalyzer;
  
  public static getInstance(): ActivityAnalyzer {
    if (!ActivityAnalyzer.instance) {
      ActivityAnalyzer.instance = new ActivityAnalyzer();
    }
    return ActivityAnalyzer.instance;
  }

  /**
   * Analyze user activity patterns to understand preferences and habits
   */
  async analyzeUserPatterns(): Promise<ActivityPattern> {
    try {
      const [links, activities, collections] = await Promise.all([
        storage.getData().then(data => data.links),
        storage.getActivities(200), // Get last 200 activities
        storage.getData().then(data => data.collections)
      ]);

      // Analyze preferred reading times from activity patterns
      const preferredReadingTimes = this.analyzeReadingTimes(activities);
      
      // Calculate average session length from consecutive activities
      const averageSessionLength = this.calculateAverageSessionLength(activities);
      
      // Analyze content preferences by domain and category
      const contentPreferences = this.analyzeContentPreferences(links, activities);
      
      // Determine staleness thresholds based on user behavior
      const stalenessThresholds = this.calculateStalenessThresholds(links, activities);
      
      // Calculate reading velocity (links accessed per day)
      const readingVelocity = this.calculateReadingVelocity(activities);
      
      // Analyze organization frequency
      const organizationFrequency = this.calculateOrganizationFrequency(activities);
      
      // Analyze tag usage patterns
      const tagUsagePatterns = await this.analyzeTagUsagePatterns(links);
      
      // Analyze collection usage patterns
      const collectionUsagePatterns = this.analyzeCollectionUsagePatterns(links, collections);

      return {
        userId: 'current_user', // This would come from auth in a real app
        preferredReadingTimes,
        averageSessionLength,
        contentPreferences,
        stalenessThresholds,
        readingVelocity,
        organizationFrequency,
        tagUsagePatterns,
        collectionUsagePatterns
      };
    } catch (error) {
      console.error('Failed to analyze user patterns:', error);
      // Return sensible defaults
      return this.getDefaultActivityPattern();
    }
  }

  /**
   * Identify stale content that should be archived or organized
   */
  async identifyStaleContent(): Promise<StaleContentItem[]> {
    try {
      const patterns = await this.analyzeUserPatterns();
      const data = await storage.getData();
      const activities = await storage.getActivities(100);
      
      const staleItems: StaleContentItem[] = [];
      const now = new Date();

      for (const link of data.links) {
        if (!link.isInInbox) continue; // Only analyze inbox items
        
        const daysSinceCreated = this.getDaysDifference(link.createdAt, now);
        const lastAccessActivity = activities.find(a => 
          a.type === 'read' && a.linkId === link.id
        );
        const daysSinceLastAccess = lastAccessActivity 
          ? this.getDaysDifference(lastAccessActivity.createdAt, now)
          : undefined;

        // Determine staleness based on multiple factors
        const staleness = this.calculateStaleness(link, patterns, daysSinceCreated, daysSinceLastAccess);
        
        if (staleness > 0.3) { // Only include items that are significantly stale
          const reason = this.determineStalenessReason(link, patterns, daysSinceCreated, daysSinceLastAccess);
          const suggestedAction = this.suggestActionForStaleItem(link, staleness, reason);
          
          staleItems.push({
            link,
            staleness,
            reason,
            daysSinceCreated,
            daysSinceLastAccess,
            suggestedAction
          });
        }
      }

      // Sort by staleness score (most stale first)
      return staleItems.sort((a, b) => b.staleness - a.staleness);
    } catch (error) {
      console.error('Failed to identify stale content:', error);
      return [];
    }
  }

  /**
   * Detect content clusters for organization suggestions
   */
  async detectContentClusters(): Promise<ContentCluster[]> {
    try {
      const data = await storage.getData();
      const inboxLinks = data.links.filter(link => link.isInInbox);
      
      if (inboxLinks.length < 3) return []; // Need at least 3 items to cluster

      const clusters: ContentCluster[] = [];

      // Domain-based clustering
      const domainClusters = this.clusterByDomain(inboxLinks);
      clusters.push(...domainClusters);

      // Topic-based clustering (using existing tags and AI analysis)
      const topicClusters = await this.clusterByTopics(inboxLinks);
      clusters.push(...topicClusters);

      // Time-based clustering (items saved around the same time with similar themes)
      const timeClusters = this.clusterByTimeAndSimilarity(inboxLinks);
      clusters.push(...timeClusters);

      // Remove overlapping clusters and sort by confidence
      const uniqueClusters = this.deduplicateClusters(clusters);
      
      return uniqueClusters
        .filter(cluster => cluster.links.length >= 2) // Only clusters with 2+ items
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5); // Return top 5 clusters
    } catch (error) {
      console.error('Failed to detect content clusters:', error);
      return [];
    }
  }

  /**
   * Get reading recommendations based on user patterns
   */
  async getReadingRecommendations(limit: number = 5): Promise<SavedLink[]> {
    try {
      const patterns = await this.analyzeUserPatterns();
      const data = await storage.getData();
      const activities = await storage.getActivities(50);
      
      const unreadLinks = data.links.filter(link => {
        // Check if link has been read recently
        const readActivity = activities.find(a => 
          a.type === 'read' && a.linkId === link.id
        );
        return !readActivity || this.getDaysDifference(readActivity.createdAt, new Date()) > 7;
      });

      // Score links based on user preferences and patterns
      const scoredLinks = unreadLinks.map(link => ({
        link,
        score: this.calculateReadingScore(link, patterns)
      }));

      return scoredLinks
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.link);
    } catch (error) {
      console.error('Failed to get reading recommendations:', error);
      return [];
    }
  }

  // Private helper methods

  private analyzeReadingTimes(activities: any[]): number[] {
    const readActivities = activities.filter(a => a.type === 'read');
    const hourCounts = new Array(24).fill(0);
    
    readActivities.forEach(activity => {
      const hour = new Date(activity.createdAt).getHours();
      hourCounts[hour]++;
    });

    // Return hours with above-average activity
    const averageCount = readActivities.length / 24;
    return hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter(item => item.count > averageCount)
      .map(item => item.hour);
  }

  private calculateAverageSessionLength(activities: any[]): number {
    const sessions: number[] = [];
    let currentSession: any[] = [];
    
    activities.forEach((activity, index) => {
      if (index === 0) {
        currentSession = [activity];
        return;
      }
      
      const timeDiff = new Date(activity.createdAt).getTime() - 
                      new Date(activities[index - 1].createdAt).getTime();
      
      if (timeDiff <= 30 * 60 * 1000) { // 30 minutes threshold
        currentSession.push(activity);
      } else {
        if (currentSession.length > 1) {
          const sessionLength = new Date(currentSession[currentSession.length - 1].createdAt).getTime() - 
                                new Date(currentSession[0].createdAt).getTime();
          sessions.push(sessionLength / (60 * 1000)); // Convert to minutes
        }
        currentSession = [activity];
      }
    });

    return sessions.length > 0 ? sessions.reduce((a, b) => a + b, 0) / sessions.length : 15; // Default 15 minutes
  }

  private analyzeContentPreferences(links: SavedLink[], activities: any[]): Record<string, number> {
    const preferences: Record<string, number> = {};
    
    // Analyze domain preferences based on read activities
    const readActivities = activities.filter(a => a.type === 'read');
    
    readActivities.forEach(activity => {
      const link = links.find(l => l.id === activity.linkId);
      if (link) {
        preferences[link.domain] = (preferences[link.domain] || 0) + 1;
      }
    });

    // Normalize scores (0-1 scale)
    const maxScore = Math.max(...Object.values(preferences));
    if (maxScore > 0) {
      for (const domain in preferences) {
        preferences[domain] = preferences[domain] / maxScore;
      }
    }

    return preferences;
  }

  private calculateStalenessThresholds(links: SavedLink[], activities: any[]): Record<string, number> {
    // Default thresholds in days
    const defaults = {
      'general': 30,
      'work': 14,
      'learning': 21,
      'personal': 45,
      'news': 7,
      'reference': 90
    };

    // Adjust based on user behavior
    const readActivities = activities.filter(a => a.type === 'read');
    if (readActivities.length > 10) {
      const avgDaysToRead = this.calculateAverageTimeToRead(links, readActivities);
      
      // Adjust thresholds based on user's reading speed
      for (const category in defaults) {
        defaults[category] = Math.max(defaults[category] * (avgDaysToRead / 7), 3);
      }
    }

    return defaults;
  }

  private calculateReadingVelocity(activities: any[]): number {
    const readActivities = activities.filter(a => a.type === 'read');
    if (readActivities.length === 0) return 1; // Default 1 link per day

    const firstActivity = readActivities[readActivities.length - 1];
    const lastActivity = readActivities[0];
    const daysDiff = this.getDaysDifference(
      new Date(firstActivity.createdAt),
      new Date(lastActivity.createdAt)
    );

    return daysDiff > 0 ? readActivities.length / daysDiff : readActivities.length;
  }

  private calculateOrganizationFrequency(activities: any[]): number {
    const organizeActivities = activities.filter(a => a.type === 'organize');
    if (organizeActivities.length < 2) return 7; // Default 7 days

    const intervals: number[] = [];
    for (let i = 1; i < organizeActivities.length; i++) {
      const daysDiff = this.getDaysDifference(
        new Date(organizeActivities[i].createdAt),
        new Date(organizeActivities[i - 1].createdAt)
      );
      intervals.push(daysDiff);
    }

    return intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 7;
  }

  private async analyzeTagUsagePatterns(links: SavedLink[]): Promise<Record<string, number>> {
    const tagCounts: Record<string, number> = {};
    
    for (const link of links) {
      try {
        const tags = await storage.getLinkTags(link.id);
        tags.forEach(tag => {
          tagCounts[tag.name] = (tagCounts[tag.name] || 0) + 1;
        });
      } catch (error) {
        // Skip if can't get tags for this link
      }
    }

    // Normalize to 0-1 scale
    const maxCount = Math.max(...Object.values(tagCounts));
    if (maxCount > 0) {
      for (const tag in tagCounts) {
        tagCounts[tag] = tagCounts[tag] / maxCount;
      }
    }

    return tagCounts;
  }

  private analyzeCollectionUsagePatterns(links: SavedLink[], collections: Collection[]): Record<string, number> {
    const collectionCounts: Record<string, number> = {};
    
    links.forEach(link => {
      if (link.collectionId) {
        const collection = collections.find(c => c.id === link.collectionId);
        if (collection) {
          collectionCounts[collection.name] = (collectionCounts[collection.name] || 0) + 1;
        }
      }
    });

    // Normalize to 0-1 scale
    const maxCount = Math.max(...Object.values(collectionCounts));
    if (maxCount > 0) {
      for (const collection in collectionCounts) {
        collectionCounts[collection] = collectionCounts[collection] / maxCount;
      }
    }

    return collectionCounts;
  }

  private calculateStaleness(
    link: SavedLink, 
    patterns: ActivityPattern, 
    daysSinceCreated: number, 
    daysSinceLastAccess?: number
  ): number {
    const category = link.category || 'general';
    const threshold = patterns.stalenessThresholds[category] || 30;
    
    let staleness = 0;

    // Time-based staleness
    if (daysSinceCreated > threshold) {
      staleness += 0.4 * Math.min(daysSinceCreated / threshold, 2);
    }

    // Access-based staleness
    if (daysSinceLastAccess !== undefined && daysSinceLastAccess > threshold / 2) {
      staleness += 0.3 * Math.min(daysSinceLastAccess / (threshold / 2), 2);
    }

    // Never accessed penalty
    if (daysSinceLastAccess === undefined && daysSinceCreated > 7) {
      staleness += 0.3;
    }

    // Content preference mismatch
    const domainPreference = patterns.contentPreferences[link.domain] || 0;
    if (domainPreference < 0.2) {
      staleness += 0.2;
    }

    return Math.min(staleness, 1); // Cap at 1.0
  }

  private determineStalenessReason(
    link: SavedLink,
    patterns: ActivityPattern,
    daysSinceCreated: number,
    daysSinceLastAccess?: number
  ): StaleContentItem['reason'] {
    if (daysSinceLastAccess === undefined) {
      return 'never_accessed';
    }

    const category = link.category || 'general';
    const threshold = patterns.stalenessThresholds[category] || 30;

    if (daysSinceCreated > threshold * 1.5) {
      return 'time_based';
    }

    const domainPreference = patterns.contentPreferences[link.domain] || 0;
    if (domainPreference < 0.1) {
      return 'topic_shift';
    }

    return 'time_based';
  }

  private suggestActionForStaleItem(
    link: SavedLink,
    staleness: number,
    reason: StaleContentItem['reason']
  ): StaleContentItem['suggestedAction'] {
    if (staleness > 0.8) {
      return reason === 'duplicate_content' ? 'delete' : 'archive';
    }
    
    if (staleness > 0.6) {
      return 'archive';
    }
    
    if (reason === 'never_accessed') {
      return 'review';
    }
    
    return 'organize';
  }

  private clusterByDomain(links: SavedLink[]): ContentCluster[] {
    const domainGroups: Record<string, SavedLink[]> = {};
    
    links.forEach(link => {
      if (!domainGroups[link.domain]) {
        domainGroups[link.domain] = [];
      }
      domainGroups[link.domain].push(link);
    });

    return Object.entries(domainGroups)
      .filter(([_, links]) => links.length >= 2)
      .map(([domain, links]) => ({
        theme: `${domain} content`,
        links,
        confidence: Math.min(0.8, links.length / 5), // Higher confidence for more links
        suggestedCollectionName: this.formatDomainName(domain),
        suggestedTags: [domain.split('.')[0]]
      }));
  }

  private async clusterByTopics(links: SavedLink[]): Promise<ContentCluster[]> {
    // Group links by existing tags and AI-suggested topics
    const topicGroups: Record<string, SavedLink[]> = {};
    
    for (const link of links) {
      try {
        const tags = await storage.getLinkTags(link.id);
        tags.forEach(tag => {
          if (!topicGroups[tag.name]) {
            topicGroups[tag.name] = [];
          }
          topicGroups[tag.name].push(link);
        });
      } catch (error) {
        // Skip if can't get tags
      }
    }

    return Object.entries(topicGroups)
      .filter(([_, links]) => links.length >= 2)
      .map(([topic, links]) => ({
        theme: `${topic} resources`,
        links,
        confidence: Math.min(0.9, links.length / 4), // High confidence for tag-based clustering
        suggestedCollectionName: this.formatTopicName(topic),
        suggestedTags: [topic]
      }));
  }

  private clusterByTimeAndSimilarity(links: SavedLink[]): ContentCluster[] {
    // Simple time-based clustering for items saved within a few days
    const sortedLinks = [...links].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const clusters: ContentCluster[] = [];
    const used = new Set<string>();

    for (let i = 0; i < sortedLinks.length; i++) {
      if (used.has(sortedLinks[i].id)) continue;

      const baseLink = sortedLinks[i];
      const cluster: SavedLink[] = [baseLink];
      used.add(baseLink.id);

      for (let j = i + 1; j < sortedLinks.length && j < i + 10; j++) {
        if (used.has(sortedLinks[j].id)) continue;

        const daysDiff = this.getDaysDifference(
          new Date(baseLink.createdAt),
          new Date(sortedLinks[j].createdAt)
        );

        if (daysDiff <= 3) { // Saved within 3 days
          cluster.push(sortedLinks[j]);
          used.add(sortedLinks[j].id);
        }
      }

      if (cluster.length >= 2) {
        clusters.push({
          theme: `Recent research session`,
          links: cluster,
          confidence: 0.6,
          suggestedCollectionName: `Research ${new Date(baseLink.createdAt).toLocaleDateString()}`,
          suggestedTags: ['research', 'recent']
        });
      }
    }

    return clusters;
  }

  private deduplicateClusters(clusters: ContentCluster[]): ContentCluster[] {
    const uniqueClusters: ContentCluster[] = [];
    const usedLinks = new Set<string>();

    // Sort by confidence and size
    const sortedClusters = clusters.sort((a, b) => 
      (b.confidence * b.links.length) - (a.confidence * a.links.length)
    );

    for (const cluster of sortedClusters) {
      const clusterLinkIds = cluster.links.map(l => l.id);
      const overlap = clusterLinkIds.filter(id => usedLinks.has(id)).length;
      
      // Only include if less than 50% overlap with existing clusters
      if (overlap < cluster.links.length * 0.5) {
        uniqueClusters.push(cluster);
        clusterLinkIds.forEach(id => usedLinks.add(id));
      }
    }

    return uniqueClusters;
  }

  private calculateReadingScore(link: SavedLink, patterns: ActivityPattern): number {
    let score = 0;

    // Domain preference
    const domainScore = patterns.contentPreferences[link.domain] || 0;
    score += domainScore * 0.4;

    // Category preference
    const category = link.category || 'general';
    const categoryMultiplier = {
      'work': 0.8,
      'learning': 0.9,
      'personal': 0.7,
      'general': 0.6
    }[category] || 0.6;
    score += categoryMultiplier * 0.3;

    // Recency (newer items score higher)
    const daysSinceCreated = this.getDaysDifference(link.createdAt, new Date());
    const recencyScore = Math.max(0, 1 - (daysSinceCreated / 30));
    score += recencyScore * 0.3;

    return score;
  }

  private calculateAverageTimeToRead(links: SavedLink[], readActivities: any[]): number {
    const timesToRead: number[] = [];
    
    readActivities.forEach(activity => {
      const link = links.find(l => l.id === activity.linkId);
      if (link) {
        const daysDiff = this.getDaysDifference(link.createdAt, new Date(activity.createdAt));
        timesToRead.push(daysDiff);
      }
    });

    return timesToRead.length > 0 ? timesToRead.reduce((a, b) => a + b, 0) / timesToRead.length : 7;
  }

  private getDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private formatDomainName(domain: string): string {
    const domainMap: Record<string, string> = {
      'github.com': 'GitHub Projects',
      'stackoverflow.com': 'Stack Overflow Q&A',
      'medium.com': 'Medium Articles',
      'youtube.com': 'YouTube Videos',
      'twitter.com': 'Twitter Posts',
      'linkedin.com': 'LinkedIn Content',
      'reddit.com': 'Reddit Discussions',
      'dev.to': 'Dev Community',
      'hashnode.com': 'Hashnode Posts'
    };

    return domainMap[domain] || `${domain.replace('www.', '').split('.')[0]} Collection`;
  }

  private formatTopicName(topic: string): string {
    return topic.charAt(0).toUpperCase() + topic.slice(1) + ' Resources';
  }

  private getDefaultActivityPattern(): ActivityPattern {
    return {
      userId: 'current_user',
      preferredReadingTimes: [9, 10, 14, 15, 20, 21], // Common work and evening hours
      averageSessionLength: 15,
      contentPreferences: {},
      stalenessThresholds: {
        'general': 30,
        'work': 14,
        'learning': 21,
        'personal': 45,
        'news': 7,
        'reference': 90
      },
      readingVelocity: 2,
      organizationFrequency: 7,
      tagUsagePatterns: {},
      collectionUsagePatterns: {}
    };
  }
}

// Export singleton instance
export const activityAnalyzer = ActivityAnalyzer.getInstance(); 