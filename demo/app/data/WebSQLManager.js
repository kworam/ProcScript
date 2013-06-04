// The code for the ProcScript Demo app
var WebSQLManager = (function () {
    "use strict";

    var WebSQLManager = {};

    WebSQLManager.db = null;

    // Gets a reference to the WebSQL database
    WebSQLManager.getDb = function () {
        if (typeof openDatabase === "undefined") {
            // WebSQL not available
            return null;
        }

        if (!WebSQLManager.db) {
            var size = 5 * 1024 * 1024;
            WebSQLManager.db = openDatabase('ProcScriptDemo.db', '1.0', 'ProcScript Demo Database', size);

            if (!WebSQLManager.db) {
                throw new Error("[WebSQLManager.getDb]  unable to open WebSQL database!");
            }
        }
        return WebSQLManager.db;
    };

    // Execute preparedStmt using paramArray.
    WebSQLManager.executeSQL = function (proc, preparedStmt, paramArray) {
        WebSQLManager.getDb().transaction(
            function (tx) {
                tx.executeSql(preparedStmt, paramArray,
                    function executeSqlSuccess(tx, results) {
                        PS.callProcSuccessCallback(proc, results);
                    },
                    function executeSqlFailure(tx, err) {
                        var procErrorMessage = "[WebSQLManager.executeSQL.executeSqlFailure]\n" +
                            "error: " + err.message + "\n" +
                            "preparedStmt: " + preparedStmt;
                        PS.callProcFailureCallback(proc, procErrorMessage);
                    });

            }, function transactionFailure(err) {
                var procErrorMessage = "[WebSQLManager.executeSQL.transactionFailure]\n" +
                    "error: " + err.message + "\n" +
                    "preparedStmt: " + preparedStmt;
                PS.callProcFailureCallback(proc, procErrorMessage);
            });

        return PS.WAIT_FOR_CALLBACK;
    };

    return WebSQLManager;
} ());