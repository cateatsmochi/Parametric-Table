
export type MaterialType = 'oak' | 'steel' | 'glass' | 'chrome' | 'marble';

export interface TableConfig {
  width: number; // in cm
  depth: number; // in cm
  height: number; // in cm
  legTaper: number; // in cm (tilt)
  topThickness: number; // in mm
  frameDepth: number; // in mm
  frameInwardOffset: number; // in mm
  frameThickness: number; // in mm
  legTopSize: number; // in mm
  legBottomSize: number; // in mm
  legInnerDepth: number; // in mm
  material: MaterialType;
  color: string;
}

export const DEFAULT_CONFIG: TableConfig = {
  width: 180,
  depth: 90,
  height: 75,
  legTaper: 5,
  topThickness: 25,
  frameDepth: 40,
  frameInwardOffset: 20,
  frameThickness: 40,
  legTopSize: 80,
  legBottomSize: 40,
  legInnerDepth: 60,
  material: 'oak',
  color: '#8B5E3C'
};
