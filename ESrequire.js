const fs = require("fs");
ESrequire = (path) => {
  path = fs.readFileSync(path,"utf8");
  path = path.replace("\nexport {","\nmodule.exports = {");
  return eval(path);
}
module.exports = (path) => ESrequire(path);
