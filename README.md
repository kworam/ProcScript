ProcScript
================================

A JavaScript framework that makes it easier to do large-scale application development.


Why ProcScript?
---------------------

While developing HTML5 web applications, I came to love and hate JavaScript.  

I love JavaScript because it is very dynamic and flexible and I really love the 
unparalleled *write-once, run-anywhere* reach of HTML5 apps.  

I hate JavaScript because it is *too* dynamic and flexible.  I encountered many frustrating
runtime errors that would be prevented by a type-checking system.  Many of the toughest 
bugs to find and fix resulted from callers passing incomplete or mis-matched parameter lists to 
functions.  

I also found that while JavaScript is great for asynchronous programming, doing heavily 
synchronous programming in JavaScript is almost impossible (see *The Pyramid of Doom*).

http://tritarget.org/blog/2012/11/28/the-pyramid-of-doom-a-javascript-style-trap/

If the number of sequenced operations is longer than four or five, the nested JavaScript 
callback approach becomes very hard to manage.

To overcome these JavaScript problems, I developed ProcScript.  ProcScript adds type checking and synchronous programming support to JavaScript.


ProcScript features
-------------------------

* Pure JavaScript: No Compilers or Preprocessors
* Type Checks Input and Output Parameters
* Makes Synchronous Programming Easy
* Use C# or Java skills to write JavaScript
* Great Debugging Support
* Provides Code Coverage Statistics
* Works with Promises


Procs
-------

The ProcScript framework allows you to define and run Procs.  A Proc is like an enhanced 
JavaScript function with type-checked input and output parameters and synchronous programming support.  A Proc has the following properties:

* Name:  The unique name of the Proc.
* Signature:  An object literal that defines the Proc's input and output parameters.
* Blocks:  The code of the Proc specified as an array of JavaScript functions.  ProcScript executes these functions synchronously, in array order.
  
  
My first Proc
--------------

When you include *ps.js* in your web app, you gain access to the ProcScript global
variable (`PS`).  `PS.defineProc()` takes an object literal called a *proc config* as input.  The Proc config must have these properties:

`name` gives the unique name of the Proc.

`fnGetSignature` returns an object identifying the Proc's input and output parameters.  

`blocks` defines the code of the Proc as an array of functions.

For example, the following example defines a simple Proc called "MyFirstProc":

    var MyFirstProc = PS.defineProc({

        name: "MyFirstProc",
        fnGetSignature: function () {
            return {
                input1: ["string"],
                output1: [Array, "out"]
            };
        },
        blocks: [
        function blockFunction1() {
            console.log(this.input1);
            return PS.NEXT;
        },
        function blockFunction2() {
            this.output1 = [ "Hello World!" ];
            return PS.NEXT;
        }]
		
    });

The proc config specifies that *MyFirstProc* takes one *string* input (`input1`) and produces one *Array* output (`output1`).  It has two blocks of code: 
the first block writes the value of `input1` to the console and the second block sets the value of `output1` to "Hello World!".

`PS.defineProc()` registers *MyFirstProc* with the ProcScript framework and returns the MyFirstProc constructor function.  Use the constructor function 
to create and run instances of *MyFirstProc* like this:

	var procInstance = new MyFirstProc({input1: "Hi Mom!"});
	procInstance.run();


The signature
-----------------

The `fnGetSignature` member of the proc config is a function that returns an object literal called a *signature object*.
The *signature object* defines the input and output parameters of the Proc and has this structure:

	{
	parameterName1: [ paramType, paramDir ],
	parameterName2: [ paramType, paramDir ],
	...
	parameterNameN: [ paramType, paramDir ]
	}
	
`paramType`

The following `paramType` values are allowed:

*	"boolean", "number", "string" or "function"   	
	The parameter value must be a JavaScript boolean, number, string or function value.
	
*	*class constructor function*				
	The object parameter value must be an `instanceof` the class.
	
*	null        	
	The parameter value may be any type.

	
`paramDir`


The following `paramDir` values are allowed:

*	"in"       
	The parameter is input-only.
	
*	"in-out"   
	The parameter is received as input and returned as output.
	
*	"out"      
	The parameter is output-only.
	
*	undefined  
	If no `paramDir` is specified, it defaults to "in".



