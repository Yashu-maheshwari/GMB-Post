const fs = require('fs');
let code = fs.readFileSync('google-apps-script/Code.js', 'utf8');

// I will just remove the extra `}` and `;` that I accidentally left or added.
// Specifically lines 1236 to 1238.
// I will just replace the exact block.
code = code.replace(
  `            model_used: model,\r\n            parsed_json: parsed\r\n          };\r\n        };\r\n        }\r\n      }\r\n    } else {`,
  `            model_used: model,\n            parsed_json: parsed\n          };\n        }\n      }\n    } else {`
);

// wait, safer to just replace the whole function block.
