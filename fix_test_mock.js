const fs = require('fs');
let code = fs.readFileSync('tests/test_runner.js', 'utf8');

const regex = /text:\s*JSON\.stringify\(\{[\s\S]*?topic_title: postTopic,[\s\S]*?summary: postBody[\s\S]*?\}\)/g;
code = code.replace(regex, `text: JSON.stringify({
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
                        })`);

fs.writeFileSync('tests/test_runner.js', code);
console.log('Fixed test_runner.js mock Gemini output');
