# Configurazione una tantum del rapporto Search Console

Il rapporto resta privato nel tuo account Google e viene inviato alla sua email.
Non inserire password, chiavi o altri dati personali nel repository GitHub.

## 1. Creare il progetto Google

1. Accedi con l'account che gestisce `gianluigitarantino.com` in Search Console.
2. Apri https://script.google.com e crea un **Nuovo progetto**.
3. Chiamalo `Rapporto mensile Search Console`.
4. Nel file `Code.gs`, elimina il contenuto iniziale e incolla tutto il contenuto
   di `strumenti/search-console/Code.gs` presente nel repository.

## 2. Inserire il manifest

1. Apri **Impostazioni progetto**.
2. Attiva **Mostra il file manifest appsscript.json nell'editor**.
3. Torna nell'editor e apri `appsscript.json`.
4. Sostituisci tutto con il contenuto di
   `strumenti/search-console/appsscript.json` presente nel repository.
5. Salva il progetto.

## 3. Abilitare Search Console API

1. Nelle impostazioni del progetto Apps Script, apri il collegamento al progetto
   Google Cloud associato.
2. In Google Cloud apri **API e servizi → Libreria**.
3. Cerca **Google Search Console API** e premi **Abilita**.
4. Torna all'editor Apps Script.

## 4. Attivare il rapporto

1. In alto, scegli la funzione `configuraRapportoMensile`.
2. Premi **Esegui**.
3. Seleziona il tuo account Google e autorizza soltanto i permessi richiesti:
   lettura Search Console, connessione alle API, invio email e gestione del
   trigger automatico del progetto.
4. Se la prima esecuzione termina dopo aver mostrato la richiesta dei permessi,
   premi nuovamente **Esegui**.
5. Attendi il messaggio `Esecuzione completata`.
6. Controlla la posta: deve arrivare un rapporto con `[PROVA]` nell'oggetto.

La configurazione elimina eventuali trigger duplicati e ne crea uno solo. Il
rapporto verrà inviato automaticamente il giorno 5 di ogni mese, intorno alle
09:00, anche se il Mac è spento.

Se il rapporto di prova non arriva, non creare manualmente altri trigger:
controlla **Esecuzioni** nell'editor Apps Script oppure chiedi a Codex di leggere
l'errore.

## Email diversa (facoltativo)

Per inviare il rapporto a un indirizzo diverso dall'account Google autorizzato:

1. apri **Impostazioni progetto → Proprietà script**;
2. aggiungi la proprietà `REPORT_EMAIL`;
3. inserisci come valore l'indirizzo desiderato;
4. esegui nuovamente `configuraRapportoMensile`.
