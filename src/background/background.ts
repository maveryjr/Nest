import { storage } from '../utils/storage';
import { aiService } from '../utils/ai';
import { SavedLink, Highlight } from '../types';
import { AnalyticsService } from '../utils/analytics';
import { embeddingsService } from '../utils/embeddings';
import { linkMonitor } from '../utils/linkMonitor';
import { suggestionEngine } from '../utils/suggestionEngine';
import { duplicateDetector } from '../utils/duplicateDetector';
import { archiveService } from '../utils/archiveService';

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  // Create context menu
  chrome.contextMenus.create({
    id: 'saveToNest',
    title: 'Save to Nest',
    contexts: ['page', 'link']
  });

  // Create context menu for selected text
  chrome.contextMenus.create({
    id: 'saveHighlight',
    title: 'Save highlight to Nest',
    contexts: ['selection']
  });

  console.log('Nest extension installed');
  
  // Initialize Phase 3 background monitoring
  await initializePhase3Monitoring();
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('Background: Context menu clicked:', info.menuItemId);
  
  if (info.menuItemId === 'saveToNest' && tab) {
    const linkUrl = info.linkUrl || tab.url;
    await saveCurrentPage(tab, linkUrl);
  } else if (info.menuItemId === 'saveHighlight' && tab && info.selectionText) {
    await saveHighlight(tab, info.selectionText, '', null);
  }
});

// Handle screenshot saving
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'saveScreenshot') {
    try {
      const screenshot = {
        id: Date.now().toString(),
        dataURL: message.screenshot,
        url: message.url,
        title: message.title,
        domain: new URL(message.url).hostname,
        createdAt: new Date(),
        updatedAt: new Date(),
        type: 'screenshot'
      };
      
      // Save to storage
      const result = await chrome.storage.local.get('nest_screenshots');
      const screenshots = result.nest_screenshots || [];
      screenshots.push(screenshot);
      await chrome.storage.local.set({ nest_screenshots: screenshots });
      
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Screenshot Saved',
        message: 'Screenshot saved to Nest successfully!'
      });
      
      sendResponse({ success: true });
    } catch (error) {
      console.error('Failed to save screenshot:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  return true;
});

// Handle browser action clicks - directly open sidebar
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked, opening sidebar...');
  try {
    if (tab.windowId) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      console.log('Sidebar opened successfully');
    }
  } catch (error) {
    console.error('Failed to open sidebar:', error);
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background: Message received:', request);
  
  (async () => {
    try {
      if (request.action === 'saveCurrentPage') {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          const result = await saveCurrentPage(tabs[0]);
          sendResponse(result);
        } else {
          sendResponse({ success: false, error: 'No active tab found.' });
        }
      } else if (request.action === 'openSidePanel') {
        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs[0] && tabs[0].windowId) {
            await chrome.sidePanel.open({ windowId: tabs[0].windowId });
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'No active window found.' });
          }
        } catch (error) {
          console.error('Failed to open side panel:', error);
          sendResponse({ success: false, error: (error as Error).message });
        }
      } else if (request.action === 'saveHighlight') {
        let tabToUse = null;
        if (sender.tab) {
          tabToUse = sender.tab;
        } else {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs[0]) tabToUse = tabs[0];
        }
        if (tabToUse) {
          const result = await saveHighlight(tabToUse, request.selectedText, request.context, request.position);
          sendResponse(result);
        } else {
          sendResponse({ success: false, error: 'No active tab found.' });
        }
      } else if (request.action === 'getPageContent') {
        if (sender.tab && sender.tab.id) {
          const response = await getPageContent(sender.tab.id);
          sendResponse(response);
        } else {
          sendResponse({ content: '' });
        }
      } else if (request.action === 'analyzePageWithAI') {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          const result = await analyzePageWithAI(tabs[0]);
          sendResponse(result);
        } else {
          sendResponse({ success: false, error: 'No active tab found.' });
        }
      } else if (request.action === 'saveWithContext') {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          const result = await saveWithContext(tabs[0], request.reason, request.tags);
          sendResponse(result);
        } else {
          sendResponse({ success: false, error: 'No active tab found.' });
        }
      } else if (request.action === 'getPageInfo') {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          const result = await getPageInfo(tabs[0]);
          sendResponse(result);
        } else {
          sendResponse({ success: false, error: 'No active tab found.' });
        }
      } else if (request.action === 'getHighlightsForPage') {
        const result = await getHighlightsForPage(request.url);
        sendResponse(result);
      } else if (request.action === 'removeHighlightFromStorage') {
        const result = await removeHighlightFromStorage(request.highlightId, request.url);
        sendResponse(result);
      } else if (request.action === 'analyzeLinkContent') {
        // New action for analyzing already-saved link content
        const { title, url, content } = request;
        const result = await analyzeLinkContent(title, url, content);
        sendResponse(result);
      } else if (request.action === 'openFloatingWindow') {
        handleOpenFloatingWindow();
        sendResponse({ success: true });
        return true;
      } else {
        sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ success: false, error: (error as Error).message });
    }
  })();
  
  return true; // Keep message channel open for async response
});

