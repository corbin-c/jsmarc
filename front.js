import { Workerify } from "https://corbin-c.github.io/workerify/workerify.js";
import * as Marc from "./parser.js";
import * as MarcHelper from "./helper.js";

const mkContext = (obj) => {
  return Object.keys(obj).map(e => {
    return {name:e,value:obj[e]};
  });
}
const parse = Workerify(Marc.parseRecord,mkContext(Marc),10);
const filter = Workerify(Marc.filterRecord,[],10);

let inputToStr = (input) => {
  return new Promise((resolve,reject) => {
    var reader = new FileReader();
    reader.addEventListener("load", (e) => {
      resolve(e.target.result)
    });
    reader.readAsText(input.files[0]);
  })
};

let makeLabel = (label,parent) => {
  if (typeof label !== "undefined") {
    let span = document.createElement("span");
    label = (typeof label === "string") ? label
      : label.filter(e => typeof e !== "undefined").join(" | ");
    span.innerText = label;
    span.classList.add("label");
    if (span.innerText != "") {
      parent.append(span);
    }
  }
}

let makeMarcView = (record) => {
  let template = document.querySelector("#marcView");
  let table = document.importNode(template.content, true).querySelector("table");
  table.querySelector(".rawRecord").innerText = record.rawRecord;
  let body = table.querySelector("tbody");
  record.fields.map(e => {
    let fieldLine = document.createElement("tr");
    let field = document.createElement("td");
    let indicator = document.createElement("td");
    let subfield = document.createElement("td");
    let value = document.createElement("td");
    field.innerText = e.code;
    indicator.innerText = (e.indicator || "").replace(/ /g,"_");
    makeLabel(e.label,field);
    makeLabel(e.indicators_label,indicator);  
    fieldLine.append(field);
    fieldLine.append(indicator);
    fieldLine.append(subfield);
    fieldLine.append(value);
    body.append(fieldLine);
    if (typeof e.subfields === "undefined") {
      value.innerText = e.value;
    } else {
      field.setAttribute("rowspan",Object.keys(e.subfields).length);
      indicator.setAttribute("rowspan",Object.keys(e.subfields).length);
      Object.keys(e.subfields).map((s,i) => {
        let line = fieldLine;
        if (i > 0) {
          line = document.createElement("tr");
          subfield = document.createElement("td");
          value = document.createElement("td");
          line.append(subfield);
          line.append(value);
          body.append(line);
        }
        subfield.innerText = e.subfields[s].code;
        value.innerText = e.subfields[s].value;
        makeLabel(e.subfields[s].label,subfield);
      });
    }
  });
  return table;
}

const operations = {
  display: async (records,params={}) => {
    await MarcHelper.formats;
    const helper = Workerify(MarcHelper.explainRecord,mkContext(MarcHelper),10);
    records.split(JSON.parse('"'+document.querySelector("#cfn").value+'"')).map(async (e,i) => {
      console.log(e);
      if (["","\n"].indexOf(e) < 0) {
        e = await parse(e);
        e = await helper(e,"unimarc");
        document.querySelector("#results").append(makeMarcView(e));
      }
    });
  }
}
document.querySelector("#submit").addEventListener("click",async () => {
  let mode = document.querySelector("#mode").value;
  let records = await inputToStr(document.querySelector("#inputFile"));
  operations[mode](records);
});
/*
(async () => {
  let rec = ""
  let z = await parse(rec);
  console.log(z.fields.find(e => e.code == "856"));
  console.log(await filter(z,{field:"856",subfield:"u",values:["http://journals.openedition.org/anatoli"]}));

})()
*/
