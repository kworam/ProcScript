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

    // XHR.makeCorsRequest_Proc is an Adapter Proc for XmlHttpRequest

    XHR.makeCorsRequest_Proc = PS.defineProc({
        name: "XHR.makeCorsRequest_Proc",
        fnGetSignature: function () {
            return {
                method: ["string"],
                url: ["string"],
                responseText: ["string", "out"]  
            };
        },
        adapter: true,
        blocks: [
        function sendRequest() {
            var proc = this;
            proc.responseText = null;   // initialize the 'responseText' output parameter

            var xhr = XHR.createCORSRequest(this.method, this.url);
            if (!xhr) {
                throw new Error('[XHR.makeCorsRequest]  CORS not supported by your browser.')
            }

            xhr.onload = function () {
                proc.responseText = xhr.responseText;   // set the 'responseText' output parameter 
                PS.procSucceeded(proc)        // The Adapter Proc succeeded
            };

            xhr.onerror = function () {
                // // The Adapter Proc failed
                PS.procFailed(proc, '[XHR.makeCorsRequest]  CORS request resulted in error.\n')
            };

            xhr.send();

            // Tell ProcScript to wait for a callback from the blocking function above.
            return PS.WAIT_FOR_CALLBACK;
        }]
    });


    return XHR;
} ());