(function(global) {
	 function MGCoreResult() { this.init.apply(this, arguments); }
	 MGCoreResult.prototype = {
		 list: new Array,
		 position: 0,
		 total: 0,
		 enableSort: true,
		 enableSkip: true,
		 enableLimit: true,
		 init: function(list) {
			 this.list = list;
			 this.total = list.length;
		 },
		 sort: function(cond) {
			 if (this.enableSort) {
				 var _list = this.list.slice(0);
				 for (var key in cond) {
					 var val = cond[key];
					 _list.sort(function(a, b) {
						if (a[key] < b[key]) {
							return val * 1;
						}
						else if (a[key] > b[key]) {
							return val * (-1);
						}
						else {
							return 0;
						}
					 });
					 break;
				 }
				 this.list = _list;
				 this.enableSort = false;
			 }
			 return this;
		 },
		 skip: function(num) {
			 if (this.enableSkip) {
				 this.list = this.list.slice(num);
				 this.enableSkip = false;
			 }
			 return this;
		 },
		 limit: function(num) {
			 if (this.enableLimit) {
				 this.list = this.list.slice(0, num);
				 this.enableLimit = false;
			 }
			 return this;
		 },
		 count: function() {
			 return this.total;
		 },
		 sum: function(key) {
			 var sum = 0;
			 for (var i = 0, d; d = this.list[i]; i++) {
				 sum += d[key];
			 }
			 return sum;
		 },
		 next: function() {
			 var d = this.list[this.position];
			 if (d) {
				 this.position++;
			 }
			 return d;
		 },
		 hasNext: function() {
			 return !!this.list[this.position];
		 },
		 forEach: function(callback) {
			 while(this.hasNext()) {
				 callback(this.next());
			 }
		 },
		 toArray: function() { return this.list; }
	 };

	 function MGCore() { this.init.apply(this, arguments); }
	 MGCore.prototype = {
		 list: new Array,
		 default_order: '',
		 default_order_flag: 1,
		 init: function() {
			 this.list = new Array;
		 },
		 find: function(cond, order) {
			 if (!cond) cond = new Object;
			 if (!order) {
				 order = new Object;
				 order[this.default_order] = this.defualt_order_flag;
			 }
			 var args = Array.prototype.slice.call(arguments, 2);
			 var self = this;
			 var founds = new Array;
			 var _check = this._findCond(cond);
			 for (var i = 0, d; d = this.list[i]; i++) {
				 if (_check(d)) {
					 founds.push(d);
				 }
			 }
			 var res = new MGCoreResult(founds);
			 res.sort(order);
			 if (args[0]) {
				 res.limit(args[0]);
				 if (args[1]) res.skip(args[1]);
			 }
			 return res;
		 },
		 _findCond: function(cond) {
			 var self = this;
			 for (var j in cond) {
				 var ref = cond[j];
				 var cls = Object.prototype.toString.call(ref);
				 if (cls.indexOf('RegExp') >= 0) {
					 cond[j] = { '$regex': ref };
				 }
				 else if (cls.indexOf('Array') >= 0) {
					 if (!ref['$or'] && !ref['$in']) {
						 cond[j] = { '$in': '|' + ref.join('|') + '|' };
					 }
				 }
				 else if (cls.indexOf('object Object') < 0) {
					 cond[j] = { '$eq': ref };
				 }
			 }
			 return function(d) {
				 var ok = true;
				 for (var i in cond) {
					 var val = d;
					 var _i = i.split('.');
					 for (var __i = 0, _v; _v = _i[__i]; __i++) {
						 val = val[_v];
					 }
					 var val_cond = cond[i];
					 for (var k in val_cond) {
						 var f = self.meta_cond_table[k];
						 if (!f) f = self.cond_table[k];
						 if (f) {
							 if (!f.call(self, val_cond[k], val)) {
								 ok = false;
								 break;
							 }
						 }
					 }
					 if (!ok) break;
				 }
				 return ok;
			 };
		 },
		 meta_cond_table: {
			 '$not': function(cond, val) {
				 var ok = true;
				 for (var i = 0, val_cond; val_cond = cond[i]; i++) {
					 for (var k in val_cond) {
						 var f = this.cond_table[k];
						 if (!f.call(this, val_cond[k], val)) {
							 ok = false;
							 break;
						 }
					 }
					 if (!ok) break;
				 }
				 return !ok;
			 },
			 '$or': function(cond, val) {
				 var ok = false;
				 for (var i = 0, val_cond; val_cond = cond[i]; i++) {
					 for (var k in val_cond) {
						 var f = this.cond_table[k];
						 if (f.call(this, val_cond[k], val)) {
							 ok = true;
							 break;
						 }
					 }
					 if (ok) break;
				 }
				 return ok;
			 },
			 '$nor': function(cond, val) {
				 var f = this.meta_cond_table['$or'];
				 return !f.call(this, cond, val);
			 }
		 },
		 cond_table: {
			 '$lt' : function(ref, val) { return val <  ref; },
			 '$lte': function(ref, val) { return val <= ref; },
			 '$gt' : function(ref, val) { return val >  ref; },
			 '$gte': function(ref, val) { return val >= ref; },
			 '$eq' : function(ref, val) { return val == ref; },
			 '$ne' : function(ref, val) { return val != ref; },
			 '$mod': function(ref, val) { return (ref[0] % val) == ref[1]; },
			 '$in' : function(ref, val) {
				 if (val instanceof Array) {
					 for (var i = 0, v; v = val[i]; i++) {
						 if (ref.indexOf('|'+v+'|') >= 0) {
							 return true;
						 }
					 }
					 return false;
				 }
				 else {
					 return ref.indexOf('|'+val+'|') >= 0;
				 }
			 },
			 '$nin': function(ref, val) { return ref.indexOf('|' + val + '|') <  0; },
			 '$all': function(ref, val) {
				 var ok = true;
				 for (var i = 0, v; v = val[i]; i++) {
					 if (ref.indexOf(' ' + String(v) + ' ') < 0) {
						 ok = false;
						 break;
					 }
				 }
				 return ok;
			 },
			 '$regex' : function(ref, val) {
				 if (Object.prototype.toString.call(ref).indexOf('RegExp') >= 0) {
					 return ref.test(val);
				 }
				 else {
					 return (new RegExp(ref, 'i')).test(val);
				 }
			 },
			 '$exists': function(ref, val) { return (typeof val !== 'undefined') === ref; },
			 '$size': function(ref, val) {
				 var s = 0;
				 for (var i in val) s++;
				 return ref == s;
			 }
		 },
		 findOne: function(cond, order) {
			 var res = this.find.call(this, cond, order, 1, 0);
			 return (res.hasNext()) ? res.next() : null;
		 }
	 };

	 global.MGCore = MGCore;
	 global.MGCoreResult = MGCoreResult;
 })(this);
