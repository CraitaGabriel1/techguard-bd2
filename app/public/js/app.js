// =====================================================================
//  TECHGUARD – public/js/app.js
//  Interacțiuni și animații: notificări (toast), apariție la scroll,
//  adăugare în coș fără reîncărcare, căutare live, contoare animate.
// =====================================================================
(function () {
  'use strict';

  const lei = (x) => Number(x).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // -------------------------------------------------------------------
  // 1. NOTIFICĂRI „TOAST” – apar în colț și dispar singure
  // -------------------------------------------------------------------
  const zonaToast = document.createElement('div');
  zonaToast.className = 'toast-zone';
  document.body.appendChild(zonaToast);

  function toast(text, tip = 'succes') {
    const t = document.createElement('div');
    t.className = `toast toast-${tip}`;
    const icon = { succes: '✓', eroare: '!', info: 'i' }[tip] || 'i';
    t.innerHTML = `<span class="toast-icon">${icon}</span><span>${escape(text)}</span><button aria-label="Închide">×</button>`;
    zonaToast.appendChild(t);
    const inchide = () => { t.classList.add('out'); setTimeout(() => t.remove(), 300); };
    t.querySelector('button').onclick = inchide;
    setTimeout(inchide, tip === 'eroare' ? 6000 : 3500);
  }
  window.toast = toast;

  // Mesajele trimise de server (.flash) devin toast-uri
  document.querySelectorAll('.flash').forEach((f) => {
    const tip = f.classList.contains('flash-eroare') ? 'eroare' : f.classList.contains('flash-info') ? 'info' : 'succes';
    toast(f.textContent.trim(), tip);
    f.remove();
  });

  // -------------------------------------------------------------------
  // 2. APARIȚIE LA SCROLL – elementele urcă ușor când intră în ecran
  // -------------------------------------------------------------------
  const deAnimat = document.querySelectorAll(
    '.grid-products > .card, .grid-cat > .card, .slider-track > *, .cat-tiles > *, .stats > .card, .section-head, .service-banner, ' +
    '.perks > .card, .two-cols > *, .cart-row, .table tbody tr, .timeline li, .page-title, .catalog-head');

  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((intrari) => {
      intrari.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    deAnimat.forEach((el) => {
      // întârziere în cascadă pentru elementele din același grup
      const frati = Array.from(el.parentElement.children);
      const index = Math.min(frati.indexOf(el), 12);
      el.style.setProperty('--delay', `${index * 55}ms`);
      el.classList.add('reveal');
      obs.observe(el);
    });
  }

  // Pozele produselor apar cu fade când s-au încărcat
  document.querySelectorAll('.product-img img, .product-gallery img, .cart-img img').forEach((img) => {
    if (img.complete) img.classList.add('loaded');
    else img.addEventListener('load', () => img.classList.add('loaded'));
  });

  // -------------------------------------------------------------------
  // 3. ADAUGĂ ÎN COȘ FĂRĂ REÎNCĂRCAREA PAGINII
  // -------------------------------------------------------------------
  function actualizeazaCos(nr) {
    const btn = document.querySelector('.btn-cart');
    if (!btn) return;
    let bulina = btn.querySelector('.cart-count');
    if (!bulina) {
      bulina = document.createElement('span');
      bulina.className = 'cart-count';
      btn.appendChild(bulina);
    }
    bulina.textContent = nr;
    btn.classList.remove('bump');
    void btn.offsetWidth;            // repornește animația
    btn.classList.add('bump');
  }

  document.addEventListener('submit', async (ev) => {
    const form = ev.target;
    if (form.getAttribute('action') !== '/cos/adauga') return;
    // „Cumpără acum” merge direct în coș, deci lăsăm formularul clasic
    if (ev.submitter && ev.submitter.name === 'redirect') return;

    ev.preventDefault();
    const buton = ev.submitter || form.querySelector('button');
    const textInitial = buton.innerHTML;
    buton.disabled = true;
    buton.classList.add('loading');

    try {
      const r = await fetch('/cos/adauga', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)),
      });
      const d = await r.json();
      if (d.redirect) { window.location = d.redirect; return; }
      if (d.ok) {
        buton.classList.add('added');
        buton.innerHTML = '✓ Adăugat';
        actualizeazaCos(d.nrCos);
        toast(d.mesaj, 'succes');
        setTimeout(() => { buton.classList.remove('added'); buton.innerHTML = textInitial; }, 1600);
      } else {
        toast(d.mesaj, 'eroare');
        buton.innerHTML = textInitial;
      }
    } catch (e) {
      form.submit();                 // dacă ceva nu merge, trimitem formularul clasic
    } finally {
      buton.disabled = false;
      buton.classList.remove('loading');
    }
  });

  // -------------------------------------------------------------------
  // 4. CĂUTARE LIVE – sugestii sub bara de căutare (/api/cautare)
  // -------------------------------------------------------------------
  const formCautare = document.querySelector('form.search');
  if (formCautare) {
    const input = formCautare.querySelector('input[name=q]');
    const lista = document.createElement('div');
    lista.className = 'search-results';
    formCautare.appendChild(lista);
    let temporizator, ultimaCerere = 0, selectat = -1;

    const ascunde = () => { lista.classList.remove('open'); selectat = -1; };
    const marcheaza = (text, q) => escape(text).replace(
      new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<mark>$1</mark>');

    input.setAttribute('autocomplete', 'off');
    input.addEventListener('input', () => {
      clearTimeout(temporizator);
      const q = input.value.trim();
      if (q.length < 2) return ascunde();
      temporizator = setTimeout(async () => {
        const nr = ++ultimaCerere;
        const r = await fetch('/api/cautare?q=' + encodeURIComponent(q));
        const produse = await r.json();
        if (nr !== ultimaCerere) return;   // a venit deja o cerere mai nouă
        selectat = -1;
        lista.innerHTML = produse.length
          ? produse.map((p) => `
              <a href="/produs/${p.id_produs}" class="sr-item">
                <span class="sr-img">${p.imagine_url ? `<img src="${escape(p.imagine_url)}" alt="">` : ''}</span>
                <span class="sr-info"><span class="sr-name">${marcheaza(p.nume, q)}</span>
                  <span class="sr-meta">${escape(p.marca)} · ${p.stoc > 0 ? 'în stoc' : '<span class="danger-text">stoc epuizat</span>'}</span></span>
                <span class="sr-price">${lei(p.pret)} <small>lei</small></span>
              </a>`).join('') +
            `<a href="/produse?q=${encodeURIComponent(q)}" class="sr-all">Vezi toate rezultatele pentru „${escape(q)}” →</a>`
          : `<div class="sr-empty">Niciun produs găsit pentru „${escape(q)}”</div>`;
        lista.classList.add('open');
      }, 180);
    });

    // Navigare cu săgețile și Enter
    input.addEventListener('keydown', (e) => {
      const iteme = lista.querySelectorAll('a');
      if (!lista.classList.contains('open') || !iteme.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        selectat = (selectat + (e.key === 'ArrowDown' ? 1 : -1) + iteme.length) % iteme.length;
        iteme.forEach((a, i) => a.classList.toggle('active', i === selectat));
      } else if (e.key === 'Enter' && selectat >= 0) {
        e.preventDefault();
        window.location = iteme[selectat].href;
      } else if (e.key === 'Escape') {
        ascunde();
      }
    });
    document.addEventListener('click', (e) => { if (!formCautare.contains(e.target)) ascunde(); });
    input.addEventListener('focus', () => { if (lista.innerHTML && input.value.trim().length >= 2) lista.classList.add('open'); });
  }

  // -------------------------------------------------------------------
  // 5. CONTOARE ANIMATE – cifrele din statistici „numără” până la valoare
  // -------------------------------------------------------------------
  document.querySelectorAll('.stat b').forEach((el) => {
    const text = el.textContent.trim();
    if (/^\d{2}\.\d{2}\.\d{4}/.test(text)) return;   // dată calendaristică, nu număr
    const potrivire = text.match(/^([\d.]+(?:,\d+)?)(.*)$/);
    if (!potrivire) return;                         // ex. o dată calendaristică
    const zecimale = (potrivire[1].split(',')[1] || '').length;
    const tinta = parseFloat(potrivire[1].replace(/\./g, '').replace(',', '.'));
    const sufix = potrivire[2];
    el.dataset.valoare = tinta;                    // folosit și de actualizarea live
    const durata = 900, start = performance.now();
    const pas = (acum) => {
      const p = Math.min(1, (acum - start) / durata);
      const usor = 1 - Math.pow(1 - p, 3);          // încetinește spre final
      el.textContent = (tinta * usor).toLocaleString('ro-RO',
        { minimumFractionDigits: zecimale, maximumFractionDigits: zecimale }) + sufix;
      if (p < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  });
  // ===================================================================
  // 6. ELEMENTE „LIVE” – date reale din baza de date, actualizate singure
  // ===================================================================
  const esteAdmin = document.body.classList.contains('admin');

  function acum(data) {                    // „acum 5 minute”, „acum 2 zile”
    const s = Math.max(0, (Date.now() - new Date(data)) / 1000);
    if (s < 60) return 'chiar acum';
    const m = Math.floor(s / 60); if (m < 60) return `acum ${m} ${m === 1 ? 'minut' : 'minute'}`;
    const h = Math.floor(m / 60); if (h < 24) return `acum ${h} ${h === 1 ? 'oră' : 'ore'}`;
    const z = Math.floor(h / 24); return `acum ${z} ${z === 1 ? 'zi' : 'zile'}`;
  }
  const getJSON = (url) => fetch(url, { headers: { Accept: 'application/json' } }).then((r) => r.json());

  // 6a. Banda LIVE din bara de sus – mesaje care se schimbă pe rând
  const liveText = document.getElementById('live-text');
  if (liveText) {
    let mesaje = [], i = 0;
    const incarca = () => getJSON('/api/live').then((d) => {
      mesaje = [
        `${d.produse_disponibile} produse disponibile acum`,
        `${Number(d.bucati_stoc).toLocaleString('ro-RO')} bucăți pe stoc`,
        `${d.comenzi_7zile} comenzi în ultimele 7 zile`,
        `${d.reparatii_in_lucru} reparații în lucru în service`,
        d.ultima_comanda ? `ultima comandă: ${acum(d.ultima_comanda)}` : null,
      ].filter(Boolean);
    }).catch(() => {});
    const roteste = () => {
      if (!mesaje.length) return;
      liveText.classList.add('swap');
      setTimeout(() => { liveText.textContent = mesaje[i++ % mesaje.length]; liveText.classList.remove('swap'); }, 250);
    };
    incarca().then(roteste);
    setInterval(roteste, 3800);
    setInterval(incarca, 20000);
  }

  // 6b. „Activitate recentă” – cine a comandat ce (comenzi reale din BD)
  let fereastraInchisa = false;
  try { fereastraInchisa = sessionStorage.getItem('tg-activitate') === 'off'; } catch (e) {}
  if (!esteAdmin && !fereastraInchisa) {
    getJSON('/api/activitate').then((lista) => {
      if (!lista.length) return;
      const card = document.createElement('div');
      card.className = 'activity';
      document.body.appendChild(card);
      let k = 0;
      const arata = () => {
        const a = lista[k++ % lista.length];
        card.classList.remove('show');
        setTimeout(() => {
          card.innerHTML = `
            <a href="/produs/${a.id_produs}" class="act-img">${a.imagine_url ? `<img src="${escape(a.imagine_url)}" alt="">` : ''}</a>
            <div class="act-body">
              <span class="act-who"><i class="live-dot"></i> <b>${escape(a.client)}</b> din ${escape(a.oras)} a comandat</span>
              <a href="/produs/${a.id_produs}" class="act-prod">${escape(a.produs)}</a>
              <span class="act-time">${acum(a.data_comanda)} · comandă verificată</span>
            </div>
            <button class="act-close" aria-label="Închide">×</button>`;
          card.querySelector('.act-close').onclick = () => {
            card.remove(); clearInterval(ciclu);
            try { sessionStorage.setItem('tg-activitate', 'off'); } catch (e) {}
          };
          card.classList.add('show');
          setTimeout(() => card.classList.remove('show'), 6500);
        }, 400);
      };
      setTimeout(arata, 4000);
      const ciclu = setInterval(arata, 14000);
    }).catch(() => {});
  }

  // 6c. Pagina produsului – stocul se actualizează singur
  const zonaStoc = document.querySelector('[data-live-stoc]');
  if (zonaStoc) {
    const id = zonaStoc.dataset.liveStoc;
    let stocVechi = null;
    const verifica = () => getJSON('/api/stoc/' + id).then((d) => {
      if (d.stoc == null) return;
      const html = d.stoc <= 0 ? '<span class="stock out"><i class="live-dot red"></i> Stoc epuizat</span>'
        : d.stoc <= 5 ? `<span class="stock low"><i class="live-dot orange"></i> Ultimele <b>${d.stoc}</b> bucăți</span>`
        : `<span class="stock ok"><i class="live-dot"></i> În stoc · <b>${d.stoc}</b> buc.</span>`;
      zonaStoc.querySelector('.stock').outerHTML = html;
      if (stocVechi !== null && stocVechi !== d.stoc) {
        zonaStoc.classList.remove('changed'); void zonaStoc.offsetWidth; zonaStoc.classList.add('changed');
      }
      stocVechi = d.stoc;
      const linie = zonaStoc.querySelector('.sold-line');
      if (Number(d.vandute) > 0) {
        linie.hidden = false;
        linie.innerHTML = Number(d.vandute) === 1 ? '🔥 Vândut deja o dată' : `🔥 Vândut de <b>${d.vandute}</b> ori`;
      }
    }).catch(() => {});
    verifica();
    setInterval(verifica, 8000);
  }

  // 6d. Panoul de administrare – statistici și comenzi noi în timp real
  const valoriLive = document.querySelectorAll('[data-live]');
  if (valoriLive.length) {
    const tabel = document.getElementById('live-comenzi');
    const etichetaTimp = document.getElementById('live-updated');
    const STATUS = { plasata: 'Plasată', procesata: 'Procesată', expediata: 'Expediată', livrata: 'Livrată', anulata: 'Anulată' };
    let ultimaActualizare = Date.now();

    const animaNumar = (el, din, spre, zecimale, sufix) => {
      const start = performance.now();
      const pas = (t) => {
        const p = Math.min(1, (t - start) / 700);
        el.textContent = (din + (spre - din) * p).toLocaleString('ro-RO',
          { minimumFractionDigits: zecimale, maximumFractionDigits: zecimale }) + sufix;
        if (p < 1) requestAnimationFrame(pas);
      };
      requestAnimationFrame(pas);
      const card = el.closest('.stat');
      card.classList.remove('flash-update'); void card.offsetWidth; card.classList.add('flash-update');
    };

    const rand = (c) => `
      <td><a href="/admin/comenzi/${c.id_comanda}"><b>${escape(c.numar_comanda)}</b></a><br><span class="muted small">${escape(c.client)}</span></td>
      <td><span class="status s-${c.status}">${STATUS[c.status]}</span></td>
      <td class="right"><b>${lei(c.total)}</b></td>`;

    const actualizeaza = () => getJSON('/admin/api/live').then(({ stat, comenzi }) => {
      valoriLive.forEach((el) => {
        const cheie = el.dataset.live;
        const bani = cheie === 'vanzari_luna';
        const nou = Number(stat[cheie]);
        const vechi = el.dataset.valoare != null ? Number(el.dataset.valoare) : nou;
        el.dataset.valoare = nou;
        if (nou !== vechi) animaNumar(el, vechi, nou, bani ? 2 : 0, bani ? ' lei' : '');
      });
      if (tabel) {
        const tbody = tabel.tBodies[0] || tabel;
        [...comenzi].reverse().forEach((c) => {
          const existent = tbody.querySelector(`tr[data-id="${c.id_comanda}"]`);
          if (existent) {
            const st = existent.querySelector('.status');
            if (st && !st.classList.contains('s-' + c.status)) existent.innerHTML = rand(c);
            return;
          }
          const tr = document.createElement('tr');
          tr.dataset.id = c.id_comanda;
          tr.className = 'row-new';
          tr.innerHTML = rand(c);
          tbody.prepend(tr);
          toast(`Comandă nouă: ${c.numar_comanda} – ${lei(c.total)} lei (${c.client})`, 'info');
        });
        [...tbody.querySelectorAll('tr')].slice(6).forEach((tr) => tr.remove());
      }
      ultimaActualizare = Date.now();
    }).catch(() => {});

    // valorile inițiale (din pagina generată de server)
    valoriLive.forEach((el) => {
      if (el.dataset.valoare == null) el.dataset.valoare = parseFloat(el.textContent.replace(/\./g, '').replace(',', '.')) || 0;
    });
    setInterval(actualizeaza, 5000);
    setInterval(() => {
      if (etichetaTimp) etichetaTimp.textContent = `actualizat ${Math.round((Date.now() - ultimaActualizare) / 1000)}s în urmă`;
    }, 1000);
  }
  // ===================================================================
  // 7. FERESTRE DE CONFIRMARE ANIMATE (înlocuiesc confirm() din browser)
  //    <form data-confirm="Ștergi produsul?"> → apare o fereastră proprie
  // ===================================================================
  function confirmare(mesaj, periculos = true) {
    return new Promise((rezolva) => {
      const fundal = document.createElement('div');
      fundal.className = 'modal-backdrop';
      fundal.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-icon ${periculos ? 'danger' : ''}">${periculos ? '!' : '?'}</div>
          <h3>Confirmare</h3>
          <p>${escape(mesaj)}</p>
          <div class="modal-actions">
            <button type="button" class="btn-ghost" data-r="0">Renunță</button>
            <button type="button" class="${periculos ? 'btn-danger-solid' : 'btn-accent'}" data-r="1">Da, continuă</button>
          </div>
        </div>`;
      document.body.appendChild(fundal);
      requestAnimationFrame(() => fundal.classList.add('open'));
      fundal.querySelector('[data-r="1"]').focus();

      const inchide = (raspuns) => {
        fundal.classList.remove('open');
        fundal.classList.add('closing');
        document.removeEventListener('keydown', taste);
        setTimeout(() => fundal.remove(), 250);
        rezolva(raspuns);
      };
      const taste = (e) => { if (e.key === 'Escape') inchide(false); };
      document.addEventListener('keydown', taste);
      fundal.addEventListener('click', (e) => {
        if (e.target === fundal) {                       // click în afara ferestrei
          const m = fundal.querySelector('.modal');
          m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake');
        }
        const b = e.target.closest('[data-r]');
        if (b) inchide(b.dataset.r === '1');
      });
    });
  }
  window.confirmare = confirmare;

  document.addEventListener('submit', async (ev) => {
    const form = ev.target;
    if (!form.dataset.confirm || form.dataset.confirmat) return;
    // data-confirm-daca="anulata" → cere confirmare doar dacă s-a ales statusul „anulata”
    if (form.dataset.confirmDaca && form.status && form.status.value !== form.dataset.confirmDaca) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    if (await confirmare(form.dataset.confirm)) {
      form.dataset.confirmat = '1';
      form.requestSubmit(ev.submitter || undefined);
    }
  }, true);
  // ===================================================================
  // 8. SLIDERE ORIZONTALE (bannerul rotativ și rândurile de produse)
  //    săgeți, puncte, tragere cu mouse-ul și derulare automată
  // ===================================================================
  const faraMiscare = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.slider').forEach((slider) => {
    const pista = slider.querySelector('.slider-track');
    const inainte = slider.querySelector('.slider-btn.next');
    const inapoi = slider.querySelector('.slider-btn.prev');
    const zonaPuncte = slider.querySelector('.slider-dots');
    const elemente = [...pista.children];
    if (!elemente.length) return;

    const pas = () => {
      const gap = parseFloat(getComputedStyle(pista).columnGap) || 16;
      return elemente[elemente.length > 1 ? 1 : 0].offsetWidth + gap;
    };
    const laFinal = () => pista.scrollLeft + pista.clientWidth >= pista.scrollWidth - 4;
    // Animație proprie, cursivă (easing), în locul derulării bruște a browserului
    let animatie = null;
    const deruleazaLa = (stanga) => {
      const max = pista.scrollWidth - pista.clientWidth;
      const tinta = Math.max(0, Math.min(max, stanga));
      const start = pista.scrollLeft, dist = tinta - start, durata = 650, t0 = performance.now();
      cancelAnimationFrame(animatie);
      pista.classList.add('animating');                 // oprește „snap”-ul pe durata animației
      const cadru = (t) => {
        const p = Math.min(1, (t - t0) / durata);
        const e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;   // easeInOutCubic
        pista.scrollLeft = start + dist * e;
        if (p < 1) animatie = requestAnimationFrame(cadru);
        else pista.classList.remove('animating');
      };
      animatie = requestAnimationFrame(cadru);
    };
    const misca = (directie) => {
      if (directie > 0 && laFinal()) deruleazaLa(0);                       // reia de la început
      else {
        const vizibile = Math.max(1, Math.floor(pista.clientWidth / pas()) - (slider.dataset.autoplay ? 0 : 1));
        deruleazaLa(Math.round(pista.scrollLeft / pas()) * pas() + directie * pas() * (slider.dataset.autoplay ? 1 : vizibile));
      }
    };
    inainte && inainte.addEventListener('click', () => misca(1));
    inapoi && inapoi.addEventListener('click', () => misca(-1));

    // Punctele de sub banner
    let puncte = [];
    if (zonaPuncte) {
      puncte = elemente.map((el, i) => {
        const b = document.createElement('button');
        b.setAttribute('aria-label', `Slide ${i + 1}`);
        b.onclick = () => deruleazaLa(el.offsetLeft - pista.offsetLeft);
        zonaPuncte.appendChild(b);
        return b;
      });
    }
    // Bară de progres sub rândurile de produse
    let progres = null;
    if (!zonaPuncte) {
      progres = document.createElement('div');
      progres.className = 'slider-progress';
      progres.innerHTML = '<i></i>';
      slider.appendChild(progres);
    }
    const stare = () => {
      if (progres) {
        const vizibil = pista.clientWidth / pista.scrollWidth;
        const bara = progres.firstChild;
        bara.style.width = (vizibil * 100) + '%';
        bara.style.transform = `translateX(${(pista.scrollLeft / pista.clientWidth) * 100}%)`;
      }
      if (inapoi) inapoi.classList.toggle('hidden', pista.scrollLeft < 4);
      if (inainte && !slider.dataset.autoplay) inainte.classList.toggle('hidden', laFinal());
      if (puncte.length) {
        const centru = pista.scrollLeft + 40;
        let activ = 0;
        elemente.forEach((el, i) => { if (el.offsetLeft - pista.offsetLeft <= centru) activ = i; });
        if (laFinal()) activ = elemente.length - 1;
        puncte.forEach((p, i) => p.classList.toggle('active', i === activ));
      }
    };
    pista.addEventListener('scroll', () => requestAnimationFrame(stare), { passive: true });
    window.addEventListener('resize', stare);
    stare();

    // Tragere cu mouse-ul (pe telefon merge oricum cu degetul)
    let apasat = false, startX = 0, startScroll = 0, tras = false;
    pista.addEventListener('mousedown', (e) => {
      apasat = true; tras = false; startX = e.pageX; startScroll = pista.scrollLeft;
      pista.classList.add('dragging');
    });
    window.addEventListener('mousemove', (e) => {
      if (!apasat) return;
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 5) tras = true;
      pista.scrollLeft = startScroll - dx;
    });
    window.addEventListener('mouseup', () => { if (apasat) { apasat = false; pista.classList.remove('dragging'); } });
    pista.addEventListener('click', (e) => { if (tras) { e.preventDefault(); e.stopPropagation(); } }, true);
    pista.addEventListener('dragstart', (e) => e.preventDefault());

    // Derulare automată (doar bannerul), oprită cât timp mouse-ul e deasupra
    const interval = Number(slider.dataset.autoplay);
    if (interval && !faraMiscare) {
      let pauza = false;
      slider.addEventListener('mouseenter', () => { pauza = true; });
      slider.addEventListener('mouseleave', () => { pauza = false; });
      setInterval(() => { if (!pauza && !document.hidden) misca(1); }, interval);
    }
  });
  // ===================================================================
  // 9. DERULARE CURSIVĂ A PAGINII (rotița mouse-ului + linkuri #ancoră)
  // ===================================================================
  const ecranTactil = window.matchMedia('(pointer: coarse)').matches;
  let tintaY = window.scrollY, curentY = window.scrollY, ruleaza = false;
  const maxY = () => document.documentElement.scrollHeight - window.innerHeight;
  const bucla = () => {
    curentY += (tintaY - curentY) * 0.12;
    if (Math.abs(tintaY - curentY) < 0.5) { curentY = tintaY; ruleaza = false; }
    window.scrollTo(0, curentY);
    if (ruleaza) requestAnimationFrame(bucla);
  };
  const inaltimeHeader = () => { const h = document.querySelector('.header'); return h ? h.offsetHeight + 20 : 20; };
  function deruleazaPagina(y) {
    if (faraMiscare) { window.scrollTo(0, y); return; }
    if (!ruleaza) { curentY = window.scrollY; }
    tintaY = Math.max(0, Math.min(maxY(), y));
    if (!ruleaza) { ruleaza = true; requestAnimationFrame(bucla); }
  }
  window.deruleazaPagina = deruleazaPagina;

  if (!faraMiscare && !ecranTactil) {
    window.addEventListener('wheel', (e) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (e.target.closest('textarea, select, .search-results, .modal-backdrop, .mega-panel')) return;
      e.preventDefault();
      if (!ruleaza) tintaY = window.scrollY;
      const delta = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
      deruleazaPagina(tintaY + delta);
    }, { passive: false });
    // dacă utilizatorul folosește bara de derulare sau tastatura, ne sincronizăm
    window.addEventListener('scroll', () => { if (!ruleaza) tintaY = curentY = window.scrollY; }, { passive: true });
  }

  // Linkurile spre o secțiune din aceeași pagină (#cerere etc.)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    const tinta = document.querySelector(a.getAttribute('href'));
    if (!tinta) return;
    e.preventDefault();
    deruleazaPagina(tinta.getBoundingClientRect().top + window.scrollY - inaltimeHeader());
  });

  // ===================================================================
  // 10. CEREREA DE SERVICE ÎN 4 PAȘI (pagina /service)
  // ===================================================================
  const wizard = document.getElementById('wizard');
  if (wizard) {
    const pasi = [...wizard.querySelectorAll('.wz-step')];
    const etichete = [...wizard.querySelectorAll('.wz-steps li')];
    const pista = wizard.querySelector('.wz-track');
    const fereastra = wizard.querySelector('.wz-viewport');
    const bara = wizard.querySelector('.wz-progress i');
    const eroare = wizard.querySelector('.wz-error');
    const btnInapoi = wizard.querySelector('[data-wz="inapoi"]');
    const btnInainte = wizard.querySelector('[data-wz="inainte"]');
    const btnTrimite = wizard.querySelector('[data-wz="trimite"]');
    const NUME_DISP = { calculator: 'Calculator', laptop: 'Laptop', consola: 'Consolă', periferic: 'Periferic' };
    let curent = 0;
    wizard.classList.add('js');

    const valoare = (nume) => { const el = wizard.elements[nume]; return el ? (el.value || '').trim() : ''; };
    const serviciuAles = () => wizard.querySelector('input[name=id_serviciu]:checked');

    function valid(i) {
      if (i === 0 && !valoare('tip_dispozitiv')) return 'Alege tipul dispozitivului.';
      if (i === 1 && !serviciuAles()) return 'Alege serviciul dorit.';
      if (i === 2 && !valoare('marca_dispozitiv')) return 'Scrie marca dispozitivului.';
      if (i === 2 && valoare('descriere_problema').length < 5) return 'Descrie pe scurt problema.';
      return null;
    }

    function rezumat() {
      const s = serviciuAles();
      const set = (k, v) => { wizard.querySelector(`[data-sum="${k}"]`).textContent = v || '—'; };
      set('dispozitiv', NUME_DISP[valoare('tip_dispozitiv')]);
      set('serviciu', s && s.dataset.nume);
      set('model', [valoare('marca_dispozitiv'), valoare('model_dispozitiv')].filter(Boolean).join(' '));
      set('problema', valoare('descriere_problema'));
      set('pret', s ? `de la ${lei(s.dataset.pret)} lei` : '');
      if (s) {
        const d = new Date(); d.setDate(d.getDate() + Number(s.dataset.zile || 1));
        set('data', d.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' }));
      }
      actualizeazaLogin();
    }
    // Vizitatorul: linkul „Intră în cont” păstrează alegerile (după login revine aici)
    function actualizeazaLogin() {
      const login = wizard.querySelector('[data-login-next]');
      if (!login) return;
      const s = serviciuAles();
      const urma = `/service?serviciu=${s ? s.value : ''}&tip=${valoare('tip_dispozitiv')}#cerere`;
      login.href = '/login?next=' + encodeURIComponent(urma);
    }

    function mergiLa(i, scroll) {
      curent = Math.max(0, Math.min(pasi.length - 1, i));
      pista.style.transform = `translateX(-${curent * 100}%)`;
      fereastra.style.height = pasi[curent].offsetHeight + 'px';
      pasi.forEach((p, k) => p.classList.toggle('active', k === curent));
      etichete.forEach((li, k) => { li.classList.toggle('active', k === curent); li.classList.toggle('done', k < curent); });
      bara.style.width = (curent / (pasi.length - 1)) * 100 + '%';
      btnInapoi.style.visibility = curent === 0 ? 'hidden' : 'visible';
      const ultimul = curent === pasi.length - 1;
      btnInainte.hidden = ultimul;
      if (btnTrimite) btnTrimite.hidden = !ultimul;
      eroare.textContent = '';
      if (ultimul) rezumat();
      if (scroll) deruleazaPagina(wizard.getBoundingClientRect().top + window.scrollY - inaltimeHeader());
    }

    function inainte() {
      const e = valid(curent);
      if (e) {
        eroare.textContent = e;
        wizard.classList.remove('shake'); void wizard.offsetWidth; wizard.classList.add('shake');
        return;
      }
      mergiLa(curent + 1);
    }

    btnInainte.addEventListener('click', inainte);
    btnInapoi.addEventListener('click', () => mergiLa(curent - 1));
    etichete.forEach((li, k) => li.addEventListener('click', () => {
      for (let j = 0; j < k; j++) if (valid(j)) { mergiLa(j); eroare.textContent = valid(j); return; }
      mergiLa(k);
    }));

    // La pașii 1 și 2, alegerea unei opțiuni trece singură la pasul următor
    // (sare direct la primul pas încă necompletat)
    wizard.addEventListener('change', (e) => {
      actualizeazaLogin();
      if (e.target.type === 'radio' && curent < 2) setTimeout(() => {
        let urm = curent + 1;
        while (urm < 2 && !valid(urm)) urm++;
        mergiLa(urm);
      }, 380);
    });
    // Enter în câmpuri nu trimite formularul înainte de ultimul pas
    wizard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && curent < pasi.length - 1) { e.preventDefault(); inainte(); }
    });
    wizard.addEventListener('submit', (e) => {
      for (let j = 0; j < pasi.length - 1; j++) {
        const err = valid(j);
        if (err) { e.preventDefault(); mergiLa(j); eroare.textContent = err; return; }
      }
      btnTrimite.classList.add('loading');
    });
    window.addEventListener('resize', () => { fereastra.style.height = pasi[curent].offsetHeight + 'px'; });

    // Cardurile „Alege serviciul” de deasupra formularului
    document.querySelectorAll('[data-alege-serviciu]').forEach((card) => card.addEventListener('click', () => {
      const radio = wizard.querySelector(`input[name=id_serviciu][value="${card.dataset.alegeServiciu}"]`);
      if (radio) radio.checked = true;
      card.classList.remove('picked'); void card.offsetWidth; card.classList.add('picked');
      mergiLa(valoare('tip_dispozitiv') ? 2 : 0, true);
      if (!valoare('tip_dispozitiv')) eroare.textContent = 'Serviciul a fost ales ✓ – alege acum dispozitivul.';
    }));

    // Pornire: dacă ai venit cu opțiuni deja alese (?serviciu=..&tip=..), sărim peste pașii completați
    let start = 0;
    while (start < 2 && !valid(start)) start++;
    requestAnimationFrame(() => mergiLa(start, false));
  }
})();