async function saveCurrentPage(tab: chrome.tabs.Tab, linkUrl?: string): Promise<{ success: boolean; error?: string; linkId?: string; aiAnalysis?: any }> {
  try {
    const url = linkUrl || tab.url;
    const title = tab.title || 'Untitled';
    
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return { success: false, error: 'Cannot save this type of page.' };
    }

    let pageContent = '';
    let enhancedContent: any = null;
    if (tab.id) {
      try {
        // Try to get enhanced content first for multimodal support
        const enhancedResponse = await chrome.tabs.sendMessage(tab.id, { action: 'getEnhancedPageContent' });
        if (enhancedResponse?.enhancedContent) {
          enhancedContent = enhancedResponse.enhancedContent;
          pageContent = enhancedContent.content;
          console.log('Background: Enhanced content extracted:', enhancedContent.contentType);
        } else {
          // Fallback to basic content
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
          pageContent = response?.content || '';
          console.log('Background: Basic content extracted');
        }
      } catch (error) {
        console.log('Could not extract page content:', error);
      }
    }

    const domain = new URL(url).hostname;
    
    // Get user settings to check if AI features are enabled
    const [settingsResult] = await Promise.all([
      chrome.storage.local.get('nest_settings')
    ]);
    const userSettings = settingsResult.nest_settings || {};
    
    // Configure AI service with user's API key if available
    if (userSettings.openaiApiKey) {
      aiService.updateApiKey(userSettings.openaiApiKey);
      console.log('Background: AI service configured with user API key');
    } else {
      console.log('Background: No OpenAI API key found, using rule-based analysis');
    }
    
    // Perform comprehensive AI analysis
    console.log('Background: Starting AI analysis...');
    const aiAnalysis = await aiService.analyzeContent(pageContent, title, url);
    console.log('Background: AI analysis complete:', aiAnalysis);

    // Determine category - use AI suggestion if auto-categorization is enabled
    let category = 'general';
    if (userSettings.autoCategorization && aiAnalysis.categorySuggestions.length > 0) {
      category = aiAnalysis.categorySuggestions[0].category;
      console.log('Background: Auto-categorization enabled, using AI category:', category);
    }

    const newLink = {
      url,
      title,
      favicon: tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      userNote: '',
      aiSummary: userSettings.autoSummarize !== false ? aiAnalysis.summary : undefined,
      category: category,
      domain: domain,
      isInInbox: true, // New links go to inbox by default
      // Enhanced multimodal content
      contentType: enhancedContent?.contentType || 'webpage',
      mediaAttachments: enhancedContent?.mediaContent ? [enhancedContent.mediaContent] : undefined,
      extractedText: enhancedContent?.mediaContent?.extractedText,
      videoTimestamp: enhancedContent?.mediaContent?.metadata?.timestamp,
      author: enhancedContent?.metadata?.author,
      publishDate: enhancedContent?.metadata?.publishDate,
      sourceMetadata: enhancedContent?.metadata,
    };

    console.log('Background: saveCurrentPage newLink:', JSON.stringify(newLink));
    const result = await storage.addLink(newLink);
    console.log('Background: saveCurrentPage result:', result);

    if (!result.success) {
      throw new Error(result.error || 'Failed to save link to database.');
    }

    // Apply auto-tagging if enabled and we have tag suggestions
    if (userSettings.autoTagging && result.linkId && aiAnalysis.tagSuggestions.length > 0) {
      try {
        // Get high-confidence tag suggestions (confidence > 0.6)
        const highConfidenceTags = aiAnalysis.tagSuggestions
          .filter(suggestion => suggestion.confidence > 0.6)
          .map(suggestion => suggestion.tag)
          .slice(0, 5); // Limit to 5 tags to avoid spam
        
        if (highConfidenceTags.length > 0) {
          console.log('Background: Auto-tagging enabled, applying tags:', highConfidenceTags);
          await storage.addTagsToLink(result.linkId, highConfidenceTags);
        }
      } catch (error) {
        console.error('Failed to apply auto-tags:', error);
        // Don't fail the whole operation if tagging fails
      }
    }

    // Log activity for tracking
    if (result.linkId) {
      await storage.logActivity('save', result.linkId, undefined, {
        domain,
        category: newLink.category,
        hasAISummary: !!aiAnalysis.summary,
        autoTagged: userSettings.autoTagging,
        autoCategorized: userSettings.autoCategorization
      });

      // Process content for embeddings in the background (non-blocking)
      processContentForEmbeddings(result.linkId, newLink, pageContent).catch(error => {
        console.error('Background embedding processing failed:', error);
      });
    }

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Saved to Nest',
      message: `"${title}" has been saved with AI suggestions.`
    });

    // Notify sidebar to refresh data
    try {
      await chrome.runtime.sendMessage({ action: 'refreshSidebar' });
    } catch (error) {
      console.log('Could not send refresh message to sidebar:', error);
    }

    return { 
      success: true, 
      linkId: result.linkId,
      aiAnalysis // Return AI analysis for frontend use
    };
  } catch (error) {
    console.error('Failed to save current page:', error);
    return { success: false, error: (error as Error).message };
  }
}

