ProcScript
================================

A JavaScript framework that makes it easier to do large-scale application development.


Why ProcScript?
---------------------

While developing HTML5 web applications, I came to love and hate JavaScript.  

I love JavaScript because it is very dynamic and flexible and I really love the 
unparalleled *write-once, run-anywhere* reach of HTML5 apps.  

I hate JavaScript because it is *too* dynamic and flexible.  I enountered many frustrating
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

* Type Checks Input and Output Parameters
* Makes Synchronous Programming Easier
* Pure JavaScript: No Compilers or Preprocessors
* Great for porting C# or Java code to JavaScript
* Great Debugging Support
* Provides Code Coverage Statistics


Procs
-------

The ProcScript framework allows you to define and run Procs.  A Proc is like an enhanced 
JavaScript function with type-checked input and output parameters and  synchronous programming support.  A Proc has the following properties:

* Name:  The unique name of the Proc.  No two Proc definitions may have the same name.
* Signature:  An object literal that defines the input and output parameters of the Proc.
* Blocks:  The code of the Proc, specified as an array of one or more JavaScript functions.  ProcScript executes these functions in the order they are listed.
  
  
My first Proc
--------------

When you include *ps.js* in your web app, you gain access to the ProcScript global
variable (`PS`).  The `PS.defineProc()` function takes an object literal (*config object*) with properties that define a Proc.  

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
        }
		]
    });

The config object specifies that *MyFirstProc* takes one *string* input (`input1`) and produces one *Array* output (`output1`).  
It has two blocks of code: the first block writes the value of the `input1` to the console and the second block sets the value of `output1` to "Hello World!".

`PS.defineProc()` registers *MyFirstProc* with the ProcScript framework and returns the MyFirstProc constructor function.  
You can use this constructor function to create and run instances of *MyFirstProc* like this:

	var procInstance = new MyFirstProc({input1: "Hi Mom!"});
	procInstance.run();


The signature
-----------------

The `fnGetSignature` member of the config object defines a function that returns an object literal.
This object literal is called the *signature object* and it defines the input and output parameters of the Proc.  
The signature object has this structure:

	{
	parameterName1: [ paramType, paramDir ],
	parameterName2: [ paramType, paramDir ],
	...
	parameterNameN: [ paramType, paramDir ]
	}
	
`paramType`

The following `paramType` values are allowed:

*	"boolean"   	
	The parameter value must be a JavaScript boolean.
	
*	"number"    	
	The parameter value must be a JavaScript number.
	
*	"string"    	
	The parameter value must be a JavaScript string.
	
*	*class constructor function*				
	The parameter value must be an `instanceof` the class.
	
*	null        	
	No type checking is performed, the parameter value may be any type.

	
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



ProcScript enforces the signature
------------------------------------
Notice that the `MyFirstProc` constructor function takes an object literal as input:

	var procInstance = new MyFirstProc({input1: "Hi Mom!"});

This object literal is called a parameter object and ProcScript checks it against the signature object.  
If it does not contain a value of the right type for each "in" and "in-out" parameter in the signature, ProcScript throws an error.  

Similarly, before a Proc returns to its caller, ProcScript checks its return object against the signature object. 
If it does not contain a value of the right type for each "in-out" and "out" parameter in the signature, ProcScript throws an error.


ProcScript type checks objects
--------------------------------------

As mentioned above, if the `paramType` of a parameter is the constructor function for a class, ProcScript checks that the parameter value is an `instanceof` that class.  

This works for core JavaScript classes (like Date or Array) but also for user-defined classes.  For example, if I define a Point class like this:

	function Point(x, y) {
		this.x = x;
		this.y = y;
	}

	Point.prototype.toString = function () {
		return "{" + this.x + "," + this.y + "}";
	}


then I can write a Proc that inputs or outputs a `Point` object.  For example, this Proc receives a `Point` object as input:


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
		}
		]
	});

