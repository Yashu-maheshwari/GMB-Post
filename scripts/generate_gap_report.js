const fs = require('fs');

const gapReport = {
  "AME_BAZAAR": {
    "status": "IMPLEMENTED",
    "details": "Canonical EntityBrain defined. AEO/GEO Gemini prompts with structured JSON output implemented. 15 pillars mapped to 9 image families. Duplicate protection and fallback logic in place.",
    "missing": []
  },
  "MAHESHWARI_COUNSEL": {
    "status": "NOT_CONFIGURED",
    "details": "Still using legacy configuration block in Code.js. Needs an EntityBrain definition and custom pillars.",
    "missing": ["Entity definition", "Image pools", "Custom pillars"]
  },
  "ADVAITH_EDUCATIONAL_CENTER": {
    "status": "NOT_CONFIGURED",
    "details": "Still using legacy configuration block in Code.js.",
    "missing": ["Entity definition", "Image pools", "Custom pillars"]
  },
  "SIS": {
    "status": "NOT_CONFIGURED",
    "details": "Still using legacy configuration block in Code.js.",
    "missing": ["Entity definition", "Image pools", "Custom pillars"]
  },
  "POS_INTEGRATION": {
    "status": "NOT_CONFIGURED",
    "details": "Architecture designed. Awaiting API credentials for WooCommerce / POS system.",
    "missing": ["Credentials", "Live endpoints"]
  }
};

fs.writeFileSync('gap_report.json', JSON.stringify(gapReport, null, 2));
console.log("gap_report.json generated.");

const mdReport = `# GMB Engine Gap Report

## AME_BAZAAR
- **Status**: IMPLEMENTED
- **Details**: Canonical EntityBrain defined. AEO/GEO Gemini prompts with structured JSON output implemented. 15 pillars mapped to 9 image families. Duplicate protection and fallback logic in place.

## MAHESHWARI_COUNSEL
- **Status**: NOT_CONFIGURED
- **Missing**: Entity definition, Image pools, Custom pillars

## ADVAITH_EDUCATIONAL_CENTER
- **Status**: NOT_CONFIGURED
- **Missing**: Entity definition, Image pools, Custom pillars

## SIS
- **Status**: NOT_CONFIGURED
- **Missing**: Entity definition, Image pools, Custom pillars

## POS_INTEGRATION
- **Status**: NOT_CONFIGURED
- **Missing**: Credentials, Live endpoints
`;

fs.writeFileSync('gap_report.md', mdReport);
console.log("gap_report.md generated.");

