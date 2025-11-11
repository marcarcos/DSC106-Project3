import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import * as topojson from 'https://cdn.jsdelivr.net/npm/topojson-client@3/+esm';

// Load US map from the us-atlas package (TopoJSON format)
const us = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json");

// Convert TopoJSON → GeoJSON so D3 can draw it
const states = topojson.feature(us, us.objects.states);

const world = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
const countries = topojson.feature(world, world.objects.countries);

const width = 1200;
const height = 800;
const margin = { top: 20, right: 20, bottom: 30, left: 40 };

const svg = d3.select('#map-container')
    .attr('width', width)
    .attr('height', height);

const g = svg.append('g');

async function loadFireData() {
  try {
    const fireData = await d3.csv('SUOMI_VIIRS_C2_USA_contiguous_and_Hawaii_7d.csv');
    fireData.forEach(d => {
        d.latitude = +d.latitude;
        d.longitude = +d.longitude;
        d.frp = +d.frp;
    });
    return fireData;
  } catch (error) {
    console.error('Error loading fire data:', error);
  }
}

const fireData = await loadFireData();

const minLat = d3.min(fireData, d => d.latitude);
const maxLat = d3.max(fireData, d => d.latitude);
const minLon = d3.min(fireData, d => d.longitude);
const maxLon = d3.max(fireData, d => d.longitude);

const mapProjection = d3.geoMercator() // not geoAlbersUsa()
  .center([0, 38]) // roughly center of the lower 48
  .rotate([98, 0]) // rotate to center on US
  .scale(1200) // tweak this to fit your SVG
  .translate([width / 2, height / 2 + 20]);

const pointsProjection = d3.geoMercator() // not geoAlbersUsa()
  .center([0, 38]) // roughly center of the lower 48
  .rotate([98, 0]) // rotate to center on US
  .scale(1200) // tweak this to fit your SVG
  .translate([width / 2, height / 2 + 20]);

const path = d3.geoPath().projection(mapProjection);

g.append('g')
  .selectAll('path')
  .data(countries.features)
  .join('path')
  .attr('d', path)
  .attr('fill', '#eee')
  .attr('stroke', '#333');

const filteredData = fireData.filter(d => {
  const lat = +d.latitude;
  const lon = +d.longitude;
  const projected = mapProjection([lon, lat]);
  return projected && lat >= 26 && lat <= 49 && lon >= -125 && lon <= -66;
});

g.selectAll('circle')
  .data(filteredData)
  .join('circle')
  .attr('cx', d => pointsProjection([d.longitude, d.latitude])[0])
  .attr('cy', d => pointsProjection([d.longitude, d.latitude])[1])
  .attr('r', 2)
  .attr('fill', 'red')
  .attr('opacity', 0.4);

  console.log('hi');


//add time slider functionality
function timeSlider(value) {
    const hour = +value;
    const filteredByTime = fireData.filter(d => {
        const acqTime = +d.acq_time;
        return Math.floor(acqTime / 100) === hour;
    });

    const visibleData = filteredByTime.filter(d => {
        const lat = +d.latitude;
        const lon = +d.longitude;
        const projected = mapProjection([lon, lat]);
        return projected && lat >= 26 && lat <= 49 && lon >= -125 && lon <= -66;
    });

    const circles = g.selectAll('circle')
        .data(visibleData, d => d.latitude + ',' + d.longitude);

    circles.enter()
        .append('circle')
        .attr('cx', d => pointsProjection([d.longitude, d.latitude])[0])
        .attr('cy', d => pointsProjection([d.longitude, d.latitude])[1])
        .attr('r', 2)
        .attr('fill', 'red')
        .attr('opacity', 0.4)
      .merge(circles)
        .attr('cx', d => pointsProjection([d.longitude, d.latitude])[0])
        .attr('cy', d => pointsProjection([d.longitude, d.latitude])[1]);

    circles.exit().remove();
}

d3.select('#time-slider').on('input', function() {
    timeSlider(this.value);
});

//loading tooltip function
function tooltipLoad(event){
    const tooltip = d3.select('#tooltip');
    tooltip.style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY + 10) + 'px')
              .style('opacity', 1)
              .html(`Latitude: ${event.latitude}<br>Longitude: ${event.longitude}<br>FRP: ${event.frp}`);
    
}

//zoom functionality function
const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on('zoom', (event) => {
        g.selectAll('path')
            .attr('transform', event.transform);
        g.selectAll('circle')
            .attr('transform', event.transform)
            .attr('r', 2 / event.transform.k); // adjust circle size on zoom
    });
    
svg.call(zoom);

//add event listeners for tooltip
svg.selectAll('circle')
    .on('mouseover', (event, d) => {
        //tooltipLoad(d);
        renderTooltipContent(d);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
    })
    .on('mouseout', () => {
        updateTooltipVisibility(false);
    });


function renderTooltipContent(fire) {
  const lat = document.getElementById('tooltip-lat');
  const lon = document.getElementById('tooltip-lon');
  const time = document.getElementById('tooltip-time');
  const frp = document.getElementById('tooltip-frp');

  const hour = Math.round(fire.acq_time/ 100);
  const minute = String(fire.acq_time % 100);

  if (Object.keys(fire).length === 0) return;
 
  lat.textContent = fire.latitude;
  lon.textContent = fire.longitude;
  time.textContent = `${hour}:${minute.padEnd(2, '0')}`;
  frp.textContent = fire.frp;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('fire-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('fire-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}