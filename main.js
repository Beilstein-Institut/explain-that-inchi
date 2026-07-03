/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/
import _objectWithoutProperties from '@babel/runtime/helpers/objectWithoutProperties';
import _slicedToArray from '@babel/runtime/helpers/slicedToArray';
import _asyncToGenerator from '@babel/runtime/helpers/asyncToGenerator';
import _classCallCheck from '@babel/runtime/helpers/classCallCheck';
import _createClass from '@babel/runtime/helpers/createClass';
import _defineProperty from '@babel/runtime/helpers/defineProperty';
import _regeneratorRuntime from '@babel/runtime/regenerator';
import { C as Command, W as WorkerEvent, S as SupportedFormat } from './indigoWorker.types-44870eb7.js';
import { pickStandardServerOptions, CoreEditor, getLabelRenderModeForIndigo, ChemicalMimeType } from 'ketcher-core';

var domain;

// This constructor is used to store event handlers. Instantiating this is
// faster than explicitly calling `Object.create(null)` to get a "clean" empty
// object (tested with v8 v4.9).
function EventHandlers() {}
EventHandlers.prototype = Object.create(null);

function EventEmitter() {
  EventEmitter.init.call(this);
}

// nodejs oddity
// require('events') === require('events').EventEmitter
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.usingDomains = false;

EventEmitter.prototype.domain = undefined;
EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

EventEmitter.init = function() {
  this.domain = null;
  if (EventEmitter.usingDomains) {
    // if there is an active domain, then attach to it.
    if (domain.active ) ;
  }

  if (!this._events || this._events === Object.getPrototypeOf(this)._events) {
    this._events = new EventHandlers();
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events, domain;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  domain = this.domain;

  // If there is no 'error' event listener then throw.
  if (doError) {
    er = arguments[1];
    if (domain) {
      if (!er)
        er = new Error('Uncaught, unspecified "error" event');
      er.domainEmitter = this;
      er.domain = domain;
      er.domainThrown = false;
      domain.emit('error', er);
    } else if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
    // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
    // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = new EventHandlers();
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] = prepend ? [listener, existing] :
                                          [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
                            existing.length + ' ' + type + ' listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        emitWarning(w);
      }
    }
  }

  return target;
}
function emitWarning(e) {
  typeof console.warn === 'function' ? console.warn(e) : console.log(e);
}
EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function _onceWrap(target, type, listener) {
  var fired = false;
  function g() {
    target.removeListener(type, g);
    if (!fired) {
      fired = true;
      listener.apply(target, arguments);
    }
  }
  g.listener = listener;
  return g;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || (list.listener && list.listener === listener)) {
        if (--this._eventsCount === 0)
          this._events = new EventHandlers();
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length; i-- > 0;) {
          if (list[i] === listener ||
              (list[i].listener && list[i].listener === listener)) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (list.length === 1) {
          list[0] = undefined;
          if (--this._eventsCount === 0) {
            this._events = new EventHandlers();
            return this;
          } else {
            delete events[type];
          }
        } else {
          spliceOne(list, position);
        }

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = new EventHandlers();
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = new EventHandlers();
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        for (var i = 0, key; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = new EventHandlers();
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        do {
          this.removeListener(type, listeners[listeners.length - 1]);
        } while (listeners[0]);
      }

      return this;
    };

