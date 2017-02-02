# Set up multi-host environment

Instructions to set up multi-host environment for Windows and Linux systems with Docker swarm mode.

## Table of Contents

1. [Overview](#Overview)  
2. [Linux](#Linux)  
3. [Windows](#Windows)
4. [Swarm](#Swarm)  


<a name="Overview"></a>
## Overview

Multi-host environment can be setup with multiple physical and virtual machines. On Windows systems, swarm multi-node scenarios require Docker Machine to create multiple swarm nodes (local VMs). Docker for Windows uses Microsoft Hyper-V driver for virtualization.

The following instructions summarize the steps for creating a multi-host environment. More detailed information about Hyper-V driver, Docker Machine and Docker swarm mode:

https://docs.docker.com/machine/drivers/hyper-v/

https://docs.docker.com/machine/get-started/

https://docs.docker.com/engine/swarm/swarm-tutorial/



## Linux

**Install Docker for Linux**

Install Docker Engine on Linux by following the guide provided here:
https://docs.docker.com/engine/installation/

Install Docker Machine for multi-node scenarios:
https://docs.docker.com/machine/install-machine/

And you are good to go!

**Create virtual machines**

If you want to have multiple nodes on the Linux host, spin up virtual machines with the following command:

`docker-machine create -d <driver> <node_name>`

<a name="Windows"></a>
## Windows

**Install Docker for Windows**

Docker for Windows is for Windows 10 Pro, Education or Enterprise. If you have other distribution of Windows, install Docker Toolbox.

**Set up Hyper-V driver (no Toolbox)**

1. Check that Hyper-V is enabled
  * On search bar type "turn windows features on or off" and select that item
  * Enable Hyper-V from the list (if not enabled already)
2.  Set up a new external network switch
  * Open **Hyper-V manager**.
  * Select the Virtual Switch Manager on the Actions panel.
  * Set up a new external network switch with a name of your choosing.
3. Reboot

**Create a virtual machine**

1. Create a machine with the following command and use the Hyper-V driver and the virtual switch created before:

  `docker-machine create -d hyperv --hyperv-virtual-switch <switch_name> <node_name>`

  Example of creating a machine called my-vm:
  ```
  PS C:\WINDOWS\system32> docker-machine create -d hyperv --hyperv-virtual-switch my-vmswitch my-vm
  Running pre-create checks...
  Creating machine...
  (my-vm) Copying C:\Users\Alli\.docker\machine\cache\boot2docker.iso to C:\Users\Alli\.docker\machine\machines\my-vm\boot2docker.iso...
  (my-vm) Creating SSH key...
  (my-vm) Creating VM...
  (my-vm) Using switch "my-vmswitch"
  (my-vm) Creating VHD
  (my-vm) Starting VM...
  (my-vm) Waiting for host to start...
  Waiting for machine to be running, this may take a few minutes...
  Detecting operating system of created instance...
  Waiting for SSH to be available...
  Detecting the provisioner...
  Provisioning with boot2docker...
  Copying certs to the local machine directory...
  Copying certs to the remote machine...
  Setting Docker configuration on the remote daemon...
  Checking connection to Docker...
  Docker is up and running!
  To see how to connect your Docker Client to the Docker Engine running on this virtual machine, run: C:\Program Files\Docker\Docker\Resources\bin\
  docker-machine.exe env my-vm
  ```
2. Get the environment commands for your new VM. This is done with the following command:

  `docker-machine env <node_name>`

  Example of the output:
  ```
  PS C:\WINDOWS\system32> docker-machine env my-vm
  $Env:DOCKER_TLS_VERIFY = "1"
  $Env:DOCKER_HOST = "tcp://192.168.43.149:2376"
  $Env:DOCKER_CERT_PATH = "C:\Users\Alli\.docker\machine\machines\my-vm"
  $Env:DOCKER_MACHINE_NAME = "my-vm"
  $Env:COMPOSE_CONVERT_WINDOWS_PATHS = "true"
  # Run this command to configure your shell:
  # & "C:\Program Files\Docker\Docker\Resources\bin\docker-machine.exe" env my-vm | Invoke-Expression
  ```

3. Connect your shell to the new machine.

  `& "C:\Program Files\Docker\Docker\Resources\bin\docker-machine.exe" env my-vm | Invoke-Expression`

4. Repeat the previous steps to create multiple machines.

5. Connect to your machine with ssh:

  `docker-machine ssh <node_name>`

  **Note:** if Toolbox is used, just define the driver as virtualbox and give a name for the machine. Docker machine named "default" should already exist.


<a name="Swarm"></a>
## Swarm ##

**Get the IP address for the manager node**

1. **Linux**: Check the available network interfaces with ifconfig and the IP address.
2. **Windows**: The IP address of the docker-machine can be retrieved with the `docker-machine ip <node_name>` command.

**Create a swarm**

1. Initialize a swarm with the following command on the manager node:

   `docker swarm init --advertise-addr <MANAGER-IP>`

   An Example to create a manager node called manager:
   ```
   $ docker swarm init --advertise-addr 192.168.10.63
   Swarm initialized: current node (d2zln25n3g7g7f7xpt9tl209q) is now a manager.

   To add a worker to this swarm, run the following command:

      docker swarm join \
      --token SWMTKN-1-2kmjs07xlbg0ssm983lsk5omupgfci6z2epmtvq6iqgbssyxt8-57zc17uyat7yu2yx7acbg5s9h \
      192.168.10.63:2377

  To add a manager to this swarm, run 'docker swarm join-token manager' and follow the instructions.
  ```

2. Add worker nodes to the swarm. Run the command produced by the previous step on the worker machines to join the swarm:
  ```
  $ docker swarm join \
    --token  SWMTKN-1-49nj1cmql0jkz5s954yi3oex3nedyz0fb0xx14ie39trti4wxv-8vxv8rssmk743ojnwacrr2e7c \
    192.168.99.100:2377

  This node joined a swarm as a worker.
  ```

**Create an overlay network**

Create an overlay network to be able to attach multiple services to the same network with the following command:

 `docker network create -d overlay --subnet <subnet> <network_name>`

**Add service**

Create a service on the manager machine with the following command:

`docker service create --network <network_name> --replicas <num_of_instances> --name <service_name> <image_name>`

Example of deploying a service called leshan on the mynet network:

`docker service create --network mynet --replicas 1 --name leshan gebart/leshan`

**Note**: if you are using an image from your private repository (eg. Docker hub), login to your repo and add `--with-registry-auth` flag (without any value).
