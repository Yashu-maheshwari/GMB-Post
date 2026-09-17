const fs = require('fs');
let code = fs.readFileSync('tests/test_runner.js', 'utf8');

code = code.replace(
  /assert\("Topic mapping falls back to oldest when pool is exhausted", String\(resolvedImgFallback\) === "https:\/\/res.cloudinary.com\/demo\/image\/upload\/sample_cloudinary.jpg" && resolvedImgFallback.originalUrl === "https:\/\/images.unsplash.com\/photo-1610030469983-98e550d6193c\?w=800&auto=format&fit=crop&q=80"\);/,
  `assert("Topic mapping returns null when pool is exhausted", resolvedImgFallback === null);`
);

fs.writeFileSync('tests/test_runner.js', code);
console.log("Test updated.");
