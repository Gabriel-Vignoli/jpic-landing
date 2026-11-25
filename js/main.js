// Animações da página (GSAP + ScrollTrigger) e ligação com a cena 3D.
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
root.classList.add('js');

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ---------- Contato: troque só aqui quando o cliente mandar os dados ---------- */
const CONTATO = {
  grupo: 'https://chat.whatsapp.com/[LINK-DO-GRUPO]', // link de convite do grupo VIP
  numero: '[NUMERO]',                                  // só dígitos, com 55 e DDD (ex.: 5545999999999)
  msgVendedor: 'Oi! Vim pelo site da JPIC e quero saber mais sobre os produtos.',
  msgOferta: (produto) => `Oi! Vi a oferta do ${produto} no site da JPIC e quero saber o preço e as condições.`,
};
const waLink = (texto) => `https://wa.me/${CONTATO.numero}?text=${encodeURIComponent(texto)}`;

// CTAs vão direto para o WhatsApp (sem rolar até o fim da página)
$$('[data-cta]').forEach((a) => {
  const tipo = a.dataset.cta;
  if (tipo === 'grupo') a.href = CONTATO.grupo;
  else if (tipo === 'vendedor') a.href = waLink(CONTATO.msgVendedor);
  else if (tipo === 'oferta') {
    const nome = $('.offer__name', a.closest('.offer'))?.textContent.replace(/\s+/g, ' ').trim() || 'produto';
    a.href = waLink(CONTATO.msgOferta(nome));
    a.setAttribute('aria-label', `Quero essa oferta: ${nome} (abre o WhatsApp)`);
  }
  a.target = '_blank';
  a.rel = 'noopener';
});

/* ---------- Barra do topo: duplica o conteúdo para o letreiro no celular ---------- */
const track = $('.topbar__track');
if (track) {
  const clone = document.createElement('span');
  clone.className = 'topbar__clone';
  clone.setAttribute('aria-hidden', 'true');
  clone.innerHTML = '<span aria-hidden="true">·</span>' + track.innerHTML + '<span aria-hidden="true">·</span>';
  track.appendChild(clone);
}

/* ---------- Header: altura, fundo e tema claro/escuro conforme a seção ---------- */
const nav = $('.nav');
const setNavH = () => root.style.setProperty('--nav-h', nav.offsetHeight + 'px');
setNavH();
window.addEventListener('resize', setNavH);

const darkSections = () => $$('.stage, .section--dark, .final');
let ticking = false;
function updateNav() {
  ticking = false;
  const y = nav.offsetHeight * 0.5;
  const dark = darkSections().some((s) => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
  nav.dataset.theme = dark ? 'dark' : 'light';
  nav.classList.toggle('is-scrolled', window.scrollY > 8);

  const dock = $('.dock-cta');
  if (dock) {
    const stage = $('.stage').getBoundingClientRect();
    const fin = $('#entrar').getBoundingClientRect();
    dock.classList.toggle('is-on', stage.bottom < window.innerHeight * 0.4 && fin.top > window.innerHeight * 0.9);
  }
}
window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(updateNav); } }, { passive: true });
updateNav();

/* ---------- Cena 3D ---------- */
const canvas = $('.stage__canvas');
let stage = null;
async function initStage() {
  try {
    const { createStage } = await import('./scene.js');
    stage = createStage(canvas, { reduced });
    if (location.search.includes('debug')) window.__stage = stage;
    window.addEventListener('resize', () => stage.resize());
    if (!reduced) {
      const io = new IntersectionObserver(([e]) => (e.isIntersecting ? stage.start() : stage.stop()), { threshold: 0 });
      io.observe($('.stage'));
      if (window.matchMedia('(pointer: fine)').matches) {
        window.addEventListener('pointermove', (e) => stage.setPointer(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5), { passive: true });
      }
    }
    if (window.gsap && !reduced) gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 1.6, ease: 'power2.out' });
    if (scrollProgress != null) stage.setProgress(scrollProgress);
  } catch (err) {
    console.warn('[3D] cena desligada:', err);
    $('.stage').classList.add('no-webgl');
  }
}
let scrollProgress = null;
initStage();

