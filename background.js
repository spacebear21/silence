// Background script for managing Lightning wallet and rewards

const SATS_PER_SECOND = 1;
const COMMENT_COST = 1000;

// Initialize state
let state = {
  balance: 21000,
  comments: 0,
  spent: 0,
  earned: 0,
  silenceStart: Date.now(),
  lastRewardTime: Date.now()
};

// Load saved state
chrome.storage.local.get(Object.keys(state), (data) => {
  state = { ...state, ...data };
  startRewardTimer();
});

// Save state changes
function saveState() {
  chrome.storage.local.set(state);
}

// Reward timer
let rewardInterval;

function startRewardTimer() {
  // Clear any existing timer
  if (rewardInterval) {
    clearInterval(rewardInterval);
  }

  // Award sats every second of not commenting
  rewardInterval = setInterval(() => {
    // Calculate seconds since last reward
    const now = Date.now();
    const secondsPassed = Math.floor((now - state.lastRewardTime) / 1000);
    
    if (secondsPassed >= 1) {
      const reward = secondsPassed * SATS_PER_SECOND;
      state.balance += reward;
      state.earned += reward;
      state.lastRewardTime = now;
      
      saveState();
      broadcastUpdate();
      
      console.log(`🤫 [Silence Payments] Rewarded ${reward} sats for ${secondsPassed} seconds of silence`);
    }
  }, 1000); // Check every second
}

function stopRewardTimer() {
  if (rewardInterval) {
    clearInterval(rewardInterval);
    rewardInterval = null;
  }
}

// Broadcast current state to popup
function broadcastUpdate() {
  chrome.runtime.sendMessage({
    action: 'updateStats',
    balance: state.balance,
    comments: state.comments,
    spent: state.spent,
    earned: state.earned
  }).catch(() => {
    // Popup might not be open, ignore error
  });
}

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'commentMade':
      // Charge for comment
      state.balance -= request.cost;
      state.spent += request.cost;
      state.comments += 1;
      
      // Reset silence timer
      state.silenceStart = Date.now();
      state.lastRewardTime = Date.now();
      
      saveState();
      broadcastUpdate();
      
      console.log(`🤫 [Silence Payments] Charged ${request.cost} sats for comment. New balance: ${state.balance}`);
      break;

    case 'getState':
      sendResponse(state);
      break;
  }
});

// Reset daily stats at midnight
function scheduleDailyReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const msUntilMidnight = tomorrow - now;
  
  setTimeout(() => {
    // Reset daily stats
    state.comments = 0;
    state.spent = 0;
    state.earned = 0;
    state.silenceStart = Date.now();
    state.lastRewardTime = Date.now();
    saveState();
    
    // Schedule next reset
    scheduleDailyReset();
  }, msUntilMidnight);
}

// Start daily reset scheduler
scheduleDailyReset();

// Monitor network requests for GitHub comments
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    // Only monitor POST requests to GitHub's GraphQL endpoint
    if (details.url.includes('/_graphql') && details.method === 'POST') {
      console.log('🤫 [Silence Payments] GraphQL request detected:', details.url);
      
      // Check if we have the request body
      if (details.requestBody && details.requestBody.raw && details.requestBody.raw.length > 0) {
        try {
          // Decode the request body
          const decoder = new TextDecoder('utf-8');
          const bodyString = decoder.decode(details.requestBody.raw[0].bytes);
          const body = JSON.parse(bodyString);
          
          console.log('🤫 [Silence Payments] Request body:', body);
          
          // Check if this is a comment submission
          if (body.variables && body.variables.input && body.variables.input.body) {
            console.log('🤫 [Silence Payments] Potential comment detected:', {
              commentBody: body.variables.input.body,
              hasSubjectId: !!body.variables.input.subjectId,
              hasPullRequestReviewId: !!body.variables.input.pullRequestReviewId,
              hasDiscussionId: !!body.variables.input.discussionId,
              hasIssueId: !!body.variables.input.issueId,
              hasPullRequestId: !!body.variables.input.pullRequestId
            });
            
            // Check for various GitHub comment types
            if (body.variables.input.subjectId || 
                body.variables.input.pullRequestReviewId || 
                body.variables.input.discussionId || 
                body.variables.input.issueId ||
                body.variables.input.pullRequestId) {
              
              console.log('🤫 [Silence Payments] Comment submission confirmed!');
              
              // Process the comment
              // Charge for comment
              state.balance -= COMMENT_COST;
              state.spent += COMMENT_COST;
              state.comments += 1;
              
              // Reset silence timer
              state.silenceStart = Date.now();
              state.lastRewardTime = Date.now();
              
              saveState();
              broadcastUpdate();
              
              console.log(`🤫 [Silence Payments] Charged ${COMMENT_COST} sats for comment. New balance: ${state.balance}`);
              
              // Notify content script to show visual feedback
              chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs[0]) {
                  chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'showCharge',
                    amount: COMMENT_COST
                  });
                }
              });
            }
          }
        } catch (e) {
          console.error('🤫 [Silence Payments] Error parsing request body:', e);
        }
      }
    }
  },
  // Filter for GitHub URLs
  {urls: ["https://github.com/*"]},
  // Request body is needed to detect comments
  ["requestBody"]
);

console.log('🤫 [Silence Payments] Network monitoring initialized');

// Mock Lightning wallet integration
async function lightningPay(amount) {
  // TODO: Integrate with actual Lightning wallet
  console.log(`Lightning payment: ${amount} sats`);
  return { success: true, txid: 'mock_' + Date.now() };
}

async function lightningReceive(amount) {
  // TODO: Integrate with actual Lightning wallet
  console.log(`Lightning receive: ${amount} sats`);
  return { success: true, invoice: 'lnbc' + amount + 'mock' };
}