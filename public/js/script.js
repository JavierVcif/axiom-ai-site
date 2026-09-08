// ============ VivaForge — site interactions ============

document.getElementById('year').textContent = new Date().getFullYear();

/* ---- navbar scroll state + progress bar ---- */
const navbar = document.getElementById('navbar');
const progressBar = document.getElementById('progressBar');

function onScroll() {
  navbar.classList.toggle('scrolled', window.scrollY > 40);

  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
  progressBar.style.width = progress + '%';
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---- mobile menu ---- */
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');

burger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  burger.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

/* ---- reveal on scroll ---- */
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach((el, i) => {
  el.style.transitionDelay = (Math.min(i % 6, 6) * 0.06) + 's';
  revealObserver.observe(el);
});

/* ---- hero background mode switcher (video vs. design) ---- */
const heroBg = document.getElementById('heroBg');
const heroVideo = document.getElementById('heroVideo');
const bgTabs = document.querySelectorAll('.bg-tab');
const bgThumbs = document.getElementById('bgThumbs');
const bgThumbButtons = document.querySelectorAll('.bg-thumb');

bgTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    bgTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const mode = tab.dataset.mode;
    if (mode === 'design') {
      heroBg.classList.add('mode-design');
      heroVideo.pause();
      bgThumbs.classList.add('hidden');
    } else {
      heroBg.classList.remove('mode-design');
      heroVideo.play().catch(() => {});
      bgThumbs.classList.remove('hidden');
    }
  });
});

bgThumbButtons.forEach(thumb => {
  thumb.addEventListener('click', () => {
    bgThumbButtons.forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');

    const src = thumb.dataset.src;
    const currentSrc = heroVideo.querySelector('source');
    if (currentSrc.getAttribute('src') !== src) {
      currentSrc.setAttribute('src', src);
      heroVideo.load();
      heroVideo.play().catch(() => {});
    }
  });
});

/* ---- contact form -> /api/contact ---- */
const contactForm = document.getElementById('contactForm');
const formHint = document.getElementById('formHint');
const contactSubmitBtn = contactForm.querySelector('button[type="submit"]');

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const company = document.getElementById('company').value.trim();
  const message = document.getElementById('message').value.trim();

  contactSubmitBtn.disabled = true;
  formHint.textContent = 'Enviando…';

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, email, company, message }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.error) {
      formHint.textContent = 'No pudimos enviar tu mensaje. Escríbenos directo a hola@vivaforge.io.';
    } else {
      formHint.textContent = '¡Mensaje enviado! Te respondemos en menos de 24 horas hábiles.';
      contactForm.reset();
    }
  } catch (err) {
    formHint.textContent = 'Hubo un problema de conexión. Escríbenos directo a hola@vivaforge.io.';
  } finally {
    contactSubmitBtn.disabled = false;
  }
});
