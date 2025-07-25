const express = require('express');
const TronWeb = require('tronweb');
const QRCode = require('qrcode');

const app = express();
app.use(express.json());

const PORT = 3000;

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: { "TRON-PRO-API-KEY": "29a1ea88-bfdc-45ba-8a71-81423e8bf632" }
});

const USDT_CONTRACT = 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj';

const users = {};

app.post('/api/create-wallet', async (req, res) => {
  try {
    const account = await tronWeb.createAccount();
    const userId = Date.now().toString();
    users[userId] = {
      address: account.address.base58,
      privateKey: account.privateKey,
    };
    res.json({ userId, address: account.address.base58 });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar carteira' });
  }
});

app.get('/api/balance/:userId', async (req, res) => {
  const user = users[req.params.userId];
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  try {
    const contract = await tronWeb.contract().at(USDT_CONTRACT);
    const balance = await contract.balanceOf(user.address).call();
    const usdt = parseFloat(tronWeb.toBigNumber(balance).div(1e6));
    res.json({ address: user.address, usdt });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar saldo' });
  }
});

app.post('/api/send', async (req, res) => {
  const { userId, to, amount } = req.body;
  const user = users[userId];
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  try {
    const tronWebSender = new TronWeb({
      fullHost: 'https://api.trongrid.io',
      headers: { "TRON-PRO-API-KEY": "29a1ea88-bfdc-45ba-8a71-81423e8bf632" },
      privateKey: user.privateKey,
    });

    const contract = await tronWebSender.contract().at(USDT_CONTRACT);
    const tx = await contract.transfer(to, amount * 1e6).send();
    res.json({ tx });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar USDT' });
  }
});

app.get('/api/qrcode/:userId', async (req, res) => {
  const user = users[req.params.userId];
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  try {
    const qr = await QRCode.toDataURL(user.address);
    res.json({ address: user.address, qrcode: qr });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar QR Code' });
  }
});

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});