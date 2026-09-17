const fs = require('fs');
let code = fs.readFileSync('google-apps-script/Code.js', 'utf8');

const oldPromptBlock = `  var avoidTopicsInstruction = recentTopics.length > 0
    ? "IMPORTANT: Do NOT repeat the angles or specific topics of these recent posts:\\n- " + recentTopics.slice(0, 10).join("\\n- ")
    : "This is the initial post for this pillar.";

  var promptText = "You are the official local Google Business Profile content author for \\"" + config.name + "\\".\\n\\n" +
    "Task: Generate a high-quality, authentic, informative Google Business Profile Local Post (100 to 250 words) targeting SEO, AEO (Answer Engine Optimization), and GEO (local search relevance).\\n\\n" +
    "Business Details:\\n" +
    "- Business Name: " + config.name + "\\n" +
    "- Local Area / Entities: " + config.locationEntities + "\\n" +
    "- Content Pillar: " + selectedPillar.name + "\\n" +
    "- Focus Angle: " + selectedPillar.angle + "\\n\\n" +
    "Specific Guidelines:\\n" +
    config.guidelines + "\\n\\n" +
    avoidTopicsInstruction + "\\n\\n" +
    "Formatting Requirements:\\n" +
    "- Length: Between 100 and 250 words.\\n" +
    "- Naturally integrate local entities (" + config.locationEntities + ") without keyword stuffing.\\n" +
    "- Provide actionable, helpful information that directly answers local search queries.\\n" +
    "- Conclude with a natural invitation to learn more or visit.\\n\\n" +
    "Output must be valid JSON ONLY in this exact structure with NO surrounding markdown backticks:\\n" +
    "{\\n" +
    "  \\"topic_title\\": \\"Specific unique topic title (5-10 words)\\",\\n" +
    "  \\"summary\\": \\"The full GMB post body text...\\"\\n" +
    "}";`;

const newPromptBlock = `  var recentHooksRaw = props.getProperty('GMB_CONTENT_PATTERNS_' + businessKey);
  var recentHooks = recentHooksRaw ? JSON.parse(recentHooksRaw) : [];

  var avoidTopicsInstruction = recentTopics.length > 0
    ? "IMPORTANT: Do NOT repeat the angles or specific topics of these recent posts:\\n- " + recentTopics.slice(0, 10).join("\\n- ")
    : "This is the initial post for this pillar.";

  var avoidHooksInstruction = recentHooks.length > 0
    ? "IMPORTANT: Do NOT use these recent hooks or CTAs:\\n- " + recentHooks.slice(0, 5).join("\\n- ")
    : "No recent hooks to avoid.";

  var entityDetails = businessKey === "AME_BAZAAR" && typeof AME_BAZAAR_ENTITY !== 'undefined' 
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
    "}";`;

code = code.replace(oldPromptBlock, newPromptBlock);

const oldParseBlock = `            return {
              success: true,
              summary: parsed.summary.trim(),
              topic_title: parsed.topic_title || selectedPillar.name,
              pillar_id: selectedPillar.id,
              cta_url: config.ctaUrl,
              model_used: model
            };`;

const newParseBlock = `            var fullSummary = parsed.useful_answer ? (parsed.useful_answer.trim() + "\\n\\n" + (parsed.CTA ? parsed.CTA.trim() : "")) : (parsed.summary ? parsed.summary.trim() : "");
            return {
              success: true,
              summary: fullSummary,
              topic_title: parsed.topic_title || selectedPillar.name,
              pillar_id: selectedPillar.id,
              cta_url: (businessKey === "AME_BAZAAR" && typeof WEBSITE_ENTITY_CONNECTION !== 'undefined') ? (WEBSITE_ENTITY_CONNECTION[selectedPillar.id] || config.ctaUrl) : config.ctaUrl,
              model_used: model,
              parsed_json: parsed
            };`;

code = code.replace(oldParseBlock, newParseBlock);

const oldTopicRecordBlock = `function recordTopicHistory(businessKey, topicTitle) {
  var props = PropertiesService.getScriptProperties();
  var history = getRecentTopics(businessKey);
  if (topicTitle) {
    history.unshift(topicTitle);
    if (history.length > 15) {
      history = history.slice(0, 15);
    }
    props.setProperty('GMB_TOPICS_' + businessKey, JSON.stringify(history));
  }
}`;

const newTopicRecordBlock = `function recordTopicHistory(businessKey, topicTitle) {
  var props = PropertiesService.getScriptProperties();
  var history = getRecentTopics(businessKey);
  if (topicTitle) {
    history.unshift(topicTitle);
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
    patterns.unshift(patternStr);
    if (patterns.length > 15) {
      patterns = patterns.slice(0, 15);
    }
    props.setProperty('GMB_CONTENT_PATTERNS_' + businessKey, JSON.stringify(patterns));
  }
}`;

code = code.replace(oldTopicRecordBlock, newTopicRecordBlock);

// In runOneControlledLiveAmePost
code = code.replace(
  /recordTopicHistory\("AME_BAZAAR", topicTitle\);\r?\n\s*recordImageHistory\("AME_BAZAAR", imageUrl\);/g,
  `recordTopicHistory("AME_BAZAAR", topicTitle);\n    recordImageHistory("AME_BAZAAR", imageUrl);\n    if (genResult.parsed_json && genResult.parsed_json.CTA) recordContentPattern("AME_BAZAAR", genResult.parsed_json.CTA);`
);

// In executeScheduledPostForBusiness
code = code.replace(
  /recordTopicHistory\(businessKey, topicTitle\);\r?\n\s*recordImageHistory\(businessKey, imageUrl\);/g,
  `recordTopicHistory(businessKey, topicTitle);\n  recordImageHistory(businessKey, imageUrl);\n  if (genResult.parsed_json && genResult.parsed_json.CTA) recordContentPattern(businessKey, genResult.parsed_json.CTA);`
);

fs.writeFileSync('google-apps-script/Code.js', code);
console.log('Updated Prompt, Parsing, and Diversity Engine');
