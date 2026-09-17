const fs = require('fs');
let code = fs.readFileSync('tests/test_runner.js', 'utf8');

code = code.replace(
  /const resolvedImg1 = sandbox\.resolveVerifiedImageForBusiness\("AME_BAZAAR", "ethnic_festive"\);\r?\n\/\/ Should pick the second one since the first is in history\r?\nassert\("Topic mapping avoids recently used image", resolvedImg1 === "https:\/\/images\.unsplash\.com\/photo-1583391733958-d15014251d20\?w=800&auto=format&fit=crop&q=80"\);/g,
  `const resolvedImg1 = sandbox.resolveVerifiedImageForBusiness("AME_BAZAAR", "ethnic_festive");\n// Should pick the second one since the first is in history\nassert("Topic mapping avoids recently used image", String(resolvedImg1) === "https://res.cloudinary.com/demo/image/upload/sample_cloudinary.jpg" && resolvedImg1.originalUrl === "https://images.unsplash.com/photo-1583391733958-d15014251d20?w=800&auto=format&fit=crop&q=80");`
);

code = code.replace(
  /const resolvedImgFallback = sandbox\.resolveVerifiedImageForBusiness\("AME_BAZAAR", "ethnic_festive"\);\r?\nassert\("Topic mapping falls back to oldest when pool is exhausted", resolvedImgFallback === "https:\/\/images\.unsplash\.com\/photo-1610030469983-98e550d6193c\?w=800&auto=format&fit=crop&q=80"\);/g,
  `const resolvedImgFallback = sandbox.resolveVerifiedImageForBusiness("AME_BAZAAR", "ethnic_festive");\nassert("Topic mapping falls back to oldest when pool is exhausted", String(resolvedImgFallback) === "https://res.cloudinary.com/demo/image/upload/sample_cloudinary.jpg" && resolvedImgFallback.originalUrl === "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80");`
);

// We should also clear history before Test 9 to be safe
code = code.replace(
  /\/\/ Test 9: Image Topic Mapping and History\r?\nsandbox\.recordImageHistory\("AME_BAZAAR", "https:\/\/images\.unsplash\.com\/photo-1610030469983-98e550d6193c\?w=800&auto=format&fit=crop&q=80"\);/g,
  `// Test 9: Image Topic Mapping and History\nmockProperties['GMB_IMAGES_AME_BAZAAR'] = JSON.stringify([]);\nsandbox.recordImageHistory("AME_BAZAAR", "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80");`
);

fs.writeFileSync('tests/test_runner.js', code);
console.log('Fixed test 9 in test_runner.js');
