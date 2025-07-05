// Initialize the map
window.map = L.map('map', {
  center: [28.7, 83.4], // Nepal center
  zoom: 7,
});

// Base maps
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  opacity: 0.75, 
  attribution: '© OpenStreetMap contributors'
}).addTo(map); // OSM as the default base layer

const cartoDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19
});

const esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles © Esri',
  maxZoom: 18
});

// WMS Layers from GeoServer
window.schoolLayer = L.tileLayer.wms('http://localhost:8080/geoserver/urban_planning/wms', {
  layers: 'urban_planning:school',
  styles: '',
  format: 'image/png',
  transparent: true,
  attribution: 'Schools'
});

window.hospitalLayer = L.tileLayer.wms('http://localhost:8080/geoserver/urban_planning/wms', {
  layers: 'urban_planning:hospital',
  styles: '',
  format: 'image/png',
  transparent: true,
  attribution: 'Hospitals'
});

window.roadLayer = L.tileLayer.wms('http://localhost:8080/geoserver/urban_planning/wms', {
  layers: 'urban_planning:road',
  styles: '',
  format: 'image/png',
  transparent: true,
  attribution: 'Roads'
});

window.provinceLayer = L.tileLayer.wms('http://localhost:8080/geoserver/urban_planning/wms', {
  layers: 'urban_planning:provinces',
  styles: '',
  format: 'image/png',
  transparent: true,
  attribution: 'Provinces'
});

window.districtLayer = L.tileLayer.wms('http://localhost:8080/geoserver/urban_planning/wms', {
  layers: 'urban_planning:districts',
  styles: '',
  format: 'image/png',
  transparent: true,
  attribution: 'Districts'
});

window.localLevelLayer = L.tileLayer.wms('http://localhost:8080/geoserver/urban_planning/wms', {
  layers: 'urban_planning:local_levels',
  styles: '',
  format: 'image/png',
  transparent: true,
  attribution: 'Local Levels'
});

// Layer control with only base maps (will be added to settings box)
const baseMaps = {
  'OpenStreetMap': osm,
  'CartoDB Dark Matter': cartoDark,
  'ESRI': esri
};

const overlayMaps = {}; // Empty overlayMaps
L.control.layers(baseMaps, overlayMaps).addTo(map);

// Add default base map
osm.addTo(map);

// Function to initialize layer control in settings box
function initializeLayerControl() {
  const layerControl = L.control.layers(baseMaps, overlayMaps, { collapsed: false });
  layerControl.addTo(map); // Add to map temporarily to get the container
  const container = layerControl.getContainer();
  if (container) {
    const layerControlContainer = document.getElementById('layerControlContainer');
    if (layerControlContainer) {
      layerControlContainer.appendChild(container);
      console.log('Layer control initialized in settings:', container);
    } else {
      console.error('Layer control container (#layerControlContainer) not found in DOM');
    }
  } else {
    console.error('Failed to get layer control container');
  }
  map.removeControl(layerControl); // Remove from map to avoid duplication
}

// Ensure the map renders correctly
window.map.invalidateSize();
console.log('Map initialized:', window.map);
console.log('Default layer added:', osm);

// Function to toggle layers via checkboxes (for overlays only, base maps handled by control)
function toggleLayer(layerName) {
  console.log('Attempting to toggle layer:', layerName);
  if (layerName === 'osm' || layerName === 'cartoDark' || layerName === 'esri') {
    console.log('Base map toggling not supported via this function; use layer control instead.');
    return;
  }
  const layer = window[layerName];
  console.log('Layer object:', layer);
  if (layer) {
    if (map.hasLayer(layer)) {
      map.removeLayer(layer);
      console.log('Overlay layer removed:', layerName);
    } else {
      layer.addTo(map);
      console.log('Overlay layer added:', layerName);
    }
  } else {
    console.log('Layer not found in window object for:', layerName);
  }
}

