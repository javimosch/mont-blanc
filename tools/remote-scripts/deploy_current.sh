#!/bin/sh
ROOT="/data/www/diagnostical.fr/httpdocs/diags"
DIR="prod"
PORT="8080"
#-----------
pm2 stop diags
pm2 delete diags
#kill -9 $(lsof -t -i:$PORT)
#kill -9 $(lsof -t -i:$PORT)
echo "PM2 diags off"
#-----------
echo "DEPLOY CURRENT (Only for tags >=1.3.0)"

echo "REMOVING PREVIOUS (FRESH INSTALL)"
sudo rm -r $ROOT/prod

#-----------
echo "INSTALLING"
cd $ROOT
mkdir $DIR
#rm $DIR/** -r
cd $ROOT
cp repo/* -r $DIR
cd $DIR
mkdir public/temp
#-----------
echo "UPDATING DEPENDENCIES"
cd $ROOT/$DIR
. /root/.nvm/nvm.sh
nvm install 6.9.0
nvm use 6.9.0
nvm list
#---
npm i -g pm2@latest
pm2 update
#---
rm -rf node_modules
npm cache clean
npm install
#-----------
echo "UPDATTING ENV"
cd $ROOT/$DIR
cp $ROOT/env_prod.conf .env
cd $ROOT
#-----------
cd $ROOT/$DIR
cat .env
#-----------
echo "DEPLOY SUCCESS"
#-----------
cd $ROOT/$DIR
pm2 start app.js -i 1 --name diags
echo "PM2 diags on"

