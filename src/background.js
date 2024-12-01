'use strict';

import {
  salesforceUrlPatterns,
  getAPIHostAndHeaders,
} from './salesforce-utils.js';

const salesforceVersion = 'v62.0';

async function toJson(response) {
  return await response.json();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request.payload || !request.payload.message || !request.payload.message.currentUrl || !salesforceUrlPatterns.some(pattern => request.payload.message.currentUrl.includes(pattern))
  ) {
    sendResponse('not possible');
    return;
  }
  (async () => {
    let apiHost, headers;
    [apiHost, headers] = await getAPIHostAndHeaders(request.payload.message.currentUrl);
    if (request.type === 'QUERY_USER_ID') {
      getUserInfo(apiHost, headers).then(res => {
        sendResponse(res);
      });
    } else if (request.type === 'QUERY_CAN_USER_LOGIN') {
      checkIfUserCanLoginAsAnotherUser(apiHost, headers, request.payload.message.currentTab).then(res => {
        sendResponse(res);
      });
    } else if (request.type === 'QUERY_ORGANIZATION_ID') {
      getOrgId(apiHost, headers).then(res => {
        sendResponse(res);
      });
    } else if (request.type === 'QUERY_USERS') {
      queryActiveUsers(apiHost, headers).then(res => {
        sendResponse(res);
      });
    }

  })();
  return true;// keep the messaging channel open for sendResponse
});

async function getUserInfo(apiHost, headers) {
  return await fetch(apiHost + '/services/data/' + salesforceVersion + '/chatter/users/me', { headers: headers }).then(toJson).then(async data => {
    return data.id;
  });
}

async function getOrgId(apiHost, headers) {
  return await fetch(apiHost + '/services/data/' + salesforceVersion + '/query/?q=SELECT+Id+FROM+Organization', { headers: headers }).then(toJson).then(async data => {
    return data;
  }).catch(error => {
    return {
      type: 'NOT ALLOWED',
      message: 'user cannot query organization id',
    };
  });
}

async function queryActiveUsers(apiHost, headers) {
  return await fetch(apiHost + '/services/data/' + salesforceVersion + '/query/?q=SELECT+Id+,+LastName+,+FirstName+,+Profile.Name+,+ProfileId+,+UserRole.Name+,+UserRoleId+,+toLabel(LanguageLocaleKey)+FROM+User+WHERE+IsActive+=+TRUE+AND+Profile.UserType+=+\'Standard\'+AND+(+Profile.UserLicense.Name+=+\'Salesforce\'+OR+Profile.UserLicense.Name+=+\'Salesforce Platform\')+ORDER+BY+LastName+ASC+,+FirstName+ASC+LIMIT+50000', { headers: headers }).then(toJson).then(async data => {
    return data.records;
  });
}

function checkIfUserCanLoginAsAnotherUser(apiHost, headers, currentTab) {

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(currentTab.id, { text: 'CHECK_FOR_LOGOUT_LINK' }, response => {
      resolve(response);
    });
  }).then(response => {
    return response;
  });
}
