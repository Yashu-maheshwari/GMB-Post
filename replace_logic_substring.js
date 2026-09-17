const fs = require('fs');
let code = fs.readFileSync('google-apps-script/Code.js', 'utf8');

const startStr = "/**\r\n * Resolves a verified accessible image for the given business\r\n */";
const endStr = "\r\n}\r\n\r\n/**\r\n * Core engine for executing";

const idxStart = code.indexOf(startStr);
const idxEnd = code.indexOf(endStr);

if (idxStart !== -1 && idxEnd !== -1) {
    const oldCode = code.substring(idxStart, idxEnd + 4);
    
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
}\r\n`;

    code = code.substring(0, idxStart) + newImageLogic + code.substring(idxEnd + 4);
    
    // In runOneControlledLiveAmePost
    code = code.replace(
      /var imageUrl = resolveVerifiedImageForBusiness\("AME_BAZAAR", recentTopics.length\);/,
      `var imageUrl = resolveVerifiedImageForBusiness("AME_BAZAAR", genResult.pillar_id);`
    );

    code = code.replace(
      /recordTopicHistory\("AME_BAZAAR", topicTitle\);/,
      `recordTopicHistory("AME_BAZAAR", topicTitle);\r\n    recordImageHistory("AME_BAZAAR", imageUrl);`
    );

    // In executeScheduledPostForBusiness
    code = code.replace(
      /var imagePillarIndex = recentTopics\.length;\r?\n\s*var imageUrl = resolveVerifiedImageForBusiness\(businessKey, imagePillarIndex\);/,
      `var imageUrl = resolveVerifiedImageForBusiness(businessKey, genResult.pillar_id);`
    );

    code = code.replace(
      /recordTopicHistory\(businessKey, topicTitle\);/,
      `recordTopicHistory(businessKey, topicTitle);\r\n  recordImageHistory(businessKey, imageUrl);`
    );

    fs.writeFileSync('google-apps-script/Code.js', code);
    console.log("Successfully replaced old image resolution logic");
} else {
    console.log("Could not find start or end index.");
}
