# PADRÃO DE TRATAMENTO DE ERRO

---

Este projeto tem três categorias de operação, e cada uma comunica
sucesso/erro de um jeito diferente — de propósito, não por descuido:

A. Menu → ui.alert (createSchoolYear, checkSystem)
Usam ActionResponse ({success, message, details}) como retorno
interno entre a função "_Internal" e quem mostra o alert. Centraliza
a apresentação em um único `ui.alert` por fluxo, em vez de espalhar
chamadas de alert pelo meio da lógica de negócio.

B. Dialog HTML → google.script.run (executeStudentReportGeneration,
getStudentsDataForClass, executeClassReportsGeneration)
Mantêm `throw new Error(...)`. É o idioma nativo do Apps Script
para esse canal — o client já consome isso via withFailureHandler.
Embrulhar em ActionResponse aqui obrigaria o client a checar
`result.success` manualmente, quebrando o padrão já usado no
SelectYearClassDialog.html e adicionando boilerplate sem ganho.

C. Operação em lote (checkSystem, geração de boletins da turma)
Usam Issues[] ({type, text, url}) — um relatório agregado, não uma
resposta única de sucesso/falha. Um erro individual não interrompe
o lote; todos são coletados e exibidos juntos no final.

Os helpers `successRes`/`failureRes` que constroem o `ActionResponse` da
categoria A ficam em `action-response.ts`, não aqui — este arquivo é só
configuração e constantes.
