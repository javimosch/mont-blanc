#This scripts can be attached to linux vps ubuntu

#How to install

#   su -c "chmod +x diagnostical-startup.sh && cp diagnostical-startup.sh /etc/init.d/. && update-rc.d diagnostical-startup.sh defaults"


#How to Remove

#   su -c "update-rc.d -f diagnostical-startup.sh remove"



#Deploy the current repo state (Usually set to the latest tag)


ROOT="/data/www/diagnostical.fr/httpdocs/diags"
sh $ROOT/deploy_current.sh