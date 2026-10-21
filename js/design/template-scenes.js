/* Prisma Studio — composições autorais reutilizadas na página e nas miniaturas.
 * Cada modelo possui hierarquia e desenho próprios. Só cria objetos Fabric;
 * não acessa a interface, não busca imagens e não modifica o documento ativo.
 */
(function(){
 'use strict';const PS=window.PS,F=window.fabric;
 PS.designFontsReady=Promise.all([document.fonts.load('400 16px \"DM Sans\"'),document.fonts.load('700 16px \"DM Sans\"'),document.fonts.load('400 16px \"Cormorant Garamond\"'),document.fonts.load('700 16px \"Cormorant Garamond\"'),document.fonts.load('400 16px \"Bebas Neue\"')]).catch(()=>[]);
 PS.designTemplateScene=(t,w,h)=>{
  const objects=[],u=Math.min(w,h),wide=w/h>1.3;
  const add=(o,name='Decoração')=>{o.set({prismaName:name});objects.push(o);return o;};
  const rect=(x,y,a,b,color,extra={})=>add(new F.Rect({left:x*w,top:y*h,width:a*w,height:b*h,fill:color,...extra}));
  const circle=(x,y,r,color,extra={})=>add(new F.Circle({left:x*w-r*u,top:y*h-r*u,radius:r*u,fill:color,...extra}));
  const txt=(s,x,y,a,size,color,extra={})=>add(new F.Textbox(s,{left:x*w,top:y*h,width:a*w,fontSize:size*u,fill:color,fontFamily:'DM Sans',lineHeight:1.05,...extra}),'Texto');
  const label=(s,x,y,a,color=t.accent)=>txt(s,x,y,a,.023,color,{fontWeight:'bold',charSpacing:130});
  const leaves=(x,y,side=1)=>{for(let i=0;i<7;i++)add(new F.Ellipse({left:(x+side*(i%2)*.05)*w,top:(y+i*.045)*h,rx:u*.018,ry:u*.047,angle:side*(i%2?55:22),fill:t.accent,opacity:.55}),'Folha');};
  const border=(c=t.accent)=>rect(.065,.045,.87,.91,'transparent',{stroke:c,strokeWidth:u*.002});
  const details=(y=.77,align='center')=>txt(t.details,.11,y,.78,.026,t.dark,{textAlign:align,lineHeight:1.65});
  switch(t.id){
   case 'birthday':
    rect(0,.70,1,.30,t.accent);circle(.92,.17,.23,'#e9d9ff');circle(.05,.57,.18,'#ffd373');
    for(let i=0;i<20;i++){let cx=.04+(i*37%92)/100,cy=.04+(i*23%60)/100;if(cy>.2&&cx>.13&&cx<.83)cx=i%2?.06:.94;circle(cx,cy,.004+i%3*.003,['#b68af7','#f582a1','#f7bb52'][i%3]);}
    label('VOCÊ ESTÁ NA LISTA',.1,.12,.8);txt('Vem\ncelebrar!',.09,.23,.83,wide?.09:.15,t.dark,{fontWeight:'bold',fontFamily:'Cormorant Garamond',lineHeight:.95});
    txt(t.hero,.11,.58,.78,.066,t.dark,{fontWeight:'bold'});txt(t.details,.11,.76,.78,.025,'#ffffff',{lineHeight:1.7});break;
   case 'wedding':
    // Arco, papel claro e ramo lateral; hierarquia de convite clássico.
    rect(.15,.15,.70,.67,'#e8e5d7',{rx:u*.35,ry:u*.35});border();leaves(.04,.40);leaves(.92,.10,-1);
    label('TEMOS UM ENCONTRO MARCADO',.15,.22,.7);txt('Ana\n& Lucas',.20,.32,.60,wide?.08:.115,t.dark,{fontFamily:'Cormorant Garamond',textAlign:'center',lineHeight:1.02});
    txt('COM A BÊNÇÃO DE NOSSAS FAMÍLIAS',.16,.61,.68,.018,t.dark,{charSpacing:100,textAlign:'center'});details(.73);break;
   case 'baby':
    circle(.78,.20,.13,'#efdca3');circle(.83,.165,.12,t.bg);for(let i=0;i<5;i++)circle(.10+i*.20,.88,.15,'#ffffff');
    for(let i=0;i<15;i++)txt('✦',.06+(i*23%88)/100,.05+(i*17%52)/100,.06,.028,'#b1c7d0');
    label('UM PEQUENO GRANDE AMOR',.12,.18,.65);txt('Chá de\nbebê',.10,.32,.8,wide?.09:.14,t.dark,{fontFamily:'Cormorant Garamond',fontWeight:'bold'});txt('Venha sonhar com a gente',.11,.62,.8,.035,t.accent);details(.75,'left');break;
   case 'party':
    rect(.06,.06,.88,.88,'transparent',{stroke:t.accent,strokeWidth:u*.005,rx:u*.08,ry:u*.08});circle(.9,.75,.25,'transparent',{stroke:'#67efe9',strokeWidth:u*.02});
    label('MÚSICA • AMIGOS • UMA NOITE',.13,.13,.74,'#67efe9');txt('PARTY\nNIGHT',.10,.27,.8,wide?.10:.19,t.dark,{fontFamily:'Bebas Neue',lineHeight:.92});txt('24 OUT / 20H',.12,.65,.76,.065,t.accent,{fontWeight:'bold'});details(.80);break;
   case 'business':
    rect(.70,0,.30,1,t.dark);circle(.83,.28,.18,t.accent);rect(.75,.47,.18,.006,'#ffffff');
    label('PRISMA / ENCONTROS',.08,.10,.55);txt('Ideias que\nmovem o\nfuturo.',.08,.26,.58,wide?.075:.105,t.dark,{fontWeight:'bold',lineHeight:1.05});
    txt('CONEXÕES 2026',.08,.66,.57,.031,t.accent,{fontWeight:'bold'});txt(t.details,.08,.76,.56,.024,t.dark,{lineHeight:1.6});break;
   case 'minimal':
    label('O MELHOR É ESTAR JUNTO',.12,.11,.76);rect(.48,.22,.04,.09,t.accent);txt('Um dia.\nBoas histórias.',.12,.38,.76,wide?.075:.105,t.dark,{fontFamily:'Cormorant Garamond',textAlign:'center'});rect(.20,.67,.6,.001,t.accent);details(.76);break;
   case 'graduation':
    border();circle(.5,.20,.11,'transparent',{stroke:t.accent,strokeWidth:u*.003});txt('2026',.38,.17,.24,.07,t.accent,{fontFamily:'Cormorant Garamond',textAlign:'center'});
    label('CADA PASSO VALEU A PENA',.13,.37,.74);txt('A conquista\né nossa.',.13,.46,.74,wide?.08:.115,t.dark,{fontFamily:'Cormorant Garamond',textAlign:'center'});details(.76);break;
   case 'thanks':
    rect(0,0,.35,1,t.accent);circle(.33,.48,.27,'#edcfc0');leaves(.05,.20);txt('Muito\nobrigado!',.43,.24,.5,wide?.08:.105,t.dark,{fontFamily:'Cormorant Garamond',fontWeight:'bold'});txt(t.details,.43,.65,.48,.027,t.dark,{lineHeight:1.6});break;
   case 'menu':
    rect(.08,.06,.84,.88,'#f4e8d3');label('COZINHA AFETIVA',.16,.13,.68);txt('À mesa',.16,.21,.68,.15,t.dark,{fontFamily:'Cormorant Garamond'});rect(.16,.42,.68,.002,t.accent);
    txt('PARA COMEÇAR\nSalada da estação\n\nPRATO PRINCIPAL\nReceita da casa\n\nPARA ADOÇAR\nSobremesa especial',.16,.48,.68,.031,t.dark,{lineHeight:1.4});break;
   case 'sale':
    rect(0,.58,1,.42,t.dark);label('SÓ NESTA SEMANA',.08,.11,.84,t.dark);txt('SALE',.06,.22,.88,wide?.15:.24,t.dark,{fontFamily:'Bebas Neue'});txt('50% OFF',.09,.62,.82,wide?.09:.14,t.bg,{fontWeight:'bold'});txt('Sua marca • Condições na loja',.1,.88,.8,.026,t.bg);break;
   case 'quote':
    circle(.95,.98,.4,'#125b57');txt('“',.08,.08,.3,.28,t.accent,{fontFamily:'Cormorant Garamond'});txt('Pequenos\npassos.\nGrandes\ncomeços.',.12,.30,.76,wide?.075:.105,t.dark,{fontFamily:'Cormorant Garamond'});rect(.12,.82,.12,.004,t.accent);label('UMA IDEIA PARA HOJE',.12,.88,.76);break;
   case 'botanical':
    rect(.12,.12,.76,.76,'#eceddb');leaves(.02,.05);leaves(.94,.60,-1);label('UM RESPIRO NA ROTINA',.20,.23,.60);txt('Cultive\nbons\nmomentos.',.20,.36,.60,wide?.07:.105,t.dark,{fontFamily:'Cormorant Garamond'});txt('Data • Horário • Local',.20,.76,.60,.028,t.accent);break;
  }
  // Formatos horizontais redistribuem os layouts altos em uma composição
  // proporcional. Nenhum texto é esticado e todas as caixas permanecem editáveis.
  return {background:t.bg,objects};
 };
})();
