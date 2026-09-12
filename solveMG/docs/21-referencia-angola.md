# Referência angolana

O SOLVE ACESS é um sistema desenvolvido e operado em Angola para a SamoraFit. As referências operacionais e financeiras devem usar o contexto angolano:

- País padrão: Angola.
- Moeda: AOA, Kwanza angolano.
- Localização padrão: Luanda, província de Luanda.
- Fuso horário padrão: `Africa/Luanda`.
- Localidade técnica: `pt-AO`.
- Identificação fiscal: NIF angolano, armazenado sem assumir formato de outro país.
- Métodos de pagamento: numerário, cartão, transferência, mobile money e Multicaixa.
- Dias de funcionamento: segunda-feira a sábado; domingo não é dia operacional.
- Operação física: terminais ZKTeco/ADMS de entrada e saída.
- Integração externa: OVG/OnVirtualGym e CRM recebem eventos do SOLVE ACESS, que permanece como fonte principal.

Nenhuma credencial OVG, ZKBio, terminal ou preço é hardcoded. Configuração específica de uma unidade deve ser fornecida por environment variables, secret manager ou administração autenticada.