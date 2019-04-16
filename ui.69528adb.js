// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"simulation.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SirSimulation = SirSimulation;
exports.County = County;

function SirSimulation() {
  this.running = false;
  this.rate = 10;
  this.cs;
  this.range;
  this.color;
  this.idToI;
  this.vacc;
  this.beta;
  this.gamma;
  this.interval;
  this.callback;
  this.current_inf;
  this.total_inf;
  this.day = 1;

  this.init = function (counties, beta, gamma, vacc, callback) {
    this.cs = counties;
    this.beta = beta / this.rate;
    this.gamma = gamma / this.rate;
    this.vacc = vacc;
    this.callback = callback;
    this.range = [0, this.max_pop()];
    this.color = d3.scale.pow().exponent(0.33).domain(this.range).range(["#ffffff", "#08306b"]);
    this.init_cs();
  };

  this.start = function (cid, n) {
    this.running = true;
    var c = this.cs[this.idToI.get(cid)];
    c.inf += n;

    if (c.sus >= n) {
      c.sus -= n;
    } else {
      c.rec -= n;
    }

    this.current_inf = n;
    this.total_inf = n;
    this.day = 0;
    this.interval = setInterval(this.update, 1000 / this.rate, this);
    this.update(this);
  };

  this.update = function (that) {
    that.callback(that.current_inf, that.total_inf, that.day / that.rate);
    var c;

    for (var i = 0; i < that.cs.length; i++) {
      c = that.cs[i];
      c.da = 0;
      c.db = 0;
    }

    for (var i = 0; i < that.cs.length; i++) {
      c = that.cs[i];

      if (c.inf > 0) {
        c.step();
      }
    }

    for (var i = 0; i < that.cs.length; i++) {
      that.cs[i].flush();
    }

    that.day = that.day + 1;
  };

  this.max_pop = function () {
    var max = 0;

    for (var i = 0; i < this.cs.length; i++) {
      max = Math.max(this.cs[i].pop, max);
    }

    return max;
  };

  this.total_infected = function () {
    var total = 0;

    for (var i = 0; i < this.cs.length; i++) {
      total += this.cs[i].inf;
    }

    return total;
  };

  var self = this;

  this.init_cs = function () {
    this.idToI = d3.map();
    var c;

    for (var i = 0; i < this.cs.length; i++) {
      c = this.cs[i];
      this.idToI.set(c.id, i);
      c.rec = c.pop * self.vacc;
      c.sus = c.pop - c.rec;
      c.inf = 0;
      c.init();
    }
  };

  this.reset = function () {
    clearInterval(this.interval);
    this.callback(0, 0, 0);
    this.running = false;
  };
}

