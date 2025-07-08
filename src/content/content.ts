// Content script for extracting page content and handling highlights
console.log('Nest content script loaded');

// Import React and ReactDOM for floating AI, sticky notes, and screenshot tool
import React from 'react';
import ReactDOM from 'react-dom/client';
import FloatingAI from './FloatingAI';
import StickyNotes from './StickyNotes';
import ScreenshotTool from './ScreenshotTool';

// State for floating AI
let floatingAIRoot: any = null;
let isFloatingAIVisible = false;

// State for sticky notes
let stickyNotesRoot: any = null;
let isStickyNotesVisible = false;

// State for screenshot tool
let screenshotToolRoot: any = null;
let isScreenshotToolVisible = false;

// Global variables
let lastSelection: { text: string; context: string; position: any } | null = null;
let highlightButton: HTMLElement | null = null;
let pageHighlights: Map<string, HTMLElement> = new Map(); // Store highlight elements by ID
let highlightsEnabled: boolean = true; // Global toggle for highlights

// Add at the top with other variables
let problematicSites: string[] = [
  'msn.com',
  'cnn.com', 
  'bbc.com',
  'foxnews.com',
  'washingtonpost.com',
  'nytimes.com'
];

// Add color and style options
const highlightColorOptions = {
  yellow: { primary: '#fef08a', secondary: '#fde047', tertiary: '#facc15' },
  blue: { primary: '#bfdbfe', secondary: '#93c5fd', tertiary: '#60a5fa' },
  green: { primary: '#bbf7d0', secondary: '#86efac', tertiary: '#4ade80' },
  pink: { primary: '#fce7f3', secondary: '#f9a8d4', tertiary: '#ec4899' },
  purple: { primary: '#e9d5ff', secondary: '#c084fc', tertiary: '#a855f7' },
  orange: { primary: '#fed7aa', secondary: '#fdba74', tertiary: '#fb923c' },
  red: { primary: '#fecaca', secondary: '#fca5a5', tertiary: '#ef4444' }
};

// Get user highlight settings
async function getHighlightSettings() {
  try {
    const result = await chrome.storage.local.get('nest_settings');
    const settings = result.nest_settings || {};
    return {
      color: settings.highlightColor || 'yellow',
      style: settings.highlightStyle || 'gradient'
    };
  } catch (error) {
    console.warn('[Nest] Could not get highlight settings, using defaults');
    return { color: 'yellow', style: 'gradient' };
  }
}

// Generate highlight styles based on user preferences
function generateHighlightStyles(color: string, style: string): string {
  const colors = highlightColorOptions[color as keyof typeof highlightColorOptions] || highlightColorOptions.yellow;
  
  switch (style) {
    case 'solid':
      return `
        background: ${colors.primary} !important;
        border: 1px solid ${colors.secondary} !important;
      `;
    case 'gradient':
      return `
        background: linear-gradient(120deg, ${colors.primary} 0%, ${colors.secondary} 100%) !important;
        border: 1px solid ${colors.tertiary} !important;
      `;
    case 'underline':
      return `
        background: transparent !important;
        border-bottom: 3px solid ${colors.secondary} !important;
        border-radius: 0 !important;
        box-shadow: 0 3px 0 ${colors.primary} !important;
      `;
    case 'outline':
      return `
        background: transparent !important;
        border: 2px solid ${colors.secondary} !important;
        box-shadow: 0 0 0 1px ${colors.primary} !important;
      `;
    default:
      return `
        background: linear-gradient(120deg, ${colors.primary} 0%, ${colors.secondary} 100%) !important;
        border: 1px solid ${colors.tertiary} !important;
      `;
  }
}

