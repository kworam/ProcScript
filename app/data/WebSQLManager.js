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

    // WebSQLManager.executeSQL_Proc is an Adapter Proc for WebSQL

    WebSQLManager.executeSQL_Proc = PS.defineProc({

        name: "WebSQLManager.executeSQL_Proc",
        fnGetSignature: function () {
            return {
                sql: ["string"],
                resultSet: [null, "out"]  /* we cannot type check this output */
            };
        },
        adapter: true,
        blocks:
        [
        function executeSQL() {
            var proc = this;

            proc.resultSet = null;

            WebSQLManager.getDb().transaction(
                function (tx) {
                    tx.executeSql(proc.sql, null,
                        function executeSqlSuccess(tx, results) {

                            // Tell the waiting Proc that the blocking operation succeeded 
                            // and pass an object containing the results of the operation.
                            proc.resultSet = results;
                            PS.procSucceeded(proc);
                        },
                        function executeSqlFailure(tx, err) {
                            var procErrorMessage = "[WebSQLManager.executeSQL_Proc.executeSqlFailure]\n" +
                                "error: " + err.message + "\n" +
                                "sql: " + proc.sql;

                            // Tell the waiting Proc that the blocking operation failed 
                            // and pass a descriptive error message.
                            PS.procFailed(proc, procErrorMessage);
                        });

                    }, 
                function transactionFailure(err) {
                    var procErrorMessage = "[WebSQLManager.executeSQL_Proc.transactionFailure]\n" +
                        "error: " + err.message + "\n" +
                        "sql: " + proc.sql;

                    // Tell the waiting Proc that the blocking operation failed 
                    // and pass a descriptive error message.
                    PS.procFailed(proc, procErrorMessage);
                }
            );

            // Tell ProcScript to wait for a callback from the blocking function above.
            return PS.WAIT_FOR_CALLBACK;
        }
        ]

    });



    return WebSQLManager;
} ());