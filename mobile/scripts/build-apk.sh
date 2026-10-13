#!/usr/bin/env bash
# Builds a signed release APK for sideloading: mobile/dist/rbs-timetable-<version>.apk
#
# Needs Android Studio (for its JDK and SDK) and the release key in
# ~/.timetabler-android (rbs-timetable.jks + keystore.properties), the key the
# installed app was first signed with. Every update must be signed with that
# same key, so keep a backup of that folder.
set -euo pipefail

cd "$(dirname "$0")/.."
KEYS="${TIMETABLER_KEYS:-$HOME/.timetabler-android}"
export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
BUILD_TOOLS="$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)"
# Real phones only (64- and 32-bit ARM); x86 builds are just for emulators on Intel PCs
export ORG_GRADLE_PROJECT_reactNativeArchitectures="${ARCHS:-arm64-v8a,armeabi-v7a}"

PROPS="$KEYS/keystore.properties"
[ -f "$PROPS" ] || { echo "Missing $PROPS" >&2; exit 1; }
prop() { sed -n "s/^$1=//p" "$PROPS"; }
STORE="$(prop storeFile)"
ALIAS="$(prop keyAlias)"
export STORE_PASS="$(prop storePassword)" KEY_PASS="$(prop keyPassword)"
[ -f "$STORE" ] || { echo "Missing $STORE" >&2; exit 1; }
[ -f "$KEYS/google-services.json" ] ||
  echo "No $KEYS/google-services.json: this build has no push notifications" >&2

npx expo prebuild --platform android --clean --no-install
(cd android && ./gradlew assembleRelease --console=plain -q)

VERSION="$(node -p "require('./app.config.js').expo.version")"
mkdir -p dist
OUT="dist/rbs-timetable-$VERSION.apk"
"$BUILD_TOOLS/apksigner" sign \
  --ks "$STORE" \
  --ks-key-alias "$ALIAS" \
  --ks-pass env:STORE_PASS \
  --key-pass env:KEY_PASS \
  --out "$OUT" \
  android/app/build/outputs/apk/release/app-release.apk
"$BUILD_TOOLS/apksigner" verify "$OUT"
echo "Built $OUT"
