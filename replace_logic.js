const fs = require('fs');
let code = fs.readFileSync('google-apps-script/Code.js', 'utf8');

const imageResolutionOld = `/**
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
}`;

const imageResolutionNew = `/**
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
    // Reject recently used image
    if (recentImages.indexOf(candidateUrl) === -1) {
      // Try Cloudinary upload if configured
      var cloudinaryUrl = uploadToCloudinaryIfAvailable(candidateUrl);
      var finalUrl = cloudinaryUrl || candidateUrl;

      // Validate accessibility
      var accessCheck = testImageAccessibility(finalUrl);
      if (accessCheck.valid) {
        return finalUrl;
      } else {
        Logger.log("[IMAGE_WARN] Image accessibility failed for " + finalUrl + ": " + accessCheck.error);
      }
    }
  }
  
  // Fallback: if all images in the pool have been recently used, pick the oldest used one
  // or just fail. Requirements: "reject recently used image ... Use a safe no-image path only if GBP post creation supports it safely; otherwise fail the post"
  // Since we have a bounded history (10), and pools might have only 2 images, it's very likely they get exhausted.
  // Wait, if a pool has 2 images and we post 5 times across different pillars, the recentImages will contain both.
  // So we must check if they were recently used *for this pillar*, or just pick the oldest used among the pool.
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

code = code.replace(imageResolutionOld, imageResolutionNew);

// Also need to update the calls to resolveVerifiedImageForBusiness
// In runOneControlledLiveAmePost
code = code.replace(
  /var imageUrl = resolveVerifiedImageForBusiness\("AME_BAZAAR", recentTopics.length\);/,
  `var imageUrl = resolveVerifiedImageForBusiness("AME_BAZAAR", genResult.pillar_id);`
);

// In runOneControlledLiveAmePost, add recordImageHistory
code = code.replace(
  /recordTopicHistory\("AME_BAZAAR", topicTitle\);/,
  `recordTopicHistory("AME_BAZAAR", topicTitle);\n    recordImageHistory("AME_BAZAAR", imageUrl);`
);

// In executeScheduledPostForBusiness
code = code.replace(
  /var imagePillarIndex = recentTopics\.length;\n\s*var imageUrl = resolveVerifiedImageForBusiness\(businessKey, imagePillarIndex\);/,
  `var imageUrl = resolveVerifiedImageForBusiness(businessKey, genResult.pillar_id);`
);

// In executeScheduledPostForBusiness, add recordImageHistory
code = code.replace(
  /recordTopicHistory\(businessKey, topicTitle\);/,
  `recordTopicHistory(businessKey, topicTitle);\n  recordImageHistory(businessKey, imageUrl);`
);

fs.writeFileSync('google-apps-script/Code.js', code);
console.log('Updated resolveVerifiedImageForBusiness and history recording');
