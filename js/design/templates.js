/* Prisma Studio — catálogo autoral de convites e layouts, sem ativos do Canva.
 * Coordenadas relativas deixam os modelos reutilizáveis em formatos diversos.
 */
(function(){
 'use strict';const PS=window.PS;
 PS.designFormats={a5:{name:'Convite A5 — 148 × 210 mm',w:1748,h:2480,mmW:148,mmH:210},square:{name:'Post quadrado — 1080 × 1080',w:1080,h:1080},story:{name:'Story — 1080 × 1920',w:1080,h:1920},a4:{name:'Folha A4 — 210 × 297 mm',w:2480,h:3508,mmW:210,mmH:297},card:{name:'Cartão — 90 × 50 mm',w:1063,h:591,mmW:90,mmH:50}};
 PS.designTemplates=[
  {id:'birthday',name:'Aniversário festivo',category:'Festas',bg:'#fff5e8',accent:'#ed5b7c',dark:'#312b45',title:'É dia de celebrar!',subtitle:'Você está convidado para o aniversário de',hero:'SEU NOME',details:'SÁBADO · 24 DE OUTUBRO\nÀS 16H · LOCAL DA FESTA\nConfirme sua presença: (00) 00000-0000',motif:'confetti'},
  {id:'wedding',name:'Casamento delicado',category:'Casamento',bg:'#f5f2e9',accent:'#879474',dark:'#354238',title:'JUNTOS PARA SEMPRE',subtitle:'Com alegria, convidamos você para celebrar',hero:'Ana & Lucas',details:'24 DE OUTUBRO · ÀS 17H\nJARDIM DAS FLORES\nUma história de amor, um dia inesquecível.',motif:'botanical'},
  {id:'baby',name:'Chá de bebê',category:'Família',bg:'#edf4fa',accent:'#88adc8',dark:'#3d5265',title:'Um amor está chegando',subtitle:'Venha celebrar nosso',hero:'Chá de bebê',details:'DOMINGO · 25 DE OUTUBRO · 15H\nNOSSA CASA\nEsperamos você com muito carinho!',motif:'cloud'},
  {id:'party',name:'Festa neon',category:'Festas',bg:'#17152c',accent:'#db8cff',dark:'#ffffff',title:'SAVE THE DATE',subtitle:'Uma noite para guardar na memória',hero:'VAMOS\nCELEBRAR',details:'SÁBADO · 20H\nENDEREÇO DO EVENTO\nMúsica, amigos e bons momentos.',motif:'rings'},
  {id:'business',name:'Evento profissional',category:'Eventos',bg:'#f0f5f5',accent:'#008c95',dark:'#163f44',title:'VOCÊ É NOSSO CONVIDADO',subtitle:'Encontros que criam novas possibilidades',hero:'CONEXÕES\nQUE INSPIRAM',details:'24 DE OUTUBRO · ÀS 19H\nESPAÇO DO EVENTO\nInscreva-se e faça parte dessa experiência.',motif:'geometric'},
  {id:'minimal',name:'Convite minimalista',category:'Eventos',bg:'#fbf8f3',accent:'#bc8c56',dark:'#352f2b',title:'UMA OCASIÃO ESPECIAL',subtitle:'Será um prazer ter você conosco',hero:'Celebre\ncom a gente',details:'DATA · HORÁRIO\nLOCAL DO EVENTO\nSua presença faz toda a diferença.',motif:'frame'},
  {id:'graduation',name:'Formatura elegante',category:'Eventos',bg:'#192b38',accent:'#d9b674',dark:'#ffffff',title:'UMA NOVA ETAPA COMEÇA',subtitle:'Depois de tantos sonhos e conquistas',hero:'MINHA\nFORMATURA',details:'NOME DO FORMANDO\nDATA · HORÁRIO · LOCAL\nVenha comemorar essa conquista!',motif:'frame'},
  {id:'thanks',name:'Cartão de agradecimento',category:'Cartões',bg:'#f9eee9',accent:'#cb8d7a',dark:'#583d3b',title:'FEITO COM CARINHO',subtitle:'Pequenos gestos, grandes sentimentos',hero:'Obrigado!',details:'Sua presença tornou tudo mais especial.\nCom carinho,\nSEU NOME',motif:'botanical'}
 ];
})();
