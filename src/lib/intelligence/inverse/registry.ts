/** Default in-memory inverter registry. */
import type { Inverter, InverterRegistry } from './types';

export class DefaultInverterRegistry implements InverterRegistry {
  private map = new Map<string, Inverter>();
  register<A>(inverter: Inverter<A>): void {
    if (this.map.has(inverter.id)) throw new Error(`inverter ${inverter.id} already registered`);
    this.map.set(inverter.id, inverter as Inverter);
  }
  get(id: string) { return this.map.get(id); }
  forDomain(domain: string) { return [...this.map.values()].filter((i) => i.domain === domain); }
  list() { return [...this.map.values()]; }
}

/** Pick the highest-id inverter for a domain that accepts the artifact. */
export function selectInverter<A>(registry: InverterRegistry, domain: string, artifact: A): Inverter<A> | undefined {
  const candidates = registry.forDomain(domain) as Inverter<A>[];
  return candidates.find((i) => i.accepts(artifact));
}
