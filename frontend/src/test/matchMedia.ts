function queryMatchesWidth(query: string, width: number): boolean {
  const min = /min-width:\s*(\d+)px/.exec(query);
  const max = /max-width:\s*(\d+)px/.exec(query);

  let matches = true;
  if (min) {
    matches = matches && width >= Number(min[1]);
  }
  if (max) {
    matches = matches && width <= Number(max[1]);
  }
  return matches;
}

export function mockViewportWidth(width: number): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: queryMatchesWidth(query, width),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