// Populate dropdowns on load with flexible property handling and initialize layer groups
window.onload = function() {
  const hospitalSelect = document.getElementById('hospitalSelect');
  const districtSelect = document.getElementById('districtSelect');
  console.log('Window loaded, checking selects:', { hospitalSelect, districtSelect });

  if (hospitalSelect) {
    console.log('Fetching hospital data from:', 'http://localhost:8080/geoserver/urban_planning/wfs?request=GetFeature&typeName=urban_planning:hospital&outputFormat=application/json');
    fetch('http://localhost:8080/geoserver/urban_planning/wfs?request=GetFeature&typeName=urban_planning:hospital&outputFormat=application/json', {
      mode: 'cors'
    })
      .then(res => {
        console.log('Hospital fetch response:', { status: res.status, statusText: res.statusText });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status} - ${res.statusText}`);
        return res.json();
      })
      .then(data => {
        console.log('Hospital data received:', JSON.stringify(data, null, 2));
        if (data.features && data.features.length > 0) {
          hospitalSelect.innerHTML = '<option value="">All</option>'; // Reset with default
          data.features.forEach(hospital => {
            const name = hospital.properties.name_en || hospital.properties.name_ne || hospital.properties.name || hospital.properties.name_np || 'Unknown';
            if (name && name.trim() !== '') {
              const option = document.createElement('option');
              option.value = name;
              option.text = name;
              hospitalSelect.appendChild(option);
            } else {
              console.log('No valid name found for hospital:', hospital.properties);
            }
          });
          console.log('Hospital select populated with:', hospitalSelect.options.length, 'options');
        } else {
          console.log('No hospital features found in data:', data);
        }
      })
      .catch(error => console.error('Error populating hospital select:', error.message, error));
  } else {
    console.error('Hospital select element not found in DOM');
  }

  if (districtSelect) {
    console.log('Fetching district data from:', 'http://localhost:8080/geoserver/urban_planning/wfs?request=GetFeature&typeName=urban_planning:districts&outputFormat=application/json');
    fetch('http://localhost:8080/geoserver/urban_planning/wfs?request=GetFeature&typeName=urban_planning:districts&outputFormat=application/json', {
      mode: 'cors'
    })
      .then(res => {
        console.log('District fetch response:', { status: res.status, statusText: res.statusText });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status} - ${res.statusText}`);
        return res.json();
      })
      .then(data => {
        console.log('District data received:', JSON.stringify(data, null, 2));
        if (data.features && Array.isArray(data.features) && data.features.length > 0) {
          districtSelect.innerHTML = '<option value="">Select District</option>'; // Reset with default
          const uniqueDistricts = new Set();
          data.features.forEach(feature => {
            const name = feature.properties.district || feature.properties.district_name || feature.properties.name || 'Unknown';
            if (name && name.trim() !== '' && !uniqueDistricts.has(name)) {
              uniqueDistricts.add(name);
              const option = document.createElement('option');
              option.value = name;
              option.text = name;
              districtSelect.appendChild(option);
            } else if (name && name.trim() !== '') {
              console.log('Duplicate or invalid district name skipped:', name);
            } else {
              console.log('No valid name found for district:', feature.properties);
            }
          });
          console.log('District select populated with:', districtSelect.options.length, 'unique options');
        } else {
          console.log('No valid district features found in data:', data);
        }
      })
      .catch(error => console.error('Error populating district select:', error.message, error));
  } else {
    console.error('District select element not found in DOM');
  }

  // Initialize dynamic layer groups after dropdowns are populated
  console.log('Initializing dynamic layer groups');
  window.bufferLayerGroup = L.layerGroup();
  window.hospitalLayerGroup = L.layerGroup();
  window.schoolLayerGroup = L.layerGroup();
  window.schoolCluster = L.markerClusterGroup({ maxClusterRadius: 30 });
  console.log('Layer groups initialized:', { bufferLayerGroup, hospitalLayerGroup, schoolLayerGroup, schoolCluster });

  // Initialize layer control after DOM is loaded
  initializeLayerControl();
};
async function populateProvinces() {
  const geoServerUrl = 'http://localhost:8080/geoserver/urban_planning/wfs';

  try {
    const res = await fetch(
      `${geoServerUrl}?service=WFS&version=1.0.0&request=GetFeature&` +
      `typeName=urban_planning:provinces&outputFormat=application/json`
    );
    const data = await res.json();
    const provinces = data.features;

    const select = document.getElementById('provinceSelect');
    provinces.forEach(province => {
      const name = province.properties.pr_name || 'Unknown';
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });

    // Store all provinces for later
    window.allProvinces = provinces;

  } catch (err) {
    console.error('Error fetching provinces:', err);
  }
}

// Run it on page load
populateProvinces();


// Clear all functions, preserving the base map with enhanced debugging and fallback
function clearFunctions() {
  console.log('Starting clearFunctions');
  if (!window.map) {
    console.error('Map is not initialized');
    return;
  }

  // Identify and preserve base maps
  let baseMaps = [osm, cartoDark, esri];
  console.log('Checking map layers for removal');
  map.eachLayer(layer => {
    console.log('Evaluating layer:', layer);
    if (!baseMaps.includes(layer)) {
      map.removeLayer(layer);
      console.log('Removed non-base layer:', layer);
    } else {
      console.log('Preserved base layer:', layer);
    }
  });

  // Clear specific layer groups
  console.log('Clearing layer groups');
  ['bufferLayerGroup', 'hospitalLayerGroup', 'schoolLayerGroup', 'schoolCluster','clickBufferLayer','provinceLayerGroup','provinceLabelsGroup','legendControl'].forEach(groupName => {
    const group = window[groupName];
    if (group) {
      console.log('Clearing', groupName);
      group.clearLayers();
      if (map.hasLayer(group)) {
        map.removeLayer(group);
        console.log('Removed layer group:', groupName);
      } else {
        console.log('Layer group', groupName, 'not on map');
      }
    } else {
      console.log('Layer group', groupName, 'not found');
    }
  });

  // Hide all function boxes
  console.log('Hiding function boxes');
  const functionBoxes = document.querySelectorAll('.function-box');
  if (functionBoxes.length > 0) {
    functionBoxes.forEach(box => {
      if (!box.classList.contains('hidden')) {
        box.classList.add('hidden');
        console.log('Hidden function box:', box.id);
      } else {
        console.log('Function box already hidden:', box.id);
      }
    });
  } else {
    console.error('No function boxes found in DOM');
  }

  console.log('ClearFunctions completed');
}
//Legend on the map
function addLegend(map, getColor) {
  if (window.legendControl) map.removeControl(window.legendControl);

  const legend = L.control({ position: 'bottomleft' });

  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'info legend');
    const grades = [0, 1, 1000, 2000, 3000, 4000, 5000];

    div.innerHTML += '<b>Schools Count</b><br>';

    for (let i = 0; i < grades.length; i++) {
      const from = grades[i];
      const to = grades[i + 1] - 1;

      div.innerHTML +=
        `<i style="background:${getColor(from + 1)}"></i> ` +
        `${from}${to ? '&ndash;' + to : '+'}<br>`;
    }

    return div;
  };

  legend.addTo(map);
  window.legendControl = legend;
}
