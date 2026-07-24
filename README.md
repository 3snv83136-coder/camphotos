# CAMPHOTOS

Visionneuse pour vidéos d’inspection (caméra canalisation) avec capture photo en un clic.

## App Mac (recommandé)

### Lancer en développement

```bash
npm install
npm run app
```

### Créer l’app téléchargeable (.app + .zip)

```bash
npm run dist:mac
```

Résultat dans `dist/` :
- `mac-universal/CAMPHOTOS.app` — glisse dans Applications
- `CAMPHOTOS-1.0.0-universal-mac.zip` — archive à partager

Au premier lancement (app non signée) : clic droit → **Ouvrir**.

Les captures vont par défaut dans :

`Documents/CAMPHOTOS/captures`

## Web (Vercel / navigateur)

Site statique dans `public/`. Choisis un dossier de sortie dans Chrome/Edge, ou télécharge chaque photo.

## Serveur local

```bash
npm start
```

Ouvre [http://localhost:3847](http://localhost:3847)

## Usage

1. Ouvre une vidéo
2. Ajuste la vitesse (− / +)
3. Capture avec le bouton ou la touche `C`
