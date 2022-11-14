'use strict';

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.text === 'CHECK_FOR_LOGOUT_LINK') {
    // Let's have a look if the logout link is visible.
    // If so, we want to avoid, that the user tries to login again as someone else.
    let response = document.querySelectorAll('[href="/secur/logout.jsp"]');
    if (!response || response[0] === null || response[0] === undefined) {
      sendResponse(true);
    } else {
      sendResponse(response[0].innerHTML === '');
    }
  }
});
