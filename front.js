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
                try {
                  query.querySelector("#h_"+element).classList[action]("hidden");
                } catch {
                  //console.warn("no helper");
                }
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
    query.querySelector("#search_format").append(option.cloneNode(true));
  });
  const helper = Workerify(MarcHelper.explainRecord,mkContext(MarcHelper),10);
  const search = Workerify(MarcHelper.searchField,mkContext(MarcHelper));
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
    },
    displayFieldsHelp: async (str,format) => {
      let result = await search(str,format);
      let table = query.querySelector("#helpbox table");
      table.innerHTML = "";
      if (result.length > 0) {
        table.classList.remove("hidden");
      } else {
        table.classList.add("hidden");
      }
      result.sort((a,b) => {
        return (parseInt(a.code.split("$")[0])-parseInt(b.code.split("$")[0]));
      }).map(e => {
        let tr = document.createElement("tr");
        let code = document.createElement("td");
        let value = document.createElement("td");
        tr.append(value);
        tr.append(code);
        code.innerText = e.code;
        code.setAttribute("class","code");
        value.innerText = e.value;
        tr.addEventListener("click",() => {
          let target = parameters.mode;
          target = {display:"toDisplay",extract:"toFilter"}[target];
          if (typeof target !== "undefined") {
            let targetElement = document.querySelector("#"+target);
            if (["*",""].indexOf(targetElement.value) >= 0) {
              targetElement.value = e.code;
            } else {
              targetElement.value += ","+e.code; 
            }
            parameters[target] = targetElement.value;
          }
        });
        table.append(tr);  
      });

    },
    startSearch: () => {
      if (query.querySelector("#search").value != "") {
        operations.displayFieldsHelp(
          document.querySelector("#search").value,
          document.querySelector("#search_format").value
        );
      }
    },
    activateSearch: (value) => {
      if ((value == "disabled") || ((value == ""))) {
        document.querySelector("#search").setAttribute("disabled",true);
        document.querySelector("#startSearch").setAttribute("disabled",true);
      } else {
        document.querySelector("#search").removeAttribute("disabled");
        document.querySelector("#startSearch").removeAttribute("disabled");
      }
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
  document.querySelector("#close").addEventListener("click",() => {
    query.querySelector("#helpbox table").innerHTML = "";
    query.querySelector("#helpbox table").classList.add("hidden");
    query.querySelector("#helpbox").classList.add("hidden");
  });
  [...document.querySelectorAll(".helper")].map(e => {
      e.addEventListener("click", () => {
        query.querySelector("#helpbox").classList.remove("hidden");
      });
  });
  document.querySelector("#search_format").addEventListener("change", (e) => {
    operations.activateSearch(e.target.value);
  });
  document.querySelector("#searchForm").addEventListener("submit", e => {
    e.preventDefault();
    operations.startSearch();
  });
  document.querySelector("#startSearch").addEventListener("click", async (e) => {
    operations.startSearch();
  });
  [...document.forms].map(e => e.reset());
  operations.activateSearch("");
})(document.querySelector("#query"),document.querySelector("#results"));
