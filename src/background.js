'use strict';

// With background scripts you can communicate with popup
// and contentScript files.
// For more information on background script,
// See https://developer.chrome.com/extensions/background_pages
const salesforceUrlPattern = '.lightning.force.com';

async function toJson(response) {
  return await response.json()
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request.payload || !request.payload.message || !request.payload.message.currentUrl || !request.payload.message.currentUrl.includes(salesforceUrlPattern)) {
    sendResponse(null);
    return;
  }
  (async () => {
    let apiHost, headers;
    [apiHost, headers] = await getAPIHostAndHeaders(request.payload.message.currentUrl);
    if (request.type === 'QUERY_ORGANIZATION_ID') {
      getOrgId(apiHost, headers).then(res => {
        console.log('ORG ID: ' + JSON.stringify(res));
        sendResponse(res);
      });
    }
    if (request.type === 'QUERY_USERS') {
      checkIfUserCanLoginAsAnotherUser(apiHost, headers).then(res => {
        if (res) {

          queryActiveUsers(apiHost, headers).then(res => {
            sendResponse(res);
          });


        } else {
          //Todo handle error
          console.log('User not allowed to switch to another user');
        }
      });
    }

  })();
  return true;// keep the messaging channel open for sendResponse
});

async function getOrgId(apiHost, headers) {
  return await fetch(apiHost + '/services/data/v56.0/query/?q=SELECT+Id+FROM+Organization', {headers: headers}).then(toJson).then(async data => {
    return data;
  }).catch(error => {
    return {
      type: 'NOT ALLOWED',
      message: 'user cannot query organization id'
    }
  });
}

async function queryActiveUsers(apiHost, headers) {
  return await fetch(apiHost + '/services/data/v56.0/query/?q=SELECT+Id+,LastName+,+FirstName+,+Profile.Name+,+UserRole.Name+FROM+User+WHERE+IsActive+=+TRUE+AND+Profile.UserType+=+\'Standard\'+AND+Profile.UserLicense.Name+=+\'Salesforce\'+ORDER+BY+LastName+ASC+,FirstName+ASC+LIMIT+50000', {headers: headers}).then(toJson).then(async data => {
    return data.records;
  });
}

async function checkIfUserCanLoginAsAnotherUser(apiHost, headers) {
  //todo check if user is actually allowed to login as another user
  /**
   * SELECT Id, PermissionSet.PermissionsModifyAllData
   * FROM PermissionSetAssignment
   * WHERE PermissionSet.PermissionsModifyAllData = TRUE
   *
   *
   * SELECT Id,
   *         Name
   * FROM Profile
   * WHERE PermissionsModifyAllData = TRUE
   */
  return true;


}

async function getAPIHostAndHeaders(currentUrl) {
  const url = new URL(currentUrl);
  let protocol = url.protocol;
  let host = url.host;
  let customDomain = host.substring(0, host.indexOf(".lightning.force.com"));
  return new Promise((resolve, reject) => {
    chrome.cookies.getAll({
      "domain": "salesforce.com",
      "name": "sid"
    }, function (cookies) {
      resolve(cookies);
    });
  }).then(cookies => {
    let apiHost;
    let headers;
    for (let cookie of cookies) {
      if (cookie.domain.startsWith(customDomain + ".")) {
        let token = cookie.value;
        let domain = cookie.domain;
        apiHost = protocol + '//' + domain;
        headers = {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        };
        break;
      }
    }
    return [apiHost, headers];
  })
}
