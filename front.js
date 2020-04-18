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
      : label.filter(e => typeof e !== "undefined").join("\n");
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

(async (query,results) => {
  let parameters = {};
  ["cfn","cfz","ssz","mode","helper","filterField","filterValues","toDisplay"]
    .map(e => {
      let onEvent = (targetValue) => {
        parameters[e] = targetValue;
        if (e == "mode" && targetValue.length > 0) {
          let ops = {
            display:() => {
              ["toDisplay","filterField","filterValues"].map((element,i) => {
                let action = "add";
                if (i==0) {
                  action = "remove";
                }
                query.querySelector("#"+element).classList[action]("hidden");
                query.querySelector("#l_"+element).classList[action]("hidden");
              });
            },
            extract:() => {
            },
            summarize:() => {
            },
          };
          ops[targetValue]();
        }
      }
      query.querySelector("#"+e).addEventListener("change",event => {
        onEvent(event.target.value);
      });
      onEvent(query.querySelector("#"+e).value);
    });
  await MarcHelper.formats;
  Object.keys(MarcHelper.formats).map(e => {
    let option = document.createElement("option");
    option.value = e;
    option.innerText = e[0].toUpperCase()+e.slice(1);
    query.querySelector("#helper").append(option);
  });
  const helper = Workerify(MarcHelper.explainRecord,mkContext(MarcHelper),10);
  const operations = {
    display: async (records) => {
      records.split(JSON.parse('"'+parameters.cfn+'"')).map(async (e,i) => {
        if (["","\n"].indexOf(e) < 0) {
          let toParse = (parameters.toDisplay == "*") ?
            ["*"]:parameters.toDisplay.split(",").map(f => {
              while (f.length < 3) {
                f = "0"+f;
              }
              return f;
            });
          e = await parse(e,{toParse});
          if (parameters.helper != "disabled") {
            e = await helper(e,parameters.helper);
          }
          results.append(makeMarcView(e));
        }
      });
    }
  }
  query.querySelector("#submit").addEventListener("click",async () => {
    let mode = document.querySelector("#mode").value;
    let records = await inputToStr(document.querySelector("#inputFile"));
    query.classList.add("hidden");
    results.classList.remove("hidden");
    [...results.children].map(e => {
      if (e.nodeName.toLowerCase() != "template") {
        e.remove();
      }
    });
    operations[mode](records);
  });
  document.querySelector("h1").addEventListener("click",() => {
    query.classList.remove("hidden");
    results.classList.add("hidden");
  });
})(document.querySelector("#query"),document.querySelector("#results"));
