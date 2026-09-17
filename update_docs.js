const fs = require('fs');

let status = fs.readFileSync('PROJECT_STATUS.md', 'utf8');
status = status.replace(
  /Topic Memory & Anti-Repetition.*/,
  "Topic Memory & Anti-Repetition: Tracks last 15 topics in `GMB_TOPICS_<BUSINESS_KEY>` with 5 content pillars per business.\n- [x] **Image Intelligence & Anti-Repetition**: Topics automatically map to business-specific categorized `imagePool`s using `pillar_id`. Tracks recent 10 images in `GMB_IMAGES_<BUSINESS_KEY>` to prevent sequential repetition of visually similar assets."
);
status = status.replace(/20\/20 PASS/, "24/24 PASS");
fs.writeFileSync('PROJECT_STATUS.md', status);

let changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
let newEntry = `## [Unreleased]
### Changed
- Refactored \`BUSINESS_CONTENT_CONFIG\` to group images by topic using \`imagePool\` mapping instead of flat arrays.
- Enhanced \`resolveVerifiedImageForBusiness\` to accept \`pillar_id\` (e.g. \`ethnic_festive\`) and deterministically select an image matching the post topic.
- Implemented image history tracking via \`GMB_IMAGES_<BUSINESS_KEY>\` (max 10 items) to guarantee non-repetitive image selection per business.
- Updated \`Code.js\` to record both topic and image history after successful GBP publication.
- Updated local unit tests in \`test_runner.js\` from 20 to 24 passing tests, verifying category-to-image mapping, anti-repetition logic, and exhausted-pool fallback behavior.

`;
changelog = changelog.replace(/## \[Unreleased\]\n(### .*?)?(?=\n## |$)/, newEntry);
fs.writeFileSync('CHANGELOG.md', changelog);

let handoff = fs.readFileSync('HANDOFF.md', 'utf8');
handoff = handoff.replace(
  /NEXT TASK:.*?(\n|$)/g,
  "NEXT TASK: \n- Monitor the scheduled trigger posts and ensure no unexpected GBP api errors. Image intelligence is fully implemented.\n"
);
fs.writeFileSync('HANDOFF.md', handoff);
console.log('Updated documentation files');
