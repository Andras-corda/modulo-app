// Dashboard

async function renderDashboard(container) {
  const profile  = (await window.modulo.profile.get()) ?? {};
  const settings = (await window.modulo.settings.get()) ?? {};
  const lang     = settings.lang ?? 'fr';

  // Greeting
  function _greeting() {
    const h = new Date().getHours();
    if (lang === 'en') {
      return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    }
    if (lang === 'es') return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
    if (lang === 'it') return h < 12 ? 'Buongiorno'  : h < 18 ? 'Buon pomeriggio' : 'Buonasera';
    if (lang === 'de') return h < 12 ? 'Guten Morgen': h < 18 ? 'Guten Tag'      : 'Guten Abend';
    if (lang === 'nl') return h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag'   : 'Goedenavond';
    return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  }

  // Météo 
  const WMO_CODES = {
    0:{icon:'☀️',label:'Clear'},1:{icon:'🌤',label:'Mainly clear'},2:{icon:'⛅',label:'Partly cloudy'},
    3:{icon:'☁️',label:'Overcast'},45:{icon:'🌫',label:'Fog'},48:{icon:'🌫',label:'Icy fog'},
    51:{icon:'🌦',label:'Drizzle'},53:{icon:'🌦',label:'Drizzle'},55:{icon:'🌧',label:'Heavy drizzle'},
    61:{icon:'🌧',label:'Light rain'},63:{icon:'🌧',label:'Rain'},65:{icon:'🌧',label:'Heavy rain'},
    71:{icon:'🌨',label:'Snow'},73:{icon:'🌨',label:'Snow'},75:{icon:'❄️',label:'Heavy snow'},
    80:{icon:'🌦',label:'Showers'},81:{icon:'🌧',label:'Heavy showers'},82:{icon:'⛈',label:'Storms'},
    95:{icon:'⛈',label:'Thunderstorm'},96:{icon:'⛈',label:'Thunderstorm'},99:{icon:'⛈',label:'Severe storm'},
  };

  async function _fetchWeather() {
    try {
      const res  = await fetch('https://api.open-meteo.com/v1/forecast?latitude=50.6402&longitude=5.5718&current=temperature_2m,weathercode&timezone=Europe%2FBrussels');
      const data = await res.json();
      const cur  = data.current;
      const wmo  = WMO_CODES[cur.weathercode] ?? { icon:'🌡', label:'Unknown' };
      return { temp: Math.round(cur.temperature_2m), icon: wmo.icon, label: wmo.label, city: 'Liège' };
    } catch { return null; }
  }

  // SVG clock
  function _analogClockSvg() {
    return `
      <svg id="dash-analog" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"
        style="position:absolute;inset:0;width:100%;height:100%;opacity:.07;pointer-events:none">
        ${Array.from({length:60}, (_,i) => {
          const a  = (i / 60) * 2 * Math.PI - Math.PI / 2;
          const r1 = i % 5 === 0 ? 82 : 88;
          const x1 = (100 + r1 * Math.cos(a)).toFixed(2);
          const y1 = (100 + r1 * Math.sin(a)).toFixed(2);
          const x2 = (100 + 92 * Math.cos(a)).toFixed(2);
          const y2 = (100 + 92 * Math.sin(a)).toFixed(2);
          return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
            stroke="currentColor" stroke-width="${i%5===0?1.8:0.8}" stroke-linecap="round"/>`;
        }).join('')}
        <circle cx="100" cy="100" r="94" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".5"/>
        <line id="dash-h" x1="100" y1="100" x2="100" y2="45" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
        <line id="dash-m" x1="100" y1="100" x2="100" y2="28" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
        <line id="dash-s" x1="100" y1="108" x2="100" y2="22" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity=".6"/>
        <circle cx="100" cy="100" r="3.5" fill="currentColor"/>
      </svg>
    `;
  }

  const pseudo  = profile.pseudo || '';
  const weather = await _fetchWeather();

  container.innerHTML = `
    <div style="
      position:relative;display:flex;align-items:center;justify-content:center;
      height:calc(100vh - 36px);overflow:hidden;color:var(--text-primary);
    ">
      <!-- Horloge analogique fond -->
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">
        <div style="width:min(68vh,68vw);height:min(68vh,68vw);max-width:520px;max-height:520px;position:relative">
          ${_analogClockSvg()}
        </div>
      </div>

      <!-- Contenu centré -->
      <div style="position:relative;text-align:center;display:flex;flex-direction:column;align-items:center">

        <!-- Greeting -->
        <div id="dash-greeting" style="
          font-size:13px;font-weight:400;letter-spacing:.6px;
          color:var(--text-tertiary);margin-bottom:28px;
        ">${_greeting()}${pseudo ? ', ' + pseudo : ''}</div>

        <!-- Horloge digitale -->
        <div style="display:flex;align-items:flex-start;line-height:1">
          <div id="dash-time" style="
            font-size:clamp(72px,11vw,120px);font-weight:300;
            letter-spacing:-4px;color:var(--text-primary);
            font-variant-numeric:tabular-nums;font-family:var(--font-mono);
          ">00:00</div>
          <sup id="dash-sec" style="
            font-size:clamp(18px,2.8vw,30px);font-weight:300;
            color:var(--text-tertiary);font-family:var(--font-mono);
            margin-top:.3em;margin-left:6px;font-variant-numeric:tabular-nums;
          ">00</sup>
        </div>

        <!-- Date -->
        <div id="dash-date" style="
          font-size:12px;font-weight:500;letter-spacing:3px;
          text-transform:uppercase;color:var(--text-tertiary);margin-top:12px;
        ">—</div>

        <!-- Météo pill -->
        ${weather ? `
          <div style="
            margin-top:24px;display:inline-flex;align-items:center;
            background:var(--bg-elevated);border:1px solid var(--border-strong);
            border-radius:9999px;padding:6px 18px;font-size:13px;
            color:var(--text-secondary);backdrop-filter:blur(8px);gap:0;
          ">
            <span style="font-size:16px;margin-right:8px">${weather.icon}</span>
            <span style="font-weight:500;color:var(--text-primary)">${weather.temp}°C</span>
            <span style="margin:0 10px;color:var(--text-tertiary)">·</span>
            <span>${weather.label}</span>
            <span style="margin:0 10px;color:var(--text-tertiary)">|</span>
            <span style="letter-spacing:.3px">${weather.city}</span>
          </div>
        ` : ''}

      </div>
    </div>
  `;

  // Tick
  function _tick() {
    const now = new Date();
    const hh  = now.getHours().toString().padStart(2,'0');
    const mm  = now.getMinutes().toString().padStart(2,'0');
    const ss  = now.getSeconds();
    const sss = ss.toString().padStart(2,'0');

    const timeEl = container.querySelector('#dash-time');
    const secEl  = container.querySelector('#dash-sec');
    if (timeEl) timeEl.textContent = `${hh}:${mm}`;
    if (secEl)  secEl.textContent  = sss;

    const dateEl = container.querySelector('#dash-date');
    if (dateEl) {
      const daysFr   = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
      const monthsFr = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
      const daysEn   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const monthsEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];

      const days   = lang === 'fr' ? daysFr   : daysEn;
      const months = lang === 'fr' ? monthsFr : monthsEn;
      dateEl.textContent = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    }

    const greetEl = container.querySelector('#dash-greeting');
    if (greetEl) greetEl.textContent = _greeting() + (pseudo ? ', ' + pseudo : '');

    const h = (now.getHours() % 12) + now.getMinutes() / 60 + ss / 3600;
    const m = now.getMinutes() + ss / 60;
    const s = ss + now.getMilliseconds() / 1000;

    _rotateHand('dash-h', (h / 12) * 360, 100, 100, 45);
    _rotateHand('dash-m', (m / 60) * 360, 100, 100, 28);
    _rotateHandSec('dash-s', (s / 60) * 360, 100, 100, 22, 108);
  }

  function _rotateHand(id, angleDeg, cx, cy, tipY) {
    const el = container.querySelector(`#${id}`);
    if (!el) return;
    const r   = (angleDeg * Math.PI) / 180;
    const len = cy - tipY;
    el.setAttribute('x2', (cx + len * Math.sin(r)).toFixed(3));
    el.setAttribute('y2', (cy - len * Math.cos(r)).toFixed(3));
  }

  function _rotateHandSec(id, angleDeg, cx, cy, tipY, tailY) {
    const el = container.querySelector(`#${id}`);
    if (!el) return;
    const r   = (angleDeg * Math.PI) / 180;
    const fw  = cy - tipY;
    const bk  = tailY - cy;
    el.setAttribute('x1', (cx - bk * Math.sin(r)).toFixed(3));
    el.setAttribute('y1', (cy + bk * Math.cos(r)).toFixed(3));
    el.setAttribute('x2', (cx + fw * Math.sin(r)).toFixed(3));
    el.setAttribute('y2', (cy - fw * Math.cos(r)).toFixed(3));
  }

  _tick();
  const _interval = setInterval(_tick, 1000);

  const _observer = new MutationObserver(() => {
    if (!document.body.contains(container)) {
      clearInterval(_interval);
      _observer.disconnect();
    }
  });
  _observer.observe(document.body, { childList: true, subtree: true });
}
