/**
 * Spirit Island Adversaries — per-level data from official rulebooks.
 *
 * fearThresholds: [T1, T2, T3] cumulative revealed-card counts where terror
 *   level advances.  e.g. [3,6,9] → reveal cards 1-3 = TL1, 4-6 = TL2,
 *   7-9 = TL3, 9 revealed = TL4 (VICTORY).
 *   Derived from the "X (a/b/c)" column: T1=a, T2=a+b, T3=a+b+c.
 *
 * invaderDeckOrder: ordered string of card-slot tokens for the Invader Deck.
 *   '1' = random Stage I card        '2' = random Stage II
 *   '3' = random Stage III           'C' = Stage II Coastal Lands (Scotland)
 *   'S' = Stage II Salt Deposits (Habsburg Mining)
 *   Standard 12-card deck: '1112222333333' (3×I + 4×II + 5×III)
 */

export interface AdversaryLevel {
  level: number;
  difficulty: number;
  fearThresholds: number[];
  invaderDeckOrder: string;
  setupNotes?: string;
}

export interface Adversary {
  id: string;
  name: string;
  description: string;
  levels: AdversaryLevel[];
}

const STD = '1112222333333'; // standard 3×I + 4×II + 5×III

// ─── No Adversary ────────────────────────────────────────────────────────────

const NONE: Adversary = {
  id: 'none',
  name: 'No Adversary',
  description: 'Standard rules with no adversary modifications.',
  levels: [
    {
      level: 0,
      difficulty: 0,
      fearThresholds: [3, 6, 9],
      invaderDeckOrder: STD,
      setupNotes: 'Standard island setup.',
    },
  ],
};

// ─── Brandenburg-Prussia ──────────────────────────────────────────────────────
// Escalation — Land Rush: on each board with Town/City, add 1 Town to a land
// without Town.  Levels progressively strip Stage I/II cards and inject a
// Stage III card early, accelerating the Invader timeline.

const BRANDENBURG_PRUSSIA: Adversary = {
  id: 'brandenburg-prussia',
  name: 'Brandenburg-Prussia',
  description:
    'Efficient colonial bureaucracy. Progressively strips Stage I and II cards and injects a Stage III card early.',
  levels: [
    { level: 0, difficulty: 1,  fearThresholds: [3, 6, 9],  invaderDeckOrder: STD },
    { level: 1, difficulty: 2,  fearThresholds: [3, 6, 9],  invaderDeckOrder: STD,           setupNotes: 'Fast Start: During Setup, on each board add 1 Town to land #3.' },
    { level: 2, difficulty: 4,  fearThresholds: [3, 6, 9],  invaderDeckOrder: '111322223333', setupNotes: 'Surge of Colonists: When making the Invader Deck, put 1 of the Stage III cards between Stage I and Stage II.' },
    { level: 3, difficulty: 6,  fearThresholds: [3, 7, 10], invaderDeckOrder: '11322223333',  setupNotes: 'Efficient: When making the Invader Deck, remove an additional Stage I card.' },
    { level: 4, difficulty: 7,  fearThresholds: [4, 8, 11], invaderDeckOrder: '1132223333',   setupNotes: 'Aggressive Timetable: When making the Invader Deck, remove an additional Stage II card.' },
    { level: 5, difficulty: 9,  fearThresholds: [4, 8, 11], invaderDeckOrder: '132223333',    setupNotes: 'Ruthlessly Efficient: When making the Invader Deck, remove an additional Stage I card.' },
    { level: 6, difficulty: 10, fearThresholds: [4, 8, 12], invaderDeckOrder: '32223333',     setupNotes: 'Terrifyingly Efficient: When making the Invader Deck, remove all Stage I cards.' },
  ],
};

// ─── England ──────────────────────────────────────────────────────────────────
// Loss condition — Proud & Mighty Capital: if 7+ Town/City are ever in a single
// land, the Invaders win.
// Escalation — Building Boom: on each board with Town/City, Build in the land
// with the most Town/City.