// Helper function to check if current site is problematic
function isProblematicSite(): boolean {
  const hostname = window.location.hostname.toLowerCase();
  return problematicSites.some(site => hostname.includes(site));
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content Script: Message received:', request);
  if (request.action === 'getPageContent') {
    const content = extractPageContent();
    console.log('Content Script: Sending page content, length:', content.length);
    sendResponse({ content });
  } else if (request.action === 'showSaveConfirmation') {
    showSaveConfirmation();
  } else if (request.action === 'showHighlightConfirmation') {
    showHighlightConfirmation();
  } else if (request.action === 'toggleFloatingAI') {
    console.log('Nest: Toggle floating AI');
    toggleFloatingAI();
    sendResponse({ success: true });
  } else if (request.action === 'toggleStickyNotes') {
    console.log('Nest: Toggle sticky notes');
    toggleStickyNotes();
    sendResponse({ success: true });
  } else if (request.action === 'toggleScreenshotTool') {
    console.log('Nest: Toggle screenshot tool');
    toggleScreenshotTool();
    sendResponse({ success: true });
  } else if (request.action === 'restoreHighlights') {
    console.log('Nest: Restoring highlights');
    restoreHighlights(request.highlights);
    sendResponse({ success: true });
  } else if (request.action === 'removeHighlight') {
    console.log('Nest: Removing highlight');
    removeHighlight(request.highlightId);
    sendResponse({ success: true });
  } else if (request.action === 'toggleHighlights') {
    console.log('Nest: Toggling highlights');
    toggleHighlights(request.enabled);
    sendResponse({ success: true });
  }
  return true;
});

// Initialize highlights when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('Nest: DOM loaded, checking for existing highlights');
  checkForExistingHighlights();
});

// Also check when page is fully loaded
window.addEventListener('load', () => {
  console.log('Nest: Page loaded, checking for existing highlights');
  checkForExistingHighlights();
});

// Handle text selection for highlights
document.addEventListener('mouseup', handleTextSelection);
document.addEventListener('keyup', handleTextSelection);
console.log('Nest: Text selection event listeners added');

function handleTextSelection() {
  console.log('Nest: Text selection event fired');
  
  // Add a small delay to ensure selection is stable
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    console.log('Nest: Selected text:', selectedText, 'Length:', selectedText?.length);
    
    if (selectedText && selectedText.length > 10) { // Minimum length for meaningful highlights
      console.log('Nest: Text selection meets minimum length requirement');
      const range = selection?.getRangeAt(0);
      if (range) {
        console.log('Nest: Range found, creating highlight button');
        // Get context around the selection
        const context = getSelectionContext(range);
        
        // Store selection data
        lastSelection = {
          text: selectedText,
          context,
          position: getSelectionPosition(range)
        };
        
        showHighlightButton(range);
      }
    } else {
      console.log('Nest: Text selection too short or empty, hiding button');
      hideHighlightButton();
      lastSelection = null;
    }
  }, 100); // 100ms delay
}

function getSelectionContext(range: Range): string {
  const container = range.commonAncestorContainer;
  const textContent = container.textContent || '';
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;
  
  // Get surrounding context (up to 100 characters before and after)
  const contextStart = Math.max(0, startOffset - 100);
  const contextEnd = Math.min(textContent.length, endOffset + 100);
  
  return textContent.substring(contextStart, contextEnd);
}

function getSelectionPosition(range: Range): any {
  // Simple position tracking - could be enhanced with XPath for more precision
  return {
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    // Could add XPath here for more robust positioning
  };
}

