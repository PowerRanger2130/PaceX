#!/usr/bin/env bash
rm -rf /var/www/private
rm -rf /var/www/public

cp -r /home/gls/Documents/GitHub/PaceX/webpages/private /var/www/
cp -r /home/gls/Documents/GitHub/PaceX/webpages/public /var/www/

systemctl restart apache2