const ENGLAND: Adversary = {
  id: 'england',
  name: 'England',
  description:
    'Naval power with a growing fear deck and a High Immigration extra-Build mechanic at higher levels.',
  levels: [
    { level: 0, difficulty: 1,  fearThresholds: [3, 7, 10], invaderDeckOrder: STD },
    { level: 1, difficulty: 3,  fearThresholds: [3, 7, 10], invaderDeckOrder: STD,  setupNotes: 'Indentured Servants Earn Land: Invader Build Cards affect matching lands without Invaders if adjacent to at least 2 Town/City.' },
    { level: 2, difficulty: 4,  fearThresholds: [4, 8, 11], invaderDeckOrder: STD,  setupNotes: 'Criminals and Malcontents: During Setup, on each board add 1 City to land #1 and 1 Town to land #2.' },
    { level: 3, difficulty: 6,  fearThresholds: [4, 9, 13], invaderDeckOrder: STD,  setupNotes: 'High Immigration (I): Place the "High Immigration" tile to the left of Ravage. Invaders take an extra Build action before Ravaging; cards slide left. Remove the tile when a Stage II card slides onto it.' },
    { level: 4, difficulty: 7,  fearThresholds: [4, 9, 14], invaderDeckOrder: STD,  setupNotes: 'High Immigration (full): The extra Build tile remains out the entire game.' },
    { level: 5, difficulty: 9,  fearThresholds: [4, 9, 14], invaderDeckOrder: STD,  setupNotes: 'Local Autonomy: Town/City have +1 Health.' },
    { level: 6, difficulty: 11, fearThresholds: [4, 9, 13], invaderDeckOrder: STD,  setupNotes: 'Independent Resolve: During Setup, add extra Fear per player to the Fear Pool. During any Invader Phase where no Fear Cards are resolved, perform the High Immigration Build twice.' },
  ],
};

// ─── Sweden ───────────────────────────────────────────────────────────────────
// Escalation — Swayed by the Invaders: after Invaders Explore into each land,
// if that land has at least as many Invaders as Dahan, replace 1 Dahan with
// 1 Town.

const SWEDEN: Adversary = {
  id: 'sweden',
  name: 'Sweden',
  description:
    'Heavy-mining adversary. Adds Blight when Ravage damage is high and upgrades Town/City damage at higher levels.',
  levels: [
    { level: 0, difficulty: 1, fearThresholds: [3, 6, 9],  invaderDeckOrder: STD },
    { level: 1, difficulty: 2, fearThresholds: [3, 6, 9],  invaderDeckOrder: STD, setupNotes: 'Heavy Mining: If the Invaders do at least 6 Damage during Ravage, add an extra Blight. The additional Blight does not destroy Presence or cause cascades.' },
    { level: 2, difficulty: 3, fearThresholds: [3, 7, 10], invaderDeckOrder: STD, setupNotes: 'Population Pressure at Home: During Setup, on each board add 1 City to land #4. On boards where land #4 starts with Blight, put that Blight in land #5 instead.' },
    { level: 3, difficulty: 5, fearThresholds: [3, 7, 10], invaderDeckOrder: STD, setupNotes: 'Fine Steel for Tools and Guns: Town deal 3 Damage. City deal 5 Damage.' },
    { level: 4, difficulty: 6, fearThresholds: [3, 7, 11], invaderDeckOrder: STD, setupNotes: 'Royal Backing: During Setup, after adding all other Invaders, Accelerate the Invader Deck. On each board, add 1 Town to the land of that terrain with the fewest Invaders.' },
    { level: 5, difficulty: 7, fearThresholds: [4, 8, 12], invaderDeckOrder: STD, setupNotes: 'Mining Rush: When Ravaging adds at least 1 Blight to a land, also add 1 Town to an adjacent land without Town/City. Cascading Blight does not cause this effect.' },
    { level: 6, difficulty: 8, fearThresholds: [4, 8, 13], invaderDeckOrder: STD, setupNotes: 'Prospecting Outpost: During Setup, on each board add 1 Town and 1 Blight to land #8. The Blight comes from the box, not the Blight Card.' },
  ],
};

// ─── France (Plantation Colony) ───────────────────────────────────────────────
// Loss condition — Sprawling Plantations: before Setup, return all but 7 Town
// per player to the box; Invaders win if you ever cannot place a Town.
// Escalation — Demand for New Cash Crops: after Exploring, on each board pick a
// land of the shown terrain — if it has Town/City add 1 Blight, else add 1 Town.

