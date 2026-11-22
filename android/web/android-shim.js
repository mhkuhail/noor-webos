/* Noor for Android TV — gives the web app the webOS objects it expects (PalmServiceBridge, PalmSystem,
   webOSRelaunch) on top of the native NoorAndroid bridge (android/app/src/main/java/com/noor/tv/Bridge.java).
   Loaded before app.js; does nothing in a browser or on LG. */
(function () {
  var N = window.NoorAndroid;
  if (!N) return;
  function Bridge() { this.onservicecallback = null; }
  Bridge.prototype.call = function (uri, params) {
    var self = this;
    setTimeout(function () {
      var r;
      try { r = N.call(String(uri), typeof params === 'string' ? params : JSON.stringify(params || {})); }
      catch (e) { r = JSON.stringify({ returnValue: false, errorText: String(e) }); }
      if (self.onservicecallback) self.onservicecallback(r);
    }, 0);
  };
  Bridge.prototype.cancel = function () {};
  window.PalmServiceBridge = Bridge;
  window.PalmSystem = {
    get launchParams() { return N.launchParams(); },
    platformBack: function () { N.exit(); },
    deactivate: function () { N.exit(); },
  };
  window.__noorRelaunch = function (p) {
    var e;
    try { e = new CustomEvent('webOSRelaunch', { detail: p }); }
    catch (x) { e = document.createEvent('CustomEvent'); e.initCustomEvent('webOSRelaunch', false, false, p); }
    document.dispatchEvent(e);
  };
  // Remote keys mapped to webOS key codes by MainActivity.dispatchKeyEvent (colour keys, Back, media, Menu → Settings)
  window.__noorKey = function (code) {
    var e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true });
    Object.defineProperty(e, 'keyCode', { get: function () { return code; } });
    Object.defineProperty(e, 'which', { get: function () { return code; } });
    (document.activeElement || document.body).dispatchEvent(e);
  };
  document.documentElement.className += ' android';
})();