/* ---------- Sem GSAP ou sem animação: para aqui ---------- */
if (!window.gsap || reduced) {
  if (!window.gsap) console.warn('[gsap] não carregou');
} else {
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
  const ease = 'expo.out';

  /* Entrada do topo */
  gsap.set('.hero__title .line > span', { yPercent: 110 });
  gsap.set(['.hero .eyebrow', '.hero__lead', '.hero__ctas', '.hero__fine'], { autoAlpha: 0, y: 18 });
  gsap.timeline({ delay: 0.15 })
    .to('.hero .eyebrow', { autoAlpha: 1, y: 0, duration: 0.8, ease })
    .to('.hero__title .line > span', { yPercent: 0, duration: 1.2, stagger: 0.09, ease }, '<0.05')
    .to(['.hero__lead', '.hero__ctas', '.hero__fine'], { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08, ease }, '-=0.85')
    .from('.nav__inner > *', { opacity: 0, y: -10, duration: 0.8, stagger: 0.06, ease }, 0.1);

  /* Rolagem do palco: texto das etapas + progresso que vai para a cena */
  const steps = $$('.step3d');
  const bars = $$('.stage__progress span');
  gsap.set(steps, { autoAlpha: 0, y: 40 });
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.stage', start: 'top top', end: 'bottom bottom', scrub: 0.6,
      onUpdate: (self) => { scrollProgress = self.progress; stage && stage.setProgress(self.progress); },
    },
  });
  tl.to('.stage__scroll', { autoAlpha: 0, duration: 0.04 }, 0)
    .to('.hero', { autoAlpha: 0, y: -50, duration: 0.08 }, 0.07)
    .to('.stage__progress', { autoAlpha: 1, duration: 0.05 }, 0.16)
    .to(steps[0], { autoAlpha: 1, y: 0, duration: 0.06 }, 0.22)
    .to(steps[0], { autoAlpha: 0, y: -40, duration: 0.06 }, 0.44)
    .to(steps[1], { autoAlpha: 1, y: 0, duration: 0.06 }, 0.52)
    .to(steps[1], { autoAlpha: 0, y: -40, duration: 0.06 }, 0.7)
    .to(steps[2], { autoAlpha: 1, y: 0, duration: 0.06 }, 0.8)
    .fromTo(bars[0], { '--p': 0 }, { '--p': 1, duration: 0.26 }, 0.22)
    .fromTo(bars[1], { '--p': 0 }, { '--p': 1, duration: 0.24 }, 0.52)
    .fromTo(bars[2], { '--p': 0 }, { '--p': 1, duration: 0.18 }, 0.8)
    .to({}, { duration: 0.02 }, 0.98);

  /* Títulos: palavra por palavra, saindo de trás de uma máscara */
  $$('.reveal-lines').forEach((el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.textContent = part;
            w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
    $$('.w', el).forEach((w) => w.setAttribute('aria-hidden', 'true'));
    gsap.from($$('.w > span', el), {
      yPercent: 105, duration: 1.1, ease, stagger: 0.045,
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });

  /* Blocos que entram juntos */
  const batchIn = (sel, opts = {}) => {
    gsap.set(sel, { opacity: 0, y: opts.y ?? 36 });
    ScrollTrigger.batch(sel, {
      start: 'top 88%', once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1, ease, stagger: 0.09, overwrite: true }),
    });
  };
  batchIn('.head--split .lead', { y: 20 });
  batchIn('.cat');
  batchIn('.offer');
  batchIn('.trust__list li', { y: 24 });
  batchIn('.proof__phone');
  batchIn('.faq details', { y: 16 });

  /* Imagens: zoom lento ao entrar */
  $$('.cat__media img, .offer__media img').forEach((img) => {
    gsap.from(img, { scale: '+=0.12', duration: 1.6, ease, scrollTrigger: { trigger: img.parentElement, start: 'top 90%', once: true }, clearProps: 'scale' });
  });

  /* Como funciona: a linha dourada se desenha com a rolagem */
  gsap.to('.flow__rail span', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.flow', start: 'top 80%', end: 'bottom 55%', scrub: 0.5 } });
  gsap.from('.flow__item', { opacity: 0, y: 28, duration: 0.9, ease, stagger: 0.12, scrollTrigger: { trigger: '.flow', start: 'top 80%', once: true } });
  gsap.from('.flow__n', { scale: 0, duration: 0.7, ease: 'back.out(2.2)', stagger: 0.12, scrollTrigger: { trigger: '.flow', start: 'top 80%', once: true } });

  /* Nota da empresa */
  gsap.from('.receipt', { y: 40, rotate: -2.5, opacity: 0, duration: 1.2, ease, scrollTrigger: { trigger: '.receipt', start: 'top 88%', once: true } });

  /* CTA final: anéis girando devagar com a rolagem */
  gsap.fromTo('.final', { '--rot': '0deg' }, { '--rot': '25deg', ease: 'none', scrollTrigger: { trigger: '.final', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from(['.final .eyebrow', '.final__lead', '.final__ctas'], { opacity: 0, y: 24, duration: 1, ease, stagger: 0.1, scrollTrigger: { trigger: '.final', start: 'top 70%', once: true } });

  /* Botões magnéticos (só com mouse) */
  if (window.matchMedia('(pointer: fine)').matches) {
    $$('.magnet').forEach((btn) => {
      const xTo = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
      const yTo = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.18);
        yTo((e.clientY - r.top - r.height / 2) * 0.3);
      });
      btn.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* Dúvidas: abre e fecha com altura animada */
  $$('.faq details').forEach((d) => {
    const s = $('summary', d), p = $('p', d);
    s.addEventListener('click', (e) => {
      e.preventDefault();
      if (d.open) {
        gsap.to(p, { height: 0, paddingBottom: 0, autoAlpha: 0, duration: 0.35, ease: 'power2.inOut', onComplete: () => { d.open = false; gsap.set(p, { clearProps: 'all' }); } });
        d.classList.remove('is-open');
      } else {
        d.open = true;
        gsap.from(p, { height: 0, paddingBottom: 0, autoAlpha: 0, duration: 0.45, ease: 'power2.out', clearProps: 'all' });
      }
    });
  });

  /* Teclado: o que recebe foco aparece na hora, mesmo antes da animação */
  document.addEventListener('focusin', (e) => {
    const box = e.target.closest('.cat, .offer, .faq details, .trust__list li, .final__ctas, .flow__item');
    if (box) gsap.to(box, { opacity: 1, y: 0, duration: 0.2, overwrite: true });
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
}

/* ---------- Links internos: rolagem animada até a seção ---------- */
function scrollToTarget(id) {
  const target = id === 'top' ? null : document.getElementById(id);
  if (id !== 'top' && !target) return false;
  // a seção encosta na borda de baixo do header, sem faixa de outra cor no meio
  const navH = nav.offsetHeight;
  const y = target ? Math.max(0, target.getBoundingClientRect().top + window.scrollY - navH) : 0;
  const done = () => {
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };
  if (!window.gsap || !window.ScrollToPlugin || reduced) {
    window.scrollTo(0, y);
    done();
    return true;
  }
  // duração cresce com a distância (atravessar o palco 3D leva mais tempo)
  const dist = Math.abs(y - window.scrollY);
  const duration = Math.min(2.4, Math.max(0.8, dist / 2200));
  scrollTween = gsap.to(window, { scrollTo: { y, autoKill: false }, duration, ease: 'power3.inOut', overwrite: true, onComplete: done });
  return true;
}
// a pessoa pode interromper a animação mexendo na rolagem (o autoKill do GSAP
// também parava com o ScrollTrigger.refresh() do carregamento)
let scrollTween = null;
const stopScrollTween = () => { if (scrollTween && scrollTween.isActive()) scrollTween.kill(); };
['wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, stopScrollTween, { passive: true }));
window.addEventListener('keydown', (e) => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) stopScrollTween(); });
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const id = a.getAttribute('href').slice(1);
  if (!id) return;
  if (scrollToTarget(id)) e.preventDefault();
});
