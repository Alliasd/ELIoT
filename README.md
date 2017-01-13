# Emulated IoT (ELIOT) Platform

Emulated IoT platform for testing purposes.

## Table of Contents

1. [Overview](#Overview)  
2. [LWM2M Server](#Server)  
3. [LWM2M Clients](#Client)  
4. [Usage with Docker](#Usage)  

<a name="Overview"></a>
Overview

The Emulated IoT (ELIOT) platform enables emulating simple IoT devices on Docker. It is based on libraries, [coap-node](https://github.com/PeterEB/coap-node) and [Leshan](https://github.com/eclipse/leshan), which implement device management over CoAP and LWM2M. Devices consisting of simple sensors and actuators can be built using IPSO objects. The current implementation provides ready-to-use devices, such as weather observer, presence detector, light controller and radiator, which can communicate directly (with multicast) and interact with the LWM2M Server.

<a name="Server"></a>
## LWM2M Server

Leshan-based server is used for management. Leshan server demo with instructions can be found from: https://github.com/eclipse/leshan

<a name="Client"></a>
## LWM2M Clients (devices)

LWM2M Clients are implemented using coap-node library. APIs and more information can be found from: https://github.com/PeterEB/coap-node

The library is slightly modified to support java-based Leshan demo server and docker containers. The edits are the following:

1. Function *CoapNode.prototype._updateNetInfo()* is used to find network information of the client, such as IP address, MAC address and port number. However, inside a Docker container the network module can't find any active networks and the registration fails. Thus, a new function called *network.get_interfaces_list(callback)* is added to find the network information inside a container.

2. Function *CoapNode.prototype.register(ip, port, callback)* is used to register the LWM2M Client to the Server. Before the registration request is sent to the Server, location path should be modified to self.locationPath = '/rd/' + rsp.headers['Location-Path'], where rd refers to the resource directory.

3. Function *cutils.encodeJsonObj(path, value)* is modified to not include executable resources on the ObjInJson. Also adding the plain resource values to ObjInJson is slightly modified.

4. To support Create operation, function *CoapNode.prototype.createInst(oid, iid, value, callback)* is implemented. It takes the target object ID, instance ID and resources wrapped in an object as parameters and creates a new object instance with defined resources. Also a corresponding request handler was created with a function serverCreateHandler(cn, req, rsp), where cn is the CoapNode object, req is the request from Server and rsp is the response, which is sent to the Server in the end. The request handler first decodes the JSON formatted payload and then initialize the new object instance with given resources.

5. Multicast functionality is added. Hence, a function *CoapNode.prototype.multicast(path, method, value, callback)* was created. It takes the object path (eg. /3303/0/5700), method (eg. PUT) and value (payload) as parameters and creates a multicast request. Also a function *startMultiListener(cn, callback)* was created to make the clients to listen the multicast address. This needs to be called inside register function (see number 2). One condition is also added to *CoapNode.prototype.request(reqObj, ownAgent, callback)* function.

6. Function *CoapNode.prototype._enableReport(oid, iid, rid, rsp, callback)* is modified to support observation with Leshan.


The library still has the following limitations:

* No DTLS support
* No Bootstrap Interface implemented
* No support for objLnk data format
* No support for Delete method


### Virtual IoT devices:

There are several IoT devices, each of which has a separate javascipt file.

IoT-Device | JavaScript-file | Dockerfile | Docker-compose
------------ | -------------- | ----------|---------------
WeatherObserver | weather.js | Dockerfile | docker-compose.yml
Radiator | radiator.js
LightController | light_control.js
PresenceDetector | presence.js

**IPSO Objects & resources implemented**:

* The weather.js implements an IPSO temperature sensor (ID 3303) and humidity sensor (ID )
* The radiator.js implements an IPSO ON/OFF switch (ID).
* The light_control.js implements an IPSO lightcontrol actuator (ID).
* The presence.js implements an IPSO presence sensor (ID).

<a name="Usage"></a>
## Usage with Docker:


**Set up LWM2M Server**

Pull the Leshan image with the command:

```
docker pull gebart/leshan
```
Run the server with the command:
```
docker run -p 8080:8080/tcp -p 5683:5683/udp
```

**Set up the LWM2M CLients (devices)**

Check the registration address of register(ip, port) function in the javaScript files and set the correct LWM2M Server address. Docker assigns address typically from pool 172.17.0.0/16. Thus, the server address is 172.17.0.x. (You see the correct address when server is started).

Build the image for the devices with provided Dockerfile using command:
```
docker build -t `<image_name>` .
```
Now, the different clients can be run by specifying the correct javascript file within the run command:
```
docker run -e FILE=`<jsfile_name>` -it `<image_name>`
```

**Set up Docker-compose**

Build the images for docker-compose with the command:
```
docker-compose build
```
Run the clients and server with the following command:
```
docker-compose up
```
If you want to run multiple devices you can use the scaling option with the following command:
```
docker-compose scale server=1 weather=1 presence=1 heating=X light=X
```
**Notice**: the server need to be defined first, also the amount PresenceDetectors and WeatherObservers are kept as one, because they are sending multicast messages, which may be problematic with multiple instances of them. You can choose the number of radiators and lightcontrollers.

