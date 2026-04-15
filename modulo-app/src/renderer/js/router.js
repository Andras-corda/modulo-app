// Modulo Router

const Router = (() => {
  const _routes = new Map();  // key → renderFn
  let _current = null;
  let _container = null;

  function init(container) {
    _container = container;
  }

  function register(key, renderFn) {
    _routes.set(key, renderFn);
  }

  function unregister(key) {
    _routes.delete(key);
    if (_current === key) navigate('marketplace');
  }

  async function navigate(key) {
    if (!_container) return;

    const renderFn = _routes.get(key);
    if (!renderFn) {
      console.warn(`[Router] No route for: ${key}`);
      return;
    }

    _current = key;

    // Update Nav Active
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.key === key);
    });

    // clean container
    _container.innerHTML = '';

    // Render the page
    try {
      await renderFn(_container);
    } catch (err) {
      _container.innerHTML = `
        <div class="page">
          <div class="empty-state">
            ${icon('warning', '32px')}
            <div class="empty-state-title">Erreur de rendu</div>
            <div class="empty-state-sub">${err.message}</div>
          </div>
        </div>
      `;
      DevLog.error(`[Router] render error for "${key}": ${err.message}`);
    }
  }

  function getCurrent() { return _current; }
  function getRoutes()  { return [..._routes.keys()]; }

  return { init, register, unregister, navigate, getCurrent, getRoutes };
})();

window.Router = Router;
