// Global map reference
let map = window.map;
//shortest root

// Global layers for management
let hospitalLayer = L.layerGroup();
let schoolLayerGroup = L.layerGroup();
let bufferLayerGroup = L.layerGroup();
let schoolCluster = L.markerClusterGroup({ maxClusterRadius: 30 });
let clickBufferLayer = L.layerGroup(); // New layer group for click-based buffer

// Toggle for click-to-buffer functionality
let isClickBufferEnabled = false;
// Function to toggle click-to-buffer mode
function toggleClickBufferMode() {
  isClickBufferEnabled = !isClickBufferEnabled;
  console.log('Click-to-buffer mode:', isClickBufferEnabled ? 'Enabled' : 'Disabled');
  const button = document.getElementById('toggleClickBufferButton');
  button.textContent = isClickBufferEnabled ? 'Disable Click Buffer' : 'Enable Click Buffer';
  button.style.background = isClickBufferEnabled ? '#16a34a' : '#2563eb';
}

// Function to create buffer on map click and count schools/hospitals
function createBufferOnClick(e) {
  if (!isClickBufferEnabled) return; // Only proceed if mode is enabled
  console.log('Map clicked at:', e.latlng);

  const radius = 5; // 5km buffer
  const point = turf.point([e.latlng.lng, e.latlng.lat]);
  const buffered = turf.buffer(point, radius, { units: 'kilometers' });

  // Clear previous click buffer
  clickBufferLayer.clearLayers();

  // Add buffer to map
  L.geoJSON(buffered, {
    style: { color: '#ff7800', fillColor: '#ff7800', fillOpacity: 0.3, weight: 2 }
  }).addTo(clickBufferLayer);
  clickBufferLayer.addTo(map);

  // Fetch schools and hospitals
  const geoServerUrl = 'http://localhost:8080/geoserver/urban_planning/wfs';
  Promise.all([
    fetch(`${geoServerUrl}?service=WFS&version=1.0.0&request=GetFeature&typeName=urban_planning:school&outputFormat=application/json`, { mode: 'cors' }),
    fetch(`${geoServerUrl}?service=WFS&version=1.0.0&request=GetFeature&typeName=urban_planning:hospital&outputFormat=application/json`, { mode: 'cors' })
  ])
    .then(([schoolRes, hospitalRes]) => Promise.all([schoolRes.json(), hospitalRes.json()]))
    .then(([schoolData, hospitalData]) => {
      // Count schools within buffer
      const schoolsInBuffer = schoolData.features.filter(school => {
        const schoolPoint = turf.point(school.geometry.coordinates);
        return turf.booleanPointInPolygon(schoolPoint, buffered);
      });

      // Count hospitals within buffer
      const hospitalsInBuffer = hospitalData.features.filter(hospital => {
        const hospitalPoint = turf.point(hospital.geometry.coordinates);
        return turf.booleanPointInPolygon(hospitalPoint, buffered);
      });

      // Display results
      const message = `Buffer Analysis (5km radius):\n\n` +
        `Schools: ${schoolsInBuffer.length}\n` +
        `Hospitals: ${hospitalsInBuffer.length}`;
      alert(message);

      // Optionally, add markers for schools and hospitals in buffer
      schoolsInBuffer.forEach(school => {
        const coords = school.geometry.coordinates;
        L.marker([coords[1], coords[0]], {
          icon: L.icon({ iconUrl: 'img/school.png', iconSize: [24, 24], iconAnchor: [12, 12] })
        }).bindPopup(`<b>School:</b> ${school.properties.name_en || school.properties.name_ne || 'Unknown'}`)
          .addTo(clickBufferLayer);
      });

      hospitalsInBuffer.forEach(hospital => {
        const coords = hospital.geometry.coordinates;
        L.marker([coords[1], coords[0]], {
          icon: L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png', iconSize: [24, 24], iconAnchor: [12, 24] })
        }).bindPopup(`<b>Hospital:</b> ${hospital.properties.name_en || hospital.properties.name_ne || 'Unknown'}`)
          .addTo(clickBufferLayer);
      });
    })
    .catch(error => {
      console.error('Error in createBufferOnClick:', error);
      alert('Failed to process buffer. See console for details.');
    });
}

