# Products Importer

Passos para importar os produtos:

1) O cliente deve enviar um arquivo .xls com as seguintes colunas:
  - name	
  - price	
  - salePrice	
  - variation	
  - description	
  - reference

2) Remova qualquer *merged column* do documento

3) Use o Google Sheets para remover a formatação TABAJARA da Microsoft no .xls

4) Exporte esta planilha como .csv

5) Dentro do importer.js altere para a loja e arquivos corretos
  - const retailerId
  - const csvfile