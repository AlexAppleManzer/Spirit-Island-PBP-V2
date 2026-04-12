export type DeckCardDefinition = {
  id: string;
  name: string;
  faceUrl: string;
  backUrl: string;
};

export const ELEMENT_ORDER = [
  'sun',
  'moon',
  'fire',
  'air',
  'water',
  'earth',
  'plant',
  'animal',
] as const;

export type ElementName = (typeof ELEMENT_ORDER)[number];

export type ElementCounts = Record<ElementName, number>;

export type ThresholdDefinition = {
  elements: ElementCounts;
};

export type PowerCardDefinition = DeckCardDefinition & {
  speed: 'fast' | 'slow' | 'unknown';
  kind: 'minor' | 'major' | 'unique';
  cost: number;
  elements: ElementCounts;
  thresholds: ThresholdDefinition[];
};

export type SpiritDefinition = {
  id: string;
  name: string;
  expansion: string;
  complexity: string;
  panel: {
    faceUrl: string;
    backUrl: string;
  };
  uniquePowers: PowerCardDefinition[];
};
