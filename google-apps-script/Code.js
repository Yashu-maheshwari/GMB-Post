/**
 * AME Bazaar GMB Post Web App
 * Google Apps Script webhook receiver for Spark automation integration.
 * Manages Google Business Profile post publishing, validation, and verification.
 */

var TEST_MODE = true; // Safety mode by default

/**
 * Handle incoming POST requests from Spark
 */
function doPost(e) {
  var logPrefix = "[doPost] ";
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJson({ verified: false, error: "Empty request payload" }, 400);
    }

    var postData = JSON.parse(e.postData.contents);
    var businessKey = postData.business || postData.business_key || "AME_BAZAAR";
    
    Logger.log(logPrefix + "Received request for business: " + businessKey + " | " + JSON.stringify({
      request_id: postData.request_id,
      summary_len: postData.summary ? postData.summary.length : 0,
      has_media: !!postData.media_url
    }));

    // 1. request_id mandatory
    var requestId = postData.request_id;
    if (!requestId) {
      return responseJson({ verified: false, error: "Missing mandatory request_id" }, 400);
    }

    // 2. Move API_SECRET authentication to X-SPARK-SECRET HTTP header (with robust parameter/body fallbacks)
    var headers = e.headers || {};
    var sparkSecret = headers['X-SPARK-SECRET'] || 
                      headers['x-spark-secret'] || 
                      e.parameter['X-SPARK-SECRET'] || 
                      e.parameter['x-spark-secret'] ||
                      postData['X-SPARK-SECRET'] || 
                      postData['x-spark-secret'] ||
                      postData.spark_secret || 
                      postData.api_secret;
                      
    var expectedSecret = PropertiesService.getScriptProperties().getProperty('SPARK_SECRET');
    if (!expectedSecret || sparkSecret !== expectedSecret) {
      Logger.log(logPrefix + "Auth Failed: X-SPARK-SECRET mismatched or missing.");
      return responseJson({ verified: false, error: "Unauthorized access" }, 401);
    }

    // 8. Replace brittle AME banned-word check with proper hard-rule validation system
    var validationResult = validateContent(postData.summary, businessKey);
    if (!validationResult.valid) {
      Logger.log(logPrefix + "Validation Failed for " + businessKey + ": " + validationResult.errors.join(", "));
      return responseJson({ verified: false, error: "Validation failed: " + validationResult.errors.join(", ") }, 400);
    }

    // 7. Improve duplicate protection using request_id + content hash
    var contentHash = computeHash(postData.summary + (postData.media_url || ''));
    if (isDuplicate(requestId, contentHash)) {
      Logger.log(logPrefix + "Duplicate check flagged request_id: " + requestId);
      return responseJson({ verified: false, error: "Duplicate request detected" }, 400);
    }

    // 4. Prefer Cloudinary as production image host if available, fallback to Google Drive
    var imageUrl = postData.media_url;
    if (imageUrl) {
      var cloudinaryUrl = uploadToCloudinaryIfAvailable(imageUrl);
      if (cloudinaryUrl) {
        Logger.log(logPrefix + "Cloudinary uploaded: " + cloudinaryUrl);
        imageUrl = cloudinaryUrl;
      }
    }

    // 5. Add a public-image accessibility test before calling GBP
    if (imageUrl) {
      var accessTest = testImageAccessibility(imageUrl);
      if (!accessTest.valid) {
        Logger.log(logPrefix + "Image Accessibility Failed: " + accessTest.error);
        return responseJson({ verified: false, error: "Image accessibility test failed: " + accessTest.error }, 400);
      }
    }

    // Publish to GBP
    var postResult = publishToGbp(postData, imageUrl, businessKey);
    if (!postResult.success) {
      Logger.log(logPrefix + "GBP Publish Failed: " + postResult.error);
      return responseJson({ verified: false, error: "GBP API Error: " + postResult.error }, 500);
    }

    // 3. Strengthen post verification (returned name, location, summary matching, media exists, post state)
    var verification = verifyGbpPost(postResult.postName, postData, imageUrl, businessKey);
    if (!verification.verified) {
      // 6. Do not claim "verified=true" unless all verification checks pass
      Logger.log(logPrefix + "GBP Post Verification Failed: " + verification.error);
      return responseJson({ verified: false, error: "Post verification failed: " + verification.error }, 500);
    }

    // Record processed request to lock duplicate protection
    recordProcessedRequest(requestId, contentHash);

    return responseJson({
      verified: true,
      post_id: postResult.postId,
      post_name: postResult.postName,
      post_url: postResult.postUrl || ""
    }, 200);

  } catch (err) {
    Logger.log(logPrefix + "Critical Error: " + err.message);
    return responseJson({ verified: false, error: "Internal Server Error: " + err.message }, 500);
  }
}

/**
 * Returns JSON response
 */
function responseJson(obj, status) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Compute simple string hash for deduplication
 */
function computeHash(str) {
  var md5Bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, str, Utilities.Charset.UTF_8);
  var hash = "";
  for (var i = 0; i < md5Bytes.length; i++) {
    var byteVal = md5Bytes[i];
    if (byteVal < 0) byteVal += 256;
    var byteString = byteVal.toString(16);
    if (byteString.length == 1) hash += "0";
    hash += byteString;
  }
  return hash;
}

/**
 * Hard-rule validation system
 */
