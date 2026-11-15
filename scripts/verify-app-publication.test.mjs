import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyPublication} from './verify-app-publication.mjs';

const expectedAssets=[
 'mail-connections.js','brand/agenda-ui.css','brand/mail-ui.css','brand/mail-icons/gmail.svg','brand/mail-icons/back.svg','brand/mail-icons/icloud.svg','brand/mail-icons/external-mail.svg','brand/mail-icons/compose.svg','brand/mail-icons/inbox.svg','brand/mail-icons/sent.svg','brand/mail-icons/drafts.svg','brand/mail-icons/spam.svg','brand/mail-icons/trash.svg','brand/agenda-icons/exportar-csv.svg','brand/agenda-icons/exportar-pdf.svg','brand/agenda-icons/importar-contactos.svg','brand/agenda-icons/menu-importar-exportar.svg','contact-todos.svg','contact-proovedores.svg','contact-contratistas.svg','contact-arquitectos.svg','contact-team.svg','brand/sidebar-icons/soporte.svg',
 ...['sizeall-20','crosshair-20','person-20','ibeam-20','hand-20','nwpen-20'].map(name=>'brand/icons/plan-viewer/cursors/dusk/'+name+'.png'),
 'brand/menu-finish.css',
 ...['home','proyectos','workspace','agenda','contabilidad','mail','catalogo','biblioteca','plantillas','tutoriales','documentation'].map(name=>'brand/menu-icons/'+name+'.svg'),
 ...['agenda','ajustes','automatizacion','calendario','facturacion','finanzas','integraciones','mail','notificacion','perfil','plugins','productos','proyectos-recientes','servicios','sign-out','soporte','tareas','ver-todos'].map(name=>'brand/sidebar-icons/'+name+'.svg'),
 'plan-gallery.js','brand/plan-gallery.css','spec-master.js','project-quotes.js','home-map.js','home-map.css','places.js','places-config.json','new-project.js','shopping-export.js','team-invitation.js','studio-login.js','studio-login.css','brand/login-interior.webp','private-files.js','pending-recovery.js','pending-archive.js','daily-work.js','shopping-cards.css','settings-ui.js','specifications.js','product-clipper.js','product-clipper.css','brand/illustrations/subir-planos.webp','brand/illustrations/nuevo-producto.webp','brand/illustrations/nueva-estancia.webp','calendar-ui.js','brand/calendar-ui.css','calendar-component.js','page-breadcrumbs.js','brand/page-breadcrumbs.css','project-options.js','brand/project-options.css','profile-component.js','brand/reui/team-profile.css','brand/reui/font.css','brand/reui/inter-latin-wght-normal.woff2','header-presence.js','header-actions.js','brand/header-actions.css','brand/neutral-theme.css','cad-viewer.js','brand/icons/plan-viewer/Capas.svg','brand/icons/plan-viewer/Comentar.svg','brand/icons/plan-viewer/Desplazar.svg','brand/icons/plan-viewer/Dibujar.svg','brand/icons/plan-viewer/Flecha.svg','brand/icons/plan-viewer/Medir.svg','brand/icons/plan-viewer/zoom-in.svg','brand/icons/plan-viewer/zoom-out.svg','index.html','project-workspace.js','brand/project-workspace.css','accounting-report.js','accounting-report.css','plan-editor.css','client-portal-site.js','client-portal-site.css','brand/project-ui.css','desktop-shell.js','brand/desktop-shell.css','brand/desktop-project-overview.css'
];

test('publication checks every public entry/module with no credentials and a fixed host',async()=>{
 const seen=[];
 await verifyPublication({readResource:async name=>Buffer.from(name),revision:'fictional-revision',fetchResource:async(url,options)=>{
  assert.equal(url.hostname,'app.moderno.app');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(url.searchParams.get('publication'),'fictional-revision');
  const name=url.pathname==='/'?'index.html':url.pathname.slice(1);seen.push(name);return new Response(name);
 }});
 assert.equal(seen.length,128);assert.ok(expectedAssets.every(name=>seen.includes(name)));
});

test('HTTP success cannot disguise an old entry, login proxy, or changed asset',async()=>{
 await assert.rejects(verifyPublication({readResource:async()=>Buffer.from('expected'),fetchResource:async()=>new Response('old or intermediary page')}),/no coincide/);
 await assert.rejects(verifyPublication({readResource:async()=>Buffer.from('expected'),fetchResource:async()=>new Response('missing',{status:404})}),/HTTP 404/);
});
