let invert = (str) => "[30m[107m"+str+"[0m";
let show = (field,value) => {
  process.stdout.columns;
  let tabToSpace = (str) => str.replace(/\t/g,"    ");
  let divide = (str,limit) => {
    let out = [];
    let line = "";
    str.split(" ").map((e,i,a) => {
      if (line.length+e.length+1 < limit) {
        line += " "+e;
      } else {
        out.push(line);
        line = e;
      }
      if ((i == a.length-1) && (out.push[out.length-1] != line)) {
        out.push(line)
      }
    });
    return out;
  };
  let width = field.length+8;
  value = divide(value,(process.stdout.columns-width));
  value = value.map((e,i) => {
    if (i == 0) {
      e = "    "+invert(field)+"\t"+e;
    } else {
      e = "\t"+invert(field.replace(/./g," ").slice(0,-1))+"\t "+e;
    }
    console.log(e);
  })
}
let displayRecord = async (record,help=false) => {
  if (help) {
    record = await MarcHelper.explainRecord(record,help);
  }
  show("Leader",record.leader);
  record.fields.map(e => {
    if (typeof e.value !== "undefined") {
      if (help) {
        show((e.label||"").split("\n")[0]," ");
      }
      show(e.code,"\t "+e.value);
    } else {
      console.log();
      show("    "+e.code+"   ",(help)?invert((e.label||"").split("\n")[0]):" ");
      show("indicators",e.indicator.replace(/ /g,"_")+((help)?"\t"+invert(
        (e.indicators_label || []).filter(e => typeof e !== "undefined").join(" | ")
      ):""));
      e.subfields.map(s => {
        if (help) {
          show("\t        "+(s.label||"").split("\n")[0]," ");
        }
        show("\t"+e.code+"$"+s.code+" ",s.value);
      });
    }
  });
}
module.exports = { invert, show, displayRecord };