const FRANCE: Adversary = {
  id: 'france',
  name: 'France',
  description:
    'Plantation colony (Branch & Claw). Rapid Blight spread, Town shortages, and growing Explorer presence.',
  levels: [
    { level: 0, difficulty: 2,  fearThresholds: [3, 6, 9],  invaderDeckOrder: STD },
    { level: 1, difficulty: 3,  fearThresholds: [3, 6, 9],  invaderDeckOrder: STD, setupNotes: 'Frontier Explorers: Except during Setup, after Invaders successfully Explore into a land with no Town/City, add 1 Explorer there.' },
    { level: 2, difficulty: 5,  fearThresholds: [3, 7, 10], invaderDeckOrder: STD, setupNotes: 'Slave Labor: During Setup, put the "Slave Rebellion" event under the top 3 Event Deck cards. After Invaders Build in a land with 2 or more Explorer, replace all but 1 Explorer there with an equal number of Town.' },
    { level: 3, difficulty: 7,  fearThresholds: [4, 8, 11], invaderDeckOrder: STD, setupNotes: 'Early Plantation: During Setup, on each board add 1 Town to the highest-numbered land without Town, and add 1 Town to land #1.' },
    { level: 4, difficulty: 8,  fearThresholds: [4, 8, 12], invaderDeckOrder: STD, setupNotes: 'Triangle Trade: Whenever Invaders Build a Coastal City, add 1 Town to the adjacent land with the fewest Town.' },
    { level: 5, difficulty: 9,  fearThresholds: [4, 9, 13], invaderDeckOrder: STD, setupNotes: 'Slow-Healing Ecosystem: When you remove Blight from the board, place it here instead of the Blight Card. When you have 3 Blight per player here, move it all back to the Blight Card.' },
    { level: 6, difficulty: 10, fearThresholds: [4, 9, 14], invaderDeckOrder: STD, setupNotes: 'Persistent Explorers: After resolving an Explore Card, on each board add 1 Explorer to a land without any. Fear Card effects cannot remove Explorer; you may instead Push that Explorer.' },
  ],
};

// ─── Habsburg Monarchy (Livestock Colony) ─────────────────────────────────────
// Loss condition — Irreparable Damage: track Blight from Ravages that deal 8+
// Damage; if that count ever exceeds the player count, Invaders win.
// Escalation — Seek Prime Territory: on each board with ≤4 Blight, add 1 Town
// to a land without Town/Blight; on boards with ≤2 Blight, do so again.

const HABSBURG_LIVESTOCK: Adversary = {
  id: 'habsburg-livestock',
  name: 'Habsburg Livestock Monarchy',
  description:
    'Livestock colony (Jagged Earth). Gathers Town via Migratory Herders; at level 3 removes a Stage I card.',
  levels: [
    { level: 0, difficulty: 2,  fearThresholds: [3, 7, 10], invaderDeckOrder: STD },
    { level: 1, difficulty: 3,  fearThresholds: [3, 7, 10], invaderDeckOrder: STD,          setupNotes: 'Migratory Herders: After the normal Build Step, in each land matching a Build Card, Gather 1 Town from a land not matching a Build Card (in board/land order).' },
    { level: 2, difficulty: 5,  fearThresholds: [4, 9, 11], invaderDeckOrder: STD,          setupNotes: 'More Rural Than Urban: During Setup, on each board add 1 Town to land #2 and 1 Town to the highest-numbered land without Setup symbols. During Play, when Invaders would Build 1 City in an Inland land, instead Build 2 Town.' },
    { level: 3, difficulty: 6,  fearThresholds: [4, 9, 12], invaderDeckOrder: '11222233333', setupNotes: 'Fast Spread: When making the Invader Deck, remove 1 additional Stage I card.' },
    { level: 4, difficulty: 8,  fearThresholds: [4, 9, 12], invaderDeckOrder: '11222233333', setupNotes: 'Herds Thrive in Verdant Lands: Town in lands without Blight are Durable — +2 Health, and "Destroy Town" effects instead deal 2 Damage per Town they could Destroy.' },
    { level: 5, difficulty: 9,  fearThresholds: [4, 10, 13], invaderDeckOrder: '11222233333', setupNotes: 'Wave of Immigration: Before the initial Explore, put the Habsburg Reminder Card under the top 5 Invader Cards. When revealed, on each board add 1 City to a Coastal land without City and 1 Town to the 3 Inland lands with the fewest Blight.' },
    { level: 6, difficulty: 10, fearThresholds: [5, 11, 14], invaderDeckOrder: '11222233333', setupNotes: 'Far-Flung Herds: Ravages do +2 Damage (total) if any adjacent lands have Town. (This does not cause lands without Invaders to Ravage.)' },
  ],
};

// ─── Russia ───────────────────────────────────────────────────────────────────
// Loss condition — Hunters Swarm the Island: put Beasts Destroyed by Adversary
// rules on this panel; if ever more Beasts are here than on the island, Invaders
// win.
// Escalation — Stalk the Predators: on each board add 2 Explorer (total) among
// lands with Beasts.

