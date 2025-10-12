import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const resolveFromRoot = (...parts) => path.resolve(__dirname, '..', ...parts);

export async function renderEJSToFile(ejs, data, destPath) {
  await fs.ensureDir(path.dirname(destPath));
  const content = await ejs.renderFile(data.templatePath, data.locals, { async: true });
  await fs.writeFile(destPath, content, 'utf8');
}
