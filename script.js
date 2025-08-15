document.addEventListener('DOMContentLoaded', () => {
  /* ===== Tema (light/dark por tokens + persistência) ===== */
  (function themeManager(){
    const KEY = 'theme';              // 'light' | 'dark'
    const html = document.documentElement;
    const btn  = document.getElementById('themeToggle');

    const apply = (mode) => {
      const dark = mode === 'dark';
      html.classList.toggle('theme-dark', dark);
      if (btn){
        btn.setAttribute('aria-pressed', String(dark));
        const i = btn.querySelector('i');
        if (i) i.className = `bx ${dark ? 'bx-sun' : 'bx-moon'}`;
        btn.setAttribute('aria-label', dark ? 'Usando tema escuro (alternar)' : 'Usando tema claro (alternar)');
      }
    };

    // preferência salva?
    let saved = localStorage.getItem(KEY);
    if (!saved){
      saved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    apply(saved);

    // acompanhar SO (só se usuário não fixou depois)
    const mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const onChange = (e) => {
      if (!localStorage.getItem(KEY)){ apply(e.matches ? 'dark' : 'light'); }
    };
    if (mql && 'addEventListener' in mql) mql.addEventListener('change', onChange);

    if (btn){
      btn.addEventListener('click', () => {
        const nowDark = !html.classList.contains('theme-dark');
        const mode = nowDark ? 'dark' : 'light';
        localStorage.setItem(KEY, mode);
        apply(mode);
      });
    }
  })();

  /* ===== Animate on scroll (uma vez só) ===== */
  const animated = document.querySelectorAll('[data-animate]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('animate');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
    animated.forEach(el => io.observe(el));
  } else {
    animated.forEach(el => el.classList.add('animate'));
  }

  /* ===== Navbar sombra (throttled + passive) ===== */
  const navbar = document.querySelector('.navbar, .navbar-paper');
  if (navbar) {
    let ticking = false;
    const apply = () => { navbar.classList.toggle('scrolled', window.scrollY > 8); ticking = false; };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(apply); ticking = true; }
    }, { passive: true });
    apply();
  }

  /* ===== Título "digitando" (caret via CSS ::after) ===== */
  const title = document.getElementById('contact-title');
  if (title) {
    const full = (title.dataset.fulltext || title.textContent || '').trim();
    title.textContent = '';
    let i = 0;
    const speed = 55;
    (function type(){
      if (i <= full.length) {
        title.textContent = full.slice(0, i++);
        setTimeout(type, speed);
      }
    })();
  }

  /* ===== Copiar e-mail (com fallback) ===== */
  const copyBtn = document.getElementById('copyMail');
  if (copyBtn) {
    const email = 'luizcgjunior2018@gmail.com';
    const label = copyBtn.querySelector('span');
    copyBtn.addEventListener('click', async () => {
      let ok = false;
      try { await navigator.clipboard.writeText(email); ok = true; }
      catch {
        const ta = document.createElement('textarea');
        ta.value = email; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { ok = document.execCommand('copy'); } catch {}
        document.body.removeChild(ta);
      }
      if (label) {
        label.textContent = ok ? ' Copiado!' : ' Copiar e-mail';
        setTimeout(() => (label.textContent = ' Copiar e-mail'), 1400);
      }
    });
  }

  /* ===== Formulário -> envia via FormSubmit (AJAX, sem abrir e-mail) ===== */
  const form = document.getElementById('contactForm');
  if (form) {
    const statusEl = document.getElementById('formStatus');
    const endpoint = 'https://formsubmit.co/ajax/luizcgjunior2018@gmail.com';
    const fields = ['name','email','subject','message']
      .map(n => form.querySelector(`[name="${n}"]`))
      .filter(Boolean);

    // garante que todos são obrigatórios (sem mexer no HTML)
    fields.forEach(el => el.setAttribute('required', ''));

    // helper para validar preenchimento
    const validate = () => {
      let ok = true;
      fields.forEach(el => {
        const v = (el.value || '').trim();
        if (!v) {
          el.classList.add('is-invalid');
          ok = false;
        } else {
          el.value = v; // salva versão sem espaços extras
          el.classList.remove('is-invalid');
        }
      });
      // validação nativa do email também
      if (ok && !form.checkValidity()) {
        const emailEl = form.querySelector('[name="email"]');
        if (emailEl && !emailEl.checkValidity()) {
          emailEl.classList.add('is-invalid');
          ok = false;
        }
      }
      return ok;
    };

    // feedback em tempo real ao digitar
    fields.forEach(el => {
      el.addEventListener('input', () => {
        if ((el.value || '').trim()) el.classList.remove('is-invalid');
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // 1) bloqueia se tiver algo vazio/inválido
      if (!validate()) {
        if (statusEl) {
          statusEl.textContent = 'Preencha todos os campos.';
          setTimeout(() => (statusEl.textContent = ''), 3000);
        }
        return;
      }

      // 2) monta os dados e envia
      const data = new FormData(form);
      if (!data.get('subject')) data.set('subject', 'Contato via Portfólio');

      const btn = form.querySelector('button[type="submit"]');
      try {
        if (btn) { btn.disabled = true; btn.setAttribute('aria-busy','true'); }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: data
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Falha no envio');
        }

        // 3) sucesso
        if (statusEl) statusEl.textContent = 'Enviado com sucesso';
        form.reset();
        fields.forEach(el => el.classList.remove('is-invalid'));
        setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 4000);

      } catch (err) {
        if (statusEl) statusEl.textContent = 'Erro ao enviar. Tente novamente.';
        console.error(err);
        setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3500);
      } finally {
        if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); }
      }
    });
  }

  /* ===== Link do Figma seguro ===== */
  document.querySelectorAll('.open-figma[data-figma]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const url = a.getAttribute('data-figma');
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });
  });

  /* ===== Ano no footer ===== */
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});

