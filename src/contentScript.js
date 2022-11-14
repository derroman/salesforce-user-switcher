'use strict';

// Content script file will run in the context of web page.
// With content script you can manipulate the web pages using
// Document Object Model (DOM).
// You can also pass information to the parent extension.

// We execute this script by making an entry in manifest.json file
// under `content_scripts` property

// For more information on Content Scripts,
// See https://developer.chrome.com/extensions/content_scripts
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.text === 'CHECK_FOR_LOGOUT_LINK') {
    // Let's have a look if the logout link is visible.
    // If so, we want to avoid, that the user tries to login again as someone else.
    let response = document.querySelectorAll('[href="/secur/logout.jsp"]');
    sendResponse(response[0].innerHTML === '');
  }
});