Running `PointProc` like this:

	new PointProc({ inPoint: new Point(1, 2) }).run();

produces this console output:

	{1,2}



	
Block functions 
------------------

Each block function in a Proc is a normal JavaScript function.  It is recommended that you give each block function a
descriptive name.  This makes Proc stack traces more informative and readable.  If you don't give a block function a 
name, ProcScript auto-names it `block_N` where `N` is the index of the block function in the `blocks` array.

A block function either has one parameter or no parameters.  The parameter gives the block function access to the result object of the 
previous block function.  Here is an example of a block function with one parameter:

	function blockFunc (resultObj) {
	}
  
We named the parameter `resultObj` in this example, but you can choose any name you like.  If a block function does not need the results 
of the previous block function, it should declare no parameters.


Proc locals
----------------

Inside a block function, `this` refers to the Proc instance that is running the block function.  Properties of the Proc instance 
are referred to as *Proc locals*.

For example, this block function sets the value of Proc local `x` to the `resultObj` value from the previous block function.

	function blockFunc (resultObj) {
		this.x = resultObj;
	}
	
A Proc local is available in the block function where it is declared and in any subsequent block functions.  In a loop Proc,
a Proc local is also available in any subsequent iterations of the loop.



Accessing Proc parameters in a block function
------------------------------------------------

ProcScript makes a Proc's "in" and "in-out" parameters available to its block functions as Proc locals.  `blockFunction1` of `MyFirstProc` 
demonstrates this with the "in" parameter `input1`:

        function blockFunction1() {
            console.log(this.input1);
            return PS.NEXT;
        }

To set the value of a Proc's "in-out" or "out" parameter, set a Proc local with same name to the desired value.  `blockFunction2` of `MyFirstProc` 
demonstrates this with "out" parameter `output1`:

        function blockFunction2() {
            this.output1 = [ "Hello World!" ];
            return PS.NEXT;
        }


Block function return values
-----------------------------------

Every block function must return one of the following values.  The return value tells ProcScript what to do next:

*	`PS.NEXT`       
	Run the next block function.
	
*	`PS.RETURN`   
	Return to the caller of this Proc.
	
*	`PS.BREAK`       
	Break out of a loop Proc.
	
*	`PS.CONTINUE`   
	Skip to the next iteration of a loop Proc.
	
*	*a Proc Instance*      
	Run *a Proc Instance* and pass its results to the next block function.
	
*	`PS.WAIT_FOR_CALLBACK`  
	Wait for a callback from a ProcScript-compliant blocking function and pass its results to the next block function.

	
If a block function returns anything other than one of these values, ProcScript throws an error.




_catch and _finally block functions
-------------------------------------

If you name a block function *_catch*, ProcScript treats it as the catch handler for the Proc.  Likewise, if you name a block 
function *_finally*, ProcScript treats it as the finally handler for the Proc.  There can be at most one _catch and one _finally block function
in a Proc and they must come last in the `blocks` array.

The _catch and _finally block functions perform the same duties for the Proc that `catch` and `finally` statements do for regular JavaScript
functions.  If a block function throws an error, ProcScript passes the error to the Proc's _catch block function for handling.  If there 
is no _catch block function, ProcScript propagates the error up the Proc call stack until it finds a Proc with a _catch handler.  

If a Proc has a _finally block function, ProcScript *always* runs this block function before returning to the Proc's caller, regardless
of whether a block function threw an error or not.

Here is a simple example with _catch and _finally block functions:

    var CatchFinallyProc = PS.defineProc({

        name: "CatchFinallyProc",
        fnGetSignature: function () {
            return {
            };
        },
        blocks: [
        function doIt() {
			console.log("doIt: start spinner....");			
			doBlockingOperation();
            return PS.WAIT_FOR_CALLBACK;
        },
		function _catch (err) {
            console.log("_catch: err=" + err);
			return PS.NEXT;
		},
		function _finally () {
			console.log("_finally: stop spinner....");
			return PS.NEXT;
		}
		]
    });

