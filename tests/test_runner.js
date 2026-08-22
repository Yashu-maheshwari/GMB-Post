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

console.log(`\n=== NODE.JS UNIT TESTS: ${testPassed} PASSED, ${testFailed} FAILED ===`);
if (testFailed > 0 || internalResult.failed > 0) {
  console.log("FAILING BUILD: Tests failed.");
  process.exit(1);
} else {
  console.log("SUCCESSFUL BUILD: All test assertions passed!");
  process.exit(0);
}