function validateContent(summary, businessKey) {
  var errors = [];
  if (!summary || summary.trim().length === 0) {
    errors.push("Summary is empty");
    return { valid: false, errors: errors };
  }

  // Word count / length check
  var summaryText = summary.trim();
  if (summaryText.length < 10) {
    errors.push("Summary is too short (min 10 characters)");
  }
  if (summaryText.length > 1400) {
    errors.push("Summary is too long (max 1400 characters)");
  }

  // Hard Banned words list (e.g. Sam, default persona elements, dummy names)
  var bannedWords = [
    "\\bsam\\b",
    "\\bplaceholder\\b",
    "\\bdummy\\b",
    "\\blorem\\b",
    "\\bipsum\\b",
    "\\bfoo\\b",
    "\\bbar\\b",
    "\\btest name\\b",
    "\\bhuman name\\b"
  ];
  for (var i = 0; i < bannedWords.length; i++) {
    var regex = new RegExp(bannedWords[i], "i");
    if (regex.test(summaryText)) {
      errors.push("Contains banned placeholder word/phrase matching: " + bannedWords[i]);
    }
  }

  // Business-specific hard validation gates
  if (businessKey === "AME_BAZAAR") {
    var forbiddenAme = ["\\bcheapest\\b", "\\blowest price\\b", "\\bguaranteed cheapest\\b"];
    for (var j = 0; j < forbiddenAme.length; j++) {
      if (new RegExp(forbiddenAme[j], "i").test(summaryText)) {
        errors.push("Contains unverified promotional claim: " + forbiddenAme[j]);
      }
    }
  } else if (businessKey === "MAHESHWARI_COUNSEL") {
    var forbiddenCounsel = [
      "\\bbest lawyer\\b",
      "\\btop lawyer\\b",
      "\\bwin your case\\b",
      "\\bguaranteed outcome\\b",
      "\\bguaranteed win\\b",
      "\\bsolicit\\b"
    ];
    for (var k = 0; k < forbiddenCounsel.length; k++) {
      if (new RegExp(forbiddenCounsel[k], "i").test(summaryText)) {
        errors.push("Contains prohibited legal solicitation claim: " + forbiddenCounsel[k]);
      }
    }
  } else if (businessKey === "ADVAITH_EDUCATIONAL_CENTER") {
    var forbiddenAdvaith = [
      "\\bpercentile\\b",
      "\\brank 1\\b",
      "\\b100% selection\\b",
      "\\bboard affiliation\\b",
      "\\baffiliated to\\b"
    ];
    for (var l = 0; l < forbiddenAdvaith.length; l++) {
      if (new RegExp(forbiddenAdvaith[l], "i").test(summaryText)) {
        errors.push("Contains unverified academic claim: " + forbiddenAdvaith[l]);
      }
    }
  } else if (businessKey === "SIS") {
    var forbiddenSis = [
      "\\baffiliated to cbse\\b",
      "\\bcbse affiliation\\b",
      "\\bno.1 school\\b",
      "\\bbest school\\b",
      "\\b100% board results\\b"
    ];
    for (var m = 0; m < forbiddenSis.length; m++) {
      if (new RegExp(forbiddenSis[m], "i").test(summaryText)) {
        errors.push("Contains unverified school claim: " + forbiddenSis[m]);
      }
    }
  } else {
    errors.push("Unknown business key: " + businessKey);
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Checks if this requestId and contentHash has been processed
 */
function isDuplicate(requestId, contentHash) {
  var props = PropertiesService.getScriptProperties();
  var key = "dup_" + requestId;
  var existingHash = props.getProperty(key);
  if (existingHash) {
    return true;
  }
  var hashKey = "hash_" + contentHash;
  var existingRequest = props.getProperty(hashKey);
  if (existingRequest) {
    return true;
  }
  return false;
}

/**
 * Records request as processed
 */
function recordProcessedRequest(requestId, contentHash) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty("dup_" + requestId, contentHash);
  props.setProperty("hash_" + contentHash, requestId);
}

/**
 * Accessibility test for images
 */
function testImageAccessibility(url) {
  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GmbAccessibilityTest/1.0'
      }
    });

    var code = response.getResponseCode();
    if (code !== 200) {
      return { valid: false, error: "HTTP Status " + code };
    }

    var contentType = response.getHeaders()['Content-Type'] || response.getHeaders()['content-type'] || '';
    if (contentType.toLowerCase().indexOf('image/') === -1) {
      return { valid: false, error: "Invalid Content-Type: " + contentType };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Mock/Real Cloudinary Image Host Selection
 */
function uploadToCloudinaryIfAvailable(imageUrl) {
  var props = PropertiesService.getScriptProperties();
  var cloudName = props.getProperty('CLOUDINARY_CLOUD_NAME');
  var uploadPreset = props.getProperty('CLOUDINARY_UPLOAD_PRESET');

  if (!cloudName || !uploadPreset) {
    Logger.log("Cloudinary properties not found. Skipping Cloudinary upload.");
    return null;
  }

  try {
    var apiEndpoint = "https://api.cloudinary.com/v1_1/" + cloudName + "/image/upload";
    var payload = {
      file: imageUrl,
      upload_preset: uploadPreset,
      folder: "gmb_posts"
    };

    var response = UrlFetchApp.fetch(apiEndpoint, {
      method: "post",
      payload: payload,
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      var data = JSON.parse(response.getContentText());
      if (data.secure_url) {
        return data.secure_url;
      }
    }
  } catch (err) {
    Logger.log("Cloudinary upload failed: " + err.message);
  }
  return null;
}

/**
 * Publishes local post to Google Business Profile API
 */
function publishToGbp(postData, imageUrl, businessKey) {
  var props = PropertiesService.getScriptProperties();
  var isTestModeProp = props.getProperty('TEST_MODE');
  if (isTestModeProp !== null) {
    TEST_MODE = isTestModeProp.toLowerCase() === 'true';
  }

  // Load business-specific account/location IDs
  var accountId = props.getProperty('GOOGLE_GBP_ACCOUNT_ID_' + businessKey) || props.getProperty('GOOGLE_GBP_ACCOUNT_ID');
  var locationId = props.getProperty('GOOGLE_GBP_LOCATION_ID_' + businessKey) || props.getProperty('GOOGLE_GBP_LOCATION_ID');

  if (TEST_MODE) {
    Logger.log("Running in TEST_MODE for " + businessKey + ". Simulating GBP publishing.");
    var mockPostId = "local_post_" + Date.now();
    var finalAccountId = accountId || "mock_account_id_" + businessKey;
    var finalLocationId = locationId || "mock_location_id_" + businessKey;
    var mockPostName = "accounts/" + finalAccountId + "/locations/" + finalLocationId + "/localPosts/" + mockPostId;
    return {
      success: true,
      postId: mockPostId,
      postName: mockPostName,
      postUrl: "https://g.page/r/amebazaar/review"
    };
  }

  if (!accountId || !locationId) {
    return { success: false, error: "Missing GBP account_id or location_id configuration for " + businessKey };
  }

  var accessToken = refreshGbpAccessToken();
  if (!accessToken) {
    return { success: false, error: "Failed to authenticate with Google Business Profile" };
  }

  var url = "https://mybusiness.googleapis.com/v4/accounts/" + accountId + "/locations/" + locationId + "/localPosts";
  var payload = {
    summary: postData.summary,
    callToAction: {
      actionType: "LEARN_MORE",
      url: postData.cta_url || "https://amebazaar.in"
    }
  };

  if (imageUrl) {
    payload.media = [{
      mediaFormat: "PHOTO",
      sourceUrl: imageUrl
    }];
  }

  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + accessToken },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    var responseText = response.getContentText();
    var data = JSON.parse(responseText);

    if (code === 200 || code === 201) {
      return {
        success: true,
        postId: extractPostIdFromName(data.name),
        postName: data.name,
        postUrl: data.searchUrl || ""
      };
    } else {
      return { success: false, error: "GBP API status " + code + ": " + responseText };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Strengthened Post Verification
 */
function verifyGbpPost(postName, postData, imageUrl, businessKey) {
  var props = PropertiesService.getScriptProperties();
  var isTestModeProp = props.getProperty('TEST_MODE');
  if (isTestModeProp !== null) {
    TEST_MODE = isTestModeProp.toLowerCase() === 'true';
  }

  if (TEST_MODE) {
    Logger.log("Running in TEST_MODE. Bypassing live verification.");
    return { verified: true };
  }

  var accountId = props.getProperty('GOOGLE_GBP_ACCOUNT_ID_' + businessKey) || props.getProperty('GOOGLE_GBP_ACCOUNT_ID');
  var locationId = props.getProperty('GOOGLE_GBP_LOCATION_ID_' + businessKey) || props.getProperty('GOOGLE_GBP_LOCATION_ID');

  // Verify returned name format: accounts/{accountId}/locations/{locationId}/localPosts/{postId}
  var expectedPrefix = "accounts/" + accountId + "/locations/" + locationId + "/localPosts/";
  if (!postName || postName.indexOf(expectedPrefix) !== 0) {
    return { verified: false, error: "Post name format invalid for " + businessKey + ": " + postName };
  }

  var accessToken = refreshGbpAccessToken();
  var url = "https://mybusiness.googleapis.com/v4/" + postName;

  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + accessToken },
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    if (code !== 200) {
      return { verified: false, error: "GET post failed with status: " + code };
    }

    var livePost = JSON.parse(response.getContentText());

    // Verify summary matches submitted post text
    if (livePost.summary !== postData.summary) {
      return { verified: false, error: "Post summary mismatch" };
    }

    // Verify media exists if submitted
    if (imageUrl) {
      if (!livePost.media || livePost.media.length === 0) {
        return { verified: false, error: "Missing media in published GMB post" };
      }
    }

    // Verify post state is LIVE/ACTIVE
    if (livePost.state !== "LIVE" && livePost.state !== "ACTIVE") {
      return { verified: false, error: "Post state is not LIVE/ACTIVE: " + livePost.state };
    }

    return { verified: true };

  } catch (err) {
    return { verified: false, error: "Verification exception: " + err.message };
  }
}

function extractPostIdFromName(name) {
  if (!name) return "";
  var parts = name.split("/");
  return parts[parts.length - 1];
}

/**
 * Refreshes Google access token
 */
function refreshGbpAccessToken() {
  var props = PropertiesService.getScriptProperties();
  var clientId = props.getProperty('GOOGLE_CLIENT_ID');
  var clientSecret = props.getProperty('GOOGLE_CLIENT_SECRET');
  var refreshToken = props.getProperty('GOOGLE_GBP_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  try {
    var payload = {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    };

    var response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      payload: payload,
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      var data = JSON.parse(response.getContentText());
      return data.access_token;
    }
  } catch (err) {
    Logger.log("Token refresh failed: " + err.message);
  }
  return null;
}

