// Closed-form engineering formulas for the calculator engine. Every function
// takes inputs already converted to SI base units (see units.ts) and returns
// results in SI base units, plus human-readable "worked formula" steps shown
// in SI units so the substitution is unambiguous regardless of which display
// unit system the visitor has selected.

export type Inputs = Record<string, number>;
export type Results = Record<string, number>;
export interface FormulaOutput {
  results: Results;
  steps: string[];
}
export type FormulaFn = (inputs: Inputs) => FormulaOutput;

function fmt(v: number, digits = 4): string {
  if (!Number.isFinite(v)) return '—';
  if (Math.abs(v) >= 1000 || (Math.abs(v) < 0.001 && v !== 0)) return v.toExponential(3);
  return v.toPrecision(digits).replace(/\.?0+$/, (m) => (m.includes('.') ? '' : m));
}

export const formulas: Record<string, FormulaFn> = {
  'gear-ratio': ({ driverTeeth, drivenTeeth, inputTorque, inputSpeed }) => {
    const gearRatio = drivenTeeth / driverTeeth;
    const outputSpeed = inputSpeed / gearRatio;
    const outputTorque = inputTorque * gearRatio;
    return {
      results: { gearRatio, outputSpeed, outputTorque },
      steps: [
        `GR = N_driven / N_driver = ${fmt(drivenTeeth)} / ${fmt(driverTeeth)} = ${fmt(gearRatio)}`,
        `N_out = N_in / GR = ${fmt(inputSpeed)} / ${fmt(gearRatio)} = ${fmt(outputSpeed)} RPM`,
        `T_out = T_in × GR = ${fmt(inputTorque)} N·m × ${fmt(gearRatio)} = ${fmt(outputTorque)} N·m`
      ]
    };
  },

  'shaft-torque': ({ power, speed }) => {
    const omega = (2 * Math.PI * speed) / 60;
    const torque = power / omega;
    return {
      results: { torque },
      steps: [
        `ω = 2π N / 60 = 2π × ${fmt(speed)} / 60 = ${fmt(omega)} rad/s`,
        `T = P / ω = ${fmt(power)} W / ${fmt(omega)} rad/s = ${fmt(torque)} N·m`
      ]
    };
  },

  'beam-deflection': ({ force, length, modulusE, momentOfInertia, distanceC }) => {
    const deflection = (force * length ** 3) / (48 * modulusE * momentOfInertia);
    const moment = (force * length) / 4;
    const stress = (moment * distanceC) / momentOfInertia;
    return {
      results: { deflection, stress },
      steps: [
        `δ = F L³ / (48 E I) = (${fmt(force)} × ${fmt(length)}³) / (48 × ${fmt(modulusE)} × ${fmt(momentOfInertia)}) = ${fmt(deflection)} m`,
        `M = F L / 4 = ${fmt(force)} × ${fmt(length)} / 4 = ${fmt(moment)} N·m`,
        `σ = M c / I = ${fmt(moment)} × ${fmt(distanceC)} / ${fmt(momentOfInertia)} = ${fmt(stress)} Pa`
      ]
    };
  },

  'bolt-torque': ({ diameter, preload, frictionCoefficient }) => {
    const torque = frictionCoefficient * preload * diameter;
    return {
      results: { torque },
      steps: [
        `T = K F d = ${fmt(frictionCoefficient)} × ${fmt(preload)} N × ${fmt(diameter)} m = ${fmt(torque)} N·m`
      ]
    };
  },

  'bearing-life': ({ dynamicLoadRating, equivalentLoad, bearingType, speed }) => {
    const k = bearingType === 1 ? 10 / 3 : 3;
    const l10 = (dynamicLoadRating / equivalentLoad) ** k;
    const l10h = (l10 * 1e6) / (60 * speed);
    return {
      results: { l10, l10h },
      steps: [
        `L10 = (C / P)^k = (${fmt(dynamicLoadRating)} / ${fmt(equivalentLoad)})^${fmt(k)} = ${fmt(l10)} million rev`,
        `L10h = L10 × 10⁶ / (60 N) = ${fmt(l10)} × 10⁶ / (60 × ${fmt(speed)}) = ${fmt(l10h)} hours`
      ]
    };
  },

  'pipe-flow': ({ flowRate, diameter, length, density, viscosity, roughness }) => {
    const area = (Math.PI * diameter ** 2) / 4;
    const velocity = flowRate / area;
    const reynolds = (density * velocity * diameter) / viscosity;
    let frictionFactor: number;
    if (reynolds < 2300) {
      frictionFactor = 64 / reynolds;
    } else {
      // Swamee-Jain explicit approximation of the Colebrook equation.
      const relRoughness = roughness / diameter;
      frictionFactor =
        0.25 / Math.log10(relRoughness / 3.7 + 5.74 / reynolds ** 0.9) ** 2;
    }
    const pressureDrop = frictionFactor * (length / diameter) * ((density * velocity ** 2) / 2);
    return {
      results: { velocity, reynolds, frictionFactor, pressureDrop },
      steps: [
        `v = Q / A = ${fmt(flowRate)} / ${fmt(area)} = ${fmt(velocity)} m/s`,
        `Re = ρ v D / µ = ${fmt(density)} × ${fmt(velocity)} × ${fmt(diameter)} / ${fmt(viscosity)} = ${fmt(reynolds)}`,
        reynolds < 2300
          ? `f = 64 / Re = 64 / ${fmt(reynolds)} = ${fmt(frictionFactor)} (laminar)`
          : `f = 0.25 / [log₁₀(ε/3.7D + 5.74/Re^0.9)]² = ${fmt(frictionFactor)} (turbulent, Swamee-Jain)`,
        `ΔP = f (L/D) (ρv²/2) = ${fmt(frictionFactor)} × (${fmt(length)}/${fmt(diameter)}) × (${fmt(density)}×${fmt(velocity)}²/2) = ${fmt(pressureDrop)} Pa`
      ]
    };
  },

  'column-buckling': ({ modulusE, momentOfInertia, length, area, endCondition }) => {
    const effectiveLength = endCondition * length;
    const criticalLoad = (Math.PI ** 2 * modulusE * momentOfInertia) / effectiveLength ** 2;
    const criticalStress = criticalLoad / area;
    const radiusOfGyration = Math.sqrt(momentOfInertia / area);
    const slendernessRatio = effectiveLength / radiusOfGyration;
    return {
      results: { criticalLoad, criticalStress, slendernessRatio },
      steps: [
        `KL = ${fmt(endCondition)} × ${fmt(length)} = ${fmt(effectiveLength)} m`,
        `Pcr = π² E I / (KL)² = π² × ${fmt(modulusE)} × ${fmt(momentOfInertia)} / ${fmt(effectiveLength)}² = ${fmt(criticalLoad)} N`,
        `σcr = Pcr / A = ${fmt(criticalLoad)} / ${fmt(area)} = ${fmt(criticalStress)} Pa`,
        `λ = KL / r, r = √(I/A) = ${fmt(radiusOfGyration)} m → λ = ${fmt(slendernessRatio)}`
      ]
    };
  },

  'thermal-expansion': ({ originalLength, alpha, deltaT }) => {
    const deltaL = alpha * originalLength * deltaT;
    const newLength = originalLength + deltaL;
    return {
      results: { deltaL, newLength },
      steps: [
        `ΔL = α L₀ ΔT = ${fmt(alpha)} × ${fmt(originalLength)} × ${fmt(deltaT)} = ${fmt(deltaL)} m`,
        `L_new = L₀ + ΔL = ${fmt(originalLength)} + ${fmt(deltaL)} = ${fmt(newLength)} m`
      ]
    };
  },

  'factor-of-safety': ({ failureStress, appliedStress }) => {
    const factorOfSafety = failureStress / appliedStress;
    const marginOfSafety = factorOfSafety - 1;
    return {
      results: { factorOfSafety, marginOfSafety },
      steps: [
        `FoS = σ_failure / σ_applied = ${fmt(failureStress)} / ${fmt(appliedStress)} = ${fmt(factorOfSafety)}`,
        `MoS = FoS − 1 = ${fmt(factorOfSafety)} − 1 = ${fmt(marginOfSafety)}`
      ]
    };
  },

  'spring-rate': ({ shearModulusG, wireDiameter, coilDiameter, numCoils, appliedForce }) => {
    const springRate = (shearModulusG * wireDiameter ** 4) / (8 * coilDiameter ** 3 * numCoils);
    const deflection = appliedForce / springRate;
    return {
      results: { springRate, deflection },
      steps: [
        `k = G d⁴ / (8 D³ n) = (${fmt(shearModulusG)} × ${fmt(wireDiameter)}⁴) / (8 × ${fmt(coilDiameter)}³ × ${fmt(numCoils)}) = ${fmt(springRate)} N/m`,
        `δ = F / k = ${fmt(appliedForce)} / ${fmt(springRate)} = ${fmt(deflection)} m`
      ]
    };
  },

  // featureType: 0 = internal feature (hole) — MMC is the smallest size,
  // bonus grows as the actual size grows past it. 1 = external feature
  // (shaft/pin) — MMC is the largest size, bonus grows as the actual size
  // shrinks below it. Bonus is clamped at 0 so a feature produced outside
  // its own size tolerance doesn't report a negative bonus.
  'true-position': ({ statedTolerance, mmcSize, actualSize, featureType, devX, devY }) => {
    const bonusTolerance = featureType === 0 ? Math.max(actualSize - mmcSize, 0) : Math.max(mmcSize - actualSize, 0);
    const totalPositionTolerance = statedTolerance + bonusTolerance;
    const measuredTruePosition = 2 * Math.sqrt(devX ** 2 + devY ** 2);
    const positionMargin = totalPositionTolerance - measuredTruePosition;
    const featureLabel = featureType === 0 ? 'hole, MMC = smallest size' : 'shaft, MMC = largest size';
    return {
      results: { bonusTolerance, totalPositionTolerance, measuredTruePosition, positionMargin },
      steps: [
        `Feature: ${featureLabel}`,
        `Bonus = |actual − MMC| = |${fmt(actualSize)} − ${fmt(mmcSize)}| = ${fmt(bonusTolerance)} m`,
        `Total position tolerance = stated + bonus = ${fmt(statedTolerance)} + ${fmt(bonusTolerance)} = ${fmt(totalPositionTolerance)} m`,
        `Measured true position = 2√(devX² + devY²) = 2√(${fmt(devX)}² + ${fmt(devY)}²) = ${fmt(measuredTruePosition)} m`,
        `Margin = total − measured = ${fmt(totalPositionTolerance)} − ${fmt(measuredTruePosition)} = ${fmt(positionMargin)} m (positive = passes)`
      ]
    };
  }
};
