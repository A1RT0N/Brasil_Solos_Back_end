const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors()); // Permite CORS para todas as origens

app.get('/scrape', async (req, res) => {
  const input = req.query.input;
  let browser;

  try {
    // Inicializa o Puppeteer em modo headless e define o caminho correto para o Chrome
    const browser = await puppeteer.launch({
      headless: "new", // Usa o novo modo Headless
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Reduz problemas com memória compartilhada
        '--disable-gpu',           // Desativa GPU (não necessária em headless)
        '--single-process',        // Força o Chrome a rodar como um único processo
        '--no-zygote',             // Reduz processos adicionais
      ],
      executablePath: '/opt/render/.cache/puppeteer/chrome/linux-121.0.6167.85/chrome-linux64/chrome'
    });

    console.log("Foi")

    const page = await browser.newPage();

    // Vai para a URL especificada e espera o seletor desejado
    await page.goto(`https://www.cepea.esalq.usp.br/br/indicador/${input}.aspx`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector("#imagenet-indicador1");

    // Extrai os dados
    const dados = await page.evaluate(() => {
      const tabela = document.querySelector("#imagenet-indicador1");
      if (!tabela) {
        return [];
      }
      const linhas = tabela.querySelectorAll("tbody tr");

      const cabecalhos = Array.from(tabela.querySelectorAll("thead th")).map((th) => {
        const texto = th.innerText.trim();
        return texto === "" ? "Data" : texto;
      });
      const dados = [];

      linhas.forEach(tr => {
        const colunas = Array.from(tr.querySelectorAll("td")).map(td => {
          let texto = td.innerText.trim();

          if (/^\d+(\.\d{3})*,\d{2}$/.test(texto)) {
            texto = texto.replace(/\./g, '').replace(',', '.');
          }

          if (texto.includes('%')) {
            texto = texto.replace(',', '.');
          }

          return texto;
        });

        const linhaDados = {};
        cabecalhos.forEach((header, index) => {
          linhaDados[header] = colunas[index] || "DATA";
        });

        dados.push(linhaDados);
      });

      return dados;
    });

    res.json(dados);

  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) await browser.close(); // Fecha o browser ao final, independente do sucesso ou falha
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
