// Component prices and tariffs for the techno-economic analysis.
//
// These are REAL market figures researched on 2026-09-16, not invented
// placeholders — but they are still mid-range estimates from public listings,
// not quotes for your job. Nigerian solar pricing tracks the naira/dollar rate
// and moves fast; over 95% of panels are imported. Every value is editable in
// the UI, which shows PRICES_LAST_REVIEWED beside them so a user can judge how
// stale they are. Replace them with supplier quotes before signing anything.
//
// Deliberately NOT fetched at runtime: this site is static with no server
// compute, and a scraped price would rot silently rather than visibly.
//
// Sources (all retrieved 2026-09-16), with the observed range in brackets and
// the chosen midpoint noted per field below:
//   nigeriahousingmarket.com/guides/cost-of-solar-panel-in-nigeria-2026-price-list
//   solarenergysupplystores.com/solar-panel-price-in-nigeria/
//   af.powmr.com/blogs/news/how-much-is-solar-battery-in-nigeria
//   ksopgloballtd.ng/blog/best-lithium-battery-for-solar-in-nigeria-prices-recommendations-2026-guide/
//   solarenergysupplystores.com/solar-inverter-price-in-nigeria/
//   maypatronic.com/product-category/solar-charge-controller-nigeria/
//   nigerianprice.com/16-mm-cable-prices-in-nigeria/
//   kara.com.ng/electrical-accessories/electric-circuit-breaker
//   pvpro.com.ng/cost-of-solar-installation-in-nigeria-2026/
//   nerc.gov.ng/faq/electricity-tariffs/
//   dailyfuels.com/nigeria/

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
  // 550 W monocrystalline listed at N115,000-165,000 => N209-300/W.
  panelPerWatt: 250,
  // 5 kVA hybrid inverter N350,000-750,000 (~N87-187/W at 0.8 pf);
  // 10 kVA units around N1.4M-2.5M.
  inverterPerWatt: 160,
  // 48 V 200 Ah (10 kWh) LiFePO4 at N1,650,000-2,650,000 => N165-265/Wh.
  batteryPerWhLithium: 200,
  // Tubular lead-acid runs roughly N100-145/Wh nameplate — but only half of
  // that is usable at a 50% depth of discharge, so it is not the bargain the
  // per-Wh figure suggests.
  batteryPerWhLeadAcid: 120,
  // 60 A MPPT N110,000-210,000; 80 A around N170,000-190,000 => ~N2,100-3,500/A.
  controllerPerAmp: 2400,
  // 16 mm2 single-core copper at ~N1,367/m => ~N85/m/mm2. Carried higher here
  // because PV1-F solar cable costs meaningfully more than building wire.
  cablePerMetreMm2: 150,
  // MCBs run N4,000-30,000; a 125 A DC MCCB about N26,000. Blended, since most
  // breakers in a system are small.
  breakerEach: 18000,
  spdEach: 55000,
  mountingPerPanel: 25000,
  // Labour quoted at N200,000-500,000 for typical residential systems, which
  // lands near 8% of hardware on a mid-size job.
  installFraction: 0.08,
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
  // NERC Band A (20+ hours daily supply), the band most solar buyers are on.
  // Lower bands pay less, which weakens the savings case — edit this to match
  // the actual band.
  gridTariffPerKwh: 225,
  // Volatile: quoted around N1,720/L nationally in September 2026, with Abuja
  // spiking past N2,000/L in the same month, and NBS monthly averages running
  // higher still. This is the single most uncertain number here.
  dieselPerLitre: 1900,
  generatorLitresPerKwh: 0.4,
  generatorDisplacedFraction: 0.5,
};
