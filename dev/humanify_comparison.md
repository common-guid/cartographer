# Humanify E2E Output Comparison Report

This report compares the original minified webpack bundle with the output processed by the newly integrated **humanify** Rust binary using Google Gemini.

- **Input File:** [bundle.js (original)](file:///home/guid/projects/cartographer/cartographer/fixtures/webpack-hello-world/dist/bundle.js)
- **Output File:** [bundle.js (deobfuscated)](file:///home/guid/projects/cartographer/cartographer/dist-output-humanify/bundle.js)
- **Provider:** `gemini` (Model: `gemini-2.5-flash`)
- **Execution Time:** 1306.37s

---

## 🔍 Code Comparison

### 1. Original Minified Module (First 100 lines/characters snippet)
```javascript
/*! For license information please see bundle.js.LICENSE.txt */
!function(){"use strict";function t(t,n){return t+n}function n(t,n){return t*n}function r(t){return n(Math.PI,n(t,t))}function e(t,n,r){return t<n?n:t>r?r:t}function o(t){return o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},o(t)}function i(t,n){for(var r=0;r<n.length;r++){var e=n[r];e.enumerable=e.enumerable||!1,e.configurable=!0,"value"in e&&(e.writable=!0),Object.defineProperty(t,c(e.key),e)}}function c(t){var n=function(t){if("object"!=o(t)||!t)return t;var n=t[Symbol.toPrimitive];if(void 0!==n){var r=n.call(t,"string");if("object"!=o(r))return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(t)}(t);return"symbol"==o(n)?n:n+""}function u(n,r){var e=function(t){return t<12?"morning":t<18?"afternoon":"evening"}(r),o=t(2,n.split(" ").length);return"Good ".concat(e,", ").concat(n,"! Your greeting has ").concat(o," words.")}var a=function(){return n=function t(n){!function(t,n){if(!(t instanceof n))throw new TypeError("Cannot call a class as a function")}(this,t),this.locale=n,this.greetingCount=0},(r=[{key:"formatFormal",value:function(n){return this.greetingCount=t(this.greetingCount,1),"Dear ".concat(n,", greetings from locale ").concat(this.locale,".")}},{key:"getStats",value:function(){return{locale:this.locale,totalGreetings:this.greetingCount}}}])&&i(n.prototype,r),Object.defineProperty(n,"prototype",{writable:!1}),n;var n,r}();function f(t){return f="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},f(t)}function l(){var t,n,r="function"==typeof Symbol?Symbol:{},e=r.iterator||"@@iterator",o=r.toStringTag||"@@toStringTag";function i(r,e,o,i){var a=e&&e.prototype instanceof u?e:u,f=Object.create(a.prototype);return s(f,"_invoke",function(r,e,o){var i,u,a,f=0,l=o||[],s=!1,p={p:0,n:0,v:t,a:y,f:y.bind(t,4),d:function(n,r){return i=n,u=0,a=t,p.n=r,c}};function y(r,e){for(u=r,a=e,n=0;!s&&f&&!o&&n<l.length;n++){var o,i=l[n],y=p.p,v=i[2];r>3?(o=v===e)&&(a=i[(u=i[4])?5:(u=3,3)],i[4]=i[5]=t):i[0]<=y&&((o=r<2&&y<i[1])?(u=0,p.v=e,p.n=i[1]):y<v&&(o=r<3||i[0]>e||e>v)&&(i[4]=r,i[5]=e,p.n=v,u=0))}if(o||r>1)return c;throw s=!0,e}return function(o,l,v){if(f>1)throw TypeError("Generator is already running");for(s&&1===l&&y(l,v),u=l,a=v;(n=u<2?t:a)||!s;){i||(u?u<3?(u>1&&(p.n=-1),y(u,a)):p.n=a:p.v=a);try{if(f=2,i){if(u||(o="next"),n=i[o]){if(!(n=n.call(i,a)))throw TypeError("iterator result is not an object");if(!n.done)return n;a=n.value,u<2&&(u=0)}else 1===u&&(n=i.return)&&n.call(i),u<2&&(a=TypeError("The iterator does not provide a '"+o+"' method"),u=1);i=t}else if((n=(s=p.n<0)?a:r.call(e,p))!==c)break}catch(n){i=t,u=1,a=n}finally{f=1}}return{value:n,done:s}}...
```

### 2. Post-Processed humanify Output (First 100 lines/characters snippet)
```javascript
/*! For license information please see bundle.js.LICENSE.txt */
!(function() {
	"use strict";
	function add(__add, secondAddend) {
		return __add + secondAddend;
	}
	function multiply(factor1, _multiply) {
		return factor1 * _multiply;
	}
	function circleArea(angle) {
		return multiply(Math.PI, multiply(angle, angle));
	}
	function clamp(__________________________________value, min, max) {
		return __________________________________value < min ? min : __________________________________value > max ? max : __________________________________value;
	}
	function getType(_____________value) {
		getType = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(____________________________________value) {
			return typeof ____________________________________value;
		} : function(___________________value) {
			return ___________________value && typeof Symbol == "function" && ___________________value.constructor === Symbol && ___________________value !== Symbol.prototype ? "symbol" : typeof ___________________value;
		};
		return getType(_____________value);
	}
	function item(_targetObject, propertyDescriptors) {
		for (var __index = 0; __index < propertyDescriptors.length; __index++) {
			var propertyDescriptor = propertyDescriptors[__index];
			propertyDescriptor.enumerable = propertyDescriptor.enumerable || !1;
			propertyDescriptor.configurable = !0;
			"value" in propertyDescriptor && (propertyDescriptor.writable = !0);
			Object.defineProperty(_targetObject, unknownValue(propertyDescriptor.key), propertyDescriptor);
		}
	}
	function unknownValue(____________value) {
		var _primitiveValue = (function(__________________value) {
			if (getType(__________________value) != "object" || !__________________value) {
				return __________________value;
			}
			var _toPrimitiveMethod = __________________value[Symbol.toPrimitive];
			if (_toPrimitiveMethod !== void 0) {
				var ___primitiveValue = _toPrimitiveMethod.call(__________________value, "string");
				if (getType(___primitiveValue) != "object") {
					return ___primitiveValue;
				}
				throw new TypeError("@@toPrimitive must return a primitive value.");
			}
			return String(__________________value);
		})(____________value);
		return getType(_primitiveValue) == "symbol" ? _primitiveValue : _primitiveValue + "";
	}
	function unknownVariable(userName, hour) {
		var timeOfDay = (function(_hour) {
			return _hour < 12 ? "morning" : _hour < 18 ? "afternoon" : "evening";
		})(hour);
		var wordCount = add(2, userName.split(" ").length);
		return "Good ".concat(timeOfDay, ", ").concat(userName, "! Your greeting has ").concat(wordCount, " words.");
	}
	var missingVariable = (function() {
		Greeter = function Greeting(locale) {
			!(function(instance, _Constructor) {
				if (!(instance instanceof _Constructor)) {
					throw new TypeError("Cannot call a class as a function");
				}
			})(this, Greeting);
			this.locale = locale;
			this.greetingCount = 0;
		};
		(classMethods = [{
			key: "fo...
```

---

## 💡 Deobfuscation Analysis
Compare the identifiers (variables, functions, classes) in the post-processed output to verify that they have been renamed to semantic, human-readable names.
