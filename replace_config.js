const fs = require('fs');
let code = fs.readFileSync('google-apps-script/Code.js', 'utf8');

code = code.replace(
  /images:\s*\[[\s\S]*?\]/g,
  function(match) {
    if (match.includes('1610030469983')) {
      return `imagePool: {
      "ethnic_festive": [
        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1583391733958-d15014251d20?w=800&auto=format&fit=crop&q=80"
      ],
      "seasonal_wardrobe": [
        "https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1434389678059-3a3233852233?w=800&auto=format&fit=crop&q=80"
      ],
      "custom_tailoring": [
        "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&auto=format&fit=crop&q=80"
      ],
      "kids_mens_wear": [
        "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=800&auto=format&fit=crop&q=80"
      ],
      "local_shopping": [
        "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?w=800&auto=format&fit=crop&q=80"
      ]
    }`;
    } else if (match.includes('1589829545856')) {
      return `imagePool: {
      "property_registry": ["https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?w=800&auto=format&fit=crop&q=80"],
      "civil_remedies": ["https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&auto=format&fit=crop&q=80"],
      "succession_wills": ["https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=800&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?w=800&auto=format&fit=crop&q=80"],
      "consumer_rights": ["https://images.unsplash.com/photo-1589391886645-d51941baf7fb?w=800&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1593115057322-e94b77572f20?w=800&auto=format&fit=crop&q=80"],
      "commercial_agreements": ["https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1556157382-97eda2d62296?w=800&auto=format&fit=crop&q=80"]
    }`;
    } else if (match.includes('1434030216411')) {
      return `imagePool: {
      "study_habits": ["https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?w=800&auto=format&fit=crop&q=80"],
      "conceptual_learning": ["https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1503694978374-8a2fb5206f0d?w=800&auto=format&fit=crop&q=80"],
      "exam_readiness": ["https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=800&auto=format&fit=crop&q=80"],
      "parent_support": ["https://images.unsplash.com/photo-1484807352052-23338990c6c6?w=800&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80"],
      "analytical_thinking": ["https://images.unsplash.com/photo-1513258496099-48168024aec0?w=800&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&auto=format&fit=crop&q=80"]
    }`;
    } else if (match.includes('1580582932707')) {
      return `imagePool: {
      "foundational_literacy": ["https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80"],
      "holistic_growth": ["https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80"],
      "digital_balance": ["https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&auto=format&fit=crop&q=80"],
      "experiential_science": ["https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1564473636184-7a0928e3da06?w=800&auto=format&fit=crop&q=80"],
      "family_collaboration": ["https://images.unsplash.com/photo-1529390079861-591de354faf5?w=800&auto=format&fit=crop&q=80", "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&auto=format&fit=crop&q=80"]
    }`;
    }
    return match;
  }
);
fs.writeFileSync('google-apps-script/Code.js', code);
console.log('Replaced images with imagePool');
