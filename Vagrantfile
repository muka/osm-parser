
Vagrant.configure(2) do |config|
  config.vm.box_url = "https://cloud-images.ubuntu.com/vagrant/trusty/current/trusty-server-cloudimg-amd64-vagrant-disk1.box"
  config.vm.box = "trusty64"
  config.vm.network "private_network", ip: "192.168.77.10"
  config.vm.provision "shell", path: "provision.sh"
  config.vm.provider "virtualbox" do |vb|
    vb.memory = 4096
  end
end
