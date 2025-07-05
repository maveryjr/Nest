// AI utility functions for summarization, tagging, and categorization
import { AITagSuggestion, AICategorySuggestion, AIAnalysisResult } from '../types';

export interface AIConfig {
  apiKey?: string;
  model?: string;
}

export class AIService {
  private apiKey: string;
  private model: string;

  constructor(config: AIConfig = {}) {
    this.apiKey = config.apiKey || '';
    this.model = config.model || 'gpt-3.5-turbo';
  }

  /**
   * Perform comprehensive AI analysis of content
   */
  async analyzeContent(content: string, title: string, url: string): Promise<AIAnalysisResult> {
    if (!this.apiKey) {
      return this.generateRuleBasedAnalysis(content, title, url);
    }

    try {
      const response = await this.callOpenAIForAnalysis(content, title, url);
      return response;
    } catch (error) {
      console.error('AI analysis failed, falling back to rule-based:', error);
      return this.generateRuleBasedAnalysis(content, title, url);
    }
  }

  /**
   * Generate summary (existing functionality)
   */
  async generateSummary(content: string, title: string, url: string): Promise<string> {
    if (!this.apiKey) {
      return this.generatePlaceholderSummary(content, title, url);
    }

    try {
      const response = await this.callOpenAI(content, title, url);
      return response;
    } catch (error) {
      console.error('AI summary generation failed:', error);
      return this.generatePlaceholderSummary(content, title, url);
    }
  }

  /**
   * Rule-based content analysis with intelligent tag and category suggestions
   */
  private generateRuleBasedAnalysis(content: string, title: string, url: string): AIAnalysisResult {
    const domain = new URL(url).hostname;
    const contentLower = content.toLowerCase();
    const titleLower = title.toLowerCase();
    const fullText = `${titleLower} ${contentLower}`;

    // Analyze content type
    const contentType = this.detectContentType(domain, title, content);
    
    // Generate tag suggestions based on content analysis
    const tagSuggestions = this.generateRuleBasedTags(fullText, domain, contentType);
    
    // Generate category suggestions
    const categorySuggestions = this.generateRuleBasedCategories(fullText, domain, contentType);
    
    // Extract main topics
    const topics = this.extractTopics(fullText);
    
    // Estimate complexity and reading time
    const complexity = this.estimateComplexity(content);
    const readingTime = this.estimateReadingTime(content);

    return {
      summary: this.generatePlaceholderSummary(content, title, url),
      tagSuggestions,
      categorySuggestions,
      contentType,
      topics,
      complexity,
      readingTime
    };
  }

  /**
   * Detect content type based on domain and content
   */
  private detectContentType(domain: string, title: string, content: string): AIAnalysisResult['contentType'] {
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();

    // Video platforms
    if (domain.includes('youtube.com') || domain.includes('vimeo.com') || domain.includes('twitch.tv')) {
      return 'video';
    }

    // Documentation sites
    if (domain.includes('docs.') || titleLower.includes('documentation') || 
        contentLower.includes('api reference') || contentLower.includes('getting started')) {
      return 'documentation';
    }

    // Tutorial indicators
    if (titleLower.includes('tutorial') || titleLower.includes('how to') || 
        titleLower.includes('guide') || contentLower.includes('step by step')) {
      return 'tutorial';
    }

    // News sites
    if (domain.includes('news') || domain.includes('cnn.com') || domain.includes('bbc.com') ||
        domain.includes('techcrunch.com') || domain.includes('reuters.com')) {
      return 'news';
    }

    // Blog indicators
    if (domain.includes('medium.com') || domain.includes('blog') || 
        titleLower.includes('thoughts on') || contentLower.includes('published')) {
      return 'blog';
    }

    // Research papers
    if (domain.includes('arxiv.org') || domain.includes('scholar.google') ||
        titleLower.includes('research') || contentLower.includes('abstract')) {
      return 'research';
    }

    // Tools and applications
    if (domain.includes('github.com') || titleLower.includes('tool') || 
        titleLower.includes('app') || contentLower.includes('download')) {
      return 'tool';
    }

    // Reference materials
    if (titleLower.includes('reference') || titleLower.includes('cheat sheet') ||
        contentLower.includes('quick reference')) {
      return 'reference';
    }

    // Default to article
    return 'article';
  }

