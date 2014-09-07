'use strict';
/* Scala.js runtime support
 * Copyright 2013 LAMP/EPFL
 * Author: Sébastien Doeraene
 */

/* ---------------------------------- *
 * The top-level Scala.js environment *
 * ---------------------------------- */

var ScalaJS = {
  // Fields
  g: (typeof global === "object" && global && global["Object"] === Object) ? global : this, // Global scope
  e: (typeof __ScalaJSEnv === "object" && __ScalaJSEnv &&
      typeof __ScalaJSEnv["exportsNamespace"] === "object" &&
      __ScalaJSEnv["exportsNamespace"]) ? __ScalaJSEnv["exportsNamespace"] : // Where to send exports
      ((typeof global === "object" && global && global["Object"] === Object) ? global : this),
  d: {},         // Data for types
  c: {},         // Scala.js constructors
  h: {},         // Inheritable constructors (without initialization code)
  i: {},         // Implementation class modules
  n: {},         // Module instances
  m: {},         // Module accessors
  is: {},        // isInstanceOf methods
  as: {},        // asInstanceOf methods
  isArrayOf: {}, // isInstanceOfArrayOf methods
  asArrayOf: {}, // asInstanceOfArrayOf methods

  // Core mechanism

  makeIsArrayOfPrimitive: function(primitiveData) {
    return function(obj, depth) {
      return !!(obj && obj.$classData &&
        (obj.$classData.arrayDepth === depth) &&
        (obj.$classData.arrayBase === primitiveData));
    }
  },

  makeAsArrayOfPrimitive: function(isInstanceOfFunction, arrayEncodedName) {
    return function(obj, depth) {
      if (isInstanceOfFunction(obj, depth) || (obj === null))
        return obj;
      else
        ScalaJS.throwArrayCastException(obj, arrayEncodedName, depth);
    }
  },

  /** Encode a property name for runtime manipulation
   *  Usage:
   *    env.propertyName({someProp:0})
   *  Returns:
   *    "someProp"
   *  Useful when the property is renamed by a global optimizer (like Closure)
   *  but we must still get hold of a string of that name for runtime
   * reflection.
   */
  propertyName: function(obj) {
    var result;
    for (var prop in obj)
      result = prop;
    return result;
  },

  // Runtime functions

  isScalaJSObject: function(obj) {
    return !!(obj && obj.$classData);
  },

  throwClassCastException: function(instance, classFullName) {
    throw new ScalaJS.c.jl_ClassCastException().init___T(
      instance + " is not an instance of " + classFullName);
  },

  throwArrayCastException: function(instance, classArrayEncodedName, depth) {
    for (; depth; --depth)
      classArrayEncodedName = "[" + classArrayEncodedName;
    ScalaJS.throwClassCastException(instance, classArrayEncodedName);
  },

  wrapJavaScriptException: function(exception) {
    if (ScalaJS.isScalaJSObject(exception))
      return exception;
    else
      return new ScalaJS.c.sjs_js_JavaScriptException()
        .init___sjs_js_Any(exception);
  },

  unwrapJavaScriptException: function(exception) {
    if (ScalaJS.is.sjs_js_JavaScriptException(exception))
      return exception.exception__sjs_js_Any();
    else
      return exception;
  },

  makeNativeArrayWrapper: function(arrayClassData, nativeArray) {
    return new arrayClassData.constr(nativeArray);
  },

  newArrayObject: function(arrayClassData, lengths) {
    return ScalaJS.newArrayObjectInternal(arrayClassData, lengths, 0);
  },

  newArrayObjectInternal: function(arrayClassData, lengths, lengthIndex) {
    var result = new arrayClassData.constr(lengths[lengthIndex]);

    if (lengthIndex < lengths.length-1) {
      var subArrayClassData = arrayClassData.componentData;
      var subLengthIndex = lengthIndex+1;
      var underlying = result.u;
      for (var i = 0; i < underlying.length; i++) {
        underlying[i] = ScalaJS.newArrayObjectInternal(
          subArrayClassData, lengths, subLengthIndex);
      }
    }

    return result;
  },

  cloneObject: function(obj) {
    function Clone(from) {
      for (var field in from)
        if (from["hasOwnProperty"](field))
          this[field] = from[field];
    }
    Clone.prototype = ScalaJS.g["Object"]["getPrototypeOf"](obj);
    return new Clone(obj);
  },

  applyMethodWithVarargs: function(instance, methodName, argArray) {
    // Note: cannot be inlined because `instance` would be evaluated twice
    return instance[methodName].apply(instance, argArray);
  },

  newInstanceWithVarargs: function(constructor, argArray) {
    // Not really "possible" in JavaScript, so we emulate what it would be
    function c() {};
    c.prototype = constructor.prototype;
    var instance = new c;
    var result = constructor.apply(instance, argArray);
    switch (typeof result) {
      case "undefined":
      case "number":
      case "boolean":
      case "string":
        return instance;
      default:
        if (result === null)
          return instance;
        else
          return result;
    }
  },

  checkNonNull: function(obj) {
    return obj !== null ? obj : ScalaJS.throwNullPointerException();
  },

  throwNullPointerException: function() {
    throw new ScalaJS.c.jl_NullPointerException().init___();
  },

  anyEqEq: function(lhs, rhs) {
    if (ScalaJS.isScalaJSObject(lhs) || typeof lhs === "number") {
      return ScalaJS.m.sr_BoxesRunTime().equals__O__O__Z(lhs, rhs);
    } else {
      return lhs === rhs;
    }
  },

  anyRefEqEq: function(lhs, rhs) {
    if (lhs === null)
      return rhs === null;
    else
      return ScalaJS.objectEquals(lhs, rhs);
  },

  objectToString: function(instance) {
    if (instance === void 0)
      return "undefined";
    else
      return instance.toString();
  },

  objectGetClass: function(instance) {
    switch (typeof instance) {
      case "string":
        return ScalaJS.d.T.getClassOf();
      case "number":
        if (ScalaJS.isInt(instance))
          return ScalaJS.d.jl_Integer.getClassOf();
        else
          return ScalaJS.d.jl_Double.getClassOf();
      case "boolean":
        return ScalaJS.d.jl_Boolean.getClassOf();
      case "undefined":
        return ScalaJS.d.sr_BoxedUnit.getClassOf();
      default:
        if (ScalaJS.is.sjsr_RuntimeLong(instance))
          return ScalaJS.d.jl_Long.getClassOf();
        else if (ScalaJS.isScalaJSObject(instance) || (instance === null))
          return instance.getClass__jl_Class();
        else
          return null; // Exception?
    }
  },

  objectClone: function(instance) {
    if (ScalaJS.isScalaJSObject(instance) || (instance === null))
      return instance.clone__O();
    else
      throw new ScalaJS.c.jl_CloneNotSupportedException().init___();
  },

  objectNotify: function(instance) {
    // final and no-op in java.lang.Object
    if (instance === null)
      instance.notify__V();
  },

  objectNotifyAll: function(instance) {
    // final and no-op in java.lang.Object
    if (instance === null)
      instance.notifyAll__V();
  },

  objectFinalize: function(instance) {
    if (ScalaJS.isScalaJSObject(instance) || (instance === null))
      instance.finalize__V();
    // else no-op
  },

  objectEquals: function(instance, rhs) {
    if (ScalaJS.isScalaJSObject(instance) || (instance === null))
      return instance.equals__O__Z(rhs);
    else if (typeof instance === "number")
      return typeof rhs === "number" && ScalaJS.numberEquals(instance, rhs);
    else
      return instance === rhs;
  },

  numberEquals: function(lhs, rhs) {
    return (
      lhs === rhs // 0.0 === -0.0 to prioritize the Int case over the Double case
    ) || (
      // are they both NaN?
      (lhs !== lhs) && (rhs !== rhs)
    );
  },

  objectHashCode: function(instance) {
    switch (typeof instance) {
      case "string":
        // calculate hash of String as specified by JavaDoc
        var n = instance["length"];
        var res = 0;
        var mul = 1; // holds pow(31, n-i-1)
        // multiplications with `mul` do never overflow the 52 bits of precision:
        // - we truncate `mul` to 32 bits on each operation
        // - 31 has 5 significant bits only
        // - s[i] has 16 significant bits max
        // 32 + max(5, 16) = 48 < 52 => no overflow
        for (var i = n-1; i >= 0; --i) {
          // calculate s[i] * pow(31, n-i-1)
          res = res + (instance["charCodeAt"](i) * mul | 0) | 0
          // update mul for next iteration
          mul = mul * 31 | 0
        }
        return res;
      case "number":
        return instance | 0;
      case "boolean":
        return instance ? 1231 : 1237;
      case "undefined":
        return 0;
      default:
        if (ScalaJS.isScalaJSObject(instance) || instance === null)
          return instance.hashCode__I();
        else
          return 42; // TODO?
    }
  },

  comparableCompareTo: function(instance, rhs) {
    switch (typeof instance) {
      case "string":
        ScalaJS.as.T(rhs);
        return instance === rhs ? 0 : (instance < rhs ? -1 : 1);
      case "number":
        ScalaJS.as.jl_Number(rhs);
        return ScalaJS.numberEquals(instance, rhs) ? 0 : (instance < rhs ? -1 : 1);
      case "boolean":
        ScalaJS.asBoolean(rhs);
        return instance - rhs; // yes, this gives the right result
      default:
        return instance.compareTo__O__I(rhs);
    }
  },

  charSequenceLength: function(instance) {
    if (typeof(instance) === "string")
      return instance["length"];
    else
      return instance.length__I();
  },

  charSequenceCharAt: function(instance, index) {
    if (typeof(instance) === "string")
      return instance["charCodeAt"](index);
    else
      return instance.charAt__I__C(index);
  },

  charSequenceSubSequence: function(instance, start, end) {
    if (typeof(instance) === "string")
      return instance["substring"](start, end);
    else
      return instance.subSequence__I__I__jl_CharSequence(start, end);
  },

  booleanBooleanValue: function(instance) {
    if (typeof instance === "boolean") return instance;
    else                               return instance.booleanValue__Z();
  },

  numberByteValue: function(instance) {
    if (typeof instance === "number") return (instance << 24) >> 24;
    else                              return instance.byteValue__B();
  },
  numberShortValue: function(instance) {
    if (typeof instance === "number") return (instance << 16) >> 16;
    else                              return instance.shortValue__S();
  },
  numberIntValue: function(instance) {
    if (typeof instance === "number") return instance | 0;
    else                              return instance.intValue__I();
  },
  numberLongValue: function(instance) {
    if (typeof instance === "number")
      return ScalaJS.m.sjsr_RuntimeLong().fromDouble__D__sjsr_RuntimeLong(instance);
    else
      return instance.longValue__J();
  },
  numberFloatValue: function(instance) {
    if (typeof instance === "number") return instance;
    else                              return instance.floatValue__F();
  },
  numberDoubleValue: function(instance) {
    if (typeof instance === "number") return instance;
    else                              return instance.doubleValue__D();
  },

  isNaN: function(instance) {
    return instance !== instance;
  },

  isInfinite: function(instance) {
    return !ScalaJS.g["isFinite"](instance) && !ScalaJS.isNaN(instance);
  },

  propertiesOf: function(obj) {
    var result = new Array();
    for (var prop in obj)
      result["push"](prop.toString());
    return result;
  },

  systemArraycopy: function(src, srcPos, dest, destPos, length) {
    var srcu = src.u;
    var destu = dest.u;
    if (srcu !== destu || destPos < srcPos || srcPos + length < destPos) {
      for (var i = 0; i < length; i++)
        destu[destPos+i] = srcu[srcPos+i];
    } else {
      for (var i = length-1; i >= 0; i--)
        destu[destPos+i] = srcu[srcPos+i];
    }
  },

  environmentInfo: function() {
    if (typeof __ScalaJSEnv !== "undefined")
      return __ScalaJSEnv;
    else
      return void 0;
  },

  // is/as for hijacked boxed classes (the non-trivial ones)

  isByte: function(v) {
    return (v << 24 >> 24) === v;
  },

  isShort: function(v) {
    return (v << 16 >> 16) === v;
  },

  isInt: function(v) {
    return (v | 0) === v;
  },

  asUnit: function(v) {
    if (v === void 0)
      return v;
    else
      ScalaJS.throwClassCastException(v, "scala.runtime.BoxedUnit");
  },

  asBoolean: function(v) {
    if (typeof v === "boolean" || v === null)
      return v;
    else
      ScalaJS.throwClassCastException(v, "java.lang.Boolean");
  },

  asByte: function(v) {
    if (ScalaJS.isByte(v) || v === null)
      return v;
    else
      ScalaJS.throwClassCastException(v, "java.lang.Byte");
  },

  asShort: function(v) {
    if (ScalaJS.isShort(v) || v === null)
      return v;
    else
      ScalaJS.throwClassCastException(v, "java.lang.Short");
  },

  asInt: function(v) {
    if (ScalaJS.isInt(v) || v === null)
      return v;
    else
      ScalaJS.throwClassCastException(v, "java.lang.Integer");
  },

  asFloat: function(v) {
    if (typeof v === "number" || v === null)
      return v;
    else
      ScalaJS.throwClassCastException(v, "java.lang.Float");
  },

  asDouble: function(v) {
    if (typeof v === "number" || v === null)
      return v;
    else
      ScalaJS.throwClassCastException(v, "java.lang.Double");
  },

  // Boxes

  bC: function(value) {
    return new ScalaJS.c.jl_Character().init___C(value);
  },

  // Unboxes

  uZ: function(value) {
    return ScalaJS.asBoolean(value) || false;
  },
  uC: function(value) {
    return null === value ? 0 : ScalaJS.as.jl_Character(value).value$1;
  },
  uB: function(value) {
    return ScalaJS.asByte(value) || 0;
  },
  uS: function(value) {
    return ScalaJS.asShort(value) || 0;
  },
  uI: function(value) {
    return ScalaJS.asInt(value) || 0;
  },
  uJ: function(value) {
    return ScalaJS.as.sjsr_RuntimeLong(value) ||
      ScalaJS.m.sjsr_RuntimeLong().zero__sjsr_RuntimeLong();
  },
  uF: function(value) {
    // NaN || 0.0 is unfortunately 0.0
    return null === value ? 0.0 : ScalaJS.asFloat(value);
  },
  uD: function(value) {
    // NaN || 0.0 is unfortunately 0.0
    return null === value ? 0.0 : ScalaJS.asDouble(value);
  },

  // TypeArray conversions

  byteArray2TypedArray: function(value) { return new Int8Array(value.u); },
  shortArray2TypedArray: function(value) { return new Int16Array(value.u); },
  charArray2TypedArray: function(value) { return new Uint16Array(value.u); },
  intArray2TypedArray: function(value) { return new Int32Array(value.u); },
  floatArray2TypedArray: function(value) { return new Float32Array(value.u); },
  doubleArray2TypedArray: function(value) { return new Float64Array(value.u); },

  typedArray2ByteArray: function(value) {
    var arrayClassData = ScalaJS.d.B.getArrayOf();
    return new arrayClassData.constr(new Int8Array(value));
  },
  typedArray2ShortArray: function(value) {
    var arrayClassData = ScalaJS.d.S.getArrayOf();
    return new arrayClassData.constr(new Int16Array(value));
  },
  typedArray2CharArray: function(value) {
    var arrayClassData = ScalaJS.d.C.getArrayOf();
    return new arrayClassData.constr(new Uint16Array(value));
  },
  typedArray2IntArray: function(value) {
    var arrayClassData = ScalaJS.d.I.getArrayOf();
    return new arrayClassData.constr(new Int32Array(value));
  },
  typedArray2FloatArray: function(value) {
    var arrayClassData = ScalaJS.d.F.getArrayOf();
    return new arrayClassData.constr(new Float32Array(value));
  },
  typedArray2DoubleArray: function(value) {
    var arrayClassData = ScalaJS.d.D.getArrayOf();
    return new arrayClassData.constr(new Float64Array(value));
  }
}

/* We have to force a non-elidable *read* of ScalaJS.e, otherwise Closure will
 * eliminate it altogether, along with all the exports, which is ... er ...
 * plain wrong.
 */
this["__ScalaJSExportsNamespace"] = ScalaJS.e;

// Type data constructors

/** @constructor */
ScalaJS.PrimitiveTypeData = function(zero, arrayEncodedName, displayName) {
  // Runtime support
  this.constr = undefined;
  this.parentData = undefined;
  this.ancestors = {};
  this.componentData = null;
  this.zero = zero;
  this.arrayEncodedName = arrayEncodedName;
  this._classOf = undefined;
  this._arrayOf = undefined;
  this.isArrayOf = function(obj, depth) { return false; };

  // java.lang.Class support
  this["name"] = displayName;
  this["isPrimitive"] = true;
  this["isInterface"] = false;
  this["isArrayClass"] = false;
  this["isInstance"] = function(obj) { return false; };
};

/** @constructor */
ScalaJS.ClassTypeData = function(internalNameObj, isInterface, fullName,
                                 parentData, ancestors, isInstance, isArrayOf) {
  var internalName = ScalaJS.propertyName(internalNameObj);

  isInstance = isInstance || function(obj) {
    return !!(obj && obj.$classData && obj.$classData.ancestors[internalName]);
  };

  isArrayOf = isArrayOf || function(obj, depth) {
    return !!(obj && obj.$classData && (obj.$classData.arrayDepth === depth)
      && obj.$classData.arrayBase.ancestors[internalName])
  };

  // Runtime support
  this.constr = undefined;
  this.parentData = parentData;
  this.ancestors = ancestors;
  this.componentData = null;
  this.zero = null;
  this.arrayEncodedName = "L"+fullName+";";
  this._classOf = undefined;
  this._arrayOf = undefined;
  this.isArrayOf = isArrayOf;

  // java.lang.Class support
  this["name"] = fullName;
  this["isPrimitive"] = false;
  this["isInterface"] = isInterface;
  this["isArrayClass"] = false;
  this["isInstance"] = isInstance;
};

/** @constructor */
ScalaJS.ArrayTypeData = function(componentData) {
  // The constructor

  var componentZero = componentData.zero;

  // The zero for the Long runtime representation
  // is a special case here, since the class has not
  // been defined yet, when this file is read
  if (componentZero == "longZero")
    componentZero = ScalaJS.m.sjsr_RuntimeLong().zero__sjsr_RuntimeLong();

  /** @constructor */
  var ArrayClass = function(arg) {
    if (typeof(arg) === "number") {
      // arg is the length of the array
      this.u = new Array(arg);
      for (var i = 0; i < arg; i++)
        this.u[i] = componentZero;
    } else {
      // arg is a native array that we wrap
      this.u = arg;
    }
  }
  ArrayClass.prototype = new ScalaJS.h.O;
  ArrayClass.prototype.constructor = ArrayClass;
  ArrayClass.prototype.$classData = this;

  ArrayClass.prototype.clone__O = function() {
    if (this.u instanceof Array)
      return new ArrayClass(this.u["slice"](0));
    else
      // The underlying Array is a TypedArray
      return new ArrayClass(this.u.constructor(this.u));
  };

  // Don't generate reflective call proxies. The compiler special cases
  // reflective calls to methods on scala.Array

  // The data

  var encodedName = "[" + componentData.arrayEncodedName;
  var componentBase = componentData.arrayBase || componentData;
  var componentDepth = componentData.arrayDepth || 0;
  var arrayDepth = componentDepth + 1;

  var isInstance = function(obj) {
    return componentBase.isArrayOf(obj, arrayDepth);
  }

  // Runtime support
  this.constr = ArrayClass;
  this.parentData = ScalaJS.d.O;
  this.ancestors = {O: 1};
  this.componentData = componentData;
  this.arrayBase = componentBase;
  this.arrayDepth = arrayDepth;
  this.zero = null;
  this.arrayEncodedName = encodedName;
  this._classOf = undefined;
  this._arrayOf = undefined;
  this.isArrayOf = undefined;

  // java.lang.Class support
  this["name"] = encodedName;
  this["isPrimitive"] = false;
  this["isInterface"] = false;
  this["isArrayClass"] = true;
  this["isInstance"] = isInstance;
};

ScalaJS.ClassTypeData.prototype.getClassOf = function() {
  if (!this._classOf)
    this._classOf = new ScalaJS.c.jl_Class().init___jl_ScalaJSClassData(this);
  return this._classOf;
};

ScalaJS.ClassTypeData.prototype.getArrayOf = function() {
  if (!this._arrayOf)
    this._arrayOf = new ScalaJS.ArrayTypeData(this);
  return this._arrayOf;
};

// java.lang.Class support

ScalaJS.ClassTypeData.prototype["getFakeInstance"] = function() {
  if (this === ScalaJS.d.T)
    return "some string";
  else if (this === ScalaJS.d.jl_Boolean)
    return false;
  else if (this === ScalaJS.d.jl_Byte ||
           this === ScalaJS.d.jl_Short ||
           this === ScalaJS.d.jl_Integer ||
           this === ScalaJS.d.jl_Float ||
           this === ScalaJS.d.jl_Double)
    return 0;
  else if (this === ScalaJS.d.jl_Long)
    return ScalaJS.m.sjsr_RuntimeLong().zero__sjsr_RuntimeLong();
  else if (this === ScalaJS.d.sr_BoxedUnit)
    return void 0;
  else
    return {$classData: this};
};

ScalaJS.ClassTypeData.prototype["getSuperclass"] = function() {
  return this.parentData ? this.parentData.getClassOf() : null;
};

ScalaJS.ClassTypeData.prototype["getComponentType"] = function() {
  return this.componentData ? this.componentData.getClassOf() : null;
};

ScalaJS.ClassTypeData.prototype["newArrayOfThisClass"] = function(lengths) {
  var arrayClassData = this;
  for (var i = 0; i < lengths.length; i++)
    arrayClassData = arrayClassData.getArrayOf();
  return ScalaJS.newArrayObject(arrayClassData, lengths);
};

ScalaJS.PrimitiveTypeData.prototype = ScalaJS.ClassTypeData.prototype;
ScalaJS.ArrayTypeData.prototype = ScalaJS.ClassTypeData.prototype;

// Create primitive types

ScalaJS.d.V = new ScalaJS.PrimitiveTypeData(undefined, "V", "void");
ScalaJS.d.Z = new ScalaJS.PrimitiveTypeData(false, "Z", "boolean");
ScalaJS.d.C = new ScalaJS.PrimitiveTypeData(0, "C", "char");
ScalaJS.d.B = new ScalaJS.PrimitiveTypeData(0, "B", "byte");
ScalaJS.d.S = new ScalaJS.PrimitiveTypeData(0, "S", "short");
ScalaJS.d.I = new ScalaJS.PrimitiveTypeData(0, "I", "int");
ScalaJS.d.J = new ScalaJS.PrimitiveTypeData("longZero", "J", "long");
ScalaJS.d.F = new ScalaJS.PrimitiveTypeData(0.0, "F", "float");
ScalaJS.d.D = new ScalaJS.PrimitiveTypeData(0.0, "D", "double");

// Instance tests for array of primitives

ScalaJS.isArrayOf.Z = ScalaJS.makeIsArrayOfPrimitive(ScalaJS.d.Z);
ScalaJS.asArrayOf.Z = ScalaJS.makeAsArrayOfPrimitive(ScalaJS.isArrayOf.Z, "Z");
ScalaJS.d.Z.isArrayOf = ScalaJS.isArrayOf.Z;

ScalaJS.isArrayOf.C = ScalaJS.makeIsArrayOfPrimitive(ScalaJS.d.C);
ScalaJS.asArrayOf.C = ScalaJS.makeAsArrayOfPrimitive(ScalaJS.isArrayOf.C, "C");
ScalaJS.d.C.isArrayOf = ScalaJS.isArrayOf.C;

ScalaJS.isArrayOf.B = ScalaJS.makeIsArrayOfPrimitive(ScalaJS.d.B);
ScalaJS.asArrayOf.B = ScalaJS.makeAsArrayOfPrimitive(ScalaJS.isArrayOf.B, "B");
ScalaJS.d.B.isArrayOf = ScalaJS.isArrayOf.B;

ScalaJS.isArrayOf.S = ScalaJS.makeIsArrayOfPrimitive(ScalaJS.d.S);
ScalaJS.asArrayOf.S = ScalaJS.makeAsArrayOfPrimitive(ScalaJS.isArrayOf.S, "S");
ScalaJS.d.S.isArrayOf = ScalaJS.isArrayOf.S;

ScalaJS.isArrayOf.I = ScalaJS.makeIsArrayOfPrimitive(ScalaJS.d.I);
ScalaJS.asArrayOf.I = ScalaJS.makeAsArrayOfPrimitive(ScalaJS.isArrayOf.I, "I");
ScalaJS.d.I.isArrayOf = ScalaJS.isArrayOf.I;

ScalaJS.isArrayOf.J = ScalaJS.makeIsArrayOfPrimitive(ScalaJS.d.J);
ScalaJS.asArrayOf.J = ScalaJS.makeAsArrayOfPrimitive(ScalaJS.isArrayOf.J, "J");
ScalaJS.d.J.isArrayOf = ScalaJS.isArrayOf.J;

ScalaJS.isArrayOf.F = ScalaJS.makeIsArrayOfPrimitive(ScalaJS.d.F);
ScalaJS.asArrayOf.F = ScalaJS.makeAsArrayOfPrimitive(ScalaJS.isArrayOf.F, "F");
ScalaJS.d.F.isArrayOf = ScalaJS.isArrayOf.F;

ScalaJS.isArrayOf.D = ScalaJS.makeIsArrayOfPrimitive(ScalaJS.d.D);
ScalaJS.asArrayOf.D = ScalaJS.makeAsArrayOfPrimitive(ScalaJS.isArrayOf.D, "D");
ScalaJS.d.D.isArrayOf = ScalaJS.isArrayOf.D;

// Polyfills

ScalaJS.imul = ScalaJS.g["Math"]["imul"] || (function(a, b) {
  // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul
  var ah = (a >>> 16) & 0xffff;
  var al = a & 0xffff;
  var bh = (b >>> 16) & 0xffff;
  var bl = b & 0xffff;
  // the shift by 0 fixes the sign on the high part
  // the final |0 converts the unsigned value into a signed value
  return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0);
});
/** @constructor */
ScalaJS.c.O = (function() {
  /*<skip>*/
});
/** @constructor */
ScalaJS.h.O = (function() {
  /*<skip>*/
});
ScalaJS.h.O.prototype = ScalaJS.c.O.prototype;
ScalaJS.c.O.prototype.init___ = (function() {
  return this
});
ScalaJS.c.O.prototype.equals__O__Z = (function(that) {
  return (this === that)
});
ScalaJS.c.O.prototype.toString__T = (function() {
  return ((this.getClass__jl_Class().getName__T() + "@") + (this.hashCode__I() >>> 0)["toString"](16))
});
ScalaJS.c.O.prototype.getClass__jl_Class = (function() {
  return this.$classData.getClassOf()
});
ScalaJS.c.O.prototype.hashCode__I = (function() {
  return 42
});
ScalaJS.c.O.prototype["toString"] = (function() {
  return this.toString__T()
});
ScalaJS.is.O = (function(obj) {
  return (obj !== null)
});
ScalaJS.as.O = (function(obj) {
  return obj
});
ScalaJS.isArrayOf.O = (function(obj, depth) {
  var data = (obj && obj.$classData);
  if ((!data)) {
    return false
  } else {
    var arrayDepth = (data.arrayDepth || 0);
    return ((arrayDepth < depth) ? false : ((arrayDepth > depth) ? true : (!data.arrayBase["isPrimitive"])))
  }
});
ScalaJS.asArrayOf.O = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.O(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Object;", depth))
});
ScalaJS.d.O = new ScalaJS.ClassTypeData({
  O: 0
}, false, "java.lang.Object", null, {
  O: 1
}, ScalaJS.is.O, ScalaJS.isArrayOf.O);
ScalaJS.c.O.prototype.$classData = ScalaJS.d.O;
ScalaJS.i.jl_JSConsoleBasedPrintStream$class__$init$__jl_JSConsoleBasedPrintStream__V = (function($$this) {
  $$this.java$lang$JSConsoleBasedPrintStream$$flushed$und$eq__Z__V(true);
  $$this.java$lang$JSConsoleBasedPrintStream$$buffer$und$eq__T__V("");
  $$this.java$lang$JSConsoleBasedPrintStream$$undsetter$und$java$lang$JSConsoleBasedPrintStream$$lineContEnd$und$eq__T__V("\u21a9");
  $$this.java$lang$JSConsoleBasedPrintStream$$undsetter$und$java$lang$JSConsoleBasedPrintStream$$lineContStart$und$eq__T__V("\u21aa")
});
ScalaJS.i.jl_JSConsoleBasedPrintStream$class__flush__jl_JSConsoleBasedPrintStream__V = (function($$this) {
  if ((!$$this.java$lang$JSConsoleBasedPrintStream$$flushed__Z())) {
    $$this.doWriteLine__T__V((("" + $$this.java$lang$JSConsoleBasedPrintStream$$buffer__T()) + $$this.java$lang$JSConsoleBasedPrintStream$$lineContEnd__T()));
    $$this.java$lang$JSConsoleBasedPrintStream$$buffer$und$eq__T__V($$this.java$lang$JSConsoleBasedPrintStream$$lineContStart__T());
    $$this.java$lang$JSConsoleBasedPrintStream$$flushed$und$eq__Z__V(true)
  }
});
ScalaJS.i.jl_JSConsoleBasedPrintStream$class__print__jl_JSConsoleBasedPrintStream__T__V = (function($$this, s) {
  var rest = ((s === null) ? "null" : s);
  while ((!ScalaJS.i.sjsr_RuntimeString$class__isEmpty__sjsr_RuntimeString__Z(rest))) {
    var nlPos = ScalaJS.i.sjsr_RuntimeString$class__indexOf__sjsr_RuntimeString__T__I(rest, "\n");
    if ((nlPos < 0)) {
      $$this.java$lang$JSConsoleBasedPrintStream$$buffer$und$eq__T__V((("" + $$this.java$lang$JSConsoleBasedPrintStream$$buffer__T()) + rest));
      $$this.java$lang$JSConsoleBasedPrintStream$$flushed$und$eq__Z__V(false);
      rest = ""
    } else {
      $$this.doWriteLine__T__V((("" + $$this.java$lang$JSConsoleBasedPrintStream$$buffer__T()) + ScalaJS.i.sjsr_RuntimeString$class__substring__sjsr_RuntimeString__I__I__T(rest, 0, nlPos)));
      $$this.java$lang$JSConsoleBasedPrintStream$$buffer$und$eq__T__V("");
      $$this.java$lang$JSConsoleBasedPrintStream$$flushed$und$eq__Z__V(true);
      rest = ScalaJS.i.sjsr_RuntimeString$class__substring__sjsr_RuntimeString__I__T(rest, ((nlPos + 1) | 0))
    }
  }
});
ScalaJS.i.s_Product5$class__productElement__s_Product5__I__O = (function($$this, n) {
  switch (n) {
    case 0:
      {
        return $$this.$$und1$1;
        break
      };
    case 1:
      {
        return $$this.$$und2$1;
        break
      };
    case 2:
      {
        return $$this.$$und3$1;
        break
      };
    case 3:
      {
        return $$this.$$und4$1;
        break
      };
    case 4:
      {
        return $$this.$$und5$1;
        break
      };
    default:
      throw new ScalaJS.c.jl_IndexOutOfBoundsException().init___T(ScalaJS.objectToString(n));
  }
});
ScalaJS.i.s_Proxy$class__toString__s_Proxy__T = (function($$this) {
  return ("" + $$this.self$1)
});
ScalaJS.i.s_Proxy$class__equals__s_Proxy__O__Z = (function($$this, that) {
  return ((!(null === that)) && (((that === $$this) || (that === $$this.self$1)) || ScalaJS.objectEquals(that, $$this.self$1)))
});
ScalaJS.i.s_Proxy$class__hashCode__s_Proxy__I = (function($$this) {
  return ScalaJS.objectHashCode($$this.self$1)
});
ScalaJS.i.s_reflect_ClassTag$class__equals__s_reflect_ClassTag__O__Z = (function($$this, x) {
  return (ScalaJS.is.s_reflect_ClassTag(x) && ScalaJS.anyRefEqEq($$this.runtimeClass__jl_Class(), ScalaJS.as.s_reflect_ClassTag(x).runtimeClass__jl_Class()))
});
ScalaJS.i.s_reflect_ClassTag$class__prettyprint$1__s_reflect_ClassTag__jl_Class__T = (function($$this, clazz) {
  return (clazz.isArray__Z() ? new ScalaJS.c.s_StringContext().init___sc_Seq(ScalaJS.m.s_Predef().wrapRefArray__AO__scm_WrappedArray(ScalaJS.asArrayOf.O(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.T.getArrayOf(), ["Array[", "]"]), 1))).s__sc_Seq__T(ScalaJS.m.s_Predef().genericWrapArray__O__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.O.getArrayOf(), [ScalaJS.i.s_reflect_ClassTag$class__prettyprint$1__s_reflect_ClassTag__jl_Class__T($$this, ScalaJS.m.sr_ScalaRunTime().arrayElementClass__O__jl_Class(clazz))]))) : clazz.getName__T())
});
ScalaJS.i.s_reflect_ClassTag$class__newArray__s_reflect_ClassTag__I__O = (function($$this, len) {
  var x1 = $$this.runtimeClass__jl_Class();
  return (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Byte().TYPE$1, x1) ? ScalaJS.newArrayObject(ScalaJS.d.B.getArrayOf(), [len]) : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Short().TYPE$1, x1) ? ScalaJS.newArrayObject(ScalaJS.d.S.getArrayOf(), [len]) : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Character().TYPE$1, x1) ? ScalaJS.newArrayObject(ScalaJS.d.C.getArrayOf(), [len]) : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Integer().TYPE$1, x1) ? ScalaJS.newArrayObject(ScalaJS.d.I.getArrayOf(), [len]) : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Long().TYPE$1, x1) ? ScalaJS.newArrayObject(ScalaJS.d.J.getArrayOf(), [len]) : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Float().TYPE$1, x1) ? ScalaJS.newArrayObject(ScalaJS.d.F.getArrayOf(), [len]) : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Double().TYPE$1, x1) ? ScalaJS.newArrayObject(ScalaJS.d.D.getArrayOf(), [len]) : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Boolean().TYPE$1, x1) ? ScalaJS.newArrayObject(ScalaJS.d.Z.getArrayOf(), [len]) : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Void().TYPE$1, x1) ? ScalaJS.newArrayObject(ScalaJS.d.sr_BoxedUnit.getArrayOf(), [len]) : ScalaJS.m.jl_reflect_Array().newInstance__jl_Class__I__O($$this.runtimeClass__jl_Class(), len))))))))))
});
ScalaJS.i.s_util_control_NoStackTrace$class__fillInStackTrace__s_util_control_NoStackTrace__jl_Throwable = (function($$this) {
  var this$1 = ScalaJS.m.s_util_control_NoStackTrace();
  if (this$1.$$undnoSuppression$1) {
    return ScalaJS.c.jl_Throwable.prototype.fillInStackTrace__jl_Throwable.call($$this)
  } else {
    return ScalaJS.as.jl_Throwable($$this)
  }
});
ScalaJS.i.s_xml_Equality$class__doComparison__s_xml_Equality__O__Z__Z = (function($$this, other, blithe) {
  matchEnd5: {
    var strictlyEqual;
    if ((other !== null)) {
      if (($$this === other)) {
        var strictlyEqual = true;
        break matchEnd5
      }
    };
    if (ScalaJS.is.s_xml_Equality(other)) {
      var x3 = ScalaJS.as.s_xml_Equality(other);
      var strictlyEqual = (x3.canEqual__O__Z($$this) && $$this.strict$und$eq$eq__s_xml_Equality__Z(x3));
      break matchEnd5
    };
    var strictlyEqual = false;
    break matchEnd5
  };
  return (strictlyEqual || (blithe && ScalaJS.m.s_xml_Equality().compareBlithely__O__O__Z($$this, other)))
});
ScalaJS.i.sc_GenSeqLike$class__equals__sc_GenSeqLike__O__Z = (function($$this, that) {
  if (ScalaJS.is.sc_GenSeq(that)) {
    var x2 = ScalaJS.as.sc_GenSeq(that);
    return $$this.sameElements__sc_GenIterable__Z(x2)
  } else {
    return false
  }
});
ScalaJS.i.sc_GenSetLike$class__liftedTree1$1__sc_GenSetLike__sc_GenSet__Z = (function($$this, x2$1) {
  try {
    var this$1 = $$this.iterator__sc_Iterator();
    return ScalaJS.i.sc_Iterator$class__forall__sc_Iterator__F1__Z(this$1, x2$1)
  } catch (ex) {
    if (ScalaJS.is.jl_ClassCastException(ex)) {
      return false
    } else {
      throw ex
    }
  }
});
ScalaJS.i.sc_GenSetLike$class__equals__sc_GenSetLike__O__Z = (function($$this, that) {
  if (ScalaJS.is.sc_GenSet(that)) {
    var x2 = ScalaJS.as.sc_GenSet(that);
    return (($$this === x2) || (($$this.size__I() === x2.size__I()) && ScalaJS.i.sc_GenSetLike$class__liftedTree1$1__sc_GenSetLike__sc_GenSet__Z($$this, x2)))
  } else {
    return false
  }
});
ScalaJS.i.sc_IndexedSeqLike$class__toBuffer__sc_IndexedSeqLike__scm_Buffer = (function($$this) {
  var result = new ScalaJS.c.scm_ArrayBuffer().init___I($$this.size__I());
  var xs = $$this.seq__sc_TraversableOnce();
  result.$$plus$plus$eq__sc_TraversableOnce__scm_ArrayBuffer(xs);
  return result
});
ScalaJS.i.sc_IndexedSeqLike$class__thisCollection__sc_IndexedSeqLike__sc_IndexedSeq = (function($$this) {
  return ScalaJS.as.sc_IndexedSeq($$this)
});
ScalaJS.i.sc_IndexedSeqOptimized$class__lengthCompare__sc_IndexedSeqOptimized__I__I = (function($$this, len) {
  return (($$this.length__I() - len) | 0)
});
ScalaJS.i.sc_IndexedSeqOptimized$class__sameElements__sc_IndexedSeqOptimized__sc_GenIterable__Z = (function($$this, that) {
  if (ScalaJS.is.sc_IndexedSeq(that)) {
    var x2 = ScalaJS.as.sc_IndexedSeq(that);
    var len = $$this.length__I();
    if ((len === x2.length__I())) {
      var i = 0;
      while (((i < len) && ScalaJS.anyEqEq($$this.apply__I__O(i), x2.apply__I__O(i)))) {
        i = ((i + 1) | 0)
      };
      return (i === len)
    } else {
      return false
    }
  } else {
    return ScalaJS.i.sc_IterableLike$class__sameElements__sc_IterableLike__sc_GenIterable__Z($$this, that)
  }
});
ScalaJS.i.sc_IndexedSeqOptimized$class__copyToArray__sc_IndexedSeqOptimized__O__I__I__V = (function($$this, xs, start, len) {
  var i = 0;
  var j = start;
  var jsx$2 = ScalaJS.m.sr_RichInt();
  var jsx$1 = ScalaJS.m.sr_RichInt();
  var x = $$this.length__I();
  var x$1 = jsx$1.min$extension__I__I__I(x, len);
  var end = jsx$2.min$extension__I__I__I(x$1, ((ScalaJS.m.sr_ScalaRunTime().array$undlength__O__I(xs) - start) | 0));
  while ((i < end)) {
    ScalaJS.m.sr_ScalaRunTime().array$undupdate__O__I__O__V(xs, j, $$this.apply__I__O(i));
    i = ((i + 1) | 0);
    j = ((j + 1) | 0)
  }
});
ScalaJS.i.sc_IndexedSeqOptimized$class__isEmpty__sc_IndexedSeqOptimized__Z = (function($$this) {
  return ($$this.length__I() === 0)
});
ScalaJS.i.sc_IterableLike$class__take__sc_IterableLike__I__O = (function($$this, n) {
  var b = $$this.newBuilder__scm_Builder();
  if ((n <= 0)) {
    return b.result__O()
  } else {
    b.sizeHintBounded__I__sc_TraversableLike__V(n, $$this);
    var i = 0;
    var it = $$this.iterator__sc_Iterator();
    while (((i < n) && it.hasNext__Z())) {
      b.$$plus$eq__O__scm_Builder(it.next__O());
      i = ((i + 1) | 0)
    };
    return b.result__O()
  }
});
ScalaJS.i.sc_IterableLike$class__sameElements__sc_IterableLike__sc_GenIterable__Z = (function($$this, that) {
  var these = $$this.iterator__sc_Iterator();
  var those = that.iterator__sc_Iterator();
  while ((these.hasNext__Z() && those.hasNext__Z())) {
    if ((!ScalaJS.anyEqEq(these.next__O(), those.next__O()))) {
      return false
    }
  };
  return ((!these.hasNext__Z()) && (!those.hasNext__Z()))
});
ScalaJS.i.sc_IterableLike$class__copyToArray__sc_IterableLike__O__I__I__V = (function($$this, xs, start, len) {
  var i = start;
  var jsx$1 = ScalaJS.m.sr_RichInt();
  var x = ((start + len) | 0);
  var end = jsx$1.min$extension__I__I__I(x, ScalaJS.m.sr_ScalaRunTime().array$undlength__O__I(xs));
  var it = $$this.iterator__sc_Iterator();
  while (((i < end) && it.hasNext__Z())) {
    ScalaJS.m.sr_ScalaRunTime().array$undupdate__O__I__O__V(xs, i, it.next__O());
    i = ((i + 1) | 0)
  }
});
ScalaJS.i.sc_IterableLike$class__thisCollection__sc_IterableLike__sc_Iterable = (function($$this) {
  return ScalaJS.as.sc_Iterable($$this)
});
ScalaJS.i.sc_Iterator$class__foreach__sc_Iterator__F1__V = (function($$this, f) {
  while ($$this.hasNext__Z()) {
    f.apply__O__O($$this.next__O())
  }
});
ScalaJS.i.sc_Iterator$class__copyToArray__sc_Iterator__O__I__I__V = (function($$this, xs, start, len) {
  var requirement = ((start >= 0) && ((start < ScalaJS.m.sr_ScalaRunTime().array$undlength__O__I(xs)) || (ScalaJS.m.sr_ScalaRunTime().array$undlength__O__I(xs) === 0)));
  if ((!requirement)) {
    throw new ScalaJS.c.jl_IllegalArgumentException().init___T(("requirement failed: " + new ScalaJS.c.s_StringContext().init___sc_Seq(ScalaJS.m.s_Predef().wrapRefArray__AO__scm_WrappedArray(ScalaJS.asArrayOf.O(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.T.getArrayOf(), ["start ", " out of range ", ""]), 1))).s__sc_Seq__T(ScalaJS.m.s_Predef().genericWrapArray__O__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.O.getArrayOf(), [start, ScalaJS.m.sr_ScalaRunTime().array$undlength__O__I(xs)])))))
  };
  var i = start;
  var y = ((ScalaJS.m.sr_ScalaRunTime().array$undlength__O__I(xs) - start) | 0);
  var end = ((start + ((len < y) ? len : y)) | 0);
  while (((i < end) && $$this.hasNext__Z())) {
    ScalaJS.m.sr_ScalaRunTime().array$undupdate__O__I__O__V(xs, i, $$this.next__O());
    i = ((i + 1) | 0)
  }
});
ScalaJS.i.sc_Iterator$class__isEmpty__sc_Iterator__Z = (function($$this) {
  return (!$$this.hasNext__Z())
});
ScalaJS.i.sc_Iterator$class__toString__sc_Iterator__T = (function($$this) {
  return (($$this.hasNext__Z() ? "non-empty" : "empty") + " iterator")
});
ScalaJS.i.sc_Iterator$class__toStream__sc_Iterator__sci_Stream = (function($$this) {
  if ($$this.hasNext__Z()) {
    var hd = $$this.next__O();
    var tl = new ScalaJS.c.sjsr_AnonFunction0().init___sjs_js_Function0((function(arg$outer) {
      return (function() {
        return arg$outer.toStream__sci_Stream()
      })
    })($$this));
    return new ScalaJS.c.sci_Stream$Cons().init___O__F0(hd, tl)
  } else {
    return ScalaJS.m.sci_Stream$Empty()
  }
});
ScalaJS.i.sc_Iterator$class__forall__sc_Iterator__F1__Z = (function($$this, p) {
  var res = true;
  while ((res && $$this.hasNext__Z())) {
    res = ScalaJS.uZ(p.apply__O__O($$this.next__O()))
  };
  return res
});
ScalaJS.i.sc_LinearSeqLike$class__thisCollection__sc_LinearSeqLike__sc_LinearSeq = (function($$this) {
  return ScalaJS.as.sc_LinearSeq($$this)
});
ScalaJS.i.sc_LinearSeqOptimized$class__lengthCompare__sc_LinearSeqOptimized__I__I = (function($$this, len) {
  return ((len < 0) ? 1 : ScalaJS.i.sc_LinearSeqOptimized$class__loop$1__sc_LinearSeqOptimized__I__sc_LinearSeqOptimized__I__I($$this, 0, $$this, len))
});
ScalaJS.i.sc_LinearSeqOptimized$class__apply__sc_LinearSeqOptimized__I__O = (function($$this, n) {
  var rest = $$this.drop__I__sc_LinearSeqOptimized(n);
  if (((n < 0) || rest.isEmpty__Z())) {
    throw new ScalaJS.c.jl_IndexOutOfBoundsException().init___T(("" + n))
  };
  return rest.head__O()
});
ScalaJS.i.sc_LinearSeqOptimized$class__sameElements__sc_LinearSeqOptimized__sc_GenIterable__Z = (function($$this, that) {
  if (ScalaJS.is.sc_LinearSeq(that)) {
    var x2 = ScalaJS.as.sc_LinearSeq(that);
    var these = $$this;
    var those = x2;
    while ((((!these.isEmpty__Z()) && (!those.isEmpty__Z())) && ScalaJS.anyEqEq(these.head__O(), those.head__O()))) {
      these = ScalaJS.as.sc_LinearSeqOptimized(these.tail__O());
      those = ScalaJS.as.sc_LinearSeq(those.tail__O())
    };
    return (these.isEmpty__Z() && those.isEmpty__Z())
  } else {
    return ScalaJS.i.sc_IterableLike$class__sameElements__sc_IterableLike__sc_GenIterable__Z($$this, that)
  }
});
ScalaJS.i.sc_LinearSeqOptimized$class__loop$1__sc_LinearSeqOptimized__I__sc_LinearSeqOptimized__I__I = (function($$this, i, xs, len$1) {
  tailCallLoop: while (true) {
    if ((i === len$1)) {
      return (xs.isEmpty__Z() ? 0 : 1)
    } else if (xs.isEmpty__Z()) {
      return -1
    } else {
      var temp$i = ((i + 1) | 0);
      var temp$xs = ScalaJS.as.sc_LinearSeqOptimized(xs.tail__O());
      i = temp$i;
      xs = temp$xs;
      continue tailCallLoop
    }
  }
});
ScalaJS.i.sc_LinearSeqOptimized$class__foldLeft__sc_LinearSeqOptimized__O__F2__O = (function($$this, z, f) {
  var acc = z;
  var these = $$this;
  while ((!these.isEmpty__Z())) {
    acc = f.apply__O__O__O(acc, these.head__O());
    these = ScalaJS.as.sc_LinearSeqOptimized(these.tail__O())
  };
  return acc
});
ScalaJS.i.sc_LinearSeqOptimized$class__last__sc_LinearSeqOptimized__O = (function($$this) {
  if ($$this.isEmpty__Z()) {
    throw new ScalaJS.c.ju_NoSuchElementException().init___()
  };
  var these = $$this;
  var nx = ScalaJS.as.sc_LinearSeqOptimized(these.tail__O());
  while ((!nx.isEmpty__Z())) {
    these = nx;
    nx = ScalaJS.as.sc_LinearSeqOptimized(nx.tail__O())
  };
  return these.head__O()
});
ScalaJS.i.sc_LinearSeqOptimized$class__length__sc_LinearSeqOptimized__I = (function($$this) {
  var these = $$this;
  var len = 0;
  while ((!these.isEmpty__Z())) {
    len = ((len + 1) | 0);
    these = ScalaJS.as.sc_LinearSeqOptimized(these.tail__O())
  };
  return len
});
ScalaJS.i.sc_SeqLike$class__thisCollection__sc_SeqLike__sc_Seq = (function($$this) {
  return ScalaJS.as.sc_Seq($$this)
});
ScalaJS.i.sc_SeqLike$class__isEmpty__sc_SeqLike__Z = (function($$this) {
  return ($$this.lengthCompare__I__I(0) === 0)
});
ScalaJS.i.sc_SeqLike$class__reverse__sc_SeqLike__O = (function($$this) {
  var xs = new ScalaJS.c.sr_ObjectRef().init___O(ScalaJS.m.sci_Nil());
  $$this.foreach__F1__V(new ScalaJS.c.sjsr_AnonFunction1().init___sjs_js_Function1((function(xs$1) {
    return (function(x$2) {
      var this$1 = ScalaJS.as.sci_List(xs$1.elem$1);
      xs$1.elem$1 = new ScalaJS.c.sci_$colon$colon().init___O__sci_List(x$2, this$1)
    })
  })(xs)));
  var b = $$this.newBuilder__scm_Builder();
  ScalaJS.i.scm_Builder$class__sizeHint__scm_Builder__sc_TraversableLike__V(b, $$this);
  var this$2 = ScalaJS.as.sci_List(xs.elem$1);
  var these = this$2;
  while ((!these.isEmpty__Z())) {
    var x$2$1 = these.head__O();
    b.$$plus$eq__O__scm_Builder(x$2$1);
    these = ScalaJS.as.sci_List(these.tail__O())
  };
  return b.result__O()
});
ScalaJS.i.sc_SeqLike$class__lengthCompare__sc_SeqLike__I__I = (function($$this, len) {
  if ((len < 0)) {
    return 1
  } else {
    var i = 0;
    var it = $$this.iterator__sc_Iterator();
    while (it.hasNext__Z()) {
      if ((i === len)) {
        return (it.hasNext__Z() ? 1 : 0)
      };
      it.next__O();
      i = ((i + 1) | 0)
    };
    return ((i - len) | 0)
  }
});
ScalaJS.i.sc_SetLike$class__toBuffer__sc_SetLike__scm_Buffer = (function($$this) {
  var result = new ScalaJS.c.scm_ArrayBuffer().init___I($$this.size__I());
  var xs = $$this.seq__sc_TraversableOnce();
  result.$$plus$plus$eq__sc_TraversableOnce__scm_ArrayBuffer(xs);
  return result
});
ScalaJS.i.sc_SetLike$class__isEmpty__sc_SetLike__Z = (function($$this) {
  return ($$this.size__I() === 0)
});
ScalaJS.i.sc_SetLike$class__$plus$plus__sc_SetLike__sc_GenTraversableOnce__sc_Set = (function($$this, elems) {
  var x$1 = ScalaJS.as.sc_Set($$this);
  return ScalaJS.as.sc_Set(elems.seq__sc_TraversableOnce().$$div$colon__O__F2__O(x$1, new ScalaJS.c.sjsr_AnonFunction2().init___sjs_js_Function2((function(x$2$2, x$3$2) {
    var x$2 = ScalaJS.as.sc_Set(x$2$2);
    return x$2.$$plus__O__sc_Set(x$3$2)
  }))))
});
ScalaJS.i.sc_TraversableLike$class__to__sc_TraversableLike__scg_CanBuildFrom__O = (function($$this, cbf) {
  var b = cbf.apply__scm_Builder();
  ScalaJS.i.scm_Builder$class__sizeHint__scm_Builder__sc_TraversableLike__V(b, $$this);
  b.$$plus$plus$eq__sc_TraversableOnce__scg_Growable($$this.thisCollection__sc_Traversable());
  return b.result__O()
});
ScalaJS.i.sc_TraversableLike$class__flatMap__sc_TraversableLike__F1__scg_CanBuildFrom__O = (function($$this, f, bf) {
  var b = bf.apply__O__scm_Builder($$this.repr__O());
  $$this.foreach__F1__V(new ScalaJS.c.sjsr_AnonFunction1().init___sjs_js_Function1((function(b$2, f$5) {
    return (function(x$2) {
      return ScalaJS.as.scm_Builder(b$2.$$plus$plus$eq__sc_TraversableOnce__scg_Growable(ScalaJS.as.sc_GenTraversableOnce(f$5.apply__O__O(x$2)).seq__sc_TraversableOnce()))
    })
  })(b, f)));
  return b.result__O()
});
ScalaJS.i.sc_TraversableLike$class__stringPrefix__sc_TraversableLike__T = (function($$this) {
  var string = ScalaJS.objectGetClass($$this.repr__O()).getName__T();
  var idx1 = ScalaJS.i.sjsr_RuntimeString$class__lastIndexOf__sjsr_RuntimeString__I__I(string, 46);
  if ((idx1 !== -1)) {
    string = ScalaJS.i.sjsr_RuntimeString$class__substring__sjsr_RuntimeString__I__T(string, ((idx1 + 1) | 0))
  };
  var idx2 = ScalaJS.i.sjsr_RuntimeString$class__indexOf__sjsr_RuntimeString__I__I(string, 36);
  if ((idx2 !== -1)) {
    string = ScalaJS.i.sjsr_RuntimeString$class__substring__sjsr_RuntimeString__I__I__T(string, 0, idx2)
  };
  return string
});
ScalaJS.i.sc_TraversableLike$class__builder$1__sc_TraversableLike__scg_CanBuildFrom__scm_Builder = (function($$this, bf$1) {
  var b = bf$1.apply__O__scm_Builder($$this.repr__O());
  ScalaJS.i.scm_Builder$class__sizeHint__scm_Builder__sc_TraversableLike__V(b, $$this);
  return b
});
ScalaJS.i.sc_TraversableLike$class__toString__sc_TraversableLike__T = (function($$this) {
  return $$this.mkString__T__T__T__T(($$this.stringPrefix__T() + "("), ", ", ")")
});
ScalaJS.i.sc_TraversableLike$class__map__sc_TraversableLike__F1__scg_CanBuildFrom__O = (function($$this, f, bf) {
  var b = ScalaJS.i.sc_TraversableLike$class__builder$1__sc_TraversableLike__scg_CanBuildFrom__scm_Builder($$this, bf);
  $$this.foreach__F1__V(new ScalaJS.c.sjsr_AnonFunction1().init___sjs_js_Function1((function(b$1, f$4) {
    return (function(x$2) {
      return b$1.$$plus$eq__O__scm_Builder(f$4.apply__O__O(x$2))
    })
  })(b, f)));
  return b.result__O()
});
ScalaJS.i.sc_TraversableOnce$class__toArray__sc_TraversableOnce__s_reflect_ClassTag__O = (function($$this, evidence$1) {
  if ($$this.isTraversableAgain__Z()) {
    var result = evidence$1.newArray__I__O($$this.size__I());
    $$this.copyToArray__O__I__V(result, 0);
    return result
  } else {
    return $$this.toBuffer__scm_Buffer().toArray__s_reflect_ClassTag__O(evidence$1)
  }
});
ScalaJS.i.sc_TraversableOnce$class__toList__sc_TraversableOnce__sci_List = (function($$this) {
  var this$1 = ScalaJS.m.sci_List();
  return ScalaJS.as.sci_List($$this.to__scg_CanBuildFrom__O(this$1.ReusableCBF__scg_GenTraversableFactory$GenericCanBuildFrom()))
});
ScalaJS.i.sc_TraversableOnce$class__toBuffer__sc_TraversableOnce__scm_Buffer = (function($$this) {
  var this$1 = ScalaJS.m.scm_ArrayBuffer();
  return ScalaJS.as.scm_Buffer($$this.to__scg_CanBuildFrom__O(this$1.ReusableCBF__scg_GenTraversableFactory$GenericCanBuildFrom()))
});
ScalaJS.i.sc_TraversableOnce$class__mkString__sc_TraversableOnce__T__T__T__T = (function($$this, start, sep, end) {
  var this$1 = $$this.addString__scm_StringBuilder__T__T__T__scm_StringBuilder(new ScalaJS.c.scm_StringBuilder().init___(), start, sep, end);
  var this$2 = this$1.underlying$5;
  return this$2.content$1
});
ScalaJS.i.sc_TraversableOnce$class__size__sc_TraversableOnce__I = (function($$this) {
  var result = new ScalaJS.c.sr_IntRef().init___I(0);
  $$this.foreach__F1__V(new ScalaJS.c.sjsr_AnonFunction1().init___sjs_js_Function1((function(result$1) {
    return (function(x$2) {
      result$1.elem$1 = ((result$1.elem$1 + 1) | 0)
    })
  })(result)));
  return result.elem$1
});
ScalaJS.i.sc_TraversableOnce$class__copyToArray__sc_TraversableOnce__O__I__V = (function($$this, xs, start) {
  $$this.copyToArray__O__I__I__V(xs, start, ((ScalaJS.m.sr_ScalaRunTime().array$undlength__O__I(xs) - start) | 0))
});
ScalaJS.i.sc_TraversableOnce$class__to__sc_TraversableOnce__scg_CanBuildFrom__O = (function($$this, cbf) {
  var b = cbf.apply__scm_Builder();
  b.$$plus$plus$eq__sc_TraversableOnce__scg_Growable($$this.seq__sc_TraversableOnce());
  return b.result__O()
});
ScalaJS.i.sc_TraversableOnce$class__foldLeft__sc_TraversableOnce__O__F2__O = (function($$this, z, op) {
  var result = new ScalaJS.c.sr_ObjectRef().init___O(z);
  $$this.seq__sc_TraversableOnce().foreach__F1__V(new ScalaJS.c.sjsr_AnonFunction1().init___sjs_js_Function1((function(result$2, op$1) {
    return (function(x$2) {
      result$2.elem$1 = op$1.apply__O__O__O(result$2.elem$1, x$2)
    })
  })(result, op)));
  return result.elem$1
});
ScalaJS.i.sc_TraversableOnce$class__nonEmpty__sc_TraversableOnce__Z = (function($$this) {
  return (!$$this.isEmpty__Z())
});
ScalaJS.i.sc_TraversableOnce$class__addString__sc_TraversableOnce__scm_StringBuilder__T__T__T__scm_StringBuilder = (function($$this, b, start, sep, end) {
  var first = new ScalaJS.c.sr_BooleanRef().init___Z(true);
  b.append__T__scm_StringBuilder(start);
  $$this.foreach__F1__V(new ScalaJS.c.sjsr_AnonFunction1().init___sjs_js_Function1((function(first$2, b$2, sep$1) {
    return (function(x$2) {
      if (first$2.elem$1) {
        b$2.append__O__scm_StringBuilder(x$2);
        first$2.elem$1 = false;
        return (void 0)
      } else {
        return (b$2.append__T__scm_StringBuilder(sep$1), b$2.append__O__scm_StringBuilder(x$2))
      }
    })
  })(first, b, sep)));
  b.append__T__scm_StringBuilder(end);
  return b
});
ScalaJS.i.scg_GenericSetTemplate$class__empty__scg_GenericSetTemplate__sc_GenSet = (function($$this) {
  return ScalaJS.as.sc_GenSet($$this.companion__scg_GenericCompanion().empty__sc_GenTraversable())
});
ScalaJS.i.scg_Growable$class__$plus$plus$eq__scg_Growable__sc_TraversableOnce__scg_Growable = (function($$this, xs) {
  return (xs.seq__sc_TraversableOnce().foreach__F1__V(new ScalaJS.c.sjsr_AnonFunction1().init___sjs_js_Function1((function(arg$outer) {
    return (function(elem$2) {
      return arg$outer.$$plus$eq__O__scg_Growable(elem$2)
    })
  })($$this))), $$this)
});
ScalaJS.i.sci_StringLike$class__format__sci_StringLike__sc_Seq__T = (function($$this, args) {
  var jsx$3 = ScalaJS.m.sjsr_RuntimeString();
  var jsx$2 = $$this.toString__T();
  var jsx$1 = new ScalaJS.c.sjsr_AnonFunction1().init___sjs_js_Function1((function(arg$outer) {
    return (function(arg$2) {
      return ScalaJS.i.sci_StringLike$class__scala$collection$immutable$StringLike$$unwrapArg__sci_StringLike__O__O(arg$outer, arg$2)
    })
  })($$this));
  var this$1 = ScalaJS.m.sc_Seq();
  return jsx$3.format__T__AO__T(jsx$2, ScalaJS.asArrayOf.O(ScalaJS.as.sc_TraversableOnce(args.map__F1__scg_CanBuildFrom__O(jsx$1, this$1.ReusableCBF__scg_GenTraversableFactory$GenericCanBuildFrom())).toArray__s_reflect_ClassTag__O(ScalaJS.m.s_reflect_ClassTag().AnyRef$1), 1))
});
ScalaJS.i.sci_StringLike$class__toArray__sci_StringLike__s_reflect_ClassTag__O = (function($$this, evidence$1) {
  return ScalaJS.i.sjsr_RuntimeString$class__toCharArray__sjsr_RuntimeString__AC($$this.toString__T())
});
ScalaJS.i.sci_StringLike$class__scala$collection$immutable$StringLike$$unwrapArg__sci_StringLike__O__O = (function($$this, arg) {
  if (ScalaJS.is.s_math_ScalaNumber(arg)) {
    var x2 = ScalaJS.as.s_math_ScalaNumber(arg);
    return x2.underlying__O()
  } else {
    return arg
  }
});
ScalaJS.i.sci_StringLike$class__$times__sci_StringLike__I__T = (function($$this, n) {
  var buf = new ScalaJS.c.scm_StringBuilder().init___();
  var this$4 = new ScalaJS.c.sci_Range().init___I__I__I(0, n, 1);
  var f = new ScalaJS.c.sjsr_AnonFunction1().init___sjs_js_Function1((function(arg$outer, buf$1) {
    return (function(i$2) {
      return (ScalaJS.uI(i$2), buf$1.append__T__scm_StringBuilder(arg$outer.toString__T()))
    })
  })($$this, buf));
  if (this$4.validateRangeBoundaries__F1__Z(f)) {
    var i$1 = this$4.start$4;
    var terminal = this$4.terminalElement$4;
    var step = this$4.step$4;
    while ((i$1 !== terminal)) {
      f.apply__O__O(i$1);
      i$1 = ((i$1 + step) | 0)
    }
  };
  var this$5 = buf.underlying$5;
  return this$5.content$1
});
ScalaJS.i.sci_StringLike$class__apply__sci_StringLike__I__C = (function($$this, n) {
  return ScalaJS.i.sjsr_RuntimeString$class__charAt__sjsr_RuntimeString__I__C($$this.toString__T(), n)
});
ScalaJS.i.sci_VectorPointer$class__gotoPos__sci_VectorPointer__I__I__V = (function($$this, index, xor) {
  if ((!(xor < 32))) {
    if ((xor < 1024)) {
      $$this.display0$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display1__AO().u[((index >> 5) & 31)], 1))
    } else if ((xor < 32768)) {
      $$this.display1$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display2__AO().u[((index >> 10) & 31)], 1));
      $$this.display0$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display1__AO().u[((index >> 5) & 31)], 1))
    } else if ((xor < 1048576)) {
      $$this.display2$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display3__AO().u[((index >> 15) & 31)], 1));
      $$this.display1$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display2__AO().u[((index >> 10) & 31)], 1));
      $$this.display0$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display1__AO().u[((index >> 5) & 31)], 1))
    } else if ((xor < 33554432)) {
      $$this.display3$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display4__AO().u[((index >> 20) & 31)], 1));
      $$this.display2$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display3__AO().u[((index >> 15) & 31)], 1));
      $$this.display1$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display2__AO().u[((index >> 10) & 31)], 1));
      $$this.display0$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display1__AO().u[((index >> 5) & 31)], 1))
    } else if ((xor < 1073741824)) {
      $$this.display4$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display5__AO().u[((index >> 25) & 31)], 1));
      $$this.display3$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display4__AO().u[((index >> 20) & 31)], 1));
      $$this.display2$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display3__AO().u[((index >> 15) & 31)], 1));
      $$this.display1$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display2__AO().u[((index >> 10) & 31)], 1));
      $$this.display0$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display1__AO().u[((index >> 5) & 31)], 1))
    } else {
      throw new ScalaJS.c.jl_IllegalArgumentException().init___()
    }
  }
});
ScalaJS.i.sci_VectorPointer$class__stabilize__sci_VectorPointer__I__V = (function($$this, index) {
  var x1 = (($$this.depth__I() - 1) | 0);
  switch (x1) {
    case 5:
      {
        var a = $$this.display5__AO();
        $$this.display5$und$eq__AO__V(ScalaJS.i.sci_VectorPointer$class__copyOf__sci_VectorPointer__AO__AO($$this, a));
        var a$1 = $$this.display4__AO();
        $$this.display4$und$eq__AO__V(ScalaJS.i.sci_VectorPointer$class__copyOf__sci_VectorPointer__AO__AO($$this, a$1));
        var a$2 = $$this.display3__AO();
        $$this.display3$und$eq__AO__V(ScalaJS.i.sci_VectorPointer$class__copyOf__sci_VectorPointer__AO__AO($$this, a$2));
        var a$3 = $$this.display2__AO();
        $$this.display2$und$eq__AO__V(ScalaJS.i.sci_VectorPointer$class__copyOf__sci_VectorPointer__AO__AO($$this, a$3));
        var a$4 = $$this.display1__AO();
        $$this.display1$und$eq__AO__V(ScalaJS.i.sci_VectorPointer$class__copyOf__sci_VectorPointer__AO__AO($$this, a$4));
        $$this.display5__AO().u[((index >> 25) & 31)] = $$this.display4__AO();
        $$this.display4__AO().u[((index >> 20) & 31)] = $$this.display3__AO();
        $$this.display3__AO().u[((index >> 15) & 31)] = $$this.display2__AO();
        $$this.display2__AO().u[((index >> 10) & 31)] = $$this.display1__AO();
        $$this.display1__AO().u[((index >> 5) & 31)] = $$this.display0__AO();
        break
      };
    case 4:
      {
        var a$5 = $$this.display4__AO();
        $$this.display4$und$eq__AO__V(ScalaJS.i.sci_VectorPointer$class__copyOf__sci_VectorPointer__AO__AO($$this, a$5));
        var a$6 = $$this.display3__AO();
        $$this.display3$und$eq__AO__V(ScalaJS.i.sci_VectorPointer$class__copyOf__sci_VectorPointer__AO__AO($$this, a$6));
        var a$7 = $$this.display2__AO();
        $$this.display2$und$eq__AO__V(ScalaJS.i.sci_VectorPointer$class__copyOf__sci_VectorPointer__AO__AO($$this, a$7));
        var a$8 = $$this.display1__AO();
        $$this.display1$und$eq__AO__V(ScalaJS.i.sci_VectorPointer$class__copyOf__sci_VectorPointer__AO__AO($$this, a$8));
        $$this.display4__AO().u[((index >> 20) & 31)] = $$this.display3__AO();
        $$this.display3__AO().u[((index >> 15) & 31)] = $$this.display2__AO();
        $$this.display2__AO().u[((index >> 10) & 31)] = $$this.display1__AO();
        $$this.display1__AO().u[((index >> 5) & 31)] = $$this.display0__AO();
        break
      };
    case 3:
      {
        var a$9 = $$this.display3__AO();
        $$this.display3$und$eq__AO__V(ScalaJS.i.sci_VectorPointer$class__copyOf__sci_VectorPointer__AO__AO($$this, a$9));
        var a$10 = $$this.display2__AO();
        $$this.display2$und$eq__AO__V(ScalaJS.i.sci_VectorPointer$class__copyOf__sci_VectorPointer__AO__AO($$this, a$10));
        var a$11 = $$this.display1__AO();
        $$this.display1$und$eq__AO__V(ScalaJS.i.sci_VectorPointer$class__copyOf__sci_VectorPointer__AO__AO($$this, a$11));
        $$this.display3__AO().u[((index >> 15) & 31)] = $$this.display2__AO();
        $$this.display2__AO().u[((index >> 10) & 31)] = $$this.display1__AO();
        $$this.display1__AO().u[((index >> 5) & 31)] = $$this.display0__AO();
        break
      };
    case 2:
      {
        var a$12 = $$this.display2__AO();
        $$this.display2$und$eq__AO__V(ScalaJS.i.sci_VectorPointer$class__copyOf__sci_VectorPointer__AO__AO($$this, a$12));
        var a$13 = $$this.display1__AO();
        $$this.display1$und$eq__AO__V(ScalaJS.i.sci_VectorPointer$class__copyOf__sci_VectorPointer__AO__AO($$this, a$13));
        $$this.display2__AO().u[((index >> 10) & 31)] = $$this.display1__AO();
        $$this.display1__AO().u[((index >> 5) & 31)] = $$this.display0__AO();
        break
      };
    case 1:
      {
        var a$14 = $$this.display1__AO();
        $$this.display1$und$eq__AO__V(ScalaJS.i.sci_VectorPointer$class__copyOf__sci_VectorPointer__AO__AO($$this, a$14));
        $$this.display1__AO().u[((index >> 5) & 31)] = $$this.display0__AO();
        break
      };
    case 0:
      break;
    default:
      throw new ScalaJS.c.s_MatchError().init___O(x1);
  }
});
ScalaJS.i.sci_VectorPointer$class__gotoNextBlockStart__sci_VectorPointer__I__I__V = (function($$this, index, xor) {
  if ((xor < 1024)) {
    $$this.display0$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display1__AO().u[((index >> 5) & 31)], 1))
  } else if ((xor < 32768)) {
    $$this.display1$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display2__AO().u[((index >> 10) & 31)], 1));
    $$this.display0$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display1__AO().u[0], 1))
  } else if ((xor < 1048576)) {
    $$this.display2$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display3__AO().u[((index >> 15) & 31)], 1));
    $$this.display1$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display2__AO().u[0], 1));
    $$this.display0$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display1__AO().u[0], 1))
  } else if ((xor < 33554432)) {
    $$this.display3$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display4__AO().u[((index >> 20) & 31)], 1));
    $$this.display2$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display3__AO().u[0], 1));
    $$this.display1$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display2__AO().u[0], 1));
    $$this.display0$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display1__AO().u[0], 1))
  } else if ((xor < 1073741824)) {
    $$this.display4$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display5__AO().u[((index >> 25) & 31)], 1));
    $$this.display3$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display4__AO().u[0], 1));
    $$this.display2$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display3__AO().u[0], 1));
    $$this.display1$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display2__AO().u[0], 1));
    $$this.display0$und$eq__AO__V(ScalaJS.asArrayOf.O($$this.display1__AO().u[0], 1))
  } else {
    throw new ScalaJS.c.jl_IllegalArgumentException().init___()
  }
});
ScalaJS.i.sci_VectorPointer$class__getElem__sci_VectorPointer__I__I__O = (function($$this, index, xor) {
  if ((xor < 32)) {
    return $$this.display0__AO().u[(index & 31)]
  } else if ((xor < 1024)) {
    return ScalaJS.asArrayOf.O($$this.display1__AO().u[((index >> 5) & 31)], 1).u[(index & 31)]
  } else if ((xor < 32768)) {
    return ScalaJS.asArrayOf.O(ScalaJS.asArrayOf.O($$this.display2__AO().u[((index >> 10) & 31)], 1).u[((index >> 5) & 31)], 1).u[(index & 31)]
  } else if ((xor < 1048576)) {
    return ScalaJS.asArrayOf.O(ScalaJS.asArrayOf.O(ScalaJS.asArrayOf.O($$this.display3__AO().u[((index >> 15) & 31)], 1).u[((index >> 10) & 31)], 1).u[((index >> 5) & 31)], 1).u[(index & 31)]
  } else if ((xor < 33554432)) {
    return ScalaJS.asArrayOf.O(ScalaJS.asArrayOf.O(ScalaJS.asArrayOf.O(ScalaJS.asArrayOf.O($$this.display4__AO().u[((index >> 20) & 31)], 1).u[((index >> 15) & 31)], 1).u[((index >> 10) & 31)], 1).u[((index >> 5) & 31)], 1).u[(index & 31)]
  } else if ((xor < 1073741824)) {
    return ScalaJS.asArrayOf.O(ScalaJS.asArrayOf.O(ScalaJS.asArrayOf.O(ScalaJS.asArrayOf.O(ScalaJS.asArrayOf.O($$this.display5__AO().u[((index >> 25) & 31)], 1).u[((index >> 20) & 31)], 1).u[((index >> 15) & 31)], 1).u[((index >> 10) & 31)], 1).u[((index >> 5) & 31)], 1).u[(index & 31)]
  } else {
    throw new ScalaJS.c.jl_IllegalArgumentException().init___()
  }
});
ScalaJS.i.sci_VectorPointer$class__copyOf__sci_VectorPointer__AO__AO = (function($$this, a) {
  if ((a === null)) {
    var this$2 = ScalaJS.m.s_Console();
    this$2.out__Ljava_io_PrintStream().println__O__V("NULL")
  };
  var b = ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [a.u["length"]]);
  var length = a.u["length"];
  ScalaJS.systemArraycopy(a, 0, b, 0, length);
  return b
});
ScalaJS.i.sci_VectorPointer$class__gotoNextBlockStartWritable__sci_VectorPointer__I__I__V = (function($$this, index, xor) {
  if ((xor < 1024)) {
    if (($$this.depth__I() === 1)) {
      $$this.display1$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
      $$this.display1__AO().u[0] = $$this.display0__AO();
      $$this.depth$und$eq__I__V((($$this.depth__I() + 1) | 0))
    };
    $$this.display0$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
    $$this.display1__AO().u[((index >> 5) & 31)] = $$this.display0__AO()
  } else if ((xor < 32768)) {
    if (($$this.depth__I() === 2)) {
      $$this.display2$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
      $$this.display2__AO().u[0] = $$this.display1__AO();
      $$this.depth$und$eq__I__V((($$this.depth__I() + 1) | 0))
    };
    $$this.display0$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
    $$this.display1$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
    $$this.display1__AO().u[((index >> 5) & 31)] = $$this.display0__AO();
    $$this.display2__AO().u[((index >> 10) & 31)] = $$this.display1__AO()
  } else if ((xor < 1048576)) {
    if (($$this.depth__I() === 3)) {
      $$this.display3$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
      $$this.display3__AO().u[0] = $$this.display2__AO();
      $$this.depth$und$eq__I__V((($$this.depth__I() + 1) | 0))
    };
    $$this.display0$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
    $$this.display1$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
    $$this.display2$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
    $$this.display1__AO().u[((index >> 5) & 31)] = $$this.display0__AO();
    $$this.display2__AO().u[((index >> 10) & 31)] = $$this.display1__AO();
    $$this.display3__AO().u[((index >> 15) & 31)] = $$this.display2__AO()
  } else if ((xor < 33554432)) {
    if (($$this.depth__I() === 4)) {
      $$this.display4$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
      $$this.display4__AO().u[0] = $$this.display3__AO();
      $$this.depth$und$eq__I__V((($$this.depth__I() + 1) | 0))
    };
    $$this.display0$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
    $$this.display1$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
    $$this.display2$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
    $$this.display3$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
    $$this.display1__AO().u[((index >> 5) & 31)] = $$this.display0__AO();
    $$this.display2__AO().u[((index >> 10) & 31)] = $$this.display1__AO();
    $$this.display3__AO().u[((index >> 15) & 31)] = $$this.display2__AO();
    $$this.display4__AO().u[((index >> 20) & 31)] = $$this.display3__AO()
  } else if ((xor < 1073741824)) {
    if (($$this.depth__I() === 5)) {
      $$this.display5$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
      $$this.display5__AO().u[0] = $$this.display4__AO();
      $$this.depth$und$eq__I__V((($$this.depth__I() + 1) | 0))
    };
    $$this.display0$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
    $$this.display1$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
    $$this.display2$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
    $$this.display3$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
    $$this.display4$und$eq__AO__V(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]));
    $$this.display1__AO().u[((index >> 5) & 31)] = $$this.display0__AO();
    $$this.display2__AO().u[((index >> 10) & 31)] = $$this.display1__AO();
    $$this.display3__AO().u[((index >> 15) & 31)] = $$this.display2__AO();
    $$this.display4__AO().u[((index >> 20) & 31)] = $$this.display3__AO();
    $$this.display5__AO().u[((index >> 25) & 31)] = $$this.display4__AO()
  } else {
    throw new ScalaJS.c.jl_IllegalArgumentException().init___()
  }
});
ScalaJS.i.sci_VectorPointer$class__initFrom__sci_VectorPointer__sci_VectorPointer__I__V = (function($$this, that, depth) {
  $$this.depth$und$eq__I__V(depth);
  var x1 = ((depth - 1) | 0);
  switch (x1) {
    case -1:
      break;
    case 0:
      {
        $$this.display0$und$eq__AO__V(that.display0__AO());
        break
      };
    case 1:
      {
        $$this.display1$und$eq__AO__V(that.display1__AO());
        $$this.display0$und$eq__AO__V(that.display0__AO());
        break
      };
    case 2:
      {
        $$this.display2$und$eq__AO__V(that.display2__AO());
        $$this.display1$und$eq__AO__V(that.display1__AO());
        $$this.display0$und$eq__AO__V(that.display0__AO());
        break
      };
    case 3:
      {
        $$this.display3$und$eq__AO__V(that.display3__AO());
        $$this.display2$und$eq__AO__V(that.display2__AO());
        $$this.display1$und$eq__AO__V(that.display1__AO());
        $$this.display0$und$eq__AO__V(that.display0__AO());
        break
      };
    case 4:
      {
        $$this.display4$und$eq__AO__V(that.display4__AO());
        $$this.display3$und$eq__AO__V(that.display3__AO());
        $$this.display2$und$eq__AO__V(that.display2__AO());
        $$this.display1$und$eq__AO__V(that.display1__AO());
        $$this.display0$und$eq__AO__V(that.display0__AO());
        break
      };
    case 5:
      {
        $$this.display5$und$eq__AO__V(that.display5__AO());
        $$this.display4$und$eq__AO__V(that.display4__AO());
        $$this.display3$und$eq__AO__V(that.display3__AO());
        $$this.display2$und$eq__AO__V(that.display2__AO());
        $$this.display1$und$eq__AO__V(that.display1__AO());
        $$this.display0$und$eq__AO__V(that.display0__AO());
        break
      };
    default:
      throw new ScalaJS.c.s_MatchError().init___O(x1);
  }
});
ScalaJS.i.scm_Builder$class__sizeHint__scm_Builder__sc_TraversableLike__V = (function($$this, coll) {
  if (ScalaJS.is.sc_IndexedSeqLike(coll)) {
    $$this.sizeHint__I__V(coll.size__I())
  }
});
ScalaJS.i.scm_Builder$class__sizeHintBounded__scm_Builder__I__sc_TraversableLike__V = (function($$this, size, boundingColl) {
  if (ScalaJS.is.sc_IndexedSeqLike(boundingColl)) {
    $$this.sizeHint__I__V(ScalaJS.m.sr_RichInt().min$extension__I__I__I(size, boundingColl.size__I()))
  }
});
ScalaJS.i.scm_FlatHashTable$HashUtils$class__elemHashCode__scm_FlatHashTable$HashUtils__O__I = (function($$this, elem) {
  if ((elem === null)) {
    throw new ScalaJS.c.jl_IllegalArgumentException().init___T("Flat hash tables cannot contain null elements.")
  } else {
    return ScalaJS.objectHashCode(elem)
  }
});
ScalaJS.i.scm_FlatHashTable$HashUtils$class__improve__scm_FlatHashTable$HashUtils__I__I__I = (function($$this, hcode, seed) {
  var improved = ScalaJS.m.s_util_hashing_package().byteswap32__I__I(hcode);
  var rotation = (seed % 32);
  var rotated = (((improved >>> rotation) | 0) | (improved << ((32 - rotation) | 0)));
  return rotated
});
ScalaJS.i.scm_FlatHashTable$class__containsEntry__scm_FlatHashTable__O__Z = (function($$this, elem) {
  return (null !== ScalaJS.i.scm_FlatHashTable$class__findEntryImpl__scm_FlatHashTable__O__O($$this, elem))
});
ScalaJS.i.scm_FlatHashTable$class__nnSizeMapReset__scm_FlatHashTable__I__V = (function($$this, tableLength) {
  if (($$this.sizemap$5 !== null)) {
    var nsize = ScalaJS.i.scm_FlatHashTable$class__calcSizeMapSize__scm_FlatHashTable__I__I($$this, tableLength);
    if (($$this.sizemap$5.u["length"] !== nsize)) {
      $$this.sizemap$5 = ScalaJS.newArrayObject(ScalaJS.d.I.getArrayOf(), [nsize])
    } else {
      ScalaJS.m.ju_Arrays().fill__AI__I__V($$this.sizemap$5, 0)
    }
  }
});
ScalaJS.i.scm_FlatHashTable$class__index__scm_FlatHashTable__I__I = (function($$this, hcode) {
  var seed = $$this.seedvalue$5;
  var improved = ScalaJS.i.scm_FlatHashTable$HashUtils$class__improve__scm_FlatHashTable$HashUtils__I__I__I($$this, hcode, seed);
  var ones = (($$this.table$5.u["length"] - 1) | 0);
  return (((improved >>> ((32 - ScalaJS.m.jl_Integer().bitCount__I__I(ones)) | 0)) | 0) & ones)
});
ScalaJS.i.scm_FlatHashTable$class__findEntryImpl__scm_FlatHashTable__O__O = (function($$this, elem) {
  var hcode = ScalaJS.i.scm_FlatHashTable$HashUtils$class__elemHashCode__scm_FlatHashTable$HashUtils__O__I($$this, elem);
  var h = ScalaJS.i.scm_FlatHashTable$class__index__scm_FlatHashTable__I__I($$this, hcode);
  var entry = $$this.table$5.u[h];
  while (((null !== entry) && (!ScalaJS.anyEqEq(entry, elem)))) {
    h = (((h + 1) | 0) % $$this.table$5.u["length"]);
    entry = $$this.table$5.u[h]
  };
  return entry
});
ScalaJS.i.scm_FlatHashTable$class__$init$__scm_FlatHashTable__V = (function($$this) {
  $$this.$$undloadFactor$5 = 450;
  $$this.table$5 = ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [ScalaJS.i.scm_FlatHashTable$class__capacity__scm_FlatHashTable__I__I($$this, 32)]);
  $$this.tableSize$5 = 0;
  $$this.threshold$5 = ScalaJS.m.scm_FlatHashTable().newThreshold__I__I__I($$this.$$undloadFactor$5, ScalaJS.i.scm_FlatHashTable$class__capacity__scm_FlatHashTable__I__I($$this, 32));
  $$this.sizemap$5 = null;
  $$this.seedvalue$5 = ScalaJS.i.scm_FlatHashTable$class__tableSizeSeed__scm_FlatHashTable__I($$this)
});
ScalaJS.i.scm_FlatHashTable$class__initWithContents__scm_FlatHashTable__scm_FlatHashTable$Contents__V = (function($$this, c) {
  if ((c !== null)) {
    $$this.$$undloadFactor$5 = c.loadFactor__I();
    $$this.table$5 = c.table__AO();
    $$this.tableSize$5 = c.tableSize__I();
    $$this.threshold$5 = c.threshold__I();
    $$this.seedvalue$5 = c.seedvalue__I();
    $$this.sizemap$5 = c.sizemap__AI()
  }
});
ScalaJS.i.scm_FlatHashTable$class__addEntry__scm_FlatHashTable__O__Z = (function($$this, elem) {
  var hcode = ScalaJS.i.scm_FlatHashTable$HashUtils$class__elemHashCode__scm_FlatHashTable$HashUtils__O__I($$this, elem);
  var h = ScalaJS.i.scm_FlatHashTable$class__index__scm_FlatHashTable__I__I($$this, hcode);
  var entry = $$this.table$5.u[h];
  while ((null !== entry)) {
    if (ScalaJS.anyEqEq(entry, elem)) {
      return false
    };
    h = (((h + 1) | 0) % $$this.table$5.u["length"]);
    entry = $$this.table$5.u[h]
  };
  $$this.table$5.u[h] = elem;
  $$this.tableSize$5 = (($$this.tableSize$5 + 1) | 0);
  var h$1 = h;
  ScalaJS.i.scm_FlatHashTable$class__nnSizeMapAdd__scm_FlatHashTable__I__V($$this, h$1);
  if (($$this.tableSize$5 >= $$this.threshold$5)) {
    ScalaJS.i.scm_FlatHashTable$class__growTable__scm_FlatHashTable__V($$this)
  };
  return true
});
ScalaJS.i.scm_FlatHashTable$class__tableSizeSeed__scm_FlatHashTable__I = (function($$this) {
  return ScalaJS.m.jl_Integer().bitCount__I__I((($$this.table$5.u["length"] - 1) | 0))
});
ScalaJS.i.scm_FlatHashTable$class__capacity__scm_FlatHashTable__I__I = (function($$this, expectedSize) {
  return ((expectedSize === 0) ? 1 : ScalaJS.m.scm_HashTable().powerOfTwo__I__I(expectedSize))
});
ScalaJS.i.scm_FlatHashTable$class__nnSizeMapAdd__scm_FlatHashTable__I__V = (function($$this, h) {
  if (($$this.sizemap$5 !== null)) {
    var p = (h >> 5);
    var ev$1 = $$this.sizemap$5;
    ev$1.u[p] = ((ev$1.u[p] + 1) | 0)
  }
});
ScalaJS.i.scm_FlatHashTable$class__growTable__scm_FlatHashTable__V = (function($$this) {
  var oldtable = $$this.table$5;
  $$this.table$5 = ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [ScalaJS.imul($$this.table$5.u["length"], 2)]);
  $$this.tableSize$5 = 0;
  var tableLength = $$this.table$5.u["length"];
  ScalaJS.i.scm_FlatHashTable$class__nnSizeMapReset__scm_FlatHashTable__I__V($$this, tableLength);
  $$this.seedvalue$5 = ScalaJS.i.scm_FlatHashTable$class__tableSizeSeed__scm_FlatHashTable__I($$this);
  $$this.threshold$5 = ScalaJS.m.scm_FlatHashTable().newThreshold__I__I__I($$this.$$undloadFactor$5, $$this.table$5.u["length"]);
  var i = 0;
  while ((i < oldtable.u["length"])) {
    var entry = oldtable.u[i];
    if ((null !== entry)) {
      ScalaJS.i.scm_FlatHashTable$class__addEntry__scm_FlatHashTable__O__Z($$this, entry)
    };
    i = ((i + 1) | 0)
  }
});
ScalaJS.i.scm_FlatHashTable$class__calcSizeMapSize__scm_FlatHashTable__I__I = (function($$this, tableLength) {
  return (((tableLength >> 5) + 1) | 0)
});
ScalaJS.i.scm_IndexedSeqLike$class__thisCollection__scm_IndexedSeqLike__scm_IndexedSeq = (function($$this) {
  return ScalaJS.as.scm_IndexedSeq($$this)
});
ScalaJS.i.scm_ResizableArray$class__apply__scm_ResizableArray__I__O = (function($$this, idx) {
  if ((idx >= $$this.size0$6)) {
    throw new ScalaJS.c.jl_IndexOutOfBoundsException().init___T(ScalaJS.objectToString(idx))
  };
  return $$this.array$6.u[idx]
});
ScalaJS.i.scm_ResizableArray$class__ensureSize__scm_ResizableArray__I__V = (function($$this, n) {
  if ((n > $$this.array$6.u["length"])) {
    var newsize = ScalaJS.imul($$this.array$6.u["length"], 2);
    while ((n > newsize)) {
      newsize = ScalaJS.imul(newsize, 2)
    };
    var newar = ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [newsize]);
    var src = $$this.array$6;
    var length = $$this.size0$6;
    ScalaJS.systemArraycopy(src, 0, newar, 0, length);
    $$this.array$6 = newar
  }
});
ScalaJS.i.scm_ResizableArray$class__$init$__scm_ResizableArray__V = (function($$this) {
  var x = $$this.initialSize$6;
  $$this.array$6 = ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [((x > 1) ? x : 1)]);
  $$this.size0$6 = 0
});
ScalaJS.i.scm_ResizableArray$class__foreach__scm_ResizableArray__F1__V = (function($$this, f) {
  var i = 0;
  var top = $$this.size0$6;
  while ((i < top)) {
    f.apply__O__O($$this.array$6.u[i]);
    i = ((i + 1) | 0)
  }
});
ScalaJS.i.scm_ResizableArray$class__copyToArray__scm_ResizableArray__O__I__I__V = (function($$this, xs, start, len) {
  var jsx$1 = ScalaJS.m.sr_RichInt();
  var x = ScalaJS.m.sr_RichInt().min$extension__I__I__I(len, ((ScalaJS.m.sr_ScalaRunTime().array$undlength__O__I(xs) - start) | 0));
  var len1 = jsx$1.min$extension__I__I__I(x, $$this.size0$6);
  ScalaJS.m.s_Array().copy__O__I__O__I__I__V($$this.array$6, 0, xs, start, len1)
});
ScalaJS.i.scm_SetLike$class__newBuilder__scm_SetLike__scm_Builder = (function($$this) {
  return ScalaJS.as.scm_Builder($$this.empty__sc_Set())
});
ScalaJS.i.scm_SetLike$class__result__scm_SetLike__scm_Set = (function($$this) {
  return ScalaJS.as.scm_Set($$this)
});
ScalaJS.i.scm_SetLike$class__$plus__scm_SetLike__O__scm_Set = (function($$this, elem) {
  var this$1 = $$this.clone__scm_HashSet();
  return this$1.$$plus$eq__O__scm_HashSet(elem)
});
ScalaJS.i.sjsr_RuntimeString$class__indexOf__sjsr_RuntimeString__T__I = (function($$this, str) {
  return (ScalaJS.uD($$this["indexOf"](str)) | 0)
});
ScalaJS.i.sjsr_RuntimeString$class__toUpperCase__sjsr_RuntimeString__T = (function($$this) {
  return ScalaJS.as.T($$this["toUpperCase"]())
});
ScalaJS.i.sjsr_RuntimeString$class__charAt__sjsr_RuntimeString__I__C = (function($$this, index) {
  return (ScalaJS.uD($$this["charCodeAt"](index)) & 65535)
});
ScalaJS.i.sjsr_RuntimeString$class__lastIndexOf__sjsr_RuntimeString__I__I = (function($$this, ch) {
  var jsx$1 = ScalaJS.g["String"];
  var col = ScalaJS.m.s_Predef().wrapIntArray__AI__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.I.getArrayOf(), [ch]));
  var result = new ScalaJS.g["Array"]();
  var i = 0;
  var len = col.length__I();
  while ((i < len)) {
    var x$2 = col.apply__I__O(i);
    ScalaJS.uI(result["push"](x$2));
    i = ((i + 1) | 0)
  };
  var search = ScalaJS.as.T(ScalaJS.applyMethodWithVarargs(jsx$1, "fromCharCode", result));
  return (ScalaJS.uD($$this["lastIndexOf"](search)) | 0)
});
ScalaJS.i.sjsr_RuntimeString$class__indexOf__sjsr_RuntimeString__I__I = (function($$this, ch) {
  var jsx$1 = ScalaJS.g["String"];
  var col = ScalaJS.m.s_Predef().wrapIntArray__AI__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.I.getArrayOf(), [ch]));
  var result = new ScalaJS.g["Array"]();
  var i = 0;
  var len = col.length__I();
  while ((i < len)) {
    var x$2 = col.apply__I__O(i);
    ScalaJS.uI(result["push"](x$2));
    i = ((i + 1) | 0)
  };
  var search = ScalaJS.as.T(ScalaJS.applyMethodWithVarargs(jsx$1, "fromCharCode", result));
  return (ScalaJS.uD($$this["indexOf"](search)) | 0)
});
ScalaJS.i.sjsr_RuntimeString$class__toCharArray__sjsr_RuntimeString__AC = (function($$this) {
  var length = (ScalaJS.uD($$this["length"]) | 0);
  var result = ScalaJS.newArrayObject(ScalaJS.d.C.getArrayOf(), [length]);
  var i = 0;
  while ((i < length)) {
    result.u[i] = ScalaJS.i.sjsr_RuntimeString$class__charAt__sjsr_RuntimeString__I__C(ScalaJS.as.T($$this), i);
    i = ((i + 1) | 0)
  };
  return result
});
ScalaJS.i.sjsr_RuntimeString$class__substring__sjsr_RuntimeString__I__I__T = (function($$this, beginIndex, endIndex) {
  return ScalaJS.as.T($$this["substring"](beginIndex, endIndex))
});
ScalaJS.i.sjsr_RuntimeString$class__substring__sjsr_RuntimeString__I__T = (function($$this, beginIndex) {
  return ScalaJS.as.T($$this["substring"](beginIndex))
});
ScalaJS.i.sjsr_RuntimeString$class__length__sjsr_RuntimeString__I = (function($$this) {
  return (ScalaJS.uD($$this["length"]) | 0)
});
ScalaJS.i.sjsr_RuntimeString$class__isEmpty__sjsr_RuntimeString__Z = (function($$this) {
  return ((ScalaJS.uD($$this["length"]) | 0) === 0)
});
/** @constructor */
ScalaJS.c.LSample$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.LSample$.prototype = new ScalaJS.h.O();
ScalaJS.c.LSample$.prototype.constructor = ScalaJS.c.LSample$;
/** @constructor */
ScalaJS.h.LSample$ = (function() {
  /*<skip>*/
});
ScalaJS.h.LSample$.prototype = ScalaJS.c.LSample$.prototype;
ScalaJS.c.LSample$.prototype.$$js$exported$meth$twice__T__O = (function(s) {
  return this.twice__T__T(s)
});
ScalaJS.c.LSample$.prototype.twice__T__T = (function(s) {
  var this$2 = new ScalaJS.c.sci_StringOps().init___T(s);
  var ss = ScalaJS.i.sci_StringLike$class__$times__sci_StringLike__I__T(this$2, 2);
  var this$4 = ScalaJS.m.s_Console();
  this$4.out__Ljava_io_PrintStream().println__O__V(ss);
  return ss
});
ScalaJS.c.LSample$.prototype["twice"] = (function(arg$1) {
  arg$1 = ScalaJS.as.T(arg$1);
  return this.$$js$exported$meth$twice__T__O(arg$1)
});
ScalaJS.is.LSample$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.LSample$)))
});
ScalaJS.as.LSample$ = (function(obj) {
  return ((ScalaJS.is.LSample$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "Sample$"))
});
ScalaJS.isArrayOf.LSample$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.LSample$)))
});
ScalaJS.asArrayOf.LSample$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.LSample$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "LSample$;", depth))
});
ScalaJS.d.LSample$ = new ScalaJS.ClassTypeData({
  LSample$: 0
}, false, "Sample$", ScalaJS.d.O, {
  LSample$: 1,
  O: 1
});
ScalaJS.c.LSample$.prototype.$classData = ScalaJS.d.LSample$;
ScalaJS.n.LSample = (void 0);
ScalaJS.m.LSample = (function() {
  if ((!ScalaJS.n.LSample)) {
    ScalaJS.n.LSample = new ScalaJS.c.LSample$().init___()
  };
  return ScalaJS.n.LSample
});
ScalaJS.e["Sample"] = ScalaJS.m.LSample;
ScalaJS.is.Ljava_io_Closeable = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.Ljava_io_Closeable)))
});
ScalaJS.as.Ljava_io_Closeable = (function(obj) {
  return ((ScalaJS.is.Ljava_io_Closeable(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.io.Closeable"))
});
ScalaJS.isArrayOf.Ljava_io_Closeable = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.Ljava_io_Closeable)))
});
ScalaJS.asArrayOf.Ljava_io_Closeable = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.Ljava_io_Closeable(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.io.Closeable;", depth))
});
ScalaJS.d.Ljava_io_Closeable = new ScalaJS.ClassTypeData({
  Ljava_io_Closeable: 0
}, true, "java.io.Closeable", (void 0), {
  Ljava_io_Closeable: 1,
  O: 1
});
/** @constructor */
ScalaJS.c.Ljava_io_OutputStream = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.Ljava_io_OutputStream.prototype = new ScalaJS.h.O();
ScalaJS.c.Ljava_io_OutputStream.prototype.constructor = ScalaJS.c.Ljava_io_OutputStream;
/** @constructor */
ScalaJS.h.Ljava_io_OutputStream = (function() {
  /*<skip>*/
});
ScalaJS.h.Ljava_io_OutputStream.prototype = ScalaJS.c.Ljava_io_OutputStream.prototype;
ScalaJS.c.Ljava_io_OutputStream.prototype.close__V = (function() {
  /*<skip>*/
});
ScalaJS.is.Ljava_io_OutputStream = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.Ljava_io_OutputStream)))
});
ScalaJS.as.Ljava_io_OutputStream = (function(obj) {
  return ((ScalaJS.is.Ljava_io_OutputStream(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.io.OutputStream"))
});
ScalaJS.isArrayOf.Ljava_io_OutputStream = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.Ljava_io_OutputStream)))
});
ScalaJS.asArrayOf.Ljava_io_OutputStream = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.Ljava_io_OutputStream(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.io.OutputStream;", depth))
});
ScalaJS.d.Ljava_io_OutputStream = new ScalaJS.ClassTypeData({
  Ljava_io_OutputStream: 0
}, false, "java.io.OutputStream", ScalaJS.d.O, {
  Ljava_io_OutputStream: 1,
  Ljava_io_Flushable: 1,
  Ljava_io_Closeable: 1,
  O: 1
});
ScalaJS.c.Ljava_io_OutputStream.prototype.$classData = ScalaJS.d.Ljava_io_OutputStream;
ScalaJS.is.T = (function(obj) {
  return (typeof(obj) === "string")
});
ScalaJS.as.T = (function(obj) {
  return ((ScalaJS.is.T(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.String"))
});
ScalaJS.isArrayOf.T = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.T)))
});
ScalaJS.asArrayOf.T = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.T(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.String;", depth))
});
ScalaJS.d.T = new ScalaJS.ClassTypeData({
  T: 0
}, false, "java.lang.String", ScalaJS.d.O, {
  T: 1,
  Ljava_io_Serializable: 1,
  jl_CharSequence: 1,
  jl_Comparable: 1,
  O: 1
}, ScalaJS.is.T);
/** @constructor */
ScalaJS.c.T5 = (function() {
  ScalaJS.c.O.call(this);
  this.$$und1$1 = null;
  this.$$und2$1 = null;
  this.$$und3$1 = null;
  this.$$und4$1 = null;
  this.$$und5$1 = null
});
ScalaJS.c.T5.prototype = new ScalaJS.h.O();
ScalaJS.c.T5.prototype.constructor = ScalaJS.c.T5;
/** @constructor */
ScalaJS.h.T5 = (function() {
  /*<skip>*/
});
ScalaJS.h.T5.prototype = ScalaJS.c.T5.prototype;
ScalaJS.c.T5.prototype.productPrefix__T = (function() {
  return "Tuple5"
});
ScalaJS.c.T5.prototype.productArity__I = (function() {
  return 5
});
ScalaJS.c.T5.prototype.equals__O__Z = (function(x$1) {
  if ((this === x$1)) {
    return true
  } else if (ScalaJS.is.T5(x$1)) {
    var Tuple5$1 = ScalaJS.as.T5(x$1);
    return (((((ScalaJS.anyEqEq(this.$$und1$1, Tuple5$1.$$und1$1) && ScalaJS.anyEqEq(this.$$und2$1, Tuple5$1.$$und2$1)) && ScalaJS.anyEqEq(this.$$und3$1, Tuple5$1.$$und3$1)) && ScalaJS.anyEqEq(this.$$und4$1, Tuple5$1.$$und4$1)) && ScalaJS.anyEqEq(this.$$und5$1, Tuple5$1.$$und5$1)) && Tuple5$1.canEqual__O__Z(this))
  } else {
    return false
  }
});
ScalaJS.c.T5.prototype.productElement__I__O = (function(n) {
  return ScalaJS.i.s_Product5$class__productElement__s_Product5__I__O(this, n)
});
ScalaJS.c.T5.prototype.toString__T = (function() {
  return (((((((((("(" + this.$$und1$1) + ",") + this.$$und2$1) + ",") + this.$$und3$1) + ",") + this.$$und4$1) + ",") + this.$$und5$1) + ")")
});
ScalaJS.c.T5.prototype.canEqual__O__Z = (function(x$1) {
  return ScalaJS.is.T5(x$1)
});
ScalaJS.c.T5.prototype.hashCode__I = (function() {
  var this$2 = ScalaJS.m.s_util_hashing_MurmurHash3();
  return this$2.productHash__s_Product__I__I(this, -889275714)
});
ScalaJS.c.T5.prototype.productIterator__sc_Iterator = (function() {
  return new ScalaJS.c.sr_ScalaRunTime$$anon$1().init___s_Product(this)
});
ScalaJS.c.T5.prototype.init___O__O__O__O__O = (function(_1, _2, _3, _4, _5) {
  this.$$und1$1 = _1;
  this.$$und2$1 = _2;
  this.$$und3$1 = _3;
  this.$$und4$1 = _4;
  this.$$und5$1 = _5;
  return this
});
ScalaJS.is.T5 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.T5)))
});
ScalaJS.as.T5 = (function(obj) {
  return ((ScalaJS.is.T5(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.Tuple5"))
});
ScalaJS.isArrayOf.T5 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.T5)))
});
ScalaJS.asArrayOf.T5 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.T5(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.Tuple5;", depth))
});
ScalaJS.d.T5 = new ScalaJS.ClassTypeData({
  T5: 0
}, false, "scala.Tuple5", ScalaJS.d.O, {
  T5: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  s_Product5: 1,
  s_Product: 1,
  s_Equals: 1,
  O: 1
});
ScalaJS.c.T5.prototype.$classData = ScalaJS.d.T5;
ScalaJS.is.jl_Appendable = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_Appendable)))
});
ScalaJS.as.jl_Appendable = (function(obj) {
  return ((ScalaJS.is.jl_Appendable(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.Appendable"))
});
ScalaJS.isArrayOf.jl_Appendable = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Appendable)))
});
ScalaJS.asArrayOf.jl_Appendable = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Appendable(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Appendable;", depth))
});
ScalaJS.d.jl_Appendable = new ScalaJS.ClassTypeData({
  jl_Appendable: 0
}, true, "java.lang.Appendable", (void 0), {
  jl_Appendable: 1,
  O: 1
});
ScalaJS.isArrayOf.jl_Boolean = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Boolean)))
});
ScalaJS.asArrayOf.jl_Boolean = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Boolean(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Boolean;", depth))
});
ScalaJS.d.jl_Boolean = new ScalaJS.ClassTypeData({
  jl_Boolean: 0
}, false, "java.lang.Boolean", (void 0), {
  jl_Boolean: 1,
  jl_Comparable: 1,
  O: 1
}, (function(x) {
  return (typeof(x) === "boolean")
}));
/** @constructor */
ScalaJS.c.jl_Boolean$ = (function() {
  ScalaJS.c.O.call(this);
  this.TYPE$1 = null;
  this.TRUE$1 = null;
  this.FALSE$1 = null
});
ScalaJS.c.jl_Boolean$.prototype = new ScalaJS.h.O();
ScalaJS.c.jl_Boolean$.prototype.constructor = ScalaJS.c.jl_Boolean$;
/** @constructor */
ScalaJS.h.jl_Boolean$ = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_Boolean$.prototype = ScalaJS.c.jl_Boolean$.prototype;
ScalaJS.c.jl_Boolean$.prototype.init___ = (function() {
  ScalaJS.n.jl_Boolean = this;
  this.TYPE$1 = ScalaJS.d.Z.getClassOf();
  this.TRUE$1 = true;
  this.FALSE$1 = false;
  return this
});
ScalaJS.c.jl_Boolean$.prototype.valueOf__Z__jl_Boolean = (function(booleanValue) {
  return (booleanValue ? this.TRUE$1 : this.FALSE$1)
});
ScalaJS.is.jl_Boolean$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_Boolean$)))
});
ScalaJS.as.jl_Boolean$ = (function(obj) {
  return ((ScalaJS.is.jl_Boolean$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.Boolean$"))
});
ScalaJS.isArrayOf.jl_Boolean$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Boolean$)))
});
ScalaJS.asArrayOf.jl_Boolean$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Boolean$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Boolean$;", depth))
});
ScalaJS.d.jl_Boolean$ = new ScalaJS.ClassTypeData({
  jl_Boolean$: 0
}, false, "java.lang.Boolean$", ScalaJS.d.O, {
  jl_Boolean$: 1,
  O: 1
});
ScalaJS.c.jl_Boolean$.prototype.$classData = ScalaJS.d.jl_Boolean$;
ScalaJS.n.jl_Boolean = (void 0);
ScalaJS.m.jl_Boolean = (function() {
  if ((!ScalaJS.n.jl_Boolean)) {
    ScalaJS.n.jl_Boolean = new ScalaJS.c.jl_Boolean$().init___()
  };
  return ScalaJS.n.jl_Boolean
});
/** @constructor */
ScalaJS.c.jl_Byte$ = (function() {
  ScalaJS.c.O.call(this);
  this.TYPE$1 = null;
  this.MIN$undVALUE$1 = 0;
  this.MAX$undVALUE$1 = 0;
  this.SIZE$1 = 0
});
ScalaJS.c.jl_Byte$.prototype = new ScalaJS.h.O();
ScalaJS.c.jl_Byte$.prototype.constructor = ScalaJS.c.jl_Byte$;
/** @constructor */
ScalaJS.h.jl_Byte$ = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_Byte$.prototype = ScalaJS.c.jl_Byte$.prototype;
ScalaJS.c.jl_Byte$.prototype.init___ = (function() {
  ScalaJS.n.jl_Byte = this;
  this.TYPE$1 = ScalaJS.d.B.getClassOf();
  this.MIN$undVALUE$1 = -128;
  this.MAX$undVALUE$1 = 127;
  this.SIZE$1 = 8;
  return this
});
ScalaJS.is.jl_Byte$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_Byte$)))
});
ScalaJS.as.jl_Byte$ = (function(obj) {
  return ((ScalaJS.is.jl_Byte$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.Byte$"))
});
ScalaJS.isArrayOf.jl_Byte$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Byte$)))
});
ScalaJS.asArrayOf.jl_Byte$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Byte$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Byte$;", depth))
});
ScalaJS.d.jl_Byte$ = new ScalaJS.ClassTypeData({
  jl_Byte$: 0
}, false, "java.lang.Byte$", ScalaJS.d.O, {
  jl_Byte$: 1,
  O: 1
});
ScalaJS.c.jl_Byte$.prototype.$classData = ScalaJS.d.jl_Byte$;
ScalaJS.n.jl_Byte = (void 0);
ScalaJS.m.jl_Byte = (function() {
  if ((!ScalaJS.n.jl_Byte)) {
    ScalaJS.n.jl_Byte = new ScalaJS.c.jl_Byte$().init___()
  };
  return ScalaJS.n.jl_Byte
});
ScalaJS.is.jl_CharSequence = (function(obj) {
  return (!(!(((obj && obj.$classData) && obj.$classData.ancestors.jl_CharSequence) || (typeof(obj) === "string"))))
});
ScalaJS.as.jl_CharSequence = (function(obj) {
  return ((ScalaJS.is.jl_CharSequence(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.CharSequence"))
});
ScalaJS.isArrayOf.jl_CharSequence = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_CharSequence)))
});
ScalaJS.asArrayOf.jl_CharSequence = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_CharSequence(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.CharSequence;", depth))
});
ScalaJS.d.jl_CharSequence = new ScalaJS.ClassTypeData({
  jl_CharSequence: 0
}, true, "java.lang.CharSequence", (void 0), {
  jl_CharSequence: 1,
  O: 1
}, ScalaJS.is.jl_CharSequence);
/** @constructor */
ScalaJS.c.jl_Character = (function() {
  ScalaJS.c.O.call(this);
  this.value$1 = 0
});
ScalaJS.c.jl_Character.prototype = new ScalaJS.h.O();
ScalaJS.c.jl_Character.prototype.constructor = ScalaJS.c.jl_Character;
/** @constructor */
ScalaJS.h.jl_Character = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_Character.prototype = ScalaJS.c.jl_Character.prototype;
ScalaJS.c.jl_Character.prototype.equals__O__Z = (function(that) {
  if (ScalaJS.is.jl_Character(that)) {
    var this$1 = ScalaJS.as.jl_Character(that);
    return (this.value$1 === this$1.value$1)
  } else {
    return false
  }
});
ScalaJS.c.jl_Character.prototype.toString__T = (function() {
  var jsx$1 = ScalaJS.g["String"];
  var col = ScalaJS.m.s_Predef().wrapIntArray__AI__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.I.getArrayOf(), [this.value$1]));
  var result = new ScalaJS.g["Array"]();
  var i = 0;
  var len = col.length__I();
  while ((i < len)) {
    var x$2 = col.apply__I__O(i);
    ScalaJS.uI(result["push"](x$2));
    i = ((i + 1) | 0)
  };
  return ScalaJS.as.T(ScalaJS.applyMethodWithVarargs(jsx$1, "fromCharCode", result))
});
ScalaJS.c.jl_Character.prototype.init___C = (function(value) {
  this.value$1 = value;
  return this
});
ScalaJS.c.jl_Character.prototype.hashCode__I = (function() {
  return this.value$1
});
ScalaJS.is.jl_Character = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_Character)))
});
ScalaJS.as.jl_Character = (function(obj) {
  return ((ScalaJS.is.jl_Character(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.Character"))
});
ScalaJS.isArrayOf.jl_Character = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Character)))
});
ScalaJS.asArrayOf.jl_Character = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Character(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Character;", depth))
});
ScalaJS.d.jl_Character = new ScalaJS.ClassTypeData({
  jl_Character: 0
}, false, "java.lang.Character", ScalaJS.d.O, {
  jl_Character: 1,
  jl_Comparable: 1,
  O: 1
});
ScalaJS.c.jl_Character.prototype.$classData = ScalaJS.d.jl_Character;
/** @constructor */
ScalaJS.c.jl_Character$ = (function() {
  ScalaJS.c.O.call(this);
  this.TYPE$1 = null;
  this.MIN$undVALUE$1 = 0;
  this.MAX$undVALUE$1 = 0;
  this.LOWERCASE$undLETTER$1 = 0;
  this.UPPERCASE$undLETTER$1 = 0;
  this.OTHER$undLETTER$1 = 0;
  this.TITLECASE$undLETTER$1 = 0;
  this.LETTER$undNUMBER$1 = 0;
  this.COMBINING$undSPACING$undMARK$1 = 0;
  this.ENCLOSING$undMARK$1 = 0;
  this.NON$undSPACING$undMARK$1 = 0;
  this.MODIFIER$undLETTER$1 = 0;
  this.DECIMAL$undDIGIT$undNUMBER$1 = 0;
  this.SURROGATE$1 = 0;
  this.MIN$undRADIX$1 = 0;
  this.MAX$undRADIX$1 = 0;
  this.MIN$undHIGH$undSURROGATE$1 = 0;
  this.MAX$undHIGH$undSURROGATE$1 = 0;
  this.MIN$undLOW$undSURROGATE$1 = 0;
  this.MAX$undLOW$undSURROGATE$1 = 0;
  this.MIN$undSURROGATE$1 = 0;
  this.MAX$undSURROGATE$1 = 0;
  this.reUnicodeIdentStart$1 = null;
  this.reUnicodeIdentPartExcl$1 = null;
  this.reIdentIgnorable$1 = null;
  this.bitmap$0$1 = 0
});
ScalaJS.c.jl_Character$.prototype = new ScalaJS.h.O();
ScalaJS.c.jl_Character$.prototype.constructor = ScalaJS.c.jl_Character$;
/** @constructor */
ScalaJS.h.jl_Character$ = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_Character$.prototype = ScalaJS.c.jl_Character$.prototype;
ScalaJS.c.jl_Character$.prototype.init___ = (function() {
  ScalaJS.n.jl_Character = this;
  this.TYPE$1 = ScalaJS.d.C.getClassOf();
  this.MIN$undVALUE$1 = 0;
  this.MAX$undVALUE$1 = 65535;
  this.LOWERCASE$undLETTER$1 = 0;
  this.UPPERCASE$undLETTER$1 = 0;
  this.OTHER$undLETTER$1 = 0;
  this.TITLECASE$undLETTER$1 = 0;
  this.LETTER$undNUMBER$1 = 0;
  this.COMBINING$undSPACING$undMARK$1 = 0;
  this.ENCLOSING$undMARK$1 = 0;
  this.NON$undSPACING$undMARK$1 = 0;
  this.MODIFIER$undLETTER$1 = 0;
  this.DECIMAL$undDIGIT$undNUMBER$1 = 0;
  this.SURROGATE$1 = 0;
  this.MIN$undRADIX$1 = 2;
  this.MAX$undRADIX$1 = 36;
  this.MIN$undHIGH$undSURROGATE$1 = 55296;
  this.MAX$undHIGH$undSURROGATE$1 = 56319;
  this.MIN$undLOW$undSURROGATE$1 = 56320;
  this.MAX$undLOW$undSURROGATE$1 = 57343;
  this.MIN$undSURROGATE$1 = this.MIN$undHIGH$undSURROGATE$1;
  this.MAX$undSURROGATE$1 = this.MAX$undLOW$undSURROGATE$1;
  return this
});
ScalaJS.c.jl_Character$.prototype.digit__C__I__I = (function(c, radix) {
  return (((radix > this.MAX$undRADIX$1) || (radix < this.MIN$undRADIX$1)) ? -1 : ((((c >= 48) && (c <= 57)) && (((c - 48) | 0) < radix)) ? ((c - 48) | 0) : ((((c >= 65) && (c <= 90)) && (((c - 65) | 0) < ((radix - 10) | 0))) ? ((((c - 65) | 0) + 10) | 0) : ((((c >= 97) && (c <= 122)) && (((c - 97) | 0) < ((radix - 10) | 0))) ? ((((c - 97) | 0) + 10) | 0) : ((((c >= 65313) && (c <= 65338)) && (((c - 65313) | 0) < ((radix - 10) | 0))) ? ((((c - 65313) | 0) + 10) | 0) : ((((c >= 65345) && (c <= 65370)) && (((c - 65345) | 0) < ((radix - 10) | 0))) ? ((((c - 65313) | 0) + 10) | 0) : -1))))))
});
ScalaJS.c.jl_Character$.prototype.isUpperCase__C__Z = (function(c) {
  return (this.toUpperCase__C__C(c) === c)
});
ScalaJS.c.jl_Character$.prototype.toUpperCase__C__C = (function(c) {
  var jsx$1 = ScalaJS.m.sci_StringOps();
  var x = ScalaJS.i.sjsr_RuntimeString$class__toUpperCase__sjsr_RuntimeString__T(ScalaJS.objectToString(ScalaJS.bC(c)));
  return jsx$1.apply$extension__T__I__C(x, 0)
});
ScalaJS.is.jl_Character$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_Character$)))
});
ScalaJS.as.jl_Character$ = (function(obj) {
  return ((ScalaJS.is.jl_Character$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.Character$"))
});
ScalaJS.isArrayOf.jl_Character$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Character$)))
});
ScalaJS.asArrayOf.jl_Character$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Character$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Character$;", depth))
});
ScalaJS.d.jl_Character$ = new ScalaJS.ClassTypeData({
  jl_Character$: 0
}, false, "java.lang.Character$", ScalaJS.d.O, {
  jl_Character$: 1,
  O: 1
});
ScalaJS.c.jl_Character$.prototype.$classData = ScalaJS.d.jl_Character$;
ScalaJS.n.jl_Character = (void 0);
ScalaJS.m.jl_Character = (function() {
  if ((!ScalaJS.n.jl_Character)) {
    ScalaJS.n.jl_Character = new ScalaJS.c.jl_Character$().init___()
  };
  return ScalaJS.n.jl_Character
});
/** @constructor */
ScalaJS.c.jl_Class = (function() {
  ScalaJS.c.O.call(this);
  this.data$1 = null
});
ScalaJS.c.jl_Class.prototype = new ScalaJS.h.O();
ScalaJS.c.jl_Class.prototype.constructor = ScalaJS.c.jl_Class;
/** @constructor */
ScalaJS.h.jl_Class = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_Class.prototype = ScalaJS.c.jl_Class.prototype;
ScalaJS.c.jl_Class.prototype.getName__T = (function() {
  return ScalaJS.as.T(this.data$1["name"])
});
ScalaJS.c.jl_Class.prototype.getComponentType__jl_Class = (function() {
  return ScalaJS.as.jl_Class(this.data$1["getComponentType"]())
});
ScalaJS.c.jl_Class.prototype.isPrimitive__Z = (function() {
  return ScalaJS.uZ(this.data$1["isPrimitive"])
});
ScalaJS.c.jl_Class.prototype.toString__T = (function() {
  return ((this.isInterface__Z() ? "interface " : (this.isPrimitive__Z() ? "" : "class ")) + this.getName__T())
});
ScalaJS.c.jl_Class.prototype.isAssignableFrom__jl_Class__Z = (function(that) {
  return ((this.isPrimitive__Z() || that.isPrimitive__Z()) ? ((this === that) || ((this === ScalaJS.d.S.getClassOf()) ? (that === ScalaJS.d.B.getClassOf()) : ((this === ScalaJS.d.I.getClassOf()) ? ((that === ScalaJS.d.B.getClassOf()) || (that === ScalaJS.d.S.getClassOf())) : ((this === ScalaJS.d.F.getClassOf()) ? (((that === ScalaJS.d.B.getClassOf()) || (that === ScalaJS.d.S.getClassOf())) || (that === ScalaJS.d.I.getClassOf())) : ((this === ScalaJS.d.D.getClassOf()) && ((((that === ScalaJS.d.B.getClassOf()) || (that === ScalaJS.d.S.getClassOf())) || (that === ScalaJS.d.I.getClassOf())) || (that === ScalaJS.d.F.getClassOf()))))))) : this.isInstance__O__Z(that.getFakeInstance__p1__O()))
});
ScalaJS.c.jl_Class.prototype.isInstance__O__Z = (function(obj) {
  return ScalaJS.uZ(this.data$1["isInstance"](obj))
});
ScalaJS.c.jl_Class.prototype.init___jl_ScalaJSClassData = (function(data) {
  this.data$1 = data;
  return this
});
ScalaJS.c.jl_Class.prototype.getFakeInstance__p1__O = (function() {
  return this.data$1["getFakeInstance"]()
});
ScalaJS.c.jl_Class.prototype.newArrayOfThisClass__sjs_js_Array__O = (function(dimensions) {
  return this.data$1["newArrayOfThisClass"](dimensions)
});
ScalaJS.c.jl_Class.prototype.isArray__Z = (function() {
  return ScalaJS.uZ(this.data$1["isArrayClass"])
});
ScalaJS.c.jl_Class.prototype.isInterface__Z = (function() {
  return ScalaJS.uZ(this.data$1["isInterface"])
});
ScalaJS.is.jl_Class = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_Class)))
});
ScalaJS.as.jl_Class = (function(obj) {
  return ((ScalaJS.is.jl_Class(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.Class"))
});
ScalaJS.isArrayOf.jl_Class = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Class)))
});
ScalaJS.asArrayOf.jl_Class = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Class(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Class;", depth))
});
ScalaJS.d.jl_Class = new ScalaJS.ClassTypeData({
  jl_Class: 0
}, false, "java.lang.Class", ScalaJS.d.O, {
  jl_Class: 1,
  O: 1
});
ScalaJS.c.jl_Class.prototype.$classData = ScalaJS.d.jl_Class;
/** @constructor */
ScalaJS.c.jl_Double$ = (function() {
  ScalaJS.c.O.call(this);
  this.TYPE$1 = null;
  this.POSITIVE$undINFINITY$1 = 0.0;
  this.NEGATIVE$undINFINITY$1 = 0.0;
  this.NaN$1 = 0.0;
  this.MAX$undVALUE$1 = 0.0;
  this.MIN$undNORMAL$1 = 0.0;
  this.MIN$undVALUE$1 = 0.0;
  this.MAX$undEXPONENT$1 = 0;
  this.MIN$undEXPONENT$1 = 0;
  this.SIZE$1 = 0
});
ScalaJS.c.jl_Double$.prototype = new ScalaJS.h.O();
ScalaJS.c.jl_Double$.prototype.constructor = ScalaJS.c.jl_Double$;
/** @constructor */
ScalaJS.h.jl_Double$ = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_Double$.prototype = ScalaJS.c.jl_Double$.prototype;
ScalaJS.c.jl_Double$.prototype.init___ = (function() {
  ScalaJS.n.jl_Double = this;
  this.TYPE$1 = ScalaJS.d.D.getClassOf();
  this.POSITIVE$undINFINITY$1 = ScalaJS.uD(ScalaJS.g["Number"]["POSITIVE_INFINITY"]);
  this.NEGATIVE$undINFINITY$1 = ScalaJS.uD(ScalaJS.g["Number"]["NEGATIVE_INFINITY"]);
  this.NaN$1 = ScalaJS.uD(ScalaJS.g["Number"]["NaN"]);
  this.MAX$undVALUE$1 = ScalaJS.uD(ScalaJS.g["Number"]["MAX_VALUE"]);
  this.MIN$undNORMAL$1 = 0.0;
  this.MIN$undVALUE$1 = ScalaJS.uD(ScalaJS.g["Number"]["MIN_VALUE"]);
  this.MAX$undEXPONENT$1 = 1023;
  this.MIN$undEXPONENT$1 = -1022;
  this.SIZE$1 = 64;
  return this
});
ScalaJS.c.jl_Double$.prototype.isNaN__D__Z = (function(v) {
  return ScalaJS.uZ(ScalaJS.g["isNaN"](v))
});
ScalaJS.is.jl_Double$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_Double$)))
});
ScalaJS.as.jl_Double$ = (function(obj) {
  return ((ScalaJS.is.jl_Double$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.Double$"))
});
ScalaJS.isArrayOf.jl_Double$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Double$)))
});
ScalaJS.asArrayOf.jl_Double$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Double$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Double$;", depth))
});
ScalaJS.d.jl_Double$ = new ScalaJS.ClassTypeData({
  jl_Double$: 0
}, false, "java.lang.Double$", ScalaJS.d.O, {
  jl_Double$: 1,
  O: 1
});
ScalaJS.c.jl_Double$.prototype.$classData = ScalaJS.d.jl_Double$;
ScalaJS.n.jl_Double = (void 0);
ScalaJS.m.jl_Double = (function() {
  if ((!ScalaJS.n.jl_Double)) {
    ScalaJS.n.jl_Double = new ScalaJS.c.jl_Double$().init___()
  };
  return ScalaJS.n.jl_Double
});
/** @constructor */
ScalaJS.c.jl_Float$ = (function() {
  ScalaJS.c.O.call(this);
  this.TYPE$1 = null;
  this.POSITIVE$undINFINITY$1 = 0.0;
  this.NEGATIVE$undINFINITY$1 = 0.0;
  this.NaN$1 = 0.0;
  this.MAX$undVALUE$1 = 0.0;
  this.MIN$undNORMAL$1 = 0.0;
  this.MIN$undVALUE$1 = 0.0;
  this.MAX$undEXPONENT$1 = 0;
  this.MIN$undEXPONENT$1 = 0;
  this.SIZE$1 = 0;
  this.floatStrPat$1 = null
});
ScalaJS.c.jl_Float$.prototype = new ScalaJS.h.O();
ScalaJS.c.jl_Float$.prototype.constructor = ScalaJS.c.jl_Float$;
/** @constructor */
ScalaJS.h.jl_Float$ = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_Float$.prototype = ScalaJS.c.jl_Float$.prototype;
ScalaJS.c.jl_Float$.prototype.init___ = (function() {
  ScalaJS.n.jl_Float = this;
  this.TYPE$1 = ScalaJS.d.F.getClassOf();
  this.POSITIVE$undINFINITY$1 = ScalaJS.uD(ScalaJS.g["Number"]["POSITIVE_INFINITY"]);
  this.NEGATIVE$undINFINITY$1 = ScalaJS.uD(ScalaJS.g["Number"]["NEGATIVE_INFINITY"]);
  this.NaN$1 = ScalaJS.uD(ScalaJS.g["Number"]["NaN"]);
  this.MAX$undVALUE$1 = ScalaJS.uD(ScalaJS.g["Number"]["MAX_VALUE"]);
  this.MIN$undNORMAL$1 = 0.0;
  this.MIN$undVALUE$1 = ScalaJS.uD(ScalaJS.g["Number"]["MIN_VALUE"]);
  this.MAX$undEXPONENT$1 = 127;
  this.MIN$undEXPONENT$1 = -126;
  this.SIZE$1 = 32;
  this.floatStrPat$1 = new ScalaJS.g["RegExp"]("^[\\x00-\\x20]*[+-]?(NaN|Infinity|(\\d+\\.?\\d*|\\.\\d+)([eE][+-]?\\d+)?)[fFdD]?[\\x00-\\x20]*$");
  return this
});
ScalaJS.is.jl_Float$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_Float$)))
});
ScalaJS.as.jl_Float$ = (function(obj) {
  return ((ScalaJS.is.jl_Float$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.Float$"))
});
ScalaJS.isArrayOf.jl_Float$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Float$)))
});
ScalaJS.asArrayOf.jl_Float$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Float$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Float$;", depth))
});
ScalaJS.d.jl_Float$ = new ScalaJS.ClassTypeData({
  jl_Float$: 0
}, false, "java.lang.Float$", ScalaJS.d.O, {
  jl_Float$: 1,
  O: 1
});
ScalaJS.c.jl_Float$.prototype.$classData = ScalaJS.d.jl_Float$;
ScalaJS.n.jl_Float = (void 0);
ScalaJS.m.jl_Float = (function() {
  if ((!ScalaJS.n.jl_Float)) {
    ScalaJS.n.jl_Float = new ScalaJS.c.jl_Float$().init___()
  };
  return ScalaJS.n.jl_Float
});
/** @constructor */
ScalaJS.c.jl_Integer$ = (function() {
  ScalaJS.c.O.call(this);
  this.TYPE$1 = null;
  this.MIN$undVALUE$1 = 0;
  this.MAX$undVALUE$1 = 0;
  this.SIZE$1 = 0
});
ScalaJS.c.jl_Integer$.prototype = new ScalaJS.h.O();
ScalaJS.c.jl_Integer$.prototype.constructor = ScalaJS.c.jl_Integer$;
/** @constructor */
ScalaJS.h.jl_Integer$ = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_Integer$.prototype = ScalaJS.c.jl_Integer$.prototype;
ScalaJS.c.jl_Integer$.prototype.init___ = (function() {
  ScalaJS.n.jl_Integer = this;
  this.TYPE$1 = ScalaJS.d.I.getClassOf();
  this.MIN$undVALUE$1 = -2147483648;
  this.MAX$undVALUE$1 = 2147483647;
  this.SIZE$1 = 32;
  return this
});
ScalaJS.c.jl_Integer$.prototype.fail$1__p1__T__sr_Nothing$ = (function(s$1) {
  throw new ScalaJS.c.jl_NumberFormatException().init___T(new ScalaJS.c.s_StringContext().init___sc_Seq(ScalaJS.m.s_Predef().wrapRefArray__AO__scm_WrappedArray(ScalaJS.asArrayOf.O(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.T.getArrayOf(), ["For input string: \"", "\""]), 1))).s__sc_Seq__T(ScalaJS.m.s_Predef().genericWrapArray__O__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.O.getArrayOf(), [s$1]))))
});
ScalaJS.c.jl_Integer$.prototype.parseInt__T__I__I = (function(s, radix) {
  if ((s === null)) {
    var jsx$1 = true
  } else {
    var this$2 = new ScalaJS.c.sci_StringOps().init___T(s);
    var jsx$1 = (ScalaJS.m.sci_StringOps().length$extension__T__I(this$2.repr$1) === 0)
  };
  if (((jsx$1 || (radix < ScalaJS.m.jl_Character().MIN$undRADIX$1)) || (radix > ScalaJS.m.jl_Character().MAX$undRADIX$1))) {
    this.fail$1__p1__T__sr_Nothing$(s)
  } else {
    var i = (((ScalaJS.m.sci_StringOps().apply$extension__T__I__C(s, 0) === 45) || (ScalaJS.m.sci_StringOps().apply$extension__T__I__C(s, 0) === 43)) ? 1 : 0);
    var this$6 = new ScalaJS.c.sci_StringOps().init___T(s);
    if ((ScalaJS.m.sci_StringOps().length$extension__T__I(this$6.repr$1) <= i)) {
      this.fail$1__p1__T__sr_Nothing$(s)
    } else {
      while (true) {
        var jsx$2 = i;
        var this$8 = new ScalaJS.c.sci_StringOps().init___T(s);
        if ((jsx$2 < ScalaJS.m.sci_StringOps().length$extension__T__I(this$8.repr$1))) {
          if ((ScalaJS.m.jl_Character().digit__C__I__I(ScalaJS.m.sci_StringOps().apply$extension__T__I__C(s, i), radix) < 0)) {
            this.fail$1__p1__T__sr_Nothing$(s)
          };
          i = ((i + 1) | 0)
        } else {
          break
        }
      };
      var res = ScalaJS.uD(ScalaJS.g["parseInt"](s, radix));
      return (((ScalaJS.uZ(ScalaJS.g["isNaN"](res)) || (res > this.MAX$undVALUE$1)) || (res < this.MIN$undVALUE$1)) ? this.fail$1__p1__T__sr_Nothing$(s) : (res | 0))
    }
  }
});
ScalaJS.c.jl_Integer$.prototype.rotateLeft__I__I__I = (function(i, distance) {
  return ((i << distance) | ((i >>> ((32 - distance) | 0)) | 0))
});
ScalaJS.c.jl_Integer$.prototype.bitCount__I__I = (function(i) {
  var t1 = ((i - ((i >> 1) & 1431655765)) | 0);
  var t2 = (((t1 & 858993459) + ((t1 >> 2) & 858993459)) | 0);
  return (ScalaJS.imul((((t2 + (t2 >> 4)) | 0) & 252645135), 16843009) >> 24)
});
ScalaJS.c.jl_Integer$.prototype.reverseBytes__I__I = (function(i) {
  var byte3 = ((i >>> 24) | 0);
  var byte2 = (((i >>> 8) | 0) & 65280);
  var byte1 = ((i << 8) & 16711680);
  var byte0 = (i << 24);
  return (((byte0 | byte1) | byte2) | byte3)
});
ScalaJS.c.jl_Integer$.prototype.numberOfLeadingZeros__I__I = (function(i) {
  var x = i;
  x = (x | ((x >>> 1) | 0));
  x = (x | ((x >>> 2) | 0));
  x = (x | ((x >>> 4) | 0));
  x = (x | ((x >>> 8) | 0));
  x = (x | ((x >>> 16) | 0));
  return ((32 - this.bitCount__I__I(x)) | 0)
});
ScalaJS.c.jl_Integer$.prototype.toStringBase__p1__I__I__T = (function(i, base) {
  return ScalaJS.as.T((i >>> 0)["toString"](base))
});
ScalaJS.c.jl_Integer$.prototype.numberOfTrailingZeros__I__I = (function(i) {
  return this.bitCount__I__I((((i & (-i)) - 1) | 0))
});
ScalaJS.is.jl_Integer$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_Integer$)))
});
ScalaJS.as.jl_Integer$ = (function(obj) {
  return ((ScalaJS.is.jl_Integer$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.Integer$"))
});
ScalaJS.isArrayOf.jl_Integer$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Integer$)))
});
ScalaJS.asArrayOf.jl_Integer$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Integer$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Integer$;", depth))
});
ScalaJS.d.jl_Integer$ = new ScalaJS.ClassTypeData({
  jl_Integer$: 0
}, false, "java.lang.Integer$", ScalaJS.d.O, {
  jl_Integer$: 1,
  O: 1
});
ScalaJS.c.jl_Integer$.prototype.$classData = ScalaJS.d.jl_Integer$;
ScalaJS.n.jl_Integer = (void 0);
ScalaJS.m.jl_Integer = (function() {
  if ((!ScalaJS.n.jl_Integer)) {
    ScalaJS.n.jl_Integer = new ScalaJS.c.jl_Integer$().init___()
  };
  return ScalaJS.n.jl_Integer
});
/** @constructor */
ScalaJS.c.jl_Long$ = (function() {
  ScalaJS.c.O.call(this);
  this.TYPE$1 = null;
  this.MIN$undVALUE$1 = ScalaJS.m.sjsr_RuntimeLong().zero__sjsr_RuntimeLong();
  this.MAX$undVALUE$1 = ScalaJS.m.sjsr_RuntimeLong().zero__sjsr_RuntimeLong();
  this.SIZE$1 = 0
});
ScalaJS.c.jl_Long$.prototype = new ScalaJS.h.O();
ScalaJS.c.jl_Long$.prototype.constructor = ScalaJS.c.jl_Long$;
/** @constructor */
ScalaJS.h.jl_Long$ = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_Long$.prototype = ScalaJS.c.jl_Long$.prototype;
ScalaJS.c.jl_Long$.prototype.init___ = (function() {
  ScalaJS.n.jl_Long = this;
  this.TYPE$1 = ScalaJS.d.J.getClassOf();
  this.MIN$undVALUE$1 = (ScalaJS.m.sjsr_RuntimeLong(), new ScalaJS.c.sjsr_RuntimeLong().init___I__I__I(0, 0, 524288));
  this.MAX$undVALUE$1 = (ScalaJS.m.sjsr_RuntimeLong(), new ScalaJS.c.sjsr_RuntimeLong().init___I__I__I(4194303, 4194303, 524287));
  this.SIZE$1 = 64;
  return this
});
ScalaJS.c.jl_Long$.prototype.dropLZ__p1__T__T = (function(s) {
  var i = 0;
  while (((i < ((ScalaJS.i.sjsr_RuntimeString$class__length__sjsr_RuntimeString__I(s) - 1) | 0)) && (ScalaJS.i.sjsr_RuntimeString$class__charAt__sjsr_RuntimeString__I__C(s, i) === 48))) {
    i = ((i + 1) | 0)
  };
  return ScalaJS.i.sjsr_RuntimeString$class__substring__sjsr_RuntimeString__I__T(s, i)
});
ScalaJS.is.jl_Long$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_Long$)))
});
ScalaJS.as.jl_Long$ = (function(obj) {
  return ((ScalaJS.is.jl_Long$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.Long$"))
});
ScalaJS.isArrayOf.jl_Long$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Long$)))
});
ScalaJS.asArrayOf.jl_Long$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Long$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Long$;", depth))
});
ScalaJS.d.jl_Long$ = new ScalaJS.ClassTypeData({
  jl_Long$: 0
}, false, "java.lang.Long$", ScalaJS.d.O, {
  jl_Long$: 1,
  O: 1
});
ScalaJS.c.jl_Long$.prototype.$classData = ScalaJS.d.jl_Long$;
ScalaJS.n.jl_Long = (void 0);
ScalaJS.m.jl_Long = (function() {
  if ((!ScalaJS.n.jl_Long)) {
    ScalaJS.n.jl_Long = new ScalaJS.c.jl_Long$().init___()
  };
  return ScalaJS.n.jl_Long
});
/** @constructor */
ScalaJS.c.jl_Number = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.jl_Number.prototype = new ScalaJS.h.O();
ScalaJS.c.jl_Number.prototype.constructor = ScalaJS.c.jl_Number;
/** @constructor */
ScalaJS.h.jl_Number = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_Number.prototype = ScalaJS.c.jl_Number.prototype;
ScalaJS.is.jl_Number = (function(obj) {
  return (!(!(((obj && obj.$classData) && obj.$classData.ancestors.jl_Number) || (typeof(obj) === "number"))))
});
ScalaJS.as.jl_Number = (function(obj) {
  return ((ScalaJS.is.jl_Number(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.Number"))
});
ScalaJS.isArrayOf.jl_Number = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Number)))
});
ScalaJS.asArrayOf.jl_Number = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Number(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Number;", depth))
});
ScalaJS.d.jl_Number = new ScalaJS.ClassTypeData({
  jl_Number: 0
}, false, "java.lang.Number", ScalaJS.d.O, {
  jl_Number: 1,
  O: 1
}, ScalaJS.is.jl_Number);
ScalaJS.c.jl_Number.prototype.$classData = ScalaJS.d.jl_Number;
/** @constructor */
ScalaJS.c.jl_Short$ = (function() {
  ScalaJS.c.O.call(this);
  this.TYPE$1 = null;
  this.MIN$undVALUE$1 = 0;
  this.MAX$undVALUE$1 = 0;
  this.SIZE$1 = 0
});
ScalaJS.c.jl_Short$.prototype = new ScalaJS.h.O();
ScalaJS.c.jl_Short$.prototype.constructor = ScalaJS.c.jl_Short$;
/** @constructor */
ScalaJS.h.jl_Short$ = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_Short$.prototype = ScalaJS.c.jl_Short$.prototype;
ScalaJS.c.jl_Short$.prototype.init___ = (function() {
  ScalaJS.n.jl_Short = this;
  this.TYPE$1 = ScalaJS.d.S.getClassOf();
  this.MIN$undVALUE$1 = -32768;
  this.MAX$undVALUE$1 = 32767;
  this.SIZE$1 = 16;
  return this
});
ScalaJS.is.jl_Short$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_Short$)))
});
ScalaJS.as.jl_Short$ = (function(obj) {
  return ((ScalaJS.is.jl_Short$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.Short$"))
});
ScalaJS.isArrayOf.jl_Short$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Short$)))
});
ScalaJS.asArrayOf.jl_Short$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Short$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Short$;", depth))
});
ScalaJS.d.jl_Short$ = new ScalaJS.ClassTypeData({
  jl_Short$: 0
}, false, "java.lang.Short$", ScalaJS.d.O, {
  jl_Short$: 1,
  O: 1
});
ScalaJS.c.jl_Short$.prototype.$classData = ScalaJS.d.jl_Short$;
ScalaJS.n.jl_Short = (void 0);
ScalaJS.m.jl_Short = (function() {
  if ((!ScalaJS.n.jl_Short)) {
    ScalaJS.n.jl_Short = new ScalaJS.c.jl_Short$().init___()
  };
  return ScalaJS.n.jl_Short
});
/** @constructor */
ScalaJS.c.jl_StringBuilder = (function() {
  ScalaJS.c.O.call(this);
  this.content$1 = null
});
ScalaJS.c.jl_StringBuilder.prototype = new ScalaJS.h.O();
ScalaJS.c.jl_StringBuilder.prototype.constructor = ScalaJS.c.jl_StringBuilder;
/** @constructor */
ScalaJS.h.jl_StringBuilder = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_StringBuilder.prototype = ScalaJS.c.jl_StringBuilder.prototype;
ScalaJS.c.jl_StringBuilder.prototype.init___ = (function() {
  return (ScalaJS.c.jl_StringBuilder.prototype.init___T.call(this, ""), this)
});
ScalaJS.c.jl_StringBuilder.prototype.append__T__jl_StringBuilder = (function(s) {
  this.content$1 = (("" + this.content$1) + ((s === null) ? "null" : s));
  return this
});
ScalaJS.c.jl_StringBuilder.prototype.subSequence__I__I__jl_CharSequence = (function(start, end) {
  return this.substring__I__I__T(start, end)
});
ScalaJS.c.jl_StringBuilder.prototype.toString__T = (function() {
  return this.content$1
});
ScalaJS.c.jl_StringBuilder.prototype.append__jl_CharSequence__jl_Appendable = (function(csq) {
  return this.append__O__jl_StringBuilder(csq)
});
ScalaJS.c.jl_StringBuilder.prototype.append__O__jl_StringBuilder = (function(obj) {
  return ((obj === null) ? this.append__T__jl_StringBuilder(null) : this.append__T__jl_StringBuilder(ScalaJS.objectToString(obj)))
});
ScalaJS.c.jl_StringBuilder.prototype.init___I = (function(initialCapacity) {
  return (ScalaJS.c.jl_StringBuilder.prototype.init___T.call(this, ""), this)
});
ScalaJS.c.jl_StringBuilder.prototype.append__jl_CharSequence__I__I__jl_StringBuilder = (function(csq, start, end) {
  return ((csq === null) ? this.append__jl_CharSequence__I__I__jl_StringBuilder("null", start, end) : this.append__T__jl_StringBuilder(ScalaJS.objectToString(ScalaJS.charSequenceSubSequence(csq, start, end))))
});
ScalaJS.c.jl_StringBuilder.prototype.length__I = (function() {
  return ScalaJS.i.sjsr_RuntimeString$class__length__sjsr_RuntimeString__I(this.content$1)
});
ScalaJS.c.jl_StringBuilder.prototype.append__C__jl_StringBuilder = (function(c) {
  return this.append__T__jl_StringBuilder(ScalaJS.objectToString(ScalaJS.bC(c)))
});
ScalaJS.c.jl_StringBuilder.prototype.substring__I__I__T = (function(start, end) {
  return ScalaJS.i.sjsr_RuntimeString$class__substring__sjsr_RuntimeString__I__I__T(this.content$1, start, end)
});
ScalaJS.c.jl_StringBuilder.prototype.init___T = (function(content) {
  this.content$1 = content;
  return this
});
ScalaJS.c.jl_StringBuilder.prototype.append__C__jl_Appendable = (function(c) {
  return this.append__C__jl_StringBuilder(c)
});
ScalaJS.c.jl_StringBuilder.prototype.charAt__I__C = (function(index) {
  return ScalaJS.i.sjsr_RuntimeString$class__charAt__sjsr_RuntimeString__I__C(this.content$1, index)
});
ScalaJS.is.jl_StringBuilder = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_StringBuilder)))
});
ScalaJS.as.jl_StringBuilder = (function(obj) {
  return ((ScalaJS.is.jl_StringBuilder(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.StringBuilder"))
});
ScalaJS.isArrayOf.jl_StringBuilder = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_StringBuilder)))
});
ScalaJS.asArrayOf.jl_StringBuilder = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_StringBuilder(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.StringBuilder;", depth))
});
ScalaJS.d.jl_StringBuilder = new ScalaJS.ClassTypeData({
  jl_StringBuilder: 0
}, false, "java.lang.StringBuilder", ScalaJS.d.O, {
  jl_StringBuilder: 1,
  Ljava_io_Serializable: 1,
  jl_Appendable: 1,
  jl_CharSequence: 1,
  O: 1
});
ScalaJS.c.jl_StringBuilder.prototype.$classData = ScalaJS.d.jl_StringBuilder;
/** @constructor */
ScalaJS.c.jl_System$ = (function() {
  ScalaJS.c.O.call(this);
  this.out$1 = null;
  this.err$1 = null;
  this.in$1 = null;
  this.getHighPrecisionTime$1 = null
});
ScalaJS.c.jl_System$.prototype = new ScalaJS.h.O();
ScalaJS.c.jl_System$.prototype.constructor = ScalaJS.c.jl_System$;
/** @constructor */
ScalaJS.h.jl_System$ = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_System$.prototype = ScalaJS.c.jl_System$.prototype;
ScalaJS.c.jl_System$.prototype.init___ = (function() {
  ScalaJS.n.jl_System = this;
  this.out$1 = ScalaJS.m.jl_StandardOutPrintStream();
  this.err$1 = ScalaJS.m.jl_StandardErrPrintStream();
  this.in$1 = null;
  this.getHighPrecisionTime$1 = ((!ScalaJS.uZ((!ScalaJS.g["performance"]))) ? ((!ScalaJS.uZ((!ScalaJS.g["performance"]["now"]))) ? (function() {
    return ScalaJS.uD(ScalaJS.g["performance"]["now"]())
  }) : ((!ScalaJS.uZ((!ScalaJS.g["performance"]["webkitNow"]))) ? (function() {
    return ScalaJS.uD(ScalaJS.g["performance"]["webkitNow"]())
  }) : (function() {
    return ScalaJS.uD(new ScalaJS.g["Date"]()["getTime"]())
  }))) : (function() {
    return ScalaJS.uD(new ScalaJS.g["Date"]()["getTime"]())
  }));
  return this
});
ScalaJS.is.jl_System$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_System$)))
});
ScalaJS.as.jl_System$ = (function(obj) {
  return ((ScalaJS.is.jl_System$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.System$"))
});
ScalaJS.isArrayOf.jl_System$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_System$)))
});
ScalaJS.asArrayOf.jl_System$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_System$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.System$;", depth))
});
ScalaJS.d.jl_System$ = new ScalaJS.ClassTypeData({
  jl_System$: 0
}, false, "java.lang.System$", ScalaJS.d.O, {
  jl_System$: 1,
  O: 1
});
ScalaJS.c.jl_System$.prototype.$classData = ScalaJS.d.jl_System$;
ScalaJS.n.jl_System = (void 0);
ScalaJS.m.jl_System = (function() {
  if ((!ScalaJS.n.jl_System)) {
    ScalaJS.n.jl_System = new ScalaJS.c.jl_System$().init___()
  };
  return ScalaJS.n.jl_System
});
/** @constructor */
ScalaJS.c.jl_ThreadLocal = (function() {
  ScalaJS.c.O.call(this);
  this.hasValue$1 = false;
  this.i$1 = null;
  this.v$1 = null;
  this.m$1 = null
});
ScalaJS.c.jl_ThreadLocal.prototype = new ScalaJS.h.O();
ScalaJS.c.jl_ThreadLocal.prototype.constructor = ScalaJS.c.jl_ThreadLocal;
/** @constructor */
ScalaJS.h.jl_ThreadLocal = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_ThreadLocal.prototype = ScalaJS.c.jl_ThreadLocal.prototype;
ScalaJS.c.jl_ThreadLocal.prototype.init___ = (function() {
  this.hasValue$1 = false;
  this.m$1 = new ScalaJS.c.jl_ThreadLocal$ThreadLocalMap().init___();
  return this
});
ScalaJS.c.jl_ThreadLocal.prototype.get__O = (function() {
  if ((!this.hasValue$1)) {
    this.set__O__V(this.initialValue__O())
  };
  return this.v$1
});
ScalaJS.c.jl_ThreadLocal.prototype.set__O__V = (function(o) {
  this.v$1 = o;
  this.hasValue$1 = true
});
ScalaJS.is.jl_ThreadLocal = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_ThreadLocal)))
});
ScalaJS.as.jl_ThreadLocal = (function(obj) {
  return ((ScalaJS.is.jl_ThreadLocal(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.ThreadLocal"))
});
ScalaJS.isArrayOf.jl_ThreadLocal = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_ThreadLocal)))
});
ScalaJS.asArrayOf.jl_ThreadLocal = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_ThreadLocal(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.ThreadLocal;", depth))
});
ScalaJS.d.jl_ThreadLocal = new ScalaJS.ClassTypeData({
  jl_ThreadLocal: 0
}, false, "java.lang.ThreadLocal", ScalaJS.d.O, {
  jl_ThreadLocal: 1,
  O: 1
});
ScalaJS.c.jl_ThreadLocal.prototype.$classData = ScalaJS.d.jl_ThreadLocal;
/** @constructor */
ScalaJS.c.jl_ThreadLocal$ThreadLocalMap = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.jl_ThreadLocal$ThreadLocalMap.prototype = new ScalaJS.h.O();
ScalaJS.c.jl_ThreadLocal$ThreadLocalMap.prototype.constructor = ScalaJS.c.jl_ThreadLocal$ThreadLocalMap;
/** @constructor */
ScalaJS.h.jl_ThreadLocal$ThreadLocalMap = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_ThreadLocal$ThreadLocalMap.prototype = ScalaJS.c.jl_ThreadLocal$ThreadLocalMap.prototype;
ScalaJS.is.jl_ThreadLocal$ThreadLocalMap = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_ThreadLocal$ThreadLocalMap)))
});
ScalaJS.as.jl_ThreadLocal$ThreadLocalMap = (function(obj) {
  return ((ScalaJS.is.jl_ThreadLocal$ThreadLocalMap(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.ThreadLocal$ThreadLocalMap"))
});
ScalaJS.isArrayOf.jl_ThreadLocal$ThreadLocalMap = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_ThreadLocal$ThreadLocalMap)))
});
ScalaJS.asArrayOf.jl_ThreadLocal$ThreadLocalMap = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_ThreadLocal$ThreadLocalMap(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.ThreadLocal$ThreadLocalMap;", depth))
});
ScalaJS.d.jl_ThreadLocal$ThreadLocalMap = new ScalaJS.ClassTypeData({
  jl_ThreadLocal$ThreadLocalMap: 0
}, false, "java.lang.ThreadLocal$ThreadLocalMap", ScalaJS.d.O, {
  jl_ThreadLocal$ThreadLocalMap: 1,
  O: 1
});
ScalaJS.c.jl_ThreadLocal$ThreadLocalMap.prototype.$classData = ScalaJS.d.jl_ThreadLocal$ThreadLocalMap;
/** @constructor */
ScalaJS.c.jl_Throwable = (function() {
  ScalaJS.c.O.call(this);
  this.s$1 = null;
  this.e$1 = null;
  this.stackTrace$1 = null
});
ScalaJS.c.jl_Throwable.prototype = new ScalaJS.h.O();
ScalaJS.c.jl_Throwable.prototype.constructor = ScalaJS.c.jl_Throwable;
/** @constructor */
ScalaJS.h.jl_Throwable = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_Throwable.prototype = ScalaJS.c.jl_Throwable.prototype;
ScalaJS.c.jl_Throwable.prototype.init___ = (function() {
  return (ScalaJS.c.jl_Throwable.prototype.init___T__jl_Throwable.call(this, null, null), this)
});
ScalaJS.c.jl_Throwable.prototype.fillInStackTrace__jl_Throwable = (function() {
  var this$1 = ScalaJS.m.sjsr_StackTrace();
  this$1.captureState__jl_Throwable__sjs_js_Any__V(this, this$1.createException__p1__sjs_js_Any());
  return this
});
ScalaJS.c.jl_Throwable.prototype.getMessage__T = (function() {
  return this.s$1
});
ScalaJS.c.jl_Throwable.prototype.toString__T = (function() {
  var className = ScalaJS.objectGetClass(this).getName__T();
  var message = this.getMessage__T();
  return ((message === null) ? className : ((className + ": ") + message))
});
ScalaJS.c.jl_Throwable.prototype.init___T__jl_Throwable = (function(s, e) {
  this.s$1 = s;
  this.e$1 = e;
  this.fillInStackTrace__jl_Throwable();
  return this
});
ScalaJS.is.jl_Throwable = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_Throwable)))
});
ScalaJS.as.jl_Throwable = (function(obj) {
  return ((ScalaJS.is.jl_Throwable(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.Throwable"))
});
ScalaJS.isArrayOf.jl_Throwable = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Throwable)))
});
ScalaJS.asArrayOf.jl_Throwable = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Throwable(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Throwable;", depth))
});
ScalaJS.d.jl_Throwable = new ScalaJS.ClassTypeData({
  jl_Throwable: 0
}, false, "java.lang.Throwable", ScalaJS.d.O, {
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.jl_Throwable.prototype.$classData = ScalaJS.d.jl_Throwable;
/** @constructor */
ScalaJS.c.jl_Void$ = (function() {
  ScalaJS.c.O.call(this);
  this.TYPE$1 = null
});
ScalaJS.c.jl_Void$.prototype = new ScalaJS.h.O();
ScalaJS.c.jl_Void$.prototype.constructor = ScalaJS.c.jl_Void$;
/** @constructor */
ScalaJS.h.jl_Void$ = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_Void$.prototype = ScalaJS.c.jl_Void$.prototype;
ScalaJS.c.jl_Void$.prototype.init___ = (function() {
  ScalaJS.n.jl_Void = this;
  this.TYPE$1 = ScalaJS.d.V.getClassOf();
  return this
});
ScalaJS.is.jl_Void$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_Void$)))
});
ScalaJS.as.jl_Void$ = (function(obj) {
  return ((ScalaJS.is.jl_Void$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.Void$"))
});
ScalaJS.isArrayOf.jl_Void$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Void$)))
});
ScalaJS.asArrayOf.jl_Void$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Void$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Void$;", depth))
});
ScalaJS.d.jl_Void$ = new ScalaJS.ClassTypeData({
  jl_Void$: 0
}, false, "java.lang.Void$", ScalaJS.d.O, {
  jl_Void$: 1,
  O: 1
});
ScalaJS.c.jl_Void$.prototype.$classData = ScalaJS.d.jl_Void$;
ScalaJS.n.jl_Void = (void 0);
ScalaJS.m.jl_Void = (function() {
  if ((!ScalaJS.n.jl_Void)) {
    ScalaJS.n.jl_Void = new ScalaJS.c.jl_Void$().init___()
  };
  return ScalaJS.n.jl_Void
});
/** @constructor */
ScalaJS.c.jl_reflect_Array$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.jl_reflect_Array$.prototype = new ScalaJS.h.O();
ScalaJS.c.jl_reflect_Array$.prototype.constructor = ScalaJS.c.jl_reflect_Array$;
/** @constructor */
ScalaJS.h.jl_reflect_Array$ = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_reflect_Array$.prototype = ScalaJS.c.jl_reflect_Array$.prototype;
ScalaJS.c.jl_reflect_Array$.prototype.newInstance__jl_Class__I__O = (function(componentType, length) {
  var col = ScalaJS.m.s_Predef().wrapIntArray__AI__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.I.getArrayOf(), [length]));
  var result = new ScalaJS.g["Array"]();
  var i = 0;
  var len = col.length__I();
  while ((i < len)) {
    var x$2 = col.apply__I__O(i);
    ScalaJS.uI(result["push"](x$2));
    i = ((i + 1) | 0)
  };
  return componentType.newArrayOfThisClass__sjs_js_Array__O(result)
});
ScalaJS.is.jl_reflect_Array$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_reflect_Array$)))
});
ScalaJS.as.jl_reflect_Array$ = (function(obj) {
  return ((ScalaJS.is.jl_reflect_Array$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.reflect.Array$"))
});
ScalaJS.isArrayOf.jl_reflect_Array$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_reflect_Array$)))
});
ScalaJS.asArrayOf.jl_reflect_Array$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_reflect_Array$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.reflect.Array$;", depth))
});
ScalaJS.d.jl_reflect_Array$ = new ScalaJS.ClassTypeData({
  jl_reflect_Array$: 0
}, false, "java.lang.reflect.Array$", ScalaJS.d.O, {
  jl_reflect_Array$: 1,
  O: 1
});
ScalaJS.c.jl_reflect_Array$.prototype.$classData = ScalaJS.d.jl_reflect_Array$;
ScalaJS.n.jl_reflect_Array = (void 0);
ScalaJS.m.jl_reflect_Array = (function() {
  if ((!ScalaJS.n.jl_reflect_Array)) {
    ScalaJS.n.jl_reflect_Array = new ScalaJS.c.jl_reflect_Array$().init___()
  };
  return ScalaJS.n.jl_reflect_Array
});
/** @constructor */
ScalaJS.c.ju_Arrays$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.ju_Arrays$.prototype = new ScalaJS.h.O();
ScalaJS.c.ju_Arrays$.prototype.constructor = ScalaJS.c.ju_Arrays$;
/** @constructor */
ScalaJS.h.ju_Arrays$ = (function() {
  /*<skip>*/
});
ScalaJS.h.ju_Arrays$.prototype = ScalaJS.c.ju_Arrays$.prototype;
ScalaJS.c.ju_Arrays$.prototype.fill__AI__I__V = (function(a, value) {
  var i = 0;
  while ((i < a.u["length"])) {
    a.u[i] = value;
    i = ((i + 1) | 0)
  }
});
ScalaJS.is.ju_Arrays$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.ju_Arrays$)))
});
ScalaJS.as.ju_Arrays$ = (function(obj) {
  return ((ScalaJS.is.ju_Arrays$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.util.Arrays$"))
});
ScalaJS.isArrayOf.ju_Arrays$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.ju_Arrays$)))
});
ScalaJS.asArrayOf.ju_Arrays$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.ju_Arrays$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.util.Arrays$;", depth))
});
ScalaJS.d.ju_Arrays$ = new ScalaJS.ClassTypeData({
  ju_Arrays$: 0
}, false, "java.util.Arrays$", ScalaJS.d.O, {
  ju_Arrays$: 1,
  O: 1
});
ScalaJS.c.ju_Arrays$.prototype.$classData = ScalaJS.d.ju_Arrays$;
ScalaJS.n.ju_Arrays = (void 0);
ScalaJS.m.ju_Arrays = (function() {
  if ((!ScalaJS.n.ju_Arrays)) {
    ScalaJS.n.ju_Arrays = new ScalaJS.c.ju_Arrays$().init___()
  };
  return ScalaJS.n.ju_Arrays
});
ScalaJS.is.ju_Formattable = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.ju_Formattable)))
});
ScalaJS.as.ju_Formattable = (function(obj) {
  return ((ScalaJS.is.ju_Formattable(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.util.Formattable"))
});
ScalaJS.isArrayOf.ju_Formattable = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.ju_Formattable)))
});
ScalaJS.asArrayOf.ju_Formattable = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.ju_Formattable(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.util.Formattable;", depth))
});
ScalaJS.d.ju_Formattable = new ScalaJS.ClassTypeData({
  ju_Formattable: 0
}, true, "java.util.Formattable", (void 0), {
  ju_Formattable: 1,
  O: 1
});
/** @constructor */
ScalaJS.c.ju_FormattableFlags$ = (function() {
  ScalaJS.c.O.call(this);
  this.ALTERNATE$1 = 0;
  this.LEFT$undJUSTIFY$1 = 0;
  this.UPPERCASE$1 = 0
});
ScalaJS.c.ju_FormattableFlags$.prototype = new ScalaJS.h.O();
ScalaJS.c.ju_FormattableFlags$.prototype.constructor = ScalaJS.c.ju_FormattableFlags$;
/** @constructor */
ScalaJS.h.ju_FormattableFlags$ = (function() {
  /*<skip>*/
});
ScalaJS.h.ju_FormattableFlags$.prototype = ScalaJS.c.ju_FormattableFlags$.prototype;
ScalaJS.c.ju_FormattableFlags$.prototype.init___ = (function() {
  ScalaJS.n.ju_FormattableFlags = this;
  this.ALTERNATE$1 = 4;
  this.LEFT$undJUSTIFY$1 = 1;
  this.UPPERCASE$1 = 2;
  return this
});
ScalaJS.is.ju_FormattableFlags$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.ju_FormattableFlags$)))
});
ScalaJS.as.ju_FormattableFlags$ = (function(obj) {
  return ((ScalaJS.is.ju_FormattableFlags$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.util.FormattableFlags$"))
});
ScalaJS.isArrayOf.ju_FormattableFlags$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.ju_FormattableFlags$)))
});
ScalaJS.asArrayOf.ju_FormattableFlags$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.ju_FormattableFlags$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.util.FormattableFlags$;", depth))
});
ScalaJS.d.ju_FormattableFlags$ = new ScalaJS.ClassTypeData({
  ju_FormattableFlags$: 0
}, false, "java.util.FormattableFlags$", ScalaJS.d.O, {
  ju_FormattableFlags$: 1,
  O: 1
});
ScalaJS.c.ju_FormattableFlags$.prototype.$classData = ScalaJS.d.ju_FormattableFlags$;
ScalaJS.n.ju_FormattableFlags = (void 0);
ScalaJS.m.ju_FormattableFlags = (function() {
  if ((!ScalaJS.n.ju_FormattableFlags)) {
    ScalaJS.n.ju_FormattableFlags = new ScalaJS.c.ju_FormattableFlags$().init___()
  };
  return ScalaJS.n.ju_FormattableFlags
});
/** @constructor */
ScalaJS.c.ju_Formatter = (function() {
  ScalaJS.c.O.call(this);
  this.java$util$Formatter$$dest$1 = null;
  this.closed$1 = false;
  this.java$util$Formatter$$RegularChunk$1 = null;
  this.java$util$Formatter$$DoublePercent$1 = null;
  this.java$util$Formatter$$EOLChunk$1 = null;
  this.java$util$Formatter$$FormattedChunk$1 = null
});
ScalaJS.c.ju_Formatter.prototype = new ScalaJS.h.O();
ScalaJS.c.ju_Formatter.prototype.constructor = ScalaJS.c.ju_Formatter;
/** @constructor */
ScalaJS.h.ju_Formatter = (function() {
  /*<skip>*/
});
ScalaJS.h.ju_Formatter.prototype = ScalaJS.c.ju_Formatter.prototype;
ScalaJS.c.ju_Formatter.prototype.init___ = (function() {
  return (ScalaJS.c.ju_Formatter.prototype.init___jl_Appendable.call(this, new ScalaJS.c.jl_StringBuilder().init___()), this)
});
ScalaJS.c.ju_Formatter.prototype.toString__T = (function() {
  return ScalaJS.objectToString(this.out__jl_Appendable())
});
ScalaJS.c.ju_Formatter.prototype.init___jl_Appendable = (function(dest) {
  this.java$util$Formatter$$dest$1 = dest;
  this.closed$1 = false;
  this.java$util$Formatter$$RegularChunk$1 = new ScalaJS.c.ju_Formatter$RegExpExtractor().init___ju_Formatter__sjs_js_RegExp(this, new ScalaJS.g["RegExp"]("^[^\\x25]+"));
  this.java$util$Formatter$$DoublePercent$1 = new ScalaJS.c.ju_Formatter$RegExpExtractor().init___ju_Formatter__sjs_js_RegExp(this, new ScalaJS.g["RegExp"]("^\\x25{2}"));
  this.java$util$Formatter$$EOLChunk$1 = new ScalaJS.c.ju_Formatter$RegExpExtractor().init___ju_Formatter__sjs_js_RegExp(this, new ScalaJS.g["RegExp"]("^\\x25n"));
  this.java$util$Formatter$$FormattedChunk$1 = new ScalaJS.c.ju_Formatter$RegExpExtractor().init___ju_Formatter__sjs_js_RegExp(this, new ScalaJS.g["RegExp"]("^\\x25(?:([1-9]\\d*)\\$)?([-#+ 0,\\(<]*)(\\d*)(?:\\.(\\d+))?([A-Za-z])"));
  return this
});
ScalaJS.c.ju_Formatter.prototype.ifNotClosed__p1__F0__O = (function(body) {
  if (this.closed$1) {
    throw new ScalaJS.c.ju_FormatterClosedException().init___()
  } else {
    return body.apply__O()
  }
});
ScalaJS.c.ju_Formatter.prototype.out__jl_Appendable = (function() {
  return ScalaJS.as.jl_Appendable(this.ifNotClosed__p1__F0__O(new ScalaJS.c.sjsr_AnonFunction0().init___sjs_js_Function0((function(arg$outer) {
    return (function() {
      return arg$outer.java$util$Formatter$$dest$1
    })
  })(this))))
});
ScalaJS.c.ju_Formatter.prototype.format__T__AO__ju_Formatter = (function(format_in, args) {
  return ScalaJS.as.ju_Formatter(this.ifNotClosed__p1__F0__O(new ScalaJS.c.ju_Formatter$$anonfun$format$1().init___ju_Formatter__T__AO(this, format_in, args)))
});
ScalaJS.c.ju_Formatter.prototype.close__V = (function() {
  if ((!this.closed$1)) {
    var x1 = this.java$util$Formatter$$dest$1;
    if (ScalaJS.is.Ljava_io_Closeable(x1)) {
      ScalaJS.as.Ljava_io_Closeable(x1).close__V()
    }
  };
  this.closed$1 = true
});
ScalaJS.is.ju_Formatter = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.ju_Formatter)))
});
ScalaJS.as.ju_Formatter = (function(obj) {
  return ((ScalaJS.is.ju_Formatter(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.util.Formatter"))
});
ScalaJS.isArrayOf.ju_Formatter = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.ju_Formatter)))
});
ScalaJS.asArrayOf.ju_Formatter = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.ju_Formatter(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.util.Formatter;", depth))
});
ScalaJS.d.ju_Formatter = new ScalaJS.ClassTypeData({
  ju_Formatter: 0
}, false, "java.util.Formatter", ScalaJS.d.O, {
  ju_Formatter: 1,
  Ljava_io_Flushable: 1,
  Ljava_io_Closeable: 1,
  O: 1
});
ScalaJS.c.ju_Formatter.prototype.$classData = ScalaJS.d.ju_Formatter;
/** @constructor */
ScalaJS.c.ju_Formatter$RegExpExtractor = (function() {
  ScalaJS.c.O.call(this);
  this.regexp$1 = null;
  this.$$outer$f = null
});
ScalaJS.c.ju_Formatter$RegExpExtractor.prototype = new ScalaJS.h.O();
ScalaJS.c.ju_Formatter$RegExpExtractor.prototype.constructor = ScalaJS.c.ju_Formatter$RegExpExtractor;
/** @constructor */
ScalaJS.h.ju_Formatter$RegExpExtractor = (function() {
  /*<skip>*/
});
ScalaJS.h.ju_Formatter$RegExpExtractor.prototype = ScalaJS.c.ju_Formatter$RegExpExtractor.prototype;
ScalaJS.c.ju_Formatter$RegExpExtractor.prototype.init___ju_Formatter__sjs_js_RegExp = (function($$outer, regexp) {
  this.regexp$1 = regexp;
  if (($$outer === null)) {
    throw new ScalaJS.c.jl_NullPointerException().init___()
  } else {
    this.$$outer$f = $$outer
  };
  return this
});
ScalaJS.c.ju_Formatter$RegExpExtractor.prototype.unapply__T__s_Option = (function(str) {
  return ScalaJS.m.s_Option().apply__O__s_Option(this.regexp$1["exec"](str))
});
ScalaJS.is.ju_Formatter$RegExpExtractor = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.ju_Formatter$RegExpExtractor)))
});
ScalaJS.as.ju_Formatter$RegExpExtractor = (function(obj) {
  return ((ScalaJS.is.ju_Formatter$RegExpExtractor(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.util.Formatter$RegExpExtractor"))
});
ScalaJS.isArrayOf.ju_Formatter$RegExpExtractor = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.ju_Formatter$RegExpExtractor)))
});
ScalaJS.asArrayOf.ju_Formatter$RegExpExtractor = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.ju_Formatter$RegExpExtractor(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.util.Formatter$RegExpExtractor;", depth))
});
ScalaJS.d.ju_Formatter$RegExpExtractor = new ScalaJS.ClassTypeData({
  ju_Formatter$RegExpExtractor: 0
}, false, "java.util.Formatter$RegExpExtractor", ScalaJS.d.O, {
  ju_Formatter$RegExpExtractor: 1,
  O: 1
});
ScalaJS.c.ju_Formatter$RegExpExtractor.prototype.$classData = ScalaJS.d.ju_Formatter$RegExpExtractor;
/** @constructor */
ScalaJS.c.s_Console$ = (function() {
  ScalaJS.c.O.call(this);
  this.BLACK$1 = null;
  this.RED$1 = null;
  this.GREEN$1 = null;
  this.YELLOW$1 = null;
  this.BLUE$1 = null;
  this.MAGENTA$1 = null;
  this.CYAN$1 = null;
  this.WHITE$1 = null;
  this.BLACK$undB$1 = null;
  this.RED$undB$1 = null;
  this.GREEN$undB$1 = null;
  this.YELLOW$undB$1 = null;
  this.BLUE$undB$1 = null;
  this.MAGENTA$undB$1 = null;
  this.CYAN$undB$1 = null;
  this.WHITE$undB$1 = null;
  this.RESET$1 = null;
  this.BOLD$1 = null;
  this.UNDERLINED$1 = null;
  this.BLINK$1 = null;
  this.REVERSED$1 = null;
  this.INVISIBLE$1 = null;
  this.outVar$1 = null;
  this.errVar$1 = null;
  this.inVar$1 = null
});
ScalaJS.c.s_Console$.prototype = new ScalaJS.h.O();
ScalaJS.c.s_Console$.prototype.constructor = ScalaJS.c.s_Console$;
/** @constructor */
ScalaJS.h.s_Console$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_Console$.prototype = ScalaJS.c.s_Console$.prototype;
ScalaJS.c.s_Console$.prototype.init___ = (function() {
  ScalaJS.n.s_Console = this;
  this.outVar$1 = new ScalaJS.c.s_util_DynamicVariable().init___O(ScalaJS.m.jl_System().out$1);
  this.errVar$1 = new ScalaJS.c.s_util_DynamicVariable().init___O(ScalaJS.m.jl_System().err$1);
  this.inVar$1 = new ScalaJS.c.s_util_DynamicVariable().init___O(null);
  return this
});
ScalaJS.c.s_Console$.prototype.out__Ljava_io_PrintStream = (function() {
  var this$1 = this.outVar$1;
  return ScalaJS.as.Ljava_io_PrintStream(this$1.tl$1.get__O())
});
ScalaJS.is.s_Console$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_Console$)))
});
ScalaJS.as.s_Console$ = (function(obj) {
  return ((ScalaJS.is.s_Console$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.Console$"))
});
ScalaJS.isArrayOf.s_Console$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_Console$)))
});
ScalaJS.asArrayOf.s_Console$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_Console$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.Console$;", depth))
});
ScalaJS.d.s_Console$ = new ScalaJS.ClassTypeData({
  s_Console$: 0
}, false, "scala.Console$", ScalaJS.d.O, {
  s_Console$: 1,
  O: 1
});
ScalaJS.c.s_Console$.prototype.$classData = ScalaJS.d.s_Console$;
ScalaJS.n.s_Console = (void 0);
ScalaJS.m.s_Console = (function() {
  if ((!ScalaJS.n.s_Console)) {
    ScalaJS.n.s_Console = new ScalaJS.c.s_Console$().init___()
  };
  return ScalaJS.n.s_Console
});
/** @constructor */
ScalaJS.c.s_FallbackArrayBuilding = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_FallbackArrayBuilding.prototype = new ScalaJS.h.O();
ScalaJS.c.s_FallbackArrayBuilding.prototype.constructor = ScalaJS.c.s_FallbackArrayBuilding;
/** @constructor */
ScalaJS.h.s_FallbackArrayBuilding = (function() {
  /*<skip>*/
});
ScalaJS.h.s_FallbackArrayBuilding.prototype = ScalaJS.c.s_FallbackArrayBuilding.prototype;
ScalaJS.is.s_FallbackArrayBuilding = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_FallbackArrayBuilding)))
});
ScalaJS.as.s_FallbackArrayBuilding = (function(obj) {
  return ((ScalaJS.is.s_FallbackArrayBuilding(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.FallbackArrayBuilding"))
});
ScalaJS.isArrayOf.s_FallbackArrayBuilding = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_FallbackArrayBuilding)))
});
ScalaJS.asArrayOf.s_FallbackArrayBuilding = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_FallbackArrayBuilding(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.FallbackArrayBuilding;", depth))
});
ScalaJS.d.s_FallbackArrayBuilding = new ScalaJS.ClassTypeData({
  s_FallbackArrayBuilding: 0
}, false, "scala.FallbackArrayBuilding", ScalaJS.d.O, {
  s_FallbackArrayBuilding: 1,
  O: 1
});
ScalaJS.c.s_FallbackArrayBuilding.prototype.$classData = ScalaJS.d.s_FallbackArrayBuilding;
/** @constructor */
ScalaJS.c.s_LowPriorityImplicits = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_LowPriorityImplicits.prototype = new ScalaJS.h.O();
ScalaJS.c.s_LowPriorityImplicits.prototype.constructor = ScalaJS.c.s_LowPriorityImplicits;
/** @constructor */
ScalaJS.h.s_LowPriorityImplicits = (function() {
  /*<skip>*/
});
ScalaJS.h.s_LowPriorityImplicits.prototype = ScalaJS.c.s_LowPriorityImplicits.prototype;
ScalaJS.c.s_LowPriorityImplicits.prototype.wrapRefArray__AO__scm_WrappedArray = (function(xs) {
  if ((xs === null)) {
    return null
  } else if ((xs.u["length"] === 0)) {
    var this$1 = ScalaJS.m.scm_WrappedArray();
    return this$1.EmptyWrappedArray$1
  } else {
    return new ScalaJS.c.scm_WrappedArray$ofRef().init___AO(xs)
  }
});
ScalaJS.c.s_LowPriorityImplicits.prototype.wrapIntArray__AI__scm_WrappedArray = (function(xs) {
  return ((xs !== null) ? new ScalaJS.c.scm_WrappedArray$ofInt().init___AI(xs) : null)
});
ScalaJS.c.s_LowPriorityImplicits.prototype.genericWrapArray__O__scm_WrappedArray = (function(xs) {
  return ((xs === null) ? null : ScalaJS.m.scm_WrappedArray().make__O__scm_WrappedArray(xs))
});
ScalaJS.c.s_LowPriorityImplicits.prototype.wrapDoubleArray__AD__scm_WrappedArray = (function(xs) {
  return ((xs !== null) ? new ScalaJS.c.scm_WrappedArray$ofDouble().init___AD(xs) : null)
});
ScalaJS.is.s_LowPriorityImplicits = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_LowPriorityImplicits)))
});
ScalaJS.as.s_LowPriorityImplicits = (function(obj) {
  return ((ScalaJS.is.s_LowPriorityImplicits(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.LowPriorityImplicits"))
});
ScalaJS.isArrayOf.s_LowPriorityImplicits = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_LowPriorityImplicits)))
});
ScalaJS.asArrayOf.s_LowPriorityImplicits = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_LowPriorityImplicits(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.LowPriorityImplicits;", depth))
});
ScalaJS.d.s_LowPriorityImplicits = new ScalaJS.ClassTypeData({
  s_LowPriorityImplicits: 0
}, false, "scala.LowPriorityImplicits", ScalaJS.d.O, {
  s_LowPriorityImplicits: 1,
  O: 1
});
ScalaJS.c.s_LowPriorityImplicits.prototype.$classData = ScalaJS.d.s_LowPriorityImplicits;
/** @constructor */
ScalaJS.c.s_Option = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_Option.prototype = new ScalaJS.h.O();
ScalaJS.c.s_Option.prototype.constructor = ScalaJS.c.s_Option;
/** @constructor */
ScalaJS.h.s_Option = (function() {
  /*<skip>*/
});
ScalaJS.h.s_Option.prototype = ScalaJS.c.s_Option.prototype;
ScalaJS.c.s_Option.prototype.init___ = (function() {
  return this
});
ScalaJS.is.s_Option = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_Option)))
});
ScalaJS.as.s_Option = (function(obj) {
  return ((ScalaJS.is.s_Option(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.Option"))
});
ScalaJS.isArrayOf.s_Option = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_Option)))
});
ScalaJS.asArrayOf.s_Option = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_Option(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.Option;", depth))
});
ScalaJS.d.s_Option = new ScalaJS.ClassTypeData({
  s_Option: 0
}, false, "scala.Option", ScalaJS.d.O, {
  s_Option: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  s_Product: 1,
  s_Equals: 1,
  O: 1
});
ScalaJS.c.s_Option.prototype.$classData = ScalaJS.d.s_Option;
/** @constructor */
ScalaJS.c.s_Option$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_Option$.prototype = new ScalaJS.h.O();
ScalaJS.c.s_Option$.prototype.constructor = ScalaJS.c.s_Option$;
/** @constructor */
ScalaJS.h.s_Option$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_Option$.prototype = ScalaJS.c.s_Option$.prototype;
ScalaJS.c.s_Option$.prototype.apply__O__s_Option = (function(x) {
  return ((x === null) ? ScalaJS.m.s_None() : new ScalaJS.c.s_Some().init___O(x))
});
ScalaJS.is.s_Option$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_Option$)))
});
ScalaJS.as.s_Option$ = (function(obj) {
  return ((ScalaJS.is.s_Option$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.Option$"))
});
ScalaJS.isArrayOf.s_Option$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_Option$)))
});
ScalaJS.asArrayOf.s_Option$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_Option$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.Option$;", depth))
});
ScalaJS.d.s_Option$ = new ScalaJS.ClassTypeData({
  s_Option$: 0
}, false, "scala.Option$", ScalaJS.d.O, {
  s_Option$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_Option$.prototype.$classData = ScalaJS.d.s_Option$;
ScalaJS.n.s_Option = (void 0);
ScalaJS.m.s_Option = (function() {
  if ((!ScalaJS.n.s_Option)) {
    ScalaJS.n.s_Option = new ScalaJS.c.s_Option$().init___()
  };
  return ScalaJS.n.s_Option
});
/** @constructor */
ScalaJS.c.s_Predef$$anon$3 = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_Predef$$anon$3.prototype = new ScalaJS.h.O();
ScalaJS.c.s_Predef$$anon$3.prototype.constructor = ScalaJS.c.s_Predef$$anon$3;
/** @constructor */
ScalaJS.h.s_Predef$$anon$3 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_Predef$$anon$3.prototype = ScalaJS.c.s_Predef$$anon$3.prototype;
ScalaJS.c.s_Predef$$anon$3.prototype.apply__scm_Builder = (function() {
  return new ScalaJS.c.scm_StringBuilder().init___()
});
ScalaJS.c.s_Predef$$anon$3.prototype.apply__O__scm_Builder = (function(from) {
  return (ScalaJS.as.T(from), new ScalaJS.c.scm_StringBuilder().init___())
});
ScalaJS.is.s_Predef$$anon$3 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_Predef$$anon$3)))
});
ScalaJS.as.s_Predef$$anon$3 = (function(obj) {
  return ((ScalaJS.is.s_Predef$$anon$3(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.Predef$$anon$3"))
});
ScalaJS.isArrayOf.s_Predef$$anon$3 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_Predef$$anon$3)))
});
ScalaJS.asArrayOf.s_Predef$$anon$3 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_Predef$$anon$3(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.Predef$$anon$3;", depth))
});
ScalaJS.d.s_Predef$$anon$3 = new ScalaJS.ClassTypeData({
  s_Predef$$anon$3: 0
}, false, "scala.Predef$$anon$3", ScalaJS.d.O, {
  s_Predef$$anon$3: 1,
  scg_CanBuildFrom: 1,
  O: 1
});
ScalaJS.c.s_Predef$$anon$3.prototype.$classData = ScalaJS.d.s_Predef$$anon$3;
/** @constructor */
ScalaJS.c.s_Predef$$eq$colon$eq = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_Predef$$eq$colon$eq.prototype = new ScalaJS.h.O();
ScalaJS.c.s_Predef$$eq$colon$eq.prototype.constructor = ScalaJS.c.s_Predef$$eq$colon$eq;
/** @constructor */
ScalaJS.h.s_Predef$$eq$colon$eq = (function() {
  /*<skip>*/
});
ScalaJS.h.s_Predef$$eq$colon$eq.prototype = ScalaJS.c.s_Predef$$eq$colon$eq.prototype;
ScalaJS.c.s_Predef$$eq$colon$eq.prototype.init___ = (function() {
  return this
});
ScalaJS.c.s_Predef$$eq$colon$eq.prototype.toString__T = (function() {
  return "<function1>"
});
ScalaJS.is.s_Predef$$eq$colon$eq = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_Predef$$eq$colon$eq)))
});
ScalaJS.as.s_Predef$$eq$colon$eq = (function(obj) {
  return ((ScalaJS.is.s_Predef$$eq$colon$eq(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.Predef$$eq$colon$eq"))
});
ScalaJS.isArrayOf.s_Predef$$eq$colon$eq = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_Predef$$eq$colon$eq)))
});
ScalaJS.asArrayOf.s_Predef$$eq$colon$eq = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_Predef$$eq$colon$eq(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.Predef$$eq$colon$eq;", depth))
});
ScalaJS.d.s_Predef$$eq$colon$eq = new ScalaJS.ClassTypeData({
  s_Predef$$eq$colon$eq: 0
}, false, "scala.Predef$$eq$colon$eq", ScalaJS.d.O, {
  s_Predef$$eq$colon$eq: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  F1: 1,
  O: 1
});
ScalaJS.c.s_Predef$$eq$colon$eq.prototype.$classData = ScalaJS.d.s_Predef$$eq$colon$eq;
/** @constructor */
ScalaJS.c.s_Predef$$less$colon$less = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_Predef$$less$colon$less.prototype = new ScalaJS.h.O();
ScalaJS.c.s_Predef$$less$colon$less.prototype.constructor = ScalaJS.c.s_Predef$$less$colon$less;
/** @constructor */
ScalaJS.h.s_Predef$$less$colon$less = (function() {
  /*<skip>*/
});
ScalaJS.h.s_Predef$$less$colon$less.prototype = ScalaJS.c.s_Predef$$less$colon$less.prototype;
ScalaJS.c.s_Predef$$less$colon$less.prototype.init___ = (function() {
  return this
});
ScalaJS.c.s_Predef$$less$colon$less.prototype.toString__T = (function() {
  return "<function1>"
});
ScalaJS.is.s_Predef$$less$colon$less = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_Predef$$less$colon$less)))
});
ScalaJS.as.s_Predef$$less$colon$less = (function(obj) {
  return ((ScalaJS.is.s_Predef$$less$colon$less(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.Predef$$less$colon$less"))
});
ScalaJS.isArrayOf.s_Predef$$less$colon$less = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_Predef$$less$colon$less)))
});
ScalaJS.asArrayOf.s_Predef$$less$colon$less = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_Predef$$less$colon$less(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.Predef$$less$colon$less;", depth))
});
ScalaJS.d.s_Predef$$less$colon$less = new ScalaJS.ClassTypeData({
  s_Predef$$less$colon$less: 0
}, false, "scala.Predef$$less$colon$less", ScalaJS.d.O, {
  s_Predef$$less$colon$less: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  F1: 1,
  O: 1
});
ScalaJS.c.s_Predef$$less$colon$less.prototype.$classData = ScalaJS.d.s_Predef$$less$colon$less;
/** @constructor */
ScalaJS.c.s_StringContext = (function() {
  ScalaJS.c.O.call(this);
  this.parts$1 = null
});
ScalaJS.c.s_StringContext.prototype = new ScalaJS.h.O();
ScalaJS.c.s_StringContext.prototype.constructor = ScalaJS.c.s_StringContext;
/** @constructor */
ScalaJS.h.s_StringContext = (function() {
  /*<skip>*/
});
ScalaJS.h.s_StringContext.prototype = ScalaJS.c.s_StringContext.prototype;
ScalaJS.c.s_StringContext.prototype.productPrefix__T = (function() {
  return "StringContext"
});
ScalaJS.c.s_StringContext.prototype.productArity__I = (function() {
  return 1
});
ScalaJS.c.s_StringContext.prototype.equals__O__Z = (function(x$1) {
  if ((this === x$1)) {
    return true
  } else if (ScalaJS.is.s_StringContext(x$1)) {
    var StringContext$1 = ScalaJS.as.s_StringContext(x$1);
    return (ScalaJS.anyRefEqEq(this.parts$1, StringContext$1.parts$1) && StringContext$1.canEqual__O__Z(this))
  } else {
    return false
  }
});
ScalaJS.c.s_StringContext.prototype.productElement__I__O = (function(x$1) {
  switch (x$1) {
    case 0:
      {
        return this.parts$1;
        break
      };
    default:
      throw new ScalaJS.c.jl_IndexOutOfBoundsException().init___T(ScalaJS.objectToString(x$1));
  }
});
ScalaJS.c.s_StringContext.prototype.toString__T = (function() {
  return ScalaJS.m.sr_ScalaRunTime().$$undtoString__s_Product__T(this)
});
ScalaJS.c.s_StringContext.prototype.canEqual__O__Z = (function(x$1) {
  return ScalaJS.is.s_StringContext(x$1)
});
ScalaJS.c.s_StringContext.prototype.checkLengths__sc_Seq__V = (function(args) {
  if ((this.parts$1.length__I() !== ((args.length__I() + 1) | 0))) {
    throw new ScalaJS.c.jl_IllegalArgumentException().init___T("wrong number of arguments for interpolated string")
  }
});
ScalaJS.c.s_StringContext.prototype.s__sc_Seq__T = (function(args) {
  return this.standardInterpolator__F1__sc_Seq__T(new ScalaJS.c.sjsr_AnonFunction1().init___sjs_js_Function1((function(str$2) {
    var str = ScalaJS.as.T(str$2);
    return ScalaJS.m.s_StringContext().treatEscapes__T__T(str)
  })), args)
});
ScalaJS.c.s_StringContext.prototype.standardInterpolator__F1__sc_Seq__T = (function(process, args) {
  this.checkLengths__sc_Seq__V(args);
  var pi = this.parts$1.iterator__sc_Iterator();
  var ai = args.iterator__sc_Iterator();
  var bldr = new ScalaJS.c.jl_StringBuilder().init___T(ScalaJS.as.T(process.apply__O__O(pi.next__O())));
  while (ai.hasNext__Z()) {
    bldr.append__O__jl_StringBuilder(ai.next__O());
    bldr.append__T__jl_StringBuilder(ScalaJS.as.T(process.apply__O__O(pi.next__O())))
  };
  return bldr.content$1
});
ScalaJS.c.s_StringContext.prototype.init___sc_Seq = (function(parts) {
  this.parts$1 = parts;
  return this
});
ScalaJS.c.s_StringContext.prototype.hashCode__I = (function() {
  var this$2 = ScalaJS.m.s_util_hashing_MurmurHash3();
  return this$2.productHash__s_Product__I__I(this, -889275714)
});
ScalaJS.c.s_StringContext.prototype.productIterator__sc_Iterator = (function() {
  return new ScalaJS.c.sr_ScalaRunTime$$anon$1().init___s_Product(this)
});
ScalaJS.is.s_StringContext = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_StringContext)))
});
ScalaJS.as.s_StringContext = (function(obj) {
  return ((ScalaJS.is.s_StringContext(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.StringContext"))
});
ScalaJS.isArrayOf.s_StringContext = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_StringContext)))
});
ScalaJS.asArrayOf.s_StringContext = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_StringContext(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.StringContext;", depth))
});
ScalaJS.d.s_StringContext = new ScalaJS.ClassTypeData({
  s_StringContext: 0
}, false, "scala.StringContext", ScalaJS.d.O, {
  s_StringContext: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  s_Product: 1,
  s_Equals: 1,
  O: 1
});
ScalaJS.c.s_StringContext.prototype.$classData = ScalaJS.d.s_StringContext;
/** @constructor */
ScalaJS.c.s_StringContext$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_StringContext$.prototype = new ScalaJS.h.O();
ScalaJS.c.s_StringContext$.prototype.constructor = ScalaJS.c.s_StringContext$;
/** @constructor */
ScalaJS.h.s_StringContext$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_StringContext$.prototype = ScalaJS.c.s_StringContext$.prototype;
ScalaJS.c.s_StringContext$.prototype.output$1__p1__C__T__sr_ObjectRef__sr_IntRef__sr_IntRef__sr_IntRef__sr_VolatileByteRef__V = (function(ch, str$1, bldr$lzy$1, start$1, cur$1, idx$1, bitmap$0$1) {
  this.bldr$1__p1__sr_ObjectRef__sr_VolatileByteRef__jl_StringBuilder(bldr$lzy$1, bitmap$0$1).append__jl_CharSequence__I__I__jl_StringBuilder(str$1, start$1.elem$1, cur$1.elem$1);
  this.bldr$1__p1__sr_ObjectRef__sr_VolatileByteRef__jl_StringBuilder(bldr$lzy$1, bitmap$0$1).append__C__jl_StringBuilder(ch);
  start$1.elem$1 = idx$1.elem$1
});
ScalaJS.c.s_StringContext$.prototype.treatEscapes__T__T = (function(str) {
  var bldr$lzy = new ScalaJS.c.sr_ObjectRef().init___O(null);
  var bitmap$0 = new ScalaJS.c.sr_VolatileByteRef().init___B(0);
  var len = ScalaJS.i.sjsr_RuntimeString$class__length__sjsr_RuntimeString__I(str);
  var start = new ScalaJS.c.sr_IntRef().init___I(0);
  var cur = new ScalaJS.c.sr_IntRef().init___I(0);
  var idx = new ScalaJS.c.sr_IntRef().init___I(0);
  while ((idx.elem$1 < len)) {
    cur.elem$1 = idx.elem$1;
    if ((ScalaJS.m.sci_StringOps().apply$extension__T__I__C(str, idx.elem$1) === 92)) {
      idx.elem$1 = ((idx.elem$1 + 1) | 0);
      if ((idx.elem$1 >= len)) {
        throw new ScalaJS.c.s_StringContext$InvalidEscapeException().init___T__I(str, cur.elem$1)
      };
      if (((48 <= ScalaJS.m.sci_StringOps().apply$extension__T__I__C(str, idx.elem$1)) && (ScalaJS.m.sci_StringOps().apply$extension__T__I__C(str, idx.elem$1) <= 55))) {
        var leadch = ScalaJS.m.sci_StringOps().apply$extension__T__I__C(str, idx.elem$1);
        var oct = ((leadch - 48) | 0);
        idx.elem$1 = ((idx.elem$1 + 1) | 0);
        if ((((idx.elem$1 < len) && (48 <= ScalaJS.m.sci_StringOps().apply$extension__T__I__C(str, idx.elem$1))) && (ScalaJS.m.sci_StringOps().apply$extension__T__I__C(str, idx.elem$1) <= 55))) {
          oct = ((((ScalaJS.imul(oct, 8) + ScalaJS.m.sci_StringOps().apply$extension__T__I__C(str, idx.elem$1)) | 0) - 48) | 0);
          idx.elem$1 = ((idx.elem$1 + 1) | 0);
          if (((((idx.elem$1 < len) && (leadch <= 51)) && (48 <= ScalaJS.m.sci_StringOps().apply$extension__T__I__C(str, idx.elem$1))) && (ScalaJS.m.sci_StringOps().apply$extension__T__I__C(str, idx.elem$1) <= 55))) {
            oct = ((((ScalaJS.imul(oct, 8) + ScalaJS.m.sci_StringOps().apply$extension__T__I__C(str, idx.elem$1)) | 0) - 48) | 0);
            idx.elem$1 = ((idx.elem$1 + 1) | 0)
          }
        };
        this.output$1__p1__C__T__sr_ObjectRef__sr_IntRef__sr_IntRef__sr_IntRef__sr_VolatileByteRef__V((oct & 65535), str, bldr$lzy, start, cur, idx, bitmap$0)
      } else {
        var ch = ScalaJS.m.sci_StringOps().apply$extension__T__I__C(str, idx.elem$1);
        idx.elem$1 = ((idx.elem$1 + 1) | 0);
        switch (ch) {
          case 98:
            {
              var jsx$1 = 8;
              break
            };
          case 116:
            {
              var jsx$1 = 9;
              break
            };
          case 110:
            {
              var jsx$1 = 10;
              break
            };
          case 102:
            {
              var jsx$1 = 12;
              break
            };
          case 114:
            {
              var jsx$1 = 13;
              break
            };
          case 34:
            {
              var jsx$1 = 34;
              break
            };
          case 39:
            {
              var jsx$1 = 39;
              break
            };
          case 92:
            {
              var jsx$1 = 92;
              break
            };
          default:
            {
              var jsx$1;
              throw new ScalaJS.c.s_StringContext$InvalidEscapeException().init___T__I(str, cur.elem$1)
            };
        };
        this.output$1__p1__C__T__sr_ObjectRef__sr_IntRef__sr_IntRef__sr_IntRef__sr_VolatileByteRef__V(jsx$1, str, bldr$lzy, start, cur, idx, bitmap$0)
      }
    } else {
      idx.elem$1 = ((idx.elem$1 + 1) | 0)
    }
  };
  if ((start.elem$1 === 0)) {
    return str
  } else {
    var this$12 = this.bldr$1__p1__sr_ObjectRef__sr_VolatileByteRef__jl_StringBuilder(bldr$lzy, bitmap$0).append__jl_CharSequence__I__I__jl_StringBuilder(str, start.elem$1, idx.elem$1);
    return this$12.content$1
  }
});
ScalaJS.c.s_StringContext$.prototype.bldr$lzycompute$1__p1__sr_ObjectRef__sr_VolatileByteRef__jl_StringBuilder = (function(bldr$lzy$1, bitmap$0$1) {
  if (((bitmap$0$1.elem$1 & 1) === 0)) {
    bldr$lzy$1.elem$1 = new ScalaJS.c.jl_StringBuilder().init___();
    bitmap$0$1.elem$1 = (bitmap$0$1.elem$1 | 1)
  };
  return ScalaJS.as.jl_StringBuilder(bldr$lzy$1.elem$1)
});
ScalaJS.c.s_StringContext$.prototype.bldr$1__p1__sr_ObjectRef__sr_VolatileByteRef__jl_StringBuilder = (function(bldr$lzy$1, bitmap$0$1) {
  return (((bitmap$0$1.elem$1 & 1) === 0) ? this.bldr$lzycompute$1__p1__sr_ObjectRef__sr_VolatileByteRef__jl_StringBuilder(bldr$lzy$1, bitmap$0$1) : ScalaJS.as.jl_StringBuilder(bldr$lzy$1.elem$1))
});
ScalaJS.is.s_StringContext$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_StringContext$)))
});
ScalaJS.as.s_StringContext$ = (function(obj) {
  return ((ScalaJS.is.s_StringContext$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.StringContext$"))
});
ScalaJS.isArrayOf.s_StringContext$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_StringContext$)))
});
ScalaJS.asArrayOf.s_StringContext$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_StringContext$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.StringContext$;", depth))
});
ScalaJS.d.s_StringContext$ = new ScalaJS.ClassTypeData({
  s_StringContext$: 0
}, false, "scala.StringContext$", ScalaJS.d.O, {
  s_StringContext$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_StringContext$.prototype.$classData = ScalaJS.d.s_StringContext$;
ScalaJS.n.s_StringContext = (void 0);
ScalaJS.m.s_StringContext = (function() {
  if ((!ScalaJS.n.s_StringContext)) {
    ScalaJS.n.s_StringContext = new ScalaJS.c.s_StringContext$().init___()
  };
  return ScalaJS.n.s_StringContext
});
/** @constructor */
ScalaJS.c.s_math_Equiv$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_math_Equiv$.prototype = new ScalaJS.h.O();
ScalaJS.c.s_math_Equiv$.prototype.constructor = ScalaJS.c.s_math_Equiv$;
/** @constructor */
ScalaJS.h.s_math_Equiv$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_math_Equiv$.prototype = ScalaJS.c.s_math_Equiv$.prototype;
ScalaJS.c.s_math_Equiv$.prototype.init___ = (function() {
  ScalaJS.n.s_math_Equiv = this;
  return this
});
ScalaJS.is.s_math_Equiv$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_math_Equiv$)))
});
ScalaJS.as.s_math_Equiv$ = (function(obj) {
  return ((ScalaJS.is.s_math_Equiv$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.math.Equiv$"))
});
ScalaJS.isArrayOf.s_math_Equiv$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_math_Equiv$)))
});
ScalaJS.asArrayOf.s_math_Equiv$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_math_Equiv$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.math.Equiv$;", depth))
});
ScalaJS.d.s_math_Equiv$ = new ScalaJS.ClassTypeData({
  s_math_Equiv$: 0
}, false, "scala.math.Equiv$", ScalaJS.d.O, {
  s_math_Equiv$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  s_math_LowPriorityEquiv: 1,
  O: 1
});
ScalaJS.c.s_math_Equiv$.prototype.$classData = ScalaJS.d.s_math_Equiv$;
ScalaJS.n.s_math_Equiv = (void 0);
ScalaJS.m.s_math_Equiv = (function() {
  if ((!ScalaJS.n.s_math_Equiv)) {
    ScalaJS.n.s_math_Equiv = new ScalaJS.c.s_math_Equiv$().init___()
  };
  return ScalaJS.n.s_math_Equiv
});
/** @constructor */
ScalaJS.c.s_math_Numeric$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_math_Numeric$.prototype = new ScalaJS.h.O();
ScalaJS.c.s_math_Numeric$.prototype.constructor = ScalaJS.c.s_math_Numeric$;
/** @constructor */
ScalaJS.h.s_math_Numeric$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_math_Numeric$.prototype = ScalaJS.c.s_math_Numeric$.prototype;
ScalaJS.is.s_math_Numeric$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_math_Numeric$)))
});
ScalaJS.as.s_math_Numeric$ = (function(obj) {
  return ((ScalaJS.is.s_math_Numeric$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.math.Numeric$"))
});
ScalaJS.isArrayOf.s_math_Numeric$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_math_Numeric$)))
});
ScalaJS.asArrayOf.s_math_Numeric$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_math_Numeric$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.math.Numeric$;", depth))
});
ScalaJS.d.s_math_Numeric$ = new ScalaJS.ClassTypeData({
  s_math_Numeric$: 0
}, false, "scala.math.Numeric$", ScalaJS.d.O, {
  s_math_Numeric$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_math_Numeric$.prototype.$classData = ScalaJS.d.s_math_Numeric$;
ScalaJS.n.s_math_Numeric = (void 0);
ScalaJS.m.s_math_Numeric = (function() {
  if ((!ScalaJS.n.s_math_Numeric)) {
    ScalaJS.n.s_math_Numeric = new ScalaJS.c.s_math_Numeric$().init___()
  };
  return ScalaJS.n.s_math_Numeric
});
/** @constructor */
ScalaJS.c.s_math_Ordered$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_math_Ordered$.prototype = new ScalaJS.h.O();
ScalaJS.c.s_math_Ordered$.prototype.constructor = ScalaJS.c.s_math_Ordered$;
/** @constructor */
ScalaJS.h.s_math_Ordered$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_math_Ordered$.prototype = ScalaJS.c.s_math_Ordered$.prototype;
ScalaJS.is.s_math_Ordered$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_math_Ordered$)))
});
ScalaJS.as.s_math_Ordered$ = (function(obj) {
  return ((ScalaJS.is.s_math_Ordered$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.math.Ordered$"))
});
ScalaJS.isArrayOf.s_math_Ordered$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_math_Ordered$)))
});
ScalaJS.asArrayOf.s_math_Ordered$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_math_Ordered$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.math.Ordered$;", depth))
});
ScalaJS.d.s_math_Ordered$ = new ScalaJS.ClassTypeData({
  s_math_Ordered$: 0
}, false, "scala.math.Ordered$", ScalaJS.d.O, {
  s_math_Ordered$: 1,
  O: 1
});
ScalaJS.c.s_math_Ordered$.prototype.$classData = ScalaJS.d.s_math_Ordered$;
ScalaJS.n.s_math_Ordered = (void 0);
ScalaJS.m.s_math_Ordered = (function() {
  if ((!ScalaJS.n.s_math_Ordered)) {
    ScalaJS.n.s_math_Ordered = new ScalaJS.c.s_math_Ordered$().init___()
  };
  return ScalaJS.n.s_math_Ordered
});
/** @constructor */
ScalaJS.c.s_math_Ordering$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_math_Ordering$.prototype = new ScalaJS.h.O();
ScalaJS.c.s_math_Ordering$.prototype.constructor = ScalaJS.c.s_math_Ordering$;
/** @constructor */
ScalaJS.h.s_math_Ordering$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_math_Ordering$.prototype = ScalaJS.c.s_math_Ordering$.prototype;
ScalaJS.c.s_math_Ordering$.prototype.init___ = (function() {
  ScalaJS.n.s_math_Ordering = this;
  return this
});
ScalaJS.is.s_math_Ordering$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_math_Ordering$)))
});
ScalaJS.as.s_math_Ordering$ = (function(obj) {
  return ((ScalaJS.is.s_math_Ordering$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.math.Ordering$"))
});
ScalaJS.isArrayOf.s_math_Ordering$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_math_Ordering$)))
});
ScalaJS.asArrayOf.s_math_Ordering$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_math_Ordering$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.math.Ordering$;", depth))
});
ScalaJS.d.s_math_Ordering$ = new ScalaJS.ClassTypeData({
  s_math_Ordering$: 0
}, false, "scala.math.Ordering$", ScalaJS.d.O, {
  s_math_Ordering$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  s_math_LowPriorityOrderingImplicits: 1,
  O: 1
});
ScalaJS.c.s_math_Ordering$.prototype.$classData = ScalaJS.d.s_math_Ordering$;
ScalaJS.n.s_math_Ordering = (void 0);
ScalaJS.m.s_math_Ordering = (function() {
  if ((!ScalaJS.n.s_math_Ordering)) {
    ScalaJS.n.s_math_Ordering = new ScalaJS.c.s_math_Ordering$().init___()
  };
  return ScalaJS.n.s_math_Ordering
});
/** @constructor */
ScalaJS.c.s_package$ = (function() {
  ScalaJS.c.O.call(this);
  this.AnyRef$1 = null;
  this.Traversable$1 = null;
  this.Iterable$1 = null;
  this.Seq$1 = null;
  this.IndexedSeq$1 = null;
  this.Iterator$1 = null;
  this.List$1 = null;
  this.Nil$1 = null;
  this.$$colon$colon$1 = null;
  this.$$plus$colon$1 = null;
  this.$$colon$plus$1 = null;
  this.Stream$1 = null;
  this.$$hash$colon$colon$1 = null;
  this.Vector$1 = null;
  this.StringBuilder$1 = null;
  this.Range$1 = null;
  this.BigDecimal$1 = null;
  this.BigInt$1 = null;
  this.Equiv$1 = null;
  this.Numeric$1 = null;
  this.Ordered$1 = null;
  this.Ordering$1 = null;
  this.Either$1 = null;
  this.Left$1 = null;
  this.Right$1 = null;
  this.bitmap$0$1 = 0
});
ScalaJS.c.s_package$.prototype = new ScalaJS.h.O();
ScalaJS.c.s_package$.prototype.constructor = ScalaJS.c.s_package$;
/** @constructor */
ScalaJS.h.s_package$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_package$.prototype = ScalaJS.c.s_package$.prototype;
ScalaJS.c.s_package$.prototype.init___ = (function() {
  ScalaJS.n.s_package = this;
  this.AnyRef$1 = new ScalaJS.c.s_package$$anon$1().init___();
  this.Traversable$1 = ScalaJS.m.sc_Traversable();
  this.Iterable$1 = ScalaJS.m.sc_Iterable();
  this.Seq$1 = ScalaJS.m.sc_Seq();
  this.IndexedSeq$1 = ScalaJS.m.sc_IndexedSeq();
  this.Iterator$1 = ScalaJS.m.sc_Iterator();
  this.List$1 = ScalaJS.m.sci_List();
  this.Nil$1 = ScalaJS.m.sci_Nil();
  this.$$colon$colon$1 = ScalaJS.m.sci_$colon$colon();
  this.$$plus$colon$1 = ScalaJS.m.sc_$plus$colon();
  this.$$colon$plus$1 = ScalaJS.m.sc_$colon$plus();
  this.Stream$1 = ScalaJS.m.sci_Stream();
  this.$$hash$colon$colon$1 = ScalaJS.m.sci_Stream$$hash$colon$colon();
  this.Vector$1 = ScalaJS.m.sci_Vector();
  this.StringBuilder$1 = ScalaJS.m.scm_StringBuilder();
  this.Range$1 = ScalaJS.m.sci_Range();
  this.Equiv$1 = ScalaJS.m.s_math_Equiv();
  this.Numeric$1 = ScalaJS.m.s_math_Numeric();
  this.Ordered$1 = ScalaJS.m.s_math_Ordered();
  this.Ordering$1 = ScalaJS.m.s_math_Ordering();
  this.Either$1 = ScalaJS.m.s_util_Either();
  this.Left$1 = ScalaJS.m.s_util_Left();
  this.Right$1 = ScalaJS.m.s_util_Right();
  return this
});
ScalaJS.is.s_package$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_package$)))
});
ScalaJS.as.s_package$ = (function(obj) {
  return ((ScalaJS.is.s_package$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.package$"))
});
ScalaJS.isArrayOf.s_package$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_package$)))
});
ScalaJS.asArrayOf.s_package$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_package$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.package$;", depth))
});
ScalaJS.d.s_package$ = new ScalaJS.ClassTypeData({
  s_package$: 0
}, false, "scala.package$", ScalaJS.d.O, {
  s_package$: 1,
  O: 1
});
ScalaJS.c.s_package$.prototype.$classData = ScalaJS.d.s_package$;
ScalaJS.n.s_package = (void 0);
ScalaJS.m.s_package = (function() {
  if ((!ScalaJS.n.s_package)) {
    ScalaJS.n.s_package = new ScalaJS.c.s_package$().init___()
  };
  return ScalaJS.n.s_package
});
/** @constructor */
ScalaJS.c.s_package$$anon$1 = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_package$$anon$1.prototype = new ScalaJS.h.O();
ScalaJS.c.s_package$$anon$1.prototype.constructor = ScalaJS.c.s_package$$anon$1;
/** @constructor */
ScalaJS.h.s_package$$anon$1 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_package$$anon$1.prototype = ScalaJS.c.s_package$$anon$1.prototype;
ScalaJS.c.s_package$$anon$1.prototype.toString__T = (function() {
  return "object AnyRef"
});
ScalaJS.is.s_package$$anon$1 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_package$$anon$1)))
});
ScalaJS.as.s_package$$anon$1 = (function(obj) {
  return ((ScalaJS.is.s_package$$anon$1(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.package$$anon$1"))
});
ScalaJS.isArrayOf.s_package$$anon$1 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_package$$anon$1)))
});
ScalaJS.asArrayOf.s_package$$anon$1 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_package$$anon$1(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.package$$anon$1;", depth))
});
ScalaJS.d.s_package$$anon$1 = new ScalaJS.ClassTypeData({
  s_package$$anon$1: 0
}, false, "scala.package$$anon$1", ScalaJS.d.O, {
  s_package$$anon$1: 1,
  s_Specializable: 1,
  s_SpecializableCompanion: 1,
  O: 1
});
ScalaJS.c.s_package$$anon$1.prototype.$classData = ScalaJS.d.s_package$$anon$1;
/** @constructor */
ScalaJS.c.s_reflect_AnyValManifest = (function() {
  ScalaJS.c.O.call(this);
  this.toString$1 = null;
  this.hashCode$1 = 0
});
ScalaJS.c.s_reflect_AnyValManifest.prototype = new ScalaJS.h.O();
ScalaJS.c.s_reflect_AnyValManifest.prototype.constructor = ScalaJS.c.s_reflect_AnyValManifest;
/** @constructor */
ScalaJS.h.s_reflect_AnyValManifest = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_AnyValManifest.prototype = ScalaJS.c.s_reflect_AnyValManifest.prototype;
ScalaJS.c.s_reflect_AnyValManifest.prototype.equals__O__Z = (function(that) {
  return (this === that)
});
ScalaJS.c.s_reflect_AnyValManifest.prototype.toString__T = (function() {
  return this.toString$1
});
ScalaJS.c.s_reflect_AnyValManifest.prototype.init___T = (function(toString) {
  this.toString$1 = toString;
  this.hashCode$1 = (ScalaJS.m.jl_System(), 42);
  return this
});
ScalaJS.c.s_reflect_AnyValManifest.prototype.hashCode__I = (function() {
  return this.hashCode$1
});
ScalaJS.is.s_reflect_AnyValManifest = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_AnyValManifest)))
});
ScalaJS.as.s_reflect_AnyValManifest = (function(obj) {
  return ((ScalaJS.is.s_reflect_AnyValManifest(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.AnyValManifest"))
});
ScalaJS.isArrayOf.s_reflect_AnyValManifest = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_AnyValManifest)))
});
ScalaJS.asArrayOf.s_reflect_AnyValManifest = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_AnyValManifest(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.AnyValManifest;", depth))
});
ScalaJS.d.s_reflect_AnyValManifest = new ScalaJS.ClassTypeData({
  s_reflect_AnyValManifest: 0
}, false, "scala.reflect.AnyValManifest", ScalaJS.d.O, {
  s_reflect_AnyValManifest: 1,
  s_reflect_Manifest: 1,
  s_reflect_ClassTag: 1,
  s_Equals: 1,
  s_reflect_ClassManifestDeprecatedApis: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_AnyValManifest.prototype.$classData = ScalaJS.d.s_reflect_AnyValManifest;
/** @constructor */
ScalaJS.c.s_reflect_ClassManifestFactory$ = (function() {
  ScalaJS.c.O.call(this);
  this.Byte$1 = null;
  this.Short$1 = null;
  this.Char$1 = null;
  this.Int$1 = null;
  this.Long$1 = null;
  this.Float$1 = null;
  this.Double$1 = null;
  this.Boolean$1 = null;
  this.Unit$1 = null;
  this.Any$1 = null;
  this.Object$1 = null;
  this.AnyVal$1 = null;
  this.Nothing$1 = null;
  this.Null$1 = null
});
ScalaJS.c.s_reflect_ClassManifestFactory$.prototype = new ScalaJS.h.O();
ScalaJS.c.s_reflect_ClassManifestFactory$.prototype.constructor = ScalaJS.c.s_reflect_ClassManifestFactory$;
/** @constructor */
ScalaJS.h.s_reflect_ClassManifestFactory$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ClassManifestFactory$.prototype = ScalaJS.c.s_reflect_ClassManifestFactory$.prototype;
ScalaJS.c.s_reflect_ClassManifestFactory$.prototype.init___ = (function() {
  ScalaJS.n.s_reflect_ClassManifestFactory = this;
  this.Byte$1 = ScalaJS.m.s_reflect_ManifestFactory().Byte$1;
  this.Short$1 = ScalaJS.m.s_reflect_ManifestFactory().Short$1;
  this.Char$1 = ScalaJS.m.s_reflect_ManifestFactory().Char$1;
  this.Int$1 = ScalaJS.m.s_reflect_ManifestFactory().Int$1;
  this.Long$1 = ScalaJS.m.s_reflect_ManifestFactory().Long$1;
  this.Float$1 = ScalaJS.m.s_reflect_ManifestFactory().Float$1;
  this.Double$1 = ScalaJS.m.s_reflect_ManifestFactory().Double$1;
  this.Boolean$1 = ScalaJS.m.s_reflect_ManifestFactory().Boolean$1;
  this.Unit$1 = ScalaJS.m.s_reflect_ManifestFactory().Unit$1;
  this.Any$1 = ScalaJS.m.s_reflect_ManifestFactory().Any$1;
  this.Object$1 = ScalaJS.m.s_reflect_ManifestFactory().Object$1;
  this.AnyVal$1 = ScalaJS.m.s_reflect_ManifestFactory().AnyVal$1;
  this.Nothing$1 = ScalaJS.m.s_reflect_ManifestFactory().Nothing$1;
  this.Null$1 = ScalaJS.m.s_reflect_ManifestFactory().Null$1;
  return this
});
ScalaJS.is.s_reflect_ClassManifestFactory$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ClassManifestFactory$)))
});
ScalaJS.as.s_reflect_ClassManifestFactory$ = (function(obj) {
  return ((ScalaJS.is.s_reflect_ClassManifestFactory$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ClassManifestFactory$"))
});
ScalaJS.isArrayOf.s_reflect_ClassManifestFactory$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ClassManifestFactory$)))
});
ScalaJS.asArrayOf.s_reflect_ClassManifestFactory$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ClassManifestFactory$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ClassManifestFactory$;", depth))
});
ScalaJS.d.s_reflect_ClassManifestFactory$ = new ScalaJS.ClassTypeData({
  s_reflect_ClassManifestFactory$: 0
}, false, "scala.reflect.ClassManifestFactory$", ScalaJS.d.O, {
  s_reflect_ClassManifestFactory$: 1,
  O: 1
});
ScalaJS.c.s_reflect_ClassManifestFactory$.prototype.$classData = ScalaJS.d.s_reflect_ClassManifestFactory$;
ScalaJS.n.s_reflect_ClassManifestFactory = (void 0);
ScalaJS.m.s_reflect_ClassManifestFactory = (function() {
  if ((!ScalaJS.n.s_reflect_ClassManifestFactory)) {
    ScalaJS.n.s_reflect_ClassManifestFactory = new ScalaJS.c.s_reflect_ClassManifestFactory$().init___()
  };
  return ScalaJS.n.s_reflect_ClassManifestFactory
});
ScalaJS.is.s_reflect_ClassTag = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ClassTag)))
});
ScalaJS.as.s_reflect_ClassTag = (function(obj) {
  return ((ScalaJS.is.s_reflect_ClassTag(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ClassTag"))
});
ScalaJS.isArrayOf.s_reflect_ClassTag = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ClassTag)))
});
ScalaJS.asArrayOf.s_reflect_ClassTag = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ClassTag(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ClassTag;", depth))
});
ScalaJS.d.s_reflect_ClassTag = new ScalaJS.ClassTypeData({
  s_reflect_ClassTag: 0
}, true, "scala.reflect.ClassTag", (void 0), {
  s_reflect_ClassTag: 1,
  s_Equals: 1,
  s_reflect_ClassManifestDeprecatedApis: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
/** @constructor */
ScalaJS.c.s_reflect_ClassTag$ = (function() {
  ScalaJS.c.O.call(this);
  this.ObjectTYPE$1 = null;
  this.NothingTYPE$1 = null;
  this.NullTYPE$1 = null;
  this.Byte$1 = null;
  this.Short$1 = null;
  this.Char$1 = null;
  this.Int$1 = null;
  this.Long$1 = null;
  this.Float$1 = null;
  this.Double$1 = null;
  this.Boolean$1 = null;
  this.Unit$1 = null;
  this.Any$1 = null;
  this.Object$1 = null;
  this.AnyVal$1 = null;
  this.AnyRef$1 = null;
  this.Nothing$1 = null;
  this.Null$1 = null
});
ScalaJS.c.s_reflect_ClassTag$.prototype = new ScalaJS.h.O();
ScalaJS.c.s_reflect_ClassTag$.prototype.constructor = ScalaJS.c.s_reflect_ClassTag$;
/** @constructor */
ScalaJS.h.s_reflect_ClassTag$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ClassTag$.prototype = ScalaJS.c.s_reflect_ClassTag$.prototype;
ScalaJS.c.s_reflect_ClassTag$.prototype.init___ = (function() {
  ScalaJS.n.s_reflect_ClassTag = this;
  this.ObjectTYPE$1 = ScalaJS.d.O.getClassOf();
  this.NothingTYPE$1 = ScalaJS.d.sr_Nothing$.getClassOf();
  this.NullTYPE$1 = ScalaJS.d.sr_Null$.getClassOf();
  this.Byte$1 = ScalaJS.m.s_reflect_package().Manifest$1.Byte$1;
  this.Short$1 = ScalaJS.m.s_reflect_package().Manifest$1.Short$1;
  this.Char$1 = ScalaJS.m.s_reflect_package().Manifest$1.Char$1;
  this.Int$1 = ScalaJS.m.s_reflect_package().Manifest$1.Int$1;
  this.Long$1 = ScalaJS.m.s_reflect_package().Manifest$1.Long$1;
  this.Float$1 = ScalaJS.m.s_reflect_package().Manifest$1.Float$1;
  this.Double$1 = ScalaJS.m.s_reflect_package().Manifest$1.Double$1;
  this.Boolean$1 = ScalaJS.m.s_reflect_package().Manifest$1.Boolean$1;
  this.Unit$1 = ScalaJS.m.s_reflect_package().Manifest$1.Unit$1;
  this.Any$1 = ScalaJS.m.s_reflect_package().Manifest$1.Any$1;
  this.Object$1 = ScalaJS.m.s_reflect_package().Manifest$1.Object$1;
  this.AnyVal$1 = ScalaJS.m.s_reflect_package().Manifest$1.AnyVal$1;
  this.AnyRef$1 = ScalaJS.m.s_reflect_package().Manifest$1.AnyRef$1;
  this.Nothing$1 = ScalaJS.m.s_reflect_package().Manifest$1.Nothing$1;
  this.Null$1 = ScalaJS.m.s_reflect_package().Manifest$1.Null$1;
  return this
});
ScalaJS.c.s_reflect_ClassTag$.prototype.apply__jl_Class__s_reflect_ClassTag = (function(runtimeClass1) {
  return (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Byte().TYPE$1, runtimeClass1) ? ScalaJS.m.s_reflect_ClassTag().Byte$1 : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Short().TYPE$1, runtimeClass1) ? ScalaJS.m.s_reflect_ClassTag().Short$1 : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Character().TYPE$1, runtimeClass1) ? ScalaJS.m.s_reflect_ClassTag().Char$1 : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Integer().TYPE$1, runtimeClass1) ? ScalaJS.m.s_reflect_ClassTag().Int$1 : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Long().TYPE$1, runtimeClass1) ? ScalaJS.m.s_reflect_ClassTag().Long$1 : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Float().TYPE$1, runtimeClass1) ? ScalaJS.m.s_reflect_ClassTag().Float$1 : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Double().TYPE$1, runtimeClass1) ? ScalaJS.m.s_reflect_ClassTag().Double$1 : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Boolean().TYPE$1, runtimeClass1) ? ScalaJS.m.s_reflect_ClassTag().Boolean$1 : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Void().TYPE$1, runtimeClass1) ? ScalaJS.m.s_reflect_ClassTag().Unit$1 : (ScalaJS.anyRefEqEq(this.ObjectTYPE$1, runtimeClass1) ? ScalaJS.m.s_reflect_ClassTag().Object$1 : (ScalaJS.anyRefEqEq(this.NothingTYPE$1, runtimeClass1) ? ScalaJS.m.s_reflect_ClassTag().Nothing$1 : (ScalaJS.anyRefEqEq(this.NullTYPE$1, runtimeClass1) ? ScalaJS.m.s_reflect_ClassTag().Null$1 : new ScalaJS.c.s_reflect_ClassTag$$anon$1().init___jl_Class(runtimeClass1)))))))))))))
});
ScalaJS.is.s_reflect_ClassTag$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ClassTag$)))
});
ScalaJS.as.s_reflect_ClassTag$ = (function(obj) {
  return ((ScalaJS.is.s_reflect_ClassTag$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ClassTag$"))
});
ScalaJS.isArrayOf.s_reflect_ClassTag$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ClassTag$)))
});
ScalaJS.asArrayOf.s_reflect_ClassTag$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ClassTag$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ClassTag$;", depth))
});
ScalaJS.d.s_reflect_ClassTag$ = new ScalaJS.ClassTypeData({
  s_reflect_ClassTag$: 0
}, false, "scala.reflect.ClassTag$", ScalaJS.d.O, {
  s_reflect_ClassTag$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_ClassTag$.prototype.$classData = ScalaJS.d.s_reflect_ClassTag$;
ScalaJS.n.s_reflect_ClassTag = (void 0);
ScalaJS.m.s_reflect_ClassTag = (function() {
  if ((!ScalaJS.n.s_reflect_ClassTag)) {
    ScalaJS.n.s_reflect_ClassTag = new ScalaJS.c.s_reflect_ClassTag$().init___()
  };
  return ScalaJS.n.s_reflect_ClassTag
});
/** @constructor */
ScalaJS.c.s_reflect_ClassTag$$anon$1 = (function() {
  ScalaJS.c.O.call(this);
  this.runtimeClass1$1$1 = null
});
ScalaJS.c.s_reflect_ClassTag$$anon$1.prototype = new ScalaJS.h.O();
ScalaJS.c.s_reflect_ClassTag$$anon$1.prototype.constructor = ScalaJS.c.s_reflect_ClassTag$$anon$1;
/** @constructor */
ScalaJS.h.s_reflect_ClassTag$$anon$1 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ClassTag$$anon$1.prototype = ScalaJS.c.s_reflect_ClassTag$$anon$1.prototype;
ScalaJS.c.s_reflect_ClassTag$$anon$1.prototype.newArray__I__O = (function(len) {
  return ScalaJS.i.s_reflect_ClassTag$class__newArray__s_reflect_ClassTag__I__O(this, len)
});
ScalaJS.c.s_reflect_ClassTag$$anon$1.prototype.equals__O__Z = (function(x) {
  return ScalaJS.i.s_reflect_ClassTag$class__equals__s_reflect_ClassTag__O__Z(this, x)
});
ScalaJS.c.s_reflect_ClassTag$$anon$1.prototype.toString__T = (function() {
  return ScalaJS.i.s_reflect_ClassTag$class__prettyprint$1__s_reflect_ClassTag__jl_Class__T(this, this.runtimeClass1$1$1)
});
ScalaJS.c.s_reflect_ClassTag$$anon$1.prototype.runtimeClass__jl_Class = (function() {
  return this.runtimeClass1$1$1
});
ScalaJS.c.s_reflect_ClassTag$$anon$1.prototype.init___jl_Class = (function(runtimeClass1$1) {
  this.runtimeClass1$1$1 = runtimeClass1$1;
  return this
});
ScalaJS.c.s_reflect_ClassTag$$anon$1.prototype.hashCode__I = (function() {
  return ScalaJS.m.sr_ScalaRunTime().hash__O__I(this.runtimeClass1$1$1)
});
ScalaJS.is.s_reflect_ClassTag$$anon$1 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ClassTag$$anon$1)))
});
ScalaJS.as.s_reflect_ClassTag$$anon$1 = (function(obj) {
  return ((ScalaJS.is.s_reflect_ClassTag$$anon$1(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ClassTag$$anon$1"))
});
ScalaJS.isArrayOf.s_reflect_ClassTag$$anon$1 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ClassTag$$anon$1)))
});
ScalaJS.asArrayOf.s_reflect_ClassTag$$anon$1 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ClassTag$$anon$1(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ClassTag$$anon$1;", depth))
});
ScalaJS.d.s_reflect_ClassTag$$anon$1 = new ScalaJS.ClassTypeData({
  s_reflect_ClassTag$$anon$1: 0
}, false, "scala.reflect.ClassTag$$anon$1", ScalaJS.d.O, {
  s_reflect_ClassTag$$anon$1: 1,
  s_reflect_ClassTag: 1,
  s_Equals: 1,
  s_reflect_ClassManifestDeprecatedApis: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_ClassTag$$anon$1.prototype.$classData = ScalaJS.d.s_reflect_ClassTag$$anon$1;
/** @constructor */
ScalaJS.c.s_reflect_ManifestFactory$ = (function() {
  ScalaJS.c.O.call(this);
  this.Byte$1 = null;
  this.Short$1 = null;
  this.Char$1 = null;
  this.Int$1 = null;
  this.Long$1 = null;
  this.Float$1 = null;
  this.Double$1 = null;
  this.Boolean$1 = null;
  this.Unit$1 = null;
  this.scala$reflect$ManifestFactory$$ObjectTYPE$1 = null;
  this.scala$reflect$ManifestFactory$$NothingTYPE$1 = null;
  this.scala$reflect$ManifestFactory$$NullTYPE$1 = null;
  this.Any$1 = null;
  this.Object$1 = null;
  this.AnyRef$1 = null;
  this.AnyVal$1 = null;
  this.Null$1 = null;
  this.Nothing$1 = null
});
ScalaJS.c.s_reflect_ManifestFactory$.prototype = new ScalaJS.h.O();
ScalaJS.c.s_reflect_ManifestFactory$.prototype.constructor = ScalaJS.c.s_reflect_ManifestFactory$;
/** @constructor */
ScalaJS.h.s_reflect_ManifestFactory$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ManifestFactory$.prototype = ScalaJS.c.s_reflect_ManifestFactory$.prototype;
ScalaJS.c.s_reflect_ManifestFactory$.prototype.init___ = (function() {
  ScalaJS.n.s_reflect_ManifestFactory = this;
  this.Byte$1 = new ScalaJS.c.s_reflect_ManifestFactory$$anon$6().init___();
  this.Short$1 = new ScalaJS.c.s_reflect_ManifestFactory$$anon$7().init___();
  this.Char$1 = new ScalaJS.c.s_reflect_ManifestFactory$$anon$8().init___();
  this.Int$1 = new ScalaJS.c.s_reflect_ManifestFactory$$anon$9().init___();
  this.Long$1 = new ScalaJS.c.s_reflect_ManifestFactory$$anon$10().init___();
  this.Float$1 = new ScalaJS.c.s_reflect_ManifestFactory$$anon$11().init___();
  this.Double$1 = new ScalaJS.c.s_reflect_ManifestFactory$$anon$12().init___();
  this.Boolean$1 = new ScalaJS.c.s_reflect_ManifestFactory$$anon$13().init___();
  this.Unit$1 = new ScalaJS.c.s_reflect_ManifestFactory$$anon$14().init___();
  this.scala$reflect$ManifestFactory$$ObjectTYPE$1 = ScalaJS.d.O.getClassOf();
  this.scala$reflect$ManifestFactory$$NothingTYPE$1 = ScalaJS.d.sr_Nothing$.getClassOf();
  this.scala$reflect$ManifestFactory$$NullTYPE$1 = ScalaJS.d.sr_Null$.getClassOf();
  this.Any$1 = new ScalaJS.c.s_reflect_ManifestFactory$$anon$1().init___();
  this.Object$1 = new ScalaJS.c.s_reflect_ManifestFactory$$anon$2().init___();
  this.AnyRef$1 = this.Object$1;
  this.AnyVal$1 = new ScalaJS.c.s_reflect_ManifestFactory$$anon$3().init___();
  this.Null$1 = new ScalaJS.c.s_reflect_ManifestFactory$$anon$4().init___();
  this.Nothing$1 = new ScalaJS.c.s_reflect_ManifestFactory$$anon$5().init___();
  return this
});
ScalaJS.is.s_reflect_ManifestFactory$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ManifestFactory$)))
});
ScalaJS.as.s_reflect_ManifestFactory$ = (function(obj) {
  return ((ScalaJS.is.s_reflect_ManifestFactory$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ManifestFactory$"))
});
ScalaJS.isArrayOf.s_reflect_ManifestFactory$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ManifestFactory$)))
});
ScalaJS.asArrayOf.s_reflect_ManifestFactory$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ManifestFactory$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ManifestFactory$;", depth))
});
ScalaJS.d.s_reflect_ManifestFactory$ = new ScalaJS.ClassTypeData({
  s_reflect_ManifestFactory$: 0
}, false, "scala.reflect.ManifestFactory$", ScalaJS.d.O, {
  s_reflect_ManifestFactory$: 1,
  O: 1
});
ScalaJS.c.s_reflect_ManifestFactory$.prototype.$classData = ScalaJS.d.s_reflect_ManifestFactory$;
ScalaJS.n.s_reflect_ManifestFactory = (void 0);
ScalaJS.m.s_reflect_ManifestFactory = (function() {
  if ((!ScalaJS.n.s_reflect_ManifestFactory)) {
    ScalaJS.n.s_reflect_ManifestFactory = new ScalaJS.c.s_reflect_ManifestFactory$().init___()
  };
  return ScalaJS.n.s_reflect_ManifestFactory
});
/** @constructor */
ScalaJS.c.s_reflect_ManifestFactory$ClassTypeManifest = (function() {
  ScalaJS.c.O.call(this);
  this.prefix$1 = null;
  this.runtimeClass$1 = null;
  this.typeArguments$1 = null
});
ScalaJS.c.s_reflect_ManifestFactory$ClassTypeManifest.prototype = new ScalaJS.h.O();
ScalaJS.c.s_reflect_ManifestFactory$ClassTypeManifest.prototype.constructor = ScalaJS.c.s_reflect_ManifestFactory$ClassTypeManifest;
/** @constructor */
ScalaJS.h.s_reflect_ManifestFactory$ClassTypeManifest = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ManifestFactory$ClassTypeManifest.prototype = ScalaJS.c.s_reflect_ManifestFactory$ClassTypeManifest.prototype;
ScalaJS.c.s_reflect_ManifestFactory$ClassTypeManifest.prototype.runtimeClass__jl_Class = (function() {
  return this.runtimeClass$1
});
ScalaJS.c.s_reflect_ManifestFactory$ClassTypeManifest.prototype.init___s_Option__jl_Class__sci_List = (function(prefix, runtimeClass, typeArguments) {
  this.prefix$1 = prefix;
  this.runtimeClass$1 = runtimeClass;
  this.typeArguments$1 = typeArguments;
  return this
});
ScalaJS.is.s_reflect_ManifestFactory$ClassTypeManifest = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ManifestFactory$ClassTypeManifest)))
});
ScalaJS.as.s_reflect_ManifestFactory$ClassTypeManifest = (function(obj) {
  return ((ScalaJS.is.s_reflect_ManifestFactory$ClassTypeManifest(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ManifestFactory$ClassTypeManifest"))
});
ScalaJS.isArrayOf.s_reflect_ManifestFactory$ClassTypeManifest = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ManifestFactory$ClassTypeManifest)))
});
ScalaJS.asArrayOf.s_reflect_ManifestFactory$ClassTypeManifest = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ManifestFactory$ClassTypeManifest(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ManifestFactory$ClassTypeManifest;", depth))
});
ScalaJS.d.s_reflect_ManifestFactory$ClassTypeManifest = new ScalaJS.ClassTypeData({
  s_reflect_ManifestFactory$ClassTypeManifest: 0
}, false, "scala.reflect.ManifestFactory$ClassTypeManifest", ScalaJS.d.O, {
  s_reflect_ManifestFactory$ClassTypeManifest: 1,
  s_reflect_Manifest: 1,
  s_reflect_ClassTag: 1,
  s_Equals: 1,
  s_reflect_ClassManifestDeprecatedApis: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_ManifestFactory$ClassTypeManifest.prototype.$classData = ScalaJS.d.s_reflect_ManifestFactory$ClassTypeManifest;
/** @constructor */
ScalaJS.c.s_reflect_NoManifest$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_reflect_NoManifest$.prototype = new ScalaJS.h.O();
ScalaJS.c.s_reflect_NoManifest$.prototype.constructor = ScalaJS.c.s_reflect_NoManifest$;
/** @constructor */
ScalaJS.h.s_reflect_NoManifest$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_NoManifest$.prototype = ScalaJS.c.s_reflect_NoManifest$.prototype;
ScalaJS.c.s_reflect_NoManifest$.prototype.toString__T = (function() {
  return "<?>"
});
ScalaJS.is.s_reflect_NoManifest$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_NoManifest$)))
});
ScalaJS.as.s_reflect_NoManifest$ = (function(obj) {
  return ((ScalaJS.is.s_reflect_NoManifest$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.NoManifest$"))
});
ScalaJS.isArrayOf.s_reflect_NoManifest$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_NoManifest$)))
});
ScalaJS.asArrayOf.s_reflect_NoManifest$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_NoManifest$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.NoManifest$;", depth))
});
ScalaJS.d.s_reflect_NoManifest$ = new ScalaJS.ClassTypeData({
  s_reflect_NoManifest$: 0
}, false, "scala.reflect.NoManifest$", ScalaJS.d.O, {
  s_reflect_NoManifest$: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_NoManifest$.prototype.$classData = ScalaJS.d.s_reflect_NoManifest$;
ScalaJS.n.s_reflect_NoManifest = (void 0);
ScalaJS.m.s_reflect_NoManifest = (function() {
  if ((!ScalaJS.n.s_reflect_NoManifest)) {
    ScalaJS.n.s_reflect_NoManifest = new ScalaJS.c.s_reflect_NoManifest$().init___()
  };
  return ScalaJS.n.s_reflect_NoManifest
});
/** @constructor */
ScalaJS.c.s_reflect_package$ = (function() {
  ScalaJS.c.O.call(this);
  this.ClassManifest$1 = null;
  this.Manifest$1 = null
});
ScalaJS.c.s_reflect_package$.prototype = new ScalaJS.h.O();
ScalaJS.c.s_reflect_package$.prototype.constructor = ScalaJS.c.s_reflect_package$;
/** @constructor */
ScalaJS.h.s_reflect_package$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_package$.prototype = ScalaJS.c.s_reflect_package$.prototype;
ScalaJS.c.s_reflect_package$.prototype.init___ = (function() {
  ScalaJS.n.s_reflect_package = this;
  this.ClassManifest$1 = ScalaJS.m.s_reflect_ClassManifestFactory();
  this.Manifest$1 = ScalaJS.m.s_reflect_ManifestFactory();
  return this
});
ScalaJS.is.s_reflect_package$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_package$)))
});
ScalaJS.as.s_reflect_package$ = (function(obj) {
  return ((ScalaJS.is.s_reflect_package$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.package$"))
});
ScalaJS.isArrayOf.s_reflect_package$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_package$)))
});
ScalaJS.asArrayOf.s_reflect_package$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_package$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.package$;", depth))
});
ScalaJS.d.s_reflect_package$ = new ScalaJS.ClassTypeData({
  s_reflect_package$: 0
}, false, "scala.reflect.package$", ScalaJS.d.O, {
  s_reflect_package$: 1,
  O: 1
});
ScalaJS.c.s_reflect_package$.prototype.$classData = ScalaJS.d.s_reflect_package$;
ScalaJS.n.s_reflect_package = (void 0);
ScalaJS.m.s_reflect_package = (function() {
  if ((!ScalaJS.n.s_reflect_package)) {
    ScalaJS.n.s_reflect_package = new ScalaJS.c.s_reflect_package$().init___()
  };
  return ScalaJS.n.s_reflect_package
});
/** @constructor */
ScalaJS.c.s_util_DynamicVariable = (function() {
  ScalaJS.c.O.call(this);
  this.scala$util$DynamicVariable$$init$f = null;
  this.tl$1 = null
});
ScalaJS.c.s_util_DynamicVariable.prototype = new ScalaJS.h.O();
ScalaJS.c.s_util_DynamicVariable.prototype.constructor = ScalaJS.c.s_util_DynamicVariable;
/** @constructor */
ScalaJS.h.s_util_DynamicVariable = (function() {
  /*<skip>*/
});
ScalaJS.h.s_util_DynamicVariable.prototype = ScalaJS.c.s_util_DynamicVariable.prototype;
ScalaJS.c.s_util_DynamicVariable.prototype.toString__T = (function() {
  return (("DynamicVariable(" + this.tl$1.get__O()) + ")")
});
ScalaJS.c.s_util_DynamicVariable.prototype.init___O = (function(init) {
  this.scala$util$DynamicVariable$$init$f = init;
  this.tl$1 = new ScalaJS.c.s_util_DynamicVariable$$anon$1().init___s_util_DynamicVariable(this);
  return this
});
ScalaJS.is.s_util_DynamicVariable = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_util_DynamicVariable)))
});
ScalaJS.as.s_util_DynamicVariable = (function(obj) {
  return ((ScalaJS.is.s_util_DynamicVariable(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.util.DynamicVariable"))
});
ScalaJS.isArrayOf.s_util_DynamicVariable = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_util_DynamicVariable)))
});
ScalaJS.asArrayOf.s_util_DynamicVariable = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_util_DynamicVariable(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.util.DynamicVariable;", depth))
});
ScalaJS.d.s_util_DynamicVariable = new ScalaJS.ClassTypeData({
  s_util_DynamicVariable: 0
}, false, "scala.util.DynamicVariable", ScalaJS.d.O, {
  s_util_DynamicVariable: 1,
  O: 1
});
ScalaJS.c.s_util_DynamicVariable.prototype.$classData = ScalaJS.d.s_util_DynamicVariable;
/** @constructor */
ScalaJS.c.s_util_Either$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_util_Either$.prototype = new ScalaJS.h.O();
ScalaJS.c.s_util_Either$.prototype.constructor = ScalaJS.c.s_util_Either$;
/** @constructor */
ScalaJS.h.s_util_Either$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_util_Either$.prototype = ScalaJS.c.s_util_Either$.prototype;
ScalaJS.is.s_util_Either$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_util_Either$)))
});
ScalaJS.as.s_util_Either$ = (function(obj) {
  return ((ScalaJS.is.s_util_Either$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.util.Either$"))
});
ScalaJS.isArrayOf.s_util_Either$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_util_Either$)))
});
ScalaJS.asArrayOf.s_util_Either$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_util_Either$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.util.Either$;", depth))
});
ScalaJS.d.s_util_Either$ = new ScalaJS.ClassTypeData({
  s_util_Either$: 0
}, false, "scala.util.Either$", ScalaJS.d.O, {
  s_util_Either$: 1,
  O: 1
});
ScalaJS.c.s_util_Either$.prototype.$classData = ScalaJS.d.s_util_Either$;
ScalaJS.n.s_util_Either = (void 0);
ScalaJS.m.s_util_Either = (function() {
  if ((!ScalaJS.n.s_util_Either)) {
    ScalaJS.n.s_util_Either = new ScalaJS.c.s_util_Either$().init___()
  };
  return ScalaJS.n.s_util_Either
});
/** @constructor */
ScalaJS.c.s_util_Left$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_util_Left$.prototype = new ScalaJS.h.O();
ScalaJS.c.s_util_Left$.prototype.constructor = ScalaJS.c.s_util_Left$;
/** @constructor */
ScalaJS.h.s_util_Left$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_util_Left$.prototype = ScalaJS.c.s_util_Left$.prototype;
ScalaJS.c.s_util_Left$.prototype.toString__T = (function() {
  return "Left"
});
ScalaJS.is.s_util_Left$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_util_Left$)))
});
ScalaJS.as.s_util_Left$ = (function(obj) {
  return ((ScalaJS.is.s_util_Left$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.util.Left$"))
});
ScalaJS.isArrayOf.s_util_Left$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_util_Left$)))
});
ScalaJS.asArrayOf.s_util_Left$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_util_Left$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.util.Left$;", depth))
});
ScalaJS.d.s_util_Left$ = new ScalaJS.ClassTypeData({
  s_util_Left$: 0
}, false, "scala.util.Left$", ScalaJS.d.O, {
  s_util_Left$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_util_Left$.prototype.$classData = ScalaJS.d.s_util_Left$;
ScalaJS.n.s_util_Left = (void 0);
ScalaJS.m.s_util_Left = (function() {
  if ((!ScalaJS.n.s_util_Left)) {
    ScalaJS.n.s_util_Left = new ScalaJS.c.s_util_Left$().init___()
  };
  return ScalaJS.n.s_util_Left
});
/** @constructor */
ScalaJS.c.s_util_Right$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_util_Right$.prototype = new ScalaJS.h.O();
ScalaJS.c.s_util_Right$.prototype.constructor = ScalaJS.c.s_util_Right$;
/** @constructor */
ScalaJS.h.s_util_Right$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_util_Right$.prototype = ScalaJS.c.s_util_Right$.prototype;
ScalaJS.c.s_util_Right$.prototype.toString__T = (function() {
  return "Right"
});
ScalaJS.is.s_util_Right$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_util_Right$)))
});
ScalaJS.as.s_util_Right$ = (function(obj) {
  return ((ScalaJS.is.s_util_Right$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.util.Right$"))
});
ScalaJS.isArrayOf.s_util_Right$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_util_Right$)))
});
ScalaJS.asArrayOf.s_util_Right$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_util_Right$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.util.Right$;", depth))
});
ScalaJS.d.s_util_Right$ = new ScalaJS.ClassTypeData({
  s_util_Right$: 0
}, false, "scala.util.Right$", ScalaJS.d.O, {
  s_util_Right$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_util_Right$.prototype.$classData = ScalaJS.d.s_util_Right$;
ScalaJS.n.s_util_Right = (void 0);
ScalaJS.m.s_util_Right = (function() {
  if ((!ScalaJS.n.s_util_Right)) {
    ScalaJS.n.s_util_Right = new ScalaJS.c.s_util_Right$().init___()
  };
  return ScalaJS.n.s_util_Right
});
/** @constructor */
ScalaJS.c.s_util_control_Breaks = (function() {
  ScalaJS.c.O.call(this);
  this.scala$util$control$Breaks$$breakException$1 = null
});
ScalaJS.c.s_util_control_Breaks.prototype = new ScalaJS.h.O();
ScalaJS.c.s_util_control_Breaks.prototype.constructor = ScalaJS.c.s_util_control_Breaks;
/** @constructor */
ScalaJS.h.s_util_control_Breaks = (function() {
  /*<skip>*/
});
ScalaJS.h.s_util_control_Breaks.prototype = ScalaJS.c.s_util_control_Breaks.prototype;
ScalaJS.c.s_util_control_Breaks.prototype.init___ = (function() {
  this.scala$util$control$Breaks$$breakException$1 = new ScalaJS.c.s_util_control_BreakControl().init___();
  return this
});
ScalaJS.is.s_util_control_Breaks = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_util_control_Breaks)))
});
ScalaJS.as.s_util_control_Breaks = (function(obj) {
  return ((ScalaJS.is.s_util_control_Breaks(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.util.control.Breaks"))
});
ScalaJS.isArrayOf.s_util_control_Breaks = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_util_control_Breaks)))
});
ScalaJS.asArrayOf.s_util_control_Breaks = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_util_control_Breaks(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.util.control.Breaks;", depth))
});
ScalaJS.d.s_util_control_Breaks = new ScalaJS.ClassTypeData({
  s_util_control_Breaks: 0
}, false, "scala.util.control.Breaks", ScalaJS.d.O, {
  s_util_control_Breaks: 1,
  O: 1
});
ScalaJS.c.s_util_control_Breaks.prototype.$classData = ScalaJS.d.s_util_control_Breaks;
/** @constructor */
ScalaJS.c.s_util_control_NoStackTrace$ = (function() {
  ScalaJS.c.O.call(this);
  this.$$undnoSuppression$1 = false
});
ScalaJS.c.s_util_control_NoStackTrace$.prototype = new ScalaJS.h.O();
ScalaJS.c.s_util_control_NoStackTrace$.prototype.constructor = ScalaJS.c.s_util_control_NoStackTrace$;
/** @constructor */
ScalaJS.h.s_util_control_NoStackTrace$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_util_control_NoStackTrace$.prototype = ScalaJS.c.s_util_control_NoStackTrace$.prototype;
ScalaJS.c.s_util_control_NoStackTrace$.prototype.init___ = (function() {
  ScalaJS.n.s_util_control_NoStackTrace = this;
  this.$$undnoSuppression$1 = false;
  return this
});
ScalaJS.is.s_util_control_NoStackTrace$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_util_control_NoStackTrace$)))
});
ScalaJS.as.s_util_control_NoStackTrace$ = (function(obj) {
  return ((ScalaJS.is.s_util_control_NoStackTrace$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.util.control.NoStackTrace$"))
});
ScalaJS.isArrayOf.s_util_control_NoStackTrace$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_util_control_NoStackTrace$)))
});
ScalaJS.asArrayOf.s_util_control_NoStackTrace$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_util_control_NoStackTrace$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.util.control.NoStackTrace$;", depth))
});
ScalaJS.d.s_util_control_NoStackTrace$ = new ScalaJS.ClassTypeData({
  s_util_control_NoStackTrace$: 0
}, false, "scala.util.control.NoStackTrace$", ScalaJS.d.O, {
  s_util_control_NoStackTrace$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_util_control_NoStackTrace$.prototype.$classData = ScalaJS.d.s_util_control_NoStackTrace$;
ScalaJS.n.s_util_control_NoStackTrace = (void 0);
ScalaJS.m.s_util_control_NoStackTrace = (function() {
  if ((!ScalaJS.n.s_util_control_NoStackTrace)) {
    ScalaJS.n.s_util_control_NoStackTrace = new ScalaJS.c.s_util_control_NoStackTrace$().init___()
  };
  return ScalaJS.n.s_util_control_NoStackTrace
});
/** @constructor */
ScalaJS.c.s_util_hashing_MurmurHash3 = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_util_hashing_MurmurHash3.prototype = new ScalaJS.h.O();
ScalaJS.c.s_util_hashing_MurmurHash3.prototype.constructor = ScalaJS.c.s_util_hashing_MurmurHash3;
/** @constructor */
ScalaJS.h.s_util_hashing_MurmurHash3 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_util_hashing_MurmurHash3.prototype = ScalaJS.c.s_util_hashing_MurmurHash3.prototype;
ScalaJS.c.s_util_hashing_MurmurHash3.prototype.mixLast__I__I__I = (function(hash, data) {
  var k = data;
  k = ScalaJS.imul(k, -862048943);
  k = ScalaJS.m.jl_Integer().rotateLeft__I__I__I(k, 15);
  k = ScalaJS.imul(k, 461845907);
  return (hash ^ k)
});
ScalaJS.c.s_util_hashing_MurmurHash3.prototype.mix__I__I__I = (function(hash, data) {
  var h = this.mixLast__I__I__I(hash, data);
  h = ScalaJS.m.jl_Integer().rotateLeft__I__I__I(h, 13);
  return ((ScalaJS.imul(h, 5) + -430675100) | 0)
});
ScalaJS.c.s_util_hashing_MurmurHash3.prototype.avalanche__p1__I__I = (function(hash) {
  var h = hash;
  h = (h ^ ((h >>> 16) | 0));
  h = ScalaJS.imul(h, -2048144789);
  h = (h ^ ((h >>> 13) | 0));
  h = ScalaJS.imul(h, -1028477387);
  h = (h ^ ((h >>> 16) | 0));
  return h
});
ScalaJS.c.s_util_hashing_MurmurHash3.prototype.unorderedHash__sc_TraversableOnce__I__I = (function(xs, seed) {
  var a = new ScalaJS.c.sr_IntRef().init___I(0);
  var b = new ScalaJS.c.sr_IntRef().init___I(0);
  var n = new ScalaJS.c.sr_IntRef().init___I(0);
  var c = new ScalaJS.c.sr_IntRef().init___I(1);
  xs.foreach__F1__V(new ScalaJS.c.sjsr_AnonFunction1().init___sjs_js_Function1((function(a$1, b$1, n$1, c$1) {
    return (function(x$2) {
      var h = ScalaJS.m.sr_ScalaRunTime().hash__O__I(x$2);
      a$1.elem$1 = ((a$1.elem$1 + h) | 0);
      b$1.elem$1 = (b$1.elem$1 ^ h);
      if ((h !== 0)) {
        c$1.elem$1 = ScalaJS.imul(c$1.elem$1, h)
      };
      n$1.elem$1 = ((n$1.elem$1 + 1) | 0)
    })
  })(a, b, n, c)));
  var h$1 = seed;
  h$1 = this.mix__I__I__I(h$1, a.elem$1);
  h$1 = this.mix__I__I__I(h$1, b.elem$1);
  h$1 = this.mixLast__I__I__I(h$1, c.elem$1);
  return this.finalizeHash__I__I__I(h$1, n.elem$1)
});
ScalaJS.c.s_util_hashing_MurmurHash3.prototype.productHash__s_Product__I__I = (function(x, seed) {
  var arr = x.productArity__I();
  if ((arr === 0)) {
    return ScalaJS.objectHashCode(x.productPrefix__T())
  } else {
    var h = seed;
    var i = 0;
    while ((i < arr)) {
      h = this.mix__I__I__I(h, ScalaJS.m.sr_ScalaRunTime().hash__O__I(x.productElement__I__O(i)));
      i = ((i + 1) | 0)
    };
    return this.finalizeHash__I__I__I(h, arr)
  }
});
ScalaJS.c.s_util_hashing_MurmurHash3.prototype.finalizeHash__I__I__I = (function(hash, length) {
  return this.avalanche__p1__I__I((hash ^ length))
});
ScalaJS.c.s_util_hashing_MurmurHash3.prototype.orderedHash__sc_TraversableOnce__I__I = (function(xs, seed) {
  var n = new ScalaJS.c.sr_IntRef().init___I(0);
  var h = new ScalaJS.c.sr_IntRef().init___I(seed);
  xs.foreach__F1__V(new ScalaJS.c.sjsr_AnonFunction1().init___sjs_js_Function1((function(arg$outer, n$2, h$1) {
    return (function(x$2) {
      h$1.elem$1 = arg$outer.mix__I__I__I(h$1.elem$1, ScalaJS.m.sr_ScalaRunTime().hash__O__I(x$2));
      n$2.elem$1 = ((n$2.elem$1 + 1) | 0)
    })
  })(this, n, h)));
  return this.finalizeHash__I__I__I(h.elem$1, n.elem$1)
});
ScalaJS.c.s_util_hashing_MurmurHash3.prototype.listHash__sci_List__I__I = (function(xs, seed) {
  var n = 0;
  var h = seed;
  var elems = xs;
  while ((!elems.isEmpty__Z())) {
    var head = elems.head__O();
    var tail = ScalaJS.as.sci_List(elems.tail__O());
    h = this.mix__I__I__I(h, ScalaJS.m.sr_ScalaRunTime().hash__O__I(head));
    n = ((n + 1) | 0);
    elems = tail
  };
  return this.finalizeHash__I__I__I(h, n)
});
ScalaJS.is.s_util_hashing_MurmurHash3 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_util_hashing_MurmurHash3)))
});
ScalaJS.as.s_util_hashing_MurmurHash3 = (function(obj) {
  return ((ScalaJS.is.s_util_hashing_MurmurHash3(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.util.hashing.MurmurHash3"))
});
ScalaJS.isArrayOf.s_util_hashing_MurmurHash3 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_util_hashing_MurmurHash3)))
});
ScalaJS.asArrayOf.s_util_hashing_MurmurHash3 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_util_hashing_MurmurHash3(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.util.hashing.MurmurHash3;", depth))
});
ScalaJS.d.s_util_hashing_MurmurHash3 = new ScalaJS.ClassTypeData({
  s_util_hashing_MurmurHash3: 0
}, false, "scala.util.hashing.MurmurHash3", ScalaJS.d.O, {
  s_util_hashing_MurmurHash3: 1,
  O: 1
});
ScalaJS.c.s_util_hashing_MurmurHash3.prototype.$classData = ScalaJS.d.s_util_hashing_MurmurHash3;
/** @constructor */
ScalaJS.c.s_util_hashing_package$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_util_hashing_package$.prototype = new ScalaJS.h.O();
ScalaJS.c.s_util_hashing_package$.prototype.constructor = ScalaJS.c.s_util_hashing_package$;
/** @constructor */
ScalaJS.h.s_util_hashing_package$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_util_hashing_package$.prototype = ScalaJS.c.s_util_hashing_package$.prototype;
ScalaJS.c.s_util_hashing_package$.prototype.byteswap32__I__I = (function(v) {
  var hc = ScalaJS.imul(v, -1640532531);
  hc = ScalaJS.m.jl_Integer().reverseBytes__I__I(hc);
  return ScalaJS.imul(hc, -1640532531)
});
ScalaJS.is.s_util_hashing_package$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_util_hashing_package$)))
});
ScalaJS.as.s_util_hashing_package$ = (function(obj) {
  return ((ScalaJS.is.s_util_hashing_package$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.util.hashing.package$"))
});
ScalaJS.isArrayOf.s_util_hashing_package$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_util_hashing_package$)))
});
ScalaJS.asArrayOf.s_util_hashing_package$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_util_hashing_package$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.util.hashing.package$;", depth))
});
ScalaJS.d.s_util_hashing_package$ = new ScalaJS.ClassTypeData({
  s_util_hashing_package$: 0
}, false, "scala.util.hashing.package$", ScalaJS.d.O, {
  s_util_hashing_package$: 1,
  O: 1
});
ScalaJS.c.s_util_hashing_package$.prototype.$classData = ScalaJS.d.s_util_hashing_package$;
ScalaJS.n.s_util_hashing_package = (void 0);
ScalaJS.m.s_util_hashing_package = (function() {
  if ((!ScalaJS.n.s_util_hashing_package)) {
    ScalaJS.n.s_util_hashing_package = new ScalaJS.c.s_util_hashing_package$().init___()
  };
  return ScalaJS.n.s_util_hashing_package
});
ScalaJS.is.s_xml_Equality = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_xml_Equality)))
});
ScalaJS.as.s_xml_Equality = (function(obj) {
  return ((ScalaJS.is.s_xml_Equality(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.xml.Equality"))
});
ScalaJS.isArrayOf.s_xml_Equality = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_xml_Equality)))
});
ScalaJS.asArrayOf.s_xml_Equality = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_xml_Equality(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.xml.Equality;", depth))
});
ScalaJS.d.s_xml_Equality = new ScalaJS.ClassTypeData({
  s_xml_Equality: 0
}, true, "scala.xml.Equality", (void 0), {
  s_xml_Equality: 1,
  s_Equals: 1,
  O: 1
});
/** @constructor */
ScalaJS.c.s_xml_Equality$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.s_xml_Equality$.prototype = new ScalaJS.h.O();
ScalaJS.c.s_xml_Equality$.prototype.constructor = ScalaJS.c.s_xml_Equality$;
/** @constructor */
ScalaJS.h.s_xml_Equality$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_xml_Equality$.prototype = ScalaJS.c.s_xml_Equality$.prototype;
ScalaJS.c.s_xml_Equality$.prototype.compareBlithely__O__s_xml_Node__Z = (function(x1, x2$2) {
  if (ScalaJS.is.s_xml_NodeSeq(x1)) {
    var x2 = ScalaJS.as.s_xml_NodeSeq(x1);
    if ((x2.length__I() === 1)) {
      return ScalaJS.anyRefEqEq(x2$2, x2.apply__I__s_xml_Node(0))
    }
  };
  return false
});
ScalaJS.c.s_xml_Equality$.prototype.compareBlithely__O__O__Z = (function(x1, x2) {
  if (((x1 === null) || (x2 === null))) {
    return (x1 === x2)
  };
  if (ScalaJS.is.T(x2)) {
    var x2$2 = ScalaJS.as.T(x2);
    return this.compareBlithely__O__T__Z(x1, x2$2)
  } else if (ScalaJS.is.s_xml_Node(x2)) {
    var x3 = ScalaJS.as.s_xml_Node(x2);
    return this.compareBlithely__O__s_xml_Node__Z(x1, x3)
  } else {
    return false
  }
});
ScalaJS.c.s_xml_Equality$.prototype.compareBlithely__O__T__Z = (function(x1, x2$2) {
  if (ScalaJS.is.s_xml_Atom(x1)) {
    var x2 = ScalaJS.as.s_xml_Atom(x1);
    return ScalaJS.anyRefEqEq(x2.data__O(), x2$2)
  } else if (ScalaJS.is.s_xml_NodeSeq(x1)) {
    var x3 = ScalaJS.as.s_xml_NodeSeq(x1);
    return ScalaJS.anyRefEqEq(x3.text__T(), x2$2)
  } else {
    return false
  }
});
ScalaJS.is.s_xml_Equality$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_xml_Equality$)))
});
ScalaJS.as.s_xml_Equality$ = (function(obj) {
  return ((ScalaJS.is.s_xml_Equality$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.xml.Equality$"))
});
ScalaJS.isArrayOf.s_xml_Equality$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_xml_Equality$)))
});
ScalaJS.asArrayOf.s_xml_Equality$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_xml_Equality$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.xml.Equality$;", depth))
});
ScalaJS.d.s_xml_Equality$ = new ScalaJS.ClassTypeData({
  s_xml_Equality$: 0
}, false, "scala.xml.Equality$", ScalaJS.d.O, {
  s_xml_Equality$: 1,
  O: 1
});
ScalaJS.c.s_xml_Equality$.prototype.$classData = ScalaJS.d.s_xml_Equality$;
ScalaJS.n.s_xml_Equality = (void 0);
ScalaJS.m.s_xml_Equality = (function() {
  if ((!ScalaJS.n.s_xml_Equality)) {
    ScalaJS.n.s_xml_Equality = new ScalaJS.c.s_xml_Equality$().init___()
  };
  return ScalaJS.n.s_xml_Equality
});
/** @constructor */
ScalaJS.c.s_xml_NamespaceBinding = (function() {
  ScalaJS.c.O.call(this);
  this.prefix$1 = null;
  this.uri$1 = null;
  this.parent$1 = null
});
ScalaJS.c.s_xml_NamespaceBinding.prototype = new ScalaJS.h.O();
ScalaJS.c.s_xml_NamespaceBinding.prototype.constructor = ScalaJS.c.s_xml_NamespaceBinding;
/** @constructor */
ScalaJS.h.s_xml_NamespaceBinding = (function() {
  /*<skip>*/
});
ScalaJS.h.s_xml_NamespaceBinding.prototype = ScalaJS.c.s_xml_NamespaceBinding.prototype;
ScalaJS.c.s_xml_NamespaceBinding.prototype.productPrefix__T = (function() {
  return "NamespaceBinding"
});
ScalaJS.c.s_xml_NamespaceBinding.prototype.productArity__I = (function() {
  return 3
});
ScalaJS.c.s_xml_NamespaceBinding.prototype.equals__O__Z = (function(other) {
  return ScalaJS.i.s_xml_Equality$class__doComparison__s_xml_Equality__O__Z__Z(this, other, false)
});
ScalaJS.c.s_xml_NamespaceBinding.prototype.productElement__I__O = (function(x$1) {
  switch (x$1) {
    case 0:
      {
        return this.prefix$1;
        break
      };
    case 1:
      {
        return this.uri$1;
        break
      };
    case 2:
      {
        return this.parent$1;
        break
      };
    default:
      throw new ScalaJS.c.jl_IndexOutOfBoundsException().init___T(ScalaJS.objectToString(x$1));
  }
});
ScalaJS.c.s_xml_NamespaceBinding.prototype.basisForHashCode__sc_Seq = (function() {
  var xs = ScalaJS.m.s_Predef().wrapRefArray__AO__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.O.getArrayOf(), [this.prefix$1, this.uri$1, this.parent$1]));
  return ScalaJS.i.sc_TraversableOnce$class__toList__sc_TraversableOnce__sci_List(xs)
});
ScalaJS.c.s_xml_NamespaceBinding.prototype.init___T__T__s_xml_NamespaceBinding = (function(prefix, uri, parent) {
  this.prefix$1 = prefix;
  this.uri$1 = uri;
  this.parent$1 = parent;
  if (ScalaJS.anyRefEqEq(prefix, "")) {
    throw new ScalaJS.c.jl_IllegalArgumentException().init___T("zero length prefix not allowed")
  };
  return this
});
ScalaJS.c.s_xml_NamespaceBinding.prototype.canEqual__O__Z = (function(other) {
  return ScalaJS.is.s_xml_NamespaceBinding(other)
});
ScalaJS.c.s_xml_NamespaceBinding.prototype.strict$und$eq$eq__s_xml_Equality__Z = (function(other) {
  if (ScalaJS.is.s_xml_NamespaceBinding(other)) {
    var x2 = ScalaJS.as.s_xml_NamespaceBinding(other);
    return ((ScalaJS.anyRefEqEq(this.prefix$1, x2.prefix$1) && ScalaJS.anyRefEqEq(this.uri$1, x2.uri$1)) && ScalaJS.anyRefEqEq(this.parent$1, x2.parent$1))
  } else {
    return false
  }
});
ScalaJS.c.s_xml_NamespaceBinding.prototype.hashCode__I = (function() {
  return ScalaJS.m.sr_ScalaRunTime().hash__O__I(this.basisForHashCode__sc_Seq())
});
ScalaJS.c.s_xml_NamespaceBinding.prototype.productIterator__sc_Iterator = (function() {
  return new ScalaJS.c.sr_ScalaRunTime$$anon$1().init___s_Product(this)
});
ScalaJS.is.s_xml_NamespaceBinding = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_xml_NamespaceBinding)))
});
ScalaJS.as.s_xml_NamespaceBinding = (function(obj) {
  return ((ScalaJS.is.s_xml_NamespaceBinding(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.xml.NamespaceBinding"))
});
ScalaJS.isArrayOf.s_xml_NamespaceBinding = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_xml_NamespaceBinding)))
});
ScalaJS.asArrayOf.s_xml_NamespaceBinding = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_xml_NamespaceBinding(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.xml.NamespaceBinding;", depth))
});
ScalaJS.d.s_xml_NamespaceBinding = new ScalaJS.ClassTypeData({
  s_xml_NamespaceBinding: 0
}, false, "scala.xml.NamespaceBinding", ScalaJS.d.O, {
  s_xml_NamespaceBinding: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  s_Product: 1,
  s_xml_Equality: 1,
  s_Equals: 1,
  O: 1
});
ScalaJS.c.s_xml_NamespaceBinding.prototype.$classData = ScalaJS.d.s_xml_NamespaceBinding;
/** @constructor */
ScalaJS.c.sc_$colon$plus$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.sc_$colon$plus$.prototype = new ScalaJS.h.O();
ScalaJS.c.sc_$colon$plus$.prototype.constructor = ScalaJS.c.sc_$colon$plus$;
/** @constructor */
ScalaJS.h.sc_$colon$plus$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sc_$colon$plus$.prototype = ScalaJS.c.sc_$colon$plus$.prototype;
ScalaJS.is.sc_$colon$plus$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_$colon$plus$)))
});
ScalaJS.as.sc_$colon$plus$ = (function(obj) {
  return ((ScalaJS.is.sc_$colon$plus$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.$colon$plus$"))
});
ScalaJS.isArrayOf.sc_$colon$plus$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_$colon$plus$)))
});
ScalaJS.asArrayOf.sc_$colon$plus$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_$colon$plus$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.$colon$plus$;", depth))
});
ScalaJS.d.sc_$colon$plus$ = new ScalaJS.ClassTypeData({
  sc_$colon$plus$: 0
}, false, "scala.collection.$colon$plus$", ScalaJS.d.O, {
  sc_$colon$plus$: 1,
  O: 1
});
ScalaJS.c.sc_$colon$plus$.prototype.$classData = ScalaJS.d.sc_$colon$plus$;
ScalaJS.n.sc_$colon$plus = (void 0);
ScalaJS.m.sc_$colon$plus = (function() {
  if ((!ScalaJS.n.sc_$colon$plus)) {
    ScalaJS.n.sc_$colon$plus = new ScalaJS.c.sc_$colon$plus$().init___()
  };
  return ScalaJS.n.sc_$colon$plus
});
/** @constructor */
ScalaJS.c.sc_$plus$colon$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.sc_$plus$colon$.prototype = new ScalaJS.h.O();
ScalaJS.c.sc_$plus$colon$.prototype.constructor = ScalaJS.c.sc_$plus$colon$;
/** @constructor */
ScalaJS.h.sc_$plus$colon$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sc_$plus$colon$.prototype = ScalaJS.c.sc_$plus$colon$.prototype;
ScalaJS.is.sc_$plus$colon$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_$plus$colon$)))
});
ScalaJS.as.sc_$plus$colon$ = (function(obj) {
  return ((ScalaJS.is.sc_$plus$colon$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.$plus$colon$"))
});
ScalaJS.isArrayOf.sc_$plus$colon$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_$plus$colon$)))
});
ScalaJS.asArrayOf.sc_$plus$colon$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_$plus$colon$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.$plus$colon$;", depth))
});
ScalaJS.d.sc_$plus$colon$ = new ScalaJS.ClassTypeData({
  sc_$plus$colon$: 0
}, false, "scala.collection.$plus$colon$", ScalaJS.d.O, {
  sc_$plus$colon$: 1,
  O: 1
});
ScalaJS.c.sc_$plus$colon$.prototype.$classData = ScalaJS.d.sc_$plus$colon$;
ScalaJS.n.sc_$plus$colon = (void 0);
ScalaJS.m.sc_$plus$colon = (function() {
  if ((!ScalaJS.n.sc_$plus$colon)) {
    ScalaJS.n.sc_$plus$colon = new ScalaJS.c.sc_$plus$colon$().init___()
  };
  return ScalaJS.n.sc_$plus$colon
});
/** @constructor */
ScalaJS.c.sc_AbstractIterator = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.sc_AbstractIterator.prototype = new ScalaJS.h.O();
ScalaJS.c.sc_AbstractIterator.prototype.constructor = ScalaJS.c.sc_AbstractIterator;
/** @constructor */
ScalaJS.h.sc_AbstractIterator = (function() {
  /*<skip>*/
});
ScalaJS.h.sc_AbstractIterator.prototype = ScalaJS.c.sc_AbstractIterator.prototype;
ScalaJS.c.sc_AbstractIterator.prototype.seq__sc_TraversableOnce = (function() {
  return this
});
ScalaJS.c.sc_AbstractIterator.prototype.copyToArray__O__I__V = (function(xs, start) {
  ScalaJS.i.sc_TraversableOnce$class__copyToArray__sc_TraversableOnce__O__I__V(this, xs, start)
});
ScalaJS.c.sc_AbstractIterator.prototype.init___ = (function() {
  return this
});
ScalaJS.c.sc_AbstractIterator.prototype.isEmpty__Z = (function() {
  return ScalaJS.i.sc_Iterator$class__isEmpty__sc_Iterator__Z(this)
});
ScalaJS.c.sc_AbstractIterator.prototype.to__scg_CanBuildFrom__O = (function(cbf) {
  return ScalaJS.i.sc_TraversableOnce$class__to__sc_TraversableOnce__scg_CanBuildFrom__O(this, cbf)
});
ScalaJS.c.sc_AbstractIterator.prototype.toString__T = (function() {
  return ScalaJS.i.sc_Iterator$class__toString__sc_Iterator__T(this)
});
ScalaJS.c.sc_AbstractIterator.prototype.foreach__F1__V = (function(f) {
  ScalaJS.i.sc_Iterator$class__foreach__sc_Iterator__F1__V(this, f)
});
ScalaJS.c.sc_AbstractIterator.prototype.toBuffer__scm_Buffer = (function() {
  return ScalaJS.i.sc_TraversableOnce$class__toBuffer__sc_TraversableOnce__scm_Buffer(this)
});
ScalaJS.c.sc_AbstractIterator.prototype.size__I = (function() {
  return ScalaJS.i.sc_TraversableOnce$class__size__sc_TraversableOnce__I(this)
});
ScalaJS.c.sc_AbstractIterator.prototype.toStream__sci_Stream = (function() {
  return ScalaJS.i.sc_Iterator$class__toStream__sc_Iterator__sci_Stream(this)
});
ScalaJS.c.sc_AbstractIterator.prototype.addString__scm_StringBuilder__T__T__T__scm_StringBuilder = (function(b, start, sep, end) {
  return ScalaJS.i.sc_TraversableOnce$class__addString__sc_TraversableOnce__scm_StringBuilder__T__T__T__scm_StringBuilder(this, b, start, sep, end)
});
ScalaJS.c.sc_AbstractIterator.prototype.$$div$colon__O__F2__O = (function(z, op) {
  return ScalaJS.i.sc_TraversableOnce$class__foldLeft__sc_TraversableOnce__O__F2__O(this, z, op)
});
ScalaJS.c.sc_AbstractIterator.prototype.isTraversableAgain__Z = (function() {
  return false
});
ScalaJS.c.sc_AbstractIterator.prototype.copyToArray__O__I__I__V = (function(xs, start, len) {
  ScalaJS.i.sc_Iterator$class__copyToArray__sc_Iterator__O__I__I__V(this, xs, start, len)
});
ScalaJS.c.sc_AbstractIterator.prototype.toArray__s_reflect_ClassTag__O = (function(evidence$1) {
  return ScalaJS.i.sc_TraversableOnce$class__toArray__sc_TraversableOnce__s_reflect_ClassTag__O(this, evidence$1)
});
ScalaJS.is.sc_AbstractIterator = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_AbstractIterator)))
});
ScalaJS.as.sc_AbstractIterator = (function(obj) {
  return ((ScalaJS.is.sc_AbstractIterator(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.AbstractIterator"))
});
ScalaJS.isArrayOf.sc_AbstractIterator = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_AbstractIterator)))
});
ScalaJS.asArrayOf.sc_AbstractIterator = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_AbstractIterator(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.AbstractIterator;", depth))
});
ScalaJS.d.sc_AbstractIterator = new ScalaJS.ClassTypeData({
  sc_AbstractIterator: 0
}, false, "scala.collection.AbstractIterator", ScalaJS.d.O, {
  sc_AbstractIterator: 1,
  sc_Iterator: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  O: 1
});
ScalaJS.c.sc_AbstractIterator.prototype.$classData = ScalaJS.d.sc_AbstractIterator;
/** @constructor */
ScalaJS.c.sc_AbstractTraversable = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.sc_AbstractTraversable.prototype = new ScalaJS.h.O();
ScalaJS.c.sc_AbstractTraversable.prototype.constructor = ScalaJS.c.sc_AbstractTraversable;
/** @constructor */
ScalaJS.h.sc_AbstractTraversable = (function() {
  /*<skip>*/
});
ScalaJS.h.sc_AbstractTraversable.prototype = ScalaJS.c.sc_AbstractTraversable.prototype;
ScalaJS.c.sc_AbstractTraversable.prototype.copyToArray__O__I__V = (function(xs, start) {
  ScalaJS.i.sc_TraversableOnce$class__copyToArray__sc_TraversableOnce__O__I__V(this, xs, start)
});
ScalaJS.c.sc_AbstractTraversable.prototype.to__scg_CanBuildFrom__O = (function(cbf) {
  return ScalaJS.i.sc_TraversableLike$class__to__sc_TraversableLike__scg_CanBuildFrom__O(this, cbf)
});
ScalaJS.c.sc_AbstractTraversable.prototype.mkString__T__T__T__T = (function(start, sep, end) {
  return ScalaJS.i.sc_TraversableOnce$class__mkString__sc_TraversableOnce__T__T__T__T(this, start, sep, end)
});
ScalaJS.c.sc_AbstractTraversable.prototype.foldLeft__O__F2__O = (function(z, op) {
  return ScalaJS.i.sc_TraversableOnce$class__foldLeft__sc_TraversableOnce__O__F2__O(this, z, op)
});
ScalaJS.c.sc_AbstractTraversable.prototype.toBuffer__scm_Buffer = (function() {
  return ScalaJS.i.sc_TraversableOnce$class__toBuffer__sc_TraversableOnce__scm_Buffer(this)
});
ScalaJS.c.sc_AbstractTraversable.prototype.addString__scm_StringBuilder__T__T__T__scm_StringBuilder = (function(b, start, sep, end) {
  return ScalaJS.i.sc_TraversableOnce$class__addString__sc_TraversableOnce__scm_StringBuilder__T__T__T__scm_StringBuilder(this, b, start, sep, end)
});
ScalaJS.c.sc_AbstractTraversable.prototype.repr__O = (function() {
  return this
});
ScalaJS.c.sc_AbstractTraversable.prototype.$$div$colon__O__F2__O = (function(z, op) {
  return this.foldLeft__O__F2__O(z, op)
});
ScalaJS.c.sc_AbstractTraversable.prototype.isTraversableAgain__Z = (function() {
  return true
});
ScalaJS.c.sc_AbstractTraversable.prototype.map__F1__scg_CanBuildFrom__O = (function(f, bf) {
  return ScalaJS.i.sc_TraversableLike$class__map__sc_TraversableLike__F1__scg_CanBuildFrom__O(this, f, bf)
});
ScalaJS.c.sc_AbstractTraversable.prototype.toArray__s_reflect_ClassTag__O = (function(evidence$1) {
  return ScalaJS.i.sc_TraversableOnce$class__toArray__sc_TraversableOnce__s_reflect_ClassTag__O(this, evidence$1)
});
ScalaJS.c.sc_AbstractTraversable.prototype.newBuilder__scm_Builder = (function() {
  return this.companion__scg_GenericCompanion().newBuilder__scm_Builder()
});
ScalaJS.c.sc_AbstractTraversable.prototype.stringPrefix__T = (function() {
  return ScalaJS.i.sc_TraversableLike$class__stringPrefix__sc_TraversableLike__T(this)
});
ScalaJS.is.sc_AbstractTraversable = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_AbstractTraversable)))
});
ScalaJS.as.sc_AbstractTraversable = (function(obj) {
  return ((ScalaJS.is.sc_AbstractTraversable(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.AbstractTraversable"))
});
ScalaJS.isArrayOf.sc_AbstractTraversable = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_AbstractTraversable)))
});
ScalaJS.asArrayOf.sc_AbstractTraversable = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_AbstractTraversable(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.AbstractTraversable;", depth))
});
ScalaJS.d.sc_AbstractTraversable = new ScalaJS.ClassTypeData({
  sc_AbstractTraversable: 0
}, false, "scala.collection.AbstractTraversable", ScalaJS.d.O, {
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sc_AbstractTraversable.prototype.$classData = ScalaJS.d.sc_AbstractTraversable;
ScalaJS.is.sc_GenSeq = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_GenSeq)))
});
ScalaJS.as.sc_GenSeq = (function(obj) {
  return ((ScalaJS.is.sc_GenSeq(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.GenSeq"))
});
ScalaJS.isArrayOf.sc_GenSeq = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_GenSeq)))
});
ScalaJS.asArrayOf.sc_GenSeq = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_GenSeq(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.GenSeq;", depth))
});
ScalaJS.d.sc_GenSeq = new ScalaJS.ClassTypeData({
  sc_GenSeq: 0
}, true, "scala.collection.GenSeq", (void 0), {
  sc_GenSeq: 1,
  sc_GenIterable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  scg_HasNewBuilder: 1,
  sc_GenSeqLike: 1,
  s_Equals: 1,
  sc_GenIterableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_GenTraversableOnce: 1,
  O: 1
});
ScalaJS.is.sc_GenSet = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_GenSet)))
});
ScalaJS.as.sc_GenSet = (function(obj) {
  return ((ScalaJS.is.sc_GenSet(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.GenSet"))
});
ScalaJS.isArrayOf.sc_GenSet = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_GenSet)))
});
ScalaJS.asArrayOf.sc_GenSet = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_GenSet(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.GenSet;", depth))
});
ScalaJS.d.sc_GenSet = new ScalaJS.ClassTypeData({
  sc_GenSet: 0
}, true, "scala.collection.GenSet", (void 0), {
  sc_GenSet: 1,
  scg_GenericSetTemplate: 1,
  sc_GenIterable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  scg_HasNewBuilder: 1,
  sc_GenSetLike: 1,
  s_Equals: 1,
  F1: 1,
  sc_GenIterableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_GenTraversableOnce: 1,
  O: 1
});
ScalaJS.is.sc_GenTraversable = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_GenTraversable)))
});
ScalaJS.as.sc_GenTraversable = (function(obj) {
  return ((ScalaJS.is.sc_GenTraversable(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.GenTraversable"))
});
ScalaJS.isArrayOf.sc_GenTraversable = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_GenTraversable)))
});
ScalaJS.asArrayOf.sc_GenTraversable = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_GenTraversable(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.GenTraversable;", depth))
});
ScalaJS.d.sc_GenTraversable = new ScalaJS.ClassTypeData({
  sc_GenTraversable: 0
}, true, "scala.collection.GenTraversable", (void 0), {
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  scg_HasNewBuilder: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_GenTraversableOnce: 1,
  O: 1
});
ScalaJS.is.sc_GenTraversableOnce = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_GenTraversableOnce)))
});
ScalaJS.as.sc_GenTraversableOnce = (function(obj) {
  return ((ScalaJS.is.sc_GenTraversableOnce(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.GenTraversableOnce"))
});
ScalaJS.isArrayOf.sc_GenTraversableOnce = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_GenTraversableOnce)))
});
ScalaJS.asArrayOf.sc_GenTraversableOnce = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_GenTraversableOnce(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.GenTraversableOnce;", depth))
});
ScalaJS.d.sc_GenTraversableOnce = new ScalaJS.ClassTypeData({
  sc_GenTraversableOnce: 0
}, true, "scala.collection.GenTraversableOnce", (void 0), {
  sc_GenTraversableOnce: 1,
  O: 1
});
ScalaJS.is.sc_IndexedSeq = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_IndexedSeq)))
});
ScalaJS.as.sc_IndexedSeq = (function(obj) {
  return ((ScalaJS.is.sc_IndexedSeq(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.IndexedSeq"))
});
ScalaJS.isArrayOf.sc_IndexedSeq = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_IndexedSeq)))
});
ScalaJS.asArrayOf.sc_IndexedSeq = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_IndexedSeq(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.IndexedSeq;", depth))
});
ScalaJS.d.sc_IndexedSeq = new ScalaJS.ClassTypeData({
  sc_IndexedSeq: 0
}, true, "scala.collection.IndexedSeq", (void 0), {
  sc_IndexedSeq: 1,
  sc_IndexedSeqLike: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  s_PartialFunction: 1,
  F1: 1,
  O: 1
});
ScalaJS.is.sc_IndexedSeqLike = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_IndexedSeqLike)))
});
ScalaJS.as.sc_IndexedSeqLike = (function(obj) {
  return ((ScalaJS.is.sc_IndexedSeqLike(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.IndexedSeqLike"))
});
ScalaJS.isArrayOf.sc_IndexedSeqLike = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_IndexedSeqLike)))
});
ScalaJS.asArrayOf.sc_IndexedSeqLike = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_IndexedSeqLike(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.IndexedSeqLike;", depth))
});
ScalaJS.d.sc_IndexedSeqLike = new ScalaJS.ClassTypeData({
  sc_IndexedSeqLike: 0
}, true, "scala.collection.IndexedSeqLike", (void 0), {
  sc_IndexedSeqLike: 1,
  sc_SeqLike: 1,
  sc_GenSeqLike: 1,
  sc_IterableLike: 1,
  sc_GenIterableLike: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  s_Equals: 1,
  O: 1
});
ScalaJS.is.sc_Iterable = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_Iterable)))
});
ScalaJS.as.sc_Iterable = (function(obj) {
  return ((ScalaJS.is.sc_Iterable(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.Iterable"))
});
ScalaJS.isArrayOf.sc_Iterable = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_Iterable)))
});
ScalaJS.asArrayOf.sc_Iterable = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_Iterable(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.Iterable;", depth))
});
ScalaJS.d.sc_Iterable = new ScalaJS.ClassTypeData({
  sc_Iterable: 0
}, true, "scala.collection.Iterable", (void 0), {
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
/** @constructor */
ScalaJS.c.sc_Iterator$ = (function() {
  ScalaJS.c.O.call(this);
  this.empty$1 = null
});
ScalaJS.c.sc_Iterator$.prototype = new ScalaJS.h.O();
ScalaJS.c.sc_Iterator$.prototype.constructor = ScalaJS.c.sc_Iterator$;
/** @constructor */
ScalaJS.h.sc_Iterator$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sc_Iterator$.prototype = ScalaJS.c.sc_Iterator$.prototype;
ScalaJS.c.sc_Iterator$.prototype.init___ = (function() {
  ScalaJS.n.sc_Iterator = this;
  this.empty$1 = new ScalaJS.c.sc_Iterator$$anon$2().init___();
  return this
});
ScalaJS.is.sc_Iterator$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_Iterator$)))
});
ScalaJS.as.sc_Iterator$ = (function(obj) {
  return ((ScalaJS.is.sc_Iterator$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.Iterator$"))
});
ScalaJS.isArrayOf.sc_Iterator$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_Iterator$)))
});
ScalaJS.asArrayOf.sc_Iterator$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_Iterator$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.Iterator$;", depth))
});
ScalaJS.d.sc_Iterator$ = new ScalaJS.ClassTypeData({
  sc_Iterator$: 0
}, false, "scala.collection.Iterator$", ScalaJS.d.O, {
  sc_Iterator$: 1,
  O: 1
});
ScalaJS.c.sc_Iterator$.prototype.$classData = ScalaJS.d.sc_Iterator$;
ScalaJS.n.sc_Iterator = (void 0);
ScalaJS.m.sc_Iterator = (function() {
  if ((!ScalaJS.n.sc_Iterator)) {
    ScalaJS.n.sc_Iterator = new ScalaJS.c.sc_Iterator$().init___()
  };
  return ScalaJS.n.sc_Iterator
});
ScalaJS.is.sc_LinearSeq = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_LinearSeq)))
});
ScalaJS.as.sc_LinearSeq = (function(obj) {
  return ((ScalaJS.is.sc_LinearSeq(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.LinearSeq"))
});
ScalaJS.isArrayOf.sc_LinearSeq = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_LinearSeq)))
});
ScalaJS.asArrayOf.sc_LinearSeq = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_LinearSeq(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.LinearSeq;", depth))
});
ScalaJS.d.sc_LinearSeq = new ScalaJS.ClassTypeData({
  sc_LinearSeq: 0
}, true, "scala.collection.LinearSeq", (void 0), {
  sc_LinearSeq: 1,
  sc_LinearSeqLike: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  s_PartialFunction: 1,
  F1: 1,
  O: 1
});
ScalaJS.is.sc_LinearSeqLike = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_LinearSeqLike)))
});
ScalaJS.as.sc_LinearSeqLike = (function(obj) {
  return ((ScalaJS.is.sc_LinearSeqLike(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.LinearSeqLike"))
});
ScalaJS.isArrayOf.sc_LinearSeqLike = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_LinearSeqLike)))
});
ScalaJS.asArrayOf.sc_LinearSeqLike = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_LinearSeqLike(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.LinearSeqLike;", depth))
});
ScalaJS.d.sc_LinearSeqLike = new ScalaJS.ClassTypeData({
  sc_LinearSeqLike: 0
}, true, "scala.collection.LinearSeqLike", (void 0), {
  sc_LinearSeqLike: 1,
  sc_SeqLike: 1,
  sc_GenSeqLike: 1,
  sc_IterableLike: 1,
  sc_GenIterableLike: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  s_Equals: 1,
  O: 1
});
ScalaJS.is.sc_LinearSeqOptimized = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_LinearSeqOptimized)))
});
ScalaJS.as.sc_LinearSeqOptimized = (function(obj) {
  return ((ScalaJS.is.sc_LinearSeqOptimized(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.LinearSeqOptimized"))
});
ScalaJS.isArrayOf.sc_LinearSeqOptimized = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_LinearSeqOptimized)))
});
ScalaJS.asArrayOf.sc_LinearSeqOptimized = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_LinearSeqOptimized(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.LinearSeqOptimized;", depth))
});
ScalaJS.d.sc_LinearSeqOptimized = new ScalaJS.ClassTypeData({
  sc_LinearSeqOptimized: 0
}, true, "scala.collection.LinearSeqOptimized", (void 0), {
  sc_LinearSeqOptimized: 1,
  sc_LinearSeqLike: 1,
  sc_SeqLike: 1,
  sc_GenSeqLike: 1,
  sc_IterableLike: 1,
  sc_GenIterableLike: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  s_Equals: 1,
  O: 1
});
ScalaJS.is.sc_Seq = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_Seq)))
});
ScalaJS.as.sc_Seq = (function(obj) {
  return ((ScalaJS.is.sc_Seq(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.Seq"))
});
ScalaJS.isArrayOf.sc_Seq = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_Seq)))
});
ScalaJS.asArrayOf.sc_Seq = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_Seq(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.Seq;", depth))
});
ScalaJS.d.sc_Seq = new ScalaJS.ClassTypeData({
  sc_Seq: 0
}, true, "scala.collection.Seq", (void 0), {
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  s_PartialFunction: 1,
  F1: 1,
  O: 1
});
ScalaJS.is.sc_Set = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_Set)))
});
ScalaJS.as.sc_Set = (function(obj) {
  return ((ScalaJS.is.sc_Set(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.Set"))
});
ScalaJS.isArrayOf.sc_Set = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_Set)))
});
ScalaJS.asArrayOf.sc_Set = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_Set(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.Set;", depth))
});
ScalaJS.d.sc_Set = new ScalaJS.ClassTypeData({
  sc_Set: 0
}, true, "scala.collection.Set", (void 0), {
  sc_Set: 1,
  sc_SetLike: 1,
  scg_Subtractable: 1,
  sc_GenSet: 1,
  scg_GenericSetTemplate: 1,
  sc_GenSetLike: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  F1: 1,
  O: 1
});
ScalaJS.is.sc_TraversableOnce = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_TraversableOnce)))
});
ScalaJS.as.sc_TraversableOnce = (function(obj) {
  return ((ScalaJS.is.sc_TraversableOnce(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.TraversableOnce"))
});
ScalaJS.isArrayOf.sc_TraversableOnce = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_TraversableOnce)))
});
ScalaJS.asArrayOf.sc_TraversableOnce = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_TraversableOnce(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.TraversableOnce;", depth))
});
ScalaJS.d.sc_TraversableOnce = new ScalaJS.ClassTypeData({
  sc_TraversableOnce: 0
}, true, "scala.collection.TraversableOnce", (void 0), {
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  O: 1
});
/** @constructor */
ScalaJS.c.scg_GenMapFactory = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.scg_GenMapFactory.prototype = new ScalaJS.h.O();
ScalaJS.c.scg_GenMapFactory.prototype.constructor = ScalaJS.c.scg_GenMapFactory;
/** @constructor */
ScalaJS.h.scg_GenMapFactory = (function() {
  /*<skip>*/
});
ScalaJS.h.scg_GenMapFactory.prototype = ScalaJS.c.scg_GenMapFactory.prototype;
ScalaJS.is.scg_GenMapFactory = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scg_GenMapFactory)))
});
ScalaJS.as.scg_GenMapFactory = (function(obj) {
  return ((ScalaJS.is.scg_GenMapFactory(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.generic.GenMapFactory"))
});
ScalaJS.isArrayOf.scg_GenMapFactory = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scg_GenMapFactory)))
});
ScalaJS.asArrayOf.scg_GenMapFactory = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scg_GenMapFactory(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.generic.GenMapFactory;", depth))
});
ScalaJS.d.scg_GenMapFactory = new ScalaJS.ClassTypeData({
  scg_GenMapFactory: 0
}, false, "scala.collection.generic.GenMapFactory", ScalaJS.d.O, {
  scg_GenMapFactory: 1,
  O: 1
});
ScalaJS.c.scg_GenMapFactory.prototype.$classData = ScalaJS.d.scg_GenMapFactory;
/** @constructor */
ScalaJS.c.scg_GenTraversableFactory$GenericCanBuildFrom = (function() {
  ScalaJS.c.O.call(this);
  this.$$outer$f = null
});
ScalaJS.c.scg_GenTraversableFactory$GenericCanBuildFrom.prototype = new ScalaJS.h.O();
ScalaJS.c.scg_GenTraversableFactory$GenericCanBuildFrom.prototype.constructor = ScalaJS.c.scg_GenTraversableFactory$GenericCanBuildFrom;
/** @constructor */
ScalaJS.h.scg_GenTraversableFactory$GenericCanBuildFrom = (function() {
  /*<skip>*/
});
ScalaJS.h.scg_GenTraversableFactory$GenericCanBuildFrom.prototype = ScalaJS.c.scg_GenTraversableFactory$GenericCanBuildFrom.prototype;
ScalaJS.c.scg_GenTraversableFactory$GenericCanBuildFrom.prototype.apply__scm_Builder = (function() {
  return this.$$outer$f.newBuilder__scm_Builder()
});
ScalaJS.c.scg_GenTraversableFactory$GenericCanBuildFrom.prototype.apply__O__scm_Builder = (function(from) {
  var from$1 = ScalaJS.as.sc_GenTraversable(from);
  return from$1.companion__scg_GenericCompanion().newBuilder__scm_Builder()
});
ScalaJS.c.scg_GenTraversableFactory$GenericCanBuildFrom.prototype.init___scg_GenTraversableFactory = (function($$outer) {
  if (($$outer === null)) {
    throw new ScalaJS.c.jl_NullPointerException().init___()
  } else {
    this.$$outer$f = $$outer
  };
  return this
});
ScalaJS.is.scg_GenTraversableFactory$GenericCanBuildFrom = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scg_GenTraversableFactory$GenericCanBuildFrom)))
});
ScalaJS.as.scg_GenTraversableFactory$GenericCanBuildFrom = (function(obj) {
  return ((ScalaJS.is.scg_GenTraversableFactory$GenericCanBuildFrom(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.generic.GenTraversableFactory$GenericCanBuildFrom"))
});
ScalaJS.isArrayOf.scg_GenTraversableFactory$GenericCanBuildFrom = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scg_GenTraversableFactory$GenericCanBuildFrom)))
});
ScalaJS.asArrayOf.scg_GenTraversableFactory$GenericCanBuildFrom = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scg_GenTraversableFactory$GenericCanBuildFrom(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.generic.GenTraversableFactory$GenericCanBuildFrom;", depth))
});
ScalaJS.d.scg_GenTraversableFactory$GenericCanBuildFrom = new ScalaJS.ClassTypeData({
  scg_GenTraversableFactory$GenericCanBuildFrom: 0
}, false, "scala.collection.generic.GenTraversableFactory$GenericCanBuildFrom", ScalaJS.d.O, {
  scg_GenTraversableFactory$GenericCanBuildFrom: 1,
  scg_CanBuildFrom: 1,
  O: 1
});
ScalaJS.c.scg_GenTraversableFactory$GenericCanBuildFrom.prototype.$classData = ScalaJS.d.scg_GenTraversableFactory$GenericCanBuildFrom;
/** @constructor */
ScalaJS.c.scg_GenericCompanion = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.scg_GenericCompanion.prototype = new ScalaJS.h.O();
ScalaJS.c.scg_GenericCompanion.prototype.constructor = ScalaJS.c.scg_GenericCompanion;
/** @constructor */
ScalaJS.h.scg_GenericCompanion = (function() {
  /*<skip>*/
});
ScalaJS.h.scg_GenericCompanion.prototype = ScalaJS.c.scg_GenericCompanion.prototype;
ScalaJS.c.scg_GenericCompanion.prototype.empty__sc_GenTraversable = (function() {
  return ScalaJS.as.sc_GenTraversable(this.newBuilder__scm_Builder().result__O())
});
ScalaJS.is.scg_GenericCompanion = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scg_GenericCompanion)))
});
ScalaJS.as.scg_GenericCompanion = (function(obj) {
  return ((ScalaJS.is.scg_GenericCompanion(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.generic.GenericCompanion"))
});
ScalaJS.isArrayOf.scg_GenericCompanion = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scg_GenericCompanion)))
});
ScalaJS.asArrayOf.scg_GenericCompanion = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scg_GenericCompanion(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.generic.GenericCompanion;", depth))
});
ScalaJS.d.scg_GenericCompanion = new ScalaJS.ClassTypeData({
  scg_GenericCompanion: 0
}, false, "scala.collection.generic.GenericCompanion", ScalaJS.d.O, {
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.scg_GenericCompanion.prototype.$classData = ScalaJS.d.scg_GenericCompanion;
/** @constructor */
ScalaJS.c.sci_$colon$colon$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.sci_$colon$colon$.prototype = new ScalaJS.h.O();
ScalaJS.c.sci_$colon$colon$.prototype.constructor = ScalaJS.c.sci_$colon$colon$;
/** @constructor */
ScalaJS.h.sci_$colon$colon$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_$colon$colon$.prototype = ScalaJS.c.sci_$colon$colon$.prototype;
ScalaJS.c.sci_$colon$colon$.prototype.toString__T = (function() {
  return "::"
});
ScalaJS.is.sci_$colon$colon$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_$colon$colon$)))
});
ScalaJS.as.sci_$colon$colon$ = (function(obj) {
  return ((ScalaJS.is.sci_$colon$colon$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.$colon$colon$"))
});
ScalaJS.isArrayOf.sci_$colon$colon$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_$colon$colon$)))
});
ScalaJS.asArrayOf.sci_$colon$colon$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_$colon$colon$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.$colon$colon$;", depth))
});
ScalaJS.d.sci_$colon$colon$ = new ScalaJS.ClassTypeData({
  sci_$colon$colon$: 0
}, false, "scala.collection.immutable.$colon$colon$", ScalaJS.d.O, {
  sci_$colon$colon$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.sci_$colon$colon$.prototype.$classData = ScalaJS.d.sci_$colon$colon$;
ScalaJS.n.sci_$colon$colon = (void 0);
ScalaJS.m.sci_$colon$colon = (function() {
  if ((!ScalaJS.n.sci_$colon$colon)) {
    ScalaJS.n.sci_$colon$colon = new ScalaJS.c.sci_$colon$colon$().init___()
  };
  return ScalaJS.n.sci_$colon$colon
});
ScalaJS.is.sci_Iterable = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Iterable)))
});
ScalaJS.as.sci_Iterable = (function(obj) {
  return ((ScalaJS.is.sci_Iterable(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Iterable"))
});
ScalaJS.isArrayOf.sci_Iterable = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Iterable)))
});
ScalaJS.asArrayOf.sci_Iterable = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Iterable(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Iterable;", depth))
});
ScalaJS.d.sci_Iterable = new ScalaJS.ClassTypeData({
  sci_Iterable: 0
}, true, "scala.collection.immutable.Iterable", (void 0), {
  sci_Iterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
/** @constructor */
ScalaJS.c.sci_ListSet$ListSetBuilder = (function() {
  ScalaJS.c.O.call(this);
  this.elems$1 = null;
  this.seen$1 = null
});
ScalaJS.c.sci_ListSet$ListSetBuilder.prototype = new ScalaJS.h.O();
ScalaJS.c.sci_ListSet$ListSetBuilder.prototype.constructor = ScalaJS.c.sci_ListSet$ListSetBuilder;
/** @constructor */
ScalaJS.h.sci_ListSet$ListSetBuilder = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_ListSet$ListSetBuilder.prototype = ScalaJS.c.sci_ListSet$ListSetBuilder.prototype;
ScalaJS.c.sci_ListSet$ListSetBuilder.prototype.result__sci_ListSet = (function() {
  var this$2 = this.elems$1;
  var z = ScalaJS.m.sci_ListSet$EmptyListSet();
  var op = new ScalaJS.c.sjsr_AnonFunction2().init___sjs_js_Function2((function(x$1$2, x$2$2) {
    var x$1 = ScalaJS.as.sci_ListSet(x$1$2);
    return new ScalaJS.c.sci_ListSet$Node().init___sci_ListSet__O(x$1, x$2$2)
  }));
  var this$3 = this$2.scala$collection$mutable$ListBuffer$$start$6;
  return ScalaJS.as.sci_ListSet(ScalaJS.i.sc_LinearSeqOptimized$class__foldLeft__sc_LinearSeqOptimized__O__F2__O(this$3, z, op))
});
ScalaJS.c.sci_ListSet$ListSetBuilder.prototype.init___ = (function() {
  return (ScalaJS.c.sci_ListSet$ListSetBuilder.prototype.init___sci_ListSet.call(this, ScalaJS.m.sci_ListSet$EmptyListSet()), this)
});
ScalaJS.c.sci_ListSet$ListSetBuilder.prototype.$$plus$eq__O__scg_Growable = (function(elem) {
  return this.$$plus$eq__O__sci_ListSet$ListSetBuilder(elem)
});
ScalaJS.c.sci_ListSet$ListSetBuilder.prototype.init___sci_ListSet = (function(initial) {
  var this$1 = new ScalaJS.c.scm_ListBuffer().init___().$$plus$plus$eq__sc_TraversableOnce__scm_ListBuffer(initial);
  this.elems$1 = ScalaJS.as.scm_ListBuffer(ScalaJS.i.sc_SeqLike$class__reverse__sc_SeqLike__O(this$1));
  var this$2 = new ScalaJS.c.scm_HashSet().init___();
  this.seen$1 = ScalaJS.as.scm_HashSet(ScalaJS.i.scg_Growable$class__$plus$plus$eq__scg_Growable__sc_TraversableOnce__scg_Growable(this$2, initial));
  return this
});
ScalaJS.c.sci_ListSet$ListSetBuilder.prototype.result__O = (function() {
  return this.result__sci_ListSet()
});
ScalaJS.c.sci_ListSet$ListSetBuilder.prototype.sizeHintBounded__I__sc_TraversableLike__V = (function(size, boundingColl) {
  ScalaJS.i.scm_Builder$class__sizeHintBounded__scm_Builder__I__sc_TraversableLike__V(this, size, boundingColl)
});
ScalaJS.c.sci_ListSet$ListSetBuilder.prototype.$$plus$eq__O__scm_Builder = (function(elem) {
  return this.$$plus$eq__O__sci_ListSet$ListSetBuilder(elem)
});
ScalaJS.c.sci_ListSet$ListSetBuilder.prototype.sizeHint__I__V = (function(size) {
  /*<skip>*/
});
ScalaJS.c.sci_ListSet$ListSetBuilder.prototype.$$plus$eq__O__sci_ListSet$ListSetBuilder = (function(x) {
  var this$1 = this.seen$1;
  if ((!ScalaJS.i.scm_FlatHashTable$class__containsEntry__scm_FlatHashTable__O__Z(this$1, x))) {
    this.elems$1.$$plus$eq__O__scm_ListBuffer(x);
    this.seen$1.$$plus$eq__O__scm_HashSet(x)
  };
  return this
});
ScalaJS.c.sci_ListSet$ListSetBuilder.prototype.$$plus$plus$eq__sc_TraversableOnce__scg_Growable = (function(xs) {
  return ScalaJS.i.scg_Growable$class__$plus$plus$eq__scg_Growable__sc_TraversableOnce__scg_Growable(this, xs)
});
ScalaJS.is.sci_ListSet$ListSetBuilder = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_ListSet$ListSetBuilder)))
});
ScalaJS.as.sci_ListSet$ListSetBuilder = (function(obj) {
  return ((ScalaJS.is.sci_ListSet$ListSetBuilder(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.ListSet$ListSetBuilder"))
});
ScalaJS.isArrayOf.sci_ListSet$ListSetBuilder = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_ListSet$ListSetBuilder)))
});
ScalaJS.asArrayOf.sci_ListSet$ListSetBuilder = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_ListSet$ListSetBuilder(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.ListSet$ListSetBuilder;", depth))
});
ScalaJS.d.sci_ListSet$ListSetBuilder = new ScalaJS.ClassTypeData({
  sci_ListSet$ListSetBuilder: 0
}, false, "scala.collection.immutable.ListSet$ListSetBuilder", ScalaJS.d.O, {
  sci_ListSet$ListSetBuilder: 1,
  scm_Builder: 1,
  scg_Growable: 1,
  scg_Clearable: 1,
  O: 1
});
ScalaJS.c.sci_ListSet$ListSetBuilder.prototype.$classData = ScalaJS.d.sci_ListSet$ListSetBuilder;
/** @constructor */
ScalaJS.c.sci_Range$ = (function() {
  ScalaJS.c.O.call(this);
  this.MAX$undPRINT$1 = 0
});
ScalaJS.c.sci_Range$.prototype = new ScalaJS.h.O();
ScalaJS.c.sci_Range$.prototype.constructor = ScalaJS.c.sci_Range$;
/** @constructor */
ScalaJS.h.sci_Range$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Range$.prototype = ScalaJS.c.sci_Range$.prototype;
ScalaJS.c.sci_Range$.prototype.init___ = (function() {
  ScalaJS.n.sci_Range = this;
  this.MAX$undPRINT$1 = 512;
  return this
});
ScalaJS.is.sci_Range$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Range$)))
});
ScalaJS.as.sci_Range$ = (function(obj) {
  return ((ScalaJS.is.sci_Range$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Range$"))
});
ScalaJS.isArrayOf.sci_Range$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Range$)))
});
ScalaJS.asArrayOf.sci_Range$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Range$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Range$;", depth))
});
ScalaJS.d.sci_Range$ = new ScalaJS.ClassTypeData({
  sci_Range$: 0
}, false, "scala.collection.immutable.Range$", ScalaJS.d.O, {
  sci_Range$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.sci_Range$.prototype.$classData = ScalaJS.d.sci_Range$;
ScalaJS.n.sci_Range = (void 0);
ScalaJS.m.sci_Range = (function() {
  if ((!ScalaJS.n.sci_Range)) {
    ScalaJS.n.sci_Range = new ScalaJS.c.sci_Range$().init___()
  };
  return ScalaJS.n.sci_Range
});
/** @constructor */
ScalaJS.c.sci_Stream$$hash$colon$colon$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.sci_Stream$$hash$colon$colon$.prototype = new ScalaJS.h.O();
ScalaJS.c.sci_Stream$$hash$colon$colon$.prototype.constructor = ScalaJS.c.sci_Stream$$hash$colon$colon$;
/** @constructor */
ScalaJS.h.sci_Stream$$hash$colon$colon$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Stream$$hash$colon$colon$.prototype = ScalaJS.c.sci_Stream$$hash$colon$colon$.prototype;
ScalaJS.is.sci_Stream$$hash$colon$colon$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Stream$$hash$colon$colon$)))
});
ScalaJS.as.sci_Stream$$hash$colon$colon$ = (function(obj) {
  return ((ScalaJS.is.sci_Stream$$hash$colon$colon$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Stream$$hash$colon$colon$"))
});
ScalaJS.isArrayOf.sci_Stream$$hash$colon$colon$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Stream$$hash$colon$colon$)))
});
ScalaJS.asArrayOf.sci_Stream$$hash$colon$colon$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Stream$$hash$colon$colon$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Stream$$hash$colon$colon$;", depth))
});
ScalaJS.d.sci_Stream$$hash$colon$colon$ = new ScalaJS.ClassTypeData({
  sci_Stream$$hash$colon$colon$: 0
}, false, "scala.collection.immutable.Stream$$hash$colon$colon$", ScalaJS.d.O, {
  sci_Stream$$hash$colon$colon$: 1,
  O: 1
});
ScalaJS.c.sci_Stream$$hash$colon$colon$.prototype.$classData = ScalaJS.d.sci_Stream$$hash$colon$colon$;
ScalaJS.n.sci_Stream$$hash$colon$colon = (void 0);
ScalaJS.m.sci_Stream$$hash$colon$colon = (function() {
  if ((!ScalaJS.n.sci_Stream$$hash$colon$colon)) {
    ScalaJS.n.sci_Stream$$hash$colon$colon = new ScalaJS.c.sci_Stream$$hash$colon$colon$().init___()
  };
  return ScalaJS.n.sci_Stream$$hash$colon$colon
});
/** @constructor */
ScalaJS.c.sci_StreamIterator$LazyCell = (function() {
  ScalaJS.c.O.call(this);
  this.st$1 = null;
  this.v$1 = null;
  this.$$outer$f = null;
  this.bitmap$0$1 = false
});
ScalaJS.c.sci_StreamIterator$LazyCell.prototype = new ScalaJS.h.O();
ScalaJS.c.sci_StreamIterator$LazyCell.prototype.constructor = ScalaJS.c.sci_StreamIterator$LazyCell;
/** @constructor */
ScalaJS.h.sci_StreamIterator$LazyCell = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_StreamIterator$LazyCell.prototype = ScalaJS.c.sci_StreamIterator$LazyCell.prototype;
ScalaJS.c.sci_StreamIterator$LazyCell.prototype.init___sci_StreamIterator__F0 = (function($$outer, st) {
  this.st$1 = st;
  if (($$outer === null)) {
    throw new ScalaJS.c.jl_NullPointerException().init___()
  } else {
    this.$$outer$f = $$outer
  };
  return this
});
ScalaJS.c.sci_StreamIterator$LazyCell.prototype.v$lzycompute__p1__sci_Stream = (function() {
  if ((!this.bitmap$0$1)) {
    this.v$1 = ScalaJS.as.sci_Stream(this.st$1.apply__O());
    this.bitmap$0$1 = true
  };
  this.st$1 = null;
  return this.v$1
});
ScalaJS.c.sci_StreamIterator$LazyCell.prototype.v__sci_Stream = (function() {
  return ((!this.bitmap$0$1) ? this.v$lzycompute__p1__sci_Stream() : this.v$1)
});
ScalaJS.is.sci_StreamIterator$LazyCell = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_StreamIterator$LazyCell)))
});
ScalaJS.as.sci_StreamIterator$LazyCell = (function(obj) {
  return ((ScalaJS.is.sci_StreamIterator$LazyCell(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.StreamIterator$LazyCell"))
});
ScalaJS.isArrayOf.sci_StreamIterator$LazyCell = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_StreamIterator$LazyCell)))
});
ScalaJS.asArrayOf.sci_StreamIterator$LazyCell = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_StreamIterator$LazyCell(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.StreamIterator$LazyCell;", depth))
});
ScalaJS.d.sci_StreamIterator$LazyCell = new ScalaJS.ClassTypeData({
  sci_StreamIterator$LazyCell: 0
}, false, "scala.collection.immutable.StreamIterator$LazyCell", ScalaJS.d.O, {
  sci_StreamIterator$LazyCell: 1,
  O: 1
});
ScalaJS.c.sci_StreamIterator$LazyCell.prototype.$classData = ScalaJS.d.sci_StreamIterator$LazyCell;
/** @constructor */
ScalaJS.c.sci_StringOps = (function() {
  ScalaJS.c.O.call(this);
  this.repr$1 = null
});
ScalaJS.c.sci_StringOps.prototype = new ScalaJS.h.O();
ScalaJS.c.sci_StringOps.prototype.constructor = ScalaJS.c.sci_StringOps;
/** @constructor */
ScalaJS.h.sci_StringOps = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_StringOps.prototype = ScalaJS.c.sci_StringOps.prototype;
ScalaJS.c.sci_StringOps.prototype.seq__sc_TraversableOnce = (function() {
  var $$this = this.repr$1;
  return new ScalaJS.c.sci_WrappedString().init___T($$this)
});
ScalaJS.c.sci_StringOps.prototype.copyToArray__O__I__V = (function(xs, start) {
  ScalaJS.i.sc_TraversableOnce$class__copyToArray__sc_TraversableOnce__O__I__V(this, xs, start)
});
ScalaJS.c.sci_StringOps.prototype.apply__I__O = (function(idx) {
  return ScalaJS.bC(ScalaJS.m.sci_StringOps().apply$extension__T__I__C(this.repr$1, idx))
});
ScalaJS.c.sci_StringOps.prototype.lengthCompare__I__I = (function(len) {
  return ScalaJS.i.sc_IndexedSeqOptimized$class__lengthCompare__sc_IndexedSeqOptimized__I__I(this, len)
});
ScalaJS.c.sci_StringOps.prototype.sameElements__sc_GenIterable__Z = (function(that) {
  return ScalaJS.i.sc_IndexedSeqOptimized$class__sameElements__sc_IndexedSeqOptimized__sc_GenIterable__Z(this, that)
});
ScalaJS.c.sci_StringOps.prototype.isEmpty__Z = (function() {
  return ScalaJS.i.sc_IndexedSeqOptimized$class__isEmpty__sc_IndexedSeqOptimized__Z(this)
});
ScalaJS.c.sci_StringOps.prototype.thisCollection__sc_Traversable = (function() {
  var $$this = this.repr$1;
  return new ScalaJS.c.sci_WrappedString().init___T($$this)
});
ScalaJS.c.sci_StringOps.prototype.equals__O__Z = (function(x$1) {
  return ScalaJS.m.sci_StringOps().equals$extension__T__O__Z(this.repr$1, x$1)
});
ScalaJS.c.sci_StringOps.prototype.to__scg_CanBuildFrom__O = (function(cbf) {
  return ScalaJS.i.sc_TraversableLike$class__to__sc_TraversableLike__scg_CanBuildFrom__O(this, cbf)
});
ScalaJS.c.sci_StringOps.prototype.mkString__T__T__T__T = (function(start, sep, end) {
  return ScalaJS.i.sc_TraversableOnce$class__mkString__sc_TraversableOnce__T__T__T__T(this, start, sep, end)
});
ScalaJS.c.sci_StringOps.prototype.toString__T = (function() {
  var $$this = this.repr$1;
  return $$this
});
ScalaJS.c.sci_StringOps.prototype.foreach__F1__V = (function(f) {
  var i = 0;
  var len = ScalaJS.m.sci_StringOps().length$extension__T__I(this.repr$1);
  while ((i < len)) {
    var idx = i;
    f.apply__O__O(ScalaJS.bC(ScalaJS.m.sci_StringOps().apply$extension__T__I__C(this.repr$1, idx)));
    i = ((i + 1) | 0)
  }
});
ScalaJS.c.sci_StringOps.prototype.size__I = (function() {
  return ScalaJS.m.sci_StringOps().length$extension__T__I(this.repr$1)
});
ScalaJS.c.sci_StringOps.prototype.toBuffer__scm_Buffer = (function() {
  return ScalaJS.i.sc_IndexedSeqLike$class__toBuffer__sc_IndexedSeqLike__scm_Buffer(this)
});
ScalaJS.c.sci_StringOps.prototype.iterator__sc_Iterator = (function() {
  return new ScalaJS.c.sc_IndexedSeqLike$Elements().init___sc_IndexedSeqLike__I__I(this, 0, ScalaJS.m.sci_StringOps().length$extension__T__I(this.repr$1))
});
ScalaJS.c.sci_StringOps.prototype.length__I = (function() {
  return ScalaJS.m.sci_StringOps().length$extension__T__I(this.repr$1)
});
ScalaJS.c.sci_StringOps.prototype.toStream__sci_Stream = (function() {
  var this$1 = new ScalaJS.c.sc_IndexedSeqLike$Elements().init___sc_IndexedSeqLike__I__I(this, 0, ScalaJS.m.sci_StringOps().length$extension__T__I(this.repr$1));
  return ScalaJS.i.sc_Iterator$class__toStream__sc_Iterator__sci_Stream(this$1)
});
ScalaJS.c.sci_StringOps.prototype.addString__scm_StringBuilder__T__T__T__scm_StringBuilder = (function(b, start, sep, end) {
  return ScalaJS.i.sc_TraversableOnce$class__addString__sc_TraversableOnce__scm_StringBuilder__T__T__T__scm_StringBuilder(this, b, start, sep, end)
});
ScalaJS.c.sci_StringOps.prototype.repr__O = (function() {
  return this.repr$1
});
ScalaJS.c.sci_StringOps.prototype.$$div$colon__O__F2__O = (function(z, op) {
  var start = 0;
  var end = ScalaJS.m.sci_StringOps().length$extension__T__I(this.repr$1);
  var z$1 = z;
  tailCallLoop: while (true) {
    if ((start === end)) {
      return z$1
    } else {
      var temp$start = ((start + 1) | 0);
      var jsx$1 = z$1;
      var idx = start;
      var temp$z = op.apply__O__O__O(jsx$1, ScalaJS.bC(ScalaJS.m.sci_StringOps().apply$extension__T__I__C(this.repr$1, idx)));
      start = temp$start;
      z$1 = temp$z;
      continue tailCallLoop
    }
  }
});
ScalaJS.c.sci_StringOps.prototype.hashCode__I = (function() {
  return ScalaJS.m.sci_StringOps().hashCode$extension__T__I(this.repr$1)
});
ScalaJS.c.sci_StringOps.prototype.copyToArray__O__I__I__V = (function(xs, start, len) {
  ScalaJS.i.sc_IndexedSeqOptimized$class__copyToArray__sc_IndexedSeqOptimized__O__I__I__V(this, xs, start, len)
});
ScalaJS.c.sci_StringOps.prototype.isTraversableAgain__Z = (function() {
  return true
});
ScalaJS.c.sci_StringOps.prototype.init___T = (function(repr) {
  this.repr$1 = repr;
  return this
});
ScalaJS.c.sci_StringOps.prototype.toArray__s_reflect_ClassTag__O = (function(evidence$1) {
  return ScalaJS.i.sci_StringLike$class__toArray__sci_StringLike__s_reflect_ClassTag__O(this, evidence$1)
});
ScalaJS.c.sci_StringOps.prototype.newBuilder__scm_Builder = (function() {
  return (this.repr$1, new ScalaJS.c.scm_StringBuilder().init___())
});
ScalaJS.c.sci_StringOps.prototype.stringPrefix__T = (function() {
  return ScalaJS.i.sc_TraversableLike$class__stringPrefix__sc_TraversableLike__T(this)
});
ScalaJS.is.sci_StringOps = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_StringOps)))
});
ScalaJS.as.sci_StringOps = (function(obj) {
  return ((ScalaJS.is.sci_StringOps(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.StringOps"))
});
ScalaJS.isArrayOf.sci_StringOps = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_StringOps)))
});
ScalaJS.asArrayOf.sci_StringOps = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_StringOps(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.StringOps;", depth))
});
ScalaJS.d.sci_StringOps = new ScalaJS.ClassTypeData({
  sci_StringOps: 0
}, false, "scala.collection.immutable.StringOps", ScalaJS.d.O, {
  sci_StringOps: 1,
  sci_StringLike: 1,
  s_math_Ordered: 1,
  jl_Comparable: 1,
  sc_IndexedSeqOptimized: 1,
  sc_IndexedSeqLike: 1,
  sc_SeqLike: 1,
  sc_GenSeqLike: 1,
  sc_IterableLike: 1,
  sc_GenIterableLike: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  s_Equals: 1,
  O: 1
});
ScalaJS.c.sci_StringOps.prototype.$classData = ScalaJS.d.sci_StringOps;
/** @constructor */
ScalaJS.c.sci_StringOps$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.sci_StringOps$.prototype = new ScalaJS.h.O();
ScalaJS.c.sci_StringOps$.prototype.constructor = ScalaJS.c.sci_StringOps$;
/** @constructor */
ScalaJS.h.sci_StringOps$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_StringOps$.prototype = ScalaJS.c.sci_StringOps$.prototype;
ScalaJS.c.sci_StringOps$.prototype.equals$extension__T__O__Z = (function($$this, x$1) {
  if (ScalaJS.is.sci_StringOps(x$1)) {
    var StringOps$1 = ((x$1 === null) ? null : ScalaJS.as.sci_StringOps(x$1).repr$1);
    return ScalaJS.anyRefEqEq($$this, StringOps$1)
  } else {
    return false
  }
});
ScalaJS.c.sci_StringOps$.prototype.length$extension__T__I = (function($$this) {
  return ScalaJS.i.sjsr_RuntimeString$class__length__sjsr_RuntimeString__I($$this)
});
ScalaJS.c.sci_StringOps$.prototype.apply$extension__T__I__C = (function($$this, index) {
  return ScalaJS.i.sjsr_RuntimeString$class__charAt__sjsr_RuntimeString__I__C($$this, index)
});
ScalaJS.c.sci_StringOps$.prototype.hashCode$extension__T__I = (function($$this) {
  return ScalaJS.objectHashCode($$this)
});
ScalaJS.is.sci_StringOps$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_StringOps$)))
});
ScalaJS.as.sci_StringOps$ = (function(obj) {
  return ((ScalaJS.is.sci_StringOps$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.StringOps$"))
});
ScalaJS.isArrayOf.sci_StringOps$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_StringOps$)))
});
ScalaJS.asArrayOf.sci_StringOps$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_StringOps$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.StringOps$;", depth))
});
ScalaJS.d.sci_StringOps$ = new ScalaJS.ClassTypeData({
  sci_StringOps$: 0
}, false, "scala.collection.immutable.StringOps$", ScalaJS.d.O, {
  sci_StringOps$: 1,
  O: 1
});
ScalaJS.c.sci_StringOps$.prototype.$classData = ScalaJS.d.sci_StringOps$;
ScalaJS.n.sci_StringOps = (void 0);
ScalaJS.m.sci_StringOps = (function() {
  if ((!ScalaJS.n.sci_StringOps)) {
    ScalaJS.n.sci_StringOps = new ScalaJS.c.sci_StringOps$().init___()
  };
  return ScalaJS.n.sci_StringOps
});
/** @constructor */
ScalaJS.c.sci_VectorBuilder = (function() {
  ScalaJS.c.O.call(this);
  this.blockIndex$1 = 0;
  this.lo$1 = 0;
  this.depth$1 = 0;
  this.display0$1 = null;
  this.display1$1 = null;
  this.display2$1 = null;
  this.display3$1 = null;
  this.display4$1 = null;
  this.display5$1 = null
});
ScalaJS.c.sci_VectorBuilder.prototype = new ScalaJS.h.O();
ScalaJS.c.sci_VectorBuilder.prototype.constructor = ScalaJS.c.sci_VectorBuilder;
/** @constructor */
ScalaJS.h.sci_VectorBuilder = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_VectorBuilder.prototype = ScalaJS.c.sci_VectorBuilder.prototype;
ScalaJS.c.sci_VectorBuilder.prototype.display3__AO = (function() {
  return this.display3$1
});
ScalaJS.c.sci_VectorBuilder.prototype.init___ = (function() {
  this.display0$1 = ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [32]);
  this.depth$1 = 1;
  this.blockIndex$1 = 0;
  this.lo$1 = 0;
  return this
});
ScalaJS.c.sci_VectorBuilder.prototype.depth__I = (function() {
  return this.depth$1
});
ScalaJS.c.sci_VectorBuilder.prototype.$$plus$eq__O__scg_Growable = (function(elem) {
  return this.$$plus$eq__O__sci_VectorBuilder(elem)
});
ScalaJS.c.sci_VectorBuilder.prototype.display5$und$eq__AO__V = (function(x$1) {
  this.display5$1 = x$1
});
ScalaJS.c.sci_VectorBuilder.prototype.display0__AO = (function() {
  return this.display0$1
});
ScalaJS.c.sci_VectorBuilder.prototype.display4__AO = (function() {
  return this.display4$1
});
ScalaJS.c.sci_VectorBuilder.prototype.display2$und$eq__AO__V = (function(x$1) {
  this.display2$1 = x$1
});
ScalaJS.c.sci_VectorBuilder.prototype.$$plus$eq__O__sci_VectorBuilder = (function(elem) {
  if ((this.lo$1 >= this.display0$1.u["length"])) {
    var newBlockIndex = ((this.blockIndex$1 + 32) | 0);
    var xor = (this.blockIndex$1 ^ newBlockIndex);
    ScalaJS.i.sci_VectorPointer$class__gotoNextBlockStartWritable__sci_VectorPointer__I__I__V(this, newBlockIndex, xor);
    this.blockIndex$1 = newBlockIndex;
    this.lo$1 = 0
  };
  this.display0$1.u[this.lo$1] = elem;
  this.lo$1 = ((this.lo$1 + 1) | 0);
  return this
});
ScalaJS.c.sci_VectorBuilder.prototype.result__O = (function() {
  return this.result__sci_Vector()
});
ScalaJS.c.sci_VectorBuilder.prototype.display1$und$eq__AO__V = (function(x$1) {
  this.display1$1 = x$1
});
ScalaJS.c.sci_VectorBuilder.prototype.sizeHintBounded__I__sc_TraversableLike__V = (function(size, boundingColl) {
  ScalaJS.i.scm_Builder$class__sizeHintBounded__scm_Builder__I__sc_TraversableLike__V(this, size, boundingColl)
});
ScalaJS.c.sci_VectorBuilder.prototype.display4$und$eq__AO__V = (function(x$1) {
  this.display4$1 = x$1
});
ScalaJS.c.sci_VectorBuilder.prototype.display1__AO = (function() {
  return this.display1$1
});
ScalaJS.c.sci_VectorBuilder.prototype.display5__AO = (function() {
  return this.display5$1
});
ScalaJS.c.sci_VectorBuilder.prototype.result__sci_Vector = (function() {
  var size = ((this.blockIndex$1 + this.lo$1) | 0);
  if ((size === 0)) {
    var this$1 = ScalaJS.m.sci_Vector();
    return this$1.NIL$5
  };
  var s = new ScalaJS.c.sci_Vector().init___I__I__I(0, size, 0);
  var depth = this.depth$1;
  ScalaJS.i.sci_VectorPointer$class__initFrom__sci_VectorPointer__sci_VectorPointer__I__V(s, this, depth);
  if ((this.depth$1 > 1)) {
    var xor = ((size - 1) | 0);
    ScalaJS.i.sci_VectorPointer$class__gotoPos__sci_VectorPointer__I__I__V(s, 0, xor)
  };
  return s
});
ScalaJS.c.sci_VectorBuilder.prototype.$$plus$eq__O__scm_Builder = (function(elem) {
  return this.$$plus$eq__O__sci_VectorBuilder(elem)
});
ScalaJS.c.sci_VectorBuilder.prototype.sizeHint__I__V = (function(size) {
  /*<skip>*/
});
ScalaJS.c.sci_VectorBuilder.prototype.depth$und$eq__I__V = (function(x$1) {
  this.depth$1 = x$1
});
ScalaJS.c.sci_VectorBuilder.prototype.$$plus$plus$eq__sc_TraversableOnce__sci_VectorBuilder = (function(xs) {
  return ScalaJS.as.sci_VectorBuilder(ScalaJS.i.scg_Growable$class__$plus$plus$eq__scg_Growable__sc_TraversableOnce__scg_Growable(this, xs))
});
ScalaJS.c.sci_VectorBuilder.prototype.display2__AO = (function() {
  return this.display2$1
});
ScalaJS.c.sci_VectorBuilder.prototype.display0$und$eq__AO__V = (function(x$1) {
  this.display0$1 = x$1
});
ScalaJS.c.sci_VectorBuilder.prototype.$$plus$plus$eq__sc_TraversableOnce__scg_Growable = (function(xs) {
  return this.$$plus$plus$eq__sc_TraversableOnce__sci_VectorBuilder(xs)
});
ScalaJS.c.sci_VectorBuilder.prototype.display3$und$eq__AO__V = (function(x$1) {
  this.display3$1 = x$1
});
ScalaJS.is.sci_VectorBuilder = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_VectorBuilder)))
});
ScalaJS.as.sci_VectorBuilder = (function(obj) {
  return ((ScalaJS.is.sci_VectorBuilder(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.VectorBuilder"))
});
ScalaJS.isArrayOf.sci_VectorBuilder = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_VectorBuilder)))
});
ScalaJS.asArrayOf.sci_VectorBuilder = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_VectorBuilder(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.VectorBuilder;", depth))
});
ScalaJS.d.sci_VectorBuilder = new ScalaJS.ClassTypeData({
  sci_VectorBuilder: 0
}, false, "scala.collection.immutable.VectorBuilder", ScalaJS.d.O, {
  sci_VectorBuilder: 1,
  sci_VectorPointer: 1,
  scm_Builder: 1,
  scg_Growable: 1,
  scg_Clearable: 1,
  O: 1
});
ScalaJS.c.sci_VectorBuilder.prototype.$classData = ScalaJS.d.sci_VectorBuilder;
/** @constructor */
ScalaJS.c.sci_WrappedString$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.sci_WrappedString$.prototype = new ScalaJS.h.O();
ScalaJS.c.sci_WrappedString$.prototype.constructor = ScalaJS.c.sci_WrappedString$;
/** @constructor */
ScalaJS.h.sci_WrappedString$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_WrappedString$.prototype = ScalaJS.c.sci_WrappedString$.prototype;
ScalaJS.c.sci_WrappedString$.prototype.newBuilder__scm_Builder = (function() {
  var this$2 = new ScalaJS.c.scm_StringBuilder().init___();
  var f = new ScalaJS.c.sjsr_AnonFunction1().init___sjs_js_Function1((function(x$2) {
    var x = ScalaJS.as.T(x$2);
    return new ScalaJS.c.sci_WrappedString().init___T(x)
  }));
  return new ScalaJS.c.scm_Builder$$anon$1().init___scm_Builder__F1(this$2, f)
});
ScalaJS.is.sci_WrappedString$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_WrappedString$)))
});
ScalaJS.as.sci_WrappedString$ = (function(obj) {
  return ((ScalaJS.is.sci_WrappedString$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.WrappedString$"))
});
ScalaJS.isArrayOf.sci_WrappedString$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_WrappedString$)))
});
ScalaJS.asArrayOf.sci_WrappedString$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_WrappedString$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.WrappedString$;", depth))
});
ScalaJS.d.sci_WrappedString$ = new ScalaJS.ClassTypeData({
  sci_WrappedString$: 0
}, false, "scala.collection.immutable.WrappedString$", ScalaJS.d.O, {
  sci_WrappedString$: 1,
  O: 1
});
ScalaJS.c.sci_WrappedString$.prototype.$classData = ScalaJS.d.sci_WrappedString$;
ScalaJS.n.sci_WrappedString = (void 0);
ScalaJS.m.sci_WrappedString = (function() {
  if ((!ScalaJS.n.sci_WrappedString)) {
    ScalaJS.n.sci_WrappedString = new ScalaJS.c.sci_WrappedString$().init___()
  };
  return ScalaJS.n.sci_WrappedString
});
ScalaJS.is.scm_Buffer = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_Buffer)))
});
ScalaJS.as.scm_Buffer = (function(obj) {
  return ((ScalaJS.is.scm_Buffer(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.Buffer"))
});
ScalaJS.isArrayOf.scm_Buffer = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_Buffer)))
});
ScalaJS.asArrayOf.scm_Buffer = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_Buffer(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.Buffer;", depth))
});
ScalaJS.d.scm_Buffer = new ScalaJS.ClassTypeData({
  scm_Buffer: 0
}, true, "scala.collection.mutable.Buffer", (void 0), {
  scm_Buffer: 1,
  scm_BufferLike: 1,
  scg_Subtractable: 1,
  sc_script_Scriptable: 1,
  scg_Shrinkable: 1,
  scg_Growable: 1,
  scg_Clearable: 1,
  scm_Seq: 1,
  scm_SeqLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  scm_Iterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.is.scm_Builder = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_Builder)))
});
ScalaJS.as.scm_Builder = (function(obj) {
  return ((ScalaJS.is.scm_Builder(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.Builder"))
});
ScalaJS.isArrayOf.scm_Builder = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_Builder)))
});
ScalaJS.asArrayOf.scm_Builder = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_Builder(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.Builder;", depth))
});
ScalaJS.d.scm_Builder = new ScalaJS.ClassTypeData({
  scm_Builder: 0
}, true, "scala.collection.mutable.Builder", (void 0), {
  scm_Builder: 1,
  scg_Growable: 1,
  scg_Clearable: 1,
  O: 1
});
/** @constructor */
ScalaJS.c.scm_Builder$$anon$1 = (function() {
  ScalaJS.c.O.call(this);
  this.self$1 = null;
  this.f$1$1 = null
});
ScalaJS.c.scm_Builder$$anon$1.prototype = new ScalaJS.h.O();
ScalaJS.c.scm_Builder$$anon$1.prototype.constructor = ScalaJS.c.scm_Builder$$anon$1;
/** @constructor */
ScalaJS.h.scm_Builder$$anon$1 = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_Builder$$anon$1.prototype = ScalaJS.c.scm_Builder$$anon$1.prototype;
ScalaJS.c.scm_Builder$$anon$1.prototype.init___scm_Builder__F1 = (function($$outer, f$1) {
  this.f$1$1 = f$1;
  this.self$1 = $$outer;
  return this
});
ScalaJS.c.scm_Builder$$anon$1.prototype.equals__O__Z = (function(that) {
  return ScalaJS.i.s_Proxy$class__equals__s_Proxy__O__Z(this, that)
});
ScalaJS.c.scm_Builder$$anon$1.prototype.$$plus$eq__O__scg_Growable = (function(elem) {
  return this.$$plus$eq__O__scm_Builder$$anon$1(elem)
});
ScalaJS.c.scm_Builder$$anon$1.prototype.toString__T = (function() {
  return ScalaJS.i.s_Proxy$class__toString__s_Proxy__T(this)
});
ScalaJS.c.scm_Builder$$anon$1.prototype.$$plus$plus$eq__sc_TraversableOnce__scm_Builder$$anon$1 = (function(xs) {
  return (this.self$1.$$plus$plus$eq__sc_TraversableOnce__scg_Growable(xs), this)
});
ScalaJS.c.scm_Builder$$anon$1.prototype.result__O = (function() {
  return this.f$1$1.apply__O__O(this.self$1.result__O())
});
ScalaJS.c.scm_Builder$$anon$1.prototype.sizeHintBounded__I__sc_TraversableLike__V = (function(size, boundColl) {
  this.self$1.sizeHintBounded__I__sc_TraversableLike__V(size, boundColl)
});
ScalaJS.c.scm_Builder$$anon$1.prototype.$$plus$eq__O__scm_Builder$$anon$1 = (function(x) {
  return (this.self$1.$$plus$eq__O__scm_Builder(x), this)
});
ScalaJS.c.scm_Builder$$anon$1.prototype.$$plus$eq__O__scm_Builder = (function(elem) {
  return this.$$plus$eq__O__scm_Builder$$anon$1(elem)
});
ScalaJS.c.scm_Builder$$anon$1.prototype.hashCode__I = (function() {
  return ScalaJS.i.s_Proxy$class__hashCode__s_Proxy__I(this)
});
ScalaJS.c.scm_Builder$$anon$1.prototype.sizeHint__I__V = (function(size) {
  this.self$1.sizeHint__I__V(size)
});
ScalaJS.c.scm_Builder$$anon$1.prototype.$$plus$plus$eq__sc_TraversableOnce__scg_Growable = (function(xs) {
  return this.$$plus$plus$eq__sc_TraversableOnce__scm_Builder$$anon$1(xs)
});
ScalaJS.is.scm_Builder$$anon$1 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_Builder$$anon$1)))
});
ScalaJS.as.scm_Builder$$anon$1 = (function(obj) {
  return ((ScalaJS.is.scm_Builder$$anon$1(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.Builder$$anon$1"))
});
ScalaJS.isArrayOf.scm_Builder$$anon$1 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_Builder$$anon$1)))
});
ScalaJS.asArrayOf.scm_Builder$$anon$1 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_Builder$$anon$1(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.Builder$$anon$1;", depth))
});
ScalaJS.d.scm_Builder$$anon$1 = new ScalaJS.ClassTypeData({
  scm_Builder$$anon$1: 0
}, false, "scala.collection.mutable.Builder$$anon$1", ScalaJS.d.O, {
  scm_Builder$$anon$1: 1,
  s_Proxy: 1,
  scm_Builder: 1,
  scg_Growable: 1,
  scg_Clearable: 1,
  O: 1
});
ScalaJS.c.scm_Builder$$anon$1.prototype.$classData = ScalaJS.d.scm_Builder$$anon$1;
/** @constructor */
ScalaJS.c.scm_FlatHashTable$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.scm_FlatHashTable$.prototype = new ScalaJS.h.O();
ScalaJS.c.scm_FlatHashTable$.prototype.constructor = ScalaJS.c.scm_FlatHashTable$;
/** @constructor */
ScalaJS.h.scm_FlatHashTable$ = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_FlatHashTable$.prototype = ScalaJS.c.scm_FlatHashTable$.prototype;
ScalaJS.c.scm_FlatHashTable$.prototype.newThreshold__I__I__I = (function(_loadFactor, size) {
  var assertion = (_loadFactor < 500);
  if ((!assertion)) {
    throw new ScalaJS.c.jl_AssertionError().init___O(("assertion failed: " + "loadFactor too large; must be < 0.5"))
  };
  return ScalaJS.m.sjsr_RuntimeLong().fromInt__I__sjsr_RuntimeLong(size).$$times__sjsr_RuntimeLong__sjsr_RuntimeLong(ScalaJS.m.sjsr_RuntimeLong().fromInt__I__sjsr_RuntimeLong(_loadFactor)).$$div__sjsr_RuntimeLong__sjsr_RuntimeLong(ScalaJS.m.sjsr_RuntimeLong().fromInt__I__sjsr_RuntimeLong(1000)).toInt__I()
});
ScalaJS.is.scm_FlatHashTable$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_FlatHashTable$)))
});
ScalaJS.as.scm_FlatHashTable$ = (function(obj) {
  return ((ScalaJS.is.scm_FlatHashTable$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.FlatHashTable$"))
});
ScalaJS.isArrayOf.scm_FlatHashTable$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_FlatHashTable$)))
});
ScalaJS.asArrayOf.scm_FlatHashTable$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_FlatHashTable$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.FlatHashTable$;", depth))
});
ScalaJS.d.scm_FlatHashTable$ = new ScalaJS.ClassTypeData({
  scm_FlatHashTable$: 0
}, false, "scala.collection.mutable.FlatHashTable$", ScalaJS.d.O, {
  scm_FlatHashTable$: 1,
  O: 1
});
ScalaJS.c.scm_FlatHashTable$.prototype.$classData = ScalaJS.d.scm_FlatHashTable$;
ScalaJS.n.scm_FlatHashTable = (void 0);
ScalaJS.m.scm_FlatHashTable = (function() {
  if ((!ScalaJS.n.scm_FlatHashTable)) {
    ScalaJS.n.scm_FlatHashTable = new ScalaJS.c.scm_FlatHashTable$().init___()
  };
  return ScalaJS.n.scm_FlatHashTable
});
/** @constructor */
ScalaJS.c.scm_GrowingBuilder = (function() {
  ScalaJS.c.O.call(this);
  this.empty$1 = null;
  this.elems$1 = null
});
ScalaJS.c.scm_GrowingBuilder.prototype = new ScalaJS.h.O();
ScalaJS.c.scm_GrowingBuilder.prototype.constructor = ScalaJS.c.scm_GrowingBuilder;
/** @constructor */
ScalaJS.h.scm_GrowingBuilder = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_GrowingBuilder.prototype = ScalaJS.c.scm_GrowingBuilder.prototype;
ScalaJS.c.scm_GrowingBuilder.prototype.init___scg_Growable = (function(empty) {
  this.empty$1 = empty;
  this.elems$1 = empty;
  return this
});
ScalaJS.c.scm_GrowingBuilder.prototype.$$plus$eq__O__scm_GrowingBuilder = (function(x) {
  return (this.elems$1.$$plus$eq__O__scg_Growable(x), this)
});
ScalaJS.c.scm_GrowingBuilder.prototype.$$plus$eq__O__scg_Growable = (function(elem) {
  return this.$$plus$eq__O__scm_GrowingBuilder(elem)
});
ScalaJS.c.scm_GrowingBuilder.prototype.result__O = (function() {
  return this.elems$1
});
ScalaJS.c.scm_GrowingBuilder.prototype.sizeHintBounded__I__sc_TraversableLike__V = (function(size, boundingColl) {
  ScalaJS.i.scm_Builder$class__sizeHintBounded__scm_Builder__I__sc_TraversableLike__V(this, size, boundingColl)
});
ScalaJS.c.scm_GrowingBuilder.prototype.$$plus$eq__O__scm_Builder = (function(elem) {
  return this.$$plus$eq__O__scm_GrowingBuilder(elem)
});
ScalaJS.c.scm_GrowingBuilder.prototype.sizeHint__I__V = (function(size) {
  /*<skip>*/
});
ScalaJS.c.scm_GrowingBuilder.prototype.$$plus$plus$eq__sc_TraversableOnce__scg_Growable = (function(xs) {
  return ScalaJS.i.scg_Growable$class__$plus$plus$eq__scg_Growable__sc_TraversableOnce__scg_Growable(this, xs)
});
ScalaJS.is.scm_GrowingBuilder = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_GrowingBuilder)))
});
ScalaJS.as.scm_GrowingBuilder = (function(obj) {
  return ((ScalaJS.is.scm_GrowingBuilder(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.GrowingBuilder"))
});
ScalaJS.isArrayOf.scm_GrowingBuilder = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_GrowingBuilder)))
});
ScalaJS.asArrayOf.scm_GrowingBuilder = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_GrowingBuilder(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.GrowingBuilder;", depth))
});
ScalaJS.d.scm_GrowingBuilder = new ScalaJS.ClassTypeData({
  scm_GrowingBuilder: 0
}, false, "scala.collection.mutable.GrowingBuilder", ScalaJS.d.O, {
  scm_GrowingBuilder: 1,
  scm_Builder: 1,
  scg_Growable: 1,
  scg_Clearable: 1,
  O: 1
});
ScalaJS.c.scm_GrowingBuilder.prototype.$classData = ScalaJS.d.scm_GrowingBuilder;
/** @constructor */
ScalaJS.c.scm_HashTable$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.scm_HashTable$.prototype = new ScalaJS.h.O();
ScalaJS.c.scm_HashTable$.prototype.constructor = ScalaJS.c.scm_HashTable$;
/** @constructor */
ScalaJS.h.scm_HashTable$ = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_HashTable$.prototype = ScalaJS.c.scm_HashTable$.prototype;
ScalaJS.c.scm_HashTable$.prototype.powerOfTwo__I__I = (function(target) {
  var c = ((target - 1) | 0);
  c = (c | ((c >>> 1) | 0));
  c = (c | ((c >>> 2) | 0));
  c = (c | ((c >>> 4) | 0));
  c = (c | ((c >>> 8) | 0));
  c = (c | ((c >>> 16) | 0));
  return ((c + 1) | 0)
});
ScalaJS.is.scm_HashTable$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_HashTable$)))
});
ScalaJS.as.scm_HashTable$ = (function(obj) {
  return ((ScalaJS.is.scm_HashTable$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.HashTable$"))
});
ScalaJS.isArrayOf.scm_HashTable$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_HashTable$)))
});
ScalaJS.asArrayOf.scm_HashTable$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_HashTable$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.HashTable$;", depth))
});
ScalaJS.d.scm_HashTable$ = new ScalaJS.ClassTypeData({
  scm_HashTable$: 0
}, false, "scala.collection.mutable.HashTable$", ScalaJS.d.O, {
  scm_HashTable$: 1,
  O: 1
});
ScalaJS.c.scm_HashTable$.prototype.$classData = ScalaJS.d.scm_HashTable$;
ScalaJS.n.scm_HashTable = (void 0);
ScalaJS.m.scm_HashTable = (function() {
  if ((!ScalaJS.n.scm_HashTable)) {
    ScalaJS.n.scm_HashTable = new ScalaJS.c.scm_HashTable$().init___()
  };
  return ScalaJS.n.scm_HashTable
});
ScalaJS.is.scm_IndexedSeq = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_IndexedSeq)))
});
ScalaJS.as.scm_IndexedSeq = (function(obj) {
  return ((ScalaJS.is.scm_IndexedSeq(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.IndexedSeq"))
});
ScalaJS.isArrayOf.scm_IndexedSeq = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_IndexedSeq)))
});
ScalaJS.asArrayOf.scm_IndexedSeq = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_IndexedSeq(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.IndexedSeq;", depth))
});
ScalaJS.d.scm_IndexedSeq = new ScalaJS.ClassTypeData({
  scm_IndexedSeq: 0
}, true, "scala.collection.mutable.IndexedSeq", (void 0), {
  scm_IndexedSeq: 1,
  scm_IndexedSeqLike: 1,
  sc_IndexedSeq: 1,
  sc_IndexedSeqLike: 1,
  scm_Seq: 1,
  scm_SeqLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  scm_Iterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
/** @constructor */
ScalaJS.c.scm_LazyBuilder = (function() {
  ScalaJS.c.O.call(this);
  this.parts$1 = null
});
ScalaJS.c.scm_LazyBuilder.prototype = new ScalaJS.h.O();
ScalaJS.c.scm_LazyBuilder.prototype.constructor = ScalaJS.c.scm_LazyBuilder;
/** @constructor */
ScalaJS.h.scm_LazyBuilder = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_LazyBuilder.prototype = ScalaJS.c.scm_LazyBuilder.prototype;
ScalaJS.c.scm_LazyBuilder.prototype.init___ = (function() {
  this.parts$1 = new ScalaJS.c.scm_ListBuffer().init___();
  return this
});
ScalaJS.c.scm_LazyBuilder.prototype.$$plus$plus$eq__sc_TraversableOnce__scm_LazyBuilder = (function(xs) {
  return (this.parts$1.$$plus$eq__O__scm_ListBuffer(xs), this)
});
ScalaJS.c.scm_LazyBuilder.prototype.$$plus$eq__O__scg_Growable = (function(elem) {
  return this.$$plus$eq__O__scm_LazyBuilder(elem)
});
ScalaJS.c.scm_LazyBuilder.prototype.$$plus$eq__O__scm_LazyBuilder = (function(x) {
  var jsx$1 = this.parts$1;
  var xs = ScalaJS.m.s_Predef().genericWrapArray__O__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.O.getArrayOf(), [x]));
  jsx$1.$$plus$eq__O__scm_ListBuffer(ScalaJS.i.sc_TraversableOnce$class__toList__sc_TraversableOnce__sci_List(xs));
  return this
});
ScalaJS.c.scm_LazyBuilder.prototype.sizeHintBounded__I__sc_TraversableLike__V = (function(size, boundingColl) {
  ScalaJS.i.scm_Builder$class__sizeHintBounded__scm_Builder__I__sc_TraversableLike__V(this, size, boundingColl)
});
ScalaJS.c.scm_LazyBuilder.prototype.$$plus$eq__O__scm_Builder = (function(elem) {
  return this.$$plus$eq__O__scm_LazyBuilder(elem)
});
ScalaJS.c.scm_LazyBuilder.prototype.sizeHint__I__V = (function(size) {
  /*<skip>*/
});
ScalaJS.c.scm_LazyBuilder.prototype.$$plus$plus$eq__sc_TraversableOnce__scg_Growable = (function(xs) {
  return this.$$plus$plus$eq__sc_TraversableOnce__scm_LazyBuilder(xs)
});
ScalaJS.is.scm_LazyBuilder = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_LazyBuilder)))
});
ScalaJS.as.scm_LazyBuilder = (function(obj) {
  return ((ScalaJS.is.scm_LazyBuilder(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.LazyBuilder"))
});
ScalaJS.isArrayOf.scm_LazyBuilder = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_LazyBuilder)))
});
ScalaJS.asArrayOf.scm_LazyBuilder = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_LazyBuilder(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.LazyBuilder;", depth))
});
ScalaJS.d.scm_LazyBuilder = new ScalaJS.ClassTypeData({
  scm_LazyBuilder: 0
}, false, "scala.collection.mutable.LazyBuilder", ScalaJS.d.O, {
  scm_LazyBuilder: 1,
  scm_Builder: 1,
  scg_Growable: 1,
  scg_Clearable: 1,
  O: 1
});
ScalaJS.c.scm_LazyBuilder.prototype.$classData = ScalaJS.d.scm_LazyBuilder;
ScalaJS.is.scm_Set = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_Set)))
});
ScalaJS.as.scm_Set = (function(obj) {
  return ((ScalaJS.is.scm_Set(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.Set"))
});
ScalaJS.isArrayOf.scm_Set = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_Set)))
});
ScalaJS.asArrayOf.scm_Set = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_Set(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.Set;", depth))
});
ScalaJS.d.scm_Set = new ScalaJS.ClassTypeData({
  scm_Set: 0
}, true, "scala.collection.mutable.Set", (void 0), {
  scm_Set: 1,
  scm_SetLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  scg_Shrinkable: 1,
  scm_Builder: 1,
  scg_Growable: 1,
  scg_Clearable: 1,
  sc_script_Scriptable: 1,
  sc_Set: 1,
  sc_SetLike: 1,
  scg_Subtractable: 1,
  sc_GenSet: 1,
  scg_GenericSetTemplate: 1,
  sc_GenSetLike: 1,
  F1: 1,
  scm_Iterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
/** @constructor */
ScalaJS.c.scm_SetBuilder = (function() {
  ScalaJS.c.O.call(this);
  this.empty$1 = null;
  this.elems$1 = null
});
ScalaJS.c.scm_SetBuilder.prototype = new ScalaJS.h.O();
ScalaJS.c.scm_SetBuilder.prototype.constructor = ScalaJS.c.scm_SetBuilder;
/** @constructor */
ScalaJS.h.scm_SetBuilder = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_SetBuilder.prototype = ScalaJS.c.scm_SetBuilder.prototype;
ScalaJS.c.scm_SetBuilder.prototype.$$plus$eq__O__scg_Growable = (function(elem) {
  return this.$$plus$eq__O__scm_SetBuilder(elem)
});
ScalaJS.c.scm_SetBuilder.prototype.result__O = (function() {
  return this.elems$1
});
ScalaJS.c.scm_SetBuilder.prototype.$$plus$eq__O__scm_SetBuilder = (function(x) {
  this.elems$1 = this.elems$1.$$plus__O__sc_Set(x);
  return this
});
ScalaJS.c.scm_SetBuilder.prototype.sizeHintBounded__I__sc_TraversableLike__V = (function(size, boundingColl) {
  ScalaJS.i.scm_Builder$class__sizeHintBounded__scm_Builder__I__sc_TraversableLike__V(this, size, boundingColl)
});
ScalaJS.c.scm_SetBuilder.prototype.init___sc_Set = (function(empty) {
  this.empty$1 = empty;
  this.elems$1 = empty;
  return this
});
ScalaJS.c.scm_SetBuilder.prototype.$$plus$eq__O__scm_Builder = (function(elem) {
  return this.$$plus$eq__O__scm_SetBuilder(elem)
});
ScalaJS.c.scm_SetBuilder.prototype.sizeHint__I__V = (function(size) {
  /*<skip>*/
});
ScalaJS.c.scm_SetBuilder.prototype.$$plus$plus$eq__sc_TraversableOnce__scg_Growable = (function(xs) {
  return ScalaJS.i.scg_Growable$class__$plus$plus$eq__scg_Growable__sc_TraversableOnce__scg_Growable(this, xs)
});
ScalaJS.is.scm_SetBuilder = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_SetBuilder)))
});
ScalaJS.as.scm_SetBuilder = (function(obj) {
  return ((ScalaJS.is.scm_SetBuilder(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.SetBuilder"))
});
ScalaJS.isArrayOf.scm_SetBuilder = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_SetBuilder)))
});
ScalaJS.asArrayOf.scm_SetBuilder = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_SetBuilder(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.SetBuilder;", depth))
});
ScalaJS.d.scm_SetBuilder = new ScalaJS.ClassTypeData({
  scm_SetBuilder: 0
}, false, "scala.collection.mutable.SetBuilder", ScalaJS.d.O, {
  scm_SetBuilder: 1,
  scm_Builder: 1,
  scg_Growable: 1,
  scg_Clearable: 1,
  O: 1
});
ScalaJS.c.scm_SetBuilder.prototype.$classData = ScalaJS.d.scm_SetBuilder;
/** @constructor */
ScalaJS.c.scm_StringBuilder$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.scm_StringBuilder$.prototype = new ScalaJS.h.O();
ScalaJS.c.scm_StringBuilder$.prototype.constructor = ScalaJS.c.scm_StringBuilder$;
/** @constructor */
ScalaJS.h.scm_StringBuilder$ = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_StringBuilder$.prototype = ScalaJS.c.scm_StringBuilder$.prototype;
ScalaJS.is.scm_StringBuilder$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_StringBuilder$)))
});
ScalaJS.as.scm_StringBuilder$ = (function(obj) {
  return ((ScalaJS.is.scm_StringBuilder$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.StringBuilder$"))
});
ScalaJS.isArrayOf.scm_StringBuilder$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_StringBuilder$)))
});
ScalaJS.asArrayOf.scm_StringBuilder$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_StringBuilder$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.StringBuilder$;", depth))
});
ScalaJS.d.scm_StringBuilder$ = new ScalaJS.ClassTypeData({
  scm_StringBuilder$: 0
}, false, "scala.collection.mutable.StringBuilder$", ScalaJS.d.O, {
  scm_StringBuilder$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.scm_StringBuilder$.prototype.$classData = ScalaJS.d.scm_StringBuilder$;
ScalaJS.n.scm_StringBuilder = (void 0);
ScalaJS.m.scm_StringBuilder = (function() {
  if ((!ScalaJS.n.scm_StringBuilder)) {
    ScalaJS.n.scm_StringBuilder = new ScalaJS.c.scm_StringBuilder$().init___()
  };
  return ScalaJS.n.scm_StringBuilder
});
/** @constructor */
ScalaJS.c.scm_WrappedArray$ = (function() {
  ScalaJS.c.O.call(this);
  this.EmptyWrappedArray$1 = null
});
ScalaJS.c.scm_WrappedArray$.prototype = new ScalaJS.h.O();
ScalaJS.c.scm_WrappedArray$.prototype.constructor = ScalaJS.c.scm_WrappedArray$;
/** @constructor */
ScalaJS.h.scm_WrappedArray$ = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_WrappedArray$.prototype = ScalaJS.c.scm_WrappedArray$.prototype;
ScalaJS.c.scm_WrappedArray$.prototype.init___ = (function() {
  ScalaJS.n.scm_WrappedArray = this;
  this.EmptyWrappedArray$1 = new ScalaJS.c.scm_WrappedArray$ofRef().init___AO(ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [0]));
  return this
});
ScalaJS.c.scm_WrappedArray$.prototype.make__O__scm_WrappedArray = (function(x) {
  if ((null === x)) {
    return null
  } else if (ScalaJS.isArrayOf.O(x, 1)) {
    var x3 = ScalaJS.asArrayOf.O(x, 1);
    return new ScalaJS.c.scm_WrappedArray$ofRef().init___AO(x3)
  } else if (ScalaJS.isArrayOf.I(x, 1)) {
    var x4 = ScalaJS.asArrayOf.I(x, 1);
    return new ScalaJS.c.scm_WrappedArray$ofInt().init___AI(x4)
  } else if (ScalaJS.isArrayOf.D(x, 1)) {
    var x5 = ScalaJS.asArrayOf.D(x, 1);
    return new ScalaJS.c.scm_WrappedArray$ofDouble().init___AD(x5)
  } else if (ScalaJS.isArrayOf.J(x, 1)) {
    var x6 = ScalaJS.asArrayOf.J(x, 1);
    return new ScalaJS.c.scm_WrappedArray$ofLong().init___AJ(x6)
  } else if (ScalaJS.isArrayOf.F(x, 1)) {
    var x7 = ScalaJS.asArrayOf.F(x, 1);
    return new ScalaJS.c.scm_WrappedArray$ofFloat().init___AF(x7)
  } else if (ScalaJS.isArrayOf.C(x, 1)) {
    var x8 = ScalaJS.asArrayOf.C(x, 1);
    return new ScalaJS.c.scm_WrappedArray$ofChar().init___AC(x8)
  } else if (ScalaJS.isArrayOf.B(x, 1)) {
    var x9 = ScalaJS.asArrayOf.B(x, 1);
    return new ScalaJS.c.scm_WrappedArray$ofByte().init___AB(x9)
  } else if (ScalaJS.isArrayOf.S(x, 1)) {
    var x10 = ScalaJS.asArrayOf.S(x, 1);
    return new ScalaJS.c.scm_WrappedArray$ofShort().init___AS(x10)
  } else if (ScalaJS.isArrayOf.Z(x, 1)) {
    var x11 = ScalaJS.asArrayOf.Z(x, 1);
    return new ScalaJS.c.scm_WrappedArray$ofBoolean().init___AZ(x11)
  } else if (ScalaJS.isArrayOf.sr_BoxedUnit(x, 1)) {
    var x12 = ScalaJS.asArrayOf.sr_BoxedUnit(x, 1);
    return new ScalaJS.c.scm_WrappedArray$ofUnit().init___Asr_BoxedUnit(x12)
  } else {
    throw new ScalaJS.c.s_MatchError().init___O(x)
  }
});
ScalaJS.is.scm_WrappedArray$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_WrappedArray$)))
});
ScalaJS.as.scm_WrappedArray$ = (function(obj) {
  return ((ScalaJS.is.scm_WrappedArray$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.WrappedArray$"))
});
ScalaJS.isArrayOf.scm_WrappedArray$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_WrappedArray$)))
});
ScalaJS.asArrayOf.scm_WrappedArray$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_WrappedArray$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.WrappedArray$;", depth))
});
ScalaJS.d.scm_WrappedArray$ = new ScalaJS.ClassTypeData({
  scm_WrappedArray$: 0
}, false, "scala.collection.mutable.WrappedArray$", ScalaJS.d.O, {
  scm_WrappedArray$: 1,
  O: 1
});
ScalaJS.c.scm_WrappedArray$.prototype.$classData = ScalaJS.d.scm_WrappedArray$;
ScalaJS.n.scm_WrappedArray = (void 0);
ScalaJS.m.scm_WrappedArray = (function() {
  if ((!ScalaJS.n.scm_WrappedArray)) {
    ScalaJS.n.scm_WrappedArray = new ScalaJS.c.scm_WrappedArray$().init___()
  };
  return ScalaJS.n.scm_WrappedArray
});
/** @constructor */
ScalaJS.c.scm_WrappedArrayBuilder = (function() {
  ScalaJS.c.O.call(this);
  this.tag$1 = null;
  this.manifest$1 = null;
  this.elems$1 = null;
  this.capacity$1 = 0;
  this.size$1 = 0
});
ScalaJS.c.scm_WrappedArrayBuilder.prototype = new ScalaJS.h.O();
ScalaJS.c.scm_WrappedArrayBuilder.prototype.constructor = ScalaJS.c.scm_WrappedArrayBuilder;
/** @constructor */
ScalaJS.h.scm_WrappedArrayBuilder = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_WrappedArrayBuilder.prototype = ScalaJS.c.scm_WrappedArrayBuilder.prototype;
ScalaJS.c.scm_WrappedArrayBuilder.prototype.init___s_reflect_ClassTag = (function(tag) {
  this.tag$1 = tag;
  this.manifest$1 = tag;
  this.capacity$1 = 0;
  this.size$1 = 0;
  return this
});
ScalaJS.c.scm_WrappedArrayBuilder.prototype.ensureSize__p1__I__V = (function(size) {
  if ((this.capacity$1 < size)) {
    var newsize = ((this.capacity$1 === 0) ? 16 : ScalaJS.imul(this.capacity$1, 2));
    while ((newsize < size)) {
      newsize = ScalaJS.imul(newsize, 2)
    };
    this.resize__p1__I__V(newsize)
  }
});
ScalaJS.c.scm_WrappedArrayBuilder.prototype.$$plus$eq__O__scg_Growable = (function(elem) {
  return this.$$plus$eq__O__scm_WrappedArrayBuilder(elem)
});
ScalaJS.c.scm_WrappedArrayBuilder.prototype.$$plus$eq__O__scm_WrappedArrayBuilder = (function(elem) {
  this.ensureSize__p1__I__V(((this.size$1 + 1) | 0));
  this.elems$1.update__I__O__V(this.size$1, elem);
  this.size$1 = ((this.size$1 + 1) | 0);
  return this
});
ScalaJS.c.scm_WrappedArrayBuilder.prototype.mkArray__p1__I__scm_WrappedArray = (function(size) {
  var runtimeClass = ScalaJS.m.sr_ScalaRunTime().arrayElementClass__O__jl_Class(this.tag$1);
  var newelems = (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Byte().TYPE$1, runtimeClass) ? new ScalaJS.c.scm_WrappedArray$ofByte().init___AB(ScalaJS.newArrayObject(ScalaJS.d.B.getArrayOf(), [size])) : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Short().TYPE$1, runtimeClass) ? new ScalaJS.c.scm_WrappedArray$ofShort().init___AS(ScalaJS.newArrayObject(ScalaJS.d.S.getArrayOf(), [size])) : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Character().TYPE$1, runtimeClass) ? new ScalaJS.c.scm_WrappedArray$ofChar().init___AC(ScalaJS.newArrayObject(ScalaJS.d.C.getArrayOf(), [size])) : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Integer().TYPE$1, runtimeClass) ? new ScalaJS.c.scm_WrappedArray$ofInt().init___AI(ScalaJS.newArrayObject(ScalaJS.d.I.getArrayOf(), [size])) : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Long().TYPE$1, runtimeClass) ? new ScalaJS.c.scm_WrappedArray$ofLong().init___AJ(ScalaJS.newArrayObject(ScalaJS.d.J.getArrayOf(), [size])) : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Float().TYPE$1, runtimeClass) ? new ScalaJS.c.scm_WrappedArray$ofFloat().init___AF(ScalaJS.newArrayObject(ScalaJS.d.F.getArrayOf(), [size])) : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Double().TYPE$1, runtimeClass) ? new ScalaJS.c.scm_WrappedArray$ofDouble().init___AD(ScalaJS.newArrayObject(ScalaJS.d.D.getArrayOf(), [size])) : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Boolean().TYPE$1, runtimeClass) ? new ScalaJS.c.scm_WrappedArray$ofBoolean().init___AZ(ScalaJS.newArrayObject(ScalaJS.d.Z.getArrayOf(), [size])) : (ScalaJS.anyRefEqEq(ScalaJS.m.jl_Void().TYPE$1, runtimeClass) ? new ScalaJS.c.scm_WrappedArray$ofUnit().init___Asr_BoxedUnit(ScalaJS.newArrayObject(ScalaJS.d.sr_BoxedUnit.getArrayOf(), [size])) : new ScalaJS.c.scm_WrappedArray$ofRef().init___AO(ScalaJS.asArrayOf.O(this.tag$1.newArray__I__O(size), 1)))))))))));
  if ((this.size$1 > 0)) {
    ScalaJS.m.s_Array().copy__O__I__O__I__I__V(this.elems$1.array__O(), 0, newelems.array__O(), 0, this.size$1)
  };
  return newelems
});
ScalaJS.c.scm_WrappedArrayBuilder.prototype.result__O = (function() {
  return this.result__scm_WrappedArray()
});
ScalaJS.c.scm_WrappedArrayBuilder.prototype.sizeHintBounded__I__sc_TraversableLike__V = (function(size, boundingColl) {
  ScalaJS.i.scm_Builder$class__sizeHintBounded__scm_Builder__I__sc_TraversableLike__V(this, size, boundingColl)
});
ScalaJS.c.scm_WrappedArrayBuilder.prototype.resize__p1__I__V = (function(size) {
  this.elems$1 = this.mkArray__p1__I__scm_WrappedArray(size);
  this.capacity$1 = size
});
ScalaJS.c.scm_WrappedArrayBuilder.prototype.result__scm_WrappedArray = (function() {
  return (((this.capacity$1 !== 0) && (this.capacity$1 === this.size$1)) ? this.elems$1 : this.mkArray__p1__I__scm_WrappedArray(this.size$1))
});
ScalaJS.c.scm_WrappedArrayBuilder.prototype.$$plus$eq__O__scm_Builder = (function(elem) {
  return this.$$plus$eq__O__scm_WrappedArrayBuilder(elem)
});
ScalaJS.c.scm_WrappedArrayBuilder.prototype.sizeHint__I__V = (function(size) {
  if ((this.capacity$1 < size)) {
    this.resize__p1__I__V(size)
  }
});
ScalaJS.c.scm_WrappedArrayBuilder.prototype.$$plus$plus$eq__sc_TraversableOnce__scg_Growable = (function(xs) {
  return ScalaJS.i.scg_Growable$class__$plus$plus$eq__scg_Growable__sc_TraversableOnce__scg_Growable(this, xs)
});
ScalaJS.is.scm_WrappedArrayBuilder = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_WrappedArrayBuilder)))
});
ScalaJS.as.scm_WrappedArrayBuilder = (function(obj) {
  return ((ScalaJS.is.scm_WrappedArrayBuilder(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.WrappedArrayBuilder"))
});
ScalaJS.isArrayOf.scm_WrappedArrayBuilder = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_WrappedArrayBuilder)))
});
ScalaJS.asArrayOf.scm_WrappedArrayBuilder = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_WrappedArrayBuilder(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.WrappedArrayBuilder;", depth))
});
ScalaJS.d.scm_WrappedArrayBuilder = new ScalaJS.ClassTypeData({
  scm_WrappedArrayBuilder: 0
}, false, "scala.collection.mutable.WrappedArrayBuilder", ScalaJS.d.O, {
  scm_WrappedArrayBuilder: 1,
  scm_Builder: 1,
  scg_Growable: 1,
  scg_Clearable: 1,
  O: 1
});
ScalaJS.c.scm_WrappedArrayBuilder.prototype.$classData = ScalaJS.d.scm_WrappedArrayBuilder;
/** @constructor */
ScalaJS.c.sjsr_RuntimeLong$ = (function() {
  ScalaJS.c.O.call(this);
  this.BITS$1 = 0;
  this.BITS01$1 = 0;
  this.BITS2$1 = 0;
  this.MASK$1 = 0;
  this.MASK$und2$1 = 0;
  this.SIGN$undBIT$1 = 0;
  this.SIGN$undBIT$undVALUE$1 = 0;
  this.TWO$undPWR$und15$undDBL$1 = 0.0;
  this.TWO$undPWR$und16$undDBL$1 = 0.0;
  this.TWO$undPWR$und22$undDBL$1 = 0.0;
  this.TWO$undPWR$und31$undDBL$1 = 0.0;
  this.TWO$undPWR$und32$undDBL$1 = 0.0;
  this.TWO$undPWR$und44$undDBL$1 = 0.0;
  this.TWO$undPWR$und63$undDBL$1 = 0.0;
  this.zero$1 = null;
  this.one$1 = null;
  this.MinValue$1 = null;
  this.MaxValue$1 = null
});
ScalaJS.c.sjsr_RuntimeLong$.prototype = new ScalaJS.h.O();
ScalaJS.c.sjsr_RuntimeLong$.prototype.constructor = ScalaJS.c.sjsr_RuntimeLong$;
/** @constructor */
ScalaJS.h.sjsr_RuntimeLong$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sjsr_RuntimeLong$.prototype = ScalaJS.c.sjsr_RuntimeLong$.prototype;
ScalaJS.c.sjsr_RuntimeLong$.prototype.init___ = (function() {
  ScalaJS.n.sjsr_RuntimeLong = this;
  this.zero$1 = (ScalaJS.m.sjsr_RuntimeLong(), new ScalaJS.c.sjsr_RuntimeLong().init___I__I__I(0, 0, 0));
  this.one$1 = (ScalaJS.m.sjsr_RuntimeLong(), new ScalaJS.c.sjsr_RuntimeLong().init___I__I__I(1, 0, 0));
  this.MinValue$1 = (ScalaJS.m.sjsr_RuntimeLong(), new ScalaJS.c.sjsr_RuntimeLong().init___I__I__I(0, 0, 524288));
  this.MaxValue$1 = (ScalaJS.m.sjsr_RuntimeLong(), new ScalaJS.c.sjsr_RuntimeLong().init___I__I__I(4194303, 4194303, 524287));
  return this
});
ScalaJS.c.sjsr_RuntimeLong$.prototype.fromDouble__D__sjsr_RuntimeLong = (function(value) {
  if (ScalaJS.m.jl_Double().isNaN__D__Z(value)) {
    return this.zero$1
  } else if ((value < -9.223372036854776E18)) {
    return this.MinValue$1
  } else if ((value >= 9.223372036854776E18)) {
    return this.MaxValue$1
  } else if ((value < 0)) {
    return this.fromDouble__D__sjsr_RuntimeLong((-value)).unary$und$minus__sjsr_RuntimeLong()
  } else {
    var acc = value;
    var a2 = ((acc >= 1.7592186044416E13) ? ((acc / 1.7592186044416E13) | 0) : 0);
    acc = (acc - (a2 * 1.7592186044416E13));
    var a1 = ((acc >= 4194304.0) ? ((acc / 4194304.0) | 0) : 0);
    acc = (acc - (a1 * 4194304.0));
    var a0 = (acc | 0);
    ScalaJS.m.sjsr_RuntimeLong();
    return new ScalaJS.c.sjsr_RuntimeLong().init___I__I__I(a0, a1, a2)
  }
});
ScalaJS.c.sjsr_RuntimeLong$.prototype.zero__sjsr_RuntimeLong = (function() {
  return this.zero$1
});
ScalaJS.c.sjsr_RuntimeLong$.prototype.scala$scalajs$runtime$RuntimeLong$$divModHelper__sjsr_RuntimeLong__sjsr_RuntimeLong__Z__Z__Z__sjs_js_Array = (function(x, y, xNegative, yNegative, xMinValue) {
  var shift = ((y.numberOfLeadingZeros__I() - x.numberOfLeadingZeros__I()) | 0);
  var yShift = y.$$less$less__I__sjsr_RuntimeLong(shift);
  var absQuotRem = this.divide0$1__p1__I__sjsr_RuntimeLong__sjsr_RuntimeLong__sjsr_RuntimeLong__sjs_js_Array(shift, yShift, x, this.zero$1);
  var absQuot = ScalaJS.as.sjsr_RuntimeLong(absQuotRem[0]);
  var absRem = ScalaJS.as.sjsr_RuntimeLong(absQuotRem[1]);
  var quot = ((!(!(xNegative ^ yNegative))) ? absQuot.unary$und$minus__sjsr_RuntimeLong() : absQuot);
  if ((xNegative && xMinValue)) {
    var this$1 = absRem.unary$und$minus__sjsr_RuntimeLong();
    var y$1 = this.one$1;
    var rem = this$1.$$plus__sjsr_RuntimeLong__sjsr_RuntimeLong(y$1.unary$und$minus__sjsr_RuntimeLong())
  } else {
    var rem = (xNegative ? absRem.unary$und$minus__sjsr_RuntimeLong() : absRem)
  };
  return [quot, rem]
});
ScalaJS.c.sjsr_RuntimeLong$.prototype.masked__I__I__I__sjsr_RuntimeLong = (function(l, m, h) {
  ScalaJS.m.sjsr_RuntimeLong();
  var l$1 = (l & 4194303);
  var m$1 = (m & 4194303);
  var h$1 = (h & 1048575);
  return new ScalaJS.c.sjsr_RuntimeLong().init___I__I__I(l$1, m$1, h$1)
});
ScalaJS.c.sjsr_RuntimeLong$.prototype.divide0$1__p1__I__sjsr_RuntimeLong__sjsr_RuntimeLong__sjsr_RuntimeLong__sjs_js_Array = (function(shift, yShift, curX, quot) {
  tailCallLoop: while (true) {
    if (((shift < 0) || curX.scala$scalajs$runtime$RuntimeLong$$isZero__Z())) {
      return [quot, curX]
    } else {
      var this$1 = curX;
      var y = yShift;
      var newX = this$1.$$plus__sjsr_RuntimeLong__sjsr_RuntimeLong(y.unary$und$minus__sjsr_RuntimeLong());
      if ((!newX.scala$scalajs$runtime$RuntimeLong$$isNegative__Z())) {
        var temp$shift = ((shift - 1) | 0);
        var temp$yShift = yShift.$$greater$greater__I__sjsr_RuntimeLong(1);
        var temp$quot = quot.scala$scalajs$runtime$RuntimeLong$$setBit__I__sjsr_RuntimeLong(shift);
        shift = temp$shift;
        yShift = temp$yShift;
        curX = newX;
        quot = temp$quot;
        continue tailCallLoop
      } else {
        var temp$shift$2 = ((shift - 1) | 0);
        var temp$yShift$2 = yShift.$$greater$greater__I__sjsr_RuntimeLong(1);
        shift = temp$shift$2;
        yShift = temp$yShift$2;
        continue tailCallLoop
      }
    }
  }
});
ScalaJS.c.sjsr_RuntimeLong$.prototype.fromInt__I__sjsr_RuntimeLong = (function(value) {
  var a0 = (value & 4194303);
  var a1 = ((value >> 22) & 4194303);
  var a2 = ((value < 0) ? 1048575 : 0);
  ScalaJS.m.sjsr_RuntimeLong();
  return new ScalaJS.c.sjsr_RuntimeLong().init___I__I__I(a0, a1, a2)
});
ScalaJS.is.sjsr_RuntimeLong$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sjsr_RuntimeLong$)))
});
ScalaJS.as.sjsr_RuntimeLong$ = (function(obj) {
  return ((ScalaJS.is.sjsr_RuntimeLong$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.scalajs.runtime.RuntimeLong$"))
});
ScalaJS.isArrayOf.sjsr_RuntimeLong$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sjsr_RuntimeLong$)))
});
ScalaJS.asArrayOf.sjsr_RuntimeLong$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sjsr_RuntimeLong$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.scalajs.runtime.RuntimeLong$;", depth))
});
ScalaJS.d.sjsr_RuntimeLong$ = new ScalaJS.ClassTypeData({
  sjsr_RuntimeLong$: 0
}, false, "scala.scalajs.runtime.RuntimeLong$", ScalaJS.d.O, {
  sjsr_RuntimeLong$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.sjsr_RuntimeLong$.prototype.$classData = ScalaJS.d.sjsr_RuntimeLong$;
ScalaJS.n.sjsr_RuntimeLong = (void 0);
ScalaJS.m.sjsr_RuntimeLong = (function() {
  if ((!ScalaJS.n.sjsr_RuntimeLong)) {
    ScalaJS.n.sjsr_RuntimeLong = new ScalaJS.c.sjsr_RuntimeLong$().init___()
  };
  return ScalaJS.n.sjsr_RuntimeLong
});
/** @constructor */
ScalaJS.c.sjsr_RuntimeString$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.sjsr_RuntimeString$.prototype = new ScalaJS.h.O();
ScalaJS.c.sjsr_RuntimeString$.prototype.constructor = ScalaJS.c.sjsr_RuntimeString$;
/** @constructor */
ScalaJS.h.sjsr_RuntimeString$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sjsr_RuntimeString$.prototype = ScalaJS.c.sjsr_RuntimeString$.prototype;
ScalaJS.c.sjsr_RuntimeString$.prototype.valueOf__O__T = (function(value) {
  return ((value === null) ? "null" : ScalaJS.objectToString(value))
});
ScalaJS.c.sjsr_RuntimeString$.prototype.valueOf__I__T = (function(value) {
  return value.toString()
});
ScalaJS.c.sjsr_RuntimeString$.prototype.valueOf__Z__T = (function(value) {
  return value.toString()
});
ScalaJS.c.sjsr_RuntimeString$.prototype.format__T__AO__T = (function(format, args) {
  var frm = new ScalaJS.c.ju_Formatter().init___();
  var res = frm.format__T__AO__ju_Formatter(format, args).toString__T();
  frm.close__V();
  return res
});
ScalaJS.is.sjsr_RuntimeString$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sjsr_RuntimeString$)))
});
ScalaJS.as.sjsr_RuntimeString$ = (function(obj) {
  return ((ScalaJS.is.sjsr_RuntimeString$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.scalajs.runtime.RuntimeString$"))
});
ScalaJS.isArrayOf.sjsr_RuntimeString$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sjsr_RuntimeString$)))
});
ScalaJS.asArrayOf.sjsr_RuntimeString$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sjsr_RuntimeString$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.scalajs.runtime.RuntimeString$;", depth))
});
ScalaJS.d.sjsr_RuntimeString$ = new ScalaJS.ClassTypeData({
  sjsr_RuntimeString$: 0
}, false, "scala.scalajs.runtime.RuntimeString$", ScalaJS.d.O, {
  sjsr_RuntimeString$: 1,
  O: 1
});
ScalaJS.c.sjsr_RuntimeString$.prototype.$classData = ScalaJS.d.sjsr_RuntimeString$;
ScalaJS.n.sjsr_RuntimeString = (void 0);
ScalaJS.m.sjsr_RuntimeString = (function() {
  if ((!ScalaJS.n.sjsr_RuntimeString)) {
    ScalaJS.n.sjsr_RuntimeString = new ScalaJS.c.sjsr_RuntimeString$().init___()
  };
  return ScalaJS.n.sjsr_RuntimeString
});
/** @constructor */
ScalaJS.c.sjsr_StackTrace$ = (function() {
  ScalaJS.c.O.call(this);
  this.isRhino$1 = false;
  this.decompressedClasses$1 = null;
  this.decompressedPrefixes$1 = null;
  this.compressedPrefixes$1 = null;
  this.bitmap$0$1 = false
});
ScalaJS.c.sjsr_StackTrace$.prototype = new ScalaJS.h.O();
ScalaJS.c.sjsr_StackTrace$.prototype.constructor = ScalaJS.c.sjsr_StackTrace$;
/** @constructor */
ScalaJS.h.sjsr_StackTrace$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sjsr_StackTrace$.prototype = ScalaJS.c.sjsr_StackTrace$.prototype;
ScalaJS.c.sjsr_StackTrace$.prototype.init___ = (function() {
  ScalaJS.n.sjsr_StackTrace = this;
  var dict = {
    "O": "java_lang_Object",
    "T": "java_lang_String",
    "V": "scala_Unit",
    "Z": "scala_Boolean",
    "C": "scala_Char",
    "B": "scala_Byte",
    "S": "scala_Short",
    "I": "scala_Int",
    "J": "scala_Long",
    "F": "scala_Float",
    "D": "scala_Double"
  };
  var index = 0;
  while ((index <= 22)) {
    if ((index >= 2)) {
      dict[("T" + index)] = ("scala_Tuple" + index)
    };
    dict[("F" + index)] = ("scala_Function" + index);
    index = ((index + 1) | 0)
  };
  this.decompressedClasses$1 = dict;
  this.decompressedPrefixes$1 = {
    "sjsr_": "scala_scalajs_runtime_",
    "sjs_": "scala_scalajs_",
    "sci_": "scala_collection_immutable_",
    "scm_": "scala_collection_mutable_",
    "scg_": "scala_collection_generic_",
    "sc_": "scala_collection_",
    "sr_": "scala_runtime_",
    "s_": "scala_",
    "jl_": "java_lang_",
    "ju_": "java_util_"
  };
  this.compressedPrefixes$1 = ScalaJS.g["Object"]["keys"](this.decompressedPrefixes$1);
  return this
});
ScalaJS.c.sjsr_StackTrace$.prototype.createException__p1__sjs_js_Any = (function() {
  try {
    return this["undef"]()
  } catch (ex) {
    ex = ScalaJS.wrapJavaScriptException(ex);
    var ex6 = ex;
    if (ScalaJS.is.sjs_js_JavaScriptException(ex6)) {
      var x5 = ScalaJS.as.sjs_js_JavaScriptException(ex6);
      var e = x5.exception$4;
      return e
    } else {
      throw ScalaJS.unwrapJavaScriptException(ex6)
    }
  }
});
ScalaJS.c.sjsr_StackTrace$.prototype.captureState__jl_Throwable__sjs_js_Any__V = (function(throwable, e) {
  throwable["stackdata"] = e
});
ScalaJS.is.sjsr_StackTrace$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sjsr_StackTrace$)))
});
ScalaJS.as.sjsr_StackTrace$ = (function(obj) {
  return ((ScalaJS.is.sjsr_StackTrace$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.scalajs.runtime.StackTrace$"))
});
ScalaJS.isArrayOf.sjsr_StackTrace$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sjsr_StackTrace$)))
});
ScalaJS.asArrayOf.sjsr_StackTrace$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sjsr_StackTrace$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.scalajs.runtime.StackTrace$;", depth))
});
ScalaJS.d.sjsr_StackTrace$ = new ScalaJS.ClassTypeData({
  sjsr_StackTrace$: 0
}, false, "scala.scalajs.runtime.StackTrace$", ScalaJS.d.O, {
  sjsr_StackTrace$: 1,
  O: 1
});
ScalaJS.c.sjsr_StackTrace$.prototype.$classData = ScalaJS.d.sjsr_StackTrace$;
ScalaJS.n.sjsr_StackTrace = (void 0);
ScalaJS.m.sjsr_StackTrace = (function() {
  if ((!ScalaJS.n.sjsr_StackTrace)) {
    ScalaJS.n.sjsr_StackTrace = new ScalaJS.c.sjsr_StackTrace$().init___()
  };
  return ScalaJS.n.sjsr_StackTrace
});
/** @constructor */
ScalaJS.c.sr_AbstractFunction0 = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.sr_AbstractFunction0.prototype = new ScalaJS.h.O();
ScalaJS.c.sr_AbstractFunction0.prototype.constructor = ScalaJS.c.sr_AbstractFunction0;
/** @constructor */
ScalaJS.h.sr_AbstractFunction0 = (function() {
  /*<skip>*/
});
ScalaJS.h.sr_AbstractFunction0.prototype = ScalaJS.c.sr_AbstractFunction0.prototype;
ScalaJS.c.sr_AbstractFunction0.prototype.toString__T = (function() {
  return "<function0>"
});
ScalaJS.is.sr_AbstractFunction0 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sr_AbstractFunction0)))
});
ScalaJS.as.sr_AbstractFunction0 = (function(obj) {
  return ((ScalaJS.is.sr_AbstractFunction0(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.runtime.AbstractFunction0"))
});
ScalaJS.isArrayOf.sr_AbstractFunction0 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sr_AbstractFunction0)))
});
ScalaJS.asArrayOf.sr_AbstractFunction0 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sr_AbstractFunction0(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.runtime.AbstractFunction0;", depth))
});
ScalaJS.d.sr_AbstractFunction0 = new ScalaJS.ClassTypeData({
  sr_AbstractFunction0: 0
}, false, "scala.runtime.AbstractFunction0", ScalaJS.d.O, {
  sr_AbstractFunction0: 1,
  F0: 1,
  O: 1
});
ScalaJS.c.sr_AbstractFunction0.prototype.$classData = ScalaJS.d.sr_AbstractFunction0;
/** @constructor */
ScalaJS.c.sr_AbstractFunction1 = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.sr_AbstractFunction1.prototype = new ScalaJS.h.O();
ScalaJS.c.sr_AbstractFunction1.prototype.constructor = ScalaJS.c.sr_AbstractFunction1;
/** @constructor */
ScalaJS.h.sr_AbstractFunction1 = (function() {
  /*<skip>*/
});
ScalaJS.h.sr_AbstractFunction1.prototype = ScalaJS.c.sr_AbstractFunction1.prototype;
ScalaJS.c.sr_AbstractFunction1.prototype.toString__T = (function() {
  return "<function1>"
});
ScalaJS.is.sr_AbstractFunction1 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sr_AbstractFunction1)))
});
ScalaJS.as.sr_AbstractFunction1 = (function(obj) {
  return ((ScalaJS.is.sr_AbstractFunction1(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.runtime.AbstractFunction1"))
});
ScalaJS.isArrayOf.sr_AbstractFunction1 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sr_AbstractFunction1)))
});
ScalaJS.asArrayOf.sr_AbstractFunction1 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sr_AbstractFunction1(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.runtime.AbstractFunction1;", depth))
});
ScalaJS.d.sr_AbstractFunction1 = new ScalaJS.ClassTypeData({
  sr_AbstractFunction1: 0
}, false, "scala.runtime.AbstractFunction1", ScalaJS.d.O, {
  sr_AbstractFunction1: 1,
  F1: 1,
  O: 1
});
ScalaJS.c.sr_AbstractFunction1.prototype.$classData = ScalaJS.d.sr_AbstractFunction1;
/** @constructor */
ScalaJS.c.sr_AbstractFunction2 = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.sr_AbstractFunction2.prototype = new ScalaJS.h.O();
ScalaJS.c.sr_AbstractFunction2.prototype.constructor = ScalaJS.c.sr_AbstractFunction2;
/** @constructor */
ScalaJS.h.sr_AbstractFunction2 = (function() {
  /*<skip>*/
});
ScalaJS.h.sr_AbstractFunction2.prototype = ScalaJS.c.sr_AbstractFunction2.prototype;
ScalaJS.c.sr_AbstractFunction2.prototype.toString__T = (function() {
  return "<function2>"
});
ScalaJS.is.sr_AbstractFunction2 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sr_AbstractFunction2)))
});
ScalaJS.as.sr_AbstractFunction2 = (function(obj) {
  return ((ScalaJS.is.sr_AbstractFunction2(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.runtime.AbstractFunction2"))
});
ScalaJS.isArrayOf.sr_AbstractFunction2 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sr_AbstractFunction2)))
});
ScalaJS.asArrayOf.sr_AbstractFunction2 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sr_AbstractFunction2(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.runtime.AbstractFunction2;", depth))
});
ScalaJS.d.sr_AbstractFunction2 = new ScalaJS.ClassTypeData({
  sr_AbstractFunction2: 0
}, false, "scala.runtime.AbstractFunction2", ScalaJS.d.O, {
  sr_AbstractFunction2: 1,
  F2: 1,
  O: 1
});
ScalaJS.c.sr_AbstractFunction2.prototype.$classData = ScalaJS.d.sr_AbstractFunction2;
/** @constructor */
ScalaJS.c.sr_BooleanRef = (function() {
  ScalaJS.c.O.call(this);
  this.elem$1 = false
});
ScalaJS.c.sr_BooleanRef.prototype = new ScalaJS.h.O();
ScalaJS.c.sr_BooleanRef.prototype.constructor = ScalaJS.c.sr_BooleanRef;
/** @constructor */
ScalaJS.h.sr_BooleanRef = (function() {
  /*<skip>*/
});
ScalaJS.h.sr_BooleanRef.prototype = ScalaJS.c.sr_BooleanRef.prototype;
ScalaJS.c.sr_BooleanRef.prototype.toString__T = (function() {
  return ScalaJS.m.sjsr_RuntimeString().valueOf__Z__T(this.elem$1)
});
ScalaJS.c.sr_BooleanRef.prototype.init___Z = (function(elem) {
  this.elem$1 = elem;
  return this
});
ScalaJS.is.sr_BooleanRef = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sr_BooleanRef)))
});
ScalaJS.as.sr_BooleanRef = (function(obj) {
  return ((ScalaJS.is.sr_BooleanRef(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.runtime.BooleanRef"))
});
ScalaJS.isArrayOf.sr_BooleanRef = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sr_BooleanRef)))
});
ScalaJS.asArrayOf.sr_BooleanRef = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sr_BooleanRef(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.runtime.BooleanRef;", depth))
});
ScalaJS.d.sr_BooleanRef = new ScalaJS.ClassTypeData({
  sr_BooleanRef: 0
}, false, "scala.runtime.BooleanRef", ScalaJS.d.O, {
  sr_BooleanRef: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.sr_BooleanRef.prototype.$classData = ScalaJS.d.sr_BooleanRef;
ScalaJS.isArrayOf.sr_BoxedUnit = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sr_BoxedUnit)))
});
ScalaJS.asArrayOf.sr_BoxedUnit = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sr_BoxedUnit(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.runtime.BoxedUnit;", depth))
});
ScalaJS.d.sr_BoxedUnit = new ScalaJS.ClassTypeData({
  sr_BoxedUnit: 0
}, false, "scala.runtime.BoxedUnit", (void 0), {
  sr_BoxedUnit: 1,
  O: 1
}, (function(x) {
  return (x === (void 0))
}));
/** @constructor */
ScalaJS.c.sr_BoxesRunTime$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.sr_BoxesRunTime$.prototype = new ScalaJS.h.O();
ScalaJS.c.sr_BoxesRunTime$.prototype.constructor = ScalaJS.c.sr_BoxesRunTime$;
/** @constructor */
ScalaJS.h.sr_BoxesRunTime$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sr_BoxesRunTime$.prototype = ScalaJS.c.sr_BoxesRunTime$.prototype;
ScalaJS.c.sr_BoxesRunTime$.prototype.equalsCharObject__jl_Character__O__Z = (function(xc, y) {
  if (ScalaJS.is.jl_Character(y)) {
    var x2 = ScalaJS.as.jl_Character(y);
    return (xc.value$1 === x2.value$1)
  } else if (ScalaJS.is.jl_Number(y)) {
    var x3 = ScalaJS.as.jl_Number(y);
    return this.equalsNumChar__p1__jl_Number__jl_Character__Z(x3, xc)
  } else {
    return ((xc === null) ? (y === null) : xc.equals__O__Z(y))
  }
});
ScalaJS.c.sr_BoxesRunTime$.prototype.equalsNumObject__jl_Number__O__Z = (function(xn, y) {
  if (ScalaJS.is.jl_Number(y)) {
    var x2 = ScalaJS.as.jl_Number(y);
    return this.equalsNumNum__jl_Number__jl_Number__Z(xn, x2)
  } else if (ScalaJS.is.jl_Character(y)) {
    var x3 = ScalaJS.as.jl_Character(y);
    return this.equalsNumChar__p1__jl_Number__jl_Character__Z(xn, x3)
  } else {
    return ((xn === null) ? (y === null) : ScalaJS.objectEquals(xn, y))
  }
});
ScalaJS.c.sr_BoxesRunTime$.prototype.equals__O__O__Z = (function(x, y) {
  return ((x === y) || this.equals2__O__O__Z(x, y))
});
ScalaJS.c.sr_BoxesRunTime$.prototype.eqTypeCode__p1__jl_Number__I = (function(a) {
  return (ScalaJS.isInt(a) ? ScalaJS.m.sr_BoxesRunTime$Codes().INT$1 : (ScalaJS.isByte(a) ? ScalaJS.m.sr_BoxesRunTime$Codes().INT$1 : (ScalaJS.is.sjsr_RuntimeLong(a) ? ScalaJS.m.sr_BoxesRunTime$Codes().LONG$1 : ((typeof(a) === "number") ? ScalaJS.m.sr_BoxesRunTime$Codes().DOUBLE$1 : (ScalaJS.isShort(a) ? ScalaJS.m.sr_BoxesRunTime$Codes().INT$1 : ((typeof(a) === "number") ? ScalaJS.m.sr_BoxesRunTime$Codes().FLOAT$1 : ScalaJS.m.sr_BoxesRunTime$Codes().OTHER$1))))))
});
ScalaJS.c.sr_BoxesRunTime$.prototype.hashFromFloat__jl_Float__I = (function(n) {
  var iv = ScalaJS.numberIntValue(n);
  var fv = ScalaJS.numberFloatValue(n);
  var lv = ScalaJS.numberLongValue(n);
  return ((iv === fv) ? iv : ((lv.toDouble__D() === fv) ? ScalaJS.objectHashCode((ScalaJS.m.jl_Long(), lv)) : ScalaJS.objectHashCode(n)))
});
ScalaJS.c.sr_BoxesRunTime$.prototype.hashFromLong__jl_Long__I = (function(n) {
  var iv = ScalaJS.numberIntValue(n);
  return (ScalaJS.m.sjsr_RuntimeLong().fromInt__I__sjsr_RuntimeLong(iv).equals__O__Z(ScalaJS.numberLongValue(n)) ? iv : ScalaJS.objectHashCode(n))
});
ScalaJS.c.sr_BoxesRunTime$.prototype.hashFromNumber__jl_Number__I = (function(n) {
  if (ScalaJS.is.sjsr_RuntimeLong(n)) {
    var x2 = ScalaJS.as.sjsr_RuntimeLong(n);
    return this.hashFromLong__jl_Long__I(x2)
  } else if ((typeof(n) === "number")) {
    var x3 = ScalaJS.asDouble(n);
    return this.hashFromDouble__jl_Double__I(x3)
  } else if ((typeof(n) === "number")) {
    var x4 = ScalaJS.asFloat(n);
    return this.hashFromFloat__jl_Float__I(x4)
  } else {
    return ScalaJS.objectHashCode(n)
  }
});
ScalaJS.c.sr_BoxesRunTime$.prototype.equalsNumNum__jl_Number__jl_Number__Z = (function(xn, yn) {
  var xcode = this.eqTypeCode__p1__jl_Number__I(xn);
  var ycode = this.eqTypeCode__p1__jl_Number__I(yn);
  var dcode = ((ycode > xcode) ? ycode : xcode);
  switch (dcode) {
    default:
      return ((dcode === ScalaJS.m.sr_BoxesRunTime$Codes().INT$1) ? (ScalaJS.numberIntValue(xn) === ScalaJS.numberIntValue(yn)) : ((dcode === ScalaJS.m.sr_BoxesRunTime$Codes().LONG$1) ? ScalaJS.numberLongValue(xn).equals__O__Z(ScalaJS.numberLongValue(yn)) : ((dcode === ScalaJS.m.sr_BoxesRunTime$Codes().FLOAT$1) ? (ScalaJS.numberFloatValue(xn) === ScalaJS.numberFloatValue(yn)) : ((dcode === ScalaJS.m.sr_BoxesRunTime$Codes().DOUBLE$1) ? (ScalaJS.numberDoubleValue(xn) === ScalaJS.numberDoubleValue(yn)) : ((ScalaJS.is.s_math_ScalaNumber(yn) && (!ScalaJS.is.s_math_ScalaNumber(xn))) ? ScalaJS.objectEquals(yn, xn) : ((xn === null) ? (yn === null) : ScalaJS.objectEquals(xn, yn)))))));
  }
});
ScalaJS.c.sr_BoxesRunTime$.prototype.hashFromDouble__jl_Double__I = (function(n) {
  var iv = ScalaJS.numberIntValue(n);
  var dv = ScalaJS.numberDoubleValue(n);
  var lv = ScalaJS.numberLongValue(n);
  return ((iv === dv) ? iv : ((lv.toDouble__D() === dv) ? ScalaJS.objectHashCode((ScalaJS.m.jl_Long(), lv)) : ScalaJS.objectHashCode(n)))
});
ScalaJS.c.sr_BoxesRunTime$.prototype.equalsNumChar__p1__jl_Number__jl_Character__Z = (function(xn, yc) {
  var ch = yc.value$1;
  var x1 = this.eqTypeCode__p1__jl_Number__I(xn);
  switch (x1) {
    default:
      if ((x1 === ScalaJS.m.sr_BoxesRunTime$Codes().INT$1)) {
        return (ScalaJS.numberIntValue(xn) === ch)
      } else if ((x1 === ScalaJS.m.sr_BoxesRunTime$Codes().LONG$1)) {
        var jsx$1 = ScalaJS.numberLongValue(xn);
        var this$1 = ScalaJS.m.sjsr_RuntimeLong();
        return jsx$1.equals__O__Z(this$1.fromInt__I__sjsr_RuntimeLong(ch))
      } else {
        return ((x1 === ScalaJS.m.sr_BoxesRunTime$Codes().FLOAT$1) ? (ScalaJS.numberFloatValue(xn) === ch) : ((x1 === ScalaJS.m.sr_BoxesRunTime$Codes().DOUBLE$1) ? (ScalaJS.numberDoubleValue(xn) === ch) : ((xn === null) ? (yc === null) : ScalaJS.objectEquals(xn, yc))))
      };
  }
});
ScalaJS.c.sr_BoxesRunTime$.prototype.equals2__O__O__Z = (function(x, y) {
  if (ScalaJS.is.jl_Number(x)) {
    var x2 = ScalaJS.as.jl_Number(x);
    return this.equalsNumObject__jl_Number__O__Z(x2, y)
  } else if (ScalaJS.is.jl_Character(x)) {
    var x3 = ScalaJS.as.jl_Character(x);
    return this.equalsCharObject__jl_Character__O__Z(x3, y)
  } else {
    return ((x === null) ? (y === null) : ScalaJS.objectEquals(x, y))
  }
});
ScalaJS.is.sr_BoxesRunTime$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sr_BoxesRunTime$)))
});
ScalaJS.as.sr_BoxesRunTime$ = (function(obj) {
  return ((ScalaJS.is.sr_BoxesRunTime$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.runtime.BoxesRunTime$"))
});
ScalaJS.isArrayOf.sr_BoxesRunTime$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sr_BoxesRunTime$)))
});
ScalaJS.asArrayOf.sr_BoxesRunTime$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sr_BoxesRunTime$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.runtime.BoxesRunTime$;", depth))
});
ScalaJS.d.sr_BoxesRunTime$ = new ScalaJS.ClassTypeData({
  sr_BoxesRunTime$: 0
}, false, "scala.runtime.BoxesRunTime$", ScalaJS.d.O, {
  sr_BoxesRunTime$: 1,
  O: 1
});
ScalaJS.c.sr_BoxesRunTime$.prototype.$classData = ScalaJS.d.sr_BoxesRunTime$;
ScalaJS.n.sr_BoxesRunTime = (void 0);
ScalaJS.m.sr_BoxesRunTime = (function() {
  if ((!ScalaJS.n.sr_BoxesRunTime)) {
    ScalaJS.n.sr_BoxesRunTime = new ScalaJS.c.sr_BoxesRunTime$().init___()
  };
  return ScalaJS.n.sr_BoxesRunTime
});
/** @constructor */
ScalaJS.c.sr_BoxesRunTime$Codes$ = (function() {
  ScalaJS.c.O.call(this);
  this.CHAR$1 = 0;
  this.BYTE$1 = 0;
  this.SHORT$1 = 0;
  this.INT$1 = 0;
  this.LONG$1 = 0;
  this.FLOAT$1 = 0;
  this.DOUBLE$1 = 0;
  this.OTHER$1 = 0
});
ScalaJS.c.sr_BoxesRunTime$Codes$.prototype = new ScalaJS.h.O();
ScalaJS.c.sr_BoxesRunTime$Codes$.prototype.constructor = ScalaJS.c.sr_BoxesRunTime$Codes$;
/** @constructor */
ScalaJS.h.sr_BoxesRunTime$Codes$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sr_BoxesRunTime$Codes$.prototype = ScalaJS.c.sr_BoxesRunTime$Codes$.prototype;
ScalaJS.c.sr_BoxesRunTime$Codes$.prototype.init___ = (function() {
  ScalaJS.n.sr_BoxesRunTime$Codes = this;
  this.CHAR$1 = 0;
  this.BYTE$1 = 1;
  this.SHORT$1 = 2;
  this.INT$1 = 3;
  this.LONG$1 = 4;
  this.FLOAT$1 = 5;
  this.DOUBLE$1 = 6;
  this.OTHER$1 = 7;
  return this
});
ScalaJS.is.sr_BoxesRunTime$Codes$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sr_BoxesRunTime$Codes$)))
});
ScalaJS.as.sr_BoxesRunTime$Codes$ = (function(obj) {
  return ((ScalaJS.is.sr_BoxesRunTime$Codes$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.runtime.BoxesRunTime$Codes$"))
});
ScalaJS.isArrayOf.sr_BoxesRunTime$Codes$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sr_BoxesRunTime$Codes$)))
});
ScalaJS.asArrayOf.sr_BoxesRunTime$Codes$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sr_BoxesRunTime$Codes$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.runtime.BoxesRunTime$Codes$;", depth))
});
ScalaJS.d.sr_BoxesRunTime$Codes$ = new ScalaJS.ClassTypeData({
  sr_BoxesRunTime$Codes$: 0
}, false, "scala.runtime.BoxesRunTime$Codes$", ScalaJS.d.O, {
  sr_BoxesRunTime$Codes$: 1,
  O: 1
});
ScalaJS.c.sr_BoxesRunTime$Codes$.prototype.$classData = ScalaJS.d.sr_BoxesRunTime$Codes$;
ScalaJS.n.sr_BoxesRunTime$Codes = (void 0);
ScalaJS.m.sr_BoxesRunTime$Codes = (function() {
  if ((!ScalaJS.n.sr_BoxesRunTime$Codes)) {
    ScalaJS.n.sr_BoxesRunTime$Codes = new ScalaJS.c.sr_BoxesRunTime$Codes$().init___()
  };
  return ScalaJS.n.sr_BoxesRunTime$Codes
});
/** @constructor */
ScalaJS.c.sr_IntRef = (function() {
  ScalaJS.c.O.call(this);
  this.elem$1 = 0
});
ScalaJS.c.sr_IntRef.prototype = new ScalaJS.h.O();
ScalaJS.c.sr_IntRef.prototype.constructor = ScalaJS.c.sr_IntRef;
/** @constructor */
ScalaJS.h.sr_IntRef = (function() {
  /*<skip>*/
});
ScalaJS.h.sr_IntRef.prototype = ScalaJS.c.sr_IntRef.prototype;
ScalaJS.c.sr_IntRef.prototype.toString__T = (function() {
  return ScalaJS.m.sjsr_RuntimeString().valueOf__I__T(this.elem$1)
});
ScalaJS.c.sr_IntRef.prototype.init___I = (function(elem) {
  this.elem$1 = elem;
  return this
});
ScalaJS.is.sr_IntRef = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sr_IntRef)))
});
ScalaJS.as.sr_IntRef = (function(obj) {
  return ((ScalaJS.is.sr_IntRef(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.runtime.IntRef"))
});
ScalaJS.isArrayOf.sr_IntRef = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sr_IntRef)))
});
ScalaJS.asArrayOf.sr_IntRef = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sr_IntRef(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.runtime.IntRef;", depth))
});
ScalaJS.d.sr_IntRef = new ScalaJS.ClassTypeData({
  sr_IntRef: 0
}, false, "scala.runtime.IntRef", ScalaJS.d.O, {
  sr_IntRef: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.sr_IntRef.prototype.$classData = ScalaJS.d.sr_IntRef;
ScalaJS.is.sr_Null$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sr_Null$)))
});
ScalaJS.as.sr_Null$ = (function(obj) {
  return ((ScalaJS.is.sr_Null$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.runtime.Null$"))
});
ScalaJS.isArrayOf.sr_Null$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sr_Null$)))
});
ScalaJS.asArrayOf.sr_Null$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sr_Null$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.runtime.Null$;", depth))
});
ScalaJS.d.sr_Null$ = new ScalaJS.ClassTypeData({
  sr_Null$: 0
}, false, "scala.runtime.Null$", ScalaJS.d.O, {
  sr_Null$: 1,
  O: 1
});
/** @constructor */
ScalaJS.c.sr_ObjectRef = (function() {
  ScalaJS.c.O.call(this);
  this.elem$1 = null
});
ScalaJS.c.sr_ObjectRef.prototype = new ScalaJS.h.O();
ScalaJS.c.sr_ObjectRef.prototype.constructor = ScalaJS.c.sr_ObjectRef;
/** @constructor */
ScalaJS.h.sr_ObjectRef = (function() {
  /*<skip>*/
});
ScalaJS.h.sr_ObjectRef.prototype = ScalaJS.c.sr_ObjectRef.prototype;
ScalaJS.c.sr_ObjectRef.prototype.toString__T = (function() {
  return ScalaJS.m.sjsr_RuntimeString().valueOf__O__T(this.elem$1)
});
ScalaJS.c.sr_ObjectRef.prototype.init___O = (function(elem) {
  this.elem$1 = elem;
  return this
});
ScalaJS.is.sr_ObjectRef = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sr_ObjectRef)))
});
ScalaJS.as.sr_ObjectRef = (function(obj) {
  return ((ScalaJS.is.sr_ObjectRef(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.runtime.ObjectRef"))
});
ScalaJS.isArrayOf.sr_ObjectRef = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sr_ObjectRef)))
});
ScalaJS.asArrayOf.sr_ObjectRef = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sr_ObjectRef(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.runtime.ObjectRef;", depth))
});
ScalaJS.d.sr_ObjectRef = new ScalaJS.ClassTypeData({
  sr_ObjectRef: 0
}, false, "scala.runtime.ObjectRef", ScalaJS.d.O, {
  sr_ObjectRef: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.sr_ObjectRef.prototype.$classData = ScalaJS.d.sr_ObjectRef;
/** @constructor */
ScalaJS.c.sr_RichInt$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.sr_RichInt$.prototype = new ScalaJS.h.O();
ScalaJS.c.sr_RichInt$.prototype.constructor = ScalaJS.c.sr_RichInt$;
/** @constructor */
ScalaJS.h.sr_RichInt$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sr_RichInt$.prototype = ScalaJS.c.sr_RichInt$.prototype;
ScalaJS.c.sr_RichInt$.prototype.min$extension__I__I__I = (function($$this, that) {
  return (($$this < that) ? $$this : that)
});
ScalaJS.is.sr_RichInt$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sr_RichInt$)))
});
ScalaJS.as.sr_RichInt$ = (function(obj) {
  return ((ScalaJS.is.sr_RichInt$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.runtime.RichInt$"))
});
ScalaJS.isArrayOf.sr_RichInt$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sr_RichInt$)))
});
ScalaJS.asArrayOf.sr_RichInt$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sr_RichInt$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.runtime.RichInt$;", depth))
});
ScalaJS.d.sr_RichInt$ = new ScalaJS.ClassTypeData({
  sr_RichInt$: 0
}, false, "scala.runtime.RichInt$", ScalaJS.d.O, {
  sr_RichInt$: 1,
  O: 1
});
ScalaJS.c.sr_RichInt$.prototype.$classData = ScalaJS.d.sr_RichInt$;
ScalaJS.n.sr_RichInt = (void 0);
ScalaJS.m.sr_RichInt = (function() {
  if ((!ScalaJS.n.sr_RichInt)) {
    ScalaJS.n.sr_RichInt = new ScalaJS.c.sr_RichInt$().init___()
  };
  return ScalaJS.n.sr_RichInt
});
/** @constructor */
ScalaJS.c.sr_ScalaRunTime$ = (function() {
  ScalaJS.c.O.call(this)
});
ScalaJS.c.sr_ScalaRunTime$.prototype = new ScalaJS.h.O();
ScalaJS.c.sr_ScalaRunTime$.prototype.constructor = ScalaJS.c.sr_ScalaRunTime$;
/** @constructor */
ScalaJS.h.sr_ScalaRunTime$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sr_ScalaRunTime$.prototype = ScalaJS.c.sr_ScalaRunTime$.prototype;
ScalaJS.c.sr_ScalaRunTime$.prototype.array$undlength__O__I = (function(xs) {
  if (ScalaJS.isArrayOf.O(xs, 1)) {
    var x2 = ScalaJS.asArrayOf.O(xs, 1);
    return x2.u["length"]
  } else if (ScalaJS.isArrayOf.I(xs, 1)) {
    var x3 = ScalaJS.asArrayOf.I(xs, 1);
    return x3.u["length"]
  } else if (ScalaJS.isArrayOf.D(xs, 1)) {
    var x4 = ScalaJS.asArrayOf.D(xs, 1);
    return x4.u["length"]
  } else if (ScalaJS.isArrayOf.J(xs, 1)) {
    var x5 = ScalaJS.asArrayOf.J(xs, 1);
    return x5.u["length"]
  } else if (ScalaJS.isArrayOf.F(xs, 1)) {
    var x6 = ScalaJS.asArrayOf.F(xs, 1);
    return x6.u["length"]
  } else if (ScalaJS.isArrayOf.C(xs, 1)) {
    var x7 = ScalaJS.asArrayOf.C(xs, 1);
    return x7.u["length"]
  } else if (ScalaJS.isArrayOf.B(xs, 1)) {
    var x8 = ScalaJS.asArrayOf.B(xs, 1);
    return x8.u["length"]
  } else if (ScalaJS.isArrayOf.S(xs, 1)) {
    var x9 = ScalaJS.asArrayOf.S(xs, 1);
    return x9.u["length"]
  } else if (ScalaJS.isArrayOf.Z(xs, 1)) {
    var x10 = ScalaJS.asArrayOf.Z(xs, 1);
    return x10.u["length"]
  } else if (ScalaJS.isArrayOf.sr_BoxedUnit(xs, 1)) {
    var x11 = ScalaJS.asArrayOf.sr_BoxedUnit(xs, 1);
    return x11.u["length"]
  } else if ((null === xs)) {
    throw new ScalaJS.c.jl_NullPointerException().init___()
  } else {
    throw new ScalaJS.c.s_MatchError().init___O(xs)
  }
});
ScalaJS.c.sr_ScalaRunTime$.prototype.hash__O__I = (function(x) {
  return ((x === null) ? 0 : (ScalaJS.is.jl_Number(x) ? ScalaJS.m.sr_BoxesRunTime().hashFromNumber__jl_Number__I(ScalaJS.as.jl_Number(x)) : ScalaJS.objectHashCode(x)))
});
ScalaJS.c.sr_ScalaRunTime$.prototype.array$undupdate__O__I__O__V = (function(xs, idx, value) {
  if (ScalaJS.isArrayOf.O(xs, 1)) {
    var x2 = ScalaJS.asArrayOf.O(xs, 1);
    x2.u[idx] = value
  } else if (ScalaJS.isArrayOf.I(xs, 1)) {
    var x3 = ScalaJS.asArrayOf.I(xs, 1);
    x3.u[idx] = ScalaJS.uI(value)
  } else if (ScalaJS.isArrayOf.D(xs, 1)) {
    var x4 = ScalaJS.asArrayOf.D(xs, 1);
    x4.u[idx] = ScalaJS.uD(value)
  } else if (ScalaJS.isArrayOf.J(xs, 1)) {
    var x5 = ScalaJS.asArrayOf.J(xs, 1);
    x5.u[idx] = ScalaJS.uJ(value)
  } else if (ScalaJS.isArrayOf.F(xs, 1)) {
    var x6 = ScalaJS.asArrayOf.F(xs, 1);
    x6.u[idx] = ScalaJS.uF(value)
  } else if (ScalaJS.isArrayOf.C(xs, 1)) {
    var x7 = ScalaJS.asArrayOf.C(xs, 1);
    x7.u[idx] = ScalaJS.uC(value)
  } else if (ScalaJS.isArrayOf.B(xs, 1)) {
    var x8 = ScalaJS.asArrayOf.B(xs, 1);
    x8.u[idx] = ScalaJS.uB(value)
  } else if (ScalaJS.isArrayOf.S(xs, 1)) {
    var x9 = ScalaJS.asArrayOf.S(xs, 1);
    x9.u[idx] = ScalaJS.uS(value)
  } else if (ScalaJS.isArrayOf.Z(xs, 1)) {
    var x10 = ScalaJS.asArrayOf.Z(xs, 1);
    x10.u[idx] = ScalaJS.uZ(value)
  } else if (ScalaJS.isArrayOf.sr_BoxedUnit(xs, 1)) {
    var x11 = ScalaJS.asArrayOf.sr_BoxedUnit(xs, 1);
    x11.u[idx] = ScalaJS.asUnit(value)
  } else if ((null === xs)) {
    throw new ScalaJS.c.jl_NullPointerException().init___()
  } else {
    throw new ScalaJS.c.s_MatchError().init___O(xs)
  }
});
ScalaJS.c.sr_ScalaRunTime$.prototype.arrayElementClass__O__jl_Class = (function(schematic) {
  if (ScalaJS.is.jl_Class(schematic)) {
    var x2 = ScalaJS.as.jl_Class(schematic);
    return x2.getComponentType__jl_Class()
  } else if (ScalaJS.is.s_reflect_ClassTag(schematic)) {
    var x3 = ScalaJS.as.s_reflect_ClassTag(schematic);
    return x3.runtimeClass__jl_Class()
  } else {
    throw new ScalaJS.c.jl_UnsupportedOperationException().init___T(new ScalaJS.c.s_StringContext().init___sc_Seq(ScalaJS.m.s_Predef().wrapRefArray__AO__scm_WrappedArray(ScalaJS.asArrayOf.O(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.T.getArrayOf(), ["unsupported schematic ", " (", ")"]), 1))).s__sc_Seq__T(ScalaJS.m.s_Predef().genericWrapArray__O__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.O.getArrayOf(), [schematic, ScalaJS.objectGetClass(schematic)]))))
  }
});
ScalaJS.c.sr_ScalaRunTime$.prototype.$$undtoString__s_Product__T = (function(x) {
  var this$1 = x.productIterator__sc_Iterator();
  var start = (x.productPrefix__T() + "(");
  return ScalaJS.i.sc_TraversableOnce$class__mkString__sc_TraversableOnce__T__T__T__T(this$1, start, ",", ")")
});
ScalaJS.c.sr_ScalaRunTime$.prototype.array$undapply__O__I__O = (function(xs, idx) {
  if (ScalaJS.isArrayOf.O(xs, 1)) {
    var x2 = ScalaJS.asArrayOf.O(xs, 1);
    return x2.u[idx]
  } else if (ScalaJS.isArrayOf.I(xs, 1)) {
    var x3 = ScalaJS.asArrayOf.I(xs, 1);
    return x3.u[idx]
  } else if (ScalaJS.isArrayOf.D(xs, 1)) {
    var x4 = ScalaJS.asArrayOf.D(xs, 1);
    return x4.u[idx]
  } else if (ScalaJS.isArrayOf.J(xs, 1)) {
    var x5 = ScalaJS.asArrayOf.J(xs, 1);
    return x5.u[idx]
  } else if (ScalaJS.isArrayOf.F(xs, 1)) {
    var x6 = ScalaJS.asArrayOf.F(xs, 1);
    return x6.u[idx]
  } else if (ScalaJS.isArrayOf.C(xs, 1)) {
    var x7 = ScalaJS.asArrayOf.C(xs, 1);
    return ScalaJS.bC(x7.u[idx])
  } else if (ScalaJS.isArrayOf.B(xs, 1)) {
    var x8 = ScalaJS.asArrayOf.B(xs, 1);
    return x8.u[idx]
  } else if (ScalaJS.isArrayOf.S(xs, 1)) {
    var x9 = ScalaJS.asArrayOf.S(xs, 1);
    return x9.u[idx]
  } else if (ScalaJS.isArrayOf.Z(xs, 1)) {
    var x10 = ScalaJS.asArrayOf.Z(xs, 1);
    return x10.u[idx]
  } else if (ScalaJS.isArrayOf.sr_BoxedUnit(xs, 1)) {
    var x11 = ScalaJS.asArrayOf.sr_BoxedUnit(xs, 1);
    return x11.u[idx]
  } else if ((null === xs)) {
    throw new ScalaJS.c.jl_NullPointerException().init___()
  } else {
    throw new ScalaJS.c.s_MatchError().init___O(xs)
  }
});
ScalaJS.is.sr_ScalaRunTime$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sr_ScalaRunTime$)))
});
ScalaJS.as.sr_ScalaRunTime$ = (function(obj) {
  return ((ScalaJS.is.sr_ScalaRunTime$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.runtime.ScalaRunTime$"))
});
ScalaJS.isArrayOf.sr_ScalaRunTime$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sr_ScalaRunTime$)))
});
ScalaJS.asArrayOf.sr_ScalaRunTime$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sr_ScalaRunTime$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.runtime.ScalaRunTime$;", depth))
});
ScalaJS.d.sr_ScalaRunTime$ = new ScalaJS.ClassTypeData({
  sr_ScalaRunTime$: 0
}, false, "scala.runtime.ScalaRunTime$", ScalaJS.d.O, {
  sr_ScalaRunTime$: 1,
  O: 1
});
ScalaJS.c.sr_ScalaRunTime$.prototype.$classData = ScalaJS.d.sr_ScalaRunTime$;
ScalaJS.n.sr_ScalaRunTime = (void 0);
ScalaJS.m.sr_ScalaRunTime = (function() {
  if ((!ScalaJS.n.sr_ScalaRunTime)) {
    ScalaJS.n.sr_ScalaRunTime = new ScalaJS.c.sr_ScalaRunTime$().init___()
  };
  return ScalaJS.n.sr_ScalaRunTime
});
/** @constructor */
ScalaJS.c.sr_VolatileByteRef = (function() {
  ScalaJS.c.O.call(this);
  this.elem$1 = 0
});
ScalaJS.c.sr_VolatileByteRef.prototype = new ScalaJS.h.O();
ScalaJS.c.sr_VolatileByteRef.prototype.constructor = ScalaJS.c.sr_VolatileByteRef;
/** @constructor */
ScalaJS.h.sr_VolatileByteRef = (function() {
  /*<skip>*/
});
ScalaJS.h.sr_VolatileByteRef.prototype = ScalaJS.c.sr_VolatileByteRef.prototype;
ScalaJS.c.sr_VolatileByteRef.prototype.toString__T = (function() {
  return ScalaJS.m.sjsr_RuntimeString().valueOf__I__T(this.elem$1)
});
ScalaJS.c.sr_VolatileByteRef.prototype.init___B = (function(elem) {
  this.elem$1 = elem;
  return this
});
ScalaJS.is.sr_VolatileByteRef = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sr_VolatileByteRef)))
});
ScalaJS.as.sr_VolatileByteRef = (function(obj) {
  return ((ScalaJS.is.sr_VolatileByteRef(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.runtime.VolatileByteRef"))
});
ScalaJS.isArrayOf.sr_VolatileByteRef = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sr_VolatileByteRef)))
});
ScalaJS.asArrayOf.sr_VolatileByteRef = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sr_VolatileByteRef(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.runtime.VolatileByteRef;", depth))
});
ScalaJS.d.sr_VolatileByteRef = new ScalaJS.ClassTypeData({
  sr_VolatileByteRef: 0
}, false, "scala.runtime.VolatileByteRef", ScalaJS.d.O, {
  sr_VolatileByteRef: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.sr_VolatileByteRef.prototype.$classData = ScalaJS.d.sr_VolatileByteRef;
/** @constructor */
ScalaJS.c.Ljava_io_FilterOutputStream = (function() {
  ScalaJS.c.Ljava_io_OutputStream.call(this);
  this.out$2 = null
});
ScalaJS.c.Ljava_io_FilterOutputStream.prototype = new ScalaJS.h.Ljava_io_OutputStream();
ScalaJS.c.Ljava_io_FilterOutputStream.prototype.constructor = ScalaJS.c.Ljava_io_FilterOutputStream;
/** @constructor */
ScalaJS.h.Ljava_io_FilterOutputStream = (function() {
  /*<skip>*/
});
ScalaJS.h.Ljava_io_FilterOutputStream.prototype = ScalaJS.c.Ljava_io_FilterOutputStream.prototype;
ScalaJS.c.Ljava_io_FilterOutputStream.prototype.init___Ljava_io_OutputStream = (function(out) {
  this.out$2 = out;
  return this
});
ScalaJS.c.Ljava_io_FilterOutputStream.prototype.close__V = (function() {
  this.out$2.close__V()
});
ScalaJS.is.Ljava_io_FilterOutputStream = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.Ljava_io_FilterOutputStream)))
});
ScalaJS.as.Ljava_io_FilterOutputStream = (function(obj) {
  return ((ScalaJS.is.Ljava_io_FilterOutputStream(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.io.FilterOutputStream"))
});
ScalaJS.isArrayOf.Ljava_io_FilterOutputStream = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.Ljava_io_FilterOutputStream)))
});
ScalaJS.asArrayOf.Ljava_io_FilterOutputStream = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.Ljava_io_FilterOutputStream(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.io.FilterOutputStream;", depth))
});
ScalaJS.d.Ljava_io_FilterOutputStream = new ScalaJS.ClassTypeData({
  Ljava_io_FilterOutputStream: 0
}, false, "java.io.FilterOutputStream", ScalaJS.d.Ljava_io_OutputStream, {
  Ljava_io_FilterOutputStream: 1,
  Ljava_io_OutputStream: 1,
  Ljava_io_Flushable: 1,
  Ljava_io_Closeable: 1,
  O: 1
});
ScalaJS.c.Ljava_io_FilterOutputStream.prototype.$classData = ScalaJS.d.Ljava_io_FilterOutputStream;
ScalaJS.isArrayOf.jl_Byte = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Byte)))
});
ScalaJS.asArrayOf.jl_Byte = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Byte(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Byte;", depth))
});
ScalaJS.d.jl_Byte = new ScalaJS.ClassTypeData({
  jl_Byte: 0
}, false, "java.lang.Byte", (void 0), {
  jl_Byte: 1,
  jl_Comparable: 1,
  jl_Number: 1,
  O: 1
}, (function(x) {
  return ScalaJS.isByte(x)
}));
ScalaJS.isArrayOf.jl_Double = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Double)))
});
ScalaJS.asArrayOf.jl_Double = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Double(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Double;", depth))
});
ScalaJS.d.jl_Double = new ScalaJS.ClassTypeData({
  jl_Double: 0
}, false, "java.lang.Double", (void 0), {
  jl_Double: 1,
  jl_Comparable: 1,
  jl_Number: 1,
  O: 1
}, (function(x) {
  return (typeof(x) === "number")
}));
/** @constructor */
ScalaJS.c.jl_Error = (function() {
  ScalaJS.c.jl_Throwable.call(this)
});
ScalaJS.c.jl_Error.prototype = new ScalaJS.h.jl_Throwable();
ScalaJS.c.jl_Error.prototype.constructor = ScalaJS.c.jl_Error;
/** @constructor */
ScalaJS.h.jl_Error = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_Error.prototype = ScalaJS.c.jl_Error.prototype;
ScalaJS.c.jl_Error.prototype.init___T = (function(s) {
  return (ScalaJS.c.jl_Error.prototype.init___T__jl_Throwable.call(this, s, null), this)
});
ScalaJS.is.jl_Error = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_Error)))
});
ScalaJS.as.jl_Error = (function(obj) {
  return ((ScalaJS.is.jl_Error(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.Error"))
});
ScalaJS.isArrayOf.jl_Error = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Error)))
});
ScalaJS.asArrayOf.jl_Error = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Error(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Error;", depth))
});
ScalaJS.d.jl_Error = new ScalaJS.ClassTypeData({
  jl_Error: 0
}, false, "java.lang.Error", ScalaJS.d.jl_Throwable, {
  jl_Error: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.jl_Error.prototype.$classData = ScalaJS.d.jl_Error;
/** @constructor */
ScalaJS.c.jl_Exception = (function() {
  ScalaJS.c.jl_Throwable.call(this)
});
ScalaJS.c.jl_Exception.prototype = new ScalaJS.h.jl_Throwable();
ScalaJS.c.jl_Exception.prototype.constructor = ScalaJS.c.jl_Exception;
/** @constructor */
ScalaJS.h.jl_Exception = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_Exception.prototype = ScalaJS.c.jl_Exception.prototype;
ScalaJS.is.jl_Exception = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_Exception)))
});
ScalaJS.as.jl_Exception = (function(obj) {
  return ((ScalaJS.is.jl_Exception(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.Exception"))
});
ScalaJS.isArrayOf.jl_Exception = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Exception)))
});
ScalaJS.asArrayOf.jl_Exception = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Exception(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Exception;", depth))
});
ScalaJS.d.jl_Exception = new ScalaJS.ClassTypeData({
  jl_Exception: 0
}, false, "java.lang.Exception", ScalaJS.d.jl_Throwable, {
  jl_Exception: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.jl_Exception.prototype.$classData = ScalaJS.d.jl_Exception;
ScalaJS.isArrayOf.jl_Float = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Float)))
});
ScalaJS.asArrayOf.jl_Float = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Float(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Float;", depth))
});
ScalaJS.d.jl_Float = new ScalaJS.ClassTypeData({
  jl_Float: 0
}, false, "java.lang.Float", (void 0), {
  jl_Float: 1,
  jl_Comparable: 1,
  jl_Number: 1,
  O: 1
}, (function(x) {
  return (typeof(x) === "number")
}));
/** @constructor */
ScalaJS.c.jl_InheritableThreadLocal = (function() {
  ScalaJS.c.jl_ThreadLocal.call(this)
});
ScalaJS.c.jl_InheritableThreadLocal.prototype = new ScalaJS.h.jl_ThreadLocal();
ScalaJS.c.jl_InheritableThreadLocal.prototype.constructor = ScalaJS.c.jl_InheritableThreadLocal;
/** @constructor */
ScalaJS.h.jl_InheritableThreadLocal = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_InheritableThreadLocal.prototype = ScalaJS.c.jl_InheritableThreadLocal.prototype;
ScalaJS.is.jl_InheritableThreadLocal = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_InheritableThreadLocal)))
});
ScalaJS.as.jl_InheritableThreadLocal = (function(obj) {
  return ((ScalaJS.is.jl_InheritableThreadLocal(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.InheritableThreadLocal"))
});
ScalaJS.isArrayOf.jl_InheritableThreadLocal = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_InheritableThreadLocal)))
});
ScalaJS.asArrayOf.jl_InheritableThreadLocal = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_InheritableThreadLocal(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.InheritableThreadLocal;", depth))
});
ScalaJS.d.jl_InheritableThreadLocal = new ScalaJS.ClassTypeData({
  jl_InheritableThreadLocal: 0
}, false, "java.lang.InheritableThreadLocal", ScalaJS.d.jl_ThreadLocal, {
  jl_InheritableThreadLocal: 1,
  jl_ThreadLocal: 1,
  O: 1
});
ScalaJS.c.jl_InheritableThreadLocal.prototype.$classData = ScalaJS.d.jl_InheritableThreadLocal;
ScalaJS.isArrayOf.jl_Integer = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Integer)))
});
ScalaJS.asArrayOf.jl_Integer = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Integer(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Integer;", depth))
});
ScalaJS.d.jl_Integer = new ScalaJS.ClassTypeData({
  jl_Integer: 0
}, false, "java.lang.Integer", (void 0), {
  jl_Integer: 1,
  jl_Comparable: 1,
  jl_Number: 1,
  O: 1
}, (function(x) {
  return ScalaJS.isInt(x)
}));
ScalaJS.isArrayOf.jl_Long = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Long)))
});
ScalaJS.asArrayOf.jl_Long = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Long(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Long;", depth))
});
ScalaJS.d.jl_Long = new ScalaJS.ClassTypeData({
  jl_Long: 0
}, false, "java.lang.Long", (void 0), {
  jl_Long: 1,
  jl_Comparable: 1,
  jl_Number: 1,
  O: 1
}, (function(x) {
  return ScalaJS.is.sjsr_RuntimeLong(x)
}));
ScalaJS.isArrayOf.jl_Short = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_Short)))
});
ScalaJS.asArrayOf.jl_Short = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_Short(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.Short;", depth))
});
ScalaJS.d.jl_Short = new ScalaJS.ClassTypeData({
  jl_Short: 0
}, false, "java.lang.Short", (void 0), {
  jl_Short: 1,
  jl_Comparable: 1,
  jl_Number: 1,
  O: 1
}, (function(x) {
  return ScalaJS.isShort(x)
}));
/** @constructor */
ScalaJS.c.jl_StandardErr$ = (function() {
  ScalaJS.c.Ljava_io_OutputStream.call(this)
});
ScalaJS.c.jl_StandardErr$.prototype = new ScalaJS.h.Ljava_io_OutputStream();
ScalaJS.c.jl_StandardErr$.prototype.constructor = ScalaJS.c.jl_StandardErr$;
/** @constructor */
ScalaJS.h.jl_StandardErr$ = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_StandardErr$.prototype = ScalaJS.c.jl_StandardErr$.prototype;
ScalaJS.c.jl_StandardErr$.prototype.write__I__V = (function(b) {
  var this$1 = ScalaJS.m.jl_StandardErrPrintStream();
  var s = ScalaJS.objectToString(ScalaJS.bC((b & 65535)));
  ScalaJS.i.jl_JSConsoleBasedPrintStream$class__print__jl_JSConsoleBasedPrintStream__T__V(this$1, s)
});
ScalaJS.is.jl_StandardErr$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_StandardErr$)))
});
ScalaJS.as.jl_StandardErr$ = (function(obj) {
  return ((ScalaJS.is.jl_StandardErr$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.StandardErr$"))
});
ScalaJS.isArrayOf.jl_StandardErr$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_StandardErr$)))
});
ScalaJS.asArrayOf.jl_StandardErr$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_StandardErr$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.StandardErr$;", depth))
});
ScalaJS.d.jl_StandardErr$ = new ScalaJS.ClassTypeData({
  jl_StandardErr$: 0
}, false, "java.lang.StandardErr$", ScalaJS.d.Ljava_io_OutputStream, {
  jl_StandardErr$: 1,
  Ljava_io_OutputStream: 1,
  Ljava_io_Flushable: 1,
  Ljava_io_Closeable: 1,
  jl_AutoCloseable: 1,
  O: 1
});
ScalaJS.c.jl_StandardErr$.prototype.$classData = ScalaJS.d.jl_StandardErr$;
ScalaJS.n.jl_StandardErr = (void 0);
ScalaJS.m.jl_StandardErr = (function() {
  if ((!ScalaJS.n.jl_StandardErr)) {
    ScalaJS.n.jl_StandardErr = new ScalaJS.c.jl_StandardErr$().init___()
  };
  return ScalaJS.n.jl_StandardErr
});
/** @constructor */
ScalaJS.c.jl_StandardOut$ = (function() {
  ScalaJS.c.Ljava_io_OutputStream.call(this)
});
ScalaJS.c.jl_StandardOut$.prototype = new ScalaJS.h.Ljava_io_OutputStream();
ScalaJS.c.jl_StandardOut$.prototype.constructor = ScalaJS.c.jl_StandardOut$;
/** @constructor */
ScalaJS.h.jl_StandardOut$ = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_StandardOut$.prototype = ScalaJS.c.jl_StandardOut$.prototype;
ScalaJS.c.jl_StandardOut$.prototype.write__I__V = (function(b) {
  var this$1 = ScalaJS.m.jl_StandardOutPrintStream();
  var s = ScalaJS.objectToString(ScalaJS.bC((b & 65535)));
  ScalaJS.i.jl_JSConsoleBasedPrintStream$class__print__jl_JSConsoleBasedPrintStream__T__V(this$1, s)
});
ScalaJS.is.jl_StandardOut$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_StandardOut$)))
});
ScalaJS.as.jl_StandardOut$ = (function(obj) {
  return ((ScalaJS.is.jl_StandardOut$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.StandardOut$"))
});
ScalaJS.isArrayOf.jl_StandardOut$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_StandardOut$)))
});
ScalaJS.asArrayOf.jl_StandardOut$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_StandardOut$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.StandardOut$;", depth))
});
ScalaJS.d.jl_StandardOut$ = new ScalaJS.ClassTypeData({
  jl_StandardOut$: 0
}, false, "java.lang.StandardOut$", ScalaJS.d.Ljava_io_OutputStream, {
  jl_StandardOut$: 1,
  Ljava_io_OutputStream: 1,
  Ljava_io_Flushable: 1,
  Ljava_io_Closeable: 1,
  jl_AutoCloseable: 1,
  O: 1
});
ScalaJS.c.jl_StandardOut$.prototype.$classData = ScalaJS.d.jl_StandardOut$;
ScalaJS.n.jl_StandardOut = (void 0);
ScalaJS.m.jl_StandardOut = (function() {
  if ((!ScalaJS.n.jl_StandardOut)) {
    ScalaJS.n.jl_StandardOut = new ScalaJS.c.jl_StandardOut$().init___()
  };
  return ScalaJS.n.jl_StandardOut
});
/** @constructor */
ScalaJS.c.ju_Formatter$$anonfun$format$1 = (function() {
  ScalaJS.c.sr_AbstractFunction0.call(this);
  this.$$outer$2 = null;
  this.format$undin$1$2 = null;
  this.args$1$2 = null
});
ScalaJS.c.ju_Formatter$$anonfun$format$1.prototype = new ScalaJS.h.sr_AbstractFunction0();
ScalaJS.c.ju_Formatter$$anonfun$format$1.prototype.constructor = ScalaJS.c.ju_Formatter$$anonfun$format$1;
/** @constructor */
ScalaJS.h.ju_Formatter$$anonfun$format$1 = (function() {
  /*<skip>*/
});
ScalaJS.h.ju_Formatter$$anonfun$format$1.prototype = ScalaJS.c.ju_Formatter$$anonfun$format$1.prototype;
ScalaJS.c.ju_Formatter$$anonfun$format$1.prototype.with$und$plus$1__p2__T__Z__T__I__C__jl_Appendable = (function(s, preventZero, flags$1, width$1, conversion$1) {
  return ((ScalaJS.i.sjsr_RuntimeString$class__charAt__sjsr_RuntimeString__I__C(s, 0) !== 45) ? (this.hasFlag$1__p2__T__T__Z("+", flags$1) ? this.pad$1__p2__T__T__jl_Boolean__T__I__C__jl_Appendable(s, "+", ScalaJS.m.jl_Boolean().valueOf__Z__jl_Boolean(preventZero), flags$1, width$1, conversion$1) : (this.hasFlag$1__p2__T__T__Z(" ", flags$1) ? this.pad$1__p2__T__T__jl_Boolean__T__I__C__jl_Appendable(s, " ", ScalaJS.m.jl_Boolean().valueOf__Z__jl_Boolean(preventZero), flags$1, width$1, conversion$1) : this.pad$1__p2__T__T__jl_Boolean__T__I__C__jl_Appendable(s, "", ScalaJS.m.jl_Boolean().valueOf__Z__jl_Boolean(preventZero), flags$1, width$1, conversion$1))) : (this.hasFlag$1__p2__T__T__Z("(", flags$1) ? this.pad$1__p2__T__T__jl_Boolean__T__I__C__jl_Appendable((ScalaJS.i.sjsr_RuntimeString$class__substring__sjsr_RuntimeString__I__T(s, 1) + ")"), "(", ScalaJS.m.jl_Boolean().valueOf__Z__jl_Boolean(preventZero), flags$1, width$1, conversion$1) : this.pad$1__p2__T__T__jl_Boolean__T__I__C__jl_Appendable(ScalaJS.i.sjsr_RuntimeString$class__substring__sjsr_RuntimeString__I__T(s, 1), "-", ScalaJS.m.jl_Boolean().valueOf__Z__jl_Boolean(preventZero), flags$1, width$1, conversion$1)))
});
ScalaJS.c.ju_Formatter$$anonfun$format$1.prototype.init___ju_Formatter__T__AO = (function($$outer, format_in$1, args$1) {
  if (($$outer === null)) {
    throw new ScalaJS.c.jl_NullPointerException().init___()
  } else {
    this.$$outer$2 = $$outer
  };
  this.format$undin$1$2 = format_in$1;
  this.args$1$2 = args$1;
  return this
});
ScalaJS.c.ju_Formatter$$anonfun$format$1.prototype.hasFlag$1__p2__T__T__Z = (function(flag, flags$1) {
  return (ScalaJS.i.sjsr_RuntimeString$class__indexOf__sjsr_RuntimeString__T__I(flags$1, flag) >= 0)
});
ScalaJS.c.ju_Formatter$$anonfun$format$1.prototype.intArg$1__p2__O__I = (function(arg$1) {
  if (ScalaJS.isInt(arg$1)) {
    var x2 = ScalaJS.uI(arg$1);
    return x2
  } else if (ScalaJS.is.jl_Character(arg$1)) {
    var x3 = ScalaJS.uC(arg$1);
    return x3
  } else {
    throw new ScalaJS.c.s_MatchError().init___O(arg$1)
  }
});
ScalaJS.c.ju_Formatter$$anonfun$format$1.prototype.pad$1__p2__T__T__jl_Boolean__T__I__C__jl_Appendable = (function(argStr, prefix, preventZero, flags$1, width$1, conversion$1) {
  var prePadLen = ((ScalaJS.i.sjsr_RuntimeString$class__length__sjsr_RuntimeString__I(argStr) + ScalaJS.i.sjsr_RuntimeString$class__length__sjsr_RuntimeString__I(prefix)) | 0);
  if ((width$1 <= prePadLen)) {
    var padStr = (("" + prefix) + argStr)
  } else {
    var padRight = this.hasFlag$1__p2__T__T__Z("-", flags$1);
    var padZero = (this.hasFlag$1__p2__T__T__Z("0", flags$1) && (!ScalaJS.m.s_Predef().Boolean2boolean__jl_Boolean__Z(preventZero)));
    var padLength = ((width$1 - prePadLen) | 0);
    var padChar = (padZero ? "0" : " ");
    var padding = this.strRepeat$1__p2__T__I__T(padChar, padLength);
    if ((padZero && padRight)) {
      var padStr;
      throw new ScalaJS.c.ju_IllegalFormatFlagsException().init___T(flags$1)
    } else {
      var padStr = (padRight ? ((("" + prefix) + argStr) + padding) : (padZero ? ((("" + prefix) + padding) + argStr) : ((("" + padding) + prefix) + argStr)))
    }
  };
  var casedStr = (ScalaJS.m.jl_Character().isUpperCase__C__Z(conversion$1) ? ScalaJS.i.sjsr_RuntimeString$class__toUpperCase__sjsr_RuntimeString__T(padStr) : padStr);
  return this.$$outer$2.java$util$Formatter$$dest$1.append__jl_CharSequence__jl_Appendable(casedStr)
});
ScalaJS.c.ju_Formatter$$anonfun$format$1.prototype.strRepeat$1__p2__T__I__T = (function(s, times) {
  var result = "";
  var i = times;
  while ((i > 0)) {
    result = (("" + result) + s);
    i = ((i - 1) | 0)
  };
  return result
});
ScalaJS.c.ju_Formatter$$anonfun$format$1.prototype.numberArg$1__p2__O__D = (function(arg$1) {
  if (ScalaJS.is.jl_Number(arg$1)) {
    var x2 = ScalaJS.as.jl_Number(arg$1);
    return ScalaJS.numberDoubleValue(x2)
  } else if (ScalaJS.is.jl_Character(arg$1)) {
    var x3 = ScalaJS.uC(arg$1);
    return x3
  } else {
    throw new ScalaJS.c.s_MatchError().init___O(arg$1)
  }
});
ScalaJS.c.ju_Formatter$$anonfun$format$1.prototype.padCaptureSign$1__p2__T__T__T__I__C__jl_Appendable = (function(argStr, prefix, flags$1, width$1, conversion$1) {
  var firstChar = ScalaJS.i.sjsr_RuntimeString$class__charAt__sjsr_RuntimeString__I__C(argStr, 0);
  return (((firstChar === 43) || (firstChar === 45)) ? this.pad$1__p2__T__T__jl_Boolean__T__I__C__jl_Appendable(ScalaJS.i.sjsr_RuntimeString$class__substring__sjsr_RuntimeString__I__T(argStr, 1), (("" + ScalaJS.bC(firstChar)) + prefix), ScalaJS.m.jl_Boolean().valueOf__Z__jl_Boolean(false), flags$1, width$1, conversion$1) : this.pad$1__p2__T__T__jl_Boolean__T__I__C__jl_Appendable(argStr, prefix, ScalaJS.m.jl_Boolean().valueOf__Z__jl_Boolean(false), flags$1, width$1, conversion$1))
});
ScalaJS.c.ju_Formatter$$anonfun$format$1.prototype.sciNotation$1__p2__I__T__O__I__C__jl_Appendable = (function(precision, flags$1, arg$1, width$1, conversion$1) {
  var exp = this.numberArg$1__p2__O__D(arg$1)["toExponential"](precision);
  return this.with$und$plus$1__p2__T__Z__T__I__C__jl_Appendable((("e" === exp["charAt"]((exp["length"] - 3.0))) ? ScalaJS.as.T(((exp["substring"](0.0, (exp["length"] - 1.0)) + "0") + exp["charAt"]((exp["length"] - 1.0)))) : ScalaJS.as.T(exp)), (!ScalaJS.uZ(ScalaJS.g["isFinite"](this.numberArg$1__p2__O__D(arg$1)))), flags$1, width$1, conversion$1)
});
ScalaJS.c.ju_Formatter$$anonfun$format$1.prototype.apply__O = (function() {
  var fmt = this.format$undin$1$2;
  var lastImplicitIndex = 0;
  var lastIndex = 0;
  while ((!ScalaJS.i.sjsr_RuntimeString$class__isEmpty__sjsr_RuntimeString__Z(fmt))) {
    var x1 = fmt;
    matchEnd9: {
      var o12 = this.$$outer$2.java$util$Formatter$$RegularChunk$1.unapply__T__s_Option(x1);
      if ((!o12.isEmpty__Z())) {
        var matchResult = o12.get__O();
        var jsx$2 = fmt;
        var $$this = matchResult[0];
        if (($$this === (void 0))) {
          var jsx$1;
          throw new ScalaJS.c.ju_NoSuchElementException().init___T("undefined.get")
        } else {
          var jsx$1 = $$this
        };
        fmt = ScalaJS.i.sjsr_RuntimeString$class__substring__sjsr_RuntimeString__I__T(jsx$2, ScalaJS.i.sjsr_RuntimeString$class__length__sjsr_RuntimeString__I(ScalaJS.as.T(jsx$1)));
        var $$this$1 = matchResult[0];
        if (($$this$1 === (void 0))) {
          var jsx$3;
          throw new ScalaJS.c.ju_NoSuchElementException().init___T("undefined.get")
        } else {
          var jsx$3 = $$this$1
        };
        this.$$outer$2.java$util$Formatter$$dest$1.append__jl_CharSequence__jl_Appendable(ScalaJS.as.jl_CharSequence(jsx$3));
        break matchEnd9
      };
      var o14 = this.$$outer$2.java$util$Formatter$$DoublePercent$1.unapply__T__s_Option(x1);
      if ((!o14.isEmpty__Z())) {
        fmt = ScalaJS.i.sjsr_RuntimeString$class__substring__sjsr_RuntimeString__I__T(fmt, 2);
        this.$$outer$2.java$util$Formatter$$dest$1.append__C__jl_Appendable(37);
        break matchEnd9
      };
      var o16 = this.$$outer$2.java$util$Formatter$$EOLChunk$1.unapply__T__s_Option(x1);
      if ((!o16.isEmpty__Z())) {
        fmt = ScalaJS.i.sjsr_RuntimeString$class__substring__sjsr_RuntimeString__I__T(fmt, 2);
        this.$$outer$2.java$util$Formatter$$dest$1.append__C__jl_Appendable(10);
        break matchEnd9
      };
      var o18 = this.$$outer$2.java$util$Formatter$$FormattedChunk$1.unapply__T__s_Option(x1);
      if ((!o18.isEmpty__Z())) {
        var matchResult$2 = o18.get__O();
        var jsx$5 = fmt;
        var $$this$2 = matchResult$2[0];
        if (($$this$2 === (void 0))) {
          var jsx$4;
          throw new ScalaJS.c.ju_NoSuchElementException().init___T("undefined.get")
        } else {
          var jsx$4 = $$this$2
        };
        fmt = ScalaJS.i.sjsr_RuntimeString$class__substring__sjsr_RuntimeString__I__T(jsx$5, ScalaJS.i.sjsr_RuntimeString$class__length__sjsr_RuntimeString__I(ScalaJS.as.T(jsx$4)));
        var $$this$3 = matchResult$2[2];
        if (($$this$3 === (void 0))) {
          var jsx$6;
          throw new ScalaJS.c.ju_NoSuchElementException().init___T("undefined.get")
        } else {
          var jsx$6 = $$this$3
        };
        var flags = ScalaJS.as.T(jsx$6);
        var $$this$4 = matchResult$2[1];
        var indexStr = ScalaJS.as.T((($$this$4 === (void 0)) ? "" : $$this$4));
        if ((!ScalaJS.i.sjsr_RuntimeString$class__isEmpty__sjsr_RuntimeString__Z(indexStr))) {
          var this$11 = ScalaJS.m.jl_Integer();
          var index = this$11.parseInt__T__I__I(indexStr, 10)
        } else if (this.hasFlag$1__p2__T__T__Z("<", flags)) {
          var index = lastIndex
        } else {
          lastImplicitIndex = ((lastImplicitIndex + 1) | 0);
          var index = lastImplicitIndex
        };
        lastIndex = index;
        if (((index <= 0) || (index > this.args$1$2.u["length"]))) {
          var $$this$5 = matchResult$2[5];
          if (($$this$5 === (void 0))) {
            var jsx$7;
            throw new ScalaJS.c.ju_NoSuchElementException().init___T("undefined.get")
          } else {
            var jsx$7 = $$this$5
          };
          throw new ScalaJS.c.ju_MissingFormatArgumentException().init___T(ScalaJS.as.T(jsx$7))
        };
        var arg = this.args$1$2.u[((index - 1) | 0)];
        var $$this$6 = matchResult$2[3];
        var widthStr = ScalaJS.as.T((($$this$6 === (void 0)) ? "" : $$this$6));
        var hasWidth = (!ScalaJS.i.sjsr_RuntimeString$class__isEmpty__sjsr_RuntimeString__Z(widthStr));
        if (hasWidth) {
          var this$16 = ScalaJS.m.jl_Integer();
          var width = this$16.parseInt__T__I__I(widthStr, 10)
        } else {
          var width = 0
        };
        var $$this$7 = matchResult$2[4];
        var precisionStr = ScalaJS.as.T((($$this$7 === (void 0)) ? "" : $$this$7));
        var hasPrecision = (!ScalaJS.i.sjsr_RuntimeString$class__isEmpty__sjsr_RuntimeString__Z(precisionStr));
        if (hasPrecision) {
          var this$19 = ScalaJS.m.jl_Integer();
          var precision = this$19.parseInt__T__I__I(precisionStr, 10)
        } else {
          var precision = 0
        };
        var $$this$8 = matchResult$2[5];
        if (($$this$8 === (void 0))) {
          var jsx$8;
          throw new ScalaJS.c.ju_NoSuchElementException().init___T("undefined.get")
        } else {
          var jsx$8 = $$this$8
        };
        var conversion = ScalaJS.i.sjsr_RuntimeString$class__charAt__sjsr_RuntimeString__I__C(ScalaJS.as.T(jsx$8), 0);
        switch (conversion) {
          case 98:
            /*<skip>*/;
          case 66:
            {
              if ((null === arg)) {
                var jsx$9 = "false"
              } else if ((typeof(arg) === "boolean")) {
                var x3 = ScalaJS.asBoolean(arg);
                var jsx$9 = ScalaJS.m.sjsr_RuntimeString().valueOf__O__T(x3)
              } else {
                var jsx$9 = "true"
              };
              this.pad$1__p2__T__T__jl_Boolean__T__I__C__jl_Appendable(jsx$9, "", ScalaJS.m.jl_Boolean().valueOf__Z__jl_Boolean(false), flags, width, conversion);
              break
            };
          case 104:
            /*<skip>*/;
          case 72:
            {
              if ((arg === null)) {
                var jsx$10 = "null"
              } else {
                var this$23 = ScalaJS.m.jl_Integer();
                var i = ScalaJS.objectHashCode(arg);
                var jsx$10 = this$23.toStringBase__p1__I__I__T(i, 16)
              };
              this.pad$1__p2__T__T__jl_Boolean__T__I__C__jl_Appendable(jsx$10, "", ScalaJS.m.jl_Boolean().valueOf__Z__jl_Boolean(false), flags, width, conversion);
              break
            };
          case 115:
            /*<skip>*/;
          case 83:
            {
              matchEnd6: {
                if ((null === arg)) {
                  if ((!this.hasFlag$1__p2__T__T__Z("#", flags))) {
                    this.pad$1__p2__T__T__jl_Boolean__T__I__C__jl_Appendable("null", "", ScalaJS.m.jl_Boolean().valueOf__Z__jl_Boolean(false), flags, width, conversion);
                    break matchEnd6
                  }
                };
                if (ScalaJS.is.ju_Formattable(arg)) {
                  var x3$2 = ScalaJS.as.ju_Formattable(arg);
                  var flags$2 = (((this.hasFlag$1__p2__T__T__Z("-", flags) ? ScalaJS.m.ju_FormattableFlags().LEFT$undJUSTIFY$1 : 0) | (this.hasFlag$1__p2__T__T__Z("#", flags) ? ScalaJS.m.ju_FormattableFlags().ALTERNATE$1 : 0)) | (ScalaJS.m.jl_Character().isUpperCase__C__Z(conversion) ? ScalaJS.m.ju_FormattableFlags().UPPERCASE$1 : 0));
                  x3$2.formatTo__ju_Formatter__I__I__I__V(this.$$outer$2, flags$2, (hasWidth ? width : -1), (hasPrecision ? precision : -1));
                  ScalaJS.m.s_None();
                  break matchEnd6
                };
                if ((arg !== null)) {
                  if ((!this.hasFlag$1__p2__T__T__Z("#", flags))) {
                    this.pad$1__p2__T__T__jl_Boolean__T__I__C__jl_Appendable(ScalaJS.objectToString(arg), "", ScalaJS.m.jl_Boolean().valueOf__Z__jl_Boolean(false), flags, width, conversion);
                    break matchEnd6
                  }
                };
                throw new ScalaJS.c.ju_FormatFlagsConversionMismatchException().init___T__C("#", 115)
              };
              break
            };
          case 99:
            /*<skip>*/;
          case 67:
            {
              var jsx$11 = ScalaJS.g["String"];
              var col = ScalaJS.m.s_Predef().wrapIntArray__AI__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.I.getArrayOf(), [this.intArg$1__p2__O__I(arg)]));
              var result = new ScalaJS.g["Array"]();
              var i$1 = 0;
              var len = col.length__I();
              while ((i$1 < len)) {
                var x$2 = col.apply__I__O(i$1);
                ScalaJS.uI(result["push"](x$2));
                i$1 = ((i$1 + 1) | 0)
              };
              this.pad$1__p2__T__T__jl_Boolean__T__I__C__jl_Appendable(ScalaJS.as.T(ScalaJS.applyMethodWithVarargs(jsx$11, "fromCharCode", result)), "", ScalaJS.m.jl_Boolean().valueOf__Z__jl_Boolean(false), flags, width, conversion);
              break
            };
          case 100:
            {
              this.with$und$plus$1__p2__T__Z__T__I__C__jl_Appendable(ScalaJS.objectToString(this.numberArg$1__p2__O__D(arg)), false, flags, width, conversion);
              break
            };
          case 111:
            {
              if (ScalaJS.isInt(arg)) {
                var x2 = ScalaJS.asInt(arg);
                var this$31 = ScalaJS.m.jl_Integer();
                var i$2 = ScalaJS.m.s_Predef().Integer2int__jl_Integer__I(x2);
                var str = this$31.toStringBase__p1__I__I__T(i$2, 8)
              } else if (ScalaJS.is.sjsr_RuntimeLong(arg)) {
                var x3$3 = ScalaJS.as.sjsr_RuntimeLong(arg);
                var this$32 = ScalaJS.m.jl_Long();
                var l = ScalaJS.m.s_Predef().Long2long__jl_Long__J(x3$3);
                var str = this$32.dropLZ__p1__T__T(l.toOctalString__T())
              } else if ((typeof(arg) === "number")) {
                var x4$2 = arg;
                var str = ScalaJS.objectToString(x4$2["toString"](8.0))
              } else {
                var str;
                throw new ScalaJS.c.s_MatchError().init___O(arg)
              };
              this.padCaptureSign$1__p2__T__T__T__I__C__jl_Appendable(str, (this.hasFlag$1__p2__T__T__Z("#", flags) ? "0" : ""), flags, width, conversion);
              break
            };
          case 120:
            /*<skip>*/;
          case 88:
            {
              if (ScalaJS.isInt(arg)) {
                var x2$2 = ScalaJS.asInt(arg);
                var this$33 = ScalaJS.m.jl_Integer();
                var i$3 = ScalaJS.m.s_Predef().Integer2int__jl_Integer__I(x2$2);
                var str$2 = this$33.toStringBase__p1__I__I__T(i$3, 16)
              } else if (ScalaJS.is.sjsr_RuntimeLong(arg)) {
                var x3$4 = ScalaJS.as.sjsr_RuntimeLong(arg);
                var this$34 = ScalaJS.m.jl_Long();
                var l$1 = ScalaJS.m.s_Predef().Long2long__jl_Long__J(x3$4);
                var str$2 = this$34.dropLZ__p1__T__T(l$1.toHexString__T())
              } else if ((typeof(arg) === "number")) {
                var x4$3 = arg;
                var str$2 = ScalaJS.objectToString(x4$3["toString"](16.0))
              } else {
                var str$2;
                throw new ScalaJS.c.s_MatchError().init___O(arg)
              };
              this.padCaptureSign$1__p2__T__T__T__I__C__jl_Appendable(str$2, (this.hasFlag$1__p2__T__T__Z("#", flags) ? "0x" : ""), flags, width, conversion);
              break
            };
          case 101:
            /*<skip>*/;
          case 69:
            {
              this.sciNotation$1__p2__I__T__O__I__C__jl_Appendable((hasPrecision ? precision : 6), flags, arg, width, conversion);
              break
            };
          case 103:
            /*<skip>*/;
          case 71:
            {
              var m = ScalaJS.uD(ScalaJS.g["Math"]["abs"](this.numberArg$1__p2__O__D(arg)));
              var p = ((!hasPrecision) ? 6 : ((precision === 0) ? 1 : precision));
              if (((m >= 1.0E-4) && (m < ScalaJS.uD(ScalaJS.g["Math"]["pow"](10.0, p))))) {
                var sig = ScalaJS.uD(ScalaJS.g["Math"]["ceil"]((ScalaJS.uD(ScalaJS.g["Math"]["log"](m)) / ScalaJS.uD(ScalaJS.g["Math"]["LN10"]))));
                var jsx$14 = this.numberArg$1__p2__O__D(arg);
                var jsx$13 = ScalaJS.g["Math"];
                var col$1 = ScalaJS.m.s_Predef().wrapDoubleArray__AD__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.D.getArrayOf(), [(p - sig), 0.0]));
                var result$1 = new ScalaJS.g["Array"]();
                var i$4 = 0;
                var len$1 = col$1.length__I();
                while ((i$4 < len$1)) {
                  var x$2$1 = col$1.apply__I__O(i$4);
                  ScalaJS.uI(result$1["push"](x$2$1));
                  i$4 = ((i$4 + 1) | 0)
                };
                var jsx$12 = jsx$14["toFixed"](ScalaJS.uD(ScalaJS.applyMethodWithVarargs(jsx$13, "max", result$1)));
                this.with$und$plus$1__p2__T__Z__T__I__C__jl_Appendable(ScalaJS.as.T(jsx$12), false, flags, width, conversion)
              } else {
                this.sciNotation$1__p2__I__T__O__I__C__jl_Appendable(((p - 1) | 0), flags, arg, width, conversion)
              };
              break
            };
          case 102:
            {
              this.with$und$plus$1__p2__T__Z__T__I__C__jl_Appendable((hasPrecision ? ScalaJS.as.T(this.numberArg$1__p2__O__D(arg)["toFixed"](precision)) : ScalaJS.as.T(this.numberArg$1__p2__O__D(arg)["toFixed"](6.0))), (!ScalaJS.uZ(ScalaJS.g["isFinite"](this.numberArg$1__p2__O__D(arg)))), flags, width, conversion);
              break
            };
          default:
            throw new ScalaJS.c.s_MatchError().init___O(ScalaJS.bC(conversion));
        };
        break matchEnd9
      };
      throw new ScalaJS.c.s_MatchError().init___O(x1)
    }
  };
  return this.$$outer$2
});
ScalaJS.is.ju_Formatter$$anonfun$format$1 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.ju_Formatter$$anonfun$format$1)))
});
ScalaJS.as.ju_Formatter$$anonfun$format$1 = (function(obj) {
  return ((ScalaJS.is.ju_Formatter$$anonfun$format$1(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.util.Formatter$$anonfun$format$1"))
});
ScalaJS.isArrayOf.ju_Formatter$$anonfun$format$1 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.ju_Formatter$$anonfun$format$1)))
});
ScalaJS.asArrayOf.ju_Formatter$$anonfun$format$1 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.ju_Formatter$$anonfun$format$1(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.util.Formatter$$anonfun$format$1;", depth))
});
ScalaJS.d.ju_Formatter$$anonfun$format$1 = new ScalaJS.ClassTypeData({
  ju_Formatter$$anonfun$format$1: 0
}, false, "java.util.Formatter$$anonfun$format$1", ScalaJS.d.sr_AbstractFunction0, {
  ju_Formatter$$anonfun$format$1: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sr_AbstractFunction0: 1,
  F0: 1,
  O: 1
});
ScalaJS.c.ju_Formatter$$anonfun$format$1.prototype.$classData = ScalaJS.d.ju_Formatter$$anonfun$format$1;
/** @constructor */
ScalaJS.c.s_Array$ = (function() {
  ScalaJS.c.s_FallbackArrayBuilding.call(this);
  this.emptyBooleanArray$2 = null;
  this.emptyByteArray$2 = null;
  this.emptyCharArray$2 = null;
  this.emptyDoubleArray$2 = null;
  this.emptyFloatArray$2 = null;
  this.emptyIntArray$2 = null;
  this.emptyLongArray$2 = null;
  this.emptyShortArray$2 = null;
  this.emptyObjectArray$2 = null
});
ScalaJS.c.s_Array$.prototype = new ScalaJS.h.s_FallbackArrayBuilding();
ScalaJS.c.s_Array$.prototype.constructor = ScalaJS.c.s_Array$;
/** @constructor */
ScalaJS.h.s_Array$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_Array$.prototype = ScalaJS.c.s_Array$.prototype;
ScalaJS.c.s_Array$.prototype.init___ = (function() {
  ScalaJS.n.s_Array = this;
  this.emptyBooleanArray$2 = ScalaJS.newArrayObject(ScalaJS.d.Z.getArrayOf(), [0]);
  this.emptyByteArray$2 = ScalaJS.newArrayObject(ScalaJS.d.B.getArrayOf(), [0]);
  this.emptyCharArray$2 = ScalaJS.newArrayObject(ScalaJS.d.C.getArrayOf(), [0]);
  this.emptyDoubleArray$2 = ScalaJS.newArrayObject(ScalaJS.d.D.getArrayOf(), [0]);
  this.emptyFloatArray$2 = ScalaJS.newArrayObject(ScalaJS.d.F.getArrayOf(), [0]);
  this.emptyIntArray$2 = ScalaJS.newArrayObject(ScalaJS.d.I.getArrayOf(), [0]);
  this.emptyLongArray$2 = ScalaJS.newArrayObject(ScalaJS.d.J.getArrayOf(), [0]);
  this.emptyShortArray$2 = ScalaJS.newArrayObject(ScalaJS.d.S.getArrayOf(), [0]);
  this.emptyObjectArray$2 = ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [0]);
  return this
});
ScalaJS.c.s_Array$.prototype.slowcopy__p2__O__I__O__I__I__V = (function(src, srcPos, dest, destPos, length) {
  var i = srcPos;
  var j = destPos;
  var srcUntil = ((srcPos + length) | 0);
  while ((i < srcUntil)) {
    ScalaJS.m.sr_ScalaRunTime().array$undupdate__O__I__O__V(dest, j, ScalaJS.m.sr_ScalaRunTime().array$undapply__O__I__O(src, i));
    i = ((i + 1) | 0);
    j = ((j + 1) | 0)
  }
});
ScalaJS.c.s_Array$.prototype.copy__O__I__O__I__I__V = (function(src, srcPos, dest, destPos, length) {
  var srcClass = ScalaJS.objectGetClass(src);
  if ((srcClass.isArray__Z() && ScalaJS.objectGetClass(dest).isAssignableFrom__jl_Class__Z(srcClass))) {
    ScalaJS.systemArraycopy(src, srcPos, dest, destPos, length)
  } else {
    this.slowcopy__p2__O__I__O__I__I__V(src, srcPos, dest, destPos, length)
  }
});
ScalaJS.is.s_Array$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_Array$)))
});
ScalaJS.as.s_Array$ = (function(obj) {
  return ((ScalaJS.is.s_Array$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.Array$"))
});
ScalaJS.isArrayOf.s_Array$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_Array$)))
});
ScalaJS.asArrayOf.s_Array$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_Array$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.Array$;", depth))
});
ScalaJS.d.s_Array$ = new ScalaJS.ClassTypeData({
  s_Array$: 0
}, false, "scala.Array$", ScalaJS.d.s_FallbackArrayBuilding, {
  s_Array$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  s_FallbackArrayBuilding: 1,
  O: 1
});
ScalaJS.c.s_Array$.prototype.$classData = ScalaJS.d.s_Array$;
ScalaJS.n.s_Array = (void 0);
ScalaJS.m.s_Array = (function() {
  if ((!ScalaJS.n.s_Array)) {
    ScalaJS.n.s_Array = new ScalaJS.c.s_Array$().init___()
  };
  return ScalaJS.n.s_Array
});
/** @constructor */
ScalaJS.c.s_None$ = (function() {
  ScalaJS.c.s_Option.call(this)
});
ScalaJS.c.s_None$.prototype = new ScalaJS.h.s_Option();
ScalaJS.c.s_None$.prototype.constructor = ScalaJS.c.s_None$;
/** @constructor */
ScalaJS.h.s_None$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_None$.prototype = ScalaJS.c.s_None$.prototype;
ScalaJS.c.s_None$.prototype.productPrefix__T = (function() {
  return "None"
});
ScalaJS.c.s_None$.prototype.productArity__I = (function() {
  return 0
});
ScalaJS.c.s_None$.prototype.isEmpty__Z = (function() {
  return true
});
ScalaJS.c.s_None$.prototype.get__O = (function() {
  this.get__sr_Nothing$()
});
ScalaJS.c.s_None$.prototype.productElement__I__O = (function(x$1) {
  matchEnd3: {
    throw new ScalaJS.c.jl_IndexOutOfBoundsException().init___T(ScalaJS.objectToString(x$1))
  }
});
ScalaJS.c.s_None$.prototype.toString__T = (function() {
  return "None"
});
ScalaJS.c.s_None$.prototype.get__sr_Nothing$ = (function() {
  throw new ScalaJS.c.ju_NoSuchElementException().init___T("None.get")
});
ScalaJS.c.s_None$.prototype.hashCode__I = (function() {
  return 2433880
});
ScalaJS.c.s_None$.prototype.productIterator__sc_Iterator = (function() {
  return new ScalaJS.c.sr_ScalaRunTime$$anon$1().init___s_Product(this)
});
ScalaJS.is.s_None$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_None$)))
});
ScalaJS.as.s_None$ = (function(obj) {
  return ((ScalaJS.is.s_None$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.None$"))
});
ScalaJS.isArrayOf.s_None$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_None$)))
});
ScalaJS.asArrayOf.s_None$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_None$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.None$;", depth))
});
ScalaJS.d.s_None$ = new ScalaJS.ClassTypeData({
  s_None$: 0
}, false, "scala.None$", ScalaJS.d.s_Option, {
  s_None$: 1,
  s_Option: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  s_Product: 1,
  s_Equals: 1,
  O: 1
});
ScalaJS.c.s_None$.prototype.$classData = ScalaJS.d.s_None$;
ScalaJS.n.s_None = (void 0);
ScalaJS.m.s_None = (function() {
  if ((!ScalaJS.n.s_None)) {
    ScalaJS.n.s_None = new ScalaJS.c.s_None$().init___()
  };
  return ScalaJS.n.s_None
});
/** @constructor */
ScalaJS.c.s_Predef$ = (function() {
  ScalaJS.c.s_LowPriorityImplicits.call(this);
  this.Map$2 = null;
  this.Set$2 = null;
  this.ClassManifest$2 = null;
  this.Manifest$2 = null;
  this.NoManifest$2 = null;
  this.$$scope$2 = null;
  this.StringCanBuildFrom$2 = null;
  this.singleton$und$less$colon$less$2 = null;
  this.scala$Predef$$singleton$und$eq$colon$eq$f = null
});
ScalaJS.c.s_Predef$.prototype = new ScalaJS.h.s_LowPriorityImplicits();
ScalaJS.c.s_Predef$.prototype.constructor = ScalaJS.c.s_Predef$;
/** @constructor */
ScalaJS.h.s_Predef$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_Predef$.prototype = ScalaJS.c.s_Predef$.prototype;
ScalaJS.c.s_Predef$.prototype.init___ = (function() {
  ScalaJS.n.s_Predef = this;
  ScalaJS.m.s_package();
  this.Map$2 = ScalaJS.m.sci_Map();
  this.Set$2 = ScalaJS.m.sci_Set();
  this.ClassManifest$2 = ScalaJS.m.s_reflect_package().ClassManifest$1;
  this.Manifest$2 = ScalaJS.m.s_reflect_package().Manifest$1;
  this.NoManifest$2 = ScalaJS.m.s_reflect_NoManifest();
  this.$$scope$2 = ScalaJS.m.s_xml_TopScope();
  this.StringCanBuildFrom$2 = new ScalaJS.c.s_Predef$$anon$3().init___();
  this.singleton$und$less$colon$less$2 = new ScalaJS.c.s_Predef$$anon$1().init___();
  this.scala$Predef$$singleton$und$eq$colon$eq$f = new ScalaJS.c.s_Predef$$anon$2().init___();
  return this
});
ScalaJS.c.s_Predef$.prototype.assert__Z__V = (function(assertion) {
  if ((!assertion)) {
    throw new ScalaJS.c.jl_AssertionError().init___O("assertion failed")
  }
});
ScalaJS.c.s_Predef$.prototype.Boolean2boolean__jl_Boolean__Z = (function(x) {
  return ScalaJS.booleanBooleanValue(x)
});
ScalaJS.c.s_Predef$.prototype.Integer2int__jl_Integer__I = (function(x) {
  return ScalaJS.numberIntValue(x)
});
ScalaJS.c.s_Predef$.prototype.Long2long__jl_Long__J = (function(x) {
  return ScalaJS.numberLongValue(x)
});
ScalaJS.is.s_Predef$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_Predef$)))
});
ScalaJS.as.s_Predef$ = (function(obj) {
  return ((ScalaJS.is.s_Predef$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.Predef$"))
});
ScalaJS.isArrayOf.s_Predef$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_Predef$)))
});
ScalaJS.asArrayOf.s_Predef$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_Predef$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.Predef$;", depth))
});
ScalaJS.d.s_Predef$ = new ScalaJS.ClassTypeData({
  s_Predef$: 0
}, false, "scala.Predef$", ScalaJS.d.s_LowPriorityImplicits, {
  s_Predef$: 1,
  s_LowPriorityImplicits: 1,
  O: 1
});
ScalaJS.c.s_Predef$.prototype.$classData = ScalaJS.d.s_Predef$;
ScalaJS.n.s_Predef = (void 0);
ScalaJS.m.s_Predef = (function() {
  if ((!ScalaJS.n.s_Predef)) {
    ScalaJS.n.s_Predef = new ScalaJS.c.s_Predef$().init___()
  };
  return ScalaJS.n.s_Predef
});
/** @constructor */
ScalaJS.c.s_Predef$$anon$1 = (function() {
  ScalaJS.c.s_Predef$$less$colon$less.call(this)
});
ScalaJS.c.s_Predef$$anon$1.prototype = new ScalaJS.h.s_Predef$$less$colon$less();
ScalaJS.c.s_Predef$$anon$1.prototype.constructor = ScalaJS.c.s_Predef$$anon$1;
/** @constructor */
ScalaJS.h.s_Predef$$anon$1 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_Predef$$anon$1.prototype = ScalaJS.c.s_Predef$$anon$1.prototype;
ScalaJS.c.s_Predef$$anon$1.prototype.apply__O__O = (function(x) {
  return x
});
ScalaJS.is.s_Predef$$anon$1 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_Predef$$anon$1)))
});
ScalaJS.as.s_Predef$$anon$1 = (function(obj) {
  return ((ScalaJS.is.s_Predef$$anon$1(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.Predef$$anon$1"))
});
ScalaJS.isArrayOf.s_Predef$$anon$1 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_Predef$$anon$1)))
});
ScalaJS.asArrayOf.s_Predef$$anon$1 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_Predef$$anon$1(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.Predef$$anon$1;", depth))
});
ScalaJS.d.s_Predef$$anon$1 = new ScalaJS.ClassTypeData({
  s_Predef$$anon$1: 0
}, false, "scala.Predef$$anon$1", ScalaJS.d.s_Predef$$less$colon$less, {
  s_Predef$$anon$1: 1,
  s_Predef$$less$colon$less: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  F1: 1,
  O: 1
});
ScalaJS.c.s_Predef$$anon$1.prototype.$classData = ScalaJS.d.s_Predef$$anon$1;
/** @constructor */
ScalaJS.c.s_Predef$$anon$2 = (function() {
  ScalaJS.c.s_Predef$$eq$colon$eq.call(this)
});
ScalaJS.c.s_Predef$$anon$2.prototype = new ScalaJS.h.s_Predef$$eq$colon$eq();
ScalaJS.c.s_Predef$$anon$2.prototype.constructor = ScalaJS.c.s_Predef$$anon$2;
/** @constructor */
ScalaJS.h.s_Predef$$anon$2 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_Predef$$anon$2.prototype = ScalaJS.c.s_Predef$$anon$2.prototype;
ScalaJS.c.s_Predef$$anon$2.prototype.apply__O__O = (function(x) {
  return x
});
ScalaJS.is.s_Predef$$anon$2 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_Predef$$anon$2)))
});
ScalaJS.as.s_Predef$$anon$2 = (function(obj) {
  return ((ScalaJS.is.s_Predef$$anon$2(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.Predef$$anon$2"))
});
ScalaJS.isArrayOf.s_Predef$$anon$2 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_Predef$$anon$2)))
});
ScalaJS.asArrayOf.s_Predef$$anon$2 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_Predef$$anon$2(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.Predef$$anon$2;", depth))
});
ScalaJS.d.s_Predef$$anon$2 = new ScalaJS.ClassTypeData({
  s_Predef$$anon$2: 0
}, false, "scala.Predef$$anon$2", ScalaJS.d.s_Predef$$eq$colon$eq, {
  s_Predef$$anon$2: 1,
  s_Predef$$eq$colon$eq: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  F1: 1,
  O: 1
});
ScalaJS.c.s_Predef$$anon$2.prototype.$classData = ScalaJS.d.s_Predef$$anon$2;
/** @constructor */
ScalaJS.c.s_Some = (function() {
  ScalaJS.c.s_Option.call(this);
  this.x$2 = null
});
ScalaJS.c.s_Some.prototype = new ScalaJS.h.s_Option();
ScalaJS.c.s_Some.prototype.constructor = ScalaJS.c.s_Some;
/** @constructor */
ScalaJS.h.s_Some = (function() {
  /*<skip>*/
});
ScalaJS.h.s_Some.prototype = ScalaJS.c.s_Some.prototype;
ScalaJS.c.s_Some.prototype.productPrefix__T = (function() {
  return "Some"
});
ScalaJS.c.s_Some.prototype.productArity__I = (function() {
  return 1
});
ScalaJS.c.s_Some.prototype.equals__O__Z = (function(x$1) {
  if ((this === x$1)) {
    return true
  } else if (ScalaJS.is.s_Some(x$1)) {
    var Some$1 = ScalaJS.as.s_Some(x$1);
    return ScalaJS.anyEqEq(this.x$2, Some$1.x$2)
  } else {
    return false
  }
});
ScalaJS.c.s_Some.prototype.isEmpty__Z = (function() {
  return false
});
ScalaJS.c.s_Some.prototype.productElement__I__O = (function(x$1) {
  switch (x$1) {
    case 0:
      {
        return this.x$2;
        break
      };
    default:
      throw new ScalaJS.c.jl_IndexOutOfBoundsException().init___T(ScalaJS.objectToString(x$1));
  }
});
ScalaJS.c.s_Some.prototype.get__O = (function() {
  return this.x$2
});
ScalaJS.c.s_Some.prototype.toString__T = (function() {
  return ScalaJS.m.sr_ScalaRunTime().$$undtoString__s_Product__T(this)
});
ScalaJS.c.s_Some.prototype.init___O = (function(x) {
  this.x$2 = x;
  return this
});
ScalaJS.c.s_Some.prototype.hashCode__I = (function() {
  var this$2 = ScalaJS.m.s_util_hashing_MurmurHash3();
  return this$2.productHash__s_Product__I__I(this, -889275714)
});
ScalaJS.c.s_Some.prototype.productIterator__sc_Iterator = (function() {
  return new ScalaJS.c.sr_ScalaRunTime$$anon$1().init___s_Product(this)
});
ScalaJS.is.s_Some = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_Some)))
});
ScalaJS.as.s_Some = (function(obj) {
  return ((ScalaJS.is.s_Some(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.Some"))
});
ScalaJS.isArrayOf.s_Some = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_Some)))
});
ScalaJS.asArrayOf.s_Some = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_Some(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.Some;", depth))
});
ScalaJS.d.s_Some = new ScalaJS.ClassTypeData({
  s_Some: 0
}, false, "scala.Some", ScalaJS.d.s_Option, {
  s_Some: 1,
  s_Option: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  s_Product: 1,
  s_Equals: 1,
  O: 1
});
ScalaJS.c.s_Some.prototype.$classData = ScalaJS.d.s_Some;
ScalaJS.is.s_math_ScalaNumber = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_math_ScalaNumber)))
});
ScalaJS.as.s_math_ScalaNumber = (function(obj) {
  return ((ScalaJS.is.s_math_ScalaNumber(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.math.ScalaNumber"))
});
ScalaJS.isArrayOf.s_math_ScalaNumber = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_math_ScalaNumber)))
});
ScalaJS.asArrayOf.s_math_ScalaNumber = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_math_ScalaNumber(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.math.ScalaNumber;", depth))
});
ScalaJS.d.s_math_ScalaNumber = new ScalaJS.ClassTypeData({
  s_math_ScalaNumber: 0
}, false, "scala.math.ScalaNumber", ScalaJS.d.jl_Number, {
  s_math_ScalaNumber: 1,
  jl_Number: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
/** @constructor */
ScalaJS.c.s_reflect_ManifestFactory$$anon$10 = (function() {
  ScalaJS.c.s_reflect_AnyValManifest.call(this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$10.prototype = new ScalaJS.h.s_reflect_AnyValManifest();
ScalaJS.c.s_reflect_ManifestFactory$$anon$10.prototype.constructor = ScalaJS.c.s_reflect_ManifestFactory$$anon$10;
/** @constructor */
ScalaJS.h.s_reflect_ManifestFactory$$anon$10 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ManifestFactory$$anon$10.prototype = ScalaJS.c.s_reflect_ManifestFactory$$anon$10.prototype;
ScalaJS.c.s_reflect_ManifestFactory$$anon$10.prototype.init___ = (function() {
  return (ScalaJS.c.s_reflect_AnyValManifest.prototype.init___T.call(this, "Long"), this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$10.prototype.newArray__I__O = (function(len) {
  return this.newArray__I__AJ(len)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$10.prototype.runtimeClass__jl_Class = (function() {
  return ScalaJS.m.jl_Long().TYPE$1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$10.prototype.newArray__I__AJ = (function(len) {
  return ScalaJS.newArrayObject(ScalaJS.d.J.getArrayOf(), [len])
});
ScalaJS.is.s_reflect_ManifestFactory$$anon$10 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ManifestFactory$$anon$10)))
});
ScalaJS.as.s_reflect_ManifestFactory$$anon$10 = (function(obj) {
  return ((ScalaJS.is.s_reflect_ManifestFactory$$anon$10(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ManifestFactory$$anon$10"))
});
ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$10 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ManifestFactory$$anon$10)))
});
ScalaJS.asArrayOf.s_reflect_ManifestFactory$$anon$10 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$10(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ManifestFactory$$anon$10;", depth))
});
ScalaJS.d.s_reflect_ManifestFactory$$anon$10 = new ScalaJS.ClassTypeData({
  s_reflect_ManifestFactory$$anon$10: 0
}, false, "scala.reflect.ManifestFactory$$anon$10", ScalaJS.d.s_reflect_AnyValManifest, {
  s_reflect_ManifestFactory$$anon$10: 1,
  s_reflect_AnyValManifest: 1,
  s_reflect_Manifest: 1,
  s_reflect_ClassTag: 1,
  s_Equals: 1,
  s_reflect_ClassManifestDeprecatedApis: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$10.prototype.$classData = ScalaJS.d.s_reflect_ManifestFactory$$anon$10;
/** @constructor */
ScalaJS.c.s_reflect_ManifestFactory$$anon$11 = (function() {
  ScalaJS.c.s_reflect_AnyValManifest.call(this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$11.prototype = new ScalaJS.h.s_reflect_AnyValManifest();
ScalaJS.c.s_reflect_ManifestFactory$$anon$11.prototype.constructor = ScalaJS.c.s_reflect_ManifestFactory$$anon$11;
/** @constructor */
ScalaJS.h.s_reflect_ManifestFactory$$anon$11 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ManifestFactory$$anon$11.prototype = ScalaJS.c.s_reflect_ManifestFactory$$anon$11.prototype;
ScalaJS.c.s_reflect_ManifestFactory$$anon$11.prototype.init___ = (function() {
  return (ScalaJS.c.s_reflect_AnyValManifest.prototype.init___T.call(this, "Float"), this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$11.prototype.newArray__I__O = (function(len) {
  return this.newArray__I__AF(len)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$11.prototype.newArray__I__AF = (function(len) {
  return ScalaJS.newArrayObject(ScalaJS.d.F.getArrayOf(), [len])
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$11.prototype.runtimeClass__jl_Class = (function() {
  return ScalaJS.m.jl_Float().TYPE$1
});
ScalaJS.is.s_reflect_ManifestFactory$$anon$11 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ManifestFactory$$anon$11)))
});
ScalaJS.as.s_reflect_ManifestFactory$$anon$11 = (function(obj) {
  return ((ScalaJS.is.s_reflect_ManifestFactory$$anon$11(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ManifestFactory$$anon$11"))
});
ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$11 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ManifestFactory$$anon$11)))
});
ScalaJS.asArrayOf.s_reflect_ManifestFactory$$anon$11 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$11(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ManifestFactory$$anon$11;", depth))
});
ScalaJS.d.s_reflect_ManifestFactory$$anon$11 = new ScalaJS.ClassTypeData({
  s_reflect_ManifestFactory$$anon$11: 0
}, false, "scala.reflect.ManifestFactory$$anon$11", ScalaJS.d.s_reflect_AnyValManifest, {
  s_reflect_ManifestFactory$$anon$11: 1,
  s_reflect_AnyValManifest: 1,
  s_reflect_Manifest: 1,
  s_reflect_ClassTag: 1,
  s_Equals: 1,
  s_reflect_ClassManifestDeprecatedApis: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$11.prototype.$classData = ScalaJS.d.s_reflect_ManifestFactory$$anon$11;
/** @constructor */
ScalaJS.c.s_reflect_ManifestFactory$$anon$12 = (function() {
  ScalaJS.c.s_reflect_AnyValManifest.call(this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$12.prototype = new ScalaJS.h.s_reflect_AnyValManifest();
ScalaJS.c.s_reflect_ManifestFactory$$anon$12.prototype.constructor = ScalaJS.c.s_reflect_ManifestFactory$$anon$12;
/** @constructor */
ScalaJS.h.s_reflect_ManifestFactory$$anon$12 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ManifestFactory$$anon$12.prototype = ScalaJS.c.s_reflect_ManifestFactory$$anon$12.prototype;
ScalaJS.c.s_reflect_ManifestFactory$$anon$12.prototype.init___ = (function() {
  return (ScalaJS.c.s_reflect_AnyValManifest.prototype.init___T.call(this, "Double"), this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$12.prototype.newArray__I__O = (function(len) {
  return this.newArray__I__AD(len)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$12.prototype.runtimeClass__jl_Class = (function() {
  return ScalaJS.m.jl_Double().TYPE$1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$12.prototype.newArray__I__AD = (function(len) {
  return ScalaJS.newArrayObject(ScalaJS.d.D.getArrayOf(), [len])
});
ScalaJS.is.s_reflect_ManifestFactory$$anon$12 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ManifestFactory$$anon$12)))
});
ScalaJS.as.s_reflect_ManifestFactory$$anon$12 = (function(obj) {
  return ((ScalaJS.is.s_reflect_ManifestFactory$$anon$12(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ManifestFactory$$anon$12"))
});
ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$12 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ManifestFactory$$anon$12)))
});
ScalaJS.asArrayOf.s_reflect_ManifestFactory$$anon$12 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$12(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ManifestFactory$$anon$12;", depth))
});
ScalaJS.d.s_reflect_ManifestFactory$$anon$12 = new ScalaJS.ClassTypeData({
  s_reflect_ManifestFactory$$anon$12: 0
}, false, "scala.reflect.ManifestFactory$$anon$12", ScalaJS.d.s_reflect_AnyValManifest, {
  s_reflect_ManifestFactory$$anon$12: 1,
  s_reflect_AnyValManifest: 1,
  s_reflect_Manifest: 1,
  s_reflect_ClassTag: 1,
  s_Equals: 1,
  s_reflect_ClassManifestDeprecatedApis: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$12.prototype.$classData = ScalaJS.d.s_reflect_ManifestFactory$$anon$12;
/** @constructor */
ScalaJS.c.s_reflect_ManifestFactory$$anon$13 = (function() {
  ScalaJS.c.s_reflect_AnyValManifest.call(this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$13.prototype = new ScalaJS.h.s_reflect_AnyValManifest();
ScalaJS.c.s_reflect_ManifestFactory$$anon$13.prototype.constructor = ScalaJS.c.s_reflect_ManifestFactory$$anon$13;
/** @constructor */
ScalaJS.h.s_reflect_ManifestFactory$$anon$13 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ManifestFactory$$anon$13.prototype = ScalaJS.c.s_reflect_ManifestFactory$$anon$13.prototype;
ScalaJS.c.s_reflect_ManifestFactory$$anon$13.prototype.init___ = (function() {
  return (ScalaJS.c.s_reflect_AnyValManifest.prototype.init___T.call(this, "Boolean"), this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$13.prototype.newArray__I__O = (function(len) {
  return this.newArray__I__AZ(len)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$13.prototype.runtimeClass__jl_Class = (function() {
  return ScalaJS.m.jl_Boolean().TYPE$1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$13.prototype.newArray__I__AZ = (function(len) {
  return ScalaJS.newArrayObject(ScalaJS.d.Z.getArrayOf(), [len])
});
ScalaJS.is.s_reflect_ManifestFactory$$anon$13 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ManifestFactory$$anon$13)))
});
ScalaJS.as.s_reflect_ManifestFactory$$anon$13 = (function(obj) {
  return ((ScalaJS.is.s_reflect_ManifestFactory$$anon$13(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ManifestFactory$$anon$13"))
});
ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$13 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ManifestFactory$$anon$13)))
});
ScalaJS.asArrayOf.s_reflect_ManifestFactory$$anon$13 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$13(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ManifestFactory$$anon$13;", depth))
});
ScalaJS.d.s_reflect_ManifestFactory$$anon$13 = new ScalaJS.ClassTypeData({
  s_reflect_ManifestFactory$$anon$13: 0
}, false, "scala.reflect.ManifestFactory$$anon$13", ScalaJS.d.s_reflect_AnyValManifest, {
  s_reflect_ManifestFactory$$anon$13: 1,
  s_reflect_AnyValManifest: 1,
  s_reflect_Manifest: 1,
  s_reflect_ClassTag: 1,
  s_Equals: 1,
  s_reflect_ClassManifestDeprecatedApis: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$13.prototype.$classData = ScalaJS.d.s_reflect_ManifestFactory$$anon$13;
/** @constructor */
ScalaJS.c.s_reflect_ManifestFactory$$anon$14 = (function() {
  ScalaJS.c.s_reflect_AnyValManifest.call(this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$14.prototype = new ScalaJS.h.s_reflect_AnyValManifest();
ScalaJS.c.s_reflect_ManifestFactory$$anon$14.prototype.constructor = ScalaJS.c.s_reflect_ManifestFactory$$anon$14;
/** @constructor */
ScalaJS.h.s_reflect_ManifestFactory$$anon$14 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ManifestFactory$$anon$14.prototype = ScalaJS.c.s_reflect_ManifestFactory$$anon$14.prototype;
ScalaJS.c.s_reflect_ManifestFactory$$anon$14.prototype.init___ = (function() {
  return (ScalaJS.c.s_reflect_AnyValManifest.prototype.init___T.call(this, "Unit"), this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$14.prototype.newArray__I__O = (function(len) {
  return this.newArray__I__Asr_BoxedUnit(len)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$14.prototype.runtimeClass__jl_Class = (function() {
  return ScalaJS.m.jl_Void().TYPE$1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$14.prototype.newArray__I__Asr_BoxedUnit = (function(len) {
  return ScalaJS.newArrayObject(ScalaJS.d.sr_BoxedUnit.getArrayOf(), [len])
});
ScalaJS.is.s_reflect_ManifestFactory$$anon$14 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ManifestFactory$$anon$14)))
});
ScalaJS.as.s_reflect_ManifestFactory$$anon$14 = (function(obj) {
  return ((ScalaJS.is.s_reflect_ManifestFactory$$anon$14(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ManifestFactory$$anon$14"))
});
ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$14 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ManifestFactory$$anon$14)))
});
ScalaJS.asArrayOf.s_reflect_ManifestFactory$$anon$14 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$14(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ManifestFactory$$anon$14;", depth))
});
ScalaJS.d.s_reflect_ManifestFactory$$anon$14 = new ScalaJS.ClassTypeData({
  s_reflect_ManifestFactory$$anon$14: 0
}, false, "scala.reflect.ManifestFactory$$anon$14", ScalaJS.d.s_reflect_AnyValManifest, {
  s_reflect_ManifestFactory$$anon$14: 1,
  s_reflect_AnyValManifest: 1,
  s_reflect_Manifest: 1,
  s_reflect_ClassTag: 1,
  s_Equals: 1,
  s_reflect_ClassManifestDeprecatedApis: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$14.prototype.$classData = ScalaJS.d.s_reflect_ManifestFactory$$anon$14;
/** @constructor */
ScalaJS.c.s_reflect_ManifestFactory$$anon$6 = (function() {
  ScalaJS.c.s_reflect_AnyValManifest.call(this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$6.prototype = new ScalaJS.h.s_reflect_AnyValManifest();
ScalaJS.c.s_reflect_ManifestFactory$$anon$6.prototype.constructor = ScalaJS.c.s_reflect_ManifestFactory$$anon$6;
/** @constructor */
ScalaJS.h.s_reflect_ManifestFactory$$anon$6 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ManifestFactory$$anon$6.prototype = ScalaJS.c.s_reflect_ManifestFactory$$anon$6.prototype;
ScalaJS.c.s_reflect_ManifestFactory$$anon$6.prototype.init___ = (function() {
  return (ScalaJS.c.s_reflect_AnyValManifest.prototype.init___T.call(this, "Byte"), this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$6.prototype.newArray__I__O = (function(len) {
  return this.newArray__I__AB(len)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$6.prototype.runtimeClass__jl_Class = (function() {
  return ScalaJS.m.jl_Byte().TYPE$1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$6.prototype.newArray__I__AB = (function(len) {
  return ScalaJS.newArrayObject(ScalaJS.d.B.getArrayOf(), [len])
});
ScalaJS.is.s_reflect_ManifestFactory$$anon$6 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ManifestFactory$$anon$6)))
});
ScalaJS.as.s_reflect_ManifestFactory$$anon$6 = (function(obj) {
  return ((ScalaJS.is.s_reflect_ManifestFactory$$anon$6(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ManifestFactory$$anon$6"))
});
ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$6 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ManifestFactory$$anon$6)))
});
ScalaJS.asArrayOf.s_reflect_ManifestFactory$$anon$6 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$6(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ManifestFactory$$anon$6;", depth))
});
ScalaJS.d.s_reflect_ManifestFactory$$anon$6 = new ScalaJS.ClassTypeData({
  s_reflect_ManifestFactory$$anon$6: 0
}, false, "scala.reflect.ManifestFactory$$anon$6", ScalaJS.d.s_reflect_AnyValManifest, {
  s_reflect_ManifestFactory$$anon$6: 1,
  s_reflect_AnyValManifest: 1,
  s_reflect_Manifest: 1,
  s_reflect_ClassTag: 1,
  s_Equals: 1,
  s_reflect_ClassManifestDeprecatedApis: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$6.prototype.$classData = ScalaJS.d.s_reflect_ManifestFactory$$anon$6;
/** @constructor */
ScalaJS.c.s_reflect_ManifestFactory$$anon$7 = (function() {
  ScalaJS.c.s_reflect_AnyValManifest.call(this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$7.prototype = new ScalaJS.h.s_reflect_AnyValManifest();
ScalaJS.c.s_reflect_ManifestFactory$$anon$7.prototype.constructor = ScalaJS.c.s_reflect_ManifestFactory$$anon$7;
/** @constructor */
ScalaJS.h.s_reflect_ManifestFactory$$anon$7 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ManifestFactory$$anon$7.prototype = ScalaJS.c.s_reflect_ManifestFactory$$anon$7.prototype;
ScalaJS.c.s_reflect_ManifestFactory$$anon$7.prototype.init___ = (function() {
  return (ScalaJS.c.s_reflect_AnyValManifest.prototype.init___T.call(this, "Short"), this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$7.prototype.newArray__I__O = (function(len) {
  return this.newArray__I__AS(len)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$7.prototype.runtimeClass__jl_Class = (function() {
  return ScalaJS.m.jl_Short().TYPE$1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$7.prototype.newArray__I__AS = (function(len) {
  return ScalaJS.newArrayObject(ScalaJS.d.S.getArrayOf(), [len])
});
ScalaJS.is.s_reflect_ManifestFactory$$anon$7 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ManifestFactory$$anon$7)))
});
ScalaJS.as.s_reflect_ManifestFactory$$anon$7 = (function(obj) {
  return ((ScalaJS.is.s_reflect_ManifestFactory$$anon$7(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ManifestFactory$$anon$7"))
});
ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$7 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ManifestFactory$$anon$7)))
});
ScalaJS.asArrayOf.s_reflect_ManifestFactory$$anon$7 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$7(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ManifestFactory$$anon$7;", depth))
});
ScalaJS.d.s_reflect_ManifestFactory$$anon$7 = new ScalaJS.ClassTypeData({
  s_reflect_ManifestFactory$$anon$7: 0
}, false, "scala.reflect.ManifestFactory$$anon$7", ScalaJS.d.s_reflect_AnyValManifest, {
  s_reflect_ManifestFactory$$anon$7: 1,
  s_reflect_AnyValManifest: 1,
  s_reflect_Manifest: 1,
  s_reflect_ClassTag: 1,
  s_Equals: 1,
  s_reflect_ClassManifestDeprecatedApis: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$7.prototype.$classData = ScalaJS.d.s_reflect_ManifestFactory$$anon$7;
/** @constructor */
ScalaJS.c.s_reflect_ManifestFactory$$anon$8 = (function() {
  ScalaJS.c.s_reflect_AnyValManifest.call(this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$8.prototype = new ScalaJS.h.s_reflect_AnyValManifest();
ScalaJS.c.s_reflect_ManifestFactory$$anon$8.prototype.constructor = ScalaJS.c.s_reflect_ManifestFactory$$anon$8;
/** @constructor */
ScalaJS.h.s_reflect_ManifestFactory$$anon$8 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ManifestFactory$$anon$8.prototype = ScalaJS.c.s_reflect_ManifestFactory$$anon$8.prototype;
ScalaJS.c.s_reflect_ManifestFactory$$anon$8.prototype.init___ = (function() {
  return (ScalaJS.c.s_reflect_AnyValManifest.prototype.init___T.call(this, "Char"), this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$8.prototype.newArray__I__O = (function(len) {
  return this.newArray__I__AC(len)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$8.prototype.newArray__I__AC = (function(len) {
  return ScalaJS.newArrayObject(ScalaJS.d.C.getArrayOf(), [len])
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$8.prototype.runtimeClass__jl_Class = (function() {
  return ScalaJS.m.jl_Character().TYPE$1
});
ScalaJS.is.s_reflect_ManifestFactory$$anon$8 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ManifestFactory$$anon$8)))
});
ScalaJS.as.s_reflect_ManifestFactory$$anon$8 = (function(obj) {
  return ((ScalaJS.is.s_reflect_ManifestFactory$$anon$8(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ManifestFactory$$anon$8"))
});
ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$8 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ManifestFactory$$anon$8)))
});
ScalaJS.asArrayOf.s_reflect_ManifestFactory$$anon$8 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$8(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ManifestFactory$$anon$8;", depth))
});
ScalaJS.d.s_reflect_ManifestFactory$$anon$8 = new ScalaJS.ClassTypeData({
  s_reflect_ManifestFactory$$anon$8: 0
}, false, "scala.reflect.ManifestFactory$$anon$8", ScalaJS.d.s_reflect_AnyValManifest, {
  s_reflect_ManifestFactory$$anon$8: 1,
  s_reflect_AnyValManifest: 1,
  s_reflect_Manifest: 1,
  s_reflect_ClassTag: 1,
  s_Equals: 1,
  s_reflect_ClassManifestDeprecatedApis: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$8.prototype.$classData = ScalaJS.d.s_reflect_ManifestFactory$$anon$8;
/** @constructor */
ScalaJS.c.s_reflect_ManifestFactory$$anon$9 = (function() {
  ScalaJS.c.s_reflect_AnyValManifest.call(this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$9.prototype = new ScalaJS.h.s_reflect_AnyValManifest();
ScalaJS.c.s_reflect_ManifestFactory$$anon$9.prototype.constructor = ScalaJS.c.s_reflect_ManifestFactory$$anon$9;
/** @constructor */
ScalaJS.h.s_reflect_ManifestFactory$$anon$9 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ManifestFactory$$anon$9.prototype = ScalaJS.c.s_reflect_ManifestFactory$$anon$9.prototype;
ScalaJS.c.s_reflect_ManifestFactory$$anon$9.prototype.init___ = (function() {
  return (ScalaJS.c.s_reflect_AnyValManifest.prototype.init___T.call(this, "Int"), this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$9.prototype.newArray__I__O = (function(len) {
  return this.newArray__I__AI(len)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$9.prototype.newArray__I__AI = (function(len) {
  return ScalaJS.newArrayObject(ScalaJS.d.I.getArrayOf(), [len])
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$9.prototype.runtimeClass__jl_Class = (function() {
  return ScalaJS.m.jl_Integer().TYPE$1
});
ScalaJS.is.s_reflect_ManifestFactory$$anon$9 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ManifestFactory$$anon$9)))
});
ScalaJS.as.s_reflect_ManifestFactory$$anon$9 = (function(obj) {
  return ((ScalaJS.is.s_reflect_ManifestFactory$$anon$9(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ManifestFactory$$anon$9"))
});
ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$9 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ManifestFactory$$anon$9)))
});
ScalaJS.asArrayOf.s_reflect_ManifestFactory$$anon$9 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$9(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ManifestFactory$$anon$9;", depth))
});
ScalaJS.d.s_reflect_ManifestFactory$$anon$9 = new ScalaJS.ClassTypeData({
  s_reflect_ManifestFactory$$anon$9: 0
}, false, "scala.reflect.ManifestFactory$$anon$9", ScalaJS.d.s_reflect_AnyValManifest, {
  s_reflect_ManifestFactory$$anon$9: 1,
  s_reflect_AnyValManifest: 1,
  s_reflect_Manifest: 1,
  s_reflect_ClassTag: 1,
  s_Equals: 1,
  s_reflect_ClassManifestDeprecatedApis: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$9.prototype.$classData = ScalaJS.d.s_reflect_ManifestFactory$$anon$9;
/** @constructor */
ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest = (function() {
  ScalaJS.c.s_reflect_ManifestFactory$ClassTypeManifest.call(this);
  this.toString$2 = null;
  this.hashCode$2 = 0
});
ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest.prototype = new ScalaJS.h.s_reflect_ManifestFactory$ClassTypeManifest();
ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest.prototype.constructor = ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest;
/** @constructor */
ScalaJS.h.s_reflect_ManifestFactory$PhantomManifest = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ManifestFactory$PhantomManifest.prototype = ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest.prototype;
ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest.prototype.equals__O__Z = (function(that) {
  return (this === that)
});
ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest.prototype.toString__T = (function() {
  return this.toString$2
});
ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest.prototype.hashCode__I = (function() {
  return this.hashCode$2
});
ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest.prototype.init___jl_Class__T = (function(_runtimeClass, toString) {
  this.toString$2 = toString;
  ScalaJS.c.s_reflect_ManifestFactory$ClassTypeManifest.prototype.init___s_Option__jl_Class__sci_List.call(this, ScalaJS.m.s_None(), _runtimeClass, ScalaJS.m.sci_Nil());
  this.hashCode$2 = (ScalaJS.m.jl_System(), 42);
  return this
});
ScalaJS.is.s_reflect_ManifestFactory$PhantomManifest = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ManifestFactory$PhantomManifest)))
});
ScalaJS.as.s_reflect_ManifestFactory$PhantomManifest = (function(obj) {
  return ((ScalaJS.is.s_reflect_ManifestFactory$PhantomManifest(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ManifestFactory$PhantomManifest"))
});
ScalaJS.isArrayOf.s_reflect_ManifestFactory$PhantomManifest = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ManifestFactory$PhantomManifest)))
});
ScalaJS.asArrayOf.s_reflect_ManifestFactory$PhantomManifest = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ManifestFactory$PhantomManifest(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ManifestFactory$PhantomManifest;", depth))
});
ScalaJS.d.s_reflect_ManifestFactory$PhantomManifest = new ScalaJS.ClassTypeData({
  s_reflect_ManifestFactory$PhantomManifest: 0
}, false, "scala.reflect.ManifestFactory$PhantomManifest", ScalaJS.d.s_reflect_ManifestFactory$ClassTypeManifest, {
  s_reflect_ManifestFactory$PhantomManifest: 1,
  s_reflect_ManifestFactory$ClassTypeManifest: 1,
  s_reflect_Manifest: 1,
  s_reflect_ClassTag: 1,
  s_Equals: 1,
  s_reflect_ClassManifestDeprecatedApis: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest.prototype.$classData = ScalaJS.d.s_reflect_ManifestFactory$PhantomManifest;
/** @constructor */
ScalaJS.c.s_util_control_BreakControl = (function() {
  ScalaJS.c.jl_Throwable.call(this)
});
ScalaJS.c.s_util_control_BreakControl.prototype = new ScalaJS.h.jl_Throwable();
ScalaJS.c.s_util_control_BreakControl.prototype.constructor = ScalaJS.c.s_util_control_BreakControl;
/** @constructor */
ScalaJS.h.s_util_control_BreakControl = (function() {
  /*<skip>*/
});
ScalaJS.h.s_util_control_BreakControl.prototype = ScalaJS.c.s_util_control_BreakControl.prototype;
ScalaJS.c.s_util_control_BreakControl.prototype.init___ = (function() {
  return (ScalaJS.c.jl_Throwable.prototype.init___.call(this), this)
});
ScalaJS.c.s_util_control_BreakControl.prototype.fillInStackTrace__jl_Throwable = (function() {
  return ScalaJS.i.s_util_control_NoStackTrace$class__fillInStackTrace__s_util_control_NoStackTrace__jl_Throwable(this)
});
ScalaJS.is.s_util_control_BreakControl = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_util_control_BreakControl)))
});
ScalaJS.as.s_util_control_BreakControl = (function(obj) {
  return ((ScalaJS.is.s_util_control_BreakControl(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.util.control.BreakControl"))
});
ScalaJS.isArrayOf.s_util_control_BreakControl = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_util_control_BreakControl)))
});
ScalaJS.asArrayOf.s_util_control_BreakControl = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_util_control_BreakControl(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.util.control.BreakControl;", depth))
});
ScalaJS.d.s_util_control_BreakControl = new ScalaJS.ClassTypeData({
  s_util_control_BreakControl: 0
}, false, "scala.util.control.BreakControl", ScalaJS.d.jl_Throwable, {
  s_util_control_BreakControl: 1,
  s_util_control_ControlThrowable: 1,
  s_util_control_NoStackTrace: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_util_control_BreakControl.prototype.$classData = ScalaJS.d.s_util_control_BreakControl;
/** @constructor */
ScalaJS.c.s_util_hashing_MurmurHash3$ = (function() {
  ScalaJS.c.s_util_hashing_MurmurHash3.call(this);
  this.arraySeed$2 = 0;
  this.stringSeed$2 = 0;
  this.productSeed$2 = 0;
  this.symmetricSeed$2 = 0;
  this.traversableSeed$2 = 0;
  this.seqSeed$2 = 0;
  this.mapSeed$2 = 0;
  this.setSeed$2 = 0
});
ScalaJS.c.s_util_hashing_MurmurHash3$.prototype = new ScalaJS.h.s_util_hashing_MurmurHash3();
ScalaJS.c.s_util_hashing_MurmurHash3$.prototype.constructor = ScalaJS.c.s_util_hashing_MurmurHash3$;
/** @constructor */
ScalaJS.h.s_util_hashing_MurmurHash3$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_util_hashing_MurmurHash3$.prototype = ScalaJS.c.s_util_hashing_MurmurHash3$.prototype;
ScalaJS.c.s_util_hashing_MurmurHash3$.prototype.init___ = (function() {
  ScalaJS.n.s_util_hashing_MurmurHash3 = this;
  this.seqSeed$2 = ScalaJS.objectHashCode("Seq");
  this.mapSeed$2 = ScalaJS.objectHashCode("Map");
  this.setSeed$2 = ScalaJS.objectHashCode("Set");
  return this
});
ScalaJS.c.s_util_hashing_MurmurHash3$.prototype.seqHash__sc_Seq__I = (function(xs) {
  if (ScalaJS.is.sci_List(xs)) {
    var x2 = ScalaJS.as.sci_List(xs);
    return this.listHash__sci_List__I__I(x2, this.seqSeed$2)
  } else {
    return this.orderedHash__sc_TraversableOnce__I__I(xs, this.seqSeed$2)
  }
});
ScalaJS.is.s_util_hashing_MurmurHash3$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_util_hashing_MurmurHash3$)))
});
ScalaJS.as.s_util_hashing_MurmurHash3$ = (function(obj) {
  return ((ScalaJS.is.s_util_hashing_MurmurHash3$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.util.hashing.MurmurHash3$"))
});
ScalaJS.isArrayOf.s_util_hashing_MurmurHash3$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_util_hashing_MurmurHash3$)))
});
ScalaJS.asArrayOf.s_util_hashing_MurmurHash3$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_util_hashing_MurmurHash3$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.util.hashing.MurmurHash3$;", depth))
});
ScalaJS.d.s_util_hashing_MurmurHash3$ = new ScalaJS.ClassTypeData({
  s_util_hashing_MurmurHash3$: 0
}, false, "scala.util.hashing.MurmurHash3$", ScalaJS.d.s_util_hashing_MurmurHash3, {
  s_util_hashing_MurmurHash3$: 1,
  s_util_hashing_MurmurHash3: 1,
  O: 1
});
ScalaJS.c.s_util_hashing_MurmurHash3$.prototype.$classData = ScalaJS.d.s_util_hashing_MurmurHash3$;
ScalaJS.n.s_util_hashing_MurmurHash3 = (void 0);
ScalaJS.m.s_util_hashing_MurmurHash3 = (function() {
  if ((!ScalaJS.n.s_util_hashing_MurmurHash3)) {
    ScalaJS.n.s_util_hashing_MurmurHash3 = new ScalaJS.c.s_util_hashing_MurmurHash3$().init___()
  };
  return ScalaJS.n.s_util_hashing_MurmurHash3
});
/** @constructor */
ScalaJS.c.s_xml_TopScope$ = (function() {
  ScalaJS.c.s_xml_NamespaceBinding.call(this)
});
ScalaJS.c.s_xml_TopScope$.prototype = new ScalaJS.h.s_xml_NamespaceBinding();
ScalaJS.c.s_xml_TopScope$.prototype.constructor = ScalaJS.c.s_xml_TopScope$;
/** @constructor */
ScalaJS.h.s_xml_TopScope$ = (function() {
  /*<skip>*/
});
ScalaJS.h.s_xml_TopScope$.prototype = ScalaJS.c.s_xml_TopScope$.prototype;
ScalaJS.c.s_xml_TopScope$.prototype.init___ = (function() {
  ScalaJS.c.s_xml_NamespaceBinding.prototype.init___T__T__s_xml_NamespaceBinding.call(this, null, null, null);
  ScalaJS.n.s_xml_TopScope = this;
  return this
});
ScalaJS.c.s_xml_TopScope$.prototype.toString__T = (function() {
  return ""
});
ScalaJS.is.s_xml_TopScope$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_xml_TopScope$)))
});
ScalaJS.as.s_xml_TopScope$ = (function(obj) {
  return ((ScalaJS.is.s_xml_TopScope$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.xml.TopScope$"))
});
ScalaJS.isArrayOf.s_xml_TopScope$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_xml_TopScope$)))
});
ScalaJS.asArrayOf.s_xml_TopScope$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_xml_TopScope$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.xml.TopScope$;", depth))
});
ScalaJS.d.s_xml_TopScope$ = new ScalaJS.ClassTypeData({
  s_xml_TopScope$: 0
}, false, "scala.xml.TopScope$", ScalaJS.d.s_xml_NamespaceBinding, {
  s_xml_TopScope$: 1,
  s_xml_NamespaceBinding: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  s_Product: 1,
  s_xml_Equality: 1,
  s_Equals: 1,
  O: 1
});
ScalaJS.c.s_xml_TopScope$.prototype.$classData = ScalaJS.d.s_xml_TopScope$;
ScalaJS.n.s_xml_TopScope = (void 0);
ScalaJS.m.s_xml_TopScope = (function() {
  if ((!ScalaJS.n.s_xml_TopScope)) {
    ScalaJS.n.s_xml_TopScope = new ScalaJS.c.s_xml_TopScope$().init___()
  };
  return ScalaJS.n.s_xml_TopScope
});
/** @constructor */
ScalaJS.c.sc_AbstractIterable = (function() {
  ScalaJS.c.sc_AbstractTraversable.call(this)
});
ScalaJS.c.sc_AbstractIterable.prototype = new ScalaJS.h.sc_AbstractTraversable();
ScalaJS.c.sc_AbstractIterable.prototype.constructor = ScalaJS.c.sc_AbstractIterable;
/** @constructor */
ScalaJS.h.sc_AbstractIterable = (function() {
  /*<skip>*/
});
ScalaJS.h.sc_AbstractIterable.prototype = ScalaJS.c.sc_AbstractIterable.prototype;
ScalaJS.c.sc_AbstractIterable.prototype.sameElements__sc_GenIterable__Z = (function(that) {
  return ScalaJS.i.sc_IterableLike$class__sameElements__sc_IterableLike__sc_GenIterable__Z(this, that)
});
ScalaJS.c.sc_AbstractIterable.prototype.foreach__F1__V = (function(f) {
  var this$1 = this.iterator__sc_Iterator();
  ScalaJS.i.sc_Iterator$class__foreach__sc_Iterator__F1__V(this$1, f)
});
ScalaJS.c.sc_AbstractIterable.prototype.toStream__sci_Stream = (function() {
  return this.iterator__sc_Iterator().toStream__sci_Stream()
});
ScalaJS.c.sc_AbstractIterable.prototype.copyToArray__O__I__I__V = (function(xs, start, len) {
  ScalaJS.i.sc_IterableLike$class__copyToArray__sc_IterableLike__O__I__I__V(this, xs, start, len)
});
ScalaJS.is.sc_AbstractIterable = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_AbstractIterable)))
});
ScalaJS.as.sc_AbstractIterable = (function(obj) {
  return ((ScalaJS.is.sc_AbstractIterable(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.AbstractIterable"))
});
ScalaJS.isArrayOf.sc_AbstractIterable = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_AbstractIterable)))
});
ScalaJS.asArrayOf.sc_AbstractIterable = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_AbstractIterable(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.AbstractIterable;", depth))
});
ScalaJS.d.sc_AbstractIterable = new ScalaJS.ClassTypeData({
  sc_AbstractIterable: 0
}, false, "scala.collection.AbstractIterable", ScalaJS.d.sc_AbstractTraversable, {
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sc_AbstractIterable.prototype.$classData = ScalaJS.d.sc_AbstractIterable;
/** @constructor */
ScalaJS.c.sc_IndexedSeqLike$Elements = (function() {
  ScalaJS.c.sc_AbstractIterator.call(this);
  this.start$2 = 0;
  this.end$2 = 0;
  this.index$2 = 0;
  this.$$outer$f = null
});
ScalaJS.c.sc_IndexedSeqLike$Elements.prototype = new ScalaJS.h.sc_AbstractIterator();
ScalaJS.c.sc_IndexedSeqLike$Elements.prototype.constructor = ScalaJS.c.sc_IndexedSeqLike$Elements;
/** @constructor */
ScalaJS.h.sc_IndexedSeqLike$Elements = (function() {
  /*<skip>*/
});
ScalaJS.h.sc_IndexedSeqLike$Elements.prototype = ScalaJS.c.sc_IndexedSeqLike$Elements.prototype;
ScalaJS.c.sc_IndexedSeqLike$Elements.prototype.next__O = (function() {
  if ((this.index$2 >= this.end$2)) {
    ScalaJS.m.sc_Iterator().empty$1.next__O()
  };
  var x = this.$$outer$f.apply__I__O(this.index$2);
  this.index$2 = ((this.index$2 + 1) | 0);
  return x
});
ScalaJS.c.sc_IndexedSeqLike$Elements.prototype.init___sc_IndexedSeqLike__I__I = (function($$outer, start, end) {
  this.start$2 = start;
  this.end$2 = end;
  if (($$outer === null)) {
    throw new ScalaJS.c.jl_NullPointerException().init___()
  } else {
    this.$$outer$f = $$outer
  };
  this.index$2 = start;
  return this
});
ScalaJS.c.sc_IndexedSeqLike$Elements.prototype.hasNext__Z = (function() {
  return (this.index$2 < this.end$2)
});
ScalaJS.is.sc_IndexedSeqLike$Elements = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_IndexedSeqLike$Elements)))
});
ScalaJS.as.sc_IndexedSeqLike$Elements = (function(obj) {
  return ((ScalaJS.is.sc_IndexedSeqLike$Elements(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.IndexedSeqLike$Elements"))
});
ScalaJS.isArrayOf.sc_IndexedSeqLike$Elements = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_IndexedSeqLike$Elements)))
});
ScalaJS.asArrayOf.sc_IndexedSeqLike$Elements = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_IndexedSeqLike$Elements(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.IndexedSeqLike$Elements;", depth))
});
ScalaJS.d.sc_IndexedSeqLike$Elements = new ScalaJS.ClassTypeData({
  sc_IndexedSeqLike$Elements: 0
}, false, "scala.collection.IndexedSeqLike$Elements", ScalaJS.d.sc_AbstractIterator, {
  sc_IndexedSeqLike$Elements: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sc_BufferedIterator: 1,
  sc_AbstractIterator: 1,
  sc_Iterator: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  O: 1
});
ScalaJS.c.sc_IndexedSeqLike$Elements.prototype.$classData = ScalaJS.d.sc_IndexedSeqLike$Elements;
/** @constructor */
ScalaJS.c.sc_Iterator$$anon$2 = (function() {
  ScalaJS.c.sc_AbstractIterator.call(this)
});
ScalaJS.c.sc_Iterator$$anon$2.prototype = new ScalaJS.h.sc_AbstractIterator();
ScalaJS.c.sc_Iterator$$anon$2.prototype.constructor = ScalaJS.c.sc_Iterator$$anon$2;
/** @constructor */
ScalaJS.h.sc_Iterator$$anon$2 = (function() {
  /*<skip>*/
});
ScalaJS.h.sc_Iterator$$anon$2.prototype = ScalaJS.c.sc_Iterator$$anon$2.prototype;
ScalaJS.c.sc_Iterator$$anon$2.prototype.next__O = (function() {
  this.next__sr_Nothing$()
});
ScalaJS.c.sc_Iterator$$anon$2.prototype.next__sr_Nothing$ = (function() {
  throw new ScalaJS.c.ju_NoSuchElementException().init___T("next on empty iterator")
});
ScalaJS.c.sc_Iterator$$anon$2.prototype.hasNext__Z = (function() {
  return false
});
ScalaJS.is.sc_Iterator$$anon$2 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_Iterator$$anon$2)))
});
ScalaJS.as.sc_Iterator$$anon$2 = (function(obj) {
  return ((ScalaJS.is.sc_Iterator$$anon$2(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.Iterator$$anon$2"))
});
ScalaJS.isArrayOf.sc_Iterator$$anon$2 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_Iterator$$anon$2)))
});
ScalaJS.asArrayOf.sc_Iterator$$anon$2 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_Iterator$$anon$2(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.Iterator$$anon$2;", depth))
});
ScalaJS.d.sc_Iterator$$anon$2 = new ScalaJS.ClassTypeData({
  sc_Iterator$$anon$2: 0
}, false, "scala.collection.Iterator$$anon$2", ScalaJS.d.sc_AbstractIterator, {
  sc_Iterator$$anon$2: 1,
  sc_AbstractIterator: 1,
  sc_Iterator: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  O: 1
});
ScalaJS.c.sc_Iterator$$anon$2.prototype.$classData = ScalaJS.d.sc_Iterator$$anon$2;
/** @constructor */
ScalaJS.c.sc_LinearSeqLike$$anon$1 = (function() {
  ScalaJS.c.sc_AbstractIterator.call(this);
  this.these$2 = null;
  this.$$outer$2 = null
});
ScalaJS.c.sc_LinearSeqLike$$anon$1.prototype = new ScalaJS.h.sc_AbstractIterator();
ScalaJS.c.sc_LinearSeqLike$$anon$1.prototype.constructor = ScalaJS.c.sc_LinearSeqLike$$anon$1;
/** @constructor */
ScalaJS.h.sc_LinearSeqLike$$anon$1 = (function() {
  /*<skip>*/
});
ScalaJS.h.sc_LinearSeqLike$$anon$1.prototype = ScalaJS.c.sc_LinearSeqLike$$anon$1.prototype;
ScalaJS.c.sc_LinearSeqLike$$anon$1.prototype.init___sc_LinearSeqLike = (function($$outer) {
  if (($$outer === null)) {
    throw new ScalaJS.c.jl_NullPointerException().init___()
  } else {
    this.$$outer$2 = $$outer
  };
  this.these$2 = $$outer;
  return this
});
ScalaJS.c.sc_LinearSeqLike$$anon$1.prototype.next__O = (function() {
  if (this.hasNext__Z()) {
    var result = this.these$2.head__O();
    this.these$2 = ScalaJS.as.sc_LinearSeqLike(this.these$2.tail__O());
    return result
  } else {
    return ScalaJS.m.sc_Iterator().empty$1.next__O()
  }
});
ScalaJS.c.sc_LinearSeqLike$$anon$1.prototype.hasNext__Z = (function() {
  return (!this.these$2.isEmpty__Z())
});
ScalaJS.is.sc_LinearSeqLike$$anon$1 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_LinearSeqLike$$anon$1)))
});
ScalaJS.as.sc_LinearSeqLike$$anon$1 = (function(obj) {
  return ((ScalaJS.is.sc_LinearSeqLike$$anon$1(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.LinearSeqLike$$anon$1"))
});
ScalaJS.isArrayOf.sc_LinearSeqLike$$anon$1 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_LinearSeqLike$$anon$1)))
});
ScalaJS.asArrayOf.sc_LinearSeqLike$$anon$1 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_LinearSeqLike$$anon$1(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.LinearSeqLike$$anon$1;", depth))
});
ScalaJS.d.sc_LinearSeqLike$$anon$1 = new ScalaJS.ClassTypeData({
  sc_LinearSeqLike$$anon$1: 0
}, false, "scala.collection.LinearSeqLike$$anon$1", ScalaJS.d.sc_AbstractIterator, {
  sc_LinearSeqLike$$anon$1: 1,
  sc_AbstractIterator: 1,
  sc_Iterator: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  O: 1
});
ScalaJS.c.sc_LinearSeqLike$$anon$1.prototype.$classData = ScalaJS.d.sc_LinearSeqLike$$anon$1;
/** @constructor */
ScalaJS.c.scg_GenSetFactory = (function() {
  ScalaJS.c.scg_GenericCompanion.call(this)
});
ScalaJS.c.scg_GenSetFactory.prototype = new ScalaJS.h.scg_GenericCompanion();
ScalaJS.c.scg_GenSetFactory.prototype.constructor = ScalaJS.c.scg_GenSetFactory;
/** @constructor */
ScalaJS.h.scg_GenSetFactory = (function() {
  /*<skip>*/
});
ScalaJS.h.scg_GenSetFactory.prototype = ScalaJS.c.scg_GenSetFactory.prototype;
ScalaJS.is.scg_GenSetFactory = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scg_GenSetFactory)))
});
ScalaJS.as.scg_GenSetFactory = (function(obj) {
  return ((ScalaJS.is.scg_GenSetFactory(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.generic.GenSetFactory"))
});
ScalaJS.isArrayOf.scg_GenSetFactory = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scg_GenSetFactory)))
});
ScalaJS.asArrayOf.scg_GenSetFactory = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scg_GenSetFactory(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.generic.GenSetFactory;", depth))
});
ScalaJS.d.scg_GenSetFactory = new ScalaJS.ClassTypeData({
  scg_GenSetFactory: 0
}, false, "scala.collection.generic.GenSetFactory", ScalaJS.d.scg_GenericCompanion, {
  scg_GenSetFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.scg_GenSetFactory.prototype.$classData = ScalaJS.d.scg_GenSetFactory;
/** @constructor */
ScalaJS.c.scg_GenTraversableFactory = (function() {
  ScalaJS.c.scg_GenericCompanion.call(this);
  this.ReusableCBF$2 = null;
  this.bitmap$0$2 = false
});
ScalaJS.c.scg_GenTraversableFactory.prototype = new ScalaJS.h.scg_GenericCompanion();
ScalaJS.c.scg_GenTraversableFactory.prototype.constructor = ScalaJS.c.scg_GenTraversableFactory;
/** @constructor */
ScalaJS.h.scg_GenTraversableFactory = (function() {
  /*<skip>*/
});
ScalaJS.h.scg_GenTraversableFactory.prototype = ScalaJS.c.scg_GenTraversableFactory.prototype;
ScalaJS.c.scg_GenTraversableFactory.prototype.ReusableCBF$lzycompute__p2__scg_GenTraversableFactory$GenericCanBuildFrom = (function() {
  if ((!this.bitmap$0$2)) {
    this.ReusableCBF$2 = new ScalaJS.c.scg_GenTraversableFactory$ReusableCBF().init___scg_GenTraversableFactory(this);
    this.bitmap$0$2 = true
  };
  return this.ReusableCBF$2
});
ScalaJS.c.scg_GenTraversableFactory.prototype.ReusableCBF__scg_GenTraversableFactory$GenericCanBuildFrom = (function() {
  return ((!this.bitmap$0$2) ? this.ReusableCBF$lzycompute__p2__scg_GenTraversableFactory$GenericCanBuildFrom() : this.ReusableCBF$2)
});
ScalaJS.is.scg_GenTraversableFactory = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scg_GenTraversableFactory)))
});
ScalaJS.as.scg_GenTraversableFactory = (function(obj) {
  return ((ScalaJS.is.scg_GenTraversableFactory(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.generic.GenTraversableFactory"))
});
ScalaJS.isArrayOf.scg_GenTraversableFactory = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scg_GenTraversableFactory)))
});
ScalaJS.asArrayOf.scg_GenTraversableFactory = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scg_GenTraversableFactory(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.generic.GenTraversableFactory;", depth))
});
ScalaJS.d.scg_GenTraversableFactory = new ScalaJS.ClassTypeData({
  scg_GenTraversableFactory: 0
}, false, "scala.collection.generic.GenTraversableFactory", ScalaJS.d.scg_GenericCompanion, {
  scg_GenTraversableFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.scg_GenTraversableFactory.prototype.$classData = ScalaJS.d.scg_GenTraversableFactory;
/** @constructor */
ScalaJS.c.scg_GenTraversableFactory$ReusableCBF = (function() {
  ScalaJS.c.scg_GenTraversableFactory$GenericCanBuildFrom.call(this)
});
ScalaJS.c.scg_GenTraversableFactory$ReusableCBF.prototype = new ScalaJS.h.scg_GenTraversableFactory$GenericCanBuildFrom();
ScalaJS.c.scg_GenTraversableFactory$ReusableCBF.prototype.constructor = ScalaJS.c.scg_GenTraversableFactory$ReusableCBF;
/** @constructor */
ScalaJS.h.scg_GenTraversableFactory$ReusableCBF = (function() {
  /*<skip>*/
});
ScalaJS.h.scg_GenTraversableFactory$ReusableCBF.prototype = ScalaJS.c.scg_GenTraversableFactory$ReusableCBF.prototype;
ScalaJS.c.scg_GenTraversableFactory$ReusableCBF.prototype.apply__scm_Builder = (function() {
  return this.$$outer$f.newBuilder__scm_Builder()
});
ScalaJS.is.scg_GenTraversableFactory$ReusableCBF = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scg_GenTraversableFactory$ReusableCBF)))
});
ScalaJS.as.scg_GenTraversableFactory$ReusableCBF = (function(obj) {
  return ((ScalaJS.is.scg_GenTraversableFactory$ReusableCBF(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.generic.GenTraversableFactory$ReusableCBF"))
});
ScalaJS.isArrayOf.scg_GenTraversableFactory$ReusableCBF = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scg_GenTraversableFactory$ReusableCBF)))
});
ScalaJS.asArrayOf.scg_GenTraversableFactory$ReusableCBF = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scg_GenTraversableFactory$ReusableCBF(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.generic.GenTraversableFactory$ReusableCBF;", depth))
});
ScalaJS.d.scg_GenTraversableFactory$ReusableCBF = new ScalaJS.ClassTypeData({
  scg_GenTraversableFactory$ReusableCBF: 0
}, false, "scala.collection.generic.GenTraversableFactory$ReusableCBF", ScalaJS.d.scg_GenTraversableFactory$GenericCanBuildFrom, {
  scg_GenTraversableFactory$ReusableCBF: 1,
  scg_GenTraversableFactory$GenericCanBuildFrom: 1,
  scg_CanBuildFrom: 1,
  O: 1
});
ScalaJS.c.scg_GenTraversableFactory$ReusableCBF.prototype.$classData = ScalaJS.d.scg_GenTraversableFactory$ReusableCBF;
/** @constructor */
ScalaJS.c.scg_MapFactory = (function() {
  ScalaJS.c.scg_GenMapFactory.call(this)
});
ScalaJS.c.scg_MapFactory.prototype = new ScalaJS.h.scg_GenMapFactory();
ScalaJS.c.scg_MapFactory.prototype.constructor = ScalaJS.c.scg_MapFactory;
/** @constructor */
ScalaJS.h.scg_MapFactory = (function() {
  /*<skip>*/
});
ScalaJS.h.scg_MapFactory.prototype = ScalaJS.c.scg_MapFactory.prototype;
ScalaJS.is.scg_MapFactory = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scg_MapFactory)))
});
ScalaJS.as.scg_MapFactory = (function(obj) {
  return ((ScalaJS.is.scg_MapFactory(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.generic.MapFactory"))
});
ScalaJS.isArrayOf.scg_MapFactory = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scg_MapFactory)))
});
ScalaJS.asArrayOf.scg_MapFactory = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scg_MapFactory(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.generic.MapFactory;", depth))
});
ScalaJS.d.scg_MapFactory = new ScalaJS.ClassTypeData({
  scg_MapFactory: 0
}, false, "scala.collection.generic.MapFactory", ScalaJS.d.scg_GenMapFactory, {
  scg_MapFactory: 1,
  scg_GenMapFactory: 1,
  O: 1
});
ScalaJS.c.scg_MapFactory.prototype.$classData = ScalaJS.d.scg_MapFactory;
/** @constructor */
ScalaJS.c.sci_ListSet$$anon$1 = (function() {
  ScalaJS.c.sc_AbstractIterator.call(this);
  this.that$2 = null
});
ScalaJS.c.sci_ListSet$$anon$1.prototype = new ScalaJS.h.sc_AbstractIterator();
ScalaJS.c.sci_ListSet$$anon$1.prototype.constructor = ScalaJS.c.sci_ListSet$$anon$1;
/** @constructor */
ScalaJS.h.sci_ListSet$$anon$1 = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_ListSet$$anon$1.prototype = ScalaJS.c.sci_ListSet$$anon$1.prototype;
ScalaJS.c.sci_ListSet$$anon$1.prototype.next__O = (function() {
  var this$1 = this.that$2;
  if (ScalaJS.i.sc_TraversableOnce$class__nonEmpty__sc_TraversableOnce__Z(this$1)) {
    var res = this.that$2.head__O();
    this.that$2 = this.that$2.tail__sci_ListSet();
    return res
  } else {
    return ScalaJS.m.sc_Iterator().empty$1.next__O()
  }
});
ScalaJS.c.sci_ListSet$$anon$1.prototype.init___sci_ListSet = (function($$outer) {
  this.that$2 = $$outer;
  return this
});
ScalaJS.c.sci_ListSet$$anon$1.prototype.hasNext__Z = (function() {
  var this$1 = this.that$2;
  return ScalaJS.i.sc_TraversableOnce$class__nonEmpty__sc_TraversableOnce__Z(this$1)
});
ScalaJS.is.sci_ListSet$$anon$1 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_ListSet$$anon$1)))
});
ScalaJS.as.sci_ListSet$$anon$1 = (function(obj) {
  return ((ScalaJS.is.sci_ListSet$$anon$1(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.ListSet$$anon$1"))
});
ScalaJS.isArrayOf.sci_ListSet$$anon$1 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_ListSet$$anon$1)))
});
ScalaJS.asArrayOf.sci_ListSet$$anon$1 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_ListSet$$anon$1(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.ListSet$$anon$1;", depth))
});
ScalaJS.d.sci_ListSet$$anon$1 = new ScalaJS.ClassTypeData({
  sci_ListSet$$anon$1: 0
}, false, "scala.collection.immutable.ListSet$$anon$1", ScalaJS.d.sc_AbstractIterator, {
  sci_ListSet$$anon$1: 1,
  sc_AbstractIterator: 1,
  sc_Iterator: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  O: 1
});
ScalaJS.c.sci_ListSet$$anon$1.prototype.$classData = ScalaJS.d.sci_ListSet$$anon$1;
/** @constructor */
ScalaJS.c.sci_Stream$StreamBuilder = (function() {
  ScalaJS.c.scm_LazyBuilder.call(this)
});
ScalaJS.c.sci_Stream$StreamBuilder.prototype = new ScalaJS.h.scm_LazyBuilder();
ScalaJS.c.sci_Stream$StreamBuilder.prototype.constructor = ScalaJS.c.sci_Stream$StreamBuilder;
/** @constructor */
ScalaJS.h.sci_Stream$StreamBuilder = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Stream$StreamBuilder.prototype = ScalaJS.c.sci_Stream$StreamBuilder.prototype;
ScalaJS.c.sci_Stream$StreamBuilder.prototype.result__O = (function() {
  return this.result__sci_Stream()
});
ScalaJS.c.sci_Stream$StreamBuilder.prototype.result__sci_Stream = (function() {
  var this$1 = this.parts$1;
  return ScalaJS.as.sci_Stream(this$1.scala$collection$mutable$ListBuffer$$start$6.toStream__sci_Stream().flatMap__F1__scg_CanBuildFrom__O(new ScalaJS.c.sjsr_AnonFunction1().init___sjs_js_Function1((function(x$3$2) {
    var x$3 = ScalaJS.as.sc_TraversableOnce(x$3$2);
    return x$3.toStream__sci_Stream()
  })), new ScalaJS.c.sci_Stream$StreamCanBuildFrom().init___()))
});
ScalaJS.is.sci_Stream$StreamBuilder = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Stream$StreamBuilder)))
});
ScalaJS.as.sci_Stream$StreamBuilder = (function(obj) {
  return ((ScalaJS.is.sci_Stream$StreamBuilder(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Stream$StreamBuilder"))
});
ScalaJS.isArrayOf.sci_Stream$StreamBuilder = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Stream$StreamBuilder)))
});
ScalaJS.asArrayOf.sci_Stream$StreamBuilder = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Stream$StreamBuilder(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Stream$StreamBuilder;", depth))
});
ScalaJS.d.sci_Stream$StreamBuilder = new ScalaJS.ClassTypeData({
  sci_Stream$StreamBuilder: 0
}, false, "scala.collection.immutable.Stream$StreamBuilder", ScalaJS.d.scm_LazyBuilder, {
  sci_Stream$StreamBuilder: 1,
  scm_LazyBuilder: 1,
  scm_Builder: 1,
  scg_Growable: 1,
  scg_Clearable: 1,
  O: 1
});
ScalaJS.c.sci_Stream$StreamBuilder.prototype.$classData = ScalaJS.d.sci_Stream$StreamBuilder;
/** @constructor */
ScalaJS.c.sci_Stream$StreamCanBuildFrom = (function() {
  ScalaJS.c.scg_GenTraversableFactory$GenericCanBuildFrom.call(this)
});
ScalaJS.c.sci_Stream$StreamCanBuildFrom.prototype = new ScalaJS.h.scg_GenTraversableFactory$GenericCanBuildFrom();
ScalaJS.c.sci_Stream$StreamCanBuildFrom.prototype.constructor = ScalaJS.c.sci_Stream$StreamCanBuildFrom;
/** @constructor */
ScalaJS.h.sci_Stream$StreamCanBuildFrom = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Stream$StreamCanBuildFrom.prototype = ScalaJS.c.sci_Stream$StreamCanBuildFrom.prototype;
ScalaJS.c.sci_Stream$StreamCanBuildFrom.prototype.init___ = (function() {
  return (ScalaJS.c.scg_GenTraversableFactory$GenericCanBuildFrom.prototype.init___scg_GenTraversableFactory.call(this, ScalaJS.m.sci_Stream()), this)
});
ScalaJS.is.sci_Stream$StreamCanBuildFrom = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Stream$StreamCanBuildFrom)))
});
ScalaJS.as.sci_Stream$StreamCanBuildFrom = (function(obj) {
  return ((ScalaJS.is.sci_Stream$StreamCanBuildFrom(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Stream$StreamCanBuildFrom"))
});
ScalaJS.isArrayOf.sci_Stream$StreamCanBuildFrom = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Stream$StreamCanBuildFrom)))
});
ScalaJS.asArrayOf.sci_Stream$StreamCanBuildFrom = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Stream$StreamCanBuildFrom(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Stream$StreamCanBuildFrom;", depth))
});
ScalaJS.d.sci_Stream$StreamCanBuildFrom = new ScalaJS.ClassTypeData({
  sci_Stream$StreamCanBuildFrom: 0
}, false, "scala.collection.immutable.Stream$StreamCanBuildFrom", ScalaJS.d.scg_GenTraversableFactory$GenericCanBuildFrom, {
  sci_Stream$StreamCanBuildFrom: 1,
  scg_GenTraversableFactory$GenericCanBuildFrom: 1,
  scg_CanBuildFrom: 1,
  O: 1
});
ScalaJS.c.sci_Stream$StreamCanBuildFrom.prototype.$classData = ScalaJS.d.sci_Stream$StreamCanBuildFrom;
/** @constructor */
ScalaJS.c.sci_StreamIterator = (function() {
  ScalaJS.c.sc_AbstractIterator.call(this);
  this.these$2 = null
});
ScalaJS.c.sci_StreamIterator.prototype = new ScalaJS.h.sc_AbstractIterator();
ScalaJS.c.sci_StreamIterator.prototype.constructor = ScalaJS.c.sci_StreamIterator;
/** @constructor */
ScalaJS.h.sci_StreamIterator = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_StreamIterator.prototype = ScalaJS.c.sci_StreamIterator.prototype;
ScalaJS.c.sci_StreamIterator.prototype.next__O = (function() {
  if (ScalaJS.i.sc_Iterator$class__isEmpty__sc_Iterator__Z(this)) {
    return ScalaJS.m.sc_Iterator().empty$1.next__O()
  } else {
    var cur = this.these$2.v__sci_Stream();
    var result = cur.head__O();
    this.these$2 = new ScalaJS.c.sci_StreamIterator$LazyCell().init___sci_StreamIterator__F0(this, new ScalaJS.c.sjsr_AnonFunction0().init___sjs_js_Function0((function(cur$1) {
      return (function() {
        return ScalaJS.as.sci_Stream(cur$1.tail__O())
      })
    })(cur)));
    return result
  }
});
ScalaJS.c.sci_StreamIterator.prototype.init___sci_Stream = (function(self) {
  this.these$2 = new ScalaJS.c.sci_StreamIterator$LazyCell().init___sci_StreamIterator__F0(this, new ScalaJS.c.sjsr_AnonFunction0().init___sjs_js_Function0((function(self$1) {
    return (function() {
      return self$1
    })
  })(self)));
  return this
});
ScalaJS.c.sci_StreamIterator.prototype.hasNext__Z = (function() {
  var this$1 = this.these$2.v__sci_Stream();
  return ScalaJS.i.sc_TraversableOnce$class__nonEmpty__sc_TraversableOnce__Z(this$1)
});
ScalaJS.c.sci_StreamIterator.prototype.toStream__sci_Stream = (function() {
  var result = this.these$2.v__sci_Stream();
  this.these$2 = new ScalaJS.c.sci_StreamIterator$LazyCell().init___sci_StreamIterator__F0(this, new ScalaJS.c.sjsr_AnonFunction0().init___sjs_js_Function0((function() {
    return ScalaJS.m.sci_Stream$Empty()
  })));
  return result
});
ScalaJS.is.sci_StreamIterator = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_StreamIterator)))
});
ScalaJS.as.sci_StreamIterator = (function(obj) {
  return ((ScalaJS.is.sci_StreamIterator(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.StreamIterator"))
});
ScalaJS.isArrayOf.sci_StreamIterator = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_StreamIterator)))
});
ScalaJS.asArrayOf.sci_StreamIterator = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_StreamIterator(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.StreamIterator;", depth))
});
ScalaJS.d.sci_StreamIterator = new ScalaJS.ClassTypeData({
  sci_StreamIterator: 0
}, false, "scala.collection.immutable.StreamIterator", ScalaJS.d.sc_AbstractIterator, {
  sci_StreamIterator: 1,
  sc_AbstractIterator: 1,
  sc_Iterator: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  O: 1
});
ScalaJS.c.sci_StreamIterator.prototype.$classData = ScalaJS.d.sci_StreamIterator;
/** @constructor */
ScalaJS.c.sci_TrieIterator = (function() {
  ScalaJS.c.sc_AbstractIterator.call(this);
  this.elems$2 = null;
  this.scala$collection$immutable$TrieIterator$$depth$f = 0;
  this.scala$collection$immutable$TrieIterator$$arrayStack$f = null;
  this.scala$collection$immutable$TrieIterator$$posStack$f = null;
  this.scala$collection$immutable$TrieIterator$$arrayD$f = null;
  this.scala$collection$immutable$TrieIterator$$posD$f = 0;
  this.scala$collection$immutable$TrieIterator$$subIter$f = null
});
ScalaJS.c.sci_TrieIterator.prototype = new ScalaJS.h.sc_AbstractIterator();
ScalaJS.c.sci_TrieIterator.prototype.constructor = ScalaJS.c.sci_TrieIterator;
/** @constructor */
ScalaJS.h.sci_TrieIterator = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_TrieIterator.prototype = ScalaJS.c.sci_TrieIterator.prototype;
ScalaJS.c.sci_TrieIterator.prototype.isContainer__p2__O__Z = (function(x) {
  return (ScalaJS.is.sci_HashMap$HashMap1(x) || ScalaJS.is.sci_HashSet$HashSet1(x))
});
ScalaJS.c.sci_TrieIterator.prototype.next__O = (function() {
  if ((this.scala$collection$immutable$TrieIterator$$subIter$f !== null)) {
    var el = this.scala$collection$immutable$TrieIterator$$subIter$f.next__O();
    if ((!this.scala$collection$immutable$TrieIterator$$subIter$f.hasNext__Z())) {
      this.scala$collection$immutable$TrieIterator$$subIter$f = null
    };
    return el
  } else {
    return this.next0__p2__Asci_Iterable__I__O(this.scala$collection$immutable$TrieIterator$$arrayD$f, this.scala$collection$immutable$TrieIterator$$posD$f)
  }
});
ScalaJS.c.sci_TrieIterator.prototype.initPosStack__AI = (function() {
  return ScalaJS.newArrayObject(ScalaJS.d.I.getArrayOf(), [6])
});
ScalaJS.c.sci_TrieIterator.prototype.hasNext__Z = (function() {
  return ((this.scala$collection$immutable$TrieIterator$$subIter$f !== null) || (this.scala$collection$immutable$TrieIterator$$depth$f >= 0))
});
ScalaJS.c.sci_TrieIterator.prototype.next0__p2__Asci_Iterable__I__O = (function(elems, i) {
  tailCallLoop: while (true) {
    if ((i === ((elems.u["length"] - 1) | 0))) {
      this.scala$collection$immutable$TrieIterator$$depth$f = ((this.scala$collection$immutable$TrieIterator$$depth$f - 1) | 0);
      if ((this.scala$collection$immutable$TrieIterator$$depth$f >= 0)) {
        this.scala$collection$immutable$TrieIterator$$arrayD$f = this.scala$collection$immutable$TrieIterator$$arrayStack$f.u[this.scala$collection$immutable$TrieIterator$$depth$f];
        this.scala$collection$immutable$TrieIterator$$posD$f = this.scala$collection$immutable$TrieIterator$$posStack$f.u[this.scala$collection$immutable$TrieIterator$$depth$f];
        this.scala$collection$immutable$TrieIterator$$arrayStack$f.u[this.scala$collection$immutable$TrieIterator$$depth$f] = null
      } else {
        this.scala$collection$immutable$TrieIterator$$arrayD$f = null;
        this.scala$collection$immutable$TrieIterator$$posD$f = 0
      }
    } else {
      this.scala$collection$immutable$TrieIterator$$posD$f = ((this.scala$collection$immutable$TrieIterator$$posD$f + 1) | 0)
    };
    var m = elems.u[i];
    if (this.isContainer__p2__O__Z(m)) {
      return this.getElem__O__O(m)
    } else if (this.isTrie__p2__O__Z(m)) {
      if ((this.scala$collection$immutable$TrieIterator$$depth$f >= 0)) {
        this.scala$collection$immutable$TrieIterator$$arrayStack$f.u[this.scala$collection$immutable$TrieIterator$$depth$f] = this.scala$collection$immutable$TrieIterator$$arrayD$f;
        this.scala$collection$immutable$TrieIterator$$posStack$f.u[this.scala$collection$immutable$TrieIterator$$depth$f] = this.scala$collection$immutable$TrieIterator$$posD$f
      };
      this.scala$collection$immutable$TrieIterator$$depth$f = ((this.scala$collection$immutable$TrieIterator$$depth$f + 1) | 0);
      this.scala$collection$immutable$TrieIterator$$arrayD$f = this.getElems__p2__sci_Iterable__Asci_Iterable(m);
      this.scala$collection$immutable$TrieIterator$$posD$f = 0;
      var temp$elems = this.getElems__p2__sci_Iterable__Asci_Iterable(m);
      elems = temp$elems;
      i = 0;
      continue tailCallLoop
    } else {
      this.scala$collection$immutable$TrieIterator$$subIter$f = m.iterator__sc_Iterator();
      return this.next__O()
    }
  }
});
ScalaJS.c.sci_TrieIterator.prototype.getElems__p2__sci_Iterable__Asci_Iterable = (function(x) {
  if (ScalaJS.is.sci_HashMap$HashTrieMap(x)) {
    var x2 = ScalaJS.as.sci_HashMap$HashTrieMap(x);
    var jsx$1 = ScalaJS.asArrayOf.sc_AbstractIterable(x2.elems__Asci_HashMap(), 1)
  } else if (ScalaJS.is.sci_HashSet$HashTrieSet(x)) {
    var x3 = ScalaJS.as.sci_HashSet$HashTrieSet(x);
    var jsx$1 = x3.elems$5
  } else {
    var jsx$1;
    throw new ScalaJS.c.s_MatchError().init___O(x)
  };
  return ScalaJS.asArrayOf.sci_Iterable(jsx$1, 1)
});
ScalaJS.c.sci_TrieIterator.prototype.init___Asci_Iterable = (function(elems) {
  this.elems$2 = elems;
  this.scala$collection$immutable$TrieIterator$$depth$f = 0;
  this.scala$collection$immutable$TrieIterator$$arrayStack$f = this.initArrayStack__AAsci_Iterable();
  this.scala$collection$immutable$TrieIterator$$posStack$f = this.initPosStack__AI();
  this.scala$collection$immutable$TrieIterator$$arrayD$f = this.elems$2;
  this.scala$collection$immutable$TrieIterator$$posD$f = 0;
  this.scala$collection$immutable$TrieIterator$$subIter$f = null;
  return this
});
ScalaJS.c.sci_TrieIterator.prototype.isTrie__p2__O__Z = (function(x) {
  return (ScalaJS.is.sci_HashMap$HashTrieMap(x) || ScalaJS.is.sci_HashSet$HashTrieSet(x))
});
ScalaJS.c.sci_TrieIterator.prototype.initArrayStack__AAsci_Iterable = (function() {
  return ScalaJS.newArrayObject(ScalaJS.d.sci_Iterable.getArrayOf().getArrayOf(), [6])
});
ScalaJS.is.sci_TrieIterator = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_TrieIterator)))
});
ScalaJS.as.sci_TrieIterator = (function(obj) {
  return ((ScalaJS.is.sci_TrieIterator(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.TrieIterator"))
});
ScalaJS.isArrayOf.sci_TrieIterator = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_TrieIterator)))
});
ScalaJS.asArrayOf.sci_TrieIterator = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_TrieIterator(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.TrieIterator;", depth))
});
ScalaJS.d.sci_TrieIterator = new ScalaJS.ClassTypeData({
  sci_TrieIterator: 0
}, false, "scala.collection.immutable.TrieIterator", ScalaJS.d.sc_AbstractIterator, {
  sci_TrieIterator: 1,
  sc_AbstractIterator: 1,
  sc_Iterator: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  O: 1
});
ScalaJS.c.sci_TrieIterator.prototype.$classData = ScalaJS.d.sci_TrieIterator;
/** @constructor */
ScalaJS.c.sci_Vector$VectorReusableCBF = (function() {
  ScalaJS.c.scg_GenTraversableFactory$GenericCanBuildFrom.call(this)
});
ScalaJS.c.sci_Vector$VectorReusableCBF.prototype = new ScalaJS.h.scg_GenTraversableFactory$GenericCanBuildFrom();
ScalaJS.c.sci_Vector$VectorReusableCBF.prototype.constructor = ScalaJS.c.sci_Vector$VectorReusableCBF;
/** @constructor */
ScalaJS.h.sci_Vector$VectorReusableCBF = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Vector$VectorReusableCBF.prototype = ScalaJS.c.sci_Vector$VectorReusableCBF.prototype;
ScalaJS.c.sci_Vector$VectorReusableCBF.prototype.init___ = (function() {
  return (ScalaJS.c.scg_GenTraversableFactory$GenericCanBuildFrom.prototype.init___scg_GenTraversableFactory.call(this, ScalaJS.m.sci_Vector()), this)
});
ScalaJS.c.sci_Vector$VectorReusableCBF.prototype.apply__scm_Builder = (function() {
  return (ScalaJS.m.sci_Vector(), new ScalaJS.c.sci_VectorBuilder().init___())
});
ScalaJS.is.sci_Vector$VectorReusableCBF = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Vector$VectorReusableCBF)))
});
ScalaJS.as.sci_Vector$VectorReusableCBF = (function(obj) {
  return ((ScalaJS.is.sci_Vector$VectorReusableCBF(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Vector$VectorReusableCBF"))
});
ScalaJS.isArrayOf.sci_Vector$VectorReusableCBF = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Vector$VectorReusableCBF)))
});
ScalaJS.asArrayOf.sci_Vector$VectorReusableCBF = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Vector$VectorReusableCBF(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Vector$VectorReusableCBF;", depth))
});
ScalaJS.d.sci_Vector$VectorReusableCBF = new ScalaJS.ClassTypeData({
  sci_Vector$VectorReusableCBF: 0
}, false, "scala.collection.immutable.Vector$VectorReusableCBF", ScalaJS.d.scg_GenTraversableFactory$GenericCanBuildFrom, {
  sci_Vector$VectorReusableCBF: 1,
  scg_GenTraversableFactory$GenericCanBuildFrom: 1,
  scg_CanBuildFrom: 1,
  O: 1
});
ScalaJS.c.sci_Vector$VectorReusableCBF.prototype.$classData = ScalaJS.d.sci_Vector$VectorReusableCBF;
/** @constructor */
ScalaJS.c.sci_VectorIterator = (function() {
  ScalaJS.c.sc_AbstractIterator.call(this);
  this.$$undendIndex$2 = 0;
  this.blockIndex$2 = 0;
  this.lo$2 = 0;
  this.endIndex$2 = 0;
  this.endLo$2 = 0;
  this.$$undhasNext$2 = false;
  this.depth$2 = 0;
  this.display0$2 = null;
  this.display1$2 = null;
  this.display2$2 = null;
  this.display3$2 = null;
  this.display4$2 = null;
  this.display5$2 = null
});
ScalaJS.c.sci_VectorIterator.prototype = new ScalaJS.h.sc_AbstractIterator();
ScalaJS.c.sci_VectorIterator.prototype.constructor = ScalaJS.c.sci_VectorIterator;
/** @constructor */
ScalaJS.h.sci_VectorIterator = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_VectorIterator.prototype = ScalaJS.c.sci_VectorIterator.prototype;
ScalaJS.c.sci_VectorIterator.prototype.next__O = (function() {
  if ((!this.$$undhasNext$2)) {
    throw new ScalaJS.c.ju_NoSuchElementException().init___T("reached iterator end")
  };
  var res = this.display0$2.u[this.lo$2];
  this.lo$2 = ((this.lo$2 + 1) | 0);
  if ((this.lo$2 === this.endLo$2)) {
    if ((((this.blockIndex$2 + this.lo$2) | 0) < this.endIndex$2)) {
      var newBlockIndex = ((this.blockIndex$2 + 32) | 0);
      var xor = (this.blockIndex$2 ^ newBlockIndex);
      ScalaJS.i.sci_VectorPointer$class__gotoNextBlockStart__sci_VectorPointer__I__I__V(this, newBlockIndex, xor);
      this.blockIndex$2 = newBlockIndex;
      var x = ((this.endIndex$2 - this.blockIndex$2) | 0);
      this.endLo$2 = ((x < 32) ? x : 32);
      this.lo$2 = 0
    } else {
      this.$$undhasNext$2 = false
    }
  };
  return res
});
ScalaJS.c.sci_VectorIterator.prototype.display3__AO = (function() {
  return this.display3$2
});
ScalaJS.c.sci_VectorIterator.prototype.depth__I = (function() {
  return this.depth$2
});
ScalaJS.c.sci_VectorIterator.prototype.display5$und$eq__AO__V = (function(x$1) {
  this.display5$2 = x$1
});
ScalaJS.c.sci_VectorIterator.prototype.init___I__I = (function(_startIndex, _endIndex) {
  this.$$undendIndex$2 = _endIndex;
  this.blockIndex$2 = (_startIndex & -32);
  this.lo$2 = (_startIndex & 31);
  this.endIndex$2 = _endIndex;
  var x = ((this.endIndex$2 - this.blockIndex$2) | 0);
  this.endLo$2 = ((x < 32) ? x : 32);
  this.$$undhasNext$2 = (((this.blockIndex$2 + this.lo$2) | 0) < this.endIndex$2);
  return this
});
ScalaJS.c.sci_VectorIterator.prototype.display0__AO = (function() {
  return this.display0$2
});
ScalaJS.c.sci_VectorIterator.prototype.display4__AO = (function() {
  return this.display4$2
});
ScalaJS.c.sci_VectorIterator.prototype.display2$und$eq__AO__V = (function(x$1) {
  this.display2$2 = x$1
});
ScalaJS.c.sci_VectorIterator.prototype.display1$und$eq__AO__V = (function(x$1) {
  this.display1$2 = x$1
});
ScalaJS.c.sci_VectorIterator.prototype.hasNext__Z = (function() {
  return this.$$undhasNext$2
});
ScalaJS.c.sci_VectorIterator.prototype.display4$und$eq__AO__V = (function(x$1) {
  this.display4$2 = x$1
});
ScalaJS.c.sci_VectorIterator.prototype.display1__AO = (function() {
  return this.display1$2
});
ScalaJS.c.sci_VectorIterator.prototype.display5__AO = (function() {
  return this.display5$2
});
ScalaJS.c.sci_VectorIterator.prototype.depth$und$eq__I__V = (function(x$1) {
  this.depth$2 = x$1
});
ScalaJS.c.sci_VectorIterator.prototype.display2__AO = (function() {
  return this.display2$2
});
ScalaJS.c.sci_VectorIterator.prototype.display0$und$eq__AO__V = (function(x$1) {
  this.display0$2 = x$1
});
ScalaJS.c.sci_VectorIterator.prototype.display3$und$eq__AO__V = (function(x$1) {
  this.display3$2 = x$1
});
ScalaJS.is.sci_VectorIterator = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_VectorIterator)))
});
ScalaJS.as.sci_VectorIterator = (function(obj) {
  return ((ScalaJS.is.sci_VectorIterator(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.VectorIterator"))
});
ScalaJS.isArrayOf.sci_VectorIterator = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_VectorIterator)))
});
ScalaJS.asArrayOf.sci_VectorIterator = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_VectorIterator(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.VectorIterator;", depth))
});
ScalaJS.d.sci_VectorIterator = new ScalaJS.ClassTypeData({
  sci_VectorIterator: 0
}, false, "scala.collection.immutable.VectorIterator", ScalaJS.d.sc_AbstractIterator, {
  sci_VectorIterator: 1,
  sci_VectorPointer: 1,
  sc_AbstractIterator: 1,
  sc_Iterator: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  O: 1
});
ScalaJS.c.sci_VectorIterator.prototype.$classData = ScalaJS.d.sci_VectorIterator;
/** @constructor */
ScalaJS.c.scm_FlatHashTable$$anon$1 = (function() {
  ScalaJS.c.sc_AbstractIterator.call(this);
  this.i$2 = 0;
  this.$$outer$2 = null
});
ScalaJS.c.scm_FlatHashTable$$anon$1.prototype = new ScalaJS.h.sc_AbstractIterator();
ScalaJS.c.scm_FlatHashTable$$anon$1.prototype.constructor = ScalaJS.c.scm_FlatHashTable$$anon$1;
/** @constructor */
ScalaJS.h.scm_FlatHashTable$$anon$1 = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_FlatHashTable$$anon$1.prototype = ScalaJS.c.scm_FlatHashTable$$anon$1.prototype;
ScalaJS.c.scm_FlatHashTable$$anon$1.prototype.next__O = (function() {
  if (this.hasNext__Z()) {
    this.i$2 = ((this.i$2 + 1) | 0);
    return this.$$outer$2.table$5.u[((this.i$2 - 1) | 0)]
  } else {
    return ScalaJS.m.sc_Iterator().empty$1.next__O()
  }
});
ScalaJS.c.scm_FlatHashTable$$anon$1.prototype.init___scm_FlatHashTable = (function($$outer) {
  if (($$outer === null)) {
    throw new ScalaJS.c.jl_NullPointerException().init___()
  } else {
    this.$$outer$2 = $$outer
  };
  this.i$2 = 0;
  return this
});
ScalaJS.c.scm_FlatHashTable$$anon$1.prototype.hasNext__Z = (function() {
  while (((this.i$2 < this.$$outer$2.table$5.u["length"]) && (null === this.$$outer$2.table$5.u[this.i$2]))) {
    this.i$2 = ((this.i$2 + 1) | 0)
  };
  return (this.i$2 < this.$$outer$2.table$5.u["length"])
});
ScalaJS.is.scm_FlatHashTable$$anon$1 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_FlatHashTable$$anon$1)))
});
ScalaJS.as.scm_FlatHashTable$$anon$1 = (function(obj) {
  return ((ScalaJS.is.scm_FlatHashTable$$anon$1(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.FlatHashTable$$anon$1"))
});
ScalaJS.isArrayOf.scm_FlatHashTable$$anon$1 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_FlatHashTable$$anon$1)))
});
ScalaJS.asArrayOf.scm_FlatHashTable$$anon$1 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_FlatHashTable$$anon$1(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.FlatHashTable$$anon$1;", depth))
});
ScalaJS.d.scm_FlatHashTable$$anon$1 = new ScalaJS.ClassTypeData({
  scm_FlatHashTable$$anon$1: 0
}, false, "scala.collection.mutable.FlatHashTable$$anon$1", ScalaJS.d.sc_AbstractIterator, {
  scm_FlatHashTable$$anon$1: 1,
  sc_AbstractIterator: 1,
  sc_Iterator: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  O: 1
});
ScalaJS.c.scm_FlatHashTable$$anon$1.prototype.$classData = ScalaJS.d.scm_FlatHashTable$$anon$1;
/** @constructor */
ScalaJS.c.scm_ListBuffer$$anon$1 = (function() {
  ScalaJS.c.sc_AbstractIterator.call(this);
  this.cursor$2 = null;
  this.delivered$2 = 0;
  this.$$outer$2 = null
});
ScalaJS.c.scm_ListBuffer$$anon$1.prototype = new ScalaJS.h.sc_AbstractIterator();
ScalaJS.c.scm_ListBuffer$$anon$1.prototype.constructor = ScalaJS.c.scm_ListBuffer$$anon$1;
/** @constructor */
ScalaJS.h.scm_ListBuffer$$anon$1 = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_ListBuffer$$anon$1.prototype = ScalaJS.c.scm_ListBuffer$$anon$1.prototype;
ScalaJS.c.scm_ListBuffer$$anon$1.prototype.init___scm_ListBuffer = (function($$outer) {
  if (($$outer === null)) {
    throw new ScalaJS.c.jl_NullPointerException().init___()
  } else {
    this.$$outer$2 = $$outer
  };
  this.cursor$2 = null;
  this.delivered$2 = 0;
  return this
});
ScalaJS.c.scm_ListBuffer$$anon$1.prototype.next__O = (function() {
  if ((!this.hasNext__Z())) {
    throw new ScalaJS.c.ju_NoSuchElementException().init___T("next on empty Iterator")
  } else {
    if ((this.cursor$2 === null)) {
      this.cursor$2 = this.$$outer$2.scala$collection$mutable$ListBuffer$$start$6
    } else {
      this.cursor$2 = ScalaJS.as.sci_List(this.cursor$2.tail__O())
    };
    this.delivered$2 = ((this.delivered$2 + 1) | 0);
    return this.cursor$2.head__O()
  }
});
ScalaJS.c.scm_ListBuffer$$anon$1.prototype.hasNext__Z = (function() {
  var jsx$1 = this.delivered$2;
  var this$1 = this.$$outer$2;
  return (jsx$1 < this$1.len$6)
});
ScalaJS.is.scm_ListBuffer$$anon$1 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_ListBuffer$$anon$1)))
});
ScalaJS.as.scm_ListBuffer$$anon$1 = (function(obj) {
  return ((ScalaJS.is.scm_ListBuffer$$anon$1(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.ListBuffer$$anon$1"))
});
ScalaJS.isArrayOf.scm_ListBuffer$$anon$1 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_ListBuffer$$anon$1)))
});
ScalaJS.asArrayOf.scm_ListBuffer$$anon$1 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_ListBuffer$$anon$1(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.ListBuffer$$anon$1;", depth))
});
ScalaJS.d.scm_ListBuffer$$anon$1 = new ScalaJS.ClassTypeData({
  scm_ListBuffer$$anon$1: 0
}, false, "scala.collection.mutable.ListBuffer$$anon$1", ScalaJS.d.sc_AbstractIterator, {
  scm_ListBuffer$$anon$1: 1,
  sc_AbstractIterator: 1,
  sc_Iterator: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  O: 1
});
ScalaJS.c.scm_ListBuffer$$anon$1.prototype.$classData = ScalaJS.d.scm_ListBuffer$$anon$1;
/** @constructor */
ScalaJS.c.sjsr_AnonFunction0 = (function() {
  ScalaJS.c.sr_AbstractFunction0.call(this);
  this.f$2 = null
});
ScalaJS.c.sjsr_AnonFunction0.prototype = new ScalaJS.h.sr_AbstractFunction0();
ScalaJS.c.sjsr_AnonFunction0.prototype.constructor = ScalaJS.c.sjsr_AnonFunction0;
/** @constructor */
ScalaJS.h.sjsr_AnonFunction0 = (function() {
  /*<skip>*/
});
ScalaJS.h.sjsr_AnonFunction0.prototype = ScalaJS.c.sjsr_AnonFunction0.prototype;
ScalaJS.c.sjsr_AnonFunction0.prototype.apply__O = (function() {
  return (0, this.f$2)()
});
ScalaJS.c.sjsr_AnonFunction0.prototype.init___sjs_js_Function0 = (function(f) {
  this.f$2 = f;
  return this
});
ScalaJS.is.sjsr_AnonFunction0 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sjsr_AnonFunction0)))
});
ScalaJS.as.sjsr_AnonFunction0 = (function(obj) {
  return ((ScalaJS.is.sjsr_AnonFunction0(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.scalajs.runtime.AnonFunction0"))
});
ScalaJS.isArrayOf.sjsr_AnonFunction0 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sjsr_AnonFunction0)))
});
ScalaJS.asArrayOf.sjsr_AnonFunction0 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sjsr_AnonFunction0(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.scalajs.runtime.AnonFunction0;", depth))
});
ScalaJS.d.sjsr_AnonFunction0 = new ScalaJS.ClassTypeData({
  sjsr_AnonFunction0: 0
}, false, "scala.scalajs.runtime.AnonFunction0", ScalaJS.d.sr_AbstractFunction0, {
  sjsr_AnonFunction0: 1,
  sr_AbstractFunction0: 1,
  F0: 1,
  O: 1
});
ScalaJS.c.sjsr_AnonFunction0.prototype.$classData = ScalaJS.d.sjsr_AnonFunction0;
/** @constructor */
ScalaJS.c.sjsr_AnonFunction1 = (function() {
  ScalaJS.c.sr_AbstractFunction1.call(this);
  this.f$2 = null
});
ScalaJS.c.sjsr_AnonFunction1.prototype = new ScalaJS.h.sr_AbstractFunction1();
ScalaJS.c.sjsr_AnonFunction1.prototype.constructor = ScalaJS.c.sjsr_AnonFunction1;
/** @constructor */
ScalaJS.h.sjsr_AnonFunction1 = (function() {
  /*<skip>*/
});
ScalaJS.h.sjsr_AnonFunction1.prototype = ScalaJS.c.sjsr_AnonFunction1.prototype;
ScalaJS.c.sjsr_AnonFunction1.prototype.apply__O__O = (function(arg1) {
  return (0, this.f$2)(arg1)
});
ScalaJS.c.sjsr_AnonFunction1.prototype.init___sjs_js_Function1 = (function(f) {
  this.f$2 = f;
  return this
});
ScalaJS.is.sjsr_AnonFunction1 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sjsr_AnonFunction1)))
});
ScalaJS.as.sjsr_AnonFunction1 = (function(obj) {
  return ((ScalaJS.is.sjsr_AnonFunction1(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.scalajs.runtime.AnonFunction1"))
});
ScalaJS.isArrayOf.sjsr_AnonFunction1 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sjsr_AnonFunction1)))
});
ScalaJS.asArrayOf.sjsr_AnonFunction1 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sjsr_AnonFunction1(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.scalajs.runtime.AnonFunction1;", depth))
});
ScalaJS.d.sjsr_AnonFunction1 = new ScalaJS.ClassTypeData({
  sjsr_AnonFunction1: 0
}, false, "scala.scalajs.runtime.AnonFunction1", ScalaJS.d.sr_AbstractFunction1, {
  sjsr_AnonFunction1: 1,
  sr_AbstractFunction1: 1,
  F1: 1,
  O: 1
});
ScalaJS.c.sjsr_AnonFunction1.prototype.$classData = ScalaJS.d.sjsr_AnonFunction1;
/** @constructor */
ScalaJS.c.sjsr_AnonFunction2 = (function() {
  ScalaJS.c.sr_AbstractFunction2.call(this);
  this.f$2 = null
});
ScalaJS.c.sjsr_AnonFunction2.prototype = new ScalaJS.h.sr_AbstractFunction2();
ScalaJS.c.sjsr_AnonFunction2.prototype.constructor = ScalaJS.c.sjsr_AnonFunction2;
/** @constructor */
ScalaJS.h.sjsr_AnonFunction2 = (function() {
  /*<skip>*/
});
ScalaJS.h.sjsr_AnonFunction2.prototype = ScalaJS.c.sjsr_AnonFunction2.prototype;
ScalaJS.c.sjsr_AnonFunction2.prototype.init___sjs_js_Function2 = (function(f) {
  this.f$2 = f;
  return this
});
ScalaJS.c.sjsr_AnonFunction2.prototype.apply__O__O__O = (function(arg1, arg2) {
  return (0, this.f$2)(arg1, arg2)
});
ScalaJS.is.sjsr_AnonFunction2 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sjsr_AnonFunction2)))
});
ScalaJS.as.sjsr_AnonFunction2 = (function(obj) {
  return ((ScalaJS.is.sjsr_AnonFunction2(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.scalajs.runtime.AnonFunction2"))
});
ScalaJS.isArrayOf.sjsr_AnonFunction2 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sjsr_AnonFunction2)))
});
ScalaJS.asArrayOf.sjsr_AnonFunction2 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sjsr_AnonFunction2(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.scalajs.runtime.AnonFunction2;", depth))
});
ScalaJS.d.sjsr_AnonFunction2 = new ScalaJS.ClassTypeData({
  sjsr_AnonFunction2: 0
}, false, "scala.scalajs.runtime.AnonFunction2", ScalaJS.d.sr_AbstractFunction2, {
  sjsr_AnonFunction2: 1,
  sr_AbstractFunction2: 1,
  F2: 1,
  O: 1
});
ScalaJS.c.sjsr_AnonFunction2.prototype.$classData = ScalaJS.d.sjsr_AnonFunction2;
/** @constructor */
ScalaJS.c.sjsr_RuntimeLong = (function() {
  ScalaJS.c.jl_Number.call(this);
  this.l$2 = 0;
  this.m$2 = 0;
  this.h$2 = 0
});
ScalaJS.c.sjsr_RuntimeLong.prototype = new ScalaJS.h.jl_Number();
ScalaJS.c.sjsr_RuntimeLong.prototype.constructor = ScalaJS.c.sjsr_RuntimeLong;
/** @constructor */
ScalaJS.h.sjsr_RuntimeLong = (function() {
  /*<skip>*/
});
ScalaJS.h.sjsr_RuntimeLong.prototype = ScalaJS.c.sjsr_RuntimeLong.prototype;
ScalaJS.c.sjsr_RuntimeLong.prototype.longValue__J = (function() {
  return this
});
ScalaJS.c.sjsr_RuntimeLong.prototype.chunk13$1__p2__sjsr_RuntimeLong__T5 = (function(v) {
  return new ScalaJS.c.T5().init___O__O__O__O__O((v.l$2 & 8191), ((v.l$2 >> 13) | ((v.m$2 & 15) << 9)), ((v.m$2 >> 4) & 8191), ((v.m$2 >> 17) | ((v.h$2 & 255) << 5)), ((v.h$2 & 1048320) >> 8))
});
ScalaJS.c.sjsr_RuntimeLong.prototype.powerOfTwo__p2__I = (function() {
  return (((((this.h$2 === 0) && (this.m$2 === 0)) && (this.l$2 !== 0)) && ((this.l$2 & ((this.l$2 - 1) | 0)) === 0)) ? ScalaJS.m.jl_Integer().numberOfTrailingZeros__I__I(this.l$2) : (((((this.h$2 === 0) && (this.m$2 !== 0)) && (this.l$2 === 0)) && ((this.m$2 & ((this.m$2 - 1) | 0)) === 0)) ? ((ScalaJS.m.jl_Integer().numberOfTrailingZeros__I__I(this.m$2) + 22) | 0) : (((((this.h$2 !== 0) && (this.m$2 === 0)) && (this.l$2 === 0)) && ((this.h$2 & ((this.h$2 - 1) | 0)) === 0)) ? ((ScalaJS.m.jl_Integer().numberOfTrailingZeros__I__I(this.h$2) + 44) | 0) : -1)))
});
ScalaJS.c.sjsr_RuntimeLong.prototype.$$greater$eq__sjsr_RuntimeLong__Z = (function(y) {
  return (ScalaJS.anyRefEqEq(this, y) || this.$$greater__sjsr_RuntimeLong__Z(y))
});
ScalaJS.c.sjsr_RuntimeLong.prototype.scala$scalajs$runtime$RuntimeLong$$isZero__Z = (function() {
  return (((this.l$2 === 0) && (this.m$2 === 0)) && (this.h$2 === 0))
});
ScalaJS.c.sjsr_RuntimeLong.prototype.equals__O__Z = (function(that) {
  if (ScalaJS.is.sjsr_RuntimeLong(that)) {
    var x2 = ScalaJS.as.sjsr_RuntimeLong(that);
    return (((this.l$2 === x2.l$2) && (this.m$2 === x2.m$2)) && (this.h$2 === x2.h$2))
  } else {
    return false
  }
});
ScalaJS.c.sjsr_RuntimeLong.prototype.$$less__sjsr_RuntimeLong__Z = (function(y) {
  return (!this.$$greater$eq__sjsr_RuntimeLong__Z(y))
});
ScalaJS.c.sjsr_RuntimeLong.prototype.toHexString__T = (function() {
  var mp = (this.m$2 >> 2);
  var lp = (this.l$2 | ((this.m$2 & 3) << 22));
  var arg$1 = this.h$2;
  var this$2 = new ScalaJS.c.sci_StringOps().init___T("%05x%05x%06x");
  var args = ScalaJS.m.s_Predef().genericWrapArray__O__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.O.getArrayOf(), [arg$1, mp, lp]));
  return ScalaJS.i.sci_StringLike$class__format__sci_StringLike__sc_Seq__T(this$2, args)
});
ScalaJS.c.sjsr_RuntimeLong.prototype.sign__p2__I = (function() {
  return (this.h$2 >> 19)
});
ScalaJS.c.sjsr_RuntimeLong.prototype.$$times__sjsr_RuntimeLong__sjsr_RuntimeLong = (function(y) {
  var x1 = this.chunk13$1__p2__sjsr_RuntimeLong__T5(this);
  if ((x1 !== null)) {
    var a0 = ScalaJS.uI(x1.$$und1$1);
    var a1 = ScalaJS.uI(x1.$$und2$1);
    var a2 = ScalaJS.uI(x1.$$und3$1);
    var a3 = ScalaJS.uI(x1.$$und4$1);
    var a4 = ScalaJS.uI(x1.$$und5$1);
    var x$1_$_$$und1$1 = a0;
    var x$1_$_$$und2$1 = a1;
    var x$1_$_$$und3$1 = a2;
    var x$1_$_$$und4$1 = a3;
    var x$1_$_$$und5$1 = a4
  } else {
    var x$1_$_$$und1$1;
    var x$1_$_$$und2$1;
    var x$1_$_$$und3$1;
    var x$1_$_$$und4$1;
    var x$1_$_$$und5$1;
    throw new ScalaJS.c.s_MatchError().init___O(x1)
  };
  var a0$2 = ScalaJS.uI(x$1_$_$$und1$1);
  var a1$2 = ScalaJS.uI(x$1_$_$$und2$1);
  var a2$2 = ScalaJS.uI(x$1_$_$$und3$1);
  var a3$2 = ScalaJS.uI(x$1_$_$$und4$1);
  var a4$2 = ScalaJS.uI(x$1_$_$$und5$1);
  var x1$2 = this.chunk13$1__p2__sjsr_RuntimeLong__T5(y);
  if ((x1$2 !== null)) {
    var b0 = ScalaJS.uI(x1$2.$$und1$1);
    var b1 = ScalaJS.uI(x1$2.$$und2$1);
    var b2 = ScalaJS.uI(x1$2.$$und3$1);
    var b3 = ScalaJS.uI(x1$2.$$und4$1);
    var b4 = ScalaJS.uI(x1$2.$$und5$1);
    var x$2_$_$$und1$1 = b0;
    var x$2_$_$$und2$1 = b1;
    var x$2_$_$$und3$1 = b2;
    var x$2_$_$$und4$1 = b3;
    var x$2_$_$$und5$1 = b4
  } else {
    var x$2_$_$$und1$1;
    var x$2_$_$$und2$1;
    var x$2_$_$$und3$1;
    var x$2_$_$$und4$1;
    var x$2_$_$$und5$1;
    throw new ScalaJS.c.s_MatchError().init___O(x1$2)
  };
  var b0$2 = ScalaJS.uI(x$2_$_$$und1$1);
  var b1$2 = ScalaJS.uI(x$2_$_$$und2$1);
  var b2$2 = ScalaJS.uI(x$2_$_$$und3$1);
  var b3$2 = ScalaJS.uI(x$2_$_$$und4$1);
  var b4$2 = ScalaJS.uI(x$2_$_$$und5$1);
  var p0 = ScalaJS.imul(a0$2, b0$2);
  var p1 = ScalaJS.imul(a1$2, b0$2);
  var p2 = ScalaJS.imul(a2$2, b0$2);
  var p3 = ScalaJS.imul(a3$2, b0$2);
  var p4 = ScalaJS.imul(a4$2, b0$2);
  if ((b1$2 !== 0)) {
    p1 = ((p1 + ScalaJS.imul(a0$2, b1$2)) | 0);
    p2 = ((p2 + ScalaJS.imul(a1$2, b1$2)) | 0);
    p3 = ((p3 + ScalaJS.imul(a2$2, b1$2)) | 0);
    p4 = ((p4 + ScalaJS.imul(a3$2, b1$2)) | 0)
  };
  if ((b2$2 !== 0)) {
    p2 = ((p2 + ScalaJS.imul(a0$2, b2$2)) | 0);
    p3 = ((p3 + ScalaJS.imul(a1$2, b2$2)) | 0);
    p4 = ((p4 + ScalaJS.imul(a2$2, b2$2)) | 0)
  };
  if ((b3$2 !== 0)) {
    p3 = ((p3 + ScalaJS.imul(a0$2, b3$2)) | 0);
    p4 = ((p4 + ScalaJS.imul(a1$2, b3$2)) | 0)
  };
  if ((b4$2 !== 0)) {
    p4 = ((p4 + ScalaJS.imul(a0$2, b4$2)) | 0)
  };
  var c00 = (p0 & 4194303);
  var c01 = ((p1 & 511) << 13);
  var c0 = ((c00 + c01) | 0);
  var c10 = (p0 >> 22);
  var c11 = (p1 >> 9);
  var c12 = ((p2 & 262143) << 4);
  var c13 = ((p3 & 31) << 17);
  var c1 = ((((((c10 + c11) | 0) + c12) | 0) + c13) | 0);
  var c22 = (p2 >> 18);
  var c23 = (p3 >> 5);
  var c24 = ((p4 & 4095) << 8);
  var c2 = ((((c22 + c23) | 0) + c24) | 0);
  var c1n = ((c1 + (c0 >> 22)) | 0);
  return ScalaJS.m.sjsr_RuntimeLong().masked__I__I__I__sjsr_RuntimeLong(c0, c1n, ((c2 + (c1n >> 22)) | 0))
});
ScalaJS.c.sjsr_RuntimeLong.prototype.init___I__I__I = (function(l, m, h) {
  this.l$2 = l;
  this.m$2 = m;
  this.h$2 = h;
  return this
});
ScalaJS.c.sjsr_RuntimeLong.prototype.toString0$1__p2__sjsr_RuntimeLong__T__sjsr_RuntimeLong__T = (function(v, acc, tenPowL$1) {
  tailCallLoop: while (true) {
    if (v.scala$scalajs$runtime$RuntimeLong$$isZero__Z()) {
      return acc
    } else {
      var quotRem = v.divMod__p2__sjsr_RuntimeLong__sjs_js_Array(tenPowL$1);
      var quot = ScalaJS.as.sjsr_RuntimeLong(quotRem[0]);
      var rem = ScalaJS.as.sjsr_RuntimeLong(quotRem[1]);
      var digits = ScalaJS.objectToString(rem.toInt__I());
      var zeroPrefix = (quot.scala$scalajs$runtime$RuntimeLong$$isZero__Z() ? "" : ScalaJS.i.sjsr_RuntimeString$class__substring__sjsr_RuntimeString__I__T("000000000", ScalaJS.i.sjsr_RuntimeString$class__length__sjsr_RuntimeString__I(digits)));
      var temp$acc = ((("" + zeroPrefix) + digits) + acc);
      v = quot;
      acc = temp$acc;
      continue tailCallLoop
    }
  }
});
ScalaJS.c.sjsr_RuntimeLong.prototype.$$percent__sjsr_RuntimeLong__sjsr_RuntimeLong = (function(y) {
  return ScalaJS.as.sjsr_RuntimeLong(this.divMod__p2__sjsr_RuntimeLong__sjs_js_Array(y)[1])
});
ScalaJS.c.sjsr_RuntimeLong.prototype.abs__p2__sjsr_RuntimeLong = (function() {
  return ((this.sign__p2__I() === 1) ? this.unary$und$minus__sjsr_RuntimeLong() : this)
});
ScalaJS.c.sjsr_RuntimeLong.prototype.toString__T = (function() {
  if (this.scala$scalajs$runtime$RuntimeLong$$isZero__Z()) {
    return "0"
  } else if (this.isMinValue__p2__Z()) {
    return "-9223372036854775808"
  } else if (this.scala$scalajs$runtime$RuntimeLong$$isNegative__Z()) {
    return ("-" + this.unary$und$minus__sjsr_RuntimeLong().toString__T())
  } else {
    var tenPowL = (ScalaJS.m.sjsr_RuntimeLong(), new ScalaJS.c.sjsr_RuntimeLong().init___I__I__I(1755648, 238, 0));
    return this.toString0$1__p2__sjsr_RuntimeLong__T__sjsr_RuntimeLong__T(this, "", tenPowL)
  }
});
ScalaJS.c.sjsr_RuntimeLong.prototype.scala$scalajs$runtime$RuntimeLong$$setBit__I__sjsr_RuntimeLong = (function(bit) {
  if ((bit < 22)) {
    ScalaJS.m.sjsr_RuntimeLong();
    var l = (this.l$2 | (1 << bit));
    var m = this.m$2;
    var h = this.h$2;
    return new ScalaJS.c.sjsr_RuntimeLong().init___I__I__I(l, m, h)
  } else if ((bit < 44)) {
    ScalaJS.m.sjsr_RuntimeLong();
    var l$1 = this.l$2;
    var m$1 = (this.m$2 | (1 << ((bit - 22) | 0)));
    var h$1 = this.h$2;
    return new ScalaJS.c.sjsr_RuntimeLong().init___I__I__I(l$1, m$1, h$1)
  } else {
    ScalaJS.m.sjsr_RuntimeLong();
    var l$2 = this.l$2;
    var m$2 = this.m$2;
    var h$2 = (this.h$2 | (1 << ((bit - 44) | 0)));
    return new ScalaJS.c.sjsr_RuntimeLong().init___I__I__I(l$2, m$2, h$2)
  }
});
ScalaJS.c.sjsr_RuntimeLong.prototype.$$greater__sjsr_RuntimeLong__Z = (function(y) {
  var signx = this.sign__p2__I();
  var signy = y.sign__p2__I();
  return ((signx === 0) ? ((((signy !== 0) || (this.h$2 > y.h$2)) || ((this.h$2 === y.h$2) && (this.m$2 > y.m$2))) || (((this.h$2 === y.h$2) && (this.m$2 === y.m$2)) && (this.l$2 > y.l$2))) : (!((((signy === 0) || (this.h$2 < y.h$2)) || ((this.h$2 === y.h$2) && (this.m$2 < y.m$2))) || (((this.h$2 === y.h$2) && (this.m$2 === y.m$2)) && (this.l$2 <= y.l$2)))))
});
ScalaJS.c.sjsr_RuntimeLong.prototype.$$less$less__I__sjsr_RuntimeLong = (function(n_in) {
  var n = (n_in & 63);
  if ((n < 22)) {
    var remBits = ((22 - n) | 0);
    return ScalaJS.m.sjsr_RuntimeLong().masked__I__I__I__sjsr_RuntimeLong((this.l$2 << n), ((this.m$2 << n) | (this.l$2 >> remBits)), ((this.h$2 << n) | (this.m$2 >> remBits)))
  } else if ((n < 44)) {
    var shfBits = ((n - 22) | 0);
    var remBits$2 = ((44 - n) | 0);
    return ScalaJS.m.sjsr_RuntimeLong().masked__I__I__I__sjsr_RuntimeLong(0, (this.l$2 << shfBits), ((this.m$2 << shfBits) | (this.l$2 >> remBits$2)))
  } else {
    return ScalaJS.m.sjsr_RuntimeLong().masked__I__I__I__sjsr_RuntimeLong(0, 0, (this.l$2 << ((n - 44) | 0)))
  }
});
ScalaJS.c.sjsr_RuntimeLong.prototype.toInt__I = (function() {
  return (this.l$2 | (this.m$2 << 22))
});
ScalaJS.c.sjsr_RuntimeLong.prototype.unary$und$minus__sjsr_RuntimeLong = (function() {
  var neg0 = ((((~this.l$2) + 1) | 0) & 4194303);
  var neg1 = ((((~this.m$2) + ((neg0 === 0) ? 1 : 0)) | 0) & 4194303);
  var neg2 = ((((~this.h$2) + (((neg0 === 0) && (neg1 === 0)) ? 1 : 0)) | 0) & 1048575);
  ScalaJS.m.sjsr_RuntimeLong();
  return new ScalaJS.c.sjsr_RuntimeLong().init___I__I__I(neg0, neg1, neg2)
});
ScalaJS.c.sjsr_RuntimeLong.prototype.$$plus__sjsr_RuntimeLong__sjsr_RuntimeLong = (function(y) {
  var sum0 = ((this.l$2 + y.l$2) | 0);
  var sum1 = ((((this.m$2 + y.m$2) | 0) + (sum0 >> 22)) | 0);
  var sum2 = ((((this.h$2 + y.h$2) | 0) + (sum1 >> 22)) | 0);
  return ScalaJS.m.sjsr_RuntimeLong().masked__I__I__I__sjsr_RuntimeLong(sum0, sum1, sum2)
});
ScalaJS.c.sjsr_RuntimeLong.prototype.$$greater$greater__I__sjsr_RuntimeLong = (function(n_in) {
  var n = (n_in & 63);
  var negative = ((this.h$2 & 524288) !== 0);
  var xh = (negative ? (this.h$2 | -1048576) : this.h$2);
  if ((n < 22)) {
    var remBits = ((22 - n) | 0);
    return ScalaJS.m.sjsr_RuntimeLong().masked__I__I__I__sjsr_RuntimeLong(((this.l$2 >> n) | (this.m$2 << remBits)), ((this.m$2 >> n) | (xh << remBits)), (xh >> n))
  } else if ((n < 44)) {
    var shfBits = ((n - 22) | 0);
    var remBits$2 = ((44 - n) | 0);
    return ScalaJS.m.sjsr_RuntimeLong().masked__I__I__I__sjsr_RuntimeLong(((this.m$2 >> shfBits) | (xh << remBits$2)), (xh >> shfBits), (negative ? 1048575 : 0))
  } else {
    return ScalaJS.m.sjsr_RuntimeLong().masked__I__I__I__sjsr_RuntimeLong((xh >> ((n - 44) | 0)), (negative ? 4194303 : 0), (negative ? 1048575 : 0))
  }
});
ScalaJS.c.sjsr_RuntimeLong.prototype.toDouble__D = (function() {
  return (this.isMinValue__p2__Z() ? -9.223372036854776E18 : (this.scala$scalajs$runtime$RuntimeLong$$isNegative__Z() ? (-this.unary$und$minus__sjsr_RuntimeLong().toDouble__D()) : ((this.l$2 + (this.m$2 * 4194304.0)) + (this.h$2 * 1.7592186044416E13))))
});
ScalaJS.c.sjsr_RuntimeLong.prototype.divMod__p2__sjsr_RuntimeLong__sjs_js_Array = (function(y) {
  if (y.scala$scalajs$runtime$RuntimeLong$$isZero__Z()) {
    throw new ScalaJS.c.jl_ArithmeticException().init___T("/ by zero")
  } else if (this.scala$scalajs$runtime$RuntimeLong$$isZero__Z()) {
    return [ScalaJS.m.sjsr_RuntimeLong().zero$1, ScalaJS.m.sjsr_RuntimeLong().zero$1]
  } else if (y.isMinValue__p2__Z()) {
    return (this.isMinValue__p2__Z() ? [ScalaJS.m.sjsr_RuntimeLong().one$1, ScalaJS.m.sjsr_RuntimeLong().zero$1] : [ScalaJS.m.sjsr_RuntimeLong().zero$1, this])
  } else {
    var xNegative = this.scala$scalajs$runtime$RuntimeLong$$isNegative__Z();
    var yNegative = y.scala$scalajs$runtime$RuntimeLong$$isNegative__Z();
    var xMinValue = this.isMinValue__p2__Z();
    var absX = this.abs__p2__sjsr_RuntimeLong();
    var absY = y.abs__p2__sjsr_RuntimeLong();
    var pow = y.powerOfTwo__p2__I();
    if ((pow >= 0)) {
      if (xMinValue) {
        var z = this.$$greater$greater__I__sjsr_RuntimeLong(pow);
        return [(yNegative ? z.unary$und$minus__sjsr_RuntimeLong() : z), ScalaJS.m.sjsr_RuntimeLong().zero$1]
      } else {
        var absZ = absX.$$greater$greater__I__sjsr_RuntimeLong(pow);
        var z$2 = ((!(!(xNegative ^ yNegative))) ? absZ.unary$und$minus__sjsr_RuntimeLong() : absZ);
        var remAbs = absX.maskRight__p2__I__sjsr_RuntimeLong(pow);
        var rem = (xNegative ? remAbs.unary$und$minus__sjsr_RuntimeLong() : remAbs);
        return [z$2, rem]
      }
    } else {
      return (xMinValue ? ScalaJS.m.sjsr_RuntimeLong().scala$scalajs$runtime$RuntimeLong$$divModHelper__sjsr_RuntimeLong__sjsr_RuntimeLong__Z__Z__Z__sjs_js_Array(ScalaJS.m.sjsr_RuntimeLong().MaxValue$1, absY, xNegative, yNegative, true) : (absX.$$less__sjsr_RuntimeLong__Z(absY) ? [ScalaJS.m.sjsr_RuntimeLong().zero$1, this] : ScalaJS.m.sjsr_RuntimeLong().scala$scalajs$runtime$RuntimeLong$$divModHelper__sjsr_RuntimeLong__sjsr_RuntimeLong__Z__Z__Z__sjs_js_Array(absX, absY, xNegative, yNegative, false)))
    }
  }
});
ScalaJS.c.sjsr_RuntimeLong.prototype.scala$scalajs$runtime$RuntimeLong$$isNegative__Z = (function() {
  return (this.sign__p2__I() !== 0)
});
ScalaJS.c.sjsr_RuntimeLong.prototype.$$div__sjsr_RuntimeLong__sjsr_RuntimeLong = (function(y) {
  return ScalaJS.as.sjsr_RuntimeLong(this.divMod__p2__sjsr_RuntimeLong__sjs_js_Array(y)[0])
});
ScalaJS.c.sjsr_RuntimeLong.prototype.numberOfLeadingZeros__I = (function() {
  return (((this.h$2 === 0) && (this.m$2 === 0)) ? ((((ScalaJS.m.jl_Integer().numberOfLeadingZeros__I__I(this.l$2) - 10) | 0) + 42) | 0) : ((this.h$2 === 0) ? ((((ScalaJS.m.jl_Integer().numberOfLeadingZeros__I__I(this.m$2) - 10) | 0) + 20) | 0) : ((ScalaJS.m.jl_Integer().numberOfLeadingZeros__I__I(this.h$2) - 12) | 0)))
});
ScalaJS.c.sjsr_RuntimeLong.prototype.isMinValue__p2__Z = (function() {
  return ScalaJS.anyRefEqEq(this, ScalaJS.m.sjsr_RuntimeLong().MinValue$1)
});
ScalaJS.c.sjsr_RuntimeLong.prototype.doubleValue__D = (function() {
  return this.toDouble__D()
});
ScalaJS.c.sjsr_RuntimeLong.prototype.toOctalString__T = (function() {
  var lp = (this.l$2 & 2097151);
  var mp = (((this.m$2 & 1048575) << 1) | (this.l$2 >> 21));
  var hp = ((this.h$2 << 2) | (this.m$2 >> 20));
  var this$2 = new ScalaJS.c.sci_StringOps().init___T("%08o%07o%07o");
  var args = ScalaJS.m.s_Predef().genericWrapArray__O__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.O.getArrayOf(), [hp, mp, lp]));
  return ScalaJS.i.sci_StringLike$class__format__sci_StringLike__sc_Seq__T(this$2, args)
});
ScalaJS.c.sjsr_RuntimeLong.prototype.maskRight__p2__I__sjsr_RuntimeLong = (function(bits) {
  if ((bits <= 22)) {
    ScalaJS.m.sjsr_RuntimeLong();
    var l = (this.l$2 & (((1 << bits) - 1) | 0));
    return new ScalaJS.c.sjsr_RuntimeLong().init___I__I__I(l, 0, 0)
  } else if ((bits <= 44)) {
    ScalaJS.m.sjsr_RuntimeLong();
    var l$1 = this.l$2;
    var m = (this.m$2 & (((1 << ((bits - 22) | 0)) - 1) | 0));
    return new ScalaJS.c.sjsr_RuntimeLong().init___I__I__I(l$1, m, 0)
  } else {
    ScalaJS.m.sjsr_RuntimeLong();
    var l$2 = this.l$2;
    var m$1 = this.m$2;
    var h = (this.h$2 & (((1 << ((bits - 44) | 0)) - 1) | 0));
    return new ScalaJS.c.sjsr_RuntimeLong().init___I__I__I(l$2, m$1, h)
  }
});
ScalaJS.c.sjsr_RuntimeLong.prototype.intValue__I = (function() {
  return this.toInt__I()
});
ScalaJS.c.sjsr_RuntimeLong.prototype.floatValue__F = (function() {
  return this.toDouble__D()
});
ScalaJS.is.sjsr_RuntimeLong = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sjsr_RuntimeLong)))
});
ScalaJS.as.sjsr_RuntimeLong = (function(obj) {
  return ((ScalaJS.is.sjsr_RuntimeLong(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.scalajs.runtime.RuntimeLong"))
});
ScalaJS.isArrayOf.sjsr_RuntimeLong = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sjsr_RuntimeLong)))
});
ScalaJS.asArrayOf.sjsr_RuntimeLong = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sjsr_RuntimeLong(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.scalajs.runtime.RuntimeLong;", depth))
});
ScalaJS.d.sjsr_RuntimeLong = new ScalaJS.ClassTypeData({
  sjsr_RuntimeLong: 0
}, false, "scala.scalajs.runtime.RuntimeLong", ScalaJS.d.jl_Number, {
  sjsr_RuntimeLong: 1,
  jl_Comparable: 1,
  jl_Number: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.sjsr_RuntimeLong.prototype.$classData = ScalaJS.d.sjsr_RuntimeLong;
ScalaJS.is.sr_Nothing$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sr_Nothing$)))
});
ScalaJS.as.sr_Nothing$ = (function(obj) {
  return ((ScalaJS.is.sr_Nothing$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.runtime.Nothing$"))
});
ScalaJS.isArrayOf.sr_Nothing$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sr_Nothing$)))
});
ScalaJS.asArrayOf.sr_Nothing$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sr_Nothing$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.runtime.Nothing$;", depth))
});
ScalaJS.d.sr_Nothing$ = new ScalaJS.ClassTypeData({
  sr_Nothing$: 0
}, false, "scala.runtime.Nothing$", ScalaJS.d.jl_Throwable, {
  sr_Nothing$: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
/** @constructor */
ScalaJS.c.sr_ScalaRunTime$$anon$1 = (function() {
  ScalaJS.c.sc_AbstractIterator.call(this);
  this.c$2 = 0;
  this.cmax$2 = 0;
  this.x$2$2 = null
});
ScalaJS.c.sr_ScalaRunTime$$anon$1.prototype = new ScalaJS.h.sc_AbstractIterator();
ScalaJS.c.sr_ScalaRunTime$$anon$1.prototype.constructor = ScalaJS.c.sr_ScalaRunTime$$anon$1;
/** @constructor */
ScalaJS.h.sr_ScalaRunTime$$anon$1 = (function() {
  /*<skip>*/
});
ScalaJS.h.sr_ScalaRunTime$$anon$1.prototype = ScalaJS.c.sr_ScalaRunTime$$anon$1.prototype;
ScalaJS.c.sr_ScalaRunTime$$anon$1.prototype.next__O = (function() {
  var result = this.x$2$2.productElement__I__O(this.c$2);
  this.c$2 = ((this.c$2 + 1) | 0);
  return result
});
ScalaJS.c.sr_ScalaRunTime$$anon$1.prototype.init___s_Product = (function(x$2) {
  this.x$2$2 = x$2;
  this.c$2 = 0;
  this.cmax$2 = x$2.productArity__I();
  return this
});
ScalaJS.c.sr_ScalaRunTime$$anon$1.prototype.hasNext__Z = (function() {
  return (this.c$2 < this.cmax$2)
});
ScalaJS.is.sr_ScalaRunTime$$anon$1 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sr_ScalaRunTime$$anon$1)))
});
ScalaJS.as.sr_ScalaRunTime$$anon$1 = (function(obj) {
  return ((ScalaJS.is.sr_ScalaRunTime$$anon$1(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.runtime.ScalaRunTime$$anon$1"))
});
ScalaJS.isArrayOf.sr_ScalaRunTime$$anon$1 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sr_ScalaRunTime$$anon$1)))
});
ScalaJS.asArrayOf.sr_ScalaRunTime$$anon$1 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sr_ScalaRunTime$$anon$1(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.runtime.ScalaRunTime$$anon$1;", depth))
});
ScalaJS.d.sr_ScalaRunTime$$anon$1 = new ScalaJS.ClassTypeData({
  sr_ScalaRunTime$$anon$1: 0
}, false, "scala.runtime.ScalaRunTime$$anon$1", ScalaJS.d.sc_AbstractIterator, {
  sr_ScalaRunTime$$anon$1: 1,
  sc_AbstractIterator: 1,
  sc_Iterator: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  O: 1
});
ScalaJS.c.sr_ScalaRunTime$$anon$1.prototype.$classData = ScalaJS.d.sr_ScalaRunTime$$anon$1;
/** @constructor */
ScalaJS.c.Ljava_io_PrintStream = (function() {
  ScalaJS.c.Ljava_io_FilterOutputStream.call(this);
  this.autoFlush$3 = false;
  this.hasError$3 = false
});
ScalaJS.c.Ljava_io_PrintStream.prototype = new ScalaJS.h.Ljava_io_FilterOutputStream();
ScalaJS.c.Ljava_io_PrintStream.prototype.constructor = ScalaJS.c.Ljava_io_PrintStream;
/** @constructor */
ScalaJS.h.Ljava_io_PrintStream = (function() {
  /*<skip>*/
});
ScalaJS.h.Ljava_io_PrintStream.prototype = ScalaJS.c.Ljava_io_PrintStream.prototype;
ScalaJS.c.Ljava_io_PrintStream.prototype.write__I__V = (function(b) {
  this.out$2.write__I__V(b);
  if ((this.autoFlush$3 && (b === 10))) {
    ScalaJS.i.jl_JSConsoleBasedPrintStream$class__flush__jl_JSConsoleBasedPrintStream__V(this)
  }
});
ScalaJS.c.Ljava_io_PrintStream.prototype.append__jl_CharSequence__jl_Appendable = (function(x$1) {
  return this
});
ScalaJS.c.Ljava_io_PrintStream.prototype.println__O__V = (function(x) {
  this.print__O__V(x);
  this.write__I__V(10)
});
ScalaJS.c.Ljava_io_PrintStream.prototype.init___Ljava_io_OutputStream__Z__T = (function(_out, autoFlush, ecoding) {
  this.autoFlush$3 = autoFlush;
  ScalaJS.c.Ljava_io_FilterOutputStream.prototype.init___Ljava_io_OutputStream.call(this, _out);
  this.hasError$3 = false;
  return this
});
ScalaJS.c.Ljava_io_PrintStream.prototype.append__C__jl_Appendable = (function(x$1) {
  return this
});
ScalaJS.c.Ljava_io_PrintStream.prototype.print__O__V = (function(o) {
  if ((o === null)) {
    ScalaJS.i.jl_JSConsoleBasedPrintStream$class__print__jl_JSConsoleBasedPrintStream__T__V(this, "null")
  } else {
    var s = ScalaJS.objectToString(o);
    ScalaJS.i.jl_JSConsoleBasedPrintStream$class__print__jl_JSConsoleBasedPrintStream__T__V(this, s)
  }
});
ScalaJS.c.Ljava_io_PrintStream.prototype.init___Ljava_io_OutputStream__Z = (function(out, autoFlush) {
  return (ScalaJS.c.Ljava_io_PrintStream.prototype.init___Ljava_io_OutputStream__Z__T.call(this, out, autoFlush, ""), this)
});
ScalaJS.is.Ljava_io_PrintStream = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.Ljava_io_PrintStream)))
});
ScalaJS.as.Ljava_io_PrintStream = (function(obj) {
  return ((ScalaJS.is.Ljava_io_PrintStream(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.io.PrintStream"))
});
ScalaJS.isArrayOf.Ljava_io_PrintStream = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.Ljava_io_PrintStream)))
});
ScalaJS.asArrayOf.Ljava_io_PrintStream = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.Ljava_io_PrintStream(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.io.PrintStream;", depth))
});
ScalaJS.d.Ljava_io_PrintStream = new ScalaJS.ClassTypeData({
  Ljava_io_PrintStream: 0
}, false, "java.io.PrintStream", ScalaJS.d.Ljava_io_FilterOutputStream, {
  Ljava_io_PrintStream: 1,
  jl_Appendable: 1,
  Ljava_io_FilterOutputStream: 1,
  Ljava_io_OutputStream: 1,
  Ljava_io_Flushable: 1,
  Ljava_io_Closeable: 1,
  O: 1
});
ScalaJS.c.Ljava_io_PrintStream.prototype.$classData = ScalaJS.d.Ljava_io_PrintStream;
/** @constructor */
ScalaJS.c.jl_AssertionError = (function() {
  ScalaJS.c.jl_Error.call(this)
});
ScalaJS.c.jl_AssertionError.prototype = new ScalaJS.h.jl_Error();
ScalaJS.c.jl_AssertionError.prototype.constructor = ScalaJS.c.jl_AssertionError;
/** @constructor */
ScalaJS.h.jl_AssertionError = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_AssertionError.prototype = ScalaJS.c.jl_AssertionError.prototype;
ScalaJS.c.jl_AssertionError.prototype.init___O = (function(o) {
  return (ScalaJS.c.jl_AssertionError.prototype.init___T.call(this, ScalaJS.objectToString(o)), this)
});
ScalaJS.is.jl_AssertionError = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_AssertionError)))
});
ScalaJS.as.jl_AssertionError = (function(obj) {
  return ((ScalaJS.is.jl_AssertionError(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.AssertionError"))
});
ScalaJS.isArrayOf.jl_AssertionError = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_AssertionError)))
});
ScalaJS.asArrayOf.jl_AssertionError = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_AssertionError(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.AssertionError;", depth))
});
ScalaJS.d.jl_AssertionError = new ScalaJS.ClassTypeData({
  jl_AssertionError: 0
}, false, "java.lang.AssertionError", ScalaJS.d.jl_Error, {
  jl_AssertionError: 1,
  jl_Error: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.jl_AssertionError.prototype.$classData = ScalaJS.d.jl_AssertionError;
/** @constructor */
ScalaJS.c.jl_RuntimeException = (function() {
  ScalaJS.c.jl_Exception.call(this)
});
ScalaJS.c.jl_RuntimeException.prototype = new ScalaJS.h.jl_Exception();
ScalaJS.c.jl_RuntimeException.prototype.constructor = ScalaJS.c.jl_RuntimeException;
/** @constructor */
ScalaJS.h.jl_RuntimeException = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_RuntimeException.prototype = ScalaJS.c.jl_RuntimeException.prototype;
ScalaJS.c.jl_RuntimeException.prototype.init___ = (function() {
  return (ScalaJS.c.jl_RuntimeException.prototype.init___T__jl_Throwable.call(this, null, null), this)
});
ScalaJS.c.jl_RuntimeException.prototype.init___T = (function(s) {
  return (ScalaJS.c.jl_RuntimeException.prototype.init___T__jl_Throwable.call(this, s, null), this)
});
ScalaJS.is.jl_RuntimeException = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_RuntimeException)))
});
ScalaJS.as.jl_RuntimeException = (function(obj) {
  return ((ScalaJS.is.jl_RuntimeException(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.RuntimeException"))
});
ScalaJS.isArrayOf.jl_RuntimeException = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_RuntimeException)))
});
ScalaJS.asArrayOf.jl_RuntimeException = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_RuntimeException(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.RuntimeException;", depth))
});
ScalaJS.d.jl_RuntimeException = new ScalaJS.ClassTypeData({
  jl_RuntimeException: 0
}, false, "java.lang.RuntimeException", ScalaJS.d.jl_Exception, {
  jl_RuntimeException: 1,
  jl_Exception: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.jl_RuntimeException.prototype.$classData = ScalaJS.d.jl_RuntimeException;
/** @constructor */
ScalaJS.c.s_reflect_ManifestFactory$$anon$1 = (function() {
  ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest.call(this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$1.prototype = new ScalaJS.h.s_reflect_ManifestFactory$PhantomManifest();
ScalaJS.c.s_reflect_ManifestFactory$$anon$1.prototype.constructor = ScalaJS.c.s_reflect_ManifestFactory$$anon$1;
/** @constructor */
ScalaJS.h.s_reflect_ManifestFactory$$anon$1 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ManifestFactory$$anon$1.prototype = ScalaJS.c.s_reflect_ManifestFactory$$anon$1.prototype;
ScalaJS.c.s_reflect_ManifestFactory$$anon$1.prototype.init___ = (function() {
  return (ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest.prototype.init___jl_Class__T.call(this, ScalaJS.m.s_reflect_ManifestFactory().scala$reflect$ManifestFactory$$ObjectTYPE$1, "Any"), this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$1.prototype.newArray__I__O = (function(len) {
  return this.newArray__I__AO(len)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$1.prototype.newArray__I__AO = (function(len) {
  return ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [len])
});
ScalaJS.is.s_reflect_ManifestFactory$$anon$1 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ManifestFactory$$anon$1)))
});
ScalaJS.as.s_reflect_ManifestFactory$$anon$1 = (function(obj) {
  return ((ScalaJS.is.s_reflect_ManifestFactory$$anon$1(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ManifestFactory$$anon$1"))
});
ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$1 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ManifestFactory$$anon$1)))
});
ScalaJS.asArrayOf.s_reflect_ManifestFactory$$anon$1 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$1(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ManifestFactory$$anon$1;", depth))
});
ScalaJS.d.s_reflect_ManifestFactory$$anon$1 = new ScalaJS.ClassTypeData({
  s_reflect_ManifestFactory$$anon$1: 0
}, false, "scala.reflect.ManifestFactory$$anon$1", ScalaJS.d.s_reflect_ManifestFactory$PhantomManifest, {
  s_reflect_ManifestFactory$$anon$1: 1,
  s_reflect_ManifestFactory$PhantomManifest: 1,
  s_reflect_ManifestFactory$ClassTypeManifest: 1,
  s_reflect_Manifest: 1,
  s_reflect_ClassTag: 1,
  s_Equals: 1,
  s_reflect_ClassManifestDeprecatedApis: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$1.prototype.$classData = ScalaJS.d.s_reflect_ManifestFactory$$anon$1;
/** @constructor */
ScalaJS.c.s_reflect_ManifestFactory$$anon$2 = (function() {
  ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest.call(this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$2.prototype = new ScalaJS.h.s_reflect_ManifestFactory$PhantomManifest();
ScalaJS.c.s_reflect_ManifestFactory$$anon$2.prototype.constructor = ScalaJS.c.s_reflect_ManifestFactory$$anon$2;
/** @constructor */
ScalaJS.h.s_reflect_ManifestFactory$$anon$2 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ManifestFactory$$anon$2.prototype = ScalaJS.c.s_reflect_ManifestFactory$$anon$2.prototype;
ScalaJS.c.s_reflect_ManifestFactory$$anon$2.prototype.init___ = (function() {
  return (ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest.prototype.init___jl_Class__T.call(this, ScalaJS.m.s_reflect_ManifestFactory().scala$reflect$ManifestFactory$$ObjectTYPE$1, "Object"), this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$2.prototype.newArray__I__O = (function(len) {
  return this.newArray__I__AO(len)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$2.prototype.newArray__I__AO = (function(len) {
  return ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [len])
});
ScalaJS.is.s_reflect_ManifestFactory$$anon$2 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ManifestFactory$$anon$2)))
});
ScalaJS.as.s_reflect_ManifestFactory$$anon$2 = (function(obj) {
  return ((ScalaJS.is.s_reflect_ManifestFactory$$anon$2(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ManifestFactory$$anon$2"))
});
ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$2 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ManifestFactory$$anon$2)))
});
ScalaJS.asArrayOf.s_reflect_ManifestFactory$$anon$2 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$2(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ManifestFactory$$anon$2;", depth))
});
ScalaJS.d.s_reflect_ManifestFactory$$anon$2 = new ScalaJS.ClassTypeData({
  s_reflect_ManifestFactory$$anon$2: 0
}, false, "scala.reflect.ManifestFactory$$anon$2", ScalaJS.d.s_reflect_ManifestFactory$PhantomManifest, {
  s_reflect_ManifestFactory$$anon$2: 1,
  s_reflect_ManifestFactory$PhantomManifest: 1,
  s_reflect_ManifestFactory$ClassTypeManifest: 1,
  s_reflect_Manifest: 1,
  s_reflect_ClassTag: 1,
  s_Equals: 1,
  s_reflect_ClassManifestDeprecatedApis: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$2.prototype.$classData = ScalaJS.d.s_reflect_ManifestFactory$$anon$2;
/** @constructor */
ScalaJS.c.s_reflect_ManifestFactory$$anon$3 = (function() {
  ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest.call(this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$3.prototype = new ScalaJS.h.s_reflect_ManifestFactory$PhantomManifest();
ScalaJS.c.s_reflect_ManifestFactory$$anon$3.prototype.constructor = ScalaJS.c.s_reflect_ManifestFactory$$anon$3;
/** @constructor */
ScalaJS.h.s_reflect_ManifestFactory$$anon$3 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ManifestFactory$$anon$3.prototype = ScalaJS.c.s_reflect_ManifestFactory$$anon$3.prototype;
ScalaJS.c.s_reflect_ManifestFactory$$anon$3.prototype.init___ = (function() {
  return (ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest.prototype.init___jl_Class__T.call(this, ScalaJS.m.s_reflect_ManifestFactory().scala$reflect$ManifestFactory$$ObjectTYPE$1, "AnyVal"), this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$3.prototype.newArray__I__O = (function(len) {
  return this.newArray__I__AO(len)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$3.prototype.newArray__I__AO = (function(len) {
  return ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [len])
});
ScalaJS.is.s_reflect_ManifestFactory$$anon$3 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ManifestFactory$$anon$3)))
});
ScalaJS.as.s_reflect_ManifestFactory$$anon$3 = (function(obj) {
  return ((ScalaJS.is.s_reflect_ManifestFactory$$anon$3(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ManifestFactory$$anon$3"))
});
ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$3 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ManifestFactory$$anon$3)))
});
ScalaJS.asArrayOf.s_reflect_ManifestFactory$$anon$3 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$3(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ManifestFactory$$anon$3;", depth))
});
ScalaJS.d.s_reflect_ManifestFactory$$anon$3 = new ScalaJS.ClassTypeData({
  s_reflect_ManifestFactory$$anon$3: 0
}, false, "scala.reflect.ManifestFactory$$anon$3", ScalaJS.d.s_reflect_ManifestFactory$PhantomManifest, {
  s_reflect_ManifestFactory$$anon$3: 1,
  s_reflect_ManifestFactory$PhantomManifest: 1,
  s_reflect_ManifestFactory$ClassTypeManifest: 1,
  s_reflect_Manifest: 1,
  s_reflect_ClassTag: 1,
  s_Equals: 1,
  s_reflect_ClassManifestDeprecatedApis: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$3.prototype.$classData = ScalaJS.d.s_reflect_ManifestFactory$$anon$3;
/** @constructor */
ScalaJS.c.s_reflect_ManifestFactory$$anon$4 = (function() {
  ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest.call(this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$4.prototype = new ScalaJS.h.s_reflect_ManifestFactory$PhantomManifest();
ScalaJS.c.s_reflect_ManifestFactory$$anon$4.prototype.constructor = ScalaJS.c.s_reflect_ManifestFactory$$anon$4;
/** @constructor */
ScalaJS.h.s_reflect_ManifestFactory$$anon$4 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ManifestFactory$$anon$4.prototype = ScalaJS.c.s_reflect_ManifestFactory$$anon$4.prototype;
ScalaJS.c.s_reflect_ManifestFactory$$anon$4.prototype.init___ = (function() {
  return (ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest.prototype.init___jl_Class__T.call(this, ScalaJS.m.s_reflect_ManifestFactory().scala$reflect$ManifestFactory$$NullTYPE$1, "Null"), this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$4.prototype.newArray__I__O = (function(len) {
  return this.newArray__I__AO(len)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$4.prototype.newArray__I__AO = (function(len) {
  return ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [len])
});
ScalaJS.is.s_reflect_ManifestFactory$$anon$4 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ManifestFactory$$anon$4)))
});
ScalaJS.as.s_reflect_ManifestFactory$$anon$4 = (function(obj) {
  return ((ScalaJS.is.s_reflect_ManifestFactory$$anon$4(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ManifestFactory$$anon$4"))
});
ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$4 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ManifestFactory$$anon$4)))
});
ScalaJS.asArrayOf.s_reflect_ManifestFactory$$anon$4 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$4(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ManifestFactory$$anon$4;", depth))
});
ScalaJS.d.s_reflect_ManifestFactory$$anon$4 = new ScalaJS.ClassTypeData({
  s_reflect_ManifestFactory$$anon$4: 0
}, false, "scala.reflect.ManifestFactory$$anon$4", ScalaJS.d.s_reflect_ManifestFactory$PhantomManifest, {
  s_reflect_ManifestFactory$$anon$4: 1,
  s_reflect_ManifestFactory$PhantomManifest: 1,
  s_reflect_ManifestFactory$ClassTypeManifest: 1,
  s_reflect_Manifest: 1,
  s_reflect_ClassTag: 1,
  s_Equals: 1,
  s_reflect_ClassManifestDeprecatedApis: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$4.prototype.$classData = ScalaJS.d.s_reflect_ManifestFactory$$anon$4;
/** @constructor */
ScalaJS.c.s_reflect_ManifestFactory$$anon$5 = (function() {
  ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest.call(this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$5.prototype = new ScalaJS.h.s_reflect_ManifestFactory$PhantomManifest();
ScalaJS.c.s_reflect_ManifestFactory$$anon$5.prototype.constructor = ScalaJS.c.s_reflect_ManifestFactory$$anon$5;
/** @constructor */
ScalaJS.h.s_reflect_ManifestFactory$$anon$5 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_reflect_ManifestFactory$$anon$5.prototype = ScalaJS.c.s_reflect_ManifestFactory$$anon$5.prototype;
ScalaJS.c.s_reflect_ManifestFactory$$anon$5.prototype.init___ = (function() {
  return (ScalaJS.c.s_reflect_ManifestFactory$PhantomManifest.prototype.init___jl_Class__T.call(this, ScalaJS.m.s_reflect_ManifestFactory().scala$reflect$ManifestFactory$$NothingTYPE$1, "Nothing"), this)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$5.prototype.newArray__I__O = (function(len) {
  return this.newArray__I__AO(len)
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$5.prototype.newArray__I__AO = (function(len) {
  return ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [len])
});
ScalaJS.is.s_reflect_ManifestFactory$$anon$5 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_reflect_ManifestFactory$$anon$5)))
});
ScalaJS.as.s_reflect_ManifestFactory$$anon$5 = (function(obj) {
  return ((ScalaJS.is.s_reflect_ManifestFactory$$anon$5(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.reflect.ManifestFactory$$anon$5"))
});
ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$5 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_reflect_ManifestFactory$$anon$5)))
});
ScalaJS.asArrayOf.s_reflect_ManifestFactory$$anon$5 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_reflect_ManifestFactory$$anon$5(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.reflect.ManifestFactory$$anon$5;", depth))
});
ScalaJS.d.s_reflect_ManifestFactory$$anon$5 = new ScalaJS.ClassTypeData({
  s_reflect_ManifestFactory$$anon$5: 0
}, false, "scala.reflect.ManifestFactory$$anon$5", ScalaJS.d.s_reflect_ManifestFactory$PhantomManifest, {
  s_reflect_ManifestFactory$$anon$5: 1,
  s_reflect_ManifestFactory$PhantomManifest: 1,
  s_reflect_ManifestFactory$ClassTypeManifest: 1,
  s_reflect_Manifest: 1,
  s_reflect_ClassTag: 1,
  s_Equals: 1,
  s_reflect_ClassManifestDeprecatedApis: 1,
  s_reflect_OptManifest: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_reflect_ManifestFactory$$anon$5.prototype.$classData = ScalaJS.d.s_reflect_ManifestFactory$$anon$5;
/** @constructor */
ScalaJS.c.s_util_DynamicVariable$$anon$1 = (function() {
  ScalaJS.c.jl_InheritableThreadLocal.call(this);
  this.$$outer$3 = null
});
ScalaJS.c.s_util_DynamicVariable$$anon$1.prototype = new ScalaJS.h.jl_InheritableThreadLocal();
ScalaJS.c.s_util_DynamicVariable$$anon$1.prototype.constructor = ScalaJS.c.s_util_DynamicVariable$$anon$1;
/** @constructor */
ScalaJS.h.s_util_DynamicVariable$$anon$1 = (function() {
  /*<skip>*/
});
ScalaJS.h.s_util_DynamicVariable$$anon$1.prototype = ScalaJS.c.s_util_DynamicVariable$$anon$1.prototype;
ScalaJS.c.s_util_DynamicVariable$$anon$1.prototype.init___s_util_DynamicVariable = (function($$outer) {
  if (($$outer === null)) {
    throw new ScalaJS.c.jl_NullPointerException().init___()
  } else {
    this.$$outer$3 = $$outer
  };
  ScalaJS.c.jl_InheritableThreadLocal.prototype.init___.call(this);
  return this
});
ScalaJS.c.s_util_DynamicVariable$$anon$1.prototype.initialValue__O = (function() {
  return this.$$outer$3.scala$util$DynamicVariable$$init$f
});
ScalaJS.is.s_util_DynamicVariable$$anon$1 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_util_DynamicVariable$$anon$1)))
});
ScalaJS.as.s_util_DynamicVariable$$anon$1 = (function(obj) {
  return ((ScalaJS.is.s_util_DynamicVariable$$anon$1(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.util.DynamicVariable$$anon$1"))
});
ScalaJS.isArrayOf.s_util_DynamicVariable$$anon$1 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_util_DynamicVariable$$anon$1)))
});
ScalaJS.asArrayOf.s_util_DynamicVariable$$anon$1 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_util_DynamicVariable$$anon$1(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.util.DynamicVariable$$anon$1;", depth))
});
ScalaJS.d.s_util_DynamicVariable$$anon$1 = new ScalaJS.ClassTypeData({
  s_util_DynamicVariable$$anon$1: 0
}, false, "scala.util.DynamicVariable$$anon$1", ScalaJS.d.jl_InheritableThreadLocal, {
  s_util_DynamicVariable$$anon$1: 1,
  jl_InheritableThreadLocal: 1,
  jl_ThreadLocal: 1,
  O: 1
});
ScalaJS.c.s_util_DynamicVariable$$anon$1.prototype.$classData = ScalaJS.d.s_util_DynamicVariable$$anon$1;
/** @constructor */
ScalaJS.c.sc_AbstractSeq = (function() {
  ScalaJS.c.sc_AbstractIterable.call(this)
});
ScalaJS.c.sc_AbstractSeq.prototype = new ScalaJS.h.sc_AbstractIterable();
ScalaJS.c.sc_AbstractSeq.prototype.constructor = ScalaJS.c.sc_AbstractSeq;
/** @constructor */
ScalaJS.h.sc_AbstractSeq = (function() {
  /*<skip>*/
});
ScalaJS.h.sc_AbstractSeq.prototype = ScalaJS.c.sc_AbstractSeq.prototype;
ScalaJS.c.sc_AbstractSeq.prototype.lengthCompare__I__I = (function(len) {
  return ScalaJS.i.sc_SeqLike$class__lengthCompare__sc_SeqLike__I__I(this, len)
});
ScalaJS.c.sc_AbstractSeq.prototype.equals__O__Z = (function(that) {
  return ScalaJS.i.sc_GenSeqLike$class__equals__sc_GenSeqLike__O__Z(this, that)
});
ScalaJS.c.sc_AbstractSeq.prototype.isEmpty__Z = (function() {
  return ScalaJS.i.sc_SeqLike$class__isEmpty__sc_SeqLike__Z(this)
});
ScalaJS.c.sc_AbstractSeq.prototype.toString__T = (function() {
  return ScalaJS.i.sc_TraversableLike$class__toString__sc_TraversableLike__T(this)
});
ScalaJS.c.sc_AbstractSeq.prototype.size__I = (function() {
  return this.length__I()
});
ScalaJS.c.sc_AbstractSeq.prototype.hashCode__I = (function() {
  return ScalaJS.m.s_util_hashing_MurmurHash3().seqHash__sc_Seq__I(this.seq__sc_Seq())
});
ScalaJS.is.sc_AbstractSeq = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_AbstractSeq)))
});
ScalaJS.as.sc_AbstractSeq = (function(obj) {
  return ((ScalaJS.is.sc_AbstractSeq(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.AbstractSeq"))
});
ScalaJS.isArrayOf.sc_AbstractSeq = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_AbstractSeq)))
});
ScalaJS.asArrayOf.sc_AbstractSeq = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_AbstractSeq(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.AbstractSeq;", depth))
});
ScalaJS.d.sc_AbstractSeq = new ScalaJS.ClassTypeData({
  sc_AbstractSeq: 0
}, false, "scala.collection.AbstractSeq", ScalaJS.d.sc_AbstractIterable, {
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sc_AbstractSeq.prototype.$classData = ScalaJS.d.sc_AbstractSeq;
/** @constructor */
ScalaJS.c.sc_AbstractSet = (function() {
  ScalaJS.c.sc_AbstractIterable.call(this)
});
ScalaJS.c.sc_AbstractSet.prototype = new ScalaJS.h.sc_AbstractIterable();
ScalaJS.c.sc_AbstractSet.prototype.constructor = ScalaJS.c.sc_AbstractSet;
/** @constructor */
ScalaJS.h.sc_AbstractSet = (function() {
  /*<skip>*/
});
ScalaJS.h.sc_AbstractSet.prototype = ScalaJS.c.sc_AbstractSet.prototype;
ScalaJS.c.sc_AbstractSet.prototype.isEmpty__Z = (function() {
  return ScalaJS.i.sc_SetLike$class__isEmpty__sc_SetLike__Z(this)
});
ScalaJS.c.sc_AbstractSet.prototype.equals__O__Z = (function(that) {
  return ScalaJS.i.sc_GenSetLike$class__equals__sc_GenSetLike__O__Z(this, that)
});
ScalaJS.c.sc_AbstractSet.prototype.toString__T = (function() {
  return ScalaJS.i.sc_TraversableLike$class__toString__sc_TraversableLike__T(this)
});
ScalaJS.c.sc_AbstractSet.prototype.toBuffer__scm_Buffer = (function() {
  return ScalaJS.i.sc_SetLike$class__toBuffer__sc_SetLike__scm_Buffer(this)
});
ScalaJS.c.sc_AbstractSet.prototype.hashCode__I = (function() {
  var this$1 = ScalaJS.m.s_util_hashing_MurmurHash3();
  var xs = this.seq__sc_Set();
  return this$1.unorderedHash__sc_TraversableOnce__I__I(xs, this$1.setSeed$2)
});
ScalaJS.c.sc_AbstractSet.prototype.newBuilder__scm_Builder = (function() {
  return new ScalaJS.c.scm_SetBuilder().init___sc_Set(this.empty__sc_Set())
});
ScalaJS.c.sc_AbstractSet.prototype.stringPrefix__T = (function() {
  return "Set"
});
ScalaJS.is.sc_AbstractSet = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_AbstractSet)))
});
ScalaJS.as.sc_AbstractSet = (function(obj) {
  return ((ScalaJS.is.sc_AbstractSet(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.AbstractSet"))
});
ScalaJS.isArrayOf.sc_AbstractSet = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_AbstractSet)))
});
ScalaJS.asArrayOf.sc_AbstractSet = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_AbstractSet(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.AbstractSet;", depth))
});
ScalaJS.d.sc_AbstractSet = new ScalaJS.ClassTypeData({
  sc_AbstractSet: 0
}, false, "scala.collection.AbstractSet", ScalaJS.d.sc_AbstractIterable, {
  sc_AbstractSet: 1,
  sc_Set: 1,
  sc_SetLike: 1,
  scg_Subtractable: 1,
  sc_GenSet: 1,
  scg_GenericSetTemplate: 1,
  sc_GenSetLike: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sc_AbstractSet.prototype.$classData = ScalaJS.d.sc_AbstractSet;
/** @constructor */
ScalaJS.c.sc_Iterable$ = (function() {
  ScalaJS.c.scg_GenTraversableFactory.call(this)
});
ScalaJS.c.sc_Iterable$.prototype = new ScalaJS.h.scg_GenTraversableFactory();
ScalaJS.c.sc_Iterable$.prototype.constructor = ScalaJS.c.sc_Iterable$;
/** @constructor */
ScalaJS.h.sc_Iterable$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sc_Iterable$.prototype = ScalaJS.c.sc_Iterable$.prototype;
ScalaJS.c.sc_Iterable$.prototype.newBuilder__scm_Builder = (function() {
  return new ScalaJS.c.scm_ListBuffer().init___()
});
ScalaJS.is.sc_Iterable$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_Iterable$)))
});
ScalaJS.as.sc_Iterable$ = (function(obj) {
  return ((ScalaJS.is.sc_Iterable$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.Iterable$"))
});
ScalaJS.isArrayOf.sc_Iterable$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_Iterable$)))
});
ScalaJS.asArrayOf.sc_Iterable$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_Iterable$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.Iterable$;", depth))
});
ScalaJS.d.sc_Iterable$ = new ScalaJS.ClassTypeData({
  sc_Iterable$: 0
}, false, "scala.collection.Iterable$", ScalaJS.d.scg_GenTraversableFactory, {
  sc_Iterable$: 1,
  scg_TraversableFactory: 1,
  scg_GenericSeqCompanion: 1,
  scg_GenTraversableFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.sc_Iterable$.prototype.$classData = ScalaJS.d.sc_Iterable$;
ScalaJS.n.sc_Iterable = (void 0);
ScalaJS.m.sc_Iterable = (function() {
  if ((!ScalaJS.n.sc_Iterable)) {
    ScalaJS.n.sc_Iterable = new ScalaJS.c.sc_Iterable$().init___()
  };
  return ScalaJS.n.sc_Iterable
});
/** @constructor */
ScalaJS.c.sc_Traversable$ = (function() {
  ScalaJS.c.scg_GenTraversableFactory.call(this);
  this.breaks$3 = null
});
ScalaJS.c.sc_Traversable$.prototype = new ScalaJS.h.scg_GenTraversableFactory();
ScalaJS.c.sc_Traversable$.prototype.constructor = ScalaJS.c.sc_Traversable$;
/** @constructor */
ScalaJS.h.sc_Traversable$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sc_Traversable$.prototype = ScalaJS.c.sc_Traversable$.prototype;
ScalaJS.c.sc_Traversable$.prototype.init___ = (function() {
  ScalaJS.n.sc_Traversable = this;
  this.breaks$3 = new ScalaJS.c.s_util_control_Breaks().init___();
  return this
});
ScalaJS.c.sc_Traversable$.prototype.newBuilder__scm_Builder = (function() {
  return new ScalaJS.c.scm_ListBuffer().init___()
});
ScalaJS.is.sc_Traversable$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_Traversable$)))
});
ScalaJS.as.sc_Traversable$ = (function(obj) {
  return ((ScalaJS.is.sc_Traversable$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.Traversable$"))
});
ScalaJS.isArrayOf.sc_Traversable$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_Traversable$)))
});
ScalaJS.asArrayOf.sc_Traversable$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_Traversable$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.Traversable$;", depth))
});
ScalaJS.d.sc_Traversable$ = new ScalaJS.ClassTypeData({
  sc_Traversable$: 0
}, false, "scala.collection.Traversable$", ScalaJS.d.scg_GenTraversableFactory, {
  sc_Traversable$: 1,
  scg_TraversableFactory: 1,
  scg_GenericSeqCompanion: 1,
  scg_GenTraversableFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.sc_Traversable$.prototype.$classData = ScalaJS.d.sc_Traversable$;
ScalaJS.n.sc_Traversable = (void 0);
ScalaJS.m.sc_Traversable = (function() {
  if ((!ScalaJS.n.sc_Traversable)) {
    ScalaJS.n.sc_Traversable = new ScalaJS.c.sc_Traversable$().init___()
  };
  return ScalaJS.n.sc_Traversable
});
/** @constructor */
ScalaJS.c.scg_GenSeqFactory = (function() {
  ScalaJS.c.scg_GenTraversableFactory.call(this)
});
ScalaJS.c.scg_GenSeqFactory.prototype = new ScalaJS.h.scg_GenTraversableFactory();
ScalaJS.c.scg_GenSeqFactory.prototype.constructor = ScalaJS.c.scg_GenSeqFactory;
/** @constructor */
ScalaJS.h.scg_GenSeqFactory = (function() {
  /*<skip>*/
});
ScalaJS.h.scg_GenSeqFactory.prototype = ScalaJS.c.scg_GenSeqFactory.prototype;
ScalaJS.is.scg_GenSeqFactory = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scg_GenSeqFactory)))
});
ScalaJS.as.scg_GenSeqFactory = (function(obj) {
  return ((ScalaJS.is.scg_GenSeqFactory(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.generic.GenSeqFactory"))
});
ScalaJS.isArrayOf.scg_GenSeqFactory = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scg_GenSeqFactory)))
});
ScalaJS.asArrayOf.scg_GenSeqFactory = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scg_GenSeqFactory(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.generic.GenSeqFactory;", depth))
});
ScalaJS.d.scg_GenSeqFactory = new ScalaJS.ClassTypeData({
  scg_GenSeqFactory: 0
}, false, "scala.collection.generic.GenSeqFactory", ScalaJS.d.scg_GenTraversableFactory, {
  scg_GenSeqFactory: 1,
  scg_GenTraversableFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.scg_GenSeqFactory.prototype.$classData = ScalaJS.d.scg_GenSeqFactory;
/** @constructor */
ScalaJS.c.scg_ImmutableMapFactory = (function() {
  ScalaJS.c.scg_MapFactory.call(this)
});
ScalaJS.c.scg_ImmutableMapFactory.prototype = new ScalaJS.h.scg_MapFactory();
ScalaJS.c.scg_ImmutableMapFactory.prototype.constructor = ScalaJS.c.scg_ImmutableMapFactory;
/** @constructor */
ScalaJS.h.scg_ImmutableMapFactory = (function() {
  /*<skip>*/
});
ScalaJS.h.scg_ImmutableMapFactory.prototype = ScalaJS.c.scg_ImmutableMapFactory.prototype;
ScalaJS.is.scg_ImmutableMapFactory = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scg_ImmutableMapFactory)))
});
ScalaJS.as.scg_ImmutableMapFactory = (function(obj) {
  return ((ScalaJS.is.scg_ImmutableMapFactory(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.generic.ImmutableMapFactory"))
});
ScalaJS.isArrayOf.scg_ImmutableMapFactory = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scg_ImmutableMapFactory)))
});
ScalaJS.asArrayOf.scg_ImmutableMapFactory = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scg_ImmutableMapFactory(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.generic.ImmutableMapFactory;", depth))
});
ScalaJS.d.scg_ImmutableMapFactory = new ScalaJS.ClassTypeData({
  scg_ImmutableMapFactory: 0
}, false, "scala.collection.generic.ImmutableMapFactory", ScalaJS.d.scg_MapFactory, {
  scg_ImmutableMapFactory: 1,
  scg_MapFactory: 1,
  scg_GenMapFactory: 1,
  O: 1
});
ScalaJS.c.scg_ImmutableMapFactory.prototype.$classData = ScalaJS.d.scg_ImmutableMapFactory;
/** @constructor */
ScalaJS.c.scg_SetFactory = (function() {
  ScalaJS.c.scg_GenSetFactory.call(this)
});
ScalaJS.c.scg_SetFactory.prototype = new ScalaJS.h.scg_GenSetFactory();
ScalaJS.c.scg_SetFactory.prototype.constructor = ScalaJS.c.scg_SetFactory;
/** @constructor */
ScalaJS.h.scg_SetFactory = (function() {
  /*<skip>*/
});
ScalaJS.h.scg_SetFactory.prototype = ScalaJS.c.scg_SetFactory.prototype;
ScalaJS.is.scg_SetFactory = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scg_SetFactory)))
});
ScalaJS.as.scg_SetFactory = (function(obj) {
  return ((ScalaJS.is.scg_SetFactory(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.generic.SetFactory"))
});
ScalaJS.isArrayOf.scg_SetFactory = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scg_SetFactory)))
});
ScalaJS.asArrayOf.scg_SetFactory = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scg_SetFactory(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.generic.SetFactory;", depth))
});
ScalaJS.d.scg_SetFactory = new ScalaJS.ClassTypeData({
  scg_SetFactory: 0
}, false, "scala.collection.generic.SetFactory", ScalaJS.d.scg_GenSetFactory, {
  scg_SetFactory: 1,
  scg_GenericSeqCompanion: 1,
  scg_GenSetFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.scg_SetFactory.prototype.$classData = ScalaJS.d.scg_SetFactory;
/** @constructor */
ScalaJS.c.sci_HashSet$HashTrieSet$$anon$1 = (function() {
  ScalaJS.c.sci_TrieIterator.call(this)
});
ScalaJS.c.sci_HashSet$HashTrieSet$$anon$1.prototype = new ScalaJS.h.sci_TrieIterator();
ScalaJS.c.sci_HashSet$HashTrieSet$$anon$1.prototype.constructor = ScalaJS.c.sci_HashSet$HashTrieSet$$anon$1;
/** @constructor */
ScalaJS.h.sci_HashSet$HashTrieSet$$anon$1 = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_HashSet$HashTrieSet$$anon$1.prototype = ScalaJS.c.sci_HashSet$HashTrieSet$$anon$1.prototype;
ScalaJS.c.sci_HashSet$HashTrieSet$$anon$1.prototype.init___sci_HashSet$HashTrieSet = (function($$outer) {
  return (ScalaJS.c.sci_TrieIterator.prototype.init___Asci_Iterable.call(this, $$outer.elems$5), this)
});
ScalaJS.c.sci_HashSet$HashTrieSet$$anon$1.prototype.getElem__O__O = (function(cc) {
  return ScalaJS.as.sci_HashSet$HashSet1(cc).key$5
});
ScalaJS.is.sci_HashSet$HashTrieSet$$anon$1 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_HashSet$HashTrieSet$$anon$1)))
});
ScalaJS.as.sci_HashSet$HashTrieSet$$anon$1 = (function(obj) {
  return ((ScalaJS.is.sci_HashSet$HashTrieSet$$anon$1(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.HashSet$HashTrieSet$$anon$1"))
});
ScalaJS.isArrayOf.sci_HashSet$HashTrieSet$$anon$1 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_HashSet$HashTrieSet$$anon$1)))
});
ScalaJS.asArrayOf.sci_HashSet$HashTrieSet$$anon$1 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_HashSet$HashTrieSet$$anon$1(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.HashSet$HashTrieSet$$anon$1;", depth))
});
ScalaJS.d.sci_HashSet$HashTrieSet$$anon$1 = new ScalaJS.ClassTypeData({
  sci_HashSet$HashTrieSet$$anon$1: 0
}, false, "scala.collection.immutable.HashSet$HashTrieSet$$anon$1", ScalaJS.d.sci_TrieIterator, {
  sci_HashSet$HashTrieSet$$anon$1: 1,
  sci_TrieIterator: 1,
  sc_AbstractIterator: 1,
  sc_Iterator: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  O: 1
});
ScalaJS.c.sci_HashSet$HashTrieSet$$anon$1.prototype.$classData = ScalaJS.d.sci_HashSet$HashTrieSet$$anon$1;
/** @constructor */
ScalaJS.c.scm_AbstractIterable = (function() {
  ScalaJS.c.sc_AbstractIterable.call(this)
});
ScalaJS.c.scm_AbstractIterable.prototype = new ScalaJS.h.sc_AbstractIterable();
ScalaJS.c.scm_AbstractIterable.prototype.constructor = ScalaJS.c.scm_AbstractIterable;
/** @constructor */
ScalaJS.h.scm_AbstractIterable = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_AbstractIterable.prototype = ScalaJS.c.scm_AbstractIterable.prototype;
ScalaJS.is.scm_AbstractIterable = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_AbstractIterable)))
});
ScalaJS.as.scm_AbstractIterable = (function(obj) {
  return ((ScalaJS.is.scm_AbstractIterable(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.AbstractIterable"))
});
ScalaJS.isArrayOf.scm_AbstractIterable = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_AbstractIterable)))
});
ScalaJS.asArrayOf.scm_AbstractIterable = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_AbstractIterable(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.AbstractIterable;", depth))
});
ScalaJS.d.scm_AbstractIterable = new ScalaJS.ClassTypeData({
  scm_AbstractIterable: 0
}, false, "scala.collection.mutable.AbstractIterable", ScalaJS.d.sc_AbstractIterable, {
  scm_AbstractIterable: 1,
  scm_Iterable: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.scm_AbstractIterable.prototype.$classData = ScalaJS.d.scm_AbstractIterable;
/** @constructor */
ScalaJS.c.jl_ArithmeticException = (function() {
  ScalaJS.c.jl_RuntimeException.call(this)
});
ScalaJS.c.jl_ArithmeticException.prototype = new ScalaJS.h.jl_RuntimeException();
ScalaJS.c.jl_ArithmeticException.prototype.constructor = ScalaJS.c.jl_ArithmeticException;
/** @constructor */
ScalaJS.h.jl_ArithmeticException = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_ArithmeticException.prototype = ScalaJS.c.jl_ArithmeticException.prototype;
ScalaJS.is.jl_ArithmeticException = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_ArithmeticException)))
});
ScalaJS.as.jl_ArithmeticException = (function(obj) {
  return ((ScalaJS.is.jl_ArithmeticException(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.ArithmeticException"))
});
ScalaJS.isArrayOf.jl_ArithmeticException = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_ArithmeticException)))
});
ScalaJS.asArrayOf.jl_ArithmeticException = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_ArithmeticException(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.ArithmeticException;", depth))
});
ScalaJS.d.jl_ArithmeticException = new ScalaJS.ClassTypeData({
  jl_ArithmeticException: 0
}, false, "java.lang.ArithmeticException", ScalaJS.d.jl_RuntimeException, {
  jl_ArithmeticException: 1,
  jl_RuntimeException: 1,
  jl_Exception: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.jl_ArithmeticException.prototype.$classData = ScalaJS.d.jl_ArithmeticException;
/** @constructor */
ScalaJS.c.jl_ClassCastException = (function() {
  ScalaJS.c.jl_RuntimeException.call(this)
});
ScalaJS.c.jl_ClassCastException.prototype = new ScalaJS.h.jl_RuntimeException();
ScalaJS.c.jl_ClassCastException.prototype.constructor = ScalaJS.c.jl_ClassCastException;
/** @constructor */
ScalaJS.h.jl_ClassCastException = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_ClassCastException.prototype = ScalaJS.c.jl_ClassCastException.prototype;
ScalaJS.is.jl_ClassCastException = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_ClassCastException)))
});
ScalaJS.as.jl_ClassCastException = (function(obj) {
  return ((ScalaJS.is.jl_ClassCastException(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.ClassCastException"))
});
ScalaJS.isArrayOf.jl_ClassCastException = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_ClassCastException)))
});
ScalaJS.asArrayOf.jl_ClassCastException = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_ClassCastException(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.ClassCastException;", depth))
});
ScalaJS.d.jl_ClassCastException = new ScalaJS.ClassTypeData({
  jl_ClassCastException: 0
}, false, "java.lang.ClassCastException", ScalaJS.d.jl_RuntimeException, {
  jl_ClassCastException: 1,
  jl_RuntimeException: 1,
  jl_Exception: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.jl_ClassCastException.prototype.$classData = ScalaJS.d.jl_ClassCastException;
/** @constructor */
ScalaJS.c.jl_IllegalArgumentException = (function() {
  ScalaJS.c.jl_RuntimeException.call(this)
});
ScalaJS.c.jl_IllegalArgumentException.prototype = new ScalaJS.h.jl_RuntimeException();
ScalaJS.c.jl_IllegalArgumentException.prototype.constructor = ScalaJS.c.jl_IllegalArgumentException;
/** @constructor */
ScalaJS.h.jl_IllegalArgumentException = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_IllegalArgumentException.prototype = ScalaJS.c.jl_IllegalArgumentException.prototype;
ScalaJS.c.jl_IllegalArgumentException.prototype.init___ = (function() {
  return (ScalaJS.c.jl_IllegalArgumentException.prototype.init___T__jl_Throwable.call(this, null, null), this)
});
ScalaJS.c.jl_IllegalArgumentException.prototype.init___T = (function(s) {
  return (ScalaJS.c.jl_IllegalArgumentException.prototype.init___T__jl_Throwable.call(this, s, null), this)
});
ScalaJS.is.jl_IllegalArgumentException = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_IllegalArgumentException)))
});
ScalaJS.as.jl_IllegalArgumentException = (function(obj) {
  return ((ScalaJS.is.jl_IllegalArgumentException(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.IllegalArgumentException"))
});
ScalaJS.isArrayOf.jl_IllegalArgumentException = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_IllegalArgumentException)))
});
ScalaJS.asArrayOf.jl_IllegalArgumentException = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_IllegalArgumentException(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.IllegalArgumentException;", depth))
});
ScalaJS.d.jl_IllegalArgumentException = new ScalaJS.ClassTypeData({
  jl_IllegalArgumentException: 0
}, false, "java.lang.IllegalArgumentException", ScalaJS.d.jl_RuntimeException, {
  jl_IllegalArgumentException: 1,
  jl_RuntimeException: 1,
  jl_Exception: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.jl_IllegalArgumentException.prototype.$classData = ScalaJS.d.jl_IllegalArgumentException;
/** @constructor */
ScalaJS.c.jl_IllegalStateException = (function() {
  ScalaJS.c.jl_RuntimeException.call(this)
});
ScalaJS.c.jl_IllegalStateException.prototype = new ScalaJS.h.jl_RuntimeException();
ScalaJS.c.jl_IllegalStateException.prototype.constructor = ScalaJS.c.jl_IllegalStateException;
/** @constructor */
ScalaJS.h.jl_IllegalStateException = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_IllegalStateException.prototype = ScalaJS.c.jl_IllegalStateException.prototype;
ScalaJS.c.jl_IllegalStateException.prototype.init___ = (function() {
  return (ScalaJS.c.jl_IllegalStateException.prototype.init___T__jl_Throwable.call(this, null, null), this)
});
ScalaJS.is.jl_IllegalStateException = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_IllegalStateException)))
});
ScalaJS.as.jl_IllegalStateException = (function(obj) {
  return ((ScalaJS.is.jl_IllegalStateException(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.IllegalStateException"))
});
ScalaJS.isArrayOf.jl_IllegalStateException = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_IllegalStateException)))
});
ScalaJS.asArrayOf.jl_IllegalStateException = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_IllegalStateException(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.IllegalStateException;", depth))
});
ScalaJS.d.jl_IllegalStateException = new ScalaJS.ClassTypeData({
  jl_IllegalStateException: 0
}, false, "java.lang.IllegalStateException", ScalaJS.d.jl_RuntimeException, {
  jl_IllegalStateException: 1,
  jl_RuntimeException: 1,
  jl_Exception: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.jl_IllegalStateException.prototype.$classData = ScalaJS.d.jl_IllegalStateException;
/** @constructor */
ScalaJS.c.jl_IndexOutOfBoundsException = (function() {
  ScalaJS.c.jl_RuntimeException.call(this)
});
ScalaJS.c.jl_IndexOutOfBoundsException.prototype = new ScalaJS.h.jl_RuntimeException();
ScalaJS.c.jl_IndexOutOfBoundsException.prototype.constructor = ScalaJS.c.jl_IndexOutOfBoundsException;
/** @constructor */
ScalaJS.h.jl_IndexOutOfBoundsException = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_IndexOutOfBoundsException.prototype = ScalaJS.c.jl_IndexOutOfBoundsException.prototype;
ScalaJS.is.jl_IndexOutOfBoundsException = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_IndexOutOfBoundsException)))
});
ScalaJS.as.jl_IndexOutOfBoundsException = (function(obj) {
  return ((ScalaJS.is.jl_IndexOutOfBoundsException(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.IndexOutOfBoundsException"))
});
ScalaJS.isArrayOf.jl_IndexOutOfBoundsException = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_IndexOutOfBoundsException)))
});
ScalaJS.asArrayOf.jl_IndexOutOfBoundsException = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_IndexOutOfBoundsException(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.IndexOutOfBoundsException;", depth))
});
ScalaJS.d.jl_IndexOutOfBoundsException = new ScalaJS.ClassTypeData({
  jl_IndexOutOfBoundsException: 0
}, false, "java.lang.IndexOutOfBoundsException", ScalaJS.d.jl_RuntimeException, {
  jl_IndexOutOfBoundsException: 1,
  jl_RuntimeException: 1,
  jl_Exception: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.jl_IndexOutOfBoundsException.prototype.$classData = ScalaJS.d.jl_IndexOutOfBoundsException;
/** @constructor */
ScalaJS.c.jl_NullPointerException = (function() {
  ScalaJS.c.jl_RuntimeException.call(this)
});
ScalaJS.c.jl_NullPointerException.prototype = new ScalaJS.h.jl_RuntimeException();
ScalaJS.c.jl_NullPointerException.prototype.constructor = ScalaJS.c.jl_NullPointerException;
/** @constructor */
ScalaJS.h.jl_NullPointerException = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_NullPointerException.prototype = ScalaJS.c.jl_NullPointerException.prototype;
ScalaJS.c.jl_NullPointerException.prototype.init___ = (function() {
  return (ScalaJS.c.jl_NullPointerException.prototype.init___T.call(this, null), this)
});
ScalaJS.is.jl_NullPointerException = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_NullPointerException)))
});
ScalaJS.as.jl_NullPointerException = (function(obj) {
  return ((ScalaJS.is.jl_NullPointerException(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.NullPointerException"))
});
ScalaJS.isArrayOf.jl_NullPointerException = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_NullPointerException)))
});
ScalaJS.asArrayOf.jl_NullPointerException = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_NullPointerException(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.NullPointerException;", depth))
});
ScalaJS.d.jl_NullPointerException = new ScalaJS.ClassTypeData({
  jl_NullPointerException: 0
}, false, "java.lang.NullPointerException", ScalaJS.d.jl_RuntimeException, {
  jl_NullPointerException: 1,
  jl_RuntimeException: 1,
  jl_Exception: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.jl_NullPointerException.prototype.$classData = ScalaJS.d.jl_NullPointerException;
/** @constructor */
ScalaJS.c.jl_StandardErrPrintStream$ = (function() {
  ScalaJS.c.Ljava_io_PrintStream.call(this);
  this.java$lang$JSConsoleBasedPrintStream$$flushed$4 = false;
  this.java$lang$JSConsoleBasedPrintStream$$buffer$4 = null;
  this.java$lang$JSConsoleBasedPrintStream$$lineContEnd$4 = null;
  this.java$lang$JSConsoleBasedPrintStream$$lineContStart$4 = null
});
ScalaJS.c.jl_StandardErrPrintStream$.prototype = new ScalaJS.h.Ljava_io_PrintStream();
ScalaJS.c.jl_StandardErrPrintStream$.prototype.constructor = ScalaJS.c.jl_StandardErrPrintStream$;
/** @constructor */
ScalaJS.h.jl_StandardErrPrintStream$ = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_StandardErrPrintStream$.prototype = ScalaJS.c.jl_StandardErrPrintStream$.prototype;
ScalaJS.c.jl_StandardErrPrintStream$.prototype.init___ = (function() {
  ScalaJS.c.Ljava_io_PrintStream.prototype.init___Ljava_io_OutputStream__Z.call(this, ScalaJS.m.jl_StandardErr(), true);
  ScalaJS.n.jl_StandardErrPrintStream = this;
  ScalaJS.i.jl_JSConsoleBasedPrintStream$class__$init$__jl_JSConsoleBasedPrintStream__V(this);
  return this
});
ScalaJS.c.jl_StandardErrPrintStream$.prototype.java$lang$JSConsoleBasedPrintStream$$undsetter$und$java$lang$JSConsoleBasedPrintStream$$lineContEnd$und$eq__T__V = (function(x$1) {
  this.java$lang$JSConsoleBasedPrintStream$$lineContEnd$4 = x$1
});
ScalaJS.c.jl_StandardErrPrintStream$.prototype.java$lang$JSConsoleBasedPrintStream$$lineContEnd__T = (function() {
  return this.java$lang$JSConsoleBasedPrintStream$$lineContEnd$4
});
ScalaJS.c.jl_StandardErrPrintStream$.prototype.java$lang$JSConsoleBasedPrintStream$$buffer$und$eq__T__V = (function(x$1) {
  this.java$lang$JSConsoleBasedPrintStream$$buffer$4 = x$1
});
ScalaJS.c.jl_StandardErrPrintStream$.prototype.doWriteLine__T__V = (function(line) {
  if ((!ScalaJS.uZ((!ScalaJS.g["console"])))) {
    if ((!ScalaJS.uZ((!ScalaJS.g["console"]["error"])))) {
      ScalaJS.g["console"]["error"](line)
    } else {
      ScalaJS.g["console"]["log"](line)
    }
  }
});
ScalaJS.c.jl_StandardErrPrintStream$.prototype.java$lang$JSConsoleBasedPrintStream$$lineContStart__T = (function() {
  return this.java$lang$JSConsoleBasedPrintStream$$lineContStart$4
});
ScalaJS.c.jl_StandardErrPrintStream$.prototype.java$lang$JSConsoleBasedPrintStream$$flushed__Z = (function() {
  return this.java$lang$JSConsoleBasedPrintStream$$flushed$4
});
ScalaJS.c.jl_StandardErrPrintStream$.prototype.java$lang$JSConsoleBasedPrintStream$$buffer__T = (function() {
  return this.java$lang$JSConsoleBasedPrintStream$$buffer$4
});
ScalaJS.c.jl_StandardErrPrintStream$.prototype.java$lang$JSConsoleBasedPrintStream$$flushed$und$eq__Z__V = (function(x$1) {
  this.java$lang$JSConsoleBasedPrintStream$$flushed$4 = x$1
});
ScalaJS.c.jl_StandardErrPrintStream$.prototype.java$lang$JSConsoleBasedPrintStream$$undsetter$und$java$lang$JSConsoleBasedPrintStream$$lineContStart$und$eq__T__V = (function(x$1) {
  this.java$lang$JSConsoleBasedPrintStream$$lineContStart$4 = x$1
});
ScalaJS.is.jl_StandardErrPrintStream$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_StandardErrPrintStream$)))
});
ScalaJS.as.jl_StandardErrPrintStream$ = (function(obj) {
  return ((ScalaJS.is.jl_StandardErrPrintStream$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.StandardErrPrintStream$"))
});
ScalaJS.isArrayOf.jl_StandardErrPrintStream$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_StandardErrPrintStream$)))
});
ScalaJS.asArrayOf.jl_StandardErrPrintStream$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_StandardErrPrintStream$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.StandardErrPrintStream$;", depth))
});
ScalaJS.d.jl_StandardErrPrintStream$ = new ScalaJS.ClassTypeData({
  jl_StandardErrPrintStream$: 0
}, false, "java.lang.StandardErrPrintStream$", ScalaJS.d.Ljava_io_PrintStream, {
  jl_StandardErrPrintStream$: 1,
  jl_JSConsoleBasedPrintStream: 1,
  Ljava_io_PrintStream: 1,
  jl_Appendable: 1,
  Ljava_io_FilterOutputStream: 1,
  Ljava_io_OutputStream: 1,
  Ljava_io_Flushable: 1,
  Ljava_io_Closeable: 1,
  jl_AutoCloseable: 1,
  O: 1
});
ScalaJS.c.jl_StandardErrPrintStream$.prototype.$classData = ScalaJS.d.jl_StandardErrPrintStream$;
ScalaJS.n.jl_StandardErrPrintStream = (void 0);
ScalaJS.m.jl_StandardErrPrintStream = (function() {
  if ((!ScalaJS.n.jl_StandardErrPrintStream)) {
    ScalaJS.n.jl_StandardErrPrintStream = new ScalaJS.c.jl_StandardErrPrintStream$().init___()
  };
  return ScalaJS.n.jl_StandardErrPrintStream
});
/** @constructor */
ScalaJS.c.jl_StandardOutPrintStream$ = (function() {
  ScalaJS.c.Ljava_io_PrintStream.call(this);
  this.java$lang$JSConsoleBasedPrintStream$$flushed$4 = false;
  this.java$lang$JSConsoleBasedPrintStream$$buffer$4 = null;
  this.java$lang$JSConsoleBasedPrintStream$$lineContEnd$4 = null;
  this.java$lang$JSConsoleBasedPrintStream$$lineContStart$4 = null
});
ScalaJS.c.jl_StandardOutPrintStream$.prototype = new ScalaJS.h.Ljava_io_PrintStream();
ScalaJS.c.jl_StandardOutPrintStream$.prototype.constructor = ScalaJS.c.jl_StandardOutPrintStream$;
/** @constructor */
ScalaJS.h.jl_StandardOutPrintStream$ = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_StandardOutPrintStream$.prototype = ScalaJS.c.jl_StandardOutPrintStream$.prototype;
ScalaJS.c.jl_StandardOutPrintStream$.prototype.init___ = (function() {
  ScalaJS.c.Ljava_io_PrintStream.prototype.init___Ljava_io_OutputStream__Z.call(this, ScalaJS.m.jl_StandardOut(), true);
  ScalaJS.n.jl_StandardOutPrintStream = this;
  ScalaJS.i.jl_JSConsoleBasedPrintStream$class__$init$__jl_JSConsoleBasedPrintStream__V(this);
  return this
});
ScalaJS.c.jl_StandardOutPrintStream$.prototype.java$lang$JSConsoleBasedPrintStream$$undsetter$und$java$lang$JSConsoleBasedPrintStream$$lineContEnd$und$eq__T__V = (function(x$1) {
  this.java$lang$JSConsoleBasedPrintStream$$lineContEnd$4 = x$1
});
ScalaJS.c.jl_StandardOutPrintStream$.prototype.java$lang$JSConsoleBasedPrintStream$$lineContEnd__T = (function() {
  return this.java$lang$JSConsoleBasedPrintStream$$lineContEnd$4
});
ScalaJS.c.jl_StandardOutPrintStream$.prototype.java$lang$JSConsoleBasedPrintStream$$buffer$und$eq__T__V = (function(x$1) {
  this.java$lang$JSConsoleBasedPrintStream$$buffer$4 = x$1
});
ScalaJS.c.jl_StandardOutPrintStream$.prototype.doWriteLine__T__V = (function(line) {
  if ((!ScalaJS.uZ((!ScalaJS.g["console"])))) {
    ScalaJS.g["console"]["log"](line)
  }
});
ScalaJS.c.jl_StandardOutPrintStream$.prototype.java$lang$JSConsoleBasedPrintStream$$lineContStart__T = (function() {
  return this.java$lang$JSConsoleBasedPrintStream$$lineContStart$4
});
ScalaJS.c.jl_StandardOutPrintStream$.prototype.java$lang$JSConsoleBasedPrintStream$$flushed__Z = (function() {
  return this.java$lang$JSConsoleBasedPrintStream$$flushed$4
});
ScalaJS.c.jl_StandardOutPrintStream$.prototype.java$lang$JSConsoleBasedPrintStream$$buffer__T = (function() {
  return this.java$lang$JSConsoleBasedPrintStream$$buffer$4
});
ScalaJS.c.jl_StandardOutPrintStream$.prototype.java$lang$JSConsoleBasedPrintStream$$flushed$und$eq__Z__V = (function(x$1) {
  this.java$lang$JSConsoleBasedPrintStream$$flushed$4 = x$1
});
ScalaJS.c.jl_StandardOutPrintStream$.prototype.java$lang$JSConsoleBasedPrintStream$$undsetter$und$java$lang$JSConsoleBasedPrintStream$$lineContStart$und$eq__T__V = (function(x$1) {
  this.java$lang$JSConsoleBasedPrintStream$$lineContStart$4 = x$1
});
ScalaJS.is.jl_StandardOutPrintStream$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_StandardOutPrintStream$)))
});
ScalaJS.as.jl_StandardOutPrintStream$ = (function(obj) {
  return ((ScalaJS.is.jl_StandardOutPrintStream$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.StandardOutPrintStream$"))
});
ScalaJS.isArrayOf.jl_StandardOutPrintStream$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_StandardOutPrintStream$)))
});
ScalaJS.asArrayOf.jl_StandardOutPrintStream$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_StandardOutPrintStream$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.StandardOutPrintStream$;", depth))
});
ScalaJS.d.jl_StandardOutPrintStream$ = new ScalaJS.ClassTypeData({
  jl_StandardOutPrintStream$: 0
}, false, "java.lang.StandardOutPrintStream$", ScalaJS.d.Ljava_io_PrintStream, {
  jl_StandardOutPrintStream$: 1,
  jl_JSConsoleBasedPrintStream: 1,
  Ljava_io_PrintStream: 1,
  jl_Appendable: 1,
  Ljava_io_FilterOutputStream: 1,
  Ljava_io_OutputStream: 1,
  Ljava_io_Flushable: 1,
  Ljava_io_Closeable: 1,
  jl_AutoCloseable: 1,
  O: 1
});
ScalaJS.c.jl_StandardOutPrintStream$.prototype.$classData = ScalaJS.d.jl_StandardOutPrintStream$;
ScalaJS.n.jl_StandardOutPrintStream = (void 0);
ScalaJS.m.jl_StandardOutPrintStream = (function() {
  if ((!ScalaJS.n.jl_StandardOutPrintStream)) {
    ScalaJS.n.jl_StandardOutPrintStream = new ScalaJS.c.jl_StandardOutPrintStream$().init___()
  };
  return ScalaJS.n.jl_StandardOutPrintStream
});
/** @constructor */
ScalaJS.c.jl_UnsupportedOperationException = (function() {
  ScalaJS.c.jl_RuntimeException.call(this)
});
ScalaJS.c.jl_UnsupportedOperationException.prototype = new ScalaJS.h.jl_RuntimeException();
ScalaJS.c.jl_UnsupportedOperationException.prototype.constructor = ScalaJS.c.jl_UnsupportedOperationException;
/** @constructor */
ScalaJS.h.jl_UnsupportedOperationException = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_UnsupportedOperationException.prototype = ScalaJS.c.jl_UnsupportedOperationException.prototype;
ScalaJS.c.jl_UnsupportedOperationException.prototype.init___T = (function(s) {
  return (ScalaJS.c.jl_UnsupportedOperationException.prototype.init___T__jl_Throwable.call(this, s, null), this)
});
ScalaJS.is.jl_UnsupportedOperationException = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_UnsupportedOperationException)))
});
ScalaJS.as.jl_UnsupportedOperationException = (function(obj) {
  return ((ScalaJS.is.jl_UnsupportedOperationException(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.UnsupportedOperationException"))
});
ScalaJS.isArrayOf.jl_UnsupportedOperationException = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_UnsupportedOperationException)))
});
ScalaJS.asArrayOf.jl_UnsupportedOperationException = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_UnsupportedOperationException(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.UnsupportedOperationException;", depth))
});
ScalaJS.d.jl_UnsupportedOperationException = new ScalaJS.ClassTypeData({
  jl_UnsupportedOperationException: 0
}, false, "java.lang.UnsupportedOperationException", ScalaJS.d.jl_RuntimeException, {
  jl_UnsupportedOperationException: 1,
  jl_RuntimeException: 1,
  jl_Exception: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.jl_UnsupportedOperationException.prototype.$classData = ScalaJS.d.jl_UnsupportedOperationException;
/** @constructor */
ScalaJS.c.ju_NoSuchElementException = (function() {
  ScalaJS.c.jl_RuntimeException.call(this)
});
ScalaJS.c.ju_NoSuchElementException.prototype = new ScalaJS.h.jl_RuntimeException();
ScalaJS.c.ju_NoSuchElementException.prototype.constructor = ScalaJS.c.ju_NoSuchElementException;
/** @constructor */
ScalaJS.h.ju_NoSuchElementException = (function() {
  /*<skip>*/
});
ScalaJS.h.ju_NoSuchElementException.prototype = ScalaJS.c.ju_NoSuchElementException.prototype;
ScalaJS.c.ju_NoSuchElementException.prototype.init___ = (function() {
  return (ScalaJS.c.ju_NoSuchElementException.prototype.init___T.call(this, null), this)
});
ScalaJS.is.ju_NoSuchElementException = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.ju_NoSuchElementException)))
});
ScalaJS.as.ju_NoSuchElementException = (function(obj) {
  return ((ScalaJS.is.ju_NoSuchElementException(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.util.NoSuchElementException"))
});
ScalaJS.isArrayOf.ju_NoSuchElementException = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.ju_NoSuchElementException)))
});
ScalaJS.asArrayOf.ju_NoSuchElementException = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.ju_NoSuchElementException(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.util.NoSuchElementException;", depth))
});
ScalaJS.d.ju_NoSuchElementException = new ScalaJS.ClassTypeData({
  ju_NoSuchElementException: 0
}, false, "java.util.NoSuchElementException", ScalaJS.d.jl_RuntimeException, {
  ju_NoSuchElementException: 1,
  jl_RuntimeException: 1,
  jl_Exception: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.ju_NoSuchElementException.prototype.$classData = ScalaJS.d.ju_NoSuchElementException;
/** @constructor */
ScalaJS.c.s_MatchError = (function() {
  ScalaJS.c.jl_RuntimeException.call(this);
  this.obj$4 = null;
  this.objString$4 = null;
  this.bitmap$0$4 = false
});
ScalaJS.c.s_MatchError.prototype = new ScalaJS.h.jl_RuntimeException();
ScalaJS.c.s_MatchError.prototype.constructor = ScalaJS.c.s_MatchError;
/** @constructor */
ScalaJS.h.s_MatchError = (function() {
  /*<skip>*/
});
ScalaJS.h.s_MatchError.prototype = ScalaJS.c.s_MatchError.prototype;
ScalaJS.c.s_MatchError.prototype.objString$lzycompute__p4__T = (function() {
  if ((!this.bitmap$0$4)) {
    this.objString$4 = ((this.obj$4 === null) ? "null" : this.liftedTree1$1__p4__T());
    this.bitmap$0$4 = true
  };
  return this.objString$4
});
ScalaJS.c.s_MatchError.prototype.ofClass$1__p4__T = (function() {
  return ("of class " + ScalaJS.objectGetClass(this.obj$4).getName__T())
});
ScalaJS.c.s_MatchError.prototype.liftedTree1$1__p4__T = (function() {
  try {
    return (((ScalaJS.objectToString(this.obj$4) + " (") + this.ofClass$1__p4__T()) + ")")
  } catch (ex) {
    ex = ScalaJS.wrapJavaScriptException(ex);
    return ("an instance " + this.ofClass$1__p4__T())
  }
});
ScalaJS.c.s_MatchError.prototype.getMessage__T = (function() {
  return this.objString__p4__T()
});
ScalaJS.c.s_MatchError.prototype.objString__p4__T = (function() {
  return ((!this.bitmap$0$4) ? this.objString$lzycompute__p4__T() : this.objString$4)
});
ScalaJS.c.s_MatchError.prototype.init___O = (function(obj) {
  this.obj$4 = obj;
  ScalaJS.c.jl_RuntimeException.prototype.init___.call(this);
  return this
});
ScalaJS.is.s_MatchError = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_MatchError)))
});
ScalaJS.as.s_MatchError = (function(obj) {
  return ((ScalaJS.is.s_MatchError(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.MatchError"))
});
ScalaJS.isArrayOf.s_MatchError = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_MatchError)))
});
ScalaJS.asArrayOf.s_MatchError = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_MatchError(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.MatchError;", depth))
});
ScalaJS.d.s_MatchError = new ScalaJS.ClassTypeData({
  s_MatchError: 0
}, false, "scala.MatchError", ScalaJS.d.jl_RuntimeException, {
  s_MatchError: 1,
  jl_RuntimeException: 1,
  jl_Exception: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_MatchError.prototype.$classData = ScalaJS.d.s_MatchError;
ScalaJS.is.s_xml_NodeSeq = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_xml_NodeSeq)))
});
ScalaJS.as.s_xml_NodeSeq = (function(obj) {
  return ((ScalaJS.is.s_xml_NodeSeq(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.xml.NodeSeq"))
});
ScalaJS.isArrayOf.s_xml_NodeSeq = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_xml_NodeSeq)))
});
ScalaJS.asArrayOf.s_xml_NodeSeq = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_xml_NodeSeq(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.xml.NodeSeq;", depth))
});
ScalaJS.d.s_xml_NodeSeq = new ScalaJS.ClassTypeData({
  s_xml_NodeSeq: 0
}, false, "scala.xml.NodeSeq", ScalaJS.d.sc_AbstractSeq, {
  s_xml_NodeSeq: 1,
  s_xml_Equality: 1,
  sci_Seq: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
/** @constructor */
ScalaJS.c.scg_ImmutableSetFactory = (function() {
  ScalaJS.c.scg_SetFactory.call(this)
});
ScalaJS.c.scg_ImmutableSetFactory.prototype = new ScalaJS.h.scg_SetFactory();
ScalaJS.c.scg_ImmutableSetFactory.prototype.constructor = ScalaJS.c.scg_ImmutableSetFactory;
/** @constructor */
ScalaJS.h.scg_ImmutableSetFactory = (function() {
  /*<skip>*/
});
ScalaJS.h.scg_ImmutableSetFactory.prototype = ScalaJS.c.scg_ImmutableSetFactory.prototype;
ScalaJS.c.scg_ImmutableSetFactory.prototype.newBuilder__scm_Builder = (function() {
  return new ScalaJS.c.scm_SetBuilder().init___sc_Set(ScalaJS.as.sc_Set(this.empty__sc_GenTraversable()))
});
ScalaJS.is.scg_ImmutableSetFactory = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scg_ImmutableSetFactory)))
});
ScalaJS.as.scg_ImmutableSetFactory = (function(obj) {
  return ((ScalaJS.is.scg_ImmutableSetFactory(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.generic.ImmutableSetFactory"))
});
ScalaJS.isArrayOf.scg_ImmutableSetFactory = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scg_ImmutableSetFactory)))
});
ScalaJS.asArrayOf.scg_ImmutableSetFactory = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scg_ImmutableSetFactory(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.generic.ImmutableSetFactory;", depth))
});
ScalaJS.d.scg_ImmutableSetFactory = new ScalaJS.ClassTypeData({
  scg_ImmutableSetFactory: 0
}, false, "scala.collection.generic.ImmutableSetFactory", ScalaJS.d.scg_SetFactory, {
  scg_ImmutableSetFactory: 1,
  scg_SetFactory: 1,
  scg_GenericSeqCompanion: 1,
  scg_GenSetFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.scg_ImmutableSetFactory.prototype.$classData = ScalaJS.d.scg_ImmutableSetFactory;
/** @constructor */
ScalaJS.c.scg_MutableSetFactory = (function() {
  ScalaJS.c.scg_SetFactory.call(this)
});
ScalaJS.c.scg_MutableSetFactory.prototype = new ScalaJS.h.scg_SetFactory();
ScalaJS.c.scg_MutableSetFactory.prototype.constructor = ScalaJS.c.scg_MutableSetFactory;
/** @constructor */
ScalaJS.h.scg_MutableSetFactory = (function() {
  /*<skip>*/
});
ScalaJS.h.scg_MutableSetFactory.prototype = ScalaJS.c.scg_MutableSetFactory.prototype;
ScalaJS.c.scg_MutableSetFactory.prototype.newBuilder__scm_Builder = (function() {
  return new ScalaJS.c.scm_GrowingBuilder().init___scg_Growable(new ScalaJS.c.scm_HashSet().init___())
});
ScalaJS.is.scg_MutableSetFactory = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scg_MutableSetFactory)))
});
ScalaJS.as.scg_MutableSetFactory = (function(obj) {
  return ((ScalaJS.is.scg_MutableSetFactory(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.generic.MutableSetFactory"))
});
ScalaJS.isArrayOf.scg_MutableSetFactory = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scg_MutableSetFactory)))
});
ScalaJS.asArrayOf.scg_MutableSetFactory = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scg_MutableSetFactory(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.generic.MutableSetFactory;", depth))
});
ScalaJS.d.scg_MutableSetFactory = new ScalaJS.ClassTypeData({
  scg_MutableSetFactory: 0
}, false, "scala.collection.generic.MutableSetFactory", ScalaJS.d.scg_SetFactory, {
  scg_MutableSetFactory: 1,
  scg_SetFactory: 1,
  scg_GenericSeqCompanion: 1,
  scg_GenSetFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.scg_MutableSetFactory.prototype.$classData = ScalaJS.d.scg_MutableSetFactory;
/** @constructor */
ScalaJS.c.scg_SeqFactory = (function() {
  ScalaJS.c.scg_GenSeqFactory.call(this)
});
ScalaJS.c.scg_SeqFactory.prototype = new ScalaJS.h.scg_GenSeqFactory();
ScalaJS.c.scg_SeqFactory.prototype.constructor = ScalaJS.c.scg_SeqFactory;
/** @constructor */
ScalaJS.h.scg_SeqFactory = (function() {
  /*<skip>*/
});
ScalaJS.h.scg_SeqFactory.prototype = ScalaJS.c.scg_SeqFactory.prototype;
ScalaJS.is.scg_SeqFactory = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scg_SeqFactory)))
});
ScalaJS.as.scg_SeqFactory = (function(obj) {
  return ((ScalaJS.is.scg_SeqFactory(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.generic.SeqFactory"))
});
ScalaJS.isArrayOf.scg_SeqFactory = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scg_SeqFactory)))
});
ScalaJS.asArrayOf.scg_SeqFactory = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scg_SeqFactory(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.generic.SeqFactory;", depth))
});
ScalaJS.d.scg_SeqFactory = new ScalaJS.ClassTypeData({
  scg_SeqFactory: 0
}, false, "scala.collection.generic.SeqFactory", ScalaJS.d.scg_GenSeqFactory, {
  scg_SeqFactory: 1,
  scg_TraversableFactory: 1,
  scg_GenericSeqCompanion: 1,
  scg_GenSeqFactory: 1,
  scg_GenTraversableFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.scg_SeqFactory.prototype.$classData = ScalaJS.d.scg_SeqFactory;
/** @constructor */
ScalaJS.c.sci_HashSet = (function() {
  ScalaJS.c.sc_AbstractSet.call(this)
});
ScalaJS.c.sci_HashSet.prototype = new ScalaJS.h.sc_AbstractSet();
ScalaJS.c.sci_HashSet.prototype.constructor = ScalaJS.c.sci_HashSet;
/** @constructor */
ScalaJS.h.sci_HashSet = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_HashSet.prototype = ScalaJS.c.sci_HashSet.prototype;
ScalaJS.c.sci_HashSet.prototype.seq__sc_TraversableOnce = (function() {
  return this
});
ScalaJS.c.sci_HashSet.prototype.updated0__O__I__I__sci_HashSet = (function(key, hash, level) {
  return new ScalaJS.c.sci_HashSet$HashSet1().init___O__I(key, hash)
});
ScalaJS.c.sci_HashSet.prototype.computeHash__O__I = (function(key) {
  return this.improve__I__I(ScalaJS.m.sr_ScalaRunTime().hash__O__I(key))
});
ScalaJS.c.sci_HashSet.prototype.init___ = (function() {
  return this
});
ScalaJS.c.sci_HashSet.prototype.apply__O__O = (function(v1) {
  return this.contains__O__Z(v1)
});
ScalaJS.c.sci_HashSet.prototype.$$plus__O__sci_HashSet = (function(e) {
  return this.updated0__O__I__I__sci_HashSet(e, this.computeHash__O__I(e), 0)
});
ScalaJS.c.sci_HashSet.prototype.thisCollection__sc_Traversable = (function() {
  return ScalaJS.i.sc_IterableLike$class__thisCollection__sc_IterableLike__sc_Iterable(this)
});
ScalaJS.c.sci_HashSet.prototype.companion__scg_GenericCompanion = (function() {
  return ScalaJS.m.sci_HashSet()
});
ScalaJS.c.sci_HashSet.prototype.foreach__F1__V = (function(f) {
  /*<skip>*/
});
ScalaJS.c.sci_HashSet.prototype.size__I = (function() {
  return 0
});
ScalaJS.c.sci_HashSet.prototype.iterator__sc_Iterator = (function() {
  return ScalaJS.m.sc_Iterator().empty$1
});
ScalaJS.c.sci_HashSet.prototype.empty__sc_Set = (function() {
  return ScalaJS.m.sci_HashSet$EmptyHashSet()
});
ScalaJS.c.sci_HashSet.prototype.improve__I__I = (function(hcode) {
  var h = ((hcode + (~(hcode << 9))) | 0);
  h = (h ^ ((h >>> 14) | 0));
  h = ((h + (h << 4)) | 0);
  return (h ^ ((h >>> 10) | 0))
});
ScalaJS.c.sci_HashSet.prototype.seq__sc_Set = (function() {
  return this
});
ScalaJS.c.sci_HashSet.prototype.contains__O__Z = (function(e) {
  return this.get0__O__I__I__Z(e, this.computeHash__O__I(e), 0)
});
ScalaJS.c.sci_HashSet.prototype.$$plus__O__O__sc_Seq__sci_HashSet = (function(elem1, elem2, elems) {
  var this$1 = this.$$plus__O__sci_HashSet(elem1).$$plus__O__sci_HashSet(elem2);
  return ScalaJS.as.sci_HashSet(ScalaJS.i.sc_SetLike$class__$plus$plus__sc_SetLike__sc_GenTraversableOnce__sc_Set(this$1, elems))
});
ScalaJS.c.sci_HashSet.prototype.$$plus__O__sc_Set = (function(elem) {
  return this.$$plus__O__sci_HashSet(elem)
});
ScalaJS.c.sci_HashSet.prototype.get0__O__I__I__Z = (function(key, hash, level) {
  return false
});
ScalaJS.is.sci_HashSet = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_HashSet)))
});
ScalaJS.as.sci_HashSet = (function(obj) {
  return ((ScalaJS.is.sci_HashSet(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.HashSet"))
});
ScalaJS.isArrayOf.sci_HashSet = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_HashSet)))
});
ScalaJS.asArrayOf.sci_HashSet = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_HashSet(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.HashSet;", depth))
});
ScalaJS.d.sci_HashSet = new ScalaJS.ClassTypeData({
  sci_HashSet: 0
}, false, "scala.collection.immutable.HashSet", ScalaJS.d.sc_AbstractSet, {
  sci_HashSet: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sc_CustomParallelizable: 1,
  sci_Set: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSet: 1,
  sc_Set: 1,
  sc_SetLike: 1,
  scg_Subtractable: 1,
  sc_GenSet: 1,
  scg_GenericSetTemplate: 1,
  sc_GenSetLike: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_HashSet.prototype.$classData = ScalaJS.d.sci_HashSet;
/** @constructor */
ScalaJS.c.sci_List = (function() {
  ScalaJS.c.sc_AbstractSeq.call(this)
});
ScalaJS.c.sci_List.prototype = new ScalaJS.h.sc_AbstractSeq();
ScalaJS.c.sci_List.prototype.constructor = ScalaJS.c.sci_List;
/** @constructor */
ScalaJS.h.sci_List = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_List.prototype = ScalaJS.c.sci_List.prototype;
ScalaJS.c.sci_List.prototype.seq__sc_TraversableOnce = (function() {
  return this
});
ScalaJS.c.sci_List.prototype.init___ = (function() {
  return this
});
ScalaJS.c.sci_List.prototype.lengthCompare__I__I = (function(len) {
  return ScalaJS.i.sc_LinearSeqOptimized$class__lengthCompare__sc_LinearSeqOptimized__I__I(this, len)
});
ScalaJS.c.sci_List.prototype.sameElements__sc_GenIterable__Z = (function(that) {
  return ScalaJS.i.sc_LinearSeqOptimized$class__sameElements__sc_LinearSeqOptimized__sc_GenIterable__Z(this, that)
});
ScalaJS.c.sci_List.prototype.apply__O__O = (function(v1) {
  var n = ScalaJS.uI(v1);
  return ScalaJS.i.sc_LinearSeqOptimized$class__apply__sc_LinearSeqOptimized__I__O(this, n)
});
ScalaJS.c.sci_List.prototype.thisCollection__sc_Traversable = (function() {
  return ScalaJS.i.sc_LinearSeqLike$class__thisCollection__sc_LinearSeqLike__sc_LinearSeq(this)
});
ScalaJS.c.sci_List.prototype.drop__I__sc_LinearSeqOptimized = (function(n) {
  return this.drop__I__sci_List(n)
});
ScalaJS.c.sci_List.prototype.companion__scg_GenericCompanion = (function() {
  return ScalaJS.m.sci_List()
});
ScalaJS.c.sci_List.prototype.foreach__F1__V = (function(f) {
  var these = this;
  while ((!these.isEmpty__Z())) {
    f.apply__O__O(these.head__O());
    these = ScalaJS.as.sci_List(these.tail__O())
  }
});
ScalaJS.c.sci_List.prototype.foldLeft__O__F2__O = (function(z, f) {
  return ScalaJS.i.sc_LinearSeqOptimized$class__foldLeft__sc_LinearSeqOptimized__O__F2__O(this, z, f)
});
ScalaJS.c.sci_List.prototype.iterator__sc_Iterator = (function() {
  return new ScalaJS.c.sc_LinearSeqLike$$anon$1().init___sc_LinearSeqLike(this)
});
ScalaJS.c.sci_List.prototype.drop__I__sci_List = (function(n) {
  var these = this;
  var count = n;
  while (((!these.isEmpty__Z()) && (count > 0))) {
    these = ScalaJS.as.sci_List(these.tail__O());
    count = ((count - 1) | 0)
  };
  return these
});
ScalaJS.c.sci_List.prototype.length__I = (function() {
  return ScalaJS.i.sc_LinearSeqOptimized$class__length__sc_LinearSeqOptimized__I(this)
});
ScalaJS.c.sci_List.prototype.seq__sc_Seq = (function() {
  return this
});
ScalaJS.c.sci_List.prototype.toStream__sci_Stream = (function() {
  return (this.isEmpty__Z() ? ScalaJS.m.sci_Stream$Empty() : new ScalaJS.c.sci_Stream$Cons().init___O__F0(this.head__O(), new ScalaJS.c.sjsr_AnonFunction0().init___sjs_js_Function0((function(arg$outer) {
    return (function() {
      return ScalaJS.as.sci_List(arg$outer.tail__O()).toStream__sci_Stream()
    })
  })(this))))
});
ScalaJS.c.sci_List.prototype.hashCode__I = (function() {
  return ScalaJS.m.s_util_hashing_MurmurHash3().seqHash__sc_Seq__I(this)
});
ScalaJS.c.sci_List.prototype.stringPrefix__T = (function() {
  return "List"
});
ScalaJS.is.sci_List = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_List)))
});
ScalaJS.as.sci_List = (function(obj) {
  return ((ScalaJS.is.sci_List(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.List"))
});
ScalaJS.isArrayOf.sci_List = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_List)))
});
ScalaJS.asArrayOf.sci_List = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_List(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.List;", depth))
});
ScalaJS.d.sci_List = new ScalaJS.ClassTypeData({
  sci_List: 0
}, false, "scala.collection.immutable.List", ScalaJS.d.sc_AbstractSeq, {
  sci_List: 1,
  sc_LinearSeqOptimized: 1,
  s_Product: 1,
  sci_LinearSeq: 1,
  sc_LinearSeq: 1,
  sc_LinearSeqLike: 1,
  sci_Seq: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_List.prototype.$classData = ScalaJS.d.sci_List;
/** @constructor */
ScalaJS.c.sci_ListSet = (function() {
  ScalaJS.c.sc_AbstractSet.call(this)
});
ScalaJS.c.sci_ListSet.prototype = new ScalaJS.h.sc_AbstractSet();
ScalaJS.c.sci_ListSet.prototype.constructor = ScalaJS.c.sci_ListSet;
/** @constructor */
ScalaJS.h.sci_ListSet = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_ListSet.prototype = ScalaJS.c.sci_ListSet.prototype;
ScalaJS.c.sci_ListSet.prototype.seq__sc_TraversableOnce = (function() {
  return this
});
ScalaJS.c.sci_ListSet.prototype.init___ = (function() {
  return this
});
ScalaJS.c.sci_ListSet.prototype.head__O = (function() {
  throw new ScalaJS.c.ju_NoSuchElementException().init___T("Set has no elements")
});
ScalaJS.c.sci_ListSet.prototype.apply__O__O = (function(v1) {
  return this.contains__O__Z(v1)
});
ScalaJS.c.sci_ListSet.prototype.isEmpty__Z = (function() {
  return true
});
ScalaJS.c.sci_ListSet.prototype.thisCollection__sc_Traversable = (function() {
  return ScalaJS.i.sc_IterableLike$class__thisCollection__sc_IterableLike__sc_Iterable(this)
});
ScalaJS.c.sci_ListSet.prototype.scala$collection$immutable$ListSet$$unchecked$undouter__sci_ListSet = (function() {
  throw new ScalaJS.c.ju_NoSuchElementException().init___T("Empty ListSet has no outer pointer")
});
ScalaJS.c.sci_ListSet.prototype.companion__scg_GenericCompanion = (function() {
  return ScalaJS.m.sci_ListSet()
});
ScalaJS.c.sci_ListSet.prototype.$$plus__O__sci_ListSet = (function(elem) {
  return new ScalaJS.c.sci_ListSet$Node().init___sci_ListSet__O(this, elem)
});
ScalaJS.c.sci_ListSet.prototype.size__I = (function() {
  return 0
});
ScalaJS.c.sci_ListSet.prototype.iterator__sc_Iterator = (function() {
  return new ScalaJS.c.sci_ListSet$$anon$1().init___sci_ListSet(this)
});
ScalaJS.c.sci_ListSet.prototype.empty__sc_Set = (function() {
  return ScalaJS.as.sc_Set(ScalaJS.i.scg_GenericSetTemplate$class__empty__scg_GenericSetTemplate__sc_GenSet(this))
});
ScalaJS.c.sci_ListSet.prototype.seq__sc_Set = (function() {
  return this
});
ScalaJS.c.sci_ListSet.prototype.contains__O__Z = (function(elem) {
  return false
});
ScalaJS.c.sci_ListSet.prototype.$$plus__O__sc_Set = (function(elem) {
  return this.$$plus__O__sci_ListSet(elem)
});
ScalaJS.c.sci_ListSet.prototype.tail__sci_ListSet = (function() {
  throw new ScalaJS.c.ju_NoSuchElementException().init___T("Next of an empty set")
});
ScalaJS.c.sci_ListSet.prototype.stringPrefix__T = (function() {
  return "ListSet"
});
ScalaJS.is.sci_ListSet = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_ListSet)))
});
ScalaJS.as.sci_ListSet = (function(obj) {
  return ((ScalaJS.is.sci_ListSet(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.ListSet"))
});
ScalaJS.isArrayOf.sci_ListSet = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_ListSet)))
});
ScalaJS.asArrayOf.sci_ListSet = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_ListSet(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.ListSet;", depth))
});
ScalaJS.d.sci_ListSet = new ScalaJS.ClassTypeData({
  sci_ListSet: 0
}, false, "scala.collection.immutable.ListSet", ScalaJS.d.sc_AbstractSet, {
  sci_ListSet: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sci_Set: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSet: 1,
  sc_Set: 1,
  sc_SetLike: 1,
  scg_Subtractable: 1,
  sc_GenSet: 1,
  scg_GenericSetTemplate: 1,
  sc_GenSetLike: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_ListSet.prototype.$classData = ScalaJS.d.sci_ListSet;
/** @constructor */
ScalaJS.c.sci_Map$ = (function() {
  ScalaJS.c.scg_ImmutableMapFactory.call(this)
});
ScalaJS.c.sci_Map$.prototype = new ScalaJS.h.scg_ImmutableMapFactory();
ScalaJS.c.sci_Map$.prototype.constructor = ScalaJS.c.sci_Map$;
/** @constructor */
ScalaJS.h.sci_Map$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Map$.prototype = ScalaJS.c.sci_Map$.prototype;
ScalaJS.is.sci_Map$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Map$)))
});
ScalaJS.as.sci_Map$ = (function(obj) {
  return ((ScalaJS.is.sci_Map$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Map$"))
});
ScalaJS.isArrayOf.sci_Map$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Map$)))
});
ScalaJS.asArrayOf.sci_Map$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Map$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Map$;", depth))
});
ScalaJS.d.sci_Map$ = new ScalaJS.ClassTypeData({
  sci_Map$: 0
}, false, "scala.collection.immutable.Map$", ScalaJS.d.scg_ImmutableMapFactory, {
  sci_Map$: 1,
  scg_ImmutableMapFactory: 1,
  scg_MapFactory: 1,
  scg_GenMapFactory: 1,
  O: 1
});
ScalaJS.c.sci_Map$.prototype.$classData = ScalaJS.d.sci_Map$;
ScalaJS.n.sci_Map = (void 0);
ScalaJS.m.sci_Map = (function() {
  if ((!ScalaJS.n.sci_Map)) {
    ScalaJS.n.sci_Map = new ScalaJS.c.sci_Map$().init___()
  };
  return ScalaJS.n.sci_Map
});
/** @constructor */
ScalaJS.c.sci_Range = (function() {
  ScalaJS.c.sc_AbstractSeq.call(this);
  this.start$4 = 0;
  this.end$4 = 0;
  this.step$4 = 0;
  this.isEmpty$4 = false;
  this.numRangeElements$4 = 0;
  this.lastElement$4 = 0;
  this.terminalElement$4 = 0
});
ScalaJS.c.sci_Range.prototype = new ScalaJS.h.sc_AbstractSeq();
ScalaJS.c.sci_Range.prototype.constructor = ScalaJS.c.sci_Range;
/** @constructor */
ScalaJS.h.sci_Range = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Range.prototype = ScalaJS.c.sci_Range.prototype;
ScalaJS.c.sci_Range.prototype.seq__sc_TraversableOnce = (function() {
  return this
});
ScalaJS.c.sci_Range.prototype.isInclusive__Z = (function() {
  return false
});
ScalaJS.c.sci_Range.prototype.apply__I__O = (function(idx) {
  return this.apply$mcII$sp__I__I(idx)
});
ScalaJS.c.sci_Range.prototype.apply__O__O = (function(v1) {
  var idx = ScalaJS.uI(v1);
  return this.apply$mcII$sp__I__I(idx)
});
ScalaJS.c.sci_Range.prototype.isEmpty__Z = (function() {
  return this.isEmpty$4
});
ScalaJS.c.sci_Range.prototype.thisCollection__sc_Traversable = (function() {
  return ScalaJS.i.sc_IndexedSeqLike$class__thisCollection__sc_IndexedSeqLike__sc_IndexedSeq(this)
});
ScalaJS.c.sci_Range.prototype.longLength__p4__J = (function() {
  return this.gap__p4__J().$$div__sjsr_RuntimeLong__sjsr_RuntimeLong(ScalaJS.m.sjsr_RuntimeLong().fromInt__I__sjsr_RuntimeLong(this.step$4)).$$plus__sjsr_RuntimeLong__sjsr_RuntimeLong(ScalaJS.m.sjsr_RuntimeLong().fromInt__I__sjsr_RuntimeLong((this.hasStub__p4__Z() ? 1 : 0)))
});
ScalaJS.c.sci_Range.prototype.equals__O__Z = (function(other) {
  if (ScalaJS.is.sci_Range(other)) {
    var x2 = ScalaJS.as.sci_Range(other);
    return ((this.length__I() === x2.length__I()) && (this.isEmpty$4 || ((this.start$4 === x2.start$4) && (this.last__I() === x2.last__I()))))
  } else {
    return ScalaJS.i.sc_GenSeqLike$class__equals__sc_GenSeqLike__O__Z(this, other)
  }
});
ScalaJS.c.sci_Range.prototype.locationAfterN__p4__I__I = (function(n) {
  return ((this.start$4 + ScalaJS.imul(this.step$4, n)) | 0)
});
ScalaJS.c.sci_Range.prototype.apply$mcII$sp__I__I = (function(idx) {
  this.scala$collection$immutable$Range$$validateMaxLength__V();
  if (((idx < 0) || (idx >= this.numRangeElements$4))) {
    throw new ScalaJS.c.jl_IndexOutOfBoundsException().init___T(ScalaJS.objectToString(idx))
  } else {
    return ((this.start$4 + ScalaJS.imul(this.step$4, idx)) | 0)
  }
});
ScalaJS.c.sci_Range.prototype.init___I__I__I = (function(start, end, step) {
  this.start$4 = start;
  this.end$4 = end;
  this.step$4 = step;
  this.isEmpty$4 = ((((start > end) && (step > 0)) || ((start < end) && (step < 0))) || ((start === end) && (!this.isInclusive__Z())));
  if ((step === 0)) {
    var jsx$1;
    throw new ScalaJS.c.jl_IllegalArgumentException().init___T("step cannot be 0.")
  } else if (this.isEmpty$4) {
    var jsx$1 = 0
  } else {
    var len = this.longLength__p4__J();
    var jsx$1 = (len.$$greater__sjsr_RuntimeLong__Z(ScalaJS.m.sjsr_RuntimeLong().fromInt__I__sjsr_RuntimeLong(2147483647)) ? -1 : len.toInt__I())
  };
  this.numRangeElements$4 = jsx$1;
  this.lastElement$4 = ((start + ScalaJS.imul(((this.numRangeElements$4 - 1) | 0), step)) | 0);
  this.terminalElement$4 = ((start + ScalaJS.imul(this.numRangeElements$4, step)) | 0);
  return this
});
ScalaJS.c.sci_Range.prototype.toString__T = (function() {
  var endStr = ((this.numRangeElements$4 > ScalaJS.m.sci_Range().MAX$undPRINT$1) ? ", ... )" : ")");
  var this$1 = this.take__I__sci_Range(ScalaJS.m.sci_Range().MAX$undPRINT$1);
  return ScalaJS.i.sc_TraversableOnce$class__mkString__sc_TraversableOnce__T__T__T__T(this$1, "Range(", ", ", endStr)
});
ScalaJS.c.sci_Range.prototype.companion__scg_GenericCompanion = (function() {
  return ScalaJS.m.sci_IndexedSeq()
});
ScalaJS.c.sci_Range.prototype.foreach__F1__V = (function(f) {
  if (this.validateRangeBoundaries__F1__Z(f)) {
    var i = this.start$4;
    var terminal = this.terminalElement$4;
    var step = this.step$4;
    while ((i !== terminal)) {
      f.apply__O__O(i);
      i = ((i + step) | 0)
    }
  }
});
ScalaJS.c.sci_Range.prototype.hasStub__p4__Z = (function() {
  return (this.isInclusive__Z() || (!this.isExact__p4__Z()))
});
ScalaJS.c.sci_Range.prototype.toBuffer__scm_Buffer = (function() {
  return ScalaJS.i.sc_IndexedSeqLike$class__toBuffer__sc_IndexedSeqLike__scm_Buffer(this)
});
ScalaJS.c.sci_Range.prototype.size__I = (function() {
  return this.length__I()
});
ScalaJS.c.sci_Range.prototype.iterator__sc_Iterator = (function() {
  return new ScalaJS.c.sc_IndexedSeqLike$Elements().init___sc_IndexedSeqLike__I__I(this, 0, this.length__I())
});
ScalaJS.c.sci_Range.prototype.scala$collection$immutable$Range$$validateMaxLength__V = (function() {
  if ((this.numRangeElements$4 < 0)) {
    this.fail__p4__sr_Nothing$()
  }
});
ScalaJS.c.sci_Range.prototype.seq__sc_Seq = (function() {
  return this
});
ScalaJS.c.sci_Range.prototype.length__I = (function() {
  return ((this.numRangeElements$4 < 0) ? this.fail__p4__sr_Nothing$() : this.numRangeElements$4)
});
ScalaJS.c.sci_Range.prototype.isExact__p4__Z = (function() {
  return this.gap__p4__J().$$percent__sjsr_RuntimeLong__sjsr_RuntimeLong(ScalaJS.m.sjsr_RuntimeLong().fromInt__I__sjsr_RuntimeLong(this.step$4)).equals__O__Z(ScalaJS.m.sjsr_RuntimeLong().fromInt__I__sjsr_RuntimeLong(0))
});
ScalaJS.c.sci_Range.prototype.description__p4__T = (function() {
  var this$2 = new ScalaJS.c.sci_StringOps().init___T("%d %s %d by %s");
  var args = ScalaJS.m.s_Predef().genericWrapArray__O__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.O.getArrayOf(), [this.start$4, (this.isInclusive__Z() ? "to" : "until"), this.end$4, this.step$4]));
  return ScalaJS.i.sci_StringLike$class__format__sci_StringLike__sc_Seq__T(this$2, args)
});
ScalaJS.c.sci_Range.prototype.validateRangeBoundaries__F1__Z = (function(f) {
  this.scala$collection$immutable$Range$$validateMaxLength__V();
  if (((this.start$4 !== -2147483648) || (this.end$4 !== -2147483648))) {
    return true
  } else {
    var count = 0;
    var num = this.start$4;
    while ((count < this.numRangeElements$4)) {
      f.apply__O__O(num);
      count = ((count + 1) | 0);
      num = ((num + this.step$4) | 0)
    };
    return false
  }
});
ScalaJS.c.sci_Range.prototype.take__I__sci_Range = (function(n) {
  if (((n <= 0) || this.isEmpty$4)) {
    var value = this.start$4;
    return new ScalaJS.c.sci_Range().init___I__I__I(value, value, this.step$4)
  } else {
    return ((n >= this.numRangeElements$4) ? this : new ScalaJS.c.sci_Range$Inclusive().init___I__I__I(this.start$4, this.locationAfterN__p4__I__I(((n - 1) | 0)), this.step$4))
  }
});
ScalaJS.c.sci_Range.prototype.last__I = (function() {
  if (this.isEmpty$4) {
    var this$1 = ScalaJS.m.sci_Nil();
    return ScalaJS.uI(ScalaJS.i.sc_LinearSeqOptimized$class__last__sc_LinearSeqOptimized__O(this$1))
  } else {
    return this.lastElement$4
  }
});
ScalaJS.c.sci_Range.prototype.hashCode__I = (function() {
  return ScalaJS.m.s_util_hashing_MurmurHash3().seqHash__sc_Seq__I(this)
});
ScalaJS.c.sci_Range.prototype.fail__p4__sr_Nothing$ = (function() {
  throw new ScalaJS.c.jl_IllegalArgumentException().init___T((this.description__p4__T() + ": seqs cannot contain more than Int.MaxValue elements."))
});
ScalaJS.c.sci_Range.prototype.gap__p4__J = (function() {
  var this$1 = ScalaJS.m.sjsr_RuntimeLong().fromInt__I__sjsr_RuntimeLong(this.end$4);
  var y = ScalaJS.m.sjsr_RuntimeLong().fromInt__I__sjsr_RuntimeLong(this.start$4);
  return this$1.$$plus__sjsr_RuntimeLong__sjsr_RuntimeLong(y.unary$und$minus__sjsr_RuntimeLong())
});
ScalaJS.is.sci_Range = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Range)))
});
ScalaJS.as.sci_Range = (function(obj) {
  return ((ScalaJS.is.sci_Range(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Range"))
});
ScalaJS.isArrayOf.sci_Range = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Range)))
});
ScalaJS.asArrayOf.sci_Range = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Range(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Range;", depth))
});
ScalaJS.d.sci_Range = new ScalaJS.ClassTypeData({
  sci_Range: 0
}, false, "scala.collection.immutable.Range", ScalaJS.d.sc_AbstractSeq, {
  sci_Range: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sc_CustomParallelizable: 1,
  sci_IndexedSeq: 1,
  sc_IndexedSeq: 1,
  sc_IndexedSeqLike: 1,
  sci_Seq: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_Range.prototype.$classData = ScalaJS.d.sci_Range;
/** @constructor */
ScalaJS.c.sci_Set$EmptySet$ = (function() {
  ScalaJS.c.sc_AbstractSet.call(this)
});
ScalaJS.c.sci_Set$EmptySet$.prototype = new ScalaJS.h.sc_AbstractSet();
ScalaJS.c.sci_Set$EmptySet$.prototype.constructor = ScalaJS.c.sci_Set$EmptySet$;
/** @constructor */
ScalaJS.h.sci_Set$EmptySet$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Set$EmptySet$.prototype = ScalaJS.c.sci_Set$EmptySet$.prototype;
ScalaJS.c.sci_Set$EmptySet$.prototype.seq__sc_TraversableOnce = (function() {
  return this
});
ScalaJS.c.sci_Set$EmptySet$.prototype.init___ = (function() {
  ScalaJS.n.sci_Set$EmptySet = this;
  return this
});
ScalaJS.c.sci_Set$EmptySet$.prototype.apply__O__O = (function(v1) {
  return false
});
ScalaJS.c.sci_Set$EmptySet$.prototype.thisCollection__sc_Traversable = (function() {
  return ScalaJS.i.sc_IterableLike$class__thisCollection__sc_IterableLike__sc_Iterable(this)
});
ScalaJS.c.sci_Set$EmptySet$.prototype.companion__scg_GenericCompanion = (function() {
  return ScalaJS.m.sci_Set()
});
ScalaJS.c.sci_Set$EmptySet$.prototype.foreach__F1__V = (function(f) {
  /*<skip>*/
});
ScalaJS.c.sci_Set$EmptySet$.prototype.size__I = (function() {
  return 0
});
ScalaJS.c.sci_Set$EmptySet$.prototype.iterator__sc_Iterator = (function() {
  return ScalaJS.m.sc_Iterator().empty$1
});
ScalaJS.c.sci_Set$EmptySet$.prototype.empty__sc_Set = (function() {
  return ScalaJS.as.sc_Set(ScalaJS.i.scg_GenericSetTemplate$class__empty__scg_GenericSetTemplate__sc_GenSet(this))
});
ScalaJS.c.sci_Set$EmptySet$.prototype.seq__sc_Set = (function() {
  return this
});
ScalaJS.c.sci_Set$EmptySet$.prototype.$$plus__O__sc_Set = (function(elem) {
  return new ScalaJS.c.sci_Set$Set1().init___O(elem)
});
ScalaJS.is.sci_Set$EmptySet$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Set$EmptySet$)))
});
ScalaJS.as.sci_Set$EmptySet$ = (function(obj) {
  return ((ScalaJS.is.sci_Set$EmptySet$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Set$EmptySet$"))
});
ScalaJS.isArrayOf.sci_Set$EmptySet$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Set$EmptySet$)))
});
ScalaJS.asArrayOf.sci_Set$EmptySet$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Set$EmptySet$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Set$EmptySet$;", depth))
});
ScalaJS.d.sci_Set$EmptySet$ = new ScalaJS.ClassTypeData({
  sci_Set$EmptySet$: 0
}, false, "scala.collection.immutable.Set$EmptySet$", ScalaJS.d.sc_AbstractSet, {
  sci_Set$EmptySet$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sci_Set: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSet: 1,
  sc_Set: 1,
  sc_SetLike: 1,
  scg_Subtractable: 1,
  sc_GenSet: 1,
  scg_GenericSetTemplate: 1,
  sc_GenSetLike: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_Set$EmptySet$.prototype.$classData = ScalaJS.d.sci_Set$EmptySet$;
ScalaJS.n.sci_Set$EmptySet = (void 0);
ScalaJS.m.sci_Set$EmptySet = (function() {
  if ((!ScalaJS.n.sci_Set$EmptySet)) {
    ScalaJS.n.sci_Set$EmptySet = new ScalaJS.c.sci_Set$EmptySet$().init___()
  };
  return ScalaJS.n.sci_Set$EmptySet
});
/** @constructor */
ScalaJS.c.sci_Set$Set1 = (function() {
  ScalaJS.c.sc_AbstractSet.call(this);
  this.elem1$4 = null
});
ScalaJS.c.sci_Set$Set1.prototype = new ScalaJS.h.sc_AbstractSet();
ScalaJS.c.sci_Set$Set1.prototype.constructor = ScalaJS.c.sci_Set$Set1;
/** @constructor */
ScalaJS.h.sci_Set$Set1 = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Set$Set1.prototype = ScalaJS.c.sci_Set$Set1.prototype;
ScalaJS.c.sci_Set$Set1.prototype.seq__sc_TraversableOnce = (function() {
  return this
});
ScalaJS.c.sci_Set$Set1.prototype.apply__O__O = (function(v1) {
  return this.contains__O__Z(v1)
});
ScalaJS.c.sci_Set$Set1.prototype.thisCollection__sc_Traversable = (function() {
  return ScalaJS.i.sc_IterableLike$class__thisCollection__sc_IterableLike__sc_Iterable(this)
});
ScalaJS.c.sci_Set$Set1.prototype.companion__scg_GenericCompanion = (function() {
  return ScalaJS.m.sci_Set()
});
ScalaJS.c.sci_Set$Set1.prototype.foreach__F1__V = (function(f) {
  f.apply__O__O(this.elem1$4)
});
ScalaJS.c.sci_Set$Set1.prototype.size__I = (function() {
  return 1
});
ScalaJS.c.sci_Set$Set1.prototype.init___O = (function(elem1) {
  this.elem1$4 = elem1;
  return this
});
ScalaJS.c.sci_Set$Set1.prototype.iterator__sc_Iterator = (function() {
  ScalaJS.m.sc_Iterator();
  var elems = ScalaJS.m.s_Predef().genericWrapArray__O__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.O.getArrayOf(), [this.elem1$4]));
  return new ScalaJS.c.sc_IndexedSeqLike$Elements().init___sc_IndexedSeqLike__I__I(elems, 0, elems.length__I())
});
ScalaJS.c.sci_Set$Set1.prototype.empty__sc_Set = (function() {
  return ScalaJS.as.sc_Set(ScalaJS.i.scg_GenericSetTemplate$class__empty__scg_GenericSetTemplate__sc_GenSet(this))
});
ScalaJS.c.sci_Set$Set1.prototype.$$plus__O__sci_Set = (function(elem) {
  return (this.contains__O__Z(elem) ? this : new ScalaJS.c.sci_Set$Set2().init___O__O(this.elem1$4, elem))
});
ScalaJS.c.sci_Set$Set1.prototype.seq__sc_Set = (function() {
  return this
});
ScalaJS.c.sci_Set$Set1.prototype.contains__O__Z = (function(elem) {
  return ScalaJS.anyEqEq(elem, this.elem1$4)
});
ScalaJS.c.sci_Set$Set1.prototype.$$plus__O__sc_Set = (function(elem) {
  return this.$$plus__O__sci_Set(elem)
});
ScalaJS.is.sci_Set$Set1 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Set$Set1)))
});
ScalaJS.as.sci_Set$Set1 = (function(obj) {
  return ((ScalaJS.is.sci_Set$Set1(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Set$Set1"))
});
ScalaJS.isArrayOf.sci_Set$Set1 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Set$Set1)))
});
ScalaJS.asArrayOf.sci_Set$Set1 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Set$Set1(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Set$Set1;", depth))
});
ScalaJS.d.sci_Set$Set1 = new ScalaJS.ClassTypeData({
  sci_Set$Set1: 0
}, false, "scala.collection.immutable.Set$Set1", ScalaJS.d.sc_AbstractSet, {
  sci_Set$Set1: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sci_Set: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSet: 1,
  sc_Set: 1,
  sc_SetLike: 1,
  scg_Subtractable: 1,
  sc_GenSet: 1,
  scg_GenericSetTemplate: 1,
  sc_GenSetLike: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_Set$Set1.prototype.$classData = ScalaJS.d.sci_Set$Set1;
/** @constructor */
ScalaJS.c.sci_Set$Set2 = (function() {
  ScalaJS.c.sc_AbstractSet.call(this);
  this.elem1$4 = null;
  this.elem2$4 = null
});
ScalaJS.c.sci_Set$Set2.prototype = new ScalaJS.h.sc_AbstractSet();
ScalaJS.c.sci_Set$Set2.prototype.constructor = ScalaJS.c.sci_Set$Set2;
/** @constructor */
ScalaJS.h.sci_Set$Set2 = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Set$Set2.prototype = ScalaJS.c.sci_Set$Set2.prototype;
ScalaJS.c.sci_Set$Set2.prototype.seq__sc_TraversableOnce = (function() {
  return this
});
ScalaJS.c.sci_Set$Set2.prototype.apply__O__O = (function(v1) {
  return this.contains__O__Z(v1)
});
ScalaJS.c.sci_Set$Set2.prototype.thisCollection__sc_Traversable = (function() {
  return ScalaJS.i.sc_IterableLike$class__thisCollection__sc_IterableLike__sc_Iterable(this)
});
ScalaJS.c.sci_Set$Set2.prototype.init___O__O = (function(elem1, elem2) {
  this.elem1$4 = elem1;
  this.elem2$4 = elem2;
  return this
});
ScalaJS.c.sci_Set$Set2.prototype.companion__scg_GenericCompanion = (function() {
  return ScalaJS.m.sci_Set()
});
ScalaJS.c.sci_Set$Set2.prototype.foreach__F1__V = (function(f) {
  f.apply__O__O(this.elem1$4);
  f.apply__O__O(this.elem2$4)
});
ScalaJS.c.sci_Set$Set2.prototype.size__I = (function() {
  return 2
});
ScalaJS.c.sci_Set$Set2.prototype.iterator__sc_Iterator = (function() {
  ScalaJS.m.sc_Iterator();
  var elems = ScalaJS.m.s_Predef().genericWrapArray__O__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.O.getArrayOf(), [this.elem1$4, this.elem2$4]));
  return new ScalaJS.c.sc_IndexedSeqLike$Elements().init___sc_IndexedSeqLike__I__I(elems, 0, elems.length__I())
});
ScalaJS.c.sci_Set$Set2.prototype.empty__sc_Set = (function() {
  return ScalaJS.as.sc_Set(ScalaJS.i.scg_GenericSetTemplate$class__empty__scg_GenericSetTemplate__sc_GenSet(this))
});
ScalaJS.c.sci_Set$Set2.prototype.$$plus__O__sci_Set = (function(elem) {
  return (this.contains__O__Z(elem) ? this : new ScalaJS.c.sci_Set$Set3().init___O__O__O(this.elem1$4, this.elem2$4, elem))
});
ScalaJS.c.sci_Set$Set2.prototype.seq__sc_Set = (function() {
  return this
});
ScalaJS.c.sci_Set$Set2.prototype.contains__O__Z = (function(elem) {
  return (ScalaJS.anyEqEq(elem, this.elem1$4) || ScalaJS.anyEqEq(elem, this.elem2$4))
});
ScalaJS.c.sci_Set$Set2.prototype.$$plus__O__sc_Set = (function(elem) {
  return this.$$plus__O__sci_Set(elem)
});
ScalaJS.is.sci_Set$Set2 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Set$Set2)))
});
ScalaJS.as.sci_Set$Set2 = (function(obj) {
  return ((ScalaJS.is.sci_Set$Set2(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Set$Set2"))
});
ScalaJS.isArrayOf.sci_Set$Set2 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Set$Set2)))
});
ScalaJS.asArrayOf.sci_Set$Set2 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Set$Set2(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Set$Set2;", depth))
});
ScalaJS.d.sci_Set$Set2 = new ScalaJS.ClassTypeData({
  sci_Set$Set2: 0
}, false, "scala.collection.immutable.Set$Set2", ScalaJS.d.sc_AbstractSet, {
  sci_Set$Set2: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sci_Set: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSet: 1,
  sc_Set: 1,
  sc_SetLike: 1,
  scg_Subtractable: 1,
  sc_GenSet: 1,
  scg_GenericSetTemplate: 1,
  sc_GenSetLike: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_Set$Set2.prototype.$classData = ScalaJS.d.sci_Set$Set2;
/** @constructor */
ScalaJS.c.sci_Set$Set3 = (function() {
  ScalaJS.c.sc_AbstractSet.call(this);
  this.elem1$4 = null;
  this.elem2$4 = null;
  this.elem3$4 = null
});
ScalaJS.c.sci_Set$Set3.prototype = new ScalaJS.h.sc_AbstractSet();
ScalaJS.c.sci_Set$Set3.prototype.constructor = ScalaJS.c.sci_Set$Set3;
/** @constructor */
ScalaJS.h.sci_Set$Set3 = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Set$Set3.prototype = ScalaJS.c.sci_Set$Set3.prototype;
ScalaJS.c.sci_Set$Set3.prototype.seq__sc_TraversableOnce = (function() {
  return this
});
ScalaJS.c.sci_Set$Set3.prototype.apply__O__O = (function(v1) {
  return this.contains__O__Z(v1)
});
ScalaJS.c.sci_Set$Set3.prototype.thisCollection__sc_Traversable = (function() {
  return ScalaJS.i.sc_IterableLike$class__thisCollection__sc_IterableLike__sc_Iterable(this)
});
ScalaJS.c.sci_Set$Set3.prototype.companion__scg_GenericCompanion = (function() {
  return ScalaJS.m.sci_Set()
});
ScalaJS.c.sci_Set$Set3.prototype.foreach__F1__V = (function(f) {
  f.apply__O__O(this.elem1$4);
  f.apply__O__O(this.elem2$4);
  f.apply__O__O(this.elem3$4)
});
ScalaJS.c.sci_Set$Set3.prototype.init___O__O__O = (function(elem1, elem2, elem3) {
  this.elem1$4 = elem1;
  this.elem2$4 = elem2;
  this.elem3$4 = elem3;
  return this
});
ScalaJS.c.sci_Set$Set3.prototype.size__I = (function() {
  return 3
});
ScalaJS.c.sci_Set$Set3.prototype.iterator__sc_Iterator = (function() {
  ScalaJS.m.sc_Iterator();
  var elems = ScalaJS.m.s_Predef().genericWrapArray__O__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.O.getArrayOf(), [this.elem1$4, this.elem2$4, this.elem3$4]));
  return new ScalaJS.c.sc_IndexedSeqLike$Elements().init___sc_IndexedSeqLike__I__I(elems, 0, elems.length__I())
});
ScalaJS.c.sci_Set$Set3.prototype.empty__sc_Set = (function() {
  return ScalaJS.as.sc_Set(ScalaJS.i.scg_GenericSetTemplate$class__empty__scg_GenericSetTemplate__sc_GenSet(this))
});
ScalaJS.c.sci_Set$Set3.prototype.$$plus__O__sci_Set = (function(elem) {
  return (this.contains__O__Z(elem) ? this : new ScalaJS.c.sci_Set$Set4().init___O__O__O__O(this.elem1$4, this.elem2$4, this.elem3$4, elem))
});
ScalaJS.c.sci_Set$Set3.prototype.seq__sc_Set = (function() {
  return this
});
ScalaJS.c.sci_Set$Set3.prototype.contains__O__Z = (function(elem) {
  return ((ScalaJS.anyEqEq(elem, this.elem1$4) || ScalaJS.anyEqEq(elem, this.elem2$4)) || ScalaJS.anyEqEq(elem, this.elem3$4))
});
ScalaJS.c.sci_Set$Set3.prototype.$$plus__O__sc_Set = (function(elem) {
  return this.$$plus__O__sci_Set(elem)
});
ScalaJS.is.sci_Set$Set3 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Set$Set3)))
});
ScalaJS.as.sci_Set$Set3 = (function(obj) {
  return ((ScalaJS.is.sci_Set$Set3(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Set$Set3"))
});
ScalaJS.isArrayOf.sci_Set$Set3 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Set$Set3)))
});
ScalaJS.asArrayOf.sci_Set$Set3 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Set$Set3(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Set$Set3;", depth))
});
ScalaJS.d.sci_Set$Set3 = new ScalaJS.ClassTypeData({
  sci_Set$Set3: 0
}, false, "scala.collection.immutable.Set$Set3", ScalaJS.d.sc_AbstractSet, {
  sci_Set$Set3: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sci_Set: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSet: 1,
  sc_Set: 1,
  sc_SetLike: 1,
  scg_Subtractable: 1,
  sc_GenSet: 1,
  scg_GenericSetTemplate: 1,
  sc_GenSetLike: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_Set$Set3.prototype.$classData = ScalaJS.d.sci_Set$Set3;
/** @constructor */
ScalaJS.c.sci_Set$Set4 = (function() {
  ScalaJS.c.sc_AbstractSet.call(this);
  this.elem1$4 = null;
  this.elem2$4 = null;
  this.elem3$4 = null;
  this.elem4$4 = null
});
ScalaJS.c.sci_Set$Set4.prototype = new ScalaJS.h.sc_AbstractSet();
ScalaJS.c.sci_Set$Set4.prototype.constructor = ScalaJS.c.sci_Set$Set4;
/** @constructor */
ScalaJS.h.sci_Set$Set4 = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Set$Set4.prototype = ScalaJS.c.sci_Set$Set4.prototype;
ScalaJS.c.sci_Set$Set4.prototype.seq__sc_TraversableOnce = (function() {
  return this
});
ScalaJS.c.sci_Set$Set4.prototype.apply__O__O = (function(v1) {
  return this.contains__O__Z(v1)
});
ScalaJS.c.sci_Set$Set4.prototype.thisCollection__sc_Traversable = (function() {
  return ScalaJS.i.sc_IterableLike$class__thisCollection__sc_IterableLike__sc_Iterable(this)
});
ScalaJS.c.sci_Set$Set4.prototype.companion__scg_GenericCompanion = (function() {
  return ScalaJS.m.sci_Set()
});
ScalaJS.c.sci_Set$Set4.prototype.foreach__F1__V = (function(f) {
  f.apply__O__O(this.elem1$4);
  f.apply__O__O(this.elem2$4);
  f.apply__O__O(this.elem3$4);
  f.apply__O__O(this.elem4$4)
});
ScalaJS.c.sci_Set$Set4.prototype.size__I = (function() {
  return 4
});
ScalaJS.c.sci_Set$Set4.prototype.iterator__sc_Iterator = (function() {
  ScalaJS.m.sc_Iterator();
  var elems = ScalaJS.m.s_Predef().genericWrapArray__O__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.O.getArrayOf(), [this.elem1$4, this.elem2$4, this.elem3$4, this.elem4$4]));
  return new ScalaJS.c.sc_IndexedSeqLike$Elements().init___sc_IndexedSeqLike__I__I(elems, 0, elems.length__I())
});
ScalaJS.c.sci_Set$Set4.prototype.empty__sc_Set = (function() {
  return ScalaJS.as.sc_Set(ScalaJS.i.scg_GenericSetTemplate$class__empty__scg_GenericSetTemplate__sc_GenSet(this))
});
ScalaJS.c.sci_Set$Set4.prototype.$$plus__O__sci_Set = (function(elem) {
  return (this.contains__O__Z(elem) ? this : new ScalaJS.c.sci_HashSet().init___().$$plus__O__O__sc_Seq__sci_HashSet(this.elem1$4, this.elem2$4, ScalaJS.m.s_Predef().genericWrapArray__O__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.O.getArrayOf(), [this.elem3$4, this.elem4$4, elem]))))
});
ScalaJS.c.sci_Set$Set4.prototype.seq__sc_Set = (function() {
  return this
});
ScalaJS.c.sci_Set$Set4.prototype.contains__O__Z = (function(elem) {
  return (((ScalaJS.anyEqEq(elem, this.elem1$4) || ScalaJS.anyEqEq(elem, this.elem2$4)) || ScalaJS.anyEqEq(elem, this.elem3$4)) || ScalaJS.anyEqEq(elem, this.elem4$4))
});
ScalaJS.c.sci_Set$Set4.prototype.init___O__O__O__O = (function(elem1, elem2, elem3, elem4) {
  this.elem1$4 = elem1;
  this.elem2$4 = elem2;
  this.elem3$4 = elem3;
  this.elem4$4 = elem4;
  return this
});
ScalaJS.c.sci_Set$Set4.prototype.$$plus__O__sc_Set = (function(elem) {
  return this.$$plus__O__sci_Set(elem)
});
ScalaJS.is.sci_Set$Set4 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Set$Set4)))
});
ScalaJS.as.sci_Set$Set4 = (function(obj) {
  return ((ScalaJS.is.sci_Set$Set4(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Set$Set4"))
});
ScalaJS.isArrayOf.sci_Set$Set4 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Set$Set4)))
});
ScalaJS.asArrayOf.sci_Set$Set4 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Set$Set4(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Set$Set4;", depth))
});
ScalaJS.d.sci_Set$Set4 = new ScalaJS.ClassTypeData({
  sci_Set$Set4: 0
}, false, "scala.collection.immutable.Set$Set4", ScalaJS.d.sc_AbstractSet, {
  sci_Set$Set4: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sci_Set: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSet: 1,
  sc_Set: 1,
  sc_SetLike: 1,
  scg_Subtractable: 1,
  sc_GenSet: 1,
  scg_GenericSetTemplate: 1,
  sc_GenSetLike: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_Set$Set4.prototype.$classData = ScalaJS.d.sci_Set$Set4;
/** @constructor */
ScalaJS.c.sci_Stream = (function() {
  ScalaJS.c.sc_AbstractSeq.call(this)
});
ScalaJS.c.sci_Stream.prototype = new ScalaJS.h.sc_AbstractSeq();
ScalaJS.c.sci_Stream.prototype.constructor = ScalaJS.c.sci_Stream;
/** @constructor */
ScalaJS.h.sci_Stream = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Stream.prototype = ScalaJS.c.sci_Stream.prototype;
ScalaJS.c.sci_Stream.prototype.seq__sc_TraversableOnce = (function() {
  return this
});
ScalaJS.c.sci_Stream.prototype.init___ = (function() {
  return this
});
ScalaJS.c.sci_Stream.prototype.lengthCompare__I__I = (function(len) {
  return ScalaJS.i.sc_LinearSeqOptimized$class__lengthCompare__sc_LinearSeqOptimized__I__I(this, len)
});
ScalaJS.c.sci_Stream.prototype.apply__O__O = (function(v1) {
  var n = ScalaJS.uI(v1);
  return ScalaJS.i.sc_LinearSeqOptimized$class__apply__sc_LinearSeqOptimized__I__O(this, n)
});
ScalaJS.c.sci_Stream.prototype.sameElements__sc_GenIterable__Z = (function(that) {
  return ScalaJS.i.sc_LinearSeqOptimized$class__sameElements__sc_LinearSeqOptimized__sc_GenIterable__Z(this, that)
});
ScalaJS.c.sci_Stream.prototype.thisCollection__sc_Traversable = (function() {
  return ScalaJS.i.sc_LinearSeqLike$class__thisCollection__sc_LinearSeqLike__sc_LinearSeq(this)
});
ScalaJS.c.sci_Stream.prototype.flatMap__F1__scg_CanBuildFrom__O = (function(f, bf) {
  if (ScalaJS.is.sci_Stream$StreamBuilder(bf.apply__O__scm_Builder(this))) {
    if (this.isEmpty__Z()) {
      var x$1 = ScalaJS.m.sci_Stream$Empty()
    } else {
      var nonEmptyPrefix = new ScalaJS.c.sr_ObjectRef().init___O(this);
      var prefix = ScalaJS.as.sc_GenTraversableOnce(f.apply__O__O(ScalaJS.as.sci_Stream(nonEmptyPrefix.elem$1).head__O())).toStream__sci_Stream();
      while (((!ScalaJS.as.sci_Stream(nonEmptyPrefix.elem$1).isEmpty__Z()) && prefix.isEmpty__Z())) {
        nonEmptyPrefix.elem$1 = ScalaJS.as.sci_Stream(ScalaJS.as.sci_Stream(nonEmptyPrefix.elem$1).tail__O());
        if ((!ScalaJS.as.sci_Stream(nonEmptyPrefix.elem$1).isEmpty__Z())) {
          prefix = ScalaJS.as.sc_GenTraversableOnce(f.apply__O__O(ScalaJS.as.sci_Stream(nonEmptyPrefix.elem$1).head__O())).toStream__sci_Stream()
        }
      };
      var x$1 = (ScalaJS.as.sci_Stream(nonEmptyPrefix.elem$1).isEmpty__Z() ? ScalaJS.m.sci_Stream$Empty() : prefix.append__F0__sci_Stream(new ScalaJS.c.sjsr_AnonFunction0().init___sjs_js_Function0((function(arg$outer, f$2, nonEmptyPrefix$1) {
        return (function() {
          var x = ScalaJS.as.sci_Stream(ScalaJS.as.sci_Stream(nonEmptyPrefix$1.elem$1).tail__O()).flatMap__F1__scg_CanBuildFrom__O(f$2, new ScalaJS.c.sci_Stream$StreamCanBuildFrom().init___());
          return ScalaJS.as.sci_Stream(x)
        })
      })(this, f, nonEmptyPrefix))))
    };
    return x$1
  } else {
    return ScalaJS.i.sc_TraversableLike$class__flatMap__sc_TraversableLike__F1__scg_CanBuildFrom__O(this, f, bf)
  }
});
ScalaJS.c.sci_Stream.prototype.drop__I__sc_LinearSeqOptimized = (function(n) {
  return this.drop__I__sci_Stream(n)
});
ScalaJS.c.sci_Stream.prototype.mkString__T__T__T__T = (function(start, sep, end) {
  return (this.force__sci_Stream(), ScalaJS.i.sc_TraversableOnce$class__mkString__sc_TraversableOnce__T__T__T__T(this, start, sep, end))
});
ScalaJS.c.sci_Stream.prototype.loop$3__p4__T__sci_Stream__scm_StringBuilder__T__T__V = (function(pre, these, b$1, sep$2, end$1) {
  tailCallLoop: while (true) {
    if (these.isEmpty__Z()) {
      b$1.append__T__scm_StringBuilder(end$1)
    } else {
      b$1.append__T__scm_StringBuilder(pre).append__O__scm_StringBuilder(these.head__O());
      if (these.tailDefined__Z()) {
        var temp$these = ScalaJS.as.sci_Stream(these.tail__O());
        pre = sep$2;
        these = temp$these;
        continue tailCallLoop
      } else {
        b$1.append__T__scm_StringBuilder(sep$2).append__T__scm_StringBuilder("?").append__T__scm_StringBuilder(end$1)
      }
    };
    return (void 0)
  }
});
ScalaJS.c.sci_Stream.prototype.companion__scg_GenericCompanion = (function() {
  return ScalaJS.m.sci_Stream()
});
ScalaJS.c.sci_Stream.prototype.toString__T = (function() {
  return ScalaJS.i.sc_TraversableOnce$class__mkString__sc_TraversableOnce__T__T__T__T(this, ("Stream" + "("), ", ", ")")
});
ScalaJS.c.sci_Stream.prototype.foreach__F1__V = (function(f) {
  var _$this = this;
  tailCallLoop: while (true) {
    if ((!_$this.isEmpty__Z())) {
      f.apply__O__O(_$this.head__O());
      _$this = ScalaJS.as.sci_Stream(_$this.tail__O());
      continue tailCallLoop
    };
    return (void 0)
  }
});
ScalaJS.c.sci_Stream.prototype.foldLeft__O__F2__O = (function(z, op) {
  var _$this = this;
  tailCallLoop: while (true) {
    if (_$this.isEmpty__Z()) {
      return z
    } else {
      var temp$_$this = ScalaJS.as.sci_Stream(_$this.tail__O());
      var temp$z = op.apply__O__O__O(z, _$this.head__O());
      _$this = temp$_$this;
      z = temp$z;
      continue tailCallLoop
    }
  }
});
ScalaJS.c.sci_Stream.prototype.iterator__sc_Iterator = (function() {
  return new ScalaJS.c.sci_StreamIterator().init___sci_Stream(this)
});
ScalaJS.c.sci_Stream.prototype.seq__sc_Seq = (function() {
  return this
});
ScalaJS.c.sci_Stream.prototype.length__I = (function() {
  var len = 0;
  var left = this;
  while ((!left.isEmpty__Z())) {
    len = ((len + 1) | 0);
    left = ScalaJS.as.sci_Stream(left.tail__O())
  };
  return len
});
ScalaJS.c.sci_Stream.prototype.toStream__sci_Stream = (function() {
  return this
});
ScalaJS.c.sci_Stream.prototype.drop__I__sci_Stream = (function(n) {
  var _$this = this;
  tailCallLoop: while (true) {
    if (((n <= 0) || _$this.isEmpty__Z())) {
      return _$this
    } else {
      var temp$_$this = ScalaJS.as.sci_Stream(_$this.tail__O());
      var temp$n = ((n - 1) | 0);
      _$this = temp$_$this;
      n = temp$n;
      continue tailCallLoop
    }
  }
});
ScalaJS.c.sci_Stream.prototype.addString__scm_StringBuilder__T__T__T__scm_StringBuilder = (function(b, start, sep, end) {
  return (b.append__T__scm_StringBuilder(start), this.loop$3__p4__T__sci_Stream__scm_StringBuilder__T__T__V("", this, b, sep, end), b)
});
ScalaJS.c.sci_Stream.prototype.force__sci_Stream = (function() {
  var these = this;
  while ((!these.isEmpty__Z())) {
    these = ScalaJS.as.sci_Stream(these.tail__O())
  };
  return this
});
ScalaJS.c.sci_Stream.prototype.hashCode__I = (function() {
  return ScalaJS.m.s_util_hashing_MurmurHash3().seqHash__sc_Seq__I(this)
});
ScalaJS.c.sci_Stream.prototype.map__F1__scg_CanBuildFrom__O = (function(f, bf) {
  if (ScalaJS.is.sci_Stream$StreamBuilder(bf.apply__O__scm_Builder(this))) {
    if (this.isEmpty__Z()) {
      var x$1 = ScalaJS.m.sci_Stream$Empty()
    } else {
      var hd = f.apply__O__O(this.head__O());
      var tl = new ScalaJS.c.sjsr_AnonFunction0().init___sjs_js_Function0((function(arg$outer, f$1) {
        return (function() {
          var x = ScalaJS.as.sci_Stream(arg$outer.tail__O()).map__F1__scg_CanBuildFrom__O(f$1, new ScalaJS.c.sci_Stream$StreamCanBuildFrom().init___());
          return ScalaJS.as.sci_Stream(x)
        })
      })(this, f));
      var x$1 = new ScalaJS.c.sci_Stream$Cons().init___O__F0(hd, tl)
    };
    return x$1
  } else {
    return ScalaJS.i.sc_TraversableLike$class__map__sc_TraversableLike__F1__scg_CanBuildFrom__O(this, f, bf)
  }
});
ScalaJS.c.sci_Stream.prototype.append__F0__sci_Stream = (function(rest) {
  if (this.isEmpty__Z()) {
    return ScalaJS.as.sc_GenTraversableOnce(rest.apply__O()).toStream__sci_Stream()
  } else {
    var hd = this.head__O();
    var tl = new ScalaJS.c.sjsr_AnonFunction0().init___sjs_js_Function0((function(arg$outer, rest$1) {
      return (function() {
        return ScalaJS.as.sci_Stream(arg$outer.tail__O()).append__F0__sci_Stream(rest$1)
      })
    })(this, rest));
    return new ScalaJS.c.sci_Stream$Cons().init___O__F0(hd, tl)
  }
});
ScalaJS.c.sci_Stream.prototype.stringPrefix__T = (function() {
  return "Stream"
});
ScalaJS.is.sci_Stream = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Stream)))
});
ScalaJS.as.sci_Stream = (function(obj) {
  return ((ScalaJS.is.sci_Stream(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Stream"))
});
ScalaJS.isArrayOf.sci_Stream = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Stream)))
});
ScalaJS.asArrayOf.sci_Stream = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Stream(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Stream;", depth))
});
ScalaJS.d.sci_Stream = new ScalaJS.ClassTypeData({
  sci_Stream: 0
}, false, "scala.collection.immutable.Stream", ScalaJS.d.sc_AbstractSeq, {
  sci_Stream: 1,
  sc_LinearSeqOptimized: 1,
  sci_LinearSeq: 1,
  sc_LinearSeq: 1,
  sc_LinearSeqLike: 1,
  sci_Seq: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_Stream.prototype.$classData = ScalaJS.d.sci_Stream;
/** @constructor */
ScalaJS.c.sci_Vector = (function() {
  ScalaJS.c.sc_AbstractSeq.call(this);
  this.startIndex$4 = 0;
  this.endIndex$4 = 0;
  this.focus$4 = 0;
  this.dirty$4 = false;
  this.depth$4 = 0;
  this.display0$4 = null;
  this.display1$4 = null;
  this.display2$4 = null;
  this.display3$4 = null;
  this.display4$4 = null;
  this.display5$4 = null
});
ScalaJS.c.sci_Vector.prototype = new ScalaJS.h.sc_AbstractSeq();
ScalaJS.c.sci_Vector.prototype.constructor = ScalaJS.c.sci_Vector;
/** @constructor */
ScalaJS.h.sci_Vector = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Vector.prototype = ScalaJS.c.sci_Vector.prototype;
ScalaJS.c.sci_Vector.prototype.checkRangeConvert__p4__I__I = (function(index) {
  var idx = ((index + this.startIndex$4) | 0);
  if (((0 <= index) && (idx < this.endIndex$4))) {
    return idx
  } else {
    throw new ScalaJS.c.jl_IndexOutOfBoundsException().init___T(ScalaJS.objectToString(index))
  }
});
ScalaJS.c.sci_Vector.prototype.seq__sc_TraversableOnce = (function() {
  return this
});
ScalaJS.c.sci_Vector.prototype.display3__AO = (function() {
  return this.display3$4
});
ScalaJS.c.sci_Vector.prototype.apply__I__O = (function(index) {
  var idx = this.checkRangeConvert__p4__I__I(index);
  var xor = (idx ^ this.focus$4);
  return ScalaJS.i.sci_VectorPointer$class__getElem__sci_VectorPointer__I__I__O(this, idx, xor)
});
ScalaJS.c.sci_Vector.prototype.lengthCompare__I__I = (function(len) {
  return ((this.length__I() - len) | 0)
});
ScalaJS.c.sci_Vector.prototype.depth__I = (function() {
  return this.depth$4
});
ScalaJS.c.sci_Vector.prototype.apply__O__O = (function(v1) {
  return this.apply__I__O(ScalaJS.uI(v1))
});
ScalaJS.c.sci_Vector.prototype.initIterator__sci_VectorIterator__V = (function(s) {
  var depth = this.depth$4;
  ScalaJS.i.sci_VectorPointer$class__initFrom__sci_VectorPointer__sci_VectorPointer__I__V(s, this, depth);
  if (this.dirty$4) {
    var index = this.focus$4;
    ScalaJS.i.sci_VectorPointer$class__stabilize__sci_VectorPointer__I__V(s, index)
  };
  if ((s.depth$2 > 1)) {
    var index$1 = this.startIndex$4;
    var xor = (this.startIndex$4 ^ this.focus$4);
    ScalaJS.i.sci_VectorPointer$class__gotoPos__sci_VectorPointer__I__I__V(s, index$1, xor)
  }
});
ScalaJS.c.sci_Vector.prototype.thisCollection__sc_Traversable = (function() {
  return ScalaJS.i.sc_IndexedSeqLike$class__thisCollection__sc_IndexedSeqLike__sc_IndexedSeq(this)
});
ScalaJS.c.sci_Vector.prototype.init___I__I__I = (function(startIndex, endIndex, focus) {
  this.startIndex$4 = startIndex;
  this.endIndex$4 = endIndex;
  this.focus$4 = focus;
  this.dirty$4 = false;
  return this
});
ScalaJS.c.sci_Vector.prototype.display5$und$eq__AO__V = (function(x$1) {
  this.display5$4 = x$1
});
ScalaJS.c.sci_Vector.prototype.companion__scg_GenericCompanion = (function() {
  return ScalaJS.m.sci_Vector()
});
ScalaJS.c.sci_Vector.prototype.display0__AO = (function() {
  return this.display0$4
});
ScalaJS.c.sci_Vector.prototype.display4__AO = (function() {
  return this.display4$4
});
ScalaJS.c.sci_Vector.prototype.display2$und$eq__AO__V = (function(x$1) {
  this.display2$4 = x$1
});
ScalaJS.c.sci_Vector.prototype.toBuffer__scm_Buffer = (function() {
  return ScalaJS.i.sc_IndexedSeqLike$class__toBuffer__sc_IndexedSeqLike__scm_Buffer(this)
});
ScalaJS.c.sci_Vector.prototype.iterator__sc_Iterator = (function() {
  return this.iterator__sci_VectorIterator()
});
ScalaJS.c.sci_Vector.prototype.display1$und$eq__AO__V = (function(x$1) {
  this.display1$4 = x$1
});
ScalaJS.c.sci_Vector.prototype.seq__sc_Seq = (function() {
  return this
});
ScalaJS.c.sci_Vector.prototype.length__I = (function() {
  return ((this.endIndex$4 - this.startIndex$4) | 0)
});
ScalaJS.c.sci_Vector.prototype.display4$und$eq__AO__V = (function(x$1) {
  this.display4$4 = x$1
});
ScalaJS.c.sci_Vector.prototype.display1__AO = (function() {
  return this.display1$4
});
ScalaJS.c.sci_Vector.prototype.display5__AO = (function() {
  return this.display5$4
});
ScalaJS.c.sci_Vector.prototype.iterator__sci_VectorIterator = (function() {
  var s = new ScalaJS.c.sci_VectorIterator().init___I__I(this.startIndex$4, this.endIndex$4);
  this.initIterator__sci_VectorIterator__V(s);
  return s
});
ScalaJS.c.sci_Vector.prototype.hashCode__I = (function() {
  return ScalaJS.m.s_util_hashing_MurmurHash3().seqHash__sc_Seq__I(this)
});
ScalaJS.c.sci_Vector.prototype.depth$und$eq__I__V = (function(x$1) {
  this.depth$4 = x$1
});
ScalaJS.c.sci_Vector.prototype.display2__AO = (function() {
  return this.display2$4
});
ScalaJS.c.sci_Vector.prototype.display0$und$eq__AO__V = (function(x$1) {
  this.display0$4 = x$1
});
ScalaJS.c.sci_Vector.prototype.display3$und$eq__AO__V = (function(x$1) {
  this.display3$4 = x$1
});
ScalaJS.is.sci_Vector = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Vector)))
});
ScalaJS.as.sci_Vector = (function(obj) {
  return ((ScalaJS.is.sci_Vector(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Vector"))
});
ScalaJS.isArrayOf.sci_Vector = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Vector)))
});
ScalaJS.asArrayOf.sci_Vector = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Vector(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Vector;", depth))
});
ScalaJS.d.sci_Vector = new ScalaJS.ClassTypeData({
  sci_Vector: 0
}, false, "scala.collection.immutable.Vector", ScalaJS.d.sc_AbstractSeq, {
  sci_Vector: 1,
  sc_CustomParallelizable: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sci_VectorPointer: 1,
  sci_IndexedSeq: 1,
  sc_IndexedSeq: 1,
  sc_IndexedSeqLike: 1,
  sci_Seq: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_Vector.prototype.$classData = ScalaJS.d.sci_Vector;
/** @constructor */
ScalaJS.c.sci_WrappedString = (function() {
  ScalaJS.c.sc_AbstractSeq.call(this);
  this.self$4 = null
});
ScalaJS.c.sci_WrappedString.prototype = new ScalaJS.h.sc_AbstractSeq();
ScalaJS.c.sci_WrappedString.prototype.constructor = ScalaJS.c.sci_WrappedString;
/** @constructor */
ScalaJS.h.sci_WrappedString = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_WrappedString.prototype = ScalaJS.c.sci_WrappedString.prototype;
ScalaJS.c.sci_WrappedString.prototype.seq__sc_TraversableOnce = (function() {
  return this
});
ScalaJS.c.sci_WrappedString.prototype.apply__I__O = (function(idx) {
  return ScalaJS.bC(ScalaJS.i.sci_StringLike$class__apply__sci_StringLike__I__C(this, idx))
});
ScalaJS.c.sci_WrappedString.prototype.lengthCompare__I__I = (function(len) {
  return ScalaJS.i.sc_IndexedSeqOptimized$class__lengthCompare__sc_IndexedSeqOptimized__I__I(this, len)
});
ScalaJS.c.sci_WrappedString.prototype.sameElements__sc_GenIterable__Z = (function(that) {
  return ScalaJS.i.sc_IndexedSeqOptimized$class__sameElements__sc_IndexedSeqOptimized__sc_GenIterable__Z(this, that)
});
ScalaJS.c.sci_WrappedString.prototype.apply__O__O = (function(v1) {
  var n = ScalaJS.uI(v1);
  return ScalaJS.bC(ScalaJS.i.sci_StringLike$class__apply__sci_StringLike__I__C(this, n))
});
ScalaJS.c.sci_WrappedString.prototype.isEmpty__Z = (function() {
  return ScalaJS.i.sc_IndexedSeqOptimized$class__isEmpty__sc_IndexedSeqOptimized__Z(this)
});
ScalaJS.c.sci_WrappedString.prototype.thisCollection__sc_Traversable = (function() {
  return this
});
ScalaJS.c.sci_WrappedString.prototype.companion__scg_GenericCompanion = (function() {
  return ScalaJS.m.sci_IndexedSeq()
});
ScalaJS.c.sci_WrappedString.prototype.toString__T = (function() {
  return this.self$4
});
ScalaJS.c.sci_WrappedString.prototype.foreach__F1__V = (function(f) {
  var i = 0;
  var len = this.length__I();
  while ((i < len)) {
    var idx = i;
    f.apply__O__O(ScalaJS.bC(ScalaJS.i.sci_StringLike$class__apply__sci_StringLike__I__C(this, idx)));
    i = ((i + 1) | 0)
  }
});
ScalaJS.c.sci_WrappedString.prototype.foldLeft__O__F2__O = (function(z, op) {
  var start = 0;
  var end = this.length__I();
  var z$1 = z;
  tailCallLoop: while (true) {
    if ((start === end)) {
      return z$1
    } else {
      var temp$start = ((start + 1) | 0);
      var jsx$1 = z$1;
      var idx = start;
      var temp$z = op.apply__O__O__O(jsx$1, ScalaJS.bC(ScalaJS.i.sci_StringLike$class__apply__sci_StringLike__I__C(this, idx)));
      start = temp$start;
      z$1 = temp$z;
      continue tailCallLoop
    }
  }
});
ScalaJS.c.sci_WrappedString.prototype.toBuffer__scm_Buffer = (function() {
  return ScalaJS.i.sc_IndexedSeqLike$class__toBuffer__sc_IndexedSeqLike__scm_Buffer(this)
});
ScalaJS.c.sci_WrappedString.prototype.iterator__sc_Iterator = (function() {
  return new ScalaJS.c.sc_IndexedSeqLike$Elements().init___sc_IndexedSeqLike__I__I(this, 0, this.length__I())
});
ScalaJS.c.sci_WrappedString.prototype.length__I = (function() {
  return ScalaJS.i.sjsr_RuntimeString$class__length__sjsr_RuntimeString__I(this.self$4)
});
ScalaJS.c.sci_WrappedString.prototype.seq__sc_Seq = (function() {
  return this
});
ScalaJS.c.sci_WrappedString.prototype.hashCode__I = (function() {
  return ScalaJS.m.s_util_hashing_MurmurHash3().seqHash__sc_Seq__I(this)
});
ScalaJS.c.sci_WrappedString.prototype.copyToArray__O__I__I__V = (function(xs, start, len) {
  ScalaJS.i.sc_IndexedSeqOptimized$class__copyToArray__sc_IndexedSeqOptimized__O__I__I__V(this, xs, start, len)
});
ScalaJS.c.sci_WrappedString.prototype.init___T = (function(self) {
  this.self$4 = self;
  return this
});
ScalaJS.c.sci_WrappedString.prototype.toArray__s_reflect_ClassTag__O = (function(evidence$1) {
  return ScalaJS.i.sci_StringLike$class__toArray__sci_StringLike__s_reflect_ClassTag__O(this, evidence$1)
});
ScalaJS.c.sci_WrappedString.prototype.newBuilder__scm_Builder = (function() {
  return ScalaJS.m.sci_WrappedString().newBuilder__scm_Builder()
});
ScalaJS.is.sci_WrappedString = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_WrappedString)))
});
ScalaJS.as.sci_WrappedString = (function(obj) {
  return ((ScalaJS.is.sci_WrappedString(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.WrappedString"))
});
ScalaJS.isArrayOf.sci_WrappedString = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_WrappedString)))
});
ScalaJS.asArrayOf.sci_WrappedString = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_WrappedString(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.WrappedString;", depth))
});
ScalaJS.d.sci_WrappedString = new ScalaJS.ClassTypeData({
  sci_WrappedString: 0
}, false, "scala.collection.immutable.WrappedString", ScalaJS.d.sc_AbstractSeq, {
  sci_WrappedString: 1,
  sci_StringLike: 1,
  s_math_Ordered: 1,
  jl_Comparable: 1,
  sc_IndexedSeqOptimized: 1,
  sci_IndexedSeq: 1,
  sc_IndexedSeq: 1,
  sc_IndexedSeqLike: 1,
  sci_Seq: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_WrappedString.prototype.$classData = ScalaJS.d.sci_WrappedString;
/** @constructor */
ScalaJS.c.scm_AbstractSeq = (function() {
  ScalaJS.c.sc_AbstractSeq.call(this)
});
ScalaJS.c.scm_AbstractSeq.prototype = new ScalaJS.h.sc_AbstractSeq();
ScalaJS.c.scm_AbstractSeq.prototype.constructor = ScalaJS.c.scm_AbstractSeq;
/** @constructor */
ScalaJS.h.scm_AbstractSeq = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_AbstractSeq.prototype = ScalaJS.c.scm_AbstractSeq.prototype;
ScalaJS.c.scm_AbstractSeq.prototype.seq__sc_TraversableOnce = (function() {
  return this.seq__scm_Seq()
});
ScalaJS.c.scm_AbstractSeq.prototype.seq__scm_Seq = (function() {
  return this
});
ScalaJS.is.scm_AbstractSeq = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_AbstractSeq)))
});
ScalaJS.as.scm_AbstractSeq = (function(obj) {
  return ((ScalaJS.is.scm_AbstractSeq(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.AbstractSeq"))
});
ScalaJS.isArrayOf.scm_AbstractSeq = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_AbstractSeq)))
});
ScalaJS.asArrayOf.scm_AbstractSeq = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_AbstractSeq(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.AbstractSeq;", depth))
});
ScalaJS.d.scm_AbstractSeq = new ScalaJS.ClassTypeData({
  scm_AbstractSeq: 0
}, false, "scala.collection.mutable.AbstractSeq", ScalaJS.d.sc_AbstractSeq, {
  scm_AbstractSeq: 1,
  scm_Seq: 1,
  scm_SeqLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  scm_Iterable: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.scm_AbstractSeq.prototype.$classData = ScalaJS.d.scm_AbstractSeq;
/** @constructor */
ScalaJS.c.scm_AbstractSet = (function() {
  ScalaJS.c.scm_AbstractIterable.call(this)
});
ScalaJS.c.scm_AbstractSet.prototype = new ScalaJS.h.scm_AbstractIterable();
ScalaJS.c.scm_AbstractSet.prototype.constructor = ScalaJS.c.scm_AbstractSet;
/** @constructor */
ScalaJS.h.scm_AbstractSet = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_AbstractSet.prototype = ScalaJS.c.scm_AbstractSet.prototype;
ScalaJS.c.scm_AbstractSet.prototype.isEmpty__Z = (function() {
  return ScalaJS.i.sc_SetLike$class__isEmpty__sc_SetLike__Z(this)
});
ScalaJS.c.scm_AbstractSet.prototype.equals__O__Z = (function(that) {
  return ScalaJS.i.sc_GenSetLike$class__equals__sc_GenSetLike__O__Z(this, that)
});
ScalaJS.c.scm_AbstractSet.prototype.toString__T = (function() {
  return ScalaJS.i.sc_TraversableLike$class__toString__sc_TraversableLike__T(this)
});
ScalaJS.c.scm_AbstractSet.prototype.toBuffer__scm_Buffer = (function() {
  return ScalaJS.i.sc_SetLike$class__toBuffer__sc_SetLike__scm_Buffer(this)
});
ScalaJS.c.scm_AbstractSet.prototype.sizeHintBounded__I__sc_TraversableLike__V = (function(size, boundingColl) {
  ScalaJS.i.scm_Builder$class__sizeHintBounded__scm_Builder__I__sc_TraversableLike__V(this, size, boundingColl)
});
ScalaJS.c.scm_AbstractSet.prototype.hashCode__I = (function() {
  var this$1 = ScalaJS.m.s_util_hashing_MurmurHash3();
  return this$1.unorderedHash__sc_TraversableOnce__I__I(this, this$1.setSeed$2)
});
ScalaJS.c.scm_AbstractSet.prototype.sizeHint__I__V = (function(size) {
  /*<skip>*/
});
ScalaJS.c.scm_AbstractSet.prototype.newBuilder__scm_Builder = (function() {
  return ScalaJS.i.scm_SetLike$class__newBuilder__scm_SetLike__scm_Builder(this)
});
ScalaJS.c.scm_AbstractSet.prototype.$$plus$plus$eq__sc_TraversableOnce__scg_Growable = (function(xs) {
  return ScalaJS.i.scg_Growable$class__$plus$plus$eq__scg_Growable__sc_TraversableOnce__scg_Growable(this, xs)
});
ScalaJS.c.scm_AbstractSet.prototype.stringPrefix__T = (function() {
  return "Set"
});
ScalaJS.is.scm_AbstractSet = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_AbstractSet)))
});
ScalaJS.as.scm_AbstractSet = (function(obj) {
  return ((ScalaJS.is.scm_AbstractSet(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.AbstractSet"))
});
ScalaJS.isArrayOf.scm_AbstractSet = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_AbstractSet)))
});
ScalaJS.asArrayOf.scm_AbstractSet = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_AbstractSet(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.AbstractSet;", depth))
});
ScalaJS.d.scm_AbstractSet = new ScalaJS.ClassTypeData({
  scm_AbstractSet: 0
}, false, "scala.collection.mutable.AbstractSet", ScalaJS.d.scm_AbstractIterable, {
  scm_AbstractSet: 1,
  scm_Set: 1,
  scm_SetLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  scg_Shrinkable: 1,
  scm_Builder: 1,
  scg_Growable: 1,
  scg_Clearable: 1,
  sc_script_Scriptable: 1,
  sc_Set: 1,
  sc_SetLike: 1,
  scg_Subtractable: 1,
  sc_GenSet: 1,
  scg_GenericSetTemplate: 1,
  sc_GenSetLike: 1,
  F1: 1,
  scm_AbstractIterable: 1,
  scm_Iterable: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.scm_AbstractSet.prototype.$classData = ScalaJS.d.scm_AbstractSet;
/** @constructor */
ScalaJS.c.sjs_js_JavaScriptException = (function() {
  ScalaJS.c.jl_RuntimeException.call(this);
  this.exception$4 = null
});
ScalaJS.c.sjs_js_JavaScriptException.prototype = new ScalaJS.h.jl_RuntimeException();
ScalaJS.c.sjs_js_JavaScriptException.prototype.constructor = ScalaJS.c.sjs_js_JavaScriptException;
/** @constructor */
ScalaJS.h.sjs_js_JavaScriptException = (function() {
  /*<skip>*/
});
ScalaJS.h.sjs_js_JavaScriptException.prototype = ScalaJS.c.sjs_js_JavaScriptException.prototype;
ScalaJS.c.sjs_js_JavaScriptException.prototype.productPrefix__T = (function() {
  return "JavaScriptException"
});
ScalaJS.c.sjs_js_JavaScriptException.prototype.productArity__I = (function() {
  return 1
});
ScalaJS.c.sjs_js_JavaScriptException.prototype.fillInStackTrace__jl_Throwable = (function() {
  return (ScalaJS.m.sjsr_StackTrace().captureState__jl_Throwable__sjs_js_Any__V(this, this.exception$4), this)
});
ScalaJS.c.sjs_js_JavaScriptException.prototype.equals__O__Z = (function(x$1) {
  if ((this === x$1)) {
    return true
  } else if (ScalaJS.is.sjs_js_JavaScriptException(x$1)) {
    var JavaScriptException$1 = ScalaJS.as.sjs_js_JavaScriptException(x$1);
    return ((this.exception$4 === JavaScriptException$1.exception$4) && JavaScriptException$1.canEqual__O__Z(this))
  } else {
    return false
  }
});
ScalaJS.c.sjs_js_JavaScriptException.prototype.productElement__I__O = (function(x$1) {
  switch (x$1) {
    case 0:
      {
        return this.exception$4;
        break
      };
    default:
      throw new ScalaJS.c.jl_IndexOutOfBoundsException().init___T(ScalaJS.objectToString(x$1));
  }
});
ScalaJS.c.sjs_js_JavaScriptException.prototype.toString__T = (function() {
  return ScalaJS.objectToString(this.exception$4)
});
ScalaJS.c.sjs_js_JavaScriptException.prototype.canEqual__O__Z = (function(x$1) {
  return ScalaJS.is.sjs_js_JavaScriptException(x$1)
});
ScalaJS.c.sjs_js_JavaScriptException.prototype.init___sjs_js_Any = (function(exception) {
  this.exception$4 = exception;
  ScalaJS.c.jl_RuntimeException.prototype.init___.call(this);
  return this
});
ScalaJS.c.sjs_js_JavaScriptException.prototype.hashCode__I = (function() {
  var this$2 = ScalaJS.m.s_util_hashing_MurmurHash3();
  return this$2.productHash__s_Product__I__I(this, -889275714)
});
ScalaJS.c.sjs_js_JavaScriptException.prototype.productIterator__sc_Iterator = (function() {
  return new ScalaJS.c.sr_ScalaRunTime$$anon$1().init___s_Product(this)
});
ScalaJS.is.sjs_js_JavaScriptException = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sjs_js_JavaScriptException)))
});
ScalaJS.as.sjs_js_JavaScriptException = (function(obj) {
  return ((ScalaJS.is.sjs_js_JavaScriptException(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.scalajs.js.JavaScriptException"))
});
ScalaJS.isArrayOf.sjs_js_JavaScriptException = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sjs_js_JavaScriptException)))
});
ScalaJS.asArrayOf.sjs_js_JavaScriptException = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sjs_js_JavaScriptException(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.scalajs.js.JavaScriptException;", depth))
});
ScalaJS.d.sjs_js_JavaScriptException = new ScalaJS.ClassTypeData({
  sjs_js_JavaScriptException: 0
}, false, "scala.scalajs.js.JavaScriptException", ScalaJS.d.jl_RuntimeException, {
  sjs_js_JavaScriptException: 1,
  s_Serializable: 1,
  s_Product: 1,
  s_Equals: 1,
  jl_RuntimeException: 1,
  jl_Exception: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.sjs_js_JavaScriptException.prototype.$classData = ScalaJS.d.sjs_js_JavaScriptException;
/** @constructor */
ScalaJS.c.jl_NumberFormatException = (function() {
  ScalaJS.c.jl_IllegalArgumentException.call(this)
});
ScalaJS.c.jl_NumberFormatException.prototype = new ScalaJS.h.jl_IllegalArgumentException();
ScalaJS.c.jl_NumberFormatException.prototype.constructor = ScalaJS.c.jl_NumberFormatException;
/** @constructor */
ScalaJS.h.jl_NumberFormatException = (function() {
  /*<skip>*/
});
ScalaJS.h.jl_NumberFormatException.prototype = ScalaJS.c.jl_NumberFormatException.prototype;
ScalaJS.is.jl_NumberFormatException = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.jl_NumberFormatException)))
});
ScalaJS.as.jl_NumberFormatException = (function(obj) {
  return ((ScalaJS.is.jl_NumberFormatException(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.lang.NumberFormatException"))
});
ScalaJS.isArrayOf.jl_NumberFormatException = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.jl_NumberFormatException)))
});
ScalaJS.asArrayOf.jl_NumberFormatException = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.jl_NumberFormatException(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.lang.NumberFormatException;", depth))
});
ScalaJS.d.jl_NumberFormatException = new ScalaJS.ClassTypeData({
  jl_NumberFormatException: 0
}, false, "java.lang.NumberFormatException", ScalaJS.d.jl_IllegalArgumentException, {
  jl_NumberFormatException: 1,
  jl_IllegalArgumentException: 1,
  jl_RuntimeException: 1,
  jl_Exception: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.jl_NumberFormatException.prototype.$classData = ScalaJS.d.jl_NumberFormatException;
/** @constructor */
ScalaJS.c.ju_FormatterClosedException = (function() {
  ScalaJS.c.jl_IllegalStateException.call(this)
});
ScalaJS.c.ju_FormatterClosedException.prototype = new ScalaJS.h.jl_IllegalStateException();
ScalaJS.c.ju_FormatterClosedException.prototype.constructor = ScalaJS.c.ju_FormatterClosedException;
/** @constructor */
ScalaJS.h.ju_FormatterClosedException = (function() {
  /*<skip>*/
});
ScalaJS.h.ju_FormatterClosedException.prototype = ScalaJS.c.ju_FormatterClosedException.prototype;
ScalaJS.is.ju_FormatterClosedException = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.ju_FormatterClosedException)))
});
ScalaJS.as.ju_FormatterClosedException = (function(obj) {
  return ((ScalaJS.is.ju_FormatterClosedException(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.util.FormatterClosedException"))
});
ScalaJS.isArrayOf.ju_FormatterClosedException = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.ju_FormatterClosedException)))
});
ScalaJS.asArrayOf.ju_FormatterClosedException = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.ju_FormatterClosedException(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.util.FormatterClosedException;", depth))
});
ScalaJS.d.ju_FormatterClosedException = new ScalaJS.ClassTypeData({
  ju_FormatterClosedException: 0
}, false, "java.util.FormatterClosedException", ScalaJS.d.jl_IllegalStateException, {
  ju_FormatterClosedException: 1,
  jl_IllegalStateException: 1,
  jl_RuntimeException: 1,
  jl_Exception: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.ju_FormatterClosedException.prototype.$classData = ScalaJS.d.ju_FormatterClosedException;
/** @constructor */
ScalaJS.c.ju_IllegalFormatException = (function() {
  ScalaJS.c.jl_IllegalArgumentException.call(this)
});
ScalaJS.c.ju_IllegalFormatException.prototype = new ScalaJS.h.jl_IllegalArgumentException();
ScalaJS.c.ju_IllegalFormatException.prototype.constructor = ScalaJS.c.ju_IllegalFormatException;
/** @constructor */
ScalaJS.h.ju_IllegalFormatException = (function() {
  /*<skip>*/
});
ScalaJS.h.ju_IllegalFormatException.prototype = ScalaJS.c.ju_IllegalFormatException.prototype;
ScalaJS.is.ju_IllegalFormatException = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.ju_IllegalFormatException)))
});
ScalaJS.as.ju_IllegalFormatException = (function(obj) {
  return ((ScalaJS.is.ju_IllegalFormatException(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.util.IllegalFormatException"))
});
ScalaJS.isArrayOf.ju_IllegalFormatException = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.ju_IllegalFormatException)))
});
ScalaJS.asArrayOf.ju_IllegalFormatException = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.ju_IllegalFormatException(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.util.IllegalFormatException;", depth))
});
ScalaJS.d.ju_IllegalFormatException = new ScalaJS.ClassTypeData({
  ju_IllegalFormatException: 0
}, false, "java.util.IllegalFormatException", ScalaJS.d.jl_IllegalArgumentException, {
  ju_IllegalFormatException: 1,
  jl_IllegalArgumentException: 1,
  jl_RuntimeException: 1,
  jl_Exception: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.ju_IllegalFormatException.prototype.$classData = ScalaJS.d.ju_IllegalFormatException;
/** @constructor */
ScalaJS.c.s_StringContext$InvalidEscapeException = (function() {
  ScalaJS.c.jl_IllegalArgumentException.call(this)
});
ScalaJS.c.s_StringContext$InvalidEscapeException.prototype = new ScalaJS.h.jl_IllegalArgumentException();
ScalaJS.c.s_StringContext$InvalidEscapeException.prototype.constructor = ScalaJS.c.s_StringContext$InvalidEscapeException;
/** @constructor */
ScalaJS.h.s_StringContext$InvalidEscapeException = (function() {
  /*<skip>*/
});
ScalaJS.h.s_StringContext$InvalidEscapeException.prototype = ScalaJS.c.s_StringContext$InvalidEscapeException.prototype;
ScalaJS.c.s_StringContext$InvalidEscapeException.prototype.init___T__I = (function(str, idx) {
  return (ScalaJS.c.jl_IllegalArgumentException.prototype.init___T.call(this, (((("invalid escape character at index " + idx) + " in \"") + str) + "\"")), this)
});
ScalaJS.is.s_StringContext$InvalidEscapeException = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_StringContext$InvalidEscapeException)))
});
ScalaJS.as.s_StringContext$InvalidEscapeException = (function(obj) {
  return ((ScalaJS.is.s_StringContext$InvalidEscapeException(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.StringContext$InvalidEscapeException"))
});
ScalaJS.isArrayOf.s_StringContext$InvalidEscapeException = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_StringContext$InvalidEscapeException)))
});
ScalaJS.asArrayOf.s_StringContext$InvalidEscapeException = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_StringContext$InvalidEscapeException(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.StringContext$InvalidEscapeException;", depth))
});
ScalaJS.d.s_StringContext$InvalidEscapeException = new ScalaJS.ClassTypeData({
  s_StringContext$InvalidEscapeException: 0
}, false, "scala.StringContext$InvalidEscapeException", ScalaJS.d.jl_IllegalArgumentException, {
  s_StringContext$InvalidEscapeException: 1,
  jl_IllegalArgumentException: 1,
  jl_RuntimeException: 1,
  jl_Exception: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.s_StringContext$InvalidEscapeException.prototype.$classData = ScalaJS.d.s_StringContext$InvalidEscapeException;
ScalaJS.is.s_xml_Node = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_xml_Node)))
});
ScalaJS.as.s_xml_Node = (function(obj) {
  return ((ScalaJS.is.s_xml_Node(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.xml.Node"))
});
ScalaJS.isArrayOf.s_xml_Node = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_xml_Node)))
});
ScalaJS.asArrayOf.s_xml_Node = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_xml_Node(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.xml.Node;", depth))
});
ScalaJS.d.s_xml_Node = new ScalaJS.ClassTypeData({
  s_xml_Node: 0
}, false, "scala.xml.Node", ScalaJS.d.s_xml_NodeSeq, {
  s_xml_Node: 1,
  s_xml_NodeSeq: 1,
  s_xml_Equality: 1,
  sci_Seq: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
/** @constructor */
ScalaJS.c.sc_IndexedSeq$ = (function() {
  ScalaJS.c.scg_SeqFactory.call(this);
  this.ReusableCBF$5 = null;
  this.bitmap$0$5 = false
});
ScalaJS.c.sc_IndexedSeq$.prototype = new ScalaJS.h.scg_SeqFactory();
ScalaJS.c.sc_IndexedSeq$.prototype.constructor = ScalaJS.c.sc_IndexedSeq$;
/** @constructor */
ScalaJS.h.sc_IndexedSeq$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sc_IndexedSeq$.prototype = ScalaJS.c.sc_IndexedSeq$.prototype;
ScalaJS.c.sc_IndexedSeq$.prototype.newBuilder__scm_Builder = (function() {
  return (ScalaJS.m.sci_Vector(), new ScalaJS.c.sci_VectorBuilder().init___())
});
ScalaJS.is.sc_IndexedSeq$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_IndexedSeq$)))
});
ScalaJS.as.sc_IndexedSeq$ = (function(obj) {
  return ((ScalaJS.is.sc_IndexedSeq$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.IndexedSeq$"))
});
ScalaJS.isArrayOf.sc_IndexedSeq$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_IndexedSeq$)))
});
ScalaJS.asArrayOf.sc_IndexedSeq$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_IndexedSeq$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.IndexedSeq$;", depth))
});
ScalaJS.d.sc_IndexedSeq$ = new ScalaJS.ClassTypeData({
  sc_IndexedSeq$: 0
}, false, "scala.collection.IndexedSeq$", ScalaJS.d.scg_SeqFactory, {
  sc_IndexedSeq$: 1,
  scg_SeqFactory: 1,
  scg_TraversableFactory: 1,
  scg_GenericSeqCompanion: 1,
  scg_GenSeqFactory: 1,
  scg_GenTraversableFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.sc_IndexedSeq$.prototype.$classData = ScalaJS.d.sc_IndexedSeq$;
ScalaJS.n.sc_IndexedSeq = (void 0);
ScalaJS.m.sc_IndexedSeq = (function() {
  if ((!ScalaJS.n.sc_IndexedSeq)) {
    ScalaJS.n.sc_IndexedSeq = new ScalaJS.c.sc_IndexedSeq$().init___()
  };
  return ScalaJS.n.sc_IndexedSeq
});
/** @constructor */
ScalaJS.c.sc_Seq$ = (function() {
  ScalaJS.c.scg_SeqFactory.call(this)
});
ScalaJS.c.sc_Seq$.prototype = new ScalaJS.h.scg_SeqFactory();
ScalaJS.c.sc_Seq$.prototype.constructor = ScalaJS.c.sc_Seq$;
/** @constructor */
ScalaJS.h.sc_Seq$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sc_Seq$.prototype = ScalaJS.c.sc_Seq$.prototype;
ScalaJS.c.sc_Seq$.prototype.newBuilder__scm_Builder = (function() {
  return new ScalaJS.c.scm_ListBuffer().init___()
});
ScalaJS.is.sc_Seq$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sc_Seq$)))
});
ScalaJS.as.sc_Seq$ = (function(obj) {
  return ((ScalaJS.is.sc_Seq$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.Seq$"))
});
ScalaJS.isArrayOf.sc_Seq$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sc_Seq$)))
});
ScalaJS.asArrayOf.sc_Seq$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sc_Seq$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.Seq$;", depth))
});
ScalaJS.d.sc_Seq$ = new ScalaJS.ClassTypeData({
  sc_Seq$: 0
}, false, "scala.collection.Seq$", ScalaJS.d.scg_SeqFactory, {
  sc_Seq$: 1,
  scg_SeqFactory: 1,
  scg_TraversableFactory: 1,
  scg_GenericSeqCompanion: 1,
  scg_GenSeqFactory: 1,
  scg_GenTraversableFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.sc_Seq$.prototype.$classData = ScalaJS.d.sc_Seq$;
ScalaJS.n.sc_Seq = (void 0);
ScalaJS.m.sc_Seq = (function() {
  if ((!ScalaJS.n.sc_Seq)) {
    ScalaJS.n.sc_Seq = new ScalaJS.c.sc_Seq$().init___()
  };
  return ScalaJS.n.sc_Seq
});
/** @constructor */
ScalaJS.c.sci_$colon$colon = (function() {
  ScalaJS.c.sci_List.call(this);
  this.scala$collection$immutable$$colon$colon$$hd$5 = null;
  this.tl$5 = null
});
ScalaJS.c.sci_$colon$colon.prototype = new ScalaJS.h.sci_List();
ScalaJS.c.sci_$colon$colon.prototype.constructor = ScalaJS.c.sci_$colon$colon;
/** @constructor */
ScalaJS.h.sci_$colon$colon = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_$colon$colon.prototype = ScalaJS.c.sci_$colon$colon.prototype;
ScalaJS.c.sci_$colon$colon.prototype.head__O = (function() {
  return this.scala$collection$immutable$$colon$colon$$hd$5
});
ScalaJS.c.sci_$colon$colon.prototype.productPrefix__T = (function() {
  return "::"
});
ScalaJS.c.sci_$colon$colon.prototype.productArity__I = (function() {
  return 2
});
ScalaJS.c.sci_$colon$colon.prototype.isEmpty__Z = (function() {
  return false
});
ScalaJS.c.sci_$colon$colon.prototype.productElement__I__O = (function(x$1) {
  switch (x$1) {
    case 0:
      {
        return this.scala$collection$immutable$$colon$colon$$hd$5;
        break
      };
    case 1:
      {
        return this.tl$5;
        break
      };
    default:
      throw new ScalaJS.c.jl_IndexOutOfBoundsException().init___T(ScalaJS.objectToString(x$1));
  }
});
ScalaJS.c.sci_$colon$colon.prototype.tail__O = (function() {
  return this.tl$5
});
ScalaJS.c.sci_$colon$colon.prototype.init___O__sci_List = (function(hd, tl) {
  this.scala$collection$immutable$$colon$colon$$hd$5 = hd;
  this.tl$5 = tl;
  return this
});
ScalaJS.c.sci_$colon$colon.prototype.productIterator__sc_Iterator = (function() {
  return new ScalaJS.c.sr_ScalaRunTime$$anon$1().init___s_Product(this)
});
ScalaJS.is.sci_$colon$colon = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_$colon$colon)))
});
ScalaJS.as.sci_$colon$colon = (function(obj) {
  return ((ScalaJS.is.sci_$colon$colon(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.$colon$colon"))
});
ScalaJS.isArrayOf.sci_$colon$colon = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_$colon$colon)))
});
ScalaJS.asArrayOf.sci_$colon$colon = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_$colon$colon(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.$colon$colon;", depth))
});
ScalaJS.d.sci_$colon$colon = new ScalaJS.ClassTypeData({
  sci_$colon$colon: 0
}, false, "scala.collection.immutable.$colon$colon", ScalaJS.d.sci_List, {
  sci_$colon$colon: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sci_List: 1,
  sc_LinearSeqOptimized: 1,
  s_Product: 1,
  sci_LinearSeq: 1,
  sc_LinearSeq: 1,
  sc_LinearSeqLike: 1,
  sci_Seq: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_$colon$colon.prototype.$classData = ScalaJS.d.sci_$colon$colon;
/** @constructor */
ScalaJS.c.sci_HashSet$ = (function() {
  ScalaJS.c.scg_ImmutableSetFactory.call(this)
});
ScalaJS.c.sci_HashSet$.prototype = new ScalaJS.h.scg_ImmutableSetFactory();
ScalaJS.c.sci_HashSet$.prototype.constructor = ScalaJS.c.sci_HashSet$;
/** @constructor */
ScalaJS.h.sci_HashSet$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_HashSet$.prototype = ScalaJS.c.sci_HashSet$.prototype;
ScalaJS.c.sci_HashSet$.prototype.scala$collection$immutable$HashSet$$makeHashTrieSet__I__sci_HashSet__I__sci_HashSet__I__sci_HashSet$HashTrieSet = (function(hash0, elem0, hash1, elem1, level) {
  var index0 = (((hash0 >>> level) | 0) & 31);
  var index1 = (((hash1 >>> level) | 0) & 31);
  if ((index0 !== index1)) {
    var bitmap = ((1 << index0) | (1 << index1));
    var elems = ScalaJS.newArrayObject(ScalaJS.d.sci_HashSet.getArrayOf(), [2]);
    if ((index0 < index1)) {
      elems.u[0] = elem0;
      elems.u[1] = elem1
    } else {
      elems.u[0] = elem1;
      elems.u[1] = elem0
    };
    return new ScalaJS.c.sci_HashSet$HashTrieSet().init___I__Asci_HashSet__I(bitmap, elems, ((elem0.size__I() + elem1.size__I()) | 0))
  } else {
    var elems$2 = ScalaJS.newArrayObject(ScalaJS.d.sci_HashSet.getArrayOf(), [1]);
    var bitmap$2 = (1 << index0);
    var child = this.scala$collection$immutable$HashSet$$makeHashTrieSet__I__sci_HashSet__I__sci_HashSet__I__sci_HashSet$HashTrieSet(hash0, elem0, hash1, elem1, ((level + 5) | 0));
    elems$2.u[0] = child;
    return new ScalaJS.c.sci_HashSet$HashTrieSet().init___I__Asci_HashSet__I(bitmap$2, elems$2, child.size0$5)
  }
});
ScalaJS.c.sci_HashSet$.prototype.empty__sc_GenTraversable = (function() {
  return ScalaJS.m.sci_HashSet$EmptyHashSet()
});
ScalaJS.is.sci_HashSet$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_HashSet$)))
});
ScalaJS.as.sci_HashSet$ = (function(obj) {
  return ((ScalaJS.is.sci_HashSet$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.HashSet$"))
});
ScalaJS.isArrayOf.sci_HashSet$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_HashSet$)))
});
ScalaJS.asArrayOf.sci_HashSet$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_HashSet$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.HashSet$;", depth))
});
ScalaJS.d.sci_HashSet$ = new ScalaJS.ClassTypeData({
  sci_HashSet$: 0
}, false, "scala.collection.immutable.HashSet$", ScalaJS.d.scg_ImmutableSetFactory, {
  sci_HashSet$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  scg_ImmutableSetFactory: 1,
  scg_SetFactory: 1,
  scg_GenericSeqCompanion: 1,
  scg_GenSetFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.sci_HashSet$.prototype.$classData = ScalaJS.d.sci_HashSet$;
ScalaJS.n.sci_HashSet = (void 0);
ScalaJS.m.sci_HashSet = (function() {
  if ((!ScalaJS.n.sci_HashSet)) {
    ScalaJS.n.sci_HashSet = new ScalaJS.c.sci_HashSet$().init___()
  };
  return ScalaJS.n.sci_HashSet
});
/** @constructor */
ScalaJS.c.sci_HashSet$EmptyHashSet$ = (function() {
  ScalaJS.c.sci_HashSet.call(this)
});
ScalaJS.c.sci_HashSet$EmptyHashSet$.prototype = new ScalaJS.h.sci_HashSet();
ScalaJS.c.sci_HashSet$EmptyHashSet$.prototype.constructor = ScalaJS.c.sci_HashSet$EmptyHashSet$;
/** @constructor */
ScalaJS.h.sci_HashSet$EmptyHashSet$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_HashSet$EmptyHashSet$.prototype = ScalaJS.c.sci_HashSet$EmptyHashSet$.prototype;
ScalaJS.is.sci_HashSet$EmptyHashSet$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_HashSet$EmptyHashSet$)))
});
ScalaJS.as.sci_HashSet$EmptyHashSet$ = (function(obj) {
  return ((ScalaJS.is.sci_HashSet$EmptyHashSet$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.HashSet$EmptyHashSet$"))
});
ScalaJS.isArrayOf.sci_HashSet$EmptyHashSet$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_HashSet$EmptyHashSet$)))
});
ScalaJS.asArrayOf.sci_HashSet$EmptyHashSet$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_HashSet$EmptyHashSet$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.HashSet$EmptyHashSet$;", depth))
});
ScalaJS.d.sci_HashSet$EmptyHashSet$ = new ScalaJS.ClassTypeData({
  sci_HashSet$EmptyHashSet$: 0
}, false, "scala.collection.immutable.HashSet$EmptyHashSet$", ScalaJS.d.sci_HashSet, {
  sci_HashSet$EmptyHashSet$: 1,
  sci_HashSet: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sc_CustomParallelizable: 1,
  sci_Set: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSet: 1,
  sc_Set: 1,
  sc_SetLike: 1,
  scg_Subtractable: 1,
  sc_GenSet: 1,
  scg_GenericSetTemplate: 1,
  sc_GenSetLike: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_HashSet$EmptyHashSet$.prototype.$classData = ScalaJS.d.sci_HashSet$EmptyHashSet$;
ScalaJS.n.sci_HashSet$EmptyHashSet = (void 0);
ScalaJS.m.sci_HashSet$EmptyHashSet = (function() {
  if ((!ScalaJS.n.sci_HashSet$EmptyHashSet)) {
    ScalaJS.n.sci_HashSet$EmptyHashSet = new ScalaJS.c.sci_HashSet$EmptyHashSet$().init___()
  };
  return ScalaJS.n.sci_HashSet$EmptyHashSet
});
/** @constructor */
ScalaJS.c.sci_HashSet$HashSet1 = (function() {
  ScalaJS.c.sci_HashSet.call(this);
  this.key$5 = null;
  this.hash$5 = 0
});
ScalaJS.c.sci_HashSet$HashSet1.prototype = new ScalaJS.h.sci_HashSet();
ScalaJS.c.sci_HashSet$HashSet1.prototype.constructor = ScalaJS.c.sci_HashSet$HashSet1;
/** @constructor */
ScalaJS.h.sci_HashSet$HashSet1 = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_HashSet$HashSet1.prototype = ScalaJS.c.sci_HashSet$HashSet1.prototype;
ScalaJS.c.sci_HashSet$HashSet1.prototype.updated0__O__I__I__sci_HashSet = (function(key, hash, level) {
  if (((hash === this.hash$5) && ScalaJS.anyEqEq(key, this.key$5))) {
    return this
  } else if ((hash !== this.hash$5)) {
    return ScalaJS.m.sci_HashSet().scala$collection$immutable$HashSet$$makeHashTrieSet__I__sci_HashSet__I__sci_HashSet__I__sci_HashSet$HashTrieSet(this.hash$5, this, hash, new ScalaJS.c.sci_HashSet$HashSet1().init___O__I(key, hash), level)
  } else {
    var this$2 = ScalaJS.m.sci_ListSet$EmptyListSet();
    var elem = this.key$5;
    return new ScalaJS.c.sci_HashSet$HashSetCollision1().init___I__sci_ListSet(hash, new ScalaJS.c.sci_ListSet$Node().init___sci_ListSet__O(this$2, elem).$$plus__O__sci_ListSet(key))
  }
});
ScalaJS.c.sci_HashSet$HashSet1.prototype.init___O__I = (function(key, hash) {
  this.key$5 = key;
  this.hash$5 = hash;
  return this
});
ScalaJS.c.sci_HashSet$HashSet1.prototype.foreach__F1__V = (function(f) {
  f.apply__O__O(this.key$5)
});
ScalaJS.c.sci_HashSet$HashSet1.prototype.iterator__sc_Iterator = (function() {
  ScalaJS.m.sc_Iterator();
  var elems = ScalaJS.m.s_Predef().genericWrapArray__O__scm_WrappedArray(ScalaJS.makeNativeArrayWrapper(ScalaJS.d.O.getArrayOf(), [this.key$5]));
  return new ScalaJS.c.sc_IndexedSeqLike$Elements().init___sc_IndexedSeqLike__I__I(elems, 0, elems.length__I())
});
ScalaJS.c.sci_HashSet$HashSet1.prototype.size__I = (function() {
  return 1
});
ScalaJS.c.sci_HashSet$HashSet1.prototype.get0__O__I__I__Z = (function(key, hash, level) {
  return ((hash === this.hash$5) && ScalaJS.anyEqEq(key, this.key$5))
});
ScalaJS.is.sci_HashSet$HashSet1 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_HashSet$HashSet1)))
});
ScalaJS.as.sci_HashSet$HashSet1 = (function(obj) {
  return ((ScalaJS.is.sci_HashSet$HashSet1(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.HashSet$HashSet1"))
});
ScalaJS.isArrayOf.sci_HashSet$HashSet1 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_HashSet$HashSet1)))
});
ScalaJS.asArrayOf.sci_HashSet$HashSet1 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_HashSet$HashSet1(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.HashSet$HashSet1;", depth))
});
ScalaJS.d.sci_HashSet$HashSet1 = new ScalaJS.ClassTypeData({
  sci_HashSet$HashSet1: 0
}, false, "scala.collection.immutable.HashSet$HashSet1", ScalaJS.d.sci_HashSet, {
  sci_HashSet$HashSet1: 1,
  sci_HashSet: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sc_CustomParallelizable: 1,
  sci_Set: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSet: 1,
  sc_Set: 1,
  sc_SetLike: 1,
  scg_Subtractable: 1,
  sc_GenSet: 1,
  scg_GenericSetTemplate: 1,
  sc_GenSetLike: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_HashSet$HashSet1.prototype.$classData = ScalaJS.d.sci_HashSet$HashSet1;
/** @constructor */
ScalaJS.c.sci_HashSet$HashSetCollision1 = (function() {
  ScalaJS.c.sci_HashSet.call(this);
  this.hash$5 = 0;
  this.ks$5 = null
});
ScalaJS.c.sci_HashSet$HashSetCollision1.prototype = new ScalaJS.h.sci_HashSet();
ScalaJS.c.sci_HashSet$HashSetCollision1.prototype.constructor = ScalaJS.c.sci_HashSet$HashSetCollision1;
/** @constructor */
ScalaJS.h.sci_HashSet$HashSetCollision1 = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_HashSet$HashSetCollision1.prototype = ScalaJS.c.sci_HashSet$HashSetCollision1.prototype;
ScalaJS.c.sci_HashSet$HashSetCollision1.prototype.updated0__O__I__I__sci_HashSet = (function(key, hash, level) {
  return ((hash === this.hash$5) ? new ScalaJS.c.sci_HashSet$HashSetCollision1().init___I__sci_ListSet(hash, this.ks$5.$$plus__O__sci_ListSet(key)) : ScalaJS.m.sci_HashSet().scala$collection$immutable$HashSet$$makeHashTrieSet__I__sci_HashSet__I__sci_HashSet__I__sci_HashSet$HashTrieSet(this.hash$5, this, hash, new ScalaJS.c.sci_HashSet$HashSet1().init___O__I(key, hash), level))
});
ScalaJS.c.sci_HashSet$HashSetCollision1.prototype.foreach__F1__V = (function(f) {
  var this$1 = this.ks$5;
  var this$2 = new ScalaJS.c.sci_ListSet$$anon$1().init___sci_ListSet(this$1);
  ScalaJS.i.sc_Iterator$class__foreach__sc_Iterator__F1__V(this$2, f)
});
ScalaJS.c.sci_HashSet$HashSetCollision1.prototype.iterator__sc_Iterator = (function() {
  var this$1 = this.ks$5;
  return new ScalaJS.c.sci_ListSet$$anon$1().init___sci_ListSet(this$1)
});
ScalaJS.c.sci_HashSet$HashSetCollision1.prototype.size__I = (function() {
  return this.ks$5.size__I()
});
ScalaJS.c.sci_HashSet$HashSetCollision1.prototype.init___I__sci_ListSet = (function(hash, ks) {
  this.hash$5 = hash;
  this.ks$5 = ks;
  return this
});
ScalaJS.c.sci_HashSet$HashSetCollision1.prototype.get0__O__I__I__Z = (function(key, hash, level) {
  return ((hash === this.hash$5) && this.ks$5.contains__O__Z(key))
});
ScalaJS.is.sci_HashSet$HashSetCollision1 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_HashSet$HashSetCollision1)))
});
ScalaJS.as.sci_HashSet$HashSetCollision1 = (function(obj) {
  return ((ScalaJS.is.sci_HashSet$HashSetCollision1(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.HashSet$HashSetCollision1"))
});
ScalaJS.isArrayOf.sci_HashSet$HashSetCollision1 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_HashSet$HashSetCollision1)))
});
ScalaJS.asArrayOf.sci_HashSet$HashSetCollision1 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_HashSet$HashSetCollision1(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.HashSet$HashSetCollision1;", depth))
});
ScalaJS.d.sci_HashSet$HashSetCollision1 = new ScalaJS.ClassTypeData({
  sci_HashSet$HashSetCollision1: 0
}, false, "scala.collection.immutable.HashSet$HashSetCollision1", ScalaJS.d.sci_HashSet, {
  sci_HashSet$HashSetCollision1: 1,
  sci_HashSet: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sc_CustomParallelizable: 1,
  sci_Set: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSet: 1,
  sc_Set: 1,
  sc_SetLike: 1,
  scg_Subtractable: 1,
  sc_GenSet: 1,
  scg_GenericSetTemplate: 1,
  sc_GenSetLike: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_HashSet$HashSetCollision1.prototype.$classData = ScalaJS.d.sci_HashSet$HashSetCollision1;
/** @constructor */
ScalaJS.c.sci_HashSet$HashTrieSet = (function() {
  ScalaJS.c.sci_HashSet.call(this);
  this.bitmap$5 = 0;
  this.elems$5 = null;
  this.size0$5 = 0
});
ScalaJS.c.sci_HashSet$HashTrieSet.prototype = new ScalaJS.h.sci_HashSet();
ScalaJS.c.sci_HashSet$HashTrieSet.prototype.constructor = ScalaJS.c.sci_HashSet$HashTrieSet;
/** @constructor */
ScalaJS.h.sci_HashSet$HashTrieSet = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_HashSet$HashTrieSet.prototype = ScalaJS.c.sci_HashSet$HashTrieSet.prototype;
ScalaJS.c.sci_HashSet$HashTrieSet.prototype.updated0__O__I__I__sci_HashSet = (function(key, hash, level) {
  var index = (((hash >>> level) | 0) & 31);
  var mask = (1 << index);
  var offset = ScalaJS.m.jl_Integer().bitCount__I__I((this.bitmap$5 & ((mask - 1) | 0)));
  if (((this.bitmap$5 & mask) !== 0)) {
    var sub = this.elems$5.u[offset];
    var subNew = sub.updated0__O__I__I__sci_HashSet(key, hash, ((level + 5) | 0));
    if ((sub === subNew)) {
      return this
    } else {
      var elemsNew = ScalaJS.newArrayObject(ScalaJS.d.sci_HashSet.getArrayOf(), [this.elems$5.u["length"]]);
      ScalaJS.m.s_Array().copy__O__I__O__I__I__V(this.elems$5, 0, elemsNew, 0, this.elems$5.u["length"]);
      elemsNew.u[offset] = subNew;
      return new ScalaJS.c.sci_HashSet$HashTrieSet().init___I__Asci_HashSet__I(this.bitmap$5, elemsNew, ((this.size0$5 + ((subNew.size__I() - sub.size__I()) | 0)) | 0))
    }
  } else {
    var elemsNew$2 = ScalaJS.newArrayObject(ScalaJS.d.sci_HashSet.getArrayOf(), [((this.elems$5.u["length"] + 1) | 0)]);
    ScalaJS.m.s_Array().copy__O__I__O__I__I__V(this.elems$5, 0, elemsNew$2, 0, offset);
    elemsNew$2.u[offset] = new ScalaJS.c.sci_HashSet$HashSet1().init___O__I(key, hash);
    ScalaJS.m.s_Array().copy__O__I__O__I__I__V(this.elems$5, offset, elemsNew$2, ((offset + 1) | 0), ((this.elems$5.u["length"] - offset) | 0));
    var bitmapNew = (this.bitmap$5 | mask);
    return new ScalaJS.c.sci_HashSet$HashTrieSet().init___I__Asci_HashSet__I(bitmapNew, elemsNew$2, ((this.size0$5 + 1) | 0))
  }
});
ScalaJS.c.sci_HashSet$HashTrieSet.prototype.foreach__F1__V = (function(f) {
  var i = 0;
  while ((i < this.elems$5.u["length"])) {
    this.elems$5.u[i].foreach__F1__V(f);
    i = ((i + 1) | 0)
  }
});
ScalaJS.c.sci_HashSet$HashTrieSet.prototype.iterator__sc_Iterator = (function() {
  return new ScalaJS.c.sci_HashSet$HashTrieSet$$anon$1().init___sci_HashSet$HashTrieSet(this)
});
ScalaJS.c.sci_HashSet$HashTrieSet.prototype.size__I = (function() {
  return this.size0$5
});
ScalaJS.c.sci_HashSet$HashTrieSet.prototype.init___I__Asci_HashSet__I = (function(bitmap, elems, size0) {
  this.bitmap$5 = bitmap;
  this.elems$5 = elems;
  this.size0$5 = size0;
  ScalaJS.m.s_Predef().assert__Z__V((ScalaJS.m.jl_Integer().bitCount__I__I(bitmap) === elems.u["length"]));
  return this
});
ScalaJS.c.sci_HashSet$HashTrieSet.prototype.get0__O__I__I__Z = (function(key, hash, level) {
  var index = (((hash >>> level) | 0) & 31);
  var mask = (1 << index);
  if ((this.bitmap$5 === -1)) {
    return this.elems$5.u[(index & 31)].get0__O__I__I__Z(key, hash, ((level + 5) | 0))
  } else if (((this.bitmap$5 & mask) !== 0)) {
    var offset = ScalaJS.m.jl_Integer().bitCount__I__I((this.bitmap$5 & ((mask - 1) | 0)));
    return this.elems$5.u[offset].get0__O__I__I__Z(key, hash, ((level + 5) | 0))
  } else {
    return false
  }
});
ScalaJS.is.sci_HashSet$HashTrieSet = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_HashSet$HashTrieSet)))
});
ScalaJS.as.sci_HashSet$HashTrieSet = (function(obj) {
  return ((ScalaJS.is.sci_HashSet$HashTrieSet(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.HashSet$HashTrieSet"))
});
ScalaJS.isArrayOf.sci_HashSet$HashTrieSet = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_HashSet$HashTrieSet)))
});
ScalaJS.asArrayOf.sci_HashSet$HashTrieSet = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_HashSet$HashTrieSet(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.HashSet$HashTrieSet;", depth))
});
ScalaJS.d.sci_HashSet$HashTrieSet = new ScalaJS.ClassTypeData({
  sci_HashSet$HashTrieSet: 0
}, false, "scala.collection.immutable.HashSet$HashTrieSet", ScalaJS.d.sci_HashSet, {
  sci_HashSet$HashTrieSet: 1,
  sci_HashSet: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sc_CustomParallelizable: 1,
  sci_Set: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSet: 1,
  sc_Set: 1,
  sc_SetLike: 1,
  scg_Subtractable: 1,
  sc_GenSet: 1,
  scg_GenericSetTemplate: 1,
  sc_GenSetLike: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_HashSet$HashTrieSet.prototype.$classData = ScalaJS.d.sci_HashSet$HashTrieSet;
/** @constructor */
ScalaJS.c.sci_IndexedSeq$ = (function() {
  ScalaJS.c.scg_SeqFactory.call(this);
  this.ReusableCBF$5 = null;
  this.bitmap$0$5 = false
});
ScalaJS.c.sci_IndexedSeq$.prototype = new ScalaJS.h.scg_SeqFactory();
ScalaJS.c.sci_IndexedSeq$.prototype.constructor = ScalaJS.c.sci_IndexedSeq$;
/** @constructor */
ScalaJS.h.sci_IndexedSeq$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_IndexedSeq$.prototype = ScalaJS.c.sci_IndexedSeq$.prototype;
ScalaJS.c.sci_IndexedSeq$.prototype.newBuilder__scm_Builder = (function() {
  return (ScalaJS.m.sci_Vector(), new ScalaJS.c.sci_VectorBuilder().init___())
});
ScalaJS.is.sci_IndexedSeq$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_IndexedSeq$)))
});
ScalaJS.as.sci_IndexedSeq$ = (function(obj) {
  return ((ScalaJS.is.sci_IndexedSeq$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.IndexedSeq$"))
});
ScalaJS.isArrayOf.sci_IndexedSeq$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_IndexedSeq$)))
});
ScalaJS.asArrayOf.sci_IndexedSeq$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_IndexedSeq$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.IndexedSeq$;", depth))
});
ScalaJS.d.sci_IndexedSeq$ = new ScalaJS.ClassTypeData({
  sci_IndexedSeq$: 0
}, false, "scala.collection.immutable.IndexedSeq$", ScalaJS.d.scg_SeqFactory, {
  sci_IndexedSeq$: 1,
  scg_SeqFactory: 1,
  scg_TraversableFactory: 1,
  scg_GenericSeqCompanion: 1,
  scg_GenSeqFactory: 1,
  scg_GenTraversableFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.sci_IndexedSeq$.prototype.$classData = ScalaJS.d.sci_IndexedSeq$;
ScalaJS.n.sci_IndexedSeq = (void 0);
ScalaJS.m.sci_IndexedSeq = (function() {
  if ((!ScalaJS.n.sci_IndexedSeq)) {
    ScalaJS.n.sci_IndexedSeq = new ScalaJS.c.sci_IndexedSeq$().init___()
  };
  return ScalaJS.n.sci_IndexedSeq
});
/** @constructor */
ScalaJS.c.sci_List$ = (function() {
  ScalaJS.c.scg_SeqFactory.call(this)
});
ScalaJS.c.sci_List$.prototype = new ScalaJS.h.scg_SeqFactory();
ScalaJS.c.sci_List$.prototype.constructor = ScalaJS.c.sci_List$;
/** @constructor */
ScalaJS.h.sci_List$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_List$.prototype = ScalaJS.c.sci_List$.prototype;
ScalaJS.c.sci_List$.prototype.empty__sc_GenTraversable = (function() {
  return ScalaJS.m.sci_Nil()
});
ScalaJS.c.sci_List$.prototype.newBuilder__scm_Builder = (function() {
  return new ScalaJS.c.scm_ListBuffer().init___()
});
ScalaJS.is.sci_List$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_List$)))
});
ScalaJS.as.sci_List$ = (function(obj) {
  return ((ScalaJS.is.sci_List$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.List$"))
});
ScalaJS.isArrayOf.sci_List$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_List$)))
});
ScalaJS.asArrayOf.sci_List$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_List$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.List$;", depth))
});
ScalaJS.d.sci_List$ = new ScalaJS.ClassTypeData({
  sci_List$: 0
}, false, "scala.collection.immutable.List$", ScalaJS.d.scg_SeqFactory, {
  sci_List$: 1,
  scg_SeqFactory: 1,
  scg_TraversableFactory: 1,
  scg_GenericSeqCompanion: 1,
  scg_GenSeqFactory: 1,
  scg_GenTraversableFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.sci_List$.prototype.$classData = ScalaJS.d.sci_List$;
ScalaJS.n.sci_List = (void 0);
ScalaJS.m.sci_List = (function() {
  if ((!ScalaJS.n.sci_List)) {
    ScalaJS.n.sci_List = new ScalaJS.c.sci_List$().init___()
  };
  return ScalaJS.n.sci_List
});
/** @constructor */
ScalaJS.c.sci_ListSet$ = (function() {
  ScalaJS.c.scg_ImmutableSetFactory.call(this)
});
ScalaJS.c.sci_ListSet$.prototype = new ScalaJS.h.scg_ImmutableSetFactory();
ScalaJS.c.sci_ListSet$.prototype.constructor = ScalaJS.c.sci_ListSet$;
/** @constructor */
ScalaJS.h.sci_ListSet$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_ListSet$.prototype = ScalaJS.c.sci_ListSet$.prototype;
ScalaJS.c.sci_ListSet$.prototype.empty__sc_GenTraversable = (function() {
  return ScalaJS.m.sci_ListSet$EmptyListSet()
});
ScalaJS.c.sci_ListSet$.prototype.newBuilder__scm_Builder = (function() {
  return new ScalaJS.c.sci_ListSet$ListSetBuilder().init___()
});
ScalaJS.is.sci_ListSet$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_ListSet$)))
});
ScalaJS.as.sci_ListSet$ = (function(obj) {
  return ((ScalaJS.is.sci_ListSet$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.ListSet$"))
});
ScalaJS.isArrayOf.sci_ListSet$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_ListSet$)))
});
ScalaJS.asArrayOf.sci_ListSet$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_ListSet$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.ListSet$;", depth))
});
ScalaJS.d.sci_ListSet$ = new ScalaJS.ClassTypeData({
  sci_ListSet$: 0
}, false, "scala.collection.immutable.ListSet$", ScalaJS.d.scg_ImmutableSetFactory, {
  sci_ListSet$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  scg_ImmutableSetFactory: 1,
  scg_SetFactory: 1,
  scg_GenericSeqCompanion: 1,
  scg_GenSetFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.sci_ListSet$.prototype.$classData = ScalaJS.d.sci_ListSet$;
ScalaJS.n.sci_ListSet = (void 0);
ScalaJS.m.sci_ListSet = (function() {
  if ((!ScalaJS.n.sci_ListSet)) {
    ScalaJS.n.sci_ListSet = new ScalaJS.c.sci_ListSet$().init___()
  };
  return ScalaJS.n.sci_ListSet
});
/** @constructor */
ScalaJS.c.sci_ListSet$EmptyListSet$ = (function() {
  ScalaJS.c.sci_ListSet.call(this)
});
ScalaJS.c.sci_ListSet$EmptyListSet$.prototype = new ScalaJS.h.sci_ListSet();
ScalaJS.c.sci_ListSet$EmptyListSet$.prototype.constructor = ScalaJS.c.sci_ListSet$EmptyListSet$;
/** @constructor */
ScalaJS.h.sci_ListSet$EmptyListSet$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_ListSet$EmptyListSet$.prototype = ScalaJS.c.sci_ListSet$EmptyListSet$.prototype;
ScalaJS.is.sci_ListSet$EmptyListSet$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_ListSet$EmptyListSet$)))
});
ScalaJS.as.sci_ListSet$EmptyListSet$ = (function(obj) {
  return ((ScalaJS.is.sci_ListSet$EmptyListSet$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.ListSet$EmptyListSet$"))
});
ScalaJS.isArrayOf.sci_ListSet$EmptyListSet$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_ListSet$EmptyListSet$)))
});
ScalaJS.asArrayOf.sci_ListSet$EmptyListSet$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_ListSet$EmptyListSet$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.ListSet$EmptyListSet$;", depth))
});
ScalaJS.d.sci_ListSet$EmptyListSet$ = new ScalaJS.ClassTypeData({
  sci_ListSet$EmptyListSet$: 0
}, false, "scala.collection.immutable.ListSet$EmptyListSet$", ScalaJS.d.sci_ListSet, {
  sci_ListSet$EmptyListSet$: 1,
  sci_ListSet: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sci_Set: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSet: 1,
  sc_Set: 1,
  sc_SetLike: 1,
  scg_Subtractable: 1,
  sc_GenSet: 1,
  scg_GenericSetTemplate: 1,
  sc_GenSetLike: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_ListSet$EmptyListSet$.prototype.$classData = ScalaJS.d.sci_ListSet$EmptyListSet$;
ScalaJS.n.sci_ListSet$EmptyListSet = (void 0);
ScalaJS.m.sci_ListSet$EmptyListSet = (function() {
  if ((!ScalaJS.n.sci_ListSet$EmptyListSet)) {
    ScalaJS.n.sci_ListSet$EmptyListSet = new ScalaJS.c.sci_ListSet$EmptyListSet$().init___()
  };
  return ScalaJS.n.sci_ListSet$EmptyListSet
});
/** @constructor */
ScalaJS.c.sci_ListSet$Node = (function() {
  ScalaJS.c.sci_ListSet.call(this);
  this.head$5 = null;
  this.$$outer$f = null
});
ScalaJS.c.sci_ListSet$Node.prototype = new ScalaJS.h.sci_ListSet();
ScalaJS.c.sci_ListSet$Node.prototype.constructor = ScalaJS.c.sci_ListSet$Node;
/** @constructor */
ScalaJS.h.sci_ListSet$Node = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_ListSet$Node.prototype = ScalaJS.c.sci_ListSet$Node.prototype;
ScalaJS.c.sci_ListSet$Node.prototype.head__O = (function() {
  return this.head$5
});
ScalaJS.c.sci_ListSet$Node.prototype.isEmpty__Z = (function() {
  return false
});
ScalaJS.c.sci_ListSet$Node.prototype.scala$collection$immutable$ListSet$$unchecked$undouter__sci_ListSet = (function() {
  return this.$$outer$f
});
ScalaJS.c.sci_ListSet$Node.prototype.$$plus__O__sci_ListSet = (function(e) {
  return (this.containsInternal__p5__sci_ListSet__O__Z(this, e) ? this : new ScalaJS.c.sci_ListSet$Node().init___sci_ListSet__O(this, e))
});
ScalaJS.c.sci_ListSet$Node.prototype.sizeInternal__p5__sci_ListSet__I__I = (function(n, acc) {
  tailCallLoop: while (true) {
    if (n.isEmpty__Z()) {
      return acc
    } else {
      var temp$n = n.scala$collection$immutable$ListSet$$unchecked$undouter__sci_ListSet();
      var temp$acc = ((acc + 1) | 0);
      n = temp$n;
      acc = temp$acc;
      continue tailCallLoop
    }
  }
});
ScalaJS.c.sci_ListSet$Node.prototype.size__I = (function() {
  return this.sizeInternal__p5__sci_ListSet__I__I(this, 0)
});
ScalaJS.c.sci_ListSet$Node.prototype.init___sci_ListSet__O = (function($$outer, head) {
  this.head$5 = head;
  if (($$outer === null)) {
    throw new ScalaJS.c.jl_NullPointerException().init___()
  } else {
    this.$$outer$f = $$outer
  };
  return this
});
ScalaJS.c.sci_ListSet$Node.prototype.contains__O__Z = (function(e) {
  return this.containsInternal__p5__sci_ListSet__O__Z(this, e)
});
ScalaJS.c.sci_ListSet$Node.prototype.containsInternal__p5__sci_ListSet__O__Z = (function(n, e) {
  tailCallLoop: while (true) {
    if ((!n.isEmpty__Z())) {
      if (ScalaJS.anyEqEq(n.head__O(), e)) {
        return true
      } else {
        n = n.scala$collection$immutable$ListSet$$unchecked$undouter__sci_ListSet();
        continue tailCallLoop
      }
    } else {
      return false
    }
  }
});
ScalaJS.c.sci_ListSet$Node.prototype.$$plus__O__sc_Set = (function(elem) {
  return this.$$plus__O__sci_ListSet(elem)
});
ScalaJS.c.sci_ListSet$Node.prototype.tail__sci_ListSet = (function() {
  return this.$$outer$f
});
ScalaJS.is.sci_ListSet$Node = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_ListSet$Node)))
});
ScalaJS.as.sci_ListSet$Node = (function(obj) {
  return ((ScalaJS.is.sci_ListSet$Node(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.ListSet$Node"))
});
ScalaJS.isArrayOf.sci_ListSet$Node = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_ListSet$Node)))
});
ScalaJS.asArrayOf.sci_ListSet$Node = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_ListSet$Node(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.ListSet$Node;", depth))
});
ScalaJS.d.sci_ListSet$Node = new ScalaJS.ClassTypeData({
  sci_ListSet$Node: 0
}, false, "scala.collection.immutable.ListSet$Node", ScalaJS.d.sci_ListSet, {
  sci_ListSet$Node: 1,
  sci_ListSet: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sci_Set: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSet: 1,
  sc_Set: 1,
  sc_SetLike: 1,
  scg_Subtractable: 1,
  sc_GenSet: 1,
  scg_GenericSetTemplate: 1,
  sc_GenSetLike: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_ListSet$Node.prototype.$classData = ScalaJS.d.sci_ListSet$Node;
/** @constructor */
ScalaJS.c.sci_Nil$ = (function() {
  ScalaJS.c.sci_List.call(this)
});
ScalaJS.c.sci_Nil$.prototype = new ScalaJS.h.sci_List();
ScalaJS.c.sci_Nil$.prototype.constructor = ScalaJS.c.sci_Nil$;
/** @constructor */
ScalaJS.h.sci_Nil$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Nil$.prototype = ScalaJS.c.sci_Nil$.prototype;
ScalaJS.c.sci_Nil$.prototype.head__O = (function() {
  this.head__sr_Nothing$()
});
ScalaJS.c.sci_Nil$.prototype.productPrefix__T = (function() {
  return "Nil"
});
ScalaJS.c.sci_Nil$.prototype.productArity__I = (function() {
  return 0
});
ScalaJS.c.sci_Nil$.prototype.equals__O__Z = (function(that) {
  if (ScalaJS.is.sc_GenSeq(that)) {
    var x2 = ScalaJS.as.sc_GenSeq(that);
    return x2.isEmpty__Z()
  } else {
    return false
  }
});
ScalaJS.c.sci_Nil$.prototype.tail__sci_List = (function() {
  throw new ScalaJS.c.jl_UnsupportedOperationException().init___T("tail of empty list")
});
ScalaJS.c.sci_Nil$.prototype.isEmpty__Z = (function() {
  return true
});
ScalaJS.c.sci_Nil$.prototype.productElement__I__O = (function(x$1) {
  matchEnd3: {
    throw new ScalaJS.c.jl_IndexOutOfBoundsException().init___T(ScalaJS.objectToString(x$1))
  }
});
ScalaJS.c.sci_Nil$.prototype.head__sr_Nothing$ = (function() {
  throw new ScalaJS.c.ju_NoSuchElementException().init___T("head of empty list")
});
ScalaJS.c.sci_Nil$.prototype.tail__O = (function() {
  return this.tail__sci_List()
});
ScalaJS.c.sci_Nil$.prototype.productIterator__sc_Iterator = (function() {
  return new ScalaJS.c.sr_ScalaRunTime$$anon$1().init___s_Product(this)
});
ScalaJS.is.sci_Nil$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Nil$)))
});
ScalaJS.as.sci_Nil$ = (function(obj) {
  return ((ScalaJS.is.sci_Nil$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Nil$"))
});
ScalaJS.isArrayOf.sci_Nil$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Nil$)))
});
ScalaJS.asArrayOf.sci_Nil$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Nil$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Nil$;", depth))
});
ScalaJS.d.sci_Nil$ = new ScalaJS.ClassTypeData({
  sci_Nil$: 0
}, false, "scala.collection.immutable.Nil$", ScalaJS.d.sci_List, {
  sci_Nil$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sci_List: 1,
  sc_LinearSeqOptimized: 1,
  s_Product: 1,
  sci_LinearSeq: 1,
  sc_LinearSeq: 1,
  sc_LinearSeqLike: 1,
  sci_Seq: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_Nil$.prototype.$classData = ScalaJS.d.sci_Nil$;
ScalaJS.n.sci_Nil = (void 0);
ScalaJS.m.sci_Nil = (function() {
  if ((!ScalaJS.n.sci_Nil)) {
    ScalaJS.n.sci_Nil = new ScalaJS.c.sci_Nil$().init___()
  };
  return ScalaJS.n.sci_Nil
});
/** @constructor */
ScalaJS.c.sci_Range$Inclusive = (function() {
  ScalaJS.c.sci_Range.call(this)
});
ScalaJS.c.sci_Range$Inclusive.prototype = new ScalaJS.h.sci_Range();
ScalaJS.c.sci_Range$Inclusive.prototype.constructor = ScalaJS.c.sci_Range$Inclusive;
/** @constructor */
ScalaJS.h.sci_Range$Inclusive = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Range$Inclusive.prototype = ScalaJS.c.sci_Range$Inclusive.prototype;
ScalaJS.c.sci_Range$Inclusive.prototype.isInclusive__Z = (function() {
  return true
});
ScalaJS.is.sci_Range$Inclusive = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Range$Inclusive)))
});
ScalaJS.as.sci_Range$Inclusive = (function(obj) {
  return ((ScalaJS.is.sci_Range$Inclusive(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Range$Inclusive"))
});
ScalaJS.isArrayOf.sci_Range$Inclusive = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Range$Inclusive)))
});
ScalaJS.asArrayOf.sci_Range$Inclusive = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Range$Inclusive(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Range$Inclusive;", depth))
});
ScalaJS.d.sci_Range$Inclusive = new ScalaJS.ClassTypeData({
  sci_Range$Inclusive: 0
}, false, "scala.collection.immutable.Range$Inclusive", ScalaJS.d.sci_Range, {
  sci_Range$Inclusive: 1,
  sci_Range: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sc_CustomParallelizable: 1,
  sci_IndexedSeq: 1,
  sc_IndexedSeq: 1,
  sc_IndexedSeqLike: 1,
  sci_Seq: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_Range$Inclusive.prototype.$classData = ScalaJS.d.sci_Range$Inclusive;
/** @constructor */
ScalaJS.c.sci_Set$ = (function() {
  ScalaJS.c.scg_ImmutableSetFactory.call(this)
});
ScalaJS.c.sci_Set$.prototype = new ScalaJS.h.scg_ImmutableSetFactory();
ScalaJS.c.sci_Set$.prototype.constructor = ScalaJS.c.sci_Set$;
/** @constructor */
ScalaJS.h.sci_Set$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Set$.prototype = ScalaJS.c.sci_Set$.prototype;
ScalaJS.c.sci_Set$.prototype.empty__sc_GenTraversable = (function() {
  return ScalaJS.m.sci_Set$EmptySet()
});
ScalaJS.is.sci_Set$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Set$)))
});
ScalaJS.as.sci_Set$ = (function(obj) {
  return ((ScalaJS.is.sci_Set$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Set$"))
});
ScalaJS.isArrayOf.sci_Set$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Set$)))
});
ScalaJS.asArrayOf.sci_Set$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Set$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Set$;", depth))
});
ScalaJS.d.sci_Set$ = new ScalaJS.ClassTypeData({
  sci_Set$: 0
}, false, "scala.collection.immutable.Set$", ScalaJS.d.scg_ImmutableSetFactory, {
  sci_Set$: 1,
  scg_ImmutableSetFactory: 1,
  scg_SetFactory: 1,
  scg_GenericSeqCompanion: 1,
  scg_GenSetFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.sci_Set$.prototype.$classData = ScalaJS.d.sci_Set$;
ScalaJS.n.sci_Set = (void 0);
ScalaJS.m.sci_Set = (function() {
  if ((!ScalaJS.n.sci_Set)) {
    ScalaJS.n.sci_Set = new ScalaJS.c.sci_Set$().init___()
  };
  return ScalaJS.n.sci_Set
});
/** @constructor */
ScalaJS.c.sci_Stream$ = (function() {
  ScalaJS.c.scg_SeqFactory.call(this)
});
ScalaJS.c.sci_Stream$.prototype = new ScalaJS.h.scg_SeqFactory();
ScalaJS.c.sci_Stream$.prototype.constructor = ScalaJS.c.sci_Stream$;
/** @constructor */
ScalaJS.h.sci_Stream$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Stream$.prototype = ScalaJS.c.sci_Stream$.prototype;
ScalaJS.c.sci_Stream$.prototype.empty__sc_GenTraversable = (function() {
  return ScalaJS.m.sci_Stream$Empty()
});
ScalaJS.c.sci_Stream$.prototype.newBuilder__scm_Builder = (function() {
  return new ScalaJS.c.sci_Stream$StreamBuilder().init___()
});
ScalaJS.is.sci_Stream$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Stream$)))
});
ScalaJS.as.sci_Stream$ = (function(obj) {
  return ((ScalaJS.is.sci_Stream$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Stream$"))
});
ScalaJS.isArrayOf.sci_Stream$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Stream$)))
});
ScalaJS.asArrayOf.sci_Stream$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Stream$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Stream$;", depth))
});
ScalaJS.d.sci_Stream$ = new ScalaJS.ClassTypeData({
  sci_Stream$: 0
}, false, "scala.collection.immutable.Stream$", ScalaJS.d.scg_SeqFactory, {
  sci_Stream$: 1,
  scg_SeqFactory: 1,
  scg_TraversableFactory: 1,
  scg_GenericSeqCompanion: 1,
  scg_GenSeqFactory: 1,
  scg_GenTraversableFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.sci_Stream$.prototype.$classData = ScalaJS.d.sci_Stream$;
ScalaJS.n.sci_Stream = (void 0);
ScalaJS.m.sci_Stream = (function() {
  if ((!ScalaJS.n.sci_Stream)) {
    ScalaJS.n.sci_Stream = new ScalaJS.c.sci_Stream$().init___()
  };
  return ScalaJS.n.sci_Stream
});
/** @constructor */
ScalaJS.c.sci_Stream$Cons = (function() {
  ScalaJS.c.sci_Stream.call(this);
  this.hd$5 = null;
  this.tl$5 = null;
  this.tlVal$5 = null
});
ScalaJS.c.sci_Stream$Cons.prototype = new ScalaJS.h.sci_Stream();
ScalaJS.c.sci_Stream$Cons.prototype.constructor = ScalaJS.c.sci_Stream$Cons;
/** @constructor */
ScalaJS.h.sci_Stream$Cons = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Stream$Cons.prototype = ScalaJS.c.sci_Stream$Cons.prototype;
ScalaJS.c.sci_Stream$Cons.prototype.head__O = (function() {
  return this.hd$5
});
ScalaJS.c.sci_Stream$Cons.prototype.tail__sci_Stream = (function() {
  if ((!this.tailDefined__Z())) {
    if ((!this.tailDefined__Z())) {
      this.tlVal$5 = ScalaJS.as.sci_Stream(this.tl$5.apply__O())
    }
  };
  return this.tlVal$5
});
ScalaJS.c.sci_Stream$Cons.prototype.tailDefined__Z = (function() {
  return (this.tlVal$5 !== null)
});
ScalaJS.c.sci_Stream$Cons.prototype.isEmpty__Z = (function() {
  return false
});
ScalaJS.c.sci_Stream$Cons.prototype.tail__O = (function() {
  return this.tail__sci_Stream()
});
ScalaJS.c.sci_Stream$Cons.prototype.init___O__F0 = (function(hd, tl) {
  this.hd$5 = hd;
  this.tl$5 = tl;
  return this
});
ScalaJS.is.sci_Stream$Cons = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Stream$Cons)))
});
ScalaJS.as.sci_Stream$Cons = (function(obj) {
  return ((ScalaJS.is.sci_Stream$Cons(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Stream$Cons"))
});
ScalaJS.isArrayOf.sci_Stream$Cons = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Stream$Cons)))
});
ScalaJS.asArrayOf.sci_Stream$Cons = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Stream$Cons(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Stream$Cons;", depth))
});
ScalaJS.d.sci_Stream$Cons = new ScalaJS.ClassTypeData({
  sci_Stream$Cons: 0
}, false, "scala.collection.immutable.Stream$Cons", ScalaJS.d.sci_Stream, {
  sci_Stream$Cons: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sci_Stream: 1,
  sc_LinearSeqOptimized: 1,
  sci_LinearSeq: 1,
  sc_LinearSeq: 1,
  sc_LinearSeqLike: 1,
  sci_Seq: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_Stream$Cons.prototype.$classData = ScalaJS.d.sci_Stream$Cons;
/** @constructor */
ScalaJS.c.sci_Stream$Empty$ = (function() {
  ScalaJS.c.sci_Stream.call(this)
});
ScalaJS.c.sci_Stream$Empty$.prototype = new ScalaJS.h.sci_Stream();
ScalaJS.c.sci_Stream$Empty$.prototype.constructor = ScalaJS.c.sci_Stream$Empty$;
/** @constructor */
ScalaJS.h.sci_Stream$Empty$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Stream$Empty$.prototype = ScalaJS.c.sci_Stream$Empty$.prototype;
ScalaJS.c.sci_Stream$Empty$.prototype.head__O = (function() {
  this.head__sr_Nothing$()
});
ScalaJS.c.sci_Stream$Empty$.prototype.tailDefined__Z = (function() {
  return false
});
ScalaJS.c.sci_Stream$Empty$.prototype.isEmpty__Z = (function() {
  return true
});
ScalaJS.c.sci_Stream$Empty$.prototype.tail__sr_Nothing$ = (function() {
  throw new ScalaJS.c.jl_UnsupportedOperationException().init___T("tail of empty stream")
});
ScalaJS.c.sci_Stream$Empty$.prototype.head__sr_Nothing$ = (function() {
  throw new ScalaJS.c.ju_NoSuchElementException().init___T("head of empty stream")
});
ScalaJS.c.sci_Stream$Empty$.prototype.tail__O = (function() {
  this.tail__sr_Nothing$()
});
ScalaJS.is.sci_Stream$Empty$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Stream$Empty$)))
});
ScalaJS.as.sci_Stream$Empty$ = (function(obj) {
  return ((ScalaJS.is.sci_Stream$Empty$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Stream$Empty$"))
});
ScalaJS.isArrayOf.sci_Stream$Empty$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Stream$Empty$)))
});
ScalaJS.asArrayOf.sci_Stream$Empty$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Stream$Empty$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Stream$Empty$;", depth))
});
ScalaJS.d.sci_Stream$Empty$ = new ScalaJS.ClassTypeData({
  sci_Stream$Empty$: 0
}, false, "scala.collection.immutable.Stream$Empty$", ScalaJS.d.sci_Stream, {
  sci_Stream$Empty$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sci_Stream: 1,
  sc_LinearSeqOptimized: 1,
  sci_LinearSeq: 1,
  sc_LinearSeq: 1,
  sc_LinearSeqLike: 1,
  sci_Seq: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.sci_Stream$Empty$.prototype.$classData = ScalaJS.d.sci_Stream$Empty$;
ScalaJS.n.sci_Stream$Empty = (void 0);
ScalaJS.m.sci_Stream$Empty = (function() {
  if ((!ScalaJS.n.sci_Stream$Empty)) {
    ScalaJS.n.sci_Stream$Empty = new ScalaJS.c.sci_Stream$Empty$().init___()
  };
  return ScalaJS.n.sci_Stream$Empty
});
/** @constructor */
ScalaJS.c.sci_Vector$ = (function() {
  ScalaJS.c.scg_SeqFactory.call(this);
  this.VectorReusableCBF$5 = null;
  this.ReusableCBF$5 = null;
  this.NIL$5 = null;
  this.bitmap$0$5 = false
});
ScalaJS.c.sci_Vector$.prototype = new ScalaJS.h.scg_SeqFactory();
ScalaJS.c.sci_Vector$.prototype.constructor = ScalaJS.c.sci_Vector$;
/** @constructor */
ScalaJS.h.sci_Vector$ = (function() {
  /*<skip>*/
});
ScalaJS.h.sci_Vector$.prototype = ScalaJS.c.sci_Vector$.prototype;
ScalaJS.c.sci_Vector$.prototype.init___ = (function() {
  ScalaJS.n.sci_Vector = this;
  this.VectorReusableCBF$5 = new ScalaJS.c.sci_Vector$VectorReusableCBF().init___();
  this.NIL$5 = new ScalaJS.c.sci_Vector().init___I__I__I(0, 0, 0);
  return this
});
ScalaJS.c.sci_Vector$.prototype.empty__sc_GenTraversable = (function() {
  return this.NIL$5
});
ScalaJS.c.sci_Vector$.prototype.newBuilder__scm_Builder = (function() {
  return new ScalaJS.c.sci_VectorBuilder().init___()
});
ScalaJS.is.sci_Vector$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_Vector$)))
});
ScalaJS.as.sci_Vector$ = (function(obj) {
  return ((ScalaJS.is.sci_Vector$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.Vector$"))
});
ScalaJS.isArrayOf.sci_Vector$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_Vector$)))
});
ScalaJS.asArrayOf.sci_Vector$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_Vector$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.Vector$;", depth))
});
ScalaJS.d.sci_Vector$ = new ScalaJS.ClassTypeData({
  sci_Vector$: 0
}, false, "scala.collection.immutable.Vector$", ScalaJS.d.scg_SeqFactory, {
  sci_Vector$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  scg_SeqFactory: 1,
  scg_TraversableFactory: 1,
  scg_GenericSeqCompanion: 1,
  scg_GenSeqFactory: 1,
  scg_GenTraversableFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.sci_Vector$.prototype.$classData = ScalaJS.d.sci_Vector$;
ScalaJS.n.sci_Vector = (void 0);
ScalaJS.m.sci_Vector = (function() {
  if ((!ScalaJS.n.sci_Vector)) {
    ScalaJS.n.sci_Vector = new ScalaJS.c.sci_Vector$().init___()
  };
  return ScalaJS.n.sci_Vector
});
/** @constructor */
ScalaJS.c.scm_AbstractBuffer = (function() {
  ScalaJS.c.scm_AbstractSeq.call(this)
});
ScalaJS.c.scm_AbstractBuffer.prototype = new ScalaJS.h.scm_AbstractSeq();
ScalaJS.c.scm_AbstractBuffer.prototype.constructor = ScalaJS.c.scm_AbstractBuffer;
/** @constructor */
ScalaJS.h.scm_AbstractBuffer = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_AbstractBuffer.prototype = ScalaJS.c.scm_AbstractBuffer.prototype;
ScalaJS.is.scm_AbstractBuffer = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_AbstractBuffer)))
});
ScalaJS.as.scm_AbstractBuffer = (function(obj) {
  return ((ScalaJS.is.scm_AbstractBuffer(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.AbstractBuffer"))
});
ScalaJS.isArrayOf.scm_AbstractBuffer = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_AbstractBuffer)))
});
ScalaJS.asArrayOf.scm_AbstractBuffer = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_AbstractBuffer(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.AbstractBuffer;", depth))
});
ScalaJS.d.scm_AbstractBuffer = new ScalaJS.ClassTypeData({
  scm_AbstractBuffer: 0
}, false, "scala.collection.mutable.AbstractBuffer", ScalaJS.d.scm_AbstractSeq, {
  scm_AbstractBuffer: 1,
  scm_Buffer: 1,
  scm_BufferLike: 1,
  scg_Subtractable: 1,
  sc_script_Scriptable: 1,
  scg_Shrinkable: 1,
  scg_Growable: 1,
  scg_Clearable: 1,
  scm_AbstractSeq: 1,
  scm_Seq: 1,
  scm_SeqLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  scm_Iterable: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.scm_AbstractBuffer.prototype.$classData = ScalaJS.d.scm_AbstractBuffer;
/** @constructor */
ScalaJS.c.scm_ArrayBuffer$ = (function() {
  ScalaJS.c.scg_SeqFactory.call(this)
});
ScalaJS.c.scm_ArrayBuffer$.prototype = new ScalaJS.h.scg_SeqFactory();
ScalaJS.c.scm_ArrayBuffer$.prototype.constructor = ScalaJS.c.scm_ArrayBuffer$;
/** @constructor */
ScalaJS.h.scm_ArrayBuffer$ = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_ArrayBuffer$.prototype = ScalaJS.c.scm_ArrayBuffer$.prototype;
ScalaJS.c.scm_ArrayBuffer$.prototype.newBuilder__scm_Builder = (function() {
  return new ScalaJS.c.scm_ArrayBuffer().init___()
});
ScalaJS.is.scm_ArrayBuffer$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_ArrayBuffer$)))
});
ScalaJS.as.scm_ArrayBuffer$ = (function(obj) {
  return ((ScalaJS.is.scm_ArrayBuffer$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.ArrayBuffer$"))
});
ScalaJS.isArrayOf.scm_ArrayBuffer$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_ArrayBuffer$)))
});
ScalaJS.asArrayOf.scm_ArrayBuffer$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_ArrayBuffer$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.ArrayBuffer$;", depth))
});
ScalaJS.d.scm_ArrayBuffer$ = new ScalaJS.ClassTypeData({
  scm_ArrayBuffer$: 0
}, false, "scala.collection.mutable.ArrayBuffer$", ScalaJS.d.scg_SeqFactory, {
  scm_ArrayBuffer$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  scg_SeqFactory: 1,
  scg_TraversableFactory: 1,
  scg_GenericSeqCompanion: 1,
  scg_GenSeqFactory: 1,
  scg_GenTraversableFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.scm_ArrayBuffer$.prototype.$classData = ScalaJS.d.scm_ArrayBuffer$;
ScalaJS.n.scm_ArrayBuffer = (void 0);
ScalaJS.m.scm_ArrayBuffer = (function() {
  if ((!ScalaJS.n.scm_ArrayBuffer)) {
    ScalaJS.n.scm_ArrayBuffer = new ScalaJS.c.scm_ArrayBuffer$().init___()
  };
  return ScalaJS.n.scm_ArrayBuffer
});
/** @constructor */
ScalaJS.c.scm_HashSet = (function() {
  ScalaJS.c.scm_AbstractSet.call(this);
  this.$$undloadFactor$5 = 0;
  this.table$5 = null;
  this.tableSize$5 = 0;
  this.threshold$5 = 0;
  this.sizemap$5 = null;
  this.seedvalue$5 = 0
});
ScalaJS.c.scm_HashSet.prototype = new ScalaJS.h.scm_AbstractSet();
ScalaJS.c.scm_HashSet.prototype.constructor = ScalaJS.c.scm_HashSet;
/** @constructor */
ScalaJS.h.scm_HashSet = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_HashSet.prototype = ScalaJS.c.scm_HashSet.prototype;
ScalaJS.c.scm_HashSet.prototype.seq__sc_TraversableOnce = (function() {
  return this
});
ScalaJS.c.scm_HashSet.prototype.init___ = (function() {
  return (ScalaJS.c.scm_HashSet.prototype.init___scm_FlatHashTable$Contents.call(this, null), this)
});
ScalaJS.c.scm_HashSet.prototype.apply__O__O = (function(v1) {
  return ScalaJS.i.scm_FlatHashTable$class__containsEntry__scm_FlatHashTable__O__Z(this, v1)
});
ScalaJS.c.scm_HashSet.prototype.thisCollection__sc_Traversable = (function() {
  return ScalaJS.i.sc_IterableLike$class__thisCollection__sc_IterableLike__sc_Iterable(this)
});
ScalaJS.c.scm_HashSet.prototype.$$plus$eq__O__scg_Growable = (function(elem) {
  return this.$$plus$eq__O__scm_HashSet(elem)
});
ScalaJS.c.scm_HashSet.prototype.companion__scg_GenericCompanion = (function() {
  return ScalaJS.m.scm_HashSet()
});
ScalaJS.c.scm_HashSet.prototype.foreach__F1__V = (function(f) {
  var i = 0;
  var len = this.table$5.u["length"];
  while ((i < len)) {
    var elem = this.table$5.u[i];
    if ((elem !== null)) {
      f.apply__O__O(elem)
    };
    i = ((i + 1) | 0)
  }
});
ScalaJS.c.scm_HashSet.prototype.size__I = (function() {
  return this.tableSize$5
});
ScalaJS.c.scm_HashSet.prototype.result__O = (function() {
  return ScalaJS.i.scm_SetLike$class__result__scm_SetLike__scm_Set(this)
});
ScalaJS.c.scm_HashSet.prototype.iterator__sc_Iterator = (function() {
  return new ScalaJS.c.scm_FlatHashTable$$anon$1().init___scm_FlatHashTable(this)
});
ScalaJS.c.scm_HashSet.prototype.empty__sc_Set = (function() {
  return ScalaJS.as.sc_Set(ScalaJS.i.scg_GenericSetTemplate$class__empty__scg_GenericSetTemplate__sc_GenSet(this))
});
ScalaJS.c.scm_HashSet.prototype.clone__scm_HashSet = (function() {
  var this$1 = new ScalaJS.c.scm_HashSet().init___();
  return ScalaJS.as.scm_HashSet(ScalaJS.i.scg_Growable$class__$plus$plus$eq__scg_Growable__sc_TraversableOnce__scg_Growable(this$1, this))
});
ScalaJS.c.scm_HashSet.prototype.init___scm_FlatHashTable$Contents = (function(contents) {
  return (ScalaJS.i.scm_FlatHashTable$class__$init$__scm_FlatHashTable__V(this), ScalaJS.i.scm_FlatHashTable$class__initWithContents__scm_FlatHashTable__scm_FlatHashTable$Contents__V(this, contents), this)
});
ScalaJS.c.scm_HashSet.prototype.$$plus$eq__O__scm_Builder = (function(elem) {
  return this.$$plus$eq__O__scm_HashSet(elem)
});
ScalaJS.c.scm_HashSet.prototype.$$plus__O__sc_Set = (function(elem) {
  return ScalaJS.i.scm_SetLike$class__$plus__scm_SetLike__O__scm_Set(this, elem)
});
ScalaJS.c.scm_HashSet.prototype.$$plus$eq__O__scm_HashSet = (function(elem) {
  return (ScalaJS.i.scm_FlatHashTable$class__addEntry__scm_FlatHashTable__O__Z(this, elem), this)
});
ScalaJS.is.scm_HashSet = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_HashSet)))
});
ScalaJS.as.scm_HashSet = (function(obj) {
  return ((ScalaJS.is.scm_HashSet(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.HashSet"))
});
ScalaJS.isArrayOf.scm_HashSet = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_HashSet)))
});
ScalaJS.asArrayOf.scm_HashSet = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_HashSet(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.HashSet;", depth))
});
ScalaJS.d.scm_HashSet = new ScalaJS.ClassTypeData({
  scm_HashSet: 0
}, false, "scala.collection.mutable.HashSet", ScalaJS.d.scm_AbstractSet, {
  scm_HashSet: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sc_CustomParallelizable: 1,
  scm_FlatHashTable: 1,
  scm_FlatHashTable$HashUtils: 1,
  scm_AbstractSet: 1,
  scm_Set: 1,
  scm_SetLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  scg_Shrinkable: 1,
  scm_Builder: 1,
  scg_Growable: 1,
  scg_Clearable: 1,
  sc_script_Scriptable: 1,
  sc_Set: 1,
  sc_SetLike: 1,
  scg_Subtractable: 1,
  sc_GenSet: 1,
  scg_GenericSetTemplate: 1,
  sc_GenSetLike: 1,
  F1: 1,
  scm_AbstractIterable: 1,
  scm_Iterable: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.scm_HashSet.prototype.$classData = ScalaJS.d.scm_HashSet;
/** @constructor */
ScalaJS.c.scm_HashSet$ = (function() {
  ScalaJS.c.scg_MutableSetFactory.call(this)
});
ScalaJS.c.scm_HashSet$.prototype = new ScalaJS.h.scg_MutableSetFactory();
ScalaJS.c.scm_HashSet$.prototype.constructor = ScalaJS.c.scm_HashSet$;
/** @constructor */
ScalaJS.h.scm_HashSet$ = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_HashSet$.prototype = ScalaJS.c.scm_HashSet$.prototype;
ScalaJS.c.scm_HashSet$.prototype.empty__sc_GenTraversable = (function() {
  return new ScalaJS.c.scm_HashSet().init___()
});
ScalaJS.is.scm_HashSet$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_HashSet$)))
});
ScalaJS.as.scm_HashSet$ = (function(obj) {
  return ((ScalaJS.is.scm_HashSet$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.HashSet$"))
});
ScalaJS.isArrayOf.scm_HashSet$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_HashSet$)))
});
ScalaJS.asArrayOf.scm_HashSet$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_HashSet$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.HashSet$;", depth))
});
ScalaJS.d.scm_HashSet$ = new ScalaJS.ClassTypeData({
  scm_HashSet$: 0
}, false, "scala.collection.mutable.HashSet$", ScalaJS.d.scg_MutableSetFactory, {
  scm_HashSet$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  scg_MutableSetFactory: 1,
  scg_SetFactory: 1,
  scg_GenericSeqCompanion: 1,
  scg_GenSetFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.scm_HashSet$.prototype.$classData = ScalaJS.d.scm_HashSet$;
ScalaJS.n.scm_HashSet = (void 0);
ScalaJS.m.scm_HashSet = (function() {
  if ((!ScalaJS.n.scm_HashSet)) {
    ScalaJS.n.scm_HashSet = new ScalaJS.c.scm_HashSet$().init___()
  };
  return ScalaJS.n.scm_HashSet
});
/** @constructor */
ScalaJS.c.scm_IndexedSeq$ = (function() {
  ScalaJS.c.scg_SeqFactory.call(this)
});
ScalaJS.c.scm_IndexedSeq$.prototype = new ScalaJS.h.scg_SeqFactory();
ScalaJS.c.scm_IndexedSeq$.prototype.constructor = ScalaJS.c.scm_IndexedSeq$;
/** @constructor */
ScalaJS.h.scm_IndexedSeq$ = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_IndexedSeq$.prototype = ScalaJS.c.scm_IndexedSeq$.prototype;
ScalaJS.c.scm_IndexedSeq$.prototype.newBuilder__scm_Builder = (function() {
  return new ScalaJS.c.scm_ArrayBuffer().init___()
});
ScalaJS.is.scm_IndexedSeq$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_IndexedSeq$)))
});
ScalaJS.as.scm_IndexedSeq$ = (function(obj) {
  return ((ScalaJS.is.scm_IndexedSeq$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.IndexedSeq$"))
});
ScalaJS.isArrayOf.scm_IndexedSeq$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_IndexedSeq$)))
});
ScalaJS.asArrayOf.scm_IndexedSeq$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_IndexedSeq$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.IndexedSeq$;", depth))
});
ScalaJS.d.scm_IndexedSeq$ = new ScalaJS.ClassTypeData({
  scm_IndexedSeq$: 0
}, false, "scala.collection.mutable.IndexedSeq$", ScalaJS.d.scg_SeqFactory, {
  scm_IndexedSeq$: 1,
  scg_SeqFactory: 1,
  scg_TraversableFactory: 1,
  scg_GenericSeqCompanion: 1,
  scg_GenSeqFactory: 1,
  scg_GenTraversableFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.scm_IndexedSeq$.prototype.$classData = ScalaJS.d.scm_IndexedSeq$;
ScalaJS.n.scm_IndexedSeq = (void 0);
ScalaJS.m.scm_IndexedSeq = (function() {
  if ((!ScalaJS.n.scm_IndexedSeq)) {
    ScalaJS.n.scm_IndexedSeq = new ScalaJS.c.scm_IndexedSeq$().init___()
  };
  return ScalaJS.n.scm_IndexedSeq
});
/** @constructor */
ScalaJS.c.scm_ListBuffer$ = (function() {
  ScalaJS.c.scg_SeqFactory.call(this)
});
ScalaJS.c.scm_ListBuffer$.prototype = new ScalaJS.h.scg_SeqFactory();
ScalaJS.c.scm_ListBuffer$.prototype.constructor = ScalaJS.c.scm_ListBuffer$;
/** @constructor */
ScalaJS.h.scm_ListBuffer$ = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_ListBuffer$.prototype = ScalaJS.c.scm_ListBuffer$.prototype;
ScalaJS.c.scm_ListBuffer$.prototype.newBuilder__scm_Builder = (function() {
  return new ScalaJS.c.scm_GrowingBuilder().init___scg_Growable(new ScalaJS.c.scm_ListBuffer().init___())
});
ScalaJS.is.scm_ListBuffer$ = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_ListBuffer$)))
});
ScalaJS.as.scm_ListBuffer$ = (function(obj) {
  return ((ScalaJS.is.scm_ListBuffer$(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.ListBuffer$"))
});
ScalaJS.isArrayOf.scm_ListBuffer$ = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_ListBuffer$)))
});
ScalaJS.asArrayOf.scm_ListBuffer$ = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_ListBuffer$(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.ListBuffer$;", depth))
});
ScalaJS.d.scm_ListBuffer$ = new ScalaJS.ClassTypeData({
  scm_ListBuffer$: 0
}, false, "scala.collection.mutable.ListBuffer$", ScalaJS.d.scg_SeqFactory, {
  scm_ListBuffer$: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  scg_SeqFactory: 1,
  scg_TraversableFactory: 1,
  scg_GenericSeqCompanion: 1,
  scg_GenSeqFactory: 1,
  scg_GenTraversableFactory: 1,
  scg_GenericCompanion: 1,
  O: 1
});
ScalaJS.c.scm_ListBuffer$.prototype.$classData = ScalaJS.d.scm_ListBuffer$;
ScalaJS.n.scm_ListBuffer = (void 0);
ScalaJS.m.scm_ListBuffer = (function() {
  if ((!ScalaJS.n.scm_ListBuffer)) {
    ScalaJS.n.scm_ListBuffer = new ScalaJS.c.scm_ListBuffer$().init___()
  };
  return ScalaJS.n.scm_ListBuffer
});
/** @constructor */
ScalaJS.c.scm_StringBuilder = (function() {
  ScalaJS.c.scm_AbstractSeq.call(this);
  this.underlying$5 = null
});
ScalaJS.c.scm_StringBuilder.prototype = new ScalaJS.h.scm_AbstractSeq();
ScalaJS.c.scm_StringBuilder.prototype.constructor = ScalaJS.c.scm_StringBuilder;
/** @constructor */
ScalaJS.h.scm_StringBuilder = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_StringBuilder.prototype = ScalaJS.c.scm_StringBuilder.prototype;
ScalaJS.c.scm_StringBuilder.prototype.seq__sc_TraversableOnce = (function() {
  return this
});
ScalaJS.c.scm_StringBuilder.prototype.init___ = (function() {
  return (ScalaJS.c.scm_StringBuilder.prototype.init___I__T.call(this, 16, ""), this)
});
ScalaJS.c.scm_StringBuilder.prototype.$$plus$eq__C__scm_StringBuilder = (function(x) {
  return (this.append__C__scm_StringBuilder(x), this)
});
ScalaJS.c.scm_StringBuilder.prototype.apply__I__O = (function(idx) {
  return ScalaJS.bC(this.underlying$5.charAt__I__C(idx))
});
ScalaJS.c.scm_StringBuilder.prototype.lengthCompare__I__I = (function(len) {
  return ScalaJS.i.sc_IndexedSeqOptimized$class__lengthCompare__sc_IndexedSeqOptimized__I__I(this, len)
});
ScalaJS.c.scm_StringBuilder.prototype.apply__O__O = (function(v1) {
  var index = ScalaJS.uI(v1);
  return ScalaJS.bC(this.underlying$5.charAt__I__C(index))
});
ScalaJS.c.scm_StringBuilder.prototype.sameElements__sc_GenIterable__Z = (function(that) {
  return ScalaJS.i.sc_IndexedSeqOptimized$class__sameElements__sc_IndexedSeqOptimized__sc_GenIterable__Z(this, that)
});
ScalaJS.c.scm_StringBuilder.prototype.isEmpty__Z = (function() {
  return ScalaJS.i.sc_IndexedSeqOptimized$class__isEmpty__sc_IndexedSeqOptimized__Z(this)
});
ScalaJS.c.scm_StringBuilder.prototype.thisCollection__sc_Traversable = (function() {
  return this
});
ScalaJS.c.scm_StringBuilder.prototype.subSequence__I__I__jl_CharSequence = (function(start, end) {
  return this.underlying$5.substring__I__I__T(start, end)
});
ScalaJS.c.scm_StringBuilder.prototype.$$plus$eq__O__scg_Growable = (function(elem) {
  return this.$$plus$eq__C__scm_StringBuilder(ScalaJS.uC(elem))
});
ScalaJS.c.scm_StringBuilder.prototype.toString__T = (function() {
  var this$1 = this.underlying$5;
  return this$1.content$1
});
ScalaJS.c.scm_StringBuilder.prototype.companion__scg_GenericCompanion = (function() {
  return ScalaJS.m.scm_IndexedSeq()
});
ScalaJS.c.scm_StringBuilder.prototype.foreach__F1__V = (function(f) {
  var i = 0;
  var len = this.underlying$5.length__I();
  while ((i < len)) {
    var idx = i;
    f.apply__O__O(ScalaJS.bC(this.underlying$5.charAt__I__C(idx)));
    i = ((i + 1) | 0)
  }
});
ScalaJS.c.scm_StringBuilder.prototype.foldLeft__O__F2__O = (function(z, op) {
  var start = 0;
  var end = this.underlying$5.length__I();
  var z$1 = z;
  tailCallLoop: while (true) {
    if ((start === end)) {
      return z$1
    } else {
      var temp$start = ((start + 1) | 0);
      var jsx$1 = z$1;
      var idx = start;
      var temp$z = op.apply__O__O__O(jsx$1, ScalaJS.bC(this.underlying$5.charAt__I__C(idx)));
      start = temp$start;
      z$1 = temp$z;
      continue tailCallLoop
    }
  }
});
ScalaJS.c.scm_StringBuilder.prototype.toBuffer__scm_Buffer = (function() {
  return ScalaJS.i.sc_IndexedSeqLike$class__toBuffer__sc_IndexedSeqLike__scm_Buffer(this)
});
ScalaJS.c.scm_StringBuilder.prototype.result__O = (function() {
  var this$1 = this.underlying$5;
  return this$1.content$1
});
ScalaJS.c.scm_StringBuilder.prototype.append__T__scm_StringBuilder = (function(s) {
  return (this.underlying$5.append__T__jl_StringBuilder(s), this)
});
ScalaJS.c.scm_StringBuilder.prototype.seq__scm_Seq = (function() {
  return this
});
ScalaJS.c.scm_StringBuilder.prototype.iterator__sc_Iterator = (function() {
  return new ScalaJS.c.sc_IndexedSeqLike$Elements().init___sc_IndexedSeqLike__I__I(this, 0, this.underlying$5.length__I())
});
ScalaJS.c.scm_StringBuilder.prototype.sizeHintBounded__I__sc_TraversableLike__V = (function(size, boundingColl) {
  ScalaJS.i.scm_Builder$class__sizeHintBounded__scm_Builder__I__sc_TraversableLike__V(this, size, boundingColl)
});
ScalaJS.c.scm_StringBuilder.prototype.init___I__T = (function(initCapacity, initValue) {
  return (ScalaJS.c.scm_StringBuilder.prototype.init___jl_StringBuilder.call(this, new ScalaJS.c.jl_StringBuilder().init___I(((ScalaJS.i.sjsr_RuntimeString$class__length__sjsr_RuntimeString__I(initValue) + initCapacity) | 0)).append__T__jl_StringBuilder(initValue)), this)
});
ScalaJS.c.scm_StringBuilder.prototype.seq__sc_Seq = (function() {
  return this
});
ScalaJS.c.scm_StringBuilder.prototype.length__I = (function() {
  return this.underlying$5.length__I()
});
ScalaJS.c.scm_StringBuilder.prototype.init___jl_StringBuilder = (function(underlying) {
  this.underlying$5 = underlying;
  return this
});
ScalaJS.c.scm_StringBuilder.prototype.append__O__scm_StringBuilder = (function(x) {
  return (this.underlying$5.append__T__jl_StringBuilder(ScalaJS.m.sjsr_RuntimeString().valueOf__O__T(x)), this)
});
ScalaJS.c.scm_StringBuilder.prototype.$$plus$eq__O__scm_Builder = (function(elem) {
  return this.$$plus$eq__C__scm_StringBuilder(ScalaJS.uC(elem))
});
ScalaJS.c.scm_StringBuilder.prototype.copyToArray__O__I__I__V = (function(xs, start, len) {
  ScalaJS.i.sc_IndexedSeqOptimized$class__copyToArray__sc_IndexedSeqOptimized__O__I__I__V(this, xs, start, len)
});
ScalaJS.c.scm_StringBuilder.prototype.sizeHint__I__V = (function(size) {
  /*<skip>*/
});
ScalaJS.c.scm_StringBuilder.prototype.hashCode__I = (function() {
  return ScalaJS.m.s_util_hashing_MurmurHash3().seqHash__sc_Seq__I(this)
});
ScalaJS.c.scm_StringBuilder.prototype.toArray__s_reflect_ClassTag__O = (function(evidence$1) {
  return ScalaJS.i.sci_StringLike$class__toArray__sci_StringLike__s_reflect_ClassTag__O(this, evidence$1)
});
ScalaJS.c.scm_StringBuilder.prototype.append__C__scm_StringBuilder = (function(x) {
  return (this.underlying$5.append__C__jl_StringBuilder(x), this)
});
ScalaJS.c.scm_StringBuilder.prototype.newBuilder__scm_Builder = (function() {
  return new ScalaJS.c.scm_GrowingBuilder().init___scg_Growable(new ScalaJS.c.scm_StringBuilder().init___())
});
ScalaJS.c.scm_StringBuilder.prototype.$$plus$plus$eq__sc_TraversableOnce__scg_Growable = (function(xs) {
  return ScalaJS.i.scg_Growable$class__$plus$plus$eq__scg_Growable__sc_TraversableOnce__scg_Growable(this, xs)
});
ScalaJS.is.scm_StringBuilder = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_StringBuilder)))
});
ScalaJS.as.scm_StringBuilder = (function(obj) {
  return ((ScalaJS.is.scm_StringBuilder(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.StringBuilder"))
});
ScalaJS.isArrayOf.scm_StringBuilder = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_StringBuilder)))
});
ScalaJS.asArrayOf.scm_StringBuilder = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_StringBuilder(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.StringBuilder;", depth))
});
ScalaJS.d.scm_StringBuilder = new ScalaJS.ClassTypeData({
  scm_StringBuilder: 0
}, false, "scala.collection.mutable.StringBuilder", ScalaJS.d.scm_AbstractSeq, {
  scm_StringBuilder: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  scm_Builder: 1,
  scg_Growable: 1,
  scg_Clearable: 1,
  sci_StringLike: 1,
  s_math_Ordered: 1,
  jl_Comparable: 1,
  sc_IndexedSeqOptimized: 1,
  scm_IndexedSeq: 1,
  scm_IndexedSeqLike: 1,
  sc_IndexedSeq: 1,
  sc_IndexedSeqLike: 1,
  jl_CharSequence: 1,
  scm_AbstractSeq: 1,
  scm_Seq: 1,
  scm_SeqLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  scm_Iterable: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.scm_StringBuilder.prototype.$classData = ScalaJS.d.scm_StringBuilder;
/** @constructor */
ScalaJS.c.scm_WrappedArray = (function() {
  ScalaJS.c.scm_AbstractSeq.call(this)
});
ScalaJS.c.scm_WrappedArray.prototype = new ScalaJS.h.scm_AbstractSeq();
ScalaJS.c.scm_WrappedArray.prototype.constructor = ScalaJS.c.scm_WrappedArray;
/** @constructor */
ScalaJS.h.scm_WrappedArray = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_WrappedArray.prototype = ScalaJS.c.scm_WrappedArray.prototype;
ScalaJS.c.scm_WrappedArray.prototype.seq__sc_TraversableOnce = (function() {
  return this
});
ScalaJS.c.scm_WrappedArray.prototype.lengthCompare__I__I = (function(len) {
  return ScalaJS.i.sc_IndexedSeqOptimized$class__lengthCompare__sc_IndexedSeqOptimized__I__I(this, len)
});
ScalaJS.c.scm_WrappedArray.prototype.sameElements__sc_GenIterable__Z = (function(that) {
  return ScalaJS.i.sc_IndexedSeqOptimized$class__sameElements__sc_IndexedSeqOptimized__sc_GenIterable__Z(this, that)
});
ScalaJS.c.scm_WrappedArray.prototype.thisCollection__sc_Traversable = (function() {
  return this
});
ScalaJS.c.scm_WrappedArray.prototype.isEmpty__Z = (function() {
  return ScalaJS.i.sc_IndexedSeqOptimized$class__isEmpty__sc_IndexedSeqOptimized__Z(this)
});
ScalaJS.c.scm_WrappedArray.prototype.companion__scg_GenericCompanion = (function() {
  return ScalaJS.m.scm_IndexedSeq()
});
ScalaJS.c.scm_WrappedArray.prototype.foreach__F1__V = (function(f) {
  var i = 0;
  var len = this.length__I();
  while ((i < len)) {
    f.apply__O__O(this.apply__I__O(i));
    i = ((i + 1) | 0)
  }
});
ScalaJS.c.scm_WrappedArray.prototype.foldLeft__O__F2__O = (function(z, op) {
  var start = 0;
  var end = this.length__I();
  var z$1 = z;
  tailCallLoop: while (true) {
    if ((start === end)) {
      return z$1
    } else {
      var temp$start = ((start + 1) | 0);
      var temp$z = op.apply__O__O__O(z$1, this.apply__I__O(start));
      start = temp$start;
      z$1 = temp$z;
      continue tailCallLoop
    }
  }
});
ScalaJS.c.scm_WrappedArray.prototype.toBuffer__scm_Buffer = (function() {
  return ScalaJS.i.sc_IndexedSeqLike$class__toBuffer__sc_IndexedSeqLike__scm_Buffer(this)
});
ScalaJS.c.scm_WrappedArray.prototype.seq__scm_Seq = (function() {
  return this
});
ScalaJS.c.scm_WrappedArray.prototype.iterator__sc_Iterator = (function() {
  return new ScalaJS.c.sc_IndexedSeqLike$Elements().init___sc_IndexedSeqLike__I__I(this, 0, this.length__I())
});
ScalaJS.c.scm_WrappedArray.prototype.seq__sc_Seq = (function() {
  return this
});
ScalaJS.c.scm_WrappedArray.prototype.copyToArray__O__I__I__V = (function(xs, start, len) {
  ScalaJS.i.sc_IndexedSeqOptimized$class__copyToArray__sc_IndexedSeqOptimized__O__I__I__V(this, xs, start, len)
});
ScalaJS.c.scm_WrappedArray.prototype.hashCode__I = (function() {
  return ScalaJS.m.s_util_hashing_MurmurHash3().seqHash__sc_Seq__I(this)
});
ScalaJS.c.scm_WrappedArray.prototype.toArray__s_reflect_ClassTag__O = (function(evidence$1) {
  var thatElementClass = ScalaJS.m.sr_ScalaRunTime().arrayElementClass__O__jl_Class(evidence$1);
  return ((this.elementClass__p5__jl_Class() === thatElementClass) ? this.array__O() : ScalaJS.i.sc_TraversableOnce$class__toArray__sc_TraversableOnce__s_reflect_ClassTag__O(this, evidence$1))
});
ScalaJS.c.scm_WrappedArray.prototype.elementClass__p5__jl_Class = (function() {
  return ScalaJS.m.sr_ScalaRunTime().arrayElementClass__O__jl_Class(ScalaJS.objectGetClass(this.array__O()))
});
ScalaJS.c.scm_WrappedArray.prototype.newBuilder__scm_Builder = (function() {
  return new ScalaJS.c.scm_WrappedArrayBuilder().init___s_reflect_ClassTag(this.elemTag__s_reflect_ClassTag())
});
ScalaJS.c.scm_WrappedArray.prototype.stringPrefix__T = (function() {
  return "WrappedArray"
});
ScalaJS.is.scm_WrappedArray = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_WrappedArray)))
});
ScalaJS.as.scm_WrappedArray = (function(obj) {
  return ((ScalaJS.is.scm_WrappedArray(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.WrappedArray"))
});
ScalaJS.isArrayOf.scm_WrappedArray = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_WrappedArray)))
});
ScalaJS.asArrayOf.scm_WrappedArray = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_WrappedArray(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.WrappedArray;", depth))
});
ScalaJS.d.scm_WrappedArray = new ScalaJS.ClassTypeData({
  scm_WrappedArray: 0
}, false, "scala.collection.mutable.WrappedArray", ScalaJS.d.scm_AbstractSeq, {
  scm_WrappedArray: 1,
  sc_CustomParallelizable: 1,
  scm_ArrayLike: 1,
  scm_IndexedSeqOptimized: 1,
  sc_IndexedSeqOptimized: 1,
  scm_IndexedSeq: 1,
  scm_IndexedSeqLike: 1,
  sc_IndexedSeq: 1,
  sc_IndexedSeqLike: 1,
  scm_AbstractSeq: 1,
  scm_Seq: 1,
  scm_SeqLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  scm_Iterable: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.scm_WrappedArray.prototype.$classData = ScalaJS.d.scm_WrappedArray;
/** @constructor */
ScalaJS.c.ju_FormatFlagsConversionMismatchException = (function() {
  ScalaJS.c.ju_IllegalFormatException.call(this);
  this.c$6 = 0;
  this.f$6 = null
});
ScalaJS.c.ju_FormatFlagsConversionMismatchException.prototype = new ScalaJS.h.ju_IllegalFormatException();
ScalaJS.c.ju_FormatFlagsConversionMismatchException.prototype.constructor = ScalaJS.c.ju_FormatFlagsConversionMismatchException;
/** @constructor */
ScalaJS.h.ju_FormatFlagsConversionMismatchException = (function() {
  /*<skip>*/
});
ScalaJS.h.ju_FormatFlagsConversionMismatchException.prototype = ScalaJS.c.ju_FormatFlagsConversionMismatchException.prototype;
ScalaJS.c.ju_FormatFlagsConversionMismatchException.prototype.getMessage__T = (function() {
  return ((("Conversion = " + ScalaJS.bC(this.c$6)) + ", Flags = ") + this.f$6)
});
ScalaJS.c.ju_FormatFlagsConversionMismatchException.prototype.init___C = (function(c) {
  this.c$6 = c;
  ScalaJS.c.ju_IllegalFormatException.prototype.init___.call(this);
  this.f$6 = null;
  return this
});
ScalaJS.c.ju_FormatFlagsConversionMismatchException.prototype.init___T__C = (function(f, c) {
  ScalaJS.c.ju_FormatFlagsConversionMismatchException.prototype.init___C.call(this, c);
  if ((f === null)) {
    throw new ScalaJS.c.jl_NullPointerException().init___()
  };
  this.f$6 = f;
  return this
});
ScalaJS.is.ju_FormatFlagsConversionMismatchException = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.ju_FormatFlagsConversionMismatchException)))
});
ScalaJS.as.ju_FormatFlagsConversionMismatchException = (function(obj) {
  return ((ScalaJS.is.ju_FormatFlagsConversionMismatchException(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.util.FormatFlagsConversionMismatchException"))
});
ScalaJS.isArrayOf.ju_FormatFlagsConversionMismatchException = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.ju_FormatFlagsConversionMismatchException)))
});
ScalaJS.asArrayOf.ju_FormatFlagsConversionMismatchException = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.ju_FormatFlagsConversionMismatchException(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.util.FormatFlagsConversionMismatchException;", depth))
});
ScalaJS.d.ju_FormatFlagsConversionMismatchException = new ScalaJS.ClassTypeData({
  ju_FormatFlagsConversionMismatchException: 0
}, false, "java.util.FormatFlagsConversionMismatchException", ScalaJS.d.ju_IllegalFormatException, {
  ju_FormatFlagsConversionMismatchException: 1,
  ju_IllegalFormatException: 1,
  jl_IllegalArgumentException: 1,
  jl_RuntimeException: 1,
  jl_Exception: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.ju_FormatFlagsConversionMismatchException.prototype.$classData = ScalaJS.d.ju_FormatFlagsConversionMismatchException;
/** @constructor */
ScalaJS.c.ju_IllegalFormatFlagsException = (function() {
  ScalaJS.c.ju_IllegalFormatException.call(this);
  this.flags$6 = null
});
ScalaJS.c.ju_IllegalFormatFlagsException.prototype = new ScalaJS.h.ju_IllegalFormatException();
ScalaJS.c.ju_IllegalFormatFlagsException.prototype.constructor = ScalaJS.c.ju_IllegalFormatFlagsException;
/** @constructor */
ScalaJS.h.ju_IllegalFormatFlagsException = (function() {
  /*<skip>*/
});
ScalaJS.h.ju_IllegalFormatFlagsException.prototype = ScalaJS.c.ju_IllegalFormatFlagsException.prototype;
ScalaJS.c.ju_IllegalFormatFlagsException.prototype.init___ = (function() {
  ScalaJS.c.ju_IllegalFormatException.prototype.init___.call(this);
  this.flags$6 = null;
  return this
});
ScalaJS.c.ju_IllegalFormatFlagsException.prototype.getMessage__T = (function() {
  return (("Flags = '" + this.flags$6) + "'")
});
ScalaJS.c.ju_IllegalFormatFlagsException.prototype.init___T = (function(f) {
  ScalaJS.c.ju_IllegalFormatFlagsException.prototype.init___.call(this);
  if ((f === null)) {
    throw new ScalaJS.c.jl_NullPointerException().init___()
  };
  this.flags$6 = f;
  return this
});
ScalaJS.is.ju_IllegalFormatFlagsException = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.ju_IllegalFormatFlagsException)))
});
ScalaJS.as.ju_IllegalFormatFlagsException = (function(obj) {
  return ((ScalaJS.is.ju_IllegalFormatFlagsException(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.util.IllegalFormatFlagsException"))
});
ScalaJS.isArrayOf.ju_IllegalFormatFlagsException = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.ju_IllegalFormatFlagsException)))
});
ScalaJS.asArrayOf.ju_IllegalFormatFlagsException = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.ju_IllegalFormatFlagsException(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.util.IllegalFormatFlagsException;", depth))
});
ScalaJS.d.ju_IllegalFormatFlagsException = new ScalaJS.ClassTypeData({
  ju_IllegalFormatFlagsException: 0
}, false, "java.util.IllegalFormatFlagsException", ScalaJS.d.ju_IllegalFormatException, {
  ju_IllegalFormatFlagsException: 1,
  ju_IllegalFormatException: 1,
  jl_IllegalArgumentException: 1,
  jl_RuntimeException: 1,
  jl_Exception: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.ju_IllegalFormatFlagsException.prototype.$classData = ScalaJS.d.ju_IllegalFormatFlagsException;
/** @constructor */
ScalaJS.c.ju_MissingFormatArgumentException = (function() {
  ScalaJS.c.ju_IllegalFormatException.call(this);
  this.s$6 = null
});
ScalaJS.c.ju_MissingFormatArgumentException.prototype = new ScalaJS.h.ju_IllegalFormatException();
ScalaJS.c.ju_MissingFormatArgumentException.prototype.constructor = ScalaJS.c.ju_MissingFormatArgumentException;
/** @constructor */
ScalaJS.h.ju_MissingFormatArgumentException = (function() {
  /*<skip>*/
});
ScalaJS.h.ju_MissingFormatArgumentException.prototype = ScalaJS.c.ju_MissingFormatArgumentException.prototype;
ScalaJS.c.ju_MissingFormatArgumentException.prototype.init___ = (function() {
  ScalaJS.c.ju_IllegalFormatException.prototype.init___.call(this);
  this.s$6 = null;
  return this
});
ScalaJS.c.ju_MissingFormatArgumentException.prototype.getMessage__T = (function() {
  return (("Format specifier '" + this.s$6) + "'")
});
ScalaJS.c.ju_MissingFormatArgumentException.prototype.init___T = (function(s) {
  ScalaJS.c.ju_MissingFormatArgumentException.prototype.init___.call(this);
  if ((s === null)) {
    throw new ScalaJS.c.jl_NullPointerException().init___()
  };
  this.s$6 = s;
  return this
});
ScalaJS.is.ju_MissingFormatArgumentException = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.ju_MissingFormatArgumentException)))
});
ScalaJS.as.ju_MissingFormatArgumentException = (function(obj) {
  return ((ScalaJS.is.ju_MissingFormatArgumentException(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "java.util.MissingFormatArgumentException"))
});
ScalaJS.isArrayOf.ju_MissingFormatArgumentException = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.ju_MissingFormatArgumentException)))
});
ScalaJS.asArrayOf.ju_MissingFormatArgumentException = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.ju_MissingFormatArgumentException(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Ljava.util.MissingFormatArgumentException;", depth))
});
ScalaJS.d.ju_MissingFormatArgumentException = new ScalaJS.ClassTypeData({
  ju_MissingFormatArgumentException: 0
}, false, "java.util.MissingFormatArgumentException", ScalaJS.d.ju_IllegalFormatException, {
  ju_MissingFormatArgumentException: 1,
  ju_IllegalFormatException: 1,
  jl_IllegalArgumentException: 1,
  jl_RuntimeException: 1,
  jl_Exception: 1,
  jl_Throwable: 1,
  Ljava_io_Serializable: 1,
  O: 1
});
ScalaJS.c.ju_MissingFormatArgumentException.prototype.$classData = ScalaJS.d.ju_MissingFormatArgumentException;
ScalaJS.is.sci_HashMap$HashMap1 = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_HashMap$HashMap1)))
});
ScalaJS.as.sci_HashMap$HashMap1 = (function(obj) {
  return ((ScalaJS.is.sci_HashMap$HashMap1(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.HashMap$HashMap1"))
});
ScalaJS.isArrayOf.sci_HashMap$HashMap1 = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_HashMap$HashMap1)))
});
ScalaJS.asArrayOf.sci_HashMap$HashMap1 = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_HashMap$HashMap1(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.HashMap$HashMap1;", depth))
});
ScalaJS.d.sci_HashMap$HashMap1 = new ScalaJS.ClassTypeData({
  sci_HashMap$HashMap1: 0
}, false, "scala.collection.immutable.HashMap$HashMap1", ScalaJS.d.sci_HashMap, {
  sci_HashMap$HashMap1: 1,
  sci_HashMap: 1,
  sc_CustomParallelizable: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sci_AbstractMap: 1,
  sci_Map: 1,
  sci_MapLike: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractMap: 1,
  sc_Map: 1,
  sc_MapLike: 1,
  scg_Subtractable: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_GenMap: 1,
  sc_GenMapLike: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.is.sci_HashMap$HashTrieMap = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.sci_HashMap$HashTrieMap)))
});
ScalaJS.as.sci_HashMap$HashTrieMap = (function(obj) {
  return ((ScalaJS.is.sci_HashMap$HashTrieMap(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.immutable.HashMap$HashTrieMap"))
});
ScalaJS.isArrayOf.sci_HashMap$HashTrieMap = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.sci_HashMap$HashTrieMap)))
});
ScalaJS.asArrayOf.sci_HashMap$HashTrieMap = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.sci_HashMap$HashTrieMap(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.immutable.HashMap$HashTrieMap;", depth))
});
ScalaJS.d.sci_HashMap$HashTrieMap = new ScalaJS.ClassTypeData({
  sci_HashMap$HashTrieMap: 0
}, false, "scala.collection.immutable.HashMap$HashTrieMap", ScalaJS.d.sci_HashMap, {
  sci_HashMap$HashTrieMap: 1,
  sci_HashMap: 1,
  sc_CustomParallelizable: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sci_AbstractMap: 1,
  sci_Map: 1,
  sci_MapLike: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractMap: 1,
  sc_Map: 1,
  sc_MapLike: 1,
  scg_Subtractable: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_GenMap: 1,
  sc_GenMapLike: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
/** @constructor */
ScalaJS.c.scm_ArrayBuffer = (function() {
  ScalaJS.c.scm_AbstractBuffer.call(this);
  this.initialSize$6 = 0;
  this.array$6 = null;
  this.size0$6 = 0
});
ScalaJS.c.scm_ArrayBuffer.prototype = new ScalaJS.h.scm_AbstractBuffer();
ScalaJS.c.scm_ArrayBuffer.prototype.constructor = ScalaJS.c.scm_ArrayBuffer;
/** @constructor */
ScalaJS.h.scm_ArrayBuffer = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_ArrayBuffer.prototype = ScalaJS.c.scm_ArrayBuffer.prototype;
ScalaJS.c.scm_ArrayBuffer.prototype.seq__sc_TraversableOnce = (function() {
  return this
});
ScalaJS.c.scm_ArrayBuffer.prototype.init___ = (function() {
  return (ScalaJS.c.scm_ArrayBuffer.prototype.init___I.call(this, 16), this)
});
ScalaJS.c.scm_ArrayBuffer.prototype.$$plus$eq__O__scm_ArrayBuffer = (function(elem) {
  var n = ((this.size0$6 + 1) | 0);
  ScalaJS.i.scm_ResizableArray$class__ensureSize__scm_ResizableArray__I__V(this, n);
  this.array$6.u[this.size0$6] = elem;
  this.size0$6 = ((this.size0$6 + 1) | 0);
  return this
});
ScalaJS.c.scm_ArrayBuffer.prototype.apply__I__O = (function(idx) {
  return ScalaJS.i.scm_ResizableArray$class__apply__scm_ResizableArray__I__O(this, idx)
});
ScalaJS.c.scm_ArrayBuffer.prototype.lengthCompare__I__I = (function(len) {
  return ScalaJS.i.sc_IndexedSeqOptimized$class__lengthCompare__sc_IndexedSeqOptimized__I__I(this, len)
});
ScalaJS.c.scm_ArrayBuffer.prototype.apply__O__O = (function(v1) {
  var idx = ScalaJS.uI(v1);
  return ScalaJS.i.scm_ResizableArray$class__apply__scm_ResizableArray__I__O(this, idx)
});
ScalaJS.c.scm_ArrayBuffer.prototype.sameElements__sc_GenIterable__Z = (function(that) {
  return ScalaJS.i.sc_IndexedSeqOptimized$class__sameElements__sc_IndexedSeqOptimized__sc_GenIterable__Z(this, that)
});
ScalaJS.c.scm_ArrayBuffer.prototype.isEmpty__Z = (function() {
  return ScalaJS.i.sc_IndexedSeqOptimized$class__isEmpty__sc_IndexedSeqOptimized__Z(this)
});
ScalaJS.c.scm_ArrayBuffer.prototype.thisCollection__sc_Traversable = (function() {
  return ScalaJS.i.scm_IndexedSeqLike$class__thisCollection__scm_IndexedSeqLike__scm_IndexedSeq(this)
});
ScalaJS.c.scm_ArrayBuffer.prototype.$$plus$eq__O__scg_Growable = (function(elem) {
  return this.$$plus$eq__O__scm_ArrayBuffer(elem)
});
ScalaJS.c.scm_ArrayBuffer.prototype.companion__scg_GenericCompanion = (function() {
  return ScalaJS.m.scm_ArrayBuffer()
});
ScalaJS.c.scm_ArrayBuffer.prototype.foreach__F1__V = (function(f) {
  ScalaJS.i.scm_ResizableArray$class__foreach__scm_ResizableArray__F1__V(this, f)
});
ScalaJS.c.scm_ArrayBuffer.prototype.foldLeft__O__F2__O = (function(z, op) {
  var start = 0;
  var end = this.size0$6;
  var z$1 = z;
  tailCallLoop: while (true) {
    if ((start === end)) {
      return z$1
    } else {
      var temp$start = ((start + 1) | 0);
      var jsx$1 = z$1;
      var idx = start;
      var temp$z = op.apply__O__O__O(jsx$1, ScalaJS.i.scm_ResizableArray$class__apply__scm_ResizableArray__I__O(this, idx));
      start = temp$start;
      z$1 = temp$z;
      continue tailCallLoop
    }
  }
});
ScalaJS.c.scm_ArrayBuffer.prototype.toBuffer__scm_Buffer = (function() {
  return ScalaJS.i.sc_IndexedSeqLike$class__toBuffer__sc_IndexedSeqLike__scm_Buffer(this)
});
ScalaJS.c.scm_ArrayBuffer.prototype.result__O = (function() {
  return this
});
ScalaJS.c.scm_ArrayBuffer.prototype.seq__scm_Seq = (function() {
  return this
});
ScalaJS.c.scm_ArrayBuffer.prototype.iterator__sc_Iterator = (function() {
  return new ScalaJS.c.sc_IndexedSeqLike$Elements().init___sc_IndexedSeqLike__I__I(this, 0, this.size0$6)
});
ScalaJS.c.scm_ArrayBuffer.prototype.init___I = (function(initialSize) {
  this.initialSize$6 = initialSize;
  ScalaJS.i.scm_ResizableArray$class__$init$__scm_ResizableArray__V(this);
  return this
});
ScalaJS.c.scm_ArrayBuffer.prototype.sizeHintBounded__I__sc_TraversableLike__V = (function(size, boundingColl) {
  ScalaJS.i.scm_Builder$class__sizeHintBounded__scm_Builder__I__sc_TraversableLike__V(this, size, boundingColl)
});
ScalaJS.c.scm_ArrayBuffer.prototype.seq__sc_Seq = (function() {
  return this
});
ScalaJS.c.scm_ArrayBuffer.prototype.length__I = (function() {
  return this.size0$6
});
ScalaJS.c.scm_ArrayBuffer.prototype.$$plus$plus$eq__sc_TraversableOnce__scm_ArrayBuffer = (function(xs) {
  if (ScalaJS.is.sc_IndexedSeqLike(xs)) {
    var x2 = ScalaJS.as.sc_IndexedSeqLike(xs);
    var n = x2.length__I();
    var n$1 = ((this.size0$6 + n) | 0);
    ScalaJS.i.scm_ResizableArray$class__ensureSize__scm_ResizableArray__I__V(this, n$1);
    x2.copyToArray__O__I__I__V(this.array$6, this.size0$6, n);
    this.size0$6 = ((this.size0$6 + n) | 0);
    return this
  } else {
    return ScalaJS.as.scm_ArrayBuffer(ScalaJS.i.scg_Growable$class__$plus$plus$eq__scg_Growable__sc_TraversableOnce__scg_Growable(this, xs))
  }
});
ScalaJS.c.scm_ArrayBuffer.prototype.$$plus$eq__O__scm_Builder = (function(elem) {
  return this.$$plus$eq__O__scm_ArrayBuffer(elem)
});
ScalaJS.c.scm_ArrayBuffer.prototype.copyToArray__O__I__I__V = (function(xs, start, len) {
  ScalaJS.i.scm_ResizableArray$class__copyToArray__scm_ResizableArray__O__I__I__V(this, xs, start, len)
});
ScalaJS.c.scm_ArrayBuffer.prototype.hashCode__I = (function() {
  return ScalaJS.m.s_util_hashing_MurmurHash3().seqHash__sc_Seq__I(this)
});
ScalaJS.c.scm_ArrayBuffer.prototype.sizeHint__I__V = (function(len) {
  if (((len > this.size0$6) && (len >= 1))) {
    var newarray = ScalaJS.newArrayObject(ScalaJS.d.O.getArrayOf(), [len]);
    var src = this.array$6;
    var length = this.size0$6;
    ScalaJS.systemArraycopy(src, 0, newarray, 0, length);
    this.array$6 = newarray
  }
});
ScalaJS.c.scm_ArrayBuffer.prototype.$$plus$plus$eq__sc_TraversableOnce__scg_Growable = (function(xs) {
  return this.$$plus$plus$eq__sc_TraversableOnce__scm_ArrayBuffer(xs)
});
ScalaJS.c.scm_ArrayBuffer.prototype.stringPrefix__T = (function() {
  return "ArrayBuffer"
});
ScalaJS.is.scm_ArrayBuffer = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_ArrayBuffer)))
});
ScalaJS.as.scm_ArrayBuffer = (function(obj) {
  return ((ScalaJS.is.scm_ArrayBuffer(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.ArrayBuffer"))
});
ScalaJS.isArrayOf.scm_ArrayBuffer = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_ArrayBuffer)))
});
ScalaJS.asArrayOf.scm_ArrayBuffer = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_ArrayBuffer(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.ArrayBuffer;", depth))
});
ScalaJS.d.scm_ArrayBuffer = new ScalaJS.ClassTypeData({
  scm_ArrayBuffer: 0
}, false, "scala.collection.mutable.ArrayBuffer", ScalaJS.d.scm_AbstractBuffer, {
  scm_ArrayBuffer: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  sc_CustomParallelizable: 1,
  scm_ResizableArray: 1,
  scm_IndexedSeq: 1,
  sc_IndexedSeq: 1,
  scm_Builder: 1,
  scm_IndexedSeqOptimized: 1,
  sc_IndexedSeqOptimized: 1,
  scm_IndexedSeqLike: 1,
  sc_IndexedSeqLike: 1,
  scm_AbstractBuffer: 1,
  scm_Buffer: 1,
  scm_BufferLike: 1,
  scg_Subtractable: 1,
  sc_script_Scriptable: 1,
  scg_Shrinkable: 1,
  scg_Growable: 1,
  scg_Clearable: 1,
  scm_AbstractSeq: 1,
  scm_Seq: 1,
  scm_SeqLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  scm_Iterable: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.scm_ArrayBuffer.prototype.$classData = ScalaJS.d.scm_ArrayBuffer;
/** @constructor */
ScalaJS.c.scm_ListBuffer = (function() {
  ScalaJS.c.scm_AbstractBuffer.call(this);
  this.scala$collection$mutable$ListBuffer$$start$6 = null;
  this.last0$6 = null;
  this.exported$6 = false;
  this.len$6 = 0
});
ScalaJS.c.scm_ListBuffer.prototype = new ScalaJS.h.scm_AbstractBuffer();
ScalaJS.c.scm_ListBuffer.prototype.constructor = ScalaJS.c.scm_ListBuffer;
/** @constructor */
ScalaJS.h.scm_ListBuffer = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_ListBuffer.prototype = ScalaJS.c.scm_ListBuffer.prototype;
ScalaJS.c.scm_ListBuffer.prototype.copyToArray__O__I__V = (function(xs, start) {
  var this$1 = this.scala$collection$mutable$ListBuffer$$start$6;
  ScalaJS.i.sc_TraversableOnce$class__copyToArray__sc_TraversableOnce__O__I__V(this$1, xs, start)
});
ScalaJS.c.scm_ListBuffer.prototype.copy__p6__V = (function() {
  var cursor = this.scala$collection$mutable$ListBuffer$$start$6;
  var this$1 = this.last0$6;
  var limit = this$1.tl$5;
  this.clear__V();
  while ((cursor !== limit)) {
    this.$$plus$eq__O__scm_ListBuffer(cursor.head__O());
    cursor = ScalaJS.as.sci_List(cursor.tail__O())
  }
});
ScalaJS.c.scm_ListBuffer.prototype.init___ = (function() {
  this.scala$collection$mutable$ListBuffer$$start$6 = ScalaJS.m.sci_Nil();
  this.exported$6 = false;
  this.len$6 = 0;
  return this
});
ScalaJS.c.scm_ListBuffer.prototype.apply__I__O = (function(n) {
  if (((n < 0) || (n >= this.len$6))) {
    throw new ScalaJS.c.jl_IndexOutOfBoundsException().init___T(ScalaJS.objectToString(n))
  } else {
    var this$1 = this.scala$collection$mutable$ListBuffer$$start$6;
    return ScalaJS.i.sc_LinearSeqOptimized$class__apply__sc_LinearSeqOptimized__I__O(this$1, n)
  }
});
ScalaJS.c.scm_ListBuffer.prototype.lengthCompare__I__I = (function(len) {
  var this$1 = this.scala$collection$mutable$ListBuffer$$start$6;
  return ScalaJS.i.sc_LinearSeqOptimized$class__lengthCompare__sc_LinearSeqOptimized__I__I(this$1, len)
});
ScalaJS.c.scm_ListBuffer.prototype.sameElements__sc_GenIterable__Z = (function(that) {
  var this$1 = this.scala$collection$mutable$ListBuffer$$start$6;
  return ScalaJS.i.sc_LinearSeqOptimized$class__sameElements__sc_LinearSeqOptimized__sc_GenIterable__Z(this$1, that)
});
ScalaJS.c.scm_ListBuffer.prototype.apply__O__O = (function(v1) {
  return this.apply__I__O(ScalaJS.uI(v1))
});
ScalaJS.c.scm_ListBuffer.prototype.isEmpty__Z = (function() {
  return this.scala$collection$mutable$ListBuffer$$start$6.isEmpty__Z()
});
ScalaJS.c.scm_ListBuffer.prototype.toList__sci_List = (function() {
  this.exported$6 = (!this.scala$collection$mutable$ListBuffer$$start$6.isEmpty__Z());
  return this.scala$collection$mutable$ListBuffer$$start$6
});
ScalaJS.c.scm_ListBuffer.prototype.thisCollection__sc_Traversable = (function() {
  return ScalaJS.i.sc_SeqLike$class__thisCollection__sc_SeqLike__sc_Seq(this)
});
ScalaJS.c.scm_ListBuffer.prototype.equals__O__Z = (function(that) {
  if (ScalaJS.is.scm_ListBuffer(that)) {
    var x2 = ScalaJS.as.scm_ListBuffer(that);
    return this.scala$collection$mutable$ListBuffer$$start$6.equals__O__Z(x2.scala$collection$mutable$ListBuffer$$start$6)
  } else {
    return ScalaJS.i.sc_GenSeqLike$class__equals__sc_GenSeqLike__O__Z(this, that)
  }
});
ScalaJS.c.scm_ListBuffer.prototype.mkString__T__T__T__T = (function(start, sep, end) {
  var this$1 = this.scala$collection$mutable$ListBuffer$$start$6;
  return ScalaJS.i.sc_TraversableOnce$class__mkString__sc_TraversableOnce__T__T__T__T(this$1, start, sep, end)
});
ScalaJS.c.scm_ListBuffer.prototype.$$plus$eq__O__scg_Growable = (function(elem) {
  return this.$$plus$eq__O__scm_ListBuffer(elem)
});
ScalaJS.c.scm_ListBuffer.prototype.companion__scg_GenericCompanion = (function() {
  return ScalaJS.m.scm_ListBuffer()
});
ScalaJS.c.scm_ListBuffer.prototype.foreach__F1__V = (function(f) {
  var this$1 = this.scala$collection$mutable$ListBuffer$$start$6;
  var these = this$1;
  while ((!these.isEmpty__Z())) {
    f.apply__O__O(these.head__O());
    these = ScalaJS.as.sci_List(these.tail__O())
  }
});
ScalaJS.c.scm_ListBuffer.prototype.foldLeft__O__F2__O = (function(z, op) {
  var this$1 = this.scala$collection$mutable$ListBuffer$$start$6;
  return ScalaJS.i.sc_LinearSeqOptimized$class__foldLeft__sc_LinearSeqOptimized__O__F2__O(this$1, z, op)
});
ScalaJS.c.scm_ListBuffer.prototype.toBuffer__scm_Buffer = (function() {
  var this$1 = this.scala$collection$mutable$ListBuffer$$start$6;
  return ScalaJS.i.sc_TraversableOnce$class__toBuffer__sc_TraversableOnce__scm_Buffer(this$1)
});
ScalaJS.c.scm_ListBuffer.prototype.size__I = (function() {
  return this.len$6
});
ScalaJS.c.scm_ListBuffer.prototype.result__O = (function() {
  return this.toList__sci_List()
});
ScalaJS.c.scm_ListBuffer.prototype.iterator__sc_Iterator = (function() {
  return new ScalaJS.c.scm_ListBuffer$$anon$1().init___scm_ListBuffer(this)
});
ScalaJS.c.scm_ListBuffer.prototype.sizeHintBounded__I__sc_TraversableLike__V = (function(size, boundingColl) {
  ScalaJS.i.scm_Builder$class__sizeHintBounded__scm_Builder__I__sc_TraversableLike__V(this, size, boundingColl)
});
ScalaJS.c.scm_ListBuffer.prototype.length__I = (function() {
  return this.len$6
});
ScalaJS.c.scm_ListBuffer.prototype.seq__sc_Seq = (function() {
  return this
});
ScalaJS.c.scm_ListBuffer.prototype.toStream__sci_Stream = (function() {
  return this.scala$collection$mutable$ListBuffer$$start$6.toStream__sci_Stream()
});
ScalaJS.c.scm_ListBuffer.prototype.addString__scm_StringBuilder__T__T__T__scm_StringBuilder = (function(b, start, sep, end) {
  var this$1 = this.scala$collection$mutable$ListBuffer$$start$6;
  return ScalaJS.i.sc_TraversableOnce$class__addString__sc_TraversableOnce__scm_StringBuilder__T__T__T__scm_StringBuilder(this$1, b, start, sep, end)
});
ScalaJS.c.scm_ListBuffer.prototype.$$plus$eq__O__scm_ListBuffer = (function(x) {
  if (this.exported$6) {
    this.copy__p6__V()
  };
  if (this.scala$collection$mutable$ListBuffer$$start$6.isEmpty__Z()) {
    this.last0$6 = new ScalaJS.c.sci_$colon$colon().init___O__sci_List(x, ScalaJS.m.sci_Nil());
    this.scala$collection$mutable$ListBuffer$$start$6 = this.last0$6
  } else {
    var last1 = this.last0$6;
    this.last0$6 = new ScalaJS.c.sci_$colon$colon().init___O__sci_List(x, ScalaJS.m.sci_Nil());
    last1.tl$5 = this.last0$6
  };
  this.len$6 = ((this.len$6 + 1) | 0);
  return this
});
ScalaJS.c.scm_ListBuffer.prototype.$$div$colon__O__F2__O = (function(z, op) {
  var this$1 = this.scala$collection$mutable$ListBuffer$$start$6;
  return ScalaJS.i.sc_LinearSeqOptimized$class__foldLeft__sc_LinearSeqOptimized__O__F2__O(this$1, z, op)
});
ScalaJS.c.scm_ListBuffer.prototype.$$plus$eq__O__scm_Builder = (function(elem) {
  return this.$$plus$eq__O__scm_ListBuffer(elem)
});
ScalaJS.c.scm_ListBuffer.prototype.sizeHint__I__V = (function(size) {
  /*<skip>*/
});
ScalaJS.c.scm_ListBuffer.prototype.copyToArray__O__I__I__V = (function(xs, start, len) {
  var this$1 = this.scala$collection$mutable$ListBuffer$$start$6;
  ScalaJS.i.sc_IterableLike$class__copyToArray__sc_IterableLike__O__I__I__V(this$1, xs, start, len)
});
ScalaJS.c.scm_ListBuffer.prototype.clear__V = (function() {
  this.scala$collection$mutable$ListBuffer$$start$6 = ScalaJS.m.sci_Nil();
  this.exported$6 = false;
  this.len$6 = 0
});
ScalaJS.c.scm_ListBuffer.prototype.toArray__s_reflect_ClassTag__O = (function(evidence$1) {
  var this$1 = this.scala$collection$mutable$ListBuffer$$start$6;
  return ScalaJS.i.sc_TraversableOnce$class__toArray__sc_TraversableOnce__s_reflect_ClassTag__O(this$1, evidence$1)
});
ScalaJS.c.scm_ListBuffer.prototype.$$plus$plus$eq__sc_TraversableOnce__scm_ListBuffer = (function(xs) {
  tailCallLoop: while (true) {
    if ((xs === this)) {
      var n = this.len$6;
      xs = ScalaJS.as.sc_TraversableOnce(ScalaJS.i.sc_IterableLike$class__take__sc_IterableLike__I__O(this, n));
      continue tailCallLoop
    } else {
      return ScalaJS.as.scm_ListBuffer(ScalaJS.i.scg_Growable$class__$plus$plus$eq__scg_Growable__sc_TraversableOnce__scg_Growable(this, xs))
    }
  }
});
ScalaJS.c.scm_ListBuffer.prototype.$$plus$plus$eq__sc_TraversableOnce__scg_Growable = (function(xs) {
  return this.$$plus$plus$eq__sc_TraversableOnce__scm_ListBuffer(xs)
});
ScalaJS.c.scm_ListBuffer.prototype.stringPrefix__T = (function() {
  return "ListBuffer"
});
ScalaJS.is.scm_ListBuffer = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_ListBuffer)))
});
ScalaJS.as.scm_ListBuffer = (function(obj) {
  return ((ScalaJS.is.scm_ListBuffer(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.ListBuffer"))
});
ScalaJS.isArrayOf.scm_ListBuffer = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_ListBuffer)))
});
ScalaJS.asArrayOf.scm_ListBuffer = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_ListBuffer(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.ListBuffer;", depth))
});
ScalaJS.d.scm_ListBuffer = new ScalaJS.ClassTypeData({
  scm_ListBuffer: 0
}, false, "scala.collection.mutable.ListBuffer", ScalaJS.d.scm_AbstractBuffer, {
  scm_ListBuffer: 1,
  Ljava_io_Serializable: 1,
  scg_SeqForwarder: 1,
  scg_IterableForwarder: 1,
  scg_TraversableForwarder: 1,
  scm_Builder: 1,
  scm_AbstractBuffer: 1,
  scm_Buffer: 1,
  scm_BufferLike: 1,
  scg_Subtractable: 1,
  sc_script_Scriptable: 1,
  scg_Shrinkable: 1,
  scg_Growable: 1,
  scg_Clearable: 1,
  scm_AbstractSeq: 1,
  scm_Seq: 1,
  scm_SeqLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  scm_Iterable: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.scm_ListBuffer.prototype.$classData = ScalaJS.d.scm_ListBuffer;
/** @constructor */
ScalaJS.c.scm_WrappedArray$ofBoolean = (function() {
  ScalaJS.c.scm_WrappedArray.call(this);
  this.array$6 = null
});
ScalaJS.c.scm_WrappedArray$ofBoolean.prototype = new ScalaJS.h.scm_WrappedArray();
ScalaJS.c.scm_WrappedArray$ofBoolean.prototype.constructor = ScalaJS.c.scm_WrappedArray$ofBoolean;
/** @constructor */
ScalaJS.h.scm_WrappedArray$ofBoolean = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_WrappedArray$ofBoolean.prototype = ScalaJS.c.scm_WrappedArray$ofBoolean.prototype;
ScalaJS.c.scm_WrappedArray$ofBoolean.prototype.apply__I__O = (function(index) {
  return this.apply$mcZI$sp__I__Z(index)
});
ScalaJS.c.scm_WrappedArray$ofBoolean.prototype.apply__O__O = (function(v1) {
  var index = ScalaJS.uI(v1);
  return this.apply$mcZI$sp__I__Z(index)
});
ScalaJS.c.scm_WrappedArray$ofBoolean.prototype.update__I__O__V = (function(index, elem) {
  this.update__I__Z__V(index, ScalaJS.uZ(elem))
});
ScalaJS.c.scm_WrappedArray$ofBoolean.prototype.apply$mcZI$sp__I__Z = (function(index) {
  return this.array$6.u[index]
});
ScalaJS.c.scm_WrappedArray$ofBoolean.prototype.length__I = (function() {
  return this.array$6.u["length"]
});
ScalaJS.c.scm_WrappedArray$ofBoolean.prototype.update__I__Z__V = (function(index, elem) {
  this.array$6.u[index] = elem
});
ScalaJS.c.scm_WrappedArray$ofBoolean.prototype.elemTag__s_reflect_ClassTag = (function() {
  return ScalaJS.m.s_reflect_ClassTag().Boolean$1
});
ScalaJS.c.scm_WrappedArray$ofBoolean.prototype.init___AZ = (function(array) {
  this.array$6 = array;
  return this
});
ScalaJS.c.scm_WrappedArray$ofBoolean.prototype.array__O = (function() {
  return this.array$6
});
ScalaJS.is.scm_WrappedArray$ofBoolean = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_WrappedArray$ofBoolean)))
});
ScalaJS.as.scm_WrappedArray$ofBoolean = (function(obj) {
  return ((ScalaJS.is.scm_WrappedArray$ofBoolean(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.WrappedArray$ofBoolean"))
});
ScalaJS.isArrayOf.scm_WrappedArray$ofBoolean = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_WrappedArray$ofBoolean)))
});
ScalaJS.asArrayOf.scm_WrappedArray$ofBoolean = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_WrappedArray$ofBoolean(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.WrappedArray$ofBoolean;", depth))
});
ScalaJS.d.scm_WrappedArray$ofBoolean = new ScalaJS.ClassTypeData({
  scm_WrappedArray$ofBoolean: 0
}, false, "scala.collection.mutable.WrappedArray$ofBoolean", ScalaJS.d.scm_WrappedArray, {
  scm_WrappedArray$ofBoolean: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  scm_WrappedArray: 1,
  sc_CustomParallelizable: 1,
  scm_ArrayLike: 1,
  scm_IndexedSeqOptimized: 1,
  sc_IndexedSeqOptimized: 1,
  scm_IndexedSeq: 1,
  scm_IndexedSeqLike: 1,
  sc_IndexedSeq: 1,
  sc_IndexedSeqLike: 1,
  scm_AbstractSeq: 1,
  scm_Seq: 1,
  scm_SeqLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  scm_Iterable: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.scm_WrappedArray$ofBoolean.prototype.$classData = ScalaJS.d.scm_WrappedArray$ofBoolean;
/** @constructor */
ScalaJS.c.scm_WrappedArray$ofByte = (function() {
  ScalaJS.c.scm_WrappedArray.call(this);
  this.array$6 = null
});
ScalaJS.c.scm_WrappedArray$ofByte.prototype = new ScalaJS.h.scm_WrappedArray();
ScalaJS.c.scm_WrappedArray$ofByte.prototype.constructor = ScalaJS.c.scm_WrappedArray$ofByte;
/** @constructor */
ScalaJS.h.scm_WrappedArray$ofByte = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_WrappedArray$ofByte.prototype = ScalaJS.c.scm_WrappedArray$ofByte.prototype;
ScalaJS.c.scm_WrappedArray$ofByte.prototype.apply__I__O = (function(index) {
  return this.apply__I__B(index)
});
ScalaJS.c.scm_WrappedArray$ofByte.prototype.apply__O__O = (function(v1) {
  return this.apply__I__B(ScalaJS.uI(v1))
});
ScalaJS.c.scm_WrappedArray$ofByte.prototype.update__I__O__V = (function(index, elem) {
  this.update__I__B__V(index, ScalaJS.uB(elem))
});
ScalaJS.c.scm_WrappedArray$ofByte.prototype.apply__I__B = (function(index) {
  return this.array$6.u[index]
});
ScalaJS.c.scm_WrappedArray$ofByte.prototype.length__I = (function() {
  return this.array$6.u["length"]
});
ScalaJS.c.scm_WrappedArray$ofByte.prototype.elemTag__s_reflect_ClassTag = (function() {
  return ScalaJS.m.s_reflect_ClassTag().Byte$1
});
ScalaJS.c.scm_WrappedArray$ofByte.prototype.array__O = (function() {
  return this.array$6
});
ScalaJS.c.scm_WrappedArray$ofByte.prototype.init___AB = (function(array) {
  this.array$6 = array;
  return this
});
ScalaJS.c.scm_WrappedArray$ofByte.prototype.update__I__B__V = (function(index, elem) {
  this.array$6.u[index] = elem
});
ScalaJS.is.scm_WrappedArray$ofByte = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_WrappedArray$ofByte)))
});
ScalaJS.as.scm_WrappedArray$ofByte = (function(obj) {
  return ((ScalaJS.is.scm_WrappedArray$ofByte(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.WrappedArray$ofByte"))
});
ScalaJS.isArrayOf.scm_WrappedArray$ofByte = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_WrappedArray$ofByte)))
});
ScalaJS.asArrayOf.scm_WrappedArray$ofByte = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_WrappedArray$ofByte(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.WrappedArray$ofByte;", depth))
});
ScalaJS.d.scm_WrappedArray$ofByte = new ScalaJS.ClassTypeData({
  scm_WrappedArray$ofByte: 0
}, false, "scala.collection.mutable.WrappedArray$ofByte", ScalaJS.d.scm_WrappedArray, {
  scm_WrappedArray$ofByte: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  scm_WrappedArray: 1,
  sc_CustomParallelizable: 1,
  scm_ArrayLike: 1,
  scm_IndexedSeqOptimized: 1,
  sc_IndexedSeqOptimized: 1,
  scm_IndexedSeq: 1,
  scm_IndexedSeqLike: 1,
  sc_IndexedSeq: 1,
  sc_IndexedSeqLike: 1,
  scm_AbstractSeq: 1,
  scm_Seq: 1,
  scm_SeqLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  scm_Iterable: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.scm_WrappedArray$ofByte.prototype.$classData = ScalaJS.d.scm_WrappedArray$ofByte;
/** @constructor */
ScalaJS.c.scm_WrappedArray$ofChar = (function() {
  ScalaJS.c.scm_WrappedArray.call(this);
  this.array$6 = null
});
ScalaJS.c.scm_WrappedArray$ofChar.prototype = new ScalaJS.h.scm_WrappedArray();
ScalaJS.c.scm_WrappedArray$ofChar.prototype.constructor = ScalaJS.c.scm_WrappedArray$ofChar;
/** @constructor */
ScalaJS.h.scm_WrappedArray$ofChar = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_WrappedArray$ofChar.prototype = ScalaJS.c.scm_WrappedArray$ofChar.prototype;
ScalaJS.c.scm_WrappedArray$ofChar.prototype.apply__I__O = (function(index) {
  return ScalaJS.bC(this.apply__I__C(index))
});
ScalaJS.c.scm_WrappedArray$ofChar.prototype.apply__O__O = (function(v1) {
  return ScalaJS.bC(this.apply__I__C(ScalaJS.uI(v1)))
});
ScalaJS.c.scm_WrappedArray$ofChar.prototype.update__I__O__V = (function(index, elem) {
  this.update__I__C__V(index, ScalaJS.uC(elem))
});
ScalaJS.c.scm_WrappedArray$ofChar.prototype.apply__I__C = (function(index) {
  return this.array$6.u[index]
});
ScalaJS.c.scm_WrappedArray$ofChar.prototype.update__I__C__V = (function(index, elem) {
  this.array$6.u[index] = elem
});
ScalaJS.c.scm_WrappedArray$ofChar.prototype.init___AC = (function(array) {
  this.array$6 = array;
  return this
});
ScalaJS.c.scm_WrappedArray$ofChar.prototype.length__I = (function() {
  return this.array$6.u["length"]
});
ScalaJS.c.scm_WrappedArray$ofChar.prototype.elemTag__s_reflect_ClassTag = (function() {
  return ScalaJS.m.s_reflect_ClassTag().Char$1
});
ScalaJS.c.scm_WrappedArray$ofChar.prototype.array__O = (function() {
  return this.array$6
});
ScalaJS.is.scm_WrappedArray$ofChar = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_WrappedArray$ofChar)))
});
ScalaJS.as.scm_WrappedArray$ofChar = (function(obj) {
  return ((ScalaJS.is.scm_WrappedArray$ofChar(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.WrappedArray$ofChar"))
});
ScalaJS.isArrayOf.scm_WrappedArray$ofChar = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_WrappedArray$ofChar)))
});
ScalaJS.asArrayOf.scm_WrappedArray$ofChar = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_WrappedArray$ofChar(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.WrappedArray$ofChar;", depth))
});
ScalaJS.d.scm_WrappedArray$ofChar = new ScalaJS.ClassTypeData({
  scm_WrappedArray$ofChar: 0
}, false, "scala.collection.mutable.WrappedArray$ofChar", ScalaJS.d.scm_WrappedArray, {
  scm_WrappedArray$ofChar: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  scm_WrappedArray: 1,
  sc_CustomParallelizable: 1,
  scm_ArrayLike: 1,
  scm_IndexedSeqOptimized: 1,
  sc_IndexedSeqOptimized: 1,
  scm_IndexedSeq: 1,
  scm_IndexedSeqLike: 1,
  sc_IndexedSeq: 1,
  sc_IndexedSeqLike: 1,
  scm_AbstractSeq: 1,
  scm_Seq: 1,
  scm_SeqLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  scm_Iterable: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.scm_WrappedArray$ofChar.prototype.$classData = ScalaJS.d.scm_WrappedArray$ofChar;
/** @constructor */
ScalaJS.c.scm_WrappedArray$ofDouble = (function() {
  ScalaJS.c.scm_WrappedArray.call(this);
  this.array$6 = null
});
ScalaJS.c.scm_WrappedArray$ofDouble.prototype = new ScalaJS.h.scm_WrappedArray();
ScalaJS.c.scm_WrappedArray$ofDouble.prototype.constructor = ScalaJS.c.scm_WrappedArray$ofDouble;
/** @constructor */
ScalaJS.h.scm_WrappedArray$ofDouble = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_WrappedArray$ofDouble.prototype = ScalaJS.c.scm_WrappedArray$ofDouble.prototype;
ScalaJS.c.scm_WrappedArray$ofDouble.prototype.apply__I__O = (function(index) {
  return this.apply$mcDI$sp__I__D(index)
});
ScalaJS.c.scm_WrappedArray$ofDouble.prototype.apply__O__O = (function(v1) {
  var index = ScalaJS.uI(v1);
  return this.apply$mcDI$sp__I__D(index)
});
ScalaJS.c.scm_WrappedArray$ofDouble.prototype.update__I__O__V = (function(index, elem) {
  this.update__I__D__V(index, ScalaJS.uD(elem))
});
ScalaJS.c.scm_WrappedArray$ofDouble.prototype.init___AD = (function(array) {
  this.array$6 = array;
  return this
});
ScalaJS.c.scm_WrappedArray$ofDouble.prototype.length__I = (function() {
  return this.array$6.u["length"]
});
ScalaJS.c.scm_WrappedArray$ofDouble.prototype.update__I__D__V = (function(index, elem) {
  this.array$6.u[index] = elem
});
ScalaJS.c.scm_WrappedArray$ofDouble.prototype.elemTag__s_reflect_ClassTag = (function() {
  return ScalaJS.m.s_reflect_ClassTag().Double$1
});
ScalaJS.c.scm_WrappedArray$ofDouble.prototype.array__O = (function() {
  return this.array$6
});
ScalaJS.c.scm_WrappedArray$ofDouble.prototype.apply$mcDI$sp__I__D = (function(index) {
  return this.array$6.u[index]
});
ScalaJS.is.scm_WrappedArray$ofDouble = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_WrappedArray$ofDouble)))
});
ScalaJS.as.scm_WrappedArray$ofDouble = (function(obj) {
  return ((ScalaJS.is.scm_WrappedArray$ofDouble(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.WrappedArray$ofDouble"))
});
ScalaJS.isArrayOf.scm_WrappedArray$ofDouble = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_WrappedArray$ofDouble)))
});
ScalaJS.asArrayOf.scm_WrappedArray$ofDouble = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_WrappedArray$ofDouble(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.WrappedArray$ofDouble;", depth))
});
ScalaJS.d.scm_WrappedArray$ofDouble = new ScalaJS.ClassTypeData({
  scm_WrappedArray$ofDouble: 0
}, false, "scala.collection.mutable.WrappedArray$ofDouble", ScalaJS.d.scm_WrappedArray, {
  scm_WrappedArray$ofDouble: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  scm_WrappedArray: 1,
  sc_CustomParallelizable: 1,
  scm_ArrayLike: 1,
  scm_IndexedSeqOptimized: 1,
  sc_IndexedSeqOptimized: 1,
  scm_IndexedSeq: 1,
  scm_IndexedSeqLike: 1,
  sc_IndexedSeq: 1,
  sc_IndexedSeqLike: 1,
  scm_AbstractSeq: 1,
  scm_Seq: 1,
  scm_SeqLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  scm_Iterable: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.scm_WrappedArray$ofDouble.prototype.$classData = ScalaJS.d.scm_WrappedArray$ofDouble;
/** @constructor */
ScalaJS.c.scm_WrappedArray$ofFloat = (function() {
  ScalaJS.c.scm_WrappedArray.call(this);
  this.array$6 = null
});
ScalaJS.c.scm_WrappedArray$ofFloat.prototype = new ScalaJS.h.scm_WrappedArray();
ScalaJS.c.scm_WrappedArray$ofFloat.prototype.constructor = ScalaJS.c.scm_WrappedArray$ofFloat;
/** @constructor */
ScalaJS.h.scm_WrappedArray$ofFloat = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_WrappedArray$ofFloat.prototype = ScalaJS.c.scm_WrappedArray$ofFloat.prototype;
ScalaJS.c.scm_WrappedArray$ofFloat.prototype.apply__I__O = (function(index) {
  return this.apply$mcFI$sp__I__F(index)
});
ScalaJS.c.scm_WrappedArray$ofFloat.prototype.apply__O__O = (function(v1) {
  var index = ScalaJS.uI(v1);
  return this.apply$mcFI$sp__I__F(index)
});
ScalaJS.c.scm_WrappedArray$ofFloat.prototype.update__I__O__V = (function(index, elem) {
  this.update__I__F__V(index, ScalaJS.uF(elem))
});
ScalaJS.c.scm_WrappedArray$ofFloat.prototype.init___AF = (function(array) {
  this.array$6 = array;
  return this
});
ScalaJS.c.scm_WrappedArray$ofFloat.prototype.apply$mcFI$sp__I__F = (function(index) {
  return this.array$6.u[index]
});
ScalaJS.c.scm_WrappedArray$ofFloat.prototype.length__I = (function() {
  return this.array$6.u["length"]
});
ScalaJS.c.scm_WrappedArray$ofFloat.prototype.update__I__F__V = (function(index, elem) {
  this.array$6.u[index] = elem
});
ScalaJS.c.scm_WrappedArray$ofFloat.prototype.elemTag__s_reflect_ClassTag = (function() {
  return ScalaJS.m.s_reflect_ClassTag().Float$1
});
ScalaJS.c.scm_WrappedArray$ofFloat.prototype.array__O = (function() {
  return this.array$6
});
ScalaJS.is.scm_WrappedArray$ofFloat = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_WrappedArray$ofFloat)))
});
ScalaJS.as.scm_WrappedArray$ofFloat = (function(obj) {
  return ((ScalaJS.is.scm_WrappedArray$ofFloat(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.WrappedArray$ofFloat"))
});
ScalaJS.isArrayOf.scm_WrappedArray$ofFloat = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_WrappedArray$ofFloat)))
});
ScalaJS.asArrayOf.scm_WrappedArray$ofFloat = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_WrappedArray$ofFloat(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.WrappedArray$ofFloat;", depth))
});
ScalaJS.d.scm_WrappedArray$ofFloat = new ScalaJS.ClassTypeData({
  scm_WrappedArray$ofFloat: 0
}, false, "scala.collection.mutable.WrappedArray$ofFloat", ScalaJS.d.scm_WrappedArray, {
  scm_WrappedArray$ofFloat: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  scm_WrappedArray: 1,
  sc_CustomParallelizable: 1,
  scm_ArrayLike: 1,
  scm_IndexedSeqOptimized: 1,
  sc_IndexedSeqOptimized: 1,
  scm_IndexedSeq: 1,
  scm_IndexedSeqLike: 1,
  sc_IndexedSeq: 1,
  sc_IndexedSeqLike: 1,
  scm_AbstractSeq: 1,
  scm_Seq: 1,
  scm_SeqLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  scm_Iterable: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.scm_WrappedArray$ofFloat.prototype.$classData = ScalaJS.d.scm_WrappedArray$ofFloat;
/** @constructor */
ScalaJS.c.scm_WrappedArray$ofInt = (function() {
  ScalaJS.c.scm_WrappedArray.call(this);
  this.array$6 = null
});
ScalaJS.c.scm_WrappedArray$ofInt.prototype = new ScalaJS.h.scm_WrappedArray();
ScalaJS.c.scm_WrappedArray$ofInt.prototype.constructor = ScalaJS.c.scm_WrappedArray$ofInt;
/** @constructor */
ScalaJS.h.scm_WrappedArray$ofInt = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_WrappedArray$ofInt.prototype = ScalaJS.c.scm_WrappedArray$ofInt.prototype;
ScalaJS.c.scm_WrappedArray$ofInt.prototype.apply__I__O = (function(index) {
  return this.apply$mcII$sp__I__I(index)
});
ScalaJS.c.scm_WrappedArray$ofInt.prototype.apply__O__O = (function(v1) {
  var index = ScalaJS.uI(v1);
  return this.apply$mcII$sp__I__I(index)
});
ScalaJS.c.scm_WrappedArray$ofInt.prototype.update__I__O__V = (function(index, elem) {
  this.update__I__I__V(index, ScalaJS.uI(elem))
});
ScalaJS.c.scm_WrappedArray$ofInt.prototype.update__I__I__V = (function(index, elem) {
  this.array$6.u[index] = elem
});
ScalaJS.c.scm_WrappedArray$ofInt.prototype.apply$mcII$sp__I__I = (function(index) {
  return this.array$6.u[index]
});
ScalaJS.c.scm_WrappedArray$ofInt.prototype.init___AI = (function(array) {
  this.array$6 = array;
  return this
});
ScalaJS.c.scm_WrappedArray$ofInt.prototype.length__I = (function() {
  return this.array$6.u["length"]
});
ScalaJS.c.scm_WrappedArray$ofInt.prototype.elemTag__s_reflect_ClassTag = (function() {
  return ScalaJS.m.s_reflect_ClassTag().Int$1
});
ScalaJS.c.scm_WrappedArray$ofInt.prototype.array__O = (function() {
  return this.array$6
});
ScalaJS.is.scm_WrappedArray$ofInt = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_WrappedArray$ofInt)))
});
ScalaJS.as.scm_WrappedArray$ofInt = (function(obj) {
  return ((ScalaJS.is.scm_WrappedArray$ofInt(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.WrappedArray$ofInt"))
});
ScalaJS.isArrayOf.scm_WrappedArray$ofInt = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_WrappedArray$ofInt)))
});
ScalaJS.asArrayOf.scm_WrappedArray$ofInt = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_WrappedArray$ofInt(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.WrappedArray$ofInt;", depth))
});
ScalaJS.d.scm_WrappedArray$ofInt = new ScalaJS.ClassTypeData({
  scm_WrappedArray$ofInt: 0
}, false, "scala.collection.mutable.WrappedArray$ofInt", ScalaJS.d.scm_WrappedArray, {
  scm_WrappedArray$ofInt: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  scm_WrappedArray: 1,
  sc_CustomParallelizable: 1,
  scm_ArrayLike: 1,
  scm_IndexedSeqOptimized: 1,
  sc_IndexedSeqOptimized: 1,
  scm_IndexedSeq: 1,
  scm_IndexedSeqLike: 1,
  sc_IndexedSeq: 1,
  sc_IndexedSeqLike: 1,
  scm_AbstractSeq: 1,
  scm_Seq: 1,
  scm_SeqLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  scm_Iterable: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.scm_WrappedArray$ofInt.prototype.$classData = ScalaJS.d.scm_WrappedArray$ofInt;
/** @constructor */
ScalaJS.c.scm_WrappedArray$ofLong = (function() {
  ScalaJS.c.scm_WrappedArray.call(this);
  this.array$6 = null
});
ScalaJS.c.scm_WrappedArray$ofLong.prototype = new ScalaJS.h.scm_WrappedArray();
ScalaJS.c.scm_WrappedArray$ofLong.prototype.constructor = ScalaJS.c.scm_WrappedArray$ofLong;
/** @constructor */
ScalaJS.h.scm_WrappedArray$ofLong = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_WrappedArray$ofLong.prototype = ScalaJS.c.scm_WrappedArray$ofLong.prototype;
ScalaJS.c.scm_WrappedArray$ofLong.prototype.apply__I__O = (function(index) {
  return this.apply$mcJI$sp__I__J(index)
});
ScalaJS.c.scm_WrappedArray$ofLong.prototype.apply__O__O = (function(v1) {
  var index = ScalaJS.uI(v1);
  return this.apply$mcJI$sp__I__J(index)
});
ScalaJS.c.scm_WrappedArray$ofLong.prototype.init___AJ = (function(array) {
  this.array$6 = array;
  return this
});
ScalaJS.c.scm_WrappedArray$ofLong.prototype.update__I__O__V = (function(index, elem) {
  this.update__I__J__V(index, ScalaJS.uJ(elem))
});
ScalaJS.c.scm_WrappedArray$ofLong.prototype.length__I = (function() {
  return this.array$6.u["length"]
});
ScalaJS.c.scm_WrappedArray$ofLong.prototype.update__I__J__V = (function(index, elem) {
  this.array$6.u[index] = elem
});
ScalaJS.c.scm_WrappedArray$ofLong.prototype.elemTag__s_reflect_ClassTag = (function() {
  return ScalaJS.m.s_reflect_ClassTag().Long$1
});
ScalaJS.c.scm_WrappedArray$ofLong.prototype.array__O = (function() {
  return this.array$6
});
ScalaJS.c.scm_WrappedArray$ofLong.prototype.apply$mcJI$sp__I__J = (function(index) {
  return this.array$6.u[index]
});
ScalaJS.is.scm_WrappedArray$ofLong = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_WrappedArray$ofLong)))
});
ScalaJS.as.scm_WrappedArray$ofLong = (function(obj) {
  return ((ScalaJS.is.scm_WrappedArray$ofLong(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.WrappedArray$ofLong"))
});
ScalaJS.isArrayOf.scm_WrappedArray$ofLong = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_WrappedArray$ofLong)))
});
ScalaJS.asArrayOf.scm_WrappedArray$ofLong = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_WrappedArray$ofLong(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.WrappedArray$ofLong;", depth))
});
ScalaJS.d.scm_WrappedArray$ofLong = new ScalaJS.ClassTypeData({
  scm_WrappedArray$ofLong: 0
}, false, "scala.collection.mutable.WrappedArray$ofLong", ScalaJS.d.scm_WrappedArray, {
  scm_WrappedArray$ofLong: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  scm_WrappedArray: 1,
  sc_CustomParallelizable: 1,
  scm_ArrayLike: 1,
  scm_IndexedSeqOptimized: 1,
  sc_IndexedSeqOptimized: 1,
  scm_IndexedSeq: 1,
  scm_IndexedSeqLike: 1,
  sc_IndexedSeq: 1,
  sc_IndexedSeqLike: 1,
  scm_AbstractSeq: 1,
  scm_Seq: 1,
  scm_SeqLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  scm_Iterable: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.scm_WrappedArray$ofLong.prototype.$classData = ScalaJS.d.scm_WrappedArray$ofLong;
/** @constructor */
ScalaJS.c.scm_WrappedArray$ofRef = (function() {
  ScalaJS.c.scm_WrappedArray.call(this);
  this.array$6 = null;
  this.elemTag$6 = null;
  this.bitmap$0$6 = false
});
ScalaJS.c.scm_WrappedArray$ofRef.prototype = new ScalaJS.h.scm_WrappedArray();
ScalaJS.c.scm_WrappedArray$ofRef.prototype.constructor = ScalaJS.c.scm_WrappedArray$ofRef;
/** @constructor */
ScalaJS.h.scm_WrappedArray$ofRef = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_WrappedArray$ofRef.prototype = ScalaJS.c.scm_WrappedArray$ofRef.prototype;
ScalaJS.c.scm_WrappedArray$ofRef.prototype.apply__O__O = (function(v1) {
  return this.apply__I__O(ScalaJS.uI(v1))
});
ScalaJS.c.scm_WrappedArray$ofRef.prototype.apply__I__O = (function(index) {
  return this.array$6.u[index]
});
ScalaJS.c.scm_WrappedArray$ofRef.prototype.update__I__O__V = (function(index, elem) {
  this.array$6.u[index] = elem
});
ScalaJS.c.scm_WrappedArray$ofRef.prototype.elemTag$lzycompute__p6__s_reflect_ClassTag = (function() {
  if ((!this.bitmap$0$6)) {
    this.elemTag$6 = ScalaJS.m.s_reflect_ClassTag().apply__jl_Class__s_reflect_ClassTag(ScalaJS.m.sr_ScalaRunTime().arrayElementClass__O__jl_Class(ScalaJS.objectGetClass(this.array$6)));
    this.bitmap$0$6 = true
  };
  return this.elemTag$6
});
ScalaJS.c.scm_WrappedArray$ofRef.prototype.init___AO = (function(array) {
  this.array$6 = array;
  return this
});
ScalaJS.c.scm_WrappedArray$ofRef.prototype.length__I = (function() {
  return this.array$6.u["length"]
});
ScalaJS.c.scm_WrappedArray$ofRef.prototype.elemTag__s_reflect_ClassTag = (function() {
  return ((!this.bitmap$0$6) ? this.elemTag$lzycompute__p6__s_reflect_ClassTag() : this.elemTag$6)
});
ScalaJS.c.scm_WrappedArray$ofRef.prototype.array__O = (function() {
  return this.array$6
});
ScalaJS.is.scm_WrappedArray$ofRef = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_WrappedArray$ofRef)))
});
ScalaJS.as.scm_WrappedArray$ofRef = (function(obj) {
  return ((ScalaJS.is.scm_WrappedArray$ofRef(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.WrappedArray$ofRef"))
});
ScalaJS.isArrayOf.scm_WrappedArray$ofRef = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_WrappedArray$ofRef)))
});
ScalaJS.asArrayOf.scm_WrappedArray$ofRef = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_WrappedArray$ofRef(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.WrappedArray$ofRef;", depth))
});
ScalaJS.d.scm_WrappedArray$ofRef = new ScalaJS.ClassTypeData({
  scm_WrappedArray$ofRef: 0
}, false, "scala.collection.mutable.WrappedArray$ofRef", ScalaJS.d.scm_WrappedArray, {
  scm_WrappedArray$ofRef: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  scm_WrappedArray: 1,
  sc_CustomParallelizable: 1,
  scm_ArrayLike: 1,
  scm_IndexedSeqOptimized: 1,
  sc_IndexedSeqOptimized: 1,
  scm_IndexedSeq: 1,
  scm_IndexedSeqLike: 1,
  sc_IndexedSeq: 1,
  sc_IndexedSeqLike: 1,
  scm_AbstractSeq: 1,
  scm_Seq: 1,
  scm_SeqLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  scm_Iterable: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.scm_WrappedArray$ofRef.prototype.$classData = ScalaJS.d.scm_WrappedArray$ofRef;
/** @constructor */
ScalaJS.c.scm_WrappedArray$ofShort = (function() {
  ScalaJS.c.scm_WrappedArray.call(this);
  this.array$6 = null
});
ScalaJS.c.scm_WrappedArray$ofShort.prototype = new ScalaJS.h.scm_WrappedArray();
ScalaJS.c.scm_WrappedArray$ofShort.prototype.constructor = ScalaJS.c.scm_WrappedArray$ofShort;
/** @constructor */
ScalaJS.h.scm_WrappedArray$ofShort = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_WrappedArray$ofShort.prototype = ScalaJS.c.scm_WrappedArray$ofShort.prototype;
ScalaJS.c.scm_WrappedArray$ofShort.prototype.apply__I__O = (function(index) {
  return this.apply__I__S(index)
});
ScalaJS.c.scm_WrappedArray$ofShort.prototype.apply__O__O = (function(v1) {
  return this.apply__I__S(ScalaJS.uI(v1))
});
ScalaJS.c.scm_WrappedArray$ofShort.prototype.init___AS = (function(array) {
  this.array$6 = array;
  return this
});
ScalaJS.c.scm_WrappedArray$ofShort.prototype.update__I__O__V = (function(index, elem) {
  this.update__I__S__V(index, ScalaJS.uS(elem))
});
ScalaJS.c.scm_WrappedArray$ofShort.prototype.update__I__S__V = (function(index, elem) {
  this.array$6.u[index] = elem
});
ScalaJS.c.scm_WrappedArray$ofShort.prototype.length__I = (function() {
  return this.array$6.u["length"]
});
ScalaJS.c.scm_WrappedArray$ofShort.prototype.elemTag__s_reflect_ClassTag = (function() {
  return ScalaJS.m.s_reflect_ClassTag().Short$1
});
ScalaJS.c.scm_WrappedArray$ofShort.prototype.array__O = (function() {
  return this.array$6
});
ScalaJS.c.scm_WrappedArray$ofShort.prototype.apply__I__S = (function(index) {
  return this.array$6.u[index]
});
ScalaJS.is.scm_WrappedArray$ofShort = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_WrappedArray$ofShort)))
});
ScalaJS.as.scm_WrappedArray$ofShort = (function(obj) {
  return ((ScalaJS.is.scm_WrappedArray$ofShort(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.WrappedArray$ofShort"))
});
ScalaJS.isArrayOf.scm_WrappedArray$ofShort = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_WrappedArray$ofShort)))
});
ScalaJS.asArrayOf.scm_WrappedArray$ofShort = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_WrappedArray$ofShort(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.WrappedArray$ofShort;", depth))
});
ScalaJS.d.scm_WrappedArray$ofShort = new ScalaJS.ClassTypeData({
  scm_WrappedArray$ofShort: 0
}, false, "scala.collection.mutable.WrappedArray$ofShort", ScalaJS.d.scm_WrappedArray, {
  scm_WrappedArray$ofShort: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  scm_WrappedArray: 1,
  sc_CustomParallelizable: 1,
  scm_ArrayLike: 1,
  scm_IndexedSeqOptimized: 1,
  sc_IndexedSeqOptimized: 1,
  scm_IndexedSeq: 1,
  scm_IndexedSeqLike: 1,
  sc_IndexedSeq: 1,
  sc_IndexedSeqLike: 1,
  scm_AbstractSeq: 1,
  scm_Seq: 1,
  scm_SeqLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  scm_Iterable: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.scm_WrappedArray$ofShort.prototype.$classData = ScalaJS.d.scm_WrappedArray$ofShort;
/** @constructor */
ScalaJS.c.scm_WrappedArray$ofUnit = (function() {
  ScalaJS.c.scm_WrappedArray.call(this);
  this.array$6 = null
});
ScalaJS.c.scm_WrappedArray$ofUnit.prototype = new ScalaJS.h.scm_WrappedArray();
ScalaJS.c.scm_WrappedArray$ofUnit.prototype.constructor = ScalaJS.c.scm_WrappedArray$ofUnit;
/** @constructor */
ScalaJS.h.scm_WrappedArray$ofUnit = (function() {
  /*<skip>*/
});
ScalaJS.h.scm_WrappedArray$ofUnit.prototype = ScalaJS.c.scm_WrappedArray$ofUnit.prototype;
ScalaJS.c.scm_WrappedArray$ofUnit.prototype.apply__I__O = (function(index) {
  return (this.apply$mcVI$sp__I__V(index), (void 0))
});
ScalaJS.c.scm_WrappedArray$ofUnit.prototype.apply__O__O = (function(v1) {
  var index = ScalaJS.uI(v1);
  this.apply$mcVI$sp__I__V(index)
});
ScalaJS.c.scm_WrappedArray$ofUnit.prototype.apply$mcVI$sp__I__V = (function(index) {
  this.array$6.u[index]
});
ScalaJS.c.scm_WrappedArray$ofUnit.prototype.update__I__O__V = (function(index, elem) {
  this.update__I__sr_BoxedUnit__V(index, ScalaJS.asUnit(elem))
});
ScalaJS.c.scm_WrappedArray$ofUnit.prototype.length__I = (function() {
  return this.array$6.u["length"]
});
ScalaJS.c.scm_WrappedArray$ofUnit.prototype.init___Asr_BoxedUnit = (function(array) {
  this.array$6 = array;
  return this
});
ScalaJS.c.scm_WrappedArray$ofUnit.prototype.elemTag__s_reflect_ClassTag = (function() {
  return ScalaJS.m.s_reflect_ClassTag().Unit$1
});
ScalaJS.c.scm_WrappedArray$ofUnit.prototype.array__O = (function() {
  return this.array$6
});
ScalaJS.c.scm_WrappedArray$ofUnit.prototype.update__I__sr_BoxedUnit__V = (function(index, elem) {
  this.array$6.u[index] = elem
});
ScalaJS.is.scm_WrappedArray$ofUnit = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.scm_WrappedArray$ofUnit)))
});
ScalaJS.as.scm_WrappedArray$ofUnit = (function(obj) {
  return ((ScalaJS.is.scm_WrappedArray$ofUnit(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.collection.mutable.WrappedArray$ofUnit"))
});
ScalaJS.isArrayOf.scm_WrappedArray$ofUnit = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.scm_WrappedArray$ofUnit)))
});
ScalaJS.asArrayOf.scm_WrappedArray$ofUnit = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.scm_WrappedArray$ofUnit(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.collection.mutable.WrappedArray$ofUnit;", depth))
});
ScalaJS.d.scm_WrappedArray$ofUnit = new ScalaJS.ClassTypeData({
  scm_WrappedArray$ofUnit: 0
}, false, "scala.collection.mutable.WrappedArray$ofUnit", ScalaJS.d.scm_WrappedArray, {
  scm_WrappedArray$ofUnit: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  scm_WrappedArray: 1,
  sc_CustomParallelizable: 1,
  scm_ArrayLike: 1,
  scm_IndexedSeqOptimized: 1,
  sc_IndexedSeqOptimized: 1,
  scm_IndexedSeq: 1,
  scm_IndexedSeqLike: 1,
  sc_IndexedSeq: 1,
  sc_IndexedSeqLike: 1,
  scm_AbstractSeq: 1,
  scm_Seq: 1,
  scm_SeqLike: 1,
  scm_Cloneable: 1,
  s_Cloneable: 1,
  jl_Cloneable: 1,
  scm_Iterable: 1,
  scm_Traversable: 1,
  s_Mutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
ScalaJS.c.scm_WrappedArray$ofUnit.prototype.$classData = ScalaJS.d.scm_WrappedArray$ofUnit;
ScalaJS.is.s_xml_Atom = (function(obj) {
  return (!(!((obj && obj.$classData) && obj.$classData.ancestors.s_xml_Atom)))
});
ScalaJS.as.s_xml_Atom = (function(obj) {
  return ((ScalaJS.is.s_xml_Atom(obj) || (obj === null)) ? obj : ScalaJS.throwClassCastException(obj, "scala.xml.Atom"))
});
ScalaJS.isArrayOf.s_xml_Atom = (function(obj, depth) {
  return (!(!(((obj && obj.$classData) && (obj.$classData.arrayDepth === depth)) && obj.$classData.arrayBase.ancestors.s_xml_Atom)))
});
ScalaJS.asArrayOf.s_xml_Atom = (function(obj, depth) {
  return ((ScalaJS.isArrayOf.s_xml_Atom(obj, depth) || (obj === null)) ? obj : ScalaJS.throwArrayCastException(obj, "Lscala.xml.Atom;", depth))
});
ScalaJS.d.s_xml_Atom = new ScalaJS.ClassTypeData({
  s_xml_Atom: 0
}, false, "scala.xml.Atom", ScalaJS.d.s_xml_SpecialNode, {
  s_xml_Atom: 1,
  s_Serializable: 1,
  Ljava_io_Serializable: 1,
  s_xml_SpecialNode: 1,
  s_xml_pull_XMLEvent: 1,
  s_xml_Node: 1,
  s_xml_NodeSeq: 1,
  s_xml_Equality: 1,
  sci_Seq: 1,
  sci_Iterable: 1,
  sci_Traversable: 1,
  s_Immutable: 1,
  sc_AbstractSeq: 1,
  sc_Seq: 1,
  sc_SeqLike: 1,
  sc_GenSeq: 1,
  sc_GenSeqLike: 1,
  s_PartialFunction: 1,
  F1: 1,
  sc_AbstractIterable: 1,
  sc_Iterable: 1,
  sc_IterableLike: 1,
  s_Equals: 1,
  sc_GenIterable: 1,
  sc_GenIterableLike: 1,
  sc_AbstractTraversable: 1,
  sc_Traversable: 1,
  sc_GenTraversable: 1,
  scg_GenericTraversableTemplate: 1,
  sc_TraversableLike: 1,
  sc_GenTraversableLike: 1,
  sc_Parallelizable: 1,
  sc_TraversableOnce: 1,
  sc_GenTraversableOnce: 1,
  scg_FilterMonadic: 1,
  scg_HasNewBuilder: 1,
  O: 1
});
//# sourceMappingURL=application-fastopt.js.map
