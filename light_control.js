var CoapNode = require('./lib/coap-node.js');
var SmartObject = require('smartobject');
var config = require('./config');
var shortid = require('shortid');

var so = new SmartObject;
var ID = shortid.generate();
var cnode = new CoapNode('LightController'+'_'+ID, so);

var num = getRandomArbitrary(-90, 90);
var latitude = (Math.round(num*10) / 100).toString();
num = getRandomArbitrary(-180, 180);
var longitude = (Math.round(num*10) / 100).toString();
console.log('Sensor with random data');

// Init objects+resources

// Light Conrtol
var control = false;
var dim = [100];
var start;
so.init(3311, 0, {
    5850: {                                 // On/Off
      read: function (cb) {
        cb(null, control);
      },
      write: function (val, cb) {
        if (Boolean(val) === true && Boolean(control) === false) {
          control = true;
          start = new Date();
        } else if (Boolean(val) === false && Boolean(control) === true){
          control = false;
        }
        val = Boolean(val);
        cb(null, val);
      }
    },
    5851: {                                // Dimmer
      read: function(cb) {
        var val = dim[dim.length-1];
        cb(null, val);
      },
      write: function (val,cb) {
        dim.push(val);
        cb(null, val);
      }
    },
    5701: 'Cel',                           // Unit
    5852: {                                // On time
      read: function(cb) {
        if (Boolean(control) === true) {
          var end = Math.round((new Date() - start) / 1000);
          cb(null,end);
        }
        else {
          var val = 0;
          cb(null, val);
        }
      },
      write: function(val, cb) {
        if (val === 0 && Boolean(control) === true) {
            start = new Date();
            cb(null, val);
        }
        else {
          cb('4.00');
        }
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
  },
  1: {
    exec: function(cb) {                              // Bootstrap Server
      var bs = false;
      console.log(bs);
      cb(null, bs);
    }
  },
  2: {
    exec: function(cb) {
      var secMode = 3
      console.log(secMode);
      cb(null, secMode);
    }
  }
});

// Server Object
so.init(1, 0, {
  0: getRandomInt(1, 65535),                           // ServerID
  1: {                                                 // Lifetime
    read: function(cb) {
      cb(null, cnode.lifetime);
    },
    write: function(val, cb) {
      cnode.lifetime = val;
      cb(null, val);
    }
  },
  2: {
    read: function(cb) {
      cb(null, config.defaultMinPeriod);
    },
    write: function(val, cb) {
      config.defaultMinPeriod = val;
      cb(null, val);
    }
  },
  3: {
    read: function(cb) {
      cb(null, config.defaultMaxPeriod);
    },
    write: function(val, cb) {
      config.defaultMaxPeriod = val;
      cb(null, val);
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
var number = getRandomInt(1, 1000);
so.init(3, 0, {
  0: 'Manufactorer1'+number,		                     // Manufactorer name
  1: getRandomInt(1, 10000).toString(),              // Model number
  4: {
    exec: function(cb) {
      reboot();
      cb(null);
    }
  },
  5: {
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
      cb(null, this.ip);
    }
  },
  5: {
    read: function(cb) {
      cb(null, this.so.connMonitor[0].routeIp);
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
          cnode.register('172.17.0.2', 5683, function (err, rsp) {
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
  cnode.setDevAttrs({lifetime: cnode.lifetime}, {version: '1.0.0'}, function (err, rsp) {
    if(err) {
      console.log(err);
    }
    console.log(rsp);   // { status: '2.04' }
  });
}



// Support functions

// Random float number generator, rounded to 1 decimal
function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
};

// Random integer
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
};



// Event handlers

// This event fired when the device registered (2.01)
cnode.on('registered', function () {
  console.log('registered');

  // Client terminated -> de-register
  process.on('SIGTERM', function() {
    process.stdout.write('\n');
    cnode.deregister(function (err, rsp) {
          //console.log(rsp);
          process.exit();
    });
  });

  process.on('SIGINT', function() {
    process.stdout.write('\n');
    cnode.deregister(function (err, rsp) {
          //console.log(rsp);
          process.exit();
    });
  });
});

// This event fired when there is an announce from the Server
cnode.on('announce', function(msg) {
    console.log(msg);
});

// This event fired when there is an error occurred.
cnode.on('error', function() {
    console.log('error');
});

// This event fired when the device attributes updated (2.04)
cnode.on('updated', function () {
    console.log('updated');
});

// This event fired when the device de-registered (2.02).
cnode.on('deregistered', function () {
    console.log('deregistered');
});

// Register
cnode.register('172.17.0.2', 5683, function (err, rsp) {
  if (err) {
    console.log(err);
  }
});
