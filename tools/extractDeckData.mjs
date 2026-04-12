import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());

const deckFiles = [
  {
    inputPath: path.join(root, 'Assets', 'decks', 'Events.json'),
    outputPath: path.join(root, 'frontend', 'src', 'data', 'eventCards.ts'),
    constName: 'EVENT_CARDS',
    typeName: 'EventCardDefinition',
    idPrefix: 'event',
    parser: 'default',
  },
  {
    inputPath: path.join(root, 'Assets', 'decks', 'Fear Cards.json'),
    outputPath: path.join(root, 'frontend', 'src', 'data', 'fearCards.ts'),
    constName: 'FEAR_CARDS',
    typeName: 'FearCardDefinition',
    idPrefix: 'fear',
    parser: 'default',
  },
  {
    inputPath: path.join(root, 'Assets', 'decks', 'Blight Cards.json'),
    outputPath: path.join(root, 'frontend', 'src', 'data', 'blightCards.ts'),
    constName: 'BLIGHT_CARDS',
    typeName: 'BlightCardDefinition',
    idPrefix: 'blight',
    parser: 'blight',
  },
  {
    inputPath: path.join(root, 'Assets', 'decks', 'Minor Powers.json'),
    outputPath: path.join(root, 'frontend', 'src', 'data', 'minorPowerCards.ts'),
    constName: 'MINOR_POWER_CARDS',
    typeName: 'PowerCardDefinition',
    idPrefix: 'minor',
    parser: 'power',
  },
  {
    inputPath: path.join(root, 'Assets', 'decks', 'Major Powers.json'),
    outputPath: path.join(root, 'frontend', 'src', 'data', 'majorPowerCards.ts'),
    constName: 'MAJOR_POWER_CARDS',
    typeName: 'PowerCardDefinition',
    idPrefix: 'major',
    parser: 'power',
  },
  {
    inputPath: path.join(root, 'Assets', 'decks', 'Spirits.json'),
    outputPath: path.join(root, 'frontend', 'src', 'data', 'spirits.ts'),
    constName: 'SPIRITS',
    typeName: 'SpiritDefinition',
    idPrefix: 'spirit',
    parser: 'spirit',
  },
];

const ELEMENT_ORDER = ['sun', 'moon', 'fire', 'air', 'water', 'earth', 'plant', 'animal'];

const ZERO_ELEMENTS = {
  sun: 0,
  moon: 0,
  fire: 0,
  air: 0,
  water: 0,
  earth: 0,
  plant: 0,
  animal: 0,
};

