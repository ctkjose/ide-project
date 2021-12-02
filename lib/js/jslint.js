'use babel';

/*
Jose L Cuevas
https://exponentialworks.com

This is an adaptation of jslint.mjs to run under node without external dependancies

Original version can be found at https://www.jslint.com/jslint.mjs

API Docs:
https://github.com/jslint-org/jslint#api-doc
https://kaizhu256.github.io/jslint/branch-alpha/.artifact/apidoc.html

Ref:
https://eslint.org/docs/user-guide/configuring/rules#configuring-rules
*/

const fs = require('fs');
const path = require('path');
const child_process =  require('child_process');
const url =  require('url');

//=======
/*
| Options | Description |
| -- | -- |
| allow_long_lines | Allow long lines. Set to `true` to allow long lines. Set to false to limit lines to `max_line_length`. |
| max_line_length | Default value is 80. The maximum lenght allowed for lines when `allow_long_lines` is false.  |
| tabs | true
*/

var jslint = {
	TYPE_WARNING: 3,
	TYPE_ERROR: 2,
	TK_IDENT: 'ident',
	TK_OP: 'op',
	TK_NUMBER: 'number',
	TK_STRING: 'str',
	TK_COMMENT: 'comment',
	TK_KEYWORD: 'keyword',
	TK_REGEX: 'regex',
	TK_EOF: 'eof',


	stop: function(state, code, line, column, a, b, c, d){
		let msg = this.createMessage(state, this.TYPE_ERROR, code, line, (column || jslint_fudge), a, b, c, d);
		state.results.push( msg );
		throw msg.message;
		return false;
	},
	emmitRule: function(state, code, line, column, a, b, c, d) {
		const opt = state.options[code];
		if(opt === "off") return false;
		if(opt === "error"){
			return this.emmitError(state, code, line, column, a, b, c, d);
		}

		return this.emmitWarning(state, code, line, column, a, b, c, d);
	},
	emmitWarning: function(state, code, line, column, a, b, c, d) {
		// Report an error at some line and column of the program. The warning object
		// resembles an exception.

        let msg = this.createMessage(state, this.TYPE_WARNING, code, line, (column || jslint_fudge), a, b, c, d);
		state.results.push( msg );

		return true;
	},
	emmitError: function(state, code, line, column, a, b, c, d) {
		// Report an error at some line and column of the program. The warning object
		// resembles an exception.

        let msg = this.createMessage(state, this.TYPE_ERROR, code, line, (column || jslint_fudge), a, b, c, d);
		state.results.push( msg );

		return true;
	},
	createMessage: function(state, type, code, line, column, a, b, c, d){


		const line_source = state.lines[line].text;

		var col = (column || jslint_fudge);
		col = Math.max(Math.min(col, line_source.length), jslint_fudge);
		var message = {
			severity: type,
			message: this.getDescriptionForCode(state, code, a, b, c),
			line: line,
			column: col,
			line_source: line_source
		};


		return message;
	},
	getDescriptionForCode: function(state, code, a, b, c){
		let mm = "";
		switch (code) {
			case "no_long_lines":
				const opt_line_size = (typeof(state.options.max_line_length) === "number") ? state.options.max_line_length : 80;
	            mm = `Line is longer than ${opt_line_size} characters.`;
	            break;
			case "no_tabs":
				mm = "Use spaces, not tabs.";
				break;

			case "no_irregular_whitespace":
				if(a && b){
					mm = `Invalid or irregular whitespace between '${a}' and '${b}'.`;
				}else if(a){
					mm = `Invalid or irregular whitespace near '${a}'.`;
				}else{
					mm = "Invalid or irregular whitespace.";
				}
				break;
			case "no_floating_decimal":
				if(a){
					mm = `A decimal point must be preceded or followed by a number in '${a}'.`;
				}else{
					mm = "A decimal point must be preceded or followed by a number.";
				}
				break;
			case "invalid_numeric":
				mm = `Invalid character in numeric literal '${a}'.`;
				break;
			case "invalid_regex":
				if(a && b){
					mm = `Invalid REGEX '${a}', unexpected '${b}'.`;
				}else if(a){
					mm = `Unexpected '${a}' in REGEX.`;
				}else{
					mm = "Invalid REGEX.";
				}
		        break;
			case "use_spaces":
	            mm = "Use spaces, not tabs.";
	            break;
        case "and":
            mm = `The '&&' subexpression should be wrapped in parens.`;
            break;
        case "bad_assignment_a":
            mm = `Bad assignment to '${a}'.`;
            break;
        case "bad_directive_a":
            mm = `Bad directive '${a}'.`;
            break;
        case "bad_get":
            mm = `A get function takes no parameters.`;
            break;
        case "bad_module_name_a":
            mm = `Bad module name '${a}'.`;
            break;
        case "bad_option_a":
            mm = `Bad option '${a}'.`;
            break;
        case "bad_set":
            mm = `A set function takes one parameter.`;
            break;
        case "duplicate_a":
            mm = `Duplicate '${a}'.`;
            break;
        case "empty_block":
            mm = `Empty block.`;
            break;
        case "expected_a":
            mm = `Expected '${a}'.`;
            break;
        case "expected_a_at_b_c":
            mm = `Expected '${a}' at column ${b}, not column ${c}.`;
            break;
        case "expected_a_b":
            mm = `Expected '${a}' and instead saw '${b}'.`;
            break;
        case "expected_a_b_before_c_d":
            mm = `Expected ${a} '${b}' to be ordered before ${c} '${d}'.`;
            break;
        case "expected_a_b_from_c_d":
            mm = (
                `Expected '${a}' to match '${b}' from line ${c}`
                + ` and instead saw '${d}'.`
            );
            break;
        case "expected_a_before_b":
            mm = `Expected '${a}' before '${b}'.`;
            break;
        case "expected_digits_after_a":
            mm = `Expected digits after '${a}'.`;
            break;
        case "expected_four_digits":
            mm = `Expected four digits after '\\u'.`;
            break;
        case "expected_identifier_a":
            mm = `Expected an identifier and instead saw '${a}'.`;
            break;
        case "expected_line_break_a_b":
            mm = `Expected a line break between '${a}' and '${b}'.`;
            break;
        case "expected_regexp_factor_a":
            mm = `Expected a regexp factor and instead saw '${a}'.`;
            break;
        case "expected_space_a_b":
            mm = `Expected one space between '${a}' and '${b}'.`;
            break;
        case "expected_statements_a":
            mm = `Expected statements before '${a}'.`;
            break;
        case "expected_string_a":
            mm = `Expected a string and instead saw '${a}'.`;
            break;
        case "expected_type_string_a":
            mm = `Expected a type string and instead saw '${a}'.`;
            break;
        case "freeze_exports":
            mm = (
                `Expected 'Object.freeze('. All export values should be frozen.`
            );
            break;
        case "function_in_loop":
            mm = `Don't create functions within a loop.`;
            break;
        case "infix_in":
            mm = (
                `Unexpected 'in'. Compare with undefined,`
                + ` or use the hasOwnProperty method instead.`
            );
            break;
        case "label_a":
            mm = `'${a}' is a statement label.`;
            break;
        case "misplaced_a":
            mm = `Place '${a}' at the outermost level.`;
            break;
        case "misplaced_directive_a":
            mm = `Place the '/*${a}*/' directive before the first statement.`;
            break;
        case "missing_await_statement":
            mm = `Expected await statement in async function.`;
            break;
        case "missing_m":
            mm = `Expected 'm' flag on a multiline regular expression.`;
            break;
        case "naked_block":
            mm = `Naked block.`;
            break;
        case "nested_comment":
            mm = `Nested comment.`;
            break;
        case "not_label_a":
            mm = `'${a}' is not a label.`;
            break;
        case "number_isNaN":
            mm = `Use Number.isNaN function to compare with NaN.`;
            break;
        case "out_of_scope_a":
            mm = `'${a}' is out of scope.`;
            break;
        case "redefinition_a_b":
            mm = `Redefinition of '${a}' from line ${b}.`;
            break;
        case "redefinition_global_a_b":
            mm = `Redefinition of global ${a} variable '${b}'.`;
            break;
        case "required_a_optional_b":
            mm = `Required parameter '${a}' after optional parameter '${b}'.`;
            break;
        case "reserved_a":
            mm = `Reserved name '${a}'.`;
            break;
        case "subscript_a":
            mm = `['${a}'] is better written in dot notation.`;
            break;
        case "todo_comment":
            mm = `Unexpected TODO comment.`;
            break;

        case "too_many_digits":
            mm = `Too many digits.`;
            break;
        case "unclosed_comment":
            mm = `Unclosed comment.`;
            break;
        case "unclosed_disable":
            mm = (
                `Directive '/*jslint-disable*/' was not closed`
                + ` with '/*jslint-enable*/'.`
            );
            break;
        case "unclosed_mega":
            mm = `Unclosed mega literal.`;
            break;
        case "unclosed_string":
            mm = `Unclosed string.`;
            break;
        case "undeclared_a":
            mm = `Undeclared '${a}'.`;
            break;
        case "unexpected_a":
            mm = `Unexpected '${a}'.`;
            break;
        case "unexpected_a_after_b":
            mm = `Unexpected '${a}' after '${b}'.`;
            break;
        case "unexpected_a_before_b":
            mm = `Unexpected '${a}' before '${b}'.`;
            break;
        case "unexpected_at_top_level_a":
            mm = `Expected '${a}' to be in a function.`;
            break;
        case "unexpected_char_a":
            mm = `Unexpected character '${a}'.`;
            break;
        case "unexpected_comment":
            mm = `Unexpected comment.`;
            break;
        case "unexpected_expression_a":
            mm = `Unexpected expression '${a}' in statement position.`;
            break;
        case "unexpected_label_a":
            mm = `Unexpected label '${a}'.`;
            break;
        case "unexpected_parens":
            mm = `Don't wrap function literals in parens.`;
            break;
        case "unexpected_space_a_b":
            mm = `Unexpected space between '${a}' and '${b}'.`;
            break;
        case "unexpected_statement_a":
            mm = `Unexpected statement '${a}' in expression position.`;
            break;
        case "unexpected_trailing_space":
            mm = `Unexpected trailing space.`;
            break;
        case "unexpected_typeof_a":
            mm = (
                `Unexpected 'typeof'. Use '===' to compare directly with ${a}.`
            );
            break;
        case "uninitialized_a":
            mm = `Uninitialized '${a}'.`;
            break;
        case "unopened_enable":
            mm = (
                `Directive '/*jslint-enable*/' was not opened`
                + ` with '/*jslint-disable*/'.`
            );
            break;
        case "unreachable_a":
            mm = `Unreachable '${a}'.`;
            break;
        case "unregistered_property_a":
            mm = `Unregistered property name '${a}'.`;
            break;
        case "unused_a":
            mm = `Unused '${a}'.`;
            break;
        case "use_double":
            mm = `Use double quotes, not single quotes.`;
            break;
        case "use_open":
            mm = (
                `Wrap a ternary expression in parens,`
                + ` with a line break after the left paren.`
            );
            break;

        case "var_on_top":
            mm = `Move variable declaration to top of function or script.`;
            break;
        case "var_switch":
            mm = `Don't declare variables in a switch.`;
            break;
        case "weird_condition_a":
            mm = `Weird condition '${a}'.`;
            break;
        case "weird_expression_a":
            mm = `Weird expression '${a}'.`;
            break;
        case "weird_loop":
            mm = `Weird loop.`;
            break;
        case "weird_property_a":
            mm = `Weird property name '${a}'.`;
            break;
        case "weird_relation_a":
            mm = `Weird relation '${a}'.`;
            break;
        case "wrap_condition":
            mm = `Wrap the condition in parens.`;
            break;
        case "wrap_immediate":
            mm = (
                `Wrap an immediate function invocation in parentheses to assist`
                + ` the reader in understanding that the expression is the`
                + ` result of a function, and not the function itself.`
            );
            break;
        case "wrap_parameter":
            mm = `Wrap the parameter in parens.`;
            break;
        case "wrap_regexp":
            mm = `Wrap this regexp in parens to avoid confusion.`;
            break;
        case "wrap_unary":
            mm = `Wrap the unary expression in parens.`;
            break;
        }

		return mm;
	}
}
function createState(config){
	let state = {
		abort: false,
		results: [],
		options: {
			no_long_lines: false,
			max_line_length: 80,
			no_tabs: false, 		//disallow all tabs
			no_floating_decimal: true, //A float value must hava a decimal point preceded or followed by a number.
			no_irregular_whitespace: false,
			beta: false,           // Enable experimental warnings.
			bitwise: true,        // Allow bitwise operators.
			browser: true,         // Assume browser environment.
			node: false,            // Assume Node.js environment.
			convert: true,         // Allow conversion operators.
			couch: false,           // Assume CouchDb environment.
			devel: true,           // Allow console.log() and friends.
			eval: true,            // Allow eval().
			for: true,             // Allow for-statement.
			getset: true,          // Allow get() and set().
			indent2: false,         // Use 2-space indent.
			long: true,            // Allow long lines.
			name: true,            // Allow weird property names.
			single: true,          // Allow single-quote strings.
			test_cause: true,      // Test jslint's causes.
			test_internal_error: false,     // Test jslint's internal-error handling-ability.
			this: true,            // Allow 'this'.
			trace: false,           // Include jslint stack-trace in warnings.
			unordered: true,       // Allow unordered cases, params, properties, and variables.
			variable: false,        // Allow unordered const and let declarations that are not at top of function-scope.
			white: false,
		},
		globals: {},
		isRuleOn: function(k){
			if(!this.options.hasOwnProperty(k)) return false;
			let v = this.options[k];
			if( v === 'off' ) return false;
			if( v === false ) return false;

			return true;
		},
		setOption: function(k, v){
			this.options[k] = v;
		},
		line: 0,
		column: 0,
		token_prv: null,
		token_prv_expr: null,	// The token_prv_expr token is a previous token that was not a comment.
		token_list: []
	};



	state.token_global = {        // The global object; the outermost context.
		async: 0,
		body: true,
		context: empty(),
		finally: 0,
		from: 0,
		id: "(global)",
		level: 0,
		line: jslint_fudge,
		live: [],
		loop: 0,
		switch: 0,
		thru: 0,
		try: 0
    };

	// The previous token including comments.
    state.token_prv = state.token_global;
	// The previous token excluding comments.
    state.token_prv_expr = state.token_global;


	if(config){
		if( config.hasOwnProperty("options") ){
			for( const key in Object.keys(config.options) ){
				let v = config.options[key];
				if(config.options[key] !== "off") v = false;
				state.setOption(key, v);
			}
		}
		console.log("options loaded");
		if(config.hasOwnProperty("globals") && Array.isArray(config.globals)){
			for( const v in  config.globals){
				state.globals[v] = 'ECMAScript';
			}
		}
		console.log("globals loaded");
		if(config.options['browser'] && config.hasOwnProperty("globals_browser") && Array.isArray(config.globals_browser)){
			for( const v in  config.globals_browser){
				state.globals[v] = 'browser';
			}
		}
		console.log("browser loaded");
		if(config.hasOwnProperty("globals_user") && Array.isArray(config.globals_user)){
			for( const v in  config.globals_user){
				state.globals[v] = 'user-defined';
			}
		}
		console.log("globals_user loaded");
	}

	return state;
}

