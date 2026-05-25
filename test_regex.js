function isRegraMatch(cadencia, regra) {
  if (cadencia.tipo === regra.tipo_lembrete && regra.template_mensagem && cadencia.mensagem) {
    const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let regexStr = escapeRegExp(regra.template_mensagem)
      .replace(/\\\{nome\\\}/gi, '.*?')
      .replace(/\\\{dias\\\}/gi, '1');

    // Permite variações de espaçamento/quebra de linha
    regexStr = regexStr.replace(/\s+/g, '\\s*');

    const regex = new RegExp(`^\\s*${regexStr}\\s*$`, 'i');
    console.log('Regex:', regex);
    return regex.test(cadencia.mensagem);
  }
  return false;
}

const regra = {
  tipo_lembrete: 'follow_up_pos_orcamento',
  template_mensagem: 'Olá, {nome}! \nEspero que esteja tudo bem. \nConversamos alguns dias atrás, você...',
  cadencia_envio: 2
};

const cadencia = {
  tipo: 'follow_up_pos_orcamento',
  mensagem: 'Olá, João Silva! \nEspero que esteja tudo bem. \nConversamos alguns dias atrás, você...'
};

console.log(isRegraMatch(cadencia, regra));