const slugify = (value) => {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const cloneZeroElements = () => ({ ...ZERO_ELEMENTS });

const parseElementString = (value) => {
  if (typeof value !== 'string') {
    return cloneZeroElements();
  }

  const chars = value.trim().split('');
  const elements = cloneZeroElements();
  for (let index = 0; index < ELEMENT_ORDER.length; index += 1) {
    const key = ELEMENT_ORDER[index];
    const parsed = Number.parseInt(chars[index] || '0', 10);
    elements[key] = Number.isFinite(parsed) ? parsed : 0;
  }
  return elements;
};

const parseThresholdsFromLuaState = (luaScriptState) => {
  if (typeof luaScriptState !== 'string' || luaScriptState.trim() === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(luaScriptState);
    const thresholds = Array.isArray(parsed?.thresholds) ? parsed.thresholds : [];
    return thresholds
      .map((threshold) => {
        if (typeof threshold?.elements !== 'string') {
          return null;
        }
        return {
          elements: parseElementString(threshold.elements),
        };
      })
      .filter((threshold) => threshold !== null);
  } catch {
    return [];
  }
};

const parsePowerLuaScript = (luaScript) => {
  if (typeof luaScript !== 'string') {
    return {
      cost: 0,
      elements: cloneZeroElements(),
    };
  }

  const energyMatch = luaScript.match(/(?:^|\n)\s*energy\s*=\s*(\d+)/i);
  const elementsMatch = luaScript.match(/(?:^|\n)\s*elements\s*=\s*"([0-9]+)"/i);

  const cost = energyMatch ? Number.parseInt(energyMatch[1], 10) : 0;
  const elements = elementsMatch ? parseElementString(elementsMatch[1]) : cloneZeroElements();

  return {
    cost: Number.isFinite(cost) ? cost : 0,
    elements,
  };
};

const parseCardImageData = (card, cardId) => {
  const customDeck = card?.CustomDeck && typeof card.CustomDeck === 'object' ? card.CustomDeck : null;
  const deckKey = String(Math.floor(cardId / 100));
  const imageData = customDeck && customDeck[deckKey] && typeof customDeck[deckKey] === 'object' ? customDeck[deckKey] : null;
  const faceUrl = typeof imageData?.FaceURL === 'string' ? imageData.FaceURL : '';
  const backUrl = typeof imageData?.BackURL === 'string' ? imageData.BackURL : '';

  return {
    faceUrl,
    backUrl,
  };
};

const collectCardsDeep = (value, output = []) => {
  if (!value || typeof value !== 'object') {
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectCardsDeep(item, output));
    return output;
  }

  if (value.Name === 'CardCustom' && Number.isFinite(Number(value.CardID))) {
    output.push(value);
  }

  if (Array.isArray(value.ContainedObjects)) {
    value.ContainedObjects.forEach((entry) => collectCardsDeep(entry, output));
  }
  if (Array.isArray(value.ChildObjects)) {
    value.ChildObjects.forEach((entry) => collectCardsDeep(entry, output));
  }

  return output;
};

const extractCards = (rawJson, idPrefix) => {
  const objectStates = Array.isArray(rawJson?.ObjectStates) ? rawJson.ObjectStates : [];
  const deckState = objectStates.find((state) => state && Array.isArray(state.ContainedObjects));
  if (!deckState) {
    throw new Error('Could not find deck state with ContainedObjects');
  }

  const containedObjects = deckState.ContainedObjects;
  return containedObjects
    .map((card) => {
      const cardId = Number(card?.CardID);
      if (!Number.isFinite(cardId)) {
        return null;
      }

      const nickname = typeof card?.Nickname === 'string' ? card.Nickname : '';
      const customDeck = card?.CustomDeck && typeof card.CustomDeck === 'object' ? card.CustomDeck : null;
      const deckKey = String(Math.floor(cardId / 100));
      const imageData = customDeck && customDeck[deckKey] && typeof customDeck[deckKey] === 'object' ? customDeck[deckKey] : null;
      const faceUrl = typeof imageData?.FaceURL === 'string' ? imageData.FaceURL : '';
      const backUrl = typeof imageData?.BackURL === 'string' ? imageData.BackURL : '';
      if (!faceUrl || !backUrl) {
        return null;
      }

      return {
        id: `${idPrefix}-${cardId}`,
        name: nickname,
        faceUrl,
        backUrl,
      };
    })
    .filter((card) => card !== null);
};

const detectPowerSpeed = (card) => {
  const tags = Array.isArray(card?.Tags) ? card.Tags : [];
  if (tags.includes('Fast')) return 'fast';
  if (tags.includes('Slow')) return 'slow';
  return 'unknown';
};

const extractPowerCards = (rawJson, idPrefix, kind) => {
  const cards = collectCardsDeep(rawJson?.ObjectStates ?? []);
  return cards
    .map((card) => {
      const cardId = Number(card?.CardID);
      if (!Number.isFinite(cardId)) {
        return null;
      }

      const nickname = typeof card?.Nickname === 'string' ? card.Nickname : '';
      const { faceUrl, backUrl } = parseCardImageData(card, cardId);
      if (!faceUrl || !backUrl) {
        return null;
      }

      const parsedLua = parsePowerLuaScript(card?.LuaScript);
      const thresholds = parseThresholdsFromLuaState(card?.LuaScriptState);

      return {
        id: `${idPrefix}-${cardId}`,
        name: nickname,
        faceUrl,
        backUrl,
        speed: detectPowerSpeed(card),
        kind,
        cost: parsedLua.cost,
        elements: parsedLua.elements,
        thresholds,
      };
    })
    .filter((card) => card !== null);
};

