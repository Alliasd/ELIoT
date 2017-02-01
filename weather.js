
var CoapNode = require('./index.js');
var SmartObject = require('smartobject');
var config = require('./lib/config');
var weather = require('openweathermap');
var fs = require('fs');
var shortid = require('shortid');

var so = new SmartObject;
var ID = shortid.generate();
var cnode = new CoapNode('Weather'+'_'+ID, so);

//LWM2M Server ip
var ip = process.argv[2];

// Try to find a real temperature sensor and its location
var status = false;
var num = getRandomArbitrary(-90, 90);
var latitude = (Math.round(num*10) / 100).toString();
num = getRandomArbitrary(-180, 180);
var longitude = (Math.round(num*10) / 100).toString();
var mode = process.argv[2];
find(mode);

// Init objects+resources

// Temperature sensor
var temperature = [];
//var start = new Date();
var list = [];
var heating = false;
so.init(3303, 0, {
    5700: {                                               // Sensor value
      read: function (cb) {
        if (status === true) {
          weather.defaults ({units:'metric', lang:'en', mode:'json'});
          weather.now ({lat:latitude, lon:longitude, APPID:'a7a67efb8526ba99aeb2b8f0d63cc18a'},function(err, json) {
            if (err) {
              cb('4.04');
            } else {
              var temp = Number(json.main['temp']);
              temperature.push(temp);

              so.read('3308','0','5900', function(err,value) {
                if (temp < value && Boolean(heating) === false) {
                  cnode.multicast('/3306/0/5850', 'PUT', 1, function(err, rsp) {
                    if (err) {
                      console.log(err);
                    }
                    heating = true;
                  });
                } else if (temp >= value && Boolean(heating) === true){
                  cnode.multicast('/3306/0/5850', 'PUT', 0, function(err, rsp) {
                    if (err) {
                      console.log(err);
                    }
                    heating = false;
                  });
                }
              });

              cb(null, temp);
            }
          });
        } else {
            var temp = getRandomArbitrary(0, 30);
            var rounded = Math.round(temp*10) / 10;
            temperature.push(rounded);

            so.read('3308','0','5900', function(err,value) {
              if (rounded < value && Boolean(heating) === false) {
                cnode.multicast('/3306/0/5850', 'PUT', 'true', function(err, rsp) {
                  if (err) {
                    console.log(err);
                  }
                  heating = true;
                });
              } else if (rounded >= value && Boolean(heating) === true){
                cnode.multicast('/3306/0/5850', 'PUT', 'false', function(err, rsp) {
                  if (err) {
                    console.log(err);
                  }
                  heating = false;
                });
              }
            });
            cb(null, rounded);
        }
      }
    },
    5701: 'Cel',                                         // Unit
    5601: {                                              // Min measured value
      read: function(cb) {
        if (temperature.length > 0) {
          var min = Math.min.apply(null, temperature);
          cb(null,min);
        } else {
          cb('4.05');
        }
      }
    },
    5602: {                                             // Max measured value
      read: function(cb) {
        if (temperature.length > 0) {
          var max = Math.max.apply(null, temperature);
          cb(null,max);
        } else {
          cb('4.05');
        }
      }
    },
    5603: 0.00,                                        // Min range measured value
    5604: 30.0,                                         // Max range measured value
    5605: {                                             // Reset
      exec: function(cb) {
        if (temperature.length > 0) {
          var value = temperature[temperature.length-1];
          temperature = [];
          temperature.push(value);
          cb(null);
        } else {
          cb('4.00');
        }
      }
    }
});


// Humidity Sensor
var humidity = [];
so.init(3304, 0, {
  5700: {                                               // Sensor value
    read: function (cb) {
      if (status === true) {
        weather.defaults ({units:'metric', lang:'en', mode:'json'});
        weather.now ({lat:latitude, lon:longitude, APPID:'a7a67efb8526ba99aeb2b8f0d63cc18a'},function(err, json) {
          if (err) {
            cb('4.04');
          } else {
            var humi = json.main['humidity'];
            humidity.push(humi);
            cb(null, humi);
          }
        });
      } else {
            var humi = getRandomArbitrary(0, 100);
            var rounded = Math.round(humi*10) / 10;
            humidity.push(rounded);
            cb(null, rounded);

      }
    }
  },
  5701: '%',                                         // Unit
  5601: {                                            // Min measured value
    read: function(cb) {
      if (humidity.length > 0) {
        var min = Math.min.apply(null, humidity);
        cb(null,min);
      } else {
        cb('4.05');
      }
    }
  },
  5602: {                                             // Max measured value
    read: function(cb) {
      if (humidity.length > 0) {
        var max = Math.max.apply(null, humidity);
        cb(null,max);
      } else {
        cb('4.05');
      }
    }
  },
  5603: '0',                                          // Min range measured value
  5604: 100.0,                                        // Max range measured value
  5605: {                                             // Reset
    exec: function(cb) {
      if (humidity.length > 0) {
        var value = humidity[humidity.length-1];
        humidity = [];
        humidity.push(value);
        cb(null);
      } else {
        cb('4.00');
      }
    }
  }
});

