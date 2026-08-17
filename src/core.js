/**
 * OpenAlibi core generator and CSP solver.
 * No runtime dependencies; works in modern browsers and Node.js.
 */

import {
  getCaseTitle,
  getCaseTitleCount,
  getCharacterNameProfiles,
  getNameProfile,
  getObjectCopy,
  getRoomName,
  getVictimNameProfiles,
  normalizeLocale,
  translate,
} from './i18n.js';

export const GENERATOR_VERSION = 10;
export const RANDOM_SEED_LENGTH = 10;
export const MAX_CARDINAL_CLUE_SHARE = 0.12;
export const MAX_CLUE_TYPE_SHARE = 0.4;
export const MAX_DISTANCE_CLUE_SHARE = 0.25;
export const MAX_PERSON_DISTANCE_CLUE_SHARE = 0.2;

const RANDOM_SEED_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const DIFFICULTIES = {
  facile: {
    densityRange: [1, 1],
    defaultDensity: 1,
    roomFactor: 0.75,
    obstacleRate: 0.11,
    extraClues: 0.65,
    relationBias: 0.15,
    negativeBias: 0.05,
    maxExactClues: Infinity,
    objectRepeatTarget: 1,
  },
  moyen: {
    densityRange: [0.85, 1],
    defaultDensity: 0.9,
    roomFactor: 0.9,
    obstacleRate: 0.15,
    extraClues: 0.35,
    relationBias: 0.35,
    negativeBias: 0.12,
    maxExactClues: 2,
    objectRepeatTarget: 2,
  },
  difficile: {
    densityRange: [0.7, 0.9],
    defaultDensity: 0.8,
    roomFactor: 1.05,
    obstacleRate: 0.19,
    extraClues: 0.12,
    relationBias: 0.58,
    negativeBias: 0.24,
    maxExactClues: 0,
    objectRepeatTarget: 3,
  },
  expert: {
    densityRange: [0.55, 1],
    defaultDensity: 0.85,
    roomFactor: 1.18,
    obstacleRate: 0.22,
    extraClues: 0,
    relationBias: 0.72,
    negativeBias: 0.38,
    maxExactClues: 0,
    objectRepeatTarget: 4,
  },
};

export const CASE_TYPES = {
  coPresence: { narrativeClue: 'victimNoTestimony', clueBias: 'relation', weight: 0.25 },
  evidenceTrail: { narrativeClue: 'evidenceTrail', clueBias: 'object', weight: 0.45 },
  restrictedAccess: { narrativeClue: 'restrictedAccess', clueBias: 'room', weight: 0.3 },
};

export const CONSTRAINT_TYPES = [
  'room', 'row', 'col', 'rowHalf', 'colHalf', 'onObject', 'onlyOnObject', 'besideObject',
  'notBesideObject', 'aloneInRoom', 'sameRoom', 'notSameRoom', 'northOf',
  'southOf', 'westOf', 'eastOf', 'besidePerson', 'distanceFromObject',
  'roomPosition', 'distanceFromPerson', 'roomContainsObject',
];

const CARDINAL_CLUE_TYPES = new Set(['northOf', 'southOf', 'westOf', 'eastOf']);
const DISTANCE_CLUE_TYPES = new Set(['distanceFromObject', 'distanceFromPerson']);

const ROOM_TYPES = {
  large: ['livingRoom', 'diningRoom', 'library', 'gallery', 'workshop', 'meetingRoom', 'indoorGarden'],
  medium: ['kitchen', 'office', 'bedroom', 'sunroom', 'archives', 'laboratory', 'musicRoom', 'studio', 'cafe'],
  small: ['bathroom', 'laundryRoom', 'storageRoom', 'vestibule', 'dressingRoom', 'warehouse', 'hall'],
};

export const OBJECT_TYPES = {
  chair: { icon: '♨', occupiable: true, footprints: [[[0, 0]]] },
  bed: { icon: '▰', occupiable: true, footprints: [[[0, 0], [0, 1]]] },
  carpet: {
    icon: '▧',
    occupiable: true,
    footprints: [
      [[0, 0], [0, 1], [1, 0], [1, 1]],
      [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]],
      [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 1], [1, 2], [1, 3]],
      [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
      [
        [0, 0], [0, 1], [0, 2], [0, 3],
        [1, 0], [1, 1], [1, 2], [1, 3],
        [2, 0], [2, 1], [2, 2], [2, 3],
      ],
    ],
  },
  puddle: { icon: '≈', occupiable: true, footprints: [[[0, 0]], [[0, 0], [0, 1]]] },
  table: { icon: '▣', occupiable: false, footprints: [[[0, 0], [0, 1]]] },
  shelf: { icon: '▤', occupiable: false, footprints: [[[0, 0], [0, 1]]] },
  plant: { icon: '♣', occupiable: false, footprints: [[[0, 0]]] },
  counter: { icon: '▬', occupiable: false, footprints: [[[0, 0], [0, 1]]] },
  statue: { icon: '♟', occupiable: false, footprints: [[[0, 0]]] },
  tv: { icon: '▣', occupiable: false, footprints: [[[0, 0]]] },
};

export const OBJECT_PLACEMENT_RULES = {
  chair: {
    roomTypes: [
      'livingRoom', 'diningRoom', 'library', 'gallery', 'workshop', 'meetingRoom',
      'indoorGarden', 'kitchen', 'office', 'bedroom', 'sunroom', 'archives',
      'laboratory', 'musicRoom', 'studio', 'cafe', 'dressingRoom', 'hall',
    ],
    maxPerRoom: 2,
    zone: 'any',
  },
  bed: {
    roomTypes: ['bedroom', 'dressingRoom'],
    maxPerRoom: 1,
    zone: 'wall',
  },
  carpet: {
    roomTypes: [
      'livingRoom', 'diningRoom', 'library', 'gallery', 'meetingRoom', 'office',
      'bedroom', 'sunroom', 'musicRoom', 'studio', 'vestibule', 'dressingRoom', 'hall',
    ],
    maxPerRoom: 1,
    zone: 'center',
  },
  puddle: {
    roomTypes: ['indoorGarden', 'kitchen', 'sunroom', 'laboratory', 'cafe', 'bathroom', 'laundryRoom'],
    maxPerRoom: 1,
    zone: 'any',
  },
  table: {
    roomTypes: [
      'livingRoom', 'diningRoom', 'library', 'workshop', 'meetingRoom', 'kitchen',
      'office', 'sunroom', 'archives', 'laboratory', 'musicRoom', 'studio',
      'cafe', 'warehouse',
    ],
    maxPerRoom: 1,
    zone: 'center',
  },
  shelf: {
    roomTypes: ['library', 'workshop', 'office', 'archives', 'laboratory', 'studio', 'storageRoom', 'warehouse'],
    maxPerRoom: 1,
    zone: 'wall',
  },
  plant: {
    roomTypes: [
      'livingRoom', 'diningRoom', 'library', 'gallery', 'indoorGarden', 'office',
      'bedroom', 'sunroom', 'studio', 'cafe', 'vestibule', 'dressingRoom', 'hall',
    ],
    maxPerRoom: 1,
    zone: 'wall',
  },
  counter: {
    roomTypes: ['workshop', 'kitchen', 'laboratory', 'cafe', 'bathroom', 'laundryRoom', 'dressingRoom', 'warehouse'],
    maxPerRoom: 1,
    zone: 'wall',
  },
  statue: {
    roomTypes: ['livingRoom', 'library', 'gallery', 'indoorGarden', 'sunroom', 'vestibule', 'hall'],
    maxPerRoom: 1,
    zone: 'wall',
  },
  tv: {
    roomTypes: ['livingRoom', 'meetingRoom', 'office', 'bedroom', 'musicRoom', 'studio', 'cafe', 'dressingRoom'],
    maxPerRoom: 1,
    zone: 'wall',
  },
};

const ROOM_PALETTE = [
  '#f6e7c8', '#dceef2', '#e8ddf4', '#dfead2', '#f2d9d5', '#d8e5f2',
  '#f0e3d5', '#e4edf0', '#eee2ca', '#d9e6de', '#eadbea', '#f4e3c5',
];