Enforcing the signature
------------------------------------
Notice that the `MyFirstProc` constructor function takes an object literal called a *parameter object* as input:

	var procInstance = new MyFirstProc({input1: "Hi Mom!"});

When you create a Proc instance, ProcScript checks the parameter object against the signature object.  If it does not contain a value of the right type 
for each "in" and "in-out" parameter, ProcScript throws an error.  

Likewise, ProcScript checks the parameter object against the signature just before a Proc returns to its caller. If it 
does not contain a value of the right type for each "in-out" and "out" parameter, ProcScript throws an error.


Type checking objects
--------------------------------------

As mentioned above, if the `paramType` of a parameter is a class constructor function, ProcScript checks that the parameter value is an `instanceof` that class.  

This works for core JavaScript classes (like Date or Array) but also for user-defined classes.  For example, if you define a Point class like this:

	function Point(x, y) {
		this.x = x;
		this.y = y;
	}

	Point.prototype.toString = function () {
		return "{" + this.x + "," + this.y + "}";
	}


You can write a Proc that inputs or outputs a `Point` object like this:


	var PointProc = PS.defineProc({

		name: "PointProc",
		fnGetSignature: function () {
			return {
				inPoint: [Point]
			};
		},
		blocks: [
		function () {
			console.log(this.inPoint.toString());
			return PS.NEXT;
		}]
		
	});


	
Block functions and Proc Locals
----------------------------------

Each block function in a Proc is a normal JavaScript function.  You should give each block function a
descriptive name as this makes Proc stack traces more informative and readable.  If you don't give a block function a 
name, ProcScript auto-names it `block_N` where `N` is the index of the function in the `blocks` array.



Proc locals
----------------

Inside a block function, `this` refers to the Proc instance that is running.  Properties of the Proc instance 
are referred to as *Proc locals*.

For example, this block function sets Proc local `x` to 'hello'.

	function blockFunc () {
		this.x = 'hello';
	}
	
A Proc local is available in the block function where it is declared and in subsequent block functions.  

ProcScript automatically creates Proc locals for each "in" and "in-out" parameter.  `blockFunction1` of `MyFirstProc` 
shows this with the "in" parameter `input1`:

        function blockFunction1() {
            console.log(this.input1);
            return PS.NEXT;
        }

To set an "in-out" or "out" parameter, just set a Proc local with parameter's name to the desired value.  `blockFunction2` of `MyFirstProc` 
shows this with "out" parameter `output1`:

        function blockFunction2() {
            this.output1 = [ "Hello World!" ];
            return PS.NEXT;
        }


Block function return values
-----------------------------------

All block functions must return one of the following values.  The return value tells ProcScript what to do next:

*	`PS.NEXT`       
	Run the next block function.
	
*	`PS.RETURN`   
	Return to the caller of this Proc.
	
*	`PS.BREAK`       
	Break out of a loop Proc.
	
*	`PS.CONTINUE`   
	Skip to the next iteration of a loop Proc.
	
*	*Proc Instance*      
	Run *Proc Instance* and pass its parameter object to the next block function.
	
*	`PS.WAIT_FOR_CALLBACK`  
	Adapter Procs return this value so ProcScript will wait for a callback from a blocking function.

	
If a block function returns anything other than one of these values, ProcScript throws an error.



	
Chaining Procs
-----------------------------------

If a block function returns a Proc instance, ProcScript runs it and passes its parameter object to the next block function.  This 
lets you chain Procs together into call stacks.

Here is a simple example:

    var ProcCallsProc = PS.defineProc({

        name: "ProcCallsProc",
        fnGetSignature: function () {
            return {};
        },
        blocks: [
        function blockFunction1() {
            return new MyFirstProc({input1: "Hi Mom!"});
        },
        function blockFunction2(paramObj) {
			console.log(paramObj.output1[0]);
            return PS.NEXT;
        }]
		
    });

				
If a block function returns a Proc instance, ProcScript runs it and passes its parameter object to the next block function.  In
`ProcCallsProc`, `blockFunction2` receives the parameter object from `MyFirstProc` in variable `paramObj`.

Running `ProcCallsProc` like this:
	
	new ProcCallsProc({}).run();

