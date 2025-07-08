// AI utility functions for summarization, tagging, and categorization
import { AITagSuggestion, AICategorySuggestion, AIAnalysisResult, SavedLink, Highlight, AIInsight, CrossReference, KnowledgeGraph, KnowledgeNode, KnowledgeEdge } from '../types';

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
   * Generate AI response with context from search results
   */
  async generateResponseWithContext(
    query: string, 
    searchResults: any[], 
    metadata: any
  ): Promise<{ response: string; confidence: number }> {
    if (!this.apiKey) {
      return this.generateRuleBasedResponse(query, searchResults);
    }

    try {
      // Prepare context from search results
      const context = searchResults
        .slice(0, 5) // Use top 5 results
        .map((result, index) => `[${index + 1}] ${result.content.substring(0, 500)}...`)
        .join('\n\n');

      const sources = searchResults
        .slice(0, 5)
        .map((result, index) => `[${index + 1}] ${result.metadata.title || 'Untitled'} - ${result.metadata.url || 'No URL'}`)
        .join('\n');

      const prompt = `Based on the following content from the user's saved knowledge base, answer their question comprehensively and accurately.

User Question: ${query}

Relevant Content:
${context}

Sources:
${sources}

Instructions:
- Answer the question using only the information provided in the content above
- Be specific and cite relevant details from the sources
- If the content doesn't contain enough information to answer the question, say so clearly
- Format your response in a clear, helpful manner
- When referencing information, mention which source it came from using [1], [2], etc.

Answer:`;

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
              role: 'system',
              content: 'You are a helpful AI assistant that answers questions based on the user\'s saved content. Always be accurate and cite your sources.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response.';

      // Calculate confidence based on search result quality
      const avgSimilarity = searchResults.length > 0 
        ? searchResults.reduce((sum, r) => sum + r.similarity, 0) / searchResults.length 
        : 0;
      
      const confidence = Math.min(0.95, avgSimilarity * 1.2);

      return {
        response: aiResponse,
        confidence
      };

    } catch (error) {
      console.error('Context-aware AI response failed:', error);
      return this.generateRuleBasedResponse(query, searchResults);
    }
  }

  /**
   * Generate rule-based response when AI is not available
   */
  private generateRuleBasedResponse(query: string, searchResults: any[]): { response: string; confidence: number } {
    if (searchResults.length === 0) {
      return {
        response: "I couldn't find any relevant content in your saved links to answer this question. Try saving more content or rephrasing your query.",
        confidence: 0.1
      };
    }

    const topResult = searchResults[0];
    const relevantSnippet = topResult.content.substring(0, 300);
    
    let response = `Based on your saved content, here's what I found:\n\n${relevantSnippet}`;
    
    if (searchResults.length > 1) {
      response += `\n\nI found ${searchResults.length} relevant items in your knowledge base. The most relevant appears to be "${topResult.metadata.title || 'Untitled'}"`;
    }

    if (topResult.metadata.url) {
      response += `\n\nSource: ${topResult.metadata.url}`;
    }

    return {
      response,
      confidence: Math.min(0.7, topResult.similarity || 0.5)
    };
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

// Factory function to create AI service (for new features)
export const createAIService = (apiKey?: string) => {
  if (apiKey) {
    return new OpenAIService(apiKey);
  }
  
  // Return a no-op service if no API key
  return {
    async generateInsights() { return []; },
    async generateQuestions() { return []; },
    async generateFlashcards() { return []; },
    async findCrossReferences() { return []; },
    async generateRecommendations() { return []; },
    async updateKnowledgeGraph(items: any[]) { 
      return { nodes: [], edges: [], lastUpdated: Date.now() }; 
    },
    async extractKeyTopics() { return []; },
    calculateKnowledgeGrowth() { return 0; }
  };
};

// OpenAI service implementation for new features
class OpenAIService {
  private apiKey: string;
  private baseURL = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateInsights(item: any): Promise<any[]> {
    if (!this.apiKey) return [];

    try {
      const content = 'text' in item ? item.text : `${item.title} - ${item.description || ''}`;
      const url = 'url' in item ? item.url : (item as any).url;

      const prompt = `Analyze this content and generate 3 types of insights:
1. A thought-provoking question
2. A key summary point
3. A potential connection to other topics

Content: "${content}"
URL: ${url}

Return as JSON array with objects containing: type, content, metadata`;

      const insights = await this.callOpenAI(prompt);
      return this.parseInsights(insights);
    } catch (error) {
      console.error('Error generating insights:', error);
      return [];
    }
  }

  async generateQuestions(content: string, difficulty: string = 'medium'): Promise<any[]> {
    if (!this.apiKey) return [];

    try {
      const prompt = `Generate 3 ${difficulty} level questions based on this content that would help with retention and understanding:

Content: "${content}"

Questions should be:
- ${difficulty === 'easy' ? 'Recall-based, asking for basic facts' : ''}
- ${difficulty === 'medium' ? 'Application-based, asking how concepts apply' : ''}
- ${difficulty === 'hard' ? 'Analysis-based, asking for evaluation and synthesis' : ''}

Return as JSON array with type: "question", content: "the question", metadata: {difficulty, topic}`;

      const response = await this.callOpenAI(prompt);
      return this.parseInsights(response);
    } catch (error) {
      console.error('Error generating questions:', error);
      return [];
    }
  }

  async generateFlashcards(content: string): Promise<any[]> {
    if (!this.apiKey) return [];

    try {
      const prompt = `Create 3 flashcard pairs from this content. Each should have a question/prompt and answer:

Content: "${content}"

Return as JSON array with type: "flashcard", content: "Question: [question]\nAnswer: [answer]", metadata: {topic}`;

      const response = await this.callOpenAI(prompt);
      return this.parseInsights(response);
    } catch (error) {
      console.error('Error generating flashcards:', error);
      return [];
    }
  }

  async findCrossReferences(item: any, allItems: any[]): Promise<any[]> {
    if (!this.apiKey || allItems.length === 0) return [];

    try {
      const itemContent = 'text' in item ? item.text : `${item.title} - ${item.description || ''}`;
      const otherItems = allItems.filter(other => other.id !== item.id).slice(0, 10);

      const prompt = `Analyze the main item and find potential relationships with other items:

Main item: "${itemContent}"

Other items:
${otherItems.map((other, i) => 
  `${i + 1}. ${other.id}: ${'text' in other ? other.text : `${other.title} - ${other.description || ''}`}`
).join('\n')}

For each relationship found, return JSON with:
- targetId: the item ID
- relationshipType: "related" | "contradicts" | "supports" | "cites" | "builds-on"
- strength: 0-1 confidence score
- note: brief explanation

Only return relationships with strength > 0.3`;

      const response = await this.callOpenAI(prompt);
      return this.parseCrossReferences(response, item.id);
    } catch (error) {
      console.error('Error finding cross references:', error);
      return [];
    }
  }

  async generateRecommendations(userHistory: any[]): Promise<any[]> {
    if (!this.apiKey) return [];

    try {
      const recentItems = userHistory.slice(-10);
      const topics = await this.extractKeyTopics(
        recentItems.map(item => 'text' in item ? item.text : `${item.title} - ${item.description || ''}`).join(' ')
      );

      const prompt = `Based on the user's reading history and interests, suggest 5 content recommendations:

Recent reading topics: ${topics.join(', ')}

Recent items:
${recentItems.map(item => 
  'text' in item ? `Highlight: "${item.text}"` : `Link: "${item.title}"`
).join('\n')}

Suggest:
1. Specific topics to explore next
2. Types of content that would complement their reading
3. Areas for deeper study

Return as JSON array with type: "recommendation", content: suggestion, metadata: {topic, confidence}`;

      const response = await this.callOpenAI(prompt);
      return this.parseInsights(response);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    }
  }

  async updateKnowledgeGraph(items: any[]): Promise<any> {
    const nodes: any[] = [];
    const edges: any[] = [];
    const topicCounts = new Map<string, number>();

    // Extract topics and create nodes
    for (const item of items) {
      const content = 'text' in item ? item.text : `${item.title} - ${item.description || ''}`;
      const topics = await this.extractKeyTopics(content);
      
      // Add item node
      nodes.push({
        id: item.id,
        type: 'text' in item ? 'highlight' : 'link',
        label: 'text' in item ? item.text.slice(0, 50) + '...' : item.title,
        weight: 1,
        metadata: { topics }
      });

      // Count topic frequencies
      topics.forEach(topic => {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      });
    }

    // Add topic nodes
    topicCounts.forEach((count, topic) => {
      if (count > 1) {
        nodes.push({
          id: `topic-${topic}`,
          type: 'topic',
          label: topic,
          weight: count,
          metadata: { frequency: count }
        });
      }
    });

    return {
      nodes,
      edges,
      lastUpdated: Date.now()
    };
  }

  async extractKeyTopics(content: string): Promise<string[]> {
    if (!this.apiKey) {
      // Fallback: simple keyword extraction
      const words = content.toLowerCase().match(/\b\w+\b/g) || [];
      const wordCounts = new Map<string, number>();
      words.forEach(word => {
        if (word.length > 4) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      });
      return Array.from(wordCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);
    }

    try {
      const prompt = `Extract 3-5 key topics/themes from this content. Return as comma-separated list:

Content: "${content.slice(0, 1000)}"`;

      const response = await this.callOpenAI(prompt);
      return response.split(',').map((topic: string) => topic.trim()).filter((topic: string) => topic.length > 0);
    } catch (error) {
      console.error('Error extracting topics:', error);
      return [];
    }
  }

  calculateKnowledgeGrowth(analytics: any[]): number {
    if (analytics.length === 0) return 0;
    
    const recent = analytics.slice(-7);
    const older = analytics.slice(-14, -7);
    
    const recentScore = recent.reduce((sum, day) => sum + (day.linksRead || 0) + (day.highlightsMade || 0), 0);
    const olderScore = older.reduce((sum, day) => sum + (day.linksRead || 0) + (day.highlightsMade || 0), 0);
    
    if (olderScore === 0) return recentScore > 0 ? 1 : 0;
    return Math.max(0, Math.min(2, recentScore / olderScore));
  }

  private async callOpenAI(prompt: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private parseInsights(response: string): any[] {
    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed.map(insight => ({
        id: `insight-${Date.now()}-${Math.random()}`,
        ...insight,
        createdAt: Date.now(),
      })) : [];
    } catch (error) {
      return [{
        id: `insight-${Date.now()}`,
        type: 'summary',
        content: response.slice(0, 200),
        createdAt: Date.now(),
      }];
    }
  }

  private parseCrossReferences(response: string, sourceId: string): any[] {
    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed.map(ref => ({
        id: `ref-${Date.now()}-${Math.random()}`,
        ...ref,
        createdAt: Date.now(),
      })) : [];
    } catch (error) {
      return [];
    }
  }
}

// Single export of configured aiService instance
export const aiService = new AIService({ apiKey: '' }); 