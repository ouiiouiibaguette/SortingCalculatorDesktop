# Configuration COPIL & Analytics Dashboard

## Période de Calcul par Défaut (7 Jours)

Le Dashboard est techniquement configuré pour afficher et exporter les données des **7 derniers jours incluant aujourd'hui**.

Le composant `Dashboard.tsx` calcule automatiquement cette période au chargement, et modifie les valeurs `exportStartDate` et `exportEndDate` en conséquence.

La vraie magie se passe dans le service `analytics.ts` :
1. Celui-ci reçoit la liste brute des tris (`logs`).
2. Il génère **tous les jours** entre `startDate` et `endDate` avec un compteur à `0`, afin que les graphiques (`Recharts`) n'aient jamais de sauts temporels ou de trous visuels.
3. Il calcule les métriques COPIL (`total_hours`, `weighted_cadence`...) en évitant les divisions par 0.

## Base de Données & SQLite

Le calcul se base sur la source de vérité SQLite intégrée par Tauri (`sqlite:sorting.db`), située dans le dossier AppData courant de l'OS. 

### Index de performance (Recommandés)
Le système fonctionnera bien pour 10 000+ logs en raison de SQLite.
Si votre DB grandit, le schéma est préparé pour :
`CREATE INDEX idx_sorting_logs_date ON sorting_logs(date_performed);`
Et le chargement sera instantané. Aujourd'hui, on passe par un parsing JS sur les 500 ou 5000 plus récents qui est largement suffisant pour du monitoring COPIL de petite-moyenne taille.

## Données Incomplètes & Qualité 
Les références dites "Inconnu" ou "N/A" sont filtrées et remplacées visuellement par `" — "`. Le Dashboard n'ajoute pas de widget (sans quoi il dérogerait aux design guidelines) mais place une étiquette subtile `Données incomplètes : X` à côté du titre du tableau.
Ces données incomplètes ne pénalisent pas les totaux d'heures ou de pièces (car le travail a bien été fait), mais exclut le client du "Top Client" ou "Top Référence".
