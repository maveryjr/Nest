import { ReadingAnalytics, SavedLink, Highlight } from '../types';

export class AnalyticsService {
  private static instance: AnalyticsService;
  
  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  async trackLinkRead(link: SavedLink): Promise<void> {
    const today = this.getTodayString();
    const analytics = await this.getTodayAnalytics();
    
    analytics.linksRead++;
    analytics.timeSpent += this.estimateReadingTime(link.title + ' ' + (link.description || ''));
    
    // Extract and track topics
    const topics = this.extractTopicsFromContent(link.title + ' ' + (link.description || ''));
    topics.forEach(topic => {
      if (!analytics.topicsExplored.includes(topic)) {
        analytics.topicsExplored.push(topic);
      }
    });

    // Track access time
    const hour = new Date().getHours();
    if (!analytics.mostActiveHours.includes(hour)) {
      analytics.mostActiveHours.push(hour);
    }

    await this.saveAnalytics(analytics);
    await this.updateReadingStreak();
  }

  async trackHighlightMade(highlight: Highlight): Promise<void> {
    const analytics = await this.getTodayAnalytics();
    
    analytics.highlightsMade++;
    
    // Track topics from highlight
    const topics = this.extractTopicsFromContent(highlight.text);
    topics.forEach(topic => {
      if (!analytics.topicsExplored.includes(topic)) {
        analytics.topicsExplored.push(topic);
      }
    });

    await this.saveAnalytics(analytics);
  }

  async getWeeklyAnalytics(): Promise<ReadingAnalytics[]> {
    try {
      const result = await chrome.storage.local.get('nest_analytics');
      const allAnalytics: ReadingAnalytics[] = result.nest_analytics || [];
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      return allAnalytics.filter(analytics => 
        new Date(analytics.date) >= oneWeekAgo
      );
    } catch (error) {
      console.error('Error getting weekly analytics:', error);
      return [];
    }
  }

  async getMonthlyAnalytics(): Promise<ReadingAnalytics[]> {
    try {
      const result = await chrome.storage.local.get('nest_analytics');
      const allAnalytics: ReadingAnalytics[] = result.nest_analytics || [];
      
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      return allAnalytics.filter(analytics => 
        new Date(analytics.date) >= oneMonthAgo
      );
    } catch (error) {
      console.error('Error getting monthly analytics:', error);
      return [];
    }
  }

  async calculateInsights(): Promise<{
    totalItems: number;
    averageDaily: number;
    mostActiveDay: string;
    topTopics: string[];
    readingStreak: number;
    knowledgeGrowth: number;
    peakHours: number[];
  }> {
    const weeklyAnalytics = await this.getWeeklyAnalytics();
    const monthlyAnalytics = await this.getMonthlyAnalytics();

    const totalItems = weeklyAnalytics.reduce((sum, day) => 
      sum + day.linksRead + day.highlightsMade, 0
    );

    const averageDaily = weeklyAnalytics.length > 0 ? totalItems / weeklyAnalytics.length : 0;

    const mostActiveDay = this.findMostActiveDay(weeklyAnalytics);
    const topTopics = this.findTopTopics(monthlyAnalytics);
    const readingStreak = await this.getCurrentReadingStreak();
    const knowledgeGrowth = this.calculateKnowledgeGrowth(monthlyAnalytics);
    const peakHours = this.findPeakHours(weeklyAnalytics);

    return {
      totalItems,
      averageDaily,
      mostActiveDay,
      topTopics,
      readingStreak,
      knowledgeGrowth,
      peakHours
    };
  }

  private async getTodayAnalytics(): Promise<ReadingAnalytics> {
    const today = this.getTodayString();
    
    try {
      const result = await chrome.storage.local.get('nest_analytics');
      const allAnalytics: ReadingAnalytics[] = result.nest_analytics || [];
      
      let todayAnalytics = allAnalytics.find(analytics => analytics.date === today);
      
      if (!todayAnalytics) {
        todayAnalytics = {
          id: `analytics-${today}`,
          userId: 'local', // Will be updated when user auth is available
          date: today,
          linksRead: 0,
          highlightsMade: 0,
          timeSpent: 0,
          topicsExplored: [],
          mostActiveHours: [],
          readingStreak: 0,
          knowledgeGrowthScore: 0
        };
      }
      
      return todayAnalytics;
    } catch (error) {
      console.error('Error getting today analytics:', error);
      return {
        id: `analytics-${today}`,
        userId: 'local',
        date: today,
        linksRead: 0,
        highlightsMade: 0,
        timeSpent: 0,
        topicsExplored: [],
        mostActiveHours: [],
        readingStreak: 0,
        knowledgeGrowthScore: 0
      };
    }
  }

