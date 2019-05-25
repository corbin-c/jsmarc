// INSTANTIATE WORKERS
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
	marc_parser.postMessage({parameters:
		{
			cfz:get_param("cfz",true),
			ssz:get_param("ssz",true),
			fields:config.fields,
		}
	});
// HANDLE WORKERS RESPONSES
	marc_parser.onmessage = function (e) {
			document.getElementById("parse").setAttribute("value",e.data.records);
			document.getElementById("parse").innerHTML = Math.floor((e.data.records/document.getElementById("parse").getAttribute("max"))*100)+"%";
			document.getElementById("l_parse").children[0].innerHTML = document.getElementById("parse").innerHTML;
			//if (e.data.recordID < 10) {console.log(e.data)}
			marc_filter.postMessage(e.data);
			//marc_summary.postMessage(e.data.fields);
		};
	marc_filter.onmessage = function(e) {
		if (e.data)
		{
			marc_summary.postMessage(e.data.fields);
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
		marc_parser.postMessage({data:data[i],recordID:i});
		await incr_wait(0,1);
		r_s++;
		document.getElementById("sent").setAttribute("value",r_s);
		document.getElementById("sent").innerHTML = Math.floor((r_s/document.getElementById("sent").getAttribute("max"))*100)+"%";
		document.getElementById("l_sent").children[0].innerHTML = document.getElementById("sent").innerHTML;
	}
}
function summarize_upd()
{
	document.getElementById("analysis").setAttribute("value",config.records_done);
	document.getElementById("analysis").setAttribute("max",config.records);
	document.getElementById("analysis").innerHTML = Math.floor((config.records_done/document.getElementById("analysis").getAttribute("max"))*100)+"%";
	document.getElementById("l_analysis").children[0].innerHTML = document.getElementById("analysis").innerHTML;
	if (config.records_done == config.records)
	{
		marc_summary.postMessage("OVER");
	}
}
