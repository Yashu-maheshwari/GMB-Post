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

const sandbox = {
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (key) => mockProperties[key] || null,
      setProperty: (key, value) => {
        mockProperties[key] = String(value);
      }
    })
  },
  UrlFetchApp: {
    fetch: (url, options) => {
      console.log(`[Mock UrlFetchApp] Fetching: ${url}`);
      if (url.includes('cloudinary.com') && !url.includes('sample_cloudinary.jpg') && !url.includes('sample.jpg')) {
        return {
          getResponseCode: () => 200,
          getHeaders: () => ({ 'Content-Type': 'application/json' }),
          getContentText: () => JSON.stringify({ secure_url: 'https://res.cloudinary.com/demo/image/upload/sample_cloudinary.jpg' })
        };
      }
      if (url.includes('sample.jpg') || url.includes('sample_cloudinary.jpg')) {
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
      // Mock hash bytes returned by MD5 digest
      return Array.from(val).map(c => c.charCodeAt(0) % 127);
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

// doPost success simulation
const mockPostEvent = {
  postData: {
    contents: JSON.stringify({
      request_id: "req_xyz_998877",
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
assert("doPost handles valid authorization and payload", successData.verified === true);
assert("doPost returns post_id", !!successData.post_id);

// doPost bad authorization check
const badAuthEvent = {
  postData: mockPostEvent.postData,
  headers: { "X-SPARK-SECRET": "wrong_secret" },
  parameter: {}
};
const unauthorizedResponse = sandbox.doPost(badAuthEvent);
const unauthorizedData = JSON.parse(unauthorizedResponse.contents);
assert("doPost rejects unauthorized key with 401 status", unauthorizedData.verified === false && unauthorizedData.error.includes("Unauthorized"));

// doPost duplicate request check
const duplicateResponse = sandbox.doPost(mockPostEvent);
const duplicateData = JSON.parse(duplicateResponse.contents);
assert("doPost prevents duplicate requests with same request_id", duplicateData.verified === false && duplicateData.error.includes("Duplicate"));

// doPost validation failure check (banned word "Sam")
const bannedWordEvent = {
  postData: {
    contents: JSON.stringify({
      request_id: "req_new_123",
      summary: "Come meet Sam at AME Bazaar Kirari.",
      media_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    })
  },
  headers: mockPostEvent.headers,
  parameter: {}
};
const bannedResponse = sandbox.doPost(bannedWordEvent);
const bannedData = JSON.parse(bannedResponse.contents);
assert("doPost rejects validation matching banned word 'Sam'", bannedData.verified === false && bannedData.error.includes("banned"));

console.log(`\n=== NODE.JS UNIT TESTS: ${testPassed} PASSED, ${testFailed} FAILED ===`);
if (testFailed > 0 || internalResult.failed > 0) {
  console.log("FAILING BUILD: Tests failed.");
  process.exit(1);
} else {
  console.log("SUCCESSFUL BUILD: All test assertions passed!");
  process.exit(0);
}
