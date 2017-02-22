
var CoapNode = require('./index.js');
var SmartObject = require('smartobject');
var config = require('./lib/config');
var shortid = require('shortid');
var cutils = require('./lib/components/cutils');

var so = new SmartObject;
var ID = shortid.generate();
var cnode = new CoapNode('PresenceDetector'+'_'+ID, so);

// Config parameters
var ip = process.argv[2],
    bs = false,
    status = false,
    latitude = (Math.round(getRandomArbitrary(-90, 90)*10) / 100).toString(),
    longitude = (Math.round(getRandomArbitrary(-180, 180)*10) / 100).toString();

// Command line arguments
process.argv.forEach(function (val, index, array) {
    // Bootstrap
    if (val === '-b') {
        bs = true;

        // Security Object
        so.init(0, 0, {0: 'coap://172.17.0.3:5683', 1: true, 2: 3});
        so.init(0, 1, {0: '', 1: false, 2: 3, 3: '', 4: '', 5: '', 6: 3, 7: '', 8: '', 9: '', 10: 0, 11: 0});

        // Server Object
        so.init(1, 1, {
          0: 1,
          1: cnode.lifetime,
          2: cnode._config.defaultMinPeriod,
          3: cnode._config.defaultMaxPeriod,
          6: false,
          7: 'U'
        });

        cnode.bootstrap(ip, 5683, function (err, rsp) {
            if (err) {
              console.log(err);
            }
        });
    }
});

// Init LWM2M objects

// Server Object
so.init(1, 0, {
  0: 0,                                                    // ServerID
  1: cnode.lifetime,                                       // Lifetime
  2: cnode._config.defaultMinPeriod,
  3: cnode._config.defaultMaxPeriod,
  6: false,
  7: 'U',
  8: {                                                    // Update
    exec: function(attrs, cb) {
      update(attrs);
      cb(null);
    }
  }
});

// Device Object
so.init(3, 0, {
  0: 'Manu',              		                     // Manufactorer name
  1: getRandomInt(1, 100).toString(),              // Model number
  4: {
    exec: function(cb) {                             // Reboot
      reboot();
      cb(null);
    }
  },
  5: {                                               // Reset
    exec: function(cb) {
      reset();
      cb(null);
    }
  },
  16: 'U'                                           // Binding mode
});

// Location Object
so.init(6, 0, {
  0: latitude,                                      // Latitude
  1: longitude,                                      // Longitude
  5: Math.floor(Date.now() / 1000)                  // Timestamp
});

// Connection Monitoring
so.init(4, 0, {
  4: cnode.ip,
  5: 'unknown'
});

// Init IPSO objects

// Presence Sensor
var state = false;
var lights = false;
var array = ['false', 'true'];
var counter = 0;
//var start = new Date();
so.init(3302,0, {
  5500: {
    read: function(cb) {
      //var end = Math.round((new Date() - start) / 1000);
      var randomNumber = Math.floor(Math.random()*array.length);
      var val = array[randomNumber];

      if (val === 'true' && Boolean(state) === false) {
          state = true;
          counter += 1;
      } else if (val === 'false' && Boolean(state) === true) {
          state = false;
      }

      if (Boolean(state) === true && Boolean(lights) === false) {
        cnode.multicast('/3311/0/5850', 'PUT', '1', function(err, rsp) {
          if (err) {
            console.log(err);
          }
          lights = true;
        });
      } else if (Boolean(state) === false && Boolean(lights) === true) {
        cnode.multicast('/3311/0/5850', 'PUT', '0', function(err, rsp) {
          if (err) {
            console.log(err);
          }
          lights = false;
        });
      }
      cb(null, state);
    }
  },
  5501: {
    read: function(cb) {
      cb(null, counter);
    }
  },
  5505: {
    exec: function(cb) {
      counter = 0;
      cb(null, counter);
    }
  },
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
function update(attrs) {
  // Set lifetime, version attributes
  cnode.update({lifetime: attrs}, {version: '1.0.0'}, function (err, rsp) {
    if(err) {
      console.log(err);
    }
  });
}

// Factory reset
function reset() {
  if (bs === false) {
    so.set('1',0,'1', 86000);
    so.set('1',0,'2', 10);
    so.set('1',0,'3', 60);

    // Delete all extra object instances
    var obj = cnode.getSmartObject();
    for (var i=0, item; item = obj.objectList()[i]; i++) {
        for (var j=1, iid; iid = item.iid[j]; j++) {
            var oid = cutils.oidKey(item.oid);
            delete obj[oid][iid];
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

// This event fired when the device registered (2.01).
cnode.on('registered', function () {
  console.log('registered');
});

// This event fired when there is an error occurred.
cnode.on('error', function() {
    console.log('error');
});

// Multicast closed
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
