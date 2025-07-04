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
  console.log('Nest: saveHighlight called', lastSelection);
  if (!lastSelection) {
    console.log('Nest: No selection data available');
    return;
  }
  
  hideHighlightButton();
  
  console.log('Nest: Sending saveHighlight message to background script');
  // Send message to background script to save highlight
  chrome.runtime.sendMessage({
    action: 'saveHighlight',
    selectedText: lastSelection.text,
    context: lastSelection.context,
    position: lastSelection.position
  }, (response) => {
    console.log('Nest: Received response from background script:', response);
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