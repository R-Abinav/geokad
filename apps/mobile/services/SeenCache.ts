export class SeenCache {
  private cache = new Map<string, number>();
  private readonly TTL_MS = 60000; // 60 seconds

  has(key: string): boolean {
    const ts = this.cache.get(key);
    if (!ts) return false;
    if (Date.now() - ts > this.TTL_MS) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  add(key: string): void {
    this.cache.set(key, Date.now());
  }
}