produces this console output:

	Hi Mom!
	Hello World!




Proc call stacks
--------------------

The first Proc Instance in a call stack is called the root Proc.  When a root Proc runs, 
ProcScript allocates a virtual *thread* for that root Proc and its descendant (callee) Procs.

You can dump the call stack from any Proc Instance in a thread with this function:

	Proc.callStackToString()
	
The stack dump looks like this:

	Proc Call Stack:
	 ProcScript Thread Id: 0, Created: Tue Jun 04 2013 14:05:05 GMT-0500 (Central Daylight Time)	 
	 MyFirstProc.blockFunction1
	 ProcCallsProc.blockFunction1

Each Proc Instance in the call chain is listed, one per line, with the root Proc at the bottom.

Note that the Proc call stack starts with:

	ProcScript Thread Id: 0 Created ...
	
Once again, this is not an operating system thread but a *virtual* ProcScript thread.  

The Proc call stack contains the chain of Proc Instances that called each other leading up to the breakpoint or exception.  Each entry 
in the Proc call stack is of the form:

	Proc Name.Block Function Name

In the example above, block function `blockFunction1` in Proc `ProcCallsProc` called Proc `MyFirstProc`.  The breakpoint or exception occured in 
the `blockFunction1` of `MyFirstProc`.


To dump the call stacks of all active ProcScript threads, use this function:

	PS.threadsToString()

	
_catch and _finally block functions
-------------------------------------

If you name a block function *_catch* or *_finally*, ProcScript treats it as the catch or finally clause for the Proc.  There can only be  
one _catch or _finally block function in a Proc and they must come last in the `blocks` array.

The _catch and _finally block functions perform the same duties for Procs that `catch` and `finally` clauses do for JavaScript
functions.  If a block function throws an error, ProcScript passes it to the Proc's _catch block function for handling.  If the Proc has no 
_catch block function, ProcScript propagates the error to the caller Proc until it finds one with a _catch handler.  

If a Proc has a _finally block function, ProcScript *always* runs it before returning to the Proc's caller, regardless
of whether the Proc failed or succeeded.

Here is a Proc with _catch and _finally block functions:

    var CatchFinallyProc = PS.defineProc({

        name: "CatchFinallyProc",
        fnGetSignature: function () {
            return {
            };
        },
        blocks: [
        function doIt() {
			console.log("doIt: start spinner....");			
			undefinedFunction();
            return PS.NEXT;
        },
		function _catch (err) {
            console.log("_catch: err=" + err);
			return PS.NEXT;
		},
		function _finally () {
			console.log("_finally: stop spinner....");
			return PS.NEXT;
		}]
		
    });

Note that block function `doIt` calls `undefinedFunction()` which causes a JavaScript error.  If you run `CatchFinallyProc` like so:
	
	new CatchFinallyProc({}).run();

You will see this output:

	doIt: start spinner....
	
	...ProcScript Stack Trace...
	
	_catch: err=ReferenceError: undefinedFunction is not defined
	_finally: stop spinner....

	

Loop Procs
----------------------

ProcScript supports four loop constructs:

1. For
2. ForEach 
3. While
4. Do...While

ProcScript implements these constructs with *Loop Procs*.  You define a loop Proc by specifying a loop property in its proc config. 


For loops
--------------------

Define a `For` loop proc with the `fnForLoop` property like so:

	var ForLoopProc = PS.defineProc({

		name: "ForLoopProc",
		fnGetSignature: function () {
			return {
				arr: [Array]
			};
		},
		fnForLoop: function () {
			return {
				init: 				function () { this.i = this.arr.length-1; },
				beforeIteration: 	function () { return this.i >= 0; },
				afterIteration: 	function () { this.i -= 2; },			
			};
		},
		blocks: [
		function blockFunction1() {
			console.log(this.arr[this.i]);
			return PS.NEXT;
		}]
		
	});

ProcScript runs the For loop Proc as follows:

	1. Run the `init` function.
	2. Run `beforeIteration` 
		- If it returns true, run the entire Proc, then `afterIteration` and then go to step 2 again.
		- If it returns false, return to the Proc's caller.

