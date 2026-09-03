/**
 * Setup de Vitest.
 *
 * Importar cualquier repositorio arrastra `lib/supabaseClient.ts`, que crea el
 * cliente al evaluar el modulo. El cliente, a su vez, intenta rehidratar la
 * sesion desde `chromeStorageAdapter`, que fuera de la extension cae a
 * `localStorage`. En Node ese global no existe y la promesa de rehidratacion
 * queda rechazada sin capturar.
 *
 * Se resuelve con un stub en memoria en vez de tocar codigo de produccion: el
 * acoplamiento real (funciones puras conviviendo con un cliente con efectos de
 * modulo) esta registrado como deuda en el capitulo 13.4 del roadmap y se
 * corrige ahi, no aca.
 *
 * No se stubbea `chrome` a proposito: el adaptador ya comprueba su ausencia y
 * cae a `localStorage` solo, que es exactamente la rama que queremos ejercitar.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
}
