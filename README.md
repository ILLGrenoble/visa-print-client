# VISA Print Client

[![npm version](https://badge.fury.io/js/%40illgrenoble%2Fvisa-print-client.svg)](https://badge.fury.io/js/%40illgrenoble%2Fvisa-print-client)

This is an angular library providing a service to manage websocket connections to a [VISA Print Server](https://github.com/ILLGrenoble/visa-print-server) and enabling printing of PDF documents from a VISA instance on the user's host computer. This angular module is intended to be integrated into the [VISA front end](https://github.com/ILLGrenoble/visa-web)

The transfer is initially triggered by a request from the [VISA CUPS Driver](https://github.com/ILLGrenoble/visa-cups) to the [VISA Print Server](https://github.com/ILLGrenoble/visa-print-server) when a user prints a document in an instance. 

PDFs are then sent from the server via the websocket to the client. A notification is received, the user is informed of a print request, and the PDF is rendered in a hidden iframe: after rendering the print dialog is opened from the iframe content.

The user then selects a local printer to print the document or saves the PDF as a local file.

An [authentication proxy](https://github.com/ILLGrenoble/visa-jupyter-proxy) is used to ensure that only the owner of an instance can connect to the VISA Print Server and receive print requests.

## Installation

To use visa-print-client in your project, install it via npm:

```
npm i @illgrenoble/visa-print-client --save
```

You also need to install the socket.io-client peer dependency:

```
npm i socket.io-client --save
```

# Usage

Integration into a module:

`app.module.ts`

```
import { VisaPrintModule } from '@illgrenoble/visa-print-client';
// etc.

@NgModule({
    imports: [
        // etc.
        VisaPrintModule,
    ],
    declarations: [
        AppComponent,
        // etc.
    ],
    bootstrap: [
        AppComponent
    ]
})
export class AppModule {
}

```
This provides the `VisaPrintService` that can be integrated into a component:

`app.component.ts`
```
export class AppComponent implement OnInit {
    constructor(private printService: VisaPrintService) {}
    
    public ngOnInit(): void {
        this.printService.connect({path: `ws/print`, token: 'MY_SECRET_TOKEN'}).subscribe(event => {
            if (event.type === 'CONNECTED') {
                const connectionId = event.connectionId;

                // enable printing
                this.printService.enablePrinting(connectionId);
                
            } else if (event.type === 'PRINT_JOB_AVAILABLE') {
                const printJob = event.data as PrintJobAvailableEvent;
                this.printService.openPrintable(event.connectionId, printJob.jobId);
            }
        });
    }

}
```

## Configuration

The connection to the VISA Print Client is configured with a path and a token:

- `path: string`

  Requests to the `VISA Print Client` are made to the same host as the angular app: a proxy is required to forward the requests to the server. In development mode this can be using the webpack proxy config, for example with the `path` of `ws/print` we can specify a proxy conf to forward the requests to the `socket.io` path of the server, such as:

   ```
   {
        "/ws/print/": {
            "target": "http://localhost:8091",
            "secure": false,
            "pathRewrite": {
                "^/ws/print/": "/socket.io/"
            },
            "changeOrigin": true,
            "logLevel": "debug",
            "ws": true
        }
   }
   
   ```

- `token: string` (optional)

  If the server is configured with an accessToken, it can be specified here.

  > Note that the [proxy](https://github.com/ILLGrenoble/visa-jupyter-proxy) provides authentication and ensures that only the owner of an instance receives print requests.

## Demo

A demo is available to quickly test the connection between a client and a server, the transfer of a PDF file via websocket and the opening of the print dialog in the client.

To start the server locally run the following commands in a terminal:

```
npm i -g @illgrenoble/visa-print-server
visa-print-server
```

This will start up the VISA Print Server on localhost:8091 without authentication enabled.

In another terminal, use the following commands to build and run the client:

```
git clone https://github.com/ILLGrenoble/visa-print-client.git
cd visa-print-client
npm install
npm run build:lib
npm start
```

The client will automatically connect to the websocket server on localhost and enable the printing queue. Open a browser window at http://localhost:4200 (you should only see a grey window). In a debug console you should see that the websocket is connected and printing enabled. 

To test the transfer of a PDF file, from another terminal perform the following command:

```
curl -X POST http://localhost:8091/api/printer --data-urlencode "path=<path_to_a_pdf>" --data-urlencode "jobId=1"
```

Change `path_to_a_pdf` to the absolute path of a PDF file on your computer. The print dialog should open on the client app with the PDF available for printing.

