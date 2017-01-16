define(function(require) {

    return function(GEPPETTO) {

        var link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = "geppetto/extensions/geppetto-osb/css/OSB.css";
        document.getElementsByTagName("head")[0].appendChild(link);

        PlotCtrlr = require('widgets/plot/controllers/PlotsController');
        window.PlotController = new PlotCtrlr();

        window.isLocalWatchedInstanceOrExternal = function(projectId, experimentId, path){
            var watchedOrExternal = false;

            if(projectId == window.Project.getId() && experimentId == window.Project.getActiveExperiment().getId()){
                // local, check if experiment completed and variable watched
                if(window.Project.getActiveExperiment().getStatus() == GEPPETTO.Resources.ExperimentStatus.COMPLETED){
                    var watchList = window.Project.getActiveExperiment().getWatchedVariables();
                    for(var i=0; i<watchList.length; i++){
                        if(watchList[i] == path){
                            watchedOrExternal = true;
                            break;
                        }
                    }
                }
            } else {
                // external, this is always true as we only show state variables from completed external experiments
                watchedOrExternal = true;
            }

            return watchedOrExternal;
        };

        //Change this to prompt the user to switch to lines or not
        GEPPETTO.SceneFactory.setLinesUserInput(false);

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

            if (Project.getActiveExperiment().simulatorConfigurations[window.Instances[0].getId()] != null || undefined) {
                formData['timeStep'] = Project.getActiveExperiment().simulatorConfigurations[window.Instances[0].getId()].getTimeStep();
                formData['length'] = Project.getActiveExperiment().simulatorConfigurations[window.Instances[0].getId()].getLength();
                formData['simulator'] = Project.getActiveExperiment().simulatorConfigurations[window.Instances[0].getId()].getSimulator();
            }

            var submitHandler = function() {
                GEPPETTO.Flows.showSpotlightForRun(formCallback);
                $("#" + formWidget.props.id + "_dialog").remove();
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
            
            GEPPETTO.ComponentFactory.addComponent('FORM', {
                id: formId,
                name: formName,
                schema: schema,
                formData: formData,
                submitHandler: submitHandler,
                errorHandler: errorHandler,
                changeHandler: changeHandler
            }, undefined, function(renderedComponent){
            	formWidget=renderedComponent;
        	});
        };

        //Function to add a dialog when run button is pressed
        GEPPETTO.Flows.addCompulsoryAction('GEPPETTO.showExecutionDialog', GEPPETTO.Resources.RUN_FLOW);

        //Logo initialization 
        GEPPETTO.ComponentFactory.addComponent('LOGO', {
            logo: 'gpt-osb'
        }, document.getElementById("geppettologo"));

        //Tutorial component initialization
        GEPPETTO.ComponentFactory.addComponent('TUTORIAL', {
        	tutorial: "https://dl.dropboxusercontent.com/s/puwpjdy9u7bfm2s/osb_tutorial.json?dl=1"
		}, document.getElementById("tutorial"));

        //Loading spinner initialization
        GEPPETTO.Spinner.setLogo("gpt-osb");

        //Save initialization 
        GEPPETTO.ComponentFactory.addComponent('SAVECONTROL', {}, document.getElementById("SaveButton"));

        //Control panel initialization
        var createMenuItems = function(projectId, experimentId, instance){
        	var menuButtonItems = [];
        	var plots = GEPPETTO.WidgetFactory.getController(GEPPETTO.Widgets.PLOT).getWidgets();
			if(plots.length > 0){
				for(var i =0 ; i<plots.length; i++){
					menuButtonItems.push({
						label: "Add to " +plots[i].getId(),
                        action:"window.PlotController.plotStateVariable(" + projectId + "," + experimentId + ",'" + instance + "'," + plots[i].getId() + ")",
						value: "plot_variable"
					});
				}
			}else{
				//add default item
				menuButtonItems.push({
					label: "Add new plot ",
					action:"window.PlotController.plotStateVariable(" + projectId + "," + experimentId + ",'" + instance + "')",
					value: "plot_variable"
				});
			}
			
			return menuButtonItems;
        };
        
        // instances config
        var instancesColumnMeta = [
            {
                "columnName": "projectId",
                "order": 1,
                "locked": false,
                "visible": true,
                "displayName": "Project Id"
            },
            {
                "columnName": "experimentId",
                "order": 2,
                "locked": false,
                "visible": true,
                "displayName": "Experiment Id"
            },
            {
                "columnName": "path",
                "order": 3,
                "locked": false,
                "visible": true,
                "displayName": "Path",
                "source": "$entity$.getPath()"
            },
            {
                "columnName": "name",
                "order": 4,
                "locked": false,
                "visible": true,
                "displayName": "Name",
                "source": "$entity$.getPath()",
                "cssClassName": "control-panel-path-column",
            },
            {
                "columnName": "type",
                "order": 5,
                "locked": false,
                "visible": true,
                "customComponent": null,
                "displayName": "Type(s)",
                "source": "$entity$.getTypes().map(function (t) {return t.getPath()})",
                "actions": "G.addWidget(3).setData($entity$).setName('$entity$')"
            },
            {
                "columnName": "controls",
                "order": 6,
                "locked": false,
                "visible": true,
                "customComponent": null,
                "displayName": "Controls",
                "source": "",
                "actions": "GEPPETTO.ControlPanel.refresh();",
                "cssClassName": "controlpanel-controls-column"
            }
        ];
        var instancesCols = ['name', 'type', 'controls'];
        var instancesControlsConfiguration = {
            "VisualCapability": {
                "select": {
                    "condition": "GEPPETTO.SceneController.isSelected($instances$)",
                    "false": {
                        "actions": ["GEPPETTO.SceneController.select($instances$)"],
                        "icon": "fa-hand-stop-o",
                        "label": "Unselected",
                        "tooltip": "Select"
                    },
                    "true": {
                        "actions": ["GEPPETTO.SceneController.deselect($instances$)"],
                        "icon": "fa-hand-rock-o",
                        "label": "Selected",
                        "tooltip": "Deselect"
                    },
                }, "visibility": {
                    "condition": "GEPPETTO.SceneController.isVisible($instances$)",
                    "false": {
                        "id": "visibility",
                        "actions": [
                            "GEPPETTO.SceneController.show($instances$);"
                        ],
                        "icon": "fa-eye-slash",
                        "label": "Hidden",
                        "tooltip": "Show"
                    },
                    "true": {
                        "id": "visibility",
                        "actions": [
                            "GEPPETTO.SceneController.hide($instances$);"
                        ],
                        "icon": "fa-eye",
                        "label": "Visible",
                        "tooltip": "Hide"
                    }
                },
                "color": {
                    "id": "color",
                    "actions": [
                        "$instance$.setColor('$param$');"
                    ],
                    "icon": "fa-tint",
                    "label": "Color",
                    "tooltip": "Color"
                },
                "randomcolor": {
                    "id": "randomcolor",
                    "actions": [
                        "GEPPETTO.SceneController.assignRandomColor($instance$);"
                    ],
                    "icon": "fa-random",
                    "label": "Random Color",
                    "tooltip": "Random Color"
                },
                "zoom": {
                    "id": "zoom",
                    "actions": [
                        "GEPPETTO.SceneController.zoomTo($instances$)"
                    ],
                    "icon": "fa-search-plus",
                    "label": "Zoom",
                    "tooltip": "Zoom"
                }
            },
            "StateVariableCapability": {
                "watch": {
                    "showCondition": "GEPPETTO.UserController.canUserEditExperiment() && (window.Project.getId() == $projectId$ && window.Project.getActiveExperiment().getId() == $experimentId$)",
                    "condition": "GEPPETTO.ExperimentsController.isWatched($instances$);",
                    "false": {
                        "actions": ["GEPPETTO.ExperimentsController.watchVariables($instances$,true);"],
                        "icon": "fa-circle-o",
                        "label": "Not recorded",
                        "tooltip": "Record the state variable"
                    },
                    "true": {
                        "actions": ["GEPPETTO.ExperimentsController.watchVariables($instances$,false);"],
                        "icon": "fa-dot-circle-o",
                        "label": "Recorded",
                        "tooltip": "Stop recording the state variable"
                    }
                },
                "plot": {
                    "id": "plot",
                    "actions": [
                        "window.PlotController.plotStateVariable($projectId$, $experimentId$, '$instance$')",
                    ],
                    "showCondition": "window.isLocalWatchedInstanceOrExternal($projectId$, $experimentId$, '$instance$');",
                    "icon": "fa-area-chart",
                    "label": "Plot",
                    "tooltip": "Plot state variable in a new widget"
                },
                //dynamic menu button, no initial list of items, and adds menu items on the go as plots are created
                "plot2": {
                	"menu" :true,
                	"menuMaker" : createMenuItems,
                	"actions" :["GEPPETTO.ControlPanel.refresh();"],
                    "showCondition": "window.isLocalWatchedInstanceOrExternal($projectId$, $experimentId$, '$instance$');",
                    "id": "plot2",
                    "icon": "fa-line-chart",
                    "label": "Plot2",
                    "tooltip": "Plot state variable in a an existing widget"
                }
            },
            "Common": {}
        };
        var instancesControls = {
            "Common": [],
            "VisualCapability": ['color', 'randomcolor', 'visibility', 'zoom'],
            "StateVariableCapability": ['watch', 'plot','plot2']
        };

        // state variables config (treated as potential instances)
        var stateVariablesColMeta = [
            {
                "columnName": "projectId",
                "order": 1,
                "locked": false,
                "visible": true,
                "displayName": "Project Id"
            },
            {
                "columnName": "experimentId",
                "order": 2,
                "locked": false,
                "visible": true,
                "displayName": "Experiment Id"
            },
            {
                "columnName": "path",
                "order": 3,
                "locked": false,
                "visible": true,
                "displayName": "Path"
            },
            {
                "columnName": "projectName",
                "order": 4,
                "locked": false,
                "visible": true,
                "displayName": "Project"
            },
            {
                "columnName": "experimentName",
                "order": 5,
                "locked": false,
                "visible": true,
                "displayName": "Experiment"
            },
            {
                "columnName": "name",
                "order": 6,
                "locked": false,
                "visible": true,
                "displayName": "Name",
                "cssClassName": "control-panel-path-column",
            },
            {
                "columnName": "type",
                "order": 7,
                "locked": false,
                "visible": true,
                "customComponent": null,
                "displayName": "Type(s)",
                "actions": "G.addWidget(3).setData($entity$).setName('$entity$')"
            },
            {
                "columnName": "controls",
                "order": 8,
                "locked": false,
                "visible": true,
                "customComponent": null,
                "displayName": "Controls",
                "source": "",
                "actions": "GEPPETTO.ControlPanel.refresh();",
                "cssClassName": "controlpanel-controls-column"
            }
        ];
        var stateVariablesCols = ['name', 'type', 'controls'];
        var stateVariablesColsWithExperiment = ['name', 'type', 'controls', 'experimentName'];
        var stateVariablesColsWithProjectAndExperiment = ['name', 'type', 'controls', 'projectName', 'experimentName'];
        var stateVariablesControlsConfig = {
            "Common": {
                "watch": {
                    "showCondition": "GEPPETTO.UserController.canUserEditExperiment() && (window.Project.getId() == $projectId$ && window.Project.getActiveExperiment().getId() == $experimentId$)",
                    "condition": "(function(){ var inst = undefined; try {inst = eval('$instance$');}catch(e){} if(inst != undefined){ return GEPPETTO.ExperimentsController.isWatched($instances$); } else { return false; } })();",
                    "false": {
                        "actions": ["var inst = Instances.getInstance('$instance$'); GEPPETTO.ExperimentsController.watchVariables([inst],true);"],
                        "icon": "fa-circle-o",
                        "label": "Not recorded",
                        "tooltip": "Record the state variable"
                    },
                    "true": {
                        "actions": ["var inst = Instances.getInstance('$instance$'); GEPPETTO.ExperimentsController.watchVariables([inst],false);"],
                        "icon": "fa-dot-circle-o",
                        "label": "Recorded",
                        "tooltip": "Stop recording the state variable"
                    }
                },
                "plot": {
                    "showCondition": "window.isLocalWatchedInstanceOrExternal($projectId$, $experimentId$, '$instance$');",
                    "id": "plot",
                    "actions": [
                        "window.PlotController.plotStateVariable($projectId$, $experimentId$, '$instance$')",
                    ],
                    "icon": "fa-area-chart",
                    "label": "Plot",
                    "tooltip": "Plot state variable in a new widget"
                },
                //dynamic menu button, no initial list of items, and adds menu items on the go as plots are created
                "plot2": {
                	"menu" :true,
                	"menuMaker" : createMenuItems,
                	"actions" :["GEPPETTO.ControlPanel.refresh();"],
                    "showCondition": "window.isLocalWatchedInstanceOrExternal($projectId$, $experimentId$, '$instance$');",
                    "id": "plot2",
                    "icon": "fa-line-chart",
                    "label": "Plot2",
                    "tooltip": "Plot state variable in a an existing widget"
                }
            }
        };
        var stateVariablesControls = { "Common": ['watch', 'plot','plot2'] };

        // parameters config (treated as potential instances)
        var parametersColMeta = [
            {
                "columnName": "projectId",
                "order": 1,
                "locked": false,
                "visible": true,
                "displayName": "Project Id",
            },
            {
                "columnName": "experimentId",
                "order": 2,
                "locked": false,
                "visible": true,
                "displayName": "Experiment Id",
            },
            {
                "columnName": "path",
                "order": 3,
                "locked": false,
                "visible": true,
                "displayName": "Path"
            },
            {
                "columnName": "projectName",
                "order": 4,
                "locked": false,
                "visible": true,
                "displayName": "Project Name",
            },
            {
                "columnName": "experimentName",
                "order": 5,
                "locked": false,
                "visible": true,
                "displayName": "Experiment Name",
            },
            {
                "columnName": "name",
                "order": 6,
                "locked": false,
                "visible": true,
                "displayName": "Name",
                "cssClassName": "control-panel-path-column",
            },
            {
                "columnName": "type",
                "order": 7,
                "locked": false,
                "visible": true,
                "customComponent": null,
                "displayName": "Type(s)",
                "actions": "G.addWidget(3).setData($entity$).setName('$entity$')"
            },
            {
                "columnName": "value",
                "order": 8,
                "locked": false,
                "visible": true,
                "displayName": "Value",
                "actions": "$entity$.setValue($VALUE$)",
                "readOnlyCondition": "!GEPPETTO.UserController.canUserEditExperiment() || !(window.Project.getId() == $projectId$ && window.Project.getActiveExperiment().getId() == $experimentId$)",
                "cssClassName": "control-panel-value-column",
            }
        ];
        var paramsCols = ['name', 'type', 'value'];
        var paramsColsWithExperiment = ['name', 'type', 'value', 'experimentName'];
        var paramsColsWithProjectAndExperiment = ['name', 'type', 'value', 'projectName', 'experimentName'];
        var parametersControlsConfig = {};
        var parametersControls = { "Common": [] };

        // control panel menu button configuration
        var panelMenuClickHandler = function(value){
            switch(value) {
                case 'show_visual_instances':
                    GEPPETTO.ControlPanel.setFilter('');
                    GEPPETTO.ControlPanel.clearData();
                    GEPPETTO.ControlPanel.setColumns(instancesCols);
                    GEPPETTO.ControlPanel.setColumnMeta(instancesColumnMeta);
                    GEPPETTO.ControlPanel.setControlsConfig(instancesControlsConfiguration);
                    GEPPETTO.ControlPanel.setControls(instancesControls);
                    // do filtering (always the same)
                    var visualInstances = GEPPETTO.ModelFactory.getAllInstancesWithCapability(GEPPETTO.Resources.VISUAL_CAPABILITY, window.Instances).map(
                        function(item){
                            return {
                                path: item.getPath(),
                                name: item.getPath(),
                                type: [item.getType().getPath()],
                                projectId: window.Project.getId(),
                                experimentId: window.Project.getActiveExperiment().getId(),
                                getPath: function(){
                                    return this.path;
                                }
                            }
                        }
                    );
                    // set data (delay update to avoid race conditions with react dealing with new columns)
                    setTimeout(function(){ GEPPETTO.ControlPanel.setData(visualInstances); }, 5);
                    break;
                case 'show_local_state_variables':
                    GEPPETTO.ControlPanel.setFilter('');
                    GEPPETTO.ControlPanel.clearData();
                    GEPPETTO.ControlPanel.setColumns(stateVariablesCols);
                    GEPPETTO.ControlPanel.setColumnMeta(stateVariablesColMeta);
                    GEPPETTO.ControlPanel.setControlsConfig(stateVariablesControlsConfig);
                    GEPPETTO.ControlPanel.setControls(stateVariablesControls);
                    // take all potential state variables instances
                    var filteredPaths = GEPPETTO.ModelFactory.getAllPotentialInstancesOfMetaType('StateVariableType', undefined, true).filter(
                        function(item){
                            // only include paths without stars (real paths)
                            return item.path.indexOf('*') == -1;
                        }
                    );
                    var potentialStateVarInstances = filteredPaths.map(
                        function(item){
                            return {
                                path: item.path,
                                name: item.path,
                                type: ['Model.common.StateVariable'],
                                projectId: window.Project.getId(),
                                experimentId: window.Project.getActiveExperiment().getId(),
                                getPath: function(){
                                    return this.path;
                                }
                            }
                        }
                    );

                    // set data (delay update to avoid race conditions with react dealing with new columns)
                    setTimeout(function(){ GEPPETTO.ControlPanel.setData(potentialStateVarInstances); }, 5);
                    break;
                case 'show_recorded_state_variables':
                    GEPPETTO.ControlPanel.setFilter('');
                    GEPPETTO.ControlPanel.clearData();
                    GEPPETTO.ControlPanel.setColumns(instancesCols);
                    GEPPETTO.ControlPanel.setColumnMeta(instancesColumnMeta);
                    GEPPETTO.ControlPanel.setControlsConfig(instancesControlsConfiguration);
                    GEPPETTO.ControlPanel.setControls(instancesControls);
                    // show all state variable instances (means they are recorded)
                    var recordedStateVars = GEPPETTO.ModelFactory.getAllInstancesWithCapability(GEPPETTO.Resources.STATE_VARIABLE_CAPABILITY, window.Instances).map(
                        function(item){
                            return {
                                path: item.getPath(),
                                name: item.getPath(),
                                type: ['Model.common.StateVariable'],
                                projectId: window.Project.getId(),
                                experimentId: window.Project.getActiveExperiment().getId(),
                                getPath: function(){
                                    return this.path;
                                }
                            }
                        }
                    );

                    // set data (delay update to avoid race conditions with react dealing with new columns)
                    setTimeout(function(){ GEPPETTO.ControlPanel.setData(recordedStateVars); }, 5);
                    break;
                case 'show_project_recorded_state_variables':
                    // this will display potential instances with state variables col meta / controls
                    GEPPETTO.ControlPanel.setFilter('');
                    GEPPETTO.ControlPanel.clearData();
                    GEPPETTO.ControlPanel.setColumns(stateVariablesColsWithExperiment);
                    GEPPETTO.ControlPanel.setColumnMeta(stateVariablesColMeta);
                    GEPPETTO.ControlPanel.setControlsConfig(stateVariablesControlsConfig);
                    GEPPETTO.ControlPanel.setControls(stateVariablesControls);

                    var recordedStateVarInstances = [];
                    var projects = GEPPETTO.ProjectsController.getUserProjects();
                    // get all experiments from current project
                    for(var i=0; i<projects.length; i++){
                        if(projects[i].id == window.Project.getId()){
                            // get all state variables for completed experiments
                            var experiments = projects[i].experiments;
                            for (var j = 0; j < experiments.length; j++) {
                                if (experiments[j].status == GEPPETTO.Resources.ExperimentStatus.COMPLETED) {
                                    recordedStateVarInstances = recordedStateVarInstances.concat(
                                        experiments[j].aspectConfigurations[0].watchedVariables.map(
                                        function (item) {
                                            return {
                                                path: item,
                                                name: item,
                                                type: ['Model.common.StateVariable'],
                                                projectId: projects[i].id,
                                                projectName: projects[i].name,
                                                experimentId: experiments[j].id,
                                                experimentName: experiments[j].name,
                                                getPath: function () {
                                                    return this.path;
                                                }
                                            }
                                        })
                                    );
                                }
                            }
                            break;
                        }
                    }

                    // set data (delay update to avoid race conditions with react dealing with new columns)
                    setTimeout(function(){ GEPPETTO.ControlPanel.setData(recordedStateVarInstances); }, 5);
                    break;
                case 'show_global_recorded_state_variables':
                    // this will display potential instances with state variables col meta / controls
                    GEPPETTO.ControlPanel.setFilter('');
                    GEPPETTO.ControlPanel.clearData();
                    GEPPETTO.ControlPanel.setColumns(stateVariablesColsWithProjectAndExperiment);
                    GEPPETTO.ControlPanel.setColumnMeta(stateVariablesColMeta);
                    GEPPETTO.ControlPanel.setControlsConfig(stateVariablesControlsConfig);
                    GEPPETTO.ControlPanel.setControls(stateVariablesControls);

                    var recordedStateVarInstances = [];
                    var projects = GEPPETTO.ProjectsController.getUserProjects();
                    // get all experiments from projects other than current project
                    for(var i=0; i<projects.length; i++){
                        if(projects[i].id != window.Project.getId()){
                            // get all state variables for completed experiments
                            var experiments = projects[i].experiments;
                            for (var j = 0; j < experiments.length; j++) {
                                if (experiments[j].status == GEPPETTO.Resources.ExperimentStatus.COMPLETED) {
                                    recordedStateVarInstances = recordedStateVarInstances.concat(
                                        experiments[j].aspectConfigurations[0].watchedVariables.map(
                                            function (item) {
                                                return {
                                                    path: item,
                                                    name: item,
                                                    type: ['Model.common.StateVariable'],
                                                    projectId: projects[i].id,
                                                    projectName: projects[i].name,
                                                    experimentId: experiments[j].id,
                                                    experimentName: experiments[j].name,
                                                    getPath: function () {
                                                        return this.path;
                                                    }
                                                }
                                            })
                                    );
                                }
                            }
                            break;
                        }
                    }

                    // set data (delay update to avoid race conditions with react dealing with new columns)
                    setTimeout(function(){ GEPPETTO.ControlPanel.setData(recordedStateVarInstances); }, 5);
                    break;
                case 'show_parameters':
                    GEPPETTO.ControlPanel.setFilter('');
                    GEPPETTO.ControlPanel.clearData();
                    GEPPETTO.ControlPanel.setColumns(paramsCols);
                    GEPPETTO.ControlPanel.setColumnMeta(parametersColMeta);
                    GEPPETTO.ControlPanel.setControlsConfig(parametersControlsConfig);
                    GEPPETTO.ControlPanel.setControls(parametersControls);
                    // take all parameters potential instances
                    var potentialParamInstances = GEPPETTO.ModelFactory.getAllPotentialInstancesOfMetaType('ParameterType', undefined, true).map(
                        function(item){
                            return {
                                path: item.path,
                                name: item.path.replace(/Model\.neuroml\./gi, '').replace(/\b(\w+)\b([\w\W]*)\b\1\b/gi, '$1$2').replace(/\.\./g, '.'),
                                type: ['Model.common.Parameter'],
                                projectId: window.Project.getId(),
                                experimentId: window.Project.getActiveExperiment().getId(),
                                getPath: function(){
                                    return this.path;
                                }
                            }
                        }
                    );

                    // set data (delay update to avoid race conditions with react dealing with new columns)
                    setTimeout(function(){ GEPPETTO.ControlPanel.setData(potentialParamInstances); }, 5);
                    break;
                case 'show_project_parameters':
                    // this will display potential instances with parameters col meta / controls
                    GEPPETTO.ControlPanel.setFilter('');
                    GEPPETTO.ControlPanel.clearData();
                    GEPPETTO.ControlPanel.setColumns(paramsColsWithExperiment);
                    GEPPETTO.ControlPanel.setColumnMeta(parametersColMeta);
                    GEPPETTO.ControlPanel.setControlsConfig(parametersControlsConfig);
                    GEPPETTO.ControlPanel.setControls(parametersControls);

                    var editedParameters = [];
                    var projects = GEPPETTO.ProjectsController.getUserProjects();
                    // get all experiments from current project
                    for(var i=0; i<projects.length; i++){
                        if(projects[i].id == window.Project.getId()){
                            // get all parameters for completed experiments
                            var experiments = projects[i].experiments;
                            for (var j = 0; j < experiments.length; j++) {
                                if (experiments[j].status == GEPPETTO.Resources.ExperimentStatus.COMPLETED) {
                                    editedParameters = editedParameters.concat(
                                        experiments[j].aspectConfigurations[0].modelParameter.map(
                                            function (item) {
                                                return {
                                                    path: item,
                                                    name: item,
                                                    type: ['Model.common.Parameter'],
                                                    projectId: projects[i].id,
                                                    projectName: projects[i].name,
                                                    experimentId: experiments[j].id,
                                                    experimentName: experiments[j].name,
                                                    getPath: function () {
                                                        return this.path;
                                                    }
                                                }
                                            })
                                    );
                                }
                            }
                            break;
                        }
                    }

                    // set data (delay update to avoid race conditions with react dealing with new columns)
                    setTimeout(function(){ GEPPETTO.ControlPanel.setData(editedParameters); }, 5);
                    break;
                case 'show_global_parameters':
                    // this will display potential instances with parameters col meta / controls
                    GEPPETTO.ControlPanel.setFilter('');
                    GEPPETTO.ControlPanel.clearData();
                    GEPPETTO.ControlPanel.setColumns(paramsColsWithProjectAndExperiment);
                    GEPPETTO.ControlPanel.setColumnMeta(parametersColMeta);
                    GEPPETTO.ControlPanel.setControlsConfig(parametersControlsConfig);
                    GEPPETTO.ControlPanel.setControls(parametersControls);

                    var editedParameters = [];
                    var projects = GEPPETTO.ProjectsController.getUserProjects();
                    // get all experiments from projects other than current project
                    for(var i=0; i<projects.length; i++){
                        if(projects[i].id != window.Project.getId()){
                            // get all parameters for completed experiments
                            var experiments = projects[i].experiments;
                            for (var j = 0; j < experiments.length; j++) {
                                if (experiments[j].status == GEPPETTO.Resources.ExperimentStatus.COMPLETED) {
                                    editedParameters = editedParameters.concat(
                                        experiments[j].aspectConfigurations[0].modelParameter.map(
                                            function (item) {
                                                return {
                                                    path: item,
                                                    name: item,
                                                    type: ['Model.common.Parameter'],
                                                    projectId: projects[i].id,
                                                    projectName: projects[i].name,
                                                    experimentId: experiments[j].id,
                                                    experimentName: experiments[j].name,
                                                    getPath: function () {
                                                        return this.path;
                                                    }
                                                }
                                            })
                                    );
                                }
                            }
                            break;
                        }
                    }

                    // set data (delay update to avoid race conditions with react dealing with new columns)
                    setTimeout(function(){ GEPPETTO.ControlPanel.setData(editedParameters); }, 5);
                    break;
                    break;
            }
        };
        var panelMenuItemsConfig = [
            {
                label: "Visual Instances",
                action: "",
                value: "show_visual_instances"
            },{
                label: "All Local State Variables (Current Project/Experiment)",
                action: "",
                value: "show_local_state_variables"
            },{
                label: "Recorded Local State Variables (Current project/experiment)",
                action: "",
                value: "show_recorded_state_variables"
            },{
                label: "Project Recorded State Variables (All experiments for current project)",
                action: "",
                value: "show_project_recorded_state_variables"
            },{
                label: "Global Recorded State Variables (All other projects/experiments)",
                action: "",
                value: "show_global_recorded_state_variables"
            },{
                label: "Local Parameters (Current project/experiment)",
                action: "",
                value: "show_parameters"
            },{
                label: "Project Edited Parameters (All experiments for current project)",
                action: "",
                value: "show_project_parameters"
            },{
                label: "Global Edited Parameters (All other projects/experiments)",
                action: "",
                value: "show_global_parameters"
            }
        ];

        GEPPETTO.ComponentFactory.addComponent('CONTROLPANEL', {
            showMenuButton: true,
            menuButtonItems: panelMenuItemsConfig,
            menuButtonClickHandler: panelMenuClickHandler,
            listenToInstanceCreationEvents: false
        }, document.getElementById("controlpanel"), function () {
            var injectCustomControls = function(colMeta){
                for(var i=0; i<colMeta.length; i++){
                    if(colMeta[i].columnName == 'type'){
                        colMeta[i].customComponent = GEPPETTO.ArrayComponent;
                    } else if(colMeta[i].columnName == 'controls'){
                        colMeta[i].customComponent = GEPPETTO.ControlsComponent;
                    } else if(colMeta[i].columnName == 'value'){
                        colMeta[i].customComponent = GEPPETTO.ParameterInputComponent;
                    }
                }
            };
            // need to inject custom controls here as they become visible only after control panel component is imported
            injectCustomControls(instancesColumnMeta);
            injectCustomControls(stateVariablesColMeta);
            injectCustomControls(parametersColMeta);

            // whatever gets passed we keep, filtering will happen outside the control panel
            var passThroughDataFilter = function (entities) {
                return entities;
            };

            // set initial col meta (instances)
            GEPPETTO.ControlPanel.setColumnMeta(instancesColumnMeta);
            // set initial cols (instances)
            GEPPETTO.ControlPanel.setColumns(instancesCols);
            // set data filter
            GEPPETTO.ControlPanel.setDataFilter(passThroughDataFilter);
            // set default controls config
            GEPPETTO.ControlPanel.setControlsConfig(instancesControlsConfiguration);
            // set default controls
            GEPPETTO.ControlPanel.setControls(instancesControls);
        });

        //Spotlight initialization
        GEPPETTO.ComponentFactory.addComponent('SPOTLIGHT', {}, document.getElementById("spotlight"), function() {
            GEPPETTO.Spotlight.addSuggestion(GEPPETTO.Spotlight.plotSample, GEPPETTO.Resources.PLAY_FLOW);
        });

        window.plotAllRecordedVariables = function() {
            Project.getActiveExperiment().playAll();
            var plt = G.addWidget(0).setName('Recorded Variables');
            $.each(Project.getActiveExperiment().getWatchedVariables(true, false),
                function(index, value) {
                    plt.plotData(value)
                });
        };

        window.getMembranePotentialsAtSoma = function() {
            var trail = ".v";
            var instances = GEPPETTO.ModelFactory.getAllPotentialInstancesEndingWith(trail);
            var instancesToRecord = [];
            for (var i = 0; i < instances.length; i++) {
                var s = instances[i].split(trail)[0];
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

        //Menu button initialization
        var clickHandler = function(value) {
            //Do Something with value returned
            if (value != null) {
                GEPPETTO.Console.log(value);
            }
        };
        var configuration = {
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
            menuSize: null,
            onClickHandler: clickHandler,
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
                label: "Apply voltage colouring to morphologies",
                condition: "GEPPETTO.G.isBrightnessFunctionSet()",
                value: "apply_voltage",
                false: {
                    action: "G.addBrightnessFunctionBulkSimplified(window.getRecordedMembranePotentials(), function(x){return (x+0.07)/0.1;});"
                },
                true: {
                    action: "G.removeBrightnessFunctionBulkSimplified(window.getRecordedMembranePotentials(),false);"
                }
            }, {
                label: "Show simulation time",
                action: "G.addWidget(5).setName('Simulation time').setVariable(time);",
                value: "simulation_time"
            }]
        };
        GEPPETTO.ComponentFactory.addComponent('CONTROLSMENUBUTTON', { configuration: configuration }, document.getElementById("ControlsMenuButton"));

        //Foreground initialization
        GEPPETTO.ComponentFactory.addComponent('FOREGROUND', {}, document.getElementById("foreground-toolbar"));

        //Experiments table initialization
        GEPPETTO.ComponentFactory.addComponent('EXPERIMENTSTABLE', {}, document.getElementById("experiments"));

        //Home button initialization
        GEPPETTO.ComponentFactory.addComponent('HOME', {}, document.getElementById("HomeButton"));

        //Simulation controls initialization
        GEPPETTO.ComponentFactory.addComponent('SIMULATIONCONTROLS', {}, document.getElementById("sim-toolbar"));

        //Camera controls initialization
        GEPPETTO.ComponentFactory.addComponent('CAMERACONTROLS', {}, document.getElementById("camera-controls"));

        window.loadConnections = function() {
            Model.neuroml.resolveAllImportTypes(function() {
                $(".osb-notification-text").html(Model.neuroml.importTypes.length + " projections and " + Model.neuroml.connection.getVariableReferences().length + " connections were successfully loaded.");
            });
        };

        GEPPETTO.on(Events.Model_loaded, function() {
            if (Model.neuroml != undefined && Model.neuroml.importTypes != undefined && Model.neuroml.importTypes.length > 0) {
                $('#mainContainer').append('<div class="alert alert-warning osb-notification alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><span class="osb-notification-text">' + Model.neuroml.importTypes.length + ' projections in this model have not been loaded yet. <a href="javascript:loadConnections();" class="alert-link">Click here to load the connections.</a> (Note: depending on the size of the network this could take some time).</span></div>');
            }
        });

        GEPPETTO.on(Events.Project_loading, function() {
            $('.osb-notification').remove();
        });

        GEPPETTO.G.setIdleTimeOut(-1);

        GEPPETTO.SceneController.setLinesThreshold(20000);

        GEPPETTO.G.autoFocusConsole(false);
    };
});