function hashSeed128(value) {
  const text = String(value ?? 'openalibi');
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    h1 = h2 ^ Math.imul(h1 ^ code, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ code, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ code, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ code, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [
    (h1 ^ h2 ^ h3 ^ h4) >>> 0,
    (h2 ^ h1) >>> 0,
    (h3 ^ h1) >>> 0,
    (h4 ^ h1) >>> 0,
  ];
}

export function createRng(seed) {
  let [a, b, c, d] = hashSeed128(seed);
  return function random() {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const result = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = ((c << 21) | (c >>> 11));
    c = (c + result) | 0;
    return (result >>> 0) / 4294967296;
  };
}

export function createRandomSeed(length = RANDOM_SEED_LENGTH) {
  const normalizedLength = clamp(Math.floor(Number(length) || RANDOM_SEED_LENGTH), 4, 64);
  const bytes = new Uint8Array(normalizedLength);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return [...bytes]
    .map((byte) => RANDOM_SEED_ALPHABET[byte & 31])
    .join('');
}

function createGenerationKey(seed, rows, cols, density, difficulty, caseType, regeneration) {
  return JSON.stringify([
    GENERATOR_VERSION,
    seed,
    rows,
    cols,
    density,
    difficulty,
    caseType,
    regeneration,
  ]);
}

function createCaseId(generationKey) {
  const fingerprint = hashSeed128(generationKey)
    .map((part) => part.toString(16).padStart(8, '0'))
    .join('');
  return `case-${fingerprint}`;
}

function randomInt(rng, min, maxInclusive) {
  return Math.floor(rng() * (maxInclusive - min + 1)) + min;
}

function sample(rng, array) {
  return array[Math.floor(rng() * array.length)];
}

function shuffle(rng, values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function cellKey(row, col) {
  return `${row},${col}`;
}

export function parseCellKey(key) {
  const [row, col] = key.split(',').map(Number);
  return { row, col };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rangesOverlap(firstStart, firstLength, secondStart, secondLength) {
  return Math.max(firstStart, secondStart) < Math.min(firstStart + firstLength, secondStart + secondLength);
}

function roomsAreAdjacent(first, second) {
  const shareVerticalWall = (
    first.left + first.width === second.left
    || second.left + second.width === first.left
  ) && rangesOverlap(first.top, first.height, second.top, second.height);
  const shareHorizontalWall = (
    first.top + first.height === second.top
    || second.top + second.height === first.top
  ) && rangesOverlap(first.left, first.width, second.left, second.width);
  return shareVerticalWall || shareHorizontalWall;
}

function roomPattern(type) {
  if (['kitchen', 'bathroom', 'laundryRoom', 'laboratory', 'cafe'].includes(type)) return 'tile';
  if (['livingRoom', 'diningRoom', 'library', 'office', 'gallery', 'meetingRoom', 'musicRoom'].includes(type)) return 'parquet';
  if (['indoorGarden', 'sunroom', 'workshop'].includes(type)) return 'organic';
  if (['archives', 'storageRoom', 'warehouse'].includes(type)) return 'paper';
  return 'textile';
}

function decorateRooms(rooms) {
  const visualSeed = rooms.map((room) => `${room.type}:${room.top},${room.left},${room.height},${room.width}`).join('|');
  const visualRng = createRng(visualSeed);
  const paletteByRoomId = new Map();

  return rooms.map((room) => {
    const neighborIds = rooms
      .filter((candidate) => candidate.id !== room.id && roomsAreAdjacent(room, candidate))
      .map((candidate) => candidate.id);
    const usedPaletteSlots = new Set(
      neighborIds
        .map((neighborId) => paletteByRoomId.get(neighborId))
        .filter((slot) => slot !== undefined),
    );
    const startSlot = randomInt(visualRng, 0, ROOM_PALETTE.length - 1);
    let paletteSlot = startSlot;
    while (usedPaletteSlots.has(paletteSlot)) {
      paletteSlot = (paletteSlot + 1) % ROOM_PALETTE.length;
    }
    paletteByRoomId.set(room.id, paletteSlot);

    return {
      ...room,
      color: ROOM_PALETTE[paletteSlot],
      pattern: roomPattern(room.type),
      neighborIds,
    };
  });
}

function buildRooms(rows, cols, targetCount, rng, locale) {
  const rectangles = [{ top: 0, left: 0, height: rows, width: cols }];
  let safety = 0;

  while (rectangles.length < targetCount && safety < 200) {
    safety += 1;
    const candidates = rectangles
      .map((rect, index) => ({ rect, index, area: rect.height * rect.width }))
      .filter(({ rect }) => rect.height >= 4 || rect.width >= 4)
      .sort((a, b) => b.area - a.area);

    if (!candidates.length) break;
    const pick = candidates[Math.min(candidates.length - 1, Math.floor(rng() * Math.min(3, candidates.length)))];
    const rect = pick.rect;
    const canHorizontal = rect.height >= 4;
    const canVertical = rect.width >= 4;
    const horizontal = canHorizontal && (!canVertical || rect.height > rect.width || (rect.height === rect.width && rng() < 0.5));

    let first;
    let second;
    if (horizontal) {
      const cut = randomInt(rng, Math.max(2, Math.ceil(rect.height * 0.4)), Math.min(rect.height - 2, Math.floor(rect.height * 0.6)));
      first = { ...rect, height: cut };
      second = { top: rect.top + cut, left: rect.left, height: rect.height - cut, width: rect.width };
    } else {
      const cut = randomInt(rng, Math.max(2, Math.ceil(rect.width * 0.4)), Math.min(rect.width - 2, Math.floor(rect.width * 0.6)));
      first = { ...rect, width: cut };
      second = { top: rect.top, left: rect.left + cut, height: rect.height, width: rect.width - cut };
    }

    rectangles.splice(pick.index, 1, first, second);
  }

  const pools = Object.fromEntries(Object.entries(ROOM_TYPES).map(([size, types]) => [size, shuffle(rng, types)]));
  const types = new Array(rectangles.length);
  const rankedRooms = rectangles
    .map((rect, index) => ({ index, area: rect.height * rect.width }))
    .sort((a, b) => b.area - a.area);
  for (const [rank, room] of rankedRooms.entries()) {
    const share = (rank + 0.5) / rankedRooms.length;
    const size = share <= 1 / 3 ? 'large' : share >= 2 / 3 ? 'small' : 'medium';
    types[room.index] = pools[size].pop();
  }

  const rooms = rectangles.map((rect, index) => ({
    id: `room-${index}`,
    type: types[index],
    name: getRoomName(locale, types[index]),
    ...rect,
  }));
  return decorateRooms(rooms);
}

function findRoomForCell(rooms, row, col) {
  return rooms.find((room) => (
    row >= room.top && row < room.top + room.height
    && col >= room.left && col < room.left + room.width
  ));
}

function placeObjects(rows, cols, rooms, config, rng) {
  const cells = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const room = findRoomForCell(rooms, row, col);
      cells.push({
        key: cellKey(row, col),
        row,
        col,
        roomId: room.id,
        object: null,
        objectId: null,
        objectAnchor: false,
        occupiable: true,
      });
    }
  }

  const cellsByRoom = new Map(rooms.map((room) => [
    room.id,
    cells.filter((cell) => cell.roomId === room.id),
  ]));
  const targetObjects = Math.round(rows * cols * (config.obstacleRate + 0.07));
  const targetBlockingObjects = Math.round(targetObjects * 0.5);
  const roomObjectCount = new Map(rooms.map((room) => [room.id, 0]));
  const roomBlockedCount = new Map(rooms.map((room) => [room.id, 0]));
  const roomTypeCount = new Map();
  const globalTypeCount = new Map(Object.keys(OBJECT_TYPES).map((type) => [type, 0]));
  const objects = [];
  let placed = 0;

  function isOnWall(cell, room) {
    return cell.row === room.top
      || cell.row === room.top + room.height - 1
      || cell.col === room.left
      || cell.col === room.left + room.width - 1;
  }

  function rotateOffset([row, col], orientation) {
    if (orientation === 'east') return [col, -row];
    if (orientation === 'south') return [-row, -col];
    if (orientation === 'west') return [-col, row];
    return [row, col];
  }

  function candidatePlacements(room, type, zone = OBJECT_PLACEMENT_RULES[type].zone) {
    const rule = OBJECT_PLACEMENT_RULES[type];
    if (!rule.roomTypes.includes(room.type)) return [];
    const countKey = `${room.id}:${type}`;
    if ((roomTypeCount.get(countKey) ?? 0) >= rule.maxPerRoom) return [];

    const area = room.height * room.width;
    const objectLimit = Math.max(1, Math.floor(area * 0.32));
    if (roomObjectCount.get(room.id) >= objectLimit) return [];
    if (!OBJECT_TYPES[type].occupiable) {
      const blockedLimit = Math.min(area - 3, Math.max(1, Math.floor(area * 0.28)));
      if (roomBlockedCount.get(room.id) >= blockedLimit) return [];
    }

    const byKey = new Map(cellsByRoom.get(room.id).map((cell) => [cell.key, cell]));
    const orientations = ['north', 'east', 'south', 'west'];
    const candidates = [];
    for (const anchor of cellsByRoom.get(room.id)) {
      if (anchor.object) continue;
      if (zone === 'wall' && !isOnWall(anchor, room)) continue;
      for (const footprint of OBJECT_TYPES[type].footprints) {
        for (const orientation of orientations) {
          const footprintCells = footprint
            .map((offset) => rotateOffset(offset, orientation))
            .map(([rowOffset, colOffset]) => byKey.get(cellKey(
              anchor.row + rowOffset,
              anchor.col + colOffset,
            )));
          if (footprintCells.some((cell) => !cell || cell.object)) continue;
          if (zone === 'center' && footprintCells.some((cell) => isOnWall(cell, room))) continue;
          if (!OBJECT_TYPES[type].occupiable) {
            const blockedLimit = Math.min(area - 3, Math.max(1, Math.floor(area * 0.28)));
            if (roomBlockedCount.get(room.id) + footprintCells.length > blockedLimit) continue;
          }
          candidates.push({ anchor, footprintCells, orientation });
        }
      }
    }
    return candidates;
  }

  function roomCanReceive(room, type) {
    const rule = OBJECT_PLACEMENT_RULES[type];
    return candidatePlacements(room, type).length > 0
      || (rule.zone === 'center' && candidatePlacements(room, type, 'any').length > 0);
  }

  function placeObject(type, requiredRoom = null) {
    const rule = OBJECT_PLACEMENT_RULES[type];
    const candidateRooms = (requiredRoom ? [requiredRoom] : rooms)
      .filter((room) => roomCanReceive(room, type))
      .map((room) => {
        const preferredCandidates = candidatePlacements(room, type);
        const fallbackCandidates = preferredCandidates.length
          ? preferredCandidates
          : candidatePlacements(room, type, 'any');
        const largestFootprint = Math.max(
          0,
          ...fallbackCandidates.map(({ footprintCells }) => footprintCells.length),
        );
        return {
          room,
          score: roomObjectCount.get(room.id) / (room.height * room.width)
            - (type === 'carpet' ? largestFootprint * 0.08 : 0)
            + rng() * 0.04,
        };
      })
      .sort((first, second) => first.score - second.score);
    const room = candidateRooms[0]?.room;
    if (!room) return false;

    let candidates = candidatePlacements(room, type);
    if (!candidates.length && rule.zone === 'center') {
      candidates = candidatePlacements(room, type, 'any');
    }
    if (type === 'carpet' && candidates.length) {
      const largestFootprint = Math.max(
        ...candidates.map(({ footprintCells }) => footprintCells.length),
      );
      candidates = candidates.filter(({ footprintCells }) => footprintCells.length === largestFootprint);
    }
    const candidate = sample(rng, candidates);
    if (!candidate) return false;

    const object = {
      id: `object-${objects.length}`,
      type,
      anchor: { row: candidate.anchor.row, col: candidate.anchor.col },
      footprint: candidate.footprintCells.map((cell) => cell.key),
      occupiableMask: OBJECT_TYPES[type].occupiable
        ? candidate.footprintCells.map((cell) => cell.key)
        : [],
      orientation: candidate.orientation,
      roomId: room.id,
    };
    objects.push(object);
    for (const cell of candidate.footprintCells) {
      cell.object = type;
      cell.objectId = object.id;
      cell.objectAnchor = cell.key === candidate.anchor.key;
      cell.occupiable = object.occupiableMask.includes(cell.key);
    }
    roomObjectCount.set(room.id, roomObjectCount.get(room.id) + 1);
    const countKey = `${room.id}:${type}`;
    roomTypeCount.set(countKey, (roomTypeCount.get(countKey) ?? 0) + 1);
    globalTypeCount.set(type, globalTypeCount.get(type) + 1);
    if (!OBJECT_TYPES[type].occupiable) {
      roomBlockedCount.set(
        room.id,
        roomBlockedCount.get(room.id) + candidate.footprintCells.length,
      );
    }
    placed += 1;
    return true;
  }

  const blockingTypes = Object.keys(OBJECT_TYPES)
    .filter((type) => !OBJECT_TYPES[type].occupiable)
    .filter((type) => rooms.some((room) => OBJECT_PLACEMENT_RULES[type].roomTypes.includes(room.type)))
    .map((type) => ({
      type,
      capacity: rooms.filter((room) => OBJECT_PLACEMENT_RULES[type].roomTypes.includes(room.type)).length,
      tieBreaker: rng(),
    }))
    .sort((first, second) => second.capacity - first.capacity || first.tieBreaker - second.tieBreaker)
    .map(({ type }) => type);
  const activeBlockingTypeCount = Math.min(
    blockingTypes.length,
    Math.max(
      1,
      Math.ceil(targetBlockingObjects / config.objectRepeatTarget)
        + (config.objectRepeatTarget > 1 && config.objectRepeatTarget < 4 ? 1 : 0),
    ),
  );
  const activeBlockingTypes = blockingTypes.slice(0, activeBlockingTypeCount);

  for (const featuredType of ['carpet', 'bed']) {
    if (placed < targetObjects) placeObject(featuredType);
  }

  for (let index = 0; index < targetBlockingObjects; index += 1) {
    const preferredTypes = shuffle(rng, activeBlockingTypes)
      .sort((first, second) => globalTypeCount.get(first) - globalTypeCount.get(second));
    const candidates = [
      ...preferredTypes.filter((type) => globalTypeCount.get(type) < config.objectRepeatTarget),
      ...preferredTypes.filter((type) => globalTypeCount.get(type) >= config.objectRepeatTarget),
      ...blockingTypes.filter((type) => !activeBlockingTypes.includes(type)),
    ];
    if (!candidates.some((type) => placeObject(type))) break;
  }

  const occupiableTypes = Object.keys(OBJECT_TYPES).filter((type) => OBJECT_TYPES[type].occupiable);
  for (let attempts = 0; placed < targetObjects && attempts < targetObjects * 12; attempts += 1) {
    const candidates = shuffle(rng, occupiableTypes)
      .sort((first, second) => globalTypeCount.get(first) - globalTypeCount.get(second));
    if (!candidates.some((type) => placeObject(type))) break;
  }

  // Every room receives at least one plausible object, even on very small grids.
  for (const room of rooms.filter((item) => roomObjectCount.get(item.id) === 0)) {
    const plausibleTypes = shuffle(
      rng,
      Object.keys(OBJECT_TYPES).filter((type) => OBJECT_PLACEMENT_RULES[type].roomTypes.includes(room.type)),
    ).sort((first, second) => Number(OBJECT_TYPES[second].occupiable) - Number(OBJECT_TYPES[first].occupiable));
    plausibleTypes.some((type) => placeObject(type, room));
  }

  return { cells, objects };
}

function getNeighbors(puzzleLike, cell, sameRoomOnly = true) {
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const byKey = puzzleLike.cellByKey ?? new Map(puzzleLike.cells.map((item) => [item.key, item]));
  return directions
    .map(([dr, dc]) => byKey.get(cellKey(cell.row + dr, cell.col + dc)))
    .filter(Boolean)
    .filter((neighbor) => !sameRoomOnly || neighbor.roomId === cell.roomId);
}

export function selectCharacterCount(rows, cols, density, difficulty = 'moyen', rng = Math.random) {
  const maxCharacters = Math.min(rows, cols);
  if (difficulty !== 'expert' || density >= 0.999) {
    return clamp(Math.round(maxCharacters * density), 4, maxCharacters);
  }

  const variability = maxCharacters >= 9 ? 0.2 : 0.14;
  const [minimumDensity, maximumDensity] = DIFFICULTIES.expert.densityRange;
  const effectiveDensity = clamp(
    density + (rng() * 2 - 1) * variability,
    minimumDensity,
    maximumDensity,
  );
  const exactCount = maxCharacters * effectiveDensity;
  const lowerCount = Math.floor(exactCount);
  const stochasticCount = lowerCount + (rng() < exactCount - lowerCount ? 1 : 0);
  return clamp(stochasticCount, 4, maxCharacters);
}

function chooseRowsAndCols(rows, cols, count, forcedRows, forcedCols, rng) {
  const rowSet = new Set(forcedRows);
  const colSet = new Set(forcedCols);
  const rowPool = shuffle(rng, [...Array(rows).keys()].filter((row) => !rowSet.has(row)));
  const colPool = shuffle(rng, [...Array(cols).keys()].filter((col) => !colSet.has(col)));
  while (rowSet.size < count && rowPool.length) rowSet.add(rowPool.pop());
  while (colSet.size < count && colPool.length) colSet.add(colPool.pop());
  return { rows: [...rowSet], cols: [...colSet] };
}

function findMatchingCells(selectedRows, selectedCols, cells, forbiddenRoomId, occupiedKeys, rng) {
  const cellByCoord = new Map(cells.map((cell) => [cell.key, cell]));
  const columns = new Set(selectedCols);
  const rowCandidates = selectedRows.map((row) => ({
    row,
    cols: selectedCols.filter((col) => {
      const cell = cellByCoord.get(cellKey(row, col));
      return cell && cell.occupiable && cell.roomId !== forbiddenRoomId && !occupiedKeys.has(cell.key);
    }),
  }));

  const assignment = new Map();
  const usedCols = new Set();

  function recurse() {
    if (assignment.size === rowCandidates.length) return true;
    const remaining = rowCandidates
      .filter(({ row }) => !assignment.has(row))
      .map((item) => ({
        ...item,
        available: item.cols.filter((col) => columns.has(col) && !usedCols.has(col)),
      }))
      .sort((a, b) => a.available.length - b.available.length);

    const current = remaining[0];
    if (!current || !current.available.length) return false;

    for (const col of shuffle(rng, current.available)) {
      assignment.set(current.row, col);
      usedCols.add(col);
      if (recurse()) return true;
      assignment.delete(current.row);
      usedCols.delete(col);
    }
    return false;
  }

  return recurse() ? assignment : null;
}

function generateSolution(rows, cols, rooms, cells, characters, victimId, rng) {
  const count = characters.length;
  const occupiable = cells.filter((cell) => cell.occupiable);
  const roomCells = rooms
    .map((room) => ({ room, cells: occupiable.filter((cell) => cell.roomId === room.id) }))
    .filter(({ cells: roomOccupants }) => roomOccupants.length >= 2);

  for (let attempt = 0; attempt < 450; attempt += 1) {
    const murderRoom = sample(rng, roomCells);
    const first = sample(rng, murderRoom.cells);
    const secondCandidates = murderRoom.cells.filter((cell) => cell.row !== first.row && cell.col !== first.col);
    if (!secondCandidates.length) continue;
    const second = sample(rng, secondCandidates);

    const selected = chooseRowsAndCols(rows, cols, count, [first.row, second.row], [first.col, second.col], rng);
    const remainingRows = selected.rows.filter((row) => row !== first.row && row !== second.row);
    const remainingCols = selected.cols.filter((col) => col !== first.col && col !== second.col);
    const occupiedKeys = new Set([first.key, second.key]);
    const matching = findMatchingCells(remainingRows, remainingCols, cells, murderRoom.room.id, occupiedKeys, rng);
    if (!matching) continue;

    const killer = sample(rng, characters.filter((character) => character.id !== victimId));
    const otherCharacters = shuffle(rng, characters.filter((character) => character.id !== victimId && character.id !== killer.id));
    const solution = {};
    solution[victimId] = first.key;
    solution[killer.id] = second.key;

    const matchedCells = shuffle(rng, [...matching.entries()].map(([row, col]) => cellKey(row, col)));
    otherCharacters.forEach((character, index) => {
      solution[character.id] = matchedCells[index];
    });

    const otherCells = Object.entries(solution)
      .filter(([characterId]) => characterId !== victimId)
      .map(([, key]) => cells.find((cell) => cell.key === key));
    const occupiedByOthers = new Set(otherCells.map((cell) => cell.key));
    const usedRows = new Set(otherCells.map((cell) => cell.row));
    const usedCols = new Set(otherCells.map((cell) => cell.col));
    const occupantsByRoom = new Map();
    for (const cell of otherCells) {
      occupantsByRoom.set(cell.roomId, (occupantsByRoom.get(cell.roomId) ?? 0) + 1);
    }
    const possibleVictimCells = occupiable.filter((cell) => (
      !occupiedByOthers.has(cell.key)
      && !usedRows.has(cell.row)
      && !usedCols.has(cell.col)
      && occupantsByRoom.get(cell.roomId) === 1
    ));
    if (possibleVictimCells.length !== 1 || possibleVictimCells[0].key !== first.key) continue;

    return { solution, killerId: killer.id, murderRoomId: murderRoom.room.id };
  }

  throw new Error('Unable to produce a valid placement for these dimensions.');
}

function generateGenericSolution(rows, cols, cells, characters, rng) {
  const count = characters.length;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const selected = chooseRowsAndCols(rows, cols, count, [], [], rng);
    const matching = findMatchingCells(selected.rows, selected.cols, cells, null, new Set(), rng);
    if (!matching) continue;
    const matchedCells = shuffle(rng, [...matching.entries()].map(([row, col]) => cellKey(row, col)));
    const solution = {};
    shuffle(rng, characters).forEach((character, index) => {
      solution[character.id] = matchedCells[index];
    });
    return solution;
  }
  throw new Error('Unable to produce a generic placement for these dimensions.');
}

