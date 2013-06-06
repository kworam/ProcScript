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

    // WebSQLManager.executeSQL is a ProcScript-compliant blocking function.
    // This means that when it completes, 
    // WebSQLManager.executeSQL calls the success or failure callback of its caller Proc as appropriate.

    WebSQLManager.executeSQL = function (proc, preparedStmt, paramArray) {
        WebSQLManager.getDb().transaction(
            function (tx) {
                tx.executeSql(preparedStmt, paramArray,
                    function executeSqlSuccess(tx, results) {

                        // Tell the waiting Proc that the blocking operation succeeded 
                        // and pass an object containing the results of the operation.
                        PS.callProcSuccessCallback(proc, results);
                    },
                    function executeSqlFailure(tx, err) {
                        var procErrorMessage = "[WebSQLManager.executeSQL.executeSqlFailure]\n" +
                            "error: " + err.message + "\n" +
                            "preparedStmt: " + preparedStmt;

                        // Tell the waiting Proc that the blocking operation failed 
                        // and pass a descriptive error message.
                        PS.callProcFailureCallback(proc, procErrorMessage);
                    });

            }, function transactionFailure(err) {
                var procErrorMessage = "[WebSQLManager.executeSQL.transactionFailure]\n" +
                    "error: " + err.message + "\n" +
                    "preparedStmt: " + preparedStmt;

                // Tell the waiting Proc that the blocking operation failed 
                // and pass a descriptive error message.
                PS.callProcFailureCallback(proc, procErrorMessage);
            });

        return PS.WAIT_FOR_CALLBACK;
    };

    return WebSQLManager;
} ());