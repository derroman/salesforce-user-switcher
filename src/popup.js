'use strict';
const activeTabQuery = {active: true, currentWindow: true};
let currentUrl;
let organizationId;
let searchResultList;
let filteredList;
let currentUserId;
let currentTab;
// queries the currently active tab of the current active window
chrome.tabs.query(activeTabQuery, tabQueryCallback);


const searchInput = document.getElementById('searchDiv');
searchInput.addEventListener('input', updateValue);

function updateValue(evt) {
  filterSearchResults(evt.target.value);
}

function tabQueryCallback(tabs) {

  currentTab = tabs[0]; // there will be only one in this array
  if (!currentTab) {
    handleError(null);

  }
  currentUrl = currentTab.url;
  if (!currentUrl) {
    handleError(null);
  }
  return new Promise((resolve, reject) => {

    chrome.runtime.sendMessage({
      type: 'QUERY_USER_ID',
      payload: {
        message: {
          currentUrl: currentTab.url
        }
      }
    }).then(queryCanUserLogin, handleError);
  });
}

function queryCanUserLogin(response) {
  currentUserId = response;
  chrome.runtime.sendMessage(
    {
      type: 'QUERY_CAN_USER_LOGIN',
      payload: {
        message: {
          currentTab: currentTab,
          currentUrl: currentUrl
        }
      },
    }).then(queryOrganizationId, handleError);
}

function queryOrganizationId(response) {

  if(!response){
    handleLoginNotPossibleError();
    return;
  }
  chrome.runtime.sendMessage(
    {
      type: 'QUERY_ORGANIZATION_ID',
      payload: {
        message: {
          currentUrl: currentUrl
        }
      },
    }).then(queryUsers, handleError);
}

function queryUsers(response) {

  if (!response || response && response[0] && response[0].errorCode) {
    handleError(null);
    return;
  }
  organizationId = response.records[0].Id;

  chrome.runtime.sendMessage(
    {
      type: 'QUERY_USERS',
      payload: {
        message: {
          currentUrl: currentUrl
        }
      },
    }).then(handleQueryUsersResponse, handleError);

}

function handleQueryUsersResponse(response) {
  if (!response) {
    handleError(null);
    return;
  }
  let cleanedResponse = response.filter(function (result) {
    return result.Id !== currentUserId;
  })
  searchResultList = cleanedResponse;
  filteredList = cleanedResponse;
  createRadioButtons(cleanedResponse);
}

function handleError(error) {
  if(error){
    console.error(error);
  }
  createErrorMessage('Something weird happened', 'Potential causes:<br/><ul class="slds-list_dotted"><li>This is no Salesforce org</li><li>You are not a System Administrator</li><li>You are not allowed to switch users</li></ul>');
}

function handleLoginNotPossibleError(){
  createErrorMessage('You are already logged in as another user', 'Please log out first.');
}

function loginAsUser(userId) {
  let url = new URL(currentUrl);
  let domain = url.hostname;
  let protocol = url.protocol;
  let pathname = url.pathname;
  let search = url.search;
  let urlEncodedTargetPath = encodeURIComponent(pathname + search);

  let targetUrl = protocol + '//' + domain + '/one/one.app#/alohaRedirect/servlet/servlet.su?oid=' + organizationId + '&suorgadminid=' + userId + '&targetURL=' + urlEncodedTargetPath + '&retURL=' + urlEncodedTargetPath;
  console.log(targetUrl);
  chrome.tabs.update(activeTabQuery.id, {url: targetUrl});
  window.close();
}

function createErrorMessage(message, submessage) {
  let outDiv = document.createElement('div');
  outDiv.className = 'slds-notify_container slds-is-relative';

  let errorToastDiv = document.createElement('div');
  outDiv.appendChild(errorToastDiv);
  errorToastDiv.className = 'slds-notify slds-notify_toast slds-theme_error';
  errorToastDiv.setAttribute('role', 'status');

  let contentDiv = document.createElement('div');
  errorToastDiv.appendChild(contentDiv);
  contentDiv.className = 'slds-notify__content';

  let headline = document.createElement('h2');
  contentDiv.appendChild(headline);
  headline.className = 'slds-text-heading_small';
  headline.innerHTML = message;

  if (submessage) {
    let subMessageP = document.createElement('p');
    contentDiv.appendChild(subMessageP);
    subMessageP.innerHTML = submessage;
  }

  document.getElementById('headerBodyDiv').innerHTML = '';
  document.getElementById('formDiv').appendChild(outDiv);


}

function createRadioButtons(values) {
  if (!values) {
    console.log('Not a SF page');
    return;
  }
  document.getElementById("formDiv").innerHTML = '';

  document.getElementById('searchDiv').style.display = 'block';
  // document.getElementById('header').innerHTML = 'Please select a user';
  document.getElementById('footer').innerHTML = values.length === 1 ? values.length + ' active user found' : values.length + ' active users found';
  values.forEach((value, i) => {

    let outerspan = document.createElement('span');
    outerspan.className = 'slds-radio';
    outerspan.id = 'outerspan-' + value.Id;
    let radioInput = document.createElement('input');
    radioInput.id = 'radio-' + value.Id;
    radioInput.type = "radio";
    radioInput.name = 'selectedUsers';
    radioInput.value = value.Id;
    radioInput.addEventListener("click", function (event) {
      loginAsUser(event.target.value);
    });
    let label = document.createElement('label');
    label.htmlFor = 'radio-' + value.Id;
    label.className = 'slds-radio__label';
    label.id = 'label-' + value.Id;

    let dividerSpan = document.createElement('span');
    dividerSpan.className = 'slds-radio_faux';

    let labelSpan = document.createElement('span');
    labelSpan.className = 'slds-form-element__label';
    let innerValue = value.LastName;
    if (value.FirstName) {
      innerValue += ', ' + value.FirstName;
    }


    innerValue += ' (';
    if (value.Profile && value.Profile.Name) {
      innerValue += 'Profile: ' + value.Profile.Name;
    }

    if (value.UserRole && value.UserRole.Name) {
      innerValue += ' | Role: ' + value.UserRole.Name;
    }
    innerValue += ')';
    labelSpan.innerHTML = innerValue;
    document.getElementById("formDiv").appendChild(outerspan);
    document.getElementById('outerspan-' + value.Id).appendChild(radioInput);
    document.getElementById('outerspan-' + value.Id).appendChild(label);
    document.getElementById('label-' + value.Id).appendChild(dividerSpan);
    document.getElementById('label-' + value.Id).appendChild(labelSpan);
  });
}

function filterSearchResults(queryString) {
  if (!searchResultList) {
    return;
  }
  if (!queryString || queryString === '') {
    createRadioButtons(searchResultList);
  }
  filteredList = searchResultList.filter(function (entry) {
    let firstNameResult = entry.FirstName ? entry.FirstName.toLowerCase().includes(queryString.toLowerCase()) : false;
    let lastNameResult = entry.LastName ? entry.LastName.toLowerCase().includes(queryString.toLowerCase()) : false;
    let profileNameResult = (entry.Profile && entry.Profile.Name) ? entry.Profile.Name.toLowerCase().includes(queryString.toLowerCase()) : false;
    let userRoleNameResult = (entry.UserRole && entry.UserRole.Name) ? entry.UserRole.Name.toLowerCase().includes(queryString.toLowerCase()) : false;
    return firstNameResult || lastNameResult || profileNameResult || userRoleNameResult;
  });
  console.log(JSON.stringify(filteredList, null, 1));
  createRadioButtons(filteredList);
}
