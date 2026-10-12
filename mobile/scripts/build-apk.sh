#!/usr/bin/env bash
# Builds a signed release APK for sideloading: mobile/dist/rbs-timetable-<version>.apk
#
# Needs Android Studio (for its JDK and SDK) and the release key in
# ~/.timetabler-android (release.keystore + keystore-password.txt). Every
# update must be signed with that same key, so keep a backup of that folder.
set -euo pipefail

cd "$(dirname "$0")/.."
KEYS="${TIMETABLER_KEYS:-$HOME/.timetabler-android}"
export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
BUILD_TOOLS="$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)"
# Real phones only (64- and 32-bit ARM); x86 builds are just for emulators on Intel PCs
export ORG_GRADLE_PROJECT_reactNativeArchitectures="${ARCHS:-arm64-v8a,armeabi-v7a}"

[ -f "$KEYS/release.keystore" ] || { echo "Missing $KEYS/release.keystore" >&2; exit 1; }

npx expo prebuild --platform android --clean --no-install
(cd android && ./gradlew assembleRelease --console=plain -q)

VERSION="$(node -p "require('./app.config.js').expo.version")"
mkdir -p dist
OUT="dist/rbs-timetable-$VERSION.apk"
"$BUILD_TOOLS/apksigner" sign \
  --ks "$KEYS/release.keystore" \
  --ks-key-alias rbs-timetable \
  --ks-pass "file:$KEYS/keystore-password.txt" \
  --key-pass "file:$KEYS/keystore-password.txt" \
  --out "$OUT" \
  android/app/build/outputs/apk/release/app-release.apk
"$BUILD_TOOLS/apksigner" verify "$OUT"
echo "Built $OUT"