//Create Hospital Buffer
function createHospitalBuffer(radius) {
  console.log('Starting createHospitalBuffer with radius:', radius);
  const select = document.getElementById('hospitalSelect');
  const filter = select ? select.value : '';
  const url = 'http://localhost:8080/geoserver/urban_planning/wfs?request=GetFeature&typeName=urban_planning:hospital&outputFormat=application/json' +
    (filter ? `&cql_filter=name_en='${filter}'` : '');

  fetch(url, { mode: 'cors' })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      console.log('Fetched hospital data:', data);
      if (data.features && data.features.length > 0) {
        alert(`Created ${radius}km buffers around ${data.features.length} hospital${data.features.length > 1 ? 's' : ''}`);
        bufferLayerGroup.clearLayers();

        // Create buffer
        const buffered = turf.buffer(turf.featureCollection(data.features), radius, { units: 'kilometers' });

        // Add buffer to map
        L.geoJSON(buffered, {
          style: { color: '#2563eb', fillColor: '#bfdbfe', fillOpacity: 0.3, weight: 2 }
        }).addTo(bufferLayerGroup);


        // Add markers for each hospital
        data.features.forEach(feature => {
          const coords = feature.geometry.coordinates;
          const name = feature.properties.name_en || feature.properties.name_ne || 'Unknown';

          L.marker([coords[1], coords[0]], {
            icon: L.icon({
              iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
              iconSize: [24, 24],
              iconAnchor: [12, 24]
            })
          }).bindPopup(`<b>Hospital:</b> ${name}`).addTo(bufferLayerGroup);
        });

        // Add everything to map
        bufferLayerGroup.addTo(map);


      } else {
        console.log('No hospital data to buffer');
        alert('No hospital data available for buffering.');
      }
    })
    .catch(error => console.error('Error in createHospitalBuffer:', error));
}

//filter Pharmacy
function filterHospitalsByOperator(operator) {
  console.log('Starting filterHospitalsByOperator with operator:', operator);
  hospitalLayer.clearLayers();
  fetch('http://localhost:8080/geoserver/urban_planning/wfs?request=GetFeature&typeName=urban_planning:hospital&outputFormat=application/json&cql_filter=amenity=\'' + operator + '\'', { mode: 'cors' })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (data.features && data.features.length > 0) {
        data.features.forEach(hospital => {
          L.marker([hospital.geometry.coordinates[1], hospital.geometry.coordinates[0]], {
            icon: L.icon({ iconUrl: 'img/pharmacy.png', iconSize: [24, 24], iconAnchor: [12, 12] })
          }).bindPopup(`<b>Pharmacy:</b> ${hospital.properties.name || hospital.properties.name_ne || 'Unknown'}`)
            .addTo(hospitalLayer);
        });
        hospitalLayer.addTo(map);
        console.log('Filtered hospitals added:', hospitalLayer.getLayers().length);
      } else {
        console.log('No hospitals found for operator:', operator);
      }
    })
    .catch(error => console.error('Error in filterHospitalsByOperator:', error));
}
let provinceLayerGroup;

