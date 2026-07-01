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
			key: "formatFormal",
			value: function(_name) {
				this.greetingCount = add(this.greetingCount, 1);
				return "Dear ".concat(_name, ", greetings from locale ").concat(this.locale, ".");
			}
		}, {
			key: "getStats",
			value: function() {
				return {
					locale: this.locale,
					totalGreetings: this.greetingCount
				};
			}
		}]) && item(Greeter.prototype, classMethods);
		Object.defineProperty(Greeter, "prototype", { writable: !1 });
		return Greeter;
		var Greeter;
		var classMethods;
	})();
	function placeholder(______________value) {
		placeholder = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(_____________________________________value) {
			return typeof _____________________________________value;
		} : function(____________________value) {
			return ____________________value && typeof Symbol == "function" && ____________________value.constructor === Symbol && ____________________value !== Symbol.prototype ? "symbol" : typeof ____________________value;
		};
		return placeholder(______________value);
	}
	function value() {
		var ___value;
		var ____value;
		var SymbolObject = typeof Symbol == "function" ? Symbol : {};
		var iteratorSymbol = SymbolObject.iterator || "@@iterator";
		var toStringTagSymbol = SymbolObject.toStringTag || "@@toStringTag";
		function createGeneratorObject(root, Constructor, initialList, nextArgument) {
			var _baseClass = Constructor && Constructor.prototype instanceof Generator ? Constructor : Generator;
			var __step = Object.create(_baseClass.prototype);
			s(__step, "_invoke", (function(____step, exports, _initialList) {
				var currentItem;
				var index;
				var currentContext;
				var counter = 0;
				var params = _initialList || [];
				var isFinished = !1;
				var processState = {
					p: 0,
					n: 0,
					v: ___value,
					a: updateState,
					f: updateState.bind(___value, 4),
					d: function(_______________________value, ________________________value) {
						currentItem = _______________________value;
						index = 0;
						currentContext = ___value;
						processState.n = ________________________value;
						return c;
					}
				};
				function updateState(mode, targetValue) {
					index = mode;
					currentContext = targetValue;
					for (____value = 0; !isFinished && counter && !isMatched && ____value < params.length; ____value++) {
						var isMatched;
						var _item = params[____value];
						var updateByModeAndValue = processState.p;
						var itemValue = _item[2];
						mode > 3 ? (isMatched = itemValue === targetValue) && (currentContext = _item[(index = _item[4]) ? 5 : (index = 3, 3)], _item[4] = _item[5] = ___value) : _item[0] <= updateByModeAndValue && ((isMatched = mode < 2 && updateByModeAndValue < _item[1]) ? (index = 0, processState.v = targetValue, processState.n = _item[1]) : updateByModeAndValue < itemValue && (isMatched = mode < 3 || _item[0] > targetValue || targetValue > itemValue) && (_item[4] = mode, _item[5] = targetValue, processState.n = itemValue, index = 0));
					}
					if (isMatched || mode > 1) {
						return c;
					}
					isFinished = !0;
					throw targetValue;
				}
				return function(___context, state, ______value) {
					if (counter > 1) {
						throw TypeError("Generator is already running");
					}
					isFinished && state === 1 && updateState(state, ______value);
					index = state;
					for (currentContext = ______value; (____value = index < 2 ? ___value : currentContext) || !isFinished;) {
						currentItem || (index ? index < 3 ? (index > 1 && (processState.n = -1), updateState(index, currentContext)) : processState.n = currentContext : processState.v = currentContext);
						try {
							counter = 2;
							if (currentItem) {
								index || (___context = "next");
								if (____value = currentItem[___context]) {
									if (!(____value = ____value.call(currentItem, currentContext))) {
										throw TypeError("iterator result is not an object");
									}
									if (!____value.done) {
										return ____value;
									}
									currentContext = ____value.value;
									index < 2 && (index = 0);
								} else {
									index === 1 && (____value = currentItem.return) && ____value.call(currentItem);
									index < 2 && (currentContext = TypeError("The iterator does not provide a '" + ___context + "' method"), index = 1);
								}
								currentItem = ___value;
							} else if ((____value = (isFinished = processState.n < 0) ? currentContext : ____step.call(exports, processState)) !== c) {
								break;
							}
						} catch (____________________________value) {
							currentItem = ___value;
							index = 1;
							currentContext = ____________________________value;
						} finally {
							counter = 1;
						}
					}
					return {
						value: ____value,
						done: isFinished
					};
				};
			})(root, initialList, nextArgument), !0);
			return __step;
		}
		var c = {};
		function Generator() {}
		function prototypeConstructor() {}
		function step() {}
		____value = Object.getPrototypeOf;
		var process = [][iteratorSymbol] ? ____value(____value([][iteratorSymbol]())) : (s(____value = {}, iteratorSymbol, function() {
			return this;
		}), ____value);
		var data = step.prototype = Generator.prototype = Object.create(process);
		function _____value(targetFunction) {
			Object.setPrototypeOf ? Object.setPrototypeOf(targetFunction, step) : (targetFunction.__proto__ = step, s(targetFunction, toStringTagSymbol, "GeneratorFunction"));
			targetFunction.prototype = Object.create(data);
			return targetFunction;
		}
		prototypeConstructor.prototype = step;
		s(data, "constructor", step);
		s(step, "constructor", prototypeConstructor);
		prototypeConstructor.displayName = "GeneratorFunction";
		s(step, toStringTagSymbol, "GeneratorFunction");
		s(data);
		s(data, toStringTagSymbol, "Generator");
		s(data, iteratorSymbol, function() {
			return this;
		});
		s(data, "toString", function() {
			return "[object Generator]";
		});
		return (value = function() {
			return {
				w: createGeneratorObject,
				m: _____value
			};
		})();
	}
	function s(_target, propertyName, _________value, isInternal) {
		var defineProperty = Object.defineProperty;
		try {
			defineProperty({}, "", {});
		} catch (___index) {
			defineProperty = 0;
		}
		s = function(__target, __propertyName, _______________value, __isInternal) {
			function defineGeneratorMethod(actionName, ___________________________value) {
				s(__target, actionName, function(______________________________value) {
					return this._invoke(actionName, ___________________________value, ______________________________value);
				});
			}
			__propertyName ? defineProperty ? defineProperty(__target, __propertyName, {
				value: _______________value,
				enumerable: !__isInternal,
				configurable: !__isInternal,
				writable: !__isInternal
			}) : __target[__propertyName] = _______________value : (defineGeneratorMethod("next", 0), defineGeneratorMethod("throw", 1), defineGeneratorMethod("return", 2));
		};
		s(_target, propertyName, _________value, isInternal);
	}
	function _placeholder(_obj, enumerableOnly) {
		var allKeys = Object.keys(_obj);
		if (Object.getOwnPropertySymbols) {
			var symbols = Object.getOwnPropertySymbols(_obj);
			enumerableOnly && (symbols = symbols.filter(function(_____propertyName) {
				return Object.getOwnPropertyDescriptor(_obj, _____propertyName).enumerable;
			}));
			allKeys.push.apply(allKeys, symbols);
		}
		return allKeys;
	}
	function y(target) {
		for (var _index = 1; _index < arguments.length; _index++) {
			var sourceObject = arguments[_index] != null ? arguments[_index] : {};
			_index % 2 ? _placeholder(Object(sourceObject), !0).forEach(function(key) {
				_value(target, key, sourceObject[key]);
			}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(sourceObject)) : _placeholder(Object(sourceObject)).forEach(function(____propertyName) {
				Object.defineProperty(target, ____propertyName, Object.getOwnPropertyDescriptor(sourceObject, ____propertyName));
			});
		}
		return target;
	}
	function _value(________value, stringOrSymbol, options) {
		(stringOrSymbol = (function(___________value) {
			var primitiveValue = (function(_________________value) {
				if (placeholder(_________________value) != "object" || !_________________value) {
					return _________________value;
				}
				var toPrimitiveMethod = _________________value[Symbol.toPrimitive];
				if (toPrimitiveMethod !== void 0) {
					var __primitiveValue = toPrimitiveMethod.call(_________________value, "string");
					if (placeholder(__primitiveValue) != "object") {
						return __primitiveValue;
					}
					throw new TypeError("@@toPrimitive must return a primitive value.");
				}
				return String(_________________value);
			})(___________value);
			return placeholder(primitiveValue) == "symbol" ? primitiveValue : primitiveValue + "";
		})(stringOrSymbol)) in ________value ? Object.defineProperty(________value, stringOrSymbol, {
			value: options,
			enumerable: !0,
			configurable: !0,
			writable: !0
		}) : ________value[stringOrSymbol] = options;
		return ________value;
	}
	function _typeof(__generator, _resolve, ___reject, _onFulfilled, errorHandler, methodName, nextValue) {
		try {
			var iteratorResult = __generator[methodName](nextValue);
			var _____________________value = iteratorResult.value;
		} catch (_data) {
			return void ___reject(_data);
		}
		iteratorResult.done ? _resolve(_____________________value) : Promise.resolve(_____________________value).then(_onFulfilled, errorHandler);
	}
	function __value(generatorFunction) {
		return function() {
			var self = this;
			var args = arguments;
			return new Promise(function(onFulfilled, _reject) {
				var generator = generatorFunction.apply(self, args);
				function resume(_______________________________value) {
					_typeof(generator, onFulfilled, _reject, resume, throwHandler, "next", _______________________________value);
				}
				function throwHandler(error) {
					_typeof(generator, onFulfilled, _reject, resume, throwHandler, "throw", error);
				}
				resume(void 0);
			});
		};
	}
	var h = {
		1: {
			name: "Alice Johnson",
			role: "admin",
			score: 95
		},
		2: {
			name: "Bob Smith",
			role: "user",
			score: 72
		},
		42: {
			name: "Jane Doe",
			role: "moderator",
			score: 88
		}
	};
	function unidentifiedVariable(_arg) {
		return delta.apply(this, arguments);
	}
	function delta() {
		return (delta = __value(value().m(function fetchItem(id) {
			return value().w(function(asyncContext) {
				for (;;) {
					if (asyncContext.n === 0) {
						return asyncContext.a(2, new Promise(function(resolve, reject) {
							setTimeout(function() {
								var user = h[id];
								user ? resolve(y(y({ id }, user), {}, { fetchedAt: new Date().toISOString() })) : reject(new Error("User ".concat(id, " not found")));
							}, 10);
						}));
					}
				}
			}, fetchItem);
		}))).apply(this, arguments);
	}
	function w(___________________________________value) {
		return __typeof.apply(this, arguments);
	}
	function __typeof() {
		return (__typeof = __value(value().m(function formatMemberDetails(memberId) {
			var member;
			var clampedScore;
			return value().w(function(______context) {
				for (;;) {
					switch (______context.n) {
						case 0: {
							______context.n = 1;
							return unidentifiedVariable(memberId);
						}
						case 1: {
							member = ______context.v;
							clampedScore = clamp(member.score, 0, 100);
							return ______context.a(2, {
								displayName: member.name.toUpperCase(),
								memberId: "MEMBER-".concat(member.id),
								role: member.role,
								trustScore: clampedScore
							});
						}
					}
				}
			}, formatMemberDetails);
		}))).apply(this, arguments);
	}
	function variableJ(param) {
		return identifierNotFound_S.apply(this, arguments);
	}
	function identifierNotFound_S() {
		return (identifierNotFound_S = __value(value().m(function getItemDetails(items) {
			var results;
			return value().w(function(_______context) {
				for (;;) {
					switch (_______context.n) {
						case 0: {
							_______context.n = 1;
							return Promise.all(items.map(unidentifiedVariable));
						}
						case 1: {
							results = _______context.v;
							return _______context.a(2, results.map(function(__item) {
								return {
									id: __item.id,
									name: __item.name
								};
							}));
						}
					}
				}
			}, getItemDetails);
		}))).apply(this, arguments);
	}
	function _getType() {
		var temp;
		var name;
		var runtimeSymbol = typeof Symbol == "function" ? Symbol : {};
		var iteratorKey = runtimeSymbol.iterator || "@@iterator";
		var _toStringTagSymbol = runtimeSymbol.toStringTag || "@@toStringTag";
		function wrapGenerator(_context, subClass, initialValues, wrap) {
			var selectedConstructor = subClass && subClass.prototype instanceof _Generator ? subClass : _Generator;
			var ___step = Object.create(selectedConstructor.prototype);
			_add(___step, "_invoke", (function(statusCode, _exports, __initialList) {
				var _currentItem;
				var offset;
				var _currentContext;
				var _counter = 0;
				var list = __initialList || [];
				var isReady = !1;
				var runtimeContext = {
					p: 0,
					n: 0,
					v: temp,
					a: setOffset,
					f: setOffset.bind(temp, 4),
					d: function(_________________________value, __________________________value) {
						_currentItem = _________________________value;
						offset = 0;
						_currentContext = temp;
						runtimeContext.n = __________________________value;
						return context;
					}
				};
				function setOffset(_mode, _targetValue) {
					offset = _mode;
					_currentContext = _targetValue;
					for (name = 0; !isReady && _counter && !isMatch && name < list.length; name++) {
						var isMatch;
						var entry = list[name];
						var processMatch = runtimeContext.p;
						var itemMatchValue = entry[2];
						_mode > 3 ? (isMatch = itemMatchValue === _targetValue) && (_currentContext = entry[(offset = entry[4]) ? 5 : (offset = 3, 3)], entry[4] = entry[5] = temp) : entry[0] <= processMatch && ((isMatch = _mode < 2 && processMatch < entry[1]) ? (offset = 0, runtimeContext.v = _targetValue, runtimeContext.n = entry[1]) : processMatch < itemMatchValue && (isMatch = _mode < 3 || entry[0] > _targetValue || _targetValue > itemMatchValue) && (entry[4] = _mode, entry[5] = _targetValue, runtimeContext.n = itemMatchValue, offset = 0));
					}
					if (isMatch || _mode > 1) {
						return context;
					}
					isReady = !0;
					throw _targetValue;
				}
				return function(____context, _____step, _______value) {
					if (_counter > 1) {
						throw TypeError("Generator is already running");
					}
					isReady && _____step === 1 && setOffset(_____step, _______value);
					offset = _____step;
					for (_currentContext = _______value; (name = offset < 2 ? temp : _currentContext) || !isReady;) {
						_currentItem || (offset ? offset < 3 ? (offset > 1 && (runtimeContext.n = -1), setOffset(offset, _currentContext)) : runtimeContext.n = _currentContext : runtimeContext.v = _currentContext);
						try {
							_counter = 2;
							if (_currentItem) {
								offset || (____context = "next");
								if (name = _currentItem[____context]) {
									if (!(name = name.call(_currentItem, _currentContext))) {
										throw TypeError("iterator result is not an object");
									}
									if (!name.done) {
										return name;
									}
									_currentContext = name.value;
									offset < 2 && (offset = 0);
								} else {
									offset === 1 && (name = _currentItem.return) && name.call(_currentItem);
									offset < 2 && (_currentContext = TypeError("The iterator does not provide a '" + ____context + "' method"), offset = 1);
								}
								_currentItem = temp;
							} else if ((name = (isReady = runtimeContext.n < 0) ? _currentContext : statusCode.call(_exports, runtimeContext)) !== context) {
								break;
							}
						} catch (_____________________________value) {
							_currentItem = temp;
							offset = 1;
							_currentContext = _____________________________value;
						} finally {
							_counter = 1;
						}
					}
					return {
						value: name,
						done: isReady
					};
				};
			})(_context, initialValues, wrap), !0);
			return ___step;
		}
		var context = {};
		function _Generator() {}
		function baseClass() {}
		function _step() {}
		name = Object.getPrototypeOf;
		var stepList = [][iteratorKey] ? name(name([][iteratorKey]())) : (_add(name = {}, iteratorKey, function() {
			return this;
		}), name);
		var isDone = _step.prototype = _Generator.prototype = Object.create(stepList);
		function createGeneratorRuntime(_generatorFunction) {
			Object.setPrototypeOf ? Object.setPrototypeOf(_generatorFunction, _step) : (_generatorFunction.__proto__ = _step, _add(_generatorFunction, _toStringTagSymbol, "GeneratorFunction"));
			_generatorFunction.prototype = Object.create(isDone);
			return _generatorFunction;
		}
		baseClass.prototype = _step;
		_add(isDone, "constructor", _step);
		_add(_step, "constructor", baseClass);
		baseClass.displayName = "GeneratorFunction";
		_add(_step, _toStringTagSymbol, "GeneratorFunction");
		_add(isDone);
		_add(isDone, _toStringTagSymbol, "Generator");
		_add(isDone, iteratorKey, function() {
			return this;
		});
		_add(isDone, "toString", function() {
			return "[object Generator]";
		});
		return (_getType = function() {
			return {
				w: wrapGenerator,
				m: createGeneratorRuntime
			};
		})();
	}
	function _add(targetObject, _propertyName, __________value, _isInternal) {
		var _defineProperty = Object.defineProperty;
		try {
			_defineProperty({}, "", {});
		} catch (_unknownVariable) {
			_defineProperty = 0;
		}
		_add = function(obj, ___propertyName, ________________value, isImmutable) {
			function _defineGeneratorMethod(command, __args) {
				_add(obj, command, function(________________________________value) {
					return this._invoke(command, __args, ________________________________value);
				});
			}
			___propertyName ? _defineProperty ? _defineProperty(obj, ___propertyName, {
				value: ________________value,
				enumerable: !isImmutable,
				configurable: !isImmutable,
				writable: !isImmutable
			}) : obj[___propertyName] = ________________value : (_defineGeneratorMethod("next", 0), _defineGeneratorMethod("throw", 1), _defineGeneratorMethod("return", 2));
		};
		_add(targetObject, _propertyName, __________value, _isInternal);
	}
	function getValue(iterator, __resolve, ____reject, __onFulfilled, onError, _methodName, arg) {
		try {
			var _iteratorResult = iterator[_methodName](arg);
			var ______________________value = _iteratorResult.value;
		} catch (______________________________________value) {
			return void ____reject(______________________________________value);
		}
		_iteratorResult.done ? __resolve(______________________value) : Promise.resolve(______________________value).then(__onFulfilled, onError);
	}
	function _clamp(_member, formatter) {
		var formattedName = formatter.formatFormal(_member.displayName);
		console.log(formattedName);
		console.log("Role: ".concat(_member.role, " | Trust Score: ").concat(_member.trustScore));
		console.log("Member ID: ".concat(_member.memberId));
	}
	function _() {
		var __context;
		__context = _getType().m(function runTasks() {
			var currentHour;
			var greetingMessage;
			var _circleArea;
			var currentValue;
			var unusedVariable;
			var _temp;
			var _unusedVariable;
			return _getType().w(function(_____context) {
				for (;;) {
					switch (_____context.n) {
						case 0: {
							currentHour = new Date().getHours();
							greetingMessage = unknownVariable("World", currentHour);
							console.log(greetingMessage);
							_circleArea = circleArea(5);
							console.log("Circle area with radius 5: ".concat(_circleArea.toFixed(2)));
							_____context.n = 1;
							return w(42);
						}
						case 1: {
							currentValue = _____context.v;
							unusedVariable = new missingVariable("en-US");
							_clamp(currentValue, unusedVariable);
							_____context.n = 2;
							return variableJ([
								1,
								2,
								42
							]);
						}
						case 2: {
							_temp = _____context.v;
							console.log("Team: ".concat(_temp.map(function(___item) {
								return ___item.name;
							}).join(", ")));
							_unusedVariable = unusedVariable.getStats();
							console.log("Sent ".concat(_unusedVariable.totalGreetings, " greeting(s) in ").concat(_unusedVariable.locale));
						}
						case 3: {
							return _____context.a(2);
						}
					}
				}
			}, runTasks);
		});
		_ = function() {
			var _self = this;
			var _args = arguments;
			return new Promise(function(________context, __reject) {
				var _generator = __context.apply(_self, _args);
				function nextHandler(_________________________________value) {
					getValue(_generator, ________context, __reject, nextHandler, _throwHandler, "next", _________________________________value);
				}
				function _throwHandler(_error) {
					getValue(_generator, ________context, __reject, nextHandler, _throwHandler, "throw", _error);
				}
				nextHandler(void 0);
			});
		};
		return _.apply(this, arguments);
	}
	(function() {
		return _.apply(this, arguments);
	})().catch(console.error);
})();
