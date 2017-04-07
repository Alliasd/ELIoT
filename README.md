# Emulated IoT (ELIOT) Platform

The Emulated IoT (ELIOT) platform enables emulating simple IoT devices on Docker. It is based on libraries, [coap-node](https://github.com/PeterEB/coap-node) and [Leshan](https://github.com/eclipse/leshan), which implement device management over CoAP and LWM2M. Devices consisting of simple sensors and actuators can be built using IPSO objects. The current implementation provides ready-to-use devices, such as weather observer, presence detector, light controller and radiator.

More detailed information about ELIOT can be found from [wiki](https://github.com/Alliasd/ELIOT/wiki)

**This module implements the following LWM2M interfaces & operations:**


| Bootstrap | Register   | Device Management & Service Enablement | Information Reporting |
| --------- | ---------- | -------------------------------------- | ---------------------
| Bootstrap | Register   | Read (Text/JSON/TLV)  | Observe (Text/JSON/TLV) |
|           | Update     | Write (Text/JSON/TLV) | Notify (Text/JSON/TLV)  |
|           | Deregister | Create (JSON/TLV)     | Cancel                  |
|           |            | Execute               |                         |
|           |            | Delete                |                         |
|           |            | Write attributes      |                         |


## Usage with Docker

1. Run the LWM2M Server:

   `docker run --rm -ti --name ms corfr/leshan `

2. Run the LWM2M Bootstrap Server:

   `docker run --rm -ti --name bss --link ms corfr/leshan bootstrap`

3. Run the devices (PresenceDetector | WeatherObserver | LightController | Radiator):  

   **Without Bootstrap Server**

   `docker run -it --link ms alliasd/eliot <jsfile_name> ms [OPTIONS]`

   **With Bootstrap Server**

   `docker run -it --link bss --link ms alliasd/eliot <jsfile_name> bss [OPTIONS]`

   ```
   JS-files:
   * presence.js
   * weather.js
   * light_control.js
   * radiator.js

   Options:
   -b          Bootstrap mode
   -t          Real Weather data (only WeatherObserver)
   ```

   **Note**: instead of using the name ms/bss you can use the IP address without the --link flags.

4. Run multiple clients with docker-compose

   `docker-compose up`

   `docker-compose scale weather=X presence=X radiator=X light=X`
