import { shuffleCards } from './deckUtils';

export type InvaderCardDefinition = {
  id: string;
  stage: 1 | 2 | 3;
  name: string;
  faceUrl: string;
  backUrl: string;
};

export const INVADER_CARDS: InvaderCardDefinition[] = [
  {
    id: 'stage-1-wetlands',
    stage: 1,
    name: 'Stage I Wetlands',
    faceUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517339785/F8F7FEA2B85A8CE2BD835CBBF5F77A4B38E79849/',
    backUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517339936/B154BEFDE4EF3B3CA2B9D626034F161FA6DA6476/',
  },
  {
    id: 'stage-1-mountains',
    stage: 1,
    name: 'Stage I Mountains',
    faceUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517340223/629B5A0F14188BABE71485D645B942C68A8CC2AB/',
    backUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517339936/B154BEFDE4EF3B3CA2B9D626034F161FA6DA6476/',
  },
  {
    id: 'stage-1-jungle',
    stage: 1,
    name: 'Stage I Jungle',
    faceUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517340394/7E4D76FA3AA24A55262C9A1C6986E6B9A10EB8F4/',
    backUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517339936/B154BEFDE4EF3B3CA2B9D626034F161FA6DA6476/',
  },
  {
    id: 'stage-1-sands',
    stage: 1,
    name: 'Stage I Sands',
    faceUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517340724/B8182B668E564E85FA66AF8B3C14667E0D3006FA/',
    backUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517339936/B154BEFDE4EF3B3CA2B9D626034F161FA6DA6476/',
  },
  {
    id: 'stage-2-coast',
    stage: 2,
    name: 'Stage 2 Coast',
    faceUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517341827/E8C6BC476CABC1305996359D99C0692A4F30A13F/',
    backUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517341073/C6FF3381E4EA093D5EC0C86E2B93455A98CF606A/',
  },
  {
    id: 'stage-2-mountains',
    stage: 2,
    name: 'Stage 2 Mountains',
    faceUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517341662/D923C72218369695914AF9C4533A720300050C82/',
    backUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517341073/C6FF3381E4EA093D5EC0C86E2B93455A98CF606A/',
  },
  {
    id: 'stage-2-sands',
    stage: 2,
    name: 'Stage 2 Sands',
    faceUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517341458/EBC99ECC0FE6F862E746D1B9B22D7B603B8FE002/',
    backUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517341073/C6FF3381E4EA093D5EC0C86E2B93455A98CF606A/',
  },
  {
    id: 'stage-2-wetlands',
    stage: 2,
    name: 'Stage 2 Wetlands',
    faceUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517341252/725819D7DBF33E21FFAB6487D98C018276238A73/',
    backUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517341073/C6FF3381E4EA093D5EC0C86E2B93455A98CF606A/',
  },
  {
    id: 'stage-2-jungle',
    stage: 2,
    name: 'Stage 2 Jungle',
    faceUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517340886/E1B819EB6C097350A6FA7EA85AC84AC3DD81A901/',
    backUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517341073/C6FF3381E4EA093D5EC0C86E2B93455A98CF606A/',
  },
  {
    id: 'stage-3-sands-mountains',
    stage: 3,
    name: 'Stage 3 Sands/Mountains',
    faceUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517343260/EBC13F22204EECE39C3D3A9B2981CF8AFBCCF660/',
    backUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517342292/1ED9753B105223BF810BDAFF57E2930B62810994/',
  },
  {
    id: 'stage-3-mountains-wetlands',
    stage: 3,
    name: 'Stage 3 Mountains/Wetlands',
    faceUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517343120/EF86B6A659385AB949BDAECC07FF152FD9ED3C73/',
    backUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517342292/1ED9753B105223BF810BDAFF57E2930B62810994/',
  },
  {
    id: 'stage-3-mountains-jungles',
    stage: 3,
    name: 'Stage 3 Mountains/Jungles',
    faceUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517342918/34C1B033A2F13A97F086B1016E2ECEDAC284F19A/',
    backUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517342292/1ED9753B105223BF810BDAFF57E2930B62810994/',
  },
  {
    id: 'stage-3-jungles-sands',
    stage: 3,
    name: 'Stage 3 Jungles/Sands',
    faceUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517342769/E8A6ABB261BFCCB1EB4B612985F3CB52F57547A4/',
    backUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517342292/1ED9753B105223BF810BDAFF57E2930B62810994/',
  },
  {
    id: 'stage-3-sands-wetlands',
    stage: 3,
    name: 'Stage 3 Sands/Wetlands',
    faceUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517342624/EA303F34B17E51461EC631AE5B8688117074015E/',
    backUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517342292/1ED9753B105223BF810BDAFF57E2930B62810994/',
  },
  {
    id: 'stage-3-jungles-wetlands',
    stage: 3,
    name: 'Stage 3 Jungles/Wetlands',
    faceUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517341990/ECF838494E8BE46F8380D740F7D4B83CDD070BA5/',
    backUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517342292/1ED9753B105223BF810BDAFF57E2930B62810994/',
  },
];

