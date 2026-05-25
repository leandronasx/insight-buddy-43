const template = "Olá, {nome}! Espero que esteja tudo bem. Conversamos alguns dias atrás, você...";
const mensagem = "Olá João! 👋";
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let regexStr = escapeRegExp(template)
  .replace(/\\\{nome\\\}/gi, '.*?')
  .replace(/\\\{dias\\\}/gi, '2');

regexStr = regexStr.replace(/\s+/g, '\\s*');
const regex = new RegExp(`^\\s*${regexStr}\\s*$`, 'i');
console.log(regex.test(mensagem));
