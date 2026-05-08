function showShot(name, btn) {
  document.querySelectorAll('.shot-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
  document.getElementById('shot-' + name).classList.add('active');
  btn.classList.add('active');
  moveTabIndicator(btn);
}

function moveTabIndicator(activeButton) {
  const indicator = document.querySelector('.tab-indicator');
  if (!indicator || !activeButton) return;
  const container = document.querySelector('.shots-tabs');
  if (!container) return;

  const btnRect = activeButton.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  const scrollLeft = container.scrollLeft || 0;
  const offsetLeft = btnRect.left - containerRect.left + scrollLeft;

  indicator.style.width = btnRect.width + 'px';
  indicator.style.left = '6px';
  indicator.style.transform = `translateX(${offsetLeft}px)`;
}

function initTabIndicator() {
  const active = document.querySelector('.stab.active');
  if (active) moveTabIndicator(active);
}

window.addEventListener('resize', initTabIndicator);
document.addEventListener('DOMContentLoaded', initTabIndicator);

function initMobileNav() {
  const nav = document.getElementById('navlinks');
  if (!nav) return;

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => nav.classList.remove('open'));
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) nav.classList.remove('open');
  });
}

document.addEventListener('DOMContentLoaded', initMobileNav);

//re-calculate if the tab container is scrolled (mobile)
document.addEventListener('DOMContentLoaded', () => {
  const tabContainer = document.querySelector('.shots-tabs');
  if (tabContainer) {
    tabContainer.addEventListener('scroll', () => {
      const active = document.querySelector('.stab.active');
      if (active) moveTabIndicator(active);
    });
  }
});

// Apple-Style Media Slider
document.addEventListener('DOMContentLoaded', () => {
  const slides = document.querySelectorAll('.slide-item');
  const dots = document.querySelectorAll('.apple-dot');
  const prevBtn = document.getElementById('applePrev');
  const nextBtn = document.getElementById('appleNext');
  let currentIndex = 0;
  let autoTimer = null;

  // GIF durations in milliseconds (from ffprobe)
  const durations = {
    0: 6200,   
    1: 1800,   
    2: 14400,  
    3: null    
  };

  // Set WebM speed to 1.8x
  const videoElement = document.getElementById('appleSpeedVideo');
  if (videoElement) {
    videoElement.playbackRate = 1.8;
    videoElement.addEventListener('loadedmetadata', () => {
      videoElement.playbackRate = 1.8;
    });
  }

  function showSlide(index) {
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    
    if (autoTimer) clearTimeout(autoTimer);
    
    slides.forEach((slide, i) => {
      slide.classList.remove('active');
      if (i !== index) {
        const vid = slide.querySelector('video');
        if (vid) {
          vid.pause();
          vid.currentTime = 0;
        }
      }
    });
    
    slides[index].classList.add('active');
    currentIndex = index;
    
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
    
    const currentSlide = slides[index];
    
    if (currentSlide.dataset.type === 'video') {
      const vid = currentSlide.querySelector('video');
      if (vid) {
        vid.currentTime = 0;
        vid.play().catch(e => console.log("Autoplay prevented"));
        vid.onended = () => goToNextSlide();
      }
    } else if (durations[index]) {
      // Reload GIF to ensure it starts from beginning
      const gifImg = currentSlide.querySelector('img');
      if (gifImg) {
        const src = gifImg.src;
        gifImg.src = '';
        gifImg.src = src;
      }
      autoTimer = setTimeout(() => goToNextSlide(), durations[index]);
    }
  }
  
  function goToNextSlide() { showSlide(currentIndex + 1); }
  function goToPrevSlide() { showSlide(currentIndex - 1); }
  
  if (prevBtn) prevBtn.addEventListener('click', goToPrevSlide);
  if (nextBtn) nextBtn.addEventListener('click', goToNextSlide);
  dots.forEach((dot, idx) => dot.addEventListener('click', () => showSlide(idx)));
  
  showSlide(0);
});