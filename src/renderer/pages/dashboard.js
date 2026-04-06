// ── Dashboard ──

async function renderDashboard(container) {
  const profile  = (await window.modulo.profile.get()) ?? {};
  const settings = (await window.modulo.settings.get()) ?? {};
  const lang     = settings.lang ?? 'fr';

  // ── Greeting ────────────────────────────────────────────────────────────
  function _greeting() {
    const h = new Date().getHours();
    if (lang === 'en') {
      if (h < 12) return 'Good morning';
      if (h < 18) return 'Good afternoon';
      return 'Good evening';
    }
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  // ── Météo — Open-Meteo (Liège) ──────────────────────────────────────────
  const WMO_CODES = {
    0:  { icon:'☀️', label:'Clear sky' },
    1:  { icon:'🌤', label:'Mainly clear' },
    2:  { icon:'⛅', label:'Partly cloudy' },
    3:  { icon:'☁️', label:'Overcast' },
    45: { icon:'🌫', label:'Fog' },
    48: { icon:'🌫', label:'Icy fog' },
    51: { icon:'🌦', label:'Light drizzle' },
    53: { icon:'🌦', label:'Drizzle' },
    55: { icon:'🌧', label:'Heavy drizzle' },
    61: { icon:'🌧', label:'Light rain' },
    63: { icon:'🌧', label:'Rain' },
    65: { icon:'🌧', label:'Heavy rain' },
    71: { icon:'🌨', label:'Light snow' },
    73: { icon:'🌨', label:'Snow' },
    75: { icon:'❄️', label:'Heavy snow' },
    77: { icon:'🌨', label:'Snow grains' },
    80: { icon:'🌦', label:'Rain showers' },
    81: { icon:'🌧', label:'Heavy showers' },
    82: { icon:'⛈', label:'Violent showers' },
    95: { icon:'⛈', label:'Thunderstorm' },
    96: { icon:'⛈', label:'Thunderstorm + hail' },
    99: { icon:'⛈', label:'Severe thunderstorm' },
  };

  async function _fetchWeather() {
    try {
      const res  = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=50.6402&longitude=5.5718' +
        '&current=temperature_2m,weathercode,windspeed_10m' +
        '&timezone=Europe%2FBrussels'
      );
      const data = await res.json();
      const cur  = data.current;
      const wmo  = WMO_CODES[cur.weathercode] ?? { icon:'🌡', label:'Unknown' };
      return {
        temp:  Math.round(cur.temperature_2m),
        icon:  wmo.icon,
        label: wmo.label,
        city:  'Liège',
      };
    } catch {
      return null;
    }
  }

  // ── SVG Horloge analogique ───────────────────────────────────────────────
  function _analogClockSvg() {
    return `
      <svg id="dash-analog" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"
        style="position:absolute;inset:0;width:100%;height:100%;opacity:.055;pointer-events:none">

        <!-- Graduations -->
        ${Array.from({length:60}, (_,i) => {
          const a  = (i / 60) * 2 * Math.PI - Math.PI / 2;
          const r1 = i % 5 === 0 ? 82 : 88;
          const r2 = 92;
          const x1 = 100 + r1 * Math.cos(a);
          const y1 = 100 + r1 * Math.sin(a);
          const x2 = 100 + r2 * Math.cos(a);
          const y2 = 100 + r2 * Math.sin(a);
          const w  = i % 5 === 0 ? 1.8 : 0.8;
          return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"
            stroke="white" stroke-width="${w}" stroke-linecap="round"/>`;
        }).join('')}

        <!-- Cercle extérieur -->
        <circle cx="100" cy="100" r="94" fill="none" stroke="white" stroke-width="1.2" opacity=".5"/>

        <!-- Aiguille heures -->
        <line id="dash-h" x1="100" y1="100" x2="100" y2="45"
          stroke="white" stroke-width="3.5" stroke-linecap="round"/>

        <!-- Aiguille minutes -->
        <line id="dash-m" x1="100" y1="100" x2="100" y2="28"
          stroke="white" stroke-width="2.2" stroke-linecap="round"/>

        <!-- Aiguille secondes -->
        <line id="dash-s" x1="100" y1="108" x2="100" y2="22"
          stroke="white" stroke-width="1" stroke-linecap="round" opacity=".7"/>

        <!-- Centre -->
        <circle cx="100" cy="100" r="3.5" fill="white"/>
        <circle cx="100" cy="100" r="1.5" fill="#0f1117"/>
      </svg>
    `;
  }

  // ── Rendu ────────────────────────────────────────────────────────────────
  const pseudo  = profile.pseudo || '';
  const weather = await _fetchWeather();

  container.innerHTML = `
    <div style="
      position:relative;
      display:flex;align-items:center;justify-content:center;
      height:calc(100vh - 36px);overflow:hidden;
    ">

      <!-- Horloge analogique en fond -->
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">
        <div style="width:min(70vh,70vw);height:min(70vh,70vw);max-width:560px;max-height:560px;position:relative">
          ${_analogClockSvg()}
        </div>
      </div>

      <!-- Contenu centré -->
      <div style="position:relative;text-align:center;display:flex;flex-direction:column;align-items:center;gap:0">

        <!-- Greeting -->
        <div id="dash-greeting" style="
          font-size:13px;font-weight:400;letter-spacing:.6px;
          color:rgba(255,255,255,.35);margin-bottom:28px;
        ">${_greeting()}${pseudo ? ', ' + pseudo : ''}</div>

        <!-- Horloge digitale -->
        <div style="display:flex;align-items:flex-start;line-height:1">
          <div id="dash-time" style="
            font-size:clamp(72px,12vw,128px);
            font-weight:300;letter-spacing:-4px;
            color:rgba(255,255,255,.92);
            font-variant-numeric:tabular-nums;
            font-family:var(--font-mono);
          ">00:00</div>
          <sup id="dash-sec" style="
            font-size:clamp(20px,3vw,32px);
            font-weight:300;
            color:rgba(255,255,255,.3);
            font-family:var(--font-mono);
            margin-top:.3em;margin-left:6px;
            font-variant-numeric:tabular-nums;
          ">00</sup>
        </div>

        <!-- Date -->
        <div id="dash-date" style="
          font-size:13px;font-weight:500;letter-spacing:3px;
          text-transform:uppercase;color:rgba(255,255,255,.3);
          margin-top:12px;
        ">—</div>

        <!-- Météo pill -->
        ${weather ? `
          <div style="
            margin-top:24px;
            display:inline-flex;align-items:center;gap:0;
            background:rgba(255,255,255,.06);
            border:1px solid rgba(255,255,255,.10);
            border-radius:9999px;
            padding:6px 16px;
            font-size:13px;color:rgba(255,255,255,.55);
            backdrop-filter:blur(8px);
          ">
            <span style="font-size:16px;margin-right:8px">${weather.icon}</span>
            <span style="font-weight:500;color:rgba(255,255,255,.75)">${weather.temp}°C</span>
            <span style="margin:0 10px;opacity:.3">·</span>
            <span>${weather.label}</span>
            <span style="margin:0 10px;opacity:.3">|</span>
            <span style="letter-spacing:.3px">${weather.city}</span>
          </div>
        ` : ''}

      </div>
    </div>
  `;

  // ── Tick (chaque seconde) ────────────────────────────────────────────────
  function _tick() {
    const now = new Date();
    const hh  = now.getHours().toString().padStart(2, '0');
    const mm  = now.getMinutes().toString().padStart(2, '0');
    const ss  = now.getSeconds();
    const sss = ss.toString().padStart(2, '0');

    // Digitale
    const timeEl = container.querySelector('#dash-time');
    const secEl  = container.querySelector('#dash-sec');
    if (timeEl) timeEl.textContent = `${hh}:${mm}`;
    if (secEl)  secEl.textContent  = sss;

    // Date
    const dateEl = container.querySelector('#dash-date');
    if (dateEl) {
      const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      if (lang !== 'en') {
        const daysFr   = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
        const monthsFr = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
        dateEl.textContent = `${daysFr[now.getDay()]} ${now.getDate()} ${monthsFr[now.getMonth()]} ${now.getFullYear()}`;
      } else {
        dateEl.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
      }
    }

    // Greeting adaptatif à l'heure
    const greetEl = container.querySelector('#dash-greeting');
    if (greetEl) greetEl.textContent = _greeting() + (pseudo ? ', ' + pseudo : '');

    // Analogique
    const h   = (now.getHours() % 12) + now.getMinutes() / 60 + ss / 3600;
    const m   = now.getMinutes() + ss / 60;
    const s   = ss + now.getMilliseconds() / 1000;

    const hAngle = (h / 12) * 360;
    const mAngle = (m / 60) * 360;
    const sAngle = (s / 60) * 360;

    _rotateHand('dash-h', hAngle, 100, 100, 45);
    _rotateHand('dash-m', mAngle, 100, 100, 28);
    _rotateHandSec('dash-s', sAngle, 100, 100, 22, 108);
  }

  function _rotateHand(id, angleDeg, cx, cy, tipY) {
    const el = container.querySelector(`#${id}`);
    if (!el) return;
    const r   = (angleDeg * Math.PI) / 180;
    const len = cy - tipY;
    const x2  = cx + len * Math.sin(r);
    const y2  = cy - len * Math.cos(r);
    el.setAttribute('x2', x2.toFixed(3));
    el.setAttribute('y2', y2.toFixed(3));
  }

  function _rotateHandSec(id, angleDeg, cx, cy, tipY, tailY) {
    const el = container.querySelector(`#${id}`);
    if (!el) return;
    const r     = (angleDeg * Math.PI) / 180;
    const lenFw = cy - tipY;
    const lenBk = tailY - cy;
    const x2 = cx + lenFw * Math.sin(r);
    const y2 = cy - lenFw * Math.cos(r);
    const x1 = cx - lenBk * Math.sin(r);
    const y1 = cy + lenBk * Math.cos(r);
    el.setAttribute('x1', x1.toFixed(3));
    el.setAttribute('y1', y1.toFixed(3));
    el.setAttribute('x2', x2.toFixed(3));
    el.setAttribute('y2', y2.toFixed(3));
  }

  // Démarrer immédiatement puis toutes les secondes
  _tick();
  const _interval = setInterval(_tick, 1000);

  // Nettoyer l'interval quand on quitte la page
  const _observer = new MutationObserver(() => {
    if (!document.body.contains(container)) {
      clearInterval(_interval);
      _observer.disconnect();
    }
  });
  _observer.observe(document.body, { childList: true, subtree: true });
}