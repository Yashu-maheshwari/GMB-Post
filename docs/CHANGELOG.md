# CHANGELOG

## [Unreleased]
### Added
- `EntityBrain.js`: Centralized factual entity definitions, website mapping (`https://www.amebazaar.in/`), and GMB content pillar configurations.
- `LOCAL_DISCOVERY_SIGNAL_ENGINE.md`: Architecture doc for discovery signals.
- `PRODUCT_DISCOVERY_ARCHITECTURE.md`: Architecture doc for POS/WooCommerce.
- Added structured JSON prompt requirements to `generateGmbPostWithGemini`.
- Added CTA/Hook diversity tracking in `recordContentPattern`.

### Changed
- `Code.js`: Restructured `BUSINESS_CONTENT_CONFIG` to hydrate dynamically from `EntityBrain.js`.
- `Code.js`: Modified `resolveVerifiedImageForBusiness` to resolve pools dynamically from `pillar.imageFamily` and return strict `null` upon exhaustion instead of an unrelated fallback.
- `test_runner.js`: Rewrote Gemini mock parsing to support new structured JSON. Added stricter assertions for fallback logic.

### Fixed
- Fixed endless image fallback looping by enforcing a strict `IMAGE_POOL_EXHAUSTED` state.
