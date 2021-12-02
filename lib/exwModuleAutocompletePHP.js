'use babel';

/*
Jose L Cuevas
https://exponentialworks.com
*/

// Local variables
const parseRegex = /^((?:Parse|Fatal) error|Deprecated):\s+(.+) in .+?(?: on line |:)(\d+)/gm;
const phpVersionMatchRegex = /^PHP (\d+)\.(\d+)\.(\d+)/;

const path = require('path');
const os = require('os');
const fs = require('fs');
const util = require('util');
const exec = require('child_process');
const crypto = require('crypto');


const jslint_tmp_file = 'jslint_src_' + crypto.randomBytes(16).toString('base64').replace(/\//,'_') + '.js';
const jslint_tmp = path.join(os.tmpdir(), jslint_tmp_file);

const pexec = util.promisify(require('child_process').exec);

const { TextEditor, File, Directory } = require('atom');

function helperGetLineRange(textEditor, line){

	let lineNumber = 1 * line;

	const buffer = textEditor.getBuffer();
	const lineMax = buffer.getLineCount() - 1;

	if (lineNumber > lineMax) {
		lineNumber = lineMax;
	}

	const lineText = buffer.lineForRow(lineNumber);
	let colEnd = lineText.length;
	let colStart = 0;

	const indentation = lineText.match(/^\s+/);
	if (indentation) {
		colStart = indentation[0].length;
	}

	return [[lineNumber, colStart], [lineNumber, colEnd]];

}

var linterProviderJS = {
	name: 'JS',
	grammarScopes: ['source.js'],
	scope: 'file',
	lintsOnChange: true,
	lint: function(textEditor){
		return new Promise( (resolve, reject) => {
			console.log("js lint called...");
			console.log(textEditor);
			if (!atom.workspace.isTextEditor(textEditor)) {
				return null;
	        }
	        const filePath = textEditor.getPath();
	        const fileText = textEditor.getText();

			const Linter = require("eslint").Linter;
			const linter = new Linter();

			console.log("Have Linter %o", linter);

			const configString = fs.readFileSync(__dirname + '/js/eslintrc.json', 'utf8');
			const eslintConfig = JSON.parse(configString);

			var results = [];
			try{

				console.log("running linter.verify");
				results = linter.verify(fileText, eslintConfig);
				console.log(results);
			} catch(e){
				console.log("Unable to run eslint");
				console.log(e);
			}

			let output = '';
			let busy = this.ide.addBusySignal("Running linter for " + textEditor.getTitle());

			if ( textEditor.getText() !== fileText ) {
				// Editor contents have changed, don't update messages
				return null;
			}

			const messages = [];

			if (!results || results.length === 0) {
    			resolve(messages);
  			}

			for(const msg of results){
				console.log('msg %o', msg);
				messages.push({
						severity: msg.severity === 2 ? 'error' : 'warning',
						location: {
							file: filePath,
							position: [[msg.line-1, msg.column-1], [msg.line-1, msg.column-1]]
						},
						excerpt: msg.message
				});
			}


			console.log('lint %o', messages);

			busy.clear();

			resolve(messages);
		});
	},
	lint1: function(textEditor){
		return new Promise( (resolve, reject) => {
			console.log("js lint called...");
			console.log(textEditor);
			if (!atom.workspace.isTextEditor(textEditor)) {
				return null;
	        }
	        const filePath = textEditor.getPath();
	        const fileText = textEditor.getText();
			let messages = [];

			try{
				const { jslint } = require("./js/jslint.js");

				console.log("Have Linter %o", jslint);

				//var results = [];

				let busy = this.ide.addBusySignal("Running linter for " + textEditor.getTitle());

				console.log("running linter.verify");
				let results = jslint.verify(fileText, this.jslintConfig );

				console.log(results);

				if ( textEditor.getText() !== fileText ) {
					// Editor contents have changed, don't update messages
					busy.clear();
					return null;
				}

				if (!results || !results.warnings || results.warnings.length === 0) {
	    			resolve(messages);
	  			}

				for(const msg of results){
					console.log('msg %o', msg);
					messages.push({
							severity: msg.severity == 2 ? 'error': 'warning',
							location: {
								file: filePath,
								position: [[msg.line-1, msg.column-1], [msg.line-1, msg.column-1]]
							},
							excerpt: msg.message
					});
				}

				busy.clear();

				console.log('lint %o', messages);
			} catch(e){
				console.log("Unable to run eslint");
				console.log(e);
			}

			resolve(messages);
		});
	},
	initialize: function(ide){
		this.ide = ide;

		var jslint_data = ide.readDataFile('../config/default_jslint_options.json');
		let fileStorage = ide.getUserDataFile('exw_ide_jslint_options.json', jslint_data);

		this.jslintConfig = JSON.parse(fileStorage.data);
	}
};

var linterProviderPHP = {
	name: 'PHP',
	grammarScopes: ['text.html.php', 'source.php'],
	scope: 'file',
	lintsOnChange: true,
	getLineRange: function(textEditor, line){

		let lineNumber = 1 * line;

		const buffer = textEditor.getBuffer();
		const lineMax = buffer.getLineCount() - 1;

		if (lineNumber > lineMax) {
			lineNumber = lineMax;
		}

		const lineText = buffer.lineForRow(lineNumber);
	    let colEnd = lineText.length;
		let colStart = 0;

		const indentation = lineText.match(/^\s+/);
		if (indentation) {
			colStart = indentation[0].length;
		}

		return [[lineNumber, colStart], [lineNumber, colEnd]];

	},
	lint: function(textEditor){
		return new Promise( (resolve, reject) => {
			console.log("php lint called...");
			console.log(textEditor);
			if (!atom.workspace.isTextEditor(textEditor)) {
				return null;
	        }
	        const filePath = textEditor.getPath();
	        const fileText = textEditor.getText();

			const parameters = [
				'-l',
				'--syntax-check',
				'--define', 'display_errors=On',
				'--define', 'log_errors=Off',
	        ];

			const execOptions = {encoding: 'UTF-8', input: fileText};

			if (filePath) {

				// Only specify a CWD if the file has been saved
				const [projectPath] = atom.project.relativizePath(filePath);
				execOptions.cwd = projectPath !== null ? projectPath : path.dirname(filePath);
	        }

			//console.log('parameters %o', parameters);
			//console.log('execOptions %o', execOptions);

			let output = '';
			let busy = this.ide.addBusySignal("Running linter for " + textEditor.getTitle());

			const out = exec.spawnSync( exwModule.executablePath, parameters, execOptions );

			//console.log('spawn out %o', out);
			console.log(out.stdout);
			output = out.stdout;

			if ( textEditor.getText() !== fileText ) {
				// Editor contents have changed, don't update messages
				busy.clear();
				return null;
			}

			const messages = [];

			//console.log("output1 %s",output);
			let match = parseRegex.exec(output);
			//console.log("match %o",match);
			while (match !== null) {
				const line = Number.parseInt(match[3], 10) - 1;
				const errorType = match[1];

				messages.push({
						severity: (/error/i.test(errorType) ? 'error' : 'warning'),
						location: {
							file: filePath,
							position: helperGetLineRange(textEditor, line),
						},
						excerpt: match[2],
				});

				match = parseRegex.exec(output);
			}


			console.log('lint %o', messages);

			busy.clear();

			resolve(messages);
		});
	},
	initialize: function(ide){
		this.ide = ide;
	}
};
var provider = {
	ide: null,
	selector: '.source.php',
	disableForSelector: '.source.php .comment',
	inclusionPriority: 1,
  	excludeLowerPriority: true,
	lastPath: '',
	userSuggestions: null,
	staticSuggestions: { variables: [], keywords: [], constants: [], functions: [] },

	initialize: function(ide){
		this.ide = ide;

		fs.readFile( path.resolve(__dirname, 'php', 'completions.json'), (error, content) => {
			try {
				this.staticSuggestions = JSON.parse(content);

			} catch (e) {

			}
		});


		fs.readFile( path.resolve(__dirname, 'php', 'functions.json'), (error, content) => {
			try {
				this.staticSuggestions.functions = [];
				let data = JSON.parse(content);
				for( let item of data.functions ){
					this.staticSuggestions.functions.push(item);
				}

			} catch (e) {

			}
		});
	},
	dispose: function(){

	},
	getSuggestions: function(request){
		/*
		upgradedOptions = {
		editor: TextEditor //options.editor,
		prefix: "s" //options.prefix,
		activatedManually: undefined,
		bufferPosition: {row: 9, column: 6} //Point object //options.bufferPosition,
		scope: options.scopeDescriptor {
			scopes: [
				'text.html.php', 'source.php', 'meta.embedded.block.php', 'constant.other.php'
			]
		},
		scopeChain: options.scopeDescriptor.getScopeChain(),
		buffer: options.editor.getBuffer(),
		cursor: options.editor.getLastCursor()
		}
		*/

		//console.log("@php provider");
		//console.log(request);
		return new Promise( (resolve, reject) => {

			let context = { vars: false, constants: false, keywords: false, functions: false };

			if( !this.isAutocompleteContext(request) ){
				resolve([]);
				return;
			}else if( this.isAllContext(request) ){
				context.vars = context.constants = context.keywords = context.functions = true;
				this.parsePHP(request);
				resolve(this.getCompletions(request, context));
			}else if( this.isVariableContext(request) ){
				context.vars = true;
				this.parsePHP(request);
				resolve(this.getCompletions(request, context));
			}else if( this.isFunConContext(request) ){
				context.functions = true;
				this.parsePHP(request);
				resolve(this.getCompletions(request, context));
			}else{
				resolve([]);
			}
		});
	},
	isAutocompleteContext: function(request){
		if( request.prefix == '' ) return false;

    	let scopes = request.scopeDescriptor.getScopesArray();
		if( scopes.indexOf('keyword.operator.assignment.php') > -1 ||
			scopes.indexOf('keyword.operator.comparison.php') > -1 ||
			scopes.indexOf('keyword.operator.logical.php') > -1 ||
			scopes.indexOf('string.quoted.double.php') > -1 ||
			scopes.indexOf('string.quoted.single.php') > -1
		) return false;

		if( this.isStringContext(request) && this.isFunConContext(request) ) return false;
		return true;

	},
	isStringContext: function(request){
		let scopes = request.scopeDescriptor.getScopesArray();
		if( scopes.indexOf('string.quoted.double.php') > -1 ||
			scopes.indexOf('string.quoted.single.php') > -1
		) return true;
		return false;
	},
	isAllContext: function(request){
		let scopes = request.scopeDescriptor.getScopesArray();
		if( scopes.length == 3 ) return true;
		if( scopes.indexOf('meta.array.php') > -1 ) return true;
		return false;
	},
	isVariableContext: function(request){
		let scopes = request.scopeDescriptor.getScopesArray();
		if( scopes.indexOf('variable.other.php') > -1 ) return true;
		return false;
	},
	isFunConContext: function(request){
		let scopes = request.scopeDescriptor.getScopesArray();
		if( scopes.indexOf('constant.other.php') > -1 ||
			scopes.indexOf('keyword.control.php') > -1 ||
			scopes.indexOf('storage.type.php') > -1 ||
			scopes.indexOf('support.function.construct.php') > -1
		) return true;
		return false;
	},
	buildSuggestionEntry: function(entry){
		var o = {
    		text: entry.text,
    		type: entry.type,
    		displayText: entry.displayText ? entry.displayText : null,
			snippet: entry.snippet ? entry.snippet : null,
			leftLabel: entry.leftLabel ? entry.leftLabel : null,
    		description: entry.description ? entry.description: 'PHP ' + entry.text + ' ' + entry.type,
    		descriptionMoreURL: entry.descriptionMoreURL ? entry.descriptionMoreURL : null,
		};
		return o;
	},
	getCompletions: function(request, context){
		var completions = [];
		let lowerCasePrefix = request.prefix.toLowerCase();

		var pool = [];
		if( this.userSuggestions ){
			if( context.vars ){
				pool = pool.concat(this.userSuggestions.user_vars);
			}
			if( context.functions ){
				pool = pool.concat(this.userSuggestions.user_functions);
			}
		}
		if( this.staticSuggestions ){
			if( context.vars ){
				pool = pool.concat(this.staticSuggestions.variables);
			}
			if( context.functions ){
				pool = pool.concat(this.staticSuggestions.functions);
			}
			if( context.keywords ){
				pool = pool.concat(this.staticSuggestions.keywords);
			}
			if( context.constants ){
				pool = pool.concat(this.staticSuggestions.constants);
			}
		}

		for( const item of pool ){
			if( !item || !item.hasOwnProperty('text') ) continue;
			if( item.text.toLowerCase().indexOf(lowerCasePrefix) !== 0 ) continue;
			completions.push( this.buildSuggestionEntry(item) );
		}

		//console.log('completions=%o', completions);

		return completions;
	},
	parsePHP: function( request ){
		let editor = request.editor;
		const phpScript = 'get_user_all.php'
		let proc = exec.spawn( exwModule.executablePath, [__dirname + '/php/' + phpScript] );

		var output = '';
		let path = (editor.getPath() || '');

		if( this.lastPath != path ){
			this.userSuggestions = null;
		}

		this.lastPath = path;

		proc.stdin.write(editor.getText());
		proc.stdin.end();

		proc.stdout.on('data', (data) => {
			output = output + data;
		});

		proc.stderr.on('data', (data) => {
			console.log('[EXW-IDE] PHP Autocomplete Error: ' + data);
		});

		proc.on('close', (code) => {
			try {
				let o = JSON.parse(output);
				this.userSuggestions = o;
			} catch (e) {

			}
		});


	}
}

var exwModule = {
	name: 'ACPHP',
	ide: null,
	autocomplete: null,
	executablePath: 'php',
	jslintConfig: null,
	initialize: function(ide){
		this.ide = ide;

		if( ide.config ){
			if( !ide.config.data.hasOwnProperty('php_executable_path') ){
				ide.config.set('php_executable_path', 'php');
				ide.config.save();
			}else{
				this.executablePath = ide.config.get('php_executable_path');
			}
		}

		var diagnostics = atom.packages.getActivePackage('atom-ide-diagnostics');
		console.log('diagnostics %o', diagnostics.mainModule);


		var autocomplete = atom.packages.getActivePackage('autocomplete-plus');
		if(!autocomplete) return;
		if(!autocomplete.mainModule) return;
		console.log(autocomplete.mainModule);
		this.autocomplete = autocomplete.mainModule;




		provider.initialize(ide);
		linterProviderPHP.initialize(ide);

		this.autocomplete.consumeProvider(provider, 4);

		diagnostics.mainModule.consumeLinterProvider(linterProviderPHP);


		linterProviderJS.initialize(ide);
		diagnostics.mainModule.consumeLinterProvider(linterProviderJS);
	},
};


export default exwModule;
