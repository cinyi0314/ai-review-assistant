const fs = require('fs');
const path = require('path');
let pdfParse = require('pdf-parse');
if (pdfParse.default) pdfParse = pdfParse.default;

/**
 * 从上传的文件中提取文本内容
 * @param {string} filePath - 文件在服务器上的完整路径
 * @returns {Promise<string>} 解析出的文本内容
 */
async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  // .txt — 直接读取 utf-8
  if (ext === '.txt') {
    return fs.promises.readFile(filePath, 'utf-8');
  }

  // .pdf — 使用 pdf-parse 提取文本
  if (ext === '.pdf') {
    try {
      const buffer = await fs.promises.readFile(filePath);
      const data = await pdfParse(buffer);
      if (data && data.text) return data.text;
      throw new Error('PDF 文件内容为空');
    } catch (err) {
      console.error('PDF parse error:', err.message);
      throw new Error(`PDF 解析失败：${err.message}`);
    }
  }

  // 其他格式 — 暂不支持
  return '暂不支持此格式，请上传 txt 或 pdf 文件';
}

module.exports = { extractText };
