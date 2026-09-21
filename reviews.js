/* Customer reviews. Add ONLY real reviews you have permission to publish (ask first, see the
   review request message). The section stays hidden while this list is empty.
   Format:  { name: 'Jane W.', detail: 'Fabric seller, Eastleigh', text: 'One or two sentences.', date: 'Sep 2026' } */
(function () {
  var REVIEWS = [
  ];
  var box = document.getElementById('customerReviews');
  if (!box || !REVIEWS.length) return;
  REVIEWS.slice(0, 6).forEach(function (r) {
    var card = document.createElement('figure'); card.className = 'review-card';
    var q = document.createElement('blockquote'); q.textContent = r.text || '';
    var c = document.createElement('figcaption');
    c.textContent = [r.name, r.detail, r.date].filter(Boolean).join(' · ');
    card.appendChild(q); card.appendChild(c); box.appendChild(card);
  });
  box.hidden = false;
})();