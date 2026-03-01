# Note d'Architecture Technique

## Choix Technologiques

### 1. Backend Desktop: Tauri v2
Tauri a été privilégié par rapport à Electron pour plusieurs raisons :
- **Empreinte mémoire réduite** : Utilisation du composant Webview natif du système (WebView2 sous Windows) plutôt que d'embarquer Chrome.
- **Sécurité** : Les permissions système (accès aux fichiers, fenêtre de dialogue) sont explicitement déclarées et limitées dans `tauri.conf.json`.
- **Portabilité** : Permet la compilation d'un `.exe` unique et portable très demandé dans le milieu industriel où les droits d'administration sont limités.

### 2. Base de Données: SQLite local
Le plugin `@tauri-apps/plugin-sql` interagit via une couche Rust avec une base SQLite asynchrone générée dynamiquement sous le dossier `AppData` de l'utilisateur.
- Pas de réseau requis. Les migrations s'exécutent automatiquement au premier lancement.
- Un abstracteur asynchrone (TypeScript `db.ts`) protège le frontend contre la syntaxe DB et gère le parsing JSON pour la construction de modèles type-safe dans React.

### 3. Frontend: React 18 + Vite + Tailwind CSS
- **React 18** a été choisi pour sa stabilité et son excellente interaction avec les hooks pour le state local asynchrone induit par la DB distante de Tauri via IPC.
- **Vite** est utilisé en tant qu'outil de bundling pour garantir des temps de transpilation marginaux et fournir les assets statiques très légers à Tauri.
- **Tailwind CSS** a permis la construction rapide des composants "Neon High-Contrast" identifiés à partir des maquettes de conception (Stitch Agent Design Tokens).

### 4. Extensions de Fonctionnalités
- Les modèles d'e-mails utilisent le schéma URI standard `mailto:` supporté par les navigateurs embarqués. 
- Les exports Excel tirent parti de la librairie un-opiniatré `exceljs` qui génère de façon synchrone le binaire en `ArrayBuffer` sans manipulation DOM, injecté via la couche OS (Rust) pour éviter les limitations du File System Web.
