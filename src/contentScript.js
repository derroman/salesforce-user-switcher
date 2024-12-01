'use strict';

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg.text === 'CHECK_FOR_LOGOUT_LINK') {
    // Let's have a look if the logout link is visible.
    // If so, we want to avoid, that the user tries to login again as someone else.
    let logoutNode = document.querySelectorAll('[href="/secur/logout.jsp"]');

    if (!logoutNode || logoutNode[0] === null || logoutNode[0] === undefined) {
      sendResponse(true);
    } else {
      // This does only work, if the user uses English as language
      let response = logoutNode[0].innerHTML === 'Log out' || logoutNode[0].innerHTML === '';
      if (!response) {
        // so as a "fallback" we check for the amount of pipes in the text before the logout link
        logoutNode = logoutNode[0].previousSibling;
        let amountOfPipes = (logoutNode.innerHTML.match(/\|/g) || []).length;
        response = amountOfPipes === 1;
      }
      sendResponse(response);
    }
  }
});
