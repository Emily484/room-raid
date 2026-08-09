// src/data/quests.js

export const quests = [
  // =========================================================
  // TEXTILE WASTES
  // =========================================================

  {
    id: "textile-floor-clothes",
    zoneId: "textile-wastes",

    title: "Clothing Purge",
    description: "Reclaim floor territory from the Laundry Hydra.",

    category: "clothing",
    action: "collect",

    priority: 90,
    stage: 1,
    repeatable: true,

    tags: ["floor", "clothing", "declutter"],

    requirements: [
      {
        key: "clothingOnFloor",
        operator: ">",
        value: 5,
      },
    ],

    variants: {
      normal: {
        task: "Pick up 10 pieces of clothing from the floor.",
        xp: 15,
        damage: 15,
        estimatedMinutes: 4,

        stateEffects: {
          clothingOnFloor: -15,
          looseClothing: -10,
        },
      },

      small: {
        task: "Pick up 5 pieces of clothing from the floor.",
        xp: 8,
        damage: 8,
        estimatedMinutes: 2,

        stateEffects: {
          clothingOnFloor: -8,
          looseClothing: -5,
        },
      },

      tiny: {
        task: "Pick up 1 piece of clothing from the floor.",
        xp: 2,
        damage: 2,
        estimatedMinutes: 1,

        stateEffects: {
          clothingOnFloor: -2,
          looseClothing: -1,
        },
      },
    },
  },

  {
    id: "textile-dirty-laundry",
    zoneId: "textile-wastes",

    title: "Feed the Hydra",
    description: "Send dirty clothing to containment.",

    category: "clothing",
    action: "sort",

    priority: 82,
    stage: 1,
    repeatable: true,

    tags: ["clothing", "laundry", "sorting"],

    requirements: [
      {
        key: "looseClothing",
        operator: ">",
        value: 5,
      },
    ],

    variants: {
      normal: {
        task: "Put 10 dirty clothing items into the laundry basket.",
        xp: 15,
        damage: 15,
        estimatedMinutes: 4,

        stateEffects: {
          looseClothing: -15,
          clothingOnFloor: -8,
        },
      },

      small: {
        task: "Put 5 dirty clothing items into the laundry basket.",
        xp: 8,
        damage: 8,
        estimatedMinutes: 2,

        stateEffects: {
          looseClothing: -8,
          clothingOnFloor: -4,
        },
      },

      tiny: {
        task: "Put 1 dirty clothing item into the laundry basket.",
        xp: 2,
        damage: 2,
        estimatedMinutes: 1,

        stateEffects: {
          looseClothing: -2,
          clothingOnFloor: -1,
        },
      },
    },
  },

  {
    id: "textile-clean-clothes",
    zoneId: "textile-wastes",

    title: "Return the Wanderers",
    description: "Clean clothing must return to civilization.",

    category: "clothing",
    action: "put-away",

    priority: 75,
    stage: 2,
    repeatable: true,

    tags: ["clothing", "organization"],

    requirements: [
      {
        key: "cleanClothesOut",
        operator: ">",
        value: 5,
      },
    ],

    variants: {
      normal: {
        task: "Put away 10 clean clothing items.",
        xp: 20,
        damage: 18,
        estimatedMinutes: 7,

        stateEffects: {
          cleanClothesOut: -18,
          looseClothing: -8,
        },
      },

      small: {
        task: "Put away 5 clean clothing items.",
        xp: 10,
        damage: 9,
        estimatedMinutes: 3,

        stateEffects: {
          cleanClothesOut: -9,
          looseClothing: -4,
        },
      },

      tiny: {
        task: "Put away 1 clean clothing item.",
        xp: 3,
        damage: 2,
        estimatedMinutes: 1,

        stateEffects: {
          cleanClothesOut: -2,
          looseClothing: -1,
        },
      },
    },
  },

  // =========================================================
  // PACKAGING GRAVEYARD
  // =========================================================

  {
    id: "packaging-flatten-boxes",
    zoneId: "packaging-graveyard",

    title: "Cardboard Massacre",
    description: "Destroy the Corrugated One's minions.",

    category: "cardboard",
    action: "remove",

    priority: 88,
    stage: 1,
    repeatable: true,

    tags: ["cardboard", "trash", "floor"],

    requirements: [
      {
        key: "cardboard",
        operator: ">",
        value: 5,
      },
    ],

    variants: {
      normal: {
        task: "Flatten and remove 3 cardboard boxes.",
        xp: 18,
        damage: 18,
        estimatedMinutes: 5,

        stateEffects: {
          cardboard: -20,
        },
      },

      small: {
        task: "Flatten and remove 1 cardboard box.",
        xp: 7,
        damage: 7,
        estimatedMinutes: 2,

        stateEffects: {
          cardboard: -8,
        },
      },

      tiny: {
        task: "Pick up and remove one piece of cardboard.",
        xp: 2,
        damage: 2,
        estimatedMinutes: 1,

        stateEffects: {
          cardboard: -2,
        },
      },
    },
  },

  {
    id: "packaging-remove-bags",
    zoneId: "packaging-graveyard",

    title: "Bag Banishment",
    description: "Drive disposable packaging from the realm.",

    category: "trash",
    action: "remove",

    priority: 72,
    stage: 1,
    repeatable: true,

    tags: ["bags", "packaging", "trash"],

    requirements: [
      {
        key: "loosePackaging",
        operator: ">",
        value: 5,
      },
    ],

    variants: {
      normal: {
        task: "Collect and remove 10 disposable bags or pieces of packaging.",
        xp: 15,
        damage: 15,
        estimatedMinutes: 4,

        stateEffects: {
          loosePackaging: -18,
        },
      },

      small: {
        task: "Remove 5 disposable bags or pieces of packaging.",
        xp: 8,
        damage: 8,
        estimatedMinutes: 2,

        stateEffects: {
          loosePackaging: -9,
        },
      },

      tiny: {
        task: "Remove 1 disposable bag or piece of packaging.",
        xp: 2,
        damage: 2,
        estimatedMinutes: 1,

        stateEffects: {
          loosePackaging: -2,
        },
      },
    },
  },

  // =========================================================
  // TABLE OF CHAOS
  // =========================================================

  {
    id: "table-remove-trash",
    zoneId: "table-chaos",

    title: "Cull the Worthless",
    description: "Remove obvious trash before confronting the Hoard.",

    category: "trash",
    action: "remove",

    priority: 80,
    stage: 1,
    repeatable: true,

    tags: ["table", "trash"],

    requirements: [
      {
        key: "tableTrash",
        operator: ">",
        value: 5,
      },
    ],

    variants: {
      normal: {
        task: "Remove 10 pieces of obvious trash from one table.",
        xp: 12,
        damage: 10,
        estimatedMinutes: 3,

        stateEffects: {
          tableTrash: -20,
          surfaceClutter: -8,
        },
      },

      small: {
        task: "Remove 5 pieces of obvious trash from one table.",
        xp: 6,
        damage: 5,
        estimatedMinutes: 2,

        stateEffects: {
          tableTrash: -10,
          surfaceClutter: -4,
        },
      },

      tiny: {
        task: "Remove 1 piece of trash from the table.",
        xp: 2,
        damage: 1,
        estimatedMinutes: 1,

        stateEffects: {
          tableTrash: -2,
          surfaceClutter: -1,
        },
      },
    },
  },

  {
    id: "table-relocate-items",
    zoneId: "table-chaos",

    title: "Excavate the Surface",
    description: "Reveal the ancient tabletop beneath.",

    category: "misc",
    action: "put-away",

    priority: 85,
    stage: 2,
    repeatable: true,

    tags: ["table", "objects", "organization"],

    requirements: [
      {
        key: "surfaceClutter",
        operator: ">",
        value: 10,
      },
    ],

    variants: {
      normal: {
        task: "Put away 10 objects from one table.",
        xp: 18,
        damage: 15,
        estimatedMinutes: 6,

        stateEffects: {
          surfaceClutter: -15,
        },
      },

      small: {
        task: "Put away 5 objects from one table.",
        xp: 9,
        damage: 7,
        estimatedMinutes: 3,

        stateEffects: {
          surfaceClutter: -8,
        },
      },

      tiny: {
        task: "Put away 1 object from the table.",
        xp: 2,
        damage: 2,
        estimatedMinutes: 1,

        stateEffects: {
          surfaceClutter: -2,
        },
      },
    },
  },

  {
    id: "table-wipe",
    zoneId: "table-chaos",

    title: "Consecrate the Surface",
    description: "The tabletop has emerged. Cleanse it.",

    category: "cleaning",
    action: "wipe",

    priority: 95,
    stage: 3,
    repeatable: false,

    tags: ["table", "wipe", "cleaning"],

    requirements: [
      {
        key: "surfaceClutter",
        operator: "<=",
        value: 20,
      },
      {
        key: "exposedSurface",
        operator: ">=",
        value: 70,
      },
      {
        key: "surfaceCleanliness",
        operator: "<",
        value: 75,
      },
    ],

    variants: {
      normal: {
        task: "Wipe down the cleared tabletop.",
        xp: 25,
        damage: 25,
        estimatedMinutes: 5,

        stateEffects: {
          surfaceCleanliness: 50,
        },
      },

      small: {
        task: "Wipe one cleared section of the tabletop.",
        xp: 12,
        damage: 12,
        estimatedMinutes: 2,

        stateEffects: {
          surfaceCleanliness: 25,
        },
      },

      tiny: {
        task: "Wipe one visibly dirty spot.",
        xp: 3,
        damage: 3,
        estimatedMinutes: 1,

        stateEffects: {
          surfaceCleanliness: 8,
        },
      },
    },
  },

  // =========================================================
  // GREAT FLOOR
  // =========================================================

  {
    id: "floor-trash",
    zoneId: "great-floor",

    title: "Scavenger Hunt",
    description: "Strip the Floor Devourer of disposable armor.",

    category: "trash",
    action: "remove",

    priority: 92,
    stage: 1,
    repeatable: true,

    tags: ["floor", "trash"],

    requirements: [
      {
        key: "floorTrash",
        operator: ">",
        value: 5,
      },
    ],

    variants: {
      normal: {
        task: "Collect 10 pieces of obvious trash from the floor.",
        xp: 15,
        damage: 12,
        estimatedMinutes: 4,

        stateEffects: {
          floorTrash: -20,
        },
      },

      small: {
        task: "Collect 5 pieces of trash from the floor.",
        xp: 8,
        damage: 6,
        estimatedMinutes: 2,

        stateEffects: {
          floorTrash: -10,
        },
      },

      tiny: {
        task: "Throw away 1 piece of trash from the floor.",
        xp: 2,
        damage: 2,
        estimatedMinutes: 1,

        stateEffects: {
          floorTrash: -2,
        },
      },
    },
  },

  {
    id: "floor-misc-items",
    zoneId: "great-floor",

    title: "Recover Lost Artifacts",
    description: "Return wandering objects to their proper realms.",

    category: "misc",
    action: "put-away",

    priority: 88,
    stage: 2,
    repeatable: true,

    tags: ["floor", "objects", "organization"],

    requirements: [
      {
        key: "miscellaneousFloorItems",
        operator: ">",
        value: 5,
      },
    ],

    variants: {
      normal: {
        task: "Put away 10 non-clothing objects from the floor.",
        xp: 20,
        damage: 18,
        estimatedMinutes: 7,

        stateEffects: {
          miscellaneousFloorItems: -18,
        },
      },

      small: {
        task: "Put away 5 non-clothing objects from the floor.",
        xp: 10,
        damage: 9,
        estimatedMinutes: 3,

        stateEffects: {
          miscellaneousFloorItems: -9,
        },
      },

      tiny: {
        task: "Put away 1 object from the floor.",
        xp: 3,
        damage: 2,
        estimatedMinutes: 1,

        stateEffects: {
          miscellaneousFloorItems: -2,
        },
      },
    },
  },

  {
    id: "floor-vacuum",
    zoneId: "great-floor",

    title: "The Floor Devourer Is Vulnerable",
    description: "Its armor is broken. Strike now.",

    category: "cleaning",
    action: "vacuum",

    priority: 100,
    stage: 4,
    repeatable: false,

    tags: ["floor", "vacuum", "boss"],

    requirements: [
      {
        key: "floorClutter",
        operator: "<=",
        value: 20,
      },
      {
        key: "exposedFloor",
        operator: ">=",
        value: 70,
      },
      {
        key: "floorCleanliness",
        operator: "<",
        value: 75,
      },
    ],

    variants: {
      normal: {
        task: "Vacuum the entire accessible carpet.",
        xp: 50,
        damage: 50,
        estimatedMinutes: 15,

        stateEffects: {
          floorCleanliness: 60,
        },
      },

      small: {
        task: "Vacuum one large cleared section of carpet.",
        xp: 25,
        damage: 25,
        estimatedMinutes: 7,

        stateEffects: {
          floorCleanliness: 30,
        },
      },

      tiny: {
        task: "Vacuum one small cleared patch of carpet.",
        xp: 8,
        damage: 8,
        estimatedMinutes: 3,

        stateEffects: {
          floorCleanliness: 10,
        },
      },
    },
  },

  // =========================================================
  // BED TERRITORY
  // =========================================================

  {
    id: "bed-remove-items",
    zoneId: "bed-territory",

    title: "Purge the Nest",
    description: "Remove objects invading the sleeping grounds.",

    category: "misc",
    action: "remove",

    priority: 78,
    stage: 1,
    repeatable: true,

    tags: ["bed", "objects"],

    requirements: [
      {
        key: "bedClutter",
        operator: ">",
        value: 5,
      },
    ],

    variants: {
      normal: {
        task: "Remove everything from one bed that does not belong there.",
        xp: 20,
        damage: 18,
        estimatedMinutes: 7,

        stateEffects: {
          bedClutter: -25,
        },
      },

      small: {
        task: "Remove 5 things that do not belong on the bed.",
        xp: 10,
        damage: 9,
        estimatedMinutes: 3,

        stateEffects: {
          bedClutter: -12,
        },
      },

      tiny: {
        task: "Remove 1 thing that does not belong on the bed.",
        xp: 3,
        damage: 2,
        estimatedMinutes: 1,

        stateEffects: {
          bedClutter: -3,
        },
      },
    },
  },

  {
    id: "bed-make",
    zoneId: "bed-territory",

    title: "Restore the Nest",
    description: "Return order to the sleeping chamber.",

    category: "bedding",
    action: "make-bed",

    priority: 95,
    stage: 2,
    repeatable: false,

    tags: ["bed", "bedding"],

    requirements: [
      {
        key: "bedClutter",
        operator: "<=",
        value: 20,
      },
      {
        key: "bedMade",
        operator: "<",
        value: 80,
      },
    ],

    variants: {
      normal: {
        task: "Straighten the sheets, pillows, and blankets on one bed.",
        xp: 25,
        damage: 25,
        estimatedMinutes: 6,

        stateEffects: {
          bedMade: 100,
        },
      },

      small: {
        task: "Straighten the blankets and pillows.",
        xp: 12,
        damage: 12,
        estimatedMinutes: 3,

        stateEffects: {
          bedMade: 55,
        },
      },

      tiny: {
        task: "Straighten one blanket or pillow.",
        xp: 3,
        damage: 3,
        estimatedMinutes: 1,

        stateEffects: {
          bedMade: 15,
        },
      },
    },
  },

  // =========================================================
  // LOUNGE RUINS
  // =========================================================

  {
    id: "lounge-chair-clutter",
    zoneId: "lounge-ruins",

    title: "Reclaim the Throne",
    description: "Liberate the seating area from hostile objects.",

    category: "misc",
    action: "remove",

    priority: 76,
    stage: 1,
    repeatable: true,

    tags: ["chair", "lounge", "objects"],

    requirements: [
      {
        key: "loungeClutter",
        operator: ">",
        value: 5,
      },
    ],

    variants: {
      normal: {
        task: "Remove everything from one chair or ottoman that does not belong there.",
        xp: 20,
        damage: 18,
        estimatedMinutes: 6,

        stateEffects: {
          loungeClutter: -20,
        },
      },

      small: {
        task: "Remove 5 things from the chair or ottoman.",
        xp: 10,
        damage: 9,
        estimatedMinutes: 3,

        stateEffects: {
          loungeClutter: -10,
        },
      },

      tiny: {
        task: "Remove 1 thing from the chair or ottoman.",
        xp: 3,
        damage: 2,
        estimatedMinutes: 1,

        stateEffects: {
          loungeClutter: -2,
        },
      },
    },
  },

  {
    id: "lounge-shelf",
    zoneId: "lounge-ruins",

    title: "Restore the Archives",
    description: "Return books, papers, and miscellaneous artifacts to order.",

    category: "organization",
    action: "sort",

    priority: 55,
    stage: 2,
    repeatable: true,

    tags: ["shelf", "books", "organization"],

    requirements: [
      {
        key: "shelfDisorganization",
        operator: ">",
        value: 10,
      },
    ],

    variants: {
      normal: {
        task: "Organize one full shelf or cubby.",
        xp: 25,
        damage: 20,
        estimatedMinutes: 10,

        stateEffects: {
          shelfDisorganization: -25,
        },
      },

      small: {
        task: "Organize one section of a shelf.",
        xp: 12,
        damage: 10,
        estimatedMinutes: 5,

        stateEffects: {
          shelfDisorganization: -12,
        },
      },

      tiny: {
        task: "Put away 3 items on the shelf.",
        xp: 4,
        damage: 3,
        estimatedMinutes: 2,

        stateEffects: {
          shelfDisorganization: -5,
        },
      },
    },
  },

  // =========================================================
  // BATHROOM DUNGEON
  // =========================================================

  {
    id: "bathroom-counter-items",
    zoneId: "bathroom",

    title: "Vanity Purge",
    description: "Remove the Scum Lord's clutter defenses.",

    category: "bathroom",
    action: "put-away",

    priority: 85,
    stage: 1,
    repeatable: true,

    tags: ["bathroom", "counter", "toiletries"],

    requirements: [
      {
        key: "bathroomCounterClutter",
        operator: ">",
        value: 5,
      },
    ],

    variants: {
      normal: {
        task: "Put away 10 items from the bathroom counter.",
        xp: 15,
        damage: 12,
        estimatedMinutes: 5,

        stateEffects: {
          bathroomCounterClutter: -20,
        },
      },

      small: {
        task: "Put away 5 items from the bathroom counter.",
        xp: 8,
        damage: 6,
        estimatedMinutes: 2,

        stateEffects: {
          bathroomCounterClutter: -10,
        },
      },

      tiny: {
        task: "Put away 1 bathroom counter item.",
        xp: 2,
        damage: 2,
        estimatedMinutes: 1,

        stateEffects: {
          bathroomCounterClutter: -2,
        },
      },
    },
  },

  {
    id: "bathroom-sink",
    zoneId: "bathroom",

    title: "Purify the Basin",
    description: "The sink has become accessible. Cleanse it.",

    category: "bathroom",
    action: "clean",

    priority: 95,
    stage: 2,
    repeatable: false,

    tags: ["bathroom", "sink", "cleaning"],

    requirements: [
      {
        key: "bathroomCounterClutter",
        operator: "<=",
        value: 25,
      },
      {
        key: "sinkCleanliness",
        operator: "<",
        value: 75,
      },
    ],

    variants: {
      normal: {
        task: "Clean the bathroom sink and faucet.",
        xp: 25,
        damage: 25,
        estimatedMinutes: 7,

        stateEffects: {
          sinkCleanliness: 60,
        },
      },

      small: {
        task: "Wipe the sink basin and faucet.",
        xp: 12,
        damage: 12,
        estimatedMinutes: 4,

        stateEffects: {
          sinkCleanliness: 30,
        },
      },

      tiny: {
        task: "Wipe the faucet and the area immediately around it.",
        xp: 4,
        damage: 4,
        estimatedMinutes: 2,

        stateEffects: {
          sinkCleanliness: 12,
        },
      },
    },
  },

  {
    id: "bathroom-mirror",
    zoneId: "bathroom",

    title: "The Looking Glass",
    description: "Remove the Scum Lord's spectral fingerprints.",

    category: "bathroom",
    action: "clean",

    priority: 58,
    stage: 2,
    repeatable: false,

    tags: ["bathroom", "mirror"],

    requirements: [
      {
        key: "mirrorDirty",
        operator: ">",
        value: 15,
      },
    ],

    variants: {
      normal: {
        task: "Clean the entire bathroom mirror.",
        xp: 20,
        damage: 18,
        estimatedMinutes: 5,

        stateEffects: {
          mirrorDirty: -70,
        },
      },

      small: {
        task: "Clean the visibly marked areas of the mirror.",
        xp: 10,
        damage: 9,
        estimatedMinutes: 3,

        stateEffects: {
          mirrorDirty: -35,
        },
      },

      tiny: {
        task: "Clean one section of the mirror.",
        xp: 3,
        damage: 3,
        estimatedMinutes: 1,

        stateEffects: {
          mirrorDirty: -12,
        },
      },
    },
  },

  {
    id: "bathroom-tub-products",
    zoneId: "bathroom",

    title: "Clear the Bathing Shrine",
    description: "Remove stray products before the cleansing ritual.",

    category: "bathroom",
    action: "organize",

    priority: 70,
    stage: 1,
    repeatable: true,

    tags: ["bathroom", "tub", "products"],

    requirements: [
      {
        key: "tubClutter",
        operator: ">",
        value: 10,
      },
    ],

    variants: {
      normal: {
        task: "Put away or organize every loose product around the tub.",
        xp: 18,
        damage: 15,
        estimatedMinutes: 5,

        stateEffects: {
          tubClutter: -25,
        },
      },

      small: {
        task: "Organize 5 products around the tub.",
        xp: 9,
        damage: 7,
        estimatedMinutes: 3,

        stateEffects: {
          tubClutter: -12,
        },
      },

      tiny: {
        task: "Put away 1 tub or shower product.",
        xp: 2,
        damage: 2,
        estimatedMinutes: 1,

        stateEffects: {
          tubClutter: -3,
        },
      },
    },
  },

  {
    id: "bathroom-tub-clean",
    zoneId: "bathroom",

    title: "Scour the Shrine",
    description: "The bathing chamber is exposed. Finish the ritual.",

    category: "bathroom",
    action: "clean",

    priority: 90,
    stage: 3,
    repeatable: false,

    tags: ["bathroom", "tub", "boss"],

    requirements: [
      {
        key: "tubClutter",
        operator: "<=",
        value: 20,
      },
      {
        key: "tubCleanliness",
        operator: "<",
        value: 75,
      },
    ],

    variants: {
      normal: {
        task: "Clean the tub and surrounding tile.",
        xp: 50,
        damage: 40,
        estimatedMinutes: 15,

        stateEffects: {
          tubCleanliness: 60,
        },
      },

      small: {
        task: "Clean the tub basin.",
        xp: 25,
        damage: 20,
        estimatedMinutes: 8,

        stateEffects: {
          tubCleanliness: 30,
        },
      },

      tiny: {
        task: "Clean one visibly dirty section of the tub.",
        xp: 8,
        damage: 6,
        estimatedMinutes: 3,

        stateEffects: {
          tubCleanliness: 12,
        },
      },
    },
  },
];