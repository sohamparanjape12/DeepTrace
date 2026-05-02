import { DomainClass } from './prompts.v2';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface RevenueRiskParams {
  severity: Severity;
  domainClass: DomainClass;
  rightsTier: string;
  commercialExploitation: boolean;
  isDerivativeWork: boolean;
}

const BASE_RATES: Record<Severity, number> = {
  'CRITICAL': 85000,
  'HIGH': 35000,
  'MEDIUM': 12000,
  'LOW': 4000,
};

/**
 * DeepTrace Financial Impact Algorithm
 * Calculates estimated revenue risk based on asset value, domain reach, and usage context.
 */
export function calculateRevenueRisk(params: RevenueRiskParams): number {
  const { severity, domainClass, rightsTier, commercialExploitation, isDerivativeWork } = params;

  // Start with baseline severity rate
  let baseRate = BASE_RATES[severity] || 0;

  // 1. Rights Tier Multiplier (Asset Value)
  let tierMultiplier = 1.0;
  const normalizedTier = rightsTier.toLowerCase();
  
  // Restricted tiers carry much higher recovery/licensing penalties
  if (
    normalizedTier.includes('no_reuse') || 
    normalizedTier.includes('internal') || 
    normalizedTier.includes('all_rights') ||
    normalizedTier === 'all rights'
  ) {
    tierMultiplier = 2.5;
  } else if (normalizedTier.includes('commercial')) {
    tierMultiplier = 1.5;
  } else if (normalizedTier.includes('editorial')) {
    tierMultiplier = 1.0;
  }

  // 2. Domain Class Multiplier (Reach & Risk Prior)
  const domainMultipliers: Partial<Record<DomainClass, number>> = {
    'piracy': 2.0,      // High scale, high malicious intent
    'betting': 2.0,     // High monetization, regulated industry
    'ecommerce': 2.5,   // Direct theft of commercial value
    'major_news': 1.2,  // High reach, but often lower damage intent
    'wire_service': 0.8, // Usually legitimate secondary usage
    'social': 1.0,      // Standard baseline reach
  };
  const domainMultiplier = domainMultipliers[domainClass] || 1.0;

  // 3. Context Multipliers (Exploitation depth)
  let contextMultiplier = 1.0;
  
  // If the usage is explicitly for profit (storefront, ads), double the risk
  if (commercialExploitation) {
    contextMultiplier *= 2.0;
  }
  
  // Derivative works (memes, heavy edits) often have lower direct recovery value than original pixel theft
  if (isDerivativeWork) {
    contextMultiplier *= 0.8;
  }

  // Final weighted calculation
  const finalRisk = Math.round(baseRate * tierMultiplier * domainMultiplier * contextMultiplier);
  
  return finalRisk;
}
