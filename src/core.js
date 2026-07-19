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

export const GENERATOR_VERSION = 5;
export const RANDOM_SEED_LENGTH = 10;

const RANDOM_SEED_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const DIFFICULTIES = {
  facile: {
    roomFactor: 0.75,
    obstacleRate: 0.11,
    extraClues: 0.65,
    relationBias: 0.15,
    negativeBias: 0.05,
    maxExactClues: Infinity,
    objectRepeatTarget: 1,
  },
  moyen: {
    roomFactor: 0.9,
    obstacleRate: 0.15,
    extraClues: 0.35,
    relationBias: 0.35,
    negativeBias: 0.12,
    maxExactClues: 2,
    objectRepeatTarget: 2,
  },
  difficile: {
    roomFactor: 1.05,
    obstacleRate: 0.19,
    extraClues: 0.12,
    relationBias: 0.58,
    negativeBias: 0.24,
    maxExactClues: 0,
    objectRepeatTarget: 3,
  },
  expert: {
    roomFactor: 1.18,
    obstacleRate: 0.22,
    extraClues: 0,
    relationBias: 0.72,
    negativeBias: 0.38,
    maxExactClues: 0,
    objectRepeatTarget: 4,
  },
};

const ROOM_TYPES = {
  large: ['livingRoom', 'diningRoom', 'library', 'gallery', 'workshop', 'meetingRoom', 'indoorGarden'],
  medium: ['kitchen', 'office', 'bedroom', 'sunroom', 'archives', 'laboratory', 'musicRoom', 'studio', 'cafe'],
  small: ['bathroom', 'laundryRoom', 'storageRoom', 'vestibule', 'dressingRoom', 'warehouse', 'hall'],
};

