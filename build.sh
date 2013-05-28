#!/bin/sh

echo Deleting build directory...
rm -rf build

echo Creating build directory...
mkdir build
cd build

echo Checking out Theseus...
git clone https://github.com/adobe-research/theseus.git

echo Moving extension out and deleting repository...
mv theseus/brackets-theseus .
rm -rf theseus

echo Checking out npm modules...
cd brackets-theseus
npm install
cd ..

echo Extracting version number...
VERSION=`ruby -e 'require "json"; puts JSON.parse(File.read("brackets-theseus/package.json"))["version"]'`
echo Got $VERSION

echo Compressing...
zip -qr theseus-$VERSION.zip brackets-theseus