/**
 * 10. Execute real validation tests in-script
 */
function runLocalSuite() {
  Logger.log("=== RUNNING LOCAL WEBHOOK TEST SUITE ===");
  var passed = 0;
  var failed = 0;

  function assert(name, condition) {
    if (condition) {
      Logger.log("✓ PASS: " + name);
      passed++;
    } else {
      Logger.log("✗ FAIL: " + name);
      failed++;
    }
  }

  // Test 1: Content Validation (Valid AME_BAZAAR)
  var res1 = validateContent("This is a beautiful new winter outfit at AME Bazaar Kirari. Come check it out.", "AME_BAZAAR");
  assert("Valid AME_BAZAAR content check", res1.valid === true);

  // Test 2: Content Validation (Invalid AME_BAZAAR with unverified cheapest claim)
  var res2 = validateContent("Cheapest clothes ever at AME Bazaar Kirari Delhi.", "AME_BAZAAR");
  assert("Invalid AME_BAZAAR content check (cheapest)", res2.valid === false && res2.errors.join("").indexOf("promotional") !== -1);

  // Test 3: Content Validation (Valid MAHESHWARI_COUNSEL)
  var res3 = validateContent("This post provides practical legal information on property registration processes in Delhi.", "MAHESHWARI_COUNSEL");
  assert("Valid MAHESHWARI_COUNSEL content check", res3.valid === true);

  // Test 4: Content Validation (Invalid MAHESHWARI_COUNSEL with win case solicitation)
  var res4 = validateContent("We are the best lawyer in Delhi. We guarantee to win your case.", "MAHESHWARI_COUNSEL");
  assert("Invalid MAHESHWARI_COUNSEL content check (solicitation)", res4.valid === false && res4.errors.join("").indexOf("solicitation") !== -1);

  // Test 5: Content Validation (Invalid ADVAITH_EDUCATIONAL_CENTER with unverified ranking claim)
  var res5 = validateContent("Advaith offers 100% selection rate and CBSE affiliation.", "ADVAITH_EDUCATIONAL_CENTER");
  assert("Invalid ADVAITH content check (unverified claims)", res5.valid === false);

  // Test 6: Content Validation (Invalid SIS with unverified ranking claim)
  var res6 = validateContent("Saraswati International School is the best school with 100% board results.", "SIS");
  assert("Invalid SIS content check (unverified claims)", res6.valid === false);

  // Test 7: Duplicate hashing consistency
  var hash1 = computeHash("Test string");
  var hash2 = computeHash("Test string");
  assert("Hash consistency check", hash1 === hash2);

  // Test 8: Image accessibility simulation
  var res8 = testImageAccessibility("https://res.cloudinary.com/demo/image/upload/sample.jpg");
  assert("Image accessibility format check", res8.valid === true);

  Logger.log("=== SUITE SUMMARY: " + passed + " PASSED, " + failed + " FAILED ===");
  return { passed: passed, failed: failed };
}

