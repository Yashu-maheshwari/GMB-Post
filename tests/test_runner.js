const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log("=== STARTING GMB WEBHOOK LOCAL EXECUTION TESTS ===");

const codePath = path.join(__dirname, '..', 'google-apps-script', 'Code.js');
const codeContent = fs.readFileSync(codePath, 'utf8');

const mockProperties = {
  'SPARK_SECRET': 'valid_spark_secret_token_123',
  'TEST_MODE': 'true',
  'GOOGLE_GBP_ACCOUNT_ID': '123456789',
  'GOOGLE_GBP_LOCATION_ID': '987654321',
  'CLOUDINARY_CLOUD_NAME': 'demo_cloud',
  'CLOUDINARY_UPLOAD_PRESET': 'demo_preset'
};

let mockTriggers = [];

const sandbox = {
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (key) => mockProperties[key] || null,
      setProperty: (key, value) => {
        mockProperties[key] = String(value);
      },
      deleteProperty: (key) => {
        delete mockProperties[key];
      }
    })
  },
  UrlFetchApp: {
    fetch: (url, options) => {
      console.log(`[Mock UrlFetchApp] Fetching: ${url}`);
      // Gemini API mock
      if (url.includes('generativelanguage.googleapis.com')) {
        let postBody = "This is a high quality local SEO post " + Date.now() + "_" + Math.random();
        let postTopic = "Authentic Local Guide";
        
        if (options && options.payload) {
          try {
            const payloadObj = JSON.parse(options.payload);
            const promptContent = payloadObj.contents[0].parts[0].text;
            if (promptContent.includes('AME Bazaar')) {
              postBody = "Naye festive garments and ethnic dresses collection ab Mubarakpur Road Kirari store par available hai. Family shopping aur custom tailoring fitting ke liye visit karein.";
              postTopic = "Family Festive Outfits";
            } else if (promptContent.includes('Maheshwari Counsel')) {
              postBody = "This post explains the essential legal due diligence steps for property title verification and registration procedures in Delhi.";
              postTopic = "Property Title Due Diligence";
            } else if (promptContent.includes('Advaith Educational')) {
              postBody = "Effective study habits include active recall and structured 30-day revision timelines to build student confidence for exams in Delhi.";
              postTopic = "Student Active Recall Habits";
            } else if (promptContent.includes('SARASWATI INTERNATIONAL')) {
              postBody = "Early reading habits and balanced digital screen time nurture creativity and curiosity in growing school students.";
              postTopic = "Foundational Reading Habits";
            }
          } catch (e) {}
        }
        
        if (url.includes('key=')) {
          return {
            getResponseCode: () => 200,
            getHeaders: () => ({ 'Content-Type': 'application/json' }),
            getContentText: () => JSON.stringify({
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        text: JSON.stringify({
                          topic_title: postTopic,
                          summary: postBody
                        })
                      }
                    ]
                  }
                }
              ]
            })
          };
        }
      }
      if (url.includes('cloudinary.com') && !url.includes('sample_cloudinary.jpg') && !url.includes('sample.jpg')) {
        return {
          getResponseCode: () => 200,
          getHeaders: () => ({ 'Content-Type': 'application/json' }),
          getContentText: () => JSON.stringify({ secure_url: 'https://res.cloudinary.com/demo/image/upload/sample_cloudinary.jpg' })
        };
      }
      if (url.includes('sample.jpg') || url.includes('sample_cloudinary.jpg') || url.includes('unsplash.com')) {
        return {
          getResponseCode: () => 200,
          getHeaders: () => ({ 'Content-Type': 'image/jpeg' }),
          getContentText: () => 'binary_image_data'
        };
      }
      return {
        getResponseCode: () => 200,
        getHeaders: () => ({ 'Content-Type': 'application/json' }),
        getContentText: () => JSON.stringify({ name: 'mock_name' })
      };
    }
  },
  ScriptApp: {
    getProjectTriggers: () => mockTriggers,
    deleteTrigger: (trigger) => {
      mockTriggers = mockTriggers.filter(t => t.getUniqueId() !== trigger.getUniqueId());
    },
    newTrigger: (functionName) => ({
      timeBased: () => ({
        everyDays: (n) => ({
          atHour: (h) => ({
            create: () => {
              const newTrig = {
                getHandlerFunction: () => functionName,
                getUniqueId: () => "trig_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5)
              };
              mockTriggers.push(newTrig);
              return newTrig;
            }
          })
        })
      })
    })
  },
  ContentService: {
    MimeType: { JSON: 'application/json' },
    createTextOutput: (str) => ({
      setMimeType: (type) => {},
      contents: str
    })
  },
  Utilities: {
    DigestAlgorithm: { MD5: 'MD5' },
    Charset: { UTF_8: 'UTF_8' },
    computeDigest: (algo, val) => {
      return Array.from(val).map(c => c.charCodeAt(0) % 127);
    },
    formatDate: (date, tz, format) => {
      return "20260824";
    }
  },
  Logger: {
    log: (msg) => console.log(`[GAS Logger] ${msg}`)
  },
  TEST_MODE: true
};

