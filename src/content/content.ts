// Content script for extracting page content
console.log('Nest content script loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    const content = extractPageContent();
    sendResponse({ content });
  }
  return true;
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

// Listen for save confirmations from background script
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'showSaveConfirmation') {
    showSaveConfirmation();
  }
}); 