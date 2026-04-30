function showShot(name, btn) {
  document.querySelectorAll('.shot-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
  document.getElementById('shot-' + name).classList.add('active');
  btn.classList.add('active');
  moveTabIndicator(btn);
}

function moveTabIndicator(activeButton) {
  const indicator = document.querySelector('.tab-indicator');
  if (!indicator) return;
  const container = document.querySelector('.shots-tabs');
  const rect = activeButton.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  indicator.style.width = rect.width + 'px';
  indicator.style.transform = `translateX(${rect.left - containerRect.left}px)`;
}

window.addEventListener('resize', () => {
  const active = document.querySelector('.stab.active');
  if (active) moveTabIndicator(active);
});

document.addEventListener('DOMContentLoaded', () => {
  const active = document.querySelector('.stab.active');
  if (active) moveTabIndicator(active);
});