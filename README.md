# JsMarc

JsMarc is a Vanilla-JS utility designed by Clément Corbin to handle bibligraphic
MARC (MAchine Readable Cataloging) records, commonly used by libraries. 

## How to use it

JsMarc can be used in several ways: a web interface, a command-line tool and a
JavaScript module are provided.

### Web application

This application relies on [Workerify](https://www.github.com/corbin-c/workerify/)
to execute JsMarc off the main event loop, by creating a handful of web workers
on the fly. These limit the risk of freezing the tab & improve performance on large records batches.

Online JsMarc is available at https://corbin-c.github.io/jsmarc/app/

### NodeJS CLI Tool

**/!\ You'll need NodeJS locally installed to execute this script**

#### Installation

```
```

#### Use

### Module

The tools presented above all relies on two ES modules, the parser and the
helper.

#### MarcParser

#### MarcHelper

**/!\ This module can't work without the MarcParser, unless you build your own
`record` object, with the required fields and subfields structure.**

The MarcHelper module is able to read from MARC definitions files (see folder
[definitions](./definitions/) for furhter details) and enrich records with labels explaining
the fields, subfields and indicators meanings.
