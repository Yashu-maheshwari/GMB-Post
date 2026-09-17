# CHANGELOG

## [Unreleased]
### Changed
- Migrated LLM API integration from `gemini-3.6-flash` (`v1beta`) to `gemini-3.8-flash` (`v1`).
- Modified `Code.js` to automatically override legacy `gemini-3.6-flash` configurations.
- Removed legacy `temperature` parameter from Gemini `generationConfig` to comply with new constraints.
- Optimized token usage by continuing standard structured JSON generation without forcing higher-tier `thinking_level` processing for daily posts.
