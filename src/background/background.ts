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
  console.log('Background: Context menu clicked:', info.menuItemId, 'Selection:', info.selectionText);
  if (info.menuItemId === 'saveToNest' && tab) {
    await saveCurrentPage(tab, info.linkUrl);
  } else if (info.menuItemId === 'saveHighlight' && tab && info.selectionText) {
    console.log('Background: Calling saveHighlight from context menu');
    // For context menu, we don't have context and position info, so we'll use just the selected text
    await saveHighlight(tab, info.selectionText, info.selectionText, undefined);
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

async function saveCurrentPage(tab: chrome.tabs.Tab, linkUrl?: string): Promise<{ success: boolean; error?: string }> {
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
    const aiSummary = await aiService.generateSummary(pageContent, title, url);

    const newLink = {
      url,
      title,
      favicon: tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      userNote: '',
      aiSummary,
      category: 'general',
      domain: domain,
      isInInbox: true, // New links go to inbox by default
    };

    console.log('Background: saveCurrentPage newLink:', JSON.stringify(newLink));
    const result = await storage.addLink(newLink);
    console.log('Background: saveCurrentPage result:', result);

    if (!result.success) {
      throw new Error(result.error || 'Failed to save link to database.');
    }

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Saved to Nest',
      message: `"${title}" has been saved.`
    });

    // Notify sidebar to refresh data
    try {
      await chrome.runtime.sendMessage({ action: 'refreshSidebar' });
    } catch (error) {
      console.log('Could not send refresh message to sidebar:', error);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to save page:', error);
    const errorMessage = (error as Error).message || 'An unknown error occurred.';
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Nest Error',
      message: `Failed to save page: ${errorMessage}`
    });
    return { success: false, error: errorMessage };
  }
}

async function getPageContent(tabId: number): Promise<{ content: string }> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'getPageContent' });
    return response;
  } catch (error) {
    console.error('Failed to get page content:', error);
    return { content: '' };
  }
}

async function saveHighlight(tab: chrome.tabs.Tab, selectedText: string, context?: string, position?: any): Promise<{ success: boolean; error?: string; linkId?: string }> {
  console.log('Background: saveHighlight called with:', { selectedText, context, position });
  try {
    const url = tab.url;
    const title = tab.title || 'Untitled';
    
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return { success: false, error: 'Cannot save highlights on this type of page.' };
    }

    const domain = new URL(url).hostname;

    // Check if we already have a saved link for this URL
    const existingLink = await storage.getLinkByUrl(url);
    console.log('Background: Existing link found:', !!existingLink);
    
    const highlight: Highlight = {
      id: `highlight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      selectedText,
      context: context || selectedText, // Use selectedText as context if context is not provided
      position,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Background: Created highlight:', JSON.stringify(highlight));

    let linkId: string;

    if (existingLink) {
      // Add highlight to existing link
      const updatedHighlights = [...(existingLink.highlights || []), highlight];
      console.log('Background: Adding highlight to existing link, total highlights:', updatedHighlights.length);
      const updateResult = await storage.updateLink(existingLink.id, { highlights: updatedHighlights });
      console.log('Background: updateLink result:', updateResult);
      linkId = existingLink.id;
    } else {
      // Create new link with highlight
      console.log('Background: Creating new link with highlight');
      const newLink = {
        url,
        title,
        favicon: tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
        userNote: '',
        category: 'general',
        domain: domain,
        isInInbox: true,
        highlights: [highlight]
      };
      console.log('Background: newLink with highlight:', JSON.stringify(newLink));
      const result = await storage.addLink(newLink);
      console.log('Background: addLink result:', result);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save link to database.');
      }
      linkId = result.linkId!;
    }

    console.log('Background: Highlight saved successfully, linkId:', linkId);

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Highlight Saved',
      message: `Highlight saved from "${title}"`
    });

    // Send confirmation message to content script
    if (tab.id) {
      try {
        chrome.tabs.sendMessage(tab.id, { action: 'showHighlightConfirmation' });
      } catch (error) {
        console.log('Could not send confirmation to content script:', error);
      }
    }

    // Notify sidebar to refresh data
    try {
      await chrome.runtime.sendMessage({ action: 'refreshSidebar' });
    } catch (error) {
      console.log('Could not send refresh message to sidebar:', error);
    }

    return { success: true, linkId };
  } catch (error) {
    console.error('Failed to save highlight:', error);
    const errorMessage = (error as Error).message || 'An unknown error occurred.';
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Nest Error',
      message: `Failed to save highlight: ${errorMessage}`
    });
    return { success: false, error: errorMessage };
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