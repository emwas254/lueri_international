/* Lueri Rewards — seven-language runtime
   Keeps the Rewards destination in the language selected on the main site.
   No external translation widget.
*/
(function () {
  'use strict';

  const LANGS = ['en','zh','sw','fr','es','ar','pt'];
  const NAMES = {
    en:'🇬🇧 English', zh:'🇨🇳 中文', sw:'🇰🇪 Kiswahili',
    fr:'🇫🇷 Français', es:'🇪🇸 Español', ar:'🇸🇦 العربية', pt:'🇧🇷 Português'
  };
  const KEY = 'lueri_language';

  const T = {
    en: {
      main:'← Main site', careers:'Careers', eyebrow:'Lueri Rewards',
      title:'Earn on every<br>delivery.',
      subtitle:'Free to join. Every booking earns points toward Silver, Gold, Platinum and VIP — unlocking free deliveries, discounts and priority dispatch. Or skip the wait and buy your tier outright below.',
      tierEyebrow:'Earn it free — tiers by spend',
      tierNote:'Your tier is based on your spend over the last 12 months, so it reflects your recent activity with us. Points are earned on every booking and can be redeemed for delivery vouchers — see your balance under "My Rewards" once you\'ve joined.',
      buyEyebrow:'Or buy it outright', buyTitle:'Skip the wait — 1 year, instant',
      freeStart:'Prefer to start without a paid membership?', freeLink:'Join for Free',
      myRewards:'My Rewards', joinNow:'Join Now',
      lookupIntro:'Enter the phone number you registered with to view your points and tier.',
      phone:'Phone number', viewRewards:'View my rewards',
      notMember:'Not a member yet?', joinRewards:'Join Lueri Rewards',
      currentTier:'Current tier', pointsBalance:'Points balance', benefits:'Your benefits',
      recent:'Recent activity', noTransactions:'No transactions yet.',
      lookupAnother:'Look up a different number',
      signing:'You\'re signing up for', fullName:'Full name', email:'Email (optional)',
      create:'Create my Rewards account',
      disclosureTitle:'How this works right now:',
      disclosure:'Lueri Rewards is in early rollout. Your membership is saved centrally, so you can look up your account from any phone or browser using your registered number. Points aren\'t posted automatically yet — after a delivery, message us on WhatsApp with your registered number and our team will log the transaction on their end.',
      startingTier:'Starting tier', annualSpend:'annual spend', perYear:'per year', choose:'Choose',
      everything:'Everything in', more:'more', reach:'to reach', topTier:'You\'ve reached our top tier — VIP.',
      noAccount:'We couldn\'t find a Rewards account with that number. Double-check the number, or message us on WhatsApp and we\'ll help.',
      enterPhone:'Enter your phone number.',
      settingUp:'Setting up your account…', secureRedirect:'Setting up your membership — redirecting you to secure payment…',
      welcome:'Welcome', welcomeBack:'Welcome back', memberNo:'Member No.',
      saveNumber:'Save this number — you\'ll need it to look up your rewards.',
      existingAccount:'We found your existing Rewards account. You are currently',
      viewArrow:'View my rewards →', date:'Date', type:'Type', amount:'Amount', points:'Points', receipt:'Receipt'
    },
    zh: {
      main:'← 返回主页', careers:'职业机会', eyebrow:'Lueri Rewards',
      title:'每次配送<br>都能赚取积分。',
      subtitle:'免费加入。每次预订都可赚取积分，逐步升级至 Silver、Gold、Platinum 和 VIP，享受免费配送、折扣和优先派送。也可以直接购买所需等级的会员资格。',
      tierEyebrow:'免费升级 — 按消费金额计算等级',
      tierNote:'您的等级根据过去 12 个月的消费计算，反映您近期的使用情况。每次预订都可获得积分；加入后可在“我的 Rewards”中查看余额并兑换配送券。',
      buyEyebrow:'或直接购买会员', buyTitle:'无需等待 — 一年期，立即生效',
      freeStart:'想先从免费会员开始？', freeLink:'免费加入',
      myRewards:'我的 Rewards', joinNow:'立即加入',
      lookupIntro:'输入您注册时使用的电话号码，即可查看积分和会员等级。',
      phone:'电话号码', viewRewards:'查看我的 Rewards',
      notMember:'还不是会员？', joinRewards:'加入 Lueri Rewards',
      currentTier:'当前等级', pointsBalance:'积分余额', benefits:'您的会员权益',
      recent:'近期活动', noTransactions:'暂无交易记录。',
      lookupAnother:'查询其他号码',
      signing:'您正在注册', fullName:'姓名', email:'电子邮箱（可选）',
      create:'创建我的 Rewards 账户',
      disclosureTitle:'目前的运作方式：',
      disclosure:'Lueri Rewards 目前处于早期推广阶段。您的会员资料会集中保存，您可以在任何手机或浏览器上使用注册号码查询账户。积分目前不会自动入账——每次配送后，请通过 WhatsApp 提供您的注册号码，我们的团队会在后台记录交易。',
      startingTier:'起始等级', annualSpend:'年度消费', perYear:'每年', choose:'选择',
      everything:'包含', more:'还需', reach:'即可达到', topTier:'您已达到最高等级 — VIP。',
      noAccount:'找不到与该号码对应的 Rewards 账户。请检查号码，或通过 WhatsApp 联系我们。',
      enterPhone:'请输入您的电话号码。',
      settingUp:'正在创建账户…', secureRedirect:'正在设置会员资格，即将转到安全支付…',
      welcome:'欢迎', welcomeBack:'欢迎回来', memberNo:'会员编号',
      saveNumber:'请保存此编号，之后查询 Rewards 时需要使用。',
      existingAccount:'我们找到了您已有的 Rewards 账户。您当前等级为',
      viewArrow:'查看我的 Rewards →', date:'日期', type:'类型', amount:'金额', points:'积分', receipt:'收据'
    },
    sw: {
      main:'← Tovuti kuu', careers:'Ajira', eyebrow:'Lueri Rewards',
      title:'Pata zawadi<br>kwa kila delivery.',
      subtitle:'Kujiunga ni bure. Kila booking hukupa pointi kuelekea Silver, Gold, Platinum na VIP — pamoja na deliveries za bure, punguzo na huduma ya kipaumbele. Unaweza pia kununua tier yako moja kwa moja hapa chini.',
      tierEyebrow:'Panda bure — tiers kulingana na matumizi',
      tierNote:'Tier yako inategemea matumizi yako ya miezi 12 iliyopita. Kila booking hupata pointi; baada ya kujiunga unaweza kuona salio lako chini ya "My Rewards" na kutumia pointi kwa vouchers za delivery.',
      buyEyebrow:'Au nunua moja kwa moja', buyTitle:'Usisubiri — mwaka 1, mara moja',
      freeStart:'Ungependa kuanza bila uanachama wa kulipia?', freeLink:'Jiunge Bure',
      myRewards:'My Rewards', joinNow:'Jiunge Sasa',
      lookupIntro:'Weka nambari ya simu uliyosajili nayo ili kuona pointi na tier yako.',
      phone:'Nambari ya simu', viewRewards:'Angalia rewards zangu',
      notMember:'Bado si mwanachama?', joinRewards:'Jiunge na Lueri Rewards',
      currentTier:'Tier ya sasa', pointsBalance:'Salio la pointi', benefits:'Faida zako',
      recent:'Shughuli za hivi karibuni', noTransactions:'Hakuna miamala bado.',
      lookupAnother:'Angalia nambari nyingine',
      signing:'Unajiandikisha kwa', fullName:'Jina kamili', email:'Barua pepe (si lazima)',
      create:'Fungua akaunti yangu ya Rewards',
      disclosureTitle:'Jinsi inavyofanya kazi kwa sasa:',
      disclosure:'Lueri Rewards iko katika hatua za awali za uzinduzi. Uanachama wako huhifadhiwa kwenye mfumo mkuu, hivyo unaweza kuangalia akaunti yako kutoka simu au browser yoyote kwa kutumia nambari yako iliyosajiliwa. Pointi bado haziwekwi kiotomatiki — baada ya delivery, tutumie nambari yako ya usajili kupitia WhatsApp na timu yetu itaweka muamala.',
      startingTier:'Tier ya kuanzia', annualSpend:'matumizi ya mwaka', perYear:'kwa mwaka', choose:'Chagua',
      everything:'Kila kitu katika', more:'ongeza', reach:'kufikia', topTier:'Umefikia tier yetu ya juu — VIP.',
      noAccount:'Hatukupata akaunti ya Rewards yenye nambari hiyo. Kagua nambari au tutumie ujumbe WhatsApp.',
      enterPhone:'Weka nambari yako ya simu.',
      settingUp:'Inaandaa akaunti yako…', secureRedirect:'Inaandaa uanachama wako — inakuelekeza kwenye malipo salama…',
      welcome:'Karibu', welcomeBack:'Karibu tena', memberNo:'Nambari ya Mwanachama',
      saveNumber:'Hifadhi nambari hii — utaihitaji kuangalia rewards zako.',
      existingAccount:'Tumepata akaunti yako ya Rewards. Tier yako ya sasa ni',
      viewArrow:'Angalia rewards zangu →', date:'Tarehe', type:'Aina', amount:'Kiasi', points:'Pointi', receipt:'Risiti'
    },
    fr: {
      main:'← Site principal', careers:'Carrières', eyebrow:'Lueri Rewards',
      title:'Gagnez à chaque<br>livraison.',
      subtitle:'Inscription gratuite. Chaque réservation rapporte des points vers Silver, Gold, Platinum et VIP — avec livraisons gratuites, réductions et priorité. Vous pouvez aussi acheter directement votre niveau ci-dessous.',
      tierEyebrow:'Progressez gratuitement — niveaux selon les dépenses',
      tierNote:'Votre niveau est calculé sur vos dépenses des 12 derniers mois. Chaque réservation rapporte des points; après inscription, consultez votre solde dans « My Rewards » et échangez vos points contre des bons de livraison.',
      buyEyebrow:'Ou achetez directement', buyTitle:'Sans attendre — 1 an, immédiatement',
      freeStart:'Vous préférez commencer sans abonnement payant ?', freeLink:'Inscription gratuite',
      myRewards:'Mes Rewards', joinNow:'Rejoindre',
      lookupIntro:'Entrez le numéro de téléphone utilisé lors de votre inscription pour voir vos points et votre niveau.',
      phone:'Numéro de téléphone', viewRewards:'Voir mes rewards',
      notMember:'Pas encore membre ?', joinRewards:'Rejoindre Lueri Rewards',
      currentTier:'Niveau actuel', pointsBalance:'Solde de points', benefits:'Vos avantages',
      recent:'Activité récente', noTransactions:'Aucune transaction pour le moment.',
      lookupAnother:'Rechercher un autre numéro',
      signing:'Vous vous inscrivez à', fullName:'Nom complet', email:'E-mail (facultatif)',
      create:'Créer mon compte Rewards',
      disclosureTitle:'Comment cela fonctionne actuellement :',
      disclosure:'Lueri Rewards est encore en phase de lancement. Votre adhésion est enregistrée de façon centralisée, vous pouvez donc consulter votre compte depuis n’importe quel téléphone ou navigateur avec votre numéro enregistré. Les points ne sont pas encore ajoutés automatiquement : après une livraison, envoyez-nous votre numéro enregistré sur WhatsApp et notre équipe enregistrera la transaction.',
      startingTier:'Niveau de départ', annualSpend:'dépenses annuelles', perYear:'par an', choose:'Choisir',
      everything:'Tout ce qui est inclus dans', more:'encore', reach:'pour atteindre', topTier:'Vous avez atteint notre niveau maximum — VIP.',
      noAccount:'Nous n’avons pas trouvé de compte Rewards avec ce numéro. Vérifiez-le ou contactez-nous sur WhatsApp.',
      enterPhone:'Entrez votre numéro de téléphone.',
      settingUp:'Création de votre compte…', secureRedirect:'Configuration de votre abonnement — redirection vers le paiement sécurisé…',
      welcome:'Bienvenue', welcomeBack:'Bon retour', memberNo:'N° membre',
      saveNumber:'Conservez ce numéro — vous en aurez besoin pour consulter vos rewards.',
      existingAccount:'Nous avons trouvé votre compte Rewards existant. Votre niveau actuel est',
      viewArrow:'Voir mes rewards →', date:'Date', type:'Type', amount:'Montant', points:'Points', receipt:'Reçu'
    },
    es: {
      main:'← Sitio principal', careers:'Empleo', eyebrow:'Lueri Rewards',
      title:'Gana en cada<br>entrega.',
      subtitle:'Unirse es gratis. Cada reserva genera puntos hacia Silver, Gold, Platinum y VIP — con entregas gratis, descuentos y prioridad. También puedes comprar directamente tu nivel abajo.',
      tierEyebrow:'Sube gratis — niveles según tu gasto',
      tierNote:'Tu nivel se calcula según tu gasto de los últimos 12 meses. Cada reserva genera puntos; después de unirte puedes consultar tu saldo en "My Rewards" y canjear puntos por vales de entrega.',
      buyEyebrow:'O cómpralo directamente', buyTitle:'Sin esperar — 1 año, al instante',
      freeStart:'¿Prefieres empezar sin una membresía de pago?', freeLink:'Unirse gratis',
      myRewards:'Mis Rewards', joinNow:'Unirse ahora',
      lookupIntro:'Introduce el número de teléfono con el que te registraste para ver tus puntos y nivel.',
      phone:'Número de teléfono', viewRewards:'Ver mis rewards',
      notMember:'¿Aún no eres miembro?', joinRewards:'Unirse a Lueri Rewards',
      currentTier:'Nivel actual', pointsBalance:'Saldo de puntos', benefits:'Tus beneficios',
      recent:'Actividad reciente', noTransactions:'Aún no hay transacciones.',
      lookupAnother:'Consultar otro número',
      signing:'Te estás registrando para', fullName:'Nombre completo', email:'Correo electrónico (opcional)',
      create:'Crear mi cuenta Rewards',
      disclosureTitle:'Cómo funciona actualmente:',
      disclosure:'Lueri Rewards está en una fase inicial de lanzamiento. Tu membresía se guarda de forma centralizada, por lo que puedes consultar tu cuenta desde cualquier teléfono o navegador con tu número registrado. Los puntos todavía no se publican automáticamente: después de una entrega, envíanos tu número registrado por WhatsApp y nuestro equipo registrará la transacción.',
      startingTier:'Nivel inicial', annualSpend:'gasto anual', perYear:'al año', choose:'Elegir',
      everything:'Todo lo incluido en', more:'más', reach:'para alcanzar', topTier:'Has alcanzado nuestro nivel máximo — VIP.',
      noAccount:'No encontramos una cuenta de Rewards con ese número. Comprueba el número o escríbenos por WhatsApp.',
      enterPhone:'Introduce tu número de teléfono.',
      settingUp:'Configurando tu cuenta…', secureRedirect:'Configurando tu membresía — redirigiendo al pago seguro…',
      welcome:'Bienvenido', welcomeBack:'Bienvenido de nuevo', memberNo:'N.º de miembro',
      saveNumber:'Guarda este número — lo necesitarás para consultar tus rewards.',
      existingAccount:'Encontramos tu cuenta Rewards existente. Tu nivel actual es',
      viewArrow:'Ver mis rewards →', date:'Fecha', type:'Tipo', amount:'Importe', points:'Puntos', receipt:'Recibo'
    },
    ar: {
      main:'← الموقع الرئيسي', careers:'الوظائف', eyebrow:'Lueri Rewards',
      title:'اكسب مع كل<br>عملية توصيل.',
      subtitle:'الانضمام مجاني. كل حجز يمنحك نقاطاً نحو Bronze وSilver وGold وPlatinum وVIP، مع توصيلات مجانية وخصومات وأولوية. ويمكنك أيضاً شراء المستوى مباشرة أدناه.',
      tierEyebrow:'ارتقِ مجاناً — المستويات حسب الإنفاق',
      tierNote:'يعتمد مستواك على إنفاقك خلال آخر 12 شهراً. تكسب نقاطاً مع كل حجز؛ وبعد الانضمام يمكنك رؤية رصيدك في "My Rewards" واستبدال النقاط بقسائم توصيل.',
      buyEyebrow:'أو اشترِ العضوية مباشرة', buyTitle:'بدون انتظار — سنة واحدة، فوراً',
      freeStart:'تفضل البدء بدون عضوية مدفوعة؟', freeLink:'انضم مجاناً',
      myRewards:'مكافآتي', joinNow:'انضم الآن',
      lookupIntro:'أدخل رقم الهاتف الذي سجلت به لعرض نقاطك ومستواك.',
      phone:'رقم الهاتف', viewRewards:'عرض مكافآتي',
      notMember:'لست عضواً بعد؟', joinRewards:'انضم إلى Lueri Rewards',
      currentTier:'المستوى الحالي', pointsBalance:'رصيد النقاط', benefits:'مزاياك',
      recent:'النشاط الأخير', noTransactions:'لا توجد معاملات حتى الآن.',
      lookupAnother:'البحث عن رقم آخر',
      signing:'أنت تسجل في', fullName:'الاسم الكامل', email:'البريد الإلكتروني (اختياري)',
      create:'إنشاء حساب Rewards',
      disclosureTitle:'كيف يعمل البرنامج حالياً:',
      disclosure:'Lueri Rewards في مرحلة الإطلاق الأولى. يتم حفظ عضويتك مركزياً، ويمكنك الوصول إلى حسابك من أي هاتف أو متصفح باستخدام رقمك المسجل. لا تُضاف النقاط تلقائياً بعد؛ بعد التوصيل أرسل رقمك المسجل عبر WhatsApp وسيسجل فريقنا المعاملة.',
      startingTier:'المستوى الابتدائي', annualSpend:'الإنفاق السنوي', perYear:'سنوياً', choose:'اختر',
      everything:'كل ما في', more:'المتبقي', reach:'للوصول إلى', topTier:'لقد وصلت إلى أعلى مستوى لدينا — VIP.',
      noAccount:'لم نعثر على حساب Rewards بهذا الرقم. تحقق من الرقم أو تواصل معنا عبر WhatsApp.',
      enterPhone:'أدخل رقم هاتفك.',
      settingUp:'جارٍ إعداد حسابك…', secureRedirect:'جارٍ إعداد عضويتك — سيتم تحويلك إلى الدفع الآمن…',
      welcome:'مرحباً', welcomeBack:'مرحباً بعودتك', memberNo:'رقم العضوية',
      saveNumber:'احفظ هذا الرقم — ستحتاج إليه لعرض مكافآتك.',
      existingAccount:'وجدنا حساب Rewards موجوداً لك. مستواك الحالي هو',
      viewArrow:'عرض مكافآتي ←', date:'التاريخ', type:'النوع', amount:'المبلغ', points:'النقاط', receipt:'الإيصال'
    },
    pt: {
      main:'← Site principal', careers:'Carreiras', eyebrow:'Lueri Rewards',
      title:'Ganhe em cada<br>entrega.',
      subtitle:'A adesão é gratuita. Cada reserva gera pontos para Silver, Gold, Platinum e VIP — desbloqueando entregas gratuitas, descontos e prioridade. Também pode comprar diretamente o seu nível abaixo.',
      tierEyebrow:'Suba gratuitamente — níveis por gasto',
      tierNote:'O seu nível é calculado com base no gasto dos últimos 12 meses. Cada reserva gera pontos; depois de aderir, consulte o seu saldo em "My Rewards" e troque pontos por vouchers de entrega.',
      buyEyebrow:'Ou compre diretamente', buyTitle:'Sem esperar — 1 ano, imediatamente',
      freeStart:'Prefere começar sem uma adesão paga?', freeLink:'Aderir gratuitamente',
      myRewards:'Os meus Rewards', joinNow:'Aderir agora',
      lookupIntro:'Introduza o número de telefone usado no registo para consultar os seus pontos e nível.',
      phone:'Número de telefone', viewRewards:'Ver os meus rewards',
      notMember:'Ainda não é membro?', joinRewards:'Aderir ao Lueri Rewards',
      currentTier:'Nível atual', pointsBalance:'Saldo de pontos', benefits:'Os seus benefícios',
      recent:'Atividade recente', noTransactions:'Ainda não existem transações.',
      lookupAnother:'Consultar outro número',
      signing:'Está a aderir a', fullName:'Nome completo', email:'E-mail (opcional)',
      create:'Criar a minha conta Rewards',
      disclosureTitle:'Como funciona neste momento:',
      disclosure:'O Lueri Rewards está numa fase inicial de lançamento. A sua adesão é guardada centralmente, por isso pode consultar a conta em qualquer telefone ou navegador usando o número registado. Os pontos ainda não são lançados automaticamente — depois de uma entrega, envie-nos o número registado pelo WhatsApp e a nossa equipa registará a transação.',
      startingTier:'Nível inicial', annualSpend:'gasto anual', perYear:'por ano', choose:'Escolher',
      everything:'Tudo o que inclui', more:'mais', reach:'para chegar a', topTier:'Atingiu o nosso nível máximo — VIP.',
      noAccount:'Não encontrámos uma conta Rewards com esse número. Confirme o número ou contacte-nos pelo WhatsApp.',
      enterPhone:'Introduza o seu número de telefone.',
      settingUp:'A preparar a sua conta…', secureRedirect:'A preparar a sua adesão — a redirecionar para o pagamento seguro…',
      welcome:'Bem-vindo', welcomeBack:'Bem-vindo novamente', memberNo:'N.º de membro',
      saveNumber:'Guarde este número — será necessário para consultar os seus rewards.',
      existingAccount:'Encontrámos a sua conta Rewards existente. O seu nível atual é',
      viewArrow:'Ver os meus rewards →', date:'Data', type:'Tipo', amount:'Valor', points:'Pontos', receipt:'Recibo'
    }
  };

  const BENEFITS = {
    en: {
      'Everything in Bronze':'Everything in Bronze','Everything in Silver':'Everything in Silver','Everything in Gold':'Everything in Gold','Everything in Platinum':'Everything in Platinum',
      '1 point per KES 50 spent':'1 point per KES 50 spent','Standard delivery rates':'Standard delivery rates','Birthday bonus points':'Birthday bonus points','Access to seasonal promotions':'Access to seasonal promotions',
      '5% off priority same-day bookings':'5% off priority same-day bookings','KES 200 free delivery credit monthly':'KES 200 free delivery credit monthly','Faster WhatsApp response time':'Faster WhatsApp response time',
      '10% off priority same-day bookings':'10% off priority same-day bookings','1 free standard delivery every month':'1 free standard delivery every month','Dedicated dispatcher line':'Dedicated dispatcher line',
      '15% off priority same-day bookings':'15% off priority same-day bookings','2 free standard deliveries every month':'2 free standard deliveries every month','Priority dispatch queue during peak hours':'Priority dispatch queue during peak hours','Quarterly gift voucher':'Quarterly gift voucher',
      '20% off all bookings':'20% off all bookings','4 free standard deliveries every month':'4 free standard deliveries every month','Personal account manager':'Personal account manager','Early access to new services & promotions':'Early access to new services & promotions','Invitations to exclusive Lueri events':'Invitations to exclusive Lueri events'
    },
    zh: {
      'Everything in Bronze':'包含 Bronze 的全部权益','Everything in Silver':'包含 Silver 的全部权益','Everything in Gold':'包含 Gold 的全部权益','Everything in Platinum':'包含 Platinum 的全部权益',
      '1 point per KES 50 spent':'每消费 50 肯尼亚先令得 1 分','Standard delivery rates':'标准配送费率','Birthday bonus points':'生日奖励积分','Access to seasonal promotions':'享受季节性优惠',
      '5% off priority same-day bookings':'优先当日配送预订 95 折','KES 200 free delivery credit monthly':'每月 200 肯尼亚先令配送额度','Faster WhatsApp response time':'更快的 WhatsApp 响应',
      '10% off priority same-day bookings':'优先当日配送预订 9 折','1 free standard delivery every month':'每月 1 次免费标准配送','Dedicated dispatcher line':'专属调度服务',
      '15% off priority same-day bookings':'优先当日配送预订 85 折','2 free standard deliveries every month':'每月 2 次免费标准配送','Priority dispatch queue during peak hours':'高峰时段优先调度','Quarterly gift voucher':'季度礼券',
      '20% off all bookings':'所有预订 8 折','4 free standard deliveries every month':'每月 4 次免费标准配送','Personal account manager':'专属客户经理','Early access to new services & promotions':'优先体验新服务和优惠','Invitations to exclusive Lueri events':'Lueri 专属活动邀请'
    },
    sw: {
      'Everything in Bronze':'Kila kilicho kwenye Bronze','Everything in Silver':'Kila kilicho kwenye Silver','Everything in Gold':'Kila kilicho kwenye Gold','Everything in Platinum':'Kila kilicho kwenye Platinum',
      '1 point per KES 50 spent':'Pointi 1 kwa kila KES 50 unayotumia','Standard delivery rates':'Bei za kawaida za delivery','Birthday bonus points':'Pointi za bonasi za siku ya kuzaliwa','Access to seasonal promotions':'Fursa za promosheni za msimu',
      '5% off priority same-day bookings':'Punguzo la 5% kwa booking za siku hiyo zenye kipaumbele','KES 200 free delivery credit monthly':'Mkopo wa delivery wa KES 200 kila mwezi','Faster WhatsApp response time':'Majibu ya WhatsApp kwa haraka zaidi',
      '10% off priority same-day bookings':'Punguzo la 10% kwa booking za siku hiyo zenye kipaumbele','1 free standard delivery every month':'Delivery 1 ya kawaida bure kila mwezi','Dedicated dispatcher line':'Laini maalum ya dispatcher',
      '15% off priority same-day bookings':'Punguzo la 15% kwa booking za siku hiyo zenye kipaumbele','2 free standard deliveries every month':'Deliveries 2 za kawaida bure kila mwezi','Priority dispatch queue during peak hours':'Kipaumbele kwenye dispatch wakati wa peak','Quarterly gift voucher':'Voucher ya zawadi kila robo mwaka',
      '20% off all bookings':'Punguzo la 20% kwa booking zote','4 free standard deliveries every month':'Deliveries 4 za kawaida bure kila mwezi','Personal account manager':'Msimamizi binafsi wa akaunti','Early access to new services & promotions':'Ufikiaji wa mapema wa huduma na promosheni mpya','Invitations to exclusive Lueri events':'Mialiko ya matukio maalum ya Lueri'
    },
    fr: {
      'Everything in Bronze':'Tout ce qui est inclus dans Bronze','Everything in Silver':'Tout ce qui est inclus dans Silver','Everything in Gold':'Tout ce qui est inclus dans Gold','Everything in Platinum':'Tout ce qui est inclus dans Platinum',
      '1 point per KES 50 spent':'1 point par tranche de 50 KES dépensés','Standard delivery rates':'Tarifs de livraison standard','Birthday bonus points':'Points bonus d’anniversaire','Access to seasonal promotions':'Accès aux promotions saisonnières',
      '5% off priority same-day bookings':'5 % de réduction sur les réservations prioritaires le jour même','KES 200 free delivery credit monthly':'Crédit livraison gratuit de 200 KES par mois','Faster WhatsApp response time':'Réponse WhatsApp plus rapide',
      '10% off priority same-day bookings':'10 % de réduction sur les réservations prioritaires le jour même','1 free standard delivery every month':'1 livraison standard gratuite par mois','Dedicated dispatcher line':'Ligne de dispatcher dédiée',
      '15% off priority same-day bookings':'15 % de réduction sur les réservations prioritaires le jour même','2 free standard deliveries every month':'2 livraisons standard gratuites par mois','Priority dispatch queue during peak hours':'File de dispatch prioritaire aux heures de pointe','Quarterly gift voucher':'Bon cadeau trimestriel',
      '20% off all bookings':'20 % de réduction sur toutes les réservations','4 free standard deliveries every month':'4 livraisons standard gratuites par mois','Personal account manager':'Gestionnaire de compte dédié','Early access to new services & promotions':'Accès anticipé aux nouveaux services et promotions','Invitations to exclusive Lueri events':'Invitations aux événements exclusifs de Lueri'
    },
    es: {
      'Everything in Bronze':'Todo lo incluido en Bronze','Everything in Silver':'Todo lo incluido en Silver','Everything in Gold':'Todo lo incluido en Gold','Everything in Platinum':'Todo lo incluido en Platinum',
      '1 point per KES 50 spent':'1 punto por cada KES 50 gastados','Standard delivery rates':'Tarifas estándar de entrega','Birthday bonus points':'Puntos extra de cumpleaños','Access to seasonal promotions':'Acceso a promociones de temporada',
      '5% off priority same-day bookings':'5 % de descuento en reservas prioritarias del mismo día','KES 200 free delivery credit monthly':'Crédito de entrega gratis de KES 200 al mes','Faster WhatsApp response time':'Respuesta más rápida por WhatsApp',
      '10% off priority same-day bookings':'10 % de descuento en reservas prioritarias del mismo día','1 free standard delivery every month':'1 entrega estándar gratis cada mes','Dedicated dispatcher line':'Línea de dispatcher dedicada',
      '15% off priority same-day bookings':'15 % de descuento en reservas prioritarias del mismo día','2 free standard deliveries every month':'2 entregas estándar gratis cada mes','Priority dispatch queue during peak hours':'Cola de dispatch prioritaria en horas punta','Quarterly gift voucher':'Vale de regalo trimestral',
      '20% off all bookings':'20 % de descuento en todas las reservas','4 free standard deliveries every month':'4 entregas estándar gratis cada mes','Personal account manager':'Gestor de cuenta personal','Early access to new services & promotions':'Acceso anticipado a nuevos servicios y promociones','Invitations to exclusive Lueri events':'Invitaciones a eventos exclusivos de Lueri'
    },
    ar: {
      'Everything in Bronze':'كل مزايا Bronze','Everything in Silver':'كل مزايا Silver','Everything in Gold':'كل مزايا Gold','Everything in Platinum':'كل مزايا Platinum',
      '1 point per KES 50 spent':'نقطة واحدة لكل 50 شلن كيني يتم إنفاقها','Standard delivery rates':'أسعار التوصيل القياسية','Birthday bonus points':'نقاط إضافية بمناسبة عيد الميلاد','Access to seasonal promotions':'الوصول إلى العروض الموسمية',
      '5% off priority same-day bookings':'خصم 5٪ على حجوزات التوصيل ذات الأولوية في اليوم نفسه','KES 200 free delivery credit monthly':'رصيد توصيل مجاني بقيمة 200 شلن كيني شهرياً','Faster WhatsApp response time':'استجابة أسرع عبر WhatsApp',
      '10% off priority same-day bookings':'خصم 10٪ على الحجوزات ذات الأولوية في اليوم نفسه','1 free standard delivery every month':'توصيلة قياسية مجانية كل شهر','Dedicated dispatcher line':'خط مخصص لمنسق التوصيل',
      '15% off priority same-day bookings':'خصم 15٪ على الحجوزات ذات الأولوية في اليوم نفسه','2 free standard deliveries every month':'توصيلتان قياسيتان مجاناً كل شهر','Priority dispatch queue during peak hours':'أولوية في قائمة التوصيل خلال أوقات الذروة','Quarterly gift voucher':'قسيمة هدية ربع سنوية',
      '20% off all bookings':'خصم 20٪ على جميع الحجوزات','4 free standard deliveries every month':'4 توصيلات قياسية مجانية كل شهر','Personal account manager':'مدير حساب شخصي','Early access to new services & promotions':'وصول مبكر إلى الخدمات والعروض الجديدة','Invitations to exclusive Lueri events':'دعوات إلى فعاليات Lueri الحصرية'
    },
    pt: {
      'Everything in Bronze':'Tudo o que inclui Bronze','Everything in Silver':'Tudo o que inclui Silver','Everything in Gold':'Tudo o que inclui Gold','Everything in Platinum':'Tudo o que inclui Platinum',
      '1 point per KES 50 spent':'1 ponto por cada KES 50 gastos','Standard delivery rates':'Tarifas de entrega standard','Birthday bonus points':'Pontos bónus de aniversário','Access to seasonal promotions':'Acesso a promoções sazonais',
      '5% off priority same-day bookings':'5% de desconto em reservas prioritárias no próprio dia','KES 200 free delivery credit monthly':'Crédito de entrega gratuito de KES 200 por mês','Faster WhatsApp response time':'Resposta mais rápida no WhatsApp',
      '10% off priority same-day bookings':'10% de desconto em reservas prioritárias no próprio dia','1 free standard delivery every month':'1 entrega standard gratuita por mês','Dedicated dispatcher line':'Linha dedicada do dispatcher',
      '15% off priority same-day bookings':'15% de desconto em reservas prioritárias no próprio dia','2 free standard deliveries every month':'2 entregas standard gratuitas por mês','Priority dispatch queue during peak hours':'Fila de dispatch prioritária nas horas de maior movimento','Quarterly gift voucher':'Voucher de oferta trimestral',
      '20% off all bookings':'20% de desconto em todas as reservas','4 free standard deliveries every month':'4 entregas standard gratuitas por mês','Personal account manager':'Gestor de conta pessoal','Early access to new services & promotions':'Acesso antecipado a novos serviços e promoções','Invitations to exclusive Lueri events':'Convites para eventos exclusivos da Lueri'
    }
  };

  let locale = 'en';

  function safeLocale(value) {
    return LANGS.includes(value) ? value : 'en';
  }

  function getLocale() {
    const params = new URLSearchParams(location.search);
    const query = params.get('lang');
    if (query && LANGS.includes(query)) {
      try { localStorage.setItem(KEY, query); } catch (_) {}
      return query;
    }
    try {
      const stored = localStorage.getItem(KEY);
      if (LANGS.includes(stored)) return stored;
    } catch (_) {}
    return 'en';
  }

  function setQueryLocale(next) {
    const url = new URL(location.href);
    url.searchParams.set('lang', next);
    history.replaceState({}, '', url.pathname + '?' + url.searchParams.toString() + url.hash);
  }

  function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el && value != null) el.textContent = value;
  }

  function setHTML(selector, value) {
    const el = document.querySelector(selector);
    if (el && value != null) el.innerHTML = value;
  }

  function translateStatic() {
    const t = T[locale];
    const backs=document.querySelectorAll('.back-link'); if(backs[0]) backs[0].textContent=t.main; if(backs[1]) backs[1].textContent=t.careers;
    setText('main .eyebrow-mono', t.eyebrow);
    setHTML('h1.title', t.title);
    setText('.subtitle', t.subtitle);
    setText('#tierExplainer > .eyebrow-mono', t.tierEyebrow);
    setText('.tier-note', t.tierNote);
    setText('#purchaseSection .eyebrow-mono', t.buyEyebrow);
    setText('#purchaseSection h2', t.buyTitle);
    const freeWrap=document.querySelector('#purchaseSection > .switch-link'); if(freeWrap){ freeWrap.childNodes[0].textContent=t.freeStart+' '; }
    const freeLink = document.getElementById('joinFreeLink'); if (freeLink) freeLink.textContent = t.freeLink;
    const tabs = document.querySelectorAll('#tabBar .tab-btn'); if (tabs[0]) tabs[0].textContent=t.myRewards; if (tabs[1]) tabs[1].textContent=t.joinNow;
    setText('#lookupForm > p', t.lookupIntro);
    setText('label[for="lookupPhone"]', t.phone);
    setText('#lookupBtn', t.viewRewards);
    const lookupSwitch = document.querySelector('#lookupForm .switch-link'); if (lookupSwitch) { lookupSwitch.childNodes[0].textContent = t.notMember + ' '; const a=lookupSwitch.querySelector('a'); if(a)a.textContent=t.joinRewards; }
    setText('#memberCard .points-label', t.currentTier);
    setText('#memberCard > div:nth-of-type(1) > div:nth-of-type(2) .points-label', t.pointsBalance);
    setText('#memberCard h3:nth-of-type(1)', t.benefits);
    setText('#memberCard h3:nth-of-type(2)', t.recent);
    setText('#lookupAnother', t.lookupAnother);
    setText('#view-join .pb-label', t.signing);
    setText('label[for="joinName"]', t.fullName);
    setText('label[for="joinPhone"]', t.phone);
    setText('label[for="joinEmail"]', t.email);
    setText('#joinBtn', t.create);
    const disclosure = document.querySelector('.disclosure');
    if (disclosure) {
      disclosure.innerHTML = '<strong style="color:var(--ink);"></strong> ' + t.disclosure;
      disclosure.querySelector('strong').textContent = t.disclosureTitle;
    }
    const selector = document.getElementById('languageSelector');
    if (selector) selector.value = locale;
  }

  function originalText(el) {
    if (!el) return '';
    if (!el.dataset.lueriOriginal) el.dataset.lueriOriginal = el.textContent.trim();
    return el.dataset.lueriOriginal;
  }

  function translateDynamic(root=document) {
    const t = T[locale];
    const benefitMap = BENEFITS[locale] || BENEFITS.en;
    root.querySelectorAll('.tier-explain-card').forEach(card => {
      const spend = card.querySelector('.tspend');
      if (spend) {
        const raw = originalText(spend);
        const m = raw.match(/^KES\s+([\d,]+)\+\s+annual spend$/);
        if (m) spend.textContent = 'KES ' + m[1] + '+ ' + t.annualSpend;
        else if (raw === 'Starting tier') spend.textContent = t.startingTier;
      }
      card.querySelectorAll('li').forEach(li => {
        const raw = originalText(li);
        if (benefitMap[raw]) li.textContent = benefitMap[raw];
      });
    });

    root.querySelectorAll('.purchase-card').forEach(card => {
      const period = card.querySelector('.tperiod'); if (period) period.textContent=t.perYear;
      const name = card.querySelector('.tname')?.textContent?.trim();
      const button = card.querySelector('[data-choose]');
      if (button && name) {
        const tier = button.dataset.choose ? button.dataset.choose.charAt(0).toUpperCase()+button.dataset.choose.slice(1) : name;
        const localizedName = name;
        button.textContent = t.choose + ' ' + localizedName;
      }
      card.querySelectorAll('li').forEach(li => {
        const raw=originalText(li);
        if(benefitMap[raw]) li.textContent=benefitMap[raw];
      });
    });

    const plan = document.getElementById('planBannerTier');
    if (plan) {
      const raw=originalText(plan);
      const m=raw.match(/^(.+?)\s+—\s+KES\s+([\d,]+)\/year$/);
      if(m) plan.textContent=m[1]+' — KES '+m[2]+'/'+t.perYear;
    }

    const progress=document.getElementById('mProgressNote');
    if(progress) {
      const raw=originalText(progress);
      const m=raw.match(/^KES\s+([\d,]+)\s+more\s+\(in the last 12 months\)\s+to reach\s+(.+)$/);
      if(m) progress.textContent='KES '+m[1]+' '+t.more+' '+t.reach+' '+m[2];
      else if(raw === "You've reached our top tier — VIP.") progress.textContent=t.topTier;
    }

    const txWrap=document.getElementById('mTxWrap');
    if(txWrap){
      const empty=txWrap.querySelector('.empty-note');
      if(empty && originalText(empty)==='No transactions yet.') empty.textContent=t.noTransactions;
      txWrap.querySelectorAll('th').forEach(th => {
        const map={Date:t.date,Type:t.type,Amount:t.amount,Points:t.points};
        const raw=originalText(th); if(map[raw]) th.textContent=map[raw];
      });
      txWrap.querySelectorAll('.receipt-link').forEach(b=>b.textContent=t.receipt);
    }
  }

  function apply(next, updateUrl=true) {
    locale=safeLocale(next);
    document.documentElement.lang=locale==='zh'?'zh-CN':locale;
    document.documentElement.dir=locale==='ar'?'rtl':'ltr';
    try { localStorage.setItem(KEY, locale); } catch (_) {}
    if(updateUrl) setQueryLocale(locale);
    translateStatic();
    translateDynamic();
  }

  function installSelector() {
    const selector=document.getElementById('languageSelector');
    if(!selector || selector.dataset.wired==='true') return;
    selector.innerHTML=LANGS.map(code => '<option value="'+code+'">'+NAMES[code]+'</option>').join('');
    selector.value=locale;
    selector.dataset.wired='true';
    selector.addEventListener('change', () => apply(selector.value, true));
  }

  function boot() {
    locale=getLocale();
    installSelector();
    apply(locale, false);
    const observer=new MutationObserver(mutations => {
      let relevant=false;
      mutations.forEach(m => { if(m.addedNodes && m.addedNodes.length) relevant=true; });
      if(relevant) translateDynamic();
    });
    observer.observe(document.body,{subtree:true,childList:true});
  }

  window.LueriRewardsI18n = {
    setLanguage: (next) => apply(next, true),
    refresh: () => { translateStatic(); translateDynamic(); }
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
