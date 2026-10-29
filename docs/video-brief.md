# Pratonna — brief vidéo de présentation (v2)

Retours de Martin (points 22 à 24) : la vidéo actuelle parle trop d’« IA » et pas assez du quotidien. La nouvelle version part d’une journée réelle, montre le produit qui fonctionne, puis l’assistante.

> **Ne pas toucher à la vidéo actuelle** (`legacy/client/public/final-web*.mp4`) tant que la v2 n’est pas validée. Elle reste en fond du hero.

## Format

- Durée cible : 75 à 90 secondes ; une version courte de 30 secondes pour les réseaux sociaux (scènes 1, 3 et 5).
- 16:9 en 1080p pour le site, avec une déclinaison 9:16 pour mobile et réseaux sociaux.
- Sous-titres français incrustés : la vidéo démarre sans le son sur la page.
- Toutes les captures d’écran viennent de la vraie application, avec les données de démonstration (`pnpm db:seed`) ; aucune maquette.

## Structure

| #   | Séquence                   | Durée   | Ce qu’on voit                                                                                                                |
| --- | -------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | La douleur du quotidien    | 0–15 s  | Gestionnaire de syndic, 8 h 40 : boîte mail pleine, téléphone qui sonne, post-it « relancer M. Martin », devis Excel ouvert. |
| 2   | La solution qui fonctionne | 15–40 s | Le tableau de bord avec les priorités du jour, un dossier du signalement à l’intervention, le devis signé en ligne.          |
| 3   | L’assistante               | 40–60 s | Clic sur « Assistante » : elle prépare une relance, l’utilisateur valide en un clic. Personnalisation (nom, ton).            |
| 4   | Les métiers                | 60–75 s | Cinq plans courts : agence immobilière, syndic, chantier, architecte, artisan sur son téléphone.                             |
| 5   | Démo                       | 75–90 s | Logo, « Moins d’administratif. Plus de temps pour l’essentiel. », bouton « Demander une démo ».                              |

## Script de narration (voix off, français)

Ton : chaleureux, posé, naturel, comme une collègue qui raconte sa journée. Phrases courtes, pas de jargon technique, et « IA » cité une seule fois.

**1. La douleur du quotidien**

> Il est huit heures quarante. Quarante e-mails non lus, un devis à finir, et ce client à rappeler… depuis mardi.
> Vous connaissez cette journée-là.

**2. La solution qui fonctionne**

> Avec Pratonna, votre journée commence par l’essentiel : ce qui est en retard, ce qui attend votre accord, ce qui attend une réponse.
> Un signalement arrive ? Le dossier est créé, le technicien est proposé, le devis est préparé.
> Votre client le signe en ligne, depuis son téléphone. Et l’intervention se planifie toute seule.

**3. L’assistante**

> Et puis il y a Maya, votre collaboratrice IA.
> « Relance les factures en retard. » Elle prépare tout… et attend votre feu vert. Vous validez, elle s’en occupe.
> Son nom, son ton, ce qu’elle doit retenir : c’est vous qui choisissez.

**4. Les métiers**

> Agences immobilières, syndics, entreprises du bâtiment, architectes, artisans :
> Pratonna s’adapte à votre métier, pas l’inverse.

**5. Démo**

> Moins d’administratif. Plus de temps pour l’essentiel.
> Pratonna. Demandez votre démonstration.

## Écrans réels à capturer

Comptes de démonstration (`<clé>@pratonna-demo.test`), à 1440 × 900, en thème par défaut (bleu Pratonna) :

1. **Tableau de bord du gestionnaire** (`manager`) : carte « Bonjour Léa, voici vos priorités du jour » avec ses trois priorités.
2. **Panneau de l’assistante** ouvert depuis l’en-tête, pré-rempli par « Elle s’en occupe » (factures en retard), puis une proposition « Valider / Refuser ».
3. **Détail d’un dossier** (`INC-2026-0004`) : chronologie, devis, échanges.
4. **Rapport du technicien** (`marc`, dossier `INC-2026-0003`) : constat et devis chiffré ligne par ligne.
5. **Devis côté client** (`camille`) : bouton « Signer le devis » puis la fenêtre DocuSign. Attendre que les clés DocuSign soient en place pour filmer une vraie signature.
6. **Réglages de l’assistante** : changement du nom, du ton et de la couleur, appliqué en direct.
7. **Boîte de notifications intelligente** : onglets Urgent / Important / Résumé.
8. **Version mobile** (390 px) : tableau de bord et panneau de l’assistante sur téléphone.

Les captures fixes déjà prises pour le site sont dans `legacy/client/public/screens/`. Les séquences animées se filment avec un enregistrement d’écran à 60 i/s.

## Voix off

La voix off sera **réenregistrée**. Un test avec ElevenLabs est en attente de la clé du client. L’application elle-même n’utilise qu’OpenAI : ce test concerne uniquement la vidéo marketing. En repli : une comédienne voix off française (voix féminine, 30 à 40 ans, chaleureuse et non commerciale), enregistrée sur le script ci-dessus.

## Livrables

- `final-web.mp4` (1080p, sans son, pour le fond du hero), `final-web-mobile.mp4` (720p) et `final-web-audio.mp4` (avec voix off), aux mêmes noms qu’aujourd’hui pour un remplacement direct.
- `final-poster.jpg` : image de la scène 2.
- Le fichier de sous-titres `.srt` en français.