// ===== Slider de experiências (mobile) — rolagem pelos botões
document.addEventListener('DOMContentLoaded', () => {
  const wrap = document.querySelector('#experiencias .experiencias-snap');
  const prev = document.querySelector('#experiencias .snap-prev');
  const next = document.querySelector('#experiencias .snap-next');
  if (!wrap || !prev || !next) return;

  const step = () => Math.round(wrap.clientWidth * 0.86); // ⬅️ passo da rolagem (mesmo 86% do CSS)
  prev.addEventListener('click', () => wrap.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => wrap.scrollBy({ left:  step(), behavior: 'smooth' }));

  // Acessibilidade: setas do teclado movem no mobile também
  [prev, next].forEach(btn => btn.setAttribute('tabindex','0'));
});

// === Carrossel: 1 card por slide no mobile (e restaura no desktop) ===
(function mobileOneCardPerSlide(){
  const BREAKPOINT = 768;
  const el = document.getElementById('carrosselExperiencias');
  if (!el) return;
  const inner = el.querySelector('.carousel-inner');
  if (!inner) return;

  // salva o HTML original (2 slides com 3 cards)
  const originalSlides = [...inner.children].map(n => n.cloneNode(true));
  let isMobile = null;

  function rebuild(){
    const nowMobile = window.innerWidth < BREAKPOINT;
    if (nowMobile === isMobile) return;

    // reseta o Bootstrap Carousel antes de trocar o DOM
    const inst = bootstrap.Carousel.getInstance(el);
    if (inst) inst.dispose();

    if (nowMobile){
      // pega todos os cards e cria 1 slide para cada
      const cards = [...inner.querySelectorAll('.card-experiencia')];
      inner.innerHTML = '';
      cards.forEach((card, i) => {
        const wrap = document.createElement('div');
        wrap.className = 'd-flex justify-content-center px-4 flex-wrap gap-3 w-100 mx-auto';
        wrap.appendChild(card); // move o card
        const item = document.createElement('div');
        item.className = 'carousel-item' + (i === 0 ? ' active' : '');
        item.appendChild(wrap);
        inner.appendChild(item);
      });
    } else {
      // restaura a estrutura original (3 por slide)
      inner.innerHTML = '';
      originalSlides.forEach((slide, i) => {
        const clone = slide.cloneNode(true);
        clone.classList.toggle('active', i === 0);
        inner.appendChild(clone);
      });
    }

    // reativa o carrossel (sem autoplay)
    new bootstrap.Carousel(el, { interval: false, ride: false, touch: true, wrap: true });
    isMobile = nowMobile;
  }

  window.addEventListener('resize', rebuild, { passive: true });
  rebuild(); // roda na carga
})();

document.addEventListener('DOMContentLoaded', () => {
  const toggler = document.querySelector('.navbar .navbar-toggler');
  const collapseEl = document.querySelector('.navbar .navbar-collapse');
  if (!toggler || !collapseEl) return;

  // Usa a API do Bootstrap se estiver carregada; senão, cai no fallback
  const bsCollapse = window.bootstrap
    ? bootstrap.Collapse.getOrCreateInstance(collapseEl, { toggle: false })
    : null;

  const isOpen = () => collapseEl.classList.contains('show');
  const closeMenu = () => (bsCollapse ? bsCollapse.hide() : collapseEl.classList.remove('show'));

  // Fecha ao clicar fora
  document.addEventListener('click', (e) => {
    if (!isOpen()) return;
    const clickedInside = collapseEl.contains(e.target) || toggler.contains(e.target);
    if (!clickedInside) closeMenu();
  });

  // Fecha ao clicar em qualquer link dentro do menu (exceto dropdown toggles)
  collapseEl.addEventListener('click', (e) => {
    const link = e.target.closest('.nav-link, .dropdown-item, a');
    if (!link) return;
    if (link.matches('[data-bs-toggle="dropdown"]')) return;
    if (isOpen()) closeMenu();
  });

  // Fecha com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      closeMenu();
      toggler.focus();
    }
  });
});


document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.querySelector('.navbar');

  function setMobileNavPadding(){
    if (!navbar) return;
    const isMobile = window.matchMedia('(max-width: 575.98px)').matches;
    if (isMobile) {
      // mede a altura real (leva em conta o logo, paddings etc.)
      const h = navbar.offsetHeight;
      document.documentElement.style.setProperty('--nav-h-mobile', h + 'px');
    } else {
      document.documentElement.style.removeProperty('--nav-h-mobile');
    }
  }

  setMobileNavPadding();
  window.addEventListener('resize', setMobileNavPadding);
  window.addEventListener('orientationchange', setMobileNavPadding);
  // se o logo carregar depois, recalcula
  window.addEventListener('load', setMobileNavPadding);
});



