

  var coap        = require('coap');
  var CoapNode = require('./index.js');
  var SmartObject = require('smartobject');
  var config = require('./lib/config');
  var shortid = require('shortid');

  var so = new SmartObject;
  var ID = shortid.generate();
  var cnode = new CoapNode('Radiator'+'_'+ID, so);

  //LWM2M Server ip
  var ip = process.argv[2];

  var num = getRandomArbitrary(-90, 90);
  var latitude = (Math.round(num*10) / 100).toString();
  num = getRandomArbitrary(-180, 180);
  var longitude = (Math.round(num*10) / 100).toString();

  // Init objects+resources

  // Actuation
  var status = false;
  var start;
  so.init(3306, 0, {
    5850: {                                               // On/Off
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
    5852: {                                               // On time
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
        cb(null, val);
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
    cnode.setDevAttrs({lifetime: cnode.lifetime}, {version: '1.0.0'}, function (err, rsp) {
      if(err) {
        console.log(err);
      }
      console.log(rsp);   // { status: '2.04' }
    });
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

  // This event fired when there is an error occurred.
  cnode.on('registered', function (cb) {
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


  // Register
  cnode.register(ip, 5683, function (err, rsp) {
      if (err) {
        console.log(err);
      }
      //console.log(rsp);
  });
