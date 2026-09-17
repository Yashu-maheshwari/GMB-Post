const fs = require('fs');
let code = fs.readFileSync('tests/test_runner.js', 'utf8');

// Update mock Gemini output
code = code.replace(
  /text: JSON\.stringify\(\{\r?\n?\s*topic_title: postTopic,\r?\n?\s*summary: postBody\r?\n?\s*\}\)/g,
  `text: JSON.stringify({
                          topic_title: postTopic,
                          useful_answer: postBody,
                          CTA: "Visit us today!",
                          search_intent: "Find clothes",
                          local_intent: "Delhi",
                          audience: "Families",
                          question_answered: "Where to buy?",
                          factual_claims: [],
                          visual_intent: "Shop front",
                          entity_signals: []
                        })`
);

// Update Test 9 for null fallback
code = code.replace(
  /const fallbackImage = sandbox\.resolveVerifiedImageForBusiness\("AME_BAZAAR", "ethnic_festive"\);\r?\n\s*assert\("Topic mapping falls back to oldest when pool is exhausted", String\(fallbackImage\)\.startsWith\("https:\/\/images\.unsplash\.com\/photo-1610030469983"\)\);/,
  `const fallbackImage = sandbox.resolveVerifiedImageForBusiness("AME_BAZAAR", "ethnic_festive");\n    assert("Topic mapping returns null when pool is exhausted", fallbackImage === null);`
);

// Add Content Patterns tracking to mock Props
code = code.replace(
  /const mockProps = \{\};/g,
  `const mockProps = { "GMB_CONTENT_PATTERNS_AME_BAZAAR": "[]" };`
);

fs.writeFileSync('tests/test_runner.js', code);
console.log('Updated test runner logic');
