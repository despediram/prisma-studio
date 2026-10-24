/* Prisma Studio — doze modelos autorais adicionais e suas composições editáveis.
 * Cada família tem estrutura própria; textos se ajustam à caixa sem deformação.
 */
(function(){
 'use strict';const P=PS,F=fabric;
 P.designTemplates.push(
 {id:'kids-space',layout:'space',name:'Festa nas estrelas',category:'Festas',bg:'#142744',accent:'#ffcf6b',dark:'#ffffff',hero:'UMA AVENTURA\nESPACIAL',details:'NOME · IDADE\nDATA · HORÁRIO · LOCAL'},
 {id:'kids-garden',layout:'garden',name:'Piquenique encantado',category:'Festas',bg:'#fff4dc',accent:'#e9a1a1',dark:'#3f6451',hero:'Vamos brincar\nlá fora?',details:'ANIVERSÁRIO DE NOME\nDATA · HORÁRIO · LOCAL'},
 {id:'wedding-modern',layout:'rsvp',name:'Casamento contemporâneo',category:'Casamento',bg:'#e8e5dd',accent:'#8d553d',dark:'#313e37',hero:'Lia\n& Theo',details:'CELEBRE ESSE DIA CONOSCO\nDATA · HORÁRIO · LOCAL'},
 {id:'baby-rainbow',layout:'rainbow',name:'Bebê arco-íris',category:'Família',bg:'#faf2e7',accent:'#c48f75',dark:'#695448',hero:'Uma nova cor\nna nossa vida',details:'CHÁ DE BEBÊ · NOME\nDATA · HORÁRIO · LOCAL'},
 {id:'menu-bistro',layout:'bistro',name:'Cardápio de bistrô',category:'Gastronomia',bg:'#f6f0e4',accent:'#bd6449',dark:'#303e34',hero:'Bistrô\nda esquina',details:'SALADA DA ESTAÇÃO · R$ 25\nPRATO DA CASA · R$ 49\nSOBREMESA · R$ 18'},
 {id:'menu-cafe',layout:'cafe',name:'Café de todo dia',category:'Gastronomia',bg:'#f5d8af',accent:'#9c5e38',dark:'#483121',hero:'Uma pausa\npara o café.',details:'ESPRESSO · R$ 7\nCAPPUCCINO · R$ 12\nBOLO DO DIA · R$ 15'},
 {id:'social-launch',layout:'launch',name:'Lançamento criativo',category:'Redes sociais',bg:'#e3ff73',accent:'#503da5',dark:'#222327',hero:'CHEGOU\nO NOVO.',details:'SUA MARCA\nCONHEÇA A NOVIDADE'},
 {id:'social-steps',layout:'steps',name:'Post de três dicas',category:'Redes sociais',bg:'#e3eeee',accent:'#12636c',dark:'#203b40',hero:'Pequenas ideias.\nGrandes mudanças.',details:'01  COMECE PELO SIMPLES\n02  CRIE DO SEU JEITO\n03  COMPARTILHE SUA IDEIA'},
 {id:'sale-ticket',layout:'ticket',name:'Oferta em ingresso',category:'Comércio',bg:'#fc895c',accent:'#fff2cf',dark:'#302e39',hero:'É AGORA:\n30% OFF',details:'SUA MARCA · POR TEMPO LIMITADO\nCONDIÇÕES NA LOJA'},
 {id:'event-music',layout:'music',name:'Cartaz de música',category:'Eventos',bg:'#302c60',accent:'#f1bbdd',dark:'#ffffff',hero:'SOM\nDA NOITE',details:'ARTISTA · DATA · 20H\nLOCAL · INGRESSOS'},
 {id:'thanks-note',layout:'note',name:'Bilhete de carinho',category:'Cartões',bg:'#f2eadf',accent:'#709d8e',dark:'#3f5c52',hero:'Seu carinho\nfez diferença.',details:'OBRIGADO POR FAZER PARTE\nCOM CARINHO, SEU NOME'},
 {id:'graduation-bold',layout:'graduate',name:'Formatura em destaque',category:'Eventos',bg:'#202b38',accent:'#e8c782',dark:'#ffffff',hero:'UM SONHO.\nUMA CONQUISTA.',details:'FORMATURA · SEU NOME\nDATA · HORÁRIO · LOCAL'});
 P.designExtraScene=(t,w,h)=>{
  const objects=[],u=Math.min(w,h),wide=w/h>1.3;const add=(o,name='Decoração')=>{o.set({prismaName:name});objects.push(o);return o;};
  const rect=(x,y,a,b,c,extra={})=>add(new F.Rect({left:x*w,top:y*h,width:a*w,height:b*h,fill:c,...extra}));
  const circle=(x,y,r,c)=>add(new F.Circle({left:x*w-r*u,top:y*h-r*u,radius:r*u,fill:c}));
  const text=(s,x,y,a,b,size,color=t.dark,font='DM Sans',extra={})=>{const o=new F.Textbox(s,{left:x*w,top:y*h,width:a*w,fontSize:size*u,fill:color,fontFamily:font,lineHeight:1.1,...extra});for(let i=0;i<30&&o.height>b*h;i++)o.set('fontSize',o.fontSize*.9);return add(o,'Texto');};
  const title=(x=.1,y=.25,a=.8,b=.4,size=.12,font='Cormorant Garamond',color=t.dark)=>text(t.hero,x,y,a,b,size,color,font,{fontWeight:'bold'});
  const foot=(y=.78,color=t.dark)=>text(t.details,.1,y,.8,.17,.026,color,'DM Sans',{lineHeight:1.6});
  switch(t.layout){
   case 'space':circle(.82,.18,.20,'#29476a');circle(.78,.17,.10,t.accent);for(let i=0;i<16;i++)circle(.06+(i*29%88)/100,.06+(i*13%83)/100,.003+(i%3)*.002,'#fff6d8');text('DESTINO: DIVERSÃO',.1,.12,.65,.08,.024,t.accent);title(.1,.30,.8,.36,.13,'Bebas Neue');foot();break;
   case 'garden':for(let i=0;i<7;i++){circle(.1+i*.14,.12,.075,t.accent);circle(.1+i*.14,.94,.065,'#b3c99c');}rect(.07,.21,.86,.62,'#fffdf4',{rx:u*.05,ry:u*.05});text('UM DIA CHEIO DE ALEGRIA',.15,.27,.7,.08,.022);title(.15,.39,.7,.29);foot(.72);break;
   case 'rsvp':rect(0,0,.28,1,t.accent);text('O NOSSO SIM',.36,.12,.56,.08,.025);title(.36,.27,.55,.40,.14);text('VOCÊ FAZ PARTE DA HISTÓRIA',.36,.69,.55,.07,.018);text(t.details,.36,.79,.55,.15,.023);break;
   case 'rainbow':for(let i=0;i<4;i++)add(new F.Ellipse({left:(.2+i*.05)*w,top:(.05+i*.035)*h,rx:(.3-i*.05)*w,ry:(.23-i*.035)*h,fill:['#c48f75','#d7b994','#b6c4b0',t.bg][i]}));rect(0,.26,1,.74,t.bg);title(.12,.36,.76,.30,.11);foot(.76);break;
   case 'bistro':rect(.05,.04,.9,.92,'transparent',{stroke:t.dark,strokeWidth:u*.005});text('COZINHA FEITA COM TEMPO',.13,.11,.74,.08,.023);title(.12,.24,.76,.28,.14);rect(.12,.56,.76,.004,t.accent);text(t.details,.12,.62,.76,.26,.032,t.dark,'DM Sans',{lineHeight:2});break;
   case 'cafe':circle(.8,.14,.25,t.accent);circle(.79,.14,.15,t.bg);title(.1,.23,.8,.32,.13);rect(.08,.62,.84,.30,'#fff3df',{rx:u*.03,ry:u*.03});text(t.details,.14,.67,.72,.22,.034,t.dark,'DM Sans',{lineHeight:1.7});break;
   case 'launch':rect(.65,0,.35,1,t.accent);title(.08,.13,.84,.55,.22,'Bebas Neue');rect(.08,.75,.84,.17,t.dark,{rx:u*.025,ry:u*.025});text(t.details,.13,.79,.74,.1,.028,t.bg);break;
   case 'steps':text('PARA SALVAR E RELEMBRAR',.1,.10,.8,.07,.022,t.accent);title(.1,.22,.8,.26,.095,'DM Sans');t.details.split('\n').forEach((s,i)=>{rect(.08,.56+i*.115,.84,.09,i%2?'#d0e0e0':'#f3f9f8',{rx:u*.02,ry:u*.02});text(s,.12,.58+i*.115,.76,.06,.027);});break;
   case 'ticket':rect(.08,.08,.84,.84,t.accent,{rx:u*.06,ry:u*.06});for(let i=0;i<12;i++)rect(.12+i*.065,.68,.03,.003,t.dark);circle(.08,.68,.04,t.bg);circle(.92,.68,.04,t.bg);text('VOCÊ GANHOU UM MOTIVO',.14,.16,.72,.08,.023);title(.14,.29,.72,.33,.17,'Bebas Neue');text(t.details,.14,.76,.72,.12,.025);break;
   case 'music':for(let i=0;i<8;i++)rect(.1+i*.105,.64-(i%3)*.07,.055,.24+(i%3)*.07,['#7659a9',t.accent][i%2],{rx:u*.018,ry:u*.018});text('AO VIVO / EDIÇÃO ESPECIAL',.1,.1,.8,.08,.025,t.accent);title(.1,.22,.8,.36,.2,'Bebas Neue');foot(.89);break;
   case 'note':rect(.08,.12,.84,.76,'#fffdf7',{rx:u*.02,ry:u*.02});rect(.35,.08,.3,.07,t.accent,{opacity:.65});text('UM BILHETE PARA VOCÊ',.16,.25,.68,.08,.022,t.accent);title(.16,.4,.68,.29,.11);text(t.details,.16,.74,.68,.1,.022);break;
   case 'graduate':rect(.08,.07,.84,.86,'transparent',{stroke:t.accent,strokeWidth:u*.003});text('O PRÓXIMO CAPÍTULO COMEÇA',.14,.16,.72,.08,.022,t.accent);title(.14,.31,.72,.36,.14,'Bebas Neue');rect(.14,.72,.2,.006,t.accent);text(t.details,.14,.80,.72,.12,.025);break;
  }
  return {background:t.bg,objects};
 };
})();