const parseSpiritPanel = (bag) => {
  const contained = Array.isArray(bag?.ContainedObjects) ? bag.ContainedObjects : [];
  const panel = contained.find((entry) => entry?.Name === 'Custom_Tile' && entry?.Nickname === bag?.Nickname);
  if (!panel) {
    return { faceUrl: '', backUrl: '' };
  }

  const customImage = panel.CustomImage && typeof panel.CustomImage === 'object' ? panel.CustomImage : null;
  return {
    faceUrl: typeof customImage?.ImageURL === 'string' ? customImage.ImageURL : '',
    backUrl: typeof customImage?.ImageSecondaryURL === 'string' ? customImage.ImageSecondaryURL : '',
  };
};

const extractSpiritCards = (bag) => {
  const cards = collectCardsDeep(Array.isArray(bag?.ContainedObjects) ? bag.ContainedObjects : []);
  return cards
    .filter((card) => {
      const tags = Array.isArray(card?.Tags) ? card.Tags : [];
      return tags.includes('Unique') && !tags.includes('Aspect');
    })
    .map((card, index) => {
      const cardId = Number(card?.CardID);
      if (!Number.isFinite(cardId)) {
        return null;
      }

      const { faceUrl, backUrl } = parseCardImageData(card, cardId);
      if (!faceUrl || !backUrl) {
        return null;
      }

      const parsedLua = parsePowerLuaScript(card?.LuaScript);
      const thresholds = parseThresholdsFromLuaState(card?.LuaScriptState);
      const suffix = typeof card?.GUID === 'string' && card.GUID.length > 0 ? card.GUID : String(index + 1);
      return {
        id: `unique-${cardId}-${suffix}`,
        name: typeof card?.Nickname === 'string' ? card.Nickname : '',
        faceUrl,
        backUrl,
        speed: detectPowerSpeed(card),
        kind: 'unique',
        cost: parsedLua.cost,
        elements: parsedLua.elements,
        thresholds,
      };
    })
    .filter((card) => card !== null);
};

const extractSpirits = (rawJson) => {
  const objectStates = Array.isArray(rawJson?.ObjectStates) ? rawJson.ObjectStates : [];
  const rootState = objectStates.find((state) => state && Array.isArray(state.ContainedObjects));
  const contained = Array.isArray(rootState?.ContainedObjects) ? rootState.ContainedObjects : [];

  return contained
    .filter((entry) => entry?.Name === 'Custom_Model_Bag' && typeof entry?.Nickname === 'string' && entry.Nickname.trim().length > 0)
    .map((bag) => {
      const tags = Array.isArray(bag?.Tags) ? bag.Tags : [];
      const panel = parseSpiritPanel(bag);
      return {
        id: slugify(bag.Nickname),
        name: bag.Nickname,
        expansion: typeof bag?.Description === 'string' ? bag.Description : '',
        complexity: tags.find((tag) => ['Low', 'Moderate', 'High', 'Very High'].includes(tag)) || 'Unknown',
        panel,
        uniquePowers: extractSpiritCards(bag),
      };
    })
    .filter((spirit) => spirit.panel.faceUrl || spirit.uniquePowers.length > 0);
};

const parseBlightLuaScript = (luaScript) => {
  if (typeof luaScript !== 'string') {
    return { blightPerPlayer: 2, healthy: false };
  }

  const blightMatch = luaScript.match(/(?:^|\n)\s*blight\s*=\s*(\d+)/i);
  const blightPerPlayer = blightMatch ? Number(blightMatch[1]) : 2;
  const healthy = /(?:^|\n)\s*healthy\s*=\s*true/i.test(luaScript);

  return {
    blightPerPlayer: Number.isFinite(blightPerPlayer) && blightPerPlayer > 0 ? blightPerPlayer : 2,
    healthy,
  };
};

