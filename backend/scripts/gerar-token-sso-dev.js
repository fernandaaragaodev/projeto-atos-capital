#!/usr/bin/env node
/**
 * Gera um token SSO de teste, assinado com a chave de desenvolvimento
 * (appsettings.Development.json -> Sso:Key), para testar POST /api/Auth/sso
 * e a tela /sso do frontend sem depender do portal Atos Capital real.
 *
 * Uso: node gerar-token-sso-dev.js [email] [nome] [grupoIdExterno] [grupoNome] [papel] [minutos]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const appsettingsPath = path.join(__dirname, '..', 'appsettings.Development.json');
const config = JSON.parse(fs.readFileSync(appsettingsPath, 'utf8'));
const { Key: key, Issuer: issuer, Audience: audience } = config.Sso ?? {};

if (!key) {
  console.error(`Sso:Key não configurada em ${appsettingsPath}`);
  process.exit(1);
}

const [
  email = 'cliente.teste@nortec.com',
  nome = 'Cliente Teste SSO',
  grupoEmpresaIdExterno = 'GRP-NORTEC-001',
  grupoEmpresaNome = 'Cliente Nortec',
  papel = 'CLIENTE',
  minutos = '60',
] = process.argv.slice(2);

const now = Math.floor(Date.now() / 1000);
const header = { alg: 'HS256', typ: 'JWT' };
const payload = {
  sub: `PORTAL-${Date.now()}`,
  email,
  name: nome,
  grupoEmpresaIdExterno,
  grupoEmpresaNome,
  papel,
  iss: issuer,
  aud: audience,
  iat: now,
  nbf: now,
  exp: now + Number(minutos) * 60,
};

const encodedHeader = base64url(JSON.stringify(header));
const encodedPayload = base64url(JSON.stringify(payload));
const signingInput = `${encodedHeader}.${encodedPayload}`;
const signature = crypto
  .createHmac('sha256', key)
  .update(signingInput)
  .digest('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

const token = `${signingInput}.${signature}`;
console.log(token);
console.log(`\nURL de teste (frontend na 5173): http://localhost:5173/sso?token=${token}`);