function selectCaseType(requestedCaseType, rng) {
  if (CASE_TYPES[requestedCaseType]) return requestedCaseType;
  const roll = rng();
  let threshold = 0;
  for (const [caseType, profile] of Object.entries(CASE_TYPES)) {
    threshold += profile.weight;
    if (roll < threshold) return caseType;
  }
  return 'restrictedAccess';
}

function deriveCaseDisposition(caseType, rows, cols, rooms, cells, characters, victimId, rng) {
  const disposition = generateSolution(rows, cols, rooms, cells, characters, victimId, rng);
  return {
    ...disposition,
    caseRule: { type: caseType },
  };
}

function clueId(characterId, type, suffix = '') {
  return `${characterId}:${type}:${suffix}`;
}

function isBesideObject(puzzle, cell, objectType) {
  return getNeighbors(puzzle, cell, true).some((neighbor) => neighbor.object === objectType);
}

function distanceFromObject(puzzle, cell, objectType) {
  const matchingCells = puzzle.cells.filter((candidate) => candidate.object === objectType);
  return Math.min(
    Infinity,
    ...matchingCells.map((candidate) => (
      Math.abs(candidate.row - cell.row) + Math.abs(candidate.col - cell.col)
    )),
  );
}

function roomPosition(puzzle, cell) {
  const room = puzzle.rooms.find((candidate) => candidate.id === cell.roomId);
  const onHorizontalEdge = cell.row === room.top || cell.row === room.top + room.height - 1;
  const onVerticalEdge = cell.col === room.left || cell.col === room.left + room.width - 1;
  if (onHorizontalEdge && onVerticalEdge) return 'corner';
  if (onHorizontalEdge || onVerticalEdge) return 'edge';
  return 'center';
}