function option_set_item(key, val) {

// These are the options that are recognized in the option object or that may
// appear in a /*jslint*/ directive. Most options will have a boolean value,
// usually true. Some options will also predefine some number of global
// variables.


	switch (key) {
	case "beta":            // Enable experimental warnings.
	case "bitwise":         // Allow bitwise operators.
	case "browser":         // Assume browser environment.
	case "convert":         // Allow conversion operators.
	case "couch":           // Assume CouchDb environment.
	case "devel":           // Allow console.log() and friends.
	case "ecma":            // Assume ECMAScript environment.
	case "eval":            // Allow eval().
	case "for":             // Allow for-statement.
	case "getset":          // Allow get() and set().
	case "indent2":         // Use 2-space indent.
	case "long":            // Allow long lines.
	case "name":            // Allow weird property names.
	case "node":            // Assume Node.js environment.
	case "single":          // Allow single-quote strings.
	case "test_cause":      // Test jslint's causes.
	case "test_internal_error":     // Test jslint's internal-error
									// ... handling-ability.
	case "this":            // Allow 'this'.
	case "trace":           // Include jslint stack-trace in warnings.
	case "unordered":       // Allow unordered cases, params, properties,
							// ... and variables.
	case "variable":        // Allow unordered const and let declarations
							// ... that are not at top of function-scope.
	case "white":           // Allow messy whitespace.
		option_dict[key] = val;
		break;
	default:
		return false;
	}

// Initialize global-variables.

	switch (val && key) {

// Assign global browser variables to global_dict.
/*
// /\*jslint beta, browser, devel*\/
console.log(JSON.stringify(Object.keys(window).sort(), undefined, 4));
*/

	case "browser":
		object_assign_from_list(global_dict, [

// Shared with Node.js.

			"AbortController",
			// "Buffer",
			"DOMException",
			"Event",
			"EventTarget",
			"MessageChannel",
			"MessageEvent",
			"MessagePort",
			"TextDecoder",
			"TextEncoder",
			"URL",
			"URLSearchParams",
			"WebAssembly",
			// "__dirname",
			// "__filename",
			// "atob",
			// "btoa",
			// "clearImmediate",
			"clearInterval",
			"clearTimeout",
			// "console",
			// "exports",
			// "global",
			// "module",
			"performance",
			// "process",
			"queueMicrotask",
			// "require",
			// "setImmediate",
			"setInterval",
			"setTimeout",
			"structuredClone",

// Web worker only.
// https://github.com/mdn/content/blob/main/files/en-us/web/api
// /workerglobalscope/index.md

			"importScripts",

// Window.

			// "CharacterData",
			// "DocumentType",
			// "Element",
			// "Event",
			"FileReader",
			// "FontFace",
			"FormData",
			"IntersectionObserver",
			"MutationObserver",
			// "Storage",
			// "TextDecoder",
			// "TextEncoder",
			// "URL",
			"Worker",
			"XMLHttpRequest",
			// "caches",
			// "clearInterval",
			// "clearTimeout",
			"document",
			// "event",
			"fetch",
			// "history",
			"indexedDb",
			"localStorage",
			"location",
			// "name",
			"navigator",
			// "screen",
			"sessionStorage",
			// "setInterval",
			// "setTimeout",
			"window"
		], "browser");
		break;

// https://docs.couchdb.org/en/stable/query-server/javascript.html#javascript

	case "couch":
		object_assign_from_list(global_dict, [
			"emit",
			"getRow",
			"isArray",
			"log",
			"provides",
			"registerType",
			"require",
			"send",
			"start",
			"sum",
			"toJSON"
		], "CouchDb");
		break;
	case "devel":
		object_assign_from_list(global_dict, [
			"alert", "confirm", "console", "prompt"
		], "development");
		break;

// These are the globals that are provided by the language standard.
// Assign global ECMAScript variables to global_dict.
/*
node --input-type=module --eval '
// /\*jslint beta, node*\/
import https from "https";
(async function () {
let dict = {import: true};
let result = "";
await new Promise(function (resolve) {
	https.get((
		"https://raw.githubusercontent.com/mdn/content/main/files"
		+ "/en-us/web/javascript/reference/global_objects/index.md"
	), function (res) {
		res.on("data", function (chunk) {
			result += chunk;
		}).on("end", resolve).setEncoding("utf8");
	});
});
result.replace((
	/\n- \{\{JSxRef\("(?:Global_Objects\/)?([^"\/]+?)"/g
), function (ignore, key) {
	if (globalThis.hasOwnProperty(key)) {
		dict[key] = true;
	}
	return "";
});
console.log(JSON.stringify(Object.keys(dict).sort(), undefined, 4));
}());
'
*/

	case "ecma":
		object_assign_from_list(global_dict, [
			"Array",
			"ArrayBuffer",
			"Atomics",
			"BigInt",
			"BigInt64Array",
			"BigUint64Array",
			"Boolean",
			"DataView",
			"Date",
			"Error",
			"EvalError",
			"Float32Array",
			"Float64Array",
			"Function",
			"Infinity",
			"Int16Array",
			"Int32Array",
			"Int8Array",
			"Intl",
			"JSON",
			"Map",
			"Math",
			"NaN",
			"Number",
			"Object",
			"Promise",
			"Proxy",
			"RangeError",
			"ReferenceError",
			"Reflect",
			"RegExp",
			"Set",
			"SharedArrayBuffer",
			"String",
			"Symbol",
			"SyntaxError",
			"TypeError",
			"URIError",
			"Uint16Array",
			"Uint32Array",
			"Uint8Array",
			"Uint8ClampedArray",
			"WeakMap",
			"WeakSet",
			"WebAssembly",
			"decodeURI",
			"decodeURIComponent",
			"encodeURI",
			"encodeURIComponent",
			"eval",
			"globalThis",
			"import",
			"isFinite",
			"isNaN",
			"parseFloat",
			"parseInt",
			"undefined"
		], "ECMAScript");
		break;

// Assign global Node.js variables to global_dict.
/*
node --input-type=module --eval '
// /\*jslint beta, node*\/
import moduleHttps from "https";
(async function () {
let dict = {};
let result = "";
await new Promise(function (resolve) {
	moduleHttps.get((
		"https://raw.githubusercontent.com/nodejs/node/master/doc/api"
		+ "/globals.md"
	), function (res) {
		res.on("data", function (chunk) {
			result += chunk;
		}).on("end", resolve).setEncoding("utf8");
	});
});
result.replace((
	/\n(?:\* \[`|## |## Class: )`\w+/g
), function (match0) {
	dict[match0.split("`")[1]] = true;
	return "";
});
console.log(JSON.stringify(Object.keys(dict).sort(), undefined, 4));
}());
'
*/

	case "node":
		object_assign_from_list(global_dict, [
			"AbortController",
			"Buffer",
			"DOMException",
			"Event",
			"EventTarget",
			"MessageChannel",
			"MessageEvent",
			"MessagePort",
			"TextDecoder",
			"TextEncoder",
			"URL",
			"URLSearchParams",
			"WebAssembly",
			"__dirname",
			"__filename",
			// "atob",
			// "btoa",
			"clearImmediate",
			"clearInterval",
			"clearTimeout",
			"console",
			"exports",
			"global",
			"module",
			"performance",
			"process",
			"queueMicrotask",
			"require",
			"setImmediate",
			"setInterval",
			"setTimeout",
			"structuredClone"
		], "Node.js");
		break;
	}
	return true;
}
async function moduleFsInit() {

// This function will import nodejs builtin-modules if they have not yet been
// imported.

// State 3 - Modules already imported.

    if (moduleFs !== undefined) {
        return;
    }

// State 2 - Wait while modules are importing.

    if (moduleFsInitResolveList !== undefined) {
        return new Promise(function (resolve) {
            moduleFsInitResolveList.push(resolve);
        });
    }

// State 1 - Start importing modules.
/*
    moduleFsInitResolveList = [];
    [
        moduleChildProcess,
        moduleFs,
        modulePath,
        moduleUrl
    ] = await Promise.all([
        import("child_process"),
        import("fs"),
        import("path"),
        import("url")
    ]);
    while (moduleFsInitResolveList.length > 0) {
        moduleFsInitResolveList.shift()();
    }
	*/
}



