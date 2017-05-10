#! /bin/sh
### BEGIN INIT INFO
# Provides:          diagnostical
# Required-Start:    $remote_fs $syslog
# Required-Stop:     $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: DIAGNOSTICAL
# Description:     

#Deploy the current repo state (Usually set to the latest tag)
#This scripts can be attached to linux vps ubuntu

#How to install

#   su -c "chmod +x diagnostical= && cp diagnostical /etc/init.d/. && update-rc.d diagnostical defaults"

#How to Remove

#   su -c "update-rc.d -f diagnostical-startup.sh remove"


### END INIT INFO

# Author: Javier Arancibia <arancibiajav@gmailc.om>

ROOT=/data/www/diagnostical.fr/httpdocs/diags

case "$1" in
 start)
   su -c $ROOT/deploy_current.sh > $ROOT/deploy_current.log
   ;;
 stop)
   #su -c pm2 stop diags
   #su -c pm2 delete diags
   sleep 10
   ;;
 restart)
   su -c $ROOT/deploy_current.sh > $ROOT/deploy_current.log
   sleep 10
   ;;
 *)
   echo "Usage: diagnostical {start|stop|restart}" >&2
   exit 3
   ;;
esac