const DEFINITIONS = "./formats.json";

let getJson = (() => {
  if (typeof module !== "undefined") { //Node
    const fs = require("fs");
    return (file) => {
      return JSON.parse(fs.readFileSync(file,"utf8"));
    }
  } else { //browser
    return async (file) => {
      return (await (await fetch(file)).json());
    }
  }
})();

let formats = ((form_defs) => {
  return new Promise(async (resolve,reject) => {
    form_defs = await getJson(form_defs);
    Object.keys(form_defs).map(async (e,i,a) => {
      form_defs[e] = await getJson(form_defs[e]);
      if (Object.keys(form_defs).length == a.length) {
        resolve(form_defs);
      }
    });
  });
})(DEFINITIONS);

(async () => {
  formats = await formats;
})()

let explainField = async (field,format) => {
  await formats;
  let code = field.code;
  if (typeof formats[format] !== "undefined") {
    if (typeof formats[format][code] !== "undefined") {
      field.label = formats[format][code].value;
      if (typeof field.indicator !== "undefined") {
        let indicators_label = [];
        field.indicator.split("").map((e,i) => {
          try {
            let target = (e == " ") ? "#":e;
            indicators_label.push(formats[format][code]["ind"+(i+1)][target]);
          } catch {
            console.warn("indicator not found");
          }
        });
        field.indicators_label = indicators_label;
      }
      if (typeof field.subfields !== "undefined") {
        field.subfields.map((e,i) => {
          let subfield_label = "";
          let subfield_definition = formats[format][code].subfields[e.code];
          if (typeof subfield_definition !== "undefined") {
            if (Object.keys(subfield_definition)[0] == "*") {
              subfield_label = subfield_definition["*"];
            }
            if (typeof subfield_definition[e.value] !== "undefined") {
              subfield_label = subfield_definition[e.value];
            }
          }
          field.subfields[i].label = subfield_label;
        });
      }
    }
  }
  return field;
};
let explainRecord = async (record,format) => {
  record.fields = await Promise.all(record.fields.map(async e => await explainField(e,format)));
  return record;
}
export { formats, explainField, explainRecord }
