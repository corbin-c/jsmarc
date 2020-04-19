const bin = { //slice and length function adapted to work on binary count, not char count
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
const analyzeFieldNotation = (str) => {
  if (str == "*") {
    return () => true;
  }
  str = str.split(",").map(f => {
    f = f.split("$");
    while (f[0].length < 3) {
      f[0] = "0"+f[0];
    }
    return { field:f[0],subfield:(f[1]||false) }
  });
  return function(recordPart) {
    if (recordPart.code.length == 3) {
      return str.map(e => e.field).some(code => code == recordPart.code);
    } else if (this.parentCode !== undefined) {
      return str.filter(e => e.field === this.parentCode)
        .map(e => e.subfield)
        .some(code => {
          if (code === false) {
            return true;
          } else {
            return code === recordPart.code;
          }
        });
    } else {
      return true;
    }
  }
}

const MARC = { //Template object
  fieldSeparator:"\u001e",
  subfieldSeparator:"\u001f",
  rawRecord:"",
  leader:"",
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
    Object.assign(this,JSON.parse(JSON.stringify(MARC))); //locally copy template
    //populate object
    this.rawRecord = rec;
    this.fieldSeparator = (params.fields || this.fieldSeparator);
    this.subfieldSeparator = (params.subfields || this.subfieldSeparator);
    this.parseCode = (params.toParse || "*");
  }
  toParse(code,parentCode=undefined) {
    return (...args) => {
      return analyzeFieldNotation(code).call({parentCode},...args);
    }
  }
  parse() { //main parser function
    try {
      this.parseHeader();
      this.parseBody(this.body());
    } catch (e) {
      console.error(e,this);
    }
    return this;
  }
  parseHeader() { //isolate the header (leader+directory)
    let rawDirectory = this.rawRecord.split(this.fieldSeparator)[0].slice(24); //25th char to first separator
    this.leader  = this.rawRecord.slice(0,24); //24 chars of the record
    this.header = this.leader+rawDirectory+this.fieldSeparator;
    this.directory = this.parseDirectory(rawDirectory);
  }
  parseDirectory(rawDir) { //divides the directory in 12-chars segments, sliced as code/length/position
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
    //read the directory for the fields to be parsed
    this.directory
      .filter(this.toParse(this.parseCode))
      .map(e => {
        this.fields.push(this.parseField({
            code: e.code,
            value: bin.slice(
              rawBody,
              parseInt(e.position),
              parseInt(e.length)+parseInt(e.position)
            )}));
        });
    this.fields = this.fields.filter(e => (typeof e.value !== "undefined" || e.subfields.length > 0));
  }
  parseField(field) {
    field.value = field.value.split(this.fieldSeparator)[0];
    if (field.value.indexOf(this.subfieldSeparator) >= 0) {
      field.indicator = field.value.slice(0,2);
      field.subfields = field.value
        .slice(2)
        .split(this.subfieldSeparator)
        .slice(1)
        .map(e => {
          let subfield = {}
          subfield.code = e.slice(0,1);
          subfield.value = e.slice(1);
          return subfield;
        });
      field.subfields = field.subfields
        .filter(this.toParse(this.parseCode,field.code))
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
let filterRecord = (record,field,values) => {
  field = (typeof field === "string") ? analyzeFieldNotation(field):field;
  console.log(field.toString());
  let filter = record.fields.find(field);
  if (typeof filter !== "undefined") {
    filter = filter.subfields.find(field,{parentCode:filter.code});
  }
  return (typeof filter !== "undefined")
    ? values.some(value => value == filter.value)
    : false;
}

export { bin, MARC, MarcParser, parseRecord, filterRecord, analyzeFieldNotation }