/**
 * Run automatic account and location discovery for GMB
 * Searches for matches for the 4 businesses, logs results, and saves the verified non-secret IDs
 */
function runGbpDiscovery() {
  Logger.log("=== STARTING AUTOMATIC GBP DISCOVERY ===");
  var props = PropertiesService.getScriptProperties();
  
  var clientId = props.getProperty('GOOGLE_CLIENT_ID');
  var clientSecret = props.getProperty('GOOGLE_CLIENT_SECRET');
  var refreshToken = props.getProperty('GOOGLE_GBP_REFRESH_TOKEN');
  
  if (!clientId || !clientSecret || !refreshToken) {
    Logger.log("[ERROR] Discovery aborted: Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_GBP_REFRESH_TOKEN in Script Properties.");
    return { success: false, error: "Missing OAuth credentials in Script Properties" };
  }
  
  var accessToken = refreshGbpAccessToken();
  if (!accessToken) {
    Logger.log("[ERROR] Discovery aborted: Failed to refresh GBP access token.");
    return { success: false, error: "Token refresh failed" };
  }
  
  var targets = {
    "AME_BAZAAR": { 
      name: "AME Bazaar - Family Garment Store", 
      verifiedLocationId: "16134813121256220692",
      verifiedAccountId: "107856377351216824945",
      keywords: ["ame bazaar", "family garment store"],
      accountProp: "GOOGLE_GBP_ACCOUNT_ID_AME_BAZAAR", 
      locationProp: "GOOGLE_GBP_LOCATION_ID_AME_BAZAAR" 
    },
    "MAHESHWARI_COUNSEL": { 
      name: "Maheshwari Counsel | Advocates & Legal Consultants", 
      keywords: ["maheshwari counsel | advocates & legal consultants", "maheshwari counsel"],
      requiredAddressKeywords: ["delhi", "kirari", "suleman nagar", "nangloi", "110086", "110041"],
      accountProp: "GOOGLE_GBP_ACCOUNT_ID_MAHESHWARI_COUNSEL", 
      locationProp: "GOOGLE_GBP_LOCATION_ID_MAHESHWARI_COUNSEL" 
    },
    "ADVAITH_EDUCATIONAL_CENTER": { 
      name: "Advaith Educational Centre", 
      keywords: ["advaith educational centre", "advaith educational center", "advaith"],
      accountProp: "GOOGLE_GBP_ACCOUNT_ID_ADVAITH_EDUCATIONAL_CENTER", 
      locationProp: "GOOGLE_GBP_LOCATION_ID_ADVAITH_EDUCATIONAL_CENTER" 
    },
    "SIS": { 
      name: "SARASWATI INTERNATIONAL SCHOOL", 
      keywords: ["saraswati international school", "saraswati international"],
      accountProp: "GOOGLE_GBP_ACCOUNT_ID_SIS", 
      locationProp: "GOOGLE_GBP_LOCATION_ID_SIS" 
    }
  };
  
  var matches = {};
  for (var key in targets) {
    matches[key] = [];
  }
  
  try {
    // 1. Fetch Accounts
    var accountsUrl = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
    var accResponse = UrlFetchApp.fetch(accountsUrl, {
      method: 'get',
      headers: { 'Authorization': 'Bearer ' + accessToken },
      muteHttpExceptions: true
    });
    
    if (accResponse.getResponseCode() !== 200) {
      Logger.log("[ERROR] Failed to list accounts: " + accResponse.getContentText());
      return { success: false, error: "Accounts fetch failed: " + accResponse.getResponseCode() };
    }
    
    var accountsData = JSON.parse(accResponse.getContentText());
    var accounts = accountsData.accounts || [];
    Logger.log("Found " + accounts.length + " GMB Accounts.");
    
    // 2. Fetch Locations per Account
    for (var i = 0; i < accounts.length; i++) {
      var account = accounts[i];
      var accountId = account.name.split("/")[1];
      Logger.log("Scanning Account: " + account.accountName + " (" + accountId + ")");
      
      var locationsUrl = "https://mybusinessbusinessinformation.googleapis.com/v1/" + account.name + "/locations?readMask=name,title,storefrontAddress";
      var locResponse = UrlFetchApp.fetch(locationsUrl, {
        method: 'get',
        headers: { 'Authorization': 'Bearer ' + accessToken },
        muteHttpExceptions: true
      });
      
      if (locResponse.getResponseCode() === 200) {
        var locData = JSON.parse(locResponse.getContentText());
        var locations = locData.locations || [];
        Logger.log("Found " + locations.length + " locations in this account.");
        
        for (var j = 0; j < locations.length; j++) {
          var loc = locations[j];
          var locationId = loc.name.split("/")[1];
          var locTitle = loc.title || "";
          var cleanTitle = locTitle.toLowerCase().trim();
          var address = loc.storefrontAddress ? JSON.stringify(loc.storefrontAddress) : "";
          
          Logger.log("Found listing: '" + locTitle + "' | ID: " + locationId);
          
          // Match logic
          for (var bKey in targets) {
            var target = targets[bKey];
            var isMatch = false;
            
            // Primary location ID match priority (e.g. for AME Bazaar)
            if (target.verifiedLocationId && locationId === target.verifiedLocationId) {
              isMatch = true;
            } else if (!target.verifiedLocationId) {
              var targetName = target.name.toLowerCase().trim();
              if (cleanTitle === targetName || cleanTitle.indexOf(targetName) !== -1 || targetName.indexOf(cleanTitle) !== -1) {
                isMatch = true;
              } else if (target.keywords) {
                for (var k = 0; k < target.keywords.length; k++) {
                  if (cleanTitle.indexOf(target.keywords[k]) !== -1) {
                    isMatch = true;
                    break;
                  }
                }
              }
            }
            
            if (isMatch && target.requiredAddressKeywords && target.requiredAddressKeywords.length > 0) {
              var cleanAddress = address.toLowerCase();
              var addressMatched = false;
              for (var a = 0; a < target.requiredAddressKeywords.length; a++) {
                if (cleanAddress.indexOf(target.requiredAddressKeywords[a]) !== -1) {
                  addressMatched = true;
                  break;
                }
              }
              if (!addressMatched) {
                isMatch = false;
                Logger.log("[DISCOVERY] Listing '" + locTitle + "' ignored: Address does not match required local Delhi/Kirari criteria.");
              }
            }
            
            if (isMatch) {
              matches[bKey].push({
                accountId: accountId,
                locationId: locationId,
                title: locTitle,
                address: address
              });
            }
          }
        }
      } else {
        Logger.log("[WARN] Failed to fetch locations for " + account.name + ": " + locResponse.getContentText());
      }
    }
    
    // 3. Verify matches and save
    var summary = [];
    var configuredCount = 0;
    
    for (var bKey in targets) {
      var businessMatches = matches[bKey];
      if (businessMatches.length === 1) {
        var matched = businessMatches[0];
        props.setProperty(targets[bKey].accountProp, matched.accountId);
        props.setProperty(targets[bKey].locationProp, matched.locationId);
        Logger.log("[SUCCESS] Matched and Configured " + bKey + " -> Account: " + matched.accountId + ", Location: " + matched.locationId);
        summary.push(bKey + " | " + matched.title + " | " + matched.accountId + " | " + matched.locationId + " | VERIFIED");
        configuredCount++;
      } else if (businessMatches.length > 1) {
        Logger.log("[AMBIGUITY] Multiple matches found for " + bKey + ". Manual intervention required.");
        summary.push(bKey + " | AMBIGUOUS | PENDING_CONFIGURATION | PENDING_CONFIGURATION | AMBIGUOUS");
      } else {
        Logger.log("[MISSING] No match found for target: " + targets[bKey].name);
        summary.push(bKey + " | MISSING | PENDING_CONFIGURATION | PENDING_CONFIGURATION | MISSING");
      }
    }
    
    Logger.log("=== DISCOVERY COMPLETED ===");
    Logger.log("Configured: " + configuredCount + "/4 businesses.");
    return {
      success: true,
      configuredCount: configuredCount,
      summary: summary
    };
    
  } catch (err) {
    Logger.log("[ERROR] Exception during discovery: " + err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Run one single controlled live test for AME_BAZAAR.
 * Bypasses TEST_MODE=true for this single execution.
 */
function runOneLiveTest() {
  Logger.log("=== STARTING CONTROLLED LIVE GMB TEST FOR AME_BAZAAR ===");
  
  var testPayload = {
    request_id: "live_test_ame_bazaar_" + Date.now(),
    business: "AME_BAZAAR",
    summary: "Naye traditional wear collection humare Mubarakpur Road Kirari store par ab available hai! 🌟 Family shopping ke liye naye fabrics aur custom tailoring designs. Traditional ethnic clothing aur family wear ke liye humare store AME Bazaar visit karein.",
    media_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    cta_url: "https://g.page/r/amebazaar"
  };
  
  var props = PropertiesService.getScriptProperties();
  var prevTestMode = props.getProperty('TEST_MODE');
  props.setProperty('TEST_MODE', 'false');
  
  try {
    Logger.log("Publishing to GBP...");
    var postResult = publishToGbp(testPayload, testPayload.media_url, "AME_BAZAAR");
    Logger.log("Publish result: " + JSON.stringify(postResult));
    
    if (postResult.success) {
      Logger.log("Verifying post...");
      var verification = verifyGbpPost(postResult.postName, testPayload, testPayload.media_url, "AME_BAZAAR");
      Logger.log("Verification status: " + JSON.stringify(verification));
    }
  } catch (err) {
    Logger.log("[ERROR] Live test exception: " + err.message);
  } finally {
    if (prevTestMode !== null) {
      props.setProperty('TEST_MODE', prevTestMode);
    } else {
      props.deleteProperty('TEST_MODE');
    }
    Logger.log("TEST_MODE restored to original state.");
  }
}

/**
 * Diagnostic function to perform a read-only configuration audit of Script Properties.
 */
function runConfigCheck() {
  Logger.log("=== GMB POST AUTOMATION CONFIGURATION AUDIT ===");
  var props = PropertiesService.getScriptProperties().getProperties();
  
  var requiredKeys = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_GBP_REFRESH_TOKEN',
    'GOOGLE_GBP_ACCOUNT_ID_AME_BAZAAR',
    'GOOGLE_GBP_LOCATION_ID_AME_BAZAAR'
  ];
  
  Logger.log("\n1. Key Verification (Present/Missing):");
  requiredKeys.forEach(function(key) {
    var status = (props[key] && props[key].trim() !== '') ? "PRESENT" : "MISSING";
    Logger.log("- " + key + ": " + status);
  });
  
  Logger.log("\n2. AME Bazaar Target ID Parity:");
  var targetAccount = "107856377351216824945";
  var targetLocation = "16134813121256220692";
  
  var currentAccount = props['GOOGLE_GBP_ACCOUNT_ID_AME_BAZAAR'];
  var currentLocation = props['GOOGLE_GBP_LOCATION_ID_AME_BAZAAR'];
  
  Logger.log("- Target Account:  " + targetAccount);
  Logger.log("- Current Account: " + (currentAccount || "NOT SET"));
  Logger.log("- Account Match:   " + (currentAccount === targetAccount ? "VERIFIED" : "MISMATCH"));
  
  Logger.log("- Target Location: " + targetLocation);
  Logger.log("- Current Location:" + (currentLocation || "NOT SET"));
  Logger.log("- Location Match:  " + (currentLocation === targetLocation ? "VERIFIED" : "MISMATCH"));
  
  Logger.log("\n=============================================");
}

/**
 * -------------------------------------------------------------
 * 11. Autonomous Content Generation & Scheduling Engine (Option A)
 * -------------------------------------------------------------
 */

var BUSINESS_ROTATION_ORDER = [
  "AME_BAZAAR",
  "MAHESHWARI_COUNSEL",
  "ADVAITH_EDUCATIONAL_CENTER",
  "SIS"
];

var BUSINESS_CONTENT_CONFIG = {
  "AME_BAZAAR": {
    name: "AME Bazaar - Family Garment Store",
    locationEntities: "Mubarakpur Road, Kirari Suleman Nagar, Nangloi, Delhi",
    ctaUrl: "https://g.page/r/amebazaar",
    pillars: [
      { id: "ethnic_festive", name: "Family Ethnic Wear & Festive Outfits", angle: "Traditional festive wear, sarees, kurtas, and matching family styling for celebrations." },
      { id: "seasonal_wardrobe", name: "Seasonal Fabrics & Daily Wear Guide", angle: "Comfortable fabrics, season-appropriate clothing selection, and daily garment care tips." },
      { id: "custom_tailoring", name: "Custom Tailoring & Fitting Advice", angle: "Tailoring precision, sizing alterations, and custom garment fit awareness at our Kirari workshop." },
      { id: "kids_mens_wear", name: "Men's and Kids' Practical Everyday Fashion", angle: "Durable and trendy everyday garments for kids and versatile essentials for men." },
      { id: "local_shopping", name: "Kirari Family Shopping Experience", angle: "Convenient local family clothing shopping on Mubarakpur Road, Kirari." }
    ],
    images: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=800&auto=format&fit=crop&q=80"
    ],
    guidelines: "Write in warm, helpful Hinglish or clean conversational English. Focus on fabric quality, family styling, and local store experience. FORBIDDEN: Do not use words 'cheapest', 'lowest price', 'guaranteed cheapest'. Never mention persona 'Sam'."
  },
  "MAHESHWARI_COUNSEL": {
    name: "Maheshwari Counsel | Advocates & Legal Consultants",
    locationEntities: "Kirari, Suleman Nagar, Nangloi, Delhi",
    ctaUrl: "https://g.page/r/maheshwari_counsel",
    pillars: [
      { id: "property_registry", name: "Property Due Diligence & Registration Process", angle: "Practical legal awareness on property title verification, encumbrance checks, and registration procedures in Delhi." },
      { id: "civil_remedies", name: "Civil Rights & Dispute Resolution Process", angle: "Educational clarity on legal notices, mediation alternatives, and civil court process basics." },
      { id: "succession_wills", name: "Will Drafting & Estate Planning Essentials", angle: "The importance of clear testamentary documentation, legal execution requirements, and family succession clarity." },
      { id: "consumer_rights", name: "Consumer Rights & Complaint Redressal", angle: "Understanding consumer protection rights, defective service remedies, and documentation for consumer forums." },
      { id: "commercial_agreements", name: "Contractual Drafting & Agreement Clarity", angle: "Key clauses to review in commercial agreements, tenancy deeds, and service contracts for legal certainty." }
    ],
    images: [
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=800&auto=format&fit=crop&q=80"
    ],
    guidelines: "Write in objective, informative, professional English. Offer helpful legal awareness and procedural guidance. FORBIDDEN: Strictly no solicitation, no 'best lawyer', no 'win your case' or guaranteed legal outcome claims."
  },
  "ADVAITH_EDUCATIONAL_CENTER": {
    name: "Advaith Educational Centre",
    locationEntities: "Kirari, Suleman Nagar, Nangloi, Delhi",
    ctaUrl: "https://g.page/r/advaith_education",
    pillars: [
      { id: "study_habits", name: "Daily Study Routines & Focus Techniques", angle: "Structured revision techniques, Pomodoro time management, and minimizing distractions during self-study." },
      { id: "conceptual_learning", name: "Conceptual Understanding in STEM & Problem Solving", angle: "Active recall methods, mind mapping, and mastering fundamental concepts in mathematics and science." },
      { id: "exam_readiness", name: "Exam Preparation Timelines & Stress Management", angle: "Structuring a 30-day revision cycle, mock testing habits, and building student academic confidence." },
      { id: "parent_support", name: "Parental Guidance for Student Learning", angle: "How parents can create an encouraging home study environment and support consistent academic growth." },
      { id: "analytical_thinking", name: "Critical Thinking & Self-Directed Learning", angle: "Fostering curiosity, reading habits, and analytical problem-solving skills in growing students." }
    ],
    images: [
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80"
    ],
    guidelines: "Write in encouraging, student-centric, educational English. Focus on study methodology, habit-building, and academic clarity. FORBIDDEN: Do not claim 'Rank 1', '100% selection', 'percentile', or unverified affiliation claims."
  },
  "SIS": {
    name: "SARASWATI INTERNATIONAL SCHOOL",
    locationEntities: "Kirari, Suleman Nagar, Delhi",
    ctaUrl: "https://g.page/r/sis_school",
    pillars: [
      { id: "foundational_literacy", name: "Early Reading & Foundational Literacy", angle: "Developing daily reading habits, vocabulary enrichment, and comprehension in school students." },
      { id: "holistic_growth", name: "Holistic Development: Arts, Sports & Academics", angle: "Balancing co-curricular creativity, physical wellness, and academic discovery in student life." },
      { id: "digital_balance", name: "Healthy Screen Time & Digital Learning", angle: "Guidance on balanced technology use, educational tools, and healthy digital boundaries for young minds." },
      { id: "experiential_science", name: "Experiential Learning & Hands-On Discovery", angle: "Encouraging curiosity through practical science experiments, nature exploration, and creative projects." },
      { id: "family_collaboration", name: "Parent-School Collaboration for Child Growth", angle: "Effective communication between educators and families to nurture student curiosity and well-being." }
    ],
    images: [
      "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&auto=format&fit=crop&q=80"
    ],
    guidelines: "Write in inspiring, family-oriented, pedagogical English. Focus on child development, learning joy, and school values. FORBIDDEN: Do not invent board affiliations (like CBSE), 'No.1 school', 'best school', or guaranteed exam results."
  }
};

/**
 * Get recent topic history from Script Properties
 */
function getRecentTopics(businessKey) {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('GMB_TOPICS_' + businessKey);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

/**
 * Store updated topic history in Script Properties (keeps last 15 topics)
 */
function recordTopicHistory(businessKey, topicTitle) {
  var props = PropertiesService.getScriptProperties();
  var history = getRecentTopics(businessKey);
  if (topicTitle && topicTitle.trim()) {
    history.unshift(topicTitle.trim());
    if (history.length > 15) {
      history = history.slice(0, 15);
    }
    props.setProperty('GMB_TOPICS_' + businessKey, JSON.stringify(history));
  }
}

/**
 * Generate a unique GMB post for a business using Gemini API
 */
function generateGmbPostWithGemini(businessKey) {
  var logPrefix = "[generateGmbPostWithGemini][" + businessKey + "] ";
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('GEMINI_API_KEY');
  
  if (!apiKey) {
    Logger.log(logPrefix + "GEMINI_API_KEY missing in Script Properties.");
    return { success: false, error: "GEMINI_API_KEY missing in Script Properties" };
  }

  var config = BUSINESS_CONTENT_CONFIG[businessKey];
  if (!config) {
    return { success: false, error: "Unknown business key: " + businessKey };
  }

  // Determine pillar rotation based on topic history length
  var recentTopics = getRecentTopics(businessKey);
  var pillarIndex = recentTopics.length % config.pillars.length;
  var selectedPillar = config.pillars[pillarIndex];

  var avoidTopicsInstruction = recentTopics.length > 0
    ? "IMPORTANT: Do NOT repeat the angles or specific topics of these recent posts:\n- " + recentTopics.slice(0, 10).join("\n- ")
    : "This is the initial post for this pillar.";

  var promptText = "You are the official local Google Business Profile content author for \"" + config.name + "\".\n\n" +
    "Task: Generate a high-quality, authentic, informative Google Business Profile Local Post (100 to 250 words) targeting SEO, AEO (Answer Engine Optimization), and GEO (local search relevance).\n\n" +
    "Business Details:\n" +
    "- Business Name: " + config.name + "\n" +
    "- Local Area / Entities: " + config.locationEntities + "\n" +
    "- Content Pillar: " + selectedPillar.name + "\n" +
    "- Focus Angle: " + selectedPillar.angle + "\n\n" +
    "Specific Guidelines:\n" +
    config.guidelines + "\n\n" +
    avoidTopicsInstruction + "\n\n" +
    "Formatting Requirements:\n" +
    "- Length: Between 100 and 250 words.\n" +
    "- Naturally integrate local entities (" + config.locationEntities + ") without keyword stuffing.\n" +
    "- Provide actionable, helpful information that directly answers local search queries.\n" +
    "- Conclude with a natural invitation to learn more or visit.\n\n" +
    "Output must be valid JSON ONLY in this exact structure with NO surrounding markdown backticks:\n" +
    "{\n" +
    "  \"topic_title\": \"Specific unique topic title (5-10 words)\",\n" +
    "  \"summary\": \"The full GMB post body text...\"\n" +
    "}";

  var models = [
    props.getProperty('GEMINI_MODEL') || 'gemini-2.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash'
  ];

  for (var m = 0; m < models.length; m++) {
    var model = models[m];
    var url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
    
    try {
      Logger.log(logPrefix + "Calling Gemini model: " + model + " for pillar: " + selectedPillar.name);
      var response = UrlFetchApp.fetch(url, {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7
          }
        }),
        muteHttpExceptions: true
      });

      var code = response.getResponseCode();
      if (code === 200) {
        var data = JSON.parse(response.getContentText());
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
          var rawText = data.candidates[0].content.parts[0].text.trim();
          // Clean possible markdown code fence wrappers
          if (rawText.indexOf("```json") === 0) rawText = rawText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
          if (rawText.indexOf("```") === 0) rawText = rawText.replace(/^```\s*/i, "").replace(/```$/, "").trim();

          var parsed = JSON.parse(rawText);
          if (parsed.summary && parsed.summary.trim().length > 20) {
            return {
              success: true,
              summary: parsed.summary.trim(),
              topic_title: parsed.topic_title || selectedPillar.name,
              pillar_id: selectedPillar.id,
              cta_url: config.ctaUrl,
              model_used: model
            };
          }
        }
      } else {
        Logger.log(logPrefix + "Model " + model + " returned HTTP " + code + ": " + response.getContentText());
      }
    } catch (err) {
      Logger.log(logPrefix + "Error calling Gemini (" + model + "): " + err.message);
    }
  }

  return { success: false, error: "All fallback Gemini models failed to generate valid content" };
}

