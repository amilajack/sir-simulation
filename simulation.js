export function SirSimulation() {
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

  this.init = function(counties, beta, gamma, vacc, callback) {
    this.cs = counties;
    this.beta = beta / this.rate;
    this.gamma = gamma / this.rate;
    this.vacc = vacc;
    this.callback = callback;
    this.range = [0, this.max_pop()];
    this.color = d3.scale
      .pow()
      .exponent(0.33)
      .domain(this.range)
      .range(["#ffffff", "#08306b"]);
    this.init_cs();
  };

  this.start = function(cid, n) {
    this.running = true;
    const c = this.cs[this.idToI.get(cid)];
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

  this.update = that => {
    that.callback(that.current_inf, that.total_inf, that.day / that.rate);
    let c;
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

  this.max_pop = function() {
    let max = 0;
    for (let i = 0; i < this.cs.length; i++) {
      max = Math.max(this.cs[i].pop, max);
    }
    return max;
  };

  this.total_infected = function() {
    let total = 0;
    for (let i = 0; i < this.cs.length; i++) {
      total += this.cs[i].inf;
    }
    return total;
  };

  const self = this;

  this.init_cs = function() {
    this.idToI = d3.map();
    let c;
    for (let i = 0; i < this.cs.length; i++) {
      c = this.cs[i];
      this.idToI.set(c.id, i);
      c.rec = c.pop * self.vacc;
      c.sus = c.pop - c.rec;
      c.inf = 0;
      c.init();
    }
  };

  this.reset = function() {
    clearInterval(this.interval);
    this.callback(0, 0, 0);
    this.running = false;
  };
}

export function County(simulation, i, id, pop, coms) {
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

  this.init = function() {
    const c = simulation.color(this.pop);
    const d = d3.rgb(c);
    d.r = d.b;
    d.g = d.b;
    d.b = 0;
    this.color = d3.scale
      .pow()
      .exponent(0.2)
      .domain([0, 1])
      .range([c, d.toString()]);
    d3.select(`#s${this.id}`).style("fill", c);
  };

  this.step = function() {
    for (let i = 0; i < this.coms.length; i++) {
      const com = this.coms[i];
      const ci = simulation.idToI.get(+com.work_id);
      const c = simulation.cs[ci];
      const n = +com.total;
      const dx = simulation.beta * this.inf * (n / this.pop) * (c.sus / c.pop);
      c.da += dx;
    }
    this.da += simulation.beta * this.inf * (this.sus / this.pop);
    this.db += simulation.gamma * this.inf;
  };

  this.flush = function() {
    this.sus += -this.da;
    this.inf += this.da - this.db;
    this.rec += this.db;

    simulation.total_inf += this.da;
    simulation.current_inf += this.da - this.db;

    d3.select(`#s${this.id}`).style("fill", this.color(this.inf / this.pop));
  };
}
