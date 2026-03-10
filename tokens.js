// Design Tokens Mapping
const designTokens = {
  // Typography - Desktop/Web
  typography: {
    // Headers
    "head/S1 Bold 40*48": { fontSize: 40, lineHeight: 48 },
    "head/S2 Bold 32*40": { fontSize: 32, lineHeight: 40 },
    "head/S4 Bold 24*28": { fontSize: 24, lineHeight: 28 },
    "head/H1 Bold 24*28": { fontSize: 24, lineHeight: 28 },
    "head/H2 Bold 20*24": { fontSize: 20, lineHeight: 24 },
    "head/H2 Regular 20*24": { fontSize: 20, lineHeight: 24 },
    "head/H3 Bold 18*24": { fontSize: 18, lineHeight: 24 },
    "head/H4 Bold 16*20": { fontSize: 16, lineHeight: 20 },
    "head/H4 Bold caps 16*20": { fontSize: 16, lineHeight: 20 },

    // Body Text
    "body/B1 Medium 16*24": { fontSize: 16, lineHeight: 24 },
    "body/B1 Regular 16*24": { fontSize: 16, lineHeight: 24 },
    "body/B1 Semibold 16*24": { fontSize: 16, lineHeight: 24 },
    "body/B2 Medium 14*16": { fontSize: 14, lineHeight: 16 },
    "body/B2 Regular 14*20": { fontSize: 14, lineHeight: 20 },
    "body/B3 Medium 12*16": { fontSize: 12, lineHeight: 16 },
    "body/B3 Regular 12*16": { fontSize: 12, lineHeight: 16 },
    "body/B4 Medium 10*12": { fontSize: 10, lineHeight: 12 },
    "body/B4 Regular 10*12": { fontSize: 10, lineHeight: 12 },

    // Buttons
    "button/BT1 Medium 16*24": { fontSize: 16, lineHeight: 20 },
    "button/BT1 Semibold 16*20": { fontSize: 16, lineHeight: 20 },
    "button/BT2 Medium 14*20": { fontSize: 14, lineHeight: 20 },
    "button/BT3 Medium 12*16": { fontSize: 12, lineHeight: 16 },

    // Captions
    "caps/C1 Medium 14*20": { fontSize: 14, lineHeight: 20 },
    "caps/C2 Medium 12*16": { fontSize: 12, lineHeight: 16 },
    "caps/C3 Medium 10*12": { fontSize: 10, lineHeight: 12 },
    "caps/C4 Medium 8*8": { fontSize: 8, lineHeight: 8 },

    // iOS Typography
    "Ios/title1": { fontSize: 36, lineHeight: 43 },
    "Ios/title2": { fontSize: 26, lineHeight: 32 },
    "Ios/title3": { fontSize: 22, lineHeight: 28 },
    "Ios/title4": { fontSize: 20, lineHeight: 24 },
    "Ios/body1": { fontSize: 18, lineHeight: 21 },
    "Ios/body2": { fontSize: 18, lineHeight: 21 },
    "Ios/body3": { fontSize: 16, lineHeight: 19 },
    "Ios/body4": { fontSize: 16, lineHeight: 19 },
    "Ios/body5": { fontSize: 14, lineHeight: 17 },
    "Ios/body6": { fontSize: 14, lineHeight: 17 },
    "Ios/body7": { fontSize: 12, lineHeight: 16 },
    "Ios/body8": { fontSize: 12, lineHeight: 16 },
    "Ios/body9": { fontSize: 10, lineHeight: 15 },
    "Ios/caps2": { fontSize: 10, lineHeight: 15 },

    // Android Typography
    "Android/body4_android": { fontSize: 16, lineHeight: 19 },
    "Android/body6_android": { fontSize: 14, lineHeight: 17 },

    // New iOS Typography (from _PudXLz60UNLnn2HET0DqA)
    "iOS‎‎ ‏‎/Title/L": { fontSize: 20, lineHeight: 24 },
    "iOS‎‎ ‏‎/Title/M": { fontSize: 18, lineHeight: 22 },
    "iOS‎‎ ‏‎/Title/S1": { fontSize: 16, lineHeight: 20 },
    "iOS‎‎ ‏‎/Title/S2": { fontSize: 16, lineHeight: 20 },
    "iOS‎‎ ‏‎/Body/L2": { fontSize: 18, lineHeight: 22 },
    "iOS‎‎ ‏‎/Body/M1": { fontSize: 16, lineHeight: 20 },
    "iOS‎‎ ‏‎/Body/M2": { fontSize: 16, lineHeight: 20 },
    "iOS‎‎ ‏‎/Body/S1": { fontSize: 14, lineHeight: 18 },
    "iOS‎‎ ‏‎/Body/S2": { fontSize: 14, lineHeight: 18 },
    "iOS‎‎ ‏‎/Caption/M2": { fontSize: 12, lineHeight: 16 },
    "iOS‎‎ ‏‎/Caption/M3": { fontSize: 12, lineHeight: 16 },

    // New Android Typography (from _PudXLz60UNLnn2HET0DqA)
    "Android‎‎‎‎/Title/S1": { fontSize: 16, lineHeight: 20 },
    "Android‎‎‎‎/Title/S2": { fontSize: 16, lineHeight: 20 },
    "Android‎‎‎‎/Body/M1": { fontSize: 16, lineHeight: 20 },
    "Android‎‎‎‎/Body/M2": { fontSize: 16, lineHeight: 20 },
    "Android‎‎‎‎/Body/S1": { fontSize: 14, lineHeight: 18 },
    "Android‎‎‎‎/Body/S2": { fontSize: 14, lineHeight: 18 },
    "Android‎‎‎‎/Caption/M3": { fontSize: 12, lineHeight: 16 },
  },

  // Colors - Light Theme
  colors: {
    light: {
      // Background & Surface
      "Light/bg1": "#ffffff",
      "Light/surface1": "#ffffff",
      "Light/surface2": "#f1f1f8",
      "Light/surface3": "#f5f5f7",
      "Light/surface4": "#181819",
      "Light/surface5a6": "#1818190f",
      "Light/outlines1a10": "#1818191a",

      // Text Colors
      "Light/Text/primary": "#181819",
      "Light/Text/secondary": "#75767b",
      "Light/Text/tertiary": "#b2b2b7",
      "Light/Text/inverse": "#ffffff",
      "Light/Icon/primary": "#181819",

      // Brand Colors
      "Light/Blue/100": "#007aff",
      "Light/Blue/100i": "#3295ff",
      "Light/Blue/80": "#3395ff",
      "Light/Blue/20": "#cce4ff",
      "Light/Blue/8": "#e5f1ff",

      // Status Colors
      "Light/Red/100": "#cb0000",
      "Light/Red/100i": "#e91e1e",
      "Light/Red/20": "#ffdddd",
      "Light/Green/100i": "#4fbf67",
      "Light/Green/80": "#33ac67",
      "Light/Orange/100": "#ff9d1c",
      "Light/Lavander/90": "#ff6f6f",

      // Monochrome
      "Light/BW Scale/0": "#ffffff",
      "Light/BW Scale/2": "#fbfbfd",
      "Light/BW Scale/4": "#f8f8fb",
      "Light/BW Scale/8": "#f1f1f8",
      "Light/BW Scale/20": "#e5e5eb",
      "Light/BW Scale/40": "#b2b2b7",
      "Light/BW Scale/50": "#999999",
      "Light/BW Scale/90": "#252529",
      "Light/BW Scale/100": "#000000",
      "Light/BW Scale/0a60": "#ffffff99",
      "Light/BW Scale/100a40": "#00000066",

      // Legacy Colors
      "Monochrome/white": "#ffffff",
      "Monochrome/black": "#000000",
      "Monochrome/gray1": "#1c1c1c",
      "Monochrome/gray2Dark": "#e5e5e5",
      "Monochrome/gray3": "#3a3a3a",
      "Monochrome/gray4": "#484848",
      "Monochrome/gray5": "#636363",
      "Monochrome/gray8": "#c7c7c7",
      "Monochrome/gray8Dark": "#484848",
      "Monochrome/gray11": "#f0f2f5",
      "Monochrome/graySpecial9": "#ffffff",
      "Monochrome/graySpecial9Dark": "#8e8e8e",

      // Basic Colors
      "Basic/gray6": "#8e8e8e",
      "Basic/gray6Dark": "#8e8e8e",
      "Basic/gray7": "#aeaeae",
      "Basic/gray7Dark": "#636363",
      "Basic/gray9": "#d1d1d1",
      "Basic/gray9Dark": "#3a3a3a",
      "Basic/gray10": "#e5e5e5",
      "Basic/graySpecial1": "#1c1c1c",
      "Basic/graySpecial1Dark": "#ffffff",
      "Basic/graySpecial2": "#ffffff",
      "Basic/graySpecial2Dark": "#1c1c1c",
      "Basic/graySpecial5": "#f0f2f5",
      "Basic/graySpecial5Dark": "#2c2c2c",
      "Basic/cyanDigital": "#007aff",

      // Brand & MI Colors
      "Brand/cyanOriginal": "#00aaff",
      "Brand/fuchsiaOriginal": "#be006e",
      "MI/cyanDigital1": "#e6f2ff",
      "MI/cyanDigital2": "#cce4ff",
      "MI/cyanDigital3": "#99caff",
      "MI/cyanDigital4": "#66afff",
      "MI/cyanDigital5": "#3395ff",
      "MI/cyanDigital1Dark": "#192532",
      "MI/cyanDigital2Dark": "#114277",
      "MI/cyanDigital3Dark": "#0b54a4",

      // Success & Error
      "Success/green": "#00cd62",
      "Success/green5": "#33d781",
      "Error/red": "#ff3a30",
      "Error/red5": "#ff6159",
      "Error/red5DarkFree": "#e8372e",

      // Orange
      "Orange/orange": "#f49200",
      "Orange/orange2": "#fde9cc",

      // Other Colors
      "Other/goldOriginalFree": "#bb965a",
      "Other/greenSber": "#2f9a41",
      "Other/yellowTinek": "#fce527",
      "Other/redAlfa": "#ef3136",
      "Other/blueSogaz": "#00bd12",

      // Platform Colors
      "Platform/cyanDigitalPlatform4": "#aa9ebf",
      "Platform/graySpecialPlatform7": "#c8cbd1",
      "Platform/grayPlatform6Dark": "#707080",

      // Private Colors
      "Private/goldOriginal": "#bb965a",

      // Theme Free
      "Theme Free/0f": "#ffffff",
      "Theme Free/50f": "#999999",
      "Theme Free/100f": "#000000",
    },

    // Colors - Dark Theme
    dark: {
      // Background & Surface
      "Dark/bg1": "#181819",
      "Dark/surface1": "#292529",
      "Dark/surface2": "#292529",
      "Dark/surface3": "#333837",
      "Dark/surface4": "#f5f5f7",
      "Dark/surface5a10": "#ffffff1a",
      "Dark/outlines1a10": "#ffffff1a",

      // Text Colors
      "Dark/Text/primary": "#ffffff",
      "Dark/Text/secondary": "#a8a9ab",
      "Dark/Text/tertiary": "#75767b",
      "Dark/Text/inverse": "#181819",
      "Dark/Icon/primary": "#ffffff",

      // Brand Colors
      "Dark/Blue/100": "#3295ff",
      "Dark/Blue/100i": "#007aff",
      "Dark/Blue/30": "#0f2c4c",

      // Status Colors
      "Dark/Red/100": "#e91e1e",
      "Dark/Red/20": "#511313",
      "Dark/Orange/100": "#ffa55c",

      // Monochrome
      "Dark/BW Scale/0": "#000000",
      "Dark/BW Scale/2": "#171a23",
      "Dark/BW Scale/4": "#1c1f28",
      "Dark/BW Scale/8": "#252831",
      "Dark/BW Scale/20": "#4b4f59",
      "Dark/BW Scale/40": "#75767b",
      "Dark/BW Scale/50": "#949499",
      "Dark/BW Scale/90": "#e6e6e7",
      "Dark/BW Scale/100": "#ffffff",
      "Dark/BW Scale/100a40": "#ffffff66",

      // Gradients
      "Gradient/gradient1":
        "linear-gradient(135deg, #e5e5e5 62%, #ffffff 100%)",
      "Gradient/gradient1Dark":
        "linear-gradient(135deg, #3a3a3a 62%, #1c1c1c 100%)",
    },
  },
};

export default designTokens;
