(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lerp = (a,b,n) => (1-n)*a + b*n;
  const clamp = (v,min=0,max=1) => Math.min(max, Math.max(min, v));

  /* ---- NAV ---- */
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  burger.addEventListener('click', () => {
    const open = document.body.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
    document.getElementById('drawer').setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  });
  document.querySelectorAll('#drawer a').forEach(a => a.addEventListener('click', () => {
    document.body.classList.remove('is-open');
    document.body.style.overflow = '';
  }));

  /* ---- CARTÕES FLIP (áreas de actuação) — clique/Enter fixa o virar, além do hover em CSS ---- */
  document.querySelectorAll('.flip').forEach(flip => {
    flip.addEventListener('click', () => flip.classList.toggle('is-flipped'));
    flip.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip.classList.toggle('is-flipped'); }
    });
  });

  /* ---- VÍDEO COM SOM ACTIVÁVEL — arranca sozinho sem som; um clique liga/desliga o som ---- */
  document.querySelectorAll('[data-sound-toggle]').forEach(btn => {
    // procura o vídeo dentro do .vid-frame mais próximo, ou (caso o botão esteja fora
    // dele, como no hero, para não ficar preso no stacking context isolado do .frame)
    // dentro da secção envolvente
    const video = btn.closest('section, .vid-frame')?.querySelector('video[data-autosound]');
    if (!video) return;
    btn.addEventListener('click', () => {
      video.muted = !video.muted;
      if (!video.muted) video.play().catch(() => {});
      btn.classList.toggle('is-on', !video.muted);
      btn.setAttribute('aria-pressed', String(!video.muted));
      btn.setAttribute('aria-label', video.muted ? 'Activar som' : 'Desactivar som');
    });
  });

  /* ---- GALERIA — pilha de fotos arrastável (arrastar a da frente envia-a para trás) + modal ---- */
  (() => {
    const stack = document.querySelector('[data-stack]');
    if (!stack) return;
    const cards = [...stack.querySelectorAll('[data-stack-card]')];
    let order = cards.map((_, i) => i); // order[0] = índice do cartão da frente

    const OFFSETS = [
      { x: 0,  y: 0,  r: 0,  s: 1   },
      { x: 16, y: 14, r: -4, s: .96 },
      { x: 30, y: 26, r: 3,  s: .92 },
      { x: 42, y: 36, r: -2, s: .88 }
    ];

    function layout(){
      order.forEach((cardIndex, rank) => {
        const card = cards[cardIndex];
        const o = OFFSETS[Math.min(rank, OFFSETS.length - 1)];
        card.style.zIndex = String(cards.length - rank);
        card.style.transform = `translate(${o.x}px,${o.y}px) rotate(${o.r}deg) scale(${o.s})`;
      });
    }
    layout();

    function sendToBack(cardIndex){
      order = [...order.filter(i => i !== cardIndex), cardIndex];
      layout();
    }

    const modal = document.getElementById('galeriaModal');
    const modalImg = modal?.querySelector('img');
    const modalClose = modal?.querySelector('[data-modal-close]');
    let lastFocused = null;

    function openModal(cardIndex){
      if (!modal || !modalImg) return;
      const img = cards[cardIndex].querySelector('img');
      modalImg.src = img.src;
      modalImg.alt = img.alt;
      lastFocused = document.activeElement;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      modalClose?.focus();
    }
    function closeModal(){
      if (!modal) return;
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      lastFocused?.focus();
    }
    modalClose?.addEventListener('click', closeModal);
    modal?.addEventListener('click', e => { if (e.target.hasAttribute('data-modal-backdrop')) closeModal(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && modal?.classList.contains('is-open')) closeModal(); });

    cards.forEach((card, i) => {
      let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false, isFrontDrag = false, justDragged = false;

      card.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        isFrontDrag = order[0] === i;
        dragging = true; dx = 0; dy = 0;
        startX = e.clientX; startY = e.clientY;
        if (isFrontDrag) { card.classList.add('is-dragging'); card.setPointerCapture(e.pointerId); }
      });

      card.addEventListener('pointermove', e => {
        if (!dragging || !isFrontDrag) return;
        dx = e.clientX - startX; dy = e.clientY - startY;
        card.style.transform = `translate(${dx}px,${dy}px) rotate(${(dx * .06).toFixed(2)}deg) scale(1)`;
      });

      function endDrag(){
        if (!dragging) return;
        dragging = false;
        if (!isFrontDrag) return;
        card.classList.remove('is-dragging');
        if (Math.hypot(dx, dy) > 70) { justDragged = true; sendToBack(i); }
        else layout(); // arrasto pequeno demais — volta ao lugar (o clique segue-se normalmente)
      }
      card.addEventListener('pointerup', endDrag);
      card.addEventListener('pointercancel', endDrag);

      card.addEventListener('click', e => {
        if (justDragged) { justDragged = false; e.preventDefault(); return; } // não abre modal a seguir a um arrasto real
        openModal(i);
      });
    });
  })();

  /* ---- DIFERENCIAL — vitrine de um pilar de cada vez, com setas ---- */
  (() => {
    const show = document.querySelector('[data-pshow]');
    if (!show) return;
    const slides = [...show.querySelectorAll('[data-pshow-slide]')];
    const dots = [...document.querySelectorAll('[data-pshow-dots] button')];
    const prevBtn = show.querySelector('[data-pshow-prev]');
    const nextBtn = show.querySelector('[data-pshow-next]');
    let active = 0;

    function render(){
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === active);
        const rel = i === active ? 0 : (i < active ? -1 : 1);
        slide.style.transform = `translateX(${rel * 40}px)`;
      });
      dots.forEach((d, i) => {
        d.classList.toggle('is-active', i === active);
        d.setAttribute('aria-current', String(i === active));
      });
    }
    function goTo(i){ active = (i + slides.length) % slides.length; render(); }

    prevBtn?.addEventListener('click', () => goTo(active - 1));
    nextBtn?.addEventListener('click', () => goTo(active + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));
    show.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(active - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(active + 1); }
    });

    render();
  })();

  /* ---- FORMULÁRIO DE PARCERIAS — site estático sem backend: o envio é apenas visual ---- */
  (() => {
    const form = document.querySelector('[data-partner-form]');
    if (!form) return;
    const label = form.querySelector('[data-form-label]');
    const note = form.querySelector('[data-form-note]');
    const original = label?.textContent;
    let timer = null;

    form.addEventListener('submit', e => {
      e.preventDefault();
      clearTimeout(timer);
      form.reset();
      if (label) label.textContent = 'Mensagem enviada';
      note?.removeAttribute('hidden');
      requestAnimationFrame(() => note?.classList.add('is-visible'));
      timer = setTimeout(() => {
        note?.classList.remove('is-visible');
        if (label) label.textContent = original;
        setTimeout(() => note?.setAttribute('hidden', ''), 500);
      }, 2800);
    });
  })();

  /* ---- REVEAL + CONTADORES ---- */
  const counters = new WeakSet();
  function runCount(el){
    if (counters.has(el)) return; counters.add(el);
    const end = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10);
    if (reduce) { el.textContent = end.toFixed(dec).replace('.', ','); return; }
    const dur = 1300, t0 = performance.now();
    const tick = t => {
      const p = clamp((t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = (end * e).toFixed(dec).replace('.', ',');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      e.target.querySelectorAll?.('[data-count]').forEach(runCount);
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: .15 });
  document.querySelectorAll('[data-rev]').forEach(el => io.observe(el));

  const showTitle = () => document.querySelectorAll('#heroTitle .mask').forEach(m => m.classList.add('is-in'));
  addEventListener('load', showTitle); setTimeout(showTitle, 350);

  /* ---- COLECÇÕES ---- */
  const parallax = [...document.querySelectorAll('[data-par]')].map(el => ({
    el, speed: parseFloat(el.dataset.speed || '.15'), top: 0, h: 0, y: 0, target: 0
  }));

  const tracks = [...document.querySelectorAll('[data-htrack]')].map(sec => ({
    sec, rail: sec.querySelector('[data-rail]'), bar: sec.querySelector('[data-progress]'),
    dist: 0, top: 0, len: 1, x: 0, target: 0
  }));

  const draws = [...document.querySelectorAll('[data-draw]')].map(svg => ({
    svg,
    paths: [...svg.querySelectorAll('path')].map(p => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
      return { p, len };
    }),
    top: 0
  }));

  let vh = innerHeight, vw = innerWidth;
  const isMobile = () => vw <= 980;
  let lastY = scrollY, navHidden = false;

  /* ---- SCROLL SUAVE (roda do rato) ----
     interpola a posição real da página com inércia, para o scroll ser consistente
     em toda a página — incluindo as secções com pin/scroll horizontal, que passam
     a receber a mesma entrada já suavizada. Não intercepta toque/trackpad em gesto
     nativo nem teclado/barra de scroll (já são suaves por natureza) — nesses casos
     o alvo simplesmente sincroniza-se com a posição real. */
  let scrollTarget = scrollY, smoothY = scrollY, lastWheel = 0;
  addEventListener('wheel', e => {
    if (reduce) return;
    e.preventDefault();
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollTarget = Math.min(max, Math.max(0, scrollTarget + e.deltaY));
    lastWheel = performance.now();
  }, { passive: false });

  function measure(){
    vh = innerHeight; vw = innerWidth;
    const sy = scrollY;
    const pad = parseFloat(getComputedStyle(document.body).getPropertyValue('--pad')) || 32;

    tracks.forEach(t => {
      if (isMobile()) { t.sec.style.height = ''; t.rail.style.transform = ''; t.dist = 0; return; }
      t.sec.style.height = 'auto';
      t.dist = Math.max(0, t.rail.scrollWidth - vw + pad * 2);
      t.sec.style.height = (vh + t.dist) + 'px';
      t.top = t.sec.getBoundingClientRect().top + sy;
      t.len = Math.max(1, t.sec.offsetHeight - vh);
    });

    parallax.forEach(o => {
      const r = o.el.getBoundingClientRect();
      o.top = r.top + sy; o.h = r.height || 1;
    });
    draws.forEach(d => { d.top = d.svg.getBoundingClientRect().top + sy; });
  }

  function frame(){
    if (!reduce) {
      if (performance.now() - lastWheel < 220) {
        smoothY = Math.abs(scrollTarget - smoothY) < .5 ? scrollTarget : lerp(smoothY, scrollTarget, .14);
        scrollTo(0, smoothY);
      } else {
        scrollTarget = smoothY = scrollY; // scroll por toque/teclado/barra — sincroniza, sem lutar contra ele
      }
    }

    const sy = scrollY;
    nav.classList.toggle('is-solid', sy > vh * .7);

    /* esconde ao descer, mostra ao subir */
    const dy = sy - lastY;
    if (document.body.classList.contains('is-open')) navHidden = false;
    else if (dy > 4) navHidden = true;
    else if (dy < -4) navHidden = false;
    nav.classList.toggle('nav--hidden', navHidden);
    lastY = sy;

    parallax.forEach(o => {
      const rel = (sy + vh - o.top) / (vh + o.h);          // 0 → 1 ao atravessar o ecrã
      o.target = (rel - .5) * o.h * o.speed * 2;
      o.y = reduce ? o.target : lerp(o.y, o.target, .12);
      o.el.style.transform = `translate3d(0,${o.y.toFixed(2)}px,0)`;
    });

    tracks.forEach(t => {
      if (!t.dist || isMobile()) return;
      const p = clamp((sy - t.top) / t.len);
      t.target = -t.dist * p;
      t.x = reduce ? t.target : lerp(t.x, t.target, .09);
      t.rail.style.transform = `translate3d(${t.x.toFixed(2)}px,0,0)`;
      if (t.bar) t.bar.style.transform = `scaleX(${p.toFixed(3)})`;
    });

    draws.forEach(d => {
      const p = clamp((sy + vh * .9 - d.top) / (vh * .5));
      d.paths.forEach(({p: path, len}) => path.style.strokeDashoffset = (len * (1 - p)).toFixed(1));
    });

    requestAnimationFrame(frame);
  }

  new ResizeObserver(measure).observe(document.body);
  addEventListener('resize', measure);
  addEventListener('load', measure);
  // remede as imagens assim que carregarem (evita parallax mal posicionado)
  document.querySelectorAll('img.frame__img').forEach(img => img.addEventListener('load', measure));
  measure();
  requestAnimationFrame(frame);

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      scrollTo({ top: el.getBoundingClientRect().top + scrollY - 16, behavior: reduce ? 'auto' : 'smooth' });
    });
  });
})();
