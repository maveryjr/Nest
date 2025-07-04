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
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log('Background: Message received:', request);
  try {
    switch (request.action) {
      case 'saveCurrentPage':
        // Query for the active tab instead of relying on sender.tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          await saveCurrentPage(tabs[0]);
          sendResponse({ success: true });
        } else {
          console.error("Background: saveCurrentPage called but no active tab was found.");
          sendResponse({ success: false, error: 'No active tab found.' });
        }
        break;
      
      case 'getPageContent':
        if (sender.tab && sender.tab.id) {
          const response = await getPageContent(sender.tab.id);
          sendResponse(response);
        } else {
          console.error("Background: getPageContent called but sender.tab.id is missing.");
          sendResponse({ content: '' });
        }
        break;

      default:
        console.log("Background: Unknown action received:", request.action);
        sendResponse({ error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Background script error:', error);
    sendResponse({ success: false, error: (error as Error).message });
  }
  return true; // Keep message channel open for async response
});

async function saveCurrentPage(tab: chrome.tabs.Tab, linkUrl?: string): Promise<void> {
  console.log('Background: saveCurrentPage started for tab:', tab.id);
  const url = linkUrl || tab.url;
  const title = tab.title || 'Untitled';
  
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    console.log('Cannot save this type of page');
    return;
  }

  try {
    console.log('Background: Getting page content...');
    // Get page content for AI summary
    let pageContent = '';
    try {
      const response = await chrome.tabs.sendMessage(tab.id!, { action: 'getPageContent' });
      pageContent = response?.content || '';
      console.log('Background: Page content received, length:', pageContent.length);
    } catch (error) {
      console.log('Could not extract page content:', error);
    }

    // Get favicon
    let favicon = tab.favIconUrl;
    if (!favicon) {
      const domain = new URL(url).hostname;
      favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    }

    console.log('Background: Generating AI summary...');
    // Generate AI summary
    const aiSummary = await aiService.generateSummary(pageContent, title, url);

    // Determine category based on domain
    const domain = new URL(url).hostname;
    let suggestedCategory = 'general';
    
    if (domain.includes('github.com')) {
      suggestedCategory = 'work';
    } else if (domain.includes('youtube.com') || domain.includes('medium.com')) {
      suggestedCategory = 'learning';
    }

    // Create new link
    const newLink: SavedLink = {
      id: Date.now().toString(),
      url,
      title,
      favicon,
      userNote: '',
      aiSummary,
      category: suggestedCategory,
      domain: domain,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Background: New link object created:', newLink);
    // Save to storage
    await storage.addLink(newLink);
    console.log('Background: Link saved to storage.');

    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Saved to Nest',
      message: `"${title}" has been saved to your Holding Area`
    });

    console.log('Page saved successfully:', newLink);
  } catch (error) {
    console.error('Failed to save page:', error);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Nest Error',
      message: 'Failed to save page. Please try again.'
    });
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
  }
}); 