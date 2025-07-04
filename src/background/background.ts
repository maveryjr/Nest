import { storage } from '../utils/storage';
import { aiService } from '../utils/ai';
import { SavedLink } from '../types';

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu
  chrome.contextMenus.create({
    id: 'saveToNest',
    title: 'Save to Nest',
    contexts: ['page', 'link']
  });

  console.log('Nest extension installed');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'saveToNest' && tab) {
    await saveCurrentPage(tab, info.linkUrl);
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

    const result = await storage.addLink(newLink);

    if (!result.success) {
      throw new Error(result.error || 'Failed to save link to database.');
    }

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Saved to Nest',
      message: `"${title}" has been saved.`
    });

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