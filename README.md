# Purcel Web

Frontend React (Vite, TypeScript, Tailwind CSS v4) de Purcel : planning du voyage à Bucarest, activités, trajets, documents, discussion en direct. Installable sur téléphone et consultable hors connexion.

## Lancer en local

1. Démarrer l’API `purcel-api` (MongoDB + `.\mvnw.cmd spring-boot:run`).
2. Vérifier `.env` :

   ```
   VITE_API_URL=http://localhost:8080
   ```

3. Lancer le site :

   ```powershell
   npm run dev
   ```

   Le site est sur `http://localhost:5173`.

Pour tester la version de production en local (service worker et mode hors connexion compris) :

```powershell
npm run build
npm run preview
```

La préversion tourne sur `http://localhost:4173`. Pour que l’API l’accepte, ajoute `http://localhost:4173` à `CORS_ORIGINS` dans le `.env` du backend.

## Déploiement Railway

1. Pousser ce dépôt sur GitHub.
2. Dans le projet Railway : **New > GitHub Repo**, choisir ce dépôt. Railway utilise le `Dockerfile` et `railway.json`.
3. Dans **Variables** du service web :

   | Variable | Valeur |
   | --- | --- |
   | `VITE_API_URL` | URL publique de l’API, ex. `https://purcel-api-production.up.railway.app` |

   La variable est lue au moment du build : après l’avoir changée, relance un déploiement.

4. **Settings > Networking > Generate Domain** pour obtenir l’URL publique du site.
5. Dans les variables du service **API**, mettre cette URL dans `FRONTEND_URL` et `CORS_ORIGINS`, puis redéployer l’API.

## Fonctionnement

- **Langue** : anglais par défaut, drapeaux FR / EN / RO, dernier choix mémorisé dans le navigateur et envoyé au serveur pour les emails.
- **Thème** : clair par défaut, sombre au choix, mémorisé dans le navigateur.
- **Connexion** : la session dure 6 mois. La page de connexion est la seule accessible sans compte.
- **Modifications** : chaque ajout, modification ou suppression affiche d’abord un résumé des changements à valider. Les modifications du planning, des activités et des trajets peuvent être annulées depuis l’historique.
- **Temps réel** : les changements des autres, les messages, la saisie en cours et les connexions arrivent instantanément.
- **Hors connexion** : le site s’installe comme une application (menu du navigateur, puis « Ajouter à l’écran d’accueil »). Sans réseau, les dernières données reçues restent consultables, avec la date de dernière mise à jour. Les actions qui demandent le réseau sont désactivées.
