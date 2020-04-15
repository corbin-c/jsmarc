const PARSER = new DOMParser();
const baseURL = "http://documentation.abes.fr/sudoc/formats/unmb/zones/";
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
let analyzeABES = (document) => {
  let mapping = {1:"ind1",2:"ind2",3:"subfields",5:"subfields.value",8:"subfield.description"}
  let field = {ind1:{},ind2:{},subfields:{}};
  field.value = document.querySelector("h1").innerText.split(": ")[1];
  let lines = [...[...document.querySelectorAll("table")][3].querySelectorAll("tr")].slice(2);
  lines.map(e => {
    let sub = {};
    let code = "";
    let value = "";
    let type = "";
    [...e.querySelectorAll("td")].map((cell,i) => {
      let map = mapping[i];
      let text = cell.innerText.replace(/\s+/g," ");
      if (text != " ") {
        if (typeof map !== "undefined") {
          if (i < 4) {
            type = map;
            code = text
          } else if (i == 5) {
            sub[text] = "";
          } else {
            value = text;
          }
        }
      }
    });
    if (type == "subfields") {
      if (Object.keys(sub).length > 0) {
        sub[Object.keys(sub)[Object.keys(sub).length-1]] = value;
      } else {
        sub["*"] = value;
      }
    } else {
      sub = value;
    }
    field[type][code] = sub;
  });
  return field;
};

let normalize = (fieldNumber) => {
  fieldNumber = fieldNumber.toString();
  while (fieldNumber.length < 3) {
    fieldNumber = "0"+fieldNumber;
  }
  return fieldNumber;
}

let getABES = async (code) => {
  code = normalize(code);
  let result = await requester(baseURL+code+".htm","iso-8859-1");
  result = PARSER.parseFromString(result, "text/html");
  try {
    result = analyzeABES(result);
  } catch(e) {
    console.error(e);
  }
  return {code,result};
};
(async () => {
  let fields = {};
  await Promise.all([...new Array(1000).fill(0)].map(async (e,i) => {
    let abes = await getABES(i);
    try {
      if (abes.result[Object.keys(abes.result)] !== null) {
        fields[abes.code] = abes.result;
      }
    } catch(e) {
      console.error(e);
    }
  }));
  document.querySelector("body").innerHTML = JSON.stringify(fields);
})();
