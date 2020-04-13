let bin = { //slice and length function adapted to work on binary count, not char count
  length:(str) => {
    try {
      return new Blob([str]).size; //browser context
    }
    catch {
      return Buffer.from(str).length; //node
    }
  },
  slice:(str,start,end) => {
    let length = end - start;
    for (let x=0;x<start;x++) {
      if (bin.length(str.slice(0,x)) == start) {
        start = x;
        break;
      }
    }
    str = str.slice(start)
    if (typeof end !== "undefined") {
      for (let x=0;x<end;x++) {
        if (bin.length(str.slice(0,x)) == (length)) {
          end = x;
          break;
        }
      }
      return str.slice(0,end)
    } else {
      return str;
    }
  }
}
const MARC = { //Template object
  fieldSeparator:"\u001e",
  subfieldSeparator:"\u001f",
  rawRecord:"",
  label:"",
  directory:[],
  fields:[],
  "@fields":{
    code:"",
    indicator:"  ",
    subfields:[],
    value:"",
  },
  "@directory":{
    code:[0,3],
    length:[3,7],
    position:[7,12]
  }
}
class MarcParser {
  constructor(rec,params={}) {
    Object.keys(MARC).map(e => { //locally reproduce the template
      this[e] = MARC[e];
    });
    //populate object
    this.rawRecord = rec;
    this.fieldSeparator = (params.fields || this.fieldSeparator);
    this.subfieldSeparator = (params.subfields || this.subfieldSeparator);
    this.toParse = (params.toParse || "*");
  }
  parse() {
    this.parseHeader();
    this.parseBody(this.body());
    return this;
  }
  parseHeader() {
    let rawDirectory = this.rawRecord.split(this.fieldSeparator)[0].slice(24);
    this.label  = this.rawRecord.slice(0,24);
    this.header = this.label+rawDirectory+this.fieldSeparator;
    this.directory = this.parseDirectory(rawDirectory);
  }
  parseDirectory(rawDir) {
    return [...(new Array(rawDir.length/12)).fill(0)].map((e,i) => {
      let index = rawDir.slice(i*12,(i+1)*12);
      e = {};
      Object.keys(this["@directory"]).map(k => {
        e[k] = index.slice(...this["@directory"][k]);
      });
      return e;
    });
  }
  parseBody(rawBody) {
    this.directory
      .filter(e => {
        if (this.toParse == "*") {
          return true;
        } else {
          return this.toParse.some(code => code == e.code)
        }
      })
      .map(e => {
        this.fields.push(this.parseField({
          code: e.code,
          value: bin.slice(rawBody,parseInt(e.position),parseInt(e.length)+parseInt(e.position))
        }));
      });
  }
  parseField(field) {
    field.value = field.value.split(this.fieldSeparator)[0];
    if (field.value.indexOf(this.subfieldSeparator) >= 0) {
      field.indicator = field.value.slice(0,2);
      field.subfields = field.value.slice(2).split(this.subfieldSeparator).slice(1).map(e => {
        let subfield = {}
        subfield.code = e.slice(0,1);
        subfield.value = e.slice(1);
        return subfield;
      });
      delete field.value;
    }
    return field;
  }
  body() {
    return bin.slice(this.rawRecord,bin.length(this.header));
  }
}
let parseRecord = (record,parameters) => {
  return new MarcParser(record,parameters).parse();
}
let filterRecord = (record,parameters) => {
  let filter = record.fields.find(f => f.code == parameters.field);
  if (typeof parameters.subfield !== "undefined") {
    filter = filter.subfields.find(s => s.code == parameters.subfield);
  }
  return parameters.values.some(value => value == filter.value);
}

export { bin, MARC, MarcParser, parseRecord,filterRecord }
