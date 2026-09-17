const fs = require('fs');
let code = fs.readFileSync('google-apps-script/Code.js', 'utf8');

// 1. AME_BAZAAR Config
code = code.replace(
  /"AME_BAZAAR":\s*\{[\s\S]*?guidelines:\s*"[^"]*"\s*\},\s*"MAHESHWARI_COUNSEL"/,
  `"AME_BAZAAR": {
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
  "MAHESHWARI_COUNSEL"`
);

// 2. resolveVerifiedImageForBusiness start
code = code.replace(
  /var pool = config\.imagePool\[pillarId\] \|\| \[\];\s*if \(pool\.length === 0\) \{\s*Logger\.log\("\[IMAGE_MISSING\] No images for pillar " \+ pillarId\);\s*return null;\s*\}/,
  `var pillar = config.pillars.filter(function(p) { return p.id === pillarId; })[0];
  var poolKey = (pillar && pillar.imageFamily) ? pillar.imageFamily : pillarId;
  var pool = config.imagePool[poolKey] || [];
  
  if (pool.length === 0) {
     Logger.log("[IMAGE_MISSING] No images for poolKey " + poolKey);
     return null;
  }`
);

// 3. resolveVerifiedImageForBusiness fallback
code = code.replace(
  /var fallbackUrl = pool\[0\];\s*for \(var j = 0; j < pool\.length; j\+\+\) \{[\s\S]*?fStr\.originalUrl = cUrl;\s*return fStr;\s*\}\s*\}/,
  `Logger.log("[IMAGE_POOL_EXHAUSTED] All images in pool " + poolKey + " have been used recently and no fallback reuse is permitted.");
  return null;`
);

// 4. Prompt block
code = code.replace(
  /var avoidTopicsInstruction = recentTopics\.length > 0[\s\S]*?"  \\"summary\\": \\"The full GMB post body text\.\.\.\\"\\n" \+\s* "\}";/,
  `var recentHooksRaw = props.getProperty('GMB_CONTENT_PATTERNS_' + businessKey);
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
    "}";`
);

// 5. Parse block
code = code.replace(
  /if \(parsed\.topic_title && \(parsed\.summary \|\| parsed\.useful_answer\)\) \{\s*return \{\s*success: true,\s*summary: parsed\.summary\.trim\(\),[\s\S]*?model_used: model\s*\};\s*\}/,
  `if (parsed.topic_title && (parsed.summary || parsed.useful_answer)) {
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
          }`
);

// 6. Record hooks
code = code.replace(
  /function recordTopicHistory\(businessKey, topicTitle\) \{[\s\S]*?\}\s*\}/,
  `function recordTopicHistory(businessKey, topicTitle) {
  var props = PropertiesService.getScriptProperties();
  var history = getRecentTopics(businessKey);
  if (topicTitle && topicTitle.trim()) {
    history.unshift(topicTitle.trim());
    if (history.length > 15) {
      history = history.slice(0, 15);
    }
    props.setProperty('GMB_TOPICS_' + businessKey, JSON.stringify(history));
  }
}

function recordContentPattern(businessKey, patternStr) {
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
}`
);

// 7. Inject hook logic in executor functions
code = code.replace(
  /recordTopicHistory\("AME_BAZAAR", topicTitle\);\s*recordImageHistory\("AME_BAZAAR", imageUrl\);/g,
  `recordTopicHistory("AME_BAZAAR", topicTitle);\n  recordImageHistory("AME_BAZAAR", imageUrl);\n  if (genResult.parsed_json && genResult.parsed_json.CTA) recordContentPattern("AME_BAZAAR", genResult.parsed_json.CTA);`
);

code = code.replace(
  /recordTopicHistory\(businessKey, topicTitle\);\s*recordImageHistory\(businessKey, imageUrl\);/g,
  `recordTopicHistory(businessKey, topicTitle);\n  recordImageHistory(businessKey, imageUrl);\n  if (genResult.parsed_json && genResult.parsed_json.CTA) recordContentPattern(businessKey, genResult.parsed_json.CTA);`
);

fs.writeFileSync('google-apps-script/Code.js', code);
console.log('Regex replacements executed.');