//Count School By Province
async function countSchoolsByProvince() {
  console.log('🔷 Starting countSchoolsByProvince');

  const geoServerUrl = 'http://localhost:8080/geoserver/urban_planning/wfs';

  // Fetch provinces
  const provincesRes = await fetch(
    `${geoServerUrl}?service=WFS&version=1.0.0&request=GetFeature&` +
    `typeName=urban_planning:provinces&outputFormat=application/json`
  );
  const provincesData = await provincesRes.json();
  const provinces = provincesData.features;

  if (!provinces.length) {
    alert('🚫 No provinces found!');
    return;
  }

  // Fetch schools
  const schoolsRes = await fetch(
    `${geoServerUrl}?service=WFS&version=1.0.0&request=GetFeature&` +
    `typeName=urban_planning:school&outputFormat=application/json`
  );
  const schoolsData = await schoolsRes.json();
  const schools = schoolsData.features;

  if (!schools.length) {
    alert('🚫 No schools found!');
    return;
  }

  const counts = {};
  const enrichedProvinces = [];

  provinces.forEach(province => {
    const provinceName = province.properties.pr_name || 'Unknown';
    const provincePolygon = turf.feature(province.geometry);

    const schoolsInProvince = schools.filter(school =>
      turf.booleanPointInPolygon(school, provincePolygon)
    );

    const count = schoolsInProvince.length;
    counts[provinceName] = count;

    province.properties.school_count = count;
    enrichedProvinces.push(province);
  });

  let message = '🏫 School counts by Province:\n\n';
  Object.entries(counts).forEach(([name, count]) => {
    message += `${name}: ${count}\n`;
  });
  alert(message);

  // Remove previous layers if exist
  if (window.provinceLayerGroup) map.removeLayer(window.provinceLayerGroup);
  if (window.provinceLabelsGroup) map.removeLayer(window.provinceLabelsGroup);

  // Color scale
  function getColor(count) {
    return count > 5000 ? '#800026' :
           count > 4000 ? '#BD0026' :
           count > 3000 ? '#E31A1C' :
           count > 2000 ? '#FC4E2A' :
           count > 1000 ? '#FD8D3C' :
           count > 0    ? '#FED976' :
                          '#FFEDA0';
  }

  // Add provinces polygons
  window.provinceLayerGroup = L.geoJSON(enrichedProvinces, {
    style: feature => ({
      color: 'black',
      weight: 1,
      fillColor: getColor(feature.properties.school_count),
      fillOpacity: 0.5
    }),
    onEachFeature: (feature, layer) => {
      const name = feature.properties.pr_name || 'Unknown';
      const count = feature.properties.school_count || 0;
      layer.bindPopup(`<b>${name}</b><br>Schools: ${count}`);
    }
  }).addTo(map);

  // Add province name labels
  window.provinceLabelsGroup = L.layerGroup();
  enrichedProvinces.forEach(province => {
    const name = province.properties.pr_name || 'Unknown';
    const center = turf.centerOfMass(province).geometry.coordinates;
    const label = L.marker([center[1], center[0]], {
      icon: L.divIcon({
        className: 'province-label',
        html: `<b>${name}</b>`,
        iconSize: [100, 20]
      })
    });
    window.provinceLabelsGroup.addLayer(label);
  });
  window.provinceLabelsGroup.addTo(map);

  map.fitBounds(window.provinceLayerGroup.getBounds());

  // Add legend (on left now)
  addLegend(map, getColor);
}


//selected province + roads (intersecting) road density
async function calculateRoadDensityForSelected() {
  const selectedName = document.getElementById('provinceSelect').value;
  if (!selectedName) {
    alert('Please select a province.');
    return;
  }

  const geoServerUrl = 'http://localhost:8080/geoserver/urban_planning/wfs';

  try {
    const province = window.allProvinces.find(
      p => p.properties.pr_name === selectedName
    );

    if (!province) {
      alert('Selected province not found.');
      return;
    }

    const provinceGeom = province;
    const provinceAreaKm2 = turf.area(provinceGeom) / 1e6;

    const roadsRes = await fetch(
      `${geoServerUrl}?service=WFS&version=1.0.0&request=GetFeature&` +
      `typeName=urban_planning:road&outputFormat=application/json`
    );
    const roadsData = await roadsRes.json();
    const roads = roadsData.features;

    let roadLengthKm = 0;
    const intersectingRoads = [];

    roads.forEach(road => {
      const roadGeom = road;
      const roadBuffered = turf.buffer(roadGeom, 0.0001, { units: 'kilometers' });

      const intersects = turf.booleanIntersects(roadBuffered, provinceGeom);
      if (intersects) {
        const lengthKm = turf.length(roadGeom, { units: 'kilometers' });
        roadLengthKm += lengthKm;

        intersectingRoads.push(road);
      }
    });

    const density = provinceAreaKm2 > 0 ? (roadLengthKm / provinceAreaKm2).toFixed(4) : 'N/A';

    const message = `🛣️ Road Density for ${selectedName}:\n\n` +
      `   Area: ${provinceAreaKm2.toFixed(2)} km²\n` +
      `   Roads: ${roadLengthKm.toFixed(2)} km\n` +
      `   Density: ${density} km/km²\n`;

    alert(message);

    // 🌏 Highlight on map
    if (provinceLayer) map.removeLayer(provinceLayer);
    if (roadsLayer) map.removeLayer(roadsLayer);

    provinceLayer = L.geoJSON(provinceGeom, {
      style: {
        color: 'black',
        fillColor: 'lightblue',
        fillOpacity: 0.2,
        weight: 2
      }
    }).addTo(map);

    roadsLayer = L.geoJSON(intersectingRoads, {
      style: {
        color: 'red',
        weight: 2
      }
    }).addTo(map);

    map.fitBounds(provinceLayer.getBounds());

  } catch (err) {
    console.error('Error calculating density:', err);
    alert('Error calculating density. See console.');
  }
}