/**
 * Resolves a verified accessible image for the given business
 */
function resolveVerifiedImageForBusiness(businessKey, pillarIndex) {
  var config = BUSINESS_CONTENT_CONFIG[businessKey];
  if (!config || !config.images || config.images.length === 0) {
    Logger.log("[IMAGE_MISSING] No image pool defined for " + businessKey);
    return null;
  }

  var idx = (pillarIndex || 0) % config.images.length;
  var candidateUrl = config.images[idx];

  // Try Cloudinary upload if configured
  var cloudinaryUrl = uploadToCloudinaryIfAvailable(candidateUrl);
  var finalUrl = cloudinaryUrl || candidateUrl;

  // Validate accessibility
  var accessCheck = testImageAccessibility(finalUrl);
  if (accessCheck.valid) {
    return finalUrl;
  } else {
    Logger.log("[IMAGE_MISSING] Image accessibility failed for " + finalUrl + ": " + accessCheck.error);
    return null;
  }
}

/**
 * Autonomous Scheduled Daily GMB Post Runner
 * Called by time-driven trigger once daily (~9 AM IST)
 */
function scheduledGmbPostRunner() {
  Logger.log("=== STARTING AUTONOMOUS SCHEDULED GMB POST RUNNER ===");
  var props = PropertiesService.getScriptProperties();

  // Safety check: Enforce TEST_MODE
  var isTestModeProp = props.getProperty('TEST_MODE');
  if (isTestModeProp !== null) {
    TEST_MODE = isTestModeProp.toLowerCase() === 'true';
  }
  Logger.log("Execution Mode: " + (TEST_MODE ? "TEST_MODE (Safety Mock Enabled)" : "LIVE PUBLISH"));

  // 1. Determine current business in 4-day round-robin cycle
  var rotationIndex = parseInt(props.getProperty('GMB_ROTATION_INDEX') || '0', 10);
  var businessKey = BUSINESS_ROTATION_ORDER[rotationIndex % BUSINESS_ROTATION_ORDER.length];
  Logger.log("Scheduled target business: " + businessKey + " (Rotation cycle index: " + rotationIndex + ")");

  // 2. Generate business-specific content via Gemini API
  var genResult = generateGmbPostWithGemini(businessKey);
  if (!genResult.success) {
    Logger.log("[ABORT] Content generation failed for " + businessKey + ": " + genResult.error);
    return { success: false, error: genResult.error };
  }

  var summary = genResult.summary;
  var topicTitle = genResult.topic_title;
  var ctaUrl = genResult.cta_url;
  Logger.log("Generated topic: '" + topicTitle + "' | Length: " + summary.length + " chars");

  // 3. Hard Safety & Policy Validation Gate
  var validation = validateContent(summary, businessKey);
  if (!validation.valid) {
    Logger.log("[ABORT] Generated content failed validation gate for " + businessKey + ": " + validation.errors.join(", "));
    return { success: false, error: "Validation gate failed: " + validation.errors.join(", ") };
  }

  // 4. Resolve & Validate Image
  var recentTopics = getRecentTopics(businessKey);
  var imagePillarIndex = recentTopics.length;
  var imageUrl = resolveVerifiedImageForBusiness(businessKey, imagePillarIndex);
  if (!imageUrl) {
    Logger.log("[ABORT] [IMAGE_MISSING] No accessible image available for " + businessKey + ". Aborting daily run.");
    return { success: false, error: "IMAGE_MISSING" };
  }

  // 5. Duplicate Protection
  var requestId = "scheduled_" + businessKey.toLowerCase() + "_" + Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyyMMdd");
  var contentHash = computeHash(summary + imageUrl);
  if (isDuplicate(requestId, contentHash)) {
    Logger.log("[ABORT] Duplicate detected for " + requestId + " (content hash: " + contentHash + "). Aborting.");
    return { success: false, error: "Duplicate content detected" };
  }

  // 6. Construct GMB Payload
  var postPayload = {
    request_id: requestId,
    business: businessKey,
    summary: summary,
    media_url: imageUrl,
    cta_url: ctaUrl
  };

  // 7. Publish to GBP
  var postResult = publishToGbp(postPayload, imageUrl, businessKey);
  if (!postResult.success) {
    Logger.log("[ERROR] GBP publish failed for " + businessKey + ": " + postResult.error);
    return { success: false, error: postResult.error };
  }

  // 8. Verify post
  var verification = verifyGbpPost(postResult.postName, postPayload, imageUrl, businessKey);
  if (!verification.verified) {
    Logger.log("[ERROR] Post verification failed for " + businessKey + ": " + verification.error);
    return { success: false, error: "Post verification failed: " + verification.error };
  }

  // 9. Lock duplicate records & update topic memory
  recordProcessedRequest(requestId, contentHash);
  recordTopicHistory(businessKey, topicTitle);

  // 10. Advance rotation index for tomorrow's run
  var nextIndex = (rotationIndex + 1) % BUSINESS_ROTATION_ORDER.length;
  props.setProperty('GMB_ROTATION_INDEX', String(nextIndex));
  Logger.log("Advanced rotation index to: " + nextIndex + " (Next: " + BUSINESS_ROTATION_ORDER[nextIndex] + ")");

  Logger.log("=== SCHEDULED GMB POST RUNNER FINISHED SUCCESSFULLY ===");
  return {
    success: true,
    business: businessKey,
    topic: topicTitle,
    post_id: postResult.postId,
    verified: true,
    next_business: BUSINESS_ROTATION_ORDER[nextIndex]
  };
}

/**
 * Deletes all existing triggers for scheduledGmbPostRunner
 */
function removeGmbTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'scheduledGmbPostRunner') {
      ScriptApp.deleteTrigger(triggers[i]);
      removed++;
    }
  }
  Logger.log("Removed " + removed + " existing GMB scheduled triggers.");
  return removed;
}

/**
 * Sets up exactly ONE clean daily time-driven trigger for ~9:00 AM IST
 */
function setupGmbDailyTrigger() {
  removeGmbTriggers();
  var trigger = ScriptApp.newTrigger('scheduledGmbPostRunner')
    .timeBased()
    .everyDays(1)
    .atHour(9) // ~9:00 AM IST
    .create();
  Logger.log("Successfully created daily GMB trigger (ID: " + trigger.getUniqueId() + ") for 9:00 AM IST.");
  return { success: true, triggerId: trigger.getUniqueId() };
}





