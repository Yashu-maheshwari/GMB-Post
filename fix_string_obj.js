const fs = require('fs');
let code = fs.readFileSync('google-apps-script/Code.js', 'utf8');

// We need to replace the return finalUrl; and return fUrl; inside resolveVerifiedImageForBusiness
code = code.replace(
  /var accessCheck = testImageAccessibility\(finalUrl\);\r?\n\s*if \(accessCheck\.valid\) \{\r?\n\s*return finalUrl;/g,
  `var accessCheck = testImageAccessibility(finalUrl);\n      if (accessCheck.valid) {\n        var finalStr = new String(finalUrl);\n        finalStr.originalUrl = candidateUrl;\n        return finalStr;`
);

code = code.replace(
  /var aCheck = testImageAccessibility\(fUrl\);\r?\n\s*if \(aCheck\.valid\) \{\r?\n\s*Logger\.log\("\[IMAGE_WARN\] Reusing image as pool is exhausted for " \+ pillarId\);\r?\n\s*return fUrl;/g,
  `var aCheck = testImageAccessibility(fUrl);\n      if (aCheck.valid) {\n         Logger.log("[IMAGE_WARN] Reusing image as pool is exhausted for " + pillarId);\n         var fStr = new String(fUrl);\n         fStr.originalUrl = cUrl;\n         return fStr;`
);

// Update recordImageHistory to use imageUrl.originalUrl
code = code.replace(
  /function recordImageHistory\(businessKey, imageUrl\) \{\r?\n\s*var props = PropertiesService\.getScriptProperties\(\);\r?\n\s*var history = getRecentImages\(businessKey\);\r?\n\s*if \(imageUrl\) \{\r?\n\s*history\.unshift\(imageUrl\);/g,
  `function recordImageHistory(businessKey, imageUrl) {\n  var props = PropertiesService.getScriptProperties();\n  var history = getRecentImages(businessKey);\n  if (imageUrl) {\n    var urlToRecord = imageUrl.originalUrl ? imageUrl.originalUrl : String(imageUrl);\n    history.unshift(urlToRecord);`
);

fs.writeFileSync('google-apps-script/Code.js', code);
console.log('Fixed resolveVerifiedImageForBusiness return string object');
