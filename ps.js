/*!
*
* Copyright 2013 Kevin Woram.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*
*/

(function (definition) {
    // Turn off strict mode for this function so we can assign to global.PS
    /*jshint strict: false*/

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the PS API and when
    // executed as a simple <script>, it creates a PS global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("PS", definition);

        // CommonJS
    } else if (typeof exports === "object") {
        module.exports = definition();

        // RequireJS
    } else if (typeof define === "function") {
        define(definition);

        // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makePS = definition;
        }

        // <script>
    } else {
        PS = definition();
    }

})(function () {
    "use strict";

    /* 
    The ProcScript (PS) runtime manages the execution of ProcScript Procs:
    */

    // ProcScript constructor
    function PS() {
        return this;
    }

    // NOTE: The 'nextTick' code below was borrowed from the Q project
    // https://github.com/kriskowal/q

    // Use the fastest possible means to execute a task in a future turn
    // of the event loop.
    var nextTick;
    if (typeof process !== "undefined") {
        // node
        nextTick = process.nextTick;

    } else if (typeof setImmediate === "function") {
        // In IE10, or use https://github.com/NobleJS/setImmediate
        nextTick = setImmediate;

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // linked list of tasks (single, with head node)
        var head = {}, tail = head;
        channel.port1.onmessage = function () {
            head = head.next;
            var task = head.task;
            delete head.task;
            task();
        };
        nextTick = function (task) {
            tail = tail.next = { task: task };
            channel.port2.postMessage(0);
        };

    } else {
        // old browsers
        nextTick = function (task) {
            setTimeout(task, 0);
        };
    }

    PS._nextTick = nextTick;


    function Stack() {
        this.stac = new Array();
    }

    Stack.prototype.pop = function () {
        return this.stac.pop();
    }
    Stack.prototype.push = function (item) {
        this.stac.push(item);
    }
    Stack.prototype.peek = function () {
        return this.stac[this.stac.length - 1];
    }
    Stack.prototype.count = function () {
        return this.stac.length;
    }
    Stack.prototype.toArray = function () {
        // we return a reversed copy of the internal stack array 
        // to correspond to the ordering of the .NET Stack.ToArray() method.
        return this.stac.slice(0).reverse();
    }
    Stack.prototype.clear = function () {
        this.stac = [];
    }


    PS.callProcSuccessCallback = function (proc, rv) {
        if (!proc) {
            return;
        }

        var ps = proc._procState,
            currentBlock = proc._getProcBlocks()[ps.currentBlockIdx];

        if (ps._waitForCallback) {
            ps._waitForCallback = false;
            proc._successCallback.call(proc, rv);

        } else {
            throw new Error("[PS.callProcSuccessCallback] Proc '" + proc._getProcName() + "' " +
                "received an unexpected success callback while executing block '" + currentBlock.name + "'!\n" +
                "The calling Proc must return PS.WAIT_FOR_CALLBACK to ProcScript before the blocking function calls back.\n" +
                "Also, the blocking function can only callback once to the waiting Proc.");
        }
    }

    PS.callProcFailureCallback = function (proc, err) {
        if (!proc) {
            return;
        }

        var ps = proc._procState,
            currentBlock = proc._getProcBlocks()[ps.currentBlockIdx];

        if (ps._waitForCallback) {
            ps._waitForCallback = false;
            proc._failureCallback.call(proc, err, currentBlock.name, true);

        } else {
            throw new Error("[PS.callProcFailureCallback] Proc '" + proc._getProcName() + "' " +
                "received an unexpected failure callback while executing block '" + currentBlock.name + "'!\n" +
                "The calling Proc must return PS.WAIT_FOR_CALLBACK to ProcScript before the blocking function calls back.\n" +
                "Also, the blocking function can only callback once to the waiting Proc.");
        }
    }

    // Use unusual numbers for these reserved block function return values.
    // This minimizes the chance of a user 'accidentally' returning a value from a block function
    // that happens to be a valid reserved value.
    PS.RETURN = -9007199254740991;
    PS.NEXT = -9007199254740990;
    PS.WAIT_FOR_CALLBACK = -9007199254740989;
    PS.CONTINUE = -9007199254740988;
    PS.BREAK = -9007199254740987;

    PS.defineProc = function (config) {

        if (!config || typeof config !== "object") {
            throw new Error("[PS.defineProc] you must pass a config object to defineProc.");
        }

        var name = null,
            fnGetSignature = null,
            blocks = null,
            fnGetForEachArray = null,
            fnWhileTest = null,
            fnDoWhileTest = null,
            fnForLoop = null;

        for (var propName in config) {
            switch (propName) {
                case 'name':
                    // set procName from config
                    name = config.name;
                    break;

                case 'fnGetSignature':
                    // set fnGetSignature from config
                    fnGetSignature = config.fnGetSignature;
                    break;

                case 'blocks':
                    // set blocks from config
                    blocks = config.blocks;
                    break;

                case 'fnGetForEachArray':
                    // set fnGetForEachArray if present    
                    fnGetForEachArray = config.fnGetForEachArray;
                    break;

                case 'fnWhileTest':
                    // set fnWhileTest if present
                    fnWhileTest = config.fnWhileTest;
                    break;

                case 'fnDoWhileTest':
                    // set fnDoWhileTest if present
                    fnDoWhileTest = config.fnDoWhileTest;
                    break;

                case 'fnForLoop':
                    // set fnForLoop if present
                    fnForLoop = config.fnForLoop;
                    break;

                default:
                    throw new Error("[PS.defineProc] the config object for Proc '" + name +
                        "' contains the unsupported property name '" + propName + "'.");
            }
        }

        if (typeof name === "undefined" || typeof name !== "string") {
            var err = new Error("[PS.defineProc] the config object must contain a string property called 'name'.");
            console.log(err.stack);
            throw err;
        }
        // trim whitespace from name
        name = name.replace(/^\s+|\s+$/g, "");
        if (!name || !name.length) {
            var err = new Error("[PS.defineProc] the 'name' property cannot be empty.");
            console.log(err.stack);
            throw err;
        }

        // create the constructor function for this Proc
        var c = new Function("paramObj",
            "if (!(this instanceof PS.Proc)) { throw new Error (\"You must use the 'new' keyword to create an instance of Proc '" + name + "'.\"); }; " +
            "PS.Proc.call(this, paramObj);"
            );

        c.procName = name;

        if (!fnGetSignature || typeof fnGetSignature !== "function") {
            throw new Error("[PS.defineProc] the config object for Proc '" + name +
                "' must contain a function property called 'fnGetSignature' that returns this Proc's signature object.");
        }
        c.fnGetSignature = fnGetSignature;



        if (!blocks || !(blocks instanceof Array) || !blocks.length) {
            throw new Error("[PS.defineProc] the config object for Proc '" + name +
                "' must contain a non-empty Array property called 'blocks'");
        }
        c.blocks = blocks;

        // look for duplicate loop types
        var loopTypes = 0;
        if (fnGetForEachArray) {
            loopTypes++;
        }
        if (fnWhileTest) {
            loopTypes++;
        }
        if (fnForLoop) {
            loopTypes++;
        }
        if (fnDoWhileTest) {
            loopTypes++;
        }

        if (loopTypes > 1) {
            throw new Error("[PS.defineProc] Proc '" + name + "' can specify only one of the following: " +
                "fnGetForEachArray', 'fnWhileTest', 'fnDoWhileTest' or 'fnForLoop'.");
        }

        if (fnGetForEachArray) {
            if (typeof fnGetForEachArray !== "function") {
                throw new Error("[PS.defineProc] the 'fnGetForEachArray' property for Proc '" + name +
                    "' must be a function that returns the forEach array.");
            }

            c.fnGetForEachArray = fnGetForEachArray;
        }


        if (fnWhileTest) {
            if (typeof fnWhileTest !== "function") {
                throw new Error("[PS.defineProc] the 'fnWhileTest' property for Proc '" + name +
                    "' must be a function that returns TRUE if the while loop should continue.");
            }

            c.fnWhileTest = fnWhileTest;
        }

        if (fnDoWhileTest) {
            if (typeof fnDoWhileTest !== "function") {
                throw new Error("[PS.defineProc] the 'fnDoWhileTest' property for Proc '" + name +
                    "' must be a function that returns TRUE if the while loop should continue.");
            }

            c.fnDoWhileTest = fnDoWhileTest;
        }


        if (fnForLoop) {
            if (typeof fnForLoop !== "function" || typeof fnForLoop.call() !== "object") {
                throw new Error("[PS.defineProc] the 'fnForLoop' property for Proc '" + name +
                    "' must be a function that returns a For loop descriptor object.");
            }

            c.fnForLoop = fnForLoop;

            var forLoopDescriptor = fnForLoop.call();
            c.fnForLoopInit = forLoopDescriptor.init;
            c.fnBeforeIteration = forLoopDescriptor.beforeIteration;
            c.fnAfterIteration = forLoopDescriptor.afterIteration;

            if (typeof c.fnForLoopInit !== "function") {
                throw new Error("[PS.defineProc] no 'init' function found for For loop Proc '" + name + "'.");
            }
            if (typeof c.fnBeforeIteration !== "function") {
                throw new Error("[PS.defineProc] no 'beforeIteration' function found for For loop Proc '" + name + "'.");
            }
            if (typeof c.fnAfterIteration !== "function") {
                throw new Error("[PS.defineProc] no 'afterIteration' function found for For loop Proc '" + name + "'.");
            }
        }


        PS._registerProc(c);

        return c;
    };

    PS.undefineProc = function (procName) {
        var procRecord = PS.ProcRegistry._procsByName[procName];
        if (typeof procRecord === "undefined") {
            throw new Error("[PS.undefineProc] Proc '" + procName + "' not found in the registry!");
        }

        delete PS.ProcRegistry._procsByName[procName];
    }


    PS._exceptionListeners = [];

    PS.addListener = function (eventType, f) {
        if (typeof f === "undefined" || typeof f !== "function") {
            throw new Error("[PS.addListener] you must specify a function to call back.");
        }

        if (eventType == 'procException') {
            PS._exceptionListeners.push(f);

        } else {
            throw new Error("[PS.addListener] unrecognized event type: '" + eventType + "'");
        }
    };

    PS.removeListener = function (eventType, f) {
        if (eventType == 'procException') {

            for (var i = 0, len = PS._exceptionListeners.length; i < len; i++) {
                var listeners = PS._exceptionListeners,
                    thisFunc = listeners[i];
                if (thisFunc === f) {
                    listeners.splice(i, 1);
                    break;
                }
            }

        } else {
            throw new Error("[PS.removeListener] unrecognized event type: '" + eventType + "'");
        }
    };

    PS._fireProcException = function (ex, errorMessage) {
        var listeners = PS._exceptionListeners;
        for (var i = 0, len = listeners.length; i < len; i++) {
            var f = listeners[i];
            f(ex, errorMessage);
        }

        return len;
    };



    PS.Proc = function (paramObj) {
        this._ctorInit(paramObj);

        return this;
    };

    var Proc = PS.Proc;

    Proc.prototype._ctorInit = function (paramObj) {
        var ps = this._procState = {};

        // These fields hold the unique state of each Proc instance

        ps.currentBlockIdx = null;
        ps.failureSourceBlockIdx = -1;

        // If this is a looping Proc ('forEach' or 'whileTest'), then 'loopIndex' holds the index of the current loop iteration.
        ps.loopIndex = 0;

        // Hold onto the arguments passed to this Proc
        // Could provide support for var args in the future...
        ps.ctorArgs = arguments;

        ps.paramObj = ps.rv = paramObj;

        if (paramObj._procCaller) {
            // If the caller of this Proc passed an explicit _procCaller parameter in paramObj,
            // the set _procCaller as the caller and delete it from paramObj
            ps._caller = paramObj._procCaller;
            delete paramObj._procCaller;
        }

        ps.thread = null;
        ps._traceDispatchUniqueId = null;

        // Validate the paramObj of this instance against the signature
        if (this.constructor !== PS.Proc) {
            // If we are constructing a subclass of PS.Proc, not PS.Proc itself,
            // then we should validate the paramObj against the signature.
            this._validateParamObj(true);
        }
    },

    Proc.prototype.getParamValue = function (paramName) {
        var paramObj = this._getParamObj(),
            signatureObj = this._getSignatureObj(),
            paramDescriptor = signatureObj[paramName];

        if (typeof paramDescriptor === "undefined") {
            throw new Error("[PS.Proc.getParamValue] parameter name '" + paramName + "' not found in this Proc's signature.");
        }

        return paramObj[paramName];
    };

    Proc.prototype.setParamValue = function (paramName, val) {
        var paramObj = this._getParamObj(),
            signatureObj = this._getSignatureObj(),
            paramDescriptor = signatureObj[paramName];

        if (typeof paramDescriptor === "undefined") {
            throw new Error("[PS.Proc.setParamValue] parameter name '" + paramName + "' not found in this Proc's signature.");
        }

        paramObj[paramName] = val;
    };

    Proc.prototype.callStackToString = function () {
        var ps = this._procState;

        return ps.thread.callStackToString();
    };

    // for a 'forEach' Proc, returns the current item being processed.
    // else returns NULL
    Proc.prototype.getCurrentForEachItem = function () {
        var ps = this._procState;

        var forEachArray = this._getForEachArray();
        if (forEachArray) {
            var forEachIndex = ps.loopIndex;
            if (forEachIndex >= forEachArray.length) {
                throw new Error("[PS.Proc.getCurrentForEachItem] current index out of range: index=" +
                    forEachIndex + ",  arrayLength= " + forEachArray.length + ".");
            }
            return forEachArray[forEachIndex];

        } else {
            return null;
        }
    };

    // for a looping Proc, returns the index of the current iteration of the loop
    // else returns NULL
    Proc.prototype.getCurrentLoopIterationIndex = function () {
        if (this._isLoopingProc()) {
            return this._procState.loopIndex;

        } else {
            return null;
        }
    };


    // start running the Proc
    Proc.prototype.run = function () {

        this._initProcInstance();

        PS.ProcRegistry._recordRun(this);

        var emptyLoop = false;

        if (this._isEmptyLoop()) {
            // For an empty looping Proc, we skip running the Proc and assume it succeeded.
            this._procReturn(true, true);

        } else {
            this._runCurrentBlock(null, null);
        }
    };

    Proc.prototype._isLoopingProc = function () {
        return this._getForEachArray() || this._getWhileTestFunction() || this._getForLoopInit() || this._getDoWhileTestFunction();
    };


    Proc.prototype._isEmptyLoop = function () {

        // Check for empty 'ForEach' looping Proc
        var forEachArray = this._getForEachArray();
        if (forEachArray) {
            var emptyForEach = !forEachArray.length;
            if (emptyForEach) {
                return true;
            }
        }

        // Check for empty 'While' looping Proc.
        var fnWhileTest = this._getWhileTestFunction();
        if (fnWhileTest) {
            var whileTestResult = fnWhileTest.call(this);
            if (typeof whileTestResult !== "boolean") {
                throw new Error("[PS.Proc.run]  Proc '" + this._getProcName() +
                    "' has a fnWhileTest function that does not return a boolean result!");
            }

            var emptyWhile = !whileTestResult;
            if (emptyWhile) {
                return true;
            }
        }

        // Check for empty 'For' looping Proc
        var fnForLoopInit = this._getForLoopInit();
        if (fnForLoopInit) {
            // emptyFor is TRUE if this is a 'for' looping Proc an the whileTest function initially returns FALSE.

            // first, run the For loop initializer
            fnForLoopInit.call(this);

            // Then, run the beforeIteration test
            var forLoopBeforeResult = this._getForLoopBeforeIteration().call(this);
            if (typeof forLoopBeforeResult !== "boolean") {
                throw new Error("[PS.Proc.run]  Proc '" + this._getProcName() +
                    "' has a 'beforeIteration' function that does not return a boolean result!");
            }
            var emptyFor = !forLoopBeforeResult;

            if (emptyFor) {
                return true;
            }
        }

        // NOTE: a 'Do While' looping Proc is never empty, it always iterates at least once

        return false;
    }


    Proc.prototype._loopContinues = function (ps) {

        if (!this._isLoopingProc()) {
            // This is not a looping Proc
            return false;
        }

        // This is some kind of looping Proc

        // increment the loop index
        ps.loopIndex++;

        var forEachArray = this._getForEachArray();
        if (forEachArray) {
            var forEachContinues = ps.loopIndex < forEachArray.length;
            if (!forEachContinues) {
                return false;
            }
        }

        var fnWhileTest = this._getWhileTestFunction();
        if (fnWhileTest) {
            // test whether we should continue looping
            var whileContinues = fnWhileTest.call(this);
            if (!whileContinues) {
                return false;
            }
        }

        var fnDoWhileTest = this._getDoWhileTestFunction();
        if (fnDoWhileTest) {
            // increment the loop index
            // test whether we should continue looping
            var doWhileContinues = fnDoWhileTest.call(this);
            if (!doWhileContinues) {
                return false;
            }
        }

        var fnForAfterIteration = this._getForLoopAfterIteration();
        if (fnForAfterIteration) {
            // first, run the For loop after iteration function
            fnForAfterIteration.call(this);

            // then, run the For loop before iteration function
            var forContinues = this._getForLoopBeforeIteration().call(this);
            if (!forContinues) {
                return false;
            }
        }

        return true;
    }


    Proc.prototype._getForEachArrayFunction = function () {
        if (typeof this.constructor.fnGetForEachArray !== "undefined") {
            return this.constructor.fnGetForEachArray;
        }

        return null;
    };

    Proc.prototype._getForEachArray = function () {
        var f = this._getForEachArrayFunction();

        if (f) {
            var arr = f.call(this);
            if (!(arr instanceof Array)) {
                throw new Error("[PS.Proc._getForEachArray] the fnGetForEachArray function for Proc '" + this._getProcName() +
                    "' does not return an array!");
            }
            return arr;
        } else {
            return null;
        }
    };

    Proc.prototype._getWhileTestFunction = function () {
        if (typeof this.constructor.fnWhileTest !== "undefined") {
            return this.constructor.fnWhileTest;
        }

        return null;
    };

    Proc.prototype._getDoWhileTestFunction = function () {
        if (typeof this.constructor.fnDoWhileTest !== "undefined") {
            return this.constructor.fnDoWhileTest;
        }

        return null;
    };


    Proc.prototype._getForLoopInit = function () {
        if (typeof this.constructor.fnForLoopInit !== "undefined") {
            return this.constructor.fnForLoopInit;
        }

        return null;
    };


    Proc.prototype._getForLoopBeforeIteration = function () {
        if (typeof this.constructor.fnBeforeIteration !== "undefined") {
            return this.constructor.fnBeforeIteration;
        }

        return null;
    };

    Proc.prototype._getForLoopAfterIteration = function () {
        if (typeof this.constructor.fnAfterIteration !== "undefined") {
            return this.constructor.fnAfterIteration;
        }

        return null;
    };

    Proc.prototype._getCaller = function () {
        var ps = this._procState;

        if (typeof ps._caller !== "undefined") {
            return ps._caller;
        }

        return null;
    };

    Proc.prototype._getParamObj = function () {
        var ps = this._procState;
        return ps.paramObj;
    };

    Proc.prototype._getCatchBlockIdx = function () {
        if (typeof this.constructor.procCatchBlockIdx !== "undefined") {
            return this.constructor.procCatchBlockIdx;
        }

        return null;
    };

    Proc.prototype._getFinallyBlockIdx = function () {
        if (typeof this.constructor.procFinallyBlockIdx !== "undefined") {
            return this.constructor.procFinallyBlockIdx;
        }

        return null;
    };

    // Returns control to the caller
    // NOTE:  we must execute any _finally block first.
    Proc.prototype._procReturn = function (lastArg, emptyLoop) {
        // The Proc has completed successfully or failed.

        // First, run the finally block function (if any).     
        // Then, if there is a caller, calls its '_successCallback' or '_failureCallback' as appropriate.

        var ps = this._procState,
            caller = this._getCaller(),
            finallyIdx = this._getFinallyBlockIdx(),
            catchIdx = this._getCatchBlockIdx();

        if (typeof ps._procSavedLastArg === "undefined") {
            ps._procSavedLastArg = lastArg;
        }

        if (finallyIdx && ps.currentBlockIdx != finallyIdx) {
            // there is a finally block function and we have not run it yet.

            // run the _finally block
            var previousBlock = this._getProcBlocks()[ps.currentBlockIdx];

            ps.currentBlockIdx = finallyIdx;
            this._runCurrentBlock(lastArg, previousBlock);

        } else {
            // We have already run the _finally block

            var currentBlock = this._getProcBlocks()[ps.currentBlockIdx];

            if (caller) {
                // There is a caller,
                // so now call its success or failure callback passing the appropriate return value.

                var callSuccess = false,
                    rv = null;

                if (ps.failureSourceBlockIdx >= 0) {

                    // an unhandled exception occurred in one of the Proc's block functions

                    if (ps.failureSourceBlockIdx == finallyIdx || ps.failureSourceBlockIdx == catchIdx) {
                        // the unhandled exception occurred in the _catch or the _finally block, 
                        // so re-throw it to the caller
                        callSuccess = false;
                    }

                    else if (catchIdx === null) {
                        // this Proc has no catch block function 
                        // call the failure callback of the caller
                        callSuccess = false;


                    } else {
                        // this Proc has a catch block function
                        // we have therefore successfully handled (absorbed) the exception
                        // call the success callback of the caller
                        callSuccess = true;
                    }

                } else {
                    // the Proc either ran without any unhandled exceptions in the normal block functions,
                    // or an exception occurred in a normal block function but was successfully handled and absorbed.
                    callSuccess = true;
                }

                // log that the current block of this Proc has exited
                if (!emptyLoop) {
                    var procKey = PS._getTraceDispatchProcKey(this);
                    PS._traceDispatch(procKey, currentBlock.name, true);
                }

                if (callSuccess) {
                    rv = this._procState.rv;

                    // copy all properties in _procState.rv that correspond to 
                    // 'in-out' or 'out' parameters to paramObj.
                    var signatureObj = this._getSignatureObj(),
                        po = this._getParamObj(),
                        numOutParams = 0;

                    for (var rvParamName in signatureObj) {
                        var paramDescriptor = signatureObj[rvParamName],
                            paramDir = 'in';

                        if (paramDescriptor) {
                            paramDir = typeof paramDescriptor[1] === "undefined" ? 'in' : paramDescriptor[1];
                            paramDir = paramDir.toLowerCase();
                        }

                        if (paramDir != 'in') {
                            numOutParams++;
                            if (paramDir == 'in-out') {
                                // I have changed all current 'in-out' parameters to exist only as Proc locals
                                outputValue = this[rvParamName];

                            } else {
                                // There are still many 'out' variables that have not been converted to Proc locals
                                var outputValue = rv[rvParamName];
                                if (typeof outputValue === "undefined") {
                                    // If there is no value for the 'out' parameter in rv,
                                    // then get it from a Proc local of the same name
                                    outputValue = this[rvParamName];
                                }
                            }

                            po[rvParamName] = outputValue;
                        }
                    }

                    if (numOutParams > 0) {
                        // The signature has 1 or more 'in-out' or 'out' parameters,
                        // so validate those parameters against the signature
                        this._validateParamObj(false);
                    }

                    PS._dispatch(caller._successCallback, caller, rv, this, currentBlock.name, false);

                } else {
                    PS._dispatch(caller._failureCallback, caller, ps._procSavedLastArg, this, currentBlock.name, false);
                }

            } else {
                // This Proc has no caller

                // log that the current block of this Proc has exited
                if (!emptyLoop) {
                    var procKey = PS._getTraceDispatchProcKey(this);
                    PS._traceDispatch(procKey, currentBlock.name, true);
                }

                // update the Proc call stack to reflect that the current Proc has exited
                var stackFrame = ps.thread.procExit();

                if (ps.failureSourceBlockIdx >= 0 && !catchIdx) {
                    var blocks = this._getProcBlocks(),
                        failureBlock = blocks[ps.failureSourceBlockIdx];

                    // an unhandled exception occurred in one of the Proc's block functions
                    // and there is no caller to pass it to.

                    var msg = "Proc '" + this._getProcName() + "', Block '" + failureBlock.name + "':  An unhandled failure occurred.  See console for details.";
                    //console.log(msg);
                    alert(msg);
                }
            }
        }
    };

    Proc.prototype._successCallback = function (rv) {
        // called by block functions when they complete successfully

        if (typeof rv === "undefined") {
            rv = true;
        }

        var ps = this._procState,
            currentBlock = this._getProcBlocks()[ps.currentBlockIdx];

        if (currentBlock.isFinal || currentBlock._catch || currentBlock._finally) {
            // the Proc state machine has completed all normal blocks successfully
            // or it has successfully completed its _catch or _finally bock.

            if (this._loopContinues(ps)) {
                // reset the 'forEach', 'whileTest' or 'for' loop Proc and run it again

                var previousBlock = this._getProcBlocks()[ps.currentBlockIdx];
                ps.currentBlockIdx = 0;
                ps.failureSourceBlockIdx = -1;

                this._runCurrentBlock(null, previousBlock);
            } else {

                // this Proc is done
                this._procReturn(rv);
            }
        } else {
            // the Proc is not done yet, advance to the next block

            var previousBlock = this._getProcBlocks()[ps.currentBlockIdx];
            ps.currentBlockIdx++;
            this._runCurrentBlock(rv, previousBlock);
        }
    };

    Proc.prototype._failureCallback = function (err, blockName, errJustHappened) {
        // called by the ProcScript runtime when a Proc block throws an unhandled exception

        if (typeof errJustHappened !== "undefined" && errJustHappened) {
            var errorMessage = PS._getErrorMessageForException(err, blockName, this);

            // notify procException listeners
            if (!PS._fireProcException(err, errorMessage)) {
                console.log("ProcScript Proc Failure:");
                console.log("Error: " + err);

                console.log("Error Details: " + errorMessage);
            }
        }

        // record the block that was the source of the failure
        var ps = this._procState;

        ps.failureSourceBlockIdx = ps.currentBlockIdx;

        // handle the failure
        var catchIdx = this._getCatchBlockIdx(),
            finallyIdx = this._getFinallyBlockIdx();

        if (catchIdx === null || ps.currentBlockIdx == catchIdx || ps.currentBlockIdx == finallyIdx) {
            // This Proc has no _catch block, 
            // or the failure happened in the _catch block itself,
            // or the failure happened in the _finally block

            // _procReturn will run any finally block function (if any and if it hasn't already run it)
            // and then 'throw' the failure to the caller.
            this._procReturn(err);

        } else {
            // Pass control to the Proc's catch block function.
            var previousBlock = this._getProcBlocks()[ps.currentBlockIdx];

            ps.currentBlockIdx = catchIdx;
            this._runCurrentBlock(err, previousBlock);
        }
    };


    Proc.prototype._runCurrentBlock = function (arg, previousBlock) {
        // this method runs the block function for the current Proc block
        var ps = this._procState,
            currentBlock = this._getProcBlocks()[ps.currentBlockIdx];

        //console.log("Proc '" + this._getProcName() + "': running block '" + currentBlock.name + "'");

        if (previousBlock) {
            // log that the previous block function has exited
            var procKey = PS._getTraceDispatchProcKey(this);
            PS._traceDispatch(procKey, previousBlock.name, true);
        }

        PS._dispatch(currentBlock.handler, this, arg, this, currentBlock.name, true);
    };

    Proc.prototype._getSignatureObj = function () {
        var ctor = this.constructor,
            fnProcSig = ctor.fnGetSignature,
            signatureObject = null;

        if (fnProcSig) {
            signatureObject = fnProcSig.call(this);
            if (!signatureObject || typeof signatureObject !== "object") {
                // There is a signature function but it does not return a signature object
                throw new Error("[PS.Proc._getSignatureObj]  Proc '" + this._getProcName() +
                    "' has a signature function that does not return a signature object!");
            }
        }

        return signatureObject;
    };

    Proc.prototype._getProcName = function () {
        var procName = this.constructor.procName;

        return procName;
    };

    Proc.prototype._getProcBlocks = function () {
        var blocks = this.constructor.blocks;

        return blocks;
    };

    Proc.prototype._initProcInstance = function () {
        // Initialize the Proc instance so it is ready to run

        var ps = this._procState,
            paramObj = this._getParamObj(),
            caller = this._getCaller();

        ps._traceDispatchUniqueId = PS._traceDispatchUniqueIdCounter++;

        ps.currentBlockIdx = 0;

        if (!caller || !caller._procState.thread) {
            // create a new thread for this Proc
            PS._createThread(this);

        } else {
            // add this Proc to the thread of its caller
            PS._setThread(this, caller._procState.thread);
        }
    }


    Proc.prototype._validateParamObj = function (entering) {
        // Validate the paramObj against the signature
        var ps = this._procState,
            paramObj = this._getParamObj(),
            procName = this._getProcName(),
            signatureObj = this._getSignatureObj();

        if (!signatureObj || typeof signatureObj !== "object") {
            // We don't have a valid signature object, so throw an error
            throw new Error("[PS.Proc._validateParamObj]  Proc '" + procName + "' does not have a valid signature object!");
        }

        // determine the caller of this Proc
        var callerName = "<unknown>",
            caller = this._getCaller();

        if (caller) {
            if (!ps._caller) {
                ps._caller = caller;
            }

            if (ps._caller instanceof PS.Proc) {
                var procCaller = ps._caller,
                    callerCurrentBlock = procCaller._getProcBlocks()[procCaller._procState.currentBlockIdx];

                callerName = procCaller._getProcName() + "." + callerCurrentBlock.name;
            }
        }

        if (!paramObj || typeof paramObj !== "object") {
            // We did not get a valid parameter object, so throw an error
            throw new Error("[PS.Proc._validateParamObj]  caller '" + callerName + "' " +
                            "did not pass Proc '" + procName + "' a valid parameter object!");
        }

        // look for missing parameter values (descriptors in signature object that have no values in paramObj)
        for (var descriptorName in signatureObj) {
            var paramDescriptor = signatureObj[descriptorName],
                paramDir = typeof paramDescriptor[1] === "undefined" ? 'in' : paramDescriptor[1];

            paramDir = paramDir.toLowerCase();
            if (entering) {
                // we are entering this Proc, so look for missing 'in' and 'in-out' parameters
                if (paramDir !== 'out' && typeof paramObj[descriptorName] === "undefined") {

                    throw new Error("[PS.Proc._validateParamObj]  caller '" + callerName + "' " +
                            "did not pass Proc '" + procName + "' a value for parameter '" + descriptorName + "'");

                }
            } else {
                // we are exiting this Proc, so look for missing 'in-out' and 'out' parameters
                if (paramDir !== 'in' && typeof paramObj[descriptorName] === "undefined") {

                    throw new Error("[PS.Proc._validateParamObj] Proc '" + procName + "' " +
                        "is not returning a value for parameter '" + descriptorName + "'");
                }
            }

            // On entry or exit, check each parameter value in paramObj against its descriptor in signature
            for (var paramName in paramObj) {
                var paramValue = paramObj[paramName],
                    paramDescriptor = signatureObj[paramName];

                // check for unknown parameters in paramObj
                if (!paramDescriptor) {
                    if (entering) {
                        // we are entering this Proc, so the caller passed us an unknown parameter
                        throw new Error("[PS.Proc._validateParamObj]  caller '" + callerName + "' " +
                            "passed Proc '" + procName + "' a parameter named '" + paramName + "' " +
                            "which is not in its signature.");

                    } else {
                        // we are exiting this Proc, so the Proc is passing back an unknown parameter
                        throw new Error("[PS.Proc._validateParamObj]  Proc '" + procName + "' " +
                            "is returning a parameter named '" + paramName + "' " +
                            "which is not in its signature.");
                    }

                } else if (!(paramDescriptor instanceof Array)) {

                    // turn paramDescriptor into an array
                    paramDescriptor = [paramDescriptor];
                }

                // Look for type mis-matches
                this._typeCheckParameter(paramDescriptor, paramName, paramValue, procName, callerName, entering);

                // store the parameter value on the Proc
                this[paramName] = paramValue;
            }
        }
    }


    Proc.prototype._typeCheckParameter = function (paramDescriptor, paramName, paramValue, procName, callerName, entering) {
        var paramDir = typeof paramDescriptor[1] === "undefined" ? 'in' : paramDescriptor[1];

        paramDir = paramDir.toLowerCase();
        if (paramDir !== 'in' && paramDir !== 'out' && paramDir !== 'in-out') {
            var errMsg = "[PS.Proc._typeCheckParameter]  The signature of Proc '" + procName +
                "' has an unsupported direction setting of '" + paramDir + "' for parameter '" + paramName + "'.\n";

            throw new Error(errMsg);
        }

        var paramType = paramDescriptor[0];

        // NOTE: here are the possible return values of typeof
        // Undefined	"undefined"
        // Null	        "object"
        // Boolean	    "boolean"
        // Number	    "number"
        // String	    "string"
        // Host object (provided by the JS environment)	Implementation-dependent
        // Function object (implements [[Call]] in ECMA-262 terms)	"function"
        // E4X XML object	"xml"
        // E4X XMLList object	"xml"
        // Any other object	"object"

        if (typeof paramType !== "undefined" && paramValue !== null) {

            // The caller specified a type for this parameter,
            // and the input paramValue is not NULL,
            // so check the parameter value against the specified type
            var typeMisMatch = false,
                expectedParamTypeStr = null,
                actualParamTypeStr = null;

            if (paramType === "string" || paramType === "boolean" || paramType === "number") {
                // paramType indicates paramValue must be a String, Boolean or Number

                actualParamTypeStr = typeof paramValue;
                if (actualParamTypeStr !== paramType) {
                    typeMisMatch = true;
                    expectedParamTypeStr = paramType;
                }
            }

            else if (typeof paramType === 'function' && !(paramValue instanceof paramType)) {
                // paramType indicates paramValue should be an instanceof the function paramType

                typeMisMatch = true;
                expectedParamTypeStr = PS._parseFunctionName2(paramType);

                if (typeof paramValue === 'function') {
                    actualParamTypeStr = PS._parseFunctionName2(paramValue);

                } else if (typeof paramValue === 'object' && typeof paramValue.constructor === 'function') {
                    actualParamTypeStr = PS._parseFunctionName2(paramValue.constructor);

                } else {
                    actualParamTypeStr = typeof paramValue;
                }

            }

            if (typeMisMatch) {
                if (entering) {
                    var errMsg = "[PS.Proc._typeCheckParameter]  caller '" + callerName + "' " +
                                "passed Proc '" + procName + "' a value for parameter '" + paramName + "' " +
                                "that is the wrong type.\n";

                    if (expectedParamTypeStr && actualParamTypeStr) {
                        errMsg += ("Proc expected type '" + expectedParamTypeStr +
                            "' but got type '" + actualParamTypeStr + "'\n");
                    }

                    throw new Error(errMsg);

                } else {
                    var errMsg = "[PS.Proc._typeCheckParameter]  Proc '" + procName + "' " +
                                " is returning a value for parameter '" + paramName + "' " +
                                "that is the wrong type.\n";
                    if (expectedParamTypeStr && actualParamTypeStr) {
                        errMsg += ("Expected return type is '" + expectedParamTypeStr +
                            "' but actual return type is '" + actualParamTypeStr + "'\n");
                    }

                    throw new Error(errMsg);
                }
            }
        }
    }

    PS._parseFunctionName = function (f) {
        // Find zero or more non-paren chars after the function start
        return /function ([^(]*)/.exec(f + "")[1];
    }

    PS._parseFunctionName2 = function (f) {
        // If this is an anonymous function, return the first 256 chars of the function body
        var fname = PS._parseFunctionName(f);
        if (!fname) {
            return f.toString().substring(256);
        }
    }

    Proc.prototype._processBlockReturnValue = function (blockReturnValue) {
        var ps = this._procState,
            currentBlock = this._getProcBlocks()[ps.currentBlockIdx];

        PS.ProcRegistry._processBlockReturnValue(this, currentBlock, blockReturnValue);


        if (currentBlock._finally && (
            blockReturnValue == PS.RETURN || blockReturnValue == PS.BREAK || blockReturnValue == PS.CONTINUE)) {
            throw new Error(
                "[PS.Proc._processBlockReturnValue]  Proc '" + this._getProcName() +
                    "' returned PS.RETURN, PS.BREAK or PS.CONTINUE from its _finally block:  this is not allowed."
                );
        }

        if (currentBlock._catch) {
            if (blockReturnValue == PS.BREAK || blockReturnValue == PS.CONTINUE) {
                throw new Error(
                    "[PS.Proc._processBlockReturnValue]  Proc '" + this._getProcName() +
                        "' returned PS.BREAK or PS.CONTINUE from its _catch block:  this is not allowed."
                    );

            } else if (blockReturnValue == PS.RETURN) {
                // treat PS.RETURN in a _catch block like PS.NEXT
                blockReturnValue = PS.NEXT;
            }
        }


        if (blockReturnValue == PS.BREAK || blockReturnValue == PS.CONTINUE) {
            if (!this._isLoopingProc()) {
                throw new Error(
                    "[PS.Proc._processBlockReturnValue]  Proc '" + this._getProcName() +
                        "' returned PS.BREAK or PS.CONTINUE from block '" + currentBlock.name + "'" +
                        " but it is not a looping Proc."
                    );
            }

            if (blockReturnValue == PS.BREAK) {
                // treat PS.BREAK from a looping Proc the same as PS.RETURN
                blockReturnValue = PS.RETURN;
            }
        }


        if (blockReturnValue == PS.RETURN) {
            this._procReturn();

        } else if (blockReturnValue == PS.NEXT || blockReturnValue == PS.CONTINUE) {
            if (blockReturnValue == PS.CONTINUE) {
                // set the current block idx to the final block index and handle the same as PS.NEXT
                ps.currentBlockIdx = this.constructor.lastNormalBlockIdx;
            }

            this._successCallback();

        } else if (blockReturnValue == PS.WAIT_FOR_CALLBACK) {
            // The block function has signalled that it has already called a function
            // that will callback to this Proc's success or failure callback when it completes.
            // Set the Proc's _waitForCallback flag.
            ps._waitForCallback = true;

        } else if (blockReturnValue instanceof PS.Proc) {
            var proc = blockReturnValue,
                ps = proc._procState;

            // set the caller of the returned Proc to this Proc and run it
            ps._caller = this;
            proc.run();

        } else {
            throw new Error(
            "[PS.Proc._processBlockReturnValue]  Proc '" + this._getProcName() +
                "' got an unsupported return value from block '" + currentBlock.name + "'!" +
                " value=" + blockReturnValue
            );
        }
    }

    PS._getTraceDispatchProcKey = function (proc) {
        var ps = proc._procState;

        return ps._traceDispatchUniqueId + "_" + proc._getProcName();
    }

    PS._traceDispatchUniqueIdCounter = 0;


    PS._traceDispatch = function (procKey, blockName, blockExit) {
        //        if (blockExit) {
        //            console.log("exiting  [" + procKey + "].[" + blockName + "]");

        //        } else {
        //            console.log("running  [" + procKey + "].[" + blockName + "]");
        //        }
    }

    PS._dispatch = function (f, scope, arg, proc, blockName, functionStarting) {

        if (functionStarting) {
            // The ProcScript runtime has started running the block function for block 'blockName' in Proc 'proc'.
            var procKey = PS._getTraceDispatchProcKey(proc);

            PS._traceDispatch(procKey, blockName, false);

            proc._procState.thread.blockStart(procKey, blockName);

            PS._nextTick(function procDispatch() {

                try {
                    proc._processBlockReturnValue(
                        f.call(scope, arg)
                    );
                }

                catch (err) {
                    // an unhandled exception occurred in the block function for the current block

                    // call this Proc's failure callback passing the unhandled exception object
                    proc._failureCallback(err, blockName, true)
                }
            }, 0);

        } else {
            // The ProcScript runtime is calling the success or failure callback of a caller Proc.

            // update the Proc call stack to reflect that the current Proc has exited
            proc._procState.thread.procExit();

            PS._nextTick(function procDispatch() {
                f.call(scope, arg)
            }, 0);
        }
    }

    PS._getErrorMessageForException = function (err, blockName, proc) {
        var errorMessage =
            "Unhandled exception in " + proc._getProcName() + "." + blockName;

        errorMessage += "\n\n";
        if (typeof err !== "undefined") {
            // There is an exception object

            if (err instanceof Error) {
                // The exception object inherits from the javascript Error object
                errorMessage += "JavaScript Error Object:\n";
                if (err.message) {
                    errorMessage += " Error.message=" + err.message;
                    errorMessage += "\n";
                }
                if (err.stack) {
                    errorMessage += " Error.stack=" + err.stack;
                    errorMessage += "\n";
                }
            } else {
                // The exception object does not inherit from the javascript Error object
                errorMessage += "Unknown Error object\n";
                errorMessage += " Error=" + err;
                errorMessage += "\n";
            }

            errorMessage += "\nProc Call Stack:\n";
            errorMessage += proc.callStackToString();

        } else {
            errorMessage += "<No  Error Object>\n";
        }

        return errorMessage;
    }

    PS._makeSubclass = function (superclass, ctor) {
        ctor.prototype = new superclass({});
        ctor.prototype.constructor = ctor;
    }


    // This function makes a Proc subclass out the specified constructor function.
    PS._registerProc = function (ctor) {

        PS._makeSubclass(PS.Proc, ctor);

        // Remove _procState from the prototype object
        // We want _procState to be created by sub-classes.
        // If it exists in the prototype object,
        // code that checks for its existence in the sub-class will falsely
        // think that the sub-class has already created it.
        delete ctor.prototype._procState;

        // sanity check the Proc
        var procName = ctor.procName;
        if (!procName) {
            procName = PS.ProcRegistry._getProcNameFromCtor(ctor);
        }

        if (!procName || !procName.length) {
            throw new Error("[PS._registerProc] Proc has no name!");
        }

        // Process the Proc's blocks
        var blocks = ctor.blocks,
            blocksLen = blocks.length,
            numCatchBlocks = 0,
            numFinallyBlocks = 0,
            uniqueBlockNames = {};

        for (var i = 0; i < blocksLen; i++) {
            var block = blocks[i];

            if (typeof block === "function") {
                var blockFunction = block,
                    block = {},
                    funcName = PS._parseFunctionName(blockFunction);

                block.handler = blockFunction;
                blocks[i] = block;
                if (funcName == "_catch") {
                    block._catch = true;
                }
                if (funcName == "_finally") {
                    block._finally = true;
                }

                block.name = funcName
            }

            var blockName = block.name,
                autoNamed = false;

            if (!blockName || !blockName.length) {
                autoNamed = true;
                block.name = blockName = "block_" + (i + 1);
            }

            if (uniqueBlockNames[blockName]) {
                throw new Error("[PS._registerProc] two blocks with the name '" + blockName + "' found for Proc '" + procName + "'!");
            }


            if (!block.handler) {
                throw new Error("[PS._registerProc block '" + blockName + "' in Proc '" + procName + "' has no block function!");
            }

            if (typeof block.handler !== 'function') {
                throw new Error("[PS._registerProc] block '" + blockName + "' in Proc '" + procName + "' has a block function that is not a function!");
            }

            uniqueBlockNames[block.name] = true;

            if (block._catch && block._finally) {
                // A block cannot be both catch and finally handler
                throw new Error("[PS._registerProc] block '" + blockName + "' in Proc '" + procName + "' " +
                    "is marked as _catch and _finally:  this is not allowed!");

            } else if (block._catch) {
                // This is the catch block
                numCatchBlocks++;
                ctor.procCatchBlockIdx = i;
                if (autoNamed) {
                    block.name = blockName = "_catch";
                }

            } else if (block._finally) {
                // This is the finally block
                numFinallyBlocks++;
                ctor.procFinallyBlockIdx = i;
                if (autoNamed) {
                    block.name = blockName = "_finally";
                }
            } else {

                // This is a normal block
                if (blockName == "_catch" || blockName == "_finally") {
                    throw new Error("[PS._registerProc] block '" + blockName + "' in Proc '" + procName + "' " +
                        "cannot be named '_catch' or '_finally' unless it is the catch or finally block!");
                }
            }
        }

        // There can be at most one _catch block
        if (numCatchBlocks > 1) {
            throw new Error("[PS._registerProc] " + numCatchBlocks + " _catch blocks found for Proc '" + procName + "'!");
        }
        // There can be at most one _finally block
        if (numFinallyBlocks > 1) {
            throw new Error("[PS._registerProc] " + numFinallyBlocks + " _finally blocks found for Proc '" + procName + "'!");
        }

        var lastNormalBlockIdx = blocksLen - 1;
        if (numFinallyBlocks) {
            // If there is a _finally block, then:

            // 1. It must be the last block
            if (ctor.procFinallyBlockIdx != lastNormalBlockIdx) {
                throw new Error("[PS._registerProc]  the _finally block must be the last block in Proc '" + procName + "'!");
            }

            lastNormalBlockIdx = ctor.procFinallyBlockIdx - 1;
        }
        if (numCatchBlocks) {
            // If there is a _catch block, then:

            // 1. It must be the last block before the _finally block (if any)
            if (ctor.procCatchBlockIdx != lastNormalBlockIdx) {
                throw new Error("[PS._registerProc]  the _catch block must be the last block before 'finally' in Proc '" + procName + "'!");
            }

            lastNormalBlockIdx = ctor.procCatchBlockIdx - 1;
        }

        // Apart from the _finally and _catch blocks, there must be at least one normal block
        if (lastNormalBlockIdx < 0) {
            throw new Error("[PS._registerProc]  Proc '" + procName +
            "' must contain at least one normal block other than the _catch and _finally blocks!");
        }

        blocks[0].initial = true;
        blocks[lastNormalBlockIdx].isFinal = true;

        ctor.lastNormalBlockIdx = lastNormalBlockIdx;

        // The Proc has passed sanity checking so add it to the Proc registry
        PS.ProcRegistry._addConstructor(ctor);
    }


    PS.StackFrame = function (procKey, blockName) {
        this.procKey = procKey;
        this.blockName = blockName;
        this._date = new Date();
    }

    PS.StackFrame.prototype.toString = function () {
        var threadIdSepIdx = this.procKey.indexOf("_");
        //return this.procKey.substring(threadIdSepIdx + 1) + ":" + this.blockName + " - " + this._date;
        return this.procKey.substring(threadIdSepIdx + 1) + "." + this.blockName;
    }


    PS._threads = {};
    PS._threadUniqueIdCounter = 0;
    PS._createThread = function (proc) {
        var t = new PS.Thread();
        proc._procState.thread = t;
    }
    PS._setThread = function (proc, t) {
        proc._procState.thread = t;
    }

    PS.threadsToString = function () {
        var s = '',
            threads = PS._threads;

        for (var tid in threads) {
            var thread = threads[tid];
            s += thread.callStackToString();
            s += '\n';
        }

        if (!s) {
            s = "<<No Active Threads>>";
        }

        return s;
    }

    PS.Thread = function () {
        this._uniqueId = PS._threadUniqueIdCounter++;
        this._callStack = new Stack();
        this._createDate = new Date();

        PS._threads[this._uniqueId] = this;
    }

    PS.Thread.prototype.procExit = function () {
        this._callStack.pop();

        if (this._callStack.count() == 0) {
            delete PS._threads[this._uniqueId];
        }
    }

    PS.Thread.prototype.blockStart = function (procKey, blockName) {
        var stackFrame = this._callStack.peek();

        if (stackFrame && stackFrame.procKey == procKey) {
            // we are running a new block in the current Proc
            stackFrame.blockName = blockName;

        } else {
            // we are running the first block in a new Proc
            stackFrame = new PS.StackFrame(procKey, blockName);
            this._callStack.push(stackFrame);
        }
    }

    PS.Thread.prototype.callStackToString = function () {
        var s = '',
            arr = this._callStack.toArray();

        s += (' ProcScript Thread Id: ' + this._uniqueId + ', Created: ' + this._createDate + '\n');
        for (var i = 0, len = arr.length; i < len; i++) {
            var stackFrame = arr[i];
            s += (" " + stackFrame + "\n");
        }

        return s;
    }

    PS.ProcRegistry = function () { }

    // create and return a shallow copy of 'obj'
    PS._shallowCopy = function (obj, recursive) {
        var copy = {};

        for (var i in obj) {
            if (recursive && typeof obj[i] === "object") {
                copy[i] = PS._shallowCopy(obj[i], recursive);
            } else {
                copy[i] = obj[i];
            }
        }

        return copy;
    }

    PS.cloneProcRegistry = function () {
        return PS._shallowCopy(PS.ProcRegistry._procsByName, true);
    }

    PS.codeCoverageToString = function () {
        var s = 'ProcScript Code Coverage Report';

        for (var procName in PS.ProcRegistry._procsByName) {
            var procRecord = PS.ProcRegistry._procsByName[procName],
                blockRecords = procRecord.blockRecords,
                procRunCount = procRecord.runCount;

            s += "\n\nProc '" + procName + "', runCount: " + procRunCount;
            if (procRunCount > 0) {
                for (var blockName in blockRecords) {
                    var blockRecord = blockRecords[blockName],
                        blockReturnValues = blockRecord.blockReturnValues,
                        blockRunCount = blockRecord.runCount;

                    s += "\n Block '" + blockName + "', runCount: " + blockRunCount;
                    if (blockRunCount > 0) {
                        s += "\n  Return Values: ";

                        var rvCount = 0;
                        for (var rvPropName in blockReturnValues) {
                            if (rvCount++ > 0) {
                                s += ", ";
                            }

                            if (rvPropName === PS.RETURN.toString()) {
                                s += "PS.RETURN";
                            }
                            else if (rvPropName === PS.NEXT.toString()) {
                                s += "PS.NEXT";
                            }
                            else if (rvPropName === PS.WAIT_FOR_CALLBACK.toString()) {
                                s += "PS.WAIT_FOR_CALLBACK";
                            }
                            else {
                                s += "'" + rvPropName + "'";
                            }
                        }
                    }

                    s += "\n";
                }
            }
        }

        return s;
    }

    PS.ProcRegistry._procsByName = {};

    PS.ProcRegistry._addConstructor = function (ctor) {
        var procName = ctor.procName;
        if (!procName) {
            procName = PS.ProcRegistry._getProcNameFromCtor(ctor);
        }

        if (!procName || !procName.length) {
            throw new Error("[PS.ProcRegistry._addConstructor] failed to get Proc name for constructor '" + ctor + "'!");
        }

        if (PS.ProcRegistry._procsByName[procName]) {
            throw new Error("[PS.ProcRegistry._addConstructor] a Proc with name '" + procName + "' is already in the Proc registry'!");
        }

        PS.ProcRegistry._procsByName[procName] = new PS.ProcRegistry.ProcRecord(ctor);

    }

    PS.ProcRegistry._getProcNameFromCtor = function (ctor) {
        var marker = "this.name",
        s = ctor.toString(),
        idx = s.indexOf(marker),

        s = s.substring(idx + marker.length);
        idx = s.indexOf('"');

        s = s.substring(idx + 1);
        idx = s.indexOf('"');

        return s.substring(0, idx);
    };

    PS.ProcRegistry._recordRun = function (proc, currentBlock, blockReturnValue) {
        var procRecord = PS.ProcRegistry._procsByName[proc._getProcName()];

        if (!procRecord) {
            throw new Error("[PS.ProcRegistry._processBlockReturnValue] no record found for Proc '" + proc._getProcName() + "'!");
        }

        procRecord.runCount++;
    }

    PS.ProcRegistry._processBlockReturnValue = function (proc, currentBlock, blockReturnValue) {
        var procRecord = PS.ProcRegistry._procsByName[proc._getProcName()];

        if (!procRecord) {
            throw new Error("[PS.ProcRegistry._processBlockReturnValue] no record found for Proc '" + proc._getProcName() + "'!");
        }

        var blockRecord = procRecord.blockRecords[currentBlock.name];
        blockRecord.runCount++;

        var rvPropName = blockReturnValue;
        if (blockReturnValue instanceof PS.Proc) {
            var rvPropName = blockReturnValue._getProcName();
        }

        blockRecord.blockReturnValues[rvPropName] = true;
    }

    PS.ProcRegistry.ProcRecord = function (ctor) {
        //this.procName = ctor.procName;
        this.runCount = 0;
        this.blockRecords = {};

        var blocks = ctor.blocks;
        for (var i = 0, len = blocks.length; i < len; i++) {
            var b = blocks[i];

            this.blockRecords[b.name] = new PS.ProcRegistry.BlockRecord();
        }
    }

    PS.ProcRegistry.BlockRecord = function () {
        this.runCount = 0;
        this.blockReturnValues = {};
    }

    // The ProcScript module exposes the 'PS' global object
    return PS;
});
