// Educational information about planets and the sun
export const PLANET_INFO = {
  Sun: {
    name: "Sun",
    type: "Star",
    description: "The Sun is the star at the center of our Solar System. It's a nearly perfect sphere of hot plasma that generates energy through nuclear fusion.",
    facts: [
      "Diameter: ~1.39 million km (109 times Earth)",
      "Mass: 332,946 times Earth",
      "Surface Temperature: ~5,500°C",
      "Age: ~4.6 billion years",
      "Composition: 73% Hydrogen, 25% Helium"
    ],
    distance: "0 km (center of system)",
    orbitalPeriod: "N/A (center)",
    dayLength: "~25 days (rotation)",
    moons: 0,
    composition: [
      { id: "Hydrogen", label: "Hydrogen", value: 73.46, color: "#FFD700" },
      { id: "Helium", label: "Helium", value: 24.85, color: "#FFA500" },
      { id: "Other", label: "Other", value: 1.69, color: "#FF6B35" }
    ],
    coreComposition: [
      { id: "Hydrogen", label: "Hydrogen", value: 73.46, color: "#FFD700" },
      { id: "Helium", label: "Helium", value: 24.85, color: "#FFA500" },
      { id: "Other", label: "Other", value: 1.69, color: "#FF6B35" }
    ]
  },
  Mercury: {
    name: "Mercury",
    type: "Terrestrial Planet",
    description: "Mercury is the smallest planet in our solar system and the closest to the Sun. It has extreme temperature variations.",
    facts: [
      "Diameter: 4,880 km",
      "Distance from Sun: 57.9 million km",
      "Orbital Period: 88 Earth days",
      "Day Length: 59 Earth days",
      "Temperature: -173°C to 427°C",
      "No atmosphere or moons"
    ],
    distance: "57.9 million km",
    orbitalPeriod: "88 days",
    dayLength: "59 days",
    moons: 0,
    composition: [
      { id: "Iron", label: "Iron", value: 70.00, color: "#C9A961" },
      { id: "Oxygen", label: "Oxygen", value: 20.00, color: "#4A90E2" },
      { id: "Silicon", label: "Silicon", value: 6.00, color: "#7B68EE" },
      { id: "Other", label: "Other", value: 4.00, color: "#95A5A6" }
    ],
    coreComposition: [
      { id: "Iron", label: "Iron", value: 85.00, color: "#C9A961" },
      { id: "Nickel", label: "Nickel", value: 5.00, color: "#E6E6FA" },
      { id: "Sulfur", label: "Sulfur", value: 7.00, color: "#FFD700" },
      { id: "Other", label: "Other", value: 3.00, color: "#95A5A6" }
    ]
  },
  Venus: {
    name: "Venus",
    type: "Terrestrial Planet",
    description: "Venus is the hottest planet in our solar system due to its thick, toxic atmosphere. It rotates backwards compared to most planets.",
    facts: [
      "Diameter: 12,104 km",
      "Distance from Sun: 108.2 million km",
      "Orbital Period: 225 Earth days",
      "Day Length: 243 Earth days (longer than year!)",
      "Temperature: 462°C (hottest planet)",
      "Thick atmosphere of carbon dioxide"
    ],
    distance: "108.2 million km",
    orbitalPeriod: "225 days",
    dayLength: "243 days",
    moons: 0,
    composition: [
      { id: "CO2", label: "Carbon Dioxide", value: 96.5, color: "#8B4513" },
      { id: "Nitrogen", label: "Nitrogen", value: 3.5, color: "#4169E1" },
      { id: "Other", label: "Other", value: 0.1, color: "#708090" }
    ],
    coreComposition: [
      { id: "Iron", label: "Iron", value: 80.00, color: "#C9A961" },
      { id: "Nickel", label: "Nickel", value: 6.00, color: "#E6E6FA" },
      { id: "Silicon", label: "Silicon", value: 8.00, color: "#7B68EE" },
      { id: "Other", label: "Other", value: 6.00, color: "#95A5A6" }
    ]
  },
  Earth: {
    name: "Earth",
    type: "Terrestrial Planet",
    description: "Earth is the only known planet with life. It has liquid water, a protective atmosphere, and a magnetic field.",
    facts: [
      "Diameter: 12,742 km",
      "Distance from Sun: 149.6 million km (1 AU)",
      "Orbital Period: 365.25 days",
      "Day Length: 24 hours",
      "Temperature: -88°C to 58°C",
      "71% covered in water",
      "1 moon (Luna)"
    ],
    distance: "149.6 million km (1 AU)",
    orbitalPeriod: "365.25 days",
    dayLength: "24 hours",
    moons: 1,
    composition: [
      { id: "Nitrogen", label: "Nitrogen", value: 78.08, color: "#4169E1" },
      { id: "Oxygen", label: "Oxygen", value: 20.95, color: "#4A90E2" },
      { id: "Argon", label: "Argon", value: 0.93, color: "#9370DB" },
      { id: "CO2", label: "Carbon Dioxide", value: 0.04, color: "#8B4513" },
      { id: "Other", label: "Other", value: 0.00, color: "#708090" }
    ],
    coreComposition: [
      { id: "Iron", label: "Iron", value: 85.00, color: "#C9A961" },
      { id: "Nickel", label: "Nickel", value: 5.20, color: "#E6E6FA" },
      { id: "Oxygen", label: "Oxygen", value: 4.80, color: "#4A90E2" },
      { id: "Sulfur", label: "Sulfur", value: 3.00, color: "#FFD700" },
      { id: "Other", label: "Other", value: 2.00, color: "#95A5A6" }
    ]
  },
  Mars: {
    name: "Mars",
    type: "Terrestrial Planet",
    description: "Mars is known as the Red Planet due to iron oxide on its surface. It has the largest volcano in the solar system.",
    facts: [
      "Diameter: 6,779 km",
      "Distance from Sun: 227.9 million km",
      "Orbital Period: 687 Earth days",
      "Day Length: 24.6 hours (similar to Earth)",
      "Temperature: -153°C to 20°C",
      "2 moons: Phobos and Deimos",
      "Home to Olympus Mons, largest volcano"
    ],
    distance: "227.9 million km",
    orbitalPeriod: "687 days",
    dayLength: "24.6 hours",
    moons: 2,
    composition: [
      { id: "CO2", label: "Carbon Dioxide", value: 95.3, color: "#CD5C5C" },
      { id: "Nitrogen", label: "Nitrogen", value: 2.7, color: "#4169E1" },
      { id: "Argon", label: "Argon", value: 1.6, color: "#9370DB" },
      { id: "Oxygen", label: "Oxygen", value: 0.13, color: "#4A90E2" },
      { id: "Other", label: "Other", value: 0.27, color: "#708090" }
    ],
    coreComposition: [
      { id: "Iron", label: "Iron", value: 75.00, color: "#C9A961" },
      { id: "Nickel", label: "Nickel", value: 8.00, color: "#E6E6FA" },
      { id: "Sulfur", label: "Sulfur", value: 12.00, color: "#FFD700" },
      { id: "Other", label: "Other", value: 5.00, color: "#95A5A6" }
    ]
  },
  Jupiter: {
    name: "Jupiter",
    type: "Gas Giant",
    description: "Jupiter is the largest planet in our solar system. It's a gas giant with a Great Red Spot storm larger than Earth.",
    facts: [
      "Diameter: 139,822 km (11 times Earth)",
      "Distance from Sun: 778.5 million km",
      "Orbital Period: 12 Earth years",
      "Day Length: 9.9 hours (fastest rotation)",
      "Mass: 317.8 times Earth",
      "79+ moons including the 4 large Galilean moons",
      "Has a faint ring system"
    ],
    distance: "778.5 million km",
    orbitalPeriod: "12 years",
    dayLength: "9.9 hours",
    moons: 79,
    composition: [
      { id: "Hydrogen", label: "Hydrogen", value: 89.8, color: "#FFD700" },
      { id: "Helium", label: "Helium", value: 10.2, color: "#FFA500" },
      { id: "Other", label: "Other", value: 0.3, color: "#FF6B35" }
    ],
    coreComposition: [
      { id: "RockyCore", label: "Rocky Core", value: 15.00, color: "#8B7355" },
      { id: "MetallicHydrogen", label: "Metallic Hydrogen", value: 75.00, color: "#C0C0C0" },
      { id: "Helium", label: "Helium", value: 8.00, color: "#FFA500" },
      { id: "Other", label: "Other", value: 2.00, color: "#FF6B35" }
    ]
  },
  Saturn: {
    name: "Saturn",
    type: "Gas Giant",
    description: "Saturn is famous for its spectacular ring system. It's less dense than water and would float if there was an ocean large enough!",
    facts: [
      "Diameter: 116,464 km (9 times Earth)",
      "Distance from Sun: 1,432 million km",
      "Orbital Period: 29 Earth years",
      "Day Length: 10.7 hours",
      "Mass: 95.2 times Earth",
      "82+ moons including Titan (larger than Mercury)",
      "Most extensive ring system in solar system"
    ],
    distance: "1,432 million km",
    orbitalPeriod: "29 years",
    dayLength: "10.7 hours",
    moons: 82,
    composition: [
      { id: "Hydrogen", label: "Hydrogen", value: 96.3, color: "#FAD5A5" },
      { id: "Helium", label: "Helium", value: 3.25, color: "#FFA500" },
      { id: "Other", label: "Other", value: 0.45, color: "#FF6B35" }
    ],
    coreComposition: [
      { id: "RockyCore", label: "Rocky Core", value: 20.00, color: "#8B7355" },
      { id: "MetallicHydrogen", label: "Metallic Hydrogen", value: 70.00, color: "#C0C0C0" },
      { id: "Helium", label: "Helium", value: 8.00, color: "#FFA500" },
      { id: "Other", label: "Other", value: 2.00, color: "#FF6B35" }
    ]
  },
  Uranus: {
    name: "Uranus",
    type: "Ice Giant",
    description: "Uranus rotates on its side, likely due to a collision. It's an ice giant with a unique blue-green color.",
    facts: [
      "Diameter: 50,724 km (4 times Earth)",
      "Distance from Sun: 2,867 million km",
      "Orbital Period: 84 Earth years",
      "Day Length: 17.2 hours",
      "Mass: 14.5 times Earth",
      "27 known moons",
      "Rotates on its side (98° tilt)"
    ],
    distance: "2,867 million km",
    orbitalPeriod: "84 years",
    dayLength: "17.2 hours",
    moons: 27,
    composition: [
      { id: "Hydrogen", label: "Hydrogen", value: 82.5, color: "#4FD0E7" },
      { id: "Helium", label: "Helium", value: 15.2, color: "#87CEEB" },
      { id: "Methane", label: "Methane", value: 2.3, color: "#20B2AA" },
      { id: "Other", label: "Other", value: 0.1, color: "#708090" }
    ],
    coreComposition: [
      { id: "RockyCore", label: "Rocky Core", value: 25.00, color: "#8B7355" },
      { id: "WaterIce", label: "Water Ice", value: 60.00, color: "#87CEEB" },
      { id: "MethaneIce", label: "Methane Ice", value: 12.00, color: "#20B2AA" },
      { id: "Other", label: "Other", value: 3.00, color: "#708090" }
    ]
  },
  Neptune: {
    name: "Neptune",
    type: "Ice Giant",
    description: "Neptune is the windiest planet with speeds up to 2,100 km/h. It's the farthest planet from the Sun.",
    facts: [
      "Diameter: 49,244 km (4 times Earth)",
      "Distance from Sun: 4,515 million km",
      "Orbital Period: 165 Earth years",
      "Day Length: 16.1 hours",
      "Mass: 17.1 times Earth",
      "14 known moons including Triton",
      "Fastest winds in solar system"
    ],
    distance: "4,515 million km",
    orbitalPeriod: "165 years",
    dayLength: "16.1 hours",
    moons: 14,
    composition: [
      { id: "Hydrogen", label: "Hydrogen", value: 80.00, color: "#4B70DD" },
      { id: "Helium", label: "Helium", value: 19.00, color: "#5F9EA0" },
      { id: "Methane", label: "Methane", value: 1.50, color: "#20B2AA" },
      { id: "Other", label: "Other", value: 0.50, color: "#708090" }
    ],
    coreComposition: [
      { id: "RockyCore", label: "Rocky Core", value: 30.00, color: "#8B7355" },
      { id: "WaterIce", label: "Water Ice", value: 55.00, color: "#5F9EA0" },
      { id: "MethaneIce", label: "Methane Ice", value: 12.00, color: "#20B2AA" },
      { id: "Other", label: "Other", value: 3.00, color: "#708090" }
    ]
  },
  // Outer Wilds System Bodies
  TimberHearth: {
    name: "Timber Hearth",
    type: "Terrestrial Planet",
    description: "A forested world and home planet of the Hearthians. Features vast forests, geysers, and underground caves.",
    facts: [
      "Home world of the Hearthian species",
      "Surface covered in lush forests",
      "Features active geysers",
      "Contains extensive cave systems",
      "Location of the Outer Wilds Ventures launch site"
    ],
    distance: "200 units from Sun",
    orbitalPeriod: "~2 minutes",
    dayLength: "22 minutes",
    moons: 1,
    composition: [
      { id: "Nitrogen", label: "Nitrogen", value: 70.00, color: "#4169E1" },
      { id: "Oxygen", label: "Oxygen", value: 25.00, color: "#4A90E2" },
      { id: "CO2", label: "Carbon Dioxide", value: 3.00, color: "#8B4513" },
      { id: "Other", label: "Other", value: 2.00, color: "#708090" }
    ],
    coreComposition: [
      { id: "Iron", label: "Iron", value: 70.00, color: "#C9A961" },
      { id: "Silicates", label: "Silicates", value: 20.00, color: "#7B68EE" },
      { id: "Other", label: "Other", value: 10.00, color: "#95A5A6" }
    ]
  },
  BrittleHollow: {
    name: "Brittle Hollow",
    type: "Fragmented Planet",
    description: "A hollow planet slowly collapsing into a black hole at its core. Its surface constantly breaks apart from volcanic moon impacts.",
    facts: [
      "Contains a black hole at its core",
      "Surface fragments fall into the black hole",
      "Orbited by Hollow's Lantern, a volcanic moon",
      "Ancient Nomai ruins hidden within",
      "Gravity becomes inverted near the core"
    ],
    distance: "350 units from Sun",
    orbitalPeriod: "~3 minutes",
    dayLength: "Unknown",
    moons: 1,
    composition: [
      { id: "Rock", label: "Rock", value: 85.00, color: "#6B4E71" },
      { id: "Metal", label: "Metal", value: 10.00, color: "#C9A961" },
      { id: "Other", label: "Other", value: 5.00, color: "#95A5A6" }
    ],
    coreComposition: [
      { id: "BlackHole", label: "Black Hole", value: 100.00, color: "#1a1a2e" }
    ]
  },
  GiantsDeep: {
    name: "Giant's Deep",
    type: "Ocean Giant",
    description: "A massive ocean world with violent cyclones that can launch islands into orbit. Beneath the storms lies a hidden core.",
    facts: [
      "Entirely covered by ocean",
      "Features massive cyclones",
      "Cyclones can launch objects into orbit",
      "Contains floating islands",
      "Hides secrets beneath the current"
    ],
    distance: "550 units from Sun",
    orbitalPeriod: "~5 minutes",
    dayLength: "Unknown",
    moons: 0,
    composition: [
      { id: "Water", label: "Water", value: 90.00, color: "#2E8B57" },
      { id: "Ammonia", label: "Ammonia", value: 5.00, color: "#9370DB" },
      { id: "Other", label: "Other", value: 5.00, color: "#708090" }
    ],
    coreComposition: [
      { id: "Jellyfish", label: "Giant Jellyfish", value: 50.00, color: "#48D1CC" },
      { id: "Current", label: "Strong Current", value: 50.00, color: "#20B2AA" }
    ]
  },
  AshTwin: {
    name: "Ash Twin",
    type: "Desert Planet",
    description: "One half of the Hourglass Twins. Sand flows from Ash Twin to Ember Twin through a massive sand column connecting them.",
    facts: [
      "Part of the Hourglass Twins binary system",
      "Sand transfers to Ember Twin",
      "Contains ancient Nomai structures",
      "Features underground caverns",
      "Connected to Ember Twin by sand column"
    ],
    distance: "120 units from Sun",
    orbitalPeriod: "~1.5 minutes",
    dayLength: "Tidally locked to Ember Twin",
    moons: 0,
    composition: [
      { id: "Sand", label: "Sand", value: 60.00, color: "#D2691E" },
      { id: "Rock", label: "Rock", value: 30.00, color: "#8B7355" },
      { id: "Metal", label: "Metal", value: 10.00, color: "#C9A961" }
    ],
    coreComposition: [
      { id: "NomaiBone", label: "Nomai Artifact", value: 40.00, color: "#FFD700" },
      { id: "Rock", label: "Rock", value: 60.00, color: "#8B7355" }
    ]
  },
  EmberTwin: {
    name: "Ember Twin",
    type: "Rocky Planet",
    description: "The other half of the Hourglass Twins. Receives sand from Ash Twin, slowly burying its surface structures over time.",
    facts: [
      "Part of the Hourglass Twins binary system",
      "Receives sand from Ash Twin",
      "Surface structures get buried by sand",
      "Contains Nomai mining sites",
      "Reveals hidden caves as sand level drops"
    ],
    distance: "120 units from Sun",
    orbitalPeriod: "~1.5 minutes",
    dayLength: "Tidally locked to Ash Twin",
    moons: 0,
    composition: [
      { id: "Rock", label: "Rock", value: 50.00, color: "#CD853F" },
      { id: "Sand", label: "Sand", value: 40.00, color: "#D2691E" },
      { id: "Metal", label: "Metal", value: 10.00, color: "#C9A961" }
    ],
    coreComposition: [
      { id: "Iron", label: "Iron", value: 70.00, color: "#C9A961" },
      { id: "Silicates", label: "Silicates", value: 30.00, color: "#7B68EE" }
    ]
  },
  DarkBramble: {
    name: "Dark Bramble",
    type: "Anomalous Structure",
    description: "A mysterious, thorny dimension-warping structure. What appears small from outside contains impossibly vast spaces within.",
    facts: [
      "Interior is larger than exterior",
      "Contains dimension-warping seeds",
      "Cute fishies! :)",
      "Grew from a seed that destroyed a planet"
    ],
    distance: "800 units from Sun",
    orbitalPeriod: "~8 minutes",
    dayLength: "N/A",
    moons: 0,
    composition: [
      { id: "Bramble", label: "Bramble Growth", value: 70.00, color: "#2F4F4F" },
      { id: "Void", label: "Void Space", value: 25.00, color: "#1a1a2e" },
      { id: "Unknown", label: "Unknown Matter", value: 5.00, color: "#4B0082" }
    ],
    coreComposition: [
      { id: "Seeds", label: "Dimension Seeds", value: 50.00, color: "#556B2F" },
      { id: "Anglerfish", label: "Anglerfish Nests", value: 50.00, color: "#8B0000" }
    ]
  },
  Interloper: {
    name: "The Interloper",
    type: "Comet",
    description: "A frozen comet with a highly elliptical orbit. Contains a dark secret at its frozen core.",
    facts: [
      "Highly elliptical orbit",
      "Surface covered in ice",
      "Contains a frozen cavern",
      "Harbors a dangerous substance",
      "Passes close to the Sun"
    ],
    distance: "Variable (150-800 units)",
    orbitalPeriod: "~10 minutes",
    dayLength: "N/A",
    moons: 0,
    composition: [
      { id: "Ice", label: "Ice", value: 80.00, color: "#ADD8E6" },
      { id: "Rock", label: "Rock", value: 15.00, color: "#708090" },
      { id: "GhostMatter", label: "Ghost Matter", value: 5.00, color: "#98FB98" }
    ],
    coreComposition: [
      { id: "GhostMatter", label: "Ghost Matter", value: 90.00, color: "#98FB98" },
      { id: "Ice", label: "Ice", value: 10.00, color: "#ADD8E6" }
    ]
  }
};
