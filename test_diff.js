const leadData = "2026-05-20T10:00:00.000Z";
const hoje = new Date(); // assuming today is May 25
hoje.setHours(0, 0, 0, 0);

const d = new Date(leadData);
d.setHours(0, 0, 0, 0);
const dias = Math.round((hoje.getTime() - d.getTime()) / 86400000);
console.log('Dias:', dias);
