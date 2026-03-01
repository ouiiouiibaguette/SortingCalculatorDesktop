# Sorting Calculator Pro

## Vue d'ensemble
Sorting Calculator Pro est une application de bureau conçue pour les opérations de tri industriel. Elle permet :
- La gestion des clients et des offres.
- Le chronométrage et calcul des heures de tri en format décimal pour la paie.
- Le suivi en direct du stock restant et l'émission d'alertes en cas de stock critique.
- L'export de rapports d'activité au format Excel (.xlsx).

## Fonctionnement Local (Offline-First)
Cette application est conçue pour fonctionner **100% hors-ligne**. Aucune donnée ne quitte votre machine.
- **Base de données** : Les données sont stockées au format SQLite localement sur votre disque via le plugin Tauri SQL.
- **Fichiers** : L'export des rapports Excel se fait en mémoire (sans appel serveur) puis est écrit directement sur votre système de fichiers.

## Instructions d'installation
L'application ne nécessite pas d'installation lourde. Un simple fichier `.exe` portable est généré pour Windows.
1. Placez l'exécutable `SortingCalculator.exe` dans le dossier de votre choix.
2. Lancez l'application.

## Développement

### Prérequis
- [Node.js](https://nodejs.org/) (v20+)
- [Rust](https://www.rust-lang.org/) et Cargo (v1.75+)

### Démarrage Rapide
1. Installer les dépendances frontend : `npm install`
2. Lancer le serveur de développement avec rechargement à chaud (HMR) : `npm run tauri dev`

### Compilation de l'exécutable
Pour créer une nouvelle version de production optimisée :
```bash
npm run build
npm run tauri build
```
L'exécutable final sera disponible dans le dossier `src-tauri/target/release/`.