//Filter School By District
// Global layer to hold the district
let districtLayer;

// Filter School By District
function filterSchoolsByDistrict() {
  console.log('Filtering schools by district');
  const select = document.getElementById('districtSelect');
  if (!select) {
    console.error('District select element not found');
    return;
  }

  const districtName = select.value;
  console.log('Selected district:', districtName);

  schoolLayerGroup.clearLayers();
  if (districtLayer) {
    map.removeLayer(districtLayer);
  }

  if (!districtName) {
    console.log('No district selected');
    return;
  }

  console.log('Fetching district polygon for:', districtName);
  fetch(`http://localhost:8080/geoserver/urban_planning/wfs?request=GetFeature&typeName=urban_planning:districts&outputFormat=application/json&cql_filter=district='${districtName}'`, {
    mode: 'cors'
  })
    .then(res => {
      console.log('District polygon fetch response:', res.status, res.statusText);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status} - ${res.statusText}`);
      return res.json();
    })
    .then(districtData => {
      console.log('District polygon data:', JSON.stringify(districtData, null, 2));
      if (districtData.features && districtData.features.length > 0) {
        const districtFeature = districtData.features[0];
        const districtPolygon = districtFeature.geometry;

        // 🌏 Add district polygon to map
        districtLayer = L.geoJSON(districtFeature, {
          style: {
            color: 'black',
            weight: 2,
            fillColor: 'lightblue',
            fillOpacity: 0.5
          }
        }).addTo(map);

        map.fitBounds(districtLayer.getBounds());

        if (districtPolygon.type === 'MultiPolygon') {
          const firstPolygon = districtPolygon.coordinates[0];
          console.log('First polygon coordinates:', firstPolygon);
          if (firstPolygon && firstPolygon.length > 0 && firstPolygon[0].length >= 4) {
            fetch('http://localhost:8080/geoserver/urban_planning/wfs?request=GetFeature&typeName=urban_planning:school&outputFormat=application/json', {
              mode: 'cors'
            })
              .then(res => {
                console.log('School fetch response:', res.status, res.statusText);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
              })
              .then(schoolData => {
                console.log('School data received:', JSON.stringify(schoolData, null, 2));
                if (schoolData.features) {
                  schoolLayerGroup.clearLayers();
                  const turfPoly = turf.polygon(firstPolygon);

                  schoolData.features.forEach(school => {
                    const point = turf.point(school.geometry.coordinates);
                    console.log('Checking school point:', point);
                    if (turf.booleanPointInPolygon(point, turfPoly)) {
                      const schoolName = school.properties.name_en || school.properties.name_ne || school.properties.name || 'Unknown';
                      const schoolType = school.properties.type || 'N/A';
                      L.marker([school.geometry.coordinates[1], school.geometry.coordinates[0]], {
                        icon: L.icon({ iconUrl: 'img/school.png', iconSize: [24, 24], iconAnchor: [12, 12] })
                      }).bindPopup(`<b>School:</b> ${schoolName}<br>Type: ${schoolType}`)
                        .addTo(schoolLayerGroup);
                    } else {
                      console.log('School outside polygon:', school.properties.name_en || 'Unknown');
                    }
                  });

                  schoolLayerGroup.addTo(map);
                  console.log('Filtered schools added:', schoolLayerGroup.getLayers().length);
                } else {
                  console.log('No school data available');
                }
              })
              .catch(error => console.error('Error fetching schools:', error));
          } else {
            console.error('Invalid polygon: Each LinearRing must have 4 or more positions', firstPolygon);
          }
        } else {
          console.error('Unexpected geometry type:', districtPolygon.type);
        }
      } else {
        console.log('No polygon data for district:', districtName);
      }
    })
    .catch(error => console.error('Error fetching district:', error));
}

//Load And Show Chart
async function loadAndShowCharts() {
  const geoServerUrl = 'http://localhost:8080/geoserver/urban_planning/wfs';

  // Fetch provinces
  const provincesRes = await fetch(
    `${geoServerUrl}?service=WFS&version=1.0.0&request=GetFeature&` +
    `typeName=urban_planning:provinces&outputFormat=application/json`
  );
  const provincesData = await provincesRes.json();
  const provinces = provincesData.features;

  if (!provinces.length) {
    alert('No provinces found');
    return;
  }

  // Fetch schools
  const schoolsRes = await fetch(
    `${geoServerUrl}?service=WFS&version=1.0.0&request=GetFeature&` +
    `typeName=urban_planning:school&outputFormat=application/json`
  );
  const schoolsData = await schoolsRes.json();
  const schools = schoolsData.features;

  // Fetch hospitals
  const hospitalsRes = await fetch(
    `${geoServerUrl}?service=WFS&version=1.0.0&request=GetFeature&` +
    `typeName=urban_planning:hospital&outputFormat=application/json`
  );
  const hospitalsData = await hospitalsRes.json();
  const hospitals = hospitalsData.features;

  // Prepare counts
  const provinceNames = [];
  const schoolCounts = [];
  const hospitalCounts = [];
  // Count schools in each province
  const counts = {};
  const enrichedProvinces = [];

  provinces.forEach(province => {
    const provinceName = province.properties.pr_name || 'Unknown';
    provinceNames.push(provinceName);

    const provincePolygon = turf.feature(province.geometry);

    // Count schools in this province
    const schoolsInProvince = schools.filter(school =>
      turf.booleanPointInPolygon(school, provincePolygon)
    );
    schoolCounts.push(schoolsInProvince.length);

    // Count hospitals in this province
    const hospitalsInProvince = hospitals.filter(hospital =>
      turf.booleanPointInPolygon(hospital, provincePolygon)
    );
    hospitalCounts.push(hospitalsInProvince.length);
  });

  // Create School Chart
  const schoolCtx = document.getElementById('schoolChart').getContext('2d');
  new Chart(schoolCtx, {
    type: 'bar',
    data: {
      labels: provinceNames,
      datasets: [{
        label: 'Number of Schools',
        data: schoolCounts,
        backgroundColor: '#3b82f6',
        borderColor: '#1d4ed8',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Schools by Province'
        },
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  // Create Hospital Chart
  const hospitalCtx = document.getElementById('hospitalChart').getContext('2d');
  new Chart(hospitalCtx, {
    type: 'bar',
    data: {
      labels: provinceNames,
      datasets: [{
        label: 'Number of Hospitals',
        data: hospitalCounts,
        backgroundColor: '#16a34a',
        borderColor: '#15803d',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Hospitals by Province'
        },
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// Run the function
loadAndShowCharts().catch(err => {
  console.error('Error loading charts:', err);
  alert('Failed to load chart data');
});
// Add click event listener for buffer creation
map.on('click', createBufferOnClick);