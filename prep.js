const fs = require('fs');
let code = fs.readFileSync('google-apps-script/Code.js', 'utf8');

// I will just replace the exact end of the resolve function.
// Since it's currently messed up, I will just checkout and do it via exact string replace.
