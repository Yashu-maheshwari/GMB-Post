# PRODUCT DISCOVERY ARCHITECTURE (POS/WooCommerce)

## Overview
This architecture defines how live inventory data from AME Bazaar's POS/WooCommerce system will flow into Google Business Profile Posts.

## Proposed Data Flow
1. **Inventory Trigger:** WooCommerce webhook or scheduled cron checks for "New Arrivals" or "Restocked" items.
2. **Adapter Layer:** A mapping function extracts `ProductName`, `Category`, `Price`, and `ImageURL`.
3. **Entity Brain Sync:** The data is pushed to `EntityBrain.js` memory or a Google Sheet cache.
4. **Post Generation:** When a `product_highlight` pillar is selected, the script pulls from the cache rather than generic stock images.

## Guardrails
- If no credentials exist, the system logs `NOT_CONFIGURED` and skips product highlights.
- No fabricated prices or product names are allowed.

*Status: Endpoints and credentials NOT_CONFIGURED. Architecture defined.*
