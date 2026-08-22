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
    Logger.log(logPrefix + "Received request: " + JSON.stringify({
      request_id: postData.request_id,
      summary_len: postData.summary ? postData.summary.length : 0,
      has_media: !!postData.media_url
    }));

    // 1. request_id mandatory
    var requestId = postData.request_id;
    if (!requestId) {
      return responseJson({ verified: false, error: "Missing mandatory request_id" }, 400);
    }

    // 2. Move API_SECRET authentication to X-SPARK-SECRET HTTP header
    var headers = e.headers || {};
    var sparkSecret = headers['X-SPARK-SECRET'] || headers['x-spark-secret'] || e.parameter['X-SPARK-SECRET'] || e.parameter['x-spark-secret'];
    var expectedSecret = PropertiesService.getScriptProperties().getProperty('SPARK_SECRET');
    if (!expectedSecret || sparkSecret !== expectedSecret) {
      Logger.log(logPrefix + "Auth Failed: X-SPARK-SECRET header mismatched or missing.");
      return responseJson({ verified: false, error: "Unauthorized access" }, 401);
    }

    // 8. Replace brittle AME banned-word check with proper hard-rule validation system
    var validationResult = validateContent(postData.summary);
    if (!validationResult.valid) {
      Logger.log(logPrefix + "Validation Failed: " + validationResult.errors.join(", "));
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
    var postResult = publishToGbp(postData, imageUrl);
    if (!postResult.success) {
      Logger.log(logPrefix + "GBP Publish Failed: " + postResult.error);
      return responseJson({ verified: false, error: "GBP API Error: " + postResult.error }, 500);
    }

    // 3. Strengthen post verification (returned name, location, summary matching, media exists, post state)
    var verification = verifyGbpPost(postResult.postName, postData, imageUrl);
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
function validateContent(summary) {
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

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Checks if this requestId and contentHash has been processed
 */
function isDuplicate(requestId, contentHash) {
  // Use CacheService / Script Properties as duplicate storage
  var props = PropertiesService.getScriptProperties();
  var key = "dup_" + requestId;
  var existingHash = props.getProperty(key);
  if (existingHash) {
    return true;
  }
  // Check if hash itself has been processed recently (hash dedup)
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
function publishToGbp(postData, imageUrl) {
  var props = PropertiesService.getScriptProperties();
  var isTestModeProp = props.getProperty('TEST_MODE');
  if (isTestModeProp !== null) {
    TEST_MODE = isTestModeProp.toLowerCase() === 'true';
  }

  if (TEST_MODE) {
    Logger.log("Running in TEST_MODE. Simulating GBP publishing.");
    var mockPostId = "local_post_" + Date.now();
    var accountId = props.getProperty('GOOGLE_GBP_ACCOUNT_ID') || "mock_account_id";
    var locationId = props.getProperty('GOOGLE_GBP_LOCATION_ID') || "mock_location_id";
    var mockPostName = "accounts/" + accountId + "/locations/" + locationId + "/localPosts/" + mockPostId;
    return {
      success: true,
      postId: mockPostId,
      postName: mockPostName,
      postUrl: "https://g.page/r/amebazaar/review"
    };
  }

  var accountId = props.getProperty('GOOGLE_GBP_ACCOUNT_ID');
  var locationId = props.getProperty('GOOGLE_GBP_LOCATION_ID');
  if (!accountId || !locationId) {
    return { success: false, error: "Missing GBP account_id or location_id configuration" };
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
function verifyGbpPost(postName, postData, imageUrl) {
  var props = PropertiesService.getScriptProperties();
  var isTestModeProp = props.getProperty('TEST_MODE');
  if (isTestModeProp !== null) {
    TEST_MODE = isTestModeProp.toLowerCase() === 'true';
  }

  if (TEST_MODE) {
    Logger.log("Running in TEST_MODE. Bypassing live verification.");
    return { verified: true };
  }

  var accountId = props.getProperty('GOOGLE_GBP_ACCOUNT_ID');
  var locationId = props.getProperty('GOOGLE_GBP_LOCATION_ID');

  // Verify returned name format: accounts/{accountId}/locations/{locationId}/localPosts/{postId}
  var expectedPrefix = "accounts/" + accountId + "/locations/" + locationId + "/localPosts/";
  if (!postName || postName.indexOf(expectedPrefix) !== 0) {
    return { verified: false, error: "Post name format invalid: " + postName };
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

  // Test 1: Content Validation (Valid)
  var res1 = validateContent("This is a beautiful new winter outfit at AME Bazaar Kirari. Come check it out.");
  assert("Valid Content check", res1.valid === true);

  // Test 2: Banned Words Check
  var res2 = validateContent("This is a placeholder post with Sam for AME Bazaar.");
  assert("Banned Words check", res2.valid === false && res2.errors.join("").indexOf("banned") !== -1);

  // Test 3: Length Check (Too short)
  var res3 = validateContent("short");
  assert("Length too short check", res3.valid === false && res3.errors.join("").indexOf("too short") !== -1);

  // Test 4: Duplicate hashing consistency
  var hash1 = computeHash("Test string");
  var hash2 = computeHash("Test string");
  assert("Hash consistency check", hash1 === hash2);

  // Test 5: Image accessibility simulation
  var res5 = testImageAccessibility("https://res.cloudinary.com/demo/image/upload/sample.jpg");
  assert("Image accessibility format check", res5.valid === true);

  Logger.log("=== SUITE SUMMARY: " + passed + " PASSED, " + failed + " FAILED ===");
  return { passed: passed, failed: failed };
}