function isBesideCell(puzzle, first, second) {
  return first.roomId === second.roomId
    && Math.abs(first.row - second.row) + Math.abs(first.col - second.col) === 1;
}

function makeUnaryClue(characterId, type, value, description, strength = 1, category = 'direct') {
  return {
    id: clueId(characterId, type, typeof value === 'object' ? JSON.stringify(value) : String(value)),
    characterId,
    type,
    value,
    description,
    strength,
    category,
  };
}

function makeRelationClue(
  characterId,
  type,
  otherId,
  description,
  strength = 0.5,
  category = 'relation',
  value = null,
) {
  return {
    id: clueId(characterId, type, value == null ? otherId : `${otherId}:${JSON.stringify(value)}`),
    characterId,
    type,
    otherId,
    ...(value == null ? {} : { value }),
    description,
    strength,
    category,
  };
}

export function describeClue(puzzle, clue, locale = puzzle.locale) {
  const character = puzzle.characters.find((item) => item.id === clue.characterId);
  const other = clue.otherId
    ? puzzle.characters.find((item) => item.id === clue.otherId)
    : null;
  const parameters = {
    pronoun: character?.pronoun ?? '',
    other: other?.name ?? '',
    row: Number(clue.value) + 1,
    col: Number(clue.value) + 1,
  };

  switch (clue.type) {
    case 'victimNoTestimony':
      return translate(locale, 'clues.victimNoTestimony');
    case 'evidenceTrail':
      return translate(locale, 'clues.evidenceTrail');
    case 'restrictedAccess':
      return translate(locale, 'clues.restrictedAccess');
    case 'room': {
      const room = puzzle.rooms.find((item) => item.id === clue.value);
      return translate(locale, 'clues.room', { ...parameters, room: room?.name ?? '' });
    }
    case 'row':
      return translate(locale, 'clues.row', parameters);
    case 'col':
      return translate(locale, 'clues.col', parameters);
    case 'rowHalf':
      return translate(locale, `clues.rowHalf${clue.value === 'top' ? 'Top' : 'Bottom'}`, parameters);
    case 'colHalf':
      return translate(locale, `clues.colHalf${clue.value === 'left' ? 'Left' : 'Right'}`, parameters);
    case 'onObject':
      return translate(locale, 'clues.onObject', {
        ...parameters,
        object: getObjectCopy(locale, clue.value).indefinite,
      });
    case 'onlyOnObject':
      return translate(locale, 'clues.onlyOnObject', {
        ...parameters,
        object: getObjectCopy(locale, clue.value).indefinite,
      });
    case 'besideObject':
      return translate(locale, 'clues.besideObject', {
        ...parameters,
        object: getObjectCopy(locale, clue.value).afterOf,
      });
    case 'notBesideObject':
      return translate(locale, 'clues.notBesideObject', {
        ...parameters,
        object: getObjectCopy(locale, clue.value).label,
      });
    case 'distanceFromObject':
      return translate(locale, `clues.distanceFromObject${clue.value.distance === 1 ? 'One' : 'Many'}`, {
        ...parameters,
        distance: clue.value.distance,
        object: getObjectCopy(locale, clue.value.objectType).afterOf,
      });
    case 'roomContainsObject':
      return translate(locale, 'clues.roomContainsObject', {
        ...parameters,
        object: getObjectCopy(locale, clue.value).indefinite,
      });
    case 'distanceFromPerson':
      return translate(locale, `clues.distanceFromPerson${clue.value === 1 ? 'One' : 'Many'}`, {
        ...parameters,
        distance: clue.value,
      });
    case 'roomPosition':
      return translate(locale, `clues.roomPosition${clue.value[0].toUpperCase()}${clue.value.slice(1)}`, parameters);
    case 'aloneInRoom':
      return translate(locale, `clues.aloneInRoom${character?.gender === 'f' ? 'F' : 'M'}`);
    case 'sameRoom':
    case 'notSameRoom':
    case 'northOf':
    case 'southOf':
    case 'westOf':
    case 'eastOf':
    case 'besidePerson':
      return translate(locale, `clues.${clue.type}`, parameters);
    default:
      return '';
  }
}

export function describeHint(puzzle, character, type, locale = puzzle.locale) {
  const cell = puzzle.cellByKey.get(puzzle.solution[character.id]);
  const room = puzzle.rooms.find((item) => item.id === cell.roomId);
  return translate(locale, `hints.${type}`, {
    pronoun: character.pronoun,
    room: room.name,
    row: cell.row + 1,
    col: cell.col + 1,
  });
}

