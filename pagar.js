const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const { format } = require('date-fns');

const CHROME_PATH = undefined; // deixe assim para funcionar no Fly.io

async function extrairDados(url) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; Moto G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Mobile Safari/537.36');

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });

  // Aguarda elementos da OLX
  await page.waitForFunction(() => {
    return Array.from(document.querySelectorAll('span')).some(el => el.innerText.includes('R$'));
  }, { timeout: 60000 });

  await page.waitForSelector('span[class*="olx-color-neutral-110"]', { timeout: 15000 });
  await page.waitForSelector('span[class*="ad__sc-2mjlki-1"]', { timeout: 15000 });
  await page.waitForSelector('span[class*="ad__sc-ypp2u2-4"]', { timeout: 15000 });
  await page.waitForSelector('#gallery', { timeout: 15000 });

  const dados = await page.evaluate(() => {
    const getText = (selector) => document.querySelector(selector)?.innerText?.trim() || '';

    const nomeProduto = getText('h1');

    const preco = Array.from(document.querySelectorAll('span'))
      .find(el => el.innerText.trim().startsWith('R$'))?.innerText.trim() || 'Preço não encontrado';

    const descricao = getText('span[class*="ad__sc-2mjlki-1"]');
    const nomeVendedor = getText('span[class*="ad__sc-ypp2u2-4"]');
    const cidade = getText('span[class*="olx-color-neutral-110"]');
    const desdeQuando = getText('span[class*="ad__sc-k5plwo-1"]');

    const fotoVendedor = document.querySelector('[data-testid="seller-info-avatar"] img')?.src || '';

    const fotos = Array.from(document.querySelectorAll('#gallery button img'))
      .map(img => img.src)
      .filter(src => src.includes('olx.com.br/images/'));

    return {
      nomeProduto,
      preco,
      descricao,
      nomeVendedor,
      cidade,
      desdeQuando,
      fotoVendedor,
      fotos
    };
  });

  // Avatar fallback
  if (!dados.fotoVendedor || dados.fotoVendedor.includes('tip-badge.svg')) {
    const inicial = encodeURIComponent(dados.nomeVendedor?.[0]?.toUpperCase() || 'A');
    dados.fotoVendedor = `https://ui-avatars.com/api/?name=${inicial}&background=0095ff&color=fff&size=256`;
  }

  dados.capturadoEm = format(new Date(), 'dd/MM/yyyy HH:mm:ss');

  await browser.close();

  console.log('✅ DADOS EXTRAÍDOS:\n', dados);

  return dados;
}

module.exports = { extrairDados };
