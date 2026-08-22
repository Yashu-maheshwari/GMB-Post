# Changelog

All notable changes to the GMB Post Automation system will be documented in this file.

---

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