function generateCluePool(puzzle, rng) {
  const pool = [];
  const placements = puzzle.solution;
  const blockingObjectTypesPresent = [...new Set(
    puzzle.cells
      .filter((cell) => cell.object && !cell.occupiable)
      .map((cell) => cell.object),
  )];
  const roomOccupancy = new Map(puzzle.rooms.map((room) => [room.id, []]));
  const objectOccupancy = new Map();
  const roomObjectTypes = new Map(puzzle.rooms.map((room) => [room.id, new Set()]));
  for (const object of puzzle.objects) roomObjectTypes.get(object.roomId)?.add(object.type);
  for (const character of puzzle.characters) {
    const cell = puzzle.cellByKey.get(placements[character.id]);
    roomOccupancy.get(cell.roomId).push(character.id);
    if (cell.object) objectOccupancy.set(cell.object, (objectOccupancy.get(cell.object) ?? 0) + 1);
  }

  for (const character of puzzle.characters) {
    if (character.isVictim) {
      pool.push(makeUnaryClue(
        character.id,
        CASE_TYPES[puzzle.caseType].narrativeClue,
        puzzle.caseRule,
        '',
        0,
        'narrative',
      ));
      continue;
    }

    const cell = puzzle.cellByKey.get(placements[character.id]);
    pool.push(makeUnaryClue(character.id, 'room', cell.roomId, '', 0.82, 'direct'));
    pool.push(makeUnaryClue(character.id, 'row', cell.row, '', 1.35, 'exact'));
    pool.push(makeUnaryClue(character.id, 'col', cell.col, '', 1.35, 'exact'));

    const halfRow = cell.row < puzzle.rows / 2 ? 'top' : 'bottom';
    const halfCol = cell.col < puzzle.cols / 2 ? 'left' : 'right';
    pool.push(makeUnaryClue(
      character.id,
      'rowHalf',
      halfRow,
      '',
      0.35,
      'broad',
    ));
    pool.push(makeUnaryClue(
      character.id,
      'colHalf',
      halfCol,
      '',
      0.35,
      'broad',
    ));

    if (cell.object) {
      pool.push(makeUnaryClue(
        character.id,
        'onObject',
        cell.object,
        '',
        0.95,
        'object',
      ));
      if (objectOccupancy.get(cell.object) === 1) {
        pool.push(makeUnaryClue(
          character.id,
          'onlyOnObject',
          cell.object,
          '',
          0.82,
          'object',
        ));
      }
    }

    const position = roomPosition(puzzle, cell);
    pool.push(makeUnaryClue(
      character.id,
      'roomPosition',
      position,
      '',
      position === 'center' ? 0.48 : 0.35,
      'broad',
    ));

    for (const objectType of roomObjectTypes.get(cell.roomId)) {
      pool.push(makeUnaryClue(
        character.id,
        'roomContainsObject',
        objectType,
        '',
        0.46,
        'object',
      ));
    }

    for (const objectType of blockingObjectTypesPresent) {
      const distance = distanceFromObject(puzzle, cell, objectType);
      if (distance >= 1 && distance <= 3) {
        pool.push(makeUnaryClue(
          character.id,
          'distanceFromObject',
          { objectType, distance },
          '',
          0.62,
          'object',
        ));
      }
    }

    for (const objectType of blockingObjectTypesPresent) {
      if (isBesideObject(puzzle, cell, objectType)) {
        pool.push(makeUnaryClue(
          character.id,
          'besideObject',
          objectType,
          '',
          0.72,
          'object',
        ));
      } else if (rng() < 0.32) {
        pool.push(makeUnaryClue(
          character.id,
          'notBesideObject',
          objectType,
          '',
          0.18,
          'negative',
        ));
      }
    }

    if (roomOccupancy.get(cell.roomId).length === 1) {
      pool.push(makeUnaryClue(
        character.id,
        'aloneInRoom',
        true,
        '',
        0.75,
        'direct',
      ));
    }

    for (const other of puzzle.characters) {
      if (other.id === character.id || other.isVictim) continue;
      const otherCell = puzzle.cellByKey.get(placements[other.id]);
      if (cell.roomId === otherCell.roomId) {
        pool.push(makeRelationClue(
          character.id,
          'sameRoom',
          other.id,
          '',
          0.5,
        ));
      } else if (rng() < 0.16) {
        pool.push(makeRelationClue(
          character.id,
          'notSameRoom',
          other.id,
          '',
          0.15,
          'negative',
        ));
      }
      if (character.id < other.id && cell.row < otherCell.row) {
        pool.push(makeRelationClue(
          character.id,
          'northOf',
          other.id,
          '',
          0.3,
        ));
      } else if (character.id < other.id && cell.row > otherCell.row) {
        pool.push(makeRelationClue(
          character.id,
          'southOf',
          other.id,
          '',
          0.3,
        ));
      }
      if (character.id < other.id && cell.col < otherCell.col) {
        pool.push(makeRelationClue(
          character.id,
          'westOf',
          other.id,
          '',
          0.3,
        ));
      } else if (character.id < other.id && cell.col > otherCell.col) {
        pool.push(makeRelationClue(
          character.id,
          'eastOf',
          other.id,
          '',
          0.3,
        ));
      }
      if (isBesideCell(puzzle, cell, otherCell)) {
        pool.push(makeRelationClue(
          character.id,
          'besidePerson',
          other.id,
          '',
          0.9,
        ));
      }
      const personDistance = Math.abs(cell.row - otherCell.row) + Math.abs(cell.col - otherCell.col);
      if (character.id < other.id && personDistance >= 2 && personDistance <= 4) {
        pool.push(makeRelationClue(
          character.id,
          'distanceFromPerson',
          other.id,
          '',
          0.58,
          'relation',
          personDistance,
        ));
      }
    }
  }

  // Avoid duplicates generated by broad categories.
  const clues = [...new Map(pool.map((clue) => [clue.id, clue])).values()];
  for (const clue of clues) clue.description = describeClue(puzzle, clue, puzzle.locale);
  return clues;
}

const CONSTRAINT_EVALUATORS = {
  room: ({ clue, cell }) => cell.roomId === clue.value,
  row: ({ clue, cell }) => cell.row === clue.value,
  col: ({ clue, cell }) => cell.col === clue.value,
  rowHalf: ({ puzzle, clue, cell }) => (
    clue.value === 'top' ? cell.row < puzzle.rows / 2 : cell.row >= puzzle.rows / 2
  ),
  colHalf: ({ puzzle, clue, cell }) => (
    clue.value === 'left' ? cell.col < puzzle.cols / 2 : cell.col >= puzzle.cols / 2
  ),
  onObject: ({ clue, cell }) => cell.object === clue.value,
  onlyOnObject: ({ clue, cell }) => cell.object === clue.value,
  besideObject: ({ puzzle, clue, cell }) => isBesideObject(puzzle, cell, clue.value),
  notBesideObject: ({ puzzle, clue, cell }) => !isBesideObject(puzzle, cell, clue.value),
  distanceFromObject: ({ puzzle, clue, cell }) => (
    distanceFromObject(puzzle, cell, clue.value.objectType) === clue.value.distance
  ),
  roomContainsObject: ({ puzzle, clue, cell }) => puzzle.objects.some((object) => (
    object.roomId === cell.roomId && object.type === clue.value
  )),
  roomPosition: ({ puzzle, clue, cell }) => roomPosition(puzzle, cell) === clue.value,
  sameRoom: ({ cell, otherCell }) => cell.roomId === otherCell.roomId,
  notSameRoom: ({ cell, otherCell }) => cell.roomId !== otherCell.roomId,
  northOf: ({ cell, otherCell }) => cell.row < otherCell.row,
  southOf: ({ cell, otherCell }) => cell.row > otherCell.row,
  westOf: ({ cell, otherCell }) => cell.col < otherCell.col,
  eastOf: ({ cell, otherCell }) => cell.col > otherCell.col,
  besidePerson: ({ puzzle, cell, otherCell }) => isBesideCell(puzzle, cell, otherCell),
  distanceFromPerson: ({ cell, otherCell, clue }) => (
    Math.abs(cell.row - otherCell.row) + Math.abs(cell.col - otherCell.col) === clue.value
  ),
};

export function evaluateConstraint(puzzle, clue, placement, cell) {
  const evaluate = CONSTRAINT_EVALUATORS[clue.type];
  if (!evaluate) return true;
  const otherKey = clue.otherId ? placement[clue.otherId] : null;
  if (clue.otherId && !otherKey) return true;
  return evaluate({
    puzzle,
    clue,
    placement,
    cell,
    otherCell: otherKey ? puzzle.cellByKey.get(otherKey) : null,
  });
}

function unaryClueMatches(puzzle, clue, cell) {
  return evaluateConstraint(puzzle, clue, {}, cell);
}

function partialClueMatches(puzzle, clue, placement, cell) {
  return evaluateConstraint(puzzle, clue, placement, cell);
}

function fullClueMatches(puzzle, clue, placement) {
  const cell = puzzle.cellByKey.get(placement[clue.characterId]);
  if (!cell) return false;
  if (clue.type === 'aloneInRoom') {
    return Object.entries(placement)
      .filter(([id]) => id !== clue.characterId)
      .every(([, key]) => puzzle.cellByKey.get(key).roomId !== cell.roomId);
  }
  if (clue.type === 'onlyOnObject') {
    return cell.object === clue.value && Object.entries(placement)
      .filter(([id]) => id !== clue.characterId)
      .every(([, key]) => puzzle.cellByKey.get(key).object !== clue.value);
  }
  return partialClueMatches(puzzle, clue, placement, cell);
}

