# Project Handoff: GMB Post Automation

Welcome to GMB Post Automation! This document explains the codebase, testing environment, deployment layout, and exactly how to resume work.

---

## 1. Project Overview
This project is a Google Apps Script Web App that receives post updates from the Spark platform and publishes them to AME Bazaar's Google Business Profile (GBP).

The core entry point is `google-apps-script/Code.js` which contains the `doPost` webhook endpoint.

---

## 2. Key Directories
* `/google-apps-script`: Google Apps Script source files.
  * `Code.js`: Main execution logic, authentication checks, validation gates, Cloudinary/Drive selection, and GMB publishing hooks.
  * `appsscript.json`: Manifest configuration.
* `/tests`: Node.js tests.
  * `test_runner.js`: Simulated environment wrapping Apps Script code and executing unit checks in Node.js.
* `/scripts`: Python or Node CLI tools for auth setup.
  * `gmb_auth.js`: Script to generate OAuth access tokens.
  * `test_gbp_publish.js`: Direct node tests for GMB publishing.

---

## 3. Connected Apps Script Project
* **Script ID**: `1nZ2hGRj_iWKgmpxYBMqBZBF39dYeZ-TgOOjFvWfcz6XryQQJpa1KdSfy`
* **Local config**: Managed via `.clasp.json` (pointing to `/google-apps-script` as the root directory).

---

## 4. Multi-Business Routing Logic
The script dynamically routes requests to the correct Google Business Profile using the `business` or `business_key` payload parameter:
1. `AME_BAZAAR`
2. `MAHESHWARI_COUNSEL`
3. `ADVAITH_EDUCATIONAL_CENTER`
4. `SIS`

Script properties must be configured for each business key (e.g. `GOOGLE_GBP_ACCOUNT_ID_SIS` and `GOOGLE_GBP_LOCATION_ID_SIS`), falling back to default script properties if not present.

---

## 5. How to Continue Development

### Pre-requisites
1. Node.js (v18+)
2. Clasp CLI (if deploying directly to Apps Script via terminal)

### Local Development Loop
To test modifications without deploying to Google:
1. Edit code inside `google-apps-script/Code.js`.
2. Run `node tests/test_runner.js` to execute unit tests. Ensure output exits with code `0`.

### Deploying Changes
If you need to update the Google Apps Script project:
1. Make sure `.clasp.json` contains your target Apps Script `scriptId`.
2. Deploy changes via clasp:
   ```bash
   clasp push
   ```
