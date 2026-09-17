/**
 * AME_BAZAAR_ENTITY - Single Source of Truth
 */
var AME_BAZAAR_ENTITY = {
  official_name: "AME Bazaar - Family Garment Store",
  category: "Clothing store",
  address: "Mubarakpur Road, Kirari, Suleman Nagar, Nangloi, Delhi - 110086",
  phone: "NOT_VERIFIED",
  website: "https://www.amebazaar.in/",
  hours: "NOT_VERIFIED",
  products: ["Ethnic Wear", "Kids Wear", "Men's Fashion", "Women's Fashion", "Winter Wear", "Festive Clothing", "Sarees", "Kurtas"],
  services: ["Custom Tailoring", "Fitting Alterations", "In-store shopping", "Delivery"],
  audience: ["Families", "Parents", "Men", "Women", "Kids"],
  local_area: ["Kirari", "Suleman Nagar", "Nangloi", "Mubarakpur Road", "North-West Delhi"],
  social_profiles: ["Facebook", "Instagram"],
  factual_business_description: "AME Bazaar is a family garment store located on Mubarakpur Road in Kirari, Delhi. We specialize in ethnic wear, kids' clothing, and everyday fashion for men and women. Our store offers in-house custom tailoring and fitting alterations.",
  verified_attributes: ["In-store shopping", "Delivery", "Tailoring services"],
  last_verified: new Date().toISOString()
};

var WEBSITE_ENTITY_CONNECTION = {
  "family_garment_shopping": "https://www.amebazaar.in/",
  "mens_clothing": "https://www.amebazaar.in/",
  "womens_clothing": "https://www.amebazaar.in/",
  "kids_wear": "https://www.amebazaar.in/",
  "ethnic_wear": "https://www.amebazaar.in/",
  "wedding_shopping": "https://www.amebazaar.in/",
  "festive_shopping": "https://www.amebazaar.in/",
  "seasonal_clothing": "https://www.amebazaar.in/",
  "tailoring_stitching": "https://www.amebazaar.in/",
  "family_shopping": "https://www.amebazaar.in/",
  "clothing_guidance": "https://www.amebazaar.in/",
  "fabric_education": "https://www.amebazaar.in/",
  "local_shopping": "https://www.amebazaar.in/",
  "product_discovery": "https://www.amebazaar.in/",
  "customer_faqs": "https://www.amebazaar.in/"
};

// 15 Pillars for AME BAZAAR
var GMB_CONTENT_PILLARS_AME = [
  { id: "family_garment_shopping", name: "Family garment shopping", imageFamily: "family_shopping", angle: "Convenience of shopping for the entire family in one place." },
  { id: "mens_clothing", name: "Men's clothing", imageFamily: "mens_fashion", angle: "Versatile and durable menswear for everyday and special occasions." },
  { id: "womens_clothing", name: "Women's clothing", imageFamily: "womens_fashion", angle: "Latest trends and comfortable womenswear." },
  { id: "kids_wear", name: "Kids wear", imageFamily: "kids_wear", angle: "Comfortable, trendy, and durable clothing for children." },
  { id: "ethnic_wear", name: "Ethnic wear", imageFamily: "ethnic_festive", angle: "Traditional attire, sarees, and kurtas for cultural events." },
  { id: "wedding_shopping", name: "Wedding shopping", imageFamily: "wedding", angle: "Outfits for wedding ceremonies and related functions." },
  { id: "festive_shopping", name: "Festive shopping", imageFamily: "ethnic_festive", angle: "Special collections for upcoming festivals." },
  { id: "seasonal_clothing", name: "Seasonal clothing", imageFamily: "seasonal_wardrobe", angle: "Weather-appropriate clothing, fabrics for summer or winter." },
  { id: "tailoring_stitching", name: "Tailoring/custom stitching", imageFamily: "tailoring", angle: "In-house custom tailoring and precise fitting alterations." },
  { id: "family_shopping", name: "Family shopping", imageFamily: "family_shopping", angle: "Creating a great family shopping experience." },
  { id: "clothing_guidance", name: "Clothing selection guidance", imageFamily: "family_shopping", angle: "Tips on choosing the right outfits for different body types and events." },
  { id: "fabric_education", name: "Fabric/fit/care education", imageFamily: "seasonal_wardrobe", angle: "How to care for garments, fabric quality, and ensuring longevity." },
  { id: "local_shopping", name: "Local shopping intent", imageFamily: "local_shopping", angle: "Supporting local Kirari business and convenience." },
  { id: "product_discovery", name: "Product discovery", imageFamily: "local_shopping", angle: "Highlighting new arrivals and specific product types in-store." },
  { id: "customer_faqs", name: "Customer FAQs", imageFamily: "local_shopping", angle: "Answering common questions about store hours, location, and services." }
];
