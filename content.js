// Silence Payments - Content Script
console.log('🤫 [Silence Payments] Content script loaded');

// Cost per comment (in sats)
const COMMENT_COST = 1000;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🤫 [Silence Payments] Message received:', request);
  
  if (request.action === 'showCharge') {
    showLightningCharge(request.amount || COMMENT_COST);
  }
});

// Visual feedback when charged
function showLightningCharge(amount) {
  console.log('🤫 [Silence Payments] Showing charge notification for', amount, 'sats');
  
  // Don't create duplicate notifications
  if (document.querySelector('.lightning-charge-notification')) return;
  
  const notification = document.createElement('div');
  notification.className = 'lightning-charge-notification';
  notification.innerHTML = `🤫 -${amount} sats`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ef4444;
    color: white;
    padding: 12px 20px;
    border-radius: 12px;
    font-family: 'Comic Neue', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', cursive, sans-serif;
    font-weight: 700;
    font-size: 16px;
    z-index: 9999;
    animation: fadeOut 3s ease-in-out;
    pointer-events: none;
    border: 3px solid #dc2626;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  `;

  // Add animation if not already added
  if (!document.querySelector('#lightning-charge-animation')) {
    const style = document.createElement('style');
    style.id = 'lightning-charge-animation';
    style.textContent = `
      @keyframes fadeOut {
        0% { opacity: 1; transform: translateY(0); }
        70% { opacity: 1; }
        100% { opacity: 0; transform: translateY(-20px); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

console.log('🤫 [Silence Payments] Content script ready');