// init debugInline
let debugInline = (function () {
    let consoleError = function () {
        return;
    };
    function debug(...argv) {

// This function will print <argv> to stderr and then return <argv>[0].

        consoleError("\n\ndebugInline");
        consoleError(...argv);
        consoleError("\n");
        return argv[0];
    }
    debug(); // Coverage-hack.
    consoleError = console.error;
    return debug;
}());
let jslint_charset_ascii = (
    "\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007"
    + "\b\t\n\u000b\f\r\u000e\u000f"
    + "\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017"
    + "\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f"
    + " !\"#$%&'()*+,-./0123456789:;<=>?"
    + "@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_"
    + "`abcdefghijklmnopqrstuvwxyz{|}~\u007f"
);
let jslint_edition = "v2021.11.20";
let jslint_export;                      // The jslint object to be exported.
let jslint_fudge = 1;                   // Fudge starting line and starting
                                        // ... column to 1.
let jslint_import_meta_url = "";        // import.meta.url used by cli.
let jstestCountFailed = 0;
let jstestCountTotal = 0;
let jstestItCount = 0;
let jstestItList = [];
let jstestTimeStart;
let moduleChildProcess;
let moduleFs;
let moduleFsInitResolveList;
let modulePath;
let moduleUrl;

async function assertErrorThrownAsync(asyncFunc, regexp) {

// This function will assert calling <asyncFunc> throws an error.

    let err;
    try {
        await asyncFunc();
    } catch (errCaught) {
        err = errCaught;
    }
    assertOrThrow(err, "No error thrown.");
    assertOrThrow(
        regexp === undefined || new RegExp(regexp).test(err.message),
        err
    );
}

