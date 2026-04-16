import { type DeckCardDefinition } from './deckCard';
import { shuffleCards } from './deckUtils';

export type EventCardDefinition = DeckCardDefinition & {
  /** If true, when this card is revealed a "Return under top 3" button appears instead of discarding */
  returnsUnderTop3?: boolean;
};

/** France L2+ only — shuffled into the event deck under the top 3 cards at setup */
export const SLAVE_REBELLION_CARD: EventCardDefinition = {
  id: 'slave-rebellion',
  name: 'Slave Rebellion',
  faceUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517238521/D0D6802A9900FAF956087539BD7757DE2CAC90CE/',
  backUrl: 'https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/',
  returnsUnderTop3: true,
};

export const EVENT_CARDS: EventCardDefinition[] = [
  {
    "id": "event-135500",
    "name": "Life's Balance Tilts",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517282956/07943D6BB310914831714568EE6EF31DDD04FBEA/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-132800",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517273472/29CF5CB6BFD9F7E875F7040D6F2801793B4BA446/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-134000",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517280155/8EE5A6077BF3959C6368080C66B001E642BB34EE/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-132400",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517274277/31DE51A0C8F8F1E6CB011B36DEC17061D2D7976E/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-133000",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517273039/DACCE1F9DB3F6544035798B4B8765835F171FD8C/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-136000",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517281346/AC0E758BC7ABA7A0B90019193488D7265414172D/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-252200",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2308724646351055307/78BB635E2EF9D98E9BA4F63E0115C5D74AFD8C27/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-136700",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517282294/3D17DEA3AA206BE8B02A0FBDE2E2E32FC4A78F48/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-251900",
    "name": "Ethereal Conjunction",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2308724646351056609/BE6F0C9CA35034E2A1009B5C0972ED1851BC262F/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-134600",
    "name": "Remnants of a Spirit's Heart",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517283794/C8CAB1449BD29CDB16479943DD09F4AAC0041228/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-135800",
    "name": "Lesser Spirits Imperiled",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517283975/91BCBC41AF9E36E5F417A0B2BDF922CA7DFD9EEC/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-132300",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517274513/446E2E9816F563BB9A90341A00F70D87A80C9DC3/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-134300",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517279322/4A8E96D4F8E2A30A95CC6820E1A92E8BF210B1A8/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-133400",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517272238/78B45CCF75B219C161C8641E268F6A23D8348006/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-134900",
    "name": "Hard Working Settlers",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517283332/AD26CFC98406E11466D062D6B33BAEDF56C70012/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-133300",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517272486/7563DD853519DF46B663F9331F6224FB65D20707/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-252000",
    "name": "Far-Off Wars Touch The Island",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2308724646351056371/110863DA364797FDD787A597919078DF35C6A537/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-252300",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2308724646351055079/A8D053AE630A4E0D7C60A6248540009D1C8A7E59/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-133500",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050881111369722972/0ABEF450C76A9BFAC5DF7BDD3023FDF833D4FAA3/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-132100",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517274971/2C8B41F06A08DD3DFB4F5C8B8A1C700EDBBDD061/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-134500",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517280343/3187FDDA3634A55BF1C568C0DEA89C174C8A46A1/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-252500",
    "name": "Visions Out of Time",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2308724646351056126/A79F46439863D56BD1D80D4006953B877CD7C890/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-135100",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517278849/9A85E366011A206EBE62CC66BD104BD6245D8FD7/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-132700",
    "name": "Rising Interest in the Island",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517273602/D72859D996FB67EEFB25290DA8188C7C0DBD315E/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-133600",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517271640/2AF4475C2477A62627D43DA447255C89373A4C88/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-135300",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517280927/6B827D2B7088D400B3332D7F015FE9A5E437F616/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-132500",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517274034/996B3E0D52BEB04F2973C19D17938EF6A673DE61/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-135400",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517279643/D379998D20FEC6E6563693B7FDFF712F98A22C51/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-135700",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517278625/68310F131B2C60972290556DE7249F948A46BF6D/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-136800",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517282112/561215C7FD6308C6CF6E6C1E33A5999EA0D0CB2E/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-132000",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517275156/B7E71521095DC4093DDFC681DF0CF929DEA75F45/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-133100",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517272838/3B80E748C3F7F9A011DF325225A6871103270B38/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-135200",
    "name": "Numinous Crisis",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517283543/274EB3CEFAE4761729D40519181F39D923AED368/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-135600",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517279066/EF4EC8EF3513F952F30B1B220910A7B9146100CE/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-132900",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517273212/A9BE89E4CE0F960029B23867C7B8238CCAA83D28/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-131500",
    "name": "Years of Little Rain",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517277343/F3C47D192AABFA26D33D0D24DBB32DF2EFD94101/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-251700",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2308724646351055765/C90E3175D876F79E80C8403E63345D76740FAD4B/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-252100",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2308724646351055545/C55D7D01ADD24C0643ED148848CDA6CA8B75742E/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-252400",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2308724646351054386/3058710F64CF9375AA5135DF9FDCC55DB6A2FD84/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-136500",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517280745/851A29A3101D111F0121D404BAC054E55A0A8756/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-136900",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517282500/E4B60951D4C0B554B46AD114B46F9DFF3F78D2AE/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-133200",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050881111369722694/12AE555C660B8008AEE6C6A3E8F7E2DBC25AB9F5/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-135900",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517278170/C0C3EC88CAF2BDABE3FD5BB7D498425634354670/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-135000",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517281567/2082402228DCAE5A23A0E2275F82688968CC765D/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-251800",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2308724646351054731/DCFA10477403434097099AE6F3C520D918A96E9D/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-134400",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517280532/ED7280C92EBB6AECDFEC8747E13BF450649673C6/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-134700",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517277594/67B707C5B022DBF620DA9FA5C779719C2D6D434A/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-131800",
    "name": "Sacred Sites Under Threat",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517276314/6E8CC905DCF986881914A4BDD0E0B1C825177785/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-132600",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517273794/0C4763C045BB14F27F844DCA4E99C36DDF6DEABB/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-136400",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517282722/6BE365B8F24DBBA39565CF0DF0692873946DDC64/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-136100",
    "name": "Dahan Trade with the Invaders",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517283135/3EE2A78DD110BB8876D58DB642DA6D900E5EA922/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-131900",
    "name": "Missionaries Arrive",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517275651/A7A69E85EE36D067DC2E38E8117ED94A00D2FBAC/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-136200",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517278391/E57B197B4A5612B60AA3836F98CC26B7CFFA4A5F/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-131600",
    "name": "Farmers Seek the Dahan for Aid",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517277078/E7C538DD60E3615DCC4E5664AC7EA4736DF186C3/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-136600",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517281946/E35FC72E7EE77EC3C52BD6DE35FE6B93ABD7EC04/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-134800",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517277967/79D90665D4C9224CA21DC4F789F88FC3E974F8A4/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-131700",
    "name": "New Species Spread",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517276775/053774DBE631522E7426FAD0169B7EB6E2492BBD/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-136300",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517281101/BEABA0E6C6FD54ADFFAC6083E8BDDB223E70B45B/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-134100",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517279935/2A2D5E94A4E24681B76CD5E5FE18A08790FDC5BB/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-134200",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517281768/165C63F4AAD32FB7B82057A47B329467698C164B/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  },
  {
    "id": "event-132200",
    "name": "",
    "faceUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517274704/AC210C8197A34AB418EC33D5A92C37B0DA4178E1/",
    "backUrl": "https://steamusercontent-a.akamaihd.net/ugc/2050875404517238966/02BD15E4CB64460CAEAD4F2C0DB7ABADEB0A8C0A/"
  }
];

export const createShuffledEventCardDeck = (adversaryId?: string, adversaryLevel?: number) => {
  const deck: EventCardDefinition[] = shuffleCards(EVENT_CARDS);
  if (adversaryId === 'france' && (adversaryLevel ?? 0) >= 2) {
    const insertIdx = Math.min(3, deck.length);
    deck.splice(insertIdx, 0, SLAVE_REBELLION_CARD);
  }
  return deck;
};
