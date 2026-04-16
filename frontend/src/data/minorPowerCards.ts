import { type PowerCardDefinition } from './deckCard';
import { shuffleCards } from './deckUtils';

export const MINOR_POWER_CARDS: PowerCardDefinition[] = [
  {
    "id": "minor-131300",
    "name": "Scream Disease into the Wind",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517322481/4103112A8D2C904C81395842D557930ACF1518F9/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 1,
      "water": 1,
      "earth": 0,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-108400",
    "name": "Song of Sanctity",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517327411/36004414412B70FDC650005B08A0854D645F3BA1/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 1,
      "earth": 0,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-126200",
    "name": "Rites of the Land's Rejection",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517319169/CA8767FDAC36069B1E4CC7DE2D7FBF4EFEA967F5/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 1,
      "air": 0,
      "water": 0,
      "earth": 1,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-105600",
    "name": "Dark and Tangled Woods",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517332963/C8E470231E8293DEBCBC02585B247E438F23E840/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 0,
      "air": 0,
      "water": 0,
      "earth": 1,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-126000",
    "name": "Prowling Panthers",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517316833/4AE48BA7AC9F705FBF4AD3D555319642B358E788/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 1,
      "air": 0,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-128200",
    "name": "Domesticated Animals Go Berserk",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517324547/B5B9F7294AF790E8B03272A9817CBF7E6BD56E2F/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 1,
      "air": 0,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 1
    },
    "thresholds": [
      {
        "elements": {
          "sun": 0,
          "moon": 3,
          "fire": 0,
          "air": 0,
          "water": 0,
          "earth": 0,
          "plant": 0,
          "animal": 0
        }
      }
    ]
  },
  {
    "id": "minor-107900",
    "name": "Rain of Blood",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517329134/F271F89C4C10F20EE5D20534F5FD21C951F87275/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 1,
      "water": 1,
      "earth": 0,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-125900",
    "name": "Portents of Disaster",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517317309/946F0A1A9C6197F0E423974A7711A0D75AFA733B/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 1,
      "moon": 1,
      "fire": 0,
      "air": 1,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-108900",
    "name": "Encompassing Ward",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517331378/FA57F55B6ED096A98902F7B0D784EB1822493921/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 1,
      "earth": 1,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-108500",
    "name": "Steam Vents",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517327220/0E01793C9BBEF888766669AB688AAA186CD10A48/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 1,
      "air": 1,
      "water": 1,
      "earth": 1,
      "plant": 0,
      "animal": 0
    },
    "thresholds": [
      {
        "elements": {
          "sun": 0,
          "moon": 0,
          "fire": 0,
          "air": 0,
          "water": 0,
          "earth": 3,
          "plant": 0,
          "animal": 0
        }
      }
    ]
  },
  {
    "id": "minor-106300",
    "name": "Call of the Dahan Ways",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517334788/27BB4188682D849AB15673FB5A6B5AE7D1751D40/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 0,
      "air": 0,
      "water": 1,
      "earth": 0,
      "plant": 0,
      "animal": 1
    },
    "thresholds": [
      {
        "elements": {
          "sun": 0,
          "moon": 2,
          "fire": 0,
          "air": 0,
          "water": 0,
          "earth": 0,
          "plant": 0,
          "animal": 0
        }
      }
    ]
  },
  {
    "id": "minor-128800",
    "name": "Sucking Ooze",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517321751/227EC8C079F99CB23C277B3298C0CCC0F86A7D01/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 0,
      "air": 0,
      "water": 1,
      "earth": 1,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-129900",
    "name": "Gift of Twinned Days",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517323838/C65878A954A2858981E3523BFB02AB370F5AD422/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 1,
      "fire": 0,
      "air": 0,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-105800",
    "name": "Drift Down into Slumber",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517332095/9A556420FEDF54854ECD383348268865A9B901FF/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 1,
      "water": 0,
      "earth": 1,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-129400",
    "name": "Treacherous Waterways",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050881840149237446/082D607EE76183D9D485FD5F888B9D5CBDB2F7F9/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 1,
      "air": 0,
      "water": 1,
      "earth": 1,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-108800",
    "name": "Voracious Growth",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517326658/16567563AE0A1A419B4231A8B7529723BFD662B9/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 1,
      "earth": 0,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-126800",
    "name": "Absorb Corruption",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517315904/3E245C879BACD73E29DD989CA8B1D1ADB047CFBC/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 0,
      "earth": 1,
      "plant": 1,
      "animal": 0
    },
    "thresholds": [
      {
        "elements": {
          "sun": 0,
          "moon": 0,
          "fire": 0,
          "air": 0,
          "water": 0,
          "earth": 0,
          "plant": 2,
          "animal": 0
        }
      }
    ]
  },
  {
    "id": "minor-131100",
    "name": "Sunset's Fire Flows Across the Land",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517321601/37F616615A8AA76992E83C3CB879C484F5004400/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 1,
      "fire": 1,
      "air": 0,
      "water": 1,
      "earth": 0,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-127400",
    "name": "Cycles of Time and Tide",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517314323/8F33ED424997F728AFCFB85EE0F6830320D91926/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 1,
      "fire": 0,
      "air": 0,
      "water": 1,
      "earth": 0,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-106900",
    "name": "Delusions of Danger",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517332605/9636B97E2F7E82F6A7FCDB9C158C12EF7EDB7EA8/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 1,
      "fire": 0,
      "air": 1,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-126600",
    "name": "Sky Stretches to Shore",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517316433/5C09057E29DAA514DB8568845F0C62226F1C4B59/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 0,
      "air": 1,
      "water": 1,
      "earth": 1,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-128400",
    "name": "Entrap the Forces of Corruption",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517324784/DD3136F17205FB08C1430C62642ACC656C6599AE/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 0,
      "earth": 1,
      "plant": 1,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-128300",
    "name": "Dire Metamorphosis",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517324307/C9DF646F47D1CFB09BE909D60436A75112DDE08F/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 0,
      "air": 1,
      "water": 0,
      "earth": 1,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-130400",
    "name": "Dry Wood Explodes in Smoldering Splinters",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517325201/AA3C660BE668E143C4B87BDCFD741C8D90553274/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 1,
      "air": 1,
      "water": 0,
      "earth": 0,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-127600",
    "name": "Elusive Ambushes",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517313941/21542D835B0EFC921A0AF9DA5B155DAAB8249973/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 1,
      "air": 0,
      "water": 1,
      "earth": 0,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-108700",
    "name": "Veil the Night's Hunt",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517327572/64D6075D06BCFFBE06AD6C2A2F062139238FA47A/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 0,
      "air": 1,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-131200",
    "name": "Set Them on an Ever-Twisting Trail",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517322119/D7FE7276DE70AA87AA921A34D1340C87DC4CFCB1/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 1,
      "water": 0,
      "earth": 0,
      "plant": 1,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-108300",
    "name": "Shadow of the Burning Forest",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517327758/57037943E5623F583728052F13D233B4D3892FD5/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 1,
      "air": 0,
      "water": 0,
      "earth": 0,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-125800",
    "name": "Poisoned Dew",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517317536/9B90100C72C48974E92C5BD5D975CE30F792C8A5/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 1,
      "air": 0,
      "water": 1,
      "earth": 0,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-107300",
    "name": "Entrancing Apparitions",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517331013/8D3F8297842EF17A4EC69F40E0BFCD0F3FF13F84/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 0,
      "air": 1,
      "water": 1,
      "earth": 0,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-130800",
    "name": "Gift of Nature's Connection",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517324968/BC3C443442CD0FB1E717ACF9242EBD3A27D91AF1/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-128700",
    "name": "Sear Anger into the Wild Lands",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517322290/ED414D3AAA84E33BAF0F2299875DF6FBFE3F2838/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 1,
      "air": 0,
      "water": 0,
      "earth": 0,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-127200",
    "name": "Call to Trade",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517314709/36E031FEF1585460C12E7553E8C7AB06B618EE73/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 1,
      "water": 1,
      "earth": 1,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-128000",
    "name": "Spur on with Words of Fire",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517312792/AC2B927735D8F371B534FB987C1ADF72F8F52F94/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 1,
      "air": 1,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-126500",
    "name": "Scour the Land",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517316637/F1BA21E7353DB31D00164DDEA8F7B248455BD0FE/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 1,
      "water": 0,
      "earth": 1,
      "plant": 0,
      "animal": 0
    },
    "thresholds": [
      {
        "elements": {
          "sun": 0,
          "moon": 0,
          "fire": 0,
          "air": 3,
          "water": 0,
          "earth": 0,
          "plant": 0,
          "animal": 0
        }
      }
    ]
  },
  {
    "id": "minor-130000",
    "name": "Skies Herald the Season of Return",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517324047/4CCA55D3A457AE93FC570CDD463B24E05C964DB8/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 1,
      "fire": 0,
      "air": 0,
      "water": 0,
      "earth": 0,
      "plant": 1,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-127900",
    "name": "Teeming Rivers",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517312979/9EEAB3C356C1D0CE8707BCD416F7050E513C72C6/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 1,
      "earth": 0,
      "plant": 1,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-107400",
    "name": "Gift of Living Energy",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517330603/BBB22EE8D2B1D243DFEFE33CB806016EE36ECBCB/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 1,
      "air": 0,
      "water": 0,
      "earth": 0,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-127700",
    "name": "Tormenting Rotflies",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517313519/5C0FFEBEFBF07474553D45E7CB56D5A8E994C3A7/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 1,
      "water": 0,
      "earth": 0,
      "plant": 1,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-130900",
    "name": "Birds Cry Warning",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517326050/BA076D3AED5AF7B7541AE510CF7CA9675FFDB561/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 0,
      "air": 1,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-129700",
    "name": "Like Calls to Like",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517323481/ECD931499EF5CEE205E475E80EE780E74D9169C8/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 1,
      "earth": 0,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-129600",
    "name": "Unquenchable Flames",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517323305/F5D3485D0B689816F5FAB5DAF414EAEF32C6B58E/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 1,
      "air": 0,
      "water": 0,
      "earth": 1,
      "plant": 0,
      "animal": 0
    },
    "thresholds": [
      {
        "elements": {
          "sun": 0,
          "moon": 0,
          "fire": 2,
          "air": 0,
          "water": 0,
          "earth": 0,
          "plant": 0,
          "animal": 0
        }
      }
    ]
  },
  {
    "id": "minor-106600",
    "name": "Call to Migrate",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517333510/BBC35F218DCA46F15BE156B8F89F25114DAFF830/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 1,
      "air": 1,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-127500",
    "name": "Disorienting Landscape",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517314142/8CE6009ED631AD88ED4E1BD9DF309415DA2AA921/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 0,
      "air": 1,
      "water": 0,
      "earth": 0,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-106000",
    "name": "Nature's Resilience",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517329557/907B694AFF98EF3DE65CC7EE59BBB48FB6C467A9/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 0,
      "earth": 1,
      "plant": 1,
      "animal": 1
    },
    "thresholds": [
      {
        "elements": {
          "sun": 0,
          "moon": 0,
          "fire": 0,
          "air": 0,
          "water": 2,
          "earth": 0,
          "plant": 0,
          "animal": 0
        }
      }
    ]
  },
  {
    "id": "minor-125600",
    "name": "Here There Be Monsters",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517318691/8B4C72ED6E8B60FC5A99C479A4BD99EF00BFA05B/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 0,
      "air": 1,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-108600",
    "name": "Uncanny Melting",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517327044/1B5D782A0769E0FA8F7A32A6266E1C86C6D9A8C1/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 1,
      "fire": 0,
      "air": 0,
      "water": 1,
      "earth": 0,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-131000",
    "name": "Thriving Chokefungus",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517320985/9DE7095DD7217AF9F0E652EDE3F5A71479EE21DB/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 0,
      "air": 0,
      "water": 1,
      "earth": 0,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-130100",
    "name": "Terror Turns to Madness",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517321367/A512C74129A77661AD7F159ACFCE24E7576A841D/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 0,
      "air": 1,
      "water": 1,
      "earth": 0,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-127100",
    "name": "Call to Ferocity",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517315029/46B214B5C336E03BC246848F1C9A6CC936861001/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 1,
      "air": 0,
      "water": 0,
      "earth": 1,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-107200",
    "name": "Enticing Splendor",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517331203/6547FE6CAD00E889C7217427B0C38A4CB3BF045A/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 0,
      "air": 1,
      "water": 0,
      "earth": 0,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-130600",
    "name": "Carapaced Land",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517325685/387CA2A5B75951E0424B4F082044128EBA809A56/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 0,
      "earth": 1,
      "plant": 1,
      "animal": 1
    },
    "thresholds": [
      {
        "elements": {
          "sun": 0,
          "moon": 0,
          "fire": 0,
          "air": 0,
          "water": 0,
          "earth": 2,
          "plant": 0,
          "animal": 0
        }
      }
    ]
  },
  {
    "id": "minor-126300",
    "name": "Pact of the Joined Hunt",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517318329/F6B43271EAFC4A3834A7737A0948DF439FE12A80/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 0,
      "earth": 0,
      "plant": 1,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-108100",
    "name": "Rouse the Trees and Stones",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517328084/07CAF8620D17AF54C4B5B282D3CC923DACE07F81/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 1,
      "air": 0,
      "water": 0,
      "earth": 1,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-127300",
    "name": "Confounding Mists",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517314505/876D7462F3D38EAEB6652A9E08D15CEA6900EFC8/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 1,
      "water": 1,
      "earth": 0,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-105700",
    "name": "Sap the Strength of Multitudes",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517328650/0403E5C031A36A52976E326782D578E2C53163BE/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 1,
      "earth": 0,
      "plant": 0,
      "animal": 1
    },
    "thresholds": [
      {
        "elements": {
          "sun": 0,
          "moon": 0,
          "fire": 0,
          "air": 1,
          "water": 0,
          "earth": 0,
          "plant": 0,
          "animal": 0
        }
      }
    ]
  },
  {
    "id": "minor-128500",
    "name": "Hazards Spread Across the Island",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517326429/2EF38FD53A47BE88463A777D2AB0BECE5255C391/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 1,
      "air": 1,
      "water": 0,
      "earth": 1,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-107600",
    "name": "Gnawing Rootbiters",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517330176/5EF00EE4341831BB080B028439FAF197C47D01C2/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 0,
      "earth": 1,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-106200",
    "name": "Pull Beneath the Hungry Earth",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517328271/2797F63EA23F2587C06BA3A792999E97EFDD6974/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 0,
      "air": 0,
      "water": 1,
      "earth": 1,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-128600",
    "name": "Bats Scout for Raids by Darkness",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517326235/E6E0322AC13002FC39223F7095D74EC8015DCFA2/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 0,
      "air": 1,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-106500",
    "name": "Call to Isolation",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517333698/75466DEE8ECB2084FD11F09CEA19EAC50F5B3DA6/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 0,
      "air": 1,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-130700",
    "name": "Blood Draws Predators",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517325857/AD8577A831ED8E82CEA440FCB23668984AD5DD7B/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 1,
      "air": 0,
      "water": 1,
      "earth": 0,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-131400",
    "name": "Renewing Boon",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517322692/002720E055D13A2611B4765CB5236B5DE859335B/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 0,
      "earth": 1,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-129100",
    "name": "Favor of the Sun and Star-Lit Dark",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517320248/604E594BA1DE7143CB08D7A69185765AF7D980F0/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 1,
      "fire": 0,
      "air": 0,
      "water": 0,
      "earth": 0,
      "plant": 1,
      "animal": 0
    },
    "thresholds": [
      {
        "elements": {
          "sun": 2,
          "moon": 0,
          "fire": 0,
          "air": 0,
          "water": 0,
          "earth": 0,
          "plant": 0,
          "animal": 0
        }
      }
    ]
  },
  {
    "id": "minor-129500",
    "name": "Mesmerized Tranquility",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517323079/22148EAFCF818B636A70D792E260CDB40B92DEE6/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 1,
      "earth": 1,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-125200",
    "name": "Fire in the Sky",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517319900/831896A001F8210C530F4FB9F1A521661B401723/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 1,
      "air": 1,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-127000",
    "name": "Promises of Protection",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517315402/DC779793F68BB9387B2DDF4C563FCAA100E60A0F/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 0,
      "earth": 1,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-106100",
    "name": "Visions of Fiery Doom",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517326880/1B0C67EF37D03268A498BBA78BE39D902B4D4B66/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 1,
      "air": 0,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 0
    },
    "thresholds": [
      {
        "elements": {
          "sun": 0,
          "moon": 0,
          "fire": 2,
          "air": 0,
          "water": 0,
          "earth": 0,
          "plant": 0,
          "animal": 0
        }
      }
    ]
  },
  {
    "id": "minor-126900",
    "name": "Animated Wrackroot",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517315626/DA491D0B433E80AFD2540077A54DB5193A142903/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 1,
      "air": 0,
      "water": 0,
      "earth": 0,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-109000",
    "name": "Elemental Boon",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517331644/4F9D145AB79E6C849D926878FBB8CFED03C403F4/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-107800",
    "name": "Purifying Flame",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517328469/0B44BE03E9ACF0EA3B0D524BE6A4E69238396151/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 1,
      "air": 1,
      "water": 0,
      "earth": 0,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-108000",
    "name": "Reaching Grasp",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517329358/39C18B21812A437F6673FBFFB15B21150A9A118E/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 0,
      "air": 1,
      "water": 1,
      "earth": 0,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-126400",
    "name": "Razor-Sharp Undergrowth",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517317811/B6A158C2D7CA668963AFB52122C41D86F39020EB/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 0,
      "air": 0,
      "water": 0,
      "earth": 0,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-130300",
    "name": "Strong and Constant Currents",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517321934/1F9224079017038AF2BC2E2AAF4285B1E44E340C/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 1,
      "earth": 1,
      "plant": 0,
      "animal": 0
    },
    "thresholds": [
      {
        "elements": {
          "sun": 0,
          "moon": 0,
          "fire": 0,
          "air": 0,
          "water": 2,
          "earth": 0,
          "plant": 0,
          "animal": 0
        }
      }
    ]
  },
  {
    "id": "minor-107700",
    "name": "Lure of the Unknown",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517329749/5FC1419294F1D51DFE64D78D5305B96FAE0330C4/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 1,
      "air": 1,
      "water": 0,
      "earth": 0,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-105900",
    "name": "Land of Haunts and Embers",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517329981/967A336FD8D4AD82C7BDFABDFEF0FDA6D29A5E6A/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 1,
      "air": 1,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-129300",
    "name": "Flow Downriver, Blow Downwind",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517320596/81E14813764BC37661AAB2AC17C5CDB73E10385E/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 1,
      "water": 1,
      "earth": 0,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-105500",
    "name": "Devouring Ants",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517332329/81C9E05751242C00F71D1A1B437725CA43CCE0A5/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 0,
      "earth": 1,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-125500",
    "name": "Guardian Serpents",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517318941/8AFA63E883CB8DD9BB244B1288D48147266819EE/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 1,
      "fire": 0,
      "air": 0,
      "water": 0,
      "earth": 1,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-130200",
    "name": "Call to Guard",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517325519/E162E6375E697B25679FE841D78CA9805DC90D61/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 0,
      "air": 1,
      "water": 0,
      "earth": 1,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-127800",
    "name": "Twilight Fog Brings Madness",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517313322/933E9A0E12AC998A7D28A5AC211B664C525D5B17/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 1,
      "moon": 1,
      "fire": 0,
      "air": 1,
      "water": 1,
      "earth": 0,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-107000",
    "name": "Drought",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517331923/8F10C4AF482F0EE0E87496A589D9FBEEB97954C4/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 1,
      "air": 0,
      "water": 0,
      "earth": 1,
      "plant": 0,
      "animal": 0
    },
    "thresholds": [
      {
        "elements": {
          "sun": 3,
          "moon": 0,
          "fire": 0,
          "air": 0,
          "water": 0,
          "earth": 0,
          "plant": 0,
          "animal": 0
        }
      }
    ]
  },
  {
    "id": "minor-106400",
    "name": "Call to Bloodshed",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517333956/44405D84929515102E561F446408515DA23B0CDA/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 1,
      "air": 0,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-129800",
    "name": "Haunted by Primal Memories",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517323671/0D7F33A4EE1126ECEEAAFAFABA5037C6FD16AA14/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 0,
      "air": 1,
      "water": 0,
      "earth": 1,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-125400",
    "name": "Gold's Allure",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517319343/C315282148F0B82C92C581E3EC9BE7698BC80A0C/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 1,
      "air": 0,
      "water": 0,
      "earth": 1,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-126700",
    "name": "Swarming Wasps",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517316192/D5A5C10CE86D996B641FDAE454947BBA62A60A12/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 1,
      "air": 1,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-130500",
    "name": "Desiccating Winds",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517325357/91CF64A482765CDF106604305B6F7C75D5CBC6CA/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 1,
      "air": 1,
      "water": 0,
      "earth": 1,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-128900",
    "name": "The Shore Seethes with Hatred",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517321166/2CE8E99C4FCC145E9297ABB0509424E654F312BD/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 1,
      "air": 0,
      "water": 1,
      "earth": 1,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-125100",
    "name": "Inflame the Fires of Life",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517320066/DCAFEFA73FF220BF2FA121295E265F49799ED7FA/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 1,
      "air": 0,
      "water": 0,
      "earth": 0,
      "plant": 1,
      "animal": 1
    },
    "thresholds": [
      {
        "elements": {
          "sun": 0,
          "moon": 0,
          "fire": 0,
          "air": 0,
          "water": 0,
          "earth": 0,
          "plant": 0,
          "animal": 3
        }
      }
    ]
  },
  {
    "id": "minor-106800",
    "name": "Quicken the Earth's Struggles",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517328830/09EBDCC061E758D5F998D261D87716D0142F1EFF/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 1,
      "air": 0,
      "water": 0,
      "earth": 1,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-106700",
    "name": "Call to Tend",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517333255/B60E779979C40EDDDB21E5BFB1883F5F3F4F2B55/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 1,
      "earth": 0,
      "plant": 1,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-108200",
    "name": "Savage Mawbeasts",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517327916/E7028026F232E7018862B1879C14BA751AF7162C/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 1,
      "air": 0,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 1
    },
    "thresholds": [
      {
        "elements": {
          "sun": 0,
          "moon": 0,
          "fire": 0,
          "air": 0,
          "water": 0,
          "earth": 0,
          "plant": 0,
          "animal": 3
        }
      }
    ]
  },
  {
    "id": "minor-125300",
    "name": "Fleshrot Fever",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517319699/ABC2EA78F5A40246E32380E866A53D329230A8ED/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 1,
      "air": 1,
      "water": 1,
      "earth": 0,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-126100",
    "name": "Renewing Rain",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517319519/66577121690A5EA6316754075A75E5AE4770E294/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 1,
      "earth": 1,
      "plant": 1,
      "animal": 0
    },
    "thresholds": [
      {
        "elements": {
          "sun": 0,
          "moon": 0,
          "fire": 0,
          "air": 0,
          "water": 0,
          "earth": 0,
          "plant": 3,
          "animal": 0
        }
      }
    ]
  },
  {
    "id": "minor-129000",
    "name": "Weep for What Is Lost",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517320428/895576B2F5BC09D534BF1342ADA61FE4DABAEAE3/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 0,
      "fire": 1,
      "air": 0,
      "water": 1,
      "earth": 0,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-107100",
    "name": "Gift of Constancy",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517330845/D95A72C238F4827231A3D55BEEBC07CAD4B80A89/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "fast",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 0,
      "air": 0,
      "water": 0,
      "earth": 1,
      "plant": 0,
      "animal": 0
    },
    "thresholds": []
  },
  {
    "id": "minor-129200",
    "name": "Territorial Strife",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517322859/50712C87B697BE47512DB5B88C6DE84B32D300F5/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 1,
      "moon": 0,
      "fire": 1,
      "air": 0,
      "water": 0,
      "earth": 0,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-125700",
    "name": "Infested Aquifers",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517318072/F523F32958DDA35DF7190C2410FFC4813553EE90/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 1,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 0,
      "air": 0,
      "water": 1,
      "earth": 1,
      "plant": 0,
      "animal": 1
    },
    "thresholds": []
  },
  {
    "id": "minor-107500",
    "name": "Gift of Power",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517330359/513957B7FC869949B78C216850BC1CF962F3EA5D/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517305126/48D7B7BFCF9AC4267E6E624C3915466A4BCFA580/",
    "speed": "slow",
    "kind": "minor",
    "cost": 0,
    "elements": {
      "sun": 0,
      "moon": 1,
      "fire": 0,
      "air": 0,
      "water": 1,
      "earth": 1,
      "plant": 1,
      "animal": 0
    },
    "thresholds": []
  }
];

export const createShuffledMINOR_POWER_CARDSDeck = () => {
  return shuffleCards(MINOR_POWER_CARDS);
};
