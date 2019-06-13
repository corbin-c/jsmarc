summary = new Summary();
function custom_push(obj,to_add,field)
{
	if (typeof obj[to_add] === "undefined")
	{
		obj[to_add] = {value:to_add,count:1}
		postMessage({added:obj[to_add],field:field})
	}
	else
	{
		obj[to_add].count++
		postMessage({increment:obj[to_add],field:field})
	}
}
function Summary()
{
	this.parameters = {};
	this.records_done  = 0;
	this.fields = {};
}
Summary.prototype.config = function(parameters)
{
	this.parameters = parameters;
}
Summary.prototype.incorporate = function(data)
{
	var i = 0;
	for (i=0;i<Object.keys(data).length;i++)
	{
		for (j in data[Object.keys(data)[i]])
		{
			var indicator = true;
			if (typeof this.parameters.indicators[Object.keys(data)[i]] !== "undefined")
			{
				if (this.parameters.indicators[Object.keys(data)[i]].indexOf(data[Object.keys(data)[i]][j].indicator) < 0)
				{
					indicator = false;
				}
			}
			if (indicator)
			{
				var k = 0;
				var tmp_field = JSON.parse(JSON.stringify(data[Object.keys(data)[i]][j]));
				delete tmp_field.indicator;
				for (k=0;k<Object.keys(data[Object.keys(data)[i]][j]).length;k++)
				{
					if (typeof this.parameters.included_subfields[Object.keys(data)[i]] !== "undefined")
					{
						if (this.parameters.included_subfields[Object.keys(data)[i]].indexOf(Object.keys(data[Object.keys(data)[i]][j])[k]) < 0)
						{
							var key = Object.keys(data[Object.keys(data)[i]][j])[k];
							delete tmp_field[key];
						}
					}
				}
				this.subfields(Object.keys(data)[i],tmp_field);
			}
		}
	}
	this.records_done++;
}
Summary.prototype.subfields = function(field_number,field)
{
	if (typeof this.fields[field_number] === "undefined")
	{
		this.fields[field_number] = {};
	}
	var a = 0;
	var tmp_field = "";
	for (a=0;a<Object.keys(field).length;a++)
	{
		for (b in field[Object.keys(field)[a]])
		{
			if (this.parameters.concat_with)
			{
				tmp_field += (a==0)?field[Object.keys(field)[a]][b]:this.parameters.concat_with+field[Object.keys(field)[a]][b];
			}
			else
			{
				custom_push(this.fields[field_number],field[Object.keys(field)[a]][b],field_number);
			}
		}
	}
	if (this.parameters.concat_with)
	{
		custom_push(this.fields[field_number],tmp_field,field_number);
	}
}
onmessage = function(e) {
	if (typeof e.data.parameters !== "undefined")
	{
		summary.config(e.data.parameters);
	}
	else if (e.data == "OVER")
	{
		postMessage({fields:summary.fields,records:summary.records_done,over:true});
	}
	else
	{
		summary.incorporate(e.data.fields);
		postMessage({fields:summary.fields,records:summary.records_done});
	}
}
