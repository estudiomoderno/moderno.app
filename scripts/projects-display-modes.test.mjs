import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../app/index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../app/brand/project-ui.css',import.meta.url),'utf8');
const begin=html.indexOf('// Purely presentational preference for this browser session;');
const end=html.indexOf('function vProjects(){',begin);

function sandbox(){
  assert.ok(begin>=0&&end>begin,'view-mode functions must exist');
  const context={renderCount:0,render(){this.renderCount++}};
  vm.createContext(context);
  vm.runInContext(html.slice(begin,end),context);
  return context;
}

test('compact view is default; accessible controls for all three view types',()=>{
  const c=sandbox(),out=c.projectsViewSelector();
  assert.match(out,/role="group" aria-label="Vista de proyectos"/);
  assert.match(out,/Compacta/);
  assert.match(out,/Visual/);
  assert.match(out,/Lista/);
  assert.match(out,/aria-pressed="true" onclick="setProjectsDisplayMode\('compact'\)"/);
  assert.equal(c.renderCount,0);
});

test('switching views does not write project state or alter project cards',()=>{
  const c=sandbox();
  c.setProjectsDisplayMode('visual');
  assert.equal(c.renderCount,1);
  assert.match(c.projectsViewSelector(),/aria-pressed="true" onclick="setProjectsDisplayMode\('visual'\)"/);
  c.setProjectsDisplayMode('list');
  assert.equal(c.renderCount,2);
  c.setProjectsDisplayMode('compact');
  assert.equal(c.renderCount,3);
  c.setProjectsDisplayMode('compact');
  c.setProjectsDisplayMode('unknown');
  assert.equal(c.renderCount,3);
  assert.ok(!html.slice(begin,end).includes('state.projectsDisplayMode'));
  assert.ok(!html.slice(begin,end).includes('localStorage'));
  assert.ok(html.includes('projs.map(projectOverviewCard)'),'same secure project cards in all views');
  assert.ok(html.includes('archHits.map(projectOverviewCard)'),'archived matches use same renderer');
});

test('compact and list CSS stay limited to the project index; visual cover is preserved',()=>{
  assert.match(css,/\.projects-mode-compact \.project-overview-card/);
  assert.match(css,/\.projects-mode-list \.project-overview-card/);
  assert.match(css,/\.projects-identity\.projects-mode-list \.proj-grid\.project-cards-grid/);
  assert.match(css,/\.project-card-cover\{position:relative;aspect-ratio:16\/10/);
  assert.match(html,/projects-identity projects-mode-\$\{projectsDisplayMode\}/);
});
