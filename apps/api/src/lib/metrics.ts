const counters: Map<string, Map<string, number>> = new Map();
const gauges: Map<string, Map<string, number>> = new Map();

function getLabelsKey(labels: Record<string, string>): string {
  return Object.entries(labels).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => `${k}="${v}"`).join(',');
}

export function incrementCounter(name: string, labels: Record<string, string> = {}): void {
  const key = getLabelsKey(labels);
  const map = counters.get(name) ?? new Map();
  map.set(key, (map.get(key) ?? 0) + 1);
  counters.set(name, map);
}

export function setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
  const key = getLabelsKey(labels);
  const map = gauges.get(name) ?? new Map();
  map.set(key, value);
  gauges.set(name, map);
}

export function getMetrics(): string {
  const lines: string[] = [];
  for (const [name, map] of counters) {
    for (const [labels, value] of map) {
      lines.push(`icn_${name}{${labels}} ${value}`);
    }
  }
  for (const [name, map] of gauges) {
    for (const [labels, value] of map) {
      lines.push(`icn_${name}{${labels}} ${value}`);
    }
  }
  return lines.join('\n') || '# No metrics';
}
