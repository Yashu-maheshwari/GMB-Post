const fs = require('fs');
let code = fs.readFileSync('google-apps-script/Code.js', 'utf8');

// Use regex to replace the function entirely
const oldFuncRegex = /\/\*\*[\s\S]*?\* Resolves a verified accessible image for the given business[\s\S]*?function resolveVerifiedImageForBusiness[\s\S]*?return null;\n  \}\n\}/;

const newImageLogic = `/**
 * Get recent image history from Script Properties
 */
function getRecentImages(businessKey) {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('GMB_IMAGES_' + businessKey);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

/**
 * Store updated image history in Script Properties
 */
function recordImageHistory(businessKey, imageUrl) {
  var props = PropertiesService.getScriptProperties();
  var history = getRecentImages(businessKey);
  if (imageUrl) {
    history.unshift(imageUrl);
    if (history.length > 10) {
      history = history.slice(0, 10);
    }
    props.setProperty('GMB_IMAGES_' + businessKey, JSON.stringify(history));
  }
}

/**
 * Resolves a verified accessible topic-aware image for the given business
 */
function resolveVerifiedImageForBusiness(businessKey, pillarId) {
  var config = BUSINESS_CONTENT_CONFIG[businessKey];
  if (!config || !config.imagePool) {
    Logger.log("[IMAGE_MISSING] No image pool defined for " + businessKey);
    return null;
  }

  var pool = config.imagePool[pillarId] || [];
  if (pool.length === 0) {
     Logger.log("[IMAGE_MISSING] No images for pillar " + pillarId);
     return null;
  }

  var recentImages = getRecentImages(businessKey);
  
  for (var i = 0; i < pool.length; i++) {
    var candidateUrl = pool[i];
    if (recentImages.indexOf(candidateUrl) === -1) {
      var cloudinaryUrl = uploadToCloudinaryIfAvailable(candidateUrl);
      var finalUrl = cloudinaryUrl || candidateUrl;

      var accessCheck = testImageAccessibility(finalUrl);
      if (accessCheck.valid) {
        return finalUrl;
      } else {
        Logger.log("[IMAGE_WARN] Image accessibility failed for " + finalUrl + ": " + accessCheck.error);
      }
    }
  }
  
  var fallbackUrl = pool[0];
  for (var j = 0; j < pool.length; j++) {
      var cUrl = pool[j];
      var cloudinaryUrlFallback = uploadToCloudinaryIfAvailable(cUrl);
      var fUrl = cloudinaryUrlFallback || cUrl;
      var aCheck = testImageAccessibility(fUrl);
      if (aCheck.valid) {
         Logger.log("[IMAGE_WARN] Reusing image as pool is exhausted for " + pillarId);
         return fUrl;
      }
  }

  Logger.log("[IMAGE_MISSING] All images failed accessibility for " + pillarId);
  return null;
}`;

if (oldFuncRegex.test(code)) {
    code = code.replace(oldFuncRegex, newImageLogic);
    
    // In runOneControlledLiveAmePost
    code = code.replace(
      /var imageUrl = resolveVerifiedImageForBusiness\("AME_BAZAAR", recentTopics.length\);/,
      `var imageUrl = resolveVerifiedImageForBusiness("AME_BAZAAR", genResult.pillar_id);`
    );

    code = code.replace(
      /recordTopicHistory\("AME_BAZAAR", topicTitle\);/,
      `recordTopicHistory("AME_BAZAAR", topicTitle);\n    recordImageHistory("AME_BAZAAR", imageUrl);`
    );

    // In executeScheduledPostForBusiness
    code = code.replace(
      /var imagePillarIndex = recentTopics\.length;\r?\n\s*var imageUrl = resolveVerifiedImageForBusiness\(businessKey, imagePillarIndex\);/,
      `var imageUrl = resolveVerifiedImageForBusiness(businessKey, genResult.pillar_id);`
    );

    code = code.replace(
      /recordTopicHistory\(businessKey, topicTitle\);/,
      `recordTopicHistory(businessKey, topicTitle);\n  recordImageHistory(businessKey, imageUrl);`
    );

    fs.writeFileSync('google-apps-script/Code.js', code);
    console.log("Successfully replaced old image resolution logic");
} else {
    console.log("Regex failed to match. Showing surrounding text:");
    const idx = code.indexOf('function resolveVerifiedImageForBusiness');
    console.log(code.substring(Math.max(0, idx - 100), idx + 500));
}
