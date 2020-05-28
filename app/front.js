import { Workerify } from "https://corbin-c.github.io/workerify/workerify.js";
import * as Marc from "../src/parser.js";
import * as MarcHelper from "../src/helper.js";

/* WORKERS DECLARATIONS */
const mkContext = (obj) => {
  return Object.keys(obj).map(e => {
    return {name:e,value:obj[e]};
  });
}
const parse = Workerify(Marc.parseRecord,mkContext(Marc),10);
const filter = Workerify(Marc.filterRecord,
  [{name:"analyzeFieldNotation",value:Marc.analyzeFieldNotation}],10);

/* UTILITY FUNCTIONS */
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

let makeDownload = (data,type,filename,urlonly=false) => {
  let a = window.document.createElement("a");
  a.href = window.URL.createObjectURL(new Blob([data], {type}));
  a.download = filename;
  if (urlonly) {
    return a.href;
  }
  document.body.appendChild(a);
  a.click();        
  document.body.removeChild(a);
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

let displayFieldsHelp = async (result,params) => {
  let table = document.querySelector("#helpbox table");
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
      let target = params.mode;
      target = {
        display:"toDisplay",
        extract:"filterField",
        summarize:"toExtract"
      }[target];
      if (typeof target !== "undefined") {
        let targetElement = document.querySelector("#"+target);
        if ((["*",""].indexOf(targetElement.value) >= 0)
          || (params.mode == "extract")){
          targetElement.value = e.code;
        } else {
          targetElement.value += ","+e.code; 
        }
        params[target] = targetElement.value;
      }
    });
    table.append(tr);  
  });
}

let activateSearch = (value="") => {
  if ((value == "disabled") || ((value == ""))) {
    document.querySelector("#search").setAttribute("disabled",true);
    document.querySelector("#startSearch").setAttribute("disabled",true);
  } else {
    document.querySelector("#search").removeAttribute("disabled");
    document.querySelector("#startSearch").removeAttribute("disabled");
  }
}

