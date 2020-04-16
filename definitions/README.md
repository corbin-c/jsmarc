# JsMarc formats definitions

In order to display the meaning of the fields when working with records, JsMarc
relies on Marc formats definitions, stored in this folder in the form of JSON
files. You might want to ammend those definitions or even add your own. You can do
so by creating a JSON file which follows the required structure and add it to the list
under `../formats.json`.

## Structure

```javascript
{"fields": [
  "3-digits code": {
    "value": "description",
    "ind1":{
      "1-char code": "description",
      ...
    },
    "ind2": {
      "1-char code": "description",
      ...    
    },
    "subfields": {
      "1-char code": {
        "value":"description" //some fields expect contstraints on their value.
                              //if so, form matching pairs expected value -> meaning
                              //otherwise, value is wildcard *
      },
      ...     
    }
  }
]}
```

## Data sources

**/!\ Provided files describe bibliographic records, not authorities.**

### Unimarc

The definitions for Unimarc are from the ABES documentation:
http://documentation.abes.fr/sudoc/formats/unmb/index.htm

The lousy script used for data extraction is located at `./abes.js`

The ABES documentation is [CC BY-SA](http://creativecommons.org/licenses/by-nc-sa/3.0/fr/)
and so are these definitions.

**/!\ The Unimarc description is in French and may include non-standard variations**

### Marc21

The definitions for MARC21 are from the Library of Congress:

