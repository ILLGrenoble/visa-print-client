import {Injectable} from "@angular/core";
import {BehaviorSubject, Observable, Subject} from "rxjs";
import {
    PrintEvent,
    PrintJob,
    ErrorEvent,
    PrintJobChunkEvent,
    PrintJobAvailableEvent
} from "../models";
import io from 'socket.io-client'
import * as SocketIOClient from 'socket.io-client'
import Socket = SocketIOClient.Socket;
import {ManagerOptions} from "socket.io-client/build/esm/manager";
import {SocketOptions} from "socket.io-client/build/esm/socket";

export type ConnectionData = {
    host?: string;
    path?: string;
    token?: string;
}

type Printable = {
    jobId: number;
    data: string;
}

export type Connection = {
    id: string;
    socket: Socket;
    event$: Subject<PrintEvent>;
    jobs: Map<number, PrintJob[]>;
    printables: Printable[];
}

@Injectable({
    providedIn: 'root'
})export class VisaPrintService {

    private _connections: Connection[] = [];
    private static _connectionCounter = 1;

    private _iframe: HTMLIFrameElement;
    private _pdfUrl: string;
    private _pdfDidOpen = false;

    public connect(data: ConnectionData, connectionOptions: Partial<ManagerOptions & SocketOptions>): Observable<PrintEvent> {

        const socketOptions: Partial<ManagerOptions & SocketOptions> = {
            transports: ['websocket'],
            timeout: 1000,
            reconnection: true,
            reconnectionDelayMax: 10000,
            ...connectionOptions
        }

        if (data.path) {
            socketOptions.path = data.path;
        }

        if (data.token) {
            socketOptions.auth = {
                token: data.token
            };
        }

        const connectionId = `print-connection-${VisaPrintService._connectionCounter++} `;

        const host = data.host ? `${data.host}` : '';
        const socket = io(`${host}?token=${data.token}`, socketOptions);

        const printEvents$ = new BehaviorSubject<PrintEvent>(new PrintEvent({type: 'CONNECTING', connectionId}));
        const connection: Connection = {
            id: connectionId,
            event$: printEvents$,
            socket: socket,
            jobs: new Map<number, PrintJob[]>(),
            printables: [],
        };

        this._connections.push(connection);

        socket.on('connect', () => {
            printEvents$.next(new PrintEvent({type: 'CONNECTED', connectionId}));
        });

        socket.on('print_job_handled', (jobId: number) => {
            connection.printables = connection.printables.filter(printable => printable.jobId !== jobId);
            printEvents$.next(new PrintEvent({type: 'PRINT_JOB_HANDLED', connectionId, jobId}));
        });

        socket.on('connect_error', (error) => {
            printEvents$.next(new PrintEvent({type: 'ERROR', connectionId, data: new ErrorEvent({type: 'CONNECTION_ERROR', message: error.message})}));
        });

        socket.on('disconnect', () => {
            printEvents$.next(new PrintEvent({type: 'DISCONNECTED', connectionId}));
        });

        socket.on('error', (error) => {
            printEvents$.next(new PrintEvent({type: 'ERROR', connectionId, data: new ErrorEvent({type: 'ERROR', message: error.message})}));
        });

        socket.on('exception', (e) => {
            printEvents$.next(new PrintEvent({type: 'ERROR', connectionId, data: new ErrorEvent({type: 'EXCEPTION', message: e.message})}));
        });

        socket.on('print_job_start', (jobId: number) => {
            printEvents$.next(new PrintEvent({type: 'PRINT_JOB_TRANSFER_STARTED', connectionId, jobId}));
        });

        socket.on('print_job_end', (jobId: number) => {
            printEvents$.next(new PrintEvent({type: 'PRINT_JOB_TRANSFER_TERMINATED', connectionId, jobId}));
        });

        socket.on('print_job_data', (printJob: PrintJob, ack) => {
            const {jobId, chunkId, chunkCount, chunkLength, data} = printJob;
            if (chunkLength !== data.length) {
                console.error(`printer job data of chunk ${chunkId}/${chunkCount} for job ${jobId} ${printJob.fileName} has incorrect length`)
                printEvents$.next(new PrintEvent({type: 'ERROR', connectionId, data: new ErrorEvent({type: 'ERROR', message: 'Incorrect data length in chunk'})}));
                ack(false);
                return;
            }

            ack(true);
            printEvents$.next(new PrintEvent({type: 'PRINT_JOB_CHUNK_RECEIVED', connectionId, jobId, data: new PrintJobChunkEvent({jobId, chunkId, chunkCount, chunkLength})}));
            this.handlePrintJob(connection, printJob);
        });

        return printEvents$;
    }

    public disconnect(connectionId: string): void {
        const connection = this._connections.find(connection => connection.id === connectionId);
        if (connection) {
            connection.socket.disconnect();
        }
        this._connections = this._connections.filter(connection => connection.id !== connectionId);
    }

    public enablePrinting(connectionId: string): void {
        const connection = this._connections.find(connection => connection.id === connectionId);
        if (connection) {
            connection.socket.emit('enable_print', null, (data: boolean) => {
                connection.event$.next(new PrintEvent({type: 'PRINT_ENABLED', connectionId}));
            });
        }
    }

    public disablePrinting(connectionId: string): void {
        const connection = this._connections.find(connection => connection.id === connectionId);
        if (connection) {
            connection.socket.emit('disable_print', null, (data: boolean) => {
                connection.event$.next(new PrintEvent({type: 'PRINT_DISABLED', connectionId}));
            });
        }
    }

    public openPrintable(connectionId: string, jobId: number): void {
        const connection = this._connections.find(connection => connection.id === connectionId);
        if (connection) {
            const printable = connection.printables.find(printable => printable.jobId === jobId);
            if (printable) {
                connection.socket.emit('print_job_handled', printable.jobId);
                connection.printables = connection.printables.filter(printable => printable.jobId !== jobId);
                this.openPDF(printable.data, connection, jobId);
            }
        }
    }

    private initialiseReceiver(): void {
        if (!this._iframe) {
            this._iframe = document.createElement('iframe');
            this._iframe.style.display = 'none';
            document.body.appendChild(this._iframe);
            this._iframe.onload = () => {
                URL.revokeObjectURL(this._pdfUrl);

                this._iframe.focus();
                try {
                    this._iframe.contentWindow?.print();
                    this._pdfDidOpen = true;

                } catch (error) {
                }
            };
        }
    }

    private handlePrintJob(connection: Connection, printJob: PrintJob): void {
        const { jobId, chunkId, chunkCount } = printJob;
        if (!connection.jobs.has(jobId)) {
            connection.jobs.set(jobId, []);
        }
        connection.jobs.get(jobId)?.push(printJob);

        if (chunkId === chunkCount) {
            this.processJob(connection, printJob);
        }
    }

    private processJob(connection: Connection, printJob: PrintJob): void {
        const {jobId, chunkCount, fileLength, fileName} = printJob;
        const chunks = connection.jobs.get(jobId);
        if (chunks) {
            // Remove from jobs
            connection.jobs.delete(jobId);

            // Concatenate all the data
            if (chunks.length > 0 && chunks.length === chunkCount) {
                const base64 = chunks.reduce((acc, chunk) => {
                    return acc + chunk.data
                }, '');

                const data = atob(base64);
                if (data.length === fileLength) {
                    connection.printables.push({jobId, data})
                    connection.event$.next(new PrintEvent({type: 'PRINT_JOB_AVAILABLE', connectionId: connection.id, data: new PrintJobAvailableEvent({jobId, fileLength, fileName})}));
                } else {
                    connection.event$.next(new PrintEvent({type: 'ERROR', connectionId: connection.id, data: new ErrorEvent({type: 'ERROR', message: 'Processes print data has inconsistent length'})}));
                }
            }
        }
    }

    private openPDF(data: string, connection: Connection, jobId: number): void {
        // Convert to binary data
        const bytes = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            bytes[i] = data.charCodeAt(i);
        }
        const blob = new Blob([bytes], {type: 'application/pdf'});
        this._pdfUrl = URL.createObjectURL(blob);

        this.initialiseReceiver();

        // Set the pdf in the iframe
        this._pdfDidOpen = false;
        this._iframe.src = this._pdfUrl;
        setTimeout(() => {
            if (this._pdfDidOpen === false) {
                connection.event$.next(new PrintEvent({type: 'PRINT_DIALOG_FAILED', connectionId: connection.id, jobId}));
            }
        }, 200);

    }
}
