import { useEffect, useMemo } from 'react';
import source from '../orbit-iq.html?raw';

const styles = source.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
const sourceBody = source.match(/<body>([\s\S]*?)<script>/)?.[1] ?? '';
const markup = sourceBody.replaceAll('src="logo.png"', 'src="logo.png"');

function fragment(start, end) {
  const from = markup.indexOf(start);
  const to = end ? markup.indexOf(end, from) : markup.length;
  return from < 0 ? '' : markup.slice(from, to < 0 ? markup.length : to);
}

function Markup({ html }) {
  return <div className="react-fragment" dangerouslySetInnerHTML={{ __html: html }} />;
}

function BackgroundSystem() {
  return <Markup html={fragment('<!-- ORBIT IQ OFFICIAL LOGO:', '<!-- ===== NAVBAR ===== -->')} />;
}

function Navbar() {
  return <Markup html={fragment('<!-- ===== NAVBAR ===== -->', '<!-- ===== HERO ===== -->')} />;
}

function Hero() {
  return <Markup html={fragment('<!-- ===== HERO ===== -->', '<!-- ===== DEMO VIDEO ===== -->')} />;
}

function Demo() {
  return <Markup html={fragment('<!-- ===== DEMO VIDEO ===== -->', '<!-- ===== WHAT IS ORBIT IQ ===== -->')} />;
}

function AboutAndFeatures() {
  return <Markup html={fragment('<!-- ===== WHAT IS ORBIT IQ ===== -->', '<!-- ===== SCREENSHOTS ===== -->')} />;
}

function Screenshots() {
  return <Markup html={fragment('<!-- ===== SCREENSHOTS ===== -->', '<!-- ===== TEAM ===== -->')} />;
}

function Team() {
  return <Markup html={fragment('<!-- ===== TEAM ===== -->', '<!-- ===== FINAL CTA ===== -->')} />;
}

function Download() {
  return <Markup html={fragment('<!-- ===== FINAL CTA ===== -->', '<!-- ===== FOOTER ===== -->')} />;
}

function Footer() {
  return <Markup html={fragment('<!-- ===== FOOTER ===== -->')} />;
}