// New function to analyze page content with AI (for on-demand analysis)
async function analyzePageWithAI(tab: chrome.tabs.Tab): Promise<{ success: boolean; analysis?: any; error?: string }> {
  try {
    const url = tab.url;
    const title = tab.title || 'Untitled';
    
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return { success: false, error: 'Cannot analyze this type of page.' };
    }

    // Get user settings to configure AI service
    const [settingsResult] = await Promise.all([
      chrome.storage.local.get('nest_settings')
    ]);
    const userSettings = settingsResult.nest_settings || {};
    
    // Configure AI service with user's API key if available
    if (userSettings.openaiApiKey) {
      aiService.updateApiKey(userSettings.openaiApiKey);
      console.log('Background: AI service configured with user API key for analysis');
    }

    let pageContent = '';
    if (tab.id) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
        pageContent = response?.content || '';
      } catch (error) {
        console.log('Could not extract page content:', error);
      }
    }

    const analysis = await aiService.analyzeContent(pageContent, title, url);
    return { success: true, analysis };
  } catch (error) {
    console.error('Failed to analyze page with AI:', error);
    return { success: false, error: (error as Error).message };
  }
}

// New function to analyze saved link content with AI
async function analyzeLinkContent(title: string, url: string, content: string): Promise<{ success: boolean; analysis?: any; error?: string }> {
  try {
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return { success: false, error: 'Cannot analyze this type of URL.' };
    }

    // Get user settings to configure AI service
    const [settingsResult] = await Promise.all([
      chrome.storage.local.get('nest_settings')
    ]);
    const userSettings = settingsResult.nest_settings || {};
    
    // Configure AI service with user's API key if available
    if (userSettings.openaiApiKey) {
      aiService.updateApiKey(userSettings.openaiApiKey);
      console.log('Background: AI service configured with user API key for link analysis');
    }

    // Use the provided content (could be summary, notes, or extracted content)
    const analysis = await aiService.analyzeContent(content, title, url);
    return { success: true, analysis };
  } catch (error) {
    console.error('Failed to analyze link content with AI:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function saveHighlight(tab: chrome.tabs.Tab, selectedText: string, context: string, position: any): Promise<{ success: boolean; error?: string; highlightId?: string }> {
  try {
    const url = tab.url;
    const title = tab.title || 'Untitled';
    
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return { success: false, error: 'Cannot save highlights from this type of page.' };
    }

    // Check if link already exists
    const existingLink = await storage.getLinkByUrl(url);
    
    if (existingLink) {
      // Add highlight to existing link
      const newHighlight: Highlight = {
        id: Date.now().toString(), // Temporary ID, will be replaced by storage
        selectedText,
        context,
        position,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedHighlights = [...(existingLink.highlights || []), newHighlight];
      await storage.updateLink(existingLink.id, { highlights: updatedHighlights });
      
      console.log('Background: Added highlight to existing link');
      
      // Return the highlight ID for visual highlighting
      return { success: true, highlightId: newHighlight.id };
    } else {
      // Create new link with highlight
      const domain = new URL(url).hostname;
      
      // Get user settings to check if AI features are enabled
      const [settingsResult] = await Promise.all([
        chrome.storage.local.get('nest_settings')
      ]);
      const userSettings = settingsResult.nest_settings || {};
      
      // Configure AI service with user's API key if available
      if (userSettings.openaiApiKey) {
        aiService.updateApiKey(userSettings.openaiApiKey);
        console.log('Background: AI service configured with user API key');
      }
      
      // Get page content for AI analysis
      let pageContent = '';
      if (tab.id) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
          pageContent = response?.content || '';
        } catch (error) {
          console.log('Could not extract page content:', error);
        }
      }

      const aiAnalysis = await aiService.analyzeContent(pageContent, title, url);

      // Determine category - use AI suggestion if auto-categorization is enabled
      let category = 'general';
      if (userSettings.autoCategorization && aiAnalysis.categorySuggestions.length > 0) {
        category = aiAnalysis.categorySuggestions[0].category;
        console.log('Background: Auto-categorization enabled, using AI category:', category);
      }

      const newHighlight: Highlight = {
        id: Date.now().toString(),
        selectedText,
        context,
        position,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const newLink = {
        url,
        title,
        favicon: tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
        userNote: '',
        aiSummary: userSettings.autoSummarize !== false ? aiAnalysis.summary : undefined,
        category: category,
        domain: domain,
        isInInbox: true,
        highlights: [newHighlight]
      };

      const result = await storage.addLink(newLink);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save highlight to database.');
      }

      // Apply auto-tagging if enabled and we have tag suggestions
      if (userSettings.autoTagging && result.linkId && aiAnalysis.tagSuggestions.length > 0) {
        try {
          // Get high-confidence tag suggestions (confidence > 0.6)
          const highConfidenceTags = aiAnalysis.tagSuggestions
            .filter(suggestion => suggestion.confidence > 0.6)
            .map(suggestion => suggestion.tag)
            .slice(0, 5); // Limit to 5 tags to avoid spam
          
          if (highConfidenceTags.length > 0) {
            console.log('Background: Auto-tagging enabled, applying tags:', highConfidenceTags);
            await storage.addTagsToLink(result.linkId, highConfidenceTags);
          }
        } catch (error) {
          console.error('Failed to apply auto-tags:', error);
          // Don't fail the whole operation if tagging fails
        }
      }
      
      console.log('Background: Created new link with highlight');
      // Return the highlight ID for visual highlighting
      return { success: true, highlightId: newHighlight.id };
    }
  } catch (error) {
    console.error('Failed to save highlight:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function getPageContent(tabId: number): Promise<{ content: string }> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'getPageContent' });
    return { content: response?.content || '' };
  } catch (error) {
    console.log('Could not get page content:', error);
    return { content: '' };
  }
}

