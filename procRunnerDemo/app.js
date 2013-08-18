// The code for the ProcScript Proc Runner Demo app
var App = (function () {
    "use strict";

    var App = {};

    // This adapter Proc succeeds after sleeping for the specified number of milliseconds
    var SleepProc = PS.defineProc({

        name: "SleepProc",
        fnGetSignature: function () {
            return {
                milliseconds: ["number"]
            };
        },
        adapter: true,
        blocks: [
	    function sleep() {
	        var me = this;
	        function callback() {
	            PS.procSucceeded(me);
	        }

	        this.milliseconds = Math.max(this.milliseconds, 0);
	        setTimeout(callback, this.milliseconds);

	        return PS.WAIT_FOR_CALLBACK;
	    }
	    ]

    });

    // This Proc succeeds after the specified number of milliseconds,
    // unless it times out or is aborted first.
    var WorkerProc = PS.defineProc({

        name: "WorkerProc",
        fnGetSignature: function () {
            return {
                milliseconds: ["number"],
                workerPanel: [WorkerProcPanel]
            };
        },
        fnWhileTest: function () {
            if (!this.totalDelay) {
                this.totalDelay = 0;
            }
            return this.totalDelay < this.milliseconds;
        },
        blocks: [
	    function iterate() {
	        if (this.getCurrentLoopIterationIndex() === 0) {
	            // on the first loop iteration, do initialization
	            this.totalDelay = 0;
	            this.interval = Math.max(this.milliseconds / 60, 1);
	        }

	        this.totalDelay += this.interval;

	        var progressPct = Math.floor((this.totalDelay / this.milliseconds) * 100);
	        this.workerPanel.setProgressPct(progressPct);

	        return new SleepProc({ milliseconds: this.interval });
	    }
	    ]

    });

    // Builds the status message for the specified proc when it has finished.
    var fnGetFinishedMessage = function (proc) {
        var msg = "";
        if (proc.succeeded()) {
            var po = proc.getParameterObject(),
                msg = proc.getInstanceName() + " succeeded";

            if (proc instanceof PS.RaceProcRunner) {
                var arrProcs = po.procList.getArray(),
                    winnerProc = arrProcs[po.winnerIndex];
                msg += ", winner is " + winnerProc.getInstanceName();

            } else if (proc instanceof PS.FallbackProcRunner) {
                var arrProcs = po.procList.getArray(),
                    fallbackProc = arrProcs[po.fallbackIndex];
                msg += ", fallback is " + fallbackProc.getInstanceName();
            }

        } else {
            msg = proc.getInstanceName() + " failed";
            if (proc.aborted()) {
                msg = proc.getInstanceName() + " aborted";
            }
            if (proc.getTimeoutReason()) {
                msg += " (" + proc.getTimeoutReason() + ")";
            }
        }

        return msg;
    }

    var fnGetElementByClassName = function (container, className) {
        return container.getElementsByClassName(className)[0];
    }

    // Builds the status message for the specified proc and status
    var fnProcStatusChanged = function (proc, status) {
        var msg = "running...";
        if (status == PS.PROC_STATUS_FINISHED) {
            msg = fnGetFinishedMessage(proc);
        }
        proc.container.pnl.setStatus(msg);
    }

    // ProcRunnerPanel implements the UI for a Proc Runner panel
    function ProcRunnerPanel(parentPanel) {
        this.parentPanel = parentPanel;

        if (parentPanel) {
            var childPanels = parentPanel.getChildPanels();
            this.index = childPanels.length + 1;

        } else {
            this.index = 1;
        }

        this.dashed = parentPanel ?
            parentPanel.dashed + "-" + this.index :
            this.index.toString();
        this.id = "pr" + this.dashed;

        this.dotted = parentPanel ?
            parentPanel.dotted + "." + this.index :
            this.index.toString();
        this.title = "Runner " + this.dotted;

        this.operation = "";
        this.timeout = 0;
        this.status = "";

        this.childPanels = [];
    }

    ProcRunnerPanel.prototype.getRootContainer = function () {
        if (!this.rootContainer) {
            this.rootContainer = this._render();
            this.rootContainer.pnl = this;
        }
        return this.rootContainer;
    }

    ProcRunnerPanel.prototype.getChildrenContainer = function () {
        return fnGetElementByClassName(this.getRootContainer(), "proc-children");
    }
    ProcRunnerPanel.prototype.getOp = function () {
        var select = fnGetElementByClassName(this.getRootContainer(), "op");
        return select.value;
    }

    // This handles deletion of a ProcRunnerPanel
    // NOTE: the root ProcRunnerPanel cannot be deleted.
    ProcRunnerPanel.prototype.deletePanel = function () {
        var rootContainer = this.getRootContainer(),
            divChildren = rootContainer.parentNode,
            divRunner = divChildren.parentNode,
            parentPRP = divRunner.pnl;

        parentPRP.deleteChildPanel(this);
    }

    ProcRunnerPanel.prototype.clearForRun = function () {
        this.setStatus("");

        var childPanels = this.getChildPanels();
        for (var i = 0, ln = childPanels.length; i < ln; i++) {
            childPanels[i].clearForRun();
        }
    }

    ProcRunnerPanel.prototype.addWorker = function (pnl) {
        this.addChildPanel(new WorkerProcPanel(this));
    }
    ProcRunnerPanel.prototype.addRunner = function (pnl) {
        this.addChildPanel(new ProcRunnerPanel(this));
    }

    ProcRunnerPanel.prototype.addChildPanel = function (pnl) {
        this.childPanels.push(pnl);
        var childrenContainer = this.getChildrenContainer();
        childrenContainer.appendChild(pnl.getRootContainer());
    }

    ProcRunnerPanel.prototype.deleteChildPanel = function (pnl) {
        for (var i = 0, ln = this.childPanels.length; i < ln; i++) {
            if (this.childPanels[i] == pnl) {
                this.childPanels.splice(i, 1);
                break;
            }
        }
        var childrenContainer = this.getChildrenContainer();
        childrenContainer.removeChild(pnl.getRootContainer());
    }

    ProcRunnerPanel.prototype.getChildPanels = function (pnl) {
        return this.childPanels;
    }

    ProcRunnerPanel.prototype.getTimeout = function () {
        return fnGetElementByClassName(this.getRootContainer(), "timeout").value;
    }

    ProcRunnerPanel.prototype.setStatus = function (msg) {
        var status = fnGetElementByClassName(this.getRootContainer(), "status");
        status.innerText = msg;
    }

    ProcRunnerPanel.prototype._render = function () {
        var rootDiv = document.createElement("DIV");
        rootDiv.setAttribute("class", "proc-runner");
        rootDiv.setAttribute("id", this.id);

        var controlsDiv = document.createElement("DIV");
        controlsDiv.setAttribute("class", "proc-runner-controls");
        controlsDiv.setAttribute("id", this.id + "Controls");

        if (this.parentPanel) {
            var buttonDelete = document.createElement("BUTTON");
            buttonDelete.setAttribute("class", "delete");
            buttonDelete.setAttribute("onclick", "App.onProcDelete('" + this.id + "'); return false;");
            buttonDelete.appendChild(document.createTextNode("Delete"));
            controlsDiv.appendChild(buttonDelete);
        }

        var titleLabel = document.createElement("LABEL");
        titleLabel.setAttribute("class", "title");
        titleLabel.appendChild(document.createTextNode(this.title));
        controlsDiv.appendChild(titleLabel);

        var opLabel = document.createElement("LABEL");
        opLabel.appendChild(document.createTextNode("Operation"));
        controlsDiv.appendChild(opLabel);

        var opSelect = document.createElement("SELECT");
        opSelect.setAttribute("class", "op");

        var opSequence = document.createElement("OPTION");
        opSequence.setAttribute("value", "sequence");
        opSequence.appendChild(document.createTextNode("Sequence"));
        opSelect.appendChild(opSequence);

        var opParallel = document.createElement("OPTION");
        opParallel.setAttribute("value", "parallel");
        opParallel.appendChild(document.createTextNode("Parallel"));
        opSelect.appendChild(opParallel);

        var opRace = document.createElement("OPTION");
        opRace.setAttribute("value", "race");
        opRace.appendChild(document.createTextNode("Race"));
        opSelect.appendChild(opRace);

        var opFallback = document.createElement("OPTION");
        opFallback.setAttribute("value", "fallback");
        opFallback.appendChild(document.createTextNode("Fallback"));
        opSelect.appendChild(opFallback);

        controlsDiv.appendChild(opSelect);

        var timeoutLabel = document.createElement("LABEL");
        timeoutLabel.appendChild(document.createTextNode("Timeout"));
        controlsDiv.appendChild(timeoutLabel);

        var timeoutInput = document.createElement("INPUT");
        timeoutInput.setAttribute("class", "timeout");
        timeoutInput.setAttribute("value", "8000");
        controlsDiv.appendChild(timeoutInput);

        var abortButton = document.createElement("BUTTON");
        abortButton.setAttribute("class", "abort");
        abortButton.setAttribute("type", "button");
        abortButton.setAttribute("onclick", "App.onProcAbort('" + this.id + "'); return false;");
        abortButton.appendChild(document.createTextNode("Abort"));
        controlsDiv.appendChild(abortButton);

        var statusLabel = document.createElement("LABEL");
        statusLabel.setAttribute("class", "status");
        statusLabel.appendChild(document.createTextNode(""));
        controlsDiv.appendChild(statusLabel);

        rootDiv.appendChild(controlsDiv);

        var childrenDiv = document.createElement("DIV");
        childrenDiv.setAttribute("id", this.id + 'Children');
        childrenDiv.setAttribute("class", "proc-children");

        rootDiv.appendChild(childrenDiv);

        var pnls = this.getChildPanels();
        for (var i = 0, ln = pnls.length; i < ln; i++) {
            childrenDiv.appendChild(pnls[i].getRootContainer());
        }

        var commandsDiv = document.createElement("DIV");
        commandsDiv.setAttribute("id", this.id + "Commands");
        commandsDiv.setAttribute("class", "proc-child");

        var buttonAddWorker = document.createElement("BUTTON");
        buttonAddWorker.setAttribute("class", "addworker");
        buttonAddWorker.setAttribute("onclick", "App.onAddWorker('" + this.id + "'); return false;");
        buttonAddWorker.appendChild(document.createTextNode("Add Worker"));
        commandsDiv.appendChild(buttonAddWorker);

        var buttonAddRunner = document.createElement("BUTTON");
        buttonAddRunner.setAttribute("class", "addrunner");
        buttonAddRunner.setAttribute("onclick", "App.onAddRunner('" + this.id + "'); return false;");
        buttonAddRunner.appendChild(document.createTextNode("Add Runner"));
        commandsDiv.appendChild(buttonAddRunner);

        rootDiv.appendChild(commandsDiv);

        return rootDiv;
    }



    // WorkerProcPanel implements the UI for a Proc Runner panel
    function WorkerProcPanel(parentPanel) {
        var childPanels = parentPanel.getChildPanels();

        this.index = childPanels.length + 1;
        this.parentPanel = parentPanel;

        this.dashed = parentPanel ?
            parentPanel.dashed + "-" + this.index :
            this.index.toString();
        this.id = "childProc" + this.dashed;

        this.dotted = parentPanel ?
            parentPanel.dotted + "." + this.index :
            this.index.toString();
        this.title = "Worker " + this.dotted;

        this.progress = 0;
        this.duration = 0;
        this.timeout = 0;
        this.status = "";
    }

    WorkerProcPanel.prototype.getRootContainer = function () {
        if (!this.rootContainer) {
            this.rootContainer = this._render();
            this.rootContainer.pnl = this;
        }
        return this.rootContainer;
    }

    WorkerProcPanel.prototype.deletePanel = function () {
        // the user has chosen to delete a WorkerProcPanel
        var rootContainer = this.getRootContainer(),
            divChildren = rootContainer.parentNode,
            divRunner = divChildren.parentNode,
            parentPRP = divRunner.pnl;

        parentPRP.deleteChildPanel(this);
    }
    WorkerProcPanel.prototype.getDuration = function () {
        return fnGetElementByClassName(this.getRootContainer(), "duration").value;
    }
    WorkerProcPanel.prototype.getTimeout = function () {
        return fnGetElementByClassName(this.getRootContainer(), "timeout").value;
    }
    WorkerProcPanel.prototype.setProgressPct = function (progressPct) {
        var progressbarFill = fnGetElementByClassName(this.getRootContainer(), "progress-bar-fill");
        progressbarFill.style.width = progressPct + "%";
    }
    WorkerProcPanel.prototype.setStatus = function (msg) {
        var status = fnGetElementByClassName(this.getRootContainer(), "status");
        status.innerText = msg;
    }
    WorkerProcPanel.prototype.clearForRun = function () {
        this.setProgressPct(0);
        this.setStatus("");
    }

    WorkerProcPanel.prototype._render = function () {

        var rootDiv = document.createElement("DIV");
        rootDiv.setAttribute("id", this.id);
        rootDiv.setAttribute("class", "proc-child");

        sectionDiv = document.createElement("DIV");
        sectionDiv.setAttribute("class", "proc-control-section");
        var buttonDelete = document.createElement("BUTTON");
        buttonDelete.setAttribute("class", "delete");
        buttonDelete.setAttribute("onclick", "App.onProcDelete('" + this.id + "'); return false;");
        buttonDelete.appendChild(document.createTextNode("Delete"));
        sectionDiv.appendChild(buttonDelete);
        rootDiv.appendChild(sectionDiv);

        var sectionDiv = document.createElement("DIV");
        sectionDiv.setAttribute("class", "proc-control-section");
        var titleLabel = document.createElement("LABEL");
        titleLabel.setAttribute("class", "title");
        titleLabel.appendChild(document.createTextNode(this.title));
        sectionDiv.appendChild(titleLabel);
        rootDiv.appendChild(sectionDiv);

        sectionDiv = document.createElement("DIV");
        sectionDiv.setAttribute("class", "proc-control-section");
        var pbarDiv = document.createElement("DIV");
        pbarDiv.setAttribute("class", "progress-bar");
        var pbarFillDiv = document.createElement("DIV");
        pbarFillDiv.setAttribute("class", "progress-bar-fill");
        pbarDiv.appendChild(pbarFillDiv);
        sectionDiv.appendChild(pbarDiv);
        rootDiv.appendChild(sectionDiv);

        sectionDiv = document.createElement("DIV");
        sectionDiv.setAttribute("class", "proc-control-section");
        var durationLabel = document.createElement("LABEL");
        durationLabel.appendChild(document.createTextNode("Duration"));
        sectionDiv.appendChild(durationLabel);
        var durationInput = document.createElement("INPUT");
        durationInput.setAttribute("class", "duration");
        durationInput.setAttribute("value", "5000");
        sectionDiv.appendChild(durationInput);
        rootDiv.appendChild(sectionDiv);

        sectionDiv = document.createElement("DIV");
        sectionDiv.setAttribute("class", "proc-control-section");
        var timeoutLabel = document.createElement("LABEL");
        timeoutLabel.appendChild(document.createTextNode("Timeout"));
        sectionDiv.appendChild(timeoutLabel);
        var timeoutInput = document.createElement("INPUT");
        timeoutInput.setAttribute("class", "timeout");
        timeoutInput.setAttribute("value", "8000");
        sectionDiv.appendChild(timeoutInput);
        rootDiv.appendChild(sectionDiv);

        sectionDiv = document.createElement("DIV");
        sectionDiv.setAttribute("class", "proc-control-section");
        var buttonAbort = document.createElement("BUTTON");
        buttonAbort.setAttribute("class", "abort");
        buttonAbort.setAttribute("onclick", "App.onProcAbort('" + this.id + "'); return false;");
        buttonAbort.appendChild(document.createTextNode("Abort"));
        sectionDiv.appendChild(buttonAbort);
        var statusLabel = document.createElement("LABEL");
        statusLabel.setAttribute("class", "status");
        statusLabel.appendChild(document.createTextNode(""));
        sectionDiv.appendChild(statusLabel);
        rootDiv.appendChild(sectionDiv);

        return rootDiv;
    }


    var rootRunnerPanel = null;

    var onProcException = function (err, errorMessage) {

        PS._log("[onProcException]");
        PS._log("err=" + err);

        PS._log("errorMessage:");
        PS._log(errorMessage);
    }

    App.onLoad = function () {
        // To get a callback from ProcScript when a Proc failure happens,
        // register as a 'procException' listener.
        PS.addListener('procException', onProcException);

        rootRunnerPanel = new ProcRunnerPanel(null);

        var divContent = document.getElementById("content");
        divContent.appendChild(rootRunnerPanel.getRootContainer());
    }


    function createProcsForRunnerPanel(prp) {

        var op = prp.getOp(),
            pnls = prp.getChildPanels(),
            arrProcs = [];

        prp.clearForRun();

        if (pnls.length == 0) {
            alert(prp.title + ' has no procs.');
            return null;
        }

        for (var i = 0, ln = pnls.length; i < ln; i++) {
            var pp = pnls[i],
                proc = null;

            if (pp instanceof ProcRunnerPanel) {
                proc = createProcsForRunnerPanel(pp);

            } else {
                proc = new WorkerProc({
                    milliseconds: parseInt(pp.getDuration(), 10),
                    workerPanel: pp
                })
                proc.setInstanceName(pp.title);
                proc.setTimeout(parseInt(pp.getTimeout(), 10));
                proc.addStatusChangedListener(fnProcStatusChanged);

                proc.container = pp.getRootContainer();
                proc.container.proc = proc;
            }

            arrProcs.push(proc);
        }


        var proclist = new PS.ProcList(arrProcs),
            procRunner = null;
        switch (op) {
            case "fallback":
                procRunner = new PS.FallbackProcRunner({
                    procList: proclist
                });
                break;
            case "parallel":
                procRunner = new PS.ParallelProcRunner({
                    procList: proclist
                });
                break;
            case "sequence":
                procRunner = new PS.SequenceProcRunner({
                    procList: proclist
                });
                break;
            case "race":
                procRunner = new PS.RaceProcRunner({
                    procList: proclist
                });
                break;
        }
        procRunner.setInstanceName(prp.title);

        procRunner.container = prp.getRootContainer();
        procRunner.container.proc = procRunner;

        procRunner.setTimeout(parseInt(prp.getTimeout(), 10));
        procRunner.addStatusChangedListener(fnProcStatusChanged);

        return procRunner;
    }

    App.onRunDemo = function () {
        var procRunner = createProcsForRunnerPanel(rootRunnerPanel);
        if (procRunner) {
            procRunner.run();
        }
    }

    App.onAddWorker = function (containerId) {
        var container = document.getElementById(containerId);
        container.pnl.addWorker();
    }
    App.onAddRunner = function (containerId) {
        var container = document.getElementById(containerId);
        container.pnl.addRunner();
    }
    App.onProcDelete = function (containerId) {
        var container = document.getElementById(containerId);
        container.pnl.deletePanel();
    }

    App.onProcAbort = function (containerId) {
        var container = document.getElementById(containerId);
        if (!container.proc) {
            alert("This proc is not running yet.");
            return;
        }
        container.proc.abort();
    }

    return App;
} ());