/* MAIN CONTROLLER */
(async (query,results) => {
  /* RESET */
  document.querySelector("#submit").setAttribute("disabled",true);
  activateSearch();
  [...document.forms].map(e => e.reset());
  let parameters = {};
  ["cfn","cfz","ssz","mode","helper","filterField","filterValues","toDisplay",
  "toExtract","cumul_values","output"]  //PARAMETERS ACQUISITION
    .map(e => {
      let onEvent = (targetValue) => {
        targetValue = (targetValue.getAttribute("type") == "checkbox")
          ? targetValue.checked
          : targetValue.value;
        parameters[e] = targetValue;
        if (e == "mode" && targetValue.length > 0) {
          let ops = { //MODE SELECTOR OPERATIONS MAP
            toggle:(values) => {
              ["toDisplay","helper","filterField","filterValues",
              "toExtract","cumul_values","output"].map((element,i) => {
                let action = "add";
                if (values.indexOf(i) >= 0) {
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
            display: () => { ops.toggle([0,1]) },
            extract:() => { ops.toggle([2,3]) },
            summarize:() => { ops.toggle([4,5,6]) },
          };
          ops[targetValue]();
        }
      }
      query.querySelector("#"+e).addEventListener("change",event => {
        onEvent(event.target);
      });
      onEvent(query.querySelector("#"+e));
    });

  /* HELPER INIT */
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
  const startSearch = async () => {
    if (document.querySelector("#search").value != "") {
      displayFieldsHelp(await search(
        document.querySelector("#search").value,
        document.querySelector("#search_format").value    
      ),parameters);
    }
  }
  /* MAIN OPERATIONS MAP
   * WORK ON A BATCH OF RECORDS
   * separator: parameters.cfn (end of record separator) */
  const operations = {
    display: async (records) => { //parses and displays the required fields of each record
      query.classList.add("hidden");
      results.classList.remove("hidden");
      records.split(JSON.parse('"'+parameters.cfn+'"'))
        .filter(e => ["","\n"].indexOf(e) < 0)
        .map(async (e,i) => {
          e = await parse(e,{toParse:parameters.toDisplay});
          if (parameters.helper != "disabled") {
            e = await helper(e,parameters.helper);
          }
          results.append(makeMarcView(e));
      });
    },
    extract: async (records) => { //parses only the field on which perform filter and then filters, outputs raw records (DL)
      let progess = document.querySelector("#progress");
      progress.classList.remove("hidden");
      let toParse = parameters.filterField;
      let filterValues = parameters.filterValues.split("\n").filter(e => e != "");
      if (toParse == "*") {
        throw new Error("A field to filter has to be selected");
      }
      if (filterValues.length == 0) {
        throw new Error("No values to filter provided");
      }
      records = records.split(JSON.parse('"'+parameters.cfn+'"'))
        .filter(e => ["","\n"].indexOf(e) < 0);
      progress.querySelector("progress").setAttribute("max",records.length);
      records = await Promise.all(
        records.map(async (e,i) => {
          e = await parse(e,{toParse});
          e = (await filter(e,toParse,filterValues))
            ? e.rawRecord
            : false; 
          progress.querySelector("progress").value++;
          return e;
        })
      );
      makeDownload(
        records.filter(e => e !== false).join(JSON.parse('"'+parameters.cfn+'"')),
        "text/iso2709",
        "records.mrc"
      );
      progress.classList.add("hidden");
    },
    summarize: async (records) => { //extract data from each record
      let progess = document.querySelector("#progress");
      progress.classList.remove("hidden");
      let output = {
        html: (data) => {
          
        },
        json: (data) => {
          data = makeDownload(data,"application/json","summary.json",true);
          window.location.href = data;
        }
      }
      let toParse = parameters.toExtract;
      if (toParse == "*") {
        throw new Error("Some fields have to be selected for extraction");
      }
      let summary = {};
      records = records.split(JSON.parse('"'+parameters.cfn+'"'));
      progress.querySelector("progress").setAttribute("max",records.length);
      await Promise.all(records
        .filter(e => ["","\n"].indexOf(e) < 0)
        .map(async (e,i) => {
          e = await parse(e,{toParse});
          progress.querySelector("progress").value++;
          e = await e.fields.map(e => {
            if (typeof e.value !== "undefined") {
              return [{ code: e.code, value: e.value }];
            } else {
              return e.subfields.map(f => {
                return { code: e.code+"$"+f.code, value: f.value };
              });
            }
          }).flat().map(field => {
            if (typeof summary[field.code] === "undefined") {
              summary[field.code] = [];
            }
            if (parameters.cumul_values) {
              //special duplicates reduce
            } else {
              summary[field.code].push(field.value);
            }
          });
        })
      );
      output[parameters.output](JSON.stringify(summary));
      progress.classList.add("hidden");
    }
  }
  
  /* EVENTS DISPATCH */
  query.querySelector("#submit").addEventListener("click",async () => {
    let mode = (document.querySelector("#mode").value || "display");
    let records = await inputToStr(document.querySelector("#inputFile"));
    [...results.children].map(e => {
      if (e.nodeName.toLowerCase() != "template") {
        e.remove();
      }
    });
    try {
      operations[mode](records);
    } catch (e) {
      alert(`Something went wrong.
Look at the browser console for more details.`);
      console.error(e);
    }
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
  document.querySelector("#inputFile").addEventListener("change",() => {
    document.querySelector("#submit").removeAttribute("disabled");
  });
  document.querySelector("#search_format").addEventListener("change",e => {
    activateSearch(e.target.value);
  });
  document.querySelector("#searchForm").addEventListener("submit", e => {
    e.preventDefault();
    startSearch();
  });
  document.querySelector("#startSearch").addEventListener("click",e => {
    startSearch();
  });
})(document.querySelector("#query"),document.querySelector("#results"));
