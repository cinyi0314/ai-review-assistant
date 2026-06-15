const fs = require('fs');
const path = require('path');

/**
 * 从上传的文件中提取文本内容
 * @param {string} filePath - 文件在服务器上的完整路径
 * @returns {Promise<string>} 解析出的文本内容
 */
function extractText(filePath) {
  return new Promise((resolve, reject) => {
    const ext = path.extname(filePath).toLowerCase();

    if (ext !== '.txt') {
      // .pdf / .docx / .png 等非 txt 格式暂不支持
      return resolve('暂不支持此格式，请上传 txt 文件');
    }

    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data);
    });
  });
}

module.exports = { extractText };