const extractBlightCards = (rawJson, idPrefix) => {
  const objectStates = Array.isArray(rawJson?.ObjectStates) ? rawJson.ObjectStates : [];
  const deckState = objectStates.find((state) => state && Array.isArray(state.ContainedObjects));
  if (!deckState) {
    throw new Error('Could not find deck state with ContainedObjects');
  }

  return deckState.ContainedObjects
    .map((card) => {
      const cardId = Number(card?.CardID);
      if (!Number.isFinite(cardId)) {
        return null;
      }

      const nickname = typeof card?.Nickname === 'string' ? card.Nickname : '';
      const customDeck = card?.CustomDeck && typeof card.CustomDeck === 'object' ? card.CustomDeck : null;
      const deckKey = String(Math.floor(cardId / 100));
      const imageData = customDeck && customDeck[deckKey] && typeof customDeck[deckKey] === 'object' ? customDeck[deckKey] : null;
      const faceUrl = typeof imageData?.FaceURL === 'string' ? imageData.FaceURL : '';
      const backUrl = typeof imageData?.BackURL === 'string' ? imageData.BackURL : '';
      if (!faceUrl || !backUrl) {
        return null;
      }

      const parsedLua = parseBlightLuaScript(card?.LuaScript);

      return {
        id: `${idPrefix}-${cardId}`,
        name: nickname,
        faceUrl,
        backUrl,
        blightPerPlayer: parsedLua.blightPerPlayer,
        healthy: parsedLua.healthy,
      };
    })
    .filter((card) => card !== null);
};

const renderTs = (cards, constName, typeName) => {
  const lines = [];
  lines.push("import { type DeckCardDefinition } from './deckCard';");
  lines.push('');
  lines.push(`export type ${typeName} = DeckCardDefinition;`);
  lines.push('');
  lines.push(`export const ${constName}: ${typeName}[] = ${JSON.stringify(cards, null, 2)};`);
  lines.push('');
  lines.push('const shuffleCards = <T,>(cards: T[]): T[] => {');
  lines.push('  const shuffled = [...cards];');
  lines.push('  for (let index = shuffled.length - 1; index > 0; index -= 1) {');
  lines.push('    const swapIndex = Math.floor(Math.random() * (index + 1));');
  lines.push('    const current = shuffled[index];');
  lines.push('    const swap = shuffled[swapIndex];');
  lines.push('    if (current !== undefined && swap !== undefined) {');
  lines.push('      shuffled[index] = swap;');
  lines.push('      shuffled[swapIndex] = current;');
  lines.push('    }');
  lines.push('  }');
  lines.push('  return shuffled;');
  lines.push('};');
  lines.push('');
  lines.push(`export const createShuffled${typeName.replace('Definition', 'Deck')} = () => {`);
  lines.push(`  return shuffleCards(${constName});`);
  lines.push('};');
  lines.push('');
  return lines.join('\n');
};

const renderPowerTs = (cards, constName, typeName) => {
  const lines = [];
  lines.push("import { type PowerCardDefinition } from './deckCard';");
  lines.push('');
  const dataType = typeName === 'PowerCardDefinition' ? 'PowerCardDefinition' : typeName;
  if (dataType !== 'PowerCardDefinition') {
    lines.push(`export type ${typeName} = PowerCardDefinition;`);
    lines.push('');
  }
  lines.push(`export const ${constName}: ${dataType}[] = ${JSON.stringify(cards, null, 2)};`);
  lines.push('');
  lines.push('const shuffleCards = <T,>(cards: T[]): T[] => {');
  lines.push('  const shuffled = [...cards];');
  lines.push('  for (let index = shuffled.length - 1; index > 0; index -= 1) {');
  lines.push('    const swapIndex = Math.floor(Math.random() * (index + 1));');
  lines.push('    const current = shuffled[index];');
  lines.push('    const swap = shuffled[swapIndex];');
  lines.push('    if (current !== undefined && swap !== undefined) {');
  lines.push('      shuffled[index] = swap;');
  lines.push('      shuffled[swapIndex] = current;');
  lines.push('    }');
  lines.push('  }');
  lines.push('  return shuffled;');
  lines.push('};');
  lines.push('');
  lines.push(`export const createShuffled${constName}Deck = () => {`);
  lines.push(`  return shuffleCards(${constName});`);
  lines.push('};');
  lines.push('');
  return lines.join('\n');
};

