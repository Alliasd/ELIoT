var CoapNode = require('coap-node');
var SmartObject = require('smartobject');
var shortid = require('shortid');

var so = new SmartObject;
var ID = shortid.generate();
var cnode = new CoapNode('FuelControlSystem_'+ID, so);

// Config parameters
var ip = process.argv[2],
    bs = false,
    k = getRandomArbitrary(1, 5),
    time = new Date();

process.argv.forEach(function (val) {
    // Bootstrap
    if (val === '-b') {
        bs = true;
        var http = require('http');
        var fs = require('fs');

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

// LWM2M objects

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
  0: (Math.round(getRandomArbitrary(-90, 90)*10) / 100).toString(),             // Latitude
  1: (Math.round(getRandomArbitrary(-180, 180)*10) / 100).toString(),           // Longitude
  5: Math.floor(Date.now() / 1000)                                              // Timestamp
});

// Connection Monitoring
so.init(4, 0, {
  4: cnode.ip,
  5: 'unknown'
});

// IPSO objects

// Fuel Control System
var type = 'Fuel Injection System';
so.init('4000', 0, {
  7100: {                                                                       // Link to Coolant Sensor
    read: function(cb) {
      var path = '3303:0';
      redirect(path, function(val) {
        cb(null, val);
      });
    }
  },
  7101:  {                                                                      // Link to Throttle Sensor
    read: function(cb) {
      var path = '3316:0';
      redirect(path, function(val) {
        cb(null, val);
      });
    }
  },
  7102:  {                                                                      // Link to Airmass Flow Sensor
    read: function(cb) {
      var path = '3346:0';
      redirect(path, function(val) {
        cb(null, val);
      });
    }
  },
  7103:  {                                                                      // Link to Engine Speed Sensor
    read: function(cb) {
      var path = '3346:1';
      redirect(path, function(val) {
        cb(null, val);
      });
    }
  },
  7104:  {                                                                      // Link to Pressure Sensor
    read: function(cb) {
      var path = '3323:0';
      redirect(path, function(val) {
        cb(null, val);
      });
    }
  },
  7105:  {
    read: function(cb) {                                                        // Link to ECU
      var path = '3306:0';
      redirect(path, function(val) {
        cb(null, val);
      });
    }
  },
  7106: {                                                                       // Link to Pump Valve
    read: function(cb) {
      var path = '3306:1';
      redirect(path, function(val) {
        cb(null, val);
      });
    }
  },
  5750: type                                                                    // Application Type
});

// Coolant Sensor (IPSO Temperature)
so.init(3303, 0, {
  5700: {                                                                       // Sensor value
    read: function(cb) {
      var val = sensorValue(100)
        cb(null, val);
    }
  },
  5701: 'Cel',                                                                  // Unit
  5603: 0,                                                                      // Min range measured value
  5604: 100                                                                     // Max range measured value
});

// Throttle Sensor (IPSO Voltage)
so.init(3316, 0, {
  5700: {                                                                       // Sensor value
    read: function(cb) {
      var val = sensorValue(5)
        cb(null, val);
    }
  },
  5701: 'V',                                                                    // Unit
  5603: 0,                                                                      // Min range measured value
  5604: 5                                                                       // Max range measured value
});

// Airmass Flow Sensor (IPSO Rate)
so.init(3346, 0, {
  5700: {                                                                       // Sensor value
    read: function(cb) {
      var val = sensorValue(160)
        cb(null, val);
    }
  },
  5701: 'g/s',                                                                  // Unit
  5603: 0,                                                                      // Min range measured value
  5604: 160                                                                     // Max range measured value
});

// Engine Speed Sensor (IPSO Rate)
so.init(3346, 1, {
  5700: {                                                                       // Sensor value
    read: function(cb) {
      var val = sensorValue(5000)
        cb(null, val);
    }
  },
  5701: 'rpm',                                                                  // Unit
  5603: 0,                                                                      // Min range measured value
  5604: 5000                                                                    // Max range measured value
});

// Fuel Pressure
so.init(3323, 0, {
  5700: {                                                                       // Sensor value
    read: function(cb) {
      var pressure = getRandomArbitrary(20,90);
      if (pressure >= 30 && pressure <= 80)
          so.set('3306', '1', '5850', false);
      else
          so.set('3306', '1', '5850', true);

      cb(null, pressure);
    }
  },
  5701: 'psi',                                                                  // Unit
  5603: 20,                                                                     // Min range measured value
  5604: 90                                                                      // Max range measured value
});

// ECU (IPSO Actuation)
var status = false;
so.init(3306, 0, {
  5850: status                                                                  // ON/OFF
});

// Pump Valve (IPSO Actuation)
var valve = false;
so.init(3306, 1, {
  5850: valve                                                                   // ON/OFF
});

// Support functions

// Random integer
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
};

