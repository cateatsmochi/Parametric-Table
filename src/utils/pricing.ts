
import { TableConfig } from '../types';

export const calculatePrice = (config: TableConfig) => {
  const basePrice = 4500; // Base CNY
  
  // Volume based cost (length * width * height)
  // Dimensions are in cm, so width*depth*height gives cubic cm
  const volume = config.width * config.depth * config.height;
  
  const materialMultipliers: Record<string, number> = {
    oak: 1.5,
    steel: 1.2,
    glass: 1.8,
    chrome: 1.4,
    marble: 4.5
  };

  const materialBasePrice = materialMultipliers[config.material] || 1.0;
  
  // Volume price: roughly 0.005 CNY per cm3 for basic material
  const volumeCost = volume * 0.005 * materialBasePrice;
  
  // Craftsmanship and complexity costs
  const isPentagon = config.legInnerDepth > 0;
  const craftsmanshipBase = isPentagon ? 1200 : 500;
  
  // Frame complexity (more material and precision for thicker/offset frames)
  const frameCost = (config.frameThickness * 2) + (config.frameInwardOffset * 0.5);
  
  // Complex taper cost
  const taperCost = Math.abs(config.legTaper) * 15;
  
  // Size difficulty multiplier (larger tables are harder to manufacture)
  const sizeMultiplier = config.width > 200 ? 1.2 : 1.0;

  const total = (basePrice + volumeCost + craftsmanshipBase + taperCost + frameCost) * sizeMultiplier;
  
  return Math.round(total);
};
