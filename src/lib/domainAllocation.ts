import { POCS, DOMAINS, type Domain, type Process, isConverted } from "@/lib/mockProcesses";

/** Stable POC → primary domain assignment (deterministic, mock data). */
export const POC_PRIMARY_DOMAIN: Record<string, Domain> = (() => {
  const map: Record<string, Domain> = {};
  POCS.forEach((p, i) => { map[p] = DOMAINS[i % DOMAINS.length]; });
  return map;
})();

export function pocPrimaryDomain(name: string): Domain | undefined {
  return POC_PRIMARY_DOMAIN[name];
}

/** Tag an LMP as cross-domain if its prep POC's primary domain ≠ LMP domain. */
export function isCrossDomain(r: Process): boolean {
  const pd = POC_PRIMARY_DOMAIN[r.prepPoc];
  return !!pd && pd !== r.domain;
}

export type DomainAllocation = {
  domain: Domain;
  total: number;
  inDomain: number;
  cross: number;
  inDomainConvPct: number;
  crossConvPct: number;
};

export function domainAllocation(rows: Process[]): DomainAllocation[] {
  return DOMAINS.map((d) => {
    const list = rows.filter((r) => r.domain === d);
    const inD = list.filter((r) => !isCrossDomain(r));
    const crD = list.filter((r) => isCrossDomain(r));
    const pct = (arr: Process[]) =>
      arr.length ? (arr.filter(isConverted).length / arr.length) * 100 : 0;
    return {
      domain: d,
      total: list.length,
      inDomain: inD.length,
      cross: crD.length,
      inDomainConvPct: +pct(inD).toFixed(1),
      crossConvPct: +pct(crD).toFixed(1),
    };
  });
}

export type PocPurityRow = {
  poc: string;
  primaryDomain: Domain;
  inDomainCount: number;
  crossCount: number;
  inDomainConvPct: number;
  crossConvPct: number;
};

export function pocPurityMatrix(rows: Process[]): PocPurityRow[] {
  const names = new Set<string>();
  rows.forEach((r) => { if (r.prepPoc) names.add(r.prepPoc); });
  const result: PocPurityRow[] = [];
  names.forEach((name) => {
    const primary = POC_PRIMARY_DOMAIN[name];
    if (!primary) return;
    const owned = rows.filter((r) => r.prepPoc === name);
    const inD = owned.filter((r) => r.domain === primary);
    const crD = owned.filter((r) => r.domain !== primary);
    const conv = (arr: Process[]) =>
      arr.length ? +((arr.filter(isConverted).length / arr.length) * 100).toFixed(0) : 0;
    result.push({
      poc: name,
      primaryDomain: primary,
      inDomainCount: inD.length,
      crossCount: crD.length,
      inDomainConvPct: conv(inD),
      crossConvPct: conv(crD),
    });
  });
  return result.sort((a, b) => b.inDomainCount + b.crossCount - (a.inDomainCount + a.crossCount));
}

export function allocationKpis(rows: Process[]) {
  const total = rows.length;
  const cross = rows.filter(isCrossDomain).length;
  const crossPct = total ? (cross / total) * 100 : 0;
  const inD = rows.filter((r) => !isCrossDomain(r));
  const crD = rows.filter(isCrossDomain);
  const conv = (arr: Process[]) =>
    arr.length ? (arr.filter(isConverted).length / arr.length) * 100 : 0;
  const inDomainConv = conv(inD);
  const crossConv = conv(crD);
  const gap = inDomainConv - crossConv;

  const alloc = domainAllocation(rows);
  const mostMis = [...alloc]
    .filter((d) => d.total > 0)
    .sort((a, b) => (b.cross / Math.max(1, b.total)) - (a.cross / Math.max(1, a.total)))[0];

  const purity = pocPurityMatrix(rows);
  const bestCross = [...purity]
    .filter((p) => p.crossCount >= 2)
    .sort((a, b) => b.crossConvPct - a.crossConvPct)[0];

  return {
    total, cross, crossPct,
    inDomainConv, crossConv, gap,
    mostMisallocatedDomain: mostMis ? mostMis.domain : "—",
    mostMisallocatedPct: mostMis ? (mostMis.cross / Math.max(1, mostMis.total)) * 100 : 0,
    bestCrossPoc: bestCross ? `${bestCross.poc} · ${bestCross.crossConvPct}%` : "—",
  };
}