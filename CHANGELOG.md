# Changelog

All notable changes to the GMB Post Automation system will be documented in this file.

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
