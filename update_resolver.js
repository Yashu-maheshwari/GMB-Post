const fs = require('fs');
let code = fs.readFileSync('google-apps-script/Code.js', 'utf8');

const oldResolveStr = `function resolveVerifiedImageForBusiness(businessKey, pillarId) {
  var config = BUSINESS_CONTENT_CONFIG[businessKey];
  if (!config || !config.imagePool) {
    Logger.log("[IMAGE_MISSING] No image pool defined for " + businessKey);
    return null;
  }

  var pool = config.imagePool[pillarId] || [];
  if (pool.length === 0) {
     Logger.log("[IMAGE_MISSING] No images for pillar " + pillarId);
     return null;
  }`;

const newResolveStr = `function resolveVerifiedImageForBusiness(businessKey, pillarId) {
  var config = BUSINESS_CONTENT_CONFIG[businessKey];
  if (!config || !config.imagePool) {
    Logger.log("[IMAGE_MISSING] No image pool defined for " + businessKey);
    return null;
  }
  
  var pillar = config.pillars.filter(function(p) { return p.id === pillarId; })[0];
  var poolKey = (pillar && pillar.imageFamily) ? pillar.imageFamily : pillarId;
  var pool = config.imagePool[poolKey] || [];
  
  if (pool.length === 0) {
     Logger.log("[IMAGE_MISSING] No images for poolKey " + poolKey);
     return null;
  }`;

code = code.replace(oldResolveStr, newResolveStr);

// Change the fallback behavior to return null
const oldFallback = `var fallbackUrl = pool[0];
  for (var j = 0; j < pool.length; j++) {
      var cUrl = pool[j];
      var cloudinaryUrlFallback = uploadToCloudinaryIfAvailable(cUrl);
      var fUrl = cloudinaryUrlFallback || cUrl;
      var aCheck = testImageAccessibility(fUrl);
      if (aCheck.valid) {
         Logger.log("[IMAGE_WARN] Reusing image as pool is exhausted for " + pillarId);
         var fStr = new String(fUrl);
         fStr.originalUrl = cUrl;
         return fStr;
      }
  }`;

const newFallback = `Logger.log("[IMAGE_POOL_EXHAUSTED] All images in pool " + poolKey + " have been used recently and no fallback reuse is permitted.");
  return null;`;

code = code.replace(oldFallback, newFallback);

fs.writeFileSync('google-apps-script/Code.js', code);
console.log('Updated resolveVerifiedImageForBusiness');
