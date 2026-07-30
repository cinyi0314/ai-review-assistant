const path = require('path');
const fs = require('fs');

const FILE = path.join(__dirname, '..', 'data', 'customQuestionTypes.json');

function readAll() {
  if (!fs.existsSync(FILE)) { fs.writeFileSync(FILE, '[]', 'utf-8'); return []; }
  return JSON.parse(fs.readFileSync(FILE, 'utf-8'));
}
function writeAll(list) { fs.writeFileSync(FILE, JSON.stringify(list, null, 2), 'utf-8'); }

function getAll() { return readAll(); }

function create({ name, description, example, optionsTemplate }) {
  const list = readAll();
  const item = {
    id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5),
    name,
    description: description || '',
    example: example || '',
    optionsTemplate: optionsTemplate || null,  // e.g. ["A. ","B. ","C. ","D. "]
    createdAt: new Date().toISOString(),
  };
  list.push(item);
  writeAll(list);
  return item;
}

function update(id, fields) {
  const list = readAll();
  const item = list.find((i) => i.id === id);
  if (!item) return null;
  if (fields.name) item.name = fields.name;
  if (fields.description !== undefined) item.description = fields.description;
  if (fields.example !== undefined) item.example = fields.example;
  if (fields.optionsTemplate !== undefined) item.optionsTemplate = fields.optionsTemplate;
  writeAll(list);
  return item;
}

function remove(id) {
  const list = readAll();
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  writeAll(list);
  return true;
}

module.exports = { getAll, create, update, remove };
