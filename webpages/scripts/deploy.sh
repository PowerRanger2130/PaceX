#!/usr/bin/env bash
rm -rf /var/www/private
rm -rf /var/www/public

cp -r /home/ubuntu/website/private /var/www/
cp -r /home/ubuntu/website/public /var/www/