function caseRuleMatches(puzzle, placement) {
  const complete = Object.keys(placement).length === puzzle.characters.length;
  const victimKey = placement[puzzle.victimId];
  const victimRoomId = victimKey ? puzzle.cellByKey.get(victimKey).roomId : null;
  const victimCompanions = victimRoomId
    ? puzzle.characters.filter((character) => (
      !character.isVictim
      && placement[character.id]
      && puzzle.cellByKey.get(placement[character.id]).roomId === victimRoomId
    ))
    : [];
  return victimCompanions.length <= 1 && (!complete || victimCompanions.length === 1);
}

function relationForwardCheck(puzzle, clue, placement, domains) {
  const sourceKey = placement[clue.characterId];
  const otherKey = placement[clue.otherId];
  if (sourceKey && otherKey) return fullClueMatches(puzzle, clue, placement);

  const sourceCells = sourceKey ? [puzzle.cellByKey.get(sourceKey)] : domains.get(clue.characterId);
  const otherCells = otherKey ? [puzzle.cellByKey.get(otherKey)] : domains.get(clue.otherId);
  if (!sourceCells?.length || !otherCells?.length) return false;

  for (const sourceCell of sourceCells) {
    for (const candidateOther of otherCells) {
      const temp = { ...placement, [clue.otherId]: candidateOther.key };
      if (partialClueMatches(puzzle, clue, temp, sourceCell)) return true;
    }
  }
  return false;
}

export function solvePuzzle(puzzle, options = {}) {
  const maxSolutions = options.maxSolutions ?? 2;
  const collectSolutions = options.collectSolutions ?? false;
  const maxNodes = options.maxNodes ?? 250000;
  const clues = options.clues ?? puzzle.clues;
  const cluesByCharacter = new Map(puzzle.characters.map((character) => [character.id, []]));
  const relationClues = [];
  const exclusiveObjectOwners = new Map();
  for (const clue of clues) {
    cluesByCharacter.get(clue.characterId).push(clue);
    if (clue.otherId) relationClues.push(clue);
    if (clue.type === 'onlyOnObject') {
      const hasExistingOwner = exclusiveObjectOwners.has(clue.value);
      const existingOwner = exclusiveObjectOwners.get(clue.value);
      exclusiveObjectOwners.set(
        clue.value,
        hasExistingOwner && existingOwner !== clue.characterId ? null : clue.characterId,
      );
    }
  }

  const occupiableCells = puzzle.cells.filter((cell) => cell.occupiable);
  function matchesExclusiveObjects(characterId, cell) {
    for (const [objectType, ownerId] of exclusiveObjectOwners) {
      if (ownerId === null) return false;
      if (characterId === ownerId ? cell.object !== objectType : cell.object === objectType) return false;
    }
    return true;
  }

  const baseDomains = new Map();
  for (const character of puzzle.characters) {
    const unaryClues = cluesByCharacter.get(character.id).filter((clue) => !clue.otherId && clue.type !== 'aloneInRoom');
    baseDomains.set(character.id, occupiableCells.filter((cell) => (
      unaryClues.every((clue) => unaryClueMatches(puzzle, clue, cell))
      && matchesExclusiveObjects(character.id, cell)
    )));
  }

  const placement = {};
  const usedRows = new Set();
  const usedCols = new Set();
  const usedCells = new Set();
  const solutions = [];
  const stats = { nodes: 0, backtracks: 0, maxDepth: 0, aborted: false };

  function currentDomain(characterId) {
    return baseDomains.get(characterId).filter((cell) => (
      !usedRows.has(cell.row)
      && !usedCols.has(cell.col)
      && !usedCells.has(cell.key)
      && cluesByCharacter.get(characterId).every((clue) => (
        clue.type === 'aloneInRoom' || partialClueMatches(puzzle, clue, placement, cell)
      ))
    ));
  }

  function recurse(depth) {
    if (solutions.length >= maxSolutions || stats.aborted) return;
    stats.nodes += 1;
    if (stats.nodes > maxNodes) { stats.aborted = true; return; }
    stats.maxDepth = Math.max(stats.maxDepth, depth);

    if (depth === puzzle.characters.length) {
      if (!caseRuleMatches(puzzle, placement)) {
        stats.backtracks += 1;
        return;
      }
      if (!clues.every((clue) => fullClueMatches(puzzle, clue, placement))) {
        stats.backtracks += 1;
        return;
      }
      solutions.push({ ...placement });
      return;
    }

    const unassigned = puzzle.characters
      .filter((character) => !placement[character.id])
      .map((character) => ({ character, domain: currentDomain(character.id) }))
      .sort((a, b) => a.domain.length - b.domain.length);

    const next = unassigned[0];
    if (!next || !next.domain.length) {
      stats.backtracks += 1;
      return;
    }

    for (const cell of next.domain) {
      placement[next.character.id] = cell.key;
      usedRows.add(cell.row);
      usedCols.add(cell.col);
      usedCells.add(cell.key);

      const domains = new Map();
      let feasible = caseRuleMatches(puzzle, placement);
      if (feasible) {
        for (const character of puzzle.characters) {
          if (!placement[character.id]) {
            const domain = currentDomain(character.id);
            domains.set(character.id, domain);
            if (!domain.length) {
              feasible = false;
              break;
            }
          } else {
            domains.set(character.id, [puzzle.cellByKey.get(placement[character.id])]);
          }
        }
      }

      if (feasible) {
        feasible = relationClues.every((clue) => relationForwardCheck(puzzle, clue, placement, domains));
      }

      if (feasible) recurse(depth + 1);
      else stats.backtracks += 1;

      delete placement[next.character.id];
      usedRows.delete(cell.row);
      usedCols.delete(cell.col);
      usedCells.delete(cell.key);
      if (solutions.length >= maxSolutions) return;
    }
  }

  recurse(0);
  return {
    count: solutions.length,
    aborted: stats.aborted,
    solutions: collectSolutions ? solutions : [],
    firstSolution: solutions[0] ?? null,
    stats,
  };
}

function isSolutionUnique(puzzle, clues, maxNodes = 60000) {
  const result = solvePuzzle(puzzle, { clues, maxSolutions: 2, collectSolutions: false, maxNodes });
  return { unique: !result.aborted && result.count === 1, result };
}

function archetypeWeight(clue, caseType) {
  const bias = CASE_TYPES[caseType]?.clueBias;
  if (bias === 'object' && clue.category === 'object') return 1.45;
  if (bias === 'relation' && clue.category === 'relation') return 1.35;
  if (bias === 'room' && ['room', 'roomContainsObject', 'sameRoom', 'notSameRoom', 'aloneInRoom'].includes(clue.type)) {
    return 1.4;
  }
  return 1;
}

function clueFamily(clue) {
  if (clue.category === 'narrative') return 'narrative';
  if (clue.category === 'object' || clue.type === 'notBesideObject') return 'object';
  if (['room', 'roomPosition', 'aloneInRoom', 'sameRoom', 'notSameRoom'].includes(clue.type)) return 'room';
  if (CARDINAL_CLUE_TYPES.has(clue.type) || ['besidePerson', 'distanceFromPerson'].includes(clue.type)) {
    return 'person';
  }
  if (['row', 'col', 'rowHalf', 'colHalf'].includes(clue.type)) return 'coordinate';
  return clue.category;
}

function clueTypeWeight(clue) {
  if (DISTANCE_CLUE_TYPES.has(clue.type)) return 0.42;
  if (['onObject', 'onlyOnObject', 'besideObject'].includes(clue.type)) return 1.45;
  if (clue.type === 'roomContainsObject') return 1.2;
  if (CARDINAL_CLUE_TYPES.has(clue.type)) return 1.12;
  return 1;
}

function categoryWeight(clue, config, rng, caseType) {
  let weight = 1;
  if (clue.category === 'relation') weight *= 0.55 + config.relationBias * 2.5;
  if (clue.category === 'negative') weight *= 0.35 + config.negativeBias * 3.2;
  if (clue.category === 'exact') weight *= 1.65 - config.relationBias;
  if (clue.category === 'direct') weight *= 1.25 - config.relationBias * 0.45;
  if (clue.category === 'broad') weight *= 0.7 + config.relationBias;
  return weight * clueTypeWeight(clue) * archetypeWeight(clue, caseType) * (0.75 + rng() * 0.5);
}