function showHighlightButton(range: Range) {
  console.log('Nest: Creating highlight button');
  hideHighlightButton(); // Remove any existing button
  
  const rect = range.getBoundingClientRect();
  console.log('Nest: Button position:', rect);
  
  // Check if rect is valid (has dimensions)
  if (rect.width === 0 && rect.height === 0) {
    console.log('Nest: Range rect is empty, trying alternative positioning');
    
    // Try to get position from the selection itself without modifying DOM
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      // Try to get position from the start container
      const startContainer = range.startContainer;
      let alternativeRect: DOMRect | null = null;
      
      if (startContainer.nodeType === Node.TEXT_NODE && startContainer.parentElement) {
        // If it's a text node, get the parent element's position
        alternativeRect = startContainer.parentElement.getBoundingClientRect();
      } else if (startContainer.nodeType === Node.ELEMENT_NODE) {
        // If it's an element node, get its position
        alternativeRect = (startContainer as Element).getBoundingClientRect();
      }
      
      console.log('Nest: Alternative positioning:', alternativeRect);
      
      if (alternativeRect && alternativeRect.width > 0 && alternativeRect.height > 0) {
        createButton(alternativeRect);
        return;
      }
    }
    
    console.log('Nest: All positioning methods failed, using viewport center fallback');
    // Use a default position near the center of the viewport
    const fallbackRect = {
      bottom: window.innerHeight / 2,
      left: window.innerWidth / 2,
      top: window.innerHeight / 2,
      right: window.innerWidth / 2,
      width: 0,
      height: 0
    };
    createButton(fallbackRect);
    return;
  }
  
  createButton(rect);
}

function createButton(rect: any) {
  highlightButton = document.createElement('div');
  highlightButton.id = 'nest-highlight-button';
  highlightButton.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    </svg>
    Save highlight
  `;
  
  // Calculate position with better handling of negative coordinates
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
  
  // Get viewport dimensions
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  
  // Calculate raw position
  let rawTop = (rect.bottom || rect.top || 0);
  let rawLeft = (rect.left || rect.right || 0);
  
  // Handle negative coordinates by using current scroll position as reference
  if (rawTop < 0) {
    rawTop = scrollTop + 100; // Position 100px from current scroll position
  }
  
  if (rawLeft < 0) {
    rawLeft = 50; // Position 50px from left edge
  }
  
  // Final position calculation
  const buttonTop = rawTop + 10; // Add small offset below selection
  const buttonLeft = Math.max(10, Math.min(viewportWidth - 200, rawLeft));
  
  console.log('Nest: Position calculation:', {
    rect,
    scrollTop,
    scrollLeft,
    rawTop,
    rawLeft,
    buttonTop,
    buttonLeft,
    viewportHeight,
    viewportWidth
  });
  
  highlightButton.style.cssText = `
    position: absolute;
    top: ${buttonTop}px;
    left: ${buttonLeft}px;
    background: #10b981 !important;
    color: white !important;
    padding: 8px 12px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 999999 !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    display: flex !important;
    align-items: center;
    gap: 6px;
    animation: fadeIn 0.2s ease-out;
    border: 1px solid #059669 !important;
    text-decoration: none;
    pointer-events: auto !important;
    user-select: none;
    min-width: 140px;
    opacity: 1 !important;
    visibility: visible !important;
  `;
  
  // Add animation keyframes
  if (!document.getElementById('nest-highlight-styles')) {
    const style = document.createElement('style');
    style.id = 'nest-highlight-styles';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      #nest-highlight-button:hover {
        background: #059669 !important;
        transform: translateY(-1px);
      }
    `;
    document.head.appendChild(style);
  }
  
  // Add click handler with debug logging
  const clickHandler = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Nest: Highlight button clicked!');
    saveHighlight();
  };
  
  highlightButton.addEventListener('click', clickHandler);
  highlightButton.addEventListener('mousedown', (e) => {
    e.preventDefault();
    console.log('Nest: Button mousedown');
  });
  
  document.body.appendChild(highlightButton);
  console.log('Nest: Highlight button added to page at position:', buttonTop, buttonLeft);
  
  // Force a reflow to ensure the button is rendered
  highlightButton.offsetHeight;
  
  // Check if button is actually visible
  const buttonRect = highlightButton.getBoundingClientRect();
  const isVisible = buttonRect.top >= 0 && buttonRect.top <= viewportHeight && 
                   buttonRect.left >= 0 && buttonRect.left <= viewportWidth;
  console.log('Nest: Button visibility check:', { buttonRect, isVisible });
  
  if (!isVisible) {
    console.log('Nest: Button is not visible, repositioning to viewport center');
    highlightButton.style.top = `${scrollTop + viewportHeight / 2}px`;
    highlightButton.style.left = `${viewportWidth / 2 - 70}px`;
  }
  
  // Auto-hide after 8 seconds (increased from 5)
  setTimeout(() => {
    if (highlightButton) {
      hideHighlightButton();
    }
  }, 8000);
}