This is equivalent to the following `for` loop in Java:

	public void forLoop (char[] arr)
	{
		for (int i=arr.length-1; i >=0; i -= 2)
		{
			System.out.println(arr[i]);
		}
	}

Run ForLoopProc like this:	

	new ForLoopProc({arr: ['a','b','c','d','e','f']}).run();

and you will see this output:

	f
	d
	b


ForEach loops
----------------------

Define a `ForEach` loop proc with the `fnGetForEachArray` property like so:

    var MyForEachProc = PS.defineProc({

        name: "MyForEachProc",
        fnGetSignature: function () {
            return {
                input1: ["string"],
				arr: [Array]
            };
        },
		fnGetForEachArray: function () { return this.arr; },
        blocks: [
        function blockFunction1() {
            console.log(this.getCurrentForEachItem());
            console.log(this.getCurrentLoopIterationIndex());
            return PS.NEXT;
        }]
		
    });

The `fnGetForEachArray` property defines a function that returns an array.  ProcScript calls this function once, at Proc 
startup time, and then executes the Proc once for each member of the resulting array.  

This example demonstrates the following loop support functions:

`Proc.getCurrentForEachItem()`			returns the current item in the `ForEach` array.

`Proc.getCurrentLoopIterationIndex()`	returns the current iteration count of the loop Proc *(zero-based)*.
	
`Proc.getCurrentForEachItem()` returns null if called from a Proc that is not a `ForEach` loop proc.  
`Proc.getCurrentLoopIterationIndex()` returns null if called from a non-loop Proc.

	
	
While loops
--------------------------

Define a `While` loop proc with the `fnWhileTest` property like so:

    var WhileProc = PS.defineProc({

        name: "WhileProc",
        fnGetSignature: function () {
            return {
                input1: ["string"],
				bContinue: ["boolean"]				
            };
        },
		fnWhileTest: function () { return this.bContinue; },
        blocks: [
        function blockFunction1() {
			this.i = this.getCurrentLoopIterationIndex();
            console.log(this.i);
            return PS.NEXT;
        },
        function blockFunction2() {
            if (this.i == 100) {
				this.bContinue = false;
			}
            return PS.NEXT;
        }]
		
    });

The `fnWhileTest` property defines a function that returns a boolean (true or false) value.  ProcScript calls 
this function before executing the first block function in the Proc.  If it returns false, ProcScript returns to 
the caller.  If it returns true, ProcScript runs the Proc.  

ProcScript repeats this process until the `fnWhileTest` function returns false.


Do...While loops
--------------------------

Define a `Do...While` loop proc with the `fnDoWhileTest` property like so:

	var DoWhileProc = PS.defineProc({

		name: "DoWhileProc",
		fnGetSignature: function () {
			return {
				arr: [Array]
			};
		},
		fnDoWhileTest: function () {
			return false;
		},
		blocks: [
		function blockFunction1() {
			console.log(this.arr[this.getCurrentLoopIterationIndex()]);
			return PS.NEXT;
		}]
		
	});


The `fnDoWhileTest` property defines a function that returns a boolean (true or false) value.  ProcScript calls 
the `fnDoWhileTest` function after executing the last block function in the Proc.  If it returns false, ProcScript returns to 
the caller.  If it returns true, ProcScript runs the Proc again. 


Control Flow in loop Procs
------------------------------------------

In a loop Proc, return value `PS.CONTINUE` works like the JavaScript `continue` statement.  ProcScript skips the 
remaining block functions and begins running the next iteration of the loop.  Likewise, return value `PS.BREAK` works like the 
JavaScript `break` statement.  It makes ProcScript immediately return to the Proc's caller.  

If you define and run this loop Proc:


    var LoopControlsProc = PS.defineProc({

        name: "LoopControlsProc",
        fnGetSignature: function () {
            return {
                input1: ["string"],
				arr: [Array]
            };
        },
		fnGetForEachArray: function () { return this.arr; },
        blocks: [
        function blockFunction1() {
			this.i = this.getCurrentLoopIterationIndex();
			if (this.i == 1) {
				return PS.CONTINUE;
			} else if (this.i == 3) {
				return PS.BREAK;
			}
            return PS.NEXT;
        },
		function blockFunction2 () {
            console.log(this.input1 + ": i=" + this.i);
			return PS.NEXT;
		}]
		
    });
	
	new LoopControlsProc({input1: "LoopControlsProc", arr: [0,1,2,3,4]}).run();
	
