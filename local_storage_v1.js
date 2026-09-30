// Legacy best-effort storage contract; failures are counted without keys or values.
(function(host){
  'use strict';
  function failed(operation,error){host.NRDiagnostics?.record('storage.'+operation,'recoverable',error);}
  function get(key,fallback=''){
    try{return localStorage.getItem(key)??fallback;}
    catch(error){failed('read',error);return fallback;}
  }
  function set(key,value){
    try{localStorage.setItem(key,value);}
    catch(error){failed('write',error);}
  }
  function remove(key){
    try{localStorage.removeItem(key);}
    catch(error){failed('remove',error);}
  }
  host.NRStorage=Object.freeze({get,set,remove});
})(window);
