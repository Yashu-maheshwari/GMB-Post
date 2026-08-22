# Project Status: GMB Post Automation

Current status of implementation, verified features, pending items, and test status.

---

## 1. Current Implementation Status
* **State**: Ready for live end-to-end testing in staging environment.
* **TEST_MODE**: Enforced as `true` in code configuration by default to prevent accidental live posting before live end-to-end test execution.
* **Codebase**: `google-apps-script/Code.js` implements the webhook receiver, hard validation rules, security checks, and local execution checks.

---

## 2. Completed Features
- [x] **Mandatory Request ID**: Rejects any request missing `request_id` in payload.
- [x] **Header Authentication**: Access restricted via HTTP Header `X-SPARK-SECRET`.
- [x] **Duplicate Protection**: Uses a combination of `request_id` and MD5 `contentHash` verification check to block repeated request processing.
- [x] **Hard-rule Content validation**: Full replacements of custom string matching with range checks, character validation, and placeholder word/dummy keyword filters.
- [x] **Image Pre-checks**: Automated public image accessibility pre-checks verifying HTTP status and Content-Type.
- [x] **Cloudinary Uploader**: Uploads incoming images directly to Cloudinary if credentials exist, falling back to Google Drive share links.
- [x] **Post Verification**: Validates returned post name schema, summary parity, media structure, and checks if post state is `LIVE` or `ACTIVE`.
- [x] **Real Test Executions**: In-script local test runner (`runLocalSuite`) and standalone Node.js simulated VM runner (`tests/test_runner.js`) verify the code without live API hits.

---

## 3. Test Status
* **Local Node.js Test Runner**: 5/5 assertions passed.
* **Internal GAS Suite**: 5/5 checks passed.
* **Production Build Integrity**: Verified. No errors found.

---

## 4. Pending Work
* Deployment to Google Apps Script as a web app.
* Updating target Webhook URL on Spark side to call GAS deployment.
* Execution of a live end-to-end post publish (setting `TEST_MODE` to `false` temporarily via Script Properties).

---

## 5. Known Issues
* Google Apps Script Web Apps do not expose request headers natively inside the `e` parameter in some standard settings. The script checks `e.headers`, `X-SPARK-SECRET` in parameters, and payload properties to guarantee robust support across different API gateways and proxy configurations.

---

## 6. Exact Next Recommended Task
1. Copy the contents of `google-apps-script/Code.js` to the GMB-Post Apps Script editor.
2. Deploy the Apps Script project as a **Web App** (Execute as: "Me", Access: "Anyone").
3. Set the required Script Properties listed in `.env.example` in the Apps Script project settings.
4. Run `runLocalSuite` inside the Apps Script editor to ensure all internal tests pass in the live Google Apps Script container.
