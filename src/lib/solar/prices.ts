// Default component prices for the techno-economic analysis.
//
// ⚠ THESE ARE PLACEHOLDERS. They are order-of-magnitude figures for the
// Nigerian market, not quotes, and solar component pricing moves fast enough
// that any hard-coded number is wrong within months. Every one is editable in
// the UI, and the UI shows PRICES_LAST_REVIEWED beside them so a user can see
// how stale they are. Replace them with real supplier quotes before putting
// any weight on an NPV or payback figure.
//
// Deliberately NOT fetched at runtime: this site is static with no server
// compute, and a scraped price would rot silently rather than visibly.

export const PRICES_LAST_REVIEWED = '2026-09-16';

export interface PriceBook {
  /** Per watt of panel. */
  panelPerWatt: number;
  /** Per watt of inverter rating. */
  inverterPerWatt: number;
  /** Per Wh of installed battery nameplate capacity. */
  batteryPerWhLithium: number;
  batteryPerWhLeadAcid: number;
  /** Per amp of charge controller rating. */
  controllerPerAmp: number;
  /** Per metre per mm2 of copper cable. */
  cablePerMetreMm2: number;
  /** Flat per breaker. */
  breakerEach: number;
  /** Flat per SPD unit (one DC, one AC). */
  spdEach: number;
  /** Mounting, racking and combiner box, per panel. */
  mountingPerPanel: number;
  /** Installation labour as a fraction of hardware cost. */
  installFraction: number;
  /** Contingency, freight and duty as a fraction of hardware cost. */
  contingencyFraction: number;
}

/** All values in NGN. */
export const DEFAULT_PRICES: PriceBook = {
  panelPerWatt: 420,
  inverterPerWatt: 380,
  batteryPerWhLithium: 480,
  batteryPerWhLeadAcid: 220,
  controllerPerAmp: 5200,
  cablePerMetreMm2: 900,
  breakerEach: 28000,
  spdEach: 65000,
  mountingPerPanel: 42000,
  installFraction: 0.15,
  contingencyFraction: 0.08,
};

export interface TariffBook {
  /** Grid tariff displaced, per kWh. */
  gridTariffPerKwh: number;
  /** Diesel price per litre, for the displaced-generator benefit. */
  dieselPerLitre: number;
  /** Litres per kWh for a small generator. ~0.35-0.5 is typical. */
  generatorLitresPerKwh: number;
  /** Fraction of delivered energy that would otherwise have come from a generator. */
  generatorDisplacedFraction: number;
}

/** All values in NGN. */
export const DEFAULT_TARIFFS: TariffBook = {
  gridTariffPerKwh: 225,
  dieselPerLitre: 1300,
  generatorLitresPerKwh: 0.4,
  generatorDisplacedFraction: 0.5,
};
