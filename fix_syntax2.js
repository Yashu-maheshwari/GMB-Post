const fs = require('fs');
let code = fs.readFileSync('google-apps-script/Code.js', 'utf8');

const target = `            model_used: model,
            parsed_json: parsed
          };
        };
        }
      }
    } else {`;
    
const replacement = `            model_used: model,
            parsed_json: parsed
          };
        }
      }
    } else {`;

code = code.replace(target, replacement);

const target2 = `            model_used: model,\r
            parsed_json: parsed\r
          };\r
        };\r
        }\r
      }\r
    } else {`;
code = code.replace(target2, replacement);

fs.writeFileSync('google-apps-script/Code.js', code);
console.log("Syntax fix applied");