you will get this console output:

	LoopControlsProc: i=0
	LoopControlsProc: i=2



If a block function in a non-loop Proc returns `PS.CONTINUE` or `PS.BREAK`, ProcScript throws an error.

Catch-Finally in loop Procs
------------------------------------------

If a loop Proc has _catch or _finally block functions, ProcScript behaves as if they are outside the loop, not inside.  The equivalent 
JavaScript code would look like this:

	try {
		while (bContinue) {
			..
		}
	} catch () {
	} finally {
	}

If you want the try-catch inside the loop like this:

	while (bContinue) {
		try {
			...
		} catch () {
		} finally {
		}
	}

then put the _catch and _finally in a non-loop Proc and call it from the loop Proc.

	
	 
Adapter Procs
---------------------------------------------------

An Adapter Proc turns a blocking function into a Proc.  Writing an Adapter Proc is simple:  
just set the `adapter` property in the proc config and make the blocking function call 
`PS.procSucceeded` or `PS.procFailed` as appropriate.

Here is an example from the ProcScript demo app:
	
    // XHR.makeCorsRequestProc is an Adapter Proc for XmlHttpRequest

    XHR.makeCorsRequestProc = PS.defineProc({
        name: "XHR.makeCorsRequestProc",
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
                // The Adapter Proc succeeded
                proc.responseText = xhr.responseText;   // set the 'responseText' output parameter 
                PS.procSucceeded(proc)        
            };

            xhr.onerror = function () {
                // The Adapter Proc failed
                PS.procFailed(proc, '[XHR.makeCorsRequest]  CORS request resulted in error.\n')
            };

            xhr.send();

            // Tell ProcScript to wait for a callback from the blocking function above.
            return PS.WAIT_FOR_CALLBACK;
        }]
		
    });

	
Note how `XHR.makeCorsRequestProc` stashes a reference to itself in variable `proc` and passes it to 
the `PS.procSucceeded` or `PS.procFailed` function.  

`PS.procSucceeded` tells ProcScript that the Adapter Proc completed successfully.  Before calling this function, 
the Adapter Proc must set the value of its "in-out" or "out" parameters.  

`PS.procFailed` tells ProcScript that the Adapter Proc failed.  The second parameter to `PS.procFailed` 
is a string containing the reason for the failure.  ProcScript propagates this error string up the Proc call stack 
as described in the *_catch and _finally block functions* section of this readme.


Using Adapter Procs
---------------------------------------------------

Once you have defined an Adapter Proc, you can call it as you would any other Proc. Here is an example from the ProcScript demo app:

	return new XHR.makeCorsRequestProc({
		method: this.httpMethodValue,
		url: this.txtURLValue
	});

	
Adapter Procs can only have one block function and they cannot have _catch or _finally clauses.  An Adapter Proc's
block function must return `PS.WAIT_FOR_CALLBACK`, any other return value causes ProcScript to throw an error.  If a 
non-Adapter Proc returns `PS.WAIT_FOR_CALLBACK`, ProcScript throws an error.  

	
Working with Promises
---------------------------------------
ProcScript works with Promise frameworks like Q:

https://github.com/kriskowal/q

and JQuery:

http://api.jquery.com/Types/#Deferred

http://api.jquery.com/Types/#Promise

`PS.promiseToRun` takes in a deferred, a Proc instance and (optionally) runParams, and returns a promise:

	PS.promiseToRun(deferred, proc, runParams)

`PS.promiseToRun` runs the specified Proc instance with the specified runParams (if any).  If the Proc succeeds, 
it resolves the deferred with its parameter object like so:

	deferred.resolve(this.getParameterObject())

If it fails, it rejects the deferred with its failure object like so:

	deferred.reject(this.getFailure())
	
This lets you run Proc instances as part of a promise chain.  Here is an example using Q:

	fnReturnsPromise().then( 
		
	function () { 
		return PS.promiseToRun(Q.defer(), new MyProc());
	}).then(

	function () {
		fnReturnsPromise() 
	});

