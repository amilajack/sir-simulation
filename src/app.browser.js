import { County, SirSimulation } from './simulation';

const simulation = new SirSimulation();

const width = 960;
const height = 600;

/* d3 selectors with active elements when a state is selected */
let activeState = d3.select(null);
let activeCounties = d3.select(null);

/* standard US projection */
const projection = d3.geo
  .albersUsa()
  .scale(1280)
  .translate([width / 2, height / 2]);

/* path used to draw all geometric elements */
const path = d3.geo.path().projection(projection);

/* create a new svg element */
let svg = d3
  .select('#vis')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

/* chrome cannot handle svg transforms, so svg is really a nested g tag */
svg = svg.append('g');

/* map for converting county id (fips) to population */
const popById = d3.map();

/* array of commutes */
let commutes = [];
let activeCommutes = [];

/* wait for files to load and update popById */
const root =
  'https://raw.githubusercontent.com/amilajack/sir-simulation/master/data/';
queue()
  .defer(d3.json, `${root}us.json`)
  .defer(d3.tsv, `${root}commuter.tsv`)
  .defer(d3.tsv, `${root}population.tsv`, function(d) {
    popById.set(d.id, +d.population);
  })
  .await(ready);

function ready(error, us, commuterData) {
  if (error) throw error;

  commutes = commuterData;

  /* draw all counties */
  svg
    .append('g')
    .attr('class', 'counties')
    .selectAll('path')
    .enter()
    .append('path')
    .attr('d', path)
    .attr('class', 'county')
    .attr('id', function(d) {
      return `s${d.id}`;
    })
    .on('mouseover', function() {
      this.parentNode.appendChild(this);
      d3.select(this).classed('hovered', true);
    })
    .on('mouseout', function() {
      d3.select(this).classed('hovered', false);
    })
    .on('click', countyClicked);

  /* draw all states */
  svg
    .append('g')
    .attr('class', 'states')
    .selectAll('path')
    .enter()
    .append('path')
    .attr('d', path)
    .attr('class', 'state')
    .on('click', stateClicked);
}

function stateClicked(d) {
  if (activeState.node() != null && activeState.node() != this) return reset();

  /* remove old active states and counties */
  activeState.classed('active', false);
  activeCounties.classed('active', false);

  /* make the clicked state active */
  activeState = d3.select(this).classed('active', true);

  /* make the state's counties active */
  const state_id = d.id;
  activeCounties = svg
    .select('g.counties')
    .selectAll('path.county')
    .classed('active', function(d) {
      return (
        Math.floor(d.id / 1000) == state_id && popById.get(d.id) !== undefined
      );
    });
  activeCounties = activeCounties.filter('.active');

  /* get all relevant commutes */
  activeCommutes = commutes.filter(function(d) {
    const id = +d.home_id;
    return Math.floor(id / 1000) == state_id && popById.get(id) !== undefined;
  });

  /* initialize the simulation */
  const counties = [];
  activeCounties.each(function(d, i) {
    counties.push(
      new County(
        simulation,
        i,
        d.id,
        popById.get(d.id),
        activeCommutes.filter(function(c) {
          return +c.home_id == d.id;
        })
      )
    );
  });
  const r_nought = document.getElementById('reproduction').value;
  const D = document.getElementById('duration').value;
  const vacc = document.getElementById('vacc').value / 100;
  simulation.init(counties, r_nought * (1 / D), 1 / D, vacc, onchange);

  /* get bounds of state */
  const bounds = path.bounds(d);
  const dx = bounds[1][0] - bounds[0][0];
  const dy = bounds[1][1] - bounds[0][1];
  const x = (bounds[0][0] + bounds[1][0]) / 2;
  const y = (bounds[0][1] + bounds[1][1]) / 2;
  const scale = 0.9 / Math.max(dx / width, dy / height);
  const translate = [width / 2 - scale * x, height / 2 - scale * y];

  /* transition svg to fit bounds of state */
  svg
    .transition()
    .duration(750)
    .style('stroke-width', `${1.5 / scale}px`)
    .attr('transform', `translate(${translate})scale(${scale})`);
}

function countyClicked(d) {
  if (!simulation.running) {
    const n = Math.floor(document.getElementById('infected').value);
    simulation.start(d.id, n);
  }
}

function reset() {
  simulation.reset();

  activeState.classed('active', false);
  activeState = d3.select(null);

  activeCounties.classed('active', false);
  activeCounties = d3.select(null);

  svg
    .transition()
    .duration(750)
    .style('stroke-width', '1.5px')
    .attr('transform', '');
}

function onchange(cInf, tInf, day) {
  document.getElementById('sim_day').innerHTML = Math.floor(
    day
  ).toLocaleString();
  document.getElementById('c_inf').innerHTML = Math.round(
    cInf
  ).toLocaleString();
  document.getElementById('t_inf').innerHTML = Math.round(
    tInf
  ).toLocaleString();
}

d3.select(self.frameElement).style('height', `${height}px`);
