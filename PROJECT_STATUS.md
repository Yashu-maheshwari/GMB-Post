# Project Status: GMB Post Automation

Current status of implementation, verified features, pending items, and test status.

---

## 1. Current Implementation Status
* **State**: Ready for Web App deployment and integration testing.
* **Script ID**: `1nZ2hGRj_iWKgmpxYBMqBZBF39dYeZ-TgOOjFvWfcz6XryQQJpa1KdSfy`
* **TEST_MODE**: Enforced as `true` in code configuration by default to protect live profiles.
* **Codebase**: `google-apps-script/Code.js` contains the complete multi-business validation and routing engine.

---

## 2. Completed Features
- [x] **Multi-GMB Routing Engine**: Programmatically targets four separate verified Google Business Profiles (`AME_BAZAAR`, `MAHESHWARI_COUNSEL`, `ADVAITH_EDUCATIONAL_CENTER`, `SIS`) based on payload key mapping.
- [x] **Business-Specific Hard Validation Gates**:
  - `AME_BAZAAR`: Hinglish, promotional claims filter (cheapest/lowest prices), length/word counts.
  - `MAHESHWARI_COUNSEL`: Professional English, strict solicitation and win-rate claims checks.
  - `ADVAITH_EDUCATIONAL_CENTER`: Educational content validation (blocking unverified academic/ranking claims).
  - `SIS`: School-focused validation (blocking unverified board affiliation/academic results claims).
- [x] **Mandatory Request ID**: Rejects any request missing `request_id`.
- [x] **Header Authentication**: Security enforced via HTTP Header `X-SPARK-SECRET`.
- [x] **Duplicate Protection**: Combined `request_id` + MD5 `contentHash` tracking check to lock duplicate processing.
- [x] **Image Pre-checks**: Automated public image accessibility pre-checks verifying HTTP status and Content-Type.
- [x] **Cloudinary Uploader**: Uploads incoming images directly to Cloudinary if credentials exist, falling back to Google Drive share links.
- [x] **Post Verification**: Validates returned post name schema, summary parity, media structure, and checks if post state is `LIVE` or `ACTIVE`.
- [x] **GAS Manifest**: Configured minimal required OAuth scopes (`external_request` only).
- [x] **Real Test Executions**: Node.js simulated VM runner (`tests/test_runner.js`) executes 13 unit tests verifying multi-business validation constraints, duplicate checking, and webhook doPost simulations.

---

## 3. Test Status
* **Local Node.js Test Runner**: 5/5 simulated doPost tests passed.
* **Internal GAS Suite**: 8/8 validation and accessibility assertions passed.
* **Total Assertions**: 13/13 passed.

---

## 4. Pending Work
* Deployment of Script ID `1nZ2hGRj_iWKgmpxYBMqBZBF39dYeZ-TgOOjFvWfcz6XryQQJpa1KdSfy` as a Google Apps Script Web App.
* Setting required Script Properties in the Apps Script console.
* Configuring Spark webhook target URL.

---

## 5. Exact Next Recommended Task
1. Open the [Apps Script project editor](https://script.google.com/d/1nZ2hGRj_iWKgmpxYBMqBZBF39dYeZ-TgOOjFvWfcz6XryQQJpa1KdSfy/edit).
2. Click **Deploy** -> **New deployment**. Select **Web app**.
3. Set **Execute as:** "Me", **Who has access:** "Anyone".
4. Copy the resulting **Web App URL** to connect to Spark.
5. Set Script Properties in settings (refer to `.env.example`).
