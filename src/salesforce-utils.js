'use strict';

export const salesforceUrlPatterns = [
  '.lightning.force.com',
  '.sandbox.my.salesforce.com',
  '.my.salesforce-setup.com',
  '.my.salesforce.com',
];

export async function getAPIHostAndHeaders(currentUrl) {
  const url = new URL(currentUrl);
  let protocol = url.protocol;
  let host = url.host;

  const matchingPattern = salesforceUrlPatterns.find(pattern => host.includes(pattern));
  if (!matchingPattern) {
    throw new Error('Unsupported Salesforce URL pattern');
  }

  let customDomain = host.substring(0, host.indexOf(matchingPattern));
  return new Promise((resolve, reject) => {
    chrome.cookies.getAll({
      'domain': 'salesforce.com',
      'name': 'sid',
    }, function(cookies) {
      resolve(cookies);
    });
  }).then(cookies => {
    let apiHost;
    let headers;
    for (let cookie of cookies) {
      if (cookie.domain.startsWith(customDomain + '.')) {
        let token = cookie.value;
        let domain = cookie.domain;
        apiHost = protocol + '//' + domain;
        headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };
        break;
      }
    }
    return [apiHost, headers];
  });
}