async function getPageInfo(tab: chrome.tabs.Tab): Promise<{ success: boolean; pageInfo?: any; error?: string }> {
  try {
    const url = tab.url;
    const title = tab.title || 'Untitled';
    
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return { success: false, error: 'Cannot get info for this type of page.' };
    }

    return { 
      success: true, 
      pageInfo: {
        title,
        url,
        domain: new URL(url).hostname,
        favicon: tab.favIconUrl
      }
    };
  } catch (error) {
    console.error('Failed to get page info:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function saveWithContext(tab: chrome.tabs.Tab, reason: string, tags: string[] = []): Promise<{ success: boolean; error?: string; linkId?: string }> {
  try {
    const url = tab.url;
    const title = tab.title || 'Untitled';
    
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return { success: false, error: 'Cannot save this type of page.' };
    }

    let pageContent = '';
    if (tab.id) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' });
        pageContent = response?.content || '';
      } catch (error) {
        console.log('Could not extract page content:', error);
      }
    }

    const domain = new URL(url).hostname;
    
    // Get user settings to check if AI features are enabled
    const [settingsResult] = await Promise.all([
      chrome.storage.local.get('nest_settings')
    ]);
    const userSettings = settingsResult.nest_settings || {};
    
    // Configure AI service with user's API key if available
    if (userSettings.openaiApiKey) {
      aiService.updateApiKey(userSettings.openaiApiKey);
      console.log('Background: AI service configured with user API key');
    }
    
    // Perform AI analysis
    const aiAnalysis = await aiService.analyzeContent(pageContent, title, url);

    // Determine category - use AI suggestion if auto-categorization is enabled
    let category = 'general';
    if (userSettings.autoCategorization && aiAnalysis.categorySuggestions.length > 0) {
      category = aiAnalysis.categorySuggestions[0].category;
      console.log('Background: Auto-categorization enabled, using AI category:', category);
    }

    const newLink = {
      url,
      title,
      favicon: tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      userNote: reason, // Store the reason as a user note
      aiSummary: userSettings.autoSummarize !== false ? aiAnalysis.summary : undefined,
      category: category,
      domain: domain,
      isInInbox: true,
    };

    const result = await storage.addLink(newLink);

    if (!result.success) {
      throw new Error(result.error || 'Failed to save link to database.');
    }

    // Combine user-provided tags with AI suggestions if auto-tagging is enabled
    let allTags = [...tags];
    if (userSettings.autoTagging && aiAnalysis.tagSuggestions.length > 0) {
      // Get high-confidence tag suggestions (confidence > 0.6)
      const aiTags = aiAnalysis.tagSuggestions
        .filter(suggestion => suggestion.confidence > 0.6)
        .map(suggestion => suggestion.tag)
        .slice(0, 3); // Limit AI tags to avoid overwhelming user tags
      
      // Merge AI tags with user tags, avoiding duplicates
      aiTags.forEach(tag => {
        if (!allTags.some(existingTag => existingTag.toLowerCase() === tag.toLowerCase())) {
          allTags.push(tag);
        }
      });
      
      console.log('Background: Auto-tagging enabled, combined tags:', allTags);
    }

    // Add all tags if we have any
    if (allTags.length > 0 && result.linkId) {
      try {
        await storage.addTagsToLink(result.linkId, allTags);
      } catch (error) {
        console.error('Failed to add tags:', error);
        // Don't fail the whole operation if tags fail
      }
    }

    // Log activity for tracking
    if (result.linkId) {
      await storage.logActivity('save', result.linkId, undefined, {
        domain,
        category: newLink.category,
        reason: reason.substring(0, 100), // Truncate for storage
        tags: tags,
        withContext: true
      });
    }

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Saved to Nest',
      message: `"${title}" saved with context: ${reason.substring(0, 50)}...`
    });

    // Notify sidebar to refresh data
    try {
      await chrome.runtime.sendMessage({ action: 'refreshSidebar' });
    } catch (error) {
      console.log('Could not send refresh message to sidebar:', error);
    }

    return { success: true, linkId: result.linkId };
  } catch (error) {
    console.error('Failed to save with context:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Handle keyboard shortcuts (if configured in manifest)
chrome.commands.onCommand.addListener(async (command) => {
  console.log('Keyboard command received:', command);
  
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]) return;
  
  const tab = tabs[0];
  
  switch (command) {
    case 'save-page':
    case 'save-to-inbox':
      await saveCurrentPage(tab);
      break;
    case 'open-command-palette':
      // Send message to content script to open command palette
      try {
        await chrome.tabs.sendMessage(tab.id!, { action: 'openCommandPalette' });
      } catch (error) {
        console.log('Failed to open command palette from content script, trying sidepanel...');
        // If content script fails, try to open sidepanel
        try {
          await chrome.sidePanel.open({ windowId: tab.windowId });
        } catch (sideError) {
          console.error('Failed to open sidepanel:', sideError);
        }
      }
      break;
  }
});

