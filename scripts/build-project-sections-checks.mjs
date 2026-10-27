import fs from 'node:fs';import {buildProductDeleteChecks} from './build-product-delete-checks.mjs';
const checks=fs.readFileSync(new URL('./sql/project-sections-checks.sql',import.meta.url),'utf8')+fs.readFileSync(new URL('./sql/new-project-checks.sql',import.meta.url),'utf8');
process.stdout.write(buildProductDeleteChecks().replace('select count(*) as product_delete_checks_passed from assertions;',()=>checks+'\nselect count(*) as project_sections_checks_passed from assertions;'));
