var coap = require('coap');
var CoapNode = require('./index.js');
var SmartObject = require('smartobject');
var config = require('./lib/config');

var number = getRandomInt(1, 1000);
var so = new SmartObject;
var cnode = new CoapNode('Cabinet'+number, so);

//LWM2M Server ip
var ip = process.argv[2];

var num = getRandomArbitrary(-90, 90);
var latitude = (Math.round(num*10) / 100).toString();
num = getRandomArbitrary(-180, 180);
var longitude = (Math.round(num*10) / 100).toString();



// Init objects+resources

// Illuminance
var illuminance0 = [];
so.init(3301, 0, {
  5700: {                                 // Sensor Value
    read: function (cb) {
      var date = new Date();
      var time = date.getHours() + '.' + date.getMinutes();
      time = Number(time);
      illuminance(time, function(val) {
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
      time = Number(time);
      illuminance(time, function(val) {
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
      time = Number(time);
      illuminance(time, function(val) {
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
      Trigger(val, function(err) {
        if (err) {
          cb(err);
        } else {
          cb(null, { status: 'ok', value: val });
        }
      });
    }
  },
  5850: {
    read: function (cb) {
      control = Boolean(control);
      cb(null, control);
    },
    write: function (val, cb) {
      if (Boolean(val) === true && Boolean(control) === false) {
        control = Boolean(val);
        var today = new Date();
        console.log('today', today.getHours());

        if (today.getHours() < 3) {
            today.setHours(3);
            today.setMinutes(0);
            today.setSeconds(0);
            target = Math.round(Date.parse(today.toString())/1000);
            timeout = target - Math.round(Date.now()/1000);
            setTimeout(function () {
              return Trigger('1');
            }, timeout*1000);
        } else if (today.getHours() >= 3 && today.getHours() < 15) {
            today.setHours(15);
            today.setMinutes(0);
            today.setSeconds(0);
            target = Math.round(Date.parse(today.toString())/1000);
            timeout = target - Math.round(Date.now()/1000);
            setTimeout(function () {
              return Trigger('1');
            }, timeout*1000);
        } else if (today.getHours() >= 15 && today.getHours() < 21) {
            today.setHours(today.getHours()+1);
            today.setMinutes(0);
            today.setSeconds(0);
            target = Math.round(Date.parse(today.toString())/1000);
            timeout = target - Math.round(Date.now()/1000);
            setTimeout(function () {
              return Trigger('1');
            }, timeout*1000);
        } else {
            today.setDate(today.getDate() + 1)
            today.setHours(3);
            today.setMinutes(0);
            today.setSeconds(0);
            target = Math.round(Date.parse(today.toString())/1000);
            timeout = target - Math.round(Date.now()/1000);
            setTimeout(function () {
              return Trigger('1');
            }, timeout*1000);
        }

      } else if (Boolean(val) === false && Boolean(control) === true) {
          control = Boolean(val);
          timeout = 0;
          target = 0;
      }

      val = Boolean(val);
      cb(null, val);
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
  13: {
    read: function(cb) {
      var date = new Date();
      var n = date.toString();
      cb(null, n);
      //var seconds = Math.round(date.getTime() / 1000);
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

// Support Functions

function illuminance(time, callback) {
    var lumen;

    if ((time > 3.30 && time <= 4.30) || (time >= 15.30 && time < 16.30)) {
      lumen = getRandomArbitrary(1.0, 10);
    } else if ((time > 4.30 && time <= 5.00) || (time > 15.00 && time < 15.30)) {
      lumen = getRandomArbitrary(10, 100);
    } else if ((time > 5.00 && time <= 6.00) || (time > 14.00 && time <= 15.00)) {
      lumen = getRandomArbitrary(100, 1000);
    } else if (time > 6.00 && time <= 14.00) {
      lumen = getRandomArbitrary(1000, 10000);
    } else {
      lumen = getRandomArbitrary(0.001, 1.0);
    }

    callback(lumen);
}




// Trigger Timer action
function Trigger(val) {
  var lx_tot = 0;
  var counter = 0;

  so.read('3301','0','5700', function(err,value) {
    if(!err) {
      lx_tot += value;
      counter += 1;
    }
    so.read('3301','1','5700', function(err,value) {
      if(!err) {
        lx_tot += value;
        counter += 1;
      }
      so.read('3301','2','5700', function(err,value) {
        if(!err) {
          lx_tot += value;
          counter += 1;
        }
        lx_tot = lx_tot/counter;
        console.log('tot', lx_tot);
      });
    });
  });

  var h = new Date();
  console.log('h', h.getHours());
  if (h.getHours() === 6 || h.getHours() === 18 || h.getHours() === 21) {
    cnode.multicast('/3311/0/5850', 'PUT', val, function(err, rsp) {
      if (!err) {
        so.write('3340', '0', '5850', false);
        target = 0;
        timeout = 0;
        setTimeout(function () {
          return so.write('3340', '0', '5850', true);
        }, 3700*1000);
      }
    });

  } else if (h.getHours() === 3) {
    if (lx_tot < 200) {
      cnode.multicast('/3311/0/5850', 'PUT', val, function(err, rsp) {
        if (!err) {
          so.write('3340', '0', '5850', false);
          h.setHours(6);
          h.setMinutes(0);
          h.setSeconds(0);
          target = Math.round(Date.parse(h.toString())/1000);
          timeout = target - Math.round(Date.now()/1000);;
          setTimeout(function () {
            return Trigger('0');
          }, timeout*1000);
        }
      });
    } else {
      so.write('3340', '0', '5850', false);
      target = 0;
      timeout = 0;
      setTimeout(function () {
        return so.write('3340', '0', '5850', true);
      }, 3700*1000);
    }

  } else {
    if (lx_tot < 200) {
      cnode.multicast('/3311/0/5850', 'PUT', val, function(err, rsp) {
        if (!err) {
          so.write('3340', '0', '5850', false);
          h.setHours(21);
          h.setMinutes(0);
          h.setSeconds(0);
          target = Math.round(Date.parse(h.toString())/1000);
          timeout = target - Math.round(Date.now()/1000);;
          setTimeout(function () {
            return Trigger('0');
          }, timeout*1000);
        }
      });
    } else {
      so.write('3340', '0', '5850', false);
      target = 0;
      timeout = 0;
      setTimeout(function () {
        return so.write('3340', '0', '5850', true);
      }, 10*1000);
    }
  }

  var stat = so.read('3311', '0', '5850');
  if (stat = true && lx_tot > 200) {
    cnode.multicast('/3311/0/5851', 'PUT', 60);
  } else if (stat = true && lx_tot < 200) {
    cnode.multicast('/3311/0/5851', 'PUT', 100);
  }

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
cnode.register(ip, 5683, function (err, rsp) {
  if (err) {
    console.log(err);
  }
});
