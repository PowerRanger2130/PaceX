#!/usr/bin/env bash
rm -rf /var/www/private
rm -rf /var/www/public
rm -rf /home/gls/db/server

cp -r /home/gls/Documents/GitHub/PaceX/webpages/private/dist /var/www/private
cp -r /home/gls/Documents/GitHub/PaceX/webpages/public/dist /var/www/public
cp -r /home/gls/Documents/GitHub/PaceX/server /home/gls/db/

systemctl restart apache2
systemctl restart pacex-server