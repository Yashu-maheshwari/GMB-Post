# LOCAL DISCOVERY SIGNAL ENGINE

## Overview
This architecture outlines how the AME Bazaar Google Business Profile connects to local discovery signals in Google Maps and nearby search.

## Signal Generation
1. **AEO/GEO Content Output:** The Gemini prompt requires \`search_intent\`, \`local_intent\`, and \`audience\` mapping for every generated post.
2. **Location Entity Binding:** Real-world entities (Kirari Suleman Nagar, Nangloi, Mubarakpur Road) are explicitly bound to the entity profile and used to ground generated content.
3. **Behavioral Reinforcement:** Consistent, non-duplicated output covering multiple pillars (ethnic, kids, tailoring) creates a robust local entity graph for AME Bazaar.

## Future Signals
- Automated Review parsing to extract user-generated keywords.
- Maps API integration to track foot-traffic correlates (if configured).

*Status: Architecture defined. Execution endpoints NOT_CONFIGURED.*
