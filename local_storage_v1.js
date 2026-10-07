// Legacy best-effort storage contract; failures are counted without keys or values.
(function(host){
  'use strict';
  function failed(operation,error){host.NRDiagnostics?.record('storage.'+operation,'recoverable',error);}
  function get(key,fallback=''){
    try{return localStorage.getItem(key)??fallback;}
    catch(error){ globalThis.NRDiagnostics?.record('catch.318','recoverable'); failed('read',error);return fallback;}
  }
  function set(key,value){
    try{localStorage.setItem(key,value);}
    catch(error){ globalThis.NRDiagnostics?.record('catch.319','recoverable'); failed('write',error);}
  }
  function remove(key){
    try{localStorage.removeItem(key);}
    catch(error){ globalThis.NRDiagnostics?.record('catch.320','recoverable'); failed('remove',error);}
  }
  host.NRStorage=Object.freeze({get,set,remove});
})(window);
