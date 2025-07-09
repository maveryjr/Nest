// URL utilities
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

export function getFaviconUrl(url: string): string {
  const domain = extractDomain(url);
  if (!domain) return '';
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

// Date utilities
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(date);
  }
}

// Text utilities
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function extractTextFromHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

export function estimateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

// Search utilities
export function highlightSearchTerms(text: string, searchTerm: string): string {
  if (!searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

export function fuzzySearch(query: string, text: string): boolean {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  
  return queryIndex === queryLower.length;
}

// Tag utilities
export function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim().replace(/\s+/g, '-');
}

export function getTagColor(tag: string): string {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // yellow
    '#EF4444', // red
    '#8B5CF6', // purple
    '#F97316', // orange
    '#06B6D4', // cyan
    '#84CC16', // lime
  ];
  
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

// Collection utilities
export function getCollectionIcon(name: string): string {
  const iconMap: Record<string, string> = {
    'inbox': '📥',
    'favorites': '⭐',
    'archive': '📦',
    'reading': '📚',
    'work': '💼',
    'personal': '🏠',
    'research': '🔬',
    'tutorials': '🎓',
    'news': '📰',
    'tools': '🛠️',
    'inspiration': '💡',
    'recipes': '🍳',
    'travel': '✈️',
    'health': '🏥',
    'finance': '💰',
  };
  
  const normalizedName = name.toLowerCase();
  return iconMap[normalizedName] || '📁';
}

// Validation utilities
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ID generation
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Storage utilities
export function serializeForStorage(data: any): string {
  return JSON.stringify(data, (key, value) => {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  });
}

export function deserializeFromStorage(data: string): any {
  return JSON.parse(data, (key, value) => {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value);
    }
    return value;
  });
}

// Analytics utilities
export function calculateReadingStreak(analytics: { date: string; linksRead: number }[]): number {
  if (analytics.length === 0) return 0;
  
  const sortedAnalytics = analytics.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  let streak = 0;
  let currentDate = new Date();
  
  for (const analytic of sortedAnalytics) {
    const analyticDate = new Date(analytic.date);
    const diffInDays = Math.floor((currentDate.getTime() - analyticDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === streak && analytic.linksRead > 0) {
      streak++;
      currentDate = analyticDate;
    } else {
      break;
    }
  }
  
  return streak;
}

// Error handling utilities
export class NestError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'NestError';
  }
}

export function handleApiError(error: any): NestError {
  if (error instanceof NestError) {
    return error;
  }
  
  if (error.code === 'PGRST116') {
    return new NestError('Resource not found', 'NOT_FOUND', 404);
  }
  
  if (error.code === 'PGRST301') {
    return new NestError('Unauthorized', 'UNAUTHORIZED', 401);
  }
  
  return new NestError(
    error.message || 'An unexpected error occurred',
    'UNKNOWN_ERROR',
    500
  );
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
} 