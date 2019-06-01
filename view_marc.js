// INSTANTIATE WORKERS
marc_pre_parser = new Worker("parser.worker.js");
marc_parser = new Worker("parser.worker.js");
marc_summary = new Worker("summary.worker.js");
marc_filter = new Worker("filter.worker.js");

// GENERAL I/O FUNCTIONS
function get_param(id,u=false)
{
	return (u) ? JSON.parse('"'+document.getElementById(id).value+'"'):document.getElementById(id).value;
}
async function handle_input_file(input)
{
	input = await read(input.files[0])
	document.getElementById("marc_in").style = "display:none;";
	document.getElementById("progress").style = "display:block;";
	marc(input)
}
function read(what)
{
	return new Promise(function(resolve,reject){
		var reader = new FileReader();
		reader.addEventListener('load', function() {
			resolve(this.result)
		});
		reader.readAsText(what);
	})
}
function incr_wait(i,t,rand=false)
{
	t = (rand) ? Math.floor(t+2*t*Math.random()):t;
	return new Promise(function(resolve,reject){
		setTimeout(function(){
			resolve(i+1);
		},t)
	})
}
/*
 * 
 * MARC
 *
 */ 
async function marc(data)
{
// DATA PARSING
	data = data.split(get_param("cfn",true))
	config.records_done = 0;
	if (data[data.length-1].length <= 2)
	{
		data.pop();
		config.records = data.length;
		document.getElementById("sent").setAttribute("max",data.length);
		document.getElementById("parse").setAttribute("max",data.length);
		document.getElementById("analysis").setAttribute("max",data.length);
	}
// INIT WORKERS
	// Marc filter compares input with filter config and outputs matching record (false otherwise)
	marc_filter.postMessage({parameters:
		{
			filter:config.filter,
			filter_type:config.filter_type
		}
	});
	// Marc summary creates a summary of selected fields (lists all possible values and provides value count for each)
	marc_summary.postMessage({parameters:
		{
			indicators:config.indicators,
			excluded_subfields:config.excluded_subfields,
			concat_with:config.concat
		}
	});
	// Marc parser parses records & extracts specified fields for further work (filtering, summarizing)
	marc_pre_parser.postMessage({parameters:
		{
			cfz:get_param("cfz",true),
			ssz:get_param("ssz",true),
			fields:[Object.keys(config.filter)[0].split("$")[0]]
		}
	});
	marc_parser.postMessage({parameters:
		{
			cfz:get_param("cfz",true),
			ssz:get_param("ssz",true),
			fields:config.fields,
		}
	});
// HANDLE WORKERS RESPONSES
	marc_pre_parser.onmessage = function (e) {
			document.getElementById("parse").setAttribute("value",e.data.records);
			document.getElementById("parse").innerHTML = Number.parseFloat((e.data.records/document.getElementById("parse").getAttribute("max"))*100).toFixed(1)+"%";
			document.getElementById("l_parse").children[0].innerHTML = document.getElementById("parse").innerHTML;
			//if (e.data.recordID < 10) {console.log(e.data)}
			marc_filter.postMessage(e.data);
			//marc_summary.postMessage(e.data.fields);
		};
	marc_parser.onmessage = function (e) {
			//if (e.data.recordID < 10) {console.log(e.data)}
			//marc_filter.postMessage(e.data);
			//marc_summary.postMessage(e.data);
			marc_viz(e.data.fields,data[e.data.recordID]);
		};
	marc_filter.onmessage = function(e) {
		if (e.data)
		{
			marc_parser.postMessage({data:data[e.data.recordID],recordID:e.data.recordID});
		}
		else
		{
			config.records--;
			summarize_upd();
		}
	}
	marc_summary.onmessage = function (e) {
		if (typeof e.data.over !== "undefined")
		{
			console.log(e.data.fields)
		}
		else if (typeof e.data.added !== "undefined")
		{
			field_table = document.getElementById("table_"+e.data.field);
			if (field_table === null)
			{
				var field_table = document.createElement("table")
				field_table.setAttribute("id","table_"+e.data.field);
				var thead = document.createElement("thead");
				var tbody = document.createElement("tbody");
				var tr = document.createElement("tr");
				var tr2 = document.createElement("tr");
				thead.append(tr);
				thead.append(tr2);
				field_table.append(thead);
				field_table.append(tbody);
				var th = document.createElement("th");
				th.setAttribute("colspan",2);
				th.innerHTML = e.data.field;
				tr.append(th);
				var th_value = document.createElement("th");
				th_value.innerHTML = "Value";
				var th_count = document.createElement("th");
				th_count.innerHTML = "Count";
				tr2.append(th_value)
				tr2.append(th_count)
				document.querySelector("section").append(field_table);
			}
			var tr3 = document.createElement("tr");
			tr3.setAttribute("id","row_"+e.data.field+btoa(encodeURI(e.data.added.value)))
			var td = document.createElement("td");
			var td2 = document.createElement("td");
			td2.setAttribute("class","count");
			td.innerHTML = e.data.added.value
			td2.innerHTML = e.data.added.count
			tr3.append(td);
			tr3.append(td2);
			field_table.querySelector("tbody").append(tr3);
		}
		else if (typeof e.data.increment !== "undefined")
		{
			var tr = document.getElementById("row_"+e.data.field+btoa(encodeURI(e.data.increment.value)));
			count = tr.querySelector(".count");
			count.innerHTML = e.data.increment.count;
			var children = [...tr.parentElement.children]
			for (k=0;k<children.length;k++)
			{
				if (Number(children[k].children[1].innerHTML) < Number(count.innerHTML))
				{
					tr.parentElement.insertBefore(tr,document.getElementById(children[k].getAttribute("id")))
					break;
				}
			}
		}
		else
		{
			config.records_done = e.data.records;
			summarize_upd();
		}
	};
// START WORKING
	var r_s = 0;
	for (i in data)
	{
		if (config.filter_type !== false)
		{
			marc_pre_parser.postMessage({data:data[i],recordID:i});
		}
		else
		{
			marc_parser.postMessage({data:data[i],recordID:i});
		}
		await incr_wait(0,0);
		r_s++;
		document.getElementById("sent").setAttribute("value",r_s);
		document.getElementById("sent").innerHTML = Number.parseFloat((r_s/document.getElementById("sent").getAttribute("max"))*100).toFixed(1)+"%";
		document.getElementById("l_sent").children[0].innerHTML = document.getElementById("sent").innerHTML;
	}
}
function summarize_upd()
{
	document.getElementById("analysis").setAttribute("value",config.records_done);
	document.getElementById("analysis").setAttribute("max",config.records);
	document.getElementById("analysis").innerHTML = Number.parseFloat((config.records_done/document.getElementById("analysis").getAttribute("max"))*100).toFixed(1)+"%";
	document.getElementById("l_analysis").children[0].innerHTML = document.getElementById("analysis").innerHTML;
	if (config.records_done == config.records)
	{
		marc_summary.postMessage("OVER");
	}
}
function marc_viz(data,raw)
{
	var frame = document.createElement("table");
	var thead = document.createElement("thead");
	var tbody = document.createElement("tbody");
	frame.append(thead)
	frame.append(tbody)
	document.querySelector("#results").append(frame);
	var traw = document.createElement("tr");
	traw.setAttribute("class","raw")
	var trh = document.createElement("tr");
	thead.append(traw)
	thead.append(trh)
	var th = document.createElement("th");
	var reg1 = new RegExp(get_param("cfz",true),'g')
	var reg2 = new RegExp(get_param("ssz",true),'g')
	raw = raw.replace(reg1,'#')
	raw = raw.replace(reg2,'$')
	th.setAttribute("colspan",4);
	th.innerHTML = raw;
	traw.append(th);
	var th = document.createElement("th");
	th.innerHTML = "Field";
	trh.append(th);
	var th = document.createElement("th");
	th.innerHTML = "Indicator";
	trh.append(th);
	var th = document.createElement("th");
	th.innerHTML = "Subfield";
	trh.append(th);
	var th = document.createElement("th");
	th.innerHTML = "Value";
	trh.append(th);
	var i = 0;
	for (i=0;i<Object.keys(data).length;i++)
	{
		var tr = document.createElement("tr");
		var field = document.createElement("td");
		field.innerHTML = Object.keys(data)[i];
		tr.append(field)
		tbody.append(tr)
		var rowspan = 1;
		for (j in data[Object.keys(data)[i]])
		{
			var tr = (j == 0) ?tr:document.createElement("tr");
			rowspan = (j == 0) ? rowspan:rowspan+1;
			var ind = document.createElement("td");
			var indicator = (data[Object.keys(data)[i]][j].indicator)?data[Object.keys(data)[i]][j].indicator:"∅";
			var indspan = 1;
			delete data[Object.keys(data)[i]][j].indicator;
			indicator = indicator.replace(new RegExp(/ /,'g'),"_")
			ind.innerHTML = indicator;
			tr.append(ind)
			tbody.append(tr)
			var z = 0;
			for (z=0;z<Object.keys(data[Object.keys(data)[i]][j]).length;z++)
			{
				var trz = (z == 0)?tr:document.createElement("tr");
				if (z != 0)
				{
					rowspan++;
					indspan++;
				}
				var subfield = document.createElement("td");
				var subspan = 1;
				subfield.innerHTML = (Object.keys(data[Object.keys(data)[i]][j])[z] == "value") ? "∅":Object.keys(data[Object.keys(data)[i]][j])[z];
				trz.append(subfield)
				tbody.append(trz)
				if (subfield.innerHTML == "∅")
				{
					var value = document.createElement("td");
					value.innerHTML = data[Object.keys(data)[i]][j].value;
					trz.append(value);
					tbody.append(trz);
				}
				else
				{
					for (y in data[Object.keys(data)[i]][j][Object.keys(data[Object.keys(data)[i]][j])[z]])
					{
						var trv = (y == 0)?trz:document.createElement("tr");
						if (y != 0)
						{
							rowspan++;
							indspan++;
							subspan++;
						}
						var value = document.createElement("td");
						value.innerHTML = data[Object.keys(data)[i]][j][Object.keys(data[Object.keys(data)[i]][j])[z]][y];
						trv.append(value);
						tbody.append(trv);
						//console.log(data[Object.keys(data)[i]][j][Object.keys(data[Object.keys(data)[i]][j])[z]][y])
					}
				}
				subfield.setAttribute("rowspan",subspan)
			}
			ind.setAttribute("rowspan",indspan)
		}
		field.setAttribute("rowspan",rowspan)
	}
}
