const fs = require('fs');
let code = fs.readFileSync('google-apps-script/Code.js', 'utf8');

// 1. Update AME_BAZAAR config in Code.js
const oldAmeConfigRegex = /"AME_BAZAAR":\s*\{\s*name: "AME Bazaar - Family Garment Store",[\s\S]*?guidelines: "Write in warm, helpful Hinglish[\s\S]*?"\s*\},\s*"MAHESHWARI_COUNSEL"/;

const newAmeConfig = `"AME_BAZAAR": {
    name: typeof AME_BAZAAR_ENTITY !== 'undefined' ? AME_BAZAAR_ENTITY.official_name : "AME Bazaar - Family Garment Store",
    locationEntities: typeof AME_BAZAAR_ENTITY !== 'undefined' ? AME_BAZAAR_ENTITY.local_area.join(", ") : "Mubarakpur Road, Kirari Suleman Nagar, Nangloi, Delhi",
    ctaUrl: "https://www.amebazaar.in/",
    pillars: typeof GMB_CONTENT_PILLARS_AME !== 'undefined' ? GMB_CONTENT_PILLARS_AME : [],
    imagePool: {
      "ethnic_festive": [
        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1583391733958-d15014251d20?w=800&auto=format&fit=crop&q=80"
      ],
      "wedding": [
        "https://images.unsplash.com/photo-1583391733958-d15014251d20?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop&q=80"
      ],
      "womens_fashion": [
        "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&auto=format&fit=crop&q=80"
      ],
      "mens_fashion": [
        "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=800&auto=format&fit=crop&q=80"
      ],
      "kids_wear": [
        "https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=800&auto=format&fit=crop&q=80"
      ],
      "family_shopping": [
        "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&auto=format&fit=crop&q=80"
      ],
      "tailoring": [
        "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&auto=format&fit=crop&q=80"
      ],
      "seasonal_wardrobe": [
        "https://images.unsplash.com/photo-1434389678059-3a3233852233?w=800&auto=format&fit=crop&q=80"
      ],
      "local_shopping": [
        "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=800&auto=format&fit=crop&q=80"
      ]
    },
    guidelines: "Write in warm, helpful conversational English/Hinglish. Answer the user's question clearly. Do NOT keyword stuff. Do not use words 'cheapest', 'lowest price', 'guaranteed cheapest'. Never mention persona 'Sam'. Only state factual information from the entity definition."
  },
  "MAHESHWARI_COUNSEL"`;

code = code.replace(oldAmeConfigRegex, newAmeConfig);

fs.writeFileSync('google-apps-script/Code.js', code);
console.log('Updated AME_BAZAAR config');
