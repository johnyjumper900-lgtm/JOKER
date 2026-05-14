#!/bin/bash

# Script de préparation pour Capacitor

echo "🚀 Génération du build client..."
npm run build

# Définir le répertoire de build (adapté à ce projet)
BUILD_DIR="dist/client"
MOBILE_DIST="mobile-dist"

echo "📦 Structuration du dossier $MOBILE_DIST..."
rm -rf $MOBILE_DIST
mkdir -p $MOBILE_DIST

# Copier le contenu du build
if [ -d "$BUILD_DIR" ]; then
    cp -r $BUILD_DIR/* $MOBILE_DIST/
else
    echo "❌ Erreur: Répertoire de build $BUILD_DIR non trouvé."
    exit 1
fi

echo "🖼️ Copie forcée des assets..."
mkdir -p $MOBILE_DIST/assets
cp src/assets/ball.png $MOBILE_DIST/assets/ball.png

echo "⚙️ Configuration de Capacitor..."
CAPACITOR_CONFIG="capacitor.config.json"
cat > $CAPACITOR_CONFIG <<EOF
{
  "appId": "com.coach.app",
  "appName": "CoachApp",
  "webDir": "$MOBILE_DIST",
  "bundledWebRuntime": false
}
EOF

echo "✅ Dossier $MOBILE_DIST est prêt pour Capacitor."
