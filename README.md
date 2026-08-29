# Woodfire Companion — POC

Mini PWA statique, pensée pour iPhone, avec deux modules :

- **Planning** : checklist horaire interactive pour la recette Pork Belly Burnt Ends + grenailles + sauce fraîche.
- **Température** : saisie manuelle en 2–3 actions, horodatage automatique, courbe, cible et export CSV.

Aucun serveur, aucune API et aucun compte n'est nécessaire. Les données sont stockées localement dans Safari via `localStorage`.

## 1. Tester rapidement sur PC/Mac

Ne pas ouvrir simplement `index.html` en `file://` si tu veux tester le mode hors-ligne/service worker. Lance un petit serveur local :

```bash
python -m http.server 8000
```

Puis ouvre :

```text
http://localhost:8000
```

## 2. Publier sur GitHub Pages

### Nouveau dépôt

Crée un dépôt GitHub, par exemple :

```text
woodfire-companion
```

Puis dans le dossier du projet :

```bash
git init
git add .
git commit -m "Initial Woodfire Companion POC"
git branch -M main
git remote add origin git@github.com:TON-UTILISATEUR/woodfire-companion.git
git push -u origin main
```

### Activer GitHub Pages

Dans GitHub :

1. **Settings**
2. **Pages**
3. Source : **Deploy from a branch**
4. Branch : **main**
5. Folder : **/(root)**
6. Save

L'URL aura généralement la forme :

```text
https://TON-UTILISATEUR.github.io/woodfire-companion/
```

## 3. Installer comme mini-app sur iPhone

Dans **Safari** :

1. Ouvre l'URL GitHub Pages.
2. Touche **Partager**.
3. Choisis **Sur l'écran d'accueil**.
4. Touche **Ajouter**.

L'icône `Woodfire` apparaît comme une app. Après une première ouverture en ligne, le service worker met les fichiers en cache pour un usage hors connexion.

## Fonctionnement du planning

- Heure du repas par défaut : **20:00**.
- Tous les horaires sont calculés relativement à cette heure.
- Chaque tâche peut être cochée.
- Le bouton `›` affiche les instructions détaillées.
- Les boutons `+5 / +10 / +15 min` décalent uniquement les tâches encore non terminées.
- L'app affiche la prochaine tâche et le temps restant / retard.

## Fonctionnement du suivi température

1. Ouvre l'onglet **Température**.
2. Saisis uniquement la température.
3. Touche **Ajouter** (ou Entrée).
4. L'heure est enregistrée automatiquement.
5. La courbe se met à jour immédiatement.

Fonctions incluses :

- cible réglable ;
- suppression de la dernière mesure ;
- nouvelle cuisson ;
- historique court des mesures ;
- export CSV ;
- stockage persistant sur l'iPhone.

## Fichiers

```text
woodfire-companion/
├── index.html
├── styles.css
├── app.js
├── manifest.webmanifest
├── service-worker.js
├── README.md
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## Limitation du POC

Les données sont locales au navigateur/appareil. Si Safari efface les données du site, l'historique disparaît. Une future V2 pourra ajouter import/export JSON, synchronisation iCloud ou une source ESP32/sonde sans changer la structure générale de l'interface.
