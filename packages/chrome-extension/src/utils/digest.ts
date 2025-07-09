import { DigestPreferences, DigestContent, DigestSection, SavedLink, Collection, ActivityEvent } from '../types';
import { storage } from './storage';
import { aiService } from './ai';

export class DigestService {
  private static instance: DigestService;
  
  public static getInstance(): DigestService {
    if (!DigestService.instance) {
      DigestService.instance = new DigestService();
    }
    return DigestService.instance;
  }

  // Get user's digest preferences
  async getPreferences(): Promise<DigestPreferences> {
    try {
      const result = await chrome.storage.local.get('digest_preferences');
      return result.digest_preferences || this.getDefaultPreferences();
    } catch (error) {
      console.error('Failed to get digest preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  // Save user's digest preferences
  async savePreferences(preferences: DigestPreferences): Promise<void> {
    try {
      await chrome.storage.local.set({ digest_preferences: preferences });
      
      // Schedule or unschedule digest based on enabled status
      if (preferences.enabled) {
        await this.scheduleDigest(preferences);
      } else {
        await this.unscheduleDigest();
      }
    } catch (error) {
      console.error('Failed to save digest preferences:', error);
      throw error;
    }
  }

  // Get default preferences
  private getDefaultPreferences(): DigestPreferences {
    return {
      enabled: false,
      frequency: 'weekly',
      time: '09:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      includeStats: true,
      includeRecentSaves: true,
      includePopularLinks: true,
      includeSmartCollections: true,
      includeActivitySummary: true,
      maxLinksPerSection: 5
    };
  }

  // Generate digest content for a specific period
  async generateDigest(preferences: DigestPreferences, period?: { start: Date; end: Date }): Promise<DigestContent> {
    try {
      const digestPeriod = period || this.calculatePeriod(preferences.frequency);
      const data = await storage.getData();
      const activityStats = await storage.getActivityStats();
      
      // Generate sections based on preferences
      const sections: DigestSection[] = [];
      
      if (preferences.includeRecentSaves) {
        sections.push(await this.generateRecentSavesSection(data.links, digestPeriod, preferences.maxLinksPerSection));
      }
      
      if (preferences.includePopularLinks) {
        sections.push(await this.generatePopularLinksSection(data.links, digestPeriod, preferences.maxLinksPerSection));
      }
      
      if (preferences.includeSmartCollections) {
        sections.push(await this.generateSmartCollectionsSection(data.smartCollections || [], preferences.maxLinksPerSection));
      }
      
      if (preferences.includeActivitySummary) {
        sections.push(await this.generateActivitySummarySection(digestPeriod));
      }

      // Generate AI insights
      const aiInsights = await this.generateAIInsights(sections, digestPeriod);

      const digest: DigestContent = {
        id: `digest_${Date.now()}`,
        userId: 'current_user', // This would come from auth in a real app
        generatedAt: new Date(),
        period: digestPeriod,
        stats: {
          linksSaved: this.countLinksInPeriod(data.links, digestPeriod),
          linksRead: activityStats.thisWeekActivity, // Approximation
          collectionsCreated: this.countCollectionsInPeriod(data.collections, digestPeriod),
          tagsUsed: await this.countTagsUsedInPeriod(digestPeriod),
          currentStreak: activityStats.currentStreak
        },
        sections,
        aiInsights,
        sent: false
      };

      return digest;
    } catch (error) {
      console.error('Failed to generate digest:', error);
      throw error;
    }
  }

  // Generate recent saves section
  private async generateRecentSavesSection(links: SavedLink[], period: { start: Date; end: Date }, maxLinks: number): Promise<DigestSection> {
    const recentLinks = links
      .filter(link => link.createdAt >= period.start && link.createdAt <= period.end)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, maxLinks);

    let aiSummary = '';
    if (recentLinks.length > 0) {
      try {
        const linkTitles = recentLinks.map(link => link.title).join(', ');
        aiSummary = await aiService.generateText(`Provide a brief, engaging summary of these recently saved links and identify any common themes: ${linkTitles}`, 100);
      } catch (error) {
        console.error('Failed to generate AI summary for recent saves:', error);
      }
    }

    return {
      type: 'recent_saves',
      title: `📚 Recent Saves (${recentLinks.length})`,
      content: recentLinks.map(link => ({
        title: link.title,
        url: link.url,
        domain: link.domain,
        favicon: link.favicon,
        aiSummary: link.aiSummary,
        createdAt: link.createdAt
      })),
      aiSummary
    };
  }

  // Generate popular links section (most read/accessed)
  private async generatePopularLinksSection(links: SavedLink[], period: { start: Date; end: Date }, maxLinks: number): Promise<DigestSection> {
    // For now, we'll use a simple heuristic based on creation date and domain popularity
    // In a real implementation, you'd track actual read counts
    const popularLinks = links
      .filter(link => link.createdAt >= period.start && link.createdAt <= period.end)
      .sort((a, b) => {
        // Simple popularity scoring based on domain and recency
        const aScore = this.calculatePopularityScore(a);
        const bScore = this.calculatePopularityScore(b);
        return bScore - aScore;
      })
      .slice(0, maxLinks);

    let aiSummary = '';
    if (popularLinks.length > 0) {
      try {
        const domains = [...new Set(popularLinks.map(link => link.domain))];
        aiSummary = await aiService.generateText(`Analyze these popular domains and explain why they might be trending: ${domains.join(', ')}`, 100);
      } catch (error) {
        console.error('Failed to generate AI summary for popular links:', error);
      }
    }

    return {
      type: 'popular_links',
      title: `🔥 Trending Links (${popularLinks.length})`,
      content: popularLinks.map(link => ({
        title: link.title,
        url: link.url,
        domain: link.domain,
        favicon: link.favicon,
        aiSummary: link.aiSummary,
        popularityScore: this.calculatePopularityScore(link)
      })),
      aiSummary
    };
  }

  // Generate smart collections section
  private async generateSmartCollectionsSection(smartCollections: any[], maxCollections: number): Promise<DigestSection> {
    const activeCollections = smartCollections
      .filter(collection => collection.autoUpdate)
      .slice(0, maxCollections);

    let aiSummary = '';
    if (activeCollections.length > 0) {
      try {
        const collectionNames = activeCollections.map(col => col.name).join(', ');
        aiSummary = await aiService.generateText(`Explain how these smart collections can help organize knowledge: ${collectionNames}`, 100);
      } catch (error) {
        console.error('Failed to generate AI summary for smart collections:', error);
      }
    }

    return {
      type: 'smart_collections',
      title: `✨ Smart Collections (${activeCollections.length})`,
      content: activeCollections.map(collection => ({
        name: collection.name,
        description: collection.description,
        icon: collection.icon,
        linkCount: 0 // This would be calculated in a real implementation
      })),
      aiSummary
    };
  }

  // Generate activity summary section
  private async generateActivitySummarySection(period: { start: Date; end: Date }): Promise<DigestSection> {
    try {
      const activities = await storage.getActivities(period.start, period.end);
      const activityStats = await storage.getActivityStats();
      
      const summary = {
        totalActivities: activities.length,
        saveActivities: activities.filter(a => a.type === 'save').length,
        readActivities: activities.filter(a => a.type === 'read').length,
        organizeActivities: activities.filter(a => a.type === 'organize').length,
        currentStreak: activityStats.currentStreak,
        longestStreak: activityStats.longestStreak
      };

      let aiSummary = '';
      try {
        aiSummary = await aiService.generateText(`Provide encouraging insights about this activity pattern: ${summary.saveActivities} saves, ${summary.readActivities} reads, ${summary.organizeActivities} organizes, ${summary.currentStreak} day streak`, 100);
      } catch (error) {
        console.error('Failed to generate AI summary for activity:', error);
      }

      return {
        type: 'activity_summary',
        title: `📊 Your Activity (${summary.totalActivities} actions)`,
        content: [summary],
        aiSummary
      };
    } catch (error) {
      console.error('Failed to generate activity summary:', error);
      return {
        type: 'activity_summary',
        title: '📊 Your Activity',
        content: [],
        aiSummary: 'Activity tracking data unavailable.'
      };
    }
  }

  // Generate AI insights for the entire digest
  private async generateAIInsights(sections: DigestSection[], period: { start: Date; end: Date }): Promise<string> {
    try {
      const sectionSummaries = sections
        .filter(section => section.aiSummary)
        .map(section => `${section.title}: ${section.aiSummary}`)
        .join('\n');

      if (!sectionSummaries) {
        return 'Keep up the great work building your knowledge collection!';
      }

      return await aiService.generateText(
        `Based on these sections from a user's knowledge digest, provide personalized insights and suggestions for improvement:\n${sectionSummaries}`,
        200
      );
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      return 'Continue exploring and saving valuable content to build your personal knowledge base!';
    }
  }

  // Helper methods
  private calculatePeriod(frequency: 'daily' | 'weekly' | 'monthly'): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (frequency) {
      case 'daily':
        start.setDate(start.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start.setDate(start.getDate() - 30);
        break;
    }

    return { start, end };
  }

  private calculatePopularityScore(link: SavedLink): number {
    // Simple popularity scoring algorithm
    let score = 0;
    
    // Recency bonus
    const daysSinceCreated = (Date.now() - link.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 7 - daysSinceCreated) * 2;
    
    // Domain popularity (simplified)
    const popularDomains = ['github.com', 'stackoverflow.com', 'medium.com', 'dev.to', 'hackernews.com'];
    if (popularDomains.includes(link.domain)) {
      score += 5;
    }
    
    // Has AI summary bonus
    if (link.aiSummary) {
      score += 3;
    }
    
    // Has user note bonus
    if (link.userNote) {
      score += 2;
    }

    return score;
  }

  private countLinksInPeriod(links: SavedLink[], period: { start: Date; end: Date }): number {
    return links.filter(link => link.createdAt >= period.start && link.createdAt <= period.end).length;
  }

  private countCollectionsInPeriod(collections: Collection[], period: { start: Date; end: Date }): number {
    return collections.filter(collection => collection.createdAt >= period.start && collection.createdAt <= period.end).length;
  }

  private async countTagsUsedInPeriod(period: { start: Date; end: Date }): Promise<number> {
    try {
      const activities = await storage.getActivities(period.start, period.end);
      const tagActivities = activities.filter(activity => 
        activity.metadata && activity.metadata.tags && activity.metadata.tags.length > 0
      );
      const uniqueTags = new Set();
      tagActivities.forEach(activity => {
        activity.metadata.tags.forEach((tag: string) => uniqueTags.add(tag));
      });
      return uniqueTags.size;
    } catch (error) {
      console.error('Failed to count tags used in period:', error);
      return 0;
    }
  }

  // Email generation and sending
  async generateEmailHTML(digest: DigestContent): Promise<string> {
    const { period, stats, sections, aiInsights } = digest;
    const periodText = this.formatPeriod(period);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Nest Digest</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; background: white; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; text-align: center; }
          .header h1 { margin: 0; font-size: 2rem; }
          .header p { margin: 0.5rem 0 0; opacity: 0.9; }
          .content { padding: 2rem; }
          .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
          .stat { background: #f8fafc; padding: 1rem; border-radius: 8px; text-align: center; }
          .stat-number { font-size: 1.5rem; font-weight: bold; color: #667eea; }
          .stat-label { font-size: 0.875rem; color: #64748b; margin-top: 0.25rem; }
          .section { margin-bottom: 2rem; }
          .section-title { font-size: 1.25rem; font-weight: bold; margin-bottom: 1rem; color: #1e293b; }
          .link-item { display: flex; gap: 1rem; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 1rem; }
          .link-favicon { width: 24px; height: 24px; border-radius: 4px; flex-shrink: 0; }
          .link-content { flex: 1; }
          .link-title { font-weight: 600; color: #1e293b; text-decoration: none; }
          .link-title:hover { color: #667eea; }
          .link-domain { font-size: 0.875rem; color: #64748b; margin-top: 0.25rem; }
          .link-summary { font-size: 0.875rem; color: #475569; margin-top: 0.5rem; }
          .ai-insights { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 1.5rem; border-radius: 12px; margin: 2rem 0; }
          .ai-insights h3 { margin: 0 0 1rem; color: #0369a1; }
          .ai-insights p { margin: 0; }
          .footer { background: #f8fafc; padding: 2rem; text-align: center; color: #64748b; font-size: 0.875rem; }
          .button { display: inline-block; background: #667eea; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 Your Nest Digest</h1>
            <p>${periodText}</p>
          </div>
          
          <div class="content">
            <div class="stats">
              <div class="stat">
                <div class="stat-number">${stats.linksSaved}</div>
                <div class="stat-label">Links Saved</div>
              </div>
              <div class="stat">
                <div class="stat-number">${stats.linksRead}</div>
                <div class="stat-label">Links Read</div>
              </div>
              <div class="stat">
                <div class="stat-number">${stats.collectionsCreated}</div>
                <div class="stat-label">Collections</div>
              </div>
              <div class="stat">
                <div class="stat-number">${stats.currentStreak}</div>
                <div class="stat-label">Day Streak</div>
              </div>
            </div>
    `;

    // Add sections
    for (const section of sections) {
      html += this.generateSectionHTML(section);
    }

    // Add AI insights
    if (aiInsights) {
      html += `
        <div class="ai-insights">
          <h3>✨ AI Insights</h3>
          <p>${aiInsights}</p>
        </div>
      `;
    }

    html += `
            <div style="text-align: center; margin: 2rem 0;">
              <a href="chrome-extension://nest" class="button">Open Nest</a>
            </div>
          </div>
          
          <div class="footer">
            <p>This digest was generated by Nest - Your Smart Bookmarking Assistant</p>
            <p>You can adjust your digest preferences in the Nest settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  private generateSectionHTML(section: DigestSection): string {
    let html = `<div class="section"><h2 class="section-title">${section.title}</h2>`;

    if (section.type === 'recent_saves' || section.type === 'popular_links') {
      for (const item of section.content) {
        html += `
          <div class="link-item">
            <img src="${item.favicon || `https://www.google.com/s2/favicons?domain=${item.domain}&sz=24`}" alt="" class="link-favicon">
            <div class="link-content">
              <a href="${item.url}" class="link-title" target="_blank">${item.title}</a>
              <div class="link-domain">${item.domain}</div>
              ${item.aiSummary ? `<div class="link-summary">${item.aiSummary}</div>` : ''}
            </div>
          </div>
        `;
      }
    } else if (section.type === 'smart_collections') {
      for (const collection of section.content) {
        html += `
          <div class="link-item">
            <div style="font-size: 1.5rem; width: 24px; text-align: center;">${collection.icon || '📁'}</div>
            <div class="link-content">
              <div class="link-title">${collection.name}</div>
              <div class="link-summary">${collection.description}</div>
            </div>
          </div>
        `;
      }
    } else if (section.type === 'activity_summary') {
      const summary = section.content[0];
      if (summary) {
        html += `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 1rem;">
            <div class="stat">
              <div class="stat-number">${summary.saveActivities}</div>
              <div class="stat-label">Saves</div>
            </div>
            <div class="stat">
              <div class="stat-number">${summary.readActivities}</div>
              <div class="stat-label">Reads</div>
            </div>
            <div class="stat">
              <div class="stat-number">${summary.organizeActivities}</div>
              <div class="stat-label">Organizes</div>
            </div>
            <div class="stat">
              <div class="stat-number">${summary.currentStreak}</div>
              <div class="stat-label">Day Streak</div>
            </div>
          </div>
        `;
      }
    }

    if (section.aiSummary) {
      html += `<div style="background: #f1f5f9; padding: 1rem; border-radius: 8px; margin-top: 1rem; font-style: italic;">${section.aiSummary}</div>`;
    }

    html += '</div>';
    return html;
  }

  private formatPeriod(period: { start: Date; end: Date }): string {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric',
      year: period.start.getFullYear() !== period.end.getFullYear() ? 'numeric' : undefined
    };
    
    const startStr = period.start.toLocaleDateString('en-US', options);
    const endStr = period.end.toLocaleDateString('en-US', options);
    
    return `${startStr} - ${endStr}`;
  }

  // Scheduling methods (simplified for Chrome extension)
  async scheduleDigest(preferences: DigestPreferences): Promise<void> {
    try {
      // Store schedule info for background script to handle
      await chrome.storage.local.set({
        digest_schedule: {
          enabled: true,
          frequency: preferences.frequency,
          time: preferences.time,
          timezone: preferences.timezone,
          lastSent: null,
          nextSend: this.calculateNextSendTime(preferences)
        }
      });
    } catch (error) {
      console.error('Failed to schedule digest:', error);
    }
  }

  async unscheduleDigest(): Promise<void> {
    try {
      await chrome.storage.local.set({
        digest_schedule: {
          enabled: false
        }
      });
    } catch (error) {
      console.error('Failed to unschedule digest:', error);
    }
  }

  private calculateNextSendTime(preferences: DigestPreferences): Date {
    const now = new Date();
    const [hours, minutes] = preferences.time.split(':').map(Number);
    
    const nextSend = new Date();
    nextSend.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, schedule for next period
    if (nextSend <= now) {
      switch (preferences.frequency) {
        case 'daily':
          nextSend.setDate(nextSend.getDate() + 1);
          break;
        case 'weekly':
          nextSend.setDate(nextSend.getDate() + 7);
          break;
        case 'monthly':
          nextSend.setMonth(nextSend.getMonth() + 1);
          break;
      }
    }
    
    return nextSend;
  }

  // Preview digest (for settings)
  async generatePreview(): Promise<DigestContent> {
    const preferences = await this.getPreferences();
    return this.generateDigest(preferences);
  }
}

export const digest = DigestService.getInstance(); 