#!/usr/bin/env bash
rm -rf /var/www/private
rm -rf /var/www/public
rm -rf /home/gls/db/server

cp -r /home/gls/github/Documents/PaceX/private /var/www/
cp -r /home/gls/github/Documents/PaceX/public /var/www/
cp -r /home/gls/github/Documents/PaceX/server /home/gls/db/

systemctl restart apache2