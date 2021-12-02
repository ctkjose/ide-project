# ide-project package

This package adds features to improve PHP development in ATOM.

![A screenshot of your package](https://f.cloud.github.com/assets/69169/2290250/c35d867a-a017-11e3-86be-cd7c5bf3ff9b.gif)

## Dependancies ##

This package requires the following packages to be installed:

[atom-ide-ui](https://atom.io/packages/atom-ide-ui)<br>


## Panels ##

The project panel gets a section to list Open Files and access to user defined tools written in plain javascript.

A new Explorer Panel is added to access the source tree (symbols), bookmarks and other features in context of a file.

> The command `exw-ide:show-explorer` displays the Explorer Panel where symbols, bookmarks and others are displayed.

## Bookmarks ##

Toggle bookmarks to parts of your code with `CTRL-ALT-8` and press `CTRL-8` to cycle thru your bookmarks.

Use the commands `exw-ide:toggle-bookmark`, `exw-ide:jump-to-next-bookmark` when configuring your own Keybindings.

> HINT: Disable Github keybindings to remove keymap conflicts.

The command `exw-ide:show-explorer` displays the Explorer Panel where bookmarks are listed.

## Language Support ##

PHP scripts get autocomplete and a linter.

ESLINT is implemented as a linter for javascript code. This linter does not impose any particular code style or standard.

>

## Symbol Tree ##

A new Symbol Tree that displays code symbols (functions, objects, etc) found in your source code.

The Symbol Tree uses a grammar definition that can easily be modified to accommodate your needs. The first time this package is used a default grammar is placed in the file `~/.atom/exw_ide_sym_grammer.js`. Open this file to make your modifications and relaunch Atom.

> The command `exw-ide:show-explorer` displays the Explorer Panel where symbols are displayed.

> Press the keys `ctrl-r` or `cmd-r` to show a dialog to search for symbols. (Use command `exw-ide:show-symbols`).

The Symbol Tree allows special markers in your code as PRAGMA instructions for the IDE. A basic pragma allows you to add code bookmarks for special areas or as to-do reminders.

```js
//#MARK My comment here...
//#TODO Review this function
//#TODO
```
Markers use the syntax of single line comments for the given source code language. For example in css we would use:

```css
/* #MARK My comment here... */
```

## Configuration ##

The file `exw_ide_config_store.json` stores more advance configurations not available in settings. This file is found in your `~/.atom` folder.

Available keys:

| Config Key | Description |
| -- | -- |
| php_executable_path | String. Path to the cli PHP binary. Default is to look for PHP in the exported paths. |

This configuration file can also be used to add configuration keys for your user tools.

## User Tools ##

You can create your own tool scripts written in plain javascript to automate actions or add extra functionality.

Tool scripts are plain JS scripts that you place in the folder `~/atom/exw-ide-tools/`. The tool scripts are available in the Project Panel for easy access.

> Run the command `exw-ide:reload-tools` in Atom's Command Palette to reload changes you make to your tool scripts or close and reload Atom.

### Writing a tool script ###

A tool is a plain object that defines a `title` for the script and the corresponding action on a function `onAction`:

```js
tool = {
	title: 'Selection to string',
	onAction: function(){
		let editor = ide.getTextEditor();
		if(!editor) return;
		let selection = ide.editor.getSelection();
		if(!selection) return;

		if (!selection.endsWith('\n')) {
			selection += '\n';
		}
		var escaped = '\'' + selection.replace(/'/g, '\\\'').replace(/\n/g, '\\n\' + \n\'').replace(/\' \+ \n\'$/, '\';');

		ide.editor.insertText(escaped);
    }
}
```

The tool script creates a `tool` object with the definition of your tool command. The `onAction` property is the function where you place the code to be executed when the action is invoked.

You can also define an `onSave` function that will be executed whenever an editor file is saved.

Inside an action function the modules `atom`, `fs`, `path`, `console` are already ready loaded and available for your use.

Also a helper object `ide` is available. The `ide` object provides makes it easier to write tools without having to learn all of the Atoms internals.

```js

//Run commands
//Proxy for exec, see: https://nodejs.org/api/child_process.html
let cmdPromise = ide.exec(cmd, options);
//this function is resolved with an object {code, stdout, stderr}, where code is the exit code.

//Proxy for spawn, see https://nodejs.org/api/child_process.html
let cmdPromise = ide.spawn(cmd, args, options);

//Returns the active document a helper that wraps together related functionality found in Atom.
let doc = ide.getDocument();

//Returns the current TextEditor, see https://flight-manual.atom.io/api/v1.57.0/TextEditor/
let editor = ide.getTextEditor();

//Key-Value Pair storage
ide.config.set(key, value);
ide.config.get(key);
ide.config.save(); //save the kv store

//Simplified editor interface
let lng = ide.editor.getLanguage();
let textSize = ide.editor.getLength();
let text = ide.editor.getValue();
let text = ide.editor.getSelection();
let title = ide.editor.getTitle();
let filePath = ide.editor.getPath();
let filename = ide.editor.getFileName();


//Replaces the entire contents of the buffer with the given String
ide.editor.setValue(text);

//For each selection, replace the selected text with the given text.
ide.editor.insertText(aString, opIsSelected);


//Get instance of Atom's TextEditor
//https://flight-manual.atom.io/api/v1.57.0/TextEditor/
let textEditor = ide.editor.getTextEditor();

```