function selectClues(puzzle, cluePool, difficulty, rng) {
  const config = DIFFICULTIES[difficulty];
  const selected = [];
  const selectedIds = new Set();
  const perCharacter = new Map(puzzle.characters.map((character) => [character.id, 0]));
  const exactPerCharacter = new Map(puzzle.characters.map((character) => [character.id, 0]));
  const cardinalPerCharacter = new Map(puzzle.characters.map((character) => [character.id, 0]));
  const distancePerCharacter = new Map(puzzle.characters.map((character) => [character.id, 0]));
  const occupiable = puzzle.cells.filter((cell) => cell.occupiable);
  let exactClueCount = 0;
  let cardinalClueCount = 0;
  let distanceClueCount = 0;
  let personDistanceClueCount = 0;

  function evidenceCountAfter(clue) {
    return selected.filter((item) => item.category !== 'narrative').length
      + (clue.category === 'narrative' ? 0 : 1);
  }

  function canAdd(clue) {
    if (!clue || selectedIds.has(clue.id)) return false;
    if (clue.category !== 'narrative') {
      const sameTypeCount = selected.filter((item) => item.type === clue.type).length;
      const maxSameType = Math.max(1, Math.floor(evidenceCountAfter(clue) * MAX_CLUE_TYPE_SHARE));
      if (sameTypeCount + 1 > maxSameType) return false;
    }
    if (CARDINAL_CLUE_TYPES.has(clue.type)) {
      if (cardinalPerCharacter.get(clue.characterId) >= 1) return false;
      if (cardinalClueCount + 1 > Math.floor(evidenceCountAfter(clue) * MAX_CARDINAL_CLUE_SHARE)) return false;
    }
    if (DISTANCE_CLUE_TYPES.has(clue.type)) {
      if (distancePerCharacter.get(clue.characterId) >= 1) return false;
      if (distanceClueCount + 1 > Math.floor(evidenceCountAfter(clue) * MAX_DISTANCE_CLUE_SHARE)) return false;
    }
    if (clue.type === 'distanceFromPerson') {
      if (personDistanceClueCount + 1 > Math.floor(evidenceCountAfter(clue) * MAX_PERSON_DISTANCE_CLUE_SHARE)) return false;
    }
    return clue.category !== 'exact'
      || (exactPerCharacter.get(clue.characterId) < 1 && exactClueCount < config.maxExactClues);
  }

  function add(clue) {
    if (!canAdd(clue)) return false;
    selected.push(clue);
    selectedIds.add(clue.id);
    perCharacter.set(clue.characterId, perCharacter.get(clue.characterId) + 1);
    if (clue.category === 'exact') {
      exactPerCharacter.set(clue.characterId, exactPerCharacter.get(clue.characterId) + 1);
      exactClueCount += 1;
    }
    if (CARDINAL_CLUE_TYPES.has(clue.type)) {
      cardinalPerCharacter.set(clue.characterId, cardinalPerCharacter.get(clue.characterId) + 1);
      cardinalClueCount += 1;
    }
    if (DISTANCE_CLUE_TYPES.has(clue.type)) {
      distancePerCharacter.set(clue.characterId, distancePerCharacter.get(clue.characterId) + 1);
      distanceClueCount += 1;
    }
    if (clue.type === 'distanceFromPerson') {
      personDistanceClueCount += 1;
    }
    return true;
  }

  function diversityWeight(clue) {
    const characterClues = selected.filter((item) => item.characterId === clue.characterId);
    if (!characterClues.length) return 1;
    return characterClues.some((item) => clueFamily(item) === clueFamily(clue)) ? 0.46 : 1.4;
  }

  function localDomainSize(characterId, extraClue = null) {
    const clues = selected
      .filter((clue) => clue.characterId === characterId && !clue.otherId && clue.type !== 'aloneInRoom');
    if (extraClue && !extraClue.otherId && extraClue.type !== 'aloneInRoom') clues.push(extraClue);
    return occupiable.filter((cell) => clues.every((clue) => unaryClueMatches(puzzle, clue, cell))).length;
  }

  function initialScore(clue) {
    const weights = {
      facile: { exact: 2.4, direct: 1.8, object: 1.7, broad: 0.45, relation: 0.35, negative: 0.2 },
      moyen: { exact: 0.72, direct: 1.65, object: 1.8, broad: 0.9, relation: 1.0, negative: 0.45 },
      difficile: { exact: 0.08, direct: 1.0, object: 1.5, broad: 1.35, relation: 1.7, negative: 1.0 },
      expert: { exact: 0.01, direct: 0.62, object: 1.15, broad: 1.55, relation: 2.0, negative: 1.5 },
    }[difficulty];
    return (weights[clue.category] ?? 0.5)
      * clueTypeWeight(clue)
      * archetypeWeight(clue, puzzle.caseType)
      * diversityWeight(clue)
      * (0.65 + clue.strength)
      * (0.85 + rng() * 0.3);
  }

  // Every character gets a clue card. Easier levels begin with denser, more direct evidence.
  const initialCount = difficulty === 'facile' ? 2 : 1;
  for (const character of puzzle.characters) {
    for (let i = 0; i < initialCount; i += 1) {
      const chosen = cluePool
        .filter((clue) => clue.characterId === character.id && canAdd(clue))
        .map((clue) => ({ clue, score: initialScore(clue) }))
        .sort((a, b) => b.score - a.score)[0]?.clue;
      add(chosen);
    }
  }

  let result = solvePuzzle(puzzle, {
    clues: selected,
    maxSolutions: 2,
    collectSolutions: true,
    maxNodes: 15000,
  });

  // Add only clues that eliminate a concrete alternative solution. This keeps cards concise.
  for (let guard = 0; guard < 36 && (result.aborted || result.count !== 1); guard += 1) {
    const alternative = result.solutions[1] ?? result.solutions[0] ?? null;
    const phase = guard / 36;
    let candidates = cluePool.filter(canAdd);

    if (alternative && result.count >= 2) {
      candidates = candidates.filter((clue) => !fullClueMatches(puzzle, clue, alternative));
    } else if (result.aborted) {
      // When the search space is still huge, add a strong unary anchor immediately.
      candidates = candidates.filter((clue) => !clue.otherId && clue.type !== 'aloneInRoom');
    }
    candidates = candidates.filter(canAdd);

    const domainBeforeByCharacter = new Map();
    const ranked = candidates.map((clue) => {
      const categoryProfile = categoryWeight(clue, config, rng, puzzle.caseType);
      const countPenalty = 1 / (1 + perCharacter.get(clue.characterId) * 1.25);
      const typeRepeatCount = selected.filter((item) => item.type === clue.type).length;
      const typeRepeatPenalty = 1 / (1 + typeRepeatCount * 0.55);
      const exactBase = { facile: 1.5, moyen: 0.42, difficile: 0.07, expert: 0.02 }[difficulty];
      const exactEscalation = clue.category === 'exact' ? exactBase + phase * phase * 2.2 : 1;
      const secondExactPenalty = clue.category === 'exact' && exactPerCharacter.get(clue.characterId) >= 1
        ? (phase > 0.72 ? 0.5 : 0.035)
        : 1;
      if (!domainBeforeByCharacter.has(clue.characterId)) {
        domainBeforeByCharacter.set(clue.characterId, localDomainSize(clue.characterId));
      }
      const domainBefore = domainBeforeByCharacter.get(clue.characterId);
      const domainAfter = localDomainSize(clue.characterId, clue);
      const localGain = clue.otherId ? 0.4 : Math.max(0, domainBefore - domainAfter) / Math.max(1, domainBefore);
      const alternativeBonus = alternative && result.count >= 2 ? 2.1 : 0;
      const abortedBoost = result.aborted
        ? (localGain * 12 + (clue.category === 'exact' ? 4.5 : clue.category === 'direct' ? 2.2 : 0.6))
        : 0;
      return {
        clue,
        score: (alternativeBonus + abortedBoost + localGain * 3.5 + clue.strength * 0.35 + 0.15)
          * categoryProfile * countPenalty * diversityWeight(clue) * typeRepeatPenalty
          * (result.aborted && clue.category === 'exact' ? 3.5 : exactEscalation) * secondExactPenalty,
      };
    }).sort((a, b) => b.score - a.score);

    const chosen = ranked[0]?.clue;
    if (!add(chosen)) break;

    result = solvePuzzle(puzzle, {
      clues: selected,
      maxSolutions: 2,
      collectSolutions: true,
      maxNodes: 20000 + guard * 1100,
    });
  }

  // Guaranteed bounded fallback, used only if the weak-clue search remained too broad.
  if (result.aborted || result.count !== 1) {
    const exactCandidates = cluePool
      .filter((clue) => clue.category === 'exact' && canAdd(clue))
      .sort((a, b) => exactPerCharacter.get(a.characterId) - exactPerCharacter.get(b.characterId));
    for (const clue of exactCandidates) {
      add(clue);
      result = solvePuzzle(puzzle, {
        clues: selected,
        maxSolutions: 2,
        collectSolutions: true,
        maxNodes: 90000,
      });
      if (!result.aborted && result.count === 1) break;
    }
  }

  // Harder levels discard redundant evidence while retaining at least one clue per character.
  if (!result.aborted && result.count === 1 && ['difficile', 'expert'].includes(difficulty)) {
    let checks = 0;
    for (const clue of shuffle(rng, selected)) {
      if (checks >= 14 || perCharacter.get(clue.characterId) <= 1) continue;
      checks += 1;
      const trial = selected.filter((item) => item.id !== clue.id);
      const trialEvidenceCount = trial.filter((item) => item.category !== 'narrative').length;
      const trialTypeCounts = new Map();
      for (const item of trial) {
        if (item.category !== 'narrative') {
          trialTypeCounts.set(item.type, (trialTypeCounts.get(item.type) ?? 0) + 1);
        }
      }
      const maxTrialTypeCount = Math.max(1, Math.floor(trialEvidenceCount * MAX_CLUE_TYPE_SHARE));
      if ([...trialTypeCounts.values()].some((count) => count > maxTrialTypeCount)) continue;
      const trialCardinalCount = trial.filter((item) => CARDINAL_CLUE_TYPES.has(item.type)).length;
      if (trialCardinalCount > Math.floor(trialEvidenceCount * MAX_CARDINAL_CLUE_SHARE)) continue;
      const trialDistanceCount = trial.filter((item) => DISTANCE_CLUE_TYPES.has(item.type)).length;
      if (trialDistanceCount > Math.floor(trialEvidenceCount * MAX_DISTANCE_CLUE_SHARE)) continue;
      const trialPersonDistanceCount = trial.filter((item) => item.type === 'distanceFromPerson').length;
      if (trialPersonDistanceCount > Math.floor(trialEvidenceCount * MAX_PERSON_DISTANCE_CLUE_SHARE)) continue;
      const check = solvePuzzle(puzzle, { clues: trial, maxSolutions: 2, maxNodes: 90000 });
      if (!check.aborted && check.count === 1) {
        const index = selected.findIndex((item) => item.id === clue.id);
        selected.splice(index, 1);
        selectedIds.delete(clue.id);
        perCharacter.set(clue.characterId, perCharacter.get(clue.characterId) - 1);
        if (clue.category === 'exact') {
          exactPerCharacter.set(clue.characterId, exactPerCharacter.get(clue.characterId) - 1);
          exactClueCount -= 1;
        }
        if (CARDINAL_CLUE_TYPES.has(clue.type)) {
          cardinalPerCharacter.set(clue.characterId, cardinalPerCharacter.get(clue.characterId) - 1);
          cardinalClueCount -= 1;
        }
        if (DISTANCE_CLUE_TYPES.has(clue.type)) {
          distancePerCharacter.set(clue.characterId, distancePerCharacter.get(clue.characterId) - 1);
          distanceClueCount -= 1;
        }
        if (clue.type === 'distanceFromPerson') {
          personDistanceClueCount -= 1;
        }
      }
    }
  }

  // Redundant confirmations are intentional only at the easier levels.
  const targetExtra = difficulty === 'facile'
    ? Math.round(puzzle.characters.length * 0.35)
    : difficulty === 'moyen'
      ? Math.round(puzzle.characters.length * 0.1)
      : 0;
  if (targetExtra > 0) {
    const extras = shuffle(rng, cluePool.filter(canAdd))
      .filter((clue) => difficulty !== 'facile' || ['exact', 'direct', 'object'].includes(clue.category));
    for (const clue of extras.slice(0, targetExtra)) add(clue);
  }

  const finalResult = solvePuzzle(puzzle, {
    clues: selected,
    maxSolutions: 2,
    maxNodes: 120000,
  });
  return {
    clues: selected,
    solverStats: finalResult.stats,
    unique: !finalResult.aborted && finalResult.count === 1,
  };
}