function hideHighlightButton() {
  if (highlightButton && highlightButton.parentNode) {
    highlightButton.parentNode.removeChild(highlightButton);
    highlightButton = null;
  }
}

function saveHighlight() {
  console.log('[Nest] saveHighlight called', lastSelection);
  if (!lastSelection) {
    console.log('[Nest] No selection data available');
    return;
  }
  
  // Store selection reference to avoid null issues
  const selection = lastSelection;
  hideHighlightButton();
  
  // Get the current selection range
  const windowSelection = window.getSelection();
  const range = windowSelection?.getRangeAt(0);
  console.log('[Nest] saveHighlight selection', windowSelection, 'range', range);
  
  if (range) {
    // Create a temporary ID for the highlight
    const tempHighlightId = `temp_${Date.now()}`;
    
    // Create the visual highlight immediately
    createVisualHighlight(range, tempHighlightId).then(highlightElement => {
      if (highlightElement) {
        console.log('[Nest] Visual highlight created, sending to background script');
        
        // Send message to background script to save highlight
        chrome.runtime.sendMessage({
          action: 'saveHighlight',
          selectedText: selection.text,
          context: selection.context,
          position: selection.position
        }, (response) => {
          console.log('[Nest] Received response from background script:', response);
          if (response && response.success) {
            // Update the highlight element with the real ID
            if (response.highlightId) {
              highlightElement.setAttribute('data-nest-highlight-id', response.highlightId);
              pageHighlights.delete(tempHighlightId);
              pageHighlights.set(response.highlightId, highlightElement);
            }
            showHighlightConfirmation();
          } else {
            // If save failed, remove the visual highlight
            removeHighlight(tempHighlightId);
            console.error('[Nest] Failed to save highlight:', response?.error);
          }
        });
      } else {
        console.warn('[Nest] Visual highlight creation failed, still saving to storage');
        // If visual highlight creation failed, still try to save to storage
        chrome.runtime.sendMessage({
          action: 'saveHighlight',
          selectedText: selection.text,
          context: selection.context,
          position: selection.position
        }, (response) => {
          console.log('[Nest] Received response from background script:', response);
          if (response && response.success) {
            showHighlightConfirmation();
          } else {
            console.error('[Nest] Failed to save highlight:', response?.error);
          }
        });
      }
    });
  } else {
    console.warn('[Nest] No range available, still saving to storage');
    // If no range available, still try to save to storage
    chrome.runtime.sendMessage({
      action: 'saveHighlight',
      selectedText: selection.text,
      context: selection.context,
      position: selection.position
    }, (response) => {
      console.log('[Nest] Received response from background script:', response);
      if (response && response.success) {
        showHighlightConfirmation();
      } else {
        console.error('[Nest] Failed to save highlight:', response?.error);
      }
    });
  }
  
  lastSelection = null;
}

// Hide highlight button when user clicks elsewhere
document.addEventListener('click', (event) => {
  if (highlightButton && !highlightButton.contains(event.target as Node)) {
    hideHighlightButton();
  }
});