  private async saveAnalytics(analytics: ReadingAnalytics): Promise<void> {
    try {
      const result = await chrome.storage.local.get('nest_analytics');
      const allAnalytics: ReadingAnalytics[] = result.nest_analytics || [];
      
      const existingIndex = allAnalytics.findIndex(a => a.date === analytics.date);
      
      if (existingIndex >= 0) {
        allAnalytics[existingIndex] = analytics;
      } else {
        allAnalytics.push(analytics);
      }
      
      // Keep only last 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      const recentAnalytics = allAnalytics.filter(a => 
        new Date(a.date) >= cutoffDate
      );
      
      await chrome.storage.local.set({ nest_analytics: recentAnalytics });
    } catch (error) {
      console.error('Error saving analytics:', error);
    }
  }

  private async updateReadingStreak(): Promise<void> {
    const analytics = await this.getWeeklyAnalytics();
    analytics.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let streak = 0;
    let currentDate = new Date();
    
    for (let i = analytics.length - 1; i >= 0; i--) {
      const analyticsDate = new Date(analytics[i].date);
      const daysDiff = Math.floor((currentDate.getTime() - analyticsDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak && (analytics[i].linksRead > 0 || analytics[i].highlightsMade > 0)) {
        streak++;
        currentDate = analyticsDate;
      } else {
        break;
      }
    }
    
    // Update today's analytics with current streak
    const todayAnalytics = await this.getTodayAnalytics();
    todayAnalytics.readingStreak = streak;
    await this.saveAnalytics(todayAnalytics);
  }

  private getCurrentReadingStreak(): Promise<number> {
    return this.getTodayAnalytics().then(analytics => analytics.readingStreak);
  }

  private estimateReadingTime(text: string): number {
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  private extractTopicsFromContent(content: string): string[] {
    // Simple keyword extraction - can be enhanced with AI
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 4)
      .filter(word => !this.isStopWord(word));
    
    const wordCounts = new Map<string, number>();
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
    
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 
      'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 
      'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 
      'did', 'end', 'few', 'got', 'let', 'man', 'put', 'run', 'say', 'she', 
      'too', 'use', 'way', 'why', 'your', 'that', 'with', 'have', 'this', 
      'will', 'been', 'from', 'they', 'know', 'want', 'were', 'what', 'when', 
      'where', 'said', 'each', 'which', 'their', 'time', 'would', 'there'
    ]);
    return stopWords.has(word);
  }

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private findMostActiveDay(analytics: ReadingAnalytics[]): string {
    if (analytics.length === 0) return 'N/A';
    
    const mostActive = analytics.reduce((max, current) => 
      (current.linksRead + current.highlightsMade) > (max.linksRead + max.highlightsMade) 
        ? current : max
    );
    
    return new Date(mostActive.date).toLocaleDateString();
  }

  private findTopTopics(analytics: ReadingAnalytics[]): string[] {
    const topicCounts = new Map<string, number>();
    
    analytics.forEach(day => {
      day.topicsExplored.forEach(topic => {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      });
    });
    
    return Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  private calculateKnowledgeGrowth(analytics: ReadingAnalytics[]): number {
    if (analytics.length < 2) return 0;
    
    const sorted = analytics.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const recent = sorted.slice(-7);
    const older = sorted.slice(-14, -7);
    
    const recentScore = recent.reduce((sum, day) => sum + day.linksRead + day.highlightsMade, 0);
    const olderScore = older.reduce((sum, day) => sum + day.linksRead + day.highlightsMade, 0);
    
    if (olderScore === 0) return recentScore > 0 ? 100 : 0;
    return Math.round(((recentScore - olderScore) / olderScore) * 100);
  }

  private findPeakHours(analytics: ReadingAnalytics[]): number[] {
    const hourCounts = new Map<number, number>();
    
    analytics.forEach(day => {
      day.mostActiveHours.forEach(hour => {
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      });
    });
    
    return Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);
  }
} 