const PARSER = new DOMParser();
const baseURL = "https://www.loc.gov/marc/bibliographic/concise/bd";
const requester = (url,encoding="utf-8") => {
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.addEventListener("loadend", () => {
      resolve(reader.result)
    });
    fetch(url)
      .then(response => response.blob())
      .then(blob => reader.readAsText(blob, encoding))
  });
}
let analyzeLOC = (document) => {
  let existsAndClean = (selector) => {
    if (typeof selector === "string") {
      selector = document.querySelector(selector);
    }
    if (typeof selector !== "undefined") {
      try  {
        //console.log(selector);
        selector = (selector.innerText || selector.textContent);
        selector = selector.replace(/\s+/g," ")
                    .replace(/(^\s*|\s*$)/g,"");
      } catch {
        console.warn("nothing to replace",selector);
        return undefined;
      }
      if (selector != "") {
        return selector;
      }
    }
    return undefined;
  }
  let elementToValue = (element) => {
    try {
      let code = existsAndClean(element).split(" - ");
      let value = code[1];
      code = code[0].replace(/^\$/g,"");
      return {code,value};
    } catch(e) {
      console.warn("couldn't extract info from element",element,e);
    }
  }
  let getDetails = (indicators,subfields,targetSelectors) => {
    let lastdt;
    indicators = (targetSelectors.indicator == "dt") ? [indicators]:indicators;
    for (let indicator of [...indicators]) {
      if (targetSelectors.indicator != "dt") {
        lastdt = elementToValue(indicator.childNodes[0]);
      }
      for (let ind of [...indicator.children]) {
        if (ind.nodeName.toLowerCase() == targetSelectors.indicator) {
          lastdt = elementToValue(ind);
        } else {
          try {
            (ind.querySelector("span") || ind.querySelector("div")).remove();
          } catch {
            console.warn("nothing to remove from indicator",ind);
          }
          ind = elementToValue(ind);
          if (ind.value !== "Undefined") {
            if (ind.code.indexOf("-") > 0) {
              let min = parseInt(ind.code.split("-")[0]);
              let max = parseInt(ind.code.split("-")[1]);
              for (let x=min;x<=max;x++) {
                field["ind"+(1+(lastdt.code == "Second")*1)][x] = lastdt.value+" - "+ind.value;
              }
            } else {
              field["ind"+(1+(lastdt.code == "Second")*1)][ind.code] = lastdt.value+" - "+ind.value;
            }
          }
        }
      }
    }
    for (let sf of [...subfields]) {
      try {
        (sf.querySelector("span") || sf.querySelector("div")).remove();
      } catch {
        console.warn("nothing to remove from subfield",sf);
      }
      sf = elementToValue(sf);
      field.subfields[sf.code] = {"*":sf.value};
    }
  }
  let field = {ind1:{},ind2:{},subfields:{}};
  field.value = (existsAndClean([...document.querySelectorAll("h1 span")][1])
    || existsAndClean("h1").split(" - ")[1].split(" (")[0]);
  let details = (existsAndClean(".definition div p") || existsAndClean("p"));
  if (typeof details !== "undefined") {
    field.value += "\n"+details;
  }
  try {
    if (document.querySelector("dl") !== null) {
      getDetails(document.querySelector(".indicators dl"),
        [...document.querySelectorAll(".subfields dt")],
        {indicator:"dt"});
    } else {
     getDetails([...document.querySelectorAll("body>.indicatorvalue")],
      [...document.querySelectorAll(".subfieldvalue")],
      {indicator:""});
    }
  } catch(e) {
    console.warn("only field definition was extracted",field.value,e);
  }
  return field;
};

let normalize = (fieldNumber) => {
  fieldNumber = fieldNumber.toString();
  while (fieldNumber.length < 3) {
    fieldNumber = "0"+fieldNumber;
  }
  return fieldNumber;
}

let getLOC = async (code) => {
  code = normalize(code);
  let result = await requester(baseURL+code+".html");
  result = PARSER.parseFromString(result, "text/html");
  try {
    result = analyzeLOC(result);
  } catch(e) {
    console.error(e);
  }
  return {code,result};
};

(async () => {
  let fields = {};
  await Promise.all([...new Array(1000).fill(0)].map(async (e,i) => {
    let marc = await getLOC(i);
    try {
      if (marc.result[Object.keys(marc.result)] !== null) {
        fields[marc.code] = marc.result;
      }
    } catch(e) {
      console.error(e);
    }
  }));
  //console.log(fields);
  document.querySelector("body").innerHTML = JSON.stringify(fields);
})();
