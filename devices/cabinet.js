//var coap = require('coap');
var CoapNode = require('coap-node');
var SmartObject = require('smartobject');
var shortid = require('shortid');
var SunCalc = require('suncalc');

var so = new SmartObject;
var ID = shortid.generate();
var cnode = new CoapNode('Cabinet_'+ID, so);

// Config parameters
var ip = process.argv[2],
    bs = false;

// Command line arguments
process.argv.forEach(function (val) {
    // Bootstrap
    if (val === '-b') {
        var http = require('http');
        var fs = require('fs');
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
  0: 0,                                                                         // ServerID
  1: cnode.lifetime,                                                            // Lifetime
  2: cnode._config.defaultMinPeriod,
  3: cnode._config.defaultMaxPeriod,
  6: false,
  7: 'U',
  8: {                                                                          // Update
    exec: function(attrs, cb) {
      update(attrs);
      cb(null)
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

// Init IPSO objects

// Illuminance
var illuminance0 = [];
so.init(3301, 0, {
  5700: {                                 // Sensor Value
    read: function (cb) {
      var date = new Date();
      var time = date.getHours() + '.' + date.getMinutes();
      illuminance(Number(time), function(val) {
          var rounded = Math.round(val*10) / 10;
          illuminance0.push(rounded);
          cb(null, rounded);
      });
    }
  },
  5601: {
    read: function(cb) {
      if (illuminance0.length > 0) {
        var min = Math.min.apply(null, illuminance);
        cb(null,min);
      } else {
        cb('4.05');
      }
    }
  },
  5602: {
    read: function(cb) {
      if (illuminance0.length > 0) {
        var max = Math.max.apply(null, illuminance);
        cb(null,max);
      } else {
        cb('4.05');
      }
    }
  },
  5603: 0.001,
  5604: 10000,
  5605: {
    exec: function(cb) {
      if (illuminance0.length > 0) {
        var value = illuminance[illuminance0.length-1];
        illuminance0 = [];
        illuminance0.push(value);
        cb(null);
      } else {
        cb('4.00');
      }
    }
  },
  5701: 'lx'
});

var illuminance1 = [];
so.init(3301, 1, {
  5700: {                                 // Sensor Value
    read: function (cb) {
      var date = new Date();
      var time = date.getHours() + '.' + date.getMinutes();
      illuminance(Number(time), function(val) {
        var rounded = Math.round(val*10) / 10;
        illuminance1.push(rounded);
        cb(null, rounded);
      });
    }
  },
  5601: {
    read: function(cb) {
      if (illuminance1.length > 0) {
        var min = Math.min.apply(null, illuminance1);
        cb(null,min);
      } else {
        cb('4.05');
      }
    }
  },
  5602: {
    read: function(cb) {
      if (illuminance1.length > 0) {
        var max = Math.max.apply(null, illuminance1);
        cb(null,max);
      } else {
        cb('4.05');
      }
    }
  },
  5603: 0.001,
  5604: 10000,
  5605: {
    exec: function(cb) {
      if (illuminance1.length > 0) {
        var value = illuminance1[illuminance1.length-1];
        illuminance1 = [];
        illuminance1.push(value);
        cb(null);
      } else {
        cb('4.00');
      }
    }
  },
  5701: 'lx'
});

var illuminance2 = [];
so.init(3301, 2, {
  5700: {                                 // Sensor Value
    read: function (cb) {
      var date = new Date();
      var time = date.getHours() + '.' + date.getMinutes();
      illuminance(Number(time), function(val) {
        var rounded = Math.round(val*10) / 10;
        illuminance2.push(rounded);
        cb(null, rounded);
      });
    }
  },
  5601: {
    read: function(cb) {
      if (illuminance2.length > 0) {
        var min = Math.min.apply(null, illuminance2);
        cb(null,min);
      } else {
        cb('4.05');
      }
    }
  },
  5602: {
    read: function(cb) {
      if (illuminance2.length > 0) {
        var max = Math.max.apply(null, illuminance2);
        cb(null,max);
      } else {
        cb('4.05');
      }
    }
  },
  5603: 0.001,
  5604: 10000,
  5605: {
    exec: function(cb) {
      if (illuminance2.length > 0) {
        var value = illuminance2[illuminance2.length-1];
        illuminance2 = [];
        illuminance2.push(value);
        cb(null);
      } else {
        cb('4.00');
      }
    }
  },
  5701: 'lx'
});

// Timer
var control = false;
var timeout = 0;
var target = 0;
so.init(3340, 0, {
  5523: {                                         // Trigger
    exec: function(arg, cb) {
      var val = arg[1];
      Trigger(val);
      cb(null);
    }
  },
  5850: {
    read: function (cb) {
      cb(null, control);
    },
    write: function (val, cb) {
      if (Boolean(val) === true && control === false) {
        control = Boolean(val);
        var today = new Date();

        if (today.getHours() < 17) {
            today.setHours(17);
            today.setMinutes(0);
            today.setSeconds(0);
            target = Math.round(Date.parse(today.toString())/1000);
            timeout = target - Math.round(Date.now()/1000);
            setTimeout(function () {
              return Trigger(true);
            }, timeout*1000);
        } else if (today.getHours() >= 17 && today.getHours() < 22) {
            today.setHours(today.getHours()+1);
            today.setMinutes(0);
            today.setSeconds(0);
            target = Math.round(Date.parse(today.toString())/1000);
            timeout = target - Math.round(Date.now()/1000);
            setTimeout(function () {
              return Trigger(true);
            }, timeout*1000);
        } else {
            today.setDate(today.getDate() + 1)
            today.setHours(17);
            today.setMinutes(0);
            today.setSeconds(0);
            target = Math.round(Date.parse(today.toString())/1000);
            timeout = target - Math.round(Date.now()/1000);
            setTimeout(function () {
              return Trigger(true);
            }, timeout*1000);
        }

      } else if (Boolean(val) === false && control === true) {
          control = Boolean(val);
          timeout = 0;
          target = 0;
      }

      cb(null, Boolean(val));
    }
  },
  5521: {
    read: function(cb) {                          // Duration
      cb(null, timeout);
    }
  },
  5538: {                                        // Time left
    read: function(cb) {
      var left;
      if (target > 0) {
        left = target - Math.round(Date.now()/1000);
      } else {
        left = 0;
      }
      cb(null, left);
    }
  }
});

// Support Functions

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

    //Re-register
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

// Calculate the illuminance depending on the time of the day
function illuminance(time, callback) {
    var lumen,
        times = SunCalc.getTimes(new Date(), 60.2, 24.9);  // Helsinki 60.2, 24.9

    //Check Daylight Hours:
    var sunrise = Number(times.sunrise.getHours() + '.' + times.sunrise.getMinutes()),
        sunset = Number(times.sunset.getHours() + '.' + times.sunset.getMinutes()),
        dawn = Number(times.dawn.getHours() + '.' + times.dawn.getMinutes()),
        dusk = Number(times.dusk.getHours() + '.' + times.dusk.getMinutes()),
        nauticalDawn = Number(times.nauticalDawn.getHours() + '.' + times.nauticalDawn.getMinutes()) || null,
        nauticalDusk = Number(times.nauticalDusk.getHours() + '.' + times.nauticalDusk.getMinutes()) || null,
        night = Number(times.night.getHours() + '.' + times.night.getMinutes()) || null,
        nightEnd = Number(times.nightEnd.getHours() + '.' + times.nightEnd.getMinutes()) || null;


    if (time >= sunrise && time < sunset) {
        lumen = getRandomArbitrary(1000, 10000);
    } else if ((time >= dawn && time < sunrise) || (time >= sunset && time < dusk)) {
        lumen = getRandomArbitrary(100, 1000);
    } else if ((time >= nauticalDawn && time < dawn) || (time >= dusk && time < nauticalDusk) || nauticalDawn == null) {
        lumen = getRandomArbitrary(10, 100);
    } else if ((time >= nightEnd && time < nauticalDawn) || (time >= nauticalDusk && time < night) || night == null) {
        lumen = getRandomArbitrary(1.0, 10);
    } else {
        lumen = getRandomArbitrary(0.001, 1.0);
    }

    callback(lumen);
}

// Trigger Timer action
function Trigger(val) {
  var lx_tot = 0;
  var counter = 0;
  var promises = [];

  // read all sensors in parallell
  for (var i = 0; i < 3; i++) {
      promises.push(readSensor(i));
  }

  // Read Sensor value
  function readSensor(iid) {
      return new Promise(function(resolve, reject) {
          so.read('3301', iid, '5700', function(err, data) {
            if (err) return reject(err);
            resolve(data);
          });
      });
  };

  // All data is here
  Promise.all(promises).then(function(results) {
      lx_tot = (results[0] + results[1] + results[2]) / 3;
      var h = new Date();

      if (h.getHours() === 23) {
          cnode.multicast('/3311/0/5850', 'PUT', val, function(err, rsp) {
            if (!err) {
              so.set('3340', '0', '5850', false);
              target = 0;
              timeout = 0;
              setTimeout(function () {
                return so.set('3340', '0', '5850', true);
              }, 3700*1000);
            }
          });
      } else {
          if (lx_tot < 200 || h.getHours() >= 20) {
              cnode.multicast('/3311/0/5850', 'PUT', val, function(err, rsp) {
                if (!err) {
                  h.setHours(23);
                  h.setMinutes(0);
                  h.setSeconds(0);
                  target = Math.round(Date.parse(h.toString())/1000);
                  timeout = target - Math.round(Date.now()/1000);
                  setTimeout(function () {
                    return Trigger(false);
                  }, timeout*1000);
                }
              });
          } else {
              h.setHours(h.getHours() + 1);
              h.setMinutes(0);
              h.setSeconds(0);
              target = Math.round(Date.parse(h.toString())/1000);
              timeout = target - Math.round(Date.now()/1000);
              setTimeout(function () {
                return Trigger(true);
              }, timeout*1000);
          }
      }

      var stat = so.get('3311', '0', '5850');
      if (stat = true && lx_tot > 200) {
        cnode.multicast('/3311/0/5851', 'PUT', 60);
      } else if (stat = true && lx_tot < 200) {
        cnode.multicast('/3311/0/5851', 'PUT', 100);
      }
  });
}

// Random float number generator
function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
};

// Random integer
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
};


// Event handlers

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

// This event fired when the device registered (2.01)
cnode.on('registered', function () {
  console.log('registered');
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

// This event fired when the device bootstrapped (2.02).
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

    so.init(0, 0, { 0: 'coap://' + ip + ':5683', 1: false, 2: 3});
    // Register
    cnode.register(ip, 5683, function (err, rsp) {
        if (err) {
          console.log(err);
        }
    });
}
