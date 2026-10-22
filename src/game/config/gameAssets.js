export const GAME_ASSETS = {
  islandSheets: [
    {
      src: '/assets/game/islands/sheet-islands-1.webp',
      width: 1448,
      height: 1086,
      columns: 9,
      rows: 10,
      xBounds: [0, 175, 328, 484, 633, 788, 941, 1101, 1263, 1448],
      yBounds: [0, 121, 229, 329, 429, 540, 648, 752, 863, 972, 1086]
    },
    {
      src: '/assets/game/islands/sheet-islands-2.webp',
      width: 1448,
      height: 1086,
      columns: 10,
      rows: 10,
      xBounds: [0, 151, 300, 448, 593, 735, 879, 1024, 1164, 1309, 1448],
      yBounds: [0, 123, 227, 328, 435, 538, 646, 759, 863, 975, 1086]
    }
  ],

  boats: {
    red: '/assets/game/boats/boat-red.webp',
    black: '/assets/game/boats/boat-black.webp',
    blue: '/assets/game/boats/boat-blue.webp',
    green: '/assets/game/boats/boat-green.webp'
  },

  treasures: {
    small: '/assets/game/treasures/treasure-small.webp',
    medium: '/assets/game/treasures/treasure-medium.webp',
    large: '/assets/game/treasures/treasure-large.webp',
    legendary: '/assets/game/treasures/treasure-legendary.webp'
  }
};
