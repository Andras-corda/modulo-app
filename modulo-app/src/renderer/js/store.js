// ── Renderer Store memory cache
// Avoid making repeated IPC calls for the same data.
// Each module can call window.Store.get() / window.Store.set()

const Store = (() => {
  const _cache = {};

  async function get(name) {
    if (_cache[name] !== undefined) return _cache[name];
    const api = window.modulo[name];
    if (!api) return null;
    const fn = api.getAll ?? api.get;
    if (!fn) return null;
    const data = await fn();
    _cache[name] = data;
    return data;
  }

  async function set(name, data) {
    _cache[name] = data;
    const api = window.modulo[name];
    if (!api) return;
    const fn = api.save;
    if (fn) await fn(data);
  }

  function invalidate(name) {
    delete _cache[name];
  }

  function invalidateAll() {
    for (const k in _cache) delete _cache[k];
  }

  return { get, set, invalidate, invalidateAll };
})();

window.Store = Store;