vm.createContext(sandbox);
vm.runInContext(codeContent, sandbox);

// 1. Run GmbPost's native test suite
console.log("\nExecuting internal App Script local test suite...");
const internalResult = sandbox.runLocalSuite();

// 2. Perform End-to-End doPost call simulations
console.log("\nSimulating HTTP POST Request webhook calls...");

let testPassed = 0;
let testFailed = 0;

function assert(name, condition) {
  if (condition) {
    console.log(`✓ Node.js Assertion PASS: ${name}`);
    testPassed++;
  } else {
    console.log(`✗ Node.js Assertion FAIL: ${name}`);
    testFailed++;
  }
}

// doPost success simulation (AME_BAZAAR)
const mockPostEvent = {
  postData: {
    contents: JSON.stringify({
      request_id: "req_xyz_998877",
      business: "AME_BAZAAR",
      summary: "This is a premium dress offering. Perfect for winters at AME Bazaar Kirari Delhi.",
      media_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    })
  },
  headers: {
    "X-SPARK-SECRET": "valid_spark_secret_token_123"
  },
  parameter: {}
};

const successResponseObj = sandbox.doPost(mockPostEvent);
const successData = JSON.parse(successResponseObj.contents);
assert("doPost handles valid AME_BAZAAR payload", successData.verified === true);

// doPost success simulation (MAHESHWARI_COUNSEL)
const counselPostEvent = {
  postData: {
    contents: JSON.stringify({
      request_id: "req_xyz_887766",
      business: "MAHESHWARI_COUNSEL",
      summary: "This is educational legal content explaining common rights under property disputes.",
      media_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    })
  },
  headers: {
    "X-SPARK-SECRET": "valid_spark_secret_token_123"
  },
  parameter: {}
};

const counselResponseObj = sandbox.doPost(counselPostEvent);
const counselData = JSON.parse(counselResponseObj.contents);
assert("doPost handles valid MAHESHWARI_COUNSEL payload", counselData.verified === true);

// doPost solicitation rejection (MAHESHWARI_COUNSEL)
const badCounselEvent = {
  postData: {
    contents: JSON.stringify({
      request_id: "req_xyz_887766_bad",
      business: "MAHESHWARI_COUNSEL",
      summary: "We are the best lawyer and guarantee to win your case in Delhi court.",
      media_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    })
  },
  headers: {
    "X-SPARK-SECRET": "valid_spark_secret_token_123"
  },
  parameter: {}
};

const badCounselRes = sandbox.doPost(badCounselEvent);
const badCounselData = JSON.parse(badCounselRes.contents);
assert("doPost rejects MAHESHWARI_COUNSEL solicitation claims", badCounselData.verified === false && badCounselData.error.includes("solicitation"));

// doPost school check rejection (SIS)
const badSisEvent = {
  postData: {
    contents: JSON.stringify({
      request_id: "req_xyz_sis_bad",
      business: "SIS",
      summary: "Saraswati International School is affiliated to CBSE and offers board results.",
      media_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    })
  },
  headers: {
    "X-SPARK-SECRET": "valid_spark_secret_token_123"
  },
  parameter: {}
};

const badSisRes = sandbox.doPost(badSisEvent);
const badSisData = JSON.parse(badSisRes.contents);
assert("doPost rejects SIS unverified board affiliation claims", badSisData.verified === false && badSisData.error.includes("school claim"));

// doPost duplicate request check
const duplicateResponse = sandbox.doPost(mockPostEvent);
const duplicateData = JSON.parse(duplicateResponse.contents);
assert("doPost prevents duplicate requests with same request_id", duplicateData.verified === false && duplicateData.error.includes("Duplicate"));

// ==========================================
// OPTION A: AUTONOMOUS ENGINE UNIT TESTS
// ==========================================
console.log("\nExecuting Autonomous Engine (Option A) unit tests...");

// Test 1: Topic memory operations (record & retrieve)
sandbox.recordTopicHistory("AME_BAZAAR", "Winter Kurta Collection 2026");
sandbox.recordTopicHistory("AME_BAZAAR", "Tailoring Guide for Suits");
const ameTopics = sandbox.getRecentTopics("AME_BAZAAR");
assert("Topic memory records and retrieves recent topics", ameTopics.length >= 2 && ameTopics[0] === "Tailoring Guide for Suits");

