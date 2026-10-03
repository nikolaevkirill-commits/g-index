const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'../..'),{build}=require('../../tools/build_core_runtime.cjs');
const norm=s=>s.replaceAll('\r\n','\n');assert.equal(norm(build(root)),norm(fs.readFileSync(path.join(root,'core_runtime_v1.js'),'utf8')));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'nr-core-test-'));
try{
 fs.cpSync(path.join(root,'src'),path.join(temp,'src'),{recursive:true});fs.mkdirSync(path.join(temp,'tools'));fs.copyFileSync(path.join(root,'tools/build_core_runtime.cjs'),path.join(temp,'tools/build_core_runtime.cjs'));fs.copyFileSync(path.join(root,'core_runtime_v1.js'),path.join(temp,'core_runtime_v1.js'));
 const file=path.join(temp,'src/legacy_core/bootstrap.js'),original=fs.readFileSync(file,'utf8'),marker=original.match(/\/\* NR_FN_SLOT \d{3} \*\//)[0];
 fs.writeFileSync(file,original+marker);assert.throws(()=>build(temp),/repeated/);
 fs.writeFileSync(file,original.replace(marker,''));assert.throws(()=>build(temp),/Unused/);
 fs.writeFileSync(file,original+'\n// unexpected change');const result=spawnSync(process.execPath,[path.join(temp,'tools/build_core_runtime.cjs')],{encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,/differs from source modules/);
 fs.writeFileSync(file,original);const views=path.join(temp,'src/legacy_core/views.js');fs.appendFileSync(views,'\nthrow Error("unmapped code");');assert.throws(()=>build(temp),/Unmapped/);
 const report={status:'PASS',checks:['exact reconstruction','duplicate slot rejected','missing slot rejected','bundle drift rejected by command','unmapped execution rejected']};fs.writeFileSync(path.join(__dirname,'CORE_BUNDLE_RESULTS.json'),JSON.stringify(report,null,2));console.log('PASS core module integrity');
}finally{const resolved=path.resolve(temp);assert(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('nr-core-test-'));fs.rmSync(resolved,{recursive:true,force:true})}
