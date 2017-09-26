
var CoapNode = require('coap-node');
var SmartObject = require('smartobject');
var weather = require('openweathermap');
var shortid = require('shortid');
var fs = require('fs');

var so = new SmartObject;
var ID = shortid.generate();
var cnode = new CoapNode('WeatherObserver'+'_'+ID, so);

// Config parameters
var ip = process.argv[2],
    bs = false,
    status = false,
    latitude = (Math.round(getRandomArbitrary(-90, 90)*10) / 100).toString(),
    longitude = (Math.round(getRandomArbitrary(-180, 180)*10) / 100).toString(),
    mode;

// Command line arguments
process.argv.forEach(function (val) {
    // Real Weather data
    if (val === '-t') {
        mode = val;
    }
    // Bootstrap
    if (val === '-b') {
        var http = require('http');
        bs = true;

        // Security Object
        so.init(0, 0, {0: 'coap://'+ip+':5683', 1: true, 2: 3});
        so.init(0, 1, {0: '', 1: false, 2: 3, 3: '', 4: '', 5: '', 6: 3, 7: '', 8: '', 9: '', 10: 0, 11: 0});

        // Server Object
        so.init(1, 1, {0: 1, 1: cnode.lifetime, 2: cnode._config.defaultMinPeriod, 3: cnode._config.defaultMaxPeriod, 6: false, 7: 'U'});

        // Send bootstrap information to BS Server
        var options = {
          hostname: ip,
          port: 8080,
          path: '/api/bootstrap/' + cnode.clientName,
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          }
        };

        var stream = fs.createReadStream('../data.json');
        var req = http.request(options, function(res) {
          // Send bootstrap request
          cnode.bootstrap(ip, 5683, function (err, rsp) {
              if (err) {
                console.log(err);
              }
          });
        });

        req.on('error', (e) => {
          console.log(`problem with request: ${e.message}`);
        });
        stream.pipe(req);
    }
});

// Init LWM2M objects

// Server Object
so.init(1, 0, {
  0: 0,                                                                         // ServerID
  1: cnode.lifetime,                                                            // Lifetime
  2: cnode._config.defaultMinPeriod,
  3: cnode._config.defaultMaxPeriod,
  6: false,
  7: 'U',
  8: {                                                                          // Update
    exec: function(attrs, cb) {
      update(attrs);
      cb(null);
    }
  }
});

// Device Object
so.init(3, 0, {
  0: 'Manu',              		                                                  // Manufactorer name
  1: getRandomInt(1, 100).toString(),                                           // Model number
  5: {                                                                          // Reset
    exec: function(cb) {
      reset();
      cb(null);
    }
  },
  16: 'U'                                                                       // Binding mode
});

// Location Object
so.init(6, 0, {
  0: latitude,                                                                  // Latitude
  1: longitude,                                                                 // Longitude
  5: Math.floor(Date.now() / 1000)                                              // Timestamp
});

// Connection Monitoring
so.init(4, 0, {
  4: cnode.ip,
  5: 'unknown'
});


// Init IPSO objects