function assertJsonEqual(aa, bb, message) {

// This function will assert JSON.stringify(<aa>) === JSON.stringify(<bb>).

    aa = JSON.stringify(objectDeepCopyWithKeysSorted(aa));
    bb = JSON.stringify(objectDeepCopyWithKeysSorted(bb));
    if (aa !== bb) {
        throw new Error(
            JSON.stringify(aa) + " !== " + JSON.stringify(bb) + (
                message
                ? " - " + message
                : ""
            )
        );
    }
}

function assertOrThrow(condition, message) {

// This function will throw <message> if <condition> is falsy.

    if (!condition) {
        throw (
            (!message || typeof message === "string")
            ? new Error(String(message).slice(0, 2048))
            : message
        );
    }
}

function empty() {

// The empty function produces a new empty object that inherits nothing. This is
// much better than '{}' because confusions around accidental method names like
// 'constructor' are completely avoided.

    return Object.create(null);
}

function fsWriteFileWithParents(pathname, data) {
	// This function will write <data> to <pathname> and lazy-mkdirp if necessary.
	try {
		fs.writeFileSync(pathname,data);
    } catch (ignore) {

		fs.mkdirSync(modulePath.dirname(pathname), {
            recursive: true
        });

        fs.writeFileSync(pathname,data);
    }
}

function htmlEscape(str) {

// This function will make <str> html-safe by escaping & < >.

    return String(str).replace((
        /&/g
    ), "&amp;").replace((
        /</g
    ), "&lt;").replace((
        />/g
    ), "&gt;");
}

//#MARK jslint.verify
jslint.verify = function( source,  config ) {

	if(!config || !source || typeof(config) == "string"){
		return [];
	}

	let state = createState(config);

	// The array containing source lines
    state.lines = String("\n" + source).split(/\n|\r\n?/).map(function (s) {
        return {
            text: s,
			directive_quiet: false
        };
    });

	console.log('linter.state1 %o', state);

	console.log("creating lexer");
	let aLexer = new lexer(state);


	try {
		console.log("tokenize");
		aLexer.tokenize();
		console.log("lexer done");
	}catch(lexerError){
		console.log(lexerError);
	}


	console.log('linter.state2 %o', state);
	return state.results;

}




//#MARK lexer
//Produces a token list

//regex to break tokens
let rx_token = new RegExp(
	"^("
	+ "(\\s+)"
	+ "|([a-zA-Z_$][a-zA-Z0-9_$]*)"
	+ "|[(){}\\[\\],:;'\"~\\`]"
	+ "|\\?[?.]?"
	+ "|=(?:==?|>)?"
	+ "|\\.+"
	+ "|\\*[*\\/=]?"
	+ "|\\/[*\\/]?"
	+ "|\\+[=+]?"
	+ "|-[=\\-]?"
	+ "|[\\^%]=?"
	+ "|&[&=]?"
	+ "|\\"
	+ "|[|=]?"
	+ "|>{1,3}=?"
	+ "|<<?=?"
	+ "|!(?:!|==?)?"
	+ "|(0n?|[1-9][0-9]*n?)"
	+ ")"
	+ "(.*)$"
);
var lexer = function(state){
	this.state = state;

	this.line = 0;
	this.char;                   // The current character being lexed.
    this.column = 0;             // The column number of the next character.
    this.from;                   // The starting column number of the token.
    this.from_mega;              // The starting column of megastring.
	this.line_mega = '';

	this.line_whole = "";        // The whole line source string.
	this.line_source = "";       // The remaining line source string.
	this.snippet = ''; 			// A piece of string.

	this.mode_mega = false;
	this.mode_regexp = false;            // true if regular expression literal seen on this line.
	this.mode_directive = true;  // true if directives are still allowed.

// PHASE 2. Lex <line_list> into <token_list>.

}