// New functions for visual highlighting
async function getHighlightsForPage(url: string): Promise<{ success: boolean; highlights?: any[]; error?: string }> {
  try {
    console.log('Background: Getting highlights for page:', url);
    
    // Get the link for this URL
    const link = await storage.getLinkByUrl(url);
    
    if (link && link.highlights && link.highlights.length > 0) {
      console.log('Background: Found', link.highlights.length, 'highlights for page');
      return { 
        success: true, 
        highlights: link.highlights 
      };
    } else {
      console.log('Background: No highlights found for page');
      return { 
        success: true, 
        highlights: [] 
      };
    }
  } catch (error) {
    console.error('Background: Failed to get highlights for page:', error);
    return { 
      success: false, 
      error: (error as Error).message 
    };
  }
}

async function removeHighlightFromStorage(highlightId: string, url: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Background: Removing highlight from storage:', highlightId, 'for URL:', url);
    
    // Get the link for this URL
    const link = await storage.getLinkByUrl(url);
    
    if (link && link.highlights) {
      // Remove the highlight from the array
      const updatedHighlights = link.highlights.filter(h => h.id !== highlightId);
      
      // Update the link in storage
      await storage.updateLink(link.id, { highlights: updatedHighlights });
      
      console.log('Background: Highlight removed from storage successfully');
      
      // Notify sidebar to refresh data
      try {
        await chrome.runtime.sendMessage({ action: 'refreshSidebar' });
      } catch (error) {
        console.log('Could not send refresh message to sidebar:', error);
      }
      
      return { success: true };
    } else {
      console.log('Background: Link not found for URL:', url);
      return { success: false, error: 'Link not found' };
    }
  } catch (error) {
    console.error('Background: Failed to remove highlight from storage:', error);
    return { 
      success: false, 
      error: (error as Error).message 
    };
  }
} 

/**
 * Process content for embeddings in the background
 */
