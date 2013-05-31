#!/bin/sh

echo Deleting build directory...
rm -rf build

echo Creating build directory...
mkdir build
cd build

echo Copying Theseus from HEAD...
(cd ..; git archive --format=tar --prefix=theseus/ HEAD) | tar x

echo Checking out npm modules...
cd theseus
npm install
cd ..

echo Extracting version number...
VERSION=`node -e 'console.log(require("./theseus/package.json").version)'`
echo Got $VERSION

echo Compressing...
zip -qr theseus-$VERSION.zip theseus
