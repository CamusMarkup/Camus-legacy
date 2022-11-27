#!/usr/bin/env node


export * as AST from './AST';
export * as Parser from './Parser';
export * as Renderer from './Renderer';

/*
import fs from 'fs';
import * as Parser from './Parser';
import * as Renderer from './Renderer';
let s = fs.readFileSync(process.argv[2], {encoding: 'utf-8'});
let lines = Parser.parse(s);
let renderer = new Renderer.HTMLRenderer();
fs.writeFileSync(`${process.argv[2]}.html`, renderer.render(lines));
*/

