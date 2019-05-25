parameters = {};
onmessage = function(e) {
	if (typeof e.data.parameters !== "undefined")
	{
		parameters = e.data.parameters;
		parameters.filter_field = Object.keys(parameters.filter)[0].split("$")[0];
		parameters.filter_subfield = Object.keys(parameters.filter)[0].split("$")[1];
	}
	else if (parameters.filter_type)
	{
		var a=0;
		var filtered = true;
		for (a=0;a<e.data.fields[parameters.filter_field].length;a++)
		{
			var b=0;
			for (b=0;b<e.data.fields[parameters.filter_field][a][parameters.filter_subfield].length;b++)
			{
				if (parameters.filter_type == "!=")
				{
					if (e.data.fields[parameters.filter_field][a][parameters.filter_subfield][b] != parameters.filter[Object.keys(parameters.filter)[0]])
					{
						filtered = false;
					}
				}
				else if (parameters.filter_type == "<")
				{
					if (parseInt(e.data.fields[parameters.filter_field][a][parameters.filter_subfield][b]) < parseInt(parameters.filter[Object.keys(parameters.filter)[0]]))
					{
						filtered = false;
					}
				}
				else if (parameters.filter_type == ">")
				{
					if (parseInt(e.data.fields[parameters.filter_field][a][parameters.filter_subfield][b]) > parseInt(parameters.filter[Object.keys(parameters.filter)[0]]))
					{
						filtered = false;
					}
				}
				else //anything else will be considered exact match filter (filter may be an array)
				{
					parameters.filter[Object.keys(parameters.filter)[0]] = (typeof parameters.filter[Object.keys(parameters.filter)[0]] === "string") ? [parameters.filter[Object.keys(parameters.filter)[0]]]:parameters.filter[Object.keys(parameters.filter)[0]];
					if (parameters.filter[Object.keys(parameters.filter)[0]].indexOf(e.data.fields[parameters.filter_field][a][parameters.filter_subfield][b]) >= 0)
					{
						filtered = false;
					}
				} 
			}
		}
		if (filtered)
		{
			postMessage(false);
		}
		else
		{
			postMessage(e.data);
		}
	}
	else
	{
		postMessage(e.data);
	}
}
