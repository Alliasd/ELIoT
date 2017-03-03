
var CoapNode = require('./index.js');
var SmartObject = require('smartobject');
var shortid = require('shortid');

var so = new SmartObject;
var ID = shortid.generate();
var cnode = new CoapNode('Radiator'+'_'+ID, so);

// Config parameters
var ip = process.argv[2],
    bs = false;

// Command line arguments
process.argv.forEach(function (val, index, array) {
    // Bootstrap
    if (val === '-b') {
        var http = require('http');
        var fs = require('fs');
        bs = true;

        // Security Object
        so.init(0, 0, {0: 'coap://172.17.0.3:5683', 1: true, 2: 3});
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

        var stream = fs.createReadStream('./data.json');
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
  0: 0,                                                                       // ServerID
  1: cnode.lifetime,                                                          // Lifetime
  2: cnode._config.defaultMinPeriod,
  3: cnode._config.defaultMaxPeriod,
  6: false,
  7: 'U',
  8: {                                                                        // Update
    exec: function(attrs, cb) {
      update(attrs);
      cb(null);
    }
  }
});

// Device Object
so.init(3, 0, {
  0: 'Manu',              		                                                // Manufactorer name
  1: getRandomInt(1, 100).toString(),                                         // Model number
  5: {                                                                        // Reset
    exec: function(cb) {
      reset();
      cb(null);
    }
  },
  16: 'U'                                                                     // Binding mode
});

// Location Object
so.init(6, 0, {
  0: (Math.round(getRandomArbitrary(-90, 90)*10) / 100).toString(),           // Latitude
  1: (Math.round(getRandomArbitrary(-180, 180)*10) / 100).toString(),         // Longitude
  5: Math.floor(Date.now() / 1000)                                            // Timestamp
});

// Connection Monitoring
so.init(4, 0, {
  4: cnode.ip,
  5: 'unknown'
});

// Init IPSO objects

// Actuation
var status = false,
    start;

so.init(3306, 0, {
  5850: {                                                                       // On/Off
    read: function (cb) {
        status = Boolean(status);
        cb(null, status);
    },
    write: function (val, cb) {
      if (Boolean(val) === true && Boolean(status) === false) {
          status = true;
          start = new Date();
      } else if (Boolean(val) === false && Boolean(status) === true) {
          status = false;
      }
      val = Boolean(val);
      cb(null, val);
    }
  },
  5852: {                                                                       // On time
    read: function(cb) {
      if (Boolean(status) === true) {
        var end = Math.round((new Date() - start) / 1000);
        cb(null,end);
      }
      else {
        var val = 0;
        cb(null, val);
      }
    },
    write: function(val, cb) {
      if (val === 0 && Boolean(status) === true) {
          start = new Date();
          cb(null, val);
      }
      else {
        cb('4.00');
      }
    }
  },
  5750: 'Radiator switch'
});


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
function reset() {
  if (bs === false) {
    so.set('1',0,'1', 86000);
    so.set('1',0,'2', 10);
    so.set('1',0,'3', 60);

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

// Support funcitons

// Random integer
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
};

// Random float number generator
function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
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

// This event fired when there is an error occurred.
cnode.on('registered', function (cb) {
  console.log('registered');
});

// This event fired when the device de-registered (2.02).
cnode.on('deregistered', function () {
    console.log('deregistered');
});

// This event fired when the device attributes updated (2.04).
cnode.on('updated', function (err, rsp) {
    console.log('updated');
});


cnode.on('multicast', function (err, rsp) {
    //console.log('multicast');
});

cnode.on('error', function(err, rsp) {
  console.log(err);
  //console.log(rsp);
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
