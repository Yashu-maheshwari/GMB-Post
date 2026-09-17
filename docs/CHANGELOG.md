# CHANGELOG

## [Unreleased]
### Added
- Added robust Gemini transient failure retry logic (HTTP 429, 500, 502, 503, 504) with max 3 attempts and exponential backoff.
- Added comprehensive unit tests in `test_runner.js` to validate Gemini retry behaviors and ensure graceful aborts on non-transient errors (400, 404, schema failures).

### Changed
- Migrated LLM API integration from `gemini-3.6-flash` (`v1beta`) to `gemini-3.8-flash` (`v1`).
- Modified `Code.js` to automatically override legacy `gemini-3.6-flash` configurations.
- Removed legacy `temperature` parameter from Gemini `generationConfig` to comply with new constraints.
- Optimized token usage by continuing standard structured JSON generation without forcing higher-tier `thinking_level` processing for daily posts.
