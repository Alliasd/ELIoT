var CoapNode = require('./index.js');
var SmartObject = require('smartobject');
var config = require('./lib/config');

var so = new SmartObject;
var number = getRandomInt(1, 1000);
var cnode = new CoapNode('FuelControlSystem'+number, so);

//LWM2M Server ip
var ip = process.argv[2];

var num = getRandomArbitrary(-90, 90);
var latitude = (Math.round(num*10) / 100).toString();
num = getRandomArbitrary(-180, 180);
var longitude = (Math.round(num*10) / 100).toString();

// Values
var k = getRandomArbitrary(1, 5),
    time = new Date();
    injection_temp = 0,
    injection_throttle = 0,
    injection_speed = 0,
    injection_air = 0;

// objects

// Fuel Control System
var type = 'Fuel Injection System';
so.init('4000', 0, {
  7100: {
    read: function(cb) {
      var path = '3303:0';
      redirect(path, function(val) {
        cb(null, val);
      });
    }
  },
  7101:  {
    read: function(cb) {
      var path = '3316:0';
      redirect(path, function(val) {
        cb(null, val);
      });
    }
  },
  7102:  {
    read: function(cb) {
      var path = '3346:0';
      redirect(path, function(val) {
        cb(null, val);
      });
    }
  },
  7103:  {
    read: function(cb) {
      var path = '3346:1';
      redirect(path, function(val) {
        cb(null, val);
      });
    }
  },
  7104:  {
    read: function(cb) {
      var path = '3323:0';
      redirect(path, function(val) {
        cb(null, val);
      });
    }
  },
  7105:  {
    read: function(cb) {
      var path = '3306:0';
      redirect(path, function(val) {
        cb(null, val);
      });
    }
  },
  7106: {
    read: function(cb) {
      var path = '3306:1';
      redirect(path, function(val) {
        cb(null, val);
      });
    }
  },
  5750: {
    read: function(cb) {
      cb(null,type);
    },
    write: function (val, cb) {
      type = val;
      cb(null, type);
    }
  }
});

// Coolant Sensor (IPSO Temperature)
so.init(3303, 0, {
  5700: {                                               // Sensor value
    read: function(cb) {
      injection(100, function(val) {
        if (val <= 10) {
          injection_temp = 1;
        } else if (val > 10 && val < 70) {
          injection_temp = 2;
        } else {
          injection_temp = 3;
        }
        cb(null, val);
      });
    }
  },
  5701: 'Cel',                                         // Unit
  5603: 0,                                             // Min range measured value
  5604: 100                                            // Max range measured value
});

// Throttle Sensor (IPSO Voltage)
so.init(3316, 0, {
  5700: {
    read: function(cb) {
      injection(5, function(val) {
        if (val <= 2) {
          injection_throttle = 1;
        } else if (val > 2 && val < 3) {
          injection_throttle = 2;
        } else {
          injection_throttle = 3;
        }
        cb(null, val);
      });
    }
  },
  5701: 'V',
  5603: 0,                                             // Min range measured value
  5604: 5                                              // Max range measured value
});

// Airmass Flow Sensor (IPSO Rate)
so.init(3346, 0, {
  5700: {
    read: function(cb) {
      injection(160, function(val) {
        if (val <= 15) {
          injection_air = -1;
        } else if (val > 15 && val < 100) {
          injection_air = 1;
        } else {
          injection_air = 2;
        }
        cb(null, val);
      });
    }
  },
  5701: 'g/s',
  5603: 0,
  5604: 160
});

// Engine Speed Sensor (IPSO Rate)
so.init(3346, 1, {
  5700: {
    read: function(cb) {
      injection(5000, function(val) {
        if (val <= 600) {
          injection_speed = 1;
        } else if (val > 600 && val < 4000) {
          injection_speed = 2;
        } else {
          injection_speed = 3;
        }
        cb(null, val);
      });
    }
  },
  5701: 'rpm',
  5603: 0,
  5604: 5000
});

// Fuel Pressure
var pressure = 30;
so.init(3323, 0, {
  5700: {
    read: function(cb) {
      pressure = getRandomArbitrary(20,90);
      cb(null, pressure);
    }
  },
  5701: 'psi',
  5603: 20,
  5604: 90
});

// ECU (IPSO Actuation)
var status = false;
so.init(3306, 0, {
  5850: {                                               // ON/OFF
    read: function(cb) {
      cb(null, status);
    },
    write: function(val,cb) {
      status = val;
      cb(null, val);
    }
  }
});

// Pump Valve (IPSO Actuation)
var valve = false;
so.init(3306, 1, {
  5850: {                                               // ON/OFF
    read: function(cb) {
      if (pressure >= 30 && pressure <= 80) {
        valve = false;
      } else {
        valve = true;
      }
      cb(null, valve);
    },
    write: function(val,cb) {
      valve = val;
      cb(null, val);
    }
  }
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
      cnode.lifetime = val;
      cb(null, cnode.lifetime);
    }
  },
  2: {
    read: function(cb) {
      cb(null, min || config.defaultMinPeriod);
    },
    write: function(val, cb) {
      min = val;
      cb(null, min);
    }
  },
  3: {
    read: function(cb) {
      cb(null, max || config.defaultMaxPeriod);
    },
    write: function(val, cb) {
      max = val;
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

// Support functions

// Random integer
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
};

// Random float number generator
function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
};

function redirect(path, cb) {
  var pathArray = path.split(':');
  //console.log(pathArray[0], pathArray[1]);
  cnode.so.dump(pathArray[0],pathArray[1], {restrict: true}, function(err, data) {
    cb(JSON.stringify(data));
    //console.log(JSON.stringify(data);
  });

  /*cnode.unicast(cnode.ip, cnode.port, path, 'GET', function(err, rsp) {
    cb(JSON.stringify(rsp.payload));
  });*/
}

function injection(max, callback) {
  var end = Math.round((new Date() - time) / 1000);
  var y = k*end/10;
  var value = (y/100)*max;
  if (value > max) {
    value === max;
    time = new Date();
  }
  callback(value);
}

function statusChange() {
  status = false;
}

function injector() {
  var injector = 0;
  injector = injection_temp+injection_throttle+injection_air+injection_speed;
  status = true;
  setTimeout(function () {
    return statusChange();
  }, injector*1000);
}

function readSensors(callback) {
  var injector = 0;
  so.read('3303', '0', '5700', function(err, data) {
    if (data)
      injector += injection_temp;
  });
  so.read('3316', '0', '5700', function(err, data) {
    if (data)
      injector += injection_throttle;
  });
  so.read('3346', '0', '5700', function(err, data) {
    if (data)
      injector += injection_air;
  });
  so.read('3346', '1', '5700', function(err, data) {
    if (data)
      injector += injection_speed;
  });
  callback(injector);
}



// Events

// This event fired when the device registered (2.01).
cnode.on('registered', function () {
  console.log('registered');

  //cnode.lookup(this.clientName);

  setInterval(function () {
    injector();
  }, 15000);

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


// Register
cnode.register(ip, 5683, function (err, rsp) {
    if (err) {
      console.log(err);
    }
    //console.log(rsp);
});
