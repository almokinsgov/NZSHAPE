// weather-alerts.js
(async function () {
  const DEFAULT_OPTIONS = {
    targetId: "alerts",
    showNonFarNorthAlerts: false,
    requireOnsetWithinWindow: false,
    hourWindow: 100,
    feedURL: "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/refs/heads/main/alerts/latest.xml",
    farNorthName: "Far North District",
    proxyURL: "https://corsproxy.io/?"
  };

  const GEOJSON_KEY = "farNorthGeoJSON";
  const GEOJSON_TIMESTAMP_KEY = "farNorthGeoJSON_timestamp";
  const GEOJSON_EXPIRY_HOURS = 24;

  function isGeoJSONExpired() {
    const saved = localStorage.getItem(GEOJSON_TIMESTAMP_KEY);
    if (!saved) return true;
    const age = (Date.now() - parseInt(saved)) / (1000 * 60 * 60);
    return age > GEOJSON_EXPIRY_HOURS;
  }

  async function loadFarNorthGeoJSON(farNorthName) {
    if (!isGeoJSONExpired()) {
      try {
        const stored = JSON.parse(localStorage.getItem(GEOJSON_KEY));
        if (stored?.type === "FeatureCollection") return stored;
      } catch {
        console.warn("Corrupted stored GeoJSON, regenerating.");
      }
    }

    const geoJSON = {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "properties": { "Name": farNorthName },
          "geometry": {
            "type": "MultiPolygon",
            "coordinates": [
              [[[173.160619, -35.311454]]] // Placeholder; replace with real Far North coordinates
            ]
          }
        }
      ]
    };

    localStorage.setItem(GEOJSON_KEY, JSON.stringify(geoJSON));
    localStorage.setItem(GEOJSON_TIMESTAMP_KEY, Date.now().toString());
    return geoJSON;
  }

  function isWithinHourWindow(onsetText, hourWindow) {
    if (!onsetText) return false;
    const now = new Date();
    const onset = new Date(onsetText);
    const diffHours = (onset - now) / 3600000;
    return diffHours >= 0 && diffHours <= hourWindow;
  }

  function formatReadableTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('en-NZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  async function fetchAndRenderAlerts(config, farNorthGeoJSON) {
    const { targetId, showNonFarNorthAlerts, requireOnsetWithinWindow, hourWindow, proxyURL, feedURL } = config;
    const target = document.getElementById(targetId);
    if (!target) return;

    target.innerHTML = "<i>Loading alerts...</i>";

    try {
      const feedRes = await fetch(proxyURL + encodeURIComponent(feedURL));
      const feedText = await feedRes.text();
      const xml = new DOMParser().parseFromString(feedText, "application/xml");
      const ns = "http://www.w3.org/2005/Atom";
      const entries = [...xml.getElementsByTagNameNS(ns, "entry")];
      const links = entries
        .map(e => e.querySelector("link[rel='related']")?.getAttribute("href"))
        .filter(Boolean);

      const alertCards = [];

      for (const url of links) {
        const capRes = await fetch(proxyURL + encodeURIComponent(url));
        const capText = await capRes.text();
        const capXML = new DOMParser().parseFromString(capText, "application/xml");
        const capNS = "urn:oasis:names:tc:emergency:cap:1.2";
        const info = capXML.getElementsByTagNameNS(capNS, "info")[0];
        if (!info) continue;

        const get = tag => info.getElementsByTagNameNS(capNS, tag)[0]?.textContent || '';
        const headline = get("headline");
        const description = get("description");
        const onset = get("onset");
        const areaDesc = info.getElementsByTagNameNS(capNS, "areaDesc")[0]?.textContent || '';
        const web = get("web");

        const polygons = [...info.getElementsByTagNameNS(capNS, "polygon")];
        const geoCoords = polygons.map(p =>
          p.textContent.trim().split(" ").map(pair => {
            const [lat, lon] = pair.split(",").map(Number);
            return [lon, lat];
          })
        );

        let intersects = false;
        geoCoords.forEach(coords => {
          const poly = turf.polygon([coords]);
          if (turf.booleanIntersects(poly, farNorthGeoJSON)) {
            intersects = true;
          }
        });

        const withinTime = isWithinHourWindow(onset, hourWindow);
        const qualifies = intersects && (!requireOnsetWithinWindow || withinTime);

        const alertHTML = `
<div class="alert-card ${qualifies ? 'far-north' : ''}">
  <b>${headline} issued for ${areaDesc}</b><br>
  ${onset ? `Starts: ${formatReadableTime(onset)}<br>` : ''}
  ${web ? `<a href="${web}" target="_blank">More information</a><br>` : ''}
  <button onclick="this.closest('.alert-card').remove()">Dismiss</button>
</div>`;

        if (qualifies) {
          alertCards.unshift(alertHTML);
        } else if (showNonFarNorthAlerts) {
          alertCards.push(alertHTML);
        }
      }

      target.innerHTML = alertCards.length
        ? alertCards.join("\n")
        : "<i>No alerts found.</i>";

    } catch (err) {
      console.error("Error loading alerts:", err);
      target.innerHTML = "<i>Failed to load alerts.</i>";
    }
  }

  window.initWeatherAlerts = async function initWeatherAlerts(customOptions = {}) {
    const config = { ...DEFAULT_OPTIONS, ...customOptions };
    const farNorthGeoJSON = await loadFarNorthGeoJSON(config.farNorthName);
    fetchAndRenderAlerts(config, farNorthGeoJSON);
  };
})();
