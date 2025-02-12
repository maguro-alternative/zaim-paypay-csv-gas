const CONSUMER_KEY = ''; // ZaimAPI コンシューマ ID
const CONSUMER_SECRET = ''; // ZaimAPI コンシューマシークレット

const ACCOUNT_ID = 11111111;

function doGet() {
  const service = getService();
  if (!service.hasAccess()) {
    const t = HtmlService.createTemplateFromFile('auth');
    const authorizationUrl = service.authorize();
    t.authorizationUrl = authorizationUrl;
    return t.evaluate();
  }
  const t = HtmlService.createTemplateFromFile('index');
  t.userName = getUser(service).me.name;
  return t.evaluate();
}

// HTMLのuploadボタン押下時に実行
function gasUpload(formObject) {
  const service = getService();
  try {
    const { file } = formObject;
    const csvData = Utilities.parseCsv(file.getDataAsString());
    console.log("gasUpload", formObject)
    for (let i = 1; i < csvData.length; i++) {
      const row = csvData[i];
      if (row[2] !== '-') {
        incomePayPay(service, i, row);
      } else {
        paymentPayPay(service, i, row);
      }
      Utilities.sleep(1000);
    }
  } catch (e) {
    console.log(e);
    throw e;
  }
}

function incomePayPay(
  service,
  mapping,
  row
) {
  const url = "https://api.zaim.net/v2/home/money/income";
  const payload = {
    mapping: mapping,
    category_id: 19,
    amount: row[2].replaceAll(/,/g, ''),
    date: Utilities.formatDate(new Date(row[0]),Session.getScriptTimeZone(), "yyyyMMdd"),
    to_account_id: ACCOUNT_ID,
    place: row[9],
    comment: row[8]
  };
  const response = service.fetch(url, {
    method: 'post',
    payload: payload,
    muteHttpExceptions: true
  });
  return response;
}

function paymentPayPay(
  service,
  mapping,
  row
) {
  const url = "https://api.zaim.net/v2/home/money/payment";
  const payload = {
    mapping: mapping,
    genre_id: 0,
    category_id: 19,
    amount: row[1].replaceAll(/,/g, ''),
    date: Utilities.formatDate(new Date(row[0]),Session.getScriptTimeZone(), "yyyyMMdd"),
    from_account_id: ACCOUNT_ID,
    place: row[9],
    comment: row[8],
    name: row[8],
  };
  const response = service.fetch(url, {
    method: 'post',
    payload: payload,
    muteHttpExceptions: true
  });
  return response;
}

/**
 * Authorizes and makes a request to the Zaim API.
 */
function run() {
  const service = getService();
  if (service.hasAccess()) {
    const url = 'https://api.zaim.net/v2/home/money';
    const response = service.fetch(url, {
      method: 'get'
    });
    const result = JSON.parse(response.getContentText());
    Logger.log(JSON.stringify(result, null, 2));
  } else {
    const authorizationUrl = service.authorize();
    Logger.log('次のURLを開いてZaimで認証したあと、再度スクリプトを実行してください。: %s',
        authorizationUrl);
  }
} 

/**
 * Reset the authorization state, so that it can be re-tested.
 */
function reset() {
  getService().reset();
}

/**
 * Configures the service.
 */
function getService() {
  return OAuth1.createService('Zaim')
      // Set the endpoint URLs.
      .setAccessTokenUrl('https://api.zaim.net/v2/auth/access')
      .setRequestTokenUrl('https://api.zaim.net/v2/auth/request')
      .setAuthorizationUrl('https://auth.zaim.net/users/auth')
  
      // Set the consumer key and secret.
      .setConsumerKey(CONSUMER_KEY)
      .setConsumerSecret(CONSUMER_SECRET)

      // Set the name of the callback function in the script referenced
      // above that should be invoked to complete the OAuth flow.
      .setCallbackFunction('authCallback')

      // Set the property store where authorized tokens should be persisted.
      .setPropertyStore(PropertiesService.getUserProperties());
}

function getCategorys() {
  const service = getService();
  const url = "https://api.zaim.net/v2/home/category";
  const response = service.fetch(url, {
    method: 'get'
  });
  const result = JSON.parse(response.getContentText());
  Logger.log(JSON.stringify(result, null, 2));
}

function getUser(service) {
  const response = service.fetch("https://api.zaim.net/v2/home/user/verify", {
    method: 'get'
  });
  return JSON.parse(response.getContentText());
  // Logger.log(result.me.name);
}

/**
 * Handles the OAuth callback.
 */
function authCallback(request) {
  const service = getService();
  Logger.log(request);
  const authorized = service.handleCallback(request);
  Logger.log(authorized);
  if (authorized) {
    return HtmlService.createHtmlOutput('認証できました！このページを閉じて再びスクリプトを実行してください。');
  } else {
    return HtmlService.createHtmlOutput('認証に失敗');
  }
}
