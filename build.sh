#!/bin/sh

echo
echo WARNING:
echo This will only work on Tom\'s computer!
echo
echo [press enter]
read blah

echo Deleting build directory...
rm -rf build

echo Creating build directory...
mkdir build
cd build

echo Copying /Applications/Brackets.app...
cp -R /Applications/Brackets.app .

echo Deleting dev symlink...
rm Brackets.app/Contents/dev

echo Copying ~/src/brackets/src/ to Brackets.app/Contents/www/
cp -R ~/src/brackets/src Brackets.app/Contents/www

echo Copying ~/src/brackets/samples/ to Brackets.app/Contents/www/
cp -R ~/src/brackets/samples Brackets.app/Contents/samples

echo Clearing dev extensions
rm -rf Brackets.app/Contents/www/extensions/dev/
mkdir Brackets.app/Contents/www/extensions/dev/

echo Copying ~/src/theseus/brackets-theseus/ to extensions directory
cp -R ~/src/theseus/brackets-theseus Brackets.app/Contents/www/extensions/dev/

echo Copying ~/src/brackets/src/extensions/dev/brackets-node-client/ to extensions directory
cp -R ~/src/brackets/src/extensions/dev/brackets-node-client Brackets.app/Contents/www/extensions/dev/

echo Compressing...
zip -qr Brackets.zip Brackets.app
