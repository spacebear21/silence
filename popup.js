document.addEventListener('DOMContentLoaded', async () => {
  const balanceEl = document.getElementById('balance');
  const commentsEl = document.getElementById('comments');
  const spentEl = document.getElementById('spent');
  const earnedEl = document.getElementById('earned');
  const streakEl = document.getElementById('streak');
  const timerEl = document.getElementById('timer');

  // Load data from storage
  const data = await chrome.storage.local.get([
    'balance', 'comments', 'spent', 'earned', 'silenceStart'
  ]);

  // Initialize with stored data
  let balance = data.balance || 21000;
  let comments = data.comments || 0;
  let spent = data.spent || 0;
  let earned = data.earned || 0;

  // Update UI
  updateUI();

  // Update timer every second
  setInterval(updateTimer, 1000);
  
  // Reload data from storage every second to get real-time updates
  setInterval(async () => {
    const currentData = await chrome.storage.local.get(['balance', 'comments', 'spent', 'earned']);
    balance = currentData.balance || balance;
    comments = currentData.comments || comments;
    spent = currentData.spent || spent;
    earned = currentData.earned || earned;
    updateUI();
  }, 1000);

  function updateUI() {
    balanceEl.textContent = `${balance.toLocaleString()} sats`;
    commentsEl.textContent = comments;
    spentEl.textContent = `${spent} sats`;
    earnedEl.textContent = `${earned} sats`;
    
    const streak = Math.floor(earned / 1); // 1 sat per second
    streakEl.textContent = `${streak} sec`;
  }

  function updateTimer() {
    if (!data.silenceStart) {
      timerEl.textContent = '0:00';
      return;
    }

    const elapsed = Math.floor((Date.now() - data.silenceStart) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Listen for updates from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateStats') {
      balance = request.balance;
      comments = request.comments;
      spent = request.spent;
      earned = request.earned;
      updateUI();
    }
  });
});