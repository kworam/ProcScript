// The code for the ProcScript Demo app
var App = (function () {
    "use strict";

    var App = {};

    // This Proc sends a CORS request to a user-specified URL.
    App.corsTestProc = PS.defineProc({

        name: "App.corsTestProc",
        fnGetSignature: function () {
            // This Proc has no input or output parameters.
            return {};
        },
        blocks: [
        function isDbPopulated() {
            // Inside each block function, 'this' refers to the currently running Proc instance.

            // By setting 'httpMethodValue' and 'txtURLValue' as properties of 'this', 
            // we make them 'Proc locals' which are accessible to subsequent block functions.

            var txtURL = document.getElementById("txtURL");
            var httpMethod = document.getElementById("selectMethod");
            this.httpMethodValue = httpMethod.value;
            this.txtURLValue = txtURL.value;

            // 'spinner' and 'textAreaResults' are also Proc locals.
            this.spinner = document.getElementById("spinner");
            this.spinner.style.display = "block";

            this.textAreaResults = document.getElementById("txtTestResults");
            this.textAreaResults.value = "";

            // When the return value of a block function is a Proc Instance,
            // ProcScript runs the Proc instance and passes its results to the next block function.
            return new App.initDbProc({
                testTableName: "History"
            });
        },
        function sendCorsRequest() {
            // XHR.makeCorsRequest is a ProcScript-compliant blocking function.
            // This means that when it completes, 
            // XHR.makeCorsRequest calls the success or failure callback of its caller Proc as appropriate.
            XHR.makeCorsRequest(this, this.httpMethodValue, this.txtURLValue);
            return PS.WAIT_FOR_CALLBACK;
        },
        function logResult(prevResult) {
            // Uncomment the line below to simulate an exception in this block function.
            // Since this Proc has no '_catch' block function, the Error will bubble up to the caller Proc.
            //throw new Error("[App.corsTest]  simulated exception in 'logResult' block function");

            // Store the result message in a Proc local.
            this.resultMsg =
                "Success\nSent " + this.httpMethodValue + " request to " + this.txtURLValue + ":\nResponse Text:\n" +
                prevResult.responseText;

            // Log the successful result to the database.
            var cmd = "Insert into History (DateTime, Result) values (" +
                "'" + new Date() + "', " +
                "'" + this.resultMsg.replace(/'/g, "''") + "'" +
                ")";

            if (WebSQLManager.getDb()) {
                // WebSQLManager.executeSQL is a ProcScript-compliant blocking function.
                WebSQLManager.executeSQL(this, cmd);
                return PS.WAIT_FOR_CALLBACK;
            }
            return PS.NEXT;
        },
        function _catch(err) {
            // The _catch block function runs:
            // If an exception happens in this Proc, or
            // If an unhandled exception in a callee Proc bubbles up to this Proc.

            // Store the result message in a Proc local.
            this.resultMsg =
                "Failure\nAttempted to send " + this.httpMethodValue + " request to " + this.txtURLValue + ":\nError Details:\n" + err;

            // Log the failure result to the database.
            var cmd = "Insert into History (DateTime, Result) values (" +
                "'" + new Date() + "', " +
                "'" + this.resultMsg.replace(/'/g, "''") + "'" +
                ")";

            if (WebSQLManager.getDb()) {
                WebSQLManager.executeSQL(this, cmd);
                return PS.WAIT_FOR_CALLBACK;
            }
            return PS.NEXT;
        },
        function _finally() {
            // The _finally block function always runs, exception or not.

            // Hide the spinner and display the result message.
            this.spinner.style.display = "none";
            this.textAreaResults.value = this.resultMsg;

            return PS.NEXT;
        }
        ]

    });


    // This Proc tests whether table 'testTableName' exists in the WebSQL database.
    // If not, it creates the tables that are required by the application.
    App.initDbProc = PS.defineProc({

        name: "App.initDbProc",
        fnGetSignature: function () {
            return {
                testTableName: ["string"],  // a string input parameter
                tablesCreated: ["boolean", "out"] // a boolean output parameter, TRUE if the Proc created any tables
            };
        },
        blocks: [
        function checkWebSQL() {
            // rv refers to the return value of this Proc Instance.
            var rv = this._procState.rv;

            // initialize the output parameter to false
            rv.tablesCreated = false;

            if (!WebSQLManager.getDb()) {
                // WebSQL is not available

                // When a Proc instance returns PS.RETURN,
                // ProcScript executes the _finally block function (if any) and returns to the Proc's caller.
                return PS.RETURN;
            }
            return PS.NEXT;
        },
        function checkTableExists() {
            // Check whether 'testTableName' exists in the WebSQL database.
            var strQuery = "SELECT NAME FROM sqlite_master WHERE type='table' and name = '" + this.testTableName + "'";

            // WebSQLManager.executeSQL is a ProcScript-compliant blocking function.
            WebSQLManager.executeSQL(this, strQuery);
            return PS.WAIT_FOR_CALLBACK;
        },
        function createTablesIfNecessary(resultSet) {
            // rv refers to the return value of this Proc Instance.
            var rv = this._procState.rv;

            // Uncomment the line below to simulate an exception in this block function.
            // Since this Proc has no '_catch' block function, the Error will bubble up to the caller Proc.
            // throw new Error("[App.initDbProc]  simulated exception in 'createTablesIfNecessary' block function");

            if (resultSet && resultSet.rows && resultSet.rows.length) {
                // The test table exists in the WebSQL database.
                return PS.RETURN;
            }

            // If the test table does not exist, we 'fall through' to here.
            // WebSQLManager.executeSQL is a ProcScript-compliant blocking function.
            WebSQLManager.executeSQL(this, "CREATE TABLE History (" +
                "Id integer not null PRIMARY KEY, " +
                "Result string not null, " +
                "DateTime string not null" +
                ")"
                );
            return PS.WAIT_FOR_CALLBACK;
        },
        function finalize(resultSet) {
            var rv = this._procState.rv;

            // Set the value of 'tablesCreated' output parameter.
            rv.tablesCreated = true;

            // When a Proc instance returns PS.NEXT, ProcScript executes the next block function.
            // If the last block function returns PS.NEXT, ProcScript handles it like PS.RETURN.
            return PS.NEXT;
        }
        ]

    });


    return App;
} ());