const renderSpiritTs = (spirits, constName, typeName) => {
  const lines = [];
  lines.push("import { type SpiritDefinition } from './deckCard';");
  lines.push('');
  const dataType = typeName === 'SpiritDefinition' ? 'SpiritDefinition' : typeName;
  if (dataType !== 'SpiritDefinition') {
    lines.push(`export type ${typeName} = SpiritDefinition;`);
    lines.push('');
  }
  lines.push(`export const ${constName}: ${dataType}[] = ${JSON.stringify(spirits, null, 2)};`);
  lines.push('');
  lines.push('export const SPIRIT_BY_ID: Record<string, SpiritDefinition> = Object.fromEntries(');
  lines.push(`  ${constName}.map((spirit) => [spirit.id, spirit])`);
  lines.push(');');
  lines.push('');
  return lines.join('\n');
};

const renderBlightTs = (cards, constName, typeName) => {
  const lines = [];
  lines.push("import { type DeckCardDefinition } from './deckCard';");
  lines.push('');
  lines.push(`export type ${typeName} = DeckCardDefinition & {`);
  lines.push('  blightPerPlayer: number;');
  lines.push('  healthy: boolean;');
  lines.push('};');
  lines.push('');
  lines.push(`export const ${constName}: ${typeName}[] = ${JSON.stringify(cards, null, 2)};`);
  lines.push('');
  lines.push('const shuffleCards = <T,>(cards: T[]): T[] => {');
  lines.push('  const shuffled = [...cards];');
  lines.push('  for (let index = shuffled.length - 1; index > 0; index -= 1) {');
  lines.push('    const swapIndex = Math.floor(Math.random() * (index + 1));');
  lines.push('    const current = shuffled[index];');
  lines.push('    const swap = shuffled[swapIndex];');
  lines.push('    if (current !== undefined && swap !== undefined) {');
  lines.push('      shuffled[index] = swap;');
  lines.push('      shuffled[swapIndex] = current;');
  lines.push('    }');
  lines.push('  }');
  lines.push('  return shuffled;');
  lines.push('};');
  lines.push('');
  lines.push(`export const createShuffled${typeName.replace('Definition', 'Deck')} = () => {`);
  lines.push(`  return shuffleCards(${constName});`);
  lines.push('};');
  lines.push('');
  return lines.join('\n');
};

for (const config of deckFiles) {
  const raw = JSON.parse(fs.readFileSync(config.inputPath, 'utf-8'));
  let output;
  let count = 0;

  if (config.parser === 'blight') {
    const cards = extractBlightCards(raw, config.idPrefix);
    output = renderBlightTs(cards, config.constName, config.typeName);
    count = cards.length;
  } else if (config.parser === 'power') {
    const kind = config.idPrefix === 'minor' ? 'minor' : 'major';
    const cards = extractPowerCards(raw, config.idPrefix, kind);
    output = renderPowerTs(cards, config.constName, config.typeName);
    count = cards.length;
  } else if (config.parser === 'spirit') {
    const spirits = extractSpirits(raw);
    output = renderSpiritTs(spirits, config.constName, config.typeName);
    count = spirits.length;
  } else {
    const cards = extractCards(raw, config.idPrefix);
    output = renderTs(cards, config.constName, config.typeName);
    count = cards.length;
  }

  fs.writeFileSync(config.outputPath, output, 'utf-8');
  console.log(`Wrote ${count} entries to ${config.outputPath}`);
}