lexer.rxIdentity = /^(([a-zA-Z_$][a-zA-Z0-9_$]*)|(0n?|[1-9][0-9]*n?)|(\/\/|\/\*|\*\/|\?\?\=|\&\&\=?|\|\|\=?|\+\+|\-\-|\=\>|\<\<\=?|\>\>\>?\=?|\*\*\=?|\^\=|[\>\<\+\-\*\!\=\&\%]=?|[\'\"\`\.\;]))(.*)$/;

lexer.keywords = [
	'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'delete', 'do', 'else',
	'enum', 'export', 'extends', 'false', 'true', 'finally', 'for', 'function', 'if', 'implements', 'import',
	'in', 'instanceof', 'interface', 'let', 'new', 'null', 'private', 'protected', 'public', 'return', 'super',
	'switch','static', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield'
];

lexer.isOperator = function(s, opPartial){
	let m = s.match(/^(\/\/|\/\*|\*\/|\?\?\=|\&\&\=?|\|\|\=?|\+\+|\-\-|\=\>|\<\<\=?|\>\>\>?\=?|\*\*\=?|\^\=|[\>\<\+\-\*\!\=\&\%]=?|[\'\"\`\.\;\/\\\(\)\[\]\{\}])(.*)$/);
	if(!m) return false;
	if(!opPartial && m[2]) return false;
	if(opPartial) return [m[1], m[2]];
	return true;
};
lexer.isIdentifier = function(s, opPartial){
	let m = s.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)(.*)$/);
	if(!m) return false;
	if(!opPartial && m[2]) return false;
	if(opPartial) return [m[1], m[2]];
	return true;
};
lexer.isNumber = function(s, opPartial){
	let m = s.match(/^(0n|0[xX][0-9ABCDEFabcdef]+n?|0[bB][10]+n?|0[oO][0-7]{1,3}|[0-9]+e[\+\-]?[0-9]+|[1-9][0-9]*n|[0-9]+\.[0-9]+|[0-9]+)(.*)$/);
	if(!m) return false;
	if(!opPartial && m[2]) return false;
	if(opPartial) return [m[1], m[2]];
	return true;
};
//#MARK lexer prototype

lexer.prototype.tokenize = function(){

	let state = this.state;
	let token_1;                // The first token.

	// Scan first line for "#!" and ignore it.

    if ( state.lines[jslint_fudge].text.startsWith("#!") ) {
        this.line += 1;
    }

    token_1 = this.lex_token();
    this.mode_json = token_1.value === "{" || token_1.value === "[";

// Lex/loop through each token until (end).

    while (true) {
        if ( this.lex_token().type === jslint.TK_EOF ) {
            break;
        }
    }
}



lexer.prototype.char_before = function(){

// Back up one character by moving a character from the end of the snippet to
// the front of the line_source.

	const state = this.state;

	this.char = this.snippet.slice(-1);
	this.line_source = this.char + this.line_source;
	this.column -= this.char.length;

// Remove last character from snippet.

	this.snippet = this.snippet.slice(0, -1);
	return this.char;
}


lexer.prototype.char_after = function(match) {
	// Get the next character from the source line. Remove it from the line_source,
	// and append it to the snippet. Optionally check that the previous character
	// matched an expected value.

	const state = this.state;
	if (match !== undefined && this.char !== match) {
		return (
			this.char === ""
			? jslint.stop(state, "expected_a", this.line, this.column - 1, match)
			: jslint.stop(state, "expected_a_b", this.line, this.column, match, this.char)
		);
	}

	this.char = this.line_source.slice(0, 1);
	this.line_source = this.line_source.slice(1);
	this.snippet += this.char || " ";
	this.column += 1;
	return this.char;
}

lexer.prototype.char_after_escape = function(extra) {
	// Validate char after escape "\\".

	const state = this.state;
	this.char_after("\\");

	switch (this.char) {
	case "":
		return jslint.stop( state, "unclosed_string", this.line, this.column );
	case "/":
		return this.char_after();
	case "\\":
		return this.char_after();
	case "`":
		return this.char_after();
	case "b":
		return this.char_after();
	case "f":
		return this.char_after();
	case "n":
		return this.char_after();
	case "r":
		return this.char_after();
	case "t":
		// test_cause:
		// ["\"\\/\\\\\\`\\b\\f\\n\\r\\t\"", "char_after_escape", "char_after", "", 0]
		return this.char_after();
	case "u":
		if (this.char_after("u") === "{") {
			if (state.mode_json) {
				jslint.emmitError( state, "unexpected_a", this.line, this.column, this.char );
			}
			if (this.read_digits("x") > 5) {
				jslint.emmitWarning( state, "too_many_digits", this.line, this.column );
			}
			if (this.char !== "}") {
				jslint.emmitError( state, "expected_a_before_b", this.line, this.column, "}", this.char );
			}
			return this.char_after();
		}
		this.char_before();
		if (this.read_digits("x", true) < 4) {
			jslint.emmitWarning( state, "expected_four_digits", this.line, this.column );
		}
		return;
	default:
		if (extra && extra.indexOf(this.char) >= 0) {
			return this.char_after();
		}


		jslint.emmitWarning( state, "unexpected_a_before_b", this.line, this.column, "\\", this.char);
	}
}

lexer.prototype.read_digits = function(base, quiet) {
	const state = this.state;
	let digits = this.line_source.match(
		base === "b"
		? (
			// rx_bits
			/^[01]*/
		)
		: base === "o"
		? (
			// rx_octals
			/^[0-7]*/
		)
		: base === "x"
		? (
			// rx_hexs
			/^[0-9A-F]*/i
		)
		: (
			// rx_digits
			/^[0-9]*/
		)
	)[0];

	let length = digits.length;
	if (!quiet && length === 0) {
		jslint.emmitWarning( state, "expected_digits_after_a", this.line, this.column, this.snippet);
	}

	this.column += length;
	this.line_source = this.line_source.slice(length);
	this.snippet += digits;
	this.char_after();
	return length;
}

lexer.prototype.read_line = function() {
	const state = this.state;
// Put the next line of source in line_source. If the line contains tabs,
// replace them with spaces and give a warning. Also warn if the line contains
// unsafe characters or is too damn long.


	this.column = 0;
	this.line += 1;
	this.mode_regexp = false;
	this.line_source = undefined;
	this.line_whole = "";

	if (state.lines[this.line] === undefined) {
		return this.line_source;
	}

	this.line_source = state.lines[this.line].text;
	this.line_whole = this.line_source;

	return this.line_source;
}

lexer.prototype.lex_string = function(quote) {
	const state = this.state;
	// Create a string token.

	let the_token;

	this.snippet = "";
	this.char_after();

	// Lex/loop through each character in "...".
	while (true) {
		switch (this.char) {
		case "":
			return jslint.stop( state, "unclosed_string", this.line, this.column );
		case "\\":
			this.char_after_escape(quote);
			break;
		case "`":
			if (this.mode_mega) {
				jslint.emmitWarning( state, "unexpected_a", this.line, this.column, "`");
			}
			this.char_after("`");
			break;
		case quote:
			// Remove last character from snippet.
			this.snippet = this.snippet.slice(0, -1);
			the_token = this.token_create(jslint.TK_STRING, this.snippet);
			the_token.quote = quote;
			return the_token;
		default:
			this.char_after();
		}
	}
}

lexer.prototype.token_create = function(type, value ) {
	const state = this.state;
// Create the token object and append it to token_list.
	if (!value) {
		value = type;
	}

	let token_prv = state.token_prv;
	let the_token = {
		type: type,
		value: value,
		from: this.from,
		line: this.line,
		nr: state.token_list.length,
		thru: this.column,

		keyword: null, //if ident matched a keyword, this has the keyword name
		dot: false //previous token was a dot, im an ident eg:  [.][identifier]
	};
	the_token.isIdent = function(){
		return (this.type == jslint.TK_STRING);
	};
	the_token.isLiteral = function(){
		return ((this.type == jslint.TK_STRING) || (this.type == jslint.TK_NUMBER));
	};
	the_token.toString = function(){
		return String(this.value);
	};

	state.token_list.push(the_token);



	// If this token is an identifier that touches a preceding number, or
	// a "/", comment, or regular expression literal that touches a preceding
	// comment or regular expression literal, then give a missing space warning.
	// This warning is not suppressed by option_dict.white.

	if (state.isRuleOn('no_irregular_whitespace') && this.line_source.endsWith(" ")) {
		jslint.emmitRule( state, "no_irregular_whitespace", this.line, this.line_source.length - 1);
	}

	if ( state.isRuleOn('no_irregular_whitespace') && state.token_prv.line === this.line
		&& token_prv.thru === this.from
		&& (type === jslint.TK_COMMENT || type === jslint.TK_REGEX || value === "/")
		&& (token_prv.type === jslint.TK_COMMENT || token_prv.type === jslint.TK_REGEX)
	) {
		jslint.emmitRule( state, "no_irregular_whitespace", this.line, this.column, token_prv.toString(), the_token.toString() );
	}

	console.log('no_floating_decimal=' + state.isRuleOn('no_floating_decimal'));
	console.log("prev token [%s], currnet=[%s]", token_prv.value, type);

	if ( state.isRuleOn('no_floating_decimal') && token_prv.value === "." && type === jslint.TK_NUMBER ) {
		jslint.emmitRule( state, "no_floating_decimal", this.line, this.column, value );
	}

	if ( state.token_prv_expr.value === "." && the_token.isIdent() ) {
		the_token.dot = true;
	}

// The previous token is used to detect adjacency problems.

	state.token_prv = the_token;

	// The token_prv_expr token is a previous token that was not a comment.
	// The token_prv_expr token
	// is used to disambiguate "/", which can mean division or regular expression
	// literal.

	if ( state.token_prv.type != jslint.TK_COMMENT ) {
		state.token_prv_expr = state.token_prv;
	}

	return the_token;
}

lexer.prototype.lex_comment = function(){
	const state = this.state;

	let body;
	let ii = 0;
	let jj = 0;
	let the_comment;

	// Create a comment object. Comments are not allowed in JSON text. Comments can
	// include directives and notices of incompletion.

	// Create token from comment //....

	if (this.snippet === "//") {
		this.snippet = this.line_source;
		this.line_source = "";
		the_comment = this.token_create("(comment)", this.snippet);
		if (this.mode_mega) {
			jslint.emmitError( state, "unexpected_comment", this.line, this.column, the_comment );
		}

		// Create token from comment /*...*/.
	} else {
		let csnippet = [];
		if (this.line_source[0] === "/") {
			jslint.emmitWarning( state, "unexpected_a", this.line, this.column + ii, "/");
		}

// Lex/loop through each line until "*/".

		while (true) {
			// rx_star_slash
			ii = this.line_source.indexOf("*/");
			if (ii >= 0) {
				break;
			}
			// rx_slash_star
			ii = this.line_source.indexOf("/*");
			if (ii >= 0) {
				jslint.emmitError( state, "nested_comment", this.line, this.column + ii);
			}
			csnippet.push(this.line_source);
			this.line_source = this.read_line();
			if (this.line_source === undefined) {
				return jslint.stop( state, "unclosed_comment", this.line, this.column );
			}
		}

		jj = this.line_source.slice(0, ii).search(/\/\*|\/$/);
		if (jj >= 0) {
			jslint.emmitError( state, "nested_comment", this.line, this.column + jj);
		}

		csnippet.push(this.line_source.slice(0, ii));
		this.snippet = csnippet.join(" ");

		this.column += ii + 2;
		this.line_source = this.line_source.slice(ii + 2);
		the_comment = this.token_create("(comment)", this.snippet);
	}

// Uncompleted work comment.

	if (
		!option_dict.devel
		&& (
			// rx_todo
			/\b(?:todo|TO\s?DO|HACK)\b/
		).test(snippet)
	) {

// test_cause:
// ["//todo", "lex_comment", "todo_comment", "(comment)", 1] //jslint-quiet

		warn("todo_comment", the_comment);
	}

// Lex directives in comment.

	[
		the_comment.directive, body
	] = Array.from(snippet.match(
		// rx_directive
		/^(jslint|property|global)\s+(.*)$/
	) || []).slice(1);
	if (the_comment.directive === undefined) {
		return the_comment;
	}
	directive_list.push(the_comment);
	if (!mode_directive) {

// test_cause:
// ["0\n/*global aa*/", "lex_comment", "misplaced_directive_a", "global", 1]

		jslint.emmitWarning( state, "misplaced_directive_a", this.line, this.from, the_comment.directive);
		return the_comment;
	}

// lex_directive();
// JSLint recognizes three directives that can be encoded in comments. This
// function processes one item, and calls itself recursively to process the
// next one.

// Lex/loop through each directive in /*...*/

	ii = 0;
	body.replace((
		// rx_directive_part
		/([a-zA-Z$_][a-zA-Z0-9$_]*)(?::\s*(true|false))?,?\s*|$/g
	), function (match0, key, val, jj) {
		if (ii !== jj) {

// test_cause:
// ["/*jslint !*/", "lex_comment", "bad_directive_a", "!", 1]

			return stop("bad_directive_a", the_comment, body.slice(ii));
		}
		if (match0 === "") {
			return "";
		}
		ii += match0.length;
		switch (the_comment.directive) {
		case "global":
			if (val) {

// test_cause:
// ["/*global aa:false*/", "lex_comment", "bad_option_a", "aa:false", 1]

				warn("bad_option_a", the_comment, key + ":" + val);
			}
			global_dict[key] = "user-defined";

// PR-347 - Disable warning "unexpected_directive_a".
//                 state.mode_module = the_comment;

			break;
		case "jslint":
			if (!option_set_item(key, val !== "false")) {

// test_cause:
// ["/*jslint undefined*/", "lex_comment", "bad_option_a", "undefined", 1]

				warn("bad_option_a", the_comment, key);
			}
			break;
		case "property":
			state.mode_property = true;
			tenure[key] = true;
			break;
		}
		return "";
	});
	return the_comment;
}

lexer.prototype.lex_number = function() {
	const state = this.state;
	let prefix = this.snippet;

	this.char_after();
	switch (prefix === "0" && this.char) {
	case "b":
	case "o":
	case "x":
		this.read_digits(this.char);

		if (this.char === "n") {
			this.char_after("n");
		}
		break;
	default:
		if (this.char === ".") {
			this.read_digits("d");
		}
		if (this.char === "E" || this.char === "e") {
			this.char_after(this.char);
			if (this.char !== "+" && this.char !== "-") {
				this.char_before();
			}
			this.read_digits("d");
		}
	}

// If the next character after a number is a digit or letter, then something
// unexpected is going on.

//#MARK LINT-CHECK invalid number
	if (
		(this.char >= "0" && this.char <= "9")
		|| (this.char >= "a" && this.char <= "z")
		|| (this.char >= "A" && this.char <= "Z")
	) {
		return jslint.stop(state, 'invalid_numeric', this.line, this.column, this.snippet.slice(-1), this.snippet.slice(0, -1) );
	}

	this.char_before();
	return this.token_create(jslint.TK_NUMBER, this.snippet);
}

lexer.prototype.lex_token = function() {
	const state = this.state;
	let match;

	// Lex/loop through each whitespace.

	while (true) {
		// Lex/loop through each blank-line.

		while (!this.line_source) {
			this.line_source = this.read_line();
			this.from = 0;
			if (this.line_source === undefined) {
				return (
					this.mode_mega
					? jslint.emmitError( state, "unclosed_mega", this.line_mega, this.from_mega)
					: this.token_create(jslint.TK_EOF)
				);
			}
		}
		this.from = this.column;

//#MARK  LINT-CHECK line size
		const opt_line_size = (typeof(state.options.max_line_length) === "number") ? state.options.max_line_length : 80;
		if ( state.isRuleOn('no_long_lines') && this.line_whole.length > opt_line_size &&
			!state.mode_json && token_1 && !mode_regexp
		) {
			jslint.emmitRule( state, "no_long_lines", this.line, this.column);
		}

//#MARK  LINT-CHECK use of tabs
		if (this.line_source.indexOf("\t") >= 0) {
			if ( state.options.no_tabs ) {
				jslint.emmitRule( state, "no_tabs", this.line, this.line_source.indexOf("\t") + 1);
			}

			this.line_source = this.line_source.replace((/\t/g), " ");
		}

		if (state.isRuleOn('no_irregular_whitespace') && this.line_source.endsWith(" ")) {
			jslint.emmitRule( state, "no_irregular_whitespace", this.line, this.line_source.length - 1);
		}

		if( (match = this.line_source.match(/^(\s+)(.*)$/)) ){
			this.snippet = match[1];
			this.column += this.snippet.length;
			this.line_source = match[2];
		}else{
			break;
		}
	}

	var token, m, type;

	const reduceLine = (value, leftover) => {
		token = value;
		this.snippet = value;
		this.line_source = leftover;
		this.column += this.snippet.length;
	};

	if( (m = lexer.isIdentifier(this.line_source, true)) ){
		type = jslint.TK_IDENT;

		reduceLine(m[0], m[1]);

		let tk = this.token_create(type, token);
		let kn = token.toLowerCase();
		if( lexer.keywords.indexOf( kn ) >= 0 ){
			tk.keyword = kn;
		}

		console.log('lex_token %s=[%s]  %s', type, token, this.line_source);

		return tk;
	}else if( (m = lexer.isNumber(this.line_source, true)) ){
		type = jslint.TK_NUMBER;

		reduceLine(m[0], m[1]);

		return this.lex_number();
	}else if( (m = lexer.isOperator(this.line_source, true)) ){
		type = jslint.TK_OP;

		reduceLine(m[0], m[1]);

		console.log('lex_token %s=[%s]  %s', type, token, this.line_source);

		// Create token from string "..." or '...'.
		if (token === "\"" || token === "'") {
			return this.lex_string(token);
		}

		// Create token from megastring `...`.
		if (token === "`") {
			return this.lex_megastring();
		}

		// Create token from comment /*...*/ or //....

		if (token === "/*" || token === "//") {
			return this.lex_comment();
		}

		// Create token from slash /.

		if (token === "/") {
			return this.lex_slash_or_regexp();
		}

		return this.token_create(type, token);

	}else{
		console.log(state);
		return jslint.stop( state, "unexpected_char_a", this.line, this.column, this.line_source[0]);
	}


}

lexer.prototype.lex_slash_or_regexp = function() {
	const state = this.state;
// The / can be a division operator or the beginning of a regular expression
// literal. It is not possible to know which without doing a complete parse.
// We want to complete the tokenization before we begin to parse, so we will
// estimate. This estimator can fail in some cases. For example, it cannot
// know if "}" is ending a block or ending an object literal, so it can
// behave incorrectly in that case; it is not meaningful to divide an
// object, so it is likely that we can get away with it. We avoided the worst
// cases by eliminating automatic semicolon insertion.

	let the_token;
	let token_prv_expr = state.token_prv_expr;


	switch (
		state.token_prv_expr.keyword
		&& !state.token_prv_expr.dot
		&& state.token_prv_expr.keyword
	) {
	case "case":
	case "delete":
	case "in":
	case "instanceof":
	case "new":
	case "typeof":
	case "void":
	case "yield":
		the_token = this.lex_regexp();
		return jslint.stop(state, "unexpected_a", this.line, this.column, the_token.value );
	case "return":
		return this.lex_regexp();
	}

	switch (!state.token_prv_expr.isIdent() && state.token_prv_expr.value.slice(-1)) {
	case "!":
	case "%":
	case "&":
	case "*":
	case "+":
	case "-":
	case "/":
	case ";":
	case "<":
	case ">":
	case "^":
	case "{":
	case "|":
	case "}":
	case "~":
		the_token = this.lex_regexp();
		this.emmitWarning(state, "wrap_regexp", this.line, this.column, the_token);
		return the_token;
	case "(":
	case ",":
	case ":":
	case "=":
	case "?":
	case "[":
		return this.lex_regexp();
	}

	if (this.line_source[0] === "=") {
		this.column += 1;
		this.line_source = line_source.slice(1);
		this.snippet = "/=";
		jslint.emmitWarning( state, "unexpected_a", this.line, this.column, "/=");
	}
	return this.token_create(jslint.TK_OP, this.snippet);
}

lexer.prototype.lex_regexp = function() {
	const state = this.state;

	// Regexp
	// Lex a regular expression literal.

	let flag={}, flags='';
	let mode_regexp_multiline = false;
	let mode_regexp_range = false;
	let result;
	let value;
	this.mode_regexp = true;

	let lex_regexp_bracketed = () => {

		// RegExp
		// Match a class.

		this.char_after("[");
		if (this.char === "^") {
			this.char_after("^");
		}
		while (true) {

		// RegExp
		// Match a character in a character class.

			switch (this.char) {
			case "":
			case "]":
				if (mode_regexp_range) {
					jslint.emmitWarning( state, "invalid_regex", this.line, this.column - 1, "]");
				}
				return this.char_after("]");
			case "-":
			case "/":
			case "[":
			case "^":
				jslint.emmitWarning( state, "invalid_regex", this.line, this.column, this.char);
				break;
			case "\\":
				this.char_after_escape("BbDdSsWw-[]^");
				this.char_before();
				break;
			case "`":
				if (this.mode_mega) {
					jslint.emmitWarning( state, "unexpected_a", this.line, this.column, "`");
				}
				break;
			}
			this.char_after();
			mode_regexp_range = false;
			if (this.char === "-") {

				// RegExp
				// Match a range of subclasses.
				mode_regexp_range = true;
				this.char_after("-");
			}
		}
	}

	let lex_regexp_group = () => {

		// RegExp
		// Lex sequence of characters in regexp.
		switch (this.char) {
			case "":
				jslint.emmitWarning( state, "expected_regexp_factor_a", this.line, this.column, this.char);
				break;
			case ")":
				jslint.emmitWarning( state, "expected_regexp_factor_a", this.line, this.column, this.char);
				break;
			case "]":
				jslint.emmitWarning( state, "expected_regexp_factor_a", this.line, this.column, this.char);
				break;
			default:
				value += this.char;
		}

		while (true) {
			switch (this.char) {
				case "":
				case ")":
				case "/":
				case "]":
					return;
				case "$":
					if (this.line_source[0] !== "/") {
						mode_regexp_multiline = true;
					}
					this.char_after();
					break;
				case "(":

					// RegExp
					// Match a group that starts with left paren.
					this.char_after("(");
					if (this.char === "?") {
						this.char_after("?");
						if (this.char === "=" || this.char === "!") {
							this.char_after();
						} else {
							this.char_after(":");
						}
					} else if (this.char === ":") {
						jslint.emmitWarning( state, "invalid_regex", this.line, this.column, ":");
					}

					// RegExp
					// Recurse lex_regexp_group().

					lex_regexp_group();
					this.char_after(")");
					break;
				case "*":
				case "+":
				case "?":
				case "{":
				case "}":

					jslint.emmitWarning( state, "invalid_regex", this.line, this.column, this.char);
					this.char_after();
					break;
				case "[":
					lex_regexp_bracketed();
					break;
				case "\\":
					this.char_after_escape("BbDdSsWw^${}[]():=!.|*+?");
					break;
				case "^":
					if (this.snippet == "^") {
						mode_regexp_multiline = true;
					}
					this.char_after();
					break;
				case "`":
					if (this.mode_mega) {
						jslint.emmitWarning( state, "invalid_regex", this.line, this.column, "`");
					}
					this.char_after();
					break;
				default:
					this.char_after();
			}

			// RegExp
			// Match an optional quantifier.

			switch (this.char) {
			case "*":
			case "+":
				if (this.char_after(this.char) === "?") {
					this.char_after("?");
				}
				break;
			case "?":
				if (this.char_after("?") === "?") {
					jslint.emmitWarning( state, "invalid_regex", this.line, this.column, this.char);
					this.char_after("?");
				}
				break;
			case "{":
				if (this.read_digits("d", true) === 0) {
					jslint.emmitWarning( state, "invalid_regex", this.line, this.column, ",");
				}
				if (this.char === ",") {
					this.read_digits("d", true);
				}
				if (this.char_after("}") === "?") {
					jslint.emmitWarning( state, "invalid_regex", this.line, this.column, this.char);
					this.char_after("?");
				}
				break;
			}
		}
	}

	// RegExp
	// Scan the regexp literal. Give a warning if the first character is = because
	// /= looks like a division assignment operator.

	this.snippet = "";
	this.char_after();
	if (this.char === "=") {
		jslint.emmitWarning( state, "invalid_regex", this.line, this.column, "\/\/", "=");
	}
	lex_regexp_group();

	// RegExp
	// Remove last character from snippet.

	this.snippet = this.snippet.slice(0, -1);

	// RegExp
	// Make sure there is a closing slash.
	this.char_after("/");


	value = this.snippet;
	// RegExp, Create flag.

	// Regexp, char is a letter.
	while ( (this.char >= "a" && this.char <= "z\uffff") || (this.char >= "A" && this.char <= "Z\uffff") ) {

		// RegExp, Process dangling flag letters.

		switch (!flag[this.char] && this.char) {
		case "g":
			break;
		case "i":
			break;
		case "m":
			break;
		case "u":
			break;
		case "y":
			break;
		default:
			jslint.emmitWarning( state, "invalid_regex", this.line, this.column, value, this.char);
		}
		flags += this.char;
		flag[this.char] = true;
		this.char_after();
	}

	this.char_before();
	if (this.char === "/" || this.char === "*") {
		return jslint.stop( state, "invalid_regex", this.line, this.from, value, this.char );
	}


	result = this.token_create(jslint.TK_REGEX, '/' + value + '/' + flags);
	result.regex = [value, flag];

	if (mode_regexp_multiline && !flag.m) {
		jslint.emmitWarning( state, "missing_m", this.line, this.column);
	}

	return result;
}

lexer.prototype.lex_megastring = function(){
	const state = this.state;
	let value;
	let match;

	// The token is a megastring. We don't allow any kind of mega nesting.

	if (this.mode_mega) {
		return jslint.stop( state, "expected_a_b", this.line, this.column, "}", "`" );
	}

	this.from_mega = this.from;
	this.line_mega = state.line;

	this.mode_mega = true;
	this.snippet = "";

	// Parsing a mega literal is tricky. First create a ` token.

	this.token_create(token_creatjslint.TK_OP, "`");
	this.from += 1;

	// Then loop, building up a string, possibly from many lines, until seeing
	// the end of file, a closing `, or a ${ indicting an expression within the
	// string.

	while (true) {
		// Vim-hack - vim-editor has trouble parsing '`' in regexp
		match = this.line_source.match(/[\u0060\\]|\$\{/) || { "0": "", index: 0 };

		this.snippet += this.line_source.slice(0, match.index);
		this.column += match.index;
		this.line_source = this.line_source.slice(match.index);
		match = match[0];

		switch (match) {
		case "${":

// if either ` or ${ was found, then the preceding joins the snippet to become
// a string token.

			this.token_create(jslint.TK_STRING, this.snippet).quote = "`";
			this.snippet = "";

// If ${, then create tokens that will become part of an expression until
// a } token is made.

			this.column += 2;
			this.token_create(jslint.TK_STRING, "${");
			this.line_source = this.line_source.slice(2);

// Lex/loop through each token inside megastring-expression `${...}`.

			while (true) {
				value = this.lex_token().value;
				if (value === "{") {
					return jslint.stop( state, "expected_a_b", this.line, this.column, "}", "{" );
				}
				if (value === "}") {
					break;
				}
			}
			break;
		case "\\":
			this.snippet += this.line_source.slice(0, 2);
			this.line_source = this.line_source.slice(2);
			this.column += 2;
			break;
		case "`":

// if either ` or ${ was found, then the preceding joins the snippet to become
// a string token.

			this.token_create(jslint.TK_STRING, this.snippet).quote = "`";
			this.snippet = "";

// Terminate megastring with `.

			this.line_source = this.line_source.slice(1);
			this.column += 1;
			this.mode_mega = false;
			return this.token_create(jslint.TK_STRING, "`");
		default:

// If neither ` nor ${ is seen, then the whole line joins the snippet.

			this.snippet += this.line_source + "\n";
			if (this.read_line() === undefined) {

// test_cause:
// ["`", "lex_megastring", "unclosed_mega", "", 1]

				return jslint.stop( state, "unclosed_mega", line_mega, from_mega );
			}
		}
	}
}




function noop(val) {

// This function will do nothing except return <val>.

    return val;
}

function objectDeepCopyWithKeysSorted(obj) {

// This function will recursively deep-copy <obj> with keys sorted.

    let sorted;
    if (typeof obj !== "object" || !obj) {
        return obj;
    }

// Recursively deep-copy list with child-keys sorted.

    if (Array.isArray(obj)) {
        return obj.map(objectDeepCopyWithKeysSorted);
    }

// Recursively deep-copy obj with keys sorted.

    sorted = {};
    Object.keys(obj).sort().forEach(function (key) {
        sorted[key] = objectDeepCopyWithKeysSorted(obj[key]);
    });
    return sorted;
}


// Export jslint as cjs/esm.

jslint_export = {
    jslint,
	lexer
};


console.log("is op1=true %o", lexer.isOperator("+="));
console.log("is op2=true %o", lexer.isOperator("+= name", true));
console.log("is op3=false %o", lexer.isOperator("+= name"));
console.log("is op4=false %o", lexer.isOperator("123 name", true));

export default jslint_export;
