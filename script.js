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

// Also re-calculate if the tab container is scrolled (mobile)
document.addEventListener('DOMContentLoaded', () => {
  const tabContainer = document.querySelector('.shots-tabs');
  if (tabContainer) {
    tabContainer.addEventListener('scroll', () => {
      const active = document.querySelector('.stab.active');
      if (active) moveTabIndicator(active);
    });
  }
});