// Test 2: Topic memory limit capping at 15
for (let t = 1; t <= 20; t++) {
  sandbox.recordTopicHistory("TEST_BIZ", `Topic ${t}`);
}
const cappedTopics = sandbox.getRecentTopics("TEST_BIZ");
assert("Topic memory caps at 15 items", cappedTopics.length === 15 && cappedTopics[0] === "Topic 20");

// Test 3: Gemini response generation & clean JSON parsing
mockProperties['GEMINI_API_KEY'] = 'mock_gemini_api_key_xyz';
const genAmeResult = sandbox.generateGmbPostWithGemini("AME_BAZAAR");
assert("generateGmbPostWithGemini produces valid post for AME_BAZAAR", genAmeResult.success === true && genAmeResult.summary.length > 20);

const genCounselResult = sandbox.generateGmbPostWithGemini("MAHESHWARI_COUNSEL");
assert("generateGmbPostWithGemini produces valid post for MAHESHWARI_COUNSEL", genCounselResult.success === true && genCounselResult.topic_title.length > 0);

// Test 4: Missing GEMINI_API_KEY handling
const savedKey = mockProperties['GEMINI_API_KEY'];
delete mockProperties['GEMINI_API_KEY'];
const noKeyResult = sandbox.generateGmbPostWithGemini("AME_BAZAAR");
assert("generateGmbPostWithGemini aborts gracefully when API key is missing", noKeyResult.success === false && noKeyResult.error.includes("GEMINI_API_KEY"));
mockProperties['GEMINI_API_KEY'] = savedKey;

// Test 5: Image pool resolution
const imageAme = sandbox.resolveVerifiedImageForBusiness("AME_BAZAAR", 0);
assert("resolveVerifiedImageForBusiness resolves accessible image URL", typeof imageAme === 'string' && imageAme.startsWith("https://"));

// Test 6: Missing Image handling aborts scheduled post run
const origConfig = sandbox.BUSINESS_CONTENT_CONFIG['SIS'].images;
sandbox.BUSINESS_CONTENT_CONFIG['SIS'].images = [];
mockProperties['GMB_ROTATION_INDEX'] = '3'; // Point directly to SIS
const missingImageRun = sandbox.scheduledGmbPostRunner();
assert("scheduledGmbPostRunner aborts with IMAGE_MISSING when image pool is empty", missingImageRun.success === false && missingImageRun.error === "IMAGE_MISSING");
sandbox.BUSINESS_CONTENT_CONFIG['SIS'].images = origConfig; // Restore

// Test 7: 4-Business Round-Robin Rotation
mockProperties['GMB_ROTATION_INDEX'] = '0';
const run1 = sandbox.scheduledGmbPostRunner();
assert("scheduledGmbPostRunner executes Day 1: AME_BAZAAR", run1.success === true && run1.business === "AME_BAZAAR");
assert("Rotation index advances to 1", mockProperties['GMB_ROTATION_INDEX'] === '1');

const run2 = sandbox.scheduledGmbPostRunner();
assert("scheduledGmbPostRunner executes Day 2: MAHESHWARI_COUNSEL", run2.success === true && run2.business === "MAHESHWARI_COUNSEL");
assert("Rotation index advances to 2", mockProperties['GMB_ROTATION_INDEX'] === '2');

const run3 = sandbox.scheduledGmbPostRunner();
assert("scheduledGmbPostRunner executes Day 3: ADVAITH_EDUCATIONAL_CENTER", run3.success === true && run3.business === "ADVAITH_EDUCATIONAL_CENTER");
assert("Rotation index advances to 3", mockProperties['GMB_ROTATION_INDEX'] === '3');

const run4 = sandbox.scheduledGmbPostRunner();
assert("scheduledGmbPostRunner executes Day 4: SIS", run4.success === true && run4.business === "SIS");
assert("Rotation index rolls over to 0", mockProperties['GMB_ROTATION_INDEX'] === '0');

// Test 8: Trigger Management (clean setup and removal)
const triggerSetup = sandbox.setupGmbDailyTrigger();
assert("setupGmbDailyTrigger creates clean daily trigger", triggerSetup.success === true && triggerSetup.triggerId.length > 0);
const triggersRemoved = sandbox.removeGmbTriggers();
assert("removeGmbTriggers cleans up existing triggers", triggersRemoved === 1);

console.log(`\n=== NODE.JS UNIT TESTS: ${testPassed} PASSED, ${testFailed} FAILED ===`);
if (testFailed > 0 || internalResult.failed > 0) {
  console.log("FAILING BUILD: Tests failed.");
  process.exit(1);
} else {
  console.log("SUCCESSFUL BUILD: All test assertions passed!");
  process.exit(0);
}

