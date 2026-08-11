# CAMPHOTOS

Visionneuse pour vidéos d’inspection (caméra canalisation) avec capture photo en un clic.

## Installer sur Mac

1. Télécharge l’installateur :  
   [CAMPHOTOS-1.0.2-arm64.dmg](https://github.com/3snv83136-coder/camphotos/releases/latest/download/CAMPHOTOS-1.0.2-arm64.dmg)
2. Ouvre le DMG → double-clique **Installer.command** (recommandé)  
   ou glisse **CAMPHOTOS** dans **Applications**
3. Si macOS dit « endommagé » : ouvre Terminal et colle :
   `xattr -cr /Applications/CAMPHOTOS.app` puis relance l’app

Captures par défaut : `Documents/CAMPHOTOS/captures`

Sur le site web (Mac), une bannière **Installer sur Mac** propose le même téléchargement.

## App Mac (développement)

```bash
npm install
npm run app        # lancer
npm run dist:mac   # rebuild DMG + zip
```

## Web / serveur local

```bash
npm start
```

Ouvre [http://localhost:3847](http://localhost:3847)

## Usage

1. Ouvre une vidéo
2. Ajuste la vitesse (− / +)
3. Capture avec le bouton ou la touche `C`
