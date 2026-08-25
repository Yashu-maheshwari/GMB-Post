# Changelog

All notable changes to the Multi-Business GMB Post Automation system are documented in this file.

---

## [2.1.0] - 2026-08-25

### Added
- **4 Independent Daily Scheduled Post Executions**: Configured dedicated time-driven runners for each business:
  - `scheduledGmbPostAME()` (09:00 AM IST)
  - `scheduledGmbPostCounsel()` (11:00 AM IST)
  - `scheduledGmbPostAdvaith()` (01:00 PM IST)
  - `scheduledGmbPostSIS()` (03:00 PM IST)
- **Central Trigger Manager**: `setupGmbDailyTriggers()` installs exactly 4 clean daily triggers while preventing duplicate trigger accumulation; `removeGmbDailyTriggers()` handles safe cleanup.
- **Updated Test Runner**: Expanded unit assertions to 20/20 PASS covering dedicated trigger execution, schedule mapping, and duplicate trigger prevention.
- **Synchronized Manifest**: Added `https://www.googleapis.com/auth/script.scriptapp` OAuth scope in `appsscript.json`.

---

## [2.0.0] - 2026-08-25

### Added
- **Autonomous Scheduled Daily Engine (Option A)**: Implemented zero-cost self-contained daily posting pipeline without requiring continuous external server execution.
- **Gemini 3.6 Flash REST Integration**: Upgraded content generation engine to `gemini-3.6-flash` with structured JSON output, local SEO/AEO/GEO entity grounding, and negative topic avoidance.
- **Topic Memory System**: Implemented persistent memory tracking the last 15 topics in `GMB_TOPICS_<BUSINESS_KEY>` Script Properties with 5 distinct content pillars per business.
- **Permanent Verified Image Pools**: Curated verified HTTPS image pools per business category with automated accessibility pre-checks (`HTTP 200` + MIME `image/*`) and `IMAGE_MISSING` abort guard.
- **Live Production GBP Verification**: Successfully executed live controlled post for AME Bazaar (`post_id: 5833101605553214427`, Google hosted media, verified in state `LIVE`).

---

## [1.1.0] - 2026-08-22

### Added
- Integrated multi-GMB routing engine to target four distinct business profiles (`AME_BAZAAR`, `MAHESHWARI_COUNSEL`, `ADVAITH_EDUCATIONAL_CENTER`, `SIS`) using payload key mapping.
- Implemented business-specific validation checks (Hinglish/promotional filters for AME, solicitation filters for Counsel, academic claims filters for Advaith, and board results filters for SIS).
- Synchronized code changes to the correct dedicated GMB script container `1nZ2hGRj_iWKgmpxYBMqBZBF39dYeZ-TgOOjFvWfcz6XryQQJpa1KdSfy`.
- Expanded the local test runner coverage to 13 assertions covering the validation blocks for all four businesses.

## [1.0.0] - 2026-08-22

### Added
- Created the core Google Apps Script webhook integration endpoint (`doPost`).
- Implemented header-based authorization validating the `X-SPARK-SECRET` token.
- Added duplicate protection checks checking `request_id` values and MD5 content signatures.
- Replaced custom string matching checks with a structured hard-rule content validation system.
- Added public image accessibility verification pre-checks.
- Integrated Cloudinary upload helper, with fallback to Google Drive public link sharing.
- Added strict post-publication verification validating name structure, summary, media, and status state.
- Created `tests/test_runner.js` to execute unit tests on local Node.js environment.