function extractPageContent(): string {
  // Remove script and style elements
  const elementsToRemove = document.querySelectorAll('script, style, nav, header, footer, .ad, .advertisement');
  const clonedDoc = document.cloneNode(true) as Document;
  
  elementsToRemove.forEach(el => {
    const clonedEl = clonedDoc.querySelector(el.tagName.toLowerCase());
    if (clonedEl) {
      clonedEl.remove();
    }
  });

  // Try to find main content area
  let contentElement = 
    clonedDoc.querySelector('main') ||
    clonedDoc.querySelector('article') ||
    clonedDoc.querySelector('.content') ||
    clonedDoc.querySelector('#content') ||
    clonedDoc.querySelector('.post') ||
    clonedDoc.querySelector('.entry') ||
    clonedDoc.body;

  if (!contentElement) {
    contentElement = clonedDoc.body;
  }

  // Extract text content
  let text = contentElement.textContent || contentElement.innerText || '';
  
  // Clean up the text
  text = text
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\n\s*\n/g, '\n') // Remove empty lines
    .trim();

  // Limit length to avoid excessive content
  const maxLength = 3000;
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '...';
  }

  return text;
}

// Add visual feedback when page is saved
function showSaveConfirmation() {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
  `;
  
  notification.textContent = '✓ Saved to Nest';
  
  showNotification(notification);
}

// Modified showHighlightConfirmation for problematic sites
function showHighlightConfirmation() {
  const notification = document.createElement('div');
  const isProblematic = isProblematicSite();
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${isProblematic ? '#f59e0b' : '#8b5cf6'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
    max-width: 300px;
  `;
  
  if (isProblematic) {
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <span>⚠️</span>
        <strong>Highlight Saved</strong>
      </div>
      <div style="font-size: 12px; opacity: 0.9;">
        Text saved to Nest. Visual highlighting not supported on this site.
      </div>
    `;
  } else {
    notification.innerHTML = '✨ Highlight saved to Nest';
  }
  
  showNotification(notification);
}

function showNotification(notification: HTMLElement) {
  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 3000);
}

// Floating AI functionality
function toggleFloatingAI() {
  console.log('Nest: toggleFloatingAI called, current state:', isFloatingAIVisible);
  
  if (isFloatingAIVisible) {
    hideFloatingAI();
  } else {
    showFloatingAI();
  }
}

function showFloatingAI() {
  console.log('Nest: showFloatingAI called');
  
  if (floatingAIRoot) {
    console.log('Nest: Floating AI already exists, just showing');
    isFloatingAIVisible = true;
    renderFloatingAI();
    return;
  }
  
  // Create container for floating AI
  const container = document.createElement('div');
  container.id = 'nest-floating-ai-container';
  document.body.appendChild(container);
  
  // Create React root
  floatingAIRoot = ReactDOM.createRoot(container);
  isFloatingAIVisible = true;
  
  renderFloatingAI();
}

function hideFloatingAI() {
  console.log('Nest: hideFloatingAI called');
  isFloatingAIVisible = false;
  renderFloatingAI();
}

function renderFloatingAI() {
  if (!floatingAIRoot) return;
  
  const pageContent = extractPageContent();
  const pageTitle = document.title;
  const pageUrl = window.location.href;
  
  const element = React.createElement(FloatingAI, {
    isVisible: isFloatingAIVisible,
    onClose: hideFloatingAI,
    pageContent,
    pageTitle,
    pageUrl
  });
  
  floatingAIRoot.render(element);
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Floating AI (Alt + A)
  if (e.altKey && e.key === 'a') {
    e.preventDefault();
    toggleFloatingAI();
  }
  // Sticky Notes (Alt + S)
  if (e.altKey && e.key === 's') {
    e.preventDefault();
    toggleStickyNotes();
  }
  // Screenshot Tool (Alt + C)
  if (e.altKey && e.key === 'c') {
    e.preventDefault();
    toggleScreenshotTool();
  }
});

// Sticky Notes functionality
function toggleStickyNotes() {
  console.log('Nest: toggleStickyNotes called, current state:', isStickyNotesVisible);
  
  if (isStickyNotesVisible) {
    hideStickyNotes();
  } else {
    showStickyNotes();
  }
}

function showStickyNotes() {
  console.log('Nest: showStickyNotes called');
  
  if (stickyNotesRoot) {
    console.log('Nest: Sticky notes already exists, just showing');
    isStickyNotesVisible = true;
    renderStickyNotes();
    return;
  }
  
  // Create container for sticky notes
  const container = document.createElement('div');
  container.id = 'nest-sticky-notes-container';
  document.body.appendChild(container);
  
  // Create React root
  stickyNotesRoot = ReactDOM.createRoot(container);
  isStickyNotesVisible = true;
  
  renderStickyNotes();
}

function hideStickyNotes() {
  console.log('Nest: hideStickyNotes called');
  isStickyNotesVisible = false;
  renderStickyNotes();
}

function renderStickyNotes() {
  if (!stickyNotesRoot) return;
  
  const element = React.createElement(StickyNotes, {
    isVisible: isStickyNotesVisible,
    onToggle: toggleStickyNotes
  });
  
  stickyNotesRoot.render(element);
}

// Initialize sticky notes on page load
setTimeout(() => {
  showStickyNotes();
}, 1000); // Delay to ensure page is fully loaded

// Screenshot Tool functionality
function toggleScreenshotTool() {
  console.log('Nest: toggleScreenshotTool called, current state:', isScreenshotToolVisible);
  
  if (isScreenshotToolVisible) {
    hideScreenshotTool();
  } else {
    showScreenshotTool();
  }
}

function showScreenshotTool() {
  console.log('Nest: showScreenshotTool called');
  
  if (screenshotToolRoot) {
    console.log('Nest: Screenshot tool already exists, just showing');
    isScreenshotToolVisible = true;
    renderScreenshotTool();
    return;
  }
  
  // Create container for screenshot tool
  const container = document.createElement('div');
  container.id = 'nest-screenshot-tool-container';
  document.body.appendChild(container);
  
  // Create React root
  screenshotToolRoot = ReactDOM.createRoot(container);
  isScreenshotToolVisible = true;
  
  renderScreenshotTool();
}

function hideScreenshotTool() {
  console.log('Nest: hideScreenshotTool called');
  isScreenshotToolVisible = false;
  renderScreenshotTool();
}

function renderScreenshotTool() {
  if (!screenshotToolRoot) return;
  
  const element = React.createElement(ScreenshotTool, {
    isVisible: isScreenshotToolVisible,
    onClose: hideScreenshotTool
  });
  
  screenshotToolRoot.render(element);
} 

// Visual highlighting functionality
async function createVisualHighlight(range: Range, highlightId: string): Promise<HTMLElement | null> {
  try {
    console.log('[Nest] createVisualHighlight called', { highlightId, range });
    if (!highlightsEnabled) {
      console.log('[Nest] Highlights are disabled, skipping visual highlight');
      return null;
    }
    if (!range) {
      console.warn('[Nest] No range provided to createVisualHighlight');
      return null;
    }
    
    // Check if this is a problematic site
    if (isProblematicSite()) {
      console.log('[Nest] Problematic site detected, skipping visual highlight but saving text');
      return null;
    }
    
    // Get user's highlight preferences
    const { color, style } = await getHighlightSettings();
    const customStyles = generateHighlightStyles(color, style);
    
    const highlightSpan = document.createElement('span');
    highlightSpan.className = 'nest-highlight';
    highlightSpan.setAttribute('data-nest-highlight-id', highlightId);

    // Apply user's preferred styles
    highlightSpan.style.cssText = `
      ${customStyles}
      color: inherit !important;
      padding: 2px 4px !important;
      border-radius: 3px !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
      cursor: pointer !important;
      position: relative !important;
      display: inline !important;
      text-decoration: none !important;
      z-index: 2147483647 !important;
      opacity: 1 !important;
      visibility: visible !important;
      font-weight: inherit !important;
      font-size: inherit !important;
      line-height: inherit !important;
      margin: 0 !important;
      vertical-align: baseline !important;
    `;

    highlightSpan.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showHighlightInfo(highlightId);
    });
    
    // Try surroundContents (works only if range is valid and doesn't cross elements)
    try {
      range.surroundContents(highlightSpan);
      pageHighlights.set(highlightId, highlightSpan);
      console.log('[Nest] Visual highlight created with surroundContents', { highlightId });
      return highlightSpan;
    } catch (err) {
      console.warn('[Nest] surroundContents failed', err);
      // Fallback: only highlight if selection is within a single text node
      if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
        const textNode = range.startContainer as Text;
        const text = textNode.textContent || '';
        const before = text.slice(0, range.startOffset);
        const selected = text.slice(range.startOffset, range.endOffset);
        const after = text.slice(range.endOffset);
        const parent = textNode.parentNode;
        if (!parent) {
          console.warn('[Nest] No parent node for text node');
          return null;
        }
        const beforeNode = document.createTextNode(before);
        const selectedNode = document.createTextNode(selected);
        const afterNode = document.createTextNode(after);
        highlightSpan.appendChild(selectedNode);
        parent.insertBefore(beforeNode, textNode);
        parent.insertBefore(highlightSpan, textNode);
        parent.insertBefore(afterNode, textNode);
        parent.removeChild(textNode);
        pageHighlights.set(highlightId, highlightSpan);
        console.log('[Nest] Visual highlight created by splitting text node', { highlightId });
        return highlightSpan;
      } else {
        console.warn('[Nest] Could not highlight selection (complex/multi-node selection)', { highlightId });
        return null;
      }
    }
  } catch (error) {
    console.error('[Nest] Failed to create visual highlight:', error);
    return null;
  }
}

function removeHighlight(highlightId: string) {
  console.log('Nest: Removing highlight:', highlightId);
  
  const highlightElement = pageHighlights.get(highlightId);
  if (highlightElement && highlightElement.parentNode) {
    // Replace the highlight span with its text content
    const textContent = highlightElement.textContent || '';
    const textNode = document.createTextNode(textContent);
    highlightElement.parentNode.replaceChild(textNode, highlightElement);
    
    // Remove from our tracking
    pageHighlights.delete(highlightId);
    
    console.log('Nest: Highlight removed successfully');
  }
}

function showHighlightInfo(highlightId: string) {
  console.log('Nest: Showing highlight info for:', highlightId);
  
  // Create a tooltip to show highlight information
  const tooltip = document.createElement('div');
  tooltip.id = 'nest-highlight-tooltip';
  tooltip.style.cssText = `
    position: fixed;
    background: #1f2937;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 14px;
    max-width: 300px;
    animation: fadeIn 0.2s ease-out;
  `;
  
  tooltip.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
      </svg>
      <strong>Nest Highlight</strong>
    </div>
    <div style="margin-bottom: 8px;">
      <button id="nest-remove-highlight" style="
        background: #ef4444;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      ">Remove Highlight</button>
    </div>
  `;
  
  // Position the tooltip near the highlight
  const highlightElement = pageHighlights.get(highlightId);
  if (highlightElement) {
    const rect = highlightElement.getBoundingClientRect();
    tooltip.style.left = `${rect.left}px`;
    tooltip.style.top = `${rect.bottom + 10}px`;
  }
  
  document.body.appendChild(tooltip);
  
  // Add remove functionality
  const removeButton = tooltip.querySelector('#nest-remove-highlight');
  if (removeButton) {
    removeButton.addEventListener('click', () => {
      removeHighlight(highlightId);
      hideHighlightTooltip();
      
      // Notify background script to remove from storage
      chrome.runtime.sendMessage({
        action: 'removeHighlightFromStorage',
        highlightId,
        url: window.location.href
      });
    });
  }
  
  // Hide tooltip when clicking outside
  setTimeout(() => {
    document.addEventListener('click', hideHighlightTooltip, { once: true });
  }, 100);
}

function hideHighlightTooltip() {
  const tooltip = document.getElementById('nest-highlight-tooltip');
  if (tooltip && tooltip.parentNode) {
    tooltip.parentNode.removeChild(tooltip);
  }
}

function checkForExistingHighlights() {
  console.log('Nest: Checking for existing highlights on page');
  
  // Get the current page URL
  const currentUrl = window.location.href;
  
  // Request highlights for this page from the background script
  chrome.runtime.sendMessage({
    action: 'getHighlightsForPage',
    url: currentUrl
  }, (response) => {
    if (response && response.highlights && response.highlights.length > 0) {
      console.log('Nest: Found', response.highlights.length, 'highlights to restore');
      restoreHighlights(response.highlights);
    } else {
      console.log('Nest: No highlights found for this page');
    }
  });
}

function restoreHighlights(highlights: any[]) {
  console.log('Nest: Restoring highlights:', highlights);
  
  highlights.forEach(highlight => {
    if (highlight.position && highlight.selectedText) {
      try {
        // Try to find the text in the page
        const textNodes = findTextNodes(document.body, highlight.selectedText);
        
        if (textNodes.length > 0) {
          // Use the first occurrence found
          const textNode = textNodes[0];
          const range = document.createRange();
          
          // Find the exact position within the text node
          const startOffset = textNode.textContent?.indexOf(highlight.selectedText) || 0;
          const endOffset = startOffset + highlight.selectedText.length;
          
          range.setStart(textNode, startOffset);
          range.setEnd(textNode, endOffset);
          
          // Create the visual highlight
          createVisualHighlight(range, highlight.id);
          console.log('Nest: Restored highlight:', highlight.id);
        } else {
          console.log('Nest: Could not find text for highlight:', highlight.id);
        }
      } catch (error) {
        console.error('Nest: Failed to restore highlight:', highlight.id, error);
      }
    }
  });
}

function findTextNodes(element: Node, searchText: string): Text[] {
  const textNodes: Text[] = [];
  
  function traverse(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.includes(searchText)) {
        textNodes.push(node as Text);
      }
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        traverse(node.childNodes[i]);
      }
    }
  }
  
  traverse(element);
  return textNodes;
}

