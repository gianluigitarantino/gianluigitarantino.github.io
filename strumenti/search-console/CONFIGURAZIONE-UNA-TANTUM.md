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

## 3. Creare e configurare il progetto Google Cloud

Search Console API non compare nell'elenco **Servizi** di Apps Script. Serve un
progetto Google Cloud standard:

1. apri https://console.cloud.google.com/projectcreate;
2. crea un progetto chiamato `Rapporto Search Console`, senza fatturazione;
3. con quel progetto selezionato, apri
   https://console.cloud.google.com/apis/library/searchconsole.googleapis.com;
4. premi **Abilita** e non creare credenziali;
5. apri https://console.cloud.google.com/auth/overview e configura Google Auth
   Platform;
6. usa `Rapporto mensile Search Console` come nome, la tua email per assistenza
   e contatto e **Esterno** come pubblico;
7. in **Pubblico → Utenti di test**, aggiungi lo stesso account Google;
8. apri https://console.cloud.google.com/iam-admin/settings e copia il **Numero
   progetto**, composto soltanto da cifre.

Non pubblicare l'applicazione e non creare client o chiavi OAuth.

## 4. Collegare Cloud ad Apps Script

1. Torna in Apps Script e apri **Impostazioni progetto**.
2. In **Progetto Google Cloud Platform (GCP)** premi **Cambia progetto**.
3. Incolla il numero del progetto e premi **Imposta progetto**.

## 5. Attivare il rapporto

1. In alto, scegli la funzione `configuraRapportoMensile`.
2. Premi **Esegui**.
3. Seleziona il tuo account Google e autorizza soltanto i permessi richiesti:
   lettura Search Console, connessione alle API, invio email e gestione del
   trigger automatico del progetto.
4. Se la prima esecuzione termina dopo aver mostrato la richiesta dei permessi,
   premi nuovamente **Esegui**.
5. Attendi il messaggio `Esecuzione completata`.
6. Controlla la posta: deve arrivare un rapporto con `[PROVA]` nell'oggetto.

In **Trigger** deve essere presente una sola riga per la funzione
`inviaRapportoMensileSearchConsole`.

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
