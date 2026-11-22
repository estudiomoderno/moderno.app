import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const sidebarIcons=['agenda','ajustes','automatizacion','calendario','facturacion','finanzas','integraciones','mail','notificacion','perfil','plugins','productos','proyectos-recientes','servicios','sign-out','soporte','tareas','ver-todos'].map(name=>'brand/sidebar-icons/'+name+'.svg');
const files=['plan-options.js','brand/menu-icons/home.svg','brand/menu-icons/proyectos.svg','brand/menu-icons/workspace.svg','brand/menu-icons/agenda.svg','brand/menu-icons/contabilidad.svg','brand/menu-icons/mail.svg','brand/menu-icons/catalogo.svg','brand/menu-icons/biblioteca.svg','brand/menu-icons/plantillas.svg','brand/menu-icons/tutoriales.svg','brand/menu-icons/documentation.svg',...sidebarIcons,'brand/menu-finish.css','plan-gallery.js','brand/plan-gallery.css','spec-master.js','project-quotes.js','home-map.js','home-map.css','places.js','places-config.json','new-project.js','shopping-export.js','team-invitation.js','studio-login.js','studio-login.css','brand/login-interior.webp','project-cursors.js','project-cursors.css','save-efficiency.js','private-files.js','pending-recovery.js','pending-archive.js','daily-work.js','shopping-cards.css','settings-ui.js','specifications.js','product-clipper.js','product-clipper.css','brand/illustrations/subir-planos.webp','brand/illustrations/nuevo-producto.webp','brand/illustrations/nueva-estancia.webp','brand/moderno_app_simbolo_negro.svg','calendar-ui.js','brand/calendar-ui.css','calendar-component.js','project-options.js','brand/project-options.css','index.html','page-breadcrumbs.js','brand/page-breadcrumbs.css','brand/finance-ui.css','finance-grid.js','project-workspace.js','brand/project-workspace.css','accounting-report.js','accounting-report.css','project-ui.js','project-documents.js','plan-annotations.js','plan-editor.js','plan-editor.css','brand/icons/plan-viewer/cursors/dusk/sizeall-20.png','brand/icons/plan-viewer/cursors/dusk/crosshair-20.png','brand/icons/plan-viewer/cursors/dusk/person-20.png','brand/icons/plan-viewer/cursors/dusk/ibeam-20.png','brand/icons/plan-viewer/cursors/dusk/hand-20.png','brand/icons/plan-viewer/cursors/dusk/nwpen-20.png','client-portal-site.js','client-portal-site.css','brand/project-ui.css','desktop-shell.js','brand/desktop-shell.css','brand/desktop-project-overview.css','brand/neutral-theme.css','header-presence.js','header-actions.js','brand/header-actions.css','profile-component.js','brand/reui/team-profile.css','brand/reui/font.css','brand/reui/inter-latin-wght-normal.woff2'];
files.push('mail-connections.js','brand/agenda-ui.css','brand/mail-ui.css','brand/mail-icons/gmail.svg','brand/mail-icons/back.svg','brand/mail-icons/icloud.svg','brand/mail-icons/external-mail.svg','brand/mail-icons/compose.svg','brand/mail-icons/inbox.svg','brand/mail-icons/sent.svg','brand/mail-icons/drafts.svg','brand/mail-icons/spam.svg','brand/mail-icons/trash.svg','brand/mail-icons/refresh.svg','brand/mail-icons/settings.svg','brand/agenda-icons/exportar-csv.svg','brand/agenda-icons/exportar-pdf.svg','brand/agenda-icons/importar-contactos.svg','brand/agenda-icons/menu-importar-exportar.svg','contact-todos.svg','contact-proovedores.svg','contact-contratistas.svg','contact-arquitectos.svg','contact-team.svg','cad-viewer.js','brand/icons/plan-viewer/Capas.svg','brand/icons/plan-viewer/Comentar.svg','brand/icons/plan-viewer/Desplazar.svg','brand/icons/plan-viewer/Dibujar.svg','brand/icons/plan-viewer/Flecha.svg','brand/icons/plan-viewer/Medir.svg','brand/icons/plan-viewer/zoom-in.svg','brand/icons/plan-viewer/zoom-out.svg');
files.push('brand/finance-icons/folder-simple-star-light.svg');
files.push('secretario-bridge.js','secretario-ui.js','secretary-feedback.js','brand/secretario.css');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function verifyPublication({fetchResource=fetch,readResource=name=>readFile(new URL('../app/'+name,import.meta.url)),revision='check'}={}){
  // Fixed public origin and resources, no authentication or arbitrary target URLs.
  for(const name of files){
    const expected=await readResource(name);
    const url=new URL('/'+(name==='index.html'?'':name),'https://app.moderno.app');url.searchParams.set('publication',revision);
    const response=await fetchResource(url,{redirect:'error',credentials:'omit',signal:AbortSignal.timeout(20000),headers:{'Cache-Control':'no-cache'}});
    if(!response.ok)throw Error(name+': HTTP '+response.status);
    const actual=new Uint8Array(await response.arrayBuffer());
    if(hash(actual)!==hash(expected))throw Error(name+': el recurso público no coincide con el commit desplegado');
    console.log(name+': contenido público verificado');
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let failure;
  for(let attempt=1;attempt<=3;attempt++){
    try{await verifyPublication({revision:process.env.GITHUB_SHA||'check'});failure=null;break;}
    catch(error){failure=error;console.error('Comprobación '+attempt+': '+error.message);if(attempt<3)await new Promise(r=>setTimeout(r,10000));}
  }
  if(failure)process.exitCode=1;
}