  /**
   * Generate intelligent tag suggestions using rule-based analysis
   */
  private generateRuleBasedTags(fullText: string, domain: string, contentType: string): AITagSuggestion[] {
    const suggestions: AITagSuggestion[] = [];

    // Technology tags
    const techKeywords = {
      'javascript': ['javascript', 'js', 'node.js', 'react', 'vue', 'angular'],
      'python': ['python', 'django', 'flask', 'pandas', 'numpy'],
      'web-development': ['html', 'css', 'frontend', 'backend', 'full-stack'],
      'machine-learning': ['ml', 'ai', 'neural network', 'deep learning', 'tensorflow'],
      'data-science': ['data science', 'analytics', 'visualization', 'statistics'],
      'mobile': ['android', 'ios', 'react native', 'flutter', 'mobile app'],
      'devops': ['docker', 'kubernetes', 'aws', 'cloud', 'deployment'],
      'database': ['sql', 'postgresql', 'mongodb', 'database design'],
      'security': ['cybersecurity', 'encryption', 'vulnerability', 'penetration testing']
    };

    // Industry/domain tags
    const domainTags = {
      'github.com': [{ tag: 'github', confidence: 0.9, reason: 'GitHub repository' }],
      'stackoverflow.com': [{ tag: 'programming', confidence: 0.8, reason: 'Stack Overflow content' }],
      'medium.com': [{ tag: 'blog', confidence: 0.7, reason: 'Medium article' }],
      'youtube.com': [{ tag: 'video', confidence: 0.9, reason: 'YouTube video' }],
      'linkedin.com': [{ tag: 'career', confidence: 0.7, reason: 'LinkedIn content' }]
    };

    // Add domain-specific tags
    for (const [domainPattern, tags] of Object.entries(domainTags)) {
      if (domain.includes(domainPattern)) {
        suggestions.push(...tags);
      }
    }

    // Add technology tags based on content analysis
    for (const [tag, keywords] of Object.entries(techKeywords)) {
      const matches = keywords.filter(keyword => fullText.includes(keyword)).length;
      if (matches > 0) {
        const confidence = Math.min(0.9, 0.4 + (matches * 0.1));
        suggestions.push({
          tag,
          confidence,
          reason: `Found ${matches} related keyword(s)`
        });
      }
    }

    // Content-type specific tags
    suggestions.push({
      tag: contentType || 'general',
      confidence: 0.6,
      reason: `Detected as ${contentType} content`
    });

    // Learning and skill level tags
    if (fullText.includes('beginner') || fullText.includes('getting started')) {
      suggestions.push({ tag: 'beginner', confidence: 0.7, reason: 'Beginner-friendly content' });
    }
    if (fullText.includes('advanced') || fullText.includes('expert')) {
      suggestions.push({ tag: 'advanced', confidence: 0.7, reason: 'Advanced content' });
    }

    // Business and productivity tags
    const businessKeywords = ['productivity', 'business', 'startup', 'marketing', 'sales', 'finance'];
    for (const keyword of businessKeywords) {
      if (fullText.includes(keyword)) {
        suggestions.push({
          tag: keyword,
          confidence: 0.6,
          reason: `Content related to ${keyword}`
        });
      }
    }

    // Remove duplicates and sort by confidence
    const uniqueSuggestions = suggestions.filter((item, index, arr) => 
      arr.findIndex(t => t.tag === item.tag) === index
    );

    return uniqueSuggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8); // Limit to top 8 suggestions
  }

  /**
   * Generate category suggestions
   */
  private generateRuleBasedCategories(fullText: string, domain: string, contentType: string): AICategorySuggestion[] {
    const suggestions: AICategorySuggestion[] = [];

    // Work-related keywords
    if (fullText.includes('work') || fullText.includes('job') || fullText.includes('career') ||
        fullText.includes('professional') || fullText.includes('business')) {
      suggestions.push({
        category: 'work',
        confidence: 0.8,
        reason: 'Contains work-related content'
      });
    }

    // Learning and education
    if (contentType === 'tutorial' || contentType === 'documentation' || 
        fullText.includes('learn') || fullText.includes('education') || fullText.includes('course')) {
      suggestions.push({
        category: 'learning',
        confidence: 0.9,
        reason: 'Educational content detected'
      });
    }

    // Personal interests
    if (fullText.includes('hobby') || fullText.includes('personal') || 
        fullText.includes('lifestyle') || fullText.includes('entertainment')) {
      suggestions.push({
        category: 'personal',
        confidence: 0.7,
        reason: 'Personal interest content'
      });
    }

    // Technology and development
    if (domain.includes('github.com') || domain.includes('stackoverflow.com') ||
        fullText.includes('programming') || fullText.includes('development')) {
      suggestions.push({
        category: 'work',
        confidence: 0.8,
        reason: 'Technical/development content'
      });
    }

    // News and current events
    if (contentType === 'news' || fullText.includes('breaking') || fullText.includes('update')) {
      suggestions.push({
        category: 'general',
        confidence: 0.7,
        reason: 'News or current events'
      });
    }

    // Default category if no specific matches
    if (suggestions.length === 0) {
      suggestions.push({
        category: 'general',
        confidence: 0.5,
        reason: 'General content'
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extract main topics from content
   */
  private extractTopics(fullText: string): string[] {
    const commonTopics = [
      'artificial intelligence', 'machine learning', 'web development', 'mobile development',
      'data science', 'cybersecurity', 'cloud computing', 'blockchain', 'cryptocurrency',
      'startup', 'productivity', 'leadership', 'design', 'marketing', 'sales',
      'programming', 'software engineering', 'devops', 'database', 'frontend',
      'backend', 'full-stack', 'api', 'microservices', 'architecture'
    ];

    return commonTopics.filter(topic => fullText.includes(topic)).slice(0, 5);
  }

  /**
   * Estimate content complexity
   */
  private estimateComplexity(content: string): 'beginner' | 'intermediate' | 'advanced' {
    const techTerms = ['algorithm', 'architecture', 'optimization', 'scalability', 'performance'];
    const beginnerTerms = ['introduction', 'basics', 'getting started', 'beginner', 'simple'];
    const advancedTerms = ['advanced', 'expert', 'complex', 'sophisticated', 'enterprise'];

    const contentLower = content.toLowerCase();
    const techScore = techTerms.filter(term => contentLower.includes(term)).length;
    const beginnerScore = beginnerTerms.filter(term => contentLower.includes(term)).length;
    const advancedScore = advancedTerms.filter(term => contentLower.includes(term)).length;

    if (beginnerScore > 0 || techScore === 0) return 'beginner';
    if (advancedScore > 1 || techScore > 3) return 'advanced';
    return 'intermediate';
  }

  /**
   * Estimate reading time in minutes
   */
  private estimateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.max(1, Math.round(wordCount / wordsPerMinute));
  }

  /**
   * Enhanced OpenAI call for comprehensive analysis
   */
  private async callOpenAIForAnalysis(content: string, title: string, url: string): Promise<AIAnalysisResult> {
    const prompt = `Analyze this web content and provide a JSON response with the following structure:

{
  "summary": "1-2 sentence summary",
  "tagSuggestions": [
    {"tag": "tag-name", "confidence": 0.8, "reason": "why this tag fits"}
  ],
  "categorySuggestions": [
    {"category": "work|learning|personal|general", "confidence": 0.9, "reason": "explanation"}
  ],
  "contentType": "article|tutorial|documentation|video|tool|reference|blog|news|research|other",
  "topics": ["main", "topics", "covered"],
  "complexity": "beginner|intermediate|advanced",
  "readingTime": 5
}

Content to analyze:
Title: ${title}
URL: ${url}
Content: ${content.substring(0, 2000)}...

Focus on:
- Relevant, specific tags (technology, skills, domains)
- Appropriate category (work/learning/personal/general)
- Content type and complexity
- Main topics and themes`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      })
    });

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (aiResponse) {
      try {
        const parsed = JSON.parse(aiResponse);
        return {
          summary: parsed.summary,
          tagSuggestions: parsed.tagSuggestions || [],
          categorySuggestions: parsed.categorySuggestions || [],
          contentType: parsed.contentType,
          topics: parsed.topics || [],
          complexity: parsed.complexity,
          readingTime: parsed.readingTime
        };
      } catch (error) {
        console.error('Failed to parse AI response:', error);
      }
    }

    // Fallback to rule-based analysis
    return this.generateRuleBasedAnalysis(content, title, url);
  }

  /**
   * Original OpenAI call for summary only (maintaining backward compatibility)
   */
  private async callOpenAI(content: string, title: string, url: string): Promise<string> {
    const prompt = `Summarize this web page in 1-2 sentences:
Title: ${title}
URL: ${url}
Content: ${content.substring(0, 1000)}...`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.3
      })
    });

    const data = await response.json();
    return data.choices[0]?.message?.content || this.generatePlaceholderSummary(content, title, url);
  }

  private generatePlaceholderSummary(content: string, title: string, url: string): string {
    const domain = new URL(url).hostname;
    const contentLength = content.length;
    
    // Generate a simple rule-based summary
    if (domain.includes('github.com')) {
      return `GitHub repository or project page: ${title}`;
    } else if (domain.includes('stackoverflow.com')) {
      return `Stack Overflow discussion about programming or technical topics`;
    } else if (domain.includes('medium.com') || domain.includes('blog')) {
      return `Blog article: ${title.substring(0, 50)}...`;
    } else if (domain.includes('youtube.com')) {
      return `Video content: ${title}`;
    } else if (domain.includes('news') || domain.includes('article')) {
      return `News article from ${domain}`;
    } else {
      return `Web page from ${domain} (${Math.round(contentLength / 100)} paragraphs)`;
    }
  }

  updateApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Generate smart collection queries based on user's link patterns
   */
  async generateSmartCollectionSuggestions(links: SavedLink[]): Promise<SmartCollection[]> {
    // Analyze user's link patterns to suggest smart collections
    const domainAnalysis = this.analyzeDomains(links);
    const topicAnalysis = this.analyzeTopics(links);
    const timeAnalysis = this.analyzeTimePatterns(links);
    
    const suggestions: SmartCollection[] = [];
    const now = new Date();

    // Domain-based collections
    for (const [domain, count] of Object.entries(domainAnalysis)) {
      if (count >= 3) { // Minimum threshold for suggesting domain collection
        suggestions.push({
          id: `domain-${domain.replace(/\./g, '-')}`,
          name: `📌 ${this.getDomainDisplayName(domain)}`,
          description: `Links from ${domain} (${count} links)`,
          query: `domain LIKE '%${domain}%'`,
          isSystem: true,
          autoUpdate: true,
          icon: this.getDomainIcon(domain),
          color: this.getDomainColor(domain),
          filters: {
            domains: [domain]
          },
          createdAt: now,
          updatedAt: now
        });
      }
    }

    // Topic-based collections
    for (const [topic, count] of Object.entries(topicAnalysis)) {
      if (count >= 2) {
        suggestions.push({
          id: `topic-${topic.toLowerCase().replace(/\s+/g, '-')}`,
          name: `🎯 ${topic}`,
          description: `Content related to ${topic.toLowerCase()} (${count} links)`,
          query: `title ILIKE '%${topic}%' OR user_note ILIKE '%${topic}%' OR ai_summary ILIKE '%${topic}%'`,
          isSystem: true,
          autoUpdate: true,
          icon: this.getTopicIcon(topic),
          color: this.getTopicColor(topic),
          createdAt: now,
          updatedAt: now
        });
      }
    }

    // Time-based collections
    if (timeAnalysis.recentActivity > 5) {
      suggestions.push({
        id: 'recent-activity',
        name: '🔥 Recent Activity',
        description: 'Links saved in the last 3 days',
        query: 'created_at >= now() - interval \'3 days\'',
        isSystem: true,
        autoUpdate: true,
        icon: '🔥',
        color: '#ef4444',
        filters: {
          dateRange: {
            start: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          }
        },
        createdAt: now,
        updatedAt: now
      });
    }

    return suggestions.slice(0, 8); // Limit suggestions
  }

  /**
   * Analyze domains in user's links
   */
  private analyzeDomains(links: SavedLink[]): Record<string, number> {
    const domainCounts: Record<string, number> = {};
    
    links.forEach(link => {
      const domain = link.domain;
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    });

    // Sort by count and return top domains
    return Object.fromEntries(
      Object.entries(domainCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
    );
  }

  /**
   * Analyze topics in user's links
   */
  private analyzeTopics(links: SavedLink[]): Record<string, number> {
    const topicCounts: Record<string, number> = {};
    const commonTopics = [
      'React', 'JavaScript', 'TypeScript', 'Python', 'Node.js', 'API', 'Database',
      'Machine Learning', 'AI', 'Design', 'UI/UX', 'CSS', 'HTML', 'Backend',
      'Frontend', 'DevOps', 'Cloud', 'AWS', 'Docker', 'Kubernetes', 'Git',
      'Testing', 'Security', 'Performance', 'Mobile', 'iOS', 'Android',
      'Tutorial', 'Guide', 'Documentation', 'Tool', 'Framework', 'Library'
    ];

    links.forEach(link => {
      const content = `${link.title} ${link.userNote} ${link.aiSummary || ''}`.toLowerCase();
      
      commonTopics.forEach(topic => {
        if (content.includes(topic.toLowerCase())) {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        }
      });
    });

    return Object.fromEntries(
      Object.entries(topicCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
    );
  }

  /**
   * Analyze time patterns in user's links
   */
  private analyzeTimePatterns(links: SavedLink[]): { recentActivity: number; weeklyPattern: Record<string, number> } {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    
    const recentActivity = links.filter(link => link.createdAt >= threeDaysAgo).length;
    
    const weeklyPattern: Record<string, number> = {};
    links.forEach(link => {
      const dayOfWeek = link.createdAt.toLocaleDateString('en-US', { weekday: 'long' });
      weeklyPattern[dayOfWeek] = (weeklyPattern[dayOfWeek] || 0) + 1;
    });

    return { recentActivity, weeklyPattern };
  }

  /**
   * Get display name for domain
   */
  private getDomainDisplayName(domain: string): string {
    const displayNames: Record<string, string> = {
      'github.com': 'GitHub',
      'stackoverflow.com': 'Stack Overflow',
      'medium.com': 'Medium',
      'youtube.com': 'YouTube',
      'twitter.com': 'Twitter',
      'linkedin.com': 'LinkedIn',
      'reddit.com': 'Reddit',
      'dev.to': 'Dev.to',
      'hashnode.com': 'Hashnode',
      'docs.google.com': 'Google Docs'
    };
    
    return displayNames[domain] || domain.replace('www.', '').split('.')[0];
  }

  /**
   * Get icon for domain
   */
  private getDomainIcon(domain: string): string {
    const icons: Record<string, string> = {
      'github.com': '⭐',
      'stackoverflow.com': '💬',
      'medium.com': '✍️',
      'youtube.com': '📺',
      'twitter.com': '🐦',
      'linkedin.com': '💼',
      'reddit.com': '🤖',
      'dev.to': '👨‍💻',
      'hashnode.com': '📝',
      'docs.google.com': '📄'
    };
    
    return icons[domain] || '🌐';
  }

  /**
   * Get color for domain
   */
  private getDomainColor(domain: string): string {
    const colors: Record<string, string> = {
      'github.com': '#24292e',
      'stackoverflow.com': '#f48024',
      'medium.com': '#00ab6c',
      'youtube.com': '#ff0000',
      'twitter.com': '#1da1f2',
      'linkedin.com': '#0077b5',
      'reddit.com': '#ff4500',
      'dev.to': '#0a0a0a',
      'hashnode.com': '#2962ff',
      'docs.google.com': '#4285f4'
    };
    
    return colors[domain] || '#6b7280';
  }

  /**
   * Get icon for topic
   */
  private getTopicIcon(topic: string): string {
    const icons: Record<string, string> = {
      'React': '⚛️',
      'JavaScript': '🟨',
      'TypeScript': '🔷',
      'Python': '🐍',
      'Node.js': '🟢',
      'API': '🔌',
      'Database': '🗄️',
      'Machine Learning': '🤖',
      'AI': '🧠',
      'Design': '🎨',
      'UI/UX': '✨',
      'CSS': '🎨',
      'HTML': '📄',
      'Backend': '⚙️',
      'Frontend': '🖥️',
      'DevOps': '🔧',
      'Cloud': '☁️',
      'AWS': '🟠',
      'Docker': '🐳',
      'Security': '🔒',
      'Mobile': '📱',
      'Tutorial': '📚',
      'Tool': '🛠️'
    };
    
    return icons[topic] || '🏷️';
  }

  /**
   * Get color for topic
   */
  private getTopicColor(topic: string): string {
    const colors: Record<string, string> = {
      'React': '#61dafb',
      'JavaScript': '#f7df1e',
      'TypeScript': '#3178c6',
      'Python': '#3776ab',
      'Node.js': '#339933',
      'API': '#ff6b6b',
      'Database': '#336791',
      'Machine Learning': '#ff9500',
      'AI': '#8b5cf6',
      'Design': '#e91e63',
      'UI/UX': '#9c27b0',
      'CSS': '#1572b6',
      'HTML': '#e34f26',
      'Backend': '#4caf50',
      'Frontend': '#2196f3',
      'DevOps': '#ff5722',
      'Cloud': '#607d8b',
      'Security': '#795548',
      'Mobile': '#00bcd4',
      'Tutorial': '#ff9800',
      'Tool': '#607d8b'
    };
    
    return colors[topic] || '#6b7280';
  }

  /**
   * Enhanced content analysis for smart collection matching
   */
  async analyzeForSmartCollections(link: SavedLink): Promise<{
    matchingCollections: string[];
    suggestedTags: string[];
    contentSignals: Record<string, number>;
  }> {
    const content = `${link.title} ${link.userNote} ${link.aiSummary || ''}`.toLowerCase();
    const domain = link.domain;
    
    const matchingCollections: string[] = [];
    const suggestedTags: string[] = [];
    const contentSignals: Record<string, number> = {};

    // Check for AI/ML content
    const aiKeywords = ['ai', 'artificial intelligence', 'machine learning', 'ml', 'neural', 'deep learning'];
    const aiScore = aiKeywords.filter(keyword => content.includes(keyword)).length;
    if (aiScore > 0) {
      matchingCollections.push('ai-related');
      suggestedTags.push('AI');
      contentSignals.ai = aiScore;
    }

    // Check for tutorial content
    const tutorialKeywords = ['tutorial', 'how to', 'guide', 'walkthrough', 'step by step'];
    const tutorialScore = tutorialKeywords.filter(keyword => content.includes(keyword)).length;
    if (tutorialScore > 0) {
      matchingCollections.push('tutorials');
      suggestedTags.push('tutorial');
      contentSignals.tutorial = tutorialScore;
    }

    // Check for GitHub repositories
    if (domain.includes('github.com')) {
      matchingCollections.push('github-repos');
      suggestedTags.push('github', 'repository');
      contentSignals.github = 1;
    }

    // Check for recent content (last 7 days)
    const daysSinceCreated = (Date.now() - link.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated <= 7) {
      matchingCollections.push('recent-reads');
      contentSignals.recent = Math.max(0, 7 - daysSinceCreated) / 7;
    }

    // Check for unread content (no user notes)
    if (!link.userNote || link.userNote.trim() === '') {
      matchingCollections.push('unread');
      contentSignals.unread = 1;
    }

    return {
      matchingCollections,
      suggestedTags,
      contentSignals
    };
  }
}

export const aiService = new AIService(); 