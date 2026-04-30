document.addEventListener('DOMContentLoaded', () => {
  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (href && href.length > 1) {
        e.preventDefault();
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Nav toggle for small screens
  const toggle = document.getElementById('nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      toggle.classList.toggle('is-open');
    });
  }

  // Close mobile nav when a link is clicked
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', () => {
      if (navLinks && navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
        if (toggle) toggle.classList.remove('is-open');
      }
    });
  });

  // Make external links open in new tab
  document.querySelectorAll('a[href^="http"]').forEach(a => {
    const href = a.getAttribute('href');
    if (href && !href.includes(location.hostname)) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
  });
});