Note that the block function `doIt` calls the undefined function `doBlockingOperation()` which causes a JavaScript error.  If you run 
this Proc like this:
	
	var p = new CatchFinallyProc({});
	p.run();

You will see this output:

	doIt: start spinner....
	
	...ProcScript Stack Trace...
	
	_catch: err=ReferenceError: doBlockingOperation is not defined
	_finally: stop spinner....


Loop Procs
----------------------

ProcScript supports four loop constructs:

1. For
2. ForEach 
3. While
4. Do...While

ProcScript implements loops with *Loop Procs*.  You define a loop Proc by specifying the loop properties in its config object. 


For loops
--------------------

If the config object you pass to `PS.defineProc` contains an `fnForLoop` property, you will define a `For` loop Proc.
Here is an example:

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
		}
		]
	});

ProcScript runs the For loop Proc as follows:

	1. Run the `init` function.
	2. Run `beforeIteration` 
		- If it returns true, run the entire Proc, then `afterIteration` and then go to step 2 again.
		- If it returns false, return to the Proc's caller.

This is equivalent to the following for loop in Java:

	public void forLoop (char[] arr)
	{
		for (int i=arr.length-1; i >=0; i -= 2)
		{
			System.out.println(arr[i]);
		}
	}

If you run ForLoopProc like this:	

	var p = new ForLoopProc({arr: ['a','b','c','d','e','f']});
	p.run();

You will see this output:

	f
	d
	b


ForEach loops
----------------------

If the config object you pass to `PS.defineProc` contains an `fnGetForEachArray` property, you will define a `ForEach` loop Proc.
Here is an example:

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
        }
		]
    });

The `fnGetForEachArray` property of the config object is a function that returns an array.  ProcScript calls this function once, at Proc 
startup time.  It then executes the Proc once for each member of the resulting array.  

