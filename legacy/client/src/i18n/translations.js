// Marketing landing page (src/components/landing). French is the source copy.
// Status chips: "available" ships in the app today, "soon" is planned — never
// mark a planned feature as available.
const landingFr = {
  nav: {
    features: 'Fonctionnalités',
    solutions: 'Solutions',
    pricing: 'Tarifs',
    demo: 'Démonstration',
    realEstate: 'Immobilier',
    trades: 'BTP & artisans',
    freeDemo: 'Démo gratuite',
    freeDemoLong: 'Réserver une démo gratuite',
    contact: 'Contact',
    login: 'Connexion',
    signup: 'Inscription',
    home: 'Pratonna — accueil',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    menu: 'Menu',
    switchLang: 'Changer de langue',
  },
  status: { available: 'Disponible', soon: 'Bientôt' },
  meta: {
    title: 'Pratonna — Moins d’administratif, plus de temps pour l’essentiel',
    description:
      'Pratonna trie vos demandes, prépare vos devis, relance vos impayés et suit vos dossiers. Pour l’immobilier, le BTP et toutes les PME. Démo et test pilote gratuits.',
  },
  sectorSwitch: {
    label: 'Votre activité',
    realEstate: 'Immobilier',
    others: 'Autres activités',
    reEyebrow: 'Immobilier',
    reTitle: 'Copropriété et gestion locative, enfin à jour.',
    reSub: 'Syndics, gestionnaires et agences indépendantes : Pratonna prend en charge l’administratif, vous gardez la décision.',
    reCta: 'Tout voir pour l’immobilier',
    othersCta: 'BTP, artisans et équipes terrain',
  },
  video: {
    eyebrow: 'La démo en 1 minute',
    title: 'Voyez Pratonna au travail.',
    sub: 'De vraies captures de l’application : la copropriété, puis la gestion locative.',
    label: 'Démonstration de Pratonna en 1 minute',
    caption: 'Vidéo commentée et sous-titrée · 1 minute',
  },
  realEstate: {
    parts: [
      {
        title: 'Gestion de copropriété',
        items: [
          {
            text: 'Fuite signalée : l’urgence est repérée et vous missionnez l’intervenant sous contrat en un clic',
            status: 'available',
          },
          {
            text: 'Ordres de service générés avec la comptabilité intégrée : fonds vérifiés, visa comptable, signature en ligne',
            status: 'available',
          },
          { text: 'Compte rendu d’AG rédigé à partir de vos notes ou d’un enregistrement', status: 'available' },
          { text: 'PV d’assemblée générale au format officiel', status: 'soon' },
          { text: 'État daté et pré-état daté édités en quelques clics', status: 'soon' },
        ],
      },
      {
        title: 'Gestion locative',
        items: [
          { text: 'Relances des impayés préparées, envoyées après votre accord', status: 'available' },
          { text: 'Paiements des propriétaires suivis facture par facture, avec rappels', status: 'available' },
          { text: 'Appels de charges', status: 'soon' },
          { text: 'Baux et documents de location', status: 'soon' },
          { text: 'États des lieux d’entrée et de sortie', status: 'soon' },
        ],
      },
    ],
  },
  pages: {
    immobilier: {
      meta: {
        title: 'Pratonna pour l’immobilier — syndics, gestion locative, agences',
        description:
          'Copropriété et gestion locative : fuites, ordres de service, comptes rendus d’AG, relances d’impayés et paiements suivis. Démo et test pilote gratuits, sans engagement.',
      },
      video: true,
      sector: 'Agence immobilière',
      eyebrow: 'Agences indépendantes · Syndics · Gestionnaires',
      title: 'L’immobilier, sans la paperasse.',
      sub: 'Pratonna prépare vos documents, relance à votre place et suit chaque dossier de copropriété ou de location. Vous validez, Pratonna s’en occupe.',
      partsEyebrow: 'Fonctionnalités',
      partsTitle: 'Ce que Pratonna fait pour vous.',
      partsSub: 'Ce qui fonctionne aujourd’hui, et ce qui arrive bientôt : nous le disons clairement.',
      benefitsTitle: 'Pour les agences indépendantes.',
      benefits: [
        {
          icon: 'clock',
          title: 'Du temps rendu',
          text: 'Moins de saisie, de copier-coller et de relances à la main : vos journées vont à vos clients.',
        },
        {
          icon: 'bell',
          title: 'Aucune relance oubliée',
          text: 'Impayés, rappels, actions votées en AG : chaque échéance est suivie et vous êtes prévenu.',
        },
        {
          icon: 'users',
          title: 'Des clients mieux informés',
          text: 'Copropriétaires et propriétaires suivent leurs demandes, devis et factures dans leur espace.',
        },
      ],
    },
    btp: {
      meta: {
        title: 'Pratonna pour le BTP — rénovation, artisans, équipes terrain',
        description:
          'Demandes classées par urgence, constats et photos depuis le chantier, devis signés en ligne, interventions planifiées et factures relancées. Démo et test pilote gratuits.',
      },
      video: false,
      sector: 'Entreprise BTP',
      eyebrow: 'Entreprises de rénovation · Artisans · Équipes terrain',
      title: 'Vos chantiers suivis, de la demande à la facture.',
      sub: 'Pratonna trie les demandes, prépare vos devis, planifie vos équipes et relance vos factures. Vous gardez la main sur chaque décision.',
      partsEyebrow: 'Fonctionnalités',
      partsTitle: 'Ce que Pratonna fait pour vous.',
      partsSub: 'Ce qui fonctionne aujourd’hui, et ce qui arrive bientôt : nous le disons clairement.',
      parts: [
        {
          title: 'Au bureau',
          items: [
            { text: 'Demandes clients classées par urgence', status: 'available' },
            { text: 'Devis chiffrés, validés puis signés en ligne', status: 'available' },
            { text: 'Ordres de service et suivi des paiements', status: 'available' },
            { text: 'Factures et relances sans ressaisie', status: 'available' },
            { text: 'Synchronisation Gmail et Outlook', status: 'soon' },
          ],
        },
        {
          title: 'Sur le terrain',
          items: [
            { text: 'Interventions du jour sur le téléphone', status: 'available' },
            { text: 'Constat et photos envoyés depuis le chantier', status: 'available' },
            { text: 'Équipes affectées selon leur disponibilité et leur position', status: 'available' },
            { text: 'Comptes rendus de réunion de chantier', status: 'available' },
            { text: 'Agendas Google et Outlook synchronisés', status: 'soon' },
          ],
        },
      ],
      benefitsTitle: 'Pour les entreprises du bâtiment.',
      benefits: [
        {
          icon: 'clock',
          title: 'Moins de temps au bureau',
          text: 'Devis, factures et relances sont préparés pour vous : vous validez en un clic.',
        },
        {
          icon: 'check',
          title: 'Des chantiers plus clairs',
          text: 'Chaque intervention a son statut, ses photos et son historique, du premier appel à la facture.',
        },
        {
          icon: 'bell',
          title: 'Aucun suivi oublié',
          text: 'Relances clients et rappels internes partent au bon moment, après votre accord.',
        },
      ],
    },
  },
  trust: {
    title: 'Conçu pour tous les entrepreneurs, quel que soit votre métier',
    items: [
      'Commerçant',
      'Créateur de contenu',
      'Indépendant & freelance',
      'Profession libérale',
      'Agence immobilière',
      'Syndic de copropriété',
      'Promoteur',
      'Entreprise BTP',
      'Artisan',
      'Gestionnaire de patrimoine',
    ],
  },
  problem: {
    eyebrow: 'Le constat',
    title: 'Moins de dispersion, plus de clarté.',
    sub: 'Votre métier mérite mieux qu’une boîte mail qui déborde.',
    beforeTitle: 'Aujourd’hui',
    before: [
      'E-mails en retard, clients qui attendent',
      'Devis perdus entre deux fichiers',
      'Relances oubliées, factures impayées',
      'Dossiers éparpillés entre outils et classeurs',
    ],
    afterTitle: 'Avec Pratonna',
    afterLead: 'Une collaboratrice qui trie, prépare, relance et suit — vous gardez la décision.',
    after: [
      'Les demandes entrantes classées par urgence',
      'Devis et réponses préparés pour vous',
      'Relances envoyées au bon moment, après votre accord',
      'Chaque dossier suivi du premier contact à la facture',
    ],
  },
  how: {
    eyebrow: 'Comment ça marche',
    title: 'Quatre étapes, et votre journée s’allège.',
    sub: 'Pas de projet informatique : Pratonna s’adapte à vous, pas l’inverse.',
    steps: [
      {
        title: 'Créez votre espace',
        text: 'Invitez votre équipe et vos clients : chacun a son accès, selon son rôle.',
      },
      {
        title: 'Centralisez vos dossiers',
        text: 'Signalements, devis, interventions et factures au même endroit, à jour en temps réel.',
      },
      {
        title: 'Déléguez en langage courant',
        text: '« Relance M. Martin pour la facture 2041 » : vous formulez, comme à un collègue.',
      },
      {
        title: 'Validez, Pratonna exécute',
        text: 'Chaque action vous est soumise. Un clic, et c’est fait, tracé et archivé.',
      },
    ],
  },
  features: {
    eyebrow: 'Fonctionnalités',
    title: 'Ce que Pratonna fait pour vous',
    sub: 'Ce qui fonctionne aujourd’hui, et ce qui arrive prochainement.',
    items: [
      {
        title: 'Dossiers & interventions',
        status: 'available',
        points: [
          'Du signalement à la facture, chaque étape suivie',
          'Photos, rapports et échanges au même endroit',
          'Historique horodaté de chaque action',
        ],
      },
      {
        title: 'CRM & contacts',
        status: 'available',
        points: [
          'Clients, techniciens et partenaires centralisés',
          'Historique des échanges par dossier',
          'Annuaire partagé avec votre équipe',
        ],
      },
      {
        title: 'Tâches & rappels',
        status: 'available',
        points: [
          'Rappels de rendez-vous, d’appels et de relances',
          'Notifications triées par priorité',
          'Moins d’oublis, plus de suivi',
        ],
      },
      {
        title: 'Documents & signature',
        status: 'available',
        points: [
          'Devis chiffrés ligne par ligne, en PDF',
          'Signature électronique avec DocuSign',
          'Factures suivies jusqu’au paiement',
        ],
      },
      {
        title: 'Votre assistante IA',
        status: 'available',
        points: [
          'Posez vos questions en langage courant',
          'Elle prépare, vous validez en un clic',
          'Nom, ton et règles à votre image',
        ],
      },
      {
        title: 'Assistante vocale',
        status: 'available',
        points: [
          'Parlez-lui depuis le chantier, mains libres',
          'Elle vous répond à voix haute, en français',
          'Les mêmes validations qu’à l’écrit',
        ],
      },
      {
        title: 'E-mails Gmail & Outlook',
        status: 'soon',
        points: [
          'Synchronisation de votre boîte de réception',
          'Réponses préparées pour validation',
          'Relance des messages restés sans réponse',
        ],
      },
      {
        title: 'Comptabilité',
        status: 'soon',
        points: [
          'Suivi financier en continu',
          'Exports pour votre expert-comptable',
          'Ordres de service validés par le comptable',
        ],
      },
      {
        title: 'Studio vidéo',
        status: 'soon',
        points: [
          'Visuels de vos biens générés par l’IA',
          'Retouche de photos de chantier',
          'Vidéos de présentation',
        ],
      },
    ],
  },
  integrations: {
    eyebrow: 'Intégrations',
    title: 'Ce qui fonctionne aujourd’hui.',
    sub: 'Nous n’affichons que ce que vous pouvez utiliser dès maintenant.',
    items: [
      { name: 'Données sécurisées', detail: 'Hébergement Supabase, accès par rôle', status: 'available', icon: 'database' },
      { name: 'Documents PDF', detail: 'Devis prêts à envoyer', status: 'available', icon: 'file' },
      { name: 'DocuSign', detail: 'Signature électronique', status: 'available', icon: 'sign' },
      { name: 'Gmail', detail: 'Synchronisation des e-mails', status: 'soon', icon: 'mail' },
      { name: 'Outlook', detail: 'Synchronisation des e-mails', status: 'soon', icon: 'mail' },
      { name: 'Agendas', detail: 'Google Agenda & Outlook', status: 'soon', icon: 'calendar' },
    ],
  },
  usecases: {
    eyebrow: 'Cas d’usage',
    title: 'Ce qui prenait une matinée, en quelques clics.',
    sub: 'Moins de relances à la main, moins d’oublis, plus de temps pour vos clients.',
    tabsLabel: 'Exemples de cas d’usage',
    done: 'Terminé',
    tabs: [
      {
        label: 'Du signalement à l’intervention',
        steps: ['Signalement reçu', 'Technicien affecté', 'Devis validé', 'Intervention planifiée'],
        result: 'Intervention planifiée',
        text: 'Un copropriétaire signale une fuite. Pratonna classe la demande par urgence, vous propose un technicien, prépare le devis pour validation puis planifie l’intervention — vous gardez la main à chaque étape.',
      },
      {
        label: 'Devis signé en ligne',
        steps: ['Constat sur place', 'Devis chiffré', 'Validation interne', 'Signature du client'],
        result: 'Devis signé',
        text: 'Le technicien saisit son constat depuis le chantier. Le devis est chiffré ligne par ligne, validé par le gérant, puis envoyé au client qui le signe en ligne avec DocuSign.',
      },
      {
        label: 'Relance de facture',
        steps: ['Échéance détectée', 'Relance rédigée', 'Validation en un clic', 'Suivi du paiement'],
        result: 'Relance envoyée, paiement suivi',
        text: 'Une facture arrive à échéance ? Pratonna le repère, rédige une relance courtoise, attend votre feu vert, puis suit le paiement et vous prévient dès qu’il est reçu.',
      },
    ],
  },
  industries: {
    eyebrow: 'Solutions',
    title: 'Pensé pour votre métier.',
    sub: 'La même collaboratrice, au service des réalités de votre secteur.',
    prev: 'Secteur précédent',
    next: 'Secteur suivant',
    goTo: 'Aller au secteur',
    items: [
      {
        title: 'Commerce',
        tag: 'Clients · commandes',
        points: [
          'Demandes clients et commandes centralisées',
          'Devis et factures préparés pour vous',
          'Paiements suivis jusqu’à l’encaissement',
        ],
      },
      {
        title: 'Créateurs de contenu',
        tag: 'Partenariats · contrats',
        points: [
          'Demandes de partenariat triées, réponses préparées',
          'Devis et contrats signés en ligne',
          'Factures suivies, relances au bon moment',
        ],
      },
      {
        title: 'Indépendants & professions libérales',
        tag: 'Rendez-vous · relances',
        points: [
          'Agenda et rendez-vous organisés',
          'Demandes clients classées par urgence',
          'Factures et relances sans ressaisie',
        ],
      },
      {
        title: 'Immobilier',
        tag: 'CRM · visites',
        points: [
          'Fichier acquéreurs et vendeurs toujours à jour',
          'Visites planifiées, comptes rendus classés',
          'Relances acquéreurs au bon moment',
        ],
      },
      {
        title: 'Gestion locative & syndic',
        tag: 'Demandes · charges',
        points: [
          'Demandes des locataires et copropriétaires triées',
          'Interventions suivies jusqu’à la facture',
          'Appels de charges et relances suivis',
        ],
      },
      {
        title: 'Construction',
        tag: 'Chantiers · devis',
        points: [
          'Constats de chantier transformés en devis',
          'Équipes affectées, interventions planifiées',
          'Devis validés puis signés en ligne',
        ],
      },
      {
        title: 'Architecture',
        tag: 'Plans · validations',
        points: [
          'Plans et versions partagés aux bons interlocuteurs',
          'Validations client tracées et horodatées',
          'Échéances de dépôt rappelées à temps',
        ],
      },
      {
        title: 'Artisans',
        tag: 'Interventions · factures',
        points: [
          'Interventions du jour sur votre téléphone',
          'Rapport et photos envoyés depuis le chantier',
          'Factures et relances sans ressaisie',
        ],
      },
    ],
  },
  screens: {
    eyebrow: 'Interface',
    title: 'Découvrez l’interface.',
    sub: 'De vraies captures de l’application, telles que vos équipes la voient.',
    prev: 'Capture précédente',
    next: 'Capture suivante',
    goTo: 'Afficher la capture',
    cta: 'Réserver une démo gratuite',
    items: [
      { src: '/screens/manager-dashboard.webp', title: 'Tableau de bord du gestionnaire', text: 'Priorités du jour, dossiers à affecter et devis à valider.' },
      { src: '/screens/case-detail.webp', title: 'Détail d’un dossier', text: 'Chronologie, photos, devis et échanges au même endroit.' },
      { src: '/screens/technician-report.webp', title: 'Rapport du technicien', text: 'Constat sur place et devis préparé, prêts pour validation.' },
      { src: '/screens/client-quotes.webp', title: 'Devis côté client', text: 'Le client consulte, accepte et signe ses devis en ligne.' },
    ],
  },
  security: {
    eyebrow: 'Sécurité',
    title: 'Sécurité & conformité.',
    sub: 'Vos données et celles de vos clients sont protégées à chaque étape.',
    items: [
      {
        title: 'Conçu pour le RGPD',
        text: 'Minimisation des données, droits d’accès et d’effacement, traçabilité des traitements.',
      },
      {
        title: 'Chiffrement des données',
        text: 'Échanges chiffrés en transit, données chiffrées au repos.',
      },
      {
        title: 'Sauvegardes',
        text: 'Sauvegardes automatiques de vos données pour ne jamais rien perdre.',
      },
      {
        title: 'Contrôle des accès par rôle',
        text: 'Gérant, gestionnaire, technicien, comptable : chacun ne voit que ce qui le concerne.',
      },
      {
        title: 'Validation humaine',
        text: 'Pratonna propose, vous décidez : aucune action n’est exécutée sans votre accord.',
      },
    ],
  },
  pricing: {
    eyebrow: 'Tarifs',
    title: 'Un tarif simple, sans surprise.',
    sub: 'Commencez petit, évoluez à votre rythme.',
    billingLabel: 'Période de facturation',
    monthly: 'Mensuel',
    annual: 'Annuel',
    save: '-20 %',
    perMonth: '/ mois HT',
    billedMonthly: 'Sans engagement',
    billedAnnually: 'Facturé {total} par an',
    popular: 'Le plus populaire',
    quote: 'Sur devis',
    quoteNote: 'Adapté à votre structure',
    cta: 'Commencer',
    ctaEnterprise: 'Nous contacter',
    plans: [
      {
        name: 'Starter',
        price: 49,
        desc: 'Pour démarrer seul, sans complexité.',
        features: ['1 utilisateur', 'Gestion de dossiers', 'CRM & contacts', 'Votre assistante'],
      },
      {
        name: 'Pro',
        price: 149,
        desc: 'Pour les équipes qui veulent déléguer l’administratif.',
        features: [
          '5 utilisateurs',
          'Tout Starter, plus :',
          'Documents & signature électronique',
          'Tâches & rappels',
          'Assistante vocale',
          'E-mails Gmail & Outlook (bientôt)',
        ],
      },
      {
        name: 'Entreprise',
        price: null,
        desc: 'Pour les structures multi-agences.',
        features: [
          'Utilisateurs illimités',
          'Tout Pro, plus :',
          'Comptabilité (bientôt)',
          'Intégrations sur mesure',
          'Accompagnement dédié',
        ],
      },
    ],
    note: 'Prix hors taxes. Démo et test pilote gratuits, sans engagement ni carte bancaire.',
  },
  pilot: {
    eyebrow: 'Programme pilote',
    title: 'Rejoignez les premières entreprises.',
    sub: 'Nous construisons Pratonna avec un petit groupe de PME. Pas de faux témoignages : les vôtres viendront.',
    points: [
      'Test pilote 100 % gratuit et sans engagement',
      'Mise en place accompagnée, offerte',
      'Accès direct à l’équipe produit',
      'Vos retours intégrés en priorité',
    ],
    cta: 'Réserver ma démo gratuite',
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Questions fréquentes.',
    items: [
      {
        q: 'Qu’est-ce que Pratonna ?',
        a: 'Pratonna est une collaboratrice numérique, propulsée par l’IA, pour tous les entrepreneurs : commerçants, indépendants, créateurs de contenu et PME de l’immobilier, du BTP ou de tout autre secteur. Elle centralise vos dossiers, vos devis et vos relances, et prend en charge les tâches répétitives pour que vous vous concentriez sur votre métier.',
      },
      {
        q: 'Faut-il des compétences techniques ?',
        a: 'Non. Vous écrivez à Pratonna comme à un collègue. La mise en place est accompagnée et votre équipe est opérationnelle en quelques minutes.',
      },
      {
        q: 'Mes données sont-elles sécurisées ?',
        a: 'Oui. Les échanges sont chiffrés, les accès sont contrôlés par rôle et la plateforme est conçue pour respecter le RGPD. Vos données restent les vôtres : elles ne sont jamais revendues.',
      },
      {
        q: 'Pratonna agit-elle sans mon accord ?',
        a: 'Non. Pratonna prépare et propose ; rien n’est envoyé, signé ou payé sans votre validation explicite. Chaque action est tracée dans un historique.',
      },
      {
        q: 'Quels outils sont compatibles ?',
        a: 'Aujourd’hui : vos documents PDF, la signature électronique DocuSign et un espace de données sécurisé. La synchronisation Gmail, Outlook et agendas arrive bientôt.',
      },
      {
        q: 'Puis-je annuler à tout moment ?',
        a: 'Oui. Les abonnements mensuels sont sans engagement et résiliables à tout moment. Les abonnements annuels restent actifs jusqu’à leur échéance.',
      },
    ],
  },
  demo: {
    eyebrow: 'Démo gratuite',
    title: 'Réservez votre démo gratuite.',
    free: 'Démo et test pilote 100 % gratuits, sans engagement',
    sub: '30 minutes en visio avec notre équipe, sur vos propres dossiers. Choisissez votre créneau : la confirmation arrive par e-mail.',
    points: [
      'Une démonstration sur vos propres cas',
      'Un test pilote gratuit ensuite, si vous le souhaitez',
      'Aucune carte bancaire, aucun engagement',
    ],
    direct: 'Ou écrivez-nous directement :',
    formTitle: 'Choisissez votre créneau',
    slotTitle: 'Jour et heure',
    timezone: '(heure de Paris, 30 min)',
    dayLabel: 'Jour',
    timeLabel: 'Heure',
    slotLoading: 'Chargement des créneaux…',
    slotError: 'Les créneaux ne s’affichent pas pour le moment. Écrivez-nous :',
    noSlots: 'Aucun créneau libre dans les deux prochaines semaines : écrivez-nous, nous trouverons un moment.',
    name: 'Nom complet',
    email: 'E-mail professionnel',
    phone: 'Téléphone',
    company: 'Entreprise',
    sector: 'Secteur',
    sectorPlaceholder: 'Choisissez votre secteur',
    sectors: [
      'Agence immobilière',
      'Syndic de copropriété',
      'Promoteur',
      'Entreprise BTP',
      'Architecture',
      'Artisan',
      'Gestionnaire de patrimoine',
      'Commerce',
      'Créateur de contenu',
      'Indépendant / profession libérale',
      'Autre',
    ],
    message: 'Message',
    messagePlaceholder: 'Parlez-nous de votre activité et de vos besoins…',
    optional: 'facultatif',
    consent: 'J’accepte que Pratonna utilise ces informations pour organiser la démo et me recontacter à ce sujet.',
    privacyLink: 'Confidentialité',
    submit: 'Réserver ma démo gratuite',
    sending: 'Réservation…',
    privacy: 'Gratuit et sans engagement. Vos informations servent uniquement à organiser la démo.',
    mailSubject: 'Demande de démo Pratonna',
    done: {
      title: 'C’est réservé !',
      text: 'Votre démo gratuite est prévue le {slot} (heure de Paris).',
      next: 'Un e-mail de confirmation vous attend, puis l’invitation avec le lien de la visio.',
      nextNoEmail: 'Notre équipe vous confirme le rendez-vous très vite, avec le lien de la visio.',
    },
    errors: {
      slot: 'Choisissez un jour et une heure.',
      taken: 'Ce créneau vient d’être réservé : choisissez-en un autre.',
      tooMany: 'Vous avez déjà envoyé plusieurs demandes aujourd’hui : nous revenons vers vous très vite.',
      generic: 'L’envoi n’a pas abouti. Réessayez, ou écrivez-nous à contact@pratonna.com.',
    },
  },
  finalCta: {
    title: 'Reprenez la main sur votre journée.',
    sub: 'Confiez l’administratif à Pratonna et gardez votre temps pour votre métier. Démo et test pilote gratuits.',
    demo: 'Réserver une démo gratuite',
    signup: 'Créer un compte',
  },
  footer: {
    ctaTitle: 'Voyez Pratonna sur vos propres dossiers.',
    free: 'Démo et test pilote gratuits, sans engagement.',
    cta: 'Réserver une démo gratuite',
    tagline: 'La collaboratrice de tous les entrepreneurs, quel que soit leur métier.',
    columns: [
      {
        title: 'Produit',
        links: [
          { label: 'Fonctionnalités', href: '/#fonctionnalites' },
          { label: 'Comment ça marche', href: '/#comment-ca-marche' },
          { label: 'Interface', href: '/#interface' },
          { label: 'Tarifs', href: '/#tarifs' },
        ],
      },
      {
        title: 'Solutions',
        links: [
          { label: 'Immobilier & syndic', href: '/immobilier' },
          { label: 'BTP & artisans', href: '/btp' },
          { label: 'Commerce', href: '/#solutions' },
          { label: 'Créateurs de contenu', href: '/#solutions' },
        ],
      },
      {
        title: 'Entreprise',
        links: [
          { label: 'Démo gratuite', href: '/#demo' },
          { label: 'Contact', href: '/#contact' },
          { label: 'Connexion', href: '/login' },
          { label: 'Inscription', href: '/signup' },
        ],
      },
      {
        title: 'Légal',
        links: [
          { label: 'Mentions légales', href: '/mentions-legales' },
          { label: 'CGU', href: '/cgu' },
          { label: 'Confidentialité', href: '/confidentialite' },
        ],
      },
    ],
    social: 'Bientôt disponible',
    language: 'Langue',
    rights: 'Tous droits réservés.',
  },
  legal: {
    back: 'Retour à l’accueil',
    draft: 'Cette page est en cours de rédaction et sera publiée prochainement.',
    contact: 'Pour toute question, écrivez-nous à',
    titles: {
      mentions: 'Mentions légales',
      cgu: 'Conditions générales d’utilisation',
      privacy: 'Politique de confidentialité',
    },
    privacy: [
      {
        title: 'Demande de démo',
        text: 'Quand vous réservez une démo, nous recevons votre nom, votre e-mail, votre entreprise, votre secteur et, si vous les indiquez, votre téléphone et votre message. Ils servent uniquement à organiser la démo et à vous recontacter à ce sujet, sur la base de votre consentement. Ils ne sont jamais revendus. Vous pouvez demander leur consultation, leur rectification ou leur suppression à tout moment.',
      },
      {
        title: 'Mesure d’audience',
        text: 'Pour savoir si le site est utile, nous comptons les visites, les clics sur « Démo gratuite », les lectures de la vidéo et les demandes de démo, sans cookie, sans adresse IP et sans identifiant : nous ne pouvons pas vous reconnaître. Si votre navigateur demande à ne pas être suivi (Do Not Track ou Global Privacy Control), rien n’est compté.',
      },
    ],
  },
}

