/* Lueri International — strict language completion layer
   Completes customer-facing copy that was outside the core translation map.
   No Google Translate. No third-party translation service.
*/
(function () {
  'use strict';

  var copy = {
    en: {
      review: "We're building our review base with real customers. If you've used Lueri and had a good experience, we'd appreciate an honest review on Facebook — it helps other Nairobi businesses find reliable delivery.",
      pod: {
        title: 'Proof of delivery', subtitle: 'Visibility from dispatch to handover.',
        step1Label: 'Step 01', step1Title: 'Quote before pickup', step1Text: 'You receive a confirmed price and estimated delivery window on WhatsApp before we dispatch — no surprises after collection.',
        step2Label: 'Step 02', step2Title: 'Status updates', step2Text: "We message you when your parcel is picked up and when it's out for delivery. You're never left guessing where it is.",
        step3Label: 'Step 03', step3Title: 'Delivery confirmation', step3Text: 'Every completed job includes confirmation that your parcel reached the recipient — photo or written confirmation on request.'
      },
      prices: ['From KES 350', 'Custom rates', 'Quoted live'],
      tags: ['SVC','PRC','BIZ','CVG','WHY','FAQ','RWD','CAR','BK']
    },
    zh: {
      review: '我们正在与真实客户一起建立评价记录。如果您使用过 Lueri 并有良好体验，我们欢迎您在 Facebook 上留下真实评价——这将帮助内罗毕的其他企业找到可靠的配送服务。',
      pod: {
        title: '配送证明', subtitle: '从派送到交接，全程可见。',
        step1Label: '步骤 01', step1Title: '取件前确认报价', step1Text: '我们会在通过 WhatsApp 派送前确认价格和预计送达时间——取件后不会出现意外费用。',
        step2Label: '步骤 02', step2Title: '状态更新', step2Text: '包裹取件后以及开始派送时，我们会向您发送消息。您始终可以了解包裹的位置。',
        step3Label: '步骤 03', step3Title: '配送确认', step3Text: '每次完成配送都会确认包裹已送达收件人——可按需提供照片或书面确认。'
      },
      prices: ['起价 KES 350', '定制价格', '实时报价'],
      tags: ['服务','价格','企业','范围','为何','问答','奖励','招聘','预约']
    },
    sw: {
      review: 'Tunajenga rekodi yetu ya maoni kwa kutumia wateja halisi. Ikiwa umetumia Lueri na ukapata huduma nzuri, tungefurahia maoni yako ya kweli kwenye Facebook — itasaidia biashara nyingine Nairobi kupata huduma ya usafirishaji ya kuaminika.',
      pod: {
        title: 'Uthibitisho wa Uwasilishaji', subtitle: 'Ufuatiliaji kutoka kuchukua hadi kufikisha.',
        step1Label: 'Hatua 01', step1Title: 'Bei kabla ya kuchukua', step1Text: 'Unapokea bei iliyothibitishwa na muda unaokadiriwa wa kufikisha kupitia WhatsApp kabla ya kuanza — hakuna mshangao baada ya kuchukua.',
        step2Label: 'Hatua 02', step2Title: 'Taarifa za hali', step2Text: 'Tunatumia ujumbe kukujulisha kifurushi kinapochukuliwa na kinapoanza kupelekwa. Hutabaki ukikisia kilipo.',
        step3Label: 'Hatua 03', step3Title: 'Uthibitisho wa kufikisha', step3Text: 'Kila kazi iliyokamilika ina uthibitisho kwamba kifurushi kimemfikia mpokeaji — picha au uthibitisho wa maandishi kwa ombi.'
      },
      prices: ['Kuanzia KES 350', 'Bei maalum', 'Bei hutolewa moja kwa moja'],
      tags: ['Huduma','Bei','Biashara','Maeneo','Kwa nini','Maswali','Zawadi','Ajira','Agiza']
    },
    fr: {
      review: 'Nous construisons notre base d’avis avec de vrais clients. Si vous avez utilisé Lueri et apprécié notre service, nous vous invitons à laisser un avis honnête sur Facebook — cela aide les entreprises de Nairobi à trouver une livraison fiable.',
      pod: {
        title: 'Preuve de livraison', subtitle: 'Visibilité du départ à la remise.',
        step1Label: 'Étape 01', step1Title: 'Devis avant collecte', step1Text: 'Vous recevez un prix confirmé et une fenêtre de livraison estimée sur WhatsApp avant l’expédition — aucune surprise après la collecte.',
        step2Label: 'Étape 02', step2Title: 'Mises à jour du statut', step2Text: 'Nous vous informons lorsque votre colis est collecté puis lorsqu’il est en cours de livraison. Vous savez toujours où il se trouve.',
        step3Label: 'Étape 03', step3Title: 'Confirmation de livraison', step3Text: 'Chaque course terminée comprend une confirmation que le colis est arrivé au destinataire — photo ou confirmation écrite sur demande.'
      },
      prices: ['À partir de 350 KES', 'Tarifs personnalisés', 'Devis en direct'],
      tags: ['Services','Prix','Entreprise','Zone','Pourquoi','FAQ','Récompenses','Emplois','Réserver']
    },
    es: {
      review: 'Estamos construyendo nuestra base de reseñas con clientes reales. Si has utilizado Lueri y tu experiencia fue buena, agradeceríamos una reseña honesta en Facebook — ayudará a otras empresas de Nairobi a encontrar un servicio de entrega fiable.',
      pod: {
        title: 'Prueba de entrega', subtitle: 'Visibilidad desde el despacho hasta la entrega.',
        step1Label: 'Paso 01', step1Title: 'Cotización antes de recoger', step1Text: 'Recibes un precio confirmado y una ventana estimada de entrega por WhatsApp antes del despacho — sin sorpresas después de la recogida.',
        step2Label: 'Paso 02', step2Title: 'Actualizaciones de estado', step2Text: 'Te avisamos cuando recogemos tu paquete y cuando sale para la entrega. Nunca tendrás que adivinar dónde está.',
        step3Label: 'Paso 03', step3Title: 'Confirmación de entrega', step3Text: 'Cada servicio completado incluye confirmación de que el paquete llegó al destinatario — foto o confirmación escrita si la solicitas.'
      },
      prices: ['Desde 350 KES', 'Tarifas personalizadas', 'Cotización en directo'],
      tags: ['Servicios','Precios','Empresa','Cobertura','Por qué','Preguntas','Recompensas','Empleo','Reservar']
    },
    ar: {
      review: 'نحن نبني قاعدة تقييماتنا من خلال عملائنا الحقيقيين. إذا سبق لك استخدام Lueri وكانت تجربتك جيدة، فسنسعد بتقييم صادق على فيسبوك — فهذا يساعد شركات نيروبي الأخرى في العثور على خدمة توصيل موثوقة.',
      pod: {
        title: 'إثبات التسليم', subtitle: 'رؤية واضحة من الإرسال حتى التسليم.',
        step1Label: 'الخطوة 01', step1Title: 'التسعير قبل الاستلام', step1Text: 'تحصل على سعر مؤكد وموعد تقديري للتسليم عبر واتساب قبل الإرسال — لا توجد مفاجآت بعد الاستلام.',
        step2Label: 'الخطوة 02', step2Title: 'تحديثات الحالة', step2Text: 'نرسل لك رسالة عند استلام طردك وعند خروجه للتسليم. لن تضطر إلى التخمين بشأن مكانه.',
        step3Label: 'الخطوة 03', step3Title: 'تأكيد التسليم', step3Text: 'يتضمن كل طلب مكتمل تأكيداً بوصول طردك إلى المستلم — صورة أو تأكيداً كتابياً عند الطلب.'
      },
      prices: ['ابتداءً من 350 شلن كيني', 'أسعار مخصصة', 'تسعير مباشر'],
      tags: ['الخدمات','الأسعار','الشركات','النطاق','لماذا نحن','الأسئلة','المكافآت','الوظائف','الحجز']
    },
    pt: {
      review: 'Estamos a construir a nossa base de avaliações com clientes reais. Se já utilizou a Lueri e teve uma boa experiência, agradecemos uma avaliação honesta no Facebook — isso ajuda outras empresas de Nairobi a encontrar um serviço de entregas fiável.',
      pod: {
        title: 'Comprovativo de entrega', subtitle: 'Visibilidade desde a expedição até à entrega.',
        step1Label: 'Passo 01', step1Title: 'Orçamento antes da recolha', step1Text: 'Recebe um preço confirmado e uma janela estimada de entrega pelo WhatsApp antes da expedição — sem surpresas após a recolha.',
        step2Label: 'Passo 02', step2Title: 'Atualizações de estado', step2Text: 'Enviamos uma mensagem quando o seu pacote é recolhido e quando sai para entrega. Nunca fica sem saber onde está.',
        step3Label: 'Passo 03', step3Title: 'Confirmação de entrega', step3Text: 'Cada entrega concluída inclui confirmação de que o pacote chegou ao destinatário — foto ou confirmação escrita mediante pedido.'
      },
      prices: ['A partir de 350 KES', 'Preços personalizados', 'Cotação em direto'],
      tags: ['Serviços','Preços','Empresas','Cobertura','Porquê','Perguntas','Recompensas','Carreiras','Reservar']
    }
  };

  function setText(selector, value) {
    var nodes = document.querySelectorAll(selector);
    nodes.forEach(function (node) { node.textContent = value; });
  }

  function applyStrict(locale) {
    var lang = copy[locale] || copy.en;
    var p = lang.pod;
    setText('[data-i18n="why.reviewText"]', lang.review);
    setText('[data-i18n="pod.title"]', p.title);
    setText('[data-i18n="pod.subtitle"]', p.subtitle);
    setText('[data-i18n="pod.step1Label"]', p.step1Label);
    setText('[data-i18n="pod.step1Title"]', p.step1Title);
    setText('[data-i18n="pod.step1Text"]', p.step1Text);
    setText('[data-i18n="pod.step2Label"]', p.step2Label);
    setText('[data-i18n="pod.step2Title"]', p.step2Title);
    setText('[data-i18n="pod.step2Text"]', p.step2Text);
    setText('[data-i18n="pod.step3Label"]', p.step3Label);
    setText('[data-i18n="pod.step3Title"]', p.step3Title);
    setText('[data-i18n="pod.step3Text"]', p.step3Text);

    document.querySelectorAll('.pricing-card .price').forEach(function (node, i) {
      if (lang.prices[i]) node.textContent = lang.prices[i];
    });
    document.querySelectorAll('.menu-link-tag').forEach(function (node, i) {
      if (lang.tags[i]) node.textContent = lang.tags[i];
    });
  }

  function wire() {
    var previous = window.lueriSetLocale;
    window.lueriSetLocale = function (locale) {
      if (typeof previous === 'function') previous(locale);
      window.setTimeout(function () { applyStrict(locale); }, 0);
    };
    var locale = localStorage.getItem('lueri_language') || document.documentElement.lang || 'en';
    window.setTimeout(function () { applyStrict(locale); }, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire, { once: true });
  } else {
    wire();
  }
})();
