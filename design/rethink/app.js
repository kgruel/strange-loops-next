(function(){
  var tabs = Array.prototype.slice.call(document.querySelectorAll('nav.rail [role="tab"]'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('section.panel[role="tabpanel"]'));
  var ids = panels.map(function(p){ return p.id; });
  function show(id, focus){
    if (ids.indexOf(id) < 0) id = 'map';
    panels.forEach(function(p){ p.hidden = p.id !== id; });
    tabs.forEach(function(t){
      var on = t.getAttribute('aria-controls') === id;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on) { t.scrollIntoView({block:'nearest', inline:'nearest'}); if (focus) t.focus(); }
    });
    try { localStorage.setItem('slr-tab', id); } catch(e) {}
  }
  function go(id){
    show(id);
    try { history.replaceState(null, '', '#' + id); } catch(e) {}
    var rail = document.querySelector('nav.rail');
    var y = rail.getBoundingClientRect().top + window.scrollY;
    if (window.scrollY > y) window.scrollTo(0, y);
  }
  tabs.forEach(function(t, i){
    t.addEventListener('click', function(){ go(t.getAttribute('aria-controls')); });
    t.addEventListener('keydown', function(e){
      var j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') j = 0;
      if (e.key === 'End') j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); var id = tabs[j].getAttribute('aria-controls'); show(id, true); try { history.replaceState(null, '', '#' + id); } catch(err) {} }
    });
  });
  document.addEventListener('click', function(e){
    var a = e.target.closest('a[data-tab]');
    if (a) { e.preventDefault(); go(a.getAttribute('data-tab')); if (a.getAttribute('data-sub')) pickSub(a.getAttribute('data-sub')); }
  });
  document.querySelectorAll('.toggle-all').forEach(function(btn){
    btn.addEventListener('click', function(){
      var panel = btn.closest('section');
      var all = panel.querySelectorAll('details');
      var anyClosed = Array.prototype.some.call(all, function(d){ return !d.open; });
      all.forEach(function(d){ d.open = anyClosed; });
      btn.textContent = anyClosed ? 'Fold all' : 'Unfold all';
    });
  });
  // Horizons sub-tabs: one per walk
  var rail = document.querySelector('nav.rail');
  function setRailH(){ document.documentElement.style.setProperty('--railh', rail.offsetHeight + 'px'); }
  setRailH(); window.addEventListener('resize', setRailH);
  var bar = document.querySelector('.subtabs');
  var stabs = Array.prototype.slice.call(bar.querySelectorAll('[role="tab"]'));
  var spanels = Array.prototype.slice.call(document.querySelectorAll('.subpanel'));
  var sids = spanels.map(function(p){ return p.id; });
  function sub(id, focus){
    if (sids.indexOf(id) < 0) id = 'h-overview';
    spanels.forEach(function(p){ p.hidden = p.id !== id; });
    stabs.forEach(function(t){
      var on = t.getAttribute('aria-controls') === id;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on) {
        if (t.offsetLeft < bar.scrollLeft || t.offsetLeft + t.offsetWidth > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = t.offsetLeft - (bar.clientWidth - t.offsetWidth) / 2;
        if (focus) t.focus();
      }
    });
    try { localStorage.setItem('slr-hsub', id); } catch(e) {}
  }
  function pickSub(id, focus){
    sub(id, focus);
    try { history.replaceState(null, '', '#horizons/' + id); } catch(e) {}
    var y = bar.parentNode.getBoundingClientRect().top + window.scrollY;
    var top = bar.getBoundingClientRect().top + window.scrollY - rail.offsetHeight - 8;
    if (window.scrollY > top) window.scrollTo(0, Math.max(y, top));
  }
  stabs.forEach(function(t, i){
    t.addEventListener('click', function(){ pickSub(t.getAttribute('aria-controls')); });
    t.addEventListener('keydown', function(e){
      var j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % stabs.length;
      if (e.key === 'ArrowLeft') j = (i - 1 + stabs.length) % stabs.length;
      if (e.key === 'Home') j = 0;
      if (e.key === 'End') j = stabs.length - 1;
      if (j !== null) { e.preventDefault(); pickSub(stabs[j].getAttribute('aria-controls'), true); }
    });
  });
  spanels.forEach(function(p, i){
    var nav = document.createElement('div'); nav.className = 'subnext';
    [[i - 1, 'prev', '← '], [i + 1, 'next', '']].forEach(function(d){
      if (d[0] < 0 || d[0] >= spanels.length) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = d[1];
      var label = stabs[d[0]].textContent;
      b.textContent = d[1] === 'prev' ? '← ' + label : label + ' →';
      b.addEventListener('click', function(){ pickSub(sids[d[0]]); });
      nav.appendChild(b);
    });
    p.appendChild(nav);
  });
  var hp = (location.hash || '').replace('#', '').split('/');
  var start = hp[0];
  if (ids.indexOf(start) < 0) { try { start = localStorage.getItem('slr-tab') || 'map'; } catch(e) { start = 'map'; } }
  show(start);
  var savedSub = null; try { savedSub = localStorage.getItem('slr-hsub'); } catch(e) {}
  sub(hp[1] || savedSub || 'h-overview');
  window.addEventListener('hashchange', function(){ var h = (location.hash || '').replace('#','').split('/'); show(h[0]); if (h[1]) sub(h[1]); });
})();
