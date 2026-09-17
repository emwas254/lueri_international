/**
 * LUERI INTERNATIONAL — NATIVE i18n SYSTEM
 * Zero dependencies. No Google Translate.
 * Supported locales: en, zh, sw, fr, es, ar, pt
 */

(function() {
  'use strict';

  // Translation dictionaries
  const translations = {
    en: {
      // Navigation
      'nav.services': 'Services',
      'nav.pricing': 'Pricing',
      'nav.business': 'Business',
      'nav.coverage': 'Coverage',
      'nav.why': 'Why Us',
      'nav.faq': 'FAQ',
      'nav.rewards': 'Rewards',
      'nav.careers': 'Careers',
      'nav.book': 'Book Pickup',
      
      // Hero
      'hero.dispatch': 'Dispatch / Nairobi & environs',
      'hero.waybill': 'WAYBILL NO. LI–2026',
      'hero.title': 'We move it\nacross Nairobi\ntoday.',
      'hero.subtitle': 'Lueri International handles last-mile delivery and courier dispatch for individuals and businesses — parcels, documents, and e-commerce orders, picked up and delivered the same day across Nairobi.',
      'hero.scope': 'Nairobi last-mile · Not cross-border freight',
      'hero.stamp': 'Same-day dispatch',
      'hero.pickup': 'PICKUP',
      'hero.dropoff': 'DROP-OFF',
      'hero.bookBtn': 'Book a Pickup',
      'hero.whatsappBtn': 'WhatsApp Us',
      
      // Lucy Chatbot
      'lucy.name': 'Lucy',
      'lucy.status': 'Online and ready to help',
      'lucy.greeting.en': 'Hello! I\'m Lucy, your Lueri assistant. How can I help you today?',
      'lucy.input': 'Ask me anything...',
      'lucy.send': 'Send',
      'lucy.close': 'Close',
      
      // Quick Actions
      'lucy.qa.pricing': 'Delivery Pricing',
      'lucy.qa.corporate': 'Corporate Plans',
      'lucy.qa.areas': 'Service Areas',
      'lucy.qa.hours': 'Opening Hours',
      'lucy.qa.track': 'Track Delivery',
      
      // Booking
      'booking.title': 'Book a pickup',
      'booking.pickup': 'Pickup Location',
      'booking.dropoff': 'Drop-off Location',
      'booking.details': 'Parcel Details',
      'booking.name': 'Your Name',
      'booking.phone': 'Phone Number',
      'booking.time': 'Preferred Pickup Time',
      'booking.member': 'Lueri Rewards Member No. (optional)',
      'booking.submit': 'Send Booking',
      'booking.terms': 'By booking, you agree to our Terms of Service and Privacy Policy.',
      
      // Footer
      'footer.registered': 'Registered business',
      'footer.contact': 'Contact',
      'footer.hours': 'Hours',
      'footer.copyright': '© 2026 Nairobi, Kenya'
    },
    
    zh: {
      // Navigation
      'nav.services': '服务',
      'nav.pricing': '价格',
      'nav.business': '企业账户',
      'nav.coverage': '服务范围',
      'nav.why': '为什么选择我们',
      'nav.faq': '常见问题',
      'nav.rewards': '奖励计划',
      'nav.careers': '职业机会',
      'nav.book': '预订取件',
      
      // Hero
      'hero.dispatch': '配送 / 内罗毕及周边',
      'hero.waybill': '运单号 LI–2026',
      'hero.title': '我们今日\n送达\n内罗毕各地',
      'hero.subtitle': 'Lueri International 为个人和企业提供最后一公里配送和快递服务——包裹、文件和电商订单，当天在内罗毕取件并送达。',
      'hero.scope': '内罗毕最后一公里 · 非跨境货运',
      'hero.stamp': '当天发货',
      'hero.pickup': '取件',
      'hero.dropoff': '送达',
      'hero.bookBtn': '预订取件',
      'hero.whatsappBtn': 'WhatsApp 联系我们',
      
      // Lucy Chatbot
      'lucy.name': 'Lucy',
      'lucy.status': '在线并准备为您服务',
      'lucy.greeting.zh': '您好！我是 Lucy，您的 Lueri 助手。今天我能帮您什么？',
      'lucy.input': '问我任何问题...',
      'lucy.send': '发送',
      'lucy.close': '关闭',
      
      // Quick Actions
      'lucy.qa.pricing': '配送价格',
      'lucy.qa.corporate': '企业计划',
      'lucy.qa.areas': '服务区域',
      'lucy.qa.hours': '营业时间',
      'lucy.qa.track': '追踪配送',
      
      // Booking
      'booking.title': '预订取件',
      'booking.pickup': '取件地点',
      'booking.dropoff': '送达地点',
      'booking.details': '包裹详情',
      'booking.name': '您的姓名',
      'booking.phone': '电话号码',
      'booking.time': '首选取件时间',
      'booking.member': 'Lueri 奖励计划会员号（可选）',
      'booking.submit': '发送预订',
      'booking.terms': '预订即表示您同意我们的服务条款和隐私政策。',
      
      // Footer
      'footer.registered': '注册企业',
      'footer.contact': '联系方式',
      'footer.hours': '营业时间',
      'footer.copyright': '© 2026 肯尼亚内罗毕'
    },
    
    sw: {
      // Navigation
      'nav.services': 'Huduma',
      'nav.pricing': 'Bei',
      'nav.business': 'Akaunti ya Biashara',
      'nav.coverage': 'Maeneo Tunayofikia',
      'nav.why': 'Kwa Nini Sisi',
      'nav.faq': 'Maswali Yanayoulizwa',
      'nav.rewards': 'Zawadi',
      'nav.careers': 'Kazi',
      'nav.book': 'Weka Oda ya Ukusanyaji',
      
      // Hero
      'hero.dispatch': 'Usafirishaji / Nairobi na maeneo ya jirani',
      'hero.waybill': 'NAMBA YA USAFIRI LI–2026',
      'hero.title': 'Tunasogeza\nkote Nairobi\nleo.',
      'hero.subtitle': 'Lueri International inashughulikia usafirishaji wa mwisho na kutuma ujumbe kwa ajili ya watu binafsi na biashara — vifurushi, hati, na maagizo ya biashara za mtandaoni, yanayochukuliwa na kufikishwa siku hiyo hiyo kote Nairobi.',
      'hero.scope': 'Mwisho wa safari Nairobi · Sio usafirishaji wa mipaka',
      'hero.stamp': 'Kutuma siku hiyo hiyo',
      'hero.pickup': 'KUCHUKUA',
      'hero.dropoff': 'KUTOA',
      'hero.bookBtn': 'Weka Oda ya Ukusanyaji',
      'hero.whatsappBtn': 'Tupigie WhatsApp',
      
      // Lucy Chatbot
      'lucy.name': 'Lucy',
      'lucy.status': 'Mtandaoni na tayari kukusaidia',
      'lucy.greeting.sw': 'Habari! Mimi ni Lucy, msaidizi wako wa Lueri. Ninaweza kukusaidia vipi leo?',
      'lucy.input': 'Niulize chochote...',
      'lucy.send': 'Tuma',
      'lucy.close': 'Funga',
      
      // Quick Actions
      'lucy.qa.pricing': 'Bei ya Usafirishaji',
      'lucy.qa.corporate': 'Mipango ya Shirika',
      'lucy.qa.areas': 'Maeneo ya Huduma',
      'lucy.qa.hours': 'Saa za Kufungua',
      'lucy.qa.track': 'Fuatilia Usafirishaji',
      
      // Booking
      'booking.title': 'Weka oda ya ukusanyaji',
      'booking.pickup': 'Mahali pa Kuchukulia',
      'booking.dropoff': 'Mahali pa Kutoa',
      'booking.details': 'Maelezo ya Kifurushi',
      'booking.name': 'Jina Lako',
      'booking.phone': 'Nambari ya Simu',
      'booking.time': 'Muda Unaopendelea',
      'booking.member': 'Nambari ya Mwanachama wa Lueri Rewards (hiari)',
      'booking.submit': 'Tuma Oda',
      'booking.terms': 'Kwa kuweka oda, unakubali Masharti yetu ya Huduma na Sera ya Faragha.',
      
      // Footer
      'footer.registered': 'Biashara iliyosajiliwa',
      'footer.contact': 'Mawasiliano',
      'footer.hours': 'Saa',
      'footer.copyright': '© 2026 Nairobi, Kenya'
    },
    
    fr: {
      // Navigation
      'nav.services': 'Services',
      'nav.pricing': 'Tarifs',
      'nav.business': 'Compte Entreprise',
      'nav.coverage': 'Zone de Couverture',
      'nav.why': 'Pourquoi Nous',
      'nav.faq': 'FAQ',
      'nav.rewards': 'Récompenses',
      'nav.careers': 'Carrières',
      'nav.book': 'Réserver un Enlèvement',
      
      // Hero
      'hero.dispatch': 'Expédition / Nairobi et environs',
      'hero.waybill': 'BON DE LIVRAISON LI–2026',
      'hero.title': 'Nous livrons\ndans tout Nairobi\naujourd\'hui.',
      'hero.subtitle': 'Lueri International gère la livraison du dernier kilomètre et l\'expédition de courrier pour les particuliers et les entreprises — colis, documents et commandes e-commerce, enlevés et livrés le jour même dans tout Nairobi.',
      'hero.scope': 'Dernier kilomètre Nairobi · Pas de fret transfrontalier',
      'hero.stamp': 'Expédition le jour même',
      'hero.pickup': 'ENLÈVEMENT',
      'hero.dropoff': 'LIVRAISON',
      'hero.bookBtn': 'Réserver un Enlèvement',
      'hero.whatsappBtn': 'WhatsApp',
      
      // Lucy Chatbot
      'lucy.name': 'Lucy',
      'lucy.status': 'En ligne et prête à aider',
      'lucy.greeting.fr': 'Bonjour ! Je suis Lucy, votre assistante Lueri. Comment puis-je vous aider aujourd\'hui ?',
      'lucy.input': 'Posez-moi n\'importe quoi...',
      'lucy.send': 'Envoyer',
      'lucy.close': 'Fermer',
      
      // Quick Actions
      'lucy.qa.pricing': 'Tarifs de Livraison',
      'lucy.qa.corporate': 'Plans Entreprise',
      'lucy.qa.areas': 'Zones de Service',
      'lucy.qa.hours': 'Heures d\'Ouverture',
      'lucy.qa.track': 'Suivre la Livraison',
      
      // Booking
      'booking.title': 'Réserver un enlèvement',
      'booking.pickup': 'Lieu d\'Enlèvement',
      'booking.dropoff': 'Lieu de Livraison',
      'booking.details': 'Détails du Colis',
      'booking.name': 'Votre Nom',
      'booking.phone': 'Numéro de Téléphone',
      'booking.time': 'Heure d\'Enlèvement Souhaitée',
      'booking.member': 'N° de Membre Lueri Rewards (optionnel)',
      'booking.submit': 'Envoyer la Réservation',
      'booking.terms': 'En réservant, vous acceptez nos Conditions d\'Utilisation et notre Politique de Confidentialité.',
      
      // Footer
      'footer.registered': 'Entreprise enregistrée',
      'footer.contact': 'Contact',
      'footer.hours': 'Horaires',
      'footer.copyright': '© 2026 Nairobi, Kenya'
    },
    
    es: {
      // Navigation
      'nav.services': 'Servicios',
      'nav.pricing': 'Precios',
      'nav.business': 'Cuenta Empresarial',
      'nav.coverage': 'Cobertura',
      'nav.why': 'Por Qué Nosotros',
      'nav.faq': 'Preguntas Frecuentes',
      'nav.rewards': 'Recompensas',
      'nav.careers': 'Empleos',
      'nav.book': 'Reservar Recogida',
      
      // Hero
      'hero.dispatch': 'Envío / Nairobi y alrededores',
      'hero.waybill': 'ALBARÁN LI–2026',
      'hero.title': 'Lo movemos\npor Nairobi\nhoy.',
      'hero.subtitle': 'Lueri International se encarga de la entrega de última milla y el envío de mensajería para particulares y empresas — paquetes, documentos y pedidos de comercio electrónico, recogidos y entregados el mismo día en Nairobi.',
      'hero.scope': 'Última milla Nairobi · No transporte transfronterizo',
      'hero.stamp': 'Envío el mismo día',
      'hero.pickup': 'RECOGIDA',
      'hero.dropoff': 'ENTREGA',
      'hero.bookBtn': 'Reservar Recogida',
      'hero.whatsappBtn': 'WhatsApp',
      
      // Lucy Chatbot
      'lucy.name': 'Lucy',
      'lucy.status': 'En línea y lista para ayudar',
      'lucy.greeting.es': '¡Hola! Soy Lucy, tu asistente de Lueri. ¿Cómo puedo ayudarte hoy?',
      'lucy.input': 'Pregúntame lo que sea...',
      'lucy.send': 'Enviar',
      'lucy.close': 'Cerrar',
      
      // Quick Actions
      'lucy.qa.pricing': 'Precios de Entrega',
      'lucy.qa.corporate': 'Planes Empresariales',
      'lucy.qa.areas': 'Zonas de Servicio',
      'lucy.qa.hours': 'Horario de Apertura',
      'lucy.qa.track': 'Seguimiento de Entrega',
      
      // Booking
      'booking.title': 'Reservar una recogida',
      'booking.pickup': 'Lugar de Recogida',
      'booking.dropoff': 'Lugar de Entrega',
      'booking.details': 'Detalles del Paquete',
      'booking.name': 'Tu Nombre',
      'booking.phone': 'Número de Teléfono',
      'booking.time': 'Hora de Recogida Preferida',
      'booking.member': 'Nº de Miembro Lueri Rewards (opcional)',
      'booking.submit': 'Enviar Reserva',
      'booking.terms': 'Al reservar, aceptas nuestros Términos de Servicio y Política de Privacidad.',
      
      // Footer
      'footer.registered': 'Empresa registrada',
      'footer.contact': 'Contacto',
      'footer.hours': 'Horario',
      'footer.copyright': '© 2026 Nairobi, Kenia'
    },
    
    ar: {
      // Navigation
      'nav.services': 'الخدمات',
      'nav.pricing': 'الأسعار',
      'nav.business': 'حساب الشركات',
      'nav.coverage': 'المناطق المغطاة',
      'nav.why': 'لماذا نحن',
      'nav.faq': 'الأسئلة الشائعة',
      'nav.rewards': 'المكافآت',
      'nav.careers': 'الوظائف',
      'nav.book': 'حجز استلام',
      
      // Hero
      'hero.dispatch': 'التسليم / نيروبي والضواحي',
      'hero.waybill': 'رقم الشحنة LI–2026',
      'hero.title': 'ننقله\nفي جميع أنحاء نيروبي\nاليوم.',
      'hero.subtitle': 'تتعامل Lueri International مع تسليم المرحلة الأخيرة وإرسال البريد السريع للأفراد والشركات — الطرود والمستندات وطلبات التجارة الإلكترونية، يتم استلامها وتسليمها في نفس اليوم في جميع أنحاء نيروبي.',
      'hero.scope': 'المرحلة الأخيرة نيروبي · ليس شحنًا عابرًا للحدود',
      'hero.stamp': 'تسليم في نفس اليوم',
      'hero.pickup': 'الاستلام',
      'hero.dropoff': 'التسليم',
      'hero.bookBtn': 'حجز استلام',
      'hero.whatsappBtn': 'واتساب',
      
      // Lucy Chatbot
      'lucy.name': 'Lucy',
      'lucy.status': 'متصل وجاهز للمساعدة',
      'lucy.greeting.ar': 'مرحبًا! أنا Lucy، مساعدتك في Lueri. كيف يمكنني مساعدتك اليوم؟',
      'lucy.input': 'اسألني أي شيء...',
      'lucy.send': 'إرسال',
      'lucy.close': 'إغلاق',
      
      // Quick Actions
      'lucy.qa.pricing': 'أسعار التسليم',
      'lucy.qa.corporate': 'خطط الشركات',
      'lucy.qa.areas': 'مناطق الخدمة',
      'lucy.qa.hours': 'ساعات العمل',
      'lucy.qa.track': 'تتبع التسليم',
      
      // Booking
      'booking.title': 'حجز استلام',
      'booking.pickup': 'موقع الاستلام',
      'booking.dropoff': 'موقع التسليم',
      'booking.details': 'تفاصيل الطرد',
      'booking.name': 'اسمك',
      'booking.phone': 'رقم الهاتف',
      'booking.time': 'وقت الاستلام المفضل',
      'booking.member': 'رقم عضو Lueri Rewards (اختياري)',
      'booking.submit': 'إرسال الحجز',
      'booking.terms': 'عن طريق الحجز، فإنك توافق على شروط الخدمة وسياسة الخصوصية.',
      
      // Footer
      'footer.registered': 'شركة مسجلة',
      'footer.contact': 'اتصل',
      'footer.hours': 'الساعات',
      'footer.copyright': '© 2026 نيروبي، كينيا'
    },
    
    pt: {
      // Navigation
      'nav.services': 'Serviços',
      'nav.pricing': 'Preços',
      'nav.business': 'Conta Empresarial',
      'nav.coverage': 'Cobertura',
      'nav.why': 'Por Que Nós',
      'nav.faq': 'Perguntas Frequentes',
      'nav.rewards': 'Recompensas',
      'nav.careers': 'Carreiras',
      'nav.book': 'Agendar Coleta',
      
      // Hero
      'hero.dispatch': 'Entrega / Nairóbi e arredores',
      'hero.waybill': 'NOTA DE ENTREGA LI–2026',
      'hero.title': 'Entregamos\nem toda Nairóbi\nhoje.',
      'hero.subtitle': 'A Lueri International cuida da entrega de última milha e despacho de encomendas para indivíduos e empresas — pacotes, documentos e pedidos de e-commerce, coletados e entregues no mesmo dia em Nairóbi.',
      'hero.scope': 'Última milha Nairóbi · Não transporte transfronteiriço',
      'hero.stamp': 'Entrega no mesmo dia',
      'hero.pickup': 'COLETA',
      'hero.dropoff': 'ENTREGA',
      'hero.bookBtn': 'Agendar Coleta',
      'hero.whatsappBtn': 'WhatsApp',
      
      // Lucy Chatbot
      'lucy.name': 'Lucy',
      'lucy.status': 'Online e pronto para ajudar',
      'lucy.greeting.pt': 'Olá! Sou Lucy, sua assistente da Lueri. Como posso ajudar você hoje?',
      'lucy.input': 'Pergunte-me qualquer coisa...',
      'lucy.send': 'Enviar',
      'lucy.close': 'Fechar',
      
      // Quick Actions
      'lucy.qa.pricing': 'Preços de Entrega',
      'lucy.qa.corporate': 'Planos Empresariais',
      'lucy.qa.areas': 'Áreas de Serviço',
      'lucy.qa.hours': 'Horário de Funcionamento',
      'lucy.qa.track': 'Rastrear Entrega',
      
      // Booking
      'booking.title': 'Agendar uma coleta',
      'booking.pickup': 'Local de Coleta',
      'booking.dropoff': 'Local de Entrega',
      'booking.details': 'Detalhes do Pacote',
      'booking.name': 'Seu Nome',
      'booking.phone': 'Número de Telefone',
      'booking.time': 'Horário de Coleta Preferido',
      'booking.member': 'Nº de Membro Lueri Rewards (opcional)',
      'booking.submit': 'Enviar Agendamento',
      'booking.terms': 'Ao agendar, você concorda com nossos Termos de Serviço e Política de Privacidade.',
      
      // Footer
      'footer.registered': 'Empresa registrada',
      'footer.contact': 'Contato',
      'footer.hours': 'Horário',
      'footer.copyright': '© 2026 Nairóbi, Quênia'
    }
  };

  // Current locale
  let currentLocale = 'en';

  // Translation function
  window.lueriTranslate = function(key, locale) {
    const loc = locale || currentLocale;
    const dict = translations[loc];
    if (!dict) {
      console.warn(`Translation dictionary not found for locale: ${loc}`);
      return translations.en[key] || key;
    }
    return dict[key] || translations.en[key] || key;
  };

  // Set locale and apply translations
  window.lueriSetLocale = function(locale) {
    if (!translations[locale]) {
      console.warn(`Locale not supported: ${locale}`);
      return;
    }
    
    currentLocale = locale;
    
    // Store in localStorage
    localStorage.setItem('lueri_locale', locale);
    
    // Apply to all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      const key = el.getAttribute('data-i18n');
      const translation = window.lueriTranslate(key, locale);
      
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        if (el.placeholder) {
          el.placeholder = translation;
        } else {
          el.value = translation;
        }
      } else {
        el.textContent = translation;
      }
    });
    
    // Handle RTL for Arabic
    if (locale === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.body.classList.add('rtl');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.body.classList.remove('rtl');
    }
    
    // Dispatch custom event for Lucy and other components
    window.dispatchEvent(new CustomEvent('lueriLocaleChanged', { 
      detail: { locale: locale } 
    }));
  };

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', function() {
    // Get locale from localStorage or default to 'en'
    const savedLocale = localStorage.getItem('lueri_locale') || 'en';
    window.lueriSetLocale(savedLocale);
    
    // Setup language selector if it exists
    const langSelector = document.getElementById('languageSelector');
    if (langSelector) {
      langSelector.addEventListener('change', function(e) {
        window.lueriSetLocale(e.target.value);
      });
      langSelector.value = currentLocale;
    }
  });

})();