function createCharacters(count, rng, locale) {
  const profiles = [
    ...shuffle(rng, getCharacterNameProfiles(locale)).slice(0, count - 1),
    sample(rng, getVictimNameProfiles(locale)),
  ];
  return profiles.map((profile, index) => ({
    id: `char-${index}`,
    ...profile,
    avatarHue: Math.round((index * 360 / count + rng() * 25) % 360),
    isVictim: index === count - 1,
  }));
}

function createCaseTitleIndex(rng) {
  return Math.floor(rng() * getCaseTitleCount());
}

export function localizePuzzle(puzzle, locale = puzzle.locale) {
  const normalizedLocale = normalizeLocale(locale);
  puzzle.locale = normalizedLocale;
  puzzle.title = getCaseTitle(normalizedLocale, puzzle.titleIndex);

  for (const room of puzzle.rooms) {
    room.name = getRoomName(normalizedLocale, room.type);
  }
  for (const character of puzzle.characters) {
    Object.assign(character, getNameProfile(normalizedLocale, character.nameKey));
  }
  for (const clue of puzzle.clues) {
    clue.description = describeClue(puzzle, clue, normalizedLocale);
  }
  return puzzle;
}

export function generatePuzzle(options = {}) {
  const rows = clamp(Number(options.rows ?? 9), 4, 12);
  const cols = clamp(Number(options.cols ?? 9), 4, 12);
  const difficulty = DIFFICULTIES[options.difficulty] ? options.difficulty : 'moyen';
  const density = Number(clamp(
    Number(options.density ?? DIFFICULTIES[difficulty].defaultDensity),
    0.55,
    1,
  ).toFixed(4));
  const requestedCaseType = CASE_TYPES[options.caseType] ? options.caseType : 'mixed';
  const seed = String(options.seed ?? '').trim() || createRandomSeed();
  const locale = normalizeLocale(options.locale);
  const config = DIFFICULTIES[difficulty];
  const regenerationLimit = difficulty === 'expert' ? 200 : 50;

  for (let regeneration = 0; regeneration < regenerationLimit; regeneration += 1) {
    const generationKey = createGenerationKey(
      seed,
      rows,
      cols,
      density,
      difficulty,
      requestedCaseType,
      regeneration,
    );
    const rng = createRng(generationKey);
    const caseType = selectCaseType(requestedCaseType, rng);
    const characterCount = selectCharacterCount(rows, cols, density, difficulty, rng);
    const roomTarget = clamp(
      Math.round(Math.sqrt(rows * cols) * config.roomFactor),
      3,
      Math.min(9, Math.floor(rows * cols / 6)),
    );
    const rooms = buildRooms(rows, cols, roomTarget, rng, locale);
    const { cells, objects } = placeObjects(rows, cols, rooms, config, rng);
    const characters = createCharacters(characterCount, rng, locale);
    const victim = characters.at(-1);

    try {
      const disposition = deriveCaseDisposition(
        caseType,
        rows,
        cols,
        rooms,
        cells,
        characters,
        victim.id,
        rng,
      );
      const titleIndex = createCaseTitleIndex(rng);
      const puzzle = {
        version: GENERATOR_VERSION,
        id: createCaseId(generationKey),
        seed,
        generationKey,
        regeneration,
        locale,
        titleIndex,
        title: getCaseTitle(locale, titleIndex),
        rows,
        cols,
        density,
        difficulty,
        requestedCaseType,
        caseType,
        caseRule: disposition.caseRule,
        rooms,
        cells,
        objects,
        characters,
        victimId: victim.id,
        killerId: disposition.killerId,
        murderRoomId: disposition.murderRoomId,
        solution: disposition.solution,
        clues: [],
        solverStats: null,
      };
      puzzle.cellByKey = new Map(cells.map((cell) => [cell.key, cell]));

      const pool = generateCluePool(puzzle, rng);
      const selected = selectClues(puzzle, pool, difficulty, rng);
      if (!selected.unique) continue;
      puzzle.clues = selected.clues;
      puzzle.solverStats = selected.solverStats;
      puzzle.cluesByCharacter = Object.fromEntries(characters.map((character) => [
        character.id,
        puzzle.clues.filter((clue) => clue.characterId === character.id),
      ]));
      return localizePuzzle(puzzle, locale);
    } catch (error) {
      // Try a derived seed.
    }
  }

  throw new Error(translate(locale, 'errors.generationFailed'));
}

function getVictimCompanions(puzzle, placement) {
  const victimKey = placement[puzzle.victimId];
  const victimRoomId = victimKey ? puzzle.cellByKey.get(victimKey)?.roomId : null;
  if (!victimRoomId) return [];
  return puzzle.characters.filter((character) => (
    character.id !== puzzle.victimId
    && placement[character.id]
    && puzzle.cellByKey.get(placement[character.id])?.roomId === victimRoomId
  ));
}

export function getKillerFromPlacement(puzzle, placement) {
  const candidates = getVictimCompanions(puzzle, placement);
  return candidates.length === 1 ? candidates[0].id : null;
}

export function validatePlayerState(puzzle, placement) {
  const characterResults = {};
  let correctCount = 0;
  for (const character of puzzle.characters) {
    const placed = placement[character.id] ?? null;
    const correct = placed === puzzle.solution[character.id];
    characterResults[character.id] = { placed, correct };
    if (correct) correctCount += 1;
  }
  const complete = puzzle.characters.every((character) => Boolean(placement[character.id]));
  const victimCompanionCount = getVictimCompanions(puzzle, placement).length;
  const victimRoomValid = !complete || victimCompanionCount === 1;
  const caseRuleValid = !complete || caseRuleMatches(puzzle, placement);
  const inferredKillerId = complete && caseRuleValid
    ? getKillerFromPlacement(puzzle, placement)
    : null;
  const killerCorrect = inferredKillerId === puzzle.killerId;
  return {
    characterResults,
    correctCount,
    total: puzzle.characters.length,
    complete,
    victimCompanionCount,
    victimRoomValid,
    caseRuleValid,
    inferredKillerId,
    killerCorrect,
    solved: complete && caseRuleValid && correctCount === puzzle.characters.length && killerCorrect,
  };
}

export function serializePuzzle(puzzle) {
  const copy = { ...puzzle };
  delete copy.cellByKey;
  return JSON.stringify(copy, null, 2);
}