function toggleHighlights(enabled: boolean) {
  highlightsEnabled = enabled;
  
  if (enabled) {
    // Show all highlights
    pageHighlights.forEach((element, id) => {
      element.style.display = 'inline';
      element.style.opacity = '1';
    });
    console.log('Nest: Highlights enabled');
  } else {
    // Hide all highlights
    pageHighlights.forEach((element, id) => {
      element.style.display = 'none';
      element.style.opacity = '0';
    });
    console.log('Nest: Highlights disabled');
  }
}

// Add global styles for highlights
function addHighlightStyles() {
  if (document.getElementById('nest-highlight-styles')) {
    return; // Styles already added
  }
  
  const style = document.createElement('style');
  style.id = 'nest-highlight-styles';
  style.textContent = `
    span.nest-highlight[data-nest-highlight-id] {
      background: linear-gradient(120deg, #fef08a 0%, #fde047 100%) !important;
      color: inherit !important;
      padding: 2px 0 !important;
      border-radius: 3px !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
      transition: all 0.2s ease !important;
      cursor: pointer !important;
      position: relative !important;
      display: inline !important;
      text-decoration: none !important;
      border: none !important;
      outline: none !important;
      z-index: 2147483647 !important;
    }
    span.nest-highlight[data-nest-highlight-id]:hover {
      background: linear-gradient(120deg, #fde047 0%, #facc15 100%) !important;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
      transform: translateY(-1px) !important;
    }
    span.nest-highlight[data-nest-highlight-id]::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
    }
    span.nest-highlight[data-nest-highlight-id]:hover::before {
      opacity: 1;
    }
    #nest-highlight-tooltip {
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

// Initialize highlight styles when page loads
document.addEventListener('DOMContentLoaded', () => {
  addHighlightStyles();
});

// Also add styles when page is fully loaded
window.addEventListener('load', () => {
  addHighlightStyles();
}); 