EventEmitter.prototype.listeners = function listeners(type) {
  var evlistener;
  var ret;
  var events = this._events;

  if (!events)
    ret = [];
  else {
    evlistener = events[type];
    if (!evlistener)
      ret = [];
    else if (typeof evlistener === 'function')
      ret = [evlistener.listener || evlistener];
    else
      ret = unwrapListeners(evlistener);
  }

  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, i) {
  var copy = new Array(i);
  while (i--)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

var STRUCT_SERVICE_NO_RENDER_INITIALIZED_EVENT = 'struct-service-no-render-initialized';
var STRUCT_SERVICE_INITIALIZED_EVENT = 'struct-service-initialized';

var indigoWorker = new Worker(new URL("indigoWorker-5d0a61ab.js", import.meta.url), {
  type: 'module'
});

var _excluded = ["outputFormat", "backgroundColor"];
var _messageTypeToEventMa;
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function convertMimeTypeToOutputFormat(mimeType) {
  var format;
  switch (mimeType) {
    case ChemicalMimeType.Mol:
      {
        format = SupportedFormat.Mol;
        break;
      }
    case ChemicalMimeType.Rxn:
      {
        format = SupportedFormat.Rxn;
        break;
      }
    case ChemicalMimeType.DaylightSmiles:
    case ChemicalMimeType.ExtendedSmiles:
      {
        format = SupportedFormat.Smiles;
        break;
      }
    case ChemicalMimeType.DaylightSmarts:
      {
        format = SupportedFormat.Smarts;
        break;
      }
    case ChemicalMimeType.InChI:
      {
        format = SupportedFormat.InChI;
        break;
      }
    case ChemicalMimeType.InChIAuxInfo:
      {
        format = SupportedFormat.InChIAuxInfo;
        break;
      }
    case ChemicalMimeType.InChIKey:
      {
        format = SupportedFormat.InChIKey;
        break;
      }
    case ChemicalMimeType.CML:
      {
        format = SupportedFormat.CML;
        break;
      }
    case ChemicalMimeType.KET:
      {
        format = SupportedFormat.Ket;
        break;
      }
    case ChemicalMimeType.CDXML:
      {
        format = SupportedFormat.CDXML;
        break;
      }
    case ChemicalMimeType.CDX:
      {
        format = SupportedFormat.CDX;
        break;
      }
    case ChemicalMimeType.SDF:
      {
        format = SupportedFormat.SDF;
        break;
      }
    case ChemicalMimeType.FASTA:
      {
        format = SupportedFormat.FASTA;
        break;
      }
    case ChemicalMimeType.SEQUENCE:
      {
        format = SupportedFormat.SEQUENCE;
        break;
      }
    case ChemicalMimeType.PeptideSequenceThreeLetter:
      {
        format = SupportedFormat.SEQUENCE_3_LETTER;
        break;
      }
    case ChemicalMimeType.IDT:
      {
        format = SupportedFormat.IDT;
        break;
      }
    case ChemicalMimeType.AXOLABS:
      {
        format = SupportedFormat.AXOLABS;
        break;
      }
    case ChemicalMimeType.HELM:
      {
        format = SupportedFormat.HELM;
        break;
      }
    case ChemicalMimeType.RDF:
      format = SupportedFormat.RDF;
      break;
    case ChemicalMimeType.MonomerLibrary:
      format = SupportedFormat.MonomerLibrary;
      break;
    case ChemicalMimeType.UNKNOWN:
    default:
      {
        throw new Error('Unsupported chemical mime type');
      }
  }
  return format;
}
function mapCalculatedPropertyName(property) {
  if (property === 'gross-formula') {
    return 'gross';
  }
  return property;
}
function mapWarningGroup(property) {
  if (property === 'OVERLAP_BOND') {
    return 'overlapping_bonds';
  }
  return property.toLowerCase();
}
var messageTypeToEventMapping = (_messageTypeToEventMa = {}, _defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_defineProperty(_messageTypeToEventMa, Command.Info, WorkerEvent.Info), Command.Convert, WorkerEvent.Convert), Command.Layout, WorkerEvent.Layout), Command.Clean, WorkerEvent.Clean), Command.Aromatize, WorkerEvent.Aromatize), Command.Dearomatize, WorkerEvent.Dearomatize), Command.CalculateCip, WorkerEvent.CalculateCip), Command.Automap, WorkerEvent.Automap), Command.Check, WorkerEvent.Check), Command.Calculate, WorkerEvent.Calculate), _defineProperty(_defineProperty(_defineProperty(_defineProperty(_messageTypeToEventMa, Command.GenerateImageAsBase64, WorkerEvent.GenerateImageAsBase64), Command.GetInChIKey, WorkerEvent.GetInChIKey), Command.ExplicitHydrogens, WorkerEvent.ExplicitHydrogens), Command.CalculateMacromoleculeProperties, WorkerEvent.CalculateMacromoleculeProperties));
var IndigoService = function () {
  function IndigoService(defaultOptions) {
    var _this = this;
    _classCallCheck(this, IndigoService);
    _defineProperty(this, "EE", new EventEmitter());
    _defineProperty(this, "ketcherId", null);
    this.defaultOptions = defaultOptions;
    this.worker = indigoWorker;
    this.worker.onmessage = function (e) {
      if (e.data.type === Command.Info) {
        var callbackMethod = _this.callIndigoLoadedCallback;
        callbackMethod();
      }
      var message = e.data;
      if (message.type !== undefined) {
        var event = messageTypeToEventMapping[message.type];
        _this.EE.emit(event, {
          data: message
        });
      }
    };
  }
  _createClass(IndigoService, [{
    key: "addKetcherId",
    value: function addKetcherId(ketcherId) {
      this.ketcherId = ketcherId;
    }
  }, {
    key: "getStandardServerOptions",
    value: function getStandardServerOptions(options) {
      if (!options) {
        return this.defaultOptions;
      }
      if (!this.ketcherId) {
        throw new Error('Cannot getting options because there are no ketcherId');
      }
      return pickStandardServerOptions(this.ketcherId, options);
    }
  }, {
    key: "callIndigoNoRenderLoadedCallback",
    value: function callIndigoNoRenderLoadedCallback() {
      window.dispatchEvent(new Event(STRUCT_SERVICE_NO_RENDER_INITIALIZED_EVENT));
    }
  }, {
    key: "callIndigoLoadedCallback",
    value: function callIndigoLoadedCallback() {
      window.dispatchEvent(new Event(STRUCT_SERVICE_INITIALIZED_EVENT));
    }
  }, {
    key: "getInChIKey",
    value: function () {
      var _getInChIKey = _asyncToGenerator( _regeneratorRuntime.mark(function _callee(struct) {
        var _this2 = this;
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) switch (_context.prev = _context.next) {
            case 0:
              return _context.abrupt("return", new Promise(function (resolve, reject) {
                var action = function action(_ref) {
                  var data = _ref.data;
                  var msg = data;
                  if (!msg.hasError) {
                    resolve(msg.payload || '');
                  } else {
                    reject(msg.error);
                  }
                };
                var inputMessage = {
                  type: Command.GetInChIKey,
                  data: {
                    struct: struct
                  }
                };
                _this2.EE.removeListener(WorkerEvent.GetInChIKey, action);
                _this2.EE.addListener(WorkerEvent.GetInChIKey, action);
                _this2.worker.postMessage(inputMessage);
              }));
            case 1:
            case "end":
              return _context.stop();
          }
        }, _callee);
      }));
      function getInChIKey(_x) {
        return _getInChIKey.apply(this, arguments);
      }
      return getInChIKey;
    }()
  }, {
    key: "info",
    value: function info() {
      var _this3 = this;
      return new Promise(function (resolve, reject) {
        var action = function action(_ref2) {
          var data = _ref2.data;
          var msg = data;
          if (!msg.hasError) {
            var result = {
              indigoVersion: msg.payload,
              imagoVersions: [],
              isAvailable: true
            };
            resolve(result);
          } else {
            reject(msg.error);
          }
        };
        _this3.EE.removeListener(WorkerEvent.Info, action);
        _this3.EE.addListener(WorkerEvent.Info, action);
        _this3.worker.postMessage({
          type: Command.Info
        });
      });
    }
  }, {
    key: "convert",
    value: function convert(data, options) {
      var _this4 = this;
      var outputFormat = data.output_format,
        inputFormat = data.input_format,
        struct = data.struct;
      var format = convertMimeTypeToOutputFormat(outputFormat);
      return new Promise(function (resolve, reject) {
        var _CoreEditor$provideEd;
        var action = function action(_ref3) {
          var data = _ref3.data;
          var msg = data;
          if (msg.inputData === struct) {
            if (!msg.hasError) {
              var result = {
                struct: msg.payload,
                format: outputFormat
              };
              resolve(result);
            } else {
              reject(msg.error);
            }
          }
        };
        var monomerLibrary = JSON.stringify((_CoreEditor$provideEd = CoreEditor.provideEditorInstance()) === null || _CoreEditor$provideEd === void 0 ? void 0 : _CoreEditor$provideEd.monomersLibraryParsedJson);
        var commandOptions = _objectSpread(_objectSpread({}, _this4.getStandardServerOptions(options)), {}, {
          'bond-length-unit': options === null || options === void 0 ? void 0 : options['bond-length-unit'],
          'bond-length': options === null || options === void 0 ? void 0 : options['bond-length'],
          'reaction-component-margin-size-unit': options === null || options === void 0 ? void 0 : options['reaction-component-margin-size-unit'],
          'reaction-component-margin-size': options === null || options === void 0 ? void 0 : options['reaction-component-margin-size'],
          'image-resolution': options === null || options === void 0 ? void 0 : options['image-resolution'],
          'input-format': inputFormat,
          'molfile-saving-mode': options === null || options === void 0 ? void 0 : options['molfile-saving-mode'],
          'monomer-library-saving-mode': options === null || options === void 0 ? void 0 : options['monomer-library-saving-mode'],
          'molfile-saving-skip-date': options === null || options === void 0 ? void 0 : options['molfile-saving-skip-date'],
          'sequence-type': options === null || options === void 0 ? void 0 : options['sequence-type'],
          'output-content-type': options === null || options === void 0 ? void 0 : options['output-content-type'],
          monomerLibrary: monomerLibrary
        });
        var commandData = {
          struct: struct,
          format: format,
          options: commandOptions
        };
        var inputMessage = {
          type: Command.Convert,
          data: commandData
        };
        _this4.EE.removeListener(WorkerEvent.Convert, action);
        _this4.EE.addListener(WorkerEvent.Convert, action);
        _this4.worker.postMessage(inputMessage);
      });
    }
  }, {
    key: "layout",
    value: function layout(data, options) {
      var _this5 = this;
      var struct = data.struct,
        outputFormat = data.output_format;
      var format = convertMimeTypeToOutputFormat(outputFormat);
      return new Promise(function (resolve, reject) {
        var action = function action(_ref4) {
          var data = _ref4.data;
          var msg = data;
          if (!msg.hasError) {
            var _struct = msg.payload.struct;
            var result = {
              struct: _struct,
              format: ChemicalMimeType.Mol
            };
            resolve(result);
          } else {
            reject(msg.error);
          }
        };
        var commandOptions = _objectSpread(_objectSpread({}, _this5.getStandardServerOptions(options)), {}, {
          'output-content-type': 'application/json',
          'render-label-mode': _this5.ketcherId ? getLabelRenderModeForIndigo(_this5.ketcherId) : undefined,
          'render-font-size': options === null || options === void 0 ? void 0 : options['render-font-size'],
          'render-font-size-unit': options === null || options === void 0 ? void 0 : options['render-font-size-unit'],
          'render-font-size-sub': options === null || options === void 0 ? void 0 : options['render-font-size-sub'],
          'render-font-size-sub-unit': options === null || options === void 0 ? void 0 : options['render-font-size-sub-unit'],
          'bond-length-unit': options === null || options === void 0 ? void 0 : options['bond-length-unit'],
          'bond-length': options === null || options === void 0 ? void 0 : options['bond-length'],
          'reaction-component-margin-size-unit': options === null || options === void 0 ? void 0 : options['reaction-component-margin-size-unit'],
          'reaction-component-margin-size': options === null || options === void 0 ? void 0 : options['reaction-component-margin-size'],
          'image-resolution': options === null || options === void 0 ? void 0 : options['image-resolution']
        });
        var commandData = {
          struct: struct,
          format: format,
          options: commandOptions
        };
        var inputMessage = {
          type: Command.Layout,
          data: commandData
        };
        _this5.EE.removeListener(WorkerEvent.Layout, action);
        _this5.EE.addListener(WorkerEvent.Layout, action);
        _this5.worker.postMessage(inputMessage);
      });
    }
  }, {
    key: "clean",
    value: function clean(data, options) {
      var _this6 = this;
      var struct = data.struct,
        selected = data.selected,
        outputFormat = data.output_format;
      var format = convertMimeTypeToOutputFormat(outputFormat);
      return new Promise(function (resolve, reject) {
        var action = function action(_ref5) {
          var data = _ref5.data;
          var msg = data;
          if (!msg.hasError) {
            var result = {
              struct: msg.payload,
              format: ChemicalMimeType.Mol
            };
            resolve(result);
          } else {
            reject(msg.error);
          }
        };
        var commandData = {
          struct: struct,
          format: format,
          options: _this6.getStandardServerOptions(options),
          selectedAtoms: selected || []
        };
        var inputMessage = {
          type: Command.Clean,
          data: commandData
        };
        _this6.EE.removeListener(WorkerEvent.Clean, action);
        _this6.EE.addListener(WorkerEvent.Clean, action);
        _this6.worker.postMessage(inputMessage);
      });
    }
  }, {
    key: "aromatize",
    value: function aromatize(data, options) {
      var _this7 = this;
      var struct = data.struct,
        outputFormat = data.output_format;
      var format = convertMimeTypeToOutputFormat(outputFormat);
      return new Promise(function (resolve, reject) {
        var action = function action(_ref6) {
          var data = _ref6.data;
          var msg = data;
          if (!msg.hasError) {
            var result = {
              struct: msg.payload,
              format: ChemicalMimeType.Mol
            };
            resolve(result);
          } else {
            reject(msg.error);
          }
        };
        var commandData = {
          struct: struct,
          format: format,
          options: _this7.getStandardServerOptions(options)
        };
        var inputMessage = {
          type: Command.Aromatize,
          data: commandData
        };
        _this7.EE.removeListener(WorkerEvent.Aromatize, action);
        _this7.EE.addListener(WorkerEvent.Aromatize, action);
        _this7.worker.postMessage(inputMessage);
      });
    }
  }, {
    key: "dearomatize",
    value: function dearomatize(data, options) {
      var _this8 = this;
      var struct = data.struct,
        outputFormat = data.output_format;
      var format = convertMimeTypeToOutputFormat(outputFormat);
      return new Promise(function (resolve, reject) {
        var action = function action(_ref7) {
          var data = _ref7.data;
          var msg = data;
          if (!msg.hasError) {
            var result = {
              struct: msg.payload,
              format: ChemicalMimeType.Mol
            };
            resolve(result);
          } else {
            reject(msg.error);
          }
        };
        var commandData = {
          struct: struct,
          format: format,
          options: _this8.getStandardServerOptions(options)
        };
        var inputMessage = {
          type: Command.Dearomatize,
          data: commandData
        };
        _this8.EE.removeListener(WorkerEvent.Dearomatize, action);
        _this8.EE.addListener(WorkerEvent.Dearomatize, action);
        _this8.worker.postMessage(inputMessage);
      });
    }
  }, {
    key: "calculateCip",
    value: function calculateCip(data, options) {
      var _this9 = this;
      var struct = data.struct,
        outputFormat = data.output_format;
      var format = convertMimeTypeToOutputFormat(outputFormat);
      return new Promise(function (resolve, reject) {
        var action = function action(_ref8) {
          var data = _ref8.data;
          var msg = data;
          if (!msg.hasError) {
            var result = {
              struct: msg.payload,
              format: ChemicalMimeType.Mol
            };
            resolve(result);
          } else {
            reject(msg.error);
          }
        };
        var commandData = {
          struct: struct,
          format: format,
          options: _this9.getStandardServerOptions(options)
        };
        var inputMessage = {
          type: Command.CalculateCip,
          data: commandData
        };
        _this9.EE.removeListener(WorkerEvent.CalculateCip, action);
        _this9.EE.addListener(WorkerEvent.CalculateCip, action);
        _this9.worker.postMessage(inputMessage);
      });
    }
  }, {
    key: "automap",
    value: function automap(data, options) {
      var _this10 = this;
      var mode = data.mode,
        struct = data.struct,
        outputFormat = data.output_format;
      var format = convertMimeTypeToOutputFormat(outputFormat);
      return new Promise(function (resolve, reject) {
        var action = function action(_ref9) {
          var data = _ref9.data;
          var msg = data;
          if (!msg.hasError) {
            var result = {
              struct: msg.payload,
              format: ChemicalMimeType.Mol
            };
            resolve(result);
          } else {
            reject(msg.error);
          }
        };
        var commandData = {
          struct: struct,
          format: format,
          mode: mode,
          options: _this10.getStandardServerOptions(options)
        };
        var inputMessage = {
          type: Command.Automap,
          data: commandData
        };
        _this10.EE.removeListener(WorkerEvent.Automap, action);
        _this10.EE.addListener(WorkerEvent.Automap, action);
        _this10.worker.postMessage(inputMessage);
      });
    }
  }, {
    key: "check",
    value: function check(data, options) {
      var _this11 = this;
      var types = data.types,
        struct = data.struct;
      return new Promise(function (resolve, reject) {
        var action = function action(_ref10) {
          var data = _ref10.data;
          var msg = data;
          if (!msg.hasError) {
            var warnings = JSON.parse(msg.payload);
            var result = Object.entries(warnings).reduce(function (acc, curr) {
              var _curr = _slicedToArray(curr, 2),
                key = _curr[0],
                value = _curr[1];
              var mappedPropertyName = mapWarningGroup(key);
              acc[mappedPropertyName] = value;
              return acc;
            }, {});
            resolve(result);
          } else {
            reject(msg.error);
          }
        };
        var commandData = {
          struct: struct,
          types: types,
          options: _this11.getStandardServerOptions(options)
        };
        var inputMessage = {
          type: Command.Check,
          data: commandData
        };
        _this11.EE.removeListener(WorkerEvent.Check, action);
        _this11.EE.addListener(WorkerEvent.Check, action);
        _this11.worker.postMessage(inputMessage);
      });
    }
  }, {
    key: "calculate",
    value: function calculate(data, options) {
      var _this12 = this;
      var properties = data.properties,
        struct = data.struct,
        selected = data.selected;
      return new Promise(function (resolve, reject) {
        var action = function action(_ref11) {
          var data = _ref11.data;
          var msg = data;
          if (!msg.hasError) {
            var calculatedProperties = JSON.parse(msg.payload);
            var result = Object.entries(calculatedProperties).reduce(function (acc, curr) {
              var _curr2 = _slicedToArray(curr, 2),
                key = _curr2[0],
                value = _curr2[1];
              var mappedPropertyName = mapCalculatedPropertyName(key);
              if (properties.includes(mappedPropertyName)) {
                acc[mappedPropertyName] = value;
              }
              return acc;
            }, {});
            resolve(result);
          } else {
            reject(msg.error);
          }
        };
        var commandData = {
          struct: struct,
          properties: properties,
          options: _this12.getStandardServerOptions(options),
          selectedAtoms: selected || []
        };
        var inputMessage = {
          type: Command.Calculate,
          data: commandData
        };
        _this12.EE.removeListener(WorkerEvent.Calculate, action);
        _this12.EE.addListener(WorkerEvent.Calculate, action);
        _this12.worker.postMessage(inputMessage);
      });
    }
  }, {
    key: "recognize",
    value: function recognize(_blob, _version) {
      return Promise.reject(new Error('Not supported in standalone mode'));
    }
  }, {
    key: "generateImageAsBase64",
    value: function generateImageAsBase64(inputData) {
      var _this13 = this;
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
        outputFormat: 'png',
        backgroundColor: ''
      };
      var outputFormat = options.outputFormat,
        backgroundColor = options.backgroundColor,
        restOptions = _objectWithoutProperties(options, _excluded);
      return new Promise(function (resolve, reject) {
        var action = function action(_ref12) {
          var data = _ref12.data;
          var msg = data;
          if (msg.inputData === inputData) {
            if (!msg.hasError) {
              resolve(msg.payload);
            } else {
              reject(msg.error);
            }
          }
        };
        var commandOptions = _objectSpread(_objectSpread({}, _this13.getStandardServerOptions(restOptions)), {}, {
          'render-label-mode': _this13.ketcherId ? getLabelRenderModeForIndigo(_this13.ketcherId) : undefined,
          'render-coloring': restOptions['render-coloring'],
          'render-font-size': restOptions['render-font-size'],
          'render-font-size-unit': restOptions['render-font-size-unit'],
          'render-font-size-sub': restOptions['render-font-size-sub'],
          'render-font-size-sub-unit': restOptions['render-font-size-sub-unit'],
          'image-resolution': restOptions['image-resolution'],
          'bond-length-unit': restOptions['bond-length-unit'],
          'bond-length': restOptions['bond-length'],
          'render-bond-thickness': restOptions['render-bond-thickness'],
          'render-bond-thickness-unit': restOptions['render-bond-thickness-unit'],
          'render-bond-spacing': restOptions['render-bond-spacing'],
          'render-stereo-bond-width': restOptions['render-stereo-bond-width'],
          'render-stereo-bond-width-unit': restOptions['render-stereo-bond-width-unit'],
          'render-stereo-style': restOptions['render-stereo-style'],
          'render-hash-spacing': restOptions['render-hash-spacing'],
          'render-hash-spacing-unit': restOptions['render-hash-spacing-unit'],
          'render-output-sheet-width': restOptions['render-output-sheet-width'],
          'render-output-sheet-height': restOptions['render-output-sheet-height']
        });
        var commandData = {
          struct: inputData,
          outputFormat: outputFormat || 'png',
          backgroundColor: backgroundColor,
          options: commandOptions
        };
        var inputMessage = {
          type: Command.GenerateImageAsBase64,
          data: commandData
        };
        _this13.EE.removeListener(WorkerEvent.GenerateImageAsBase64, action);
        _this13.EE.addListener(WorkerEvent.GenerateImageAsBase64, action);
        _this13.worker.postMessage(inputMessage);
      });
    }
  }, {
    key: "toggleExplicitHydrogens",
    value: function toggleExplicitHydrogens(data, options) {
      var _this14 = this;
      var struct = data.struct,
        outputFormat = data.output_format;
      var format = convertMimeTypeToOutputFormat(outputFormat);
      var mode = 'auto';
      return new Promise(function (resolve, reject) {
        var action = function action(_ref13) {
          var data = _ref13.data;
          var msg = data;
          if (!msg.hasError) {
            var result = {
              struct: msg.payload,
              format: ChemicalMimeType.Mol
            };
            resolve(result);
          } else {
            reject(msg.error);
          }
        };
        var commandData = {
          struct: struct,
          format: format,
          mode: mode,
          options: _this14.getStandardServerOptions(options)
        };
        var inputMessage = {
          type: Command.ExplicitHydrogens,
          data: commandData
        };
        _this14.EE.removeListener(WorkerEvent.ExplicitHydrogens, action);
        _this14.EE.addListener(WorkerEvent.ExplicitHydrogens, action);
        _this14.worker.postMessage(inputMessage);
      });
    }
  }, {
    key: "calculateMacromoleculeProperties",
    value: function calculateMacromoleculeProperties(data, options) {
      var _this15 = this;
      var struct = data.struct;
      return new Promise(function (resolve, reject) {
        var action = function action(_ref14) {
          var data = _ref14.data;
          var msg = data;
          if (!msg.hasError) {
            resolve(JSON.parse(msg.payload));
          } else {
            reject(msg.error);
          }
        };
        var commandData = {
          struct: struct,
          options: _objectSpread(_objectSpread({}, _this15.getStandardServerOptions(options)), {}, {
            upc: options === null || options === void 0 ? void 0 : options.upc,
            nac: options === null || options === void 0 ? void 0 : options.nac
          })
        };
        var inputMessage = {
          type: Command.CalculateMacromoleculeProperties,
          data: commandData
        };
        _this15.EE.removeAllListeners(WorkerEvent.CalculateMacromoleculeProperties);
        _this15.EE.addListener(WorkerEvent.CalculateMacromoleculeProperties, action);
        _this15.worker.postMessage(inputMessage);
      });
    }
  }, {
    key: "destroy",
    value: function destroy() {
      this.worker.terminate();
      this.worker.onmessage = null;
    }
  }]);
  return IndigoService;
}();

var StandaloneStructServiceProvider = function () {
  function StandaloneStructServiceProvider() {
    _classCallCheck(this, StandaloneStructServiceProvider);
    _defineProperty(this, "mode", 'standalone');
  }
  _createClass(StandaloneStructServiceProvider, [{
    key: "createStructService",
    value: function createStructService(options) {
      return new IndigoService(options);
    }
  }]);
  return StandaloneStructServiceProvider;
}();

export { STRUCT_SERVICE_INITIALIZED_EVENT, STRUCT_SERVICE_NO_RENDER_INITIALIZED_EVENT, IndigoService as StandaloneStructService, StandaloneStructServiceProvider };
//# sourceMappingURL=main.js.map
