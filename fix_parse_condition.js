const fs = require('fs');
let code = fs.readFileSync('google-apps-script/Code.js', 'utf8');

code = code.replace(
  /if \(parsed\.topic_title && parsed\.summary\) \{/g,
  `if (parsed.topic_title && (parsed.summary || parsed.useful_answer)) {`
);

fs.writeFileSync('google-apps-script/Code.js', code);
console.log('Fixed parsing condition in Code.js');