async function processContentForEmbeddings(linkId: string, linkData: any, content: string): Promise<void> {
  try {
    console.log('Background: Processing content for embeddings:', linkId);
    
    // Get user settings to check if embeddings are enabled and get API key
    const settingsResult = await chrome.storage.local.get('nest_settings');
    const userSettings = settingsResult.nest_settings || {};
    
    // Skip if embeddings are disabled or no API key
    if (!userSettings.enableEmbeddings || !userSettings.openaiApiKey) {
      console.log('Background: Embeddings disabled or no API key');
      return;
    }

    // Process the content for embeddings
    const embeddingData = {
      id: linkId,
      content: content,
      metadata: {
        title: linkData.title,
        url: linkData.url,
        domain: linkData.domain,
        contentType: linkData.contentType,
        author: linkData.author,
        publishDate: linkData.publishDate,
        createdAt: new Date().toISOString(),
      }
    };

    await embeddingsService.processContent(embeddingData);
    console.log('Background: Embeddings processed successfully for:', linkId);
  } catch (error) {
    console.error('Background: Failed to process embeddings:', error);
    // Don't throw - this is background processing and shouldn't affect the main save operation
  }
}

// Add floating window functionality
async function handleOpenFloatingWindow() {
  try {
    // Check if floating window already exists
    const existingWindows = await chrome.windows.getAll({ windowTypes: ['popup'] });
    const nestFloatingWindow = existingWindows.find(window => 
      window.type === 'popup' && 
      // We'll identify our window by its specific dimensions and properties
      window.width === 420 && window.height === 600
    );

    if (nestFloatingWindow) {
      // Focus existing floating window
      await chrome.windows.update(nestFloatingWindow.id!, { focused: true });
      return;
    }

    // Get current screen dimensions to position window
    const currentWindow = await chrome.windows.getCurrent();
    const left = Math.round((currentWindow.width! - 420) / 2 + (currentWindow.left || 0));
    const top = Math.round((currentWindow.height! - 600) / 3 + (currentWindow.top || 0));

    // Create floating window
    const floatingWindow = await chrome.windows.create({
      url: chrome.runtime.getURL('sidepanel.html') + '?floating=true',
      type: 'popup',
      width: 420,
      height: 600,
      left: left,
      top: top,
      focused: true
    });

    // Store floating window ID for future reference
    if (floatingWindow.id) {
      await chrome.storage.local.set({ 'nest_floating_window_id': floatingWindow.id });
    }

  } catch (error) {
    console.error('Failed to create floating window:', error);
  }
}

// Listen for window close events to clean up floating window ID
chrome.windows.onRemoved.addListener(async (windowId) => {
  try {
    const result = await chrome.storage.local.get('nest_floating_window_id');
    if (result.nest_floating_window_id === windowId) {
      await chrome.storage.local.remove('nest_floating_window_id');
    }
  } catch (error) {
    console.error('Failed to clean up floating window ID:', error);
  }
});

// ============================================================================
// PHASE 3: BACKGROUND MONITORING & INTELLIGENT AUTOMATION
// ============================================================================

/**
 * Initialize Phase 3 background monitoring services
 */
async function initializePhase3Monitoring(): Promise<void> {
  try {
    console.log('Initializing Phase 3 background monitoring...');
    
    // Set up periodic alarms for background tasks
    await setupPeriodicAlarms();
    
    // Register alarm listeners
    chrome.alarms.onAlarm.addListener(handleAlarm);
    
    // Initialize monitoring services
    await linkMonitor.initialize();
    
    console.log('Phase 3 monitoring initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Phase 3 monitoring:', error);
  }
}

/**
 * Set up periodic alarms for background monitoring
 */
async function setupPeriodicAlarms(): Promise<void> {
  try {
    // Clear existing alarms
    await chrome.alarms.clearAll();
    
    // Link health monitoring (every 24 hours)
    await chrome.alarms.create('link-health-check', {
      delayInMinutes: 1, // Start after 1 minute
      periodInMinutes: 24 * 60 // Every 24 hours
    });
    
    // Smart suggestions generation (every 4 hours)
    await chrome.alarms.create('generate-suggestions', {
      delayInMinutes: 5, // Start after 5 minutes
      periodInMinutes: 4 * 60 // Every 4 hours
    });
    
    // Duplicate detection (weekly)
    await chrome.alarms.create('detect-duplicates', {
      delayInMinutes: 10, // Start after 10 minutes
      periodInMinutes: 7 * 24 * 60 // Every 7 days
    });
    
    // Archive dead links (weekly)
    await chrome.alarms.create('archive-dead-links', {
      delayInMinutes: 15, // Start after 15 minutes
      periodInMinutes: 7 * 24 * 60 // Every 7 days
    });
    
    // Activity analysis and cleanup (daily)
    await chrome.alarms.create('activity-analysis', {
      delayInMinutes: 30, // Start after 30 minutes
      periodInMinutes: 24 * 60 // Every 24 hours
    });
    
    console.log('Periodic alarms set up successfully');
  } catch (error) {
    console.error('Failed to set up periodic alarms:', error);
  }
}

/**
 * Handle periodic alarm events
 */
