const fs = require('fs');
let code = fs.readFileSync('tests/test_runner.js', 'utf8');
code = code.replace(
  /const hist = sandbox\.getRecentImages\("AME_BAZAAR"\);\r?\nassert\("Image history records successfully", hist\.length === 1\);/,
  `const hist = sandbox.getRecentImages("AME_BAZAAR");\nconsole.log("HISTORY:", hist);\nassert("Image history records successfully", hist.length === 1);`
);
fs.writeFileSync('tests/test_runner.js', code);
