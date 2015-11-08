
sudo apt-get install mongodb -y

curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -
sudo apt-get install -y nodejs

sudo cp /vagrant/conf/mongodb.conf /etc/
sudo service mongodb restart
