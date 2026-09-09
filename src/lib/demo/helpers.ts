export class DemoModeError extends Error {
  constructor() {
    super("Modo simulación activo: los cambios no se guardan.");
    this.name = "DemoModeError";
  }
}

export function demoQueryKey<T extends readonly unknown[]>(
  base: T,
  isDemoMode: boolean,
) {
  return [...base, { demo: isDemoMode }] as const;
}

export async function resolveDemoData<T>(
  isDemoMode: boolean,
  fetchReal: () => Promise<T>,
  mockData: T | (() => T),
): Promise<T> {
  if (isDemoMode) {
    await new Promise((resolve) => setTimeout(resolve, 120));
    return typeof mockData === "function"
      ? (mockData as () => T)()
      : mockData;
  }
  return fetchReal();
}

export function assertWritableDemo(isDemoMode: boolean): void {
  if (isDemoMode) throw new DemoModeError();
}
