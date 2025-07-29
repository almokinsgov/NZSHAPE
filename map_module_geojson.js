// map.js – GeoJSON Loader for Far North District Alerts
(function (global) {
  const GEOJSON_KEY = "farNorthGeoJSON";
  const GEOJSON_TIMESTAMP_KEY = "farNorthGeoJSON_timestamp";
  const GEOJSON_EXPIRY_HOURS = 24;

  // Embedded fallback GeoJSON (truncated for brevity)
  const embeddedGeoJSON = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          Name: "Far North District",
          TA2022_V1_00: "001",
          TA2022_V1_00_NAME: "Far North District",
          TA2022_V1_00_NAME_ASCII: "Far North District"
        },
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [173.160619, -35.311454],
                [173.160236, -35.310268],
                [173.160056, -35.311313],
                [173.160619, -35.311454]
              ]
            ]
          ]
        }
      }
    ]
  };

  function isGeoJSONExpired() {
    const saved = localStorage.getItem(GEOJSON_TIMESTAMP_KEY);
    if (!saved) return true;
    const age = (Date.now() - parseInt(saved)) / (1000 * 60 * 60);
    return age > GEOJSON_EXPIRY_HOURS;
  }

  async function loadFarNorthGeoJSON() {
    if (!isGeoJSONExpired()) {
      try {
        const stored = JSON.parse(localStorage.getItem(GEOJSON_KEY));
        if (stored?.type === "FeatureCollection") return stored;
      } catch {
        console.warn("Corrupted GeoJSON in cache.");
      }
    }

    try {
      const proxy = "https://corsproxy.io/?";
      const url = "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/main/far_north.geojson";
      const res = await fetch(proxy + encodeURIComponent(url));
      const json = await res.json();
      localStorage.setItem(GEOJSON_KEY, JSON.stringify(json));
      localStorage.setItem(GEOJSON_TIMESTAMP_KEY, Date.now().toString());
      return json;
    } catch (e) {
      console.warn("Failed to fetch live GeoJSON, using embedded fallback.");
      localStorage.setItem(GEOJSON_KEY, JSON.stringify(embeddedGeoJSON));
      localStorage.setItem(GEOJSON_TIMESTAMP_KEY, Date.now().toString());
      return embeddedGeoJSON;
    }
  }

  // Export function globally under `MapModule`
  global.MapModule = {
    loadFarNorthGeoJSON
  };
})(window);
