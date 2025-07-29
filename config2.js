// config.js – Configurable Settings for Alert System
(function (global) {
  global.AlertConfig = {
    VERSION: "1.0.0",
    FEED_URL: "https://raw.githubusercontent.com/almokinsgov/NZSHAPE/main/alerts/latest.xml",
    PROXY: "https://corsproxy.io/?",

    // Filtering & Display Settings
    USE_PROXY: true, // Toggle to enable or disable proxy usage
    SHOW_EXPIRED_ALERTS: true,
    SHOW_NON_FAR_NORTH_ALERTS: false,
    REQUIRE_ONSET_WITHIN_WINDOW: true,
    HOUR_WINDOW: 24,

    // Display Settings (Optional Future Use)
    DEFAULT_LANGUAGE: "en-NZ",
    DISTRICT_NAME: "Far North District",

    // Customisation Hooks (Optional Extensions)
    onAlertRender: null,     // function(alertData, html) => modifiedHTML
    onError: null            // function(error) => void
  };
})(window);