// Set point
var point = 15.0;
so.init(3308, 0, {
  5900: {
    read: function (cb) {
      cb(null, point);
    },
    write: function (val, cb) {
      point = val;
      cb(null, point);
    }
  },
  5701: 'Cel',
  5750: 'Temperature limit'
});

// Security Object
so.init(0, 0, {
  0: {                                                 // ServerURI
    exec: function(cb) {
      var serverURI = 'coap://' + cnode._serverIp + ':' + cnode._serverPort;
      console.log(serverURI);
      cb(null, serverURI);
    }
  }
});

// Server Object
var min, max;
so.init(1, 0, {
  0: getRandomInt(1, 65535),                           // ServerID
  1: {                                                 // Lifetime
    read: function(cb) {
      cb(null, cnode.lifetime);
    },
    write: function(val, cb) {
      cnode.lifetime = Number(val);
      cb(null, cnode.lifetime);
    }
  },
  2: {
    read: function(cb) {
      cb(null, min || config.defaultMinPeriod);
    },
    write: function(val, cb) {
      min = Number(val);
      cb(null, min);
    }
  },
  3: {
    read: function(cb) {
      cb(null, max || config.defaultMaxPeriod);
    },
    write: function(val, cb) {
      max = Number(val);
      cb(null, max);
    }
  },
  8: {                                                // Update
    exec: function(cb) {
      update();
      cb(null);
    }
  }
});

var number = getRandomInt(1, 1000);
// Device Object
so.init(3, 0, {
  0: 'Manufactorer1'+number,		                     // Manufactorer name
  1: getRandomInt(1, 10000).toString(),              // Model number
  4: {
    exec: function(cb) {                             // Reboot
      reboot();
      cb(null);
    }
  },
  5: {                                               // Reset
    exec: function(cb) {
      cnode.lifetime = 86400;
      min = config.defaultMinPeriod;
      max = config.defaultMaxPeriod;
      cb(null);
    }
  },
  16: 'U'                                           // Binding mode
});

// Location Object
so.init(6, 0, {
  0: {                                              // Latitude
    read: function(cb) {
      cb(null, latitude);
    }
  },
  1: {                                              // Longitude
    read: function(cb) {
      cb(null, longitude)
    }
  },
  5: Math.floor(Date.now() / 1000)                  // Timestamp
});

// Connection Monitoring
so.init(4, 0, {
  4: {
    read: function(cb) {
      cb(null, cnode.ip);
    }
  },
  5: {
    read: function(cb) {
      cb(null, cnode.so.connMonitor[0].routeIp);
    }
  }
});

// Exec Functions

// Reboot
function reboot() {
  cnode.deregister(function (err, rsp) {
      if (err) {
        console.log(err);
      } else {
        cnode.register(ip, 5683, function (err, rsp) {
          if (err) {
            console.log(err);
          }
            console.log(rsp);
        });
      }
      console.log(rsp);
  });
};

// Update
function update() {
  // Set lifetime, version attributes
  cnode.update({lifetime: cnode.lifetime}, {version: '1.0.0'}, function (err, rsp) {
    if(err) {
      console.log(err);
    }
    console.log(rsp);   // { status: '2.04' }
  });
}

// Support functions

// Find sensor data from http://openweathermap.org/
function find(mode) {
  if (mode === '-t')  {
    weather.defaults ({units:'metric', lang:'en', mode:'json'});
    weather.now ({lat:latitude, lon:longitude, APPID:'a7a67efb8526ba99aeb2b8f0d63cc18a'},function(err, json) {
      console.log('Weather station: ' + json.name + ', ' + json.sys['country']);
      latitude = json.coord['lat'].toString();
      longitude = json.coord['lon'].toString();
      status = true;
      cnode.city = json.name;
      });
  } else {
    console.log('Sensor with random data');
  }
};

// Random float number generator
function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
};

// Random integer
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
};


// Events

// This event fired when the device registered (2.01).
cnode.on('registered', function () {
  console.log('registered');

  // Client terminated -> de-register
  process.on('SIGTERM', function() {
    process.stdout.write('\n');
    cnode.deregister(function (err, rsp) {
        if (err) {
          console.log(err);
        }
        //console.log(rsp);
        process.exit();
    });
  });

  process.on('SIGINT', function() {
    process.stdout.write('\n');
    cnode.deregister(function (err, rsp) {
        if (err) {
          console.log(err);
        }
        //console.log(rsp);
        process.exit();
    });
  });
});


// This event fired when there is an error occurred.
cnode.on('error', function(err, rsp) {
    console.log(err);
    //console.log(rsp);
});

// Multicast
cnode.on('multicast', function() {
  //console.log('multicast');
});

// This event fired when the device attributes updated (2.04).
cnode.on('updated', function (err, rsp) {
    console.log('updated');
});

// This event fired when the device de-registered (2.02).
cnode.on('deregistered', function () {
    console.log('deregistered');
});


// Register
cnode.register(ip, 5683, function (err, rsp) {
    if (err) {
      console.log(err);
    }
    //console.log(rsp);
});
