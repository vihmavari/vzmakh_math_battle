// src/utils/preload.js

const preloadImage = (src) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = resolve;
    img.onerror = () => {
      console.warn(`Не удалось загрузить картинку: ${src}`);
      resolve(); // Не блокируем всю игру, если одна картинка недоступна
    };
  });
};

const preloadFonts = () => {
  if (document.fonts) {
    return document.fonts.ready;
  }
  return Promise.resolve();
};

export const preloadAllAssets = async (imagesArray) => {
  await Promise.all([
    preloadFonts(),
    ...imagesArray.map((src) => preloadImage(src))
  ]);
};