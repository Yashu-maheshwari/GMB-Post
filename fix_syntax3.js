const fs = require('fs');
let code = fs.readFileSync('google-apps-script/Code.js', 'utf8');

const fnStart = code.indexOf('function generateGmbPostWithGemini(businessKey) {');
const fnEnd = code.indexOf('function getRecentImages(businessKey) {');

const newFn = `function generateGmbPostWithGemini(businessKey) {
  var logPrefix = "[generateGmbPostWithGemini][" + businessKey + "] ";
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('GEMINI_API_KEY');
  
  if (!apiKey) {
    Logger.log(logPrefix + "GEMINI_API_KEY missing in Script Properties.");
    return { success: false, error: "GEMINI_API_KEY missing in Script Properties" };
  }

  var config = BUSINESS_CONTENT_CONFIG[businessKey];
  if (!config) {
    return { success: false, error: "Unknown business key: " + businessKey };
  }

  var recentTopics = getRecentTopics(businessKey);
  var pillarIndex = recentTopics.length % config.pillars.length;
  var selectedPillar = config.pillars[pillarIndex];

  var recentHooksRaw = props.getProperty('GMB_CONTENT_PATTERNS_' + businessKey);
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
    "}";

  var model = props.getProperty('GEMINI_MODEL') || 'gemini-3.6-flash';
  var url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
  
  try {
    Logger.log(logPrefix + "Calling Gemini model: " + model + " for pillar: " + selectedPillar.name);
    var response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      }),
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    if (code === 200) {
      var data = JSON.parse(response.getContentText());
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        var rawText = data.candidates[0].content.parts[0].text.trim();
        if (rawText.indexOf("\`\`\`json") === 0) rawText = rawText.replace(/^\`\`\`json\s*/i, "").replace(/\`\`\`$/, "").trim();
        if (rawText.indexOf("\`\`\`") === 0) rawText = rawText.replace(/^\`\`\`\s*/i, "").replace(/\`\`\`$/, "").trim();

        var parsed = JSON.parse(rawText);
        if (parsed.topic_title && (parsed.summary || parsed.useful_answer)) {
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
        }
      }
    } else {
      Logger.log(logPrefix + "Model " + model + " returned HTTP " + code + ": " + response.getContentText());
      return { success: false, error: "Gemini API HTTP " + code + ": " + response.getContentText() };
    }
  } catch (err) {
    Logger.log(logPrefix + "Error calling Gemini (" + model + "): " + err.message);
    return { success: false, error: "Exception calling Gemini: " + err.message };
  }

  return { success: false, error: "Gemini failed to generate valid content" };
}

/**
 * Get recent image history from Script Properties
 */
`;

code = code.substring(0, fnStart) + newFn + code.substring(fnEnd + 40);

fs.writeFileSync('google-apps-script/Code.js', code);
console.log("Rewrote function completely");
