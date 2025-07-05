import { storage } from '../utils/storage';
import { aiService } from '../utils/ai';
import { SavedLink, Highlight } from '../types';

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

// Handle browser action clicks (this won't fire if there's a popup, but keeping for reference)
chrome.action.onClicked.addListener(async (tab) => {
  // This handler won't fire when a popup is defined in the manifest
  // The popup will handle opening the side panel instead
  console.log('Action clicked, but popup should handle this');
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
      } else if (request.action === 'saveHighlight') {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          const result = await saveHighlight(tabs[0], request.selectedText, request.context, request.position);
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
    
    // Perform comprehensive AI analysis
    console.log('Background: Starting AI analysis...');
    const aiAnalysis = await aiService.analyzeContent(pageContent, title, url);
    console.log('Background: AI analysis complete:', aiAnalysis);

    const newLink = {
      url,
      title,
      favicon: tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      userNote: '',
      aiSummary: aiAnalysis.summary,
      category: aiAnalysis.categorySuggestions[0]?.category || 'general',
      domain: domain,
      isInInbox: true, // New links go to inbox by default
    };

    console.log('Background: saveCurrentPage newLink:', JSON.stringify(newLink));
    const result = await storage.addLink(newLink);
    console.log('Background: saveCurrentPage result:', result);

    if (!result.success) {
      throw new Error(result.error || 'Failed to save link to database.');
    }

    // Log activity for tracking
    if (result.linkId) {
      await storage.logActivity('save', result.linkId, undefined, {
        domain,
        category: newLink.category,
        hasAISummary: !!aiAnalysis.summary
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

async function saveHighlight(tab: chrome.tabs.Tab, selectedText: string, context: string, position: any): Promise<{ success: boolean; error?: string }> {
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
    } else {
      // Create new link with highlight
      const domain = new URL(url).hostname;
      
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
        aiSummary: aiAnalysis.summary,
        category: aiAnalysis.categorySuggestions[0]?.category || 'general',
        domain: domain,
        isInInbox: true,
        highlights: [newHighlight]
      };

      const result = await storage.addLink(newLink);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save highlight to database.');
      }
      
      console.log('Background: Created new link with highlight');
    }

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Highlight Saved',
      message: `"${selectedText.substring(0, 50)}..." has been saved.`
    });

    // Notify sidebar to refresh data
    try {
      await chrome.runtime.sendMessage({ action: 'refreshSidebar' });
    } catch (error) {
      console.log('Could not send refresh message to sidebar:', error);
    }

    return { success: true };
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
    
    // Perform AI analysis
    const aiAnalysis = await aiService.analyzeContent(pageContent, title, url);

    const newLink = {
      url,
      title,
      favicon: tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      userNote: reason, // Store the reason as a user note
      aiSummary: aiAnalysis.summary,
      category: aiAnalysis.categorySuggestions[0]?.category || 'general',
      domain: domain,
      isInInbox: true,
    };

    const result = await storage.addLink(newLink);

    if (!result.success) {
      throw new Error(result.error || 'Failed to save link to database.');
    }

    // Add tags if provided
    if (tags.length > 0 && result.linkId) {
      try {
        await storage.addTagsToLink(result.linkId, tags);
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
  if (command === 'save-page') {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      await saveCurrentPage(tabs[0]);
    }
  } else if (command === 'open-command-palette') {
    // Open the side panel to show command palette
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      await chrome.sidePanel.open({ tabId: tabs[0].id });
      // The sidepanel will handle opening the command palette via its own keyboard listener
    }
  }
}); 