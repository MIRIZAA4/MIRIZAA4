const fs=require('fs');
const {Document,Packer,Paragraph,TextRun,AlignmentType,PageBreak,Footer,PageNumber,HeadingLevel,Header}=require('docx');
const ch=JSON.parse(fs.readFileSync('build/book.json','utf8'));
const FONT='David';
const run=(t,o={})=>new TextRun({text:t,font:FONT,rightToLeft:true,size:o.size||25,sizeComplexScript:o.size||25,bold:o.bold,boldComplexScript:o.bold,italics:o.italics,italicsComplexScript:o.italics});
const P=(children,o={})=>new Paragraph({children,bidirectional:true,alignment:o.align||AlignmentType.JUSTIFIED,spacing:{line:o.line||336,before:o.before||0,after:o.after||0},indent:o.indent,heading:o.heading,pageBreakBefore:o.pbb,keepNext:o.keepNext});
const kids=[];
// title page
kids.push(P([run('',{})],{align:AlignmentType.CENTER,before:2400}));
kids.push(P([run('כתר מן הים',{size:60,bold:true})],{align:AlignmentType.CENTER,after:400}));
kids.push(P([run('',{size:32})],{align:AlignmentType.CENTER,after:1600}));
kids.push(P([run('"הנותן בים דרך, ובמים עזים נתיבה"',{size:26,italics:true})],{align:AlignmentType.CENTER}));
kids.push(P([run('(ישעיהו מ"ג)',{size:22})],{align:AlignmentType.CENTER}));
// TOC
kids.push(P([run('תוכן העניינים',{size:34,bold:true})],{align:AlignmentType.CENTER,pbb:true,after:300}));
for(const c of ch){
  if(c.gate) kids.push(P([run(c.gate,{size:26,bold:true})],{align:AlignmentType.RIGHT,before:200,after:80}));
  kids.push(P([run(`פרק ${c.num} — ${c.title}`,{size:23})],{align:AlignmentType.RIGHT,line:280}));
}
for(const c of ch){
  if(c.gate){
    const [g1,g2]=c.gate.split('—').map(s=>s.trim());
    kids.push(P([run(g1,{size:36,bold:true})],{align:AlignmentType.CENTER,pbb:true,before:3600,after:200}));
    kids.push(P([run(g2||'',{size:48,bold:true})],{align:AlignmentType.CENTER}));
  }
  kids.push(P([run(`פרק ${c.num}`,{size:28})],{align:AlignmentType.CENTER,pbb:true,before:1400,after:120,heading:HeadingLevel.HEADING_1,keepNext:true}));
  kids.push(P([run(c.title,{size:40,bold:true})],{align:AlignmentType.CENTER,after:600,keepNext:true}));
  let first=true;
  for(const [k,t] of c.blocks){
    if(k==='sep'){kids.push(P([run('*   *   *',{size:24})],{align:AlignmentType.CENTER,before:240,after:240}));first=true;continue;}
    if(k==='place'){kids.push(P([run(t,{size:22,italics:true})],{align:AlignmentType.RIGHT,after:160,keepNext:true}));first=true;continue;}
    if(k==='end'){kids.push(P([run(t,{size:32,bold:true})],{align:AlignmentType.CENTER,before:600}));continue;}
    kids.push(P([run(t)],{indent:first?undefined:{firstLine:340}}));
    first=false;
  }
}
const footer=new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,bidirectional:true,children:[new TextRun({children:[PageNumber.CURRENT],font:FONT,size:20})]})]});
const doc=new Document({
  creator:'',title:'כתר מן הים',
  styles:{default:{document:{run:{font:FONT,size:25,rightToLeft:true}}},
    paragraphStyles:[{id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:FONT,size:28,color:'000000'},paragraph:{outlineLevel:0}}]},
  sections:[{properties:{page:{size:{width:8220,height:12190},margin:{top:1000,bottom:1000,left:900,right:900,gutter:200,footer:500}},bidi:true},footers:{default:footer},children:kids}]
});
Packer.toBuffer(doc).then(b=>{fs.writeFileSync('כתר_מן_הים.docx',b);console.log('written',b.length)});
