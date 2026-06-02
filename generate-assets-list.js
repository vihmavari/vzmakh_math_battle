import fs from 'fs';
import path from 'path';

const assetsDir = path.join(process.cwd(), 'public', 'assets');
const outputFile = path.join(process.cwd(), 'src', 'utils', 'assets-manifest.json');

// Рекурсивная функция для поиска всех файлов в подпапках (bg, ui, fonts и т.д.)
function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath, fileList);
    } else {
      // Превращаем системный путь в URL-путь для сайта
      const relativePath = path.relative(path.join(process.cwd(), 'public'), filePath);
      const urlPath = relativePath.replace(/\\/g, '/'); // Фикс для Windows путей
      fileList.push(urlPath);
    }
  });
  
  return fileList;
}

try {
  if (fs.existsSync(assetsDir)) {
    const allAssets = walkDir(assetsDir);
    
    // Создаем папку для манифеста, если её нет
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)){
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputFile, JSON.stringify(allAssets, null, 2));
    console.log(`✅ Манифест ассетов успешно обновлен! Найдено файлов: ${allAssets.length}`);
  } else {
    console.error('❌ Папка public/assets не найдена!');
  }
} catch (err) {
  console.error('❌ Ошибка генерации манифеста ассетов:', err);
}
