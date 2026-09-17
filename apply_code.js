const fs = require('fs');
let code = fs.readFileSync('google-apps-script/Code.js', 'utf8');

// 1. AME_BAZAAR Config
const oldConfigPart1 = `"AME_BAZAAR": {`;
const oldConfigPart2 = `"MAHESHWARI_COUNSEL": {`;
const ameStart = code.indexOf(oldConfigPart1);
const counselStart = code.indexOf(oldConfigPart2);

if (ameStart !== -1 && counselStart !== -1) {
  const newAmeConfig = `"AME_BAZAAR": {
    name: typeof AME_BAZAAR_ENTITY !== 'undefined' ? AME_BAZAAR_ENTITY.official_name : "AME Bazaar - Family Garment Store",
    locationEntities: typeof AME_BAZAAR_ENTITY !== 'undefined' ? AME_BAZAAR_ENTITY.local_area.join(", ") : "Mubarakpur Road, Kirari Suleman Nagar, Nangloi, Delhi",
    ctaUrl: "https://www.amebazaar.in/",
    pillars: typeof GMB_CONTENT_PILLARS_AME !== 'undefined' ? GMB_CONTENT_PILLARS_AME : [],
    imagePool: {
      "ethnic_festive": [
        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1583391733958-d15014251d20?w=800&auto=format&fit=crop&q=80"
      ],
      "wedding": [
        "https://images.unsplash.com/photo-1583391733958-d15014251d20?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop&q=80"
      ],
      "womens_fashion": [
        "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&auto=format&fit=crop&q=80"
      ],
      "mens_fashion": [
        "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=800&auto=format&fit=crop&q=80"
      ],
      "kids_wear": [
        "https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=800&auto=format&fit=crop&q=80"
      ],
      "family_shopping": [
        "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&auto=format&fit=crop&q=80"
      ],
      "tailoring": [
        "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&auto=format&fit=crop&q=80"
      ],
      "seasonal_wardrobe": [
        "https://images.unsplash.com/photo-1434389678059-3a3233852233?w=800&auto=format&fit=crop&q=80"
      ],
      "local_shopping": [
        "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=800&auto=format&fit=crop&q=80"
      ]
    },
    guidelines: "Write in warm, helpful conversational English/Hinglish. Answer the user's question clearly. Do NOT keyword stuff. Do not use words 'cheapest', 'lowest price', 'guaranteed cheapest'. Never mention persona 'Sam'. Only state factual information from the entity definition."
  },
  `;
  code = code.substring(0, ameStart) + newAmeConfig + code.substring(counselStart);
} else {
  console.log("Could not find AME_BAZAAR config");
}

// 2. recordContentPattern
const oldTopicHistStart = `function recordTopicHistory(businessKey, topicTitle) {`;
const histIndex = code.indexOf(oldTopicHistStart);
if (histIndex !== -1) {
  const newHistFunc = `function recordContentPattern(businessKey, patternStr) {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('GMB_CONTENT_PATTERNS_' + businessKey);
  var patterns = raw ? JSON.parse(raw) : [];
  if (patternStr) {
    patterns.unshift(patternStr.trim());
    if (patterns.length > 15) {
      patterns = patterns.slice(0, 15);
    }
    props.setProperty('GMB_CONTENT_PATTERNS_' + businessKey, JSON.stringify(patterns));
  }
}

function recordTopicHistory(businessKey, topicTitle) {`;
  code = code.substring(0, histIndex) + newHistFunc + code.substring(histIndex + oldTopicHistStart.length);
} else {
  console.log("Could not find recordTopicHistory");
}

