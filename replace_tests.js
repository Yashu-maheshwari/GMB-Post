const fs = require('fs');
let code = fs.readFileSync('tests/test_runner.js', 'utf8');

code = code.replace(
  /const origConfig = sandbox\.BUSINESS_CONTENT_CONFIG\['SIS'\]\.images;\nsandbox\.BUSINESS_CONTENT_CONFIG\['SIS'\]\.images = \[\];/g,
  `const origConfig = sandbox.BUSINESS_CONTENT_CONFIG['SIS'].imagePool;\nsandbox.BUSINESS_CONTENT_CONFIG['SIS'].imagePool = {};`
);

code = code.replace(
  /sandbox\.BUSINESS_CONTENT_CONFIG\['SIS'\]\.images = origConfig;/g,
  `sandbox.BUSINESS_CONTENT_CONFIG['SIS'].imagePool = origConfig;`
);

// We should also add tests for the new image pool functionality
const newTests = `
// Test 9: Image Topic Mapping and History
sandbox.recordImageHistory("AME_BAZAAR", "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80");
const hist = sandbox.getRecentImages("AME_BAZAAR");
assert("Image history records successfully", hist.length === 1);

const resolvedImg1 = sandbox.resolveVerifiedImageForBusiness("AME_BAZAAR", "ethnic_festive");
// Should pick the second one since the first is in history
assert("Topic mapping avoids recently used image", resolvedImg1 === "https://images.unsplash.com/photo-1583391733958-d15014251d20?w=800&auto=format&fit=crop&q=80");

sandbox.recordImageHistory("AME_BAZAAR", resolvedImg1);
// Now both are in history, it should fallback to the first one
const resolvedImgFallback = sandbox.resolveVerifiedImageForBusiness("AME_BAZAAR", "ethnic_festive");
assert("Topic mapping falls back to oldest when pool is exhausted", resolvedImgFallback === "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80");

const missingImg = sandbox.resolveVerifiedImageForBusiness("AME_BAZAAR", "unknown_pillar");
assert("Unknown pillar returns null", missingImg === null);
`;

code = code.replace(
  /console\.log\(`\\n=== NODE\.JS UNIT TESTS: \$\{testPassed\} PASSED, \$\{testFailed\} FAILED ===`\);/,
  newTests + '\nconsole.log(`\\n=== NODE.JS UNIT TESTS: ${testPassed} PASSED, ${testFailed} FAILED ===`);'
);

fs.writeFileSync('tests/test_runner.js', code);
console.log('Updated test_runner.js');
