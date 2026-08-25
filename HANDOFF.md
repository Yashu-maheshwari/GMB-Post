# Project Handoff: Multi-Business GMB Post Automation

Welcome to the **Multi-Business Google Business Profile (GMB) Automation Engine**! This document explains the complete codebase, operational architecture, testing environment, deployment setup, and how to maintain and enhance this system.

---

## 1. Executive Summary

This system manages daily automated, authentic, localized posting for **4 verified Google Business Profiles**:
1. **`AME_BAZAAR`** (Family Garment Store) — `107856377351216824945` / `16134813121256220692`
2. **`MAHESHWARI_COUNSEL`** (Advocates & Legal Consultants) — `107856377351216824945` / `1571247269233718336`
3. **`ADVAITH_EDUCATIONAL_CENTER`** (Educational Coaching) — `107856377351216824945` / `12195894669850420443`
4. **`SIS`** (Saraswati International School) — `107856377351216824945` / `4069269303360601513`

The engine is **100% self-contained** within Google Apps Script (Option A), using native daily time-driven triggers and direct Google AI REST API calls to **Gemini 3.6 Flash**. It requires zero 24/7 external server hosting and incurs zero API costs.

---

## 2. Directory Structure

* **`/google-apps-script`**:
  * **`Code.js`**: Complete production engine containing:
    - Webhook endpoint (`doPost`)
    - Content generation engine (`generateGmbPostWithGemini`)
    - Hard policy validation gates (`validateContent`)
    - Permanent image resolution & accessibility pre-checks (`resolveVerifiedImageForBusiness`, `testImageAccessibility`)
    - Duplicate request ID & MD5 content hash prevention (`isDuplicate`, `computeHash`, `recordProcessedRequest`)
    - Topic memory management (`recordTopicHistory`, `getRecentTopics`)
    - GBP API localPosts publisher (`publishToGbp`) & post verification (`verifyGbpPost`)
    - 4 Dedicated daily scheduled triggers (`scheduledGmbPostAME`, `scheduledGmbPostCounsel`, `scheduledGmbPostAdvaith`, `scheduledGmbPostSIS`)
    - Trigger setup & cleanup (`setupGmbDailyTriggers`, `removeGmbDailyTriggers`)
    - Discovery engine (`runGbpDiscovery`) & single controlled live tester (`runOneControlledLiveAmePost`)
  * **`appsscript.json`**: Manifest declaring timezone (`Asia/Kolkata`), V8 runtime, and OAuth scopes (`external_request`, `scriptapp`).
* **`/tests`**:
  * **`test_runner.js`**: Node.js simulation suite validating all 20 internal and unit assertions without calling external APIs.
* **`/.clasp.json`**: Clasp project configuration mapping local `/google-apps-script` to Script ID `1nZ2hGRj_iWKgmpxYBMqBZBF39dYeZ-TgOOjFvWfcz6XryQQJpa1KdSfy`.

---

## 3. Daily Execution Schedule

| Time (IST) | Trigger Handler | Target Business | Focus Pillars |
|---|---|---|---|
| **09:00 AM** | `scheduledGmbPostAME()` | `AME_BAZAAR` | Ethnic wear, seasonal fabrics, custom tailoring, family outfits |
| **11:00 AM** | `scheduledGmbPostCounsel()` | `MAHESHWARI_COUNSEL` | Property due diligence, civil rights, wills, consumer FAQs |
| **01:00 PM** | `scheduledGmbPostAdvaith()` | `ADVAITH_EDUCATIONAL_CENTER` | Active study routines, STEM mastery, revision timelines, exam stress |
| **03:00 PM** | `scheduledGmbPostSIS()` | `SIS` | Early reading, holistic development, digital safety, project discovery |

---

## 4. Operational & Maintenance Workflows

### How to Run Local Tests
Always run the test suite before deploying any modifications:
```bash
node tests/test_runner.js
```
*Expected: 20/20 PASS.*

### How to Sync Code to Google Apps Script
Push local updates using clasp:
```bash
npx --prefix d:\Projects\Calling-ai-agent- clasp push -f
```

### How to Install or Refresh the 4 Daily Triggers
In the [Apps Script Editor](https://script.google.com/d/1nZ2hGRj_iWKgmpxYBMqBZBF39dYeZ-TgOOjFvWfcz6XryQQJpa1KdSfy/edit):
1. Select the function `setupGmbDailyTriggers` from the function dropdown.
2. Click **Run**.
3. It will remove any stale triggers and create exactly the 4 daily triggers.

### How to Test Safely
Keep `TEST_MODE=true` in Script Properties. All functions will execute full generation, validation, and image pre-checks, while safely mocking the GBP publish step.

---

## 5. Security & Safety Guardrails

1. **No Secrets in Git**: `GEMINI_API_KEY`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_GBP_REFRESH_TOKEN` must reside ONLY in Google Apps Script Private Script Properties.
2. **No Temporary Image Hosts**: Never use `catbox.moe`, `file://`, or temporary image uploaders. Use curated verified HTTPS image pools or Cloudinary.
3. **Strict Validation Gates**: Every post must pass `validateContent()` before `publishToGbp()` is ever called. A validation failure automatically aborts the run and logs the violation.
4. **Duplicate Protection**: Combining `request_id` tracking and MD5 content hashes (`computeHash`) permanently prevents identical or duplicate posts.