// Random float number generator
function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
};

// Redirect GET request
function redirect(path, cb) {
  var pathArray = path.split(':');
  cnode.so.dump(pathArray[0],pathArray[1], {restrict: true}, function(err, data) {
    cb(JSON.stringify(data));
  });
}

// Calculate the sensor value
function sensorValue(max) {
  var end = Math.round((new Date() - time) / 1000);
  var y = k*end/10;
  var value = (y/100)*max;
  if (value > max) {
    value === max;
    time = new Date();
  }
  return value;
}

// Change Status of injector
function statusChange() {
  so.set('3306', 0, '5850', false);
  setTimeout(function () {
    return injector();
  }, 20000);
}


function injector() {
  var injection_time = 0;

  injectionTime(function(time) {
    injection_time = time;
    so.set('3306', 0, '5850', true);
  });

  setTimeout(function () {
    return statusChange();
  }, (Number(injection_time)*1000));
}


function injectionTime(callback) {
  var Promise = require('promise');
  var list = ['3303/0', '3316/0', '3346/0', '3346/1'];
  var promises = [];

  // read all sensors in parallell
  for (var i = 0; i < 4; i++) {
      var ids = list[i].split('/');
      promises.push(readSensor(ids[0],ids[1]));
  }

  // Read Sensor value
  function readSensor(oid, iid) {
      return new Promise(function(resolve, reject) {
          so.read(oid, iid, '5700', function(err, data) {
            if (err) return reject(err);
            resolve(data);
          });
      });
  };

  // All data is here, let's calculate the injecton time
  Promise.all(promises).then(function(results) {
    var injection_time = 0;

    for (var i=0; i<4; i++) {
        var ids = list[i].split('/');
        var max = so.get(ids[0],ids[1], '5604');

        if (max === 100 || 5 || 5000) {
            if (results[i] <= 0.1*max) {
              injection_time += 1;
            } else if (results[i]  >= 0.3*max)
              injection_time += 3;
            else
              injection_time += 2;
        } else {
          if (results[i] <= 0.1*max)
            injection_time -= 1;
          else if (results[i] >= 0.3*max)
            injection_time += 2;
          else
            injection_time += 1;
        }
    }
    callback(injection_time);

  });
};


// Events

// This event fired when the device registered (2.01).
cnode.on('registered', function () {
  console.log('registered');

  injector();

  // Client terminated -> de-register
  process.on('SIGTERM', function() {
    process.stdout.write('\n');
    cnode.deregister(function (err, rsp) {
        if (err) {
          console.log(err);
        }
        process.exit();
    });
  });

  process.on('SIGINT', function() {
    process.stdout.write('\n');
    cnode.deregister(function (err, rsp) {
        if (err) {
          console.log(err);
        }
        process.exit();
    });
  });
});


// This event fired when there is an error occurred.
cnode.on('error', function() {
    console.log('error');
});

// Multicast closed
cnode.on('multicast', function() {
  console.log('multicast');
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

    // Register
    cnode.register(ip, 5683, function (err, rsp) {
        if (err) {
          console.log(err);
        }
    });
}