// Temperature sensor
var temperature = [];
so.init(3303, 0, {                                                              // Sensor value
    5700: {
      read: function (cb) {
        if (status === true) {
          weather.defaults ({units:'metric', lang:'en', mode:'json'});
          weather.now ({lat:latitude, lon:longitude, APPID:'a7a67efb8526ba99aeb2b8f0d63cc18a'},function(err, json) {
            if (err) {
              cb('4.04');
            } else {
              var temp = Number(json.main['temp']);
              temperature.push(temp);

              // Write temp to file
              var d = new Date();
              fs.appendFile('tmp.csv', json.name + '\n' + d.getHours() + ',' + temp + '\n', function (err) {
                  if (err) {
                    console.log(err);
                  }
              });

              // Multicast to radiators
              /*var limit = so.get('3308', 0, '5900');
              if (temp < limit) {
                cnode.multicast('/3306/0/5850', 'PUT', 1, function(err, rsp) {
                  if (err) {
                    console.log(err);
                  }
                });
              } else if (temp >= limit) {
                cnode.multicast('/3306/0/5850', 'PUT', 0, function(err, rsp) {
                  if (err) {
                    console.log(err);
                  }
                });
              }*/
              cb(null, temp);
            }
          });
        } else {
            var temp = getRandomArbitrary(0, 30);
            temperature.push(temp);

            // Multicast to heaters
            /*var limit = so.get('3308', 0, '5900');
            if (temp < limit) {
              cnode.multicast('/3306/0/5850', 'PUT', 'true', function(err, rsp) {
                if (err) {
                  console.log(err);
                }
              });
            } else if (temp >= limit) {
              cnode.multicast('/3306/0/5850', 'PUT', 'false', function(err, rsp) {
                if (err) {
                  console.log(err);
                }
              });
            }*/
            cb(null, temp);
        }
      }
    },
    5701: 'Cel',                                                                // Unit
    5601: {                                                                     // Min measured value
      read: function(cb) {
        if (temperature.length > 0) {
          var min = Math.min.apply(null, temperature);
          cb(null, min);
        } else {
          cb('4.05');
        }
      }
    },
    5602: {                                                                     // Max measured value
      read: function(cb) {
        if (temperature.length > 0) {
          var max = Math.max.apply(null, temperature);
          cb(null,max);
        } else {
          cb('4.05');
        }
      }
    },
    5603: 0.0,                                                                  // Min range measured value
    5604: 30.0,                                                                 // Max range measured value
    5605: {                                                                     // Reset
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
  5700: {                                                                       // Sensor value
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
            humidity.push(humi);
            cb(null, humi);
      }
    }
  },
  5701: '%',                                                                    // Unit
  5601: {                                                                       // Min measured value
    read: function(cb) {
      if (humidity.length > 0) {
        var min = Math.min.apply(null, humidity);
        cb(null,min);
      } else {
        cb('4.05');
      }
    }
  },
  5602: {                                                                       // Max measured value
    read: function(cb) {
      if (humidity.length > 0) {
        var max = Math.max.apply(null, humidity);
        cb(null,max);
      } else {
        cb('4.05');
      }
    }
  },
  5603: 0.0,                                                                    // Min range measured value
  5604: 100.0,                                                                  // Max range measured value
  5605: {                                                                       // Factory Reset
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

/*
// Set point
var point = 15.2;
var application = 'Temperature limit';
so.init(3308, 0, {
  5900: point,
  5701: 'Cel',
  5750: application
});*/


// Exec Functions

// Update
function update(attrs) {
  // Set lifetime, version attributes
  cnode.update({lifetime: attrs}, {version: '1.0.0'}, function (err, rsp) {
    if(err) {
      console.log(err);
    }
  });
}

// Factory reset
function reset(callback) {
  if (bs === false) {
    so.set('1',0,'1', 86000);
    so.set('1',0,'2', 10);
    so.set('1',0,'3', 60);

    // Delete all extra object instances
    var obj = cnode.getSmartObject();

    // Delete all extra object instances
    var obj = cnode.getSmartObject();
    for (var i=0, item; item = obj.objectList()[i]; i++) {
        for (var j=1; item.iid[j]; j++) {
            cnode.deleteInst(item.oid, item.iid[j]);
        }
    }
    //De-register
    cnode.register(ip, 5683, function (err, rsp) {
        if (err) {
          console.log(err);
        }
    });

  } else {
    // Re-bootstrap
    ip = so.get('0', 0, '0');
    ip = ip.substring(7, ip.length);
    ip = ip.substring(0, ip.indexOf(':'));
    cnode.bootstrap(ip, 5683, function (err, rsp) {
        if (err) {
          console.log(err);
        }
    });
  }
}

// Support functions

// Find sensor data from http://openweathermap.org/
function find(mode) {
  if (mode === '-t')  {
    weather.defaults ({units:'metric', lang:'en', mode:'json'});
    weather.now ({lat:latitude, lon:longitude, APPID:'a7a67efb8526ba99aeb2b8f0d63cc18a'},function(err, json) {
        if (!err) {
            latitude = json.coord['lat'].toString();
            longitude = json.coord['lon'].toString();
            status = true;

            if (json.name != '')
                console.log('Weather station: ' + json.name + ', ' + json.sys['country']);
            else
                console.log('No real sensor found. Sensor with random data');

        } else {
            console.log('No real sensor found. Sensor with random data');
        }
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

// Trap signals -> de-register
process.on('SIGTERM', function() {
  process.stdout.write('\n');
  cnode.deregister(function (err, rsp) {
      if (err) {
        console.log(err);
      }
      process.exit(0);
  });
});

process.on('SIGINT', function() {
  process.stdout.write('\n');
  cnode.deregister(function (err, rsp) {
      if (err) {
        console.log(err);
      }
      process.exit(0);
  });
});

// This event fired when the device registered (2.01).
cnode.on('registered', function () {
  console.log('registered');
});


// This event fired when there is an error occurred.
cnode.on('error', function(err, rsp) {
    console.log(err);
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

// This event fired when the bootstrapped (2.02).
cnode.on('bootstrapped', function () {
    console.log('bootstrapped');

    ip = so.get('0', 1, '0');
    ip = ip.substring(7, ip.length);
    ip = ip.substring(0, ip.indexOf(':'));

    // Find sensoe data;
    find(mode);

    // Register
    cnode.register(ip, 5683, function (err, rsp) {
        if (err) {
          console.log(err);
        }
    });
});

// No BS server
if (bs === false) {
    // Security Object
    so.init(0, 0, { 0: 'coap://' + ip + ':5683', 1: false, 2: 3});

    // Find sensoe data;
    find(mode);

    // Register
    cnode.register(ip, 5683, function (err, rsp) {
        if (err) {
          console.log(err);
        }
    });
}