export const OBJECT_TYPES = {
  chair: { icon: '♨', occupiable: true },
  bed: { icon: '▰', occupiable: true },
  carpet: { icon: '▧', occupiable: true },
  puddle: { icon: '≈', occupiable: true },
  table: { icon: '▣', occupiable: false },
  shelf: { icon: '▤', occupiable: false },
  plant: { icon: '♣', occupiable: false },
  counter: { icon: '▬', occupiable: false },
  statue: { icon: '♟', occupiable: false },
  tv: { icon: '▣', occupiable: false },
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

function createGenerationKey(seed, rows, cols, density, difficulty, regeneration) {
  return JSON.stringify([
    GENERATOR_VERSION,
    seed,
    rows,
    cols,
    density,
    difficulty,
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
  let placed = 0;

  function isOnWall(cell, room) {
    return cell.row === room.top
      || cell.row === room.top + room.height - 1
      || cell.col === room.left
      || cell.col === room.left + room.width - 1;
  }

  function roomCanReceive(room, type) {
    const rule = OBJECT_PLACEMENT_RULES[type];
    if (!rule.roomTypes.includes(room.type)) return false;
    const countKey = `${room.id}:${type}`;
    if ((roomTypeCount.get(countKey) ?? 0) >= rule.maxPerRoom) return false;

    const area = room.height * room.width;
    const objectLimit = Math.max(1, Math.floor(area * 0.55));
    if (roomObjectCount.get(room.id) >= objectLimit) return false;
    if (!OBJECT_TYPES[type].occupiable) {
      const blockedLimit = Math.min(area - 3, Math.max(1, Math.floor(area * 0.28)));
      if (roomBlockedCount.get(room.id) >= blockedLimit) return false;
    }

    const freeCells = cellsByRoom.get(room.id).filter((cell) => !cell.object);
    if (rule.zone === 'wall') return freeCells.some((cell) => isOnWall(cell, room));
    return freeCells.length > 0;
  }

  function placeObject(type, requiredRoom = null) {
    const rule = OBJECT_PLACEMENT_RULES[type];
    const candidateRooms = (requiredRoom ? [requiredRoom] : rooms)
      .filter((room) => roomCanReceive(room, type))
      .map((room) => ({
        room,
        score: roomObjectCount.get(room.id) / (room.height * room.width) + rng() * 0.04,
      }))
      .sort((first, second) => first.score - second.score);
    const room = candidateRooms[0]?.room;
    if (!room) return false;

    const freeCells = cellsByRoom.get(room.id).filter((cell) => !cell.object);
    const preferredCells = rule.zone === 'wall'
      ? freeCells.filter((cell) => isOnWall(cell, room))
      : rule.zone === 'center'
        ? freeCells.filter((cell) => !isOnWall(cell, room))
        : freeCells;
    const cell = sample(rng, preferredCells.length ? preferredCells : freeCells);
    if (!cell) return false;

    cell.object = type;
    cell.occupiable = OBJECT_TYPES[type].occupiable;
    roomObjectCount.set(room.id, roomObjectCount.get(room.id) + 1);
    const countKey = `${room.id}:${type}`;
    roomTypeCount.set(countKey, (roomTypeCount.get(countKey) ?? 0) + 1);
    globalTypeCount.set(type, globalTypeCount.get(type) + 1);
    if (!cell.occupiable) {
      roomBlockedCount.set(room.id, roomBlockedCount.get(room.id) + 1);
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

  return cells;
}

function getNeighbors(puzzleLike, cell, sameRoomOnly = true) {
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const byKey = puzzleLike.cellByKey ?? new Map(puzzleLike.cells.map((item) => [item.key, item]));
  return directions
    .map(([dr, dc]) => byKey.get(cellKey(cell.row + dr, cell.col + dc)))
    .filter(Boolean)
    .filter((neighbor) => !sameRoomOnly || neighbor.roomId === cell.roomId);
}

function selectCharacterCount(rows, cols, density) {
  const maxCharacters = Math.min(rows, cols);
  return clamp(Math.round(maxCharacters * density), 4, maxCharacters);
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

function clueId(characterId, type, suffix = '') {
  return `${characterId}:${type}:${suffix}`;
}

function isBesideObject(puzzle, cell, objectType) {
  return getNeighbors(puzzle, cell, true).some((neighbor) => neighbor.object === objectType);
}

function isBesideCell(puzzle, first, second) {
  return first.roomId === second.roomId
    && Math.abs(first.row - second.row) + Math.abs(first.col - second.col) === 1;
}

function makeUnaryClue(characterId, type, value, description, strength = 1, category = 'direct') {
  return {
    id: clueId(characterId, type, String(value)),
    characterId,
    type,
    value,
    description,
    strength,
    category,
  };
}

function makeRelationClue(characterId, type, otherId, description, strength = 0.5, category = 'relation') {
  return {
    id: clueId(characterId, type, otherId),
    characterId,
    type,
    otherId,
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
    case 'victimWithKiller':
      return translate(locale, 'clues.victimWithKiller');
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
  for (const character of puzzle.characters) {
    const cell = puzzle.cellByKey.get(placements[character.id]);
    roomOccupancy.get(cell.roomId).push(character.id);
  }

  for (const character of puzzle.characters) {
    if (character.isVictim) {
      pool.push(makeUnaryClue(
        character.id,
        'victimWithKiller',
        true,
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
      if (cell.row < otherCell.row) {
        pool.push(makeRelationClue(
          character.id,
          'northOf',
          other.id,
          '',
          0.3,
        ));
      } else if (cell.row > otherCell.row) {
        pool.push(makeRelationClue(
          character.id,
          'southOf',
          other.id,
          '',
          0.3,
        ));
      }
      if (cell.col < otherCell.col) {
        pool.push(makeRelationClue(
          character.id,
          'westOf',
          other.id,
          '',
          0.3,
        ));
      } else if (cell.col > otherCell.col) {
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
    }
  }

  // Avoid duplicates generated by broad categories.
  const clues = [...new Map(pool.map((clue) => [clue.id, clue])).values()];
  for (const clue of clues) clue.description = describeClue(puzzle, clue, puzzle.locale);
  return clues;
}

function unaryClueMatches(puzzle, clue, cell) {
  switch (clue.type) {
    case 'victimWithKiller': return true;
    case 'room': return cell.roomId === clue.value;
    case 'row': return cell.row === clue.value;
    case 'col': return cell.col === clue.value;
    case 'rowHalf': return clue.value === 'top' ? cell.row < puzzle.rows / 2 : cell.row >= puzzle.rows / 2;
    case 'colHalf': return clue.value === 'left' ? cell.col < puzzle.cols / 2 : cell.col >= puzzle.cols / 2;
    case 'onObject': return cell.object === clue.value;
    case 'besideObject': return isBesideObject(puzzle, cell, clue.value);
    case 'notBesideObject': return !isBesideObject(puzzle, cell, clue.value);
    default: return true;
  }
}

function partialClueMatches(puzzle, clue, placement, cell) {
  if (!['sameRoom', 'notSameRoom', 'northOf', 'southOf', 'westOf', 'eastOf', 'besidePerson'].includes(clue.type)) {
    return unaryClueMatches(puzzle, clue, cell);
  }

  const otherKey = placement[clue.otherId];
  if (!otherKey) return true;
  const otherCell = puzzle.cellByKey.get(otherKey);
  switch (clue.type) {
    case 'sameRoom': return cell.roomId === otherCell.roomId;
    case 'notSameRoom': return cell.roomId !== otherCell.roomId;
    case 'northOf': return cell.row < otherCell.row;
    case 'southOf': return cell.row > otherCell.row;
    case 'westOf': return cell.col < otherCell.col;
    case 'eastOf': return cell.col > otherCell.col;
    case 'besidePerson': return isBesideCell(puzzle, cell, otherCell);
    default: return true;
  }
}

function fullClueMatches(puzzle, clue, placement) {
  const cell = puzzle.cellByKey.get(placement[clue.characterId]);
  if (!cell) return false;
  if (clue.type === 'aloneInRoom') {
    return Object.entries(placement)
      .filter(([id]) => id !== clue.characterId)
      .every(([, key]) => puzzle.cellByKey.get(key).roomId !== cell.roomId);
  }
  return partialClueMatches(puzzle, clue, placement, cell);
}

function victimRoomRuleMatches(puzzle, placement) {
  const victimKey = placement[puzzle.victimId];
  if (!victimKey) return true;
  const victimRoom = puzzle.cellByKey.get(victimKey).roomId;
  const complete = Object.keys(placement).length === puzzle.characters.length;
  const sameRoomCount = Object.values(placement)
    .map((key) => puzzle.cellByKey.get(key))
    .filter((cell) => cell.roomId === victimRoom)
    .length;
  if (sameRoomCount > 2) return false;
  if (complete) return sameRoomCount === 2;
  return true;
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
  for (const clue of clues) {
    cluesByCharacter.get(clue.characterId).push(clue);
    if (clue.otherId) relationClues.push(clue);
  }

  const occupiableCells = puzzle.cells.filter((cell) => cell.occupiable);
  const baseDomains = new Map();
  for (const character of puzzle.characters) {
    const unaryClues = cluesByCharacter.get(character.id).filter((clue) => !clue.otherId && clue.type !== 'aloneInRoom');
    baseDomains.set(character.id, occupiableCells.filter((cell) => unaryClues.every((clue) => unaryClueMatches(puzzle, clue, cell))));
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
      if (!victimRoomRuleMatches(puzzle, placement)) {
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
      let feasible = victimRoomRuleMatches(puzzle, placement);
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

function categoryWeight(clue, config, rng) {
  let weight = 1;
  if (clue.category === 'relation') weight *= 0.55 + config.relationBias * 2.5;
  if (clue.category === 'negative') weight *= 0.35 + config.negativeBias * 3.2;
  if (clue.category === 'exact') weight *= 1.65 - config.relationBias;
  if (clue.category === 'direct') weight *= 1.25 - config.relationBias * 0.45;
  if (clue.category === 'broad') weight *= 0.7 + config.relationBias;
  return weight * (0.75 + rng() * 0.5);
}

function selectClues(puzzle, cluePool, difficulty, rng) {
  const config = DIFFICULTIES[difficulty];
  const selected = [];
  const selectedIds = new Set();
  const perCharacter = new Map(puzzle.characters.map((character) => [character.id, 0]));
  const exactPerCharacter = new Map(puzzle.characters.map((character) => [character.id, 0]));
  const occupiable = puzzle.cells.filter((cell) => cell.occupiable);
  let exactClueCount = 0;

  function canAdd(clue) {
    if (!clue || selectedIds.has(clue.id)) return false;
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
    return true;
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
    return (weights[clue.category] ?? 0.5) * (0.65 + clue.strength) * (0.85 + rng() * 0.3);
  }

  // Every character gets a clue card. Easier levels begin with denser, more direct evidence.
  const initialCount = difficulty === 'facile' ? 2 : 1;
  for (const character of puzzle.characters) {
    const candidates = cluePool
      .filter((clue) => clue.characterId === character.id)
      .filter(canAdd)
      .map((clue) => ({ clue, score: initialScore(clue) }))
      .sort((a, b) => b.score - a.score);

    for (let i = 0; i < initialCount; i += 1) {
      const chosen = (difficulty === 'expert' && !character.isVictim
        ? candidates.find(({ clue }) => clue.type === 'room' && canAdd(clue))
        : candidates.find(({ clue }) => canAdd(clue)))?.clue;
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
      const categoryProfile = categoryWeight(clue, config, rng);
      const countPenalty = 1 / (1 + perCharacter.get(clue.characterId) * 1.25);
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
          * categoryProfile * countPenalty * (result.aborted && clue.category === 'exact' ? 3.5 : exactEscalation) * secondExactPenalty,
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
  const density = Number(clamp(Number(options.density ?? 1), 0.55, 1).toFixed(4));
  const difficulty = DIFFICULTIES[options.difficulty] ? options.difficulty : 'moyen';
  const seed = String(options.seed ?? '').trim() || createRandomSeed();
  const locale = normalizeLocale(options.locale);
  const config = DIFFICULTIES[difficulty];
  const regenerationLimit = difficulty === 'expert' ? 200 : 50;

  for (let regeneration = 0; regeneration < regenerationLimit; regeneration += 1) {
    const generationKey = createGenerationKey(seed, rows, cols, density, difficulty, regeneration);
    const rng = createRng(generationKey);
    const characterCount = selectCharacterCount(rows, cols, density);
    const roomTarget = clamp(
      Math.round(Math.sqrt(rows * cols) * config.roomFactor),
      3,
      Math.min(9, Math.floor(rows * cols / 6)),
    );
    const rooms = buildRooms(rows, cols, roomTarget, rng, locale);
    const cells = placeObjects(rows, cols, rooms, config, rng);
    const characters = createCharacters(characterCount, rng, locale);
    const victim = characters.at(-1);

    try {
      const disposition = generateSolution(rows, cols, rooms, cells, characters, victim.id, rng);
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
        rooms,
        cells,
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
  const companions = getVictimCompanions(puzzle, placement);
  return companions.length === 1 ? companions[0].id : null;
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
  const inferredKillerId = complete && victimRoomValid
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
    inferredKillerId,
    killerCorrect,
    solved: complete && victimRoomValid && correctCount === puzzle.characters.length && killerCorrect,
  };
}

export function serializePuzzle(puzzle) {
  const copy = { ...puzzle };
  delete copy.cellByKey;
  return JSON.stringify(copy, null, 2);
}
