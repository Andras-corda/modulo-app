// ── Modulo Module: Watermark (watermark) v1.0.0 ──
// Author: Modulo Team
// Built: 2026-04-08T20:52:49.343Z
// renderFn: renderWatermark
// ── watermark/page/render.js ──
// ── Watermark Render ──

async function renderWatermark(container) {
  let _img = null, _imgFile = null, _wmImg = null, _canvas = null, _debounce = null;
  let _exportFmt = 'image/jpeg';

  let _cfg = {
    mode:'text', text:'Confidential', font:'sans-serif', fontSize:48,
    color:'#ffffff', opacity:0.4, rotation:-30, position:'center',
    marginX:20, marginY:20, tileGapX:200, tileGapY:150, wmScale:0.25,
  };

  const POSITIONS = [
    ['tl','↖'],['tc','↑'],['tr','↗'],
    ['ml','←'],['center','·'],['mr','→'],
    ['bl','↙'],['bc','↓'],['br','↘'],['tile','⊞'],
  ];

  function _setVal(id, val) { const e = container.querySelector('#'+id); if(e) e.textContent=val; }
  function _loadImage(file) {
    return new Promise((res,rej) => {
      const r = new FileReader();
      r.onload = e => { const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=e.target.result; };
      r.onerror=rej; r.readAsDataURL(file);
    });
  }
  function _bindDrop(dropId, inputId, onFile) {
    const drop=container.querySelector('#'+dropId), inp=container.querySelector('#'+inputId);
    if(!drop||!inp) return;
    drop.addEventListener('click',()=>inp.click());
    drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag-over');});
    drop.addEventListener('dragleave',()=>drop.classList.remove('drag-over'));
    drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('drag-over');const f=e.dataTransfer.files?.[0];if(f)onFile(f);});
    inp.addEventListener('change',e=>{const f=e.target.files?.[0];if(f){onFile(f);inp.value='';}});
  }

  function _getPos(W,H,tw,th) {
    const mx=_cfg.marginX,my=_cfg.marginY;
    const M={tl:[mx+tw/2,my+th/2],tc:[W/2,my+th/2],tr:[W-mx-tw/2,my+th/2],ml:[mx+tw/2,H/2],center:[W/2,H/2],mr:[W-mx-tw/2,H/2],bl:[mx+tw/2,H-my-th/2],bc:[W/2,H-my-th/2],br:[W-mx-tw/2,H-my-th/2]};
    const [cx,cy]=M[_cfg.position]??M.center;
    return{cx,cy};
  }

  function _drawTextWM(ctx,W,H) {
    ctx.font='bold '+_cfg.fontSize+'px '+_cfg.font;
    ctx.fillStyle=_cfg.color;
    const tw=ctx.measureText(_cfg.text).width, th=_cfg.fontSize;
    if(_cfg.position==='tile') {
      for(let y=-H;y<H*2;y+=_cfg.tileGapY) for(let x=-W;x<W*2;x+=_cfg.tileGapX) {
        ctx.save();ctx.translate(x,y);ctx.rotate(_cfg.rotation*Math.PI/180);
        ctx.fillText(_cfg.text,-tw/2,th/2);ctx.restore();
      }
    } else {
      const{cx,cy}=_getPos(W,H,tw,th);
      ctx.save();ctx.translate(cx,cy);ctx.rotate(_cfg.rotation*Math.PI/180);
      ctx.fillText(_cfg.text,-tw/2,th/2);ctx.restore();
    }
  }

  function _drawImageWM(ctx,W,H) {
    const wmW=Math.round(W*_cfg.wmScale), wmH=Math.round(wmW*_wmImg.naturalHeight/_wmImg.naturalWidth);
    if(_cfg.position==='tile') {
      for(let y=-H;y<H*2;y+=_cfg.tileGapY) for(let x=-W;x<W*2;x+=_cfg.tileGapX) {
        ctx.save();ctx.translate(x,y);ctx.rotate(_cfg.rotation*Math.PI/180);
        ctx.drawImage(_wmImg,-wmW/2,-wmH/2,wmW,wmH);ctx.restore();
      }
    } else {
      const{cx,cy}=_getPos(W,H,wmW,wmH);
      ctx.save();ctx.translate(cx,cy);ctx.rotate(_cfg.rotation*Math.PI/180);
      ctx.drawImage(_wmImg,-wmW/2,-wmH/2,wmW,wmH);ctx.restore();
    }
  }

  function _draw() {
    if(!_img||!_canvas) return;
    _canvas.width=_img.naturalWidth; _canvas.height=_img.naturalHeight;
    const ctx=_canvas.getContext('2d');
    ctx.drawImage(_img,0,0);
    ctx.globalAlpha=_cfg.opacity;
    if(_cfg.mode==='text') _drawTextWM(ctx,_canvas.width,_canvas.height);
    else if(_cfg.mode==='image'&&_wmImg) _drawImageWM(ctx,_canvas.width,_canvas.height);
    ctx.globalAlpha=1;
  }

  // ── Shell ─────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div style="display:flex;height:calc(100vh - 36px);overflow:hidden;background:var(--bg-base)">
      <div style="width:272px;flex-shrink:0;border-right:1px solid var(--border);background:var(--bg-surface);overflow-y:auto">
        <div style="padding:12px;border-bottom:1px solid var(--border)">
          <div class="wm-stitle">📷 Source image</div>
          <div class="wm-drop" id="wm-drop-src"><div style="font-size:22px">🖼️</div><div style="font-size:12px;margin-top:3px">Drop image or click</div><input type="file" id="wm-src-input" accept="image/*" style="display:none"></div>
          <div id="wm-src-name" style="font-size:10px;color:var(--text-tertiary);margin-top:4px;text-align:center"></div>
        </div>
        <div style="padding:12px;border-bottom:1px solid var(--border)">
          <div class="wm-stitle">🔧 Type</div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-primary btn-sm wm-mode" data-mode="text" style="flex:1;justify-content:center">Text</button>
            <button class="btn btn-secondary btn-sm wm-mode" data-mode="image" style="flex:1;justify-content:center">Image</button>
          </div>
        </div>
        <div id="wm-text-opts" style="padding:12px;border-bottom:1px solid var(--border)">
          <div class="wm-stitle">✏️ Text</div>
          <input class="input" id="wm-text" value="Confidential" placeholder="Watermark text" style="margin-bottom:7px">
          <div class="wm-row"><label class="wm-lbl">Font</label>
            <select class="input wm-ctrl" id="wm-font" style="height:28px;font-size:12px;flex:1">
              ${['sans-serif','serif','monospace','Georgia','Arial Black','Impact'].map(f=>`<option value="${f}">${f}</option>`).join('')}
            </select>
          </div>
          <div class="wm-row"><label class="wm-lbl">Size</label><input type="range" id="wm-fontsize" min="12" max="200" value="48" style="flex:1;accent-color:var(--purple)"><span id="wm-fontsize-val" style="font-size:11px;color:var(--text-tertiary);min-width:34px">48px</span></div>
          <div class="wm-row"><label class="wm-lbl">Color</label><input type="color" id="wm-color" value="#ffffff" style="width:36px;height:28px;border:1px solid var(--border);border-radius:4px;cursor:pointer;background:none"><span id="wm-color-val" style="font-size:10px;color:var(--text-tertiary);font-family:var(--font-mono)">#ffffff</span></div>
        </div>
        <div id="wm-image-opts" style="padding:12px;border-bottom:1px solid var(--border);display:none">
          <div class="wm-stitle">🖼️ Logo</div>
          <div class="wm-drop" id="wm-drop-wm" style="padding:12px"><div style="font-size:18px">📎</div><div style="font-size:11px;margin-top:2px">Drop logo or click</div><input type="file" id="wm-wm-input" accept="image/*" style="display:none"></div>
          <div id="wm-wm-name" style="font-size:10px;color:var(--text-tertiary);margin-top:4px;text-align:center"></div>
          <div class="wm-row" style="margin-top:8px"><label class="wm-lbl">Scale</label><input type="range" id="wm-wmscale" min="5" max="80" value="25" style="flex:1;accent-color:var(--purple)"><span id="wm-wmscale-val" style="font-size:11px;color:var(--text-tertiary);min-width:34px">25%</span></div>
        </div>
        <div style="padding:12px;border-bottom:1px solid var(--border)">
          <div class="wm-stitle">📍 Position</div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:3px;margin-bottom:8px">
            ${POSITIONS.map(([p,ic])=>`<button class="btn wm-pos ${p==='center'?'btn-primary':'btn-secondary'} btn-sm" data-pos="${p}" style="padding:5px;justify-content:center;font-size:13px" title="${p}">${ic}</button>`).join('')}
          </div>
          <div class="wm-row"><label class="wm-lbl">Opacity</label><input type="range" id="wm-opacity" min="5" max="100" value="40" style="flex:1;accent-color:var(--purple)"><span id="wm-opacity-val" style="font-size:11px;color:var(--text-tertiary);min-width:34px">40%</span></div>
          <div class="wm-row"><label class="wm-lbl">Rotation</label><input type="range" id="wm-rotation" min="-180" max="180" value="-30" style="flex:1;accent-color:var(--purple)"><span id="wm-rot-val" style="font-size:11px;color:var(--text-tertiary);min-width:34px">-30°</span></div>
          <div id="wm-tile-opts" style="display:none">
            <div class="wm-row"><label class="wm-lbl">Gap X</label><input type="range" id="wm-gapx" min="50" max="600" value="200" style="flex:1;accent-color:var(--purple)"><span id="wm-gapx-val" style="font-size:11px;color:var(--text-tertiary);min-width:34px">200</span></div>
            <div class="wm-row"><label class="wm-lbl">Gap Y</label><input type="range" id="wm-gapy" min="50" max="400" value="150" style="flex:1;accent-color:var(--purple)"><span id="wm-gapy-val" style="font-size:11px;color:var(--text-tertiary);min-width:34px">150</span></div>
          </div>
        </div>
        <div style="padding:12px">
          <button class="btn btn-primary" id="wm-export" style="width:100%;justify-content:center;margin-bottom:6px">⬇️ Download</button>
          <div style="display:flex;gap:5px">
            <button class="btn btn-primary btn-sm wm-fmt" data-fmt="image/jpeg" style="flex:1;font-size:11px;justify-content:center">JPEG</button>
            <button class="btn btn-secondary btn-sm wm-fmt" data-fmt="image/png" style="flex:1;font-size:11px;justify-content:center">PNG</button>
            <button class="btn btn-secondary btn-sm wm-fmt" data-fmt="image/webp" style="flex:1;font-size:11px;justify-content:center">WEBP</button>
          </div>
        </div>
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative">
        <div style="position:absolute;inset:0;background-image:repeating-conic-gradient(rgba(128,128,128,.05) 0% 25%,transparent 0% 50%);background-size:16px 16px;pointer-events:none"></div>
        <div id="wm-empty" style="text-align:center;position:relative;z-index:1;color:var(--text-tertiary)"><div style="font-size:48px;opacity:.3">🖼️</div><div style="font-size:14px;margin-top:8px">Drop an image to start</div></div>
        <canvas id="wm-canvas" style="display:none;max-width:calc(100%-32px);max-height:calc(100%-32px);border-radius:var(--radius-md);box-shadow:0 8px 32px rgba(0,0,0,.4);position:relative;z-index:1"></canvas>
      </div>
    </div>
    <style>
      .wm-stitle{font-size:10px;font-weight:600;letter-spacing:.7px;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:8px}
      .wm-drop{border:2px dashed var(--border-strong);border-radius:var(--radius-lg);padding:18px;text-align:center;cursor:pointer;transition:all .15s;background:var(--bg-card)}
      .wm-drop:hover,.wm-drop.drag-over{border-color:var(--purple);background:rgba(156,39,176,.07)}
      .wm-row{display:flex;align-items:center;gap:8px;margin-bottom:7px}
      .wm-lbl{font-size:11px;color:var(--text-secondary);min-width:58px;flex-shrink:0}
    </style>
  `;

  _canvas = container.querySelector('#wm-canvas');

  _bindDrop('wm-drop-src','wm-src-input', async file => {
    _imgFile=file; _img=await _loadImage(file);
    container.querySelector('#wm-empty').style.display='none';
    _canvas.style.display='block';
    container.querySelector('#wm-src-name').textContent=file.name;
    _draw();
  });
  _bindDrop('wm-drop-wm','wm-wm-input', async file => {
    _wmImg=await _loadImage(file);
    container.querySelector('#wm-wm-name').textContent=file.name;
    _draw();
  });

  container.querySelectorAll('.wm-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      _cfg.mode=btn.dataset.mode;
      container.querySelectorAll('.wm-mode').forEach(b=>{b.className='btn btn-sm wm-mode '+(b.dataset.mode===_cfg.mode?'btn-primary':'btn-secondary');b.style.flex='1';b.style.justifyContent='center';});
      container.querySelector('#wm-text-opts').style.display=_cfg.mode==='text'?'':'none';
      container.querySelector('#wm-image-opts').style.display=_cfg.mode==='image'?'':'none';
      _draw();
    });
  });

  container.querySelectorAll('.wm-pos').forEach(btn => {
    btn.addEventListener('click', () => {
      _cfg.position=btn.dataset.pos;
      container.querySelectorAll('.wm-pos').forEach(b=>{b.className='btn wm-pos '+(b.dataset.pos===_cfg.position?'btn-primary':'btn-secondary')+' btn-sm';b.style.cssText='padding:5px;justify-content:center;font-size:13px';});
      container.querySelector('#wm-tile-opts').style.display=_cfg.position==='tile'?'':'none';
      _draw();
    });
  });

  container.querySelectorAll('.wm-fmt').forEach(btn => {
    btn.addEventListener('click', () => {
      _exportFmt=btn.dataset.fmt;
      container.querySelectorAll('.wm-fmt').forEach(b=>{b.className='btn btn-sm wm-fmt '+(b.dataset.fmt===_exportFmt?'btn-primary':'btn-secondary');b.style.cssText='flex:1;font-size:11px;justify-content:center';});
    });
  });

  [['wm-text','value',v=>_cfg.text=v],['wm-font','value',v=>_cfg.font=v],
   ['wm-fontsize','value',v=>{_cfg.fontSize=+v;_setVal('wm-fontsize-val',v+'px');}],
   ['wm-color','value',v=>{_cfg.color=v;_setVal('wm-color-val',v);}],
   ['wm-opacity','value',v=>{_cfg.opacity=v/100;_setVal('wm-opacity-val',v+'%');}],
   ['wm-rotation','value',v=>{_cfg.rotation=+v;_setVal('wm-rot-val',v+'°');}],
   ['wm-wmscale','value',v=>{_cfg.wmScale=v/100;_setVal('wm-wmscale-val',v+'%');}],
   ['wm-gapx','value',v=>{_cfg.tileGapX=+v;_setVal('wm-gapx-val',v);}],
   ['wm-gapy','value',v=>{_cfg.tileGapY=+v;_setVal('wm-gapy-val',v);}],
  ].forEach(([id,prop,setter]) => {
    const el=container.querySelector('#'+id);
    if(!el) return;
    ['input','change'].forEach(ev=>el.addEventListener(ev,e=>{setter(e.target[prop]);clearTimeout(_debounce);_debounce=setTimeout(_draw,80);}));
  });

  container.querySelector('#wm-export')?.addEventListener('click', () => {
    if(!_canvas||!_img) return;
    const ext=_exportFmt.split('/')[1];
    const name=(_imgFile?.name??'image').replace(/\.[^.]+$/,'')+`_watermark.${ext}`;
    const a=document.createElement('a');
    a.href=_canvas.toDataURL(_exportFmt,_exportFmt==='image/png'?undefined:0.92);
    a.download=name; a.click();
  });
}

// ── Expose renderFn ──
window["renderWatermark"] = renderWatermark;
