# Configurazione una tantum degli alt text automatici

Questa operazione va eseguita una sola volta dal proprietario del sito.

1. Aprire https://platform.openai.com/api-keys e creare una chiave API.
2. Verificare che l'account API abbia un metodo di pagamento o credito disponibile.
3. Aprire il repository GitHub e scegliere **Settings → Secrets and variables → Actions**.
4. Premere **New repository secret**.
5. Inserire come nome esatto `OPENAI_API_KEY`.
6. Incollare la chiave e premere **Add secret**.

La chiave non deve mai essere inserita nei file del repository, nelle guide o in
una conversazione. Dopo questa configurazione, ogni nuovo JPG viene analizzato
durante la pubblicazione e riceve automaticamente un alt text specifico in
italiano e in inglese. Le descrizioni non sono visibili come didascalie.
