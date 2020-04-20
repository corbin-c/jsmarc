# JsMarc

JsMarc is a Vanilla-JS utility designed by Clément Corbin to handle bibligraphic
MARC (MAchine Readable Cataloging) records, commonly used by libraries. 

## How to use it

JsMarc can be used in several ways: a web interface, a command-line tool and ES
modules are provided.

### Web application

This application relies on [Workerify](https://www.github.com/corbin-c/workerify/)
to execute JsMarc off the main event loop, by creating a handful of web workers
on the fly. These limit the risk of freezing the tab & improve performance on
large records batches.

Online JsMarc is available at https://corbin-c.github.io/jsmarc/app/

Main features are:

 * batch record parsing: displays all the records in a batch in a table, with the raw record followed by selected fields & subfields
 * batch record filtering: giving a list of values and a field, extracts the matching records from a batch
 * data extraction: parses records for a given set of fields and displays a summary
 * MARC help: displays meaning of fields/subfields codes on hover, provides help selecting fields

### NodeJS CLI Tool

**/!\ You'll need NodeJS locally installed to execute this script**

#### Installation

Just clone this repo (`git clone https://github.com/corbin-c/jsmarc.git`). You
might want to symlink the `marc-node` script to a local bin path.

#### Use

Execute `./marc-node` to run the CLI tool. Without parameters, it returns the following
help:

```
$ ./marc-node
Error: Mandatory argument: command

Usage: marc-node COMMAND FILE [OPTIONS]

If FILE is -, read stdin.

Commands:
	display
	filter
	extract
	help

Options:		Syntax: --KEY=VALUE
	encoding
	record-separator
	field-separator
	subfield-separator
	format
	fields
```

### Module

The tools presented above all relies on two ES modules, the parser and the
helper.

Import them with:

```javascript
import * as MarcParser from "https://corbin-c.github.io/jsmarc/src/parser.js";
import * as MarcHelper from "https://corbin-c.github.io/jsmarc/src/helper.js";
```

#### MarcParser

This module exports a few useful tools for working on MARC records.

First, it comes with a built-in field code reader, which allows one to pass
the MarcParser fields codes using the "traditional" notation, which consists of the field
code and the subfield code separated by a dollar sign (`$`). This notation can be
used when selecting fields to parse or to filter. For example, the ISBN in Marc21,
is located at subfield `a` of field `020`, which could be written as `020$a`.
Multiple fields may be selected, comma-separated. 

The `parseRecord()` function can be called with one record and a facultative set
of parameters:

```javascript
MarcParser.parseRecord(record,{
  toParse, //array of selected fields to work on, as field_code$subfield_code, eg ["856$u"]
  fieldSeparator,
  subfieldSeparator //in case the record is not ISO2709 compliant, one may want to adjust the separators
});
```

It outputs a `MarcParser` object, with the following properties:

```javascript
MarcParser {
  fieldSeparator: '',     //string from parameters
  subfieldSeparator: '',  //string from parameters
  rawRecord: '',          //string from record argument
  leader: '',             //24 first chars of record
  directory: [            //describes the position, code & length of each one of the fields
    { code: '001', length: '0012', position: '00000' },
    ...
  ],
  fields: [               //describes all fields
    { code: '123', value: 'string' },                     //fields without subfields only have a value
    { code: '456', indicator: '  ', subfields: [Array] }, //otherwise they contain an array of subfields
    ...                                                   //subfields are structured as { code: "",  value: "" } too
  ],
  '@fields': { code: '', indicator: '  ', subfields: [], value: '' },       //field template
  '@directory': { code: [ 0, 3 ], length: [ 3, 7 ], position: [ 7, 12 ] },  //directory template
  parseCode: '', //string from parameters
  header: '' //string: leader + directory
}
```

The `filterRecord()` function is meant to be used with the `.filter()` array method.
Given a parsed record (a `MarcParser object`), a set of values and a field
(as `field_code$subfield_code`, e.g. `856$u`), it returns `true` or `false` whether the
record matches the provided parameters.

#### MarcHelper

**/!\ This module can't work without the MarcParser, unless you build your own
`record` object, with the required structure.**

The MarcHelper module is able to read from MARC definitions files (see the [`definitions`](./definitions/)
folder for further details) and enrich records with labels explaining the fields,
subfields and indicators meanings.

It provides the `explainRecord` function, which takes a parsed Marc record and
a format as arguments. The function returns a promises which resolves when the MARC
definitions files have been loaded:

```javascript
await MarcHelper.explainRecord(parsedRecord,format);
```

This will return a record object, enriched with labels for each field, subfield and
indicator (if that label was found).
The `format` parameter has to match one of the keys of the [`formats.json`](./formats.json) object.

It is also possible to reverse search for field codes with the `searchField`
function. Given a string and a MARC format, it returns a promise, resolving in 
an array of code/label pairs:

```javascript
await MarcHelper.searchField("auteur","unimarc");

//expected ouput (truncated):
[
  { code: '200$c', value: "Titre propre d'un auteur différent" },
  { code: '488$a', value: 'Auteur[7x0 du document en relation]' },
  { code: '604', value: "Point d'accès sujet - Auteur/Titre" },
  { code: '604$a', value: 'Auteur' },
  { code: '701$4', value: "Auteur d'oeuvre adaptée ou continuée" },
  { code: '702$4', value: "Auteur d'oeuvre adaptée ou continuée" },
  ...
]
```