The `ForEach' example above makes uses of the following loop support functions:

`Proc.getCurrentForEachItem()`			returns the current item in the `ForEach` array.

`Proc.getCurrentLoopIterationIndex()`	returns the current iteration count of the loop Proc *(zero-based)*.
	
`Proc.getCurrentForEachItem()` returns null if called from a Proc that is not a `ForEach` loop proc.  `Proc.getCurrentLoopIterationIndex()`
returns null if called from a non-loop Proc.

	
	
While loops
--------------------------

If the config object you pass to `PS.defineProc` contains an `fnWhileTest` property, you will define a `While` loop Proc.
Here is an example:

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
        },
		]
    });

The `fnWhileTest` property of the config object is a function that returns a boolean (true or false) value.  ProcScript calls 
the `fnWhileTest` function before executing the first block function in the Proc.  If it returns false, ProcScript returns to 
the caller.  If it returns true, ProcScript runs the Proc.  ProcScript repeats this process until the `fnWhileTest` function returns false.


Do...While loops
--------------------------

If the config object you pass to `PS.defineProc` contains an `fnDoWhileTest` property, you will define a `DoWhile` loop Proc.
Here is an example:

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
		}
		]
	});


The `fnDoWhileTest` property of the config object is a function that returns a boolean (true or false) value.  ProcScript calls 
the `fnDoWhileTest` function after executing the last block function in the Proc.  If it returns false, ProcScript returns to 
the caller.  If it returns true, ProcScript runs the Proc.  ProcScript repeats this process until the `fnDoWhileTest` function returns false.


Control Flow in loop Procs
------------------------------------------

In a loop Proc, the block function return value `PS.CONTINUE` works like the JavaScript `continue` statement.  ProcScript skips the 
remaining block functions and begins running the next iteration of the loop.  Likewise, the return value `PS.BREAK` works like the 
JavaScript `break` statement.  It causes ProcScript to immediately return to the loop Proc's caller without executing any more iterations of the 
Proc.  For example, if you define and run this loop Proc:


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
		}
		]
    });
	
	var p = new LoopControlsProc({input1: "LoopControlsProc", arr: [0,1,2,3,4]});
	p.run();
	
you will get this console output:

	LoopControlsProc: i=0
	LoopControlsProc: i=2



If a block function in a non-loop Proc returns `PS.CONTINUE` or `PS.BREAK`, ProcScript throws an error.

Catch-Finally in loop Procs
------------------------------------------

If a loop Proc has _catch or _finally block functions, ProcScript behaves as if they are outside the loop, not inside it.
The equivalent JavaScript code would look like this:

	try {
		while (bContinue) {
			..
		}
	} catch () {
	} finally {
	}

If you want behavior like this:

	while (bContinue) {
		try {
			...
		} catch () {
		} finally {
		}
	}

then put the _catch and _finally in an inner, non-loop Proc and call it from an outer loop Proc.


Procs can call other Procs
-----------------------------------

When the return value of a block function is a Proc instance, ProcScript runs that Proc Instance and passes its results to the next block function.  This 
allows you to chain Procs together into Proc call stacks just as you could chain regular JavaScript functions together into call stacks.

Here is a simple example:

    var ProcCallsProc = PS.defineProc({

        name: "ProcCallsProc",
        fnGetSignature: function () {
            return {};
        },
		fnWhileTest: function () { return true; },
        blocks: [
        function blockFunction1() {
			this.i = this.getCurrentLoopIterationIndex();
            return new MyFirstProc({input1: "Iteration " + this.i});
        },
        function blockFunction2() {
            if (this.i == 5) {
				return PS.BREAK;
			}
            return PS.NEXT;
        }
		]
    });

If you run `ProcCallsProc` like this:
	
	var pi = new ProcCallsProc({})
	pi.run();

It produces this console output:

	Iteration 0
	Iteration 1
	Iteration 2
	Iteration 3
	Iteration 4
	Iteration 5

Using this technique, you can create Proc call chains of any depth.  


Proc call stacks
--------------------

The first Proc in a call chain is called the root Proc.  When a root Proc runs, 
ProcScript allocates a virtual *thread* to maintain the call stack for the root Proc and any of its descendant (callee) Procs.

You can dump the call stack from any Proc in a thread with this function:

	Proc.callStackToString()
	
The stack dump looks like this:

	Proc Call Stack:
	 ProcScript Thread Id: 0, Created: Tue Jun 04 2013 14:05:05 GMT-0500 (Central Daylight Time)	 
	 MyFirstProc.blockFunction1
	 ProcCallsProc.blockFunction1

Each Proc in the call chain is listed, one per line, with the root Proc at the bottom.

Note that the Proc call stack starts with `ProcScript Thread Id: 0 Created ...`.  Once again, this is not an operating system thread 
but a *virtual* ProcScript thread.  

The Proc call stack contains the chain of Proc Instances that called each other leading up to the breakpoint or exception.  Each entry 
in the Proc call stack is of the form `Proc Name`.`Block Function Name`.  In the example above,
block function `blockFunction1` in Proc `ProcCallsProc` called Proc `MyFirstProc`.  The breakpoint or exception  
occured in the `blockFunction1` block function of `MyFirstProc`.


To get a dump of all active Proc call stacks, use this function:

	PS.threadsToString()

	
	
	 
What is a ProcScript-compliant blocking function?
---------------------------------------------------

A ProcScript-compliant blocking function is simply a blocking function that notifies a waiting Proc of its result by
calling `PS.callProcSuccessCallback` or `PS.callProcFailureCallback`.  Here is an example from the ProcScript demo app:
	
    // XHR.makeCorsRequest is a ProcScript-compliant blocking function.
    // This means that when it completes, 
    // XHR.makeCorsRequest calls the success or failure callback of its caller Proc as appropriate.

    XHR.makeCorsRequest = function (proc, method, url) {
        var xhr = XHR.createCORSRequest(method, url);
        if (!xhr) {
            throw new Error('[XHR.makeCorsRequest]  CORS not supported by your browser.')
        }

        // Response handlers.
        xhr.onload = function () {

            // Tell the waiting Proc that the blocking operation succeeded 
            // and pass an object containing the results of the operation.
            PS.callProcSuccessCallback(proc, xhr)
        };

        xhr.onerror = function () {

            // Tell the waiting Proc that the blocking operation failed 
            // and pass a descriptive error message.
            PS.callProcFailureCallback(proc, '[XHR.makeCorsRequest]  CORS request resulted in error.\n')
        };

        xhr.send();
    }

Note that `XHR.makeCorsRequest` takes a Proc instance (`proc`) as input and passes it as the first parameter to 
the `PS.callProcSuccessCallback` or `PS.callProcFailureCallback` functions.  

`PS.callProcSuccessCallback` signals to ProcScript that the blocking function completed successfully.  The second parameter 
to `PS.callProcSuccessCallback` contains the results of the blocking operation and ProcScript passes it to the next block function 
in the calling Proc.

`PS.callProcFailureCallback` signals to ProcScript that the blocking function failed.  The second parameter to `PS.callProcFailureCallback` 
is an error string detailing the reason for the failure.  ProcScript passes the error string to the _catch handler for the calling Proc or
propagates it up the call stack as described in the *_catch and _finally block functions* section.


Once you have defined a ProcScript-compliant blocking function, you can call it from a Proc's block function like this:

	function sendCorsRequest() {
		XHR.makeCorsRequest(this, httpMethod, url);
		return PS.WAIT_FOR_CALLBACK;
	}

Note that the block function that calls `XHR.makeCorsRequest` returns PS.WAIT_FOR_CALLBACK.  This tells ProcScript to wait for a callback from `XHR.makeCorsRequest`.
	
	
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
    
A ProcScript-compliant callback function uses these functions to callback to a waiting Proc instance.

	PS.callProcSuccessCallback(procInstance, resultObj)
	PS.callProcFailureCallback(procInstance, errorMessage)
		
These are the block function return values supported by ProcScript.

	PS.RETURN
    PS.NEXT
    PS.WAIT_FOR_CALLBACK
    PS.CONTINUE
    PS.BREAK

These functions add or remove ProcScript listeners.

    PS.addListener(eventType, callback)
    PS.removeListener(eventType, callback)

This function returns a string dump of all active ProcScript threads.

    PS.threadsToString()
	
These functions provide access ProcScript's code coverage statistics.

    PS.cloneProcRegistry()
    PS.codeCoverageToString()



PS.Proc API
-------------

`PS.Proc` is the prototype (base class) for all Proc definitions.  All Proc Instances are 
instances of `PS.Proc` and can access these functions:

	run()
run() runs the Proc Instance.
	
	getCurrentForEachItem()
For `ForEach` loop Procs, getCurrentForEachItem() gets the current array item being processed.

getCurrentForEachItem() returns null if the Proc instance is not a `ForEach` loop Proc.
	
	getCurrentLoopIterationIndex()
For loop Procs, getCurrentLoopIterationIndex() returns the zero-based loop iteration count.

getCurrentLoopIterationIndex() returns null if the Proc instance is not a loop Proc.

	callStackToString()
callStackToString() returns a string dump of the ProcScript thread for this Proc Instance.

	_procState 
All Proc Instances have a property named `_procState` that is reserved for use 
by ProcScript.  When defining Proc Locals on your Proc Instance, you may use
any name other than `_procState`.
		
		
		
	
A ProcScript Demo 
------------------------------

For a simple demonstration of how to use ProcScript, see the ProcScript demonstration app in the *demo* folder of this repository.  
The source code is brief and heavily commented.  Reading and running this example is a great way to quickly learn ProcScript.  