const landingEn = {
  nav: {
    features: 'Features',
    solutions: 'Solutions',
    pricing: 'Pricing',
    demo: 'Demo',
    realEstate: 'Real estate',
    trades: 'Construction & trades',
    freeDemo: 'Free demo',
    freeDemoLong: 'Book a free demo',
    contact: 'Contact',
    login: 'Log in',
    signup: 'Sign up',
    home: 'Pratonna — home',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    menu: 'Menu',
    switchLang: 'Switch language',
  },
  status: { available: 'Available', soon: 'Coming soon' },
  meta: {
    title: 'Pratonna — Less admin, more time for what matters',
    description:
      'Pratonna sorts your requests, prepares your quotes, chases unpaid invoices and keeps your cases on track. For real estate, construction and every SME. Free demo and pilot.',
  },
  sectorSwitch: {
    label: 'Your business',
    realEstate: 'Real estate',
    others: 'Other businesses',
    reEyebrow: 'Real estate',
    reTitle: 'Co-ownership and lettings, finally up to date.',
    reSub: 'Co-ownership managers, property managers and independent agencies: Pratonna takes on the admin, you keep the decisions.',
    reCta: 'See everything for real estate',
    othersCta: 'Construction, trades and field teams',
  },
  video: {
    eyebrow: 'The 1-minute demo',
    title: 'See Pratonna at work.',
    sub: 'Real screens of the app: co-ownership first, then lettings management.',
    label: 'One-minute Pratonna demo',
    caption: 'Narrated in French, with on-screen subtitles · 1 minute',
  },
  realEstate: {
    parts: [
      {
        title: 'Co-ownership management',
        items: [
          {
            text: 'A leak is reported: the urgency is flagged and you send the contracted provider in one click',
            status: 'available',
          },
          {
            text: 'Service orders backed by built-in accounting: funds checked, accountant review, online signature',
            status: 'available',
          },
          { text: 'General assembly minutes drafted from your notes or a recording', status: 'available' },
          { text: 'Official general assembly report (PV d’AG)', status: 'soon' },
          { text: 'État daté and pré-état daté in a few clicks', status: 'soon' },
        ],
      },
      {
        title: 'Lettings management',
        items: [
          { text: 'Unpaid invoice reminders prepared, sent once you approve', status: 'available' },
          { text: 'Owners’ payments tracked invoice by invoice, with reminders', status: 'available' },
          { text: 'Service-charge calls', status: 'soon' },
          { text: 'Leases and rental documents', status: 'soon' },
          { text: 'Move-in and move-out inventories', status: 'soon' },
        ],
      },
    ],
  },
  pages: {
    immobilier: {
      meta: {
        title: 'Pratonna for real estate — co-ownership, lettings, agencies',
        description:
          'Co-ownership and lettings: leaks, service orders, assembly minutes, unpaid invoice reminders and tracked payments. Free, no-commitment demo and pilot.',
      },
      video: true,
      sector: 'Real estate agency',
      eyebrow: 'Independent agencies · Co-ownership · Property managers',
      title: 'Real estate, without the paperwork.',
      sub: 'Pratonna prepares your documents, chases payments for you and tracks every co-ownership or lettings case. You approve, Pratonna takes care of it.',
      partsEyebrow: 'Features',
      partsTitle: 'What Pratonna does for you.',
      partsSub: 'What works today, and what is coming soon: we say it plainly.',
      benefitsTitle: 'For independent agencies.',
      benefits: [
        {
          icon: 'clock',
          title: 'Time given back',
          text: 'Less typing, copy-pasting and manual follow-ups: your days go to your clients.',
        },
        {
          icon: 'bell',
          title: 'No missed follow-up',
          text: 'Unpaid invoices, reminders, actions voted in assembly: every deadline is tracked and you are told.',
        },
        {
          icon: 'users',
          title: 'Better-informed clients',
          text: 'Co-owners and landlords follow their requests, quotes and invoices in their own space.',
        },
      ],
    },
    btp: {
      meta: {
        title: 'Pratonna for construction — renovation firms, trades, field teams',
        description:
          'Requests ranked by urgency, site reports with photos, quotes signed online, scheduled jobs and invoice reminders. Free demo and pilot.',
      },
      video: false,
      sector: 'Construction company',
      eyebrow: 'Renovation firms · Tradespeople · Field teams',
      title: 'Your jobs tracked, from request to invoice.',
      sub: 'Pratonna sorts requests, prepares your quotes, schedules your crews and chases your invoices. You stay in control of every decision.',
      partsEyebrow: 'Features',
      partsTitle: 'What Pratonna does for you.',
      partsSub: 'What works today, and what is coming soon: we say it plainly.',
      parts: [
        {
          title: 'At the office',
          items: [
            { text: 'Client requests ranked by urgency', status: 'available' },
            { text: 'Quotes priced, approved, then signed online', status: 'available' },
            { text: 'Service orders and payment tracking', status: 'available' },
            { text: 'Invoices and reminders without re-typing', status: 'available' },
            { text: 'Gmail and Outlook sync', status: 'soon' },
          ],
        },
        {
          title: 'In the field',
          items: [
            { text: 'Today’s jobs on your phone', status: 'available' },
            { text: 'Site report and photos sent from the job', status: 'available' },
            { text: 'Crews assigned by availability and location', status: 'available' },
            { text: 'Site meeting minutes', status: 'available' },
            { text: 'Google and Outlook calendars in sync', status: 'soon' },
          ],
        },
      ],
      benefitsTitle: 'For building firms.',
      benefits: [
        {
          icon: 'clock',
          title: 'Less time at the office',
          text: 'Quotes, invoices and reminders are prepared for you: approve them in one click.',
        },
        {
          icon: 'check',
          title: 'Clearer jobs',
          text: 'Every job has its status, photos and history, from the first call to the invoice.',
        },
        {
          icon: 'bell',
          title: 'No missed follow-up',
          text: 'Client reminders and internal follow-ups go out at the right time, after your approval.',
        },
      ],
    },
  },
  trust: {
    title: 'Built for every entrepreneur, whatever your trade',
    items: [
      'Shop owner',
      'Content creator',
      'Freelancer',
      'Professional practice',
      'Real estate agency',
      'Property management',
      'Developer',
      'Construction company',
      'Tradesperson',
      'Asset manager',
    ],
  },
  problem: {
    eyebrow: 'The problem',
    title: 'Less scattering, more clarity.',
    sub: 'Your business deserves better than an overflowing inbox.',
    beforeTitle: 'Today',
    before: [
      'Late emails, clients left waiting',
      'Quotes lost between two files',
      'Forgotten follow-ups, unpaid invoices',
      'Cases scattered across tools and binders',
    ],
    afterTitle: 'With Pratonna',
    afterLead: 'A teammate who sorts, prepares, follows up and keeps track — you keep the decision.',
    after: [
      'Incoming requests ranked by urgency',
      'Quotes and replies prepared for you',
      'Follow-ups sent at the right time, once you approve',
      'Every case tracked from first contact to invoice',
    ],
  },
  how: {
    eyebrow: 'How it works',
    title: 'Four steps, and your day gets lighter.',
    sub: 'No IT project: Pratonna adapts to you, not the other way round.',
    steps: [
      {
        title: 'Create your workspace',
        text: 'Invite your team and your clients: everyone gets access that fits their role.',
      },
      {
        title: 'Bring your cases together',
        text: 'Reports, quotes, jobs and invoices in one place, updated in real time.',
      },
      {
        title: 'Delegate in plain words',
        text: '“Chase Mr Martin about invoice 2041”: just say it, as you would to a colleague.',
      },
      {
        title: 'Approve, Pratonna executes',
        text: 'Every action is submitted to you. One click and it’s done, logged and archived.',
      },
    ],
  },
  features: {
    eyebrow: 'Features',
    title: 'What Pratonna does for you',
    sub: 'What works today, and what is coming next.',
    items: [
      {
        title: 'Cases & jobs',
        status: 'available',
        points: [
          'From report to invoice, every step tracked',
          'Photos, reports and messages in one place',
          'Time-stamped history of every action',
        ],
      },
      {
        title: 'CRM & contacts',
        status: 'available',
        points: [
          'Clients, technicians and partners in one place',
          'Message history for every case',
          'A directory shared with your team',
        ],
      },
      {
        title: 'Tasks & reminders',
        status: 'available',
        points: [
          'Reminders for meetings, calls and follow-ups',
          'Notifications sorted by priority',
          'Fewer missed tasks, better follow-through',
        ],
      },
      {
        title: 'Documents & signature',
        status: 'available',
        points: [
          'Line-by-line quotes as PDF',
          'E-signature with DocuSign',
          'Invoices tracked until paid',
        ],
      },
      {
        title: 'Your AI assistant',
        status: 'available',
        points: [
          'Ask questions in plain words',
          'She prepares, you approve in one click',
          'Name, tone and rules that fit you',
        ],
      },
      {
        title: 'Voice assistant',
        status: 'available',
        points: [
          'Talk to her from the job site, hands-free',
          'She answers out loud, in French',
          'Same approvals as in writing',
        ],
      },
      {
        title: 'Gmail & Outlook email',
        status: 'soon',
        points: [
          'Inbox synchronisation',
          'Replies prepared for your approval',
          'Follow-up on unanswered messages',
        ],
      },
      {
        title: 'Accounting',
        status: 'soon',
        points: [
          'Continuous financial tracking',
          'Exports for your accountant',
          'Work orders approved by the accountant',
        ],
      },
      {
        title: 'Video studio',
        status: 'soon',
        points: ['AI-generated visuals of your properties', 'Site photo retouching', 'Presentation videos'],
      },
    ],
  },
  integrations: {
    eyebrow: 'Integrations',
    title: 'What works today.',
    sub: 'We only show what you can use right now.',
    items: [
      { name: 'Secure data', detail: 'Supabase hosting, role-based access', status: 'available', icon: 'database' },
      { name: 'PDF documents', detail: 'Quotes ready to send', status: 'available', icon: 'file' },
      { name: 'DocuSign', detail: 'Electronic signature', status: 'available', icon: 'sign' },
      { name: 'Gmail', detail: 'Email synchronisation', status: 'soon', icon: 'mail' },
      { name: 'Outlook', detail: 'Email synchronisation', status: 'soon', icon: 'mail' },
      { name: 'Calendars', detail: 'Google Calendar & Outlook', status: 'soon', icon: 'calendar' },
    ],
  },
  usecases: {
    eyebrow: 'Use cases',
    title: 'A morning’s work, in a few clicks.',
    sub: 'Less chasing by hand, fewer missed tasks, more time for your clients.',
    tabsLabel: 'Use case examples',
    done: 'Done',
    tabs: [
      {
        label: 'From report to job',
        steps: ['Report received', 'Technician assigned', 'Quote approved', 'Job scheduled'],
        result: 'Job scheduled',
        text: 'A resident reports a leak. Pratonna ranks the request by urgency, suggests a technician, prepares the quote for approval and schedules the job — you stay in control at every step.',
      },
      {
        label: 'Quote signed online',
        steps: ['On-site report', 'Quote priced', 'Internal approval', 'Client signature'],
        result: 'Quote signed',
        text: 'The technician enters the site report from the job. The quote is priced line by line, approved by the manager, then sent to the client who signs it online with DocuSign.',
      },
      {
        label: 'Invoice reminder',
        steps: ['Due date detected', 'Reminder drafted', 'One-click approval', 'Payment tracked'],
        result: 'Reminder sent, payment tracked',
        text: 'An invoice is coming due? Pratonna spots it, drafts a polite reminder, waits for your go-ahead, then tracks the payment and tells you as soon as it arrives.',
      },
    ],
  },
  industries: {
    eyebrow: 'Solutions',
    title: 'Designed for your trade.',
    sub: 'The same teammate, working to the realities of your sector.',
    prev: 'Previous sector',
    next: 'Next sector',
    goTo: 'Go to sector',
    items: [
      {
        title: 'Retail',
        tag: 'Customers · orders',
        points: [
          'Customer requests and orders in one place',
          'Quotes and invoices prepared for you',
          'Payments tracked until they arrive',
        ],
      },
      {
        title: 'Content creators',
        tag: 'Partnerships · contracts',
        points: [
          'Partnership requests sorted, replies drafted',
          'Quotes and contracts signed online',
          'Invoices tracked, reminders at the right time',
        ],
      },
      {
        title: 'Freelancers & professionals',
        tag: 'Appointments · follow-ups',
        points: [
          'Calendar and appointments organised',
          'Client requests ranked by urgency',
          'Invoices and reminders without re-typing',
        ],
      },
      {
        title: 'Real estate',
        tag: 'CRM · viewings',
        points: [
          'Buyer and seller records always up to date',
          'Viewings scheduled, reports filed',
          'Buyer follow-ups at the right time',
        ],
      },
      {
        title: 'Lettings & property management',
        tag: 'Requests · service charges',
        points: [
          'Tenant and owner requests sorted',
          'Jobs tracked through to the invoice',
          'Service-charge calls and reminders tracked',
        ],
      },
      {
        title: 'Construction',
        tag: 'Sites · quotes',
        points: [
          'Site reports turned into quotes',
          'Crews assigned, jobs scheduled',
          'Quotes approved, then signed online',
        ],
      },
      {
        title: 'Architecture',
        tag: 'Plans · approvals',
        points: [
          'Plans and versions shared with the right people',
          'Client approvals logged and time-stamped',
          'Filing deadlines reminded on time',
        ],
      },
      {
        title: 'Tradespeople',
        tag: 'Jobs · invoices',
        points: [
          'Today’s jobs on your phone',
          'Report and photos sent from the site',
          'Invoices and reminders without re-typing',
        ],
      },
    ],
  },
  screens: {
    eyebrow: 'Interface',
    title: 'See the interface.',
    sub: 'Real screenshots of the app, just as your teams see it.',
    prev: 'Previous screenshot',
    next: 'Next screenshot',
    goTo: 'Show screenshot',
    cta: 'Book a free demo',
    items: [
      { src: '/screens/manager-dashboard.webp', title: 'Manager dashboard', text: 'Today’s priorities, cases to assign and quotes to approve.' },
      { src: '/screens/case-detail.webp', title: 'Case detail', text: 'Timeline, photos, quote and messages in one place.' },
      { src: '/screens/technician-report.webp', title: 'Technician report', text: 'On-site findings and a prepared quote, ready for approval.' },
      { src: '/screens/client-quotes.webp', title: 'Client quotes', text: 'Clients review, accept and sign their quotes online.' },
    ],
  },
  security: {
    eyebrow: 'Security',
    title: 'Security & compliance.',
    sub: 'Your data and your clients’ data are protected at every step.',
    items: [
      {
        title: 'Designed for GDPR',
        text: 'Data minimisation, access and erasure rights, traceable processing.',
      },
      { title: 'Data encryption', text: 'Encrypted in transit, encrypted at rest.' },
      { title: 'Backups', text: 'Automatic backups so nothing is ever lost.' },
      {
        title: 'Role-based access control',
        text: 'Owner, manager, technician, accountant: everyone sees only what concerns them.',
      },
      {
        title: 'Human approval',
        text: 'Pratonna proposes, you decide: no action runs without your consent.',
      },
    ],
  },
  pricing: {
    eyebrow: 'Pricing',
    title: 'Simple pricing, no surprises.',
    sub: 'Start small, grow at your own pace.',
    billingLabel: 'Billing period',
    monthly: 'Monthly',
    annual: 'Annual',
    save: '-20%',
    perMonth: '/ month excl. VAT',
    billedMonthly: 'No commitment',
    billedAnnually: 'Billed {total} per year',
    popular: 'Most popular',
    quote: 'Custom quote',
    quoteNote: 'Tailored to your organisation',
    cta: 'Get started',
    ctaEnterprise: 'Contact us',
    plans: [
      {
        name: 'Starter',
        price: 49,
        desc: 'To get started on your own, simply.',
        features: ['1 user', 'Case management', 'CRM & contacts', 'Your assistant'],
      },
      {
        name: 'Pro',
        price: 149,
        desc: 'For teams that want to hand off the admin.',
        features: [
          '5 users',
          'Everything in Starter, plus:',
          'Documents & e-signature',
          'Tasks & reminders',
          'Voice assistant',
          'Gmail & Outlook email (coming soon)',
        ],
      },
      {
        name: 'Enterprise',
        price: null,
        desc: 'For multi-branch organisations.',
        features: [
          'Unlimited users',
          'Everything in Pro, plus:',
          'Accounting (coming soon)',
          'Custom integrations',
          'Dedicated support',
        ],
      },
    ],
    note: 'Prices exclude VAT. Free demo and pilot, no commitment and no credit card.',
  },
  pilot: {
    eyebrow: 'Pilot programme',
    title: 'Join the first companies.',
    sub: 'We are building Pratonna with a small group of SMEs. No made-up testimonials: yours will come.',
    points: [
      'Pilot 100% free, no commitment',
      'Guided setup, free of charge',
      'Direct access to the product team',
      'Your feedback built in first',
    ],
    cta: 'Book my free demo',
  },
  faq: {
    eyebrow: 'FAQ',
    title: 'Frequently asked questions.',
    items: [
      {
        q: 'What is Pratonna?',
        a: 'Pratonna is an AI-powered digital teammate for every entrepreneur: shop owners, freelancers, content creators and SMEs in real estate, construction or any other sector. She centralises your cases, quotes and follow-ups, and takes care of repetitive tasks so you can focus on your work.',
      },
      {
        q: 'Do I need technical skills?',
        a: 'No. You write to Pratonna as you would to a colleague. Setup is guided and your team is up and running in minutes.',
      },
      {
        q: 'Is my data secure?',
        a: 'Yes. Communications are encrypted, access is role-based and the platform is designed for GDPR. Your data stays yours: it is never sold.',
      },
      {
        q: 'Does Pratonna act without my consent?',
        a: 'No. Pratonna prepares and proposes; nothing is sent, signed or paid without your explicit approval. Every action is logged.',
      },
      {
        q: 'Which tools are compatible?',
        a: 'Today: your PDF documents, DocuSign e-signature and a secure data workspace. Gmail, Outlook and calendar sync are coming soon.',
      },
      {
        q: 'Can I cancel at any time?',
        a: 'Yes. Monthly plans have no commitment and can be cancelled at any time. Annual plans stay active until the end of their term.',
      },
    ],
  },
  demo: {
    eyebrow: 'Free demo',
    title: 'Book your free demo.',
    free: 'Demo and pilot 100% free, no commitment',
    sub: '30 minutes by video call with our team, on your own cases. Pick a slot: the confirmation arrives by email.',
    points: ['A demo on your own use cases', 'A free pilot afterwards, if you wish', 'No credit card, no commitment'],
    direct: 'Or email us directly:',
    formTitle: 'Pick your slot',
    slotTitle: 'Day and time',
    timezone: '(Paris time, 30 min)',
    dayLabel: 'Day',
    timeLabel: 'Time',
    slotLoading: 'Loading the slots…',
    slotError: 'The slots cannot be shown right now. Email us:',
    noSlots: 'No free slot in the next two weeks: email us and we will find a time.',
    name: 'Full name',
    email: 'Work email',
    phone: 'Phone',
    company: 'Company',
    sector: 'Sector',
    sectorPlaceholder: 'Choose your sector',
    sectors: [
      'Real estate agency',
      'Property management',
      'Developer',
      'Construction company',
      'Architecture',
      'Tradesperson',
      'Asset manager',
      'Retail',
      'Content creator',
      'Freelancer / professional practice',
      'Other',
    ],
    message: 'Message',
    messagePlaceholder: 'Tell us about your business and what you need…',
    optional: 'optional',
    consent: 'I agree that Pratonna uses these details to organise the demo and contact me about it.',
    privacyLink: 'Privacy',
    submit: 'Book my free demo',
    sending: 'Booking…',
    privacy: 'Free, no commitment. Your details are only used to organise the demo.',
    mailSubject: 'Pratonna demo request',
    done: {
      title: 'You’re booked!',
      text: 'Your free demo is on {slot} (Paris time).',
      next: 'A confirmation email is on its way, then the invitation with the video link.',
      nextNoEmail: 'Our team will confirm the meeting shortly, with the video link.',
    },
    errors: {
      slot: 'Pick a day and a time.',
      taken: 'This slot was just booked: please pick another one.',
      tooMany: 'You have already sent several requests today: we will get back to you shortly.',
      generic: 'Sending failed. Try again, or email us at contact@pratonna.com.',
    },
  },
  finalCta: {
    title: 'Take back control of your day.',
    sub: 'Hand the admin to Pratonna and keep your time for your real work. Free demo and pilot.',
    demo: 'Book a free demo',
    signup: 'Create an account',
  },
  footer: {
    ctaTitle: 'See Pratonna on your own cases.',
    free: 'Free demo and pilot, no commitment.',
    cta: 'Book a free demo',
    tagline: 'The teammate for every entrepreneur, whatever the trade.',
    columns: [
      {
        title: 'Product',
        links: [
          { label: 'Features', href: '/#fonctionnalites' },
          { label: 'How it works', href: '/#comment-ca-marche' },
          { label: 'Interface', href: '/#interface' },
          { label: 'Pricing', href: '/#tarifs' },
        ],
      },
      {
        title: 'Solutions',
        links: [
          { label: 'Real estate & property', href: '/immobilier' },
          { label: 'Construction & trades', href: '/btp' },
          { label: 'Retail', href: '/#solutions' },
          { label: 'Content creators', href: '/#solutions' },
        ],
      },
      {
        title: 'Company',
        links: [
          { label: 'Free demo', href: '/#demo' },
          { label: 'Contact', href: '/#contact' },
          { label: 'Log in', href: '/login' },
          { label: 'Sign up', href: '/signup' },
        ],
      },
      {
        title: 'Legal',
        links: [
          { label: 'Legal notice', href: '/mentions-legales' },
          { label: 'Terms of use', href: '/cgu' },
          { label: 'Privacy', href: '/confidentialite' },
        ],
      },
    ],
    social: 'Coming soon',
    language: 'Language',
    rights: 'All rights reserved.',
  },
  legal: {
    back: 'Back to home',
    draft: 'This page is being written and will be published soon.',
    contact: 'For any question, email us at',
    titles: {
      mentions: 'Legal notice',
      cgu: 'Terms of use',
      privacy: 'Privacy policy',
    },
    privacy: [
      {
        title: 'Demo requests',
        text: 'When you book a demo, we receive your name, email, company, sector and, if you give them, your phone number and message. They are only used to organise the demo and contact you about it, based on your consent. They are never sold. You can ask to see, correct or delete them at any time.',
      },
      {
        title: 'Audience measurement',
        text: 'To know whether the site is useful, we count visits, clicks on “Free demo”, video plays and demo requests, with no cookie, no IP address and no identifier: we cannot recognise you. If your browser asks not to be tracked (Do Not Track or Global Privacy Control), nothing is counted.',
      },
    ],
  },
}