// 3. Executor updates (calling recordContentPattern)
code = code.replace(
  /recordTopicHistory\("AME_BAZAAR", topicTitle\);\r?\n\s*recordImageHistory\("AME_BAZAAR", imageUrl\);/g,
  `recordTopicHistory("AME_BAZAAR", topicTitle);\n    recordImageHistory("AME_BAZAAR", imageUrl);\n    if (genResult.parsed_json && genResult.parsed_json.CTA) recordContentPattern("AME_BAZAAR", genResult.parsed_json.CTA);`
);
code = code.replace(
  /recordTopicHistory\(businessKey, topicTitle\);\r?\n\s*recordImageHistory\(businessKey, imageUrl\);/g,
  `recordTopicHistory(businessKey, topicTitle);\n  recordImageHistory(businessKey, imageUrl);\n  if (genResult.parsed_json && genResult.parsed_json.CTA) recordContentPattern(businessKey, genResult.parsed_json.CTA);`
);

// 4. resolveVerifiedImageForBusiness
const resolveStart = code.indexOf(`function resolveVerifiedImageForBusiness(businessKey, pillarId) {`);
const resolveEnd = code.indexOf(`function executeScheduledPostForBusiness`, resolveStart);
if (resolveStart !== -1 && resolveEnd !== -1) {
  const oldResolveBlock = code.substring(resolveStart, resolveEnd);
  
  let newResolveBlock = oldResolveBlock.replace(
    /var pool = config\.imagePool\[pillarId\] \|\| \[\];\r?\n\s*if \(pool\.length === 0\) \{\r?\n\s*Logger\.log\("\[IMAGE_MISSING\] No images for pillar " \+ pillarId\);\r?\n\s*return null;\r?\n\s*\}/,
    `var pillar = config.pillars.filter(function(p) { return p.id === pillarId; })[0];
  var poolKey = (pillar && pillar.imageFamily) ? pillar.imageFamily : pillarId;
  var pool = config.imagePool[poolKey] || [];
  
  if (pool.length === 0) {
     Logger.log("[IMAGE_MISSING] No images for poolKey " + poolKey);
     return null;
  }`
  );

  newResolveBlock = newResolveBlock.replace(
    /var fallbackUrl = pool\[0\];\r?\n\s*for \(var j = 0; j < pool\.length; j\+\+\) \{[\s\S]*?\}\r?\n/,
    `Logger.log("[IMAGE_POOL_EXHAUSTED] All images in pool " + poolKey + " have been used recently and no fallback reuse is permitted.");\n  return null;\n\n`
  );

  code = code.substring(0, resolveStart) + newResolveBlock + code.substring(resolveEnd);
} else {
  console.log("Could not find resolveVerifiedImageForBusiness");
}

