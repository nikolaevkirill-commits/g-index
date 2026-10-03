// The browser receives one classic script. Reassembly preserves declaration
// hoisting, lexical scope and side-effect order of the reviewed legacy core.
const fs=require('fs'),path=require('path');
function build(root){
 const dir=path.join(root,'src/legacy_core'),functions=new Map();
 for(const name of ['views','authority','data','calculations','interaction_helpers']){
  const text=fs.readFileSync(path.join(dir,name+'.js'),'utf8');
  let cursor=0;
  for(const m of text.matchAll(/\/\* NR_FN_BEGIN (\d{3}) \*\/([\s\S]*?)\/\* NR_FN_END \1 \*\//g)){
   if(text.slice(cursor,m.index).trim()||functions.has(m[1]))throw Error('Unexpected source or duplicate function '+name);
   functions.set(m[1],m[2]);cursor=m.index+m[0].length;
  }
  if(text.slice(cursor).trim())throw Error('Unmapped source '+name);
 }
 const bootstrap=fs.readFileSync(path.join(dir,'bootstrap.js'),'utf8'),used=new Set();
 const output=bootstrap.replace(/\/\* NR_FN_SLOT (\d{3}) \*\//g,(_,id)=>{
  if(!functions.has(id)||used.has(id))throw Error('Missing or repeated function slot '+id);
  used.add(id);return functions.get(id);
 });
 if(used.size!==functions.size||!used.size)throw Error('Unused functions or empty core');
 return output;
}
if(require.main===module){const root=path.resolve(__dirname,'..'),file=path.join(root,'core_runtime_v1.js'),output=build(root);
 if(process.argv.includes('--write'))fs.writeFileSync(file,output);
 else if(output.replaceAll('\r\n','\n')!==fs.readFileSync(file,'utf8').replaceAll('\r\n','\n'))throw Error('Core bundle differs from source modules. Rebuild explicitly, then run regressions.');
 console.log('PASS deterministic core reconstruction');
}
module.exports={build};