function useOrbitInteractions() {
  useEffect(() => {
    const abort = new AbortController();
    const { signal } = abort;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const add = (target, type, handler, options = {}) => target.addEventListener(type, handler, { ...options, signal });
    document.body.classList.add('js');

    const canvas = document.getElementById('stars');
    let twinkle = 0;
    let moodTimer = 0;
    if (canvas) {
      const context = canvas.getContext('2d');
      const count = Math.min(200, Math.max(60, Math.floor(innerWidth / 9)));
      const stars = Array.from({ length: count }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * .9 + .3, a: Math.random() * .5 + .2 }));
      const nebulae = [
        { x: .16, y: .2, r: .48, ax: .00009, ay: .00006, h: '63,217,232', a: .5 },
        { x: .78, y: .6, r: .4, ax: -.00007, ay: .00008, h: '43,94,140', a: .44 },
        { x: .42, y: .86, r: .34, ax: .00008, ay: -.00007, h: '155,123,255', a: .4 },
      ];
      const dust = Array.from({ length: 24 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * .9 + .5, a: Math.random() * .5 + .14, vx: (Math.random() - .5) * .00022, vy: (Math.random() - .5) * .00022 }));
      let meteor = null, meteorNext = 0;
      const scenePaused = () => document.hidden || ['tech', 'carto'].includes(document.body.dataset.scene);
      const paint = (time = 0) => {
        if (!context) return;
        canvas.width = innerWidth; canvas.height = innerHeight;
        context.clearRect(0, 0, canvas.width, canvas.height);
        const w = canvas.width, h = canvas.height;
        nebulae.forEach((nb, i) => {
          let nx = nb.x + time * nb.ax, ny = nb.y + time * nb.ay;
          if (nx < -.15) nb.x += 1.3; if (nx > 1.15) nb.x -= 1.3; if (ny < -.15) nb.y += 1.3; if (ny > 1.15) nb.y -= 1.3;
          const grad = context.createRadialGradient(nx * w, ny * h, 0, nx * w, ny * h, nb.r * w);
          const na = Math.max(0, nb.a * (.68 + .32 * Math.sin(time * .07 + i * 1.9)));
          grad.addColorStop(0, `rgba(${nb.h},${na})`); grad.addColorStop(1, `rgba(${nb.h},0)`);
          context.fillStyle = grad; context.fillRect(0, 0, w, h);
        });
        if (!meteor && time > meteorNext && Math.random() < .05) {
          const fromLeft = Math.random() < .5;
          meteor = { x: fromLeft ? -(Math.random() * .08) * w : w * (.12 + Math.random() * .8), y: (Math.random() * .34) * h, vx: (fromLeft ? 1 : -1) * (0.9 + Math.random() * .7) * w * .0016, vy: (0.55 + Math.random() * .45) * h * .0016, life: 1, hue: Math.random() < .4 ? '236,236,244' : '63,217,232' };
          meteorNext = time + 6 + Math.random() * 10;
        }
        if (meteor) {
          meteor.life -= .08; meteor.x += meteor.vx; meteor.y += meteor.vy;
          if (meteor.life > 0) {
            const tailX = meteor.x - meteor.vx * 6, tailY = meteor.y - meteor.vy * 6;
            const mg = context.createLinearGradient(tailX, tailY, meteor.x, meteor.y);
            mg.addColorStop(0, `rgba(${meteor.hue},0)`); mg.addColorStop(1, `rgba(${meteor.hue},${.85 * meteor.life})`);
            context.strokeStyle = mg; context.lineWidth = 1.6; context.lineCap = 'round';
            context.beginPath(); context.moveTo(tailX, tailY); context.lineTo(meteor.x, meteor.y); context.stroke();
            context.fillStyle = `rgba(${meteor.hue},${meteor.life * .85})`;
            context.beginPath(); context.arc(meteor.x, meteor.y, 1.7, 0, 7); context.fill();
          }
          if (meteor.life <= 0 || meteor.y > h * 1.05 || meteor.x < -w * .1 || meteor.x > w * 1.1) meteor = null;
        }
        dust.forEach((d) => {
          d.x += d.vx; d.y += d.vy;
          if (d.x > 1.03) d.x = -0.03; if (d.x < -0.03) d.x = 1.03;
          if (d.y > 1.03) d.y = -0.03; if (d.y < -0.03) d.y = 1.03;
          context.beginPath(); context.arc(d.x * w, d.y * h, d.r, 0, 7);
          context.fillStyle = `rgba(185,205,232,${Math.max(0, d.a * (d.y * 2 + .25))})`;
          context.fill();
        });
        stars.forEach((star, index) => {
          context.beginPath(); context.arc(star.x * w, star.y * h, star.r, 0, 7);
          context.fillStyle = `rgba(233,239,246,${Math.max(0, star.a + Math.sin(time * 1.4 + index) * .08)})`;
          context.fill();
        });
      };
      paint();
      add(window, 'resize', () => paint());
      if (!reducedMotion) twinkle = window.setInterval(() => {
        if (context && !scenePaused()) paint(performance.now() / 1000);
      }, 120);
    }

    const fine = matchMedia('(pointer: fine) and (hover: hover)').matches && !reducedMotion && !('ontouchstart' in document.documentElement);
    const cursor = document.getElementById('oiCursor');
    let cursorFrame = 0;
    if (fine && cursor) {
      const ring = cursor.querySelector('.oc-ring'), dot = cursor.querySelector('.oc-dot');
      const particle = cursor.querySelector('.oc-particle'), lockSvg = cursor.querySelector('.oc-lock-svg');
      const label = cursor.querySelector('.oc-label'), pulse = cursor.querySelector('.oc-pulse');
      const trails = [cursor.querySelector('#ocTrail1'), cursor.querySelector('#ocTrail2'), cursor.querySelector('#ocTrail3')];
      document.documentElement.classList.add('oi-cur', 'oi-anim');
      let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, angle = 0, locked = false, downloading = false;
      add(window, 'mousemove', (event) => { mx = event.clientX; my = event.clientY; }, { passive: true });
      add(document, 'mouseover', (event) => {
        const target = event.target;
        locked = Boolean(target.closest('a,button,.shot-thumb,.shot-rail'));
        downloading = Boolean(target.closest('.js-download'));
        const observing = Boolean(target.closest('.earth-wrap'));
        document.body.classList.toggle('oi-lock', locked || downloading);
        document.body.classList.toggle('oi-obs', observing);
        if (observing) label.textContent = 'ORBIT IQ • TRACK';
        dot.style.background = locked ? 'var(--cyan)' : '#fff';
      });
      add(document, 'mousedown', () => { pulse.classList.remove('go'); void pulse.offsetWidth; pulse.classList.add('go'); });
      const position = (element, x, y) => { element.style.left = `${x}px`; element.style.top = `${y}px`; };
      const animateCursor = () => {
        rx += (mx - rx) * (locked ? .15 : .22); ry += (my - ry) * (locked ? .15 : .22);
        angle += locked || downloading ? .05 : .014;
        const radius = downloading ? 26 : locked ? 24 : 21;
        position(ring, rx, ry); position(dot, rx, ry); position(lockSvg, rx, ry);
        position(particle, rx + Math.cos(angle) * radius, ry + Math.sin(angle) * radius);
        position(trails[0], rx, ry); position(trails[1], rx - (mx - rx) * .12, ry - (my - ry) * .12); position(trails[2], rx - (mx - rx) * .24, ry - (my - ry) * .24);
        trails[1].classList.add('t2'); trails[2].classList.add('t3');
        lockSvg.style.opacity = locked || downloading ? '1' : '0';
        cursorFrame = requestAnimationFrame(animateCursor);
      };
      cursorFrame = requestAnimationFrame(animateCursor);
    } else if (cursor) cursor.style.display = 'none';

    const navbar = document.getElementById('navbar');
    let navPending = false;
    const updateNavbar = () => { navbar?.classList.toggle('scrolled', scrollY > 48); navPending = false; };
    add(window, 'scroll', () => { if (!navPending) { navPending = true; requestAnimationFrame(updateNavbar); } }, { passive: true });
    updateNavbar();

    const cinBg = document.querySelector('.cin-bg');
    const cinGrid = document.querySelector('.hero-grid');
    if (!reducedMotion && (cinBg || cinGrid)) {
      let parallaxFrame = 0;
      const onParallax = () => {
        if (parallaxFrame) return;
        parallaxFrame = requestAnimationFrame(() => {
          parallaxFrame = 0;
          if (scrollY < innerHeight * 1.4) {
            if (cinBg) cinBg.style.transform = `translate3d(0, ${scrollY * 0.35}px, 0)`;
            if (cinGrid) cinGrid.style.transform = `translate3d(0, ${scrollY * 0.16}px, 0)`;
          }
        });
      };
      add(window, 'scroll', onParallax, { passive: true });
    }

    /* ---------- ambient mood cycle — the background breathes by itself ---------- */
    const moods = ['cyan', 'violet'];
    let moodI = 0;
    document.body.removeAttribute('data-mood');
    if (!reducedMotion) moodTimer = window.setInterval(() => {
      if (document.hidden) return;
      moodI = (moodI + 1) % moods.length;
      document.body.setAttribute('data-mood', moods[moodI]);
    }, 20000);

    const burger = document.getElementById('hamburger'), mobileMenu = document.getElementById('mobileMenu');
    const closeMenu = () => { burger?.classList.remove('open'); mobileMenu?.classList.remove('open'); burger?.setAttribute('aria-expanded', 'false'); };
    if (burger && mobileMenu) {
      add(burger, 'click', () => { const open = burger.classList.toggle('open'); mobileMenu.classList.toggle('open', open); burger.setAttribute('aria-expanded', String(open)); });
      mobileMenu.querySelectorAll('a,button').forEach((item) => add(item, 'click', closeMenu));
    }

    const scenes = { home: 'space', demo: 'tech', what: 'space', features: 'tech', screenshots: 'carto', team: 'space', download: 'space' };
    const sceneElements = Object.keys(scenes).map((id) => document.getElementById(id)).filter(Boolean);
    const updateScene = () => { let best = 'space'; sceneElements.forEach((element) => { const rect = element.getBoundingClientRect(); if (rect.top <= innerHeight * .5 && rect.bottom >= innerHeight * .5) best = scenes[element.id] ?? best; }); document.body.dataset.scene = best; };
    add(window, 'scroll', updateScene, { passive: true }); updateScene();

    const revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('in'); revealObserver.unobserve(entry.target); } }), { threshold: .12 });
    document.querySelectorAll('.reveal,.reveal-s').forEach((element) => revealObserver.observe(element));
    const navLinks = document.querySelectorAll('.nav-links a'), mobileLinks = document.querySelectorAll('.mobile-menu .mm-item');
    const navObserver = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) { const id = entry.target.id; navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${id}`)); mobileLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${id}`)); } }), { threshold: .4, rootMargin: '0px 0px -40% 0px' });
    ['home', 'demo', 'features', 'screenshots', 'team'].forEach((id) => { const section = document.getElementById(id); if (section) navObserver.observe(section); });

    document.querySelectorAll('.btn').forEach((button) => {
      add(button, 'mousemove', (event) => { const rect = button.getBoundingClientRect(); button.style.setProperty('--mx', `${(event.clientX - rect.left - rect.width / 2) * .1}px`); button.style.setProperty('--my', `${(event.clientY - rect.top - rect.height / 2) * .1}px`); }, { passive: true });
      add(button, 'mouseleave', () => { button.style.setProperty('--mx', '0px'); button.style.setProperty('--my', '0px'); });
    });

    const rail = document.getElementById('shotRail'), shotName = document.getElementById('shotName'), screen = document.getElementById('shotScreen');
    if (rail && shotName && screen) {
      const selectShot = (artId, label) => { shotName.textContent = label; document.getElementById('shotTitle').textContent = label; document.getElementById('shotSub').textContent = 'Demo view'; screen.querySelectorAll('.art').forEach((art) => { art.style.opacity = art.dataset.art === artId ? '1' : '0'; }); };
      rail.querySelectorAll('.shot-thumb').forEach((thumb) => add(thumb, 'click', () => { rail.querySelectorAll('.shot-thumb').forEach((item) => item.classList.remove('on')); thumb.classList.add('on'); selectShot(thumb.dataset.art, thumb.dataset.s); }));
      selectShot('q', 'Query');
    }

    const platformGrid = null;
    const selectPlatform = (id) => { const platform = platforms[id]; if (!platform || !platformGrid) return; platformGrid.querySelectorAll('.platform-card').forEach((card) => { const selected = card.dataset.platform === id; card.classList.toggle('selected', selected); card.setAttribute('aria-pressed', String(selected)); }); document.getElementById('platformLabel').textContent = platform.name; document.getElementById('platformTitle').textContent = `Orbit IQ for ${platform.name}`; document.getElementById('platformDetails').textContent = platform.description + (platform.architecture ? ` · ${platform.architecture}` : ''); };
    platformGrid?.querySelectorAll('.platform-card').forEach((card) => { add(card, 'click', () => selectPlatform(card.dataset.platform)); add(card, 'keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectPlatform(card.dataset.platform); } }); });
    const goToDownload = () => document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' });
    document.querySelectorAll('.js-download,.js-download-link').forEach((element) => add(element, 'click', (event) => { event.preventDefault(); goToDownload(); }));

    document.querySelectorAll('.team-card').forEach((card) => {
      const toggle = card.querySelector('.member-name-btn');
      if (!toggle) return;
      add(toggle, 'click', (event) => { event.stopPropagation(); const open = card.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); });
    });

    let lastFocus = null;
    const closeModal = (modal) => { if (!modal) return; modal.classList.remove('open'); document.body.style.overflow = ''; window.setTimeout(() => { modal.hidden = true; }, reducedMotion ? 0 : 290); lastFocus?.focus?.(); lastFocus = null; };
    document.querySelectorAll('[data-modal-open]').forEach((button) => add(button, 'click', () => { const modal = document.getElementById(button.dataset.modalOpen); if (!modal) return; lastFocus = document.activeElement; modal.hidden = false; requestAnimationFrame(() => modal.classList.add('open')); document.body.style.overflow = 'hidden'; modal.querySelector('.modal-close')?.focus(); }));
    document.querySelectorAll('.modal').forEach((modal) => { add(modal, 'click', (event) => { if (event.target === modal) closeModal(modal); }); modal.querySelector('.modal-close') && add(modal.querySelector('.modal-close'), 'click', () => closeModal(modal)); });
    add(document, 'keydown', (event) => { if (event.key === 'Escape') document.querySelectorAll('.modal.open').forEach(closeModal); });

    /* ---------- team member dialog ---------- */
    const openTeamDialog = (card) => {
      if (!card) return;
      const modal = document.getElementById('teamModal');
      if (!modal) return;
      const q = (sel) => card.querySelector(sel);
      const nameEl = q('.member-name'), roleEl = q('.member-role'), bioEl = q('.member-bio');
      const imgEl = q('.member-photo img'), initialsEl = q('.ph'), focusEl = q('.member-focus');
      const ghEl = q('.member-links a[href^="https://github.com"]'), linkedinEl = q('.member-link--linkedin'), mailEl = q('.member-links a[href^="mailto:"]');
      const set = (id, value) => { const el = document.getElementById(id); if (el && value) el.textContent = value; };
      const name = nameEl?.textContent || 'Team Member';
      set('teamModalTitle', name); set('teamModalRole', roleEl?.textContent); set('teamModalBio', bioEl?.textContent);
      const photo = document.getElementById('teamModalPhoto'), initials = document.getElementById('teamModalInitials');
      if (photo && imgEl) { photo.classList.remove('err'); photo.src = imgEl.currentSrc || imgEl.src || ''; photo.alt = `${name} — profile photo`; photo.onerror = () => photo.classList.add('err'); }
      if (initials && initialsEl) initials.textContent = initialsEl.textContent;
      const focusBox = document.getElementById('teamModalFocus');
      if (focusBox) { focusBox.innerHTML = ''; focusEl?.querySelectorAll('span').forEach((s) => { const tag = document.createElement('span'); tag.textContent = s.textContent; focusBox.appendChild(tag); }); }
      const github = document.getElementById('teamModalGithub'), linkedin = document.getElementById('teamModalLinkedin'), email = document.getElementById('teamModalEmail');
      if (github && ghEl) { github.setAttribute('href', ghEl.getAttribute('href')); github.setAttribute('aria-label', `Open ${name}'s GitHub`); github.hidden = false; }
      if (linkedin) {
        if (linkedinEl) { linkedin.setAttribute('href', linkedinEl.getAttribute('href')); linkedin.setAttribute('aria-label', `Open ${name}'s LinkedIn`); linkedin.hidden = false; }
        else { linkedin.hidden = true; linkedin.removeAttribute('href'); }
      }
      if (email && mailEl) { email.setAttribute('href', mailEl.getAttribute('href')); email.setAttribute('aria-label', `Email ${name}`); email.hidden = false; }
      lastFocus = document.activeElement;
      modal.hidden = false;
      requestAnimationFrame(() => modal.classList.add('open'));
      document.body.style.overflow = 'hidden';
      modal.querySelector('.modal-close')?.focus();
    };
    document.querySelectorAll('.team-card').forEach((card) => {
      add(card, 'click', (event) => { if (event.target.closest('a, button')) return; openTeamDialog(card); });
      add(card, 'keydown', (event) => { if ((event.key === 'Enter' || event.key === ' ') && event.target === card) { event.preventDefault(); openTeamDialog(card); } });
    });

    return () => { abort.abort(); window.clearInterval(twinkle); window.clearInterval(moodTimer); cancelAnimationFrame(cursorFrame); revealObserver.disconnect(); navObserver.disconnect(); document.documentElement.classList.remove('oi-cur', 'oi-anim'); document.body.classList.remove('js', 'oi-lock', 'oi-obs'); document.body.style.overflow = ''; document.body.removeAttribute('data-mood'); };
  }, []);
}

export default function App() {
  useOrbitInteractions();
  const css = useMemo(() => styles, []);
  return <><style>{css}</style><BackgroundSystem /><Navbar /><Hero /><Demo /><AboutAndFeatures /><Screenshots /><Team /><Download /><Footer /></>;
}