// 5. generateGmbPostWithGemini
const promptStart = code.indexOf(`  var avoidTopicsInstruction = recentTopics.length > 0`);
const promptEnd = code.indexOf(`  var model = props.getProperty('GEMINI_MODEL') || 'gemini-3.6-flash';`);
if (promptStart !== -1 && promptEnd !== -1) {
  const newPromptBlock = `  var recentHooksRaw = props.getProperty('GMB_CONTENT_PATTERNS_' + businessKey);
  var recentHooks = recentHooksRaw ? JSON.parse(recentHooksRaw) : [];

  var avoidTopicsInstruction = recentTopics.length > 0
    ? "IMPORTANT: Do NOT repeat the angles or specific topics of these recent posts:\\n- " + recentTopics.slice(0, 10).join("\\n- ")
    : "This is the initial post for this pillar.";

  var avoidHooksInstruction = recentHooks.length > 0
    ? "IMPORTANT: Do NOT use these recent hooks or CTAs:\\n- " + recentHooks.slice(0, 5).join("\\n- ")
    : "No recent hooks to avoid.";

  var entityDetails = (businessKey === "AME_BAZAAR" && typeof AME_BAZAAR_ENTITY !== 'undefined')
    ? "\\nEntity Facts (DO NOT INVENT ANYTHING NOT HERE):\\n" + JSON.stringify(AME_BAZAAR_ENTITY, null, 2)
    : "";

  var promptText = "You are the official local Google Business Profile content author for \\"" + config.name + "\\".\\n\\n" +
    "Task: Generate a high-quality, authentic, informative Google Business Profile Local Post (100 to 250 words) targeting SEO, AEO (Answer Engine Optimization), and GEO (local search relevance).\\n\\n" +
    "Business Details:\\n" +
    "- Business Name: " + config.name + "\\n" +
    "- Local Area / Entities: " + config.locationEntities + "\\n" +
    "- Content Pillar: " + selectedPillar.name + "\\n" +
    "- Focus Angle: " + selectedPillar.angle + "\\n" +
    entityDetails + "\\n\\n" +
    "Specific Guidelines:\\n" +
    config.guidelines + "\\n\\n" +
    avoidTopicsInstruction + "\\n" +
    avoidHooksInstruction + "\\n\\n" +
    "Formatting Requirements:\\n" +
    "- Length: Between 100 and 250 words for the useful_answer.\\n" +
    "- Naturally integrate local entities (" + config.locationEntities + ") without keyword stuffing.\\n" +
    "- The 'question_answered' should be a realistic local search query.\\n" +
    "- The 'useful_answer' must provide actionable, helpful information that directly answers the question before connecting back to the business.\\n" +
    "- The 'CTA' should be a natural invitation to learn more or visit.\\n\\n" +
    "Output must be valid JSON ONLY in this exact structure with NO surrounding markdown backticks:\\n" +
    "{\\n" +
    "  \\"topic_title\\": \\"Specific unique topic title (5-10 words)\\",\\n" +
    "  \\"search_intent\\": \\"The intent of the searcher\\",\\n" +
    "  \\"local_intent\\": \\"The geographic intent\\",\\n" +
    "  \\"audience\\": \\"Target audience\\",\\n" +
    "  \\"question_answered\\": \\"The specific customer question being answered\\",\\n" +
    "  \\"useful_answer\\": \\"The main body of the post answering the question (100-250 words)\\",\\n" +
    "  \\"factual_claims\\": [\\"Claim 1\\", \\"Claim 2\\"],\\n" +
    "  \\"CTA\\": \\"Call to action text\\",\\n" +
    "  \\"visual_intent\\": \\"Description of the ideal image\\",\\n" +
    "  \\"entity_signals\\": [\\"Signal 1\\", \\"Signal 2\\"]\\n" +
    "}";\n\n`;
  code = code.substring(0, promptStart) + newPromptBlock + code.substring(promptEnd);
} else {
  console.log("Could not find promptBlock");
}

// 6. JSON Parse logic
const parseStart = code.indexOf(`if (parsed.summary && parsed.summary.trim().length > 20) {`);
const parseEnd = code.indexOf(`}`, code.indexOf(`model_used: model`, parseStart)) + 1;
if (parseStart !== -1 && parseEnd !== -1) {
  const newParseBlock = `if (parsed.topic_title && (parsed.summary || parsed.useful_answer)) {
          var fullSummary = parsed.useful_answer ? (parsed.useful_answer.trim() + "\\n\\n" + (parsed.CTA ? parsed.CTA.trim() : "")) : (parsed.summary ? parsed.summary.trim() : "");
          return {
            success: true,
            summary: fullSummary,
            topic_title: parsed.topic_title || selectedPillar.name,
            pillar_id: selectedPillar.id,
            cta_url: (businessKey === "AME_BAZAAR" && typeof WEBSITE_ENTITY_CONNECTION !== 'undefined') ? (WEBSITE_ENTITY_CONNECTION[selectedPillar.id] || config.ctaUrl) : config.ctaUrl,
            model_used: model,
            parsed_json: parsed
          };
        }`;
  code = code.substring(0, parseStart) + newParseBlock + code.substring(parseEnd);
} else {
  console.log("Could not find parseBlock");
}

fs.writeFileSync('google-apps-script/Code.js', code);
console.log("File written.");
