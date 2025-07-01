// AI Summary utility functions
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

  async generateSummary(content: string, title: string, url: string): Promise<string> {
    // For now, return a placeholder summary
    // This can be replaced with actual OpenAI API calls
    if (!this.apiKey) {
      return this.generatePlaceholderSummary(content, title, url);
    }

    try {
      // Placeholder for OpenAI API integration
      const response = await this.callOpenAI(content, title, url);
      return response;
    } catch (error) {
      console.error('AI summary generation failed:', error);
      return this.generatePlaceholderSummary(content, title, url);
    }
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

  private async callOpenAI(content: string, title: string, url: string): Promise<string> {
    // Placeholder for actual OpenAI API implementation
    const prompt = `Summarize this web page in 1-2 sentences:
Title: ${title}
URL: ${url}
Content: ${content.substring(0, 1000)}...`;

    // This would be replaced with actual OpenAI API call
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

  updateApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
}

export const aiService = new AIService(); 