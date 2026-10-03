const fs=require('fs'),path=require('path');
const names=["mobile_navigation_v1.js", "product_shell_v1.js", "onboarding_v1.js", "local_telemetry_v1.js", "decision_journal_v1.js", "audit_copy_v1.js"];
module.exports=function(root){let html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const name of names){const tag='src="./'+name+'"';if(!html.includes(tag))throw Error('Missing runtime module '+name);html=html.replace(new RegExp('(<script[^>]*src="\\./'+name.replaceAll('.','\\.')+'"[^>]*>)(</script>)'),(_,a,b)=>a+fs.readFileSync(path.join(root,name),'utf8')+b)}return html};
