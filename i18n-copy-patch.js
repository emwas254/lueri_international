/* Copy update 2026-09-23: corrected pricing to cover real per-delivery cost (Standard KES 350,
   Express KES 800, documents KES 400, errands/bulk from KES 600). Loaded after i18n-completion.js
   and before i18n.js, so it overrides the English and Swahili strings. Other languages keep their
   earlier translations except the first price, which is language-neutral. Edit prices HERE and in
   index.html when you re-price. */
(function () {
  var T = window.LueriI18n && window.LueriI18n.translations;
  if (!T) return;
  function merge(dst, src) { Object.keys(src).forEach(function (k) {
    if (src[k] && typeof src[k] === 'object') { dst[k] = dst[k] || {}; merge(dst[k], src[k]); } else dst[k] = src[k]; }); }
  var en = {
    hero: { title: 'Errands and deliveries across Nairobi, done today.',
      subtitle: 'Tell us what you need on WhatsApp. We will collect it, check it, buy it or deliver it, and confirm with you before we move. Parcels, documents, Eastleigh stock checks, bulk buys like 15 kg of rice, and same-day runs across Nairobi.' },
    services: {
      parcelTitle: 'Errands & stock checks',
      parcelText: "Can't get to town? We go to the shop (Eastleigh fabric, spare parts, stock), check it, confirm with you by call or WhatsApp, then ship or deliver it.",
      ecommerceTitle: 'Bulk buys & pickups',
      ecommerceText: 'Rice, groceries or supplies bought or collected in town and delivered to your door at one all-in quoted price.',
      urgentTitle: 'Parcels, documents & CBD runs',
      urgentText: 'Same-day point-to-point delivery within Nairobi: parcels, documents, cheques, and CBD runs from KES 350 (Standard, shared route) or KES 800 (Express, dedicated rider). Applies only within the Nairobi CBD boundary — anywhere further is quoted by zone before we move.' },
    pricing: { single: 'Quick runs & documents', priceFrom: 'KES 350–800',
      singleText: 'KES 350 for a shared-route Standard delivery when both pickup and drop-off are within Nairobi CBD. Documents and cheques are KES 400. Need it moving right now? Express (dedicated rider) is KES 800. Anything outside the Nairobi CBD boundary, or heavier/larger, is quoted separately by zone and size before we move.',
      urgent: 'Errands', priority: 'Errands & bulk pickups', priceQuoted: 'From KES 600',
      urgentText: 'Check-and-confirm errands (e.g. Eastleigh stock checks) and bulky/luggage pickups from KES 600 within Nairobi. Bulk buy-and-deliver jobs are quoted all-in before we move.',
      quoteBody: 'Every job is quoted before we move, with no hidden fees. Send your pickup point, drop-off point and what you need on WhatsApp or the booking form below. In a hurry? Say so and we confirm price and ETA first. Payment accepted via M-Pesa.' }
  };
  var sw = {
    hero: { title: 'Kazi na safari Nairobi nzima, zinafanyika leo.',
      subtitle: 'Tuambie unachohitaji kupitia WhatsApp. Tutakichukua, kukikagua, kukinunua au kukifikisha, na kukuthibitishia kabla hatujaanza. Vifurushi, hati, ukaguzi wa mzigo Eastleigh, ununuzi wa jumla kama mchele kilo 15, na usafirishaji wa siku hiyo hiyo ndani ya Nairobi.' },
    services: {
      parcelTitle: 'Errands na ukaguzi wa mzigo',
      parcelText: 'Huwezi kufika mjini? Tunaenda dukani (vitambaa Eastleigh, vipuri, mzigo), tunakagua, tunakuthibitishia kwa simu au WhatsApp, kisha tunatuma au kufikisha.',
      ecommerceTitle: 'Ununuzi wa jumla na uchukuzi',
      ecommerceText: 'Mchele, mboga au bidhaa zinanunuliwa au kuchukuliwa mjini na kufikishwa kwako kwa bei moja kamili iliyotajwa.',
      urgentTitle: 'Vifurushi, hati na safari za CBD',
      urgentText: 'Usafirishaji wa siku hiyo hiyo ndani ya Nairobi: vifurushi, hati, hundi na safari za CBD kuanzia KES 350 (Standard, njia ya pamoja) au KES 800 (Express, rider maalum). Inatumika tu ndani ya mpaka wa Nairobi CBD — mbali zaidi hutolewa bei kulingana na eneo.' },
    pricing: { single: 'Safari fupi na hati', priceFrom: 'KES 350–800',
      singleText: 'KES 350 kwa delivery ya Standard (njia ya pamoja) ikiwa eneo la kuchukua na la kupeleka yote mawili yako ndani ya Nairobi CBD. Hati na hundi ni KES 400. Una haraka? Express (rider maalum) ni KES 800. Nje ya Nairobi CBD, au kwa mzigo mkubwa/mzito, tunatoa bei tofauti kulingana na eneo na ukubwa kabla hatujaanza.',
      urgent: 'Errands', priority: 'Errands na uchukuzi wa jumla', priceQuoted: 'Kuanzia KES 600',
      urgentText: 'Errands za kukagua na kuthibitisha (mf. ukaguzi wa mzigo Eastleigh) na uchukuzi wa mizigo mikubwa kuanzia KES 600 ndani ya Nairobi. Kazi za ununuzi wa jumla hutolewa bei kamili kabla hatujaanza.',
      quoteBody: 'Kila kazi hutolewa bei kabla hatujaanza, bila gharama zilizofichwa. Tuma eneo la kuchukua, la kupeleka na unachohitaji kupitia WhatsApp au fomu iliyo chini. Una haraka? Tuambie, tuthibitishe bei na muda kwanza. Malipo kupitia M-Pesa.' }
  };
  merge(T.en = T.en || {}, en);
  merge(T.sw = T.sw || {}, sw);
  Object.keys(T).forEach(function (l) { if (l !== 'en') { T[l].pricing = T[l].pricing || {}; T[l].pricing.priceFrom = 'KES 350–800'; } });
})();