function County(simulation, i, id, pop, coms) {
  this.i = i;
  this.id = id;
  this.pop = pop;
  this.coms = coms;
  this.color;
  this.sus;
  this.inf;
  this.rec;
  this.da;
  this.db;

  this.init = function () {
    var c = simulation.color(this.pop);
    var d = d3.rgb(c);
    d.r = d.b;
    d.g = d.b;
    d.b = 0;
    this.color = d3.scale.pow().exponent(0.2).domain([0, 1]).range([c, d.toString()]);
    d3.select("#s".concat(this.id)).style("fill", c);
  };

  this.step = function () {
    for (var _i = 0; _i < this.coms.length; _i++) {
      var com = this.coms[_i];
      var ci = simulation.idToI.get(+com.work_id);
      var c = simulation.cs[ci];
      var n = +com.total;
      var dx = simulation.beta * this.inf * (n / this.pop) * (c.sus / c.pop);
      c.da += dx;
    }

    this.da += simulation.beta * this.inf * (this.sus / this.pop);
    this.db += simulation.gamma * this.inf;
  };

  this.flush = function () {
    this.sus += -this.da;
    this.inf += this.da - this.db;
    this.rec += this.db;
    simulation.total_inf += this.da;
    simulation.current_inf += this.da - this.db;
    d3.select("#s".concat(this.id)).style("fill", this.color(this.inf / this.pop));
  };
}
},{}],"ui.js":[function(require,module,exports) {
"use strict";

var _simulation = require("./simulation.js");

var simulation = new _simulation.SirSimulation();
var width = 960,
    height = 600;
/* d3 selectors with active elements when a state is selected */

var active_state = d3.select(null),
    active_counties = d3.select(null);
/* standard US projection */

var projection = d3.geo.albersUsa().scale(1280).translate([width / 2, height / 2]);
/* path used to draw all geometric elements */

var path = d3.geo.path().projection(projection);
/* create a new svg element */

var svg = d3.select("#vis").append("svg").attr("width", width).attr("height", height);
/* chrome cannot handle svg transforms, so svg is really a nested g tag */

svg = svg.append("g");
/* map for converting county id (fips) to population */

var popById = d3.map();
/* array of commutes */

var commutes = [],
    active_commutes = [];
/* wait for files to load and update popById */

queue().defer(d3.json, "data/us.json").defer(d3.tsv, "data/commuter.tsv").defer(d3.tsv, "data/population.tsv", function (d) {
  popById.set(d.id, +d.population);
}).await(ready);

function ready(error, us, commuter_data, onchage) {
  if (error) throw error;
  commutes = commuter_data;
  /* draw all counties */

  svg.append("g").attr("class", "counties").selectAll("path").data(topojson.feature(us, us.objects.counties).features).enter().append("path").attr("d", path).attr("class", "county").attr("id", function (d) {
    return "s" + d.id;
  }).on("mouseover", function () {
    this.parentNode.appendChild(this);
    d3.select(this).classed("hovered", true);
  }).on("mouseout", function () {
    d3.select(this).classed("hovered", false);
  }).on("click", county_clicked);
  /* draw all states */

  svg.append("g").attr("class", "states").selectAll("path").data(topojson.feature(us, us.objects.states).features).enter().append("path").attr("d", path).attr("class", "state").on("click", state_clicked);
}

function state_clicked(d) {
  if (active_state.node() != null && active_state.node() != this) return reset();
  /* remove old active states and counties */

  active_state.classed("active", false);
  active_counties.classed("active", false);
  /* make the clicked state active */

  active_state = d3.select(this).classed("active", true);
  /* make the state's counties active */

  var state_id = d.id;
  active_counties = svg.select("g.counties").selectAll("path.county").classed("active", function (d) {
    return Math.floor(d.id / 1000) == state_id && popById.get(d.id) !== undefined;
  });
  active_counties = active_counties.filter(".active");
  /* get all relevant commutes */

  active_commutes = commutes.filter(function (d) {
    var id = +d.home_id;
    return Math.floor(id / 1000) == state_id && popById.get(id) !== undefined;
  });
  /* initialize the simulation */

  var counties = [];
  active_counties.each(function (d, i) {
    counties.push(new _simulation.County(simulation, i, d.id, popById.get(d.id), active_commutes.filter(function (c) {
      return +c.home_id == d.id;
    })));
  });
  var r_nought = document.getElementById("reproduction").value;
  var D = document.getElementById("duration").value;
  var vacc = document.getElementById("vacc").value / 100;
  simulation.init(counties, r_nought * (1 / D), 1 / D, vacc, onchange);
  /* get bounds of state */

  var bounds = path.bounds(d),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = .9 / Math.max(dx / width, dy / height),
      translate = [width / 2 - scale * x, height / 2 - scale * y];
  /* transition svg to fit bounds of state */

  svg.transition().duration(750).style("stroke-width", 1.5 / scale + "px").attr("transform", "translate(" + translate + ")scale(" + scale + ")");
}

function county_clicked(d) {
  if (!simulation.running) {
    var n = Math.floor(document.getElementById("infected").value);
    simulation.start(d.id, n);
  }
}

function reset() {
  simulation.reset();
  active_state.classed("active", false);
  active_state = d3.select(null);
  active_counties.classed("active", false);
  active_counties = d3.select(null);
  svg.transition().duration(750).style("stroke-width", "1.5px").attr("transform", "");
}

function onchange(c_inf, t_inf, day) {
  document.getElementById("sim_day").innerHTML = Math.floor(day).toLocaleString();
  document.getElementById("c_inf").innerHTML = Math.round(c_inf).toLocaleString();
  document.getElementById("t_inf").innerHTML = Math.round(t_inf).toLocaleString();
}

d3.select(self.frameElement).style("height", height + "px");
},{"./simulation.js":"simulation.js"}],"../node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "63359" + '/');

  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);

          if (didAccept) {
            handled = true;
          }
        }
      }); // Enable HMR for CSS by default.

      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });

      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else {
        window.location.reload();
      }
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }

  if (checkedAssets[id]) {
    return;
  }

  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}

function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }
}
},{}]},{},["../node_modules/parcel-bundler/src/builtins/hmr-runtime.js","ui.js"], null)
//# sourceMappingURL=/ui.69528adb.js.map