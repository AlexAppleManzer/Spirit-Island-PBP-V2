import { type DeckCardDefinition } from './deckCard';

export type BlightCardDefinition = DeckCardDefinition & {
  blightPerPlayer: number;
  healthy: boolean;
};

export const BLIGHT_CARDS: BlightCardDefinition[] = [
  {
    "id": "blight-119400",
    "name": "Promising Farmlands",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517256071/CE8858AC09B29EBAEBC7928D8C0955A77858A0EC/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 4,
    "healthy": false
  },
  {
    "id": "blight-257100",
    "name": "Blight Corrodes the Spirit",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2308724646351053883/27A6D9872934F7E33F68A1369DB172FF1F93F5E3/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 4,
    "healthy": false
  },
  {
    "id": "blight-120100",
    "name": "All Things Weaken",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517258057/9F3F168E82A59F9E59CBDA129C4F3E55DC98ADF0/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 3,
    "healthy": false
  },
  {
    "id": "blight-257500",
    "name": "Slow Dissolution of Will",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2308724646351052319/7F43DFDACE721B08C077168D7F461F6CDE119FB8/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 3,
    "healthy": false
  },
  {
    "id": "blight-119800",
    "name": "A Pall upon the Land",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517256952/682C6F42088EFAB5C2342C2FFB8A7DECB48048B6/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 3,
    "healthy": false
  },
  {
    "id": "blight-120200",
    "name": "Thriving Communities",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517257855/48C331901526514369404B5725A7232E31D2A6CA/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 4,
    "healthy": false
  },
  {
    "id": "blight-257300",
    "name": "Intensifying Exploitation",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2308724646351053162/8B80E7A9819BBF8F3425EDCF3DECD60579342743/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 5,
    "healthy": false
  },
  {
    "id": "blight-120400",
    "name": "Untended Land Crumbles",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517257513/9D9F519CE33BA8AF4D6DFC980D7B190FCB526C19/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 4,
    "healthy": false
  },
  {
    "id": "blight-257600",
    "name": "The Border of Life and Death",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2308724646351051604/6A520E8DD1180FED6283E2308089BA2DC78A5846/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 1,
    "healthy": true
  },
  {
    "id": "blight-257400",
    "name": "Shattered Fragments of Power",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2308724646351052713/683823A8C9F05DEA898102EEE6C5D2CEF8395016/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 2,
    "healthy": false
  },
  {
    "id": "blight-120000",
    "name": "Invaders Find the Land to Their Liking",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517257317/8A0737D8C5B7651FEB75747F4F1A2E1ABC6BF25C/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 2,
    "healthy": true
  },
  {
    "id": "blight-111400",
    "name": "Memory Fades to Dust",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517255676/AC9C2339C0C8E7C1354A5428CB60A7283B43FC71/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 4,
    "healthy": false
  },
  {
    "id": "blight-257000",
    "name": "Attenuated Essence",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2308724646351054150/3200D91321537C6E0F3D0C5FF7A8BACA226A3D14/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 4,
    "healthy": false
  },
  {
    "id": "blight-120500",
    "name": "Unnatural Proliferation",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517258263/4CF7F5F970004BF5991E8437FA565F3BE8FD9F59/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 3,
    "healthy": false
  },
  {
    "id": "blight-119500",
    "name": "Disintegrating Ecosystem",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517256239/263612563B893BD74BF0C69F07F8511D35C14FA8/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 5,
    "healthy": false
  },
  {
    "id": "blight-119700",
    "name": "Erosion of Will",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517256791/302C6FF21A5AC438C5A63721593BF5BABA9B7462/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 3,
    "healthy": false
  },
  {
    "id": "blight-120300",
    "name": "Power Corrodes the Spirit",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517257680/56CAD8F3ED763633678D5BE292B98130443DF305/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 4,
    "healthy": false
  },
  {
    "id": "blight-119300",
    "name": "Back Against the Wall",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517255864/64A1523E6597F7DAB3A1C528EF927055E60CCAF0/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 2,
    "healthy": false
  },
  {
    "id": "blight-257200",
    "name": "Burn Brightest Before the End",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2308724646351053466/6CE0F82EF802EBF49E13D49E5545B36EA3AFF983/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 2,
    "healthy": false
  },
  {
    "id": "blight-119600",
    "name": "Aid from Lesser Spirits",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517256422/EC2494788CED79F38D3F5FFDC7A27AC0BF990677/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 2,
    "healthy": false
  },
  {
    "id": "blight-119900",
    "name": "Strong Earth Shatters Slowly",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517257134/A0F17DAE4205D2C2105D1D10BDB23A05BF5BB123/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 2,
    "healthy": true
  },
  {
    "id": "blight-111300",
    "name": "Downward Spiral",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517255260/57354E1B3D25B3A234D225A6FFC2163B44E48DD3/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 5,
    "healthy": false
  },
  {
    "id": "blight-257700",
    "name": "Thriving Crops",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2308724646351051288/C389FA9DE001430C6F7D06DCCDAB960D06491F9A/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050878574170533488/A8622308B70378FA14431072AD953D654E03E339/",
    "blightPerPlayer": 2,
    "healthy": true
  }
];

const shuffleCards = <T,>(cards: T[]): T[] => {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    const swap = shuffled[swapIndex];
    if (current !== undefined && swap !== undefined) {
      shuffled[index] = swap;
      shuffled[swapIndex] = current;
    }
  }
  return shuffled;
};

export const createShuffledBlightCardDeck = () => {
  return shuffleCards(BLIGHT_CARDS);
};
