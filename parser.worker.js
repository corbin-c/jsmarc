parameters = {};
function b_length(str)
{
	return new Blob([str]).size
}
function b_slice(str,start,end)
{
	var length = end-start;
	var x = 0;
	for (x=0;x<start;x++)
	{
		if (b_length(str.slice(0,x)) == start)
		{
			start = x;
			break;
		}
	}
	str = str.slice(start)
	var x = 0;
	for (x=0;x<end;x++)
	{
		if (b_length(str.slice(0,x)) == (length))
		{
			end = x;
			break;
		}
	}
	return str.slice(0,end)
}
function Marc(record)
{
	this.record = record;
	this.fields = {};
	this.wv = {}; //working variables
}
Marc.prototype.directory = function()
{
	this.directory = this.record.split(parameters.cfz)[0].slice(24);
	this.label  = this.record.split(parameters.cfz)[0].slice(0,24);
	this.record = this.record.slice(b_length(this.label+this.directory+parameters.cfz));
	this.wv.x=0;
	this.wv.out = []
	for (this.wv.x=0;this.wv.x<this.directory.length;this.wv.x=this.wv.x+12)
	{
		this.wv.zone = {}
		this.wv.tmp = this.directory.slice(this.wv.x,this.wv.x+12)
		this.wv.zone.etq = this.wv.tmp.slice(0,3)
		this.wv.tmp = this.wv.tmp.slice(3)
		this.wv.zone.ldz = this.wv.tmp.slice(0,4)
		this.wv.tmp = this.wv.tmp.slice(4)
		this.wv.zone.pos = this.wv.tmp.slice(0,5)
		this.wv.out.push(this.wv.zone)
	}
	this.directory = this.wv.out;
	this.wv = {};
}
Marc.prototype.subfields = function()
{
	this.wv.field = this.wv.field.split(parameters.cfz)[0];
	if (this.wv.field.indexOf(parameters.ssz) >= 0)
	{
		this.wv.splitted_field = this.wv.field.split(parameters.ssz);
		this.wv.i = 0;
		for (this.wv.i=0;this.wv.i<this.wv.splitted_field.length;this.wv.i++)
		{
			if (this.wv.i==0)
			{
				this.wv.field = {indicator:this.wv.splitted_field[this.wv.i]}
			}
			else
			{
				if (((typeof parameters.included_subfields[this.directory[this.wv.x].etq] !== "undefined")
					&& (parameters.included_subfields[this.directory[this.wv.x].etq].indexOf(this.wv.splitted_field[this.wv.i][0]) >= 0))
					|| (typeof parameters.included_subfields[this.directory[this.wv.x].etq] === "undefined"))
				{
					if (typeof this.wv.field[this.wv.splitted_field[this.wv.i][0]] === "undefined")
					{
						this.wv.field[this.wv.splitted_field[this.wv.i][0]] = [];
					}
					this.wv.field[this.wv.splitted_field[this.wv.i][0]].push(this.wv.splitted_field[this.wv.i].slice(1))
				}
			}
		}
		this.wv.splitted_field = [];
	}
	else
	{
		this.wv.field = {indicator:false,value:this.wv.field}
	}
	this.fields[this.directory[this.wv.x].etq].push(this.wv.field);
}
Marc.prototype.field = function(field_number)
{
	this.wv.x=0;
	field_number = field_number.toString();
	for (this.wv.x=0;this.wv.x<this.directory.length;this.wv.x++)
	{
		if ((this.directory[this.wv.x].etq == field_number) || (field_number == "*"))
		{
			if (typeof this.fields[this.directory[this.wv.x].etq] === "undefined")
			{
				this.fields[this.directory[this.wv.x].etq] = [];
			}
			this.wv.field = "";
			this.wv.field = b_slice(this.record,parseInt(this.directory[this.wv.x].pos),parseInt(this.directory[this.wv.x].pos)+parseInt(this.directory[this.wv.x].ldz))
			this.subfields();
		}
	}
	this.wv = {};
}
onmessage = function(e) {
	if (typeof e.data.parameters !== "undefined")
	{
		parameters = e.data.parameters;
		parameters.records_done = 0;
	}
	else
	{
		var record = new Marc(e.data.data);
		record.directory();
		for (j in parameters.fields)
		{
			record.field(parameters.fields[j])
		}
		parameters.records_done++;
		postMessage({recordID:e.data.recordID,fields:record.fields,records:parameters.records_done});
	}
}
