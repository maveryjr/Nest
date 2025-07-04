// Content script for extracting page content and handling highlights
console.log('Nest content script loaded');

// Global variables
let lastSelection: { text: string; context: string; position: any } | null = null;
let highlightButton: HTMLElement | null = null;

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
  }
  return true;
});

// Handle text selection for highlights
document.addEventListener('mouseup', handleTextSelection);
document.addEventListener('keyup', handleTextSelection);

function handleTextSelection() {
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();
  
  if (selectedText && selectedText.length > 10) { // Minimum length for meaningful highlights
    const range = selection?.getRangeAt(0);
    if (range) {
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
    hideHighlightButton();
    lastSelection = null;
  }
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
  hideHighlightButton(); // Remove any existing button
  
  const rect = range.getBoundingClientRect();
  
  highlightButton = document.createElement('div');
  highlightButton.id = 'nest-highlight-button';
  highlightButton.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    </svg>
    Save highlight
  `;
  
  highlightButton.style.cssText = `
    position: fixed;
    top: ${rect.bottom + window.scrollY + 10}px;
    left: ${rect.left + window.scrollX}px;
    background: #10b981;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    animation: fadeIn 0.2s ease-out;
    border: none;
    text-decoration: none;
  `;
  
  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
  
  highlightButton.addEventListener('click', saveHighlight);
  document.body.appendChild(highlightButton);
  
  // Auto-hide after 5 seconds or when user clicks elsewhere
  setTimeout(() => {
    if (highlightButton) {
      hideHighlightButton();
    }
  }, 5000);
}

function hideHighlightButton() {
  if (highlightButton && highlightButton.parentNode) {
    highlightButton.parentNode.removeChild(highlightButton);
    highlightButton = null;
  }
}

function saveHighlight() {
  if (!lastSelection) return;
  
  hideHighlightButton();
  
  // Send message to background script to save highlight
  chrome.runtime.sendMessage({
    action: 'saveHighlight',
    selectedText: lastSelection.text,
    context: lastSelection.context,
    position: lastSelection.position
  }, (response) => {
    if (response && response.success) {
      showHighlightConfirmation();
    } else {
      console.error('Failed to save highlight:', response?.error);
    }
  });
  
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

// Add visual feedback when highlight is saved
function showHighlightConfirmation() {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #8b5cf6;
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
  
  notification.innerHTML = '✨ Highlight saved to Nest';
  
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