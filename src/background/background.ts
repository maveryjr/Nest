import { storage } from '../utils/storage';
import { aiService } from '../utils/ai';
import { SavedLink, Highlight } from '../types';
import { AnalyticsService } from '../utils/analytics';

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
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