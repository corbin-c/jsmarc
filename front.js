import { Workerify } from "../workerify/workerify.js";
import * as Marc from "./parser.js";
let context = Object.keys(Marc).map(e => {
  return {name:e,value:Marc[e]};
});
let parse = Workerify(Marc.parseRecord,context);
let filter = Workerify(Marc.filterRecord);
(async () => {
  let rec = ""
  let z = await parse(rec);
  console.log(z.fields.find(e => e.code == "856"));
  console.log(await filter(z,{field:"856",subfield:"u",values:["http://journals.openedition.org/anatoli"]}));

})()
