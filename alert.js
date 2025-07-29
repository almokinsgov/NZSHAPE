// alert.js – Core Alert Loader & Display
(function (global) {
  async function fetchAndDisplayAlerts(config) {
    const geoJSON = await global.MapModule.loadFarNorthGeoJSON();
    const proxy = AlertConfig.USE_PROXY ? AlertConfig.PROXY : "";
    const feedUrl = proxy + AlertConfig.FEED_URL;
    const xmlText = await res.text();
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
    const ns = "http://www.w3.org/2005/Atom";
    const capNS = "urn:oasis:names:tc:emergency:cap:1.2";

    const entries = [...xml.getElementsByTagNameNS(ns, "entry")];
    const links = entries.map(e => e.querySelector("link[rel='related']")?.getAttribute("href")).filter(Boolean);
    const alertList = [];

    for (const url of links) {
      try {
        const capRes = await fetch(proxy + encodeURIComponent(url));
        const capText = await capRes.text();
        const capXML = new DOMParser().parseFromString(capText, "application/xml");
        const info = capXML.getElementsByTagNameNS(capNS, "info")[0];
        if (!info) continue;

        const get = tag => info.getElementsByTagNameNS(capNS, tag)[0]?.textContent || '';
        const onset = get("onset");
        const expires = get("expires");
        const headline = get("headline");
        const areaDesc = get("areaDesc");
        const event = get("event");
        const severity = get("severity");
        const certainty = get("certainty");
        const web = get("web");

        const colourCode = [...info.getElementsByTagNameNS(capNS, "parameter")].find(param =>
          param.getElementsByTagNameNS(capNS, "valueName")[0]?.textContent === "ColourCode"
        )?.getElementsByTagNameNS(capNS, "value")[0]?.textContent || "";

        const colourClass = colourCode ? `alert-${colourCode.toLowerCase()}` : 'alert-default';

        const polygons = [...info.getElementsByTagNameNS(capNS, "polygon")];
        let intersects = false;

        polygons.forEach(p => {
          const coords = p.textContent.trim().split(" ").map(pair => {
            const [lat, lon] = pair.split(",").map(Number);
            return [lon, lat];
          });
          const poly = turf.polygon([coords]);
          if (turf.booleanIntersects(poly, geoJSON)) intersects = true;
        });

        const now = new Date();
        let alertStatus = "";
        if (onset && expires) {
          const onsetTime = new Date(onset);
          const expiresTime = new Date(expires);
          if (now >= onsetTime && now <= expiresTime) alertStatus = "active-now";
          else if (now < onsetTime) alertStatus = "upcoming";
          else alertStatus = "expired";
        } else {
          alertStatus = "active-now";
        }

        const isAllowedStatus =
          alertStatus === "active-now" ||
          alertStatus === "upcoming" ||
          (alertStatus === "expired" && config.SHOW_EXPIRED_ALERTS);

        const qualifies = intersects && isAllowedStatus;
        const readableTime = t => new Date(t).toLocaleString("en-NZ", {
          weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true
        });

        const alertHTML = `
<div class="alert-card ${qualifies ? 'far-north' : ''} ${alertStatus} ${colourClass}">
  <b>${headline} issued for ${areaDesc}</b><br>
  MetService has issued a weather alert that includes parts of the Far North District
  ${onset ? ` from ${readableTime(onset)}` : ''}
  ${expires ? ` to ${readableTime(expires)}.` : ''}<br>
  ${web ? `<a href="${web}" target="_blank">Visit MetService for details</a><br>` : ''}
  ${colourCode ? `<span class="badge ${colourClass}">${colourCode}</span>` : ''}
  ${alertStatus === 'upcoming' ? `<span class="badge upcoming-badge">Upcoming</span>` : ''}
  ${alertStatus === 'active-now' ? `<span class="badge active-badge">Active Now</span>` : ''}
  ${alertStatus === 'expired' ? `<span class="badge expired-badge">Expired</span>` : ''}
</div>`;

        if (qualifies) {
          alertList.push({ html: alertHTML, status: alertStatus });
        } else if (
          config.SHOW_NON_FAR_NORTH_ALERTS &&
          (alertStatus === "active-now" || alertStatus === "upcoming" || (alertStatus === "expired" && config.SHOW_EXPIRED_ALERTS))
        ) {
          alertList.push({ html: alertHTML, status: alertStatus });
        }
      } catch (err) {
        console.warn("Alert processing failed for:", url, err);
      }
    }

    const statusOrder = { "active-now": 1, "upcoming": 2, "expired": 3 };
    alertList.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));

    const container = document.getElementById("floating-alerts-container");
    const toggle = document.getElementById("toggle-alerts-btn");

    if (alertList.length) {
      container.innerHTML = alertList.map(a => a.html).join("\n");
      toggle.style.display = "flex";
    } else {
      container.innerHTML = "";
      toggle.style.display = "none";
    }
  }

  global.AlertModule = {
    fetchAndDisplayAlerts
  };
})(window);
