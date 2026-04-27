/* ================================================================
   paint.js — JS Paint embed direto no site
   ================================================================ */
const PaintSystem = {
  inited: false,
  init: function () {
    if (this.inited) return;
    this.inited = true;
    const wrap = document.getElementById('paintEmbedWrap');
    if (!wrap) return;
    wrap.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.id  = 'paintEmbed';
    iframe.src = 'https://jspaint.app';
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('allow', 'clipboard-read; clipboard-write; display-capture');
    wrap.appendChild(iframe);
    const section = document.getElementById('pg-sketchbook');
    if (section) {
      section.querySelectorAll('h2').forEach(function (h) {
        if (h.textContent.trim() === 'JS Paint') {
          h.style.cursor = 'pointer';
          h.title = 'Open JS Paint in a new tab';
          h.addEventListener('click', function () {
            window.open('https://jspaint.app', '_blank', 'noopener,noreferrer');
          });
        }
      });
    }
  }
};
window.PaintSystem = PaintSystem;
document.addEventListener('DOMContentLoaded', function () {
  const page = document.getElementById('pg-sketchbook');
  if (!page) return;
  const observer = new MutationObserver(function () {
    if (page.classList.contains('active')) PaintSystem.init();
  });
  observer.observe(page, { attributes: true, attributeFilter: ['class'] });
  if (page.classList.contains('active')) PaintSystem.init();
});
