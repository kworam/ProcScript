var XHR = (function () {
    "use strict";

    var XHR = {};

    // Create the XHR object.
    XHR.createCORSRequest = function (method, url) {
        var xhr = new XMLHttpRequest();
        if ("withCredentials" in xhr) {
            // XHR for Chrome/Firefox/Opera/Safari.
            xhr.open(method, url, true);

        } else if (typeof XDomainRequest !== "undefined") {
            // XDomainRequest for IE.
            xhr = new XDomainRequest();
            xhr.open(method, url);

        } else {
            // CORS not supported.
            xhr = null;
        }

        return xhr;
    }

    // Make the actual CORS request.
    XHR.makeCorsRequest = function (proc, method, url) {
        var xhr = XHR.createCORSRequest(method, url);
        if (!xhr) {
            PS.callProcFailureCallback(proc, '[XHR.makeCorsRequest]  CORS not supported by your browser.')
        }

        // Response handlers.
        xhr.onload = function () {
            PS.callProcSuccessCallback(proc, xhr)
        };

        xhr.onerror = function () {
            PS.callProcFailureCallback(proc, '[XHR.makeCorsRequest]  CORS request resulted in error.\n')
        };

        xhr.send();
    }


    return XHR;
} ());