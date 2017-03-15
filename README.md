# Emulated IoT (ELIOT) Platform

Emulated IoT platform for testing purposes.

## Table of Contents

1. [Overview](#Overview)  
2. [LWM2M Server](#Server)  
3. [LWM2M Clients](#Client)  
4. [Setup & Usage with Docker](#Usage)
5. [Multi-host environment with Swarm](#Swarm)

<a name="Overview"></a>
## Overview

The Emulated IoT (ELIOT) platform enables emulating simple IoT devices on Docker. It is based on libraries, [coap-node](https://github.com/PeterEB/coap-node) and [Leshan](https://github.com/eclipse/leshan), which implement device management over CoAP and LWM2M. Devices consisting of simple sensors and actuators can be built using IPSO objects. The current implementation provides ready-to-use devices, such as weather observer, presence detector, light controller and radiator, which can communicate directly (with multicast) and interact with the LWM2M Server.

**This module implements the following LWM2M interfaces & operations:**


Bootstrap | Register | Device Management & Service Enablement | Information Reporting
-------- | ----------  | ----------------------------------- | ----------
Bootstrap | Register   | Read (Text/JSON/TLV)            | Observe (Text/JSON/TLV)
          | Update     | Write (Text/JSON/TLV)           | Notify (Text/JSON/TLV)
          | Deregister | Create (JSON/TLV)               | Cancel
          |            | Execute
          |            | Delete
          |            | Write attributes


**The module still has the following limitations:**

* No DTLS support
* No support for objLnk data format


<a name="Server"></a>
## LWM2M Server

Leshan-based server is used for the device management. Leshan server demo with instructions can be found from: https://github.com/eclipse/leshan

<a name="Client"></a>
## LWM2M Clients (devices)

LWM2M Clients are implemented using coap-node library. APIs and more information can be found from: https://github.com/PeterEB/coap-node

The library is slightly modified to support java-based Leshan demo server and docker containers. The edits are the following:

1. Function *CoapNode.prototype._updateNetInfo()* is used to find network information of the client, such as IP address, MAC address and port number. However, inside a Docker container the network module can't find any active networks and the registration fails. Thus, a new function called *network.get_interfaces_list(callback)* is added to find the **network information inside a container**.

2. To support **Create** operation, function *CoapNode.prototype.createInst(oid, iid, value, callback)* is implemented. It creates a new object instance with defined resources. Also a corresponding request handler *serverCreateHandler(cn, req, rsp)* is implemented.

3. To support **Delete** operation, a request handler *serverDeleteHandler(cn, req, rsp)* is implemented. It deletes the requested object instance.

4. **Multicast** functionality is added. Hence, a function *CoapNode.prototype.multicast(path, method, value, callback)* is created. Also a function *startMultiListener(cn, callback)* is created to make the clients to listen the multicast address. One condition is also added to *CoapNode.prototype.request(reqObj, ownAgent, callback)* function.

5. Function *CoapNode.prototype._enableReport(oid, iid, rid, rsp, callback)* is modified to support **observation** with Leshan.

6. **Bootstrapping** interface is implemented by adding a function *CoapNode.prototype.bootstrap(ip, port, callback)*. When bootstrap mode is used, client (device) sends a bootstrap request to the LWM2M Bootstrap Server and after the procedure is finnished, it registers to the LWM2M Server. A corresponding *serverBsHandler(cn, req, rsp)* is implemented to handle coming requests from the LWM2M BS Server.  


**Ready-to-use devices**

The ELIOT platform includes a few ready-to-use devices with specific JavaScript configuration files in folder /devices. In addition, ELIOT provides a Dockerfile and docker-compose.yml file to setup any device on Docker.  

IoT-Device | JavaScript-file | Dockerfile | Docker-compose
------------ | -------------- | ----------|---------------
WeatherObserver | weather.js | Dockerfile | docker-compose.yml
Radiator | radiator.js
LightController | light_control.js
PresenceDetector | presence.js


<a name="Usage"></a>
## Setup & Usage with Docker

#### Install Docker

**Linux:** Install [Docker Engine on Linux](https://docs.docker.com/engine/installation/) by following the instructions guide and you are good to go!

**Windows:** Install [Docker for Windows](https://docs.docker.com/docker-for-windows/) for Windows 10 Pro, Education or Enterprise. If you have other distribution of Windows, install [Docker Toolbox](https://docs.docker.com/toolbox/overview/).

#### Set up LWM2M Server

1. Pull the Leshan image with the command:

  `docker pull corfr/leshan`

2. Run the Server:

  **Server:** `docker run --rm -ti --name ms corfr/leshan `

  **Bootstrap Server:** `docker run --rm -ti --name bss --link ms corfr/leshan bootstrap`

  Example output of running the LWM2M Server:

  ```
  $ docker run --rm -ti --name ms corfr/leshan
  + SERVICE=server
  + java -jar ./leshan-server-demo.jar
  Feb 23, 2017 9:57:02 AM org.eclipse.californium.core.network.config.NetworkConfig createStandardWithFile
  INFO: Storing standard properties in file Californium.properties
  Feb 23, 2017 9:57:02 AM org.eclipse.californium.core.CoapServer start
  INFO: Starting server
  Feb 23, 2017 9:57:02 AM org.eclipse.californium.core.network.CoapEndpoint start
  INFO: Starting endpoint at 0.0.0.0/0.0.0.0:5683
  Feb 23, 2017 9:57:02 AM org.eclipse.californium.core.network.CoapEndpoint start
  INFO: Starting endpoint at 0.0.0.0/0.0.0.0:5684
  Feb 23, 2017 9:57:02 AM org.eclipse.californium.scandium.DTLSConnector start
  INFO: DTLS connector listening on [0.0.0.0/0.0.0.0:5684] with MTU [1,280] using (inbound) datagram buffer size [16,474 bytes]
  2017-02-23 09:57:02,124 INFO LeshanServer - LWM2M server started at coap://0.0.0.0/0.0.0.0:5683, coaps://0.0.0.0/0.0.0.0:5684.
  2017-02-23 09:57:02,214 INFO LeshanServerDemo - Web server started at http://172.17.0.2:8080/.

  ```

#### Set up the LWM2M Clients (devices)

1. Pull the Eliot image for the devices with the command:

  `docker pull alliasd/eliot`

  Or build the image from the Dockerfile with the command:

  `docker build -t <image_name> .`

2. Run the clients by specifying the correct javascript file, LWM2M Server/Bootstrap Server name (ms/bss) and optional parameters.

  **Server**: `docker run -it -e FILE="<jsfile_name> ms [OPTIONS]" --link ms <image_name>`

  **Bootstrap Server**: `docker run -it -e FILE="<jsfile_name> bss [OPTIONS]" --link bss --link ms <image_name>`
  ```
  Options:
  -b          Bootstrap mode
  -t          Real Weather data (only WeatherObserver)
  ```

  Example output:
  ```
  $ docker run -it -e FILE="weather.js bss -b" alliasd/eliot
  bootstrapped
  Sensor with random data
  registered
  ```
 **Note**: instead of using the name ms/bss you can use the IP address without the --link flags.
#### Set up Docker-compose

Docker-compose uses ".env" and "docker-compose.yml" files to configure the clients with the correct javascript files and IP addresses. You can modify the files, if you want to add new devices (services).

1. Build the images for docker-compose with the command:

  `docker-compose build`

2. Run the clients and server with the following command:

  `docker-compose up`

3. If you want to scale up the amount of devices, you can use the scaling option with the following command:

  `docker-compose scale weather=X presence=X radiator=X light=X`

## Multi-host environment with Swarm

#### Set up Hyper-V driver on Windows

If you are using Docker for **Windows**, Hyper-V driver needs to be setup first. If you arre using Linux, skip this step.

1. Check that Hyper-V is enabled
  * On search bar type "turn windows features on or off" and select that item
  * Enable Hyper-V from the list (if not enabled already)
2.  Set up a new external network switch
  * Open **Hyper-V manager**.
  * Select the Virtual Switch Manager on the Actions panel.
  * Set up a new external network switch with a name of your choosing.
3. Reboot

#### Create a virtual machine

If you want to have multiple nodes on the **Linux** host, spin up virtual machines with the following command:

`docker-machine create -d <driver> <node_name>`

If you are using Windows, follow these steps:

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

  **Note:** if Toolbox is used, just define the driver as virtualbox and give a name for the machine. Docker machine named "default" should already exist.

#### Get the IP address for the manager node

  1. Connect to your manager node with ssh:

      `docker-machine ssh <node_name>`

  2. **Linux**: Check the available network interfaces with ifconfig and the correct IP address.

    **Windows**: The IP address of the docker-machine can be retrieved with the `docker-machine ip <node_name>` command.

#### Create a swarm

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

#### Create an overlay network

  Create an overlay network to be able to attach multiple services to the same network with the following command:

   `docker network create -d overlay --subnet <subnet> <network_name>`

#### Add service

  Create a service on the manager machine with the following command:

  `docker service create --network <network_name> --replicas <num_of_instances> --name <service_name> -p <port_mapping> <image_name>`

  Example of deploying a service called leshan on the mynet network:

  `docker service create --network mynet --replicas 1 --name leshan -p 8080:8080 corfr/leshan`

  **Note**: if you are using an image from your private repository (eg. Docker hub), login to your repo and add `--with-registry-auth` flag (without any value).
