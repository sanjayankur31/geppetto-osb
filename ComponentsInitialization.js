define(function(require) {

    var cellControlPanel = require('./osbCellControlPanel.json');
    var networkControlPanel = require('./osbNetworkControlPanel.json');
    var osbTutorial = require('./osbTutorial.json');
    var colorbar = require('./colorbar');
    var d3 = require('d3');

    return function(GEPPETTO) {
        G.enableLocalStorage(true);

        var link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = "geppetto/extensions/geppetto-osb/css/OSB.css";
        document.getElementsByTagName("head")[0].appendChild(link);

        //Loading spinner initialization
        GEPPETTO.Spinner.setLogo("gpt-osb");
        
		//Canvas initialisation
		GEPPETTO.ComponentFactory.addComponent('CANVAS', {}, document.getElementById("sim"), function () {
            this.displayAllInstances();
        });

        //This function will be called when the run button is clicked
        GEPPETTO.showExecutionDialog = function(callback) {
            var formCallback = callback;

            var formId = "gptForm";

            var formName = "Run experiment";

            var schema = {
                type: "object",
                required: ["experimentName", "timeStep", "length", "simulator", "numberProcessors"],
                properties: {
                    experimentName: {
                        type: "string",
                        title: "Experiment Name"
                    },
                    timeStep: {
                        type: 'number',
                        title: 'Time Step (s)'
                    },
                    length: {
                        type: 'number',
                        title: 'Length (s)'
                    },
                    simulator: {
                        type: "string",
                        title: "Simulator",
                        enum: ["neuronSimulator", "lemsSimulator", "neuronNSGSimulator"],
                        enumNames: ["Neuron", "jLems", "Neuron on NSG"]
                    },
                    numberProcessors: {
                        type: 'number',
                        title: 'Number of Processors'
                    }
                }
            };

            var formData = {
                experimentName: Project.getActiveExperiment().getName(),
                numberProcessors: 1
            };

            // figure out aspect configuration path ref
            var pathRef = null;
            if(Project.getActiveExperiment().simulatorConfigurations[window.Instances[0].getId()] != undefined){
                pathRef = window.Instances[0].getId();
            } else if (Project.getActiveExperiment().simulatorConfigurations[window.Instances[0].getInstancePath(true)] != undefined) {
                pathRef = window.Instances[0].getInstancePath(true);
            }

            if (pathRef != null) {
                formData['timeStep'] = Project.getActiveExperiment().simulatorConfigurations[pathRef].getTimeStep();
                formData['length'] = Project.getActiveExperiment().simulatorConfigurations[pathRef].getLength();
                formData['simulator'] = Project.getActiveExperiment().simulatorConfigurations[pathRef].getSimulator();
            }

            var submitHandler = function() {
                GEPPETTO.Flows.showSpotlightForRun(formCallback);
                formWidget.destroy();
                $("#gptForm").remove()
            };

            var errorHandler = function() {

            };

            var changeHandler = function(formObject) {
                for (var key in formObject.formData) {
                    if (formObject.formData[key] != this.formData[key]) {
                        if (key == 'experimentName') {
                            $("#experimentsOutput").find(".activeExperiment").find("td[name='name']").html(formObject.formData[key]).blur();
                        } else if (key == 'timeStep') {
                            $("#experimentsOutput").find(".activeExperiment").find("td[name='timeStep']").html(formObject.formData[key]).blur();
                        } else if (key == 'length') {
                            $("#experimentsOutput").find(".activeExperiment").find("td[name='length']").html(formObject.formData[key]).blur();
                        } else if (key == 'numberProcessors') {
                            Project.getActiveExperiment().simulatorConfigurations[window.Instances[0].getId()].setSimulatorParameter('numberProcessors', formObject.formData[key]);
                        } else if (key == 'simulator') {
                            $("#experimentsOutput").find(".activeExperiment").find("td[name='simulatorId']").html(formObject.formData[key]).blur();
                        }
                        this.formData[key] = formObject.formData[key];
                    }
                }
            };

            var formWidget = null;

            GEPPETTO.ComponentFactory.addWidget('FORM', {
                id: formId,
                name: formName,
                schema: schema,
                formData: formData,
                submitHandler: submitHandler,
                errorHandler: errorHandler,
                changeHandler: changeHandler
            }, function() {
                formWidget = this;
                this.setName(formName);
            });
        };

        // Brings up the add protocol dialog
        GEPPETTO.showAddProtocolDialog = function(callback) {
            var formWidget = null;

            var formId = "addProtocolForm";

            var formName = "Add & Run Protocol";

            var schema = {
                type: "object",
                required: [
                    "protocolName",
                    "pulseStart",
                    "pulseStop",
                    "ampStart",
                    "ampStop",
                    "timeStep",
                    "simDuration"
                ],
                properties: {
                    protocolName: {
                        type: "string",
                        title: "Protocol Name"
                    },
                    pulseStart: {
                        type: "number",
                        title: "Pulse Start (ms)"
                    },
                    pulseStop: {
                        type: "number",
                        title: "Pulse Stop (ms)"
                    },
                    ampStart: {
                        type: "number",
                        title: "Amplitude Start (nA)"
                    },
                    ampStop: {
                        type: "number",
                        title: "Amplitude Stop (nA)"
                    },
                    timeStep: {
                        type: 'number',
                        title: 'Time Step (ms)'
                    },
                    simDuration: {
                        type: "number",
                        title: "Sim duration (ms)"
                    }
                }
            };

            var formData = {
                protocolName: 'Name your protocol',
                pulseStart: 50,
                pulseStop: 550,
                ampStart: -0.1,
                ampStop: 0.3,
                timeStep: 0.02,
                simDuration: 600
            };

            var submitHandler = function(data) {
                var formData = data.formData;

                var experimentNamePattern = "[P] " + formData.protocolName + " - ";

                function experimentCompleteHandler(){
                    var protocolExperimentsMap = window.getProtocolExperimentsMap();

                    var protocolExperiments = [];
                    for(var protocol in protocolExperimentsMap){
                        // When an experiment is completed check if all experiments for this protocol are completed
                        if(protocol == formData.protocolName){
                            protocolExperiments = protocolExperimentsMap[protocol];
                        }
                    }

                    var allCompleted = true;
                    for(var i=0; i<protocolExperiments.length; i++){
                        if(protocolExperiments[i].status != "COMPLETED"){
                            allCompleted = false;
                            break;
                        }
                    }

                    if(allCompleted){
                        window.showProtocolSummary();
                        GEPPETTO.off(GEPPETTO.Events.Experiment_completed, experimentCompleteHandler);
                    }
                }

                // what does it do when the button is pressed
                GEPPETTO.on(GEPPETTO.Events.Experiment_completed, experimentCompleteHandler);

                // build list of paths for variables to watch
                var watchedVars = [];
                if(Project.getActiveExperiment() != undefined){
                    watchedVars = Project.getActiveExperiment().getWatchedVariables();
                }
                // concat default paths
                var defaultVars = GEPPETTO.ModelFactory.getAllPotentialInstancesEndingWith('.v');
                for(var v=0; v<defaultVars.length; v++){
                    if(!watchedVars.includes(defaultVars[v])){
                        watchedVars.push(defaultVars[v]);
                    }
                }

                // loop based on amplitude delta / timestep
                var experimentsNo = (formData.ampStop - formData.ampStart)/formData.timeStep;
                var experimentsData = [];
                for(var i=0; i<experimentsNo; i++){
                    // build parameters map
                    var amplitude = (formData.ampStart + formData.timeStep*i).toFixed(2)/1;
                    var parameterMap = {
                        i: {'neuroml.pulseGen1.amplitude': amplitude},
                        pulseStart: {'neuroml.pulseGen1.delay': formData.pulseStart},
                        pulseDuration: {'neuroml.pulseGen1.duration': formData.pulseStop-formData.pulseStart}
                    };
                    
                    
                    var simpleModelParametersMap = {};
                    // build experiment name based on parameters map
                    var experimentName = experimentNamePattern;
                    for(var label in parameterMap){
                        experimentName += label+"=";
                        for(var p in parameterMap[label]){
                            experimentName += parameterMap[label][p]+",";
                            simpleModelParametersMap[p]=parameterMap[label][p];
                        }
                    }

                    // keep only the first parameter in te experiment name to avoid making it too long
                    experimentName = experimentName.slice(0, experimentName.indexOf(','));

                    experimentsData.push({
                    	name : experimentName,
                    	modelParameters: simpleModelParametersMap,
                        watchedVariables: watchedVars,
                        timeStep: formData.timeStep/1000,
                        duration: formData.simDuration/1000,
                        simulator: 'neuronSimulator',
                        aspectPath: Instances[0].getInstancePath(true),
                        simulatorParameters: {
                            target: Instances[0].getType().getId()
                        }
                    });
                }

                var runExperiments = function(){
                    GEPPETTO.trigger('stop_spin_logo');
                    GEPPETTO.ModalFactory.infoDialog("Protocol created", "Your protocol has been created and is now running. Open the experiments table to check on progress.");

                    // retrieve all protocol experiments and run them all
                    var exps = Project.getExperiments();
                    for(var e=0; e<exps.length; e++){
                        // check if the experiment name starts with the correct pattern
                        if(exps[e].getName().indexOf(experimentNamePattern) == 0){
                            // it's part of the protocol, run it
                            exps[e].run();
                        }
                    }
                };

                GEPPETTO.trigger('spin_logo');
                Project.newExperimentBatch(experimentsData, runExperiments);

                // close widget
                formWidget.destroy();
            };

            var errorHandler = function() {
                // error handling
            };

            var changeHandler = function(formObject) {
                // handle any changes on form data
            };

            GEPPETTO.ComponentFactory.addWidget('FORM', {
                id: formId,
                name: formName,
                schema: schema,
                formData: formData,
                submitHandler: submitHandler,
                errorHandler: errorHandler,
                changeHandler: changeHandler
            }, function() {
                formWidget = this;
                this.setName(formName);
            });
        };

        //Function to add a dialog when run button is pressed
        GEPPETTO.Flows.addCompulsoryAction('GEPPETTO.showExecutionDialog', GEPPETTO.Resources.RUN_FLOW);

        //Logo initialization 
        GEPPETTO.ComponentFactory.addComponent('LOGO', {
            logo: 'gpt-osb'
        }, document.getElementById("geppettologo"));

        //Tutorial component initialization
        GEPPETTO.ComponentFactory.addWidget('TUTORIAL', {
            name: 'Open Source Brain Tutorial',
            tutorialData: osbTutorial
        });

        var eventHandler = function(component){
		};

		var clickHandler = function(){
			GEPPETTO.Console.executeCommand("Project.download();");
		};
		
		GEPPETTO.on(GEPPETTO.Events.Project_downloaded,function(){
			GEPPETTO.ModalFactory.infoDialog("Project donwloaded", "Your project has been downloaded. You can unzip your donwloaded project in your OSB repository for it to be available to everyone.");
		})

		var configuration = {
				id: "DownloadProjectButton",
				onClick : clickHandler,
				eventHandler : eventHandler,
				tooltipPosition : { my: "right center", at : "left-5 center"},
				tooltipLabel : "Download your current project",
				icon : "fa fa-download",
				className : "btn DownloadProjectButton pull-right",
				disabled : false,
				hidden : false
		};

		//Download Project Button initialization
		GEPPETTO.ComponentFactory.addComponent('BUTTON', {configuration: configuration}, document.getElementById("DownloadProjectButton"));
		

        //Save initialization 
        GEPPETTO.ComponentFactory.addComponent('SAVECONTROL', {}, document.getElementById("SaveButton"));

        var toggleClickHandler = function() {
            if (!window.Project.isPublic()) {
                var title = "Your project is now public. This is its URL for you to share!";
                var url = window.osbURL + "?explorer_id="+Project.getId();
                GEPPETTO.ModalFactory.infoDialog(title, url);
            }
        };

        var toggleEventHandler = function(component) {
            GEPPETTO.on(GEPPETTO.Events.Project_loaded, function() {
                component.evaluateState();
            });

            GEPPETTO.on(GEPPETTO.Events.Project_made_public, function() {
                component.evaluateState();
                component.showToolTip();
            });
        };

        var configuration = {
            id: "PublicProjectButton",
            disableCondition: "window.Project.isReadOnly()",
            clickHandler: toggleClickHandler,
            eventHandler: toggleEventHandler,
            tooltipPosition: { my: "right center", at: "left-10 center" },
            condition: "window.Project.isPublic()",
            "false": {
                "action": "window.Project.makePublic(true)",
                "icon": "fa fa-share-alt",
                "label": "",
                "tooltip": "This project is private, click to make it public."
            },
            "true": {
                "action": "window.Project.makePublic(false)",
                "icon": "fa fa-share-alt",
                "label": "",
                "tooltip": "This project is public, click to make it private."
            }
        };

        GEPPETTO.ComponentFactory.addComponent('TOGGLEBUTTON', { configuration: configuration }, document.getElementById("PublicProject"));

        //Control panel initialization
        GEPPETTO.ComponentFactory.addComponent('CONTROLPANEL', {
                useBuiltInFilters: true,
                listenToInstanceCreationEvents: false,
                enablePagination: true,
                resultsPerPage: 10
            }, document.getElementById("controlpanel"),
            function() {
                // whatever gets passed we keep
                var passThroughDataFilter = function(entities) {
                    return entities;
                };

                // set data filter
                GEPPETTO.ControlPanel.setDataFilter(passThroughDataFilter);
            });

        GEPPETTO.on(GEPPETTO.Events.Model_loaded, function() {
            var addCaSuggestion = function() {
                var caSpecies = GEPPETTO.ModelFactory.getAllPotentialInstancesEndingWith('.intracellularProperties.ca');
                if (caSpecies.length > 0) {
                    var recordCaConc = {
                        "label": "Record Ca2+ concentrations",
                        // essentially we watch caConc on any population that has intracellularProperties.ca
                        "actions": ["var caSpecies = GEPPETTO.ModelFactory.getAllPotentialInstancesEndingWith('.intracellularProperties.ca'); var populationCaConcPaths = []; for (var i=0; i<caSpecies.length; ++i) { populationCaConcPaths.push(caSpecies[i].split('.').slice(0,2).concat('caConc').join('.')); } GEPPETTO.ExperimentsController.watchVariables(Instances.getInstance(populationCaConcPaths),true);"],
                        "icon": "fa-dot-circle-o"
                    };
                    GEPPETTO.Spotlight.addSuggestion(recordCaConc, GEPPETTO.Resources.RUN_FLOW);
                }
            };

            if (GEPPETTO.Spotlight == undefined) {
                GEPPETTO.on(GEPPETTO.Events.Spotlight_loaded, addCaSuggestion);
            } else {
                addCaSuggestion();
            }
        });

        GEPPETTO.ComponentFactory.addComponent('SPOTLIGHT', {}, document.getElementById("spotlight"), function() {
            	var recordAll = {
                    "label": "Record all membrane potentials",
                    "actions": [
                        "var instances=Instances.getInstance(GEPPETTO.ModelFactory.getAllPotentialInstancesEndingWith('.v'));",
                        "GEPPETTO.ExperimentsController.watchVariables(instances,true);"
                    ],
                    "icon": "fa-dot-circle-o"
                };
            	
            	var recordSoma = {
            	        "label": "Record all membrane potentials at soma",
            	        "actions": [
                            "var instances=window.getSomaVariableInstances('v');",
            	            "GEPPETTO.ExperimentsController.watchVariables(instances,true);"
            	        ],
            	        "icon": "fa-dot-circle-o"
            	    };
            	
            	var lightUpSample = {
                    "label": "Link morphology colour to recorded membrane potentials",
                    "actions": [
                        "GEPPETTO.SceneController.addColorFunction(GEPPETTO.ModelFactory.instances.getInstance(GEPPETTO.ModelFactory.getAllPotentialInstancesEndingWith('.v'),false), window.voltage_color);"
                    ],
                    "icon": "fa-lightbulb-o"
                };
                
            	GEPPETTO.Spotlight.addSuggestion(recordSoma, GEPPETTO.Resources.RUN_FLOW);
            	GEPPETTO.Spotlight.addSuggestion(recordAll, GEPPETTO.Resources.RUN_FLOW);
            	GEPPETTO.Spotlight.addSuggestion(lightUpSample, GEPPETTO.Resources.PLAY_FLOW);
            	GEPPETTO.Spotlight.addSuggestion(GEPPETTO.Spotlight.plotSample, GEPPETTO.Resources.PLAY_FLOW);
        });

        window.getRecordedMembranePotentials = function() {
            var instances = Project.getActiveExperiment().getWatchedVariables(true, false);
            var v = [];
            for (var i = 0; i < instances.length; i++) {
                if (instances[i].getInstancePath().endsWith(".v")) {
                    v.push(instances[i]);
                }
            }
            return v;
        };

        var resultsConfiguration = {
            id: "controlsMenuButton",
            openByDefault: false,
            closeOnClick: false,
            label: ' Results',
            iconOn: 'fa fa-caret-square-o-up',
            iconOff: 'fa fa-caret-square-o-down',
            menuPosition: {
                top: 40,
                right: 550
            },
            menuSize: {
                height: "auto",
                width: "auto"
            },
            menuItems: [{
                label: "Plot all recorded variables",
                action: "window.plotAllRecordedVariables();",
                value: "plot_recorded_variables"
            }, {
                label: "Play step by step",
                action: "Project.getActiveExperiment().play({step:1});",
                value: "play_speed_1"
            }, {
                label: "Play step by step (10x)",
                action: "Project.getActiveExperiment().play({step:10});",
                value: "play_speed_10"
            }, {
                label: "Play step by step (100x)",
                action: "Project.getActiveExperiment().play({step:100});",
                value: "play_speed_100"
            }, {
                label: "Show simulation time",
                action: "G.addWidget(5).setName('Simulation time').setVariable(time);",
                value: "simulation_time"
            }, {
                label: "Apply voltage colouring to morphologies",
                radio: true,
                condition: "window.controlsMenuButton.refs.dropDown.refs.apply_voltage.state.icon != 'fa fa-circle-o'",
                value: "apply_voltage",
                false: {
                    // not selected
                    action: "GEPPETTO.SceneController.addColorFunction(window.getRecordedMembranePotentials(), window.voltage_color);" +
                        "window.setupColorbar(window.getRecordedMembranePotentials(), window.voltage_color, false, 'Voltage color scale', 'Membrane Potential (V)');"
                },
                true: {
                    // is selected
                    action: "GEPPETTO.SceneController.removeColorFunction(GEPPETTO.SceneController.getColorFunctionInstances());"
                }
            }, {
                label: "Apply soma voltage colouring to entire cell",
                radio: true,
                condition: "window.controlsMenuButton.refs.dropDown.refs.apply_voltage_entire_cell.state.icon != 'fa fa-circle-o'",
                value: "apply_voltage_entire_cell",
                false: {
                    // not selected
                    action: "GEPPETTO.SceneController.removeColorFunction(GEPPETTO.SceneController.getColorFunctionInstances());" +
                        "window.soma_v_entire_cell();" +
                        "window.setupColorbar(window.getRecordedMembranePotentials(), window.voltage_color, false, 'Voltage color scale', 'Electric Potential (V)');"
                },
                true: {
                    // is selected
                    action: "GEPPETTO.SceneController.removeColorFunction(GEPPETTO.SceneController.getColorFunctionInstances());"
                }
            }, {
                label: "Show protocol summary",
                action: "window.showProtocolSummary();",
                value: "show_protocol_summary"
            }]
        };

        //Home button initialization
         GEPPETTO.ComponentFactory.addComponent('MENUBUTTON', {
                configuration: resultsConfiguration
        }, document.getElementById("ControlsMenuButton"), function(){window.controlsMenuButton = this;});

        //Foreground initialization
        GEPPETTO.ComponentFactory.addComponent('FOREGROUND', {}, document.getElementById("foreground-toolbar"));

        //Experiments table initialization
        GEPPETTO.ComponentFactory.addComponent('EXPERIMENTSTABLE', {}, document.getElementById("experiments"));

        //Home button initialization
        GEPPETTO.ComponentFactory.addComponent('HOME', {}, document.getElementById("HomeButton"));

        //Simulation controls initialization
        var runConfiguration = {
            id: "runMenuButton",
            openByDefault: false,
            closeOnClick: true,
            label: ' Run',
            iconOn: 'fa fa-cogs',
            iconOff: 'fa fa-cogs',
            disableable: false,
            menuPosition: {
                top: 40,
                right: 450
            },
            menuSize: {
                height: "auto",
                width: "auto"
            },
            menuItems: [{
                label: "Run active experiment",
                action: "GEPPETTO.Flows.onRun('Project.getActiveExperiment().run();');",
                value: "run_experiment",
                disabled: "cascade"
            }, {
                label: "Add & run protocol",
                action: "GEPPETTO.showAddProtocolDialog();",
                value: "add_protocol"
            }]
        };
        GEPPETTO.ComponentFactory.addComponent('SIMULATIONCONTROLS', {runConfiguration: runConfiguration}, document.getElementById("sim-toolbar"));

        //OSB Geppetto events handling
        GEPPETTO.on(GEPPETTO.Events.Model_loaded, function() {
            var addCaSuggestion = function() {
                var caSpecies = GEPPETTO.ModelFactory.getAllPotentialInstancesEndingWith('.caConc');
                if (caSpecies.length > 0) {
                    var caSuggestion = {
                        "label": "Record Ca2+ concentrations",
                        "actions": ["var instances=Instances.getInstance(GEPPETTO.ModelFactory.getAllPotentialInstancesEndingWith('.caConc'));",
                                    "GEPPETTO.ExperimentsController.watchVariables(instances,true);"],
                        "icon": "fa-dot-circle-o"
                    };
                    var caSomaSuggestion = {
                        "label": "Record Ca2+ concentrations at soma",
                        "actions": ["var instances=window.getSomaVariableInstances('caConc')",
                                    "GEPPETTO.ExperimentsController.watchVariables(instances,true);"],
                        "icon": "fa-dot-circle-o"
                    };

                    var caMenuItem = {
                        label: "Apply Ca2+ concentration colouring to morphologies",
                        radio: true,
                        condition: "window.controlsMenuButton.refs.dropDown.refs.apply_ca.state.icon != 'fa fa-circle-o'",
                        value: "apply_ca",
                        false: {
                            // not selected
                            action: "GEPPETTO.SceneController.removeColorFunction(GEPPETTO.SceneController.getColorFunctionInstances());" +
                                "GEPPETTO.SceneController.addColorFunction(window.getRecordedMembranePotentials(), window.ca_color());" +
                                "window.setupColorbar(window.getRecordedCaConcs(), window.ca_color, true, 'Ca2+ color scale', 'Amount of substance (mol/m³)');"
                        },
                        true: {
                            // is selected
                            action: "GEPPETTO.SceneController.removeColorFunction(GEPPETTO.SceneController.getColorFunctionInstances());"
                        }
                    };

                    window.controlsMenuButton.addMenuItem(caMenuItem);
                    GEPPETTO.Spotlight.addSuggestion(caSuggestion, GEPPETTO.Resources.RUN_FLOW);
                    GEPPETTO.Spotlight.addSuggestion(caSomaSuggestion, GEPPETTO.Resources.RUN_FLOW);
                }
            };

            if (GEPPETTO.Spotlight == undefined || window.controlsMenuButton == undefined) {
                GEPPETTO.on(GEPPETTO.Events.Spotlight_loaded, addCaSuggestion);
            } else {
                addCaSuggestion();
            }
        });

        GEPPETTO.on(GEPPETTO.Events.Model_loaded, function() {
            if (Model.neuroml != undefined && Model.neuroml.importTypes != undefined && Model.neuroml.importTypes.length > 0) {
                $('#mainContainer').append('<div class="alert alert-warning osb-notification alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><span class="osb-notification-text">' + Model.neuroml.importTypes.length + ' projections in this model have not been loaded yet. <a href="javascript:loadConnections();" class="alert-link">Click here to load the connections.</a> (Note: depending on the size of the network this could take some time).</span></div>');
            }
        });

        GEPPETTO.on(GEPPETTO.Events.Project_loading, function() {
            $('.osb-notification').remove();
        });

        GEPPETTO.on(GEPPETTO.Events.Experiment_loaded, function() {
            // reset control panel with defaults
            if (GEPPETTO.ControlPanel != undefined) {
                // reset to default tab
                GEPPETTO.ControlPanel.setTab(undefined);
            }
        });

        //OSB Utility functions
        window.soma_v_entire_cell = function() {
            var recordedMemV = window.getRecordedMembranePotentials();
            var somaVInstances = window.getSomaVariableInstances('v');
            // get the intersection of recorded potentials and soma potential instances
            var recordedSomaV = $(recordedMemV).not($(recordedMemV).not(somaVInstances)).toArray();
            /*for (var i=0; i<recordedSomaV.length; ++i) {
                var cell = recordedSomaV[i].getParent().getParent();
                GEPPETTO.G.addBrightnessFunction(cell, recordedSomaV[i], window.voltage_color);
            }*/
            GEPPETTO.SceneController.addColorFunction(recordedSomaV, window.ca_color());
        }

        window.setupColorbar = function(instances, scalefn, normalize, name, axistitle) {
            if (instances.length > 0) {
                var c = G.addWidget(GEPPETTO.Widgets.PLOT,{stateless:true});
                c.setName(name);
                c.setSize(125, 350);
                c.setPosition(window.innerWidth - 375, window.innerHeight - 150);

                c.plotOptions = colorbar.defaultLayout();
                c.plotOptions.xaxis.title = axistitle;
                c.yaxisAutoRange = true; // for correct reseting of axes

                var callback = function() {
                    for (var instance of instances) {
                        c.updateXAxisRange(instance.getTimeSeries());
                    }
                    // this should be generalized beyond ca
                    if (normalize) {
                        window.color_norm = scalefn(c.plotOptions.xaxis.max);
                        //scalefn = window.ca_color;
                        G.removeFunctionColor(GEPPETTO.SceneController.getColorFunctionInstances());
                        GEPPETTO.SceneController.addColorFunction(window.getRecordedCaConcs(), window.color_norm);
                    }

                    var data = colorbar.setScale(c.plotOptions.xaxis.min, c.plotOptions.xaxis.max, normalize ? window.color_norm : scalefn, false);
                    c.scalefn = normalize ? window.color_norm : scalefn;
                    c.plotGeneric(data);

                    window.controlsMenuButton.refresh();
                };

                if (Project.getActiveExperiment().status == "COMPLETED") {
                    // only fetch instances for which state not already locally defined
                    var unfetched_instances = instances.filter(function(x){ return x.getTimeSeries() == undefined });
                    var unfetched_paths = unfetched_instances.map(function(x){ return x.getPath(); });
                    if (unfetched_paths.length > 0) {
                        GEPPETTO.ExperimentsController.getExperimentState(Project.getId(), Project.getActiveExperiment().getId(), unfetched_paths, $.proxy(callback, this));
                    } else {
                        $.proxy(callback, this)();
                    }
                } else {
                    GEPPETTO.ModalFactory.infoDialog(GEPPETTO.Resources.CANT_PLAY_EXPERIMENT, "Experiment " + experiment.name + " with id " + experiment.id + " isn't completed.");
                }
            }
        };

        window.loadConnections = function(callback) {
            Model.neuroml.resolveAllImportTypes(function() {
                $(".osb-notification-text").html(Model.neuroml.importTypes.length + " projections and " + Model.neuroml.connection.getVariableReferences().length + " connections were successfully loaded.");
                if (typeof callback === "function") callback();
            });
        };

        window.plotAllRecordedVariables = function() {
            Project.getActiveExperiment().playAll();
            var plots={};
            $.each(Project.getActiveExperiment().getWatchedVariables(true, false),
                function(index, value) {
            		var end = value.getInstancePath().substring(value.getInstancePath().lastIndexOf(".")+1);
            		var plot = plots[end];
            		if(plots[end]==undefined){
            			plots[end]=G.addWidget(0).setName("Recorded variables: "+end);
            			plot = plots[end];
            		}
                    plot.plotData(value)
                });
        };

        window.getSomaVariableInstances = function(stateVar) {
            var instances = GEPPETTO.ModelFactory.getAllPotentialInstancesEndingWith('.' + stateVar);
            var instancesToRecord = [];
            for (var i = 0; i < instances.length; i++) {
                var s = instances[i].split('.' + stateVar)[0];
                if (s.endsWith("_0") || s.endsWith("]")) {
                    instancesToRecord.push(instances[i]);
                }
            }
            return Instances.getInstance(instancesToRecord);
        };

        window.getRecordedMembranePotentials = function() {
            var instances = Project.getActiveExperiment().getWatchedVariables(true, false);
            var v = [];
            for (var i = 0; i < instances.length; i++) {
                if (instances[i].getInstancePath().endsWith(".v")) {
                    v.push(instances[i]);
                }
            }
            return v;
        };

        window.getRecordedCaConcs = function() {
            var instances = Project.getActiveExperiment().getWatchedVariables(true, false);
            var v = [];
            for (var i = 0; i < instances.length; i++) {
                if (instances[i].getInstancePath().endsWith(".caConc")) {
                    v.push(instances[i]);
                }
            }
            return v;
        };

        //OSB Widgets configuration
        var widthScreen = this.innerWidth;
        var heightScreen = this.innerHeight;

        var marginLeft = 100;
        var marginTop = 70;
        var marginRight = 10;
        var marginBottom = 50;

        var defaultWidgetWidth = 450;
        var defaultWidgetHeight = 500;

        var mainPopup = undefined;

        window.initialiseTreeWidget = function(title, posX, posY, widgetWidth, widgetHeight) {
            widgetWidth = typeof widgetWidth !== 'undefined' ? widgetWidth : defaultWidgetWidth;
            widgetHeight = typeof widgetHeight !== 'undefined' ? widgetHeight : defaultWidgetHeight;

            var tv = G.addWidget(3);
            tv.setSize(widgetHeight, widgetWidth);
            tv.setName(title);
            tv.setPosition(posX, posY);
            return tv;
        };

        window.initialiseControlPanel = function(barDef, id) {
            var modifiedBarDef = JSON.parse(JSON.stringify(barDef, id).split("$ENTER_ID").join(id.getId()));

            var posX = 90;
            var posY = 5;
            var target = G.addWidget(7, {isStateless: true}).renderBar('OSB Control Panel', modifiedBarDef['OSB Control Panel']);
            target.setPosition(posX, posY).showTitleBar(false).setTrasparentBackground(true);
            $("#" + target.id).find(".btn-lg").css("font-size", "15px");
        };

        window.getNodeCustomColormap = function () {
            var cells = GEPPETTO.ModelFactory.getAllInstancesOf(
                GEPPETTO.ModelFactory.getAllTypesOfType(GEPPETTO.ModelFactory.geppettoModel.neuroml.network)[0])[0].getChildren();
            var domain = [];
            var range = [];
            for (var i=0; i<cells.length; ++i) {
                if (cells[i].getMetaType() == GEPPETTO.Resources.ARRAY_INSTANCE_NODE)
                    domain.push(cells[i].getChildren()[0].getType().getId());
                else
                    domain.push(cells[i].getPath());
                range.push(cells[i].getColor());
            }
            // if everything is default color, use a d3 provided palette as range
            if (range.filter(function(x) { return x!==GEPPETTO.Resources.COLORS.DEFAULT; }).length == 0)
                return d3.scaleOrdinal(d3.schemeCategory20).domain(domain);
            else
                return d3.scaleOrdinal(range).domain(domain);
        },

        window.showConnectivityMatrix = function(instance) {
            Model.neuroml.resolveAllImportTypes(function(){
                $(".osb-notification-text").html(Model.neuroml.importTypes.length + " projections and " + Model.neuroml.connection.getVariableReferences().length + " connections were successfully loaded.");
                if (GEPPETTO.ModelFactory.geppettoModel.neuroml.projection == undefined) {
                    G.addWidget(1, {isStateless: true}).setMessage('No connection found in this network').setName('Warning Message');
                } else {
                    G.addWidget(6).setData(instance, {
                        linkType: function(c) {
                            if (GEPPETTO.ModelFactory.geppettoModel.neuroml.synapse != undefined) {
                                var synapseType = GEPPETTO.ModelFactory.getAllVariablesOfType(c.getParent(), GEPPETTO.ModelFactory.geppettoModel.neuroml.synapse)[0];
                                if (synapseType != undefined) {
                                    return synapseType.getId();
                                }
                            }
                            return c.getName().split("-")[0];
                        },
                        library: GEPPETTO.ModelFactory.geppettoModel.neuroml,
                        colorMapFunction: window.getNodeCustomColormap
                    }, window.getNodeCustomColormap())
                        .setName('Connectivity Widget on network ' + instance.getId())
                        .configViaGUI();
                }
            });
        };

        window.showChannelTreeView = function(csel) {
            if (GEPPETTO.ModelFactory.geppettoModel.neuroml.ionChannel) {
                var tv = initialiseTreeWidget('Ion Channels on cell ' + csel.getName(), widthScreen - marginLeft - defaultWidgetWidth, marginTop);

                var ionChannel = GEPPETTO.ModelFactory.getAllTypesOfType(GEPPETTO.ModelFactory.geppettoModel.neuroml.ionChannel);
                var ionChannelFiltered = [];
                for (var ionChannelIndex in ionChannel) {
                    var ionChannelItem = ionChannel[ionChannelIndex];
                    if (ionChannelItem.getId() != 'ionChannel') {
                        ionChannelFiltered.push(ionChannelItem);
                    }
                }
                tv.setData(ionChannelFiltered);
            }
        };

        window.showInputTreeView = function(csel) {
            if (GEPPETTO.ModelFactory.geppettoModel.neuroml.pulseGenerator) {
                var tv = initialiseTreeWidget('Inputs on ' + csel.getId(), widthScreen - marginLeft - defaultWidgetWidth, marginTop);
                var pulseGenerator = GEPPETTO.ModelFactory.getAllTypesOfType(GEPPETTO.ModelFactory.geppettoModel.neuroml.pulseGenerator);
                var pulseGeneratorFiltered = [];
                for (var pulseGeneratorIndex in pulseGenerator) {
                    var pulseGeneratorItem = pulseGenerator[pulseGeneratorIndex];
                    if (pulseGeneratorItem.getId() != 'pulseGenerator') {
                        pulseGeneratorFiltered.push(pulseGeneratorItem);
                    }
                }
                tv.setData(pulseGeneratorFiltered);
            }
        };

        /**
         * This method creates a quick experiment
         * @param prefix it gets prepended to the experiment name
         * @param parameterMap a map of the form where i,k and na are the labels used in the experiment name
         *      {
         *       ['i']:{'Model.neuroml.pulseGen1.amplitude':$('#currentValue').val()},
         *       ['k']:{'Model.neuroml.k.conductance':$('#kValue').val()},
         *       ['na']:{'Model.neuroml.na.conductance':$('#naValue').val()}
         *      }
         */
        window.quickExperiment = function(prefix, parameterMap) {
            GEPPETTO.once(GEPPETTO.Events.Experiment_completed, function() {
                //When the experiment is completed plot the variables
                window.plotAllRecordedVariables();
            });
            Project.getActiveExperiment().clone(function() {
                var experimentName = prefix + " - ";
                for(var label in parameterMap){
                	//if a label starts with _ we don't show it as part of the experiment name
                	if(!label.startsWith("_")){
                		experimentName += label+"=";
                	}
                    for(var p in parameterMap[label]){
                        eval(p).setValue(parameterMap[label][p]);
                        if(!label.startsWith("_")){
                        	experimentName += parameterMap[label][p]+",";	
                        }
                    }
                }
                Project.getActiveExperiment().setName(experimentName.slice(0, -1));
                Project.getActiveExperiment().run();
            });
        };

        window.showVisualTreeView = function(csel) {
            var visualWidgetWidth = 350;
            var visualWidgetHeight = 400;

            var tv = initialiseTreeWidget('Visual information on cell ' + csel.getName(), widthScreen - marginLeft - visualWidgetWidth, heightScreen - marginBottom - visualWidgetHeight, visualWidgetWidth, visualWidgetHeight);
            tv.setData(csel.getType().getVisualType(), {
                expandNodes: true
            });
        };

        //Custom handler for handling clicks inside the popup widget
        var customHandler = function(node, path, widget) {
            var n;
            try {
                n = eval(path);
            } catch (ex) {
                node = undefined;
            }

            var metaType = n.getMetaType();
            if (metaType == GEPPETTO.Resources.VARIABLE_NODE) {
                //A plot function inside a channel
                G.addWidget(Widgets.PLOT).plotFunctionNode(n);
            } else if (metaType == GEPPETTO.Resources.VISUAL_GROUP_NODE) {
                //A visual group
                n.show(true);
            } else if (metaType == GEPPETTO.Resources.COMPOSITE_TYPE_NODE) {
                //Another composite
                var target = widget;
                if (GEPPETTO.isKeyPressed("meta")) {
                    target = G.addWidget(1).addCustomNodeHandler(customHandler, 'click');
                }
                target.setName('Information for ' + n.getId()).setData(n, [GEPPETTO.Resources.HTML_TYPE]);
            }

        };

        window.showModelDescription = function(model) {
            if (mainPopup == undefined || mainPopup.destroyed) {
                mainPopup = G.addWidget(1).setName('Model Description - ' + model.getName()).addCustomNodeHandler(customHandler, 'click').setPosition(95, 140);
                mainPopup.showHistoryNavigationBar(true);
            }
            mainPopup.setData(model, [GEPPETTO.Resources.HTML_TYPE]);
        };


        window.plotProtocolResults = function(protocolName, e){
            e.preventDefault();
            // figure out if we have any protocol and organize into a map
            var experiments = Project.getExperiments();
            var protocolExperimentsMap = {};
            for(var i=0; i<experiments.length; i++){
                if(experiments[i].getName().startsWith('[P]')){
                    // parse protocol pattern
                    var experimentName = experiments[i].getName();
                    var protocolName = experimentName.substring(experimentName.lastIndexOf("[P] ")+4,experimentName.lastIndexOf(" - "));
                    if(protocolExperimentsMap[protocolName] == undefined){
                        protocolExperimentsMap[protocolName] = [experiments[i]];
                    } else {
                        protocolExperimentsMap[protocolName].push(experiments[i]);
                    }
                }
            }

            // look for experiments with that name
            experiments = protocolExperimentsMap[protocolName];
            var membranePotentials = GEPPETTO.ModelFactory.getAllPotentialInstancesEndingWith('.v');
            var plotController = GEPPETTO.WidgetFactory.getController(GEPPETTO.Widgets.PLOT);
            var plotWidget = null;
            if(experiments.length > 0 && membranePotentials.length>0){
                plotWidget = G.addWidget(0).setName(protocolName + ' / membrane potentials').setSize(300, 500);
            }
            for(var i=0; i<experiments.length; i++){
                // loop and plot all membrane potentials
                if(experiments[i].getStatus() == 'COMPLETED'){
                    for(var j=0; j<membranePotentials.length; j++){
                        plotController.plotStateVariable(
                            Project.getId(),
                            experiments[i].getId(),
                            membranePotentials[j],
                            plotWidget
                        );
                    }
                }
            }
        };

        window.getProtocolExperimentsMap = function(){
            var experiments = Project.getExperiments();
            var protocolExperimentsMap = {};
            for(var i=0; i<experiments.length; i++){
                if(experiments[i].getName().startsWith('[P]')){
                    // parse protocol pattern
                    var experimentName = experiments[i].getName();
                    var protocolName = experimentName.substring(experimentName.lastIndexOf("[P] ")+4,experimentName.lastIndexOf(" - "));
                    if(protocolExperimentsMap[protocolName] == undefined){
                        protocolExperimentsMap[protocolName] = [experiments[i]];
                    } else {
                        protocolExperimentsMap[protocolName].push(experiments[i]);
                    }
                }
            }

            return protocolExperimentsMap;
        };

        window.deleteProtocol = function(protocolName, e){
            e.preventDefault();
            // get protocol experiment map
            var protocolExperimentsMap = window.getProtocolExperimentsMap();

            // look for experiments with that name
            var experiments = protocolExperimentsMap[protocolName];

            if(experiments.length > 0){
                GEPPETTO.ExperimentsController.suppressDeleteExperimentConfirmation = true;
                GEPPETTO.trigger('spin_logo');
            }
            var callback = function(){
                GEPPETTO.ExperimentsController.suppressDeleteExperimentConfirmation = false;
                GEPPETTO.trigger('stop_spin_logo');
                window.showProtocolSummary();
                GEPPETTO.ModalFactory.infoDialog("Protocol deleted", "Al the experiments in your protocol have been deleted.");
            };

            for(var i=0; i<experiments.length; i++) {
                experiments[i].deleteExperiment((i == (experiments.length - 1)) ? callback: undefined);
            }
        };

        window.populateProtocolSummary = function(popup){
            // get protocol experiments map
            var protocolExperimentsMap = window.getProtocolExperimentsMap();

            // create markup for the protocol with protocol name and a 'plot results' shortcut link
            var markup = '';
            for(var protocol in protocolExperimentsMap){
                var exps = protocolExperimentsMap[protocol];
                // foreach protocol create markup
                markup += "<p style='float:left; color:white; margin-right:5px;'>[P] {0} ({1} experiments) </p>".format(protocol, exps.length);
                var buttonsMarkup = "<a class='btn fa fa-area-chart' title='Plot data' onclick='window.plotProtocolResults({0}, event)'></a>".format('"'+protocol+'"');
                buttonsMarkup += "<a class='btn fa fa-trash-o' title='Plot data' onclick='window.deleteProtocol({0}, event)'></a>".format('"'+protocol+'"');
                markup += "<p style='margin-top:-3px;'>" + buttonsMarkup + "</p>";
            }

            // create popup and set markup if any
            if(markup == ''){
                markup = "<p>No protocols found for this project.</p>"
            }
            popup.setMessage(markup);
        };

        window.showProtocolSummary = function() {
            if(window.protocolsPopup != undefined && !$('#' + window.protocolsPopup.getId()).is(':visible')){
                // NOTE: this is trick until we fix deleting references of dead widgets
                // NOTE: if the widget is not visible it means it was closed by the user
                window.protocolsPopup = undefined;
            }
            if(window.protocolsPopup == undefined){
                window.protocolsPopup = G.addWidget(1, {isStateless: true}).setName('Protocols Summary');
                protocolsPopup.setSize(300, 400).setPosition($(document).width() - 410, 50).showHistoryIcon(false);
                window.populateProtocolSummary(window.protocolsPopup);
            } else {
                window.populateProtocolSummary(window.protocolsPopup);
                window.protocolsPopup.shake();
            }
        };

        window.executeOnSelection = function(callback) {
            if (GEPPETTO.ModelFactory.geppettoModel.neuroml.cell) {
                var csel = GEPPETTO.SceneController.getSelection()[0];
                var population = GEPPETTO.ModelFactory.getAllTypesOfType(GEPPETTO.ModelFactory.geppettoModel.neuroml.population);
                if (typeof csel !== 'undefined') {
                    callback(csel);
                }
                // Check if there is one single cell select it
                else if (population.length == 2) { // 2 == 1 pop + 1 supertype
                    for (var i = 0; i < population.length; i++) {
                        if (typeof population[i].getSize === "function" && population[i].getSize() == 1) {
                            GEPPETTO.ModelFactory.getAllInstancesOf(population[i])[0][0].select();
                            csel = GEPPETTO.SceneController.getSelection()[0];
                        }
                    }
                    callback(csel);
                } else {
                    G.addWidget(1, {isStateless: true}).setMessage('No cell selected! Please select one of the cells and click here for information on its properties.').setName('Warning Message');
                }
            }
        };

        window.showSelection = function(csel) {
            if (mainPopup == undefined || mainPopup.destroyed) {
                mainPopup = G.addWidget(1).addCustomNodeHandler(customHandler, 'click').setPosition(95, 140);
            }
            mainPopup.setName("Cell Information for " + csel.getType().getId()).setData(csel.getType(), [GEPPETTO.Resources.HTML_TYPE]);
        };

        window.getMainType = function(id) {
            return (typeof(id) === 'undefined') ? GEPPETTO.ModelFactory.geppettoModel.neuroml[id] : id.getType();
        };

        //This is the main function which is called to initialize OSB Geppetto
        window.initOSBGeppetto = function(type, idString) {
            var id = eval(idString);
            switch (type) {
                case "generic":
                    window.initialiseControlPanel(networkControlPanel, id);
                    var mdPopupWidth = 350;
                    var mdPopupHeight = 400;
                    var elementMargin = 20;

                    var realHeightScreen = heightScreen - marginTop - marginBottom;
                    var realWidthScreen = widthScreen - marginRight - marginLeft - defaultWidgetWidth - elementMargin;

                    showModelDescription((typeof(id) === 'undefined') ? GEPPETTO.ModelFactory.geppettoModel.neuroml[idString] : id.getType());

                    Canvas1.setCameraPosition(-60, -250, 370);
                    break;
                case "cell":
                    window.initialiseControlPanel(cellControlPanel, id);
                    id.select();
                    break;
                case "network":
                    window.initialiseControlPanel(networkControlPanel, id);
                    break;
                case "synapse":
                case "channel":
                    var plotMaxWidth = 450;
                    var plotMinWidth = 250;
                    var plotMaxMinHeight = 200;
                    var elementMargin = 20;

                    var realHeightScreen = heightScreen - marginTop - marginBottom;
                    var realWidthScreen = widthScreen - marginRight - marginLeft - defaultWidgetWidth - elementMargin;

                    var generatePlotForFunctionNodes = function() {
                        // Retrieve function nodes from model tree summary
                        var nodes = GEPPETTO.ModelFactory.getAllVariablesOfMetaType(Model.neuroml[idString], GEPPETTO.Resources.DYNAMICS_TYPE, true);

                        // Create a plot widget for every function node with plot metadata
                        // information

                        // Generate dimensions depending on number of nodes and iframe size
                        var plottableNodes = [];
                        for (var nodesIndex in nodes) {
                            if (nodes[nodesIndex].getInitialValues()[0].value.dynamics.functionPlot != undefined && !nodes[nodesIndex].getInitialValues()[0].value.dynamics.expression.expression.startsWith('org.neuroml.export.info')) {
                                plottableNodes.push(nodes[nodesIndex]);
                            }
                        }

                        var plotHeight = realHeightScreen / plottableNodes.length;
                        var plotLayout = [];
                        if (plotHeight < plotMaxMinHeight) {
                            var plotHeight = plotMaxMinHeight;
                            var plotWidth = realWidthScreen / 2;
                            if (plotWidth < plotMinWidth) {
                                plotWidth = plotMinWidth;
                            }
                            for (var plottableNodesIndex in plottableNodes) {
                                if (plottableNodesIndex % 2 == 0) {
                                    plotLayout.push({
                                        'posX': widthScreen - plotWidth - marginRight,
                                        'posY': (plotHeight + elementMargin) * Math.floor(plottableNodesIndex / 2) + marginTop
                                    });
                                } else {
                                    plotLayout.push({
                                        'posX': widthScreen - plotWidth - marginRight - (plotWidth + elementMargin),
                                        'posY': (plotHeight + elementMargin) * Math.floor(plottableNodesIndex / 2) + marginTop
                                    });
                                }
                            }
                        } else {
                            var plotHeight = plotMaxMinHeight;
                            var plotWidth = plotMaxWidth;
                            for (var plottableNodesIndex in plottableNodes) {
                                plotLayout.push({
                                    'posX': widthScreen - plotWidth - marginRight,
                                    'posY': (plotHeight + elementMargin) * plottableNodesIndex + marginTop
                                });
                            }
                        }

                        for (var plottableNodesIndex in plottableNodes) {
                            var plotObject = G.addWidget(Widgets.PLOT);
                            plotObject.plotFunctionNode(plottableNodes[plottableNodesIndex]);
                            plotObject.setSize(plotHeight, plotWidth);
                            plotObject.setPosition(plotLayout[plottableNodesIndex].posX, plotLayout[plottableNodesIndex].posY);
                        }
                    };

                    // Adding TreeVisualiserDAT Widget
                    var title = type[0].toUpperCase() + type.substring(1) + " - " + idString;
                    var treeVisualiserDAT1 = initialiseTreeWidget(title, marginLeft, marginTop);
                    treeVisualiserDAT1.setData(Model.neuroml[idString], {
                        expandNodes: true
                    });
                    generatePlotForFunctionNodes();
                    break;

            }
        };

        GEPPETTO.G.setIdleTimeOut(-1);

        GEPPETTO.SceneController.setLinesThreshold(20000);

        GEPPETTO.G.autoFocusConsole(false);
        
        GEPPETTO.UnitsController.addUnit("V","Membrane potential");
    };
});