export const translations = {
  en: {
    hero: {
      eyebrowTag: 'New',
      eyebrow: 'The right hand of every entrepreneur',
      titleLine1: 'Less admin.',
      titleLine2: 'More time for what matters.',
      typed: ['Your emails, sorted.', 'Your quotes, ready.', 'Your reminders, sent.', 'Your cases, up to date.'],
      lead: 'Pratonna reads your emails, prepares your quotes, follows up with your clients and keeps your cases on track — you approve, she takes care of it.',
      ctaDemo: 'Book a free demo',
      ctaWatch: 'Watch the 1-min demo',
      micro: ['Free demo and pilot', 'No commitment', 'Secure hosting'],
      // Same order as PERSONAS in Hero.jsx: the woman, then the man.
      avatar: {
        personas: [
          {
            alt: 'Pratonna’s assistant, wearing a headset',
            bubble: 'Hello, I’m your AI teammate. I’ll take care of the rest.',
          },
          {
            alt: 'Pratonna’s assistant, wearing a headset',
            bubble: 'Hello, I’m your AI teammate. I’ll take care of the rest.',
          },
        ],
      },
      stats: [
        { value: 'Less admin time', label: '' },
        { value: '24/7', label: 'available' },
        { value: 'Human approval', label: 'before any action' },
        { value: 'Every trade', label: 'retail · creators · real estate · construction' },
      ],
      discover: 'Discover',
      video: {
        label: 'Pratonna overview video',
        unmute: 'Turn sound on',
        mute: 'Mute',
        play: 'Play video',
      },
      lightbox: {
        label: 'Pratonna overview',
        close: 'Close video',
      },
    },
    landing: landingEn,
  },
  fr: {
    hero: {
      eyebrowTag: 'Nouveau',
      eyebrow: 'Le bras droit de tous les entrepreneurs',
      titleLine1: 'Moins d’administratif.',
      titleLine2: 'Plus de temps pour l’essentiel.',
      typed: ['Vos e-mails, triés.', 'Vos devis, prêts.', 'Vos relances, envoyées.', 'Vos dossiers, à jour.'],
      lead: 'Pratonna lit vos e-mails, prépare vos devis, relance vos clients et suit vos dossiers — vous validez, elle s’en occupe.',
      ctaDemo: 'Réserver une démo gratuite',
      ctaWatch: 'Voir la démo (1 min)',
      micro: ['Démo et test pilote gratuits', 'Sans engagement', 'Hébergement sécurisé'],
      // Same order as PERSONAS in Hero.jsx: the woman, then the man.
      avatar: {
        personas: [
          {
            alt: 'L’assistante Pratonna, avec son casque',
            bubble: 'Bonjour, je suis votre collaboratrice IA. Je m’occupe du reste.',
          },
          {
            alt: 'L’assistant Pratonna, avec son casque',
            bubble: 'Bonjour, je suis votre collaborateur IA. Je m’occupe du reste.',
          },
        ],
      },
      stats: [
        { value: 'Moins de temps administratif', label: '' },
        { value: '24/7', label: 'disponible' },
        { value: 'Validation humaine', label: 'avant action' },
        { value: 'Tous les métiers', label: 'commerce · création · immobilier · BTP' },
      ],
      discover: 'Découvrir',
      video: {
        label: 'Vidéo de présentation de Pratonna',
        unmute: 'Activer le son',
        mute: 'Couper le son',
        play: 'Lire la vidéo',
      },
      lightbox: {
        label: 'Présentation de Pratonna',
        close: 'Fermer la vidéo',
      },
    },
    landing: landingFr,
  },
}
