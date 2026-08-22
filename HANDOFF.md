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

## 3. How to Continue Development

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

### Execution Flow for Future Updates
Before beginning the next development task:
1. Read `README.md` to understand system topology.
2. Read `PROJECT_STATUS.md` to identify pending items.
3. Check test suite status by running `node tests/test_runner.js`.
4. Implement requested modifications inside `google-apps-script/Code.js`.
5. Write corresponding unit tests in `tests/test_runner.js` and verify execution.
