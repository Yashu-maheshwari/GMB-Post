const fs = require('fs');
let code = fs.readFileSync('tests/test_runner.js', 'utf8');

code = code.replace(
  /const origConfig = sandbox\.BUSINESS_CONTENT_CONFIG\['SIS'\]\.images;\r?\nsandbox\.BUSINESS_CONTENT_CONFIG\['SIS'\]\.images = \[\];/g,
  `const origConfig = sandbox.BUSINESS_CONTENT_CONFIG['SIS'].imagePool;\r\nsandbox.BUSINESS_CONTENT_CONFIG['SIS'].imagePool = {};`
);

// We also need to fix Test 5: Image pool resolution
// It is currently: sandbox.resolveVerifiedImageForBusiness("AME_BAZAAR", 0);
code = code.replace(
  /const imageAme = sandbox\.resolveVerifiedImageForBusiness\("AME_BAZAAR", 0\);/g,
  `const imageAme = sandbox.resolveVerifiedImageForBusiness("AME_BAZAAR", "ethnic_festive");`
);

fs.writeFileSync('tests/test_runner.js', code);
console.log('Fixed test_runner.js');