const RUSSIA: Adversary = {
  id: 'russia',
  name: 'Russia',
  description:
    'Hunter-based adversary (Jagged Earth). Beasts and Explorer interact; higher levels interleave Stage III cards into the deck.',
  levels: [
    { level: 0, difficulty: 1,  fearThresholds: [3, 6, 10], invaderDeckOrder: STD },
    { level: 1, difficulty: 3,  fearThresholds: [3, 6, 10], invaderDeckOrder: STD,           setupNotes: 'Hunters Bring Home Shell and Hide: During Setup, on each board add 1 Beasts and 1 Explorer to the highest-numbered land without Town/City. During Play, Explorer do +1 Damage. When Ravage adds Blight (including cascades), Destroy 1 Beasts in that land.' },
    { level: 2, difficulty: 4,  fearThresholds: [4, 7, 11], invaderDeckOrder: STD,           setupNotes: 'A Sense for Impending Disaster: The first time each Action would Destroy Explorer, 1 of those Explorer is instead Pushed; gain 1 Fear when you do so.' },
    { level: 3, difficulty: 6,  fearThresholds: [4, 8, 11], invaderDeckOrder: STD,           setupNotes: 'Competition Among Hunters: Ravage Cards also match lands with 3 or more Explorer. (If the land already matched the Ravage Card, it still Ravages just once.)' },
    { level: 4, difficulty: 7,  fearThresholds: [4, 8, 12], invaderDeckOrder: '111232323233', setupNotes: 'Accelerated Exploitation: When making the Invader Deck, put 1 Stage III Card after each Stage II Card.' },
    { level: 5, difficulty: 9,  fearThresholds: [4, 9, 13], invaderDeckOrder: '111232323233', setupNotes: 'Entrench in the Face of Fear: Put an unused Stage II Invader Card under the top 3 Fear Cards, and an unused Stage III Card under the top 7 Fear Cards. When one is revealed, immediately place it in the Build space (face-up).' },
    { level: 6, difficulty: 11, fearThresholds: [5, 10, 14], invaderDeckOrder: '111232323233', setupNotes: 'Pressure for Fast Profit: After the Ravage Step of turn 2+, on each board where it added no Blight, in the land with the most Explorer (min. 1), add 1 Explorer and 1 Town.' },
  ],
};

// ─── Scotland ─────────────────────────────────────────────────────────────────
// Loss condition — Trade Hub: if the number of Coastal lands with City is ever
// greater than (2 × # of boards), the Invaders win.
// Escalation — Ports Sprawl Outward: on the single board with the most Coastal
// Town/City, add 1 Town to the N lands with fewest Town (N = # of players).
//
// Level 2 introduces the Stage II Coastal Lands card (C) into a fixed deck slot.
// Level 4 replaces the bottom Stage I card with the bottom Stage III card.

const SCOTLAND: Adversary = {
  id: 'scotland',
  name: 'Scotland',
  description:
    'Trading nation (Promo Pack 2). Coastal Explore adds Town; higher levels use a fixed deck order including a Coastal Lands card.',
  levels: [
    { level: 0, difficulty: 1,  fearThresholds: [3, 7, 10], invaderDeckOrder: STD },
    { level: 1, difficulty: 3,  fearThresholds: [3, 7, 10], invaderDeckOrder: STD,           setupNotes: 'Trading Port: After Setup, in Coastal lands, Explore Cards add 1 Town instead of 1 Explorer. "Coastal Lands" Invader cards do this for at most 2 lands per board.' },
    { level: 2, difficulty: 4,  fearThresholds: [4, 8, 11], invaderDeckOrder: '11221C233333', setupNotes: 'Seize Opportunity: During Setup, add 1 City to land #2. Place "Coastal Lands" as the 3rd Stage II card, moving the two Stage II Cards above it up by one.' },
    { level: 3, difficulty: 6,  fearThresholds: [4, 9, 13], invaderDeckOrder: '11221C233333', setupNotes: 'Chart the Coastline: In Coastal lands, Build Cards affect lands without Invaders so long as there is an adjacent City.' },
    { level: 4, difficulty: 7,  fearThresholds: [5, 10, 14], invaderDeckOrder: '11223C23333', setupNotes: 'Ambition of a Minor Nation: During Setup, replace the bottom Stage I Card with the bottom Stage III Card.' },
    { level: 5, difficulty: 8,  fearThresholds: [5, 11, 15], invaderDeckOrder: '11223C23333', setupNotes: 'Runoff and Bilgewater: After a Ravage Action adds Blight to a Coastal Land, add 1 Blight to that board\'s Ocean (without cascading). Treat the Ocean as a Coastal Wetland for this rule and for Blight removal/movement.' },
    { level: 6, difficulty: 10, fearThresholds: [6, 12, 16], invaderDeckOrder: '11223C23333', setupNotes: 'Exports Fuel Inward Growth: After the Ravage step, add 1 Town to each Inland land that matches a Ravage card and is within 1 Range of Town/City.' },
  ],
};