export const COASTAL_CARD_ID = 'stage-2-coast';

export const DEFAULT_INVADER_DECK: InvaderCardDefinition[] = [...INVADER_CARDS];

/**
 * Build the starting invader deck for a specific adversary level.
 *
 * If the adversary level has an invaderDeckOrder string (e.g., Scotland L4-6
 * "11223C23333"), the deck is built in that exact slot order:
 *   '1' = random Stage I card (non-coastal)
 *   '2' = random Stage II card (non-coastal)
 *   '3' = random Stage III card
 *   'C' = Stage II Coastal card, pinned to this slot
 *
 * Otherwise falls back to the standard 3-pile shuffle (createInvaderSetupDeck).
 *
 * Any cards not placed in the ordered deck are put in `removed`.
 */
export const createInvaderSetupDeckForAdversary = (
  invaderDeckOrder: string | null | undefined
): { deck: InvaderCardDefinition[]; removed: InvaderCardDefinition[] } => {
  if (!invaderDeckOrder) {
    return createInvaderSetupDeck();
  }

  const upperOrder = invaderDeckOrder.toUpperCase();
  const coastalCard = INVADER_CARDS.find((c) => c.id === COASTAL_CARD_ID);

  // 'C' means a pinned coastal slot — exclude coastal from the random Stage II pool so it
  // isn't double-counted.  Without 'C', coastal is a normal Stage II card that can be
  // randomly drawn or randomly excluded.
  const hasPinnedCoastal = upperOrder.includes('C');

  // Build shuffled pools for each stage
  const pool1 = shuffleCards(INVADER_CARDS.filter((c) => c.stage === 1));
  const pool2 = shuffleCards(
    INVADER_CARDS.filter((c) => c.stage === 2 && (!hasPinnedCoastal || c.id !== COASTAL_CARD_ID))
  );
  const pool3 = shuffleCards(INVADER_CARDS.filter((c) => c.stage === 3));

  const deck: InvaderCardDefinition[] = [];
  const usedIds = new Set<string>();

  for (const slot of upperOrder) {
    let card: InvaderCardDefinition | undefined;

    if (slot === 'C') {
      card = coastalCard;
    } else if (slot === '1') {
      card = pool1.find((c) => !usedIds.has(c.id));
    } else if (slot === '2' || slot === 'S') {
      // 'S' (Salt Deposits) is a special Stage II replacement — treat as a random Stage II draw
      card = pool2.find((c) => !usedIds.has(c.id));
    } else if (slot === '3') {
      card = pool3.find((c) => !usedIds.has(c.id));
    }

    if (card && !usedIds.has(card.id)) {
      deck.push(card);
      usedIds.add(card.id);
    }
  }

  // Everything not placed goes into removed
  const removed = INVADER_CARDS.filter((c) => !usedIds.has(c.id));

  return { deck, removed };
};

export const createInvaderSetupDeck = (): {
  deck: InvaderCardDefinition[];
  removed: InvaderCardDefinition[];
} => {
  const stage1 = shuffleCards(INVADER_CARDS.filter((card) => card.stage === 1));
  const stage2 = shuffleCards(INVADER_CARDS.filter((card) => card.stage === 2));
  const stage3 = shuffleCards(INVADER_CARDS.filter((card) => card.stage === 3));

  const removed: InvaderCardDefinition[] = [];

  const trimmedStage1 = [...stage1];
  const trimmedStage2 = [...stage2];
  const trimmedStage3 = [...stage3];

  const removedStage1 = trimmedStage1.pop();
  const removedStage2 = trimmedStage2.pop();
  const removedStage3 = trimmedStage3.pop();

  if (removedStage1) removed.push(removedStage1);
  if (removedStage2) removed.push(removedStage2);
  if (removedStage3) removed.push(removedStage3);

  return {
    deck: [...trimmedStage1, ...trimmedStage2, ...trimmedStage3],
    removed,
  };
};