async function handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
  try {
    console.log(`Background: Handling alarm: ${alarm.name}`);
    
    // Check if user has enabled background processing
    const settings = await chrome.storage.local.get('nest_settings');
    const userSettings = settings.nest_settings || {};
    
    if (!userSettings.enableBackgroundProcessing) {
      console.log('Background processing disabled by user');
      return;
    }
    
    switch (alarm.name) {
      case 'link-health-check':
        await performLinkHealthCheck();
        break;
        
      case 'generate-suggestions':
        await generateSmartSuggestions();
        break;
        
      case 'detect-duplicates':
        await performDuplicateDetection();
        break;
        
      case 'archive-dead-links':
        await performDeadLinkArchiving();
        break;
        
      case 'activity-analysis':
        await performActivityAnalysis();
        break;
        
      default:
        console.log(`Unknown alarm: ${alarm.name}`);
    }
  } catch (error) {
    console.error(`Failed to handle alarm ${alarm.name}:`, error);
  }
}

/**
 * Perform periodic link health checks
 */
async function performLinkHealthCheck(): Promise<void> {
  try {
    console.log('Background: Starting link health check...');
    
    const data = await storage.getData();
    const recentLinks = data.links
      .filter(link => {
        const daysSinceCreated = (Date.now() - new Date(link.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCreated <= 30; // Check links from last 30 days
      })
      .slice(0, 20); // Limit to 20 links per check
    
    if (recentLinks.length === 0) {
      console.log('No recent links to check');
      return;
    }
    
    const healthResults = await linkMonitor.checkLinksHealth(recentLinks.map(l => l.id));
    
    // Process results and send notifications for dead links
    let deadLinkCount = 0;
    for (const result of healthResults) {
      if (result.status === 'dead') {
        deadLinkCount++;
      }
    }
    
    if (deadLinkCount > 0) {
      await sendNotification(
        'Dead Links Detected',
        `Found ${deadLinkCount} dead link${deadLinkCount > 1 ? 's' : ''} in your library. Check Nest for recovery options.`
      );
    }
    
    console.log(`Link health check completed: ${deadLinkCount} dead links found`);
  } catch (error) {
    console.error('Link health check failed:', error);
  }
}

/**
 * Generate smart suggestions in the background
 */
async function generateSmartSuggestions(): Promise<void> {
  try {
    console.log('Background: Generating smart suggestions...');
    
    const suggestions = await suggestionEngine.generateSuggestions();
    
    // Store suggestions for later retrieval
    await chrome.storage.local.set({
      nest_background_suggestions: {
        suggestions,
        generatedAt: new Date().toISOString(),
        viewed: false
      }
    });
    
    // Send notification for high-priority suggestions
    const urgentSuggestions = suggestions.filter(s => s.priority === 'urgent');
    if (urgentSuggestions.length > 0) {
      await sendNotification(
        'Smart Suggestions Available',
        `${urgentSuggestions.length} urgent suggestion${urgentSuggestions.length > 1 ? 's' : ''} for your library.`
      );
    }
    
    console.log(`Generated ${suggestions.length} smart suggestions`);
  } catch (error) {
    console.error('Smart suggestion generation failed:', error);
  }
}

/**
 * Perform duplicate detection in the background
 */
async function performDuplicateDetection(): Promise<void> {
  try {
    console.log('Background: Performing duplicate detection...');
    
    const duplicates = await duplicateDetector.findDuplicates();
    const autoMergeable = duplicates.filter(d => d.mergeRecommendation === 'auto');
    
    // Store duplicate results
    await chrome.storage.local.set({
      nest_background_duplicates: {
        duplicates,
        autoMergeable: autoMergeable.length,
        detectedAt: new Date().toISOString(),
        reviewed: false
      }
    });
    
    if (duplicates.length > 0) {
      await sendNotification(
        'Duplicates Detected',
        `Found ${duplicates.length} potential duplicate${duplicates.length > 1 ? 's' : ''}. ${autoMergeable.length} can be auto-merged.`
      );
    }
    
    console.log(`Duplicate detection completed: ${duplicates.length} found`);
  } catch (error) {
    console.error('Duplicate detection failed:', error);
  }
}

/**
 * Archive dead links using archive services
 */
async function performDeadLinkArchiving(): Promise<void> {
  try {
    console.log('Background: Performing dead link archiving...');
    
    const healthData = await linkMonitor.getHealthReport();
    const deadLinkIds = healthData.deadLinks.slice(0, 10); // Limit to 10 for performance
    
    if (deadLinkIds.length === 0) {
      console.log('No dead links to archive');
      return;
    }
    
    const archiveResults = await archiveService.batchFindArchives(deadLinkIds);
    let recoveredCount = 0;
    
    // Auto-recover links that have high-confidence archived versions
    for (const result of archiveResults) {
      if (result.bestVersion && result.status === 'found') {
        const success = await archiveService.replaceWithArchivedVersion(result.linkId, result.bestVersion);
        if (success) {
          recoveredCount++;
        }
      }
    }
    
    // Store archive results
    await chrome.storage.local.set({
      nest_background_archives: {
        results: archiveResults,
        recoveredCount,
        archivedAt: new Date().toISOString(),
        reviewed: false
      }
    });
    
    if (recoveredCount > 0) {
      await sendNotification(
        'Links Recovered',
        `Automatically recovered ${recoveredCount} dead link${recoveredCount > 1 ? 's' : ''} from archives.`
      );
    }
    
    console.log(`Dead link archiving completed: ${recoveredCount} recovered`);
  } catch (error) {
    console.error('Dead link archiving failed:', error);
  }
}

/**
 * Perform activity analysis and suggest cleanup actions
 */
async function performActivityAnalysis(): Promise<void> {
  try {
    console.log('Background: Performing activity analysis...');
    
    const data = await storage.getData();
    
    // Analyze old unread items (older than 30 days)
    const oldUnreadItems = data.links.filter(link => {
      const daysSinceCreated = (Date.now() - new Date(link.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreated > 30 && !link.lastViewedAt;
    });
    
    // Analyze large inbox (more than 50 items)
    const inboxSize = data.links.filter(link => !link.archived).length;
    
    let cleanupSuggestions = [];
    
    if (oldUnreadItems.length > 10) {
      cleanupSuggestions.push({
        type: 'archive_old_unread',
        count: oldUnreadItems.length,
        message: `Archive ${oldUnreadItems.length} old unread items`
      });
    }
    
    if (inboxSize > 50) {
      cleanupSuggestions.push({
        type: 'inbox_too_large',
        count: inboxSize,
        message: `Inbox has ${inboxSize} items - consider organizing`
      });
    }
    
    // Store analysis results
    await chrome.storage.local.set({
      nest_background_analysis: {
        suggestions: cleanupSuggestions,
        oldUnreadCount: oldUnreadItems.length,
        inboxSize,
        analyzedAt: new Date().toISOString(),
        reviewed: false
      }
    });
    
    if (cleanupSuggestions.length > 0) {
      await sendNotification(
        'Library Cleanup Suggested',
        `${cleanupSuggestions.length} cleanup suggestion${cleanupSuggestions.length > 1 ? 's' : ''} available.`
      );
    }
    
    console.log(`Activity analysis completed: ${cleanupSuggestions.length} suggestions`);
  } catch (error) {
    console.error('Activity analysis failed:', error);
  }
}

/**
 * Send notification to user
 */
async function sendNotification(title: string, message: string): Promise<void> {
  try {
    // Check if notifications are enabled
    const settings = await chrome.storage.local.get('nest_settings');
    const userSettings = settings.nest_settings || {};
    
    if (!userSettings.enableNotifications) {
      console.log('Notifications disabled by user');
      return;
    }
    
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title,
      message
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

/**
 * Handle messages related to Phase 3 features
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getBackgroundSuggestions') {
    (async () => {
      try {
        const result = await chrome.storage.local.get('nest_background_suggestions');
        const suggestions = result.nest_background_suggestions || { suggestions: [] };
        
        // Mark as viewed
        if (suggestions.suggestions.length > 0) {
          await chrome.storage.local.set({
            nest_background_suggestions: {
              ...suggestions,
              viewed: true
            }
          });
        }
        
        sendResponse({ success: true, suggestions: suggestions.suggestions });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.action === 'getBackgroundDuplicates') {
    (async () => {
      try {
        const result = await chrome.storage.local.get('nest_background_duplicates');
        const duplicates = result.nest_background_duplicates || { duplicates: [] };
        
        sendResponse({ success: true, data: duplicates });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.action === 'getBackgroundArchives') {
    (async () => {
      try {
        const result = await chrome.storage.local.get('nest_background_archives');
        const archives = result.nest_background_archives || { results: [] };
        
        sendResponse({ success: true, data: archives });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.action === 'getBackgroundAnalysis') {
    (async () => {
      try {
        const result = await chrome.storage.local.get('nest_background_analysis');
        const analysis = result.nest_background_analysis || { suggestions: [] };
        
        sendResponse({ success: true, data: analysis });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.action === 'triggerHealthCheck') {
    (async () => {
      try {
        await performLinkHealthCheck();
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  if (request.action === 'triggerDuplicateDetection') {
    (async () => {
      try {
        await performDuplicateDetection();
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
  
  return false; // Let other message handlers process the message
}); 