// ─── Habsburg Mining Expedition ───────────────────────────────────────────────
// Loss condition — Land Stripped Bare: at the end of the Fast Phase, the
// Invaders win if any land has at least 8 total Invaders/Blight combined.
// Escalation — Mining Tunnels: after Advancing Invader Cards, on each board
// Explore in 2 lands whose terrains don't match a Ravage or Build Card (no
// source required).
//
// Level 4 introduces the Salt Deposits Stage II card (S) in a fixed deck slot;
// the Stage II Coastal Lands card is removed before randomly choosing Stage IIs.

const HABSBURG_MINING: Adversary = {
  id: 'habsburg-mining',
  name: 'Habsburg Mining Expedition',
  description:
    'Strip-mining operation (Nature Incarnate). Mining lands turn Build into Ravage and vice versa; upgrades Explorer into Towns.',
  levels: [
    { level: 0, difficulty: 1, fearThresholds: [3, 6, 9],  invaderDeckOrder: STD },
    { level: 1, difficulty: 3, fearThresholds: [3, 6, 9],  invaderDeckOrder: STD,            setupNotes: 'Avarice Rewarded: When Blight added by a Ravage Action would cascade, instead Upgrade 1 Explorer/Town (before Dahan counterattack). Ceaseless Mining: Lands with 3 or more Invaders are Mining lands — Disease and modifiers affect Ravage as though Build, and Build Cards cause Ravage (instead of Build) in those lands.' },
    { level: 2, difficulty: 4, fearThresholds: [3, 6, 10], invaderDeckOrder: STD,            setupNotes: 'Miners Come From Far and Wide: During Setup, add 1 Explorer in each land with no Dahan. Add 1 Disease and 1 City to the highest-numbered land with a Town Setup symbol.' },
    { level: 3, difficulty: 5, fearThresholds: [3, 7, 11], invaderDeckOrder: STD,            setupNotes: 'Mining Boom (I): After the Build Step, on each board choose a land with Explorer and Upgrade 1 Explorer there.' },
    { level: 4, difficulty: 7, fearThresholds: [4, 8, 12], invaderDeckOrder: '1112S2233333', setupNotes: 'Untapped Salt Deposits: During Setup, remove the Stage II "Coastal Lands" card before randomly choosing Stage II cards. Place the "Salt Deposits" card in place of the 2nd Stage II card.' },
    { level: 5, difficulty: 9, fearThresholds: [4, 9, 13], invaderDeckOrder: '1112S2233333', setupNotes: 'Mining Boom (II): Instead of Mining Boom (I), after the Build Step, on each board choose a land with Explorer: Build there, then Upgrade 1 Explorer. (Build normally in a Mining land.)' },
    { level: 6, difficulty: 10, fearThresholds: [4, 9, 13], invaderDeckOrder: '1112S2233333', setupNotes: 'The Empire Ascendant: During Setup and during the Explore Step, on boards with 3 or fewer Blight, add +1 Explorer in each land successfully explored (max 2 lands per board per Explore Card).' },
  ],
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const ADVERSARIES: Record<string, Adversary> = {
  none: NONE,
  'brandenburg-prussia': BRANDENBURG_PRUSSIA,
  england: ENGLAND,
  sweden: SWEDEN,
  france: FRANCE,
  'habsburg-livestock': HABSBURG_LIVESTOCK,
  russia: RUSSIA,
  scotland: SCOTLAND,
  'habsburg-mining': HABSBURG_MINING,
};

// ─── Accessors ────────────────────────────────────────────────────────────────

export const getAdversary = (id: string): Adversary | null =>
  ADVERSARIES[id.toLowerCase()] ?? null;

export const getAdversaryLevel = (id: string, level: number): AdversaryLevel | null => {
  const adversary = getAdversary(id);
  if (!adversary) return null;
  return adversary.levels.find((l) => l.level === level) ?? adversary.levels[0] ?? null;
};

export const listAdversaries = (): Adversary[] => Object.values(ADVERSARIES);

export const getAdversaryByName = (name: string): Adversary | null => {
  const normalized = name.toLowerCase().replace(/[\s-]/g, '');
  return (
    Object.values(ADVERSARIES).find(
      (a) => a.name.toLowerCase().replace(/[\s-]/g, '') === normalized
    ) ?? null
  );
};
