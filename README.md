ProcScript
================================

A framework that makes it easier to do large-scale JavaScript development.


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

To overcome these JavaScript problems, I developed ProcScript.  ProcScript adds type checking and synchronous programming support to JavasScript.


ProcScript Features
-------------------------

* Type Checks Input and Output Parameters
* Makes Synchronous Programming Easier
* Pure JavaScript: No Compilers or Preprocessors
* Great Debugging Support
* Maintains Code Coverage Statistics


Procs
-------

The ProcScript framework allows you to define and run Procs.  A Proc is like an enhanced 
JavaScript function with type-checked input and output parameters and  synchronous programming support.  A Proc has the following properties:

* Name:  The unique name of the Proc.
* Signature:  An object literal that defines the input and output parameters of the Proc.
* Blocks:  The code of the Proc, specified as an array of one or more JavaScript functions.  
  ProcScript executes these functions in the order they are listed.
  
  
My First Proc
--------------

When you include *ps.js* in your web app, you gain access to the ProcScript global
variable (`PS`).  `PS.defineProc()` takes an object literal with properties that define a Proc.  

`name` gives the unique name of the Proc.

`fnGetSignature` returns an object identifying the Proc's input and output parameters.  

`blocks` defines the code of the Proc as an array of functions.

For example, the following example defines a simple Proc called "myFirstProc":

    var myFirstProc = PS.defineProc({

        name: "myFirstProc",
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
            var rv = this._procState.rv;
            rv.output1 = [ "Hello World!" ];
            return PS.NEXT;
        },
		]
    });


The Proc named *myFirstProc* takes one string input (`input1`) and produces one Array output (`output1`).  
It has two blocks of code: the first block writes the value of the `input1` to the console 
and the second block sets the value of `output1` to "Hello World!".


The call to `PS.defineProc()` registers *myFirstProc* with the ProcScript framework and returns a reference 
to its constructor function.  You can use the constructor function to create and run instances of the Proc:

	var procInstance = new myFirstProc({input1: "Hi Mom!"});
	procInstance.run();


ProcScript enforces the signature
------------------------------------
Notice that the `myFirstProc` constructor function takes an object literal as input.  This object literal is called 
the parameter object and it must provide values for each of the Proc's input parameters.  Before running a Proc, 
ProcScript checks that the parameter object contains a value of the right type for each of the Proc's input parameters.  

Likewise, before returning from the Proc to its caller, ProcScript checks that the Proc's return value contains a value 
of the right type for each of the Proc's output parameters.

	
How should I write block functions?
-------------------------------------------

Each block function must return one of four possible values.  The return value tells ProcScript what to do next:

`PS.NEXT`  Run the next block function.

`PS.RETURN`  Return to the caller of this Proc.

`<Proc Instance>`  Run this Proc and pass its results to the next block function. 

`PS.WAIT_FOR_CALLBACK`  Wait for a callback from a ProcScript-compliant blocking function and pass its results to the next block function.


ProcScript Debugging
------------------------------------------

Incomplete or confusing error messages are frustrating and waste the valuable development time.  If an exception occurs or 
a developer uses ProcScript incorrectly, the framework makes every effort to provide complete and helpful error messages.  

ProcScript maintains its own call stack for each Proc call chain.  If an unhandled exception occurs in a Proc's block function, 
ProcScript writes detailed information to the console including the Proc call stack as well as the JavaScript call stack.  
Here is an example from the ProcScript demonstration app:

	[onProcException] index.html:14
	err=Error: [App.initDbProc]  simulated exception in 'createTablesIfNecessary' block function index.html:15
	errorMessage: index.html:17
	Unhandled exception in App.initDbProc.createTablesIfNecessary
	Javascript Error object:
	 Error.message=[App.initDbProc]  simulated exception in 'createTablesIfNecessary' block function
	 Error.stack=Error: [App.initDbProc]  simulated exception in 'createTablesIfNecessary' block function
		at createTablesIfNecessary (http://localhost/auditmaticmgr.ui/ps/app.js:125:19)
		at procDispatch (http://localhost/auditmaticmgr.ui/ps/app/utility/ps.js:1043:27)
		at MessagePort.channel.port1.onmessage (http://localhost/auditmaticmgr.ui/ps/app/utility/ps.js:86:13)

	ProcScript Call Stack:
	 Thread Id: 0, Created: Mon Jun 03 2013 14:27:33 GMT-0500 (Central Daylight Time)
	 App.initDbProc.createTablesIfNecessary
	 App.corsTest.isDbPopulated
	 
	 

The JavaScript stack trace is listed under the heading `JavaScript Error Object:`. 
The debugging tools in many browsers allow you to click on any line in the JavaScript stack trace to go straight 
to the associated line in the JavaScript source.

The Proc call stack is listed under the heading `ProcScript Call Stack:`.  
This call stack contains the chain of Proc Instances that called each other leading up to the exception.  

The combination of JavaScript and ProcScript call stacks is very helpful in debugging web applications.


Code Coverage Statistics
---------------------------

Documentation of the code coverage statistics that ProcScript keeps and how best to use them is coming soon.


A more realistic example
------------------------------

For a more realistic example of how to use ProcScript, see the ProcScript demonstration app.  You can find it 
in the *demo* folder in this repository.  The source code is brief and heavily commented.  Reading and running
this example is a great way to quickly learn ProcScript.  



