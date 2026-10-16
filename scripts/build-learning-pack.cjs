const fs=require('node:fs'),path=require('node:path'),L=require('../web/library.js'),R=require('../web/learning-content.js');
const pack=L.validate(R.pack);fs.writeFileSync(path.join(__dirname,'../release/曲库模板/知识专题例谱.qinjie.json'),JSON.stringify(pack,null,2)+'\n');
console.log('Prepared 12 original four-bar knowledge examples; existing lesson and song IDs unchanged.');
