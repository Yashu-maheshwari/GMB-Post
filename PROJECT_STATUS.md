# Project Status: Multi-Business GMB Post Automation Engine

Current implementation, verified live publication, test status, scheduler setup, and operational state.

---

## 1. Current Implementation Status
* **State**: **PRODUCTION VERIFIED & ACTIVE**
* **Script ID**: `1nZ2hGRj_iWKgmpxYBMqBZBF39dYeZ-TgOOjFvWfcz6XryQQJpa1KdSfy`
* **Autonomous Engine**: Option A (Self-contained Google Apps Script time-driven triggers calling Gemini 3.6 Flash REST API directly).
* **TEST_MODE**: Configured as `true` by default for safety; controlled live publishing verified on Google Business Profile.
* **Codebase**: `google-apps-script/Code.js` contains the complete autonomous 4-business generation, validation, image pipeline, scheduling, and verification engine.

---

## 2. Completed & Verified Features
- [x] **4 Verified Production GBP Targets**:
  - `AME_BAZAAR` (Account: `107856377351216824945`, Location: `16134813121256220692`)
  - `MAHESHWARI_COUNSEL` (Account: `107856377351216824945`, Location: `1571247269233718336`)
  - `ADVAITH_EDUCATIONAL_CENTER` (Account: `107856377351216824945`, Location: `12195894669850420443`)
  - `SIS` (Account: `107856377351216824945`, Location: `4069269303360601513`)
- [x] **Google AI Gemini 3.6 Flash Integration**: REST API integration with structured JSON output, SEO/AEO/GEO local prompts, and negative topic avoidance.
- [x] **Live GBP Publication Verified**:
  - Successfully published AME Bazaar live update to GBP (`post_id: 5833101605553214427`, state: `LIVE`).
  - Google hosted media verified: `https://lh3.googleusercontent.com/p/AF1QipMXob7BegypTECfzLTTyL0Gn5ZjmN7rcS0Vy_iu`.
- [x] **4 Independent Daily Scheduled Executions**:
  - `09:00 AM IST`: `scheduledGmbPostAME()` → `AME_BAZAAR`
  - `11:00 AM IST`: `scheduledGmbPostCounsel()` → `MAHESHWARI_COUNSEL`
  - `01:00 PM IST`: `scheduledGmbPostAdvaith()` → `ADVAITH_EDUCATIONAL_CENTER`
  - `03:00 PM IST`: `scheduledGmbPostSIS()` → `SIS`
- [x] **Clean Trigger Setup & Removal**:
  - `setupGmbDailyTriggers()`: Replaces existing triggers with exactly 4 daily triggers.
  - `removeGmbDailyTriggers()`: Safely deletes all project triggers.
- [x] **Topic Memory & Anti-Repetition**: Tracks last 15 topics in `GMB_TOPICS_<BUSINESS_KEY>` with 5 content pillars per business.
- [x] **Permanent Image Pipeline**: Curated HTTPS image pools + Cloudinary fallback + pre-publish accessibility check (`HTTP 200` + MIME `image/*`) + `IMAGE_MISSING` abort guard.
- [x] **Business Policy & Safety Gates**: Custom validation blocking unverified promotional pricing (AME), solicitation/win guarantees (Counsel), unverified academic rankings (Advaith), and fabricated board affiliations (SIS).
- [x] **Duplicate Protection**: Combined `request_id` tracking + MD5 content hash (`computeHash`).
- [x] **Live Webhook Endpoint (`doPost`)**: Preserved for external ad-hoc posts authenticated via `X-SPARK-SECRET`.

---

## 3. Test Status
* **Local Test Suite (`node tests/test_runner.js`)**: **20/20 PASS**
  - `8/8` internal GAS validation & format assertions.
  - `12/12` Node.js test assertions (validating all 4 dedicated functions, 4-trigger setup schedule mapping, re-run duplicate prevention, and trigger cleanup).

---

## 4. Operational Instructions
1. Open the [Google Apps Script Project Editor](https://script.google.com/d/1nZ2hGRj_iWKgmpxYBMqBZBF39dYeZ-TgOOjFvWfcz6XryQQJpa1KdSfy/edit).
2. To install or refresh the 4 daily triggers: Run `setupGmbDailyTriggers()`.
3. To test a single business safely in `TEST_MODE`: Run `scheduledGmbPostAME()`, `scheduledGmbPostCounsel()`, `scheduledGmbPostAdvaith()`, or `scheduledGmbPostSIS()`.
4. To view execution logs: Check **Executions** tab in Google Apps Script.