and here is an example using JQuery:

	fnReturnsPromise().then( 
		
	function () { 
		return PS.promiseToRun($.Deferred(), new MyProc());
	}).then(

	function () {
		fnReturnsPromise() 
	});

	
	
ProcScript debugging
------------------------------------------

Incomplete or confusing error messages are frustrating and waste valuable development time.  If an exception occurs or 
a developer uses the framework incorrectly, ProcScript makes every effort to provide complete and helpful error messages.  

ProcScript maintains a Proc call stack for each Proc call chain.  If an unhandled exception occurs in a block function, 
ProcScript writes a detailed error summary to the console including the Proc call stack as well as the JavaScript call stack.  

Here is an example from the ProcScript demonstration app:

	[onProcException] localhost/:14
	err=Error: [App.initDbProc]  simulated exception in 'createTablesIfNecessary' block function localhost/:15
	errorMessage: localhost/:17
	Unhandled exception in App.initDbProc.createTablesIfNecessary

	JavaScript Error Object:
	 Error.message=[App.initDbProc]  simulated exception in 'createTablesIfNecessary' block function
	 Error.stack=Error: [App.initDbProc]  simulated exception in 'createTablesIfNecessary' block function
		at createTablesIfNecessary (http://localhost/psDemo/app.js:147:19)
		at procDispatch (http://localhost/psDemo/app/utility/ps.js:1074:27)
		at MessagePort.channel.port1.onmessage (http://localhost/psDemo/app/utility/ps.js:86:13)

	Proc Call Stack:
	 Thread Id: 0, Created: Tue Jun 04 2013 14:05:05 GMT-0500 (Central Daylight Time)

	 App.initDbProc.createTablesIfNecessary
	 App.corsTestProc.isDbPopulated

The JavaScript stack trace is listed under the heading `JavaScript Error Object:`. 

The debugging tools in many browsers allow you to click on any line in the JavaScript stack trace to go straight 
to the associated line in the JavaScript source.

The Proc call stack is listed under the heading `Proc Call Stack:`.  


The combination of the JavaScript and ProcScript call stacks is very helpful in debugging web applications.


Listening for ProcScript events
------------------------------------------

You can register or un-register for ProcScript events using these functions:

	PS.addListener(eventType, f)
	PS.removeListener(eventType, f)

The following `eventType` values are supported:

"procException"  

ProcScript notifies "procException" listeners when an exception occurs in a Proc.  
ProcScript passes the following parameters to the registered callback function:

`err` the thrown error value.

`errorMessage` the detailed error summary (including stack traces) that ProcScript creates to describe `err`.

Here is an example of a listener registering for "procException" events:

        var onProcException = function (err, errorMessage) {

            console.log("[onProcException]");
            console.log("err=" + err);

            console.log("errorMessage:");
            console.log(errorMessage);
        }

        // To get a callback from ProcScript when a Proc failure happens,
        // register as a 'procException' listener.
        PS.addListener('procException', onProcException);

and here is how to un-register that listener:

        PS.removeListener('procException', onProcException);
	

Code coverage statistics
---------------------------

To get code coverage statistics from ProcScript, call this function:

	PS.cloneProcRegistry()

This returns a deep copy of the ProcScript registry.  It is safe for you to use this copy 
without affecting the actual ProcScript registry.

The Registry object returned by `PS.cloneProcRegistry()` has the following structure:

	*Proc Registry Object*
	{
		<procName1>: <ProcRecord>
		<procName2>: <ProcRecord>
		...
		<procNameN>: <ProcRecord>
	}
	
where:

`<procNameN>` is the name of the Proc as specified in the call to `PS.defineProc` and
`<ProcRecord>` is an object with the following structure:

	*ProcRecord Object*
	{ 
		runCount: <number>,
		blockRecords: <BlockRecords object>
	}
	
where:

`runCount` is the number of times ProcScript has run the Proc and
`blockRecords` is an object with the following structure:

	*BlockRecords Object*
	{ 
		<blockName1>: <BlockRecord>
		<blockName2>: <BlockRecord>
		...
		<blockNameN>: <BlockRecord>
	}

where:

`<blockNameN>` is the name of the block function (user-specified or auto-named) and 
`<BlockRecord>` is an object with the following structure:
	
	*BlockRecord Object*
	{ 
		runCount: <number>
	}

where:

`runCount` is the number of times ProcScript has run the block function.


Using code coverage statistics
--------------------------------

Note that the runCounts in the Proc Registry object reset to zero each time your JavaScript
application reloads (ie, you refresh the web page hosting it).  To build coverage statistics over time, you should 
accumulate ProcScript runCounts into persistent storage of some kind.

If a ProcRecord has a runCount of zero, then ProcScript has not run it since the JavaScript application loaded.  If a 
ProcRecord has a non-zero runCount, however, it could have one or more BlockRecords with a zero runCount.   You should
remember this when analyzing the statistics to determine your true code coverage.

Finally, bear in mind that these code coverage statistics are only valid for the parts of your JavaScript application 
that are coded as ProcScript Procs.  They cannot tell you anything about your coverage of non-ProcScript JavaScript.



The ProcScript API
--------------------------------

Here is a quick summary of the ProcScript API:

PS API
--------
`PS` is the object that ProcScript makes available as a JavaScript global.  It provdes access
to all ProcScript functionality as defined below.


These functions define, undefine or get a Proc in the ProcScript registry. 

	PS.defineProc(configObject)
	PS.undefineProc(procName)
	PS.getProc(procName)
    
Adapter Procs call these functions to tell ProcScript whether they succeeded or failed.

	PS.procSucceeded(adapterProcInstance)
	PS.procFailed(adapterProcInstance, errorMessage)
		
These are the block function return values supported by ProcScript.

    PS.NEXT
	PS.RETURN
    PS.CONTINUE
    PS.BREAK
    PS.WAIT_FOR_CALLBACK

These functions add or remove ProcScript listeners.

    PS.addListener(eventType, callback)
    PS.removeListener(eventType, callback)

This function returns a string dump of all active ProcScript threads.

    PS.threadsToString()
	
These functions provide access to ProcScript's code coverage statistics.

    PS.cloneProcRegistry()
    PS.codeCoverageToString()

Working with Promises 
------------------------------

`PS.promiseToRun` takes a deferred, a Proc instance and (optionally) runParams, and returns a promise.

	PS.promiseToRun(deferred, proc, runParams)

`PS.promiseToRun` runs the specified Proc instance and resolves or rejects the deferred when the Proc finishes.  If the Proc  
succeeds, it resolves the deferred with its parameter object.  If it fails, it rejects the deferred with its failure message.


Proc Runners 
------------------------------

ProcRunners are Adapter Procs that run multiple Proc Instances in various ways.  `PS.ProcList` is 
a helper class for passing Proc Instances to a ProcRunner.

	PS.ProcList(arr)
	PS.ProcList.getArray()

The constructor function takes an array of Proc Instances.  It type-checks the array and ensures it is not empty.
`getArray` returns the type-checked array of Proc Instances.

ProcScript pre-defines four ProcRunners for your convenience.  Set a timeout for a ProcRunner by calling 
PS.Proc.setTimeout() before running it.  Abort a running ProcRunner by calling PS.Proc.abort() on it.
 
Here are the names and signatures of the four pre-defined ProcRunners:

PS.SequenceProcRunner
------------------------------

    fnGetSignature: function () {
        return {
            procList: [PS.ProcList]
        };
    }

PS.SequenceProcRunner runs the specified list of Procs in sequence. 
If any Proc fails, PS.SequenceProcRunner fails.  
Otherwise, PS.SequenceProcRunner succeeds.
	
PS.FallbackProcRunner
------------------------------
	
    fnGetSignature: function () {
        return {
            procList: [PS.ProcList],
            fallbackIndex: ["number", "out"]
        };
    }

PS.FallbackProcRunner runs the specified list of Procs in sequence.  
If all the Procs fail, PS.FallbackProcRunner fails.  
Otherwise, PS.FallbackProcRunner returns the index of the first successful Proc in 'fallbackIndex'.

PS.RaceProcRunner
------------------------------

    fnGetSignature: function () {
        return {
            procList: [PS.ProcList],
            winnerIndex: ["number", "out"]
        };
    }

PS.RaceProcRunner starts all of the Procs in the specified list running simultaneously.  
If all the Procs fail, PS.RaceProcRunner fails.  
Otherwise, PS.RaceProcRunner returns the index of the first successful Proc in 'fallbackIndex'.
  

PS.ParallelProcRunner
------------------------------

    fnGetSignature: function () {
        return {
            procList: [PS.ProcList]
        };
    }
	
PS.ParallelProcRunner starts all of the Procs in the specified list running simultaneously.  
If any of the Procs fail, PS.ParallelProcRunner fails.
Otherwise, PS.ParallelProcRunner succeeds.

	
PS.Proc API
-------------

`PS.Proc` is the prototype (base class) for all Proc definitions.  All Proc Instances are 
instances of `PS.Proc` and can access these functions:

	run ( [ runParams ] )

`run` returns the thread Id of the running Proc Instance.
You can optionally pass `run` an object literal called `runParams`.  runParams can contain the following properties:

	runParams.timeout 
	runParams.fnStatusChanged
	
If `runParams.timeout` is defined, ProcScript calls `setTimeout` on the Proc Instance with the specified value.
If `runParams.fnStatusChanged` is defined, ProcScript calls `addStatusChangedListener` on the Proc Instance with the specified value.

		
	abort ( [reason] )

aborts the Proc Instance.  If `reason` is specified, ProcScript reports it as the reason why the Proc Instance was aborted.

	setTimeout(ms)

If the Proc has not finished after 'ms' milliseconds, it aborts itself with a reason of "timeout".  If 'ms' is zero, the Proc never times out.

	getTimeout()

Returns the millisecond timeout setting for the Proc.

	getTimeoutReason()

Returns the reason that the Proc timed out.  If the Proc has not timed out, returns undefined.
	
	setInstanceName(name)

Sets the name associated with this Proc instance to the string `name`.

	getInstanceName()
	
Returns the name associated with this Proc instance or undefined.

	succeeded()

true if the Proc Instance succeeded.
	
	failed()

true if the Proc Instance failed or was aborted.
	
	aborted()

true if the Proc Instance was aborted.
	
	getParameterObject()

gets the Proc Instance's parameter object.  
NOTE:  The "in-out" and "out" parameters are only guaranteed to be correct if the Proc Instance succeeded.
	
	getFailure()

gets the Proc Instance's failure reason.
	
	getAbortReason()

If the Proc Instance was aborted, this returns the reason why.
	
	getThreadId()

returns the unique Id of this Proc Instance's thread.
	
	getCurrentForEachItem()

In `ForEach` loop Proc Instance, getCurrentForEachItem() gets the current array item being processed.
Returns null if the Proc instance is not a `ForEach` loop Proc.
	
	getCurrentLoopIterationIndex()

In loop Proc Instances, getCurrentLoopIterationIndex() returns the zero-based loop iteration count.
Returns null if the Proc instance is not a loop Proc.

	callStackToString()

callStackToString() returns a string dump of the ProcScript thread for this Proc Instance.

You can register for status change events from a Proc instance using this function:

	addStatusChangedListener(fnStatusChangedListener)

where `fnProcStatusChanged` is a function like this:

    var fnStatusChangedListener = function (proc, status) { ... }

and 

`proc`is the Proc whose status has changed and 
`status` is one of the following string values:  

    PS.PROC_STATUS_RUNNING
    PS.PROC_STATUS_FINISHED


NOTE:  All Proc Instances have a private property named `_procState` that is reserved for use 
by ProcScript. 

	_procState 

When defining Proc Locals on your Proc Instance, you may use any name other than `_procState`.
		
	

				
	
ProcScript Demos
------------------------------

For simple demonstrations of how to use ProcScript, see the ProcScript demo apps in this repository.  The demos
are brief and heavily commented and provide a great way to quickly learn ProcScript.

*corsDemo* 
This demo uses ProcScript to send Cross Origin Resource Sharing (CORS) requests to websites.  The heavily commented, brief code
shows ProcScript making XmlHttpRequests and writing to a WebSQL database. 

*procRunnerDemo* 
This demo shows Proc Runners controlling multiple Procs running in Sequence, Parallel, Fallback or Race operations.  The 
attractive, interactive GUI allows full control over duration, timeout and abort and also allows for nesting of